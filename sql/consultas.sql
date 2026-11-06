-- Consultas para revisar la base de datos de la Tienda 3479 (PostgreSQL)
-- Seleccione una consulta y ejecútela, o ejecute todo el archivo.

-- 1. Tablas de la base y cuántos registros tiene cada una
SELECT 'categorias' AS tabla, COUNT(*) AS registros FROM categorias
UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'ventas', COUNT(*) FROM ventas
UNION ALL SELECT 'detalle_venta', COUNT(*) FROM detalle_venta;

-- 1b. Migraciones aplicadas a la base
SELECT version, aplicada_en FROM schema_migraciones ORDER BY version;

-- 1c. Vistas: inventario con estado del stock y ventas con su total
SELECT * FROM vista_inventario ORDER BY id;
SELECT * FROM vista_ventas ORDER BY id DESC;

-- 2. Estructura: columnas, tipos y si aceptan nulos
SELECT table_name AS tabla, column_name AS columna, data_type AS tipo, is_nullable AS acepta_nulo
  FROM information_schema.columns
 WHERE table_schema = 'public'
 ORDER BY table_name, ordinal_position;

-- 3. Relaciones (llaves foráneas)
SELECT tc.table_name AS tabla, kcu.column_name AS columna,
       ccu.table_name AS referencia_a, ccu.column_name AS columna_referida
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
 WHERE tc.constraint_type = 'FOREIGN KEY'
 ORDER BY tc.table_name;

-- 4. Datos de cada tabla
SELECT * FROM categorias ORDER BY id;
SELECT * FROM clientes ORDER BY id;
SELECT * FROM productos ORDER BY id;
SELECT * FROM ventas ORDER BY id;
SELECT * FROM detalle_venta ORDER BY venta_id, producto_id;

-- 5. Productos con su categoría (JOIN)
SELECT p.id, p.nombre, p.precio, p.stock, c.nombre AS categoria
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
 ORDER BY p.nombre;

-- 6. Ventas con cliente y total (JOIN + GROUP BY)
SELECT v.id, v.fecha AT TIME ZONE 'America/Guatemala' AS fecha, c.nombre AS cliente,
       SUM(d.cantidad * d.precio_unitario) AS total
  FROM ventas v
  JOIN clientes c ON c.id = v.cliente_id
  JOIN detalle_venta d ON d.venta_id = v.id
 GROUP BY v.id, c.nombre
 ORDER BY v.id DESC;

-- 7. Detalle de cada venta: qué se vendió, a quién y a qué precio
SELECT d.venta_id, c.nombre AS cliente, p.nombre AS producto,
       d.cantidad, d.precio_unitario, d.cantidad * d.precio_unitario AS subtotal
  FROM detalle_venta d
  JOIN ventas v ON v.id = d.venta_id
  JOIN clientes c ON c.id = v.cliente_id
  JOIN productos p ON p.id = d.producto_id
 ORDER BY d.venta_id, p.nombre;
