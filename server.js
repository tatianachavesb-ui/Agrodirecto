// AgroDirecto: servidor web (Node.js + Express) y API REST sobre SQLite.
const express = require('express'), session = require('express-session');
const bcrypt = require('bcryptjs'), Database = require('better-sqlite3');
const fs = require('fs'), path = require('path');

const db = new Database(path.join(__dirname, 'agrodirecto.db'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'database/schema.sql'), 'utf8'));

// Datos de ejemplo la primera vez (los precios de referencia son ilustrativos: reemplazar con SIPSA/DANE).
if (!db.prepare('SELECT COUNT(*) n FROM usuarios').get().n) {
  const hash = bcrypt.hashSync('Demo12345', 10);
  const g = db.prepare('INSERT INTO usuarios (nombre,correo,telefono,password_hash,rol) VALUES (?,?,?,?,?)')
    .run('Asociación Campesina Los Andes', 'gestor@demo.co', '3001234567', hash, 'gestor').lastInsertRowid;
  const ins = db.prepare(`INSERT INTO productos (gestor_id,nombre,productor,municipio,categoria,unidad,precio,precio_referencia,pct_productor,stock,descripcion) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  [
    ['Tomate chonto', 'María Gutiérrez', 'Guasca', 'Verduras', 'kg', 3200, 4800, 90, 80, 'Cosechado esta semana, sin cera.'],
    ['Papa pastusa', 'Luis Ortiz', 'Ventaquemada', 'Tubérculos', 'kg', 1800, 2600, 90, 200, 'Papa de tierra fría, ideal para sopas.'],
    ['Mora de Castilla', 'Rosa Mendoza', 'Silvania', 'Frutas', 'kg', 6500, 9500, 88, 40, 'Fruta fresca para jugo y postres.'],
    ['Cebolla larga', 'Pedro Ramírez', 'Aquitania', 'Verduras', 'atado', 2500, 3600, 90, 60, 'Atado de unos 500 g.'],
    ['Huevos criollos', 'Ana Beltrán', 'Fúquene', 'Huevos y lácteos', 'cubeta x30', 17000, 22000, 92, 25, 'Gallinas de patio.'],
    ['Panela en bloque', 'Jorge Castro', 'Útica', 'Despensa', 'kg', 4200, 5900, 90, 50, 'Panela artesanal sin aditivos.'],
  ].forEach(p => ins.run(g, ...p));
}

// ---------- Validaciones (las mismas reglas se repiten en el navegador) ----------
const reNombre = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ .,'-]{3,80}$/;      // solo letras
const reTel = /^\d{7,10}$/;                                    // solo números
const reCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bad = (res, msg) => res.status(400).json({ error: msg });

const app = express();
app.use(express.json());
app.use(session({ secret: 'agrodirecto-semillero', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

const publico = u => u && { id: u.id, nombre: u.nombre, rol: u.rol };
const requiere = rol => (req, res, next) =>
  !req.session.user ? res.status(401).json({ error: 'Inicia sesión para continuar.' })
  : rol && req.session.user.rol !== rol ? res.status(403).json({ error: 'No tienes permiso para esto.' }) : next();

// ---------- Autenticación ----------
app.post('/api/registro', (req, res) => {
  const { nombre, correo, telefono, password, rol } = req.body;
  if (!reNombre.test(nombre || '')) return bad(res, 'El nombre solo puede tener letras (mínimo 3).');
  if (!reCorreo.test(correo || '')) return bad(res, 'Escribe un correo válido.');
  if (!reTel.test(telefono || '')) return bad(res, 'El teléfono solo puede tener números (7 a 10 dígitos).');
  if ((password || '').length < 8) return bad(res, 'La contraseña debe tener mínimo 8 caracteres.');
  if (!['comprador', 'gestor'].includes(rol)) return bad(res, 'Escoge un tipo de cuenta.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE correo=?').get(correo)) return bad(res, 'Ese correo ya está registrado.');
  const id = db.prepare('INSERT INTO usuarios (nombre,correo,telefono,password_hash,rol) VALUES (?,?,?,?,?)')
    .run(nombre.trim(), correo.toLowerCase(), telefono, bcrypt.hashSync(password, 10), rol).lastInsertRowid;
  req.session.user = { id, nombre: nombre.trim(), rol };
  res.json(publico(req.session.user));
});
app.post('/api/login', (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE correo=?').get((req.body.correo || '').toLowerCase());
  if (!u || !bcrypt.compareSync(req.body.password || '', u.password_hash)) return bad(res, 'Correo o contraseña incorrectos.');
  req.session.user = publico(u);
  res.json(req.session.user);
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/yo', (req, res) => res.json(req.session.user || null));

// ---------- Productos ----------
app.get('/api/productos', (req, res) => {
  const q = `%${req.query.q || ''}%`, cat = req.query.categoria || '';
  const mios = req.query.mios && req.session.user ? req.session.user.id : null;
  res.json(db.prepare(`SELECT * FROM productos WHERE (nombre LIKE ? OR productor LIKE ?)
    AND (?='' OR categoria=?) AND (? IS NULL OR gestor_id=?) ORDER BY id DESC`).all(q, q, cat, cat, mios, mios));
});
app.get('/api/productos/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM productos WHERE id=?').get(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Producto no encontrado.' });
});
app.post('/api/productos', requiere('gestor'), (req, res) => {
  const b = req.body, n = Number;
  if (!reNombre.test(b.nombre || '') || !reNombre.test(b.productor || '') || !reNombre.test(b.municipio || ''))
    return bad(res, 'Producto, productor y municipio solo pueden tener letras.');
  if (!Number.isInteger(n(b.precio)) || n(b.precio) <= 0 || !Number.isInteger(n(b.precio_referencia)) || n(b.precio_referencia) <= 0)
    return bad(res, 'Los precios deben ser números enteros mayores que 0.');
  if (!Number.isInteger(n(b.stock)) || n(b.stock) < 0) return bad(res, 'La cantidad disponible debe ser un número entero.');
  if (!Number.isInteger(n(b.pct_productor)) || n(b.pct_productor) < 1 || n(b.pct_productor) > 100) return bad(res, 'El porcentaje debe estar entre 1 y 100.');
  const id = db.prepare(`INSERT INTO productos (gestor_id,nombre,productor,municipio,categoria,unidad,precio,precio_referencia,pct_productor,stock,descripcion)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(req.session.user.id, b.nombre.trim(), b.productor.trim(), b.municipio.trim(),
    b.categoria || 'Otros', b.unidad || 'kg', n(b.precio), n(b.precio_referencia), n(b.pct_productor), n(b.stock), (b.descripcion || '').slice(0, 200)).lastInsertRowid;
  res.json({ id });
});

