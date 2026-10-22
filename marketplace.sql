-- Sin intermediarios · modelo de datos (SQLite). Importar: sqlite3 marketplace.db < marketplace.sql
PRAGMA foreign_keys = ON;
CREATE TABLE asociaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, municipio TEXT);
CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT NOT NULL UNIQUE,
  clave_hash TEXT NOT NULL, rol TEXT NOT NULL CHECK (rol IN ('gestor','comprador')), asociacion_id INTEGER REFERENCES asociaciones(id));
CREATE TABLE productores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, asociacion_id INTEGER NOT NULL REFERENCES asociaciones(id));
CREATE TABLE productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Hortalizas','Frutas','Tubérculos','Granos')),
  unidad TEXT NOT NULL CHECK (unidad IN ('kg','unidad','libra')),
  precio_productor INTEGER NOT NULL CHECK (precio_productor > 0),
  precio_referencia INTEGER NOT NULL CHECK (precio_referencia > 0),
  precio_final INTEGER NOT NULL CHECK (precio_final >= precio_productor),
  productor_id INTEGER NOT NULL REFERENCES productores(id), publicado_por INTEGER REFERENCES usuarios(id),
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP);

INSERT INTO asociaciones (nombre, municipio) VALUES ('Asociación Campo Vivo','Ventaquemada'),('Familia Rincón','Chocontá'),('Huerta La Esperanza','Villapinzón');
INSERT INTO productores (nombre, asociacion_id) VALUES ('Asociación Campo Vivo',1),('Familia Rincón',2),('Huerta La Esperanza',3);
INSERT INTO usuarios (nombre, correo, clave_hash, rol, asociacion_id) VALUES ('Gestor de ejemplo','gestor@ejemplo.com','HASH_DE_EJEMPLO','gestor',1);
INSERT INTO productos (nombre,categoria,unidad,precio_productor,precio_referencia,precio_final,productor_id,publicado_por) VALUES
('Papa pastusa','Tubérculos','kg',1800,2600,3200,1,1),('Tomate chonto','Hortalizas','kg',2200,3100,3900,2,1),
('Plátano hartón','Frutas','unidad',900,1400,1700,1,1),('Zanahoria','Hortalizas','kg',1500,2300,2900,3,1),
('Mora de Castilla','Frutas','kg',4800,6500,8000,2,1);
