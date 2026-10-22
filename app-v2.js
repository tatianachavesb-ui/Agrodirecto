/* Sin intermediarios - lógica compartida (datos de ejemplo + validación) */
const KEY = 'si_productos';
const BASE = [
  {id:1,nombre:'Papa pastusa',productor:'Asociación Campo Vivo',categoria:'Tubérculos',unidad:'kg',pProd:1800,pRef:2600,pFinal:3200},
  {id:2,nombre:'Tomate chonto',productor:'Familia Rincón',categoria:'Hortalizas',unidad:'kg',pProd:2200,pRef:3100,pFinal:3900},
  {id:3,nombre:'Plátano hartón',productor:'Asociación Campo Vivo',categoria:'Frutas',unidad:'unidad',pProd:900,pRef:1400,pFinal:1700},
  {id:4,nombre:'Zanahoria',productor:'Huerta La Esperanza',categoria:'Hortalizas',unidad:'kg',pProd:1500,pRef:2300,pFinal:2900},
  {id:5,nombre:'Mora de Castilla',productor:'Familia Rincón',categoria:'Frutas',unidad:'kg',pProd:4800,pRef:6500,pFinal:8000}
];
const cargar = () => { try { const g = localStorage.getItem(KEY); if (g) return JSON.parse(g); } catch (e) {} return BASE.slice(); };
const guardar = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
const cop = n => '$' + Number(n).toLocaleString('es-CO');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Validación accesible: marca campos inválidos y muestra el mensaje junto a cada uno */
function validar(form) {
  let ok = true, primero = null;
  form.querySelectorAll('input,select').forEach(c => {
    const fb = c.parentElement.querySelector('.invalid-feedback');
    const bien = c.checkValidity();
    c.classList.toggle('is-invalid', !bien);
    c.setAttribute('aria-invalid', String(!bien));
    if (!bien) { ok = false; primero = primero || c; if (fb) fb.textContent = c.dataset.msg || c.validationMessage; }
  });
  if (primero) primero.focus();
  return ok;
}

/* Catálogo (index.html) */
const CLASE = {Hortalizas:'hortalizas', Frutas:'frutas', 'Tubérculos':'tuberculos', Granos:'granos'};
const IMAGENES = {papa:'papa', tomate:'tomate', 'plátano':'platano', platano:'platano', zanahoria:'zanahoria', mora:'mora'};
const POR_CAT = {Hortalizas:'verdura', Frutas:'fruta', 'Tubérculos':'papa', Granos:'grano'};
/* Imagen del producto: usa la foto img/<nombre>.jpg si existe; si no, la ilustración .svg. Una ruta escrita en el panel tiene prioridad. */
const nombreImg = p => { const n = p.nombre.toLowerCase(); const k = Object.keys(IMAGENES).find(x => n.includes(x)); return k ? IMAGENES[k] : (POR_CAT[p.categoria] || 'verdura'); };
const imgTag = p => { const base = 'img/' + nombreImg(p); const src = p.imagen ? esc(p.imagen) : base + '.jpg';
  return `<img src="${src}" onerror="this.onerror=null;this.classList.add('ilus');this.src='${base}.svg'" alt="" width="96" height="96" loading="lazy">`; };
function pintarCatalogo() {
  const cont = document.getElementById('catalogo'); if (!cont) return;
  const q = document.getElementById('buscar').value.trim().toLowerCase();
  const cat = document.getElementById('categoria').value;
  const lista = cargar().filter(p => (!cat || p.categoria === cat) && (!q || (p.nombre + ' ' + p.productor).toLowerCase().includes(q)));
  document.getElementById('conteo').textContent = lista.length + (lista.length === 1 ? ' producto' : ' productos');
  if (!lista.length) { cont.innerHTML = '<div class="col-12"><p class="vacio">No hay productos con ese filtro. Prueba con otra palabra o elige "Todas".</p></div>'; return; }
  cont.innerHTML = lista.map(p => {
    const pct = Math.round(p.pProd / p.pFinal * 100);
    return `<div class="col-12 col-md-6 col-lg-4"><article class="tarjeta">
      <div class="tope c-${CLASE[p.categoria] || 'hortalizas'}" aria-hidden="true">${imgTag(p)}</div>
      <div class="cuerpo"><h3>${esc(p.nombre)}</h3><p class="meta">${esc(p.productor)}</p>
      <p class="precio">${cop(p.pFinal)} <span class="meta">por ${esc(p.unidad)}</span></p>
      <div class="reparto" role="img" aria-label="Al productor llega el ${pct}% del precio"><span class="r-prod" style="width:${pct}%"></span><span class="r-otros" style="width:${100 - pct}%"></span></div>
      <p class="leyenda"><span class="punto p1"></span>Al productor <strong>${cop(p.pProd)} (${pct}%)</strong></p>
      <p class="leyenda"><span class="punto p2"></span>Transporte y gestión <strong>${cop(p.pFinal - p.pProd)}</strong></p>
      <p class="ref">Con intermediarios (SIPSA): ${cop(p.pRef)} por ${esc(p.unidad)}</p></div>
    </article></div>`;
  }).join('');
}

