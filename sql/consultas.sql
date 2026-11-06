-- Consultas para revisar la base de datos de la Tienda 3479 (MySQL)
-- Abra este archivo en MySQL Workbench y ejecute una consulta (Ctrl+Enter) o todas (Ctrl+Shift+Enter).

-- 1. Tablas de la base y cuántos registros tiene cada una
SELECT 'categorias' AS tabla, COUNT(*) AS registros FROM categorias
UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'tipos_gasto', COUNT(*) FROM tipos_gasto
UNION ALL SELECT 'ventas', COUNT(*) FROM ventas
UNION ALL SELECT 'detalle_venta', COUNT(*) FROM detalle_venta
UNION ALL SELECT 'compras', COUNT(*) FROM compras
UNION ALL SELECT 'detalle_compra', COUNT(*) FROM detalle_compra
UNION ALL SELECT 'gastos', COUNT(*) FROM gastos;

-- 2. Migraciones aplicadas a la base
SELECT version, aplicada_en FROM schema_migraciones ORDER BY version;

-- 3. Vistas: inventario, ventas y compras con sus totales
SELECT * FROM vista_inventario ORDER BY id;
SELECT * FROM vista_ventas ORDER BY id DESC;
SELECT * FROM vista_compras ORDER BY id DESC;

-- 4. Ingresos y egresos, y balance por mes
SELECT * FROM vista_movimientos ORDER BY fecha DESC;
SELECT * FROM vista_balance_mensual ORDER BY mes DESC;

-- 5. Estructura: columnas, tipos y si aceptan nulos
SELECT table_name AS tabla, column_name AS columna, column_type AS tipo, is_nullable AS acepta_nulo, column_comment AS comentario
  FROM information_schema.columns
 WHERE table_schema = DATABASE()
 ORDER BY table_name, ordinal_position;

-- 6. Relaciones (llaves foráneas)
SELECT table_name AS tabla, column_name AS columna,
       referenced_table_name AS referencia_a, referenced_column_name AS columna_referida, constraint_name AS restriccion
  FROM information_schema.key_column_usage
 WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL
 ORDER BY table_name;

-- 7. Reglas CHECK de calidad de datos
SELECT tc.table_name AS tabla, cc.constraint_name AS regla, cc.check_clause AS condicion
  FROM information_schema.check_constraints cc
  JOIN information_schema.table_constraints tc
    ON tc.constraint_schema = cc.constraint_schema AND tc.constraint_name = cc.constraint_name
 WHERE cc.constraint_schema = DATABASE()
 ORDER BY tc.table_name;

-- 8. Productos con su categoría (JOIN)
SELECT p.id, p.nombre, p.precio, p.stock, c.nombre AS categoria
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
 ORDER BY p.nombre;

-- 9. Detalle de cada venta: qué se vendió, a quién y a qué precio
SELECT d.venta_id, v.fecha, c.nombre AS cliente, p.nombre AS producto,
       d.cantidad, d.precio_unitario, d.cantidad * d.precio_unitario AS subtotal
  FROM detalle_venta d
  JOIN ventas v ON v.id = d.venta_id
  JOIN clientes c ON c.id = v.cliente_id
  JOIN productos p ON p.id = d.producto_id
 ORDER BY d.venta_id, p.nombre;
