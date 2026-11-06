-- 002: vistas. Los totales y el balance no se guardan: se calculan desde el detalle (evita datos derivados, 3FN)

-- Cada venta con su cliente, cantidad de productos y total
CREATE VIEW vista_ventas AS
SELECT v.id,
       v.fecha,
       v.cliente_id,
       c.nombre AS cliente,
       c.nit_dpi,
       COUNT(d.producto_id) AS productos,
       CAST(COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS DECIMAL(12,2)) AS total
  FROM ventas v
  JOIN clientes c ON c.id = v.cliente_id
  LEFT JOIN detalle_venta d ON d.venta_id = v.id
 GROUP BY v.id, c.id;

-- Cada compra con su proveedor, cantidad de productos y total
CREATE VIEW vista_compras AS
SELECT co.id,
       co.fecha,
       co.proveedor_id,
       pr.nombre AS proveedor,
       pr.nit,
       COUNT(d.producto_id) AS productos,
       CAST(COALESCE(SUM(d.cantidad * d.costo_unitario), 0) AS DECIMAL(12,2)) AS total
  FROM compras co
  JOIN proveedores pr ON pr.id = co.proveedor_id
  LEFT JOIN detalle_compra d ON d.compra_id = co.id
 GROUP BY co.id, pr.id;

-- Inventario con categoría y estado del stock
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

-- Todos los movimientos de dinero: ventas = ingreso; compras y gastos = egreso
CREATE VIEW vista_movimientos AS
SELECT 'Ingreso' AS tipo, 'Venta' AS origen, v.id AS referencia, DATE(v.fecha) AS fecha,
       CONCAT('Venta #', v.id, ' · ', v.cliente) AS concepto, v.total AS monto
  FROM vista_ventas v
UNION ALL
SELECT 'Egreso', 'Compra', c.id, DATE(c.fecha),
       CONCAT('Compra #', c.id, ' · ', c.proveedor), c.total
  FROM vista_compras c
UNION ALL
SELECT 'Egreso', 'Gasto', g.id, g.fecha, CONCAT(t.nombre, ' · ', g.descripcion), g.monto
  FROM gastos g
  JOIN tipos_gasto t ON t.id = g.tipo_gasto_id;

-- Ingresos, egresos y balance de cada mes
CREATE VIEW vista_balance_mensual AS
SELECT DATE_FORMAT(fecha, '%Y-%m-01') AS mes,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END) AS ingresos,
       SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END) AS egresos,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) AS balance
  FROM vista_movimientos
 GROUP BY DATE_FORMAT(fecha, '%Y-%m-01');