/* Acceso (acceso.html) */
function iniciarAcceso() {
  const reg = document.getElementById('form-registro'), log = document.getElementById('form-login');
  if (!reg) return;
  const DEMO = {nombre:'Gestor de ejemplo', correo:'gestor@ejemplo.com', clave:'gestor1234'};
  const usuarios = () => { let u = []; try { u = JSON.parse(localStorage.getItem('si_usuarios')) || []; } catch (e) {} return u.some(x => x.correo === DEMO.correo) ? u : [DEMO, ...u]; };
  reg.addEventListener('submit', e => {
    e.preventDefault(); if (!validar(reg)) return;
    const u = usuarios(), correo = reg.correo.value.trim().toLowerCase();
    if (u.some(x => x.correo === correo)) { reg.correo.dataset.msg = 'Ese correo ya está registrado.'; reg.correo.setCustomValidity('x'); validar(reg); reg.correo.setCustomValidity(''); return; }
    u.push({nombre: reg.nombre.value.trim(), correo, clave: reg.clave.value}); /* DEMO: el backend debe guardar un hash, no la clave */
    localStorage.setItem('si_usuarios', JSON.stringify(u));
    document.getElementById('aviso-registro').textContent = 'Cuenta creada. Ya puedes iniciar sesión.'; reg.reset();
  });
  log.addEventListener('submit', e => {
    e.preventDefault(); if (!validar(log)) return;
    const x = usuarios().find(u => u.correo === log.correo.value.trim().toLowerCase() && u.clave === log.clave.value);
    if (!x) { document.getElementById('aviso-login').textContent = 'Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.'; return; }
    localStorage.setItem('si_sesion', x.nombre); location.href = 'panel.html';
  });
}

/* Panel del gestor (panel.html) */
function iniciarPanel() {
  const f = document.getElementById('form-producto'); if (!f) return;
  const nombre = localStorage.getItem('si_sesion');
  if (!nombre) { f.closest('main').innerHTML = '<section class="portada"><h1>Primero inicia sesión</h1><p>El panel es solo para gestores. Entra con tu cuenta o con la de ejemplo.</p><a class="btn btn-verde" href="acceso.html">Ir a iniciar sesión</a></section>'; return; }
  document.getElementById('gestor').textContent = nombre;
  document.getElementById('salir').addEventListener('click', () => { localStorage.removeItem('si_sesion'); location.href = 'index.html'; });
  const tabla = document.getElementById('tabla');
  const pintar = () => {
    const l = cargar();
    tabla.innerHTML = l.length ? l.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.productor)}</td><td>${cop(p.pProd)}</td><td>${cop(p.pFinal)}</td>
      <td><button class="btn btn-outline-danger btn-sm" data-id="${p.id}" aria-label="Eliminar ${esc(p.nombre)}">Eliminar</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="vacio">Aún no hay productos. Publica el primero con el formulario.</td></tr>';
  };
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (Number(f.pFinal.value) < Number(f.pProd.value)) { f.pFinal.dataset.msg = 'El precio al comprador no puede ser menor al del productor.'; f.pFinal.setCustomValidity('x'); } else { f.pFinal.setCustomValidity(''); }
    const ok = validar(f); f.pFinal.setCustomValidity(''); if (!ok) return;
    const l = cargar(), id = l.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    l.push({id, nombre: f.nombre.value.trim(), productor: f.productor.value.trim(), categoria: f.categoria.value, unidad: f.unidad.value,
      pProd: +f.pProd.value, pRef: +f.pRef.value, pFinal: +f.pFinal.value, imagen: f.imagen.value.trim()});
    guardar(l); pintar(); f.reset(); document.getElementById('aviso').textContent = 'Producto publicado.';
  });
  tabla.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    guardar(cargar().filter(p => p.id !== +b.dataset.id)); pintar(); document.getElementById('aviso').textContent = 'Producto eliminado.';
  });
  pintar();
}

document.addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('buscar');
  if (b) { b.addEventListener('input', pintarCatalogo); document.getElementById('categoria').addEventListener('change', pintarCatalogo); pintarCatalogo(); }
  iniciarAcceso(); iniciarPanel();
});
