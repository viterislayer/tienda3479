-- 002: reglas de calidad de datos, auditoría, vistas y documentación de la base

-- Reglas: textos obligatorios sin quedar vacíos y formatos válidos
ALTER TABLE categorias ADD CONSTRAINT ck_categorias_nombre CHECK (btrim(nombre) <> '');
ALTER TABLE productos  ADD CONSTRAINT ck_productos_nombre  CHECK (btrim(nombre) <> '');
ALTER TABLE clientes   ADD CONSTRAINT ck_clientes_nombre   CHECK (btrim(nombre) <> '');
ALTER TABLE clientes   ADD CONSTRAINT ck_clientes_nit_dpi  CHECK (nit_dpi ~ '^[0-9Kk-]+$');
ALTER TABLE clientes   ADD CONSTRAINT ck_clientes_correo   CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Únicos sin distinguir mayúsculas: "Accesorios" y "accesorios" son la misma categoría
ALTER TABLE categorias DROP CONSTRAINT categorias_nombre_key;
CREATE UNIQUE INDEX uq_categorias_nombre ON categorias (lower(nombre));
ALTER TABLE clientes DROP CONSTRAINT clientes_correo_key;
CREATE UNIQUE INDEX uq_clientes_correo ON clientes (lower(correo));

-- Auditoría: fecha de creación de cada registro
ALTER TABLE categorias ADD COLUMN creado_en TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE productos  ADD COLUMN creado_en TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE clientes   ADD COLUMN creado_en TIMESTAMPTZ NOT NULL DEFAULT now();

-- Vista: cada venta con su cliente, cantidad de productos y total calculado
CREATE VIEW vista_ventas AS
SELECT v.id,
       v.fecha,
       v.cliente_id,
       c.nombre  AS cliente,
       c.nit_dpi,
       COUNT(d.producto_id) AS productos,
       COALESCE(SUM(d.cantidad * d.precio_unitario), 0)::NUMERIC(12,2) AS total
  FROM ventas v
  JOIN clientes c ON c.id = v.cliente_id
  LEFT JOIN detalle_venta d ON d.venta_id = v.id
 GROUP BY v.id, c.id;

-- Vista: inventario con categoría y estado del stock
CREATE VIEW vista_inventario AS
SELECT p.id,
       p.nombre,
       c.nombre AS categoria,
       p.precio,
       p.stock,
       CASE WHEN p.stock = 0 THEN 'Agotado'
            WHEN p.stock <= 3 THEN 'Bajo'
            ELSE 'Disponible'
       END AS estado_stock
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id;

-- Documentación visible en pgAdmin
COMMENT ON TABLE categorias    IS 'Clasificación de los productos';
COMMENT ON TABLE productos     IS 'Catálogo de productos con precio y existencias';
COMMENT ON TABLE clientes      IS 'Clientes con sus datos de facturación';
COMMENT ON TABLE ventas        IS 'Encabezado de cada venta: cliente y fecha';
COMMENT ON TABLE detalle_venta IS 'Productos de cada venta (resuelve la relación N:M entre ventas y productos)';
COMMENT ON COLUMN productos.stock                 IS 'Unidades disponibles; se descuenta al vender y se devuelve al anular';
COMMENT ON COLUMN clientes.nit_dpi                IS 'NIT o DPI del cliente, único';
COMMENT ON COLUMN ventas.fecha                    IS 'Momento de la venta, con zona horaria';
COMMENT ON COLUMN detalle_venta.precio_unitario   IS 'Precio al momento de la venta (no cambia si después cambia el precio del producto)';
COMMENT ON VIEW vista_ventas     IS 'Ventas con cliente y total calculado (el total no se guarda: se deriva del detalle)';
COMMENT ON VIEW vista_inventario IS 'Productos con su categoría y estado del stock';
