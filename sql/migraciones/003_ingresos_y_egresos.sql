-- 003: egresos (compras a proveedores y gastos de operación) y vistas de ingresos/egresos

CREATE TABLE proveedores (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL CONSTRAINT ck_proveedores_nombre CHECK (btrim(nombre) <> ''),
  nit        VARCHAR(20)  NOT NULL CONSTRAINT ck_proveedores_nit CHECK (nit ~ '^[0-9Kk-]+$'),
  telefono   VARCHAR(20),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_proveedores_nit UNIQUE (nit)
);

-- Compra de mercadería: encabezado (proveedor y fecha) y detalle (productos, cantidad y costo)
CREATE TABLE compras (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proveedor_id  INTEGER NOT NULL REFERENCES proveedores (id),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE detalle_compra (
  compra_id       INTEGER NOT NULL REFERENCES compras (id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos (id),
  cantidad        INTEGER NOT NULL CONSTRAINT ck_detalle_compra_cantidad CHECK (cantidad > 0),
  costo_unitario  NUMERIC(10,2) NOT NULL CONSTRAINT ck_detalle_compra_costo CHECK (costo_unitario >= 0),
  PRIMARY KEY (compra_id, producto_id)
);

-- Gastos de operación clasificados por tipo
CREATE TABLE tipos_gasto (
  id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre  VARCHAR(50) NOT NULL CONSTRAINT ck_tipos_gasto_nombre CHECK (btrim(nombre) <> '')
);
CREATE UNIQUE INDEX uq_tipos_gasto_nombre ON tipos_gasto (lower(nombre));

INSERT INTO tipos_gasto (nombre) VALUES
  ('Alquiler'),
  ('Servicios (luz, agua, internet)'),
  ('Sueldos'),
  ('Transporte'),
  ('Mantenimiento'),
  ('Otros');

CREATE TABLE gastos (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo_gasto_id  INTEGER NOT NULL REFERENCES tipos_gasto (id),
  descripcion    VARCHAR(200) NOT NULL CONSTRAINT ck_gastos_descripcion CHECK (btrim(descripcion) <> ''),
  monto          NUMERIC(10,2) NOT NULL CONSTRAINT ck_gastos_monto CHECK (monto > 0),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_proveedor ON compras (proveedor_id);
CREATE INDEX idx_compras_fecha ON compras (fecha);
CREATE INDEX idx_detalle_compra_producto ON detalle_compra (producto_id);
CREATE INDEX idx_gastos_tipo ON gastos (tipo_gasto_id);
CREATE INDEX idx_gastos_fecha ON gastos (fecha);

-- Vista: cada compra con su proveedor y total calculado
CREATE VIEW vista_compras AS
SELECT co.id,
       co.fecha,
       co.proveedor_id,
       pr.nombre AS proveedor,
       pr.nit,
       COUNT(d.producto_id) AS productos,
       COALESCE(SUM(d.cantidad * d.costo_unitario), 0)::NUMERIC(12,2) AS total
  FROM compras co
  JOIN proveedores pr ON pr.id = co.proveedor_id
  LEFT JOIN detalle_compra d ON d.compra_id = co.id
 GROUP BY co.id, pr.id;

-- Vista: todos los movimientos de dinero (ventas = ingreso; compras y gastos = egreso), por día de Guatemala
CREATE VIEW vista_movimientos AS
SELECT 'Ingreso'::VARCHAR(10) AS tipo, 'Venta'::VARCHAR(10) AS origen, v.id AS referencia,
       (v.fecha AT TIME ZONE 'America/Guatemala')::DATE AS fecha,
       ('Venta #' || v.id || ' · ' || v.cliente)::VARCHAR(250) AS concepto, v.total AS monto
  FROM vista_ventas v
UNION ALL
SELECT 'Egreso', 'Compra', c.id,
       (c.fecha AT TIME ZONE 'America/Guatemala')::DATE,
       'Compra #' || c.id || ' · ' || c.proveedor, c.total
  FROM vista_compras c
UNION ALL
SELECT 'Egreso', 'Gasto', g.id, g.fecha, t.nombre || ' · ' || g.descripcion, g.monto
  FROM gastos g
  JOIN tipos_gasto t ON t.id = g.tipo_gasto_id;

-- Vista: ingresos, egresos y balance de cada mes
CREATE VIEW vista_balance_mensual AS
SELECT date_trunc('month', fecha)::DATE AS mes,
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'Ingreso'), 0) AS ingresos,
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'Egreso'), 0) AS egresos,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) AS balance
  FROM vista_movimientos
 GROUP BY 1;

COMMENT ON TABLE proveedores    IS 'Proveedores a los que se compra mercadería';
COMMENT ON TABLE compras        IS 'Encabezado de cada compra: proveedor y fecha (egreso)';
COMMENT ON TABLE detalle_compra IS 'Productos de cada compra; al registrarla aumenta el stock';
COMMENT ON TABLE tipos_gasto    IS 'Clasificación de los gastos de operación';
COMMENT ON TABLE gastos         IS 'Gastos de operación: alquiler, servicios, sueldos, etc. (egreso)';
COMMENT ON COLUMN detalle_compra.costo_unitario IS 'Costo pagado al proveedor por unidad';
COMMENT ON VIEW vista_compras         IS 'Compras con proveedor y total calculado';
COMMENT ON VIEW vista_movimientos     IS 'Ingresos (ventas) y egresos (compras y gastos) en un solo listado';
COMMENT ON VIEW vista_balance_mensual IS 'Ingresos, egresos y balance por mes';
