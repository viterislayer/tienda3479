-- Consultas para revisar la base de datos de la Tienda 3479 (Oracle)
-- Abra este archivo en SQL Developer: Ctrl+Enter ejecuta la consulta donde está el cursor, F5 ejecuta todo.

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
SELECT table_name AS tabla, column_name AS columna, data_type AS tipo, nullable AS acepta_nulo
  FROM user_tab_columns
 ORDER BY table_name, column_id;

-- 6. Relaciones (llaves foráneas)
SELECT c.table_name AS tabla, cc.column_name AS columna, r.table_name AS referencia_a, c.constraint_name AS restriccion
  FROM user_constraints c
  JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name
  JOIN user_constraints r ON r.constraint_name = c.r_constraint_name
 WHERE c.constraint_type = 'R'
 ORDER BY c.table_name;

-- 7. Reglas CHECK de calidad de datos (sin las NOT NULL automáticas)
SELECT table_name AS tabla, constraint_name AS regla, search_condition_vc AS condicion
  FROM user_constraints
 WHERE constraint_type = 'C' AND constraint_name LIKE 'CK\_%' ESCAPE '\'
 ORDER BY table_name;

-- 8. Comentarios de tablas y vistas
SELECT table_name AS objeto, table_type AS tipo, comments AS comentario
  FROM user_tab_comments
 WHERE comments IS NOT NULL
 ORDER BY table_type, table_name;

-- 9. Productos con su categoría (JOIN)
SELECT p.id, p.nombre, p.precio, p.stock, c.nombre AS categoria
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
 ORDER BY p.nombre;

-- 10. Detalle de cada venta: qué se vendió, a quién y a qué precio
SELECT d.venta_id, v.fecha, c.nombre AS cliente, p.nombre AS producto,
       d.cantidad, d.precio_unitario, d.cantidad * d.precio_unitario AS subtotal
  FROM detalle_venta d
  JOIN ventas v ON v.id = d.venta_id
  JOIN clientes c ON c.id = v.cliente_id
  JOIN productos p ON p.id = d.producto_id
 ORDER BY d.venta_id, p.nombre;
