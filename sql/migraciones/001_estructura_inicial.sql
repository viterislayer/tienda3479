-- 001: estructura inicial normalizada (3FN)

CREATE TABLE categorias (
  id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE productos (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  precio        NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  categoria_id  INTEGER NOT NULL REFERENCES categorias (id)
);

CREATE TABLE clientes (
  id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre   VARCHAR(100) NOT NULL,
  nit_dpi  VARCHAR(20) NOT NULL UNIQUE,
  correo   VARCHAR(100) UNIQUE
);

CREATE TABLE ventas (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id  INTEGER NOT NULL REFERENCES clientes (id),
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- precio_unitario guarda el precio al momento de la venta (si el producto cambia de precio, la venta no cambia)
CREATE TABLE detalle_venta (
  venta_id         INTEGER NOT NULL REFERENCES ventas (id) ON DELETE CASCADE,
  producto_id      INTEGER NOT NULL REFERENCES productos (id),
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  PRIMARY KEY (venta_id, producto_id)
);

-- Índices en las llaves foráneas para acelerar los JOIN
CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_ventas_cliente ON ventas (cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas (fecha);
CREATE INDEX idx_detalle_producto ON detalle_venta (producto_id);
