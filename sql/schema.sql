-- Estructura normalizada (3FN) de la Tienda 3479 - Oracle 23ai
-- Se ejecuta con: npm run db:init (o en SQL Developer)
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
