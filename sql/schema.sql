-- Esquema normalizado (3FN) de la Tienda 3479 - Oracle 23ai
-- Se puede ejecutar en SQL Developer o con: npm run db:init
-- ATENCION: borra y vuelve a crear las tablas.

DROP TABLE IF EXISTS detalle_venta CASCADE CONSTRAINTS;
DROP TABLE IF EXISTS ventas CASCADE CONSTRAINTS;
DROP TABLE IF EXISTS productos CASCADE CONSTRAINTS;
DROP TABLE IF EXISTS categorias CASCADE CONSTRAINTS;
DROP TABLE IF EXISTS clientes CASCADE CONSTRAINTS;

CREATE TABLE categorias (
  id      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre  VARCHAR2(50) NOT NULL UNIQUE
);

CREATE TABLE productos (
  id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        VARCHAR2(100) NOT NULL,
  precio        NUMBER(10,2) NOT NULL CHECK (precio >= 0),
  stock         NUMBER DEFAULT 0 NOT NULL CHECK (stock >= 0),
  categoria_id  NUMBER NOT NULL REFERENCES categorias (id)
);

CREATE TABLE clientes (
  id       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre   VARCHAR2(100) NOT NULL,
  nit_dpi  VARCHAR2(20) NOT NULL UNIQUE,
  correo   VARCHAR2(100) UNIQUE
);

CREATE TABLE ventas (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id  NUMBER NOT NULL REFERENCES clientes (id),
  fecha       DATE DEFAULT SYSDATE NOT NULL
);

-- precio_unitario guarda el precio al momento de la venta (si el producto cambia de precio, la venta no cambia)
CREATE TABLE detalle_venta (
  venta_id         NUMBER NOT NULL REFERENCES ventas (id) ON DELETE CASCADE,
  producto_id      NUMBER NOT NULL REFERENCES productos (id),
  cantidad         NUMBER NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMBER(10,2) NOT NULL CHECK (precio_unitario >= 0),
  PRIMARY KEY (venta_id, producto_id)
);

-- Datos de ejemplo
INSERT INTO categorias (nombre) VALUES ('Computadoras');
INSERT INTO categorias (nombre) VALUES ('Accesorios');
INSERT INTO categorias (nombre) VALUES ('Telefonia');

INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Laptop HP', 4500, 7, (SELECT id FROM categorias WHERE nombre = 'Computadoras'));
INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Mouse inalambrico', 85.50, 6, (SELECT id FROM categorias WHERE nombre = 'Accesorios'));
INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Teclado mecanico', 350, 10, (SELECT id FROM categorias WHERE nombre = 'Accesorios'));
INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Telefono', 300, 1, (SELECT id FROM categorias WHERE nombre = 'Telefonia'));

INSERT INTO clientes (nombre, nit_dpi, correo) VALUES ('Ana Lopez', '1234567-8', 'ana.lopez.nuevo@correo.com');
INSERT INTO clientes (nombre, nit_dpi, correo) VALUES ('Carlos Perez', '2345678-9', 'carlos.perez@correo.com');

INSERT INTO ventas (cliente_id) VALUES ((SELECT id FROM clientes WHERE nit_dpi = '1234567-8'));
INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario)
  VALUES ((SELECT MAX(id) FROM ventas), (SELECT id FROM productos WHERE nombre = 'Laptop HP'), 1, 4500);
INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario)
  VALUES ((SELECT MAX(id) FROM ventas), (SELECT id FROM productos WHERE nombre = 'Mouse inalambrico'), 2, 85.50);

COMMIT;
