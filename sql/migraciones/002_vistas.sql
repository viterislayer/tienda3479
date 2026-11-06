-- 002: vistas. Los totales y el balance no se guardan: se calculan desde el detalle (evita datos derivados, 3FN)

-- Cada venta con su cliente, cantidad de productos y total
CREATE OR REPLACE VIEW vista_ventas AS
SELECT v.id,
       v.fecha,
       v.cliente_id,
       c.nombre AS cliente,
       c.nit_dpi,
       COUNT(d.producto_id) AS productos,
       CAST(NVL(SUM(d.cantidad * d.precio_unitario), 0) AS NUMBER(12,2)) AS total
  FROM ventas v
  JOIN clientes c ON c.id = v.cliente_id
  LEFT JOIN detalle_venta d ON d.venta_id = v.id
 GROUP BY v.id, v.fecha, v.cliente_id, c.nombre, c.nit_dpi;

-- Cada compra con su proveedor, cantidad de productos y total
CREATE OR REPLACE VIEW vista_compras AS
SELECT co.id,
       co.fecha,
       co.proveedor_id,
       pr.nombre AS proveedor,
       pr.nit,
       COUNT(d.producto_id) AS productos,
       CAST(NVL(SUM(d.cantidad * d.costo_unitario), 0) AS NUMBER(12,2)) AS total
  FROM compras co
  JOIN proveedores pr ON pr.id = co.proveedor_id
  LEFT JOIN detalle_compra d ON d.compra_id = co.id
 GROUP BY co.id, co.fecha, co.proveedor_id, pr.nombre, pr.nit;

-- Inventario con categoría y estado del stock
CREATE OR REPLACE VIEW vista_inventario AS
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

-- Todos los movimientos de dinero: ventas = ingreso; compras y gastos = egreso
CREATE OR REPLACE VIEW vista_movimientos AS
SELECT CAST('Ingreso' AS VARCHAR2(10)) AS tipo, CAST('Venta' AS VARCHAR2(10)) AS origen, v.id AS referencia,
       TRUNC(v.fecha) AS fecha, 'Venta #' || v.id || ' · ' || v.cliente AS concepto, v.total AS monto
  FROM vista_ventas v
UNION ALL
SELECT 'Egreso', 'Compra', c.id, TRUNC(c.fecha), 'Compra #' || c.id || ' · ' || c.proveedor, c.total
  FROM vista_compras c
UNION ALL
SELECT 'Egreso', 'Gasto', g.id, g.fecha, t.nombre || ' · ' || g.descripcion, g.monto
  FROM gastos g
  JOIN tipos_gasto t ON t.id = g.tipo_gasto_id;

-- Ingresos, egresos y balance de cada mes
CREATE OR REPLACE VIEW vista_balance_mensual AS
SELECT TRUNC(fecha, 'MM') AS mes,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END) AS ingresos,
       SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END) AS egresos,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) AS balance
  FROM vista_movimientos
 GROUP BY TRUNC(fecha, 'MM');

COMMENT ON TABLE vista_ventas          IS 'Ventas con cliente y total calculado';
COMMENT ON TABLE vista_compras         IS 'Compras con proveedor y total calculado';
COMMENT ON TABLE vista_inventario      IS 'Productos con su categoría y estado del stock';
COMMENT ON TABLE vista_movimientos     IS 'Ingresos (ventas) y egresos (compras y gastos) en un solo listado';
COMMENT ON TABLE vista_balance_mensual IS 'Ingresos, egresos y balance por mes';