// ---------- Pedidos (simulados, sin pago real) ----------
app.post('/api/pedidos', requiere('comprador'), (req, res) => {
  const { items, telefono, direccion } = req.body;
  if (!reTel.test(telefono || '')) return bad(res, 'El teléfono solo puede tener números (7 a 10 dígitos).');
  if ((direccion || '').trim().length < 6) return bad(res, 'Escribe una dirección de entrega.');
  if (!Array.isArray(items) || !items.length) return bad(res, 'Tu carrito está vacío.');
  try {
    const id = db.transaction(() => {
      let total = 0;
      const lineas = items.map(i => {
        const p = db.prepare('SELECT * FROM productos WHERE id=?').get(i.id), c = Number(i.cantidad);
        if (!p || !Number.isInteger(c) || c < 1) throw new Error('Producto o cantidad no válidos.');
        if (c > p.stock) throw new Error(`Solo quedan ${p.stock} de ${p.nombre}.`);
        total += c * p.precio;
        return { p, c };
      });
      const pid = db.prepare('INSERT INTO pedidos (comprador_id,telefono,direccion,total) VALUES (?,?,?,?)')
        .run(req.session.user.id, telefono, direccion.trim(), total).lastInsertRowid;
      for (const { p, c } of lineas) {
        db.prepare('INSERT INTO detalle_pedido (pedido_id,producto_id,cantidad,precio_unitario) VALUES (?,?,?,?)').run(pid, p.id, c, p.precio);
        db.prepare('UPDATE productos SET stock=stock-? WHERE id=?').run(c, p.id);
      }
      return pid;
    })();
    res.json({ id });
  } catch (e) { bad(res, e.message); }
});
app.get('/api/pedidos', requiere(), (req, res) => {
  const u = req.session.user;
  const sql = u.rol === 'comprador'
    ? `SELECT pe.id,pe.fecha,pe.estado,pe.total,pr.nombre producto,d.cantidad FROM pedidos pe JOIN detalle_pedido d ON d.pedido_id=pe.id JOIN productos pr ON pr.id=d.producto_id WHERE pe.comprador_id=? ORDER BY pe.id DESC`
    : `SELECT pe.id,pe.fecha,pe.estado,d.cantidad*d.precio_unitario total,pr.nombre producto,d.cantidad FROM pedidos pe JOIN detalle_pedido d ON d.pedido_id=pe.id JOIN productos pr ON pr.id=d.producto_id WHERE pr.gestor_id=? ORDER BY pe.id DESC`;
  res.json(db.prepare(sql).all(u.id));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AgroDirecto en http://localhost:${PORT}`));
