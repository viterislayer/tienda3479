-- Crea la base de datos y el usuario de la tienda en MySQL.
-- Ejecutar una sola vez como administrador (root), indicando la contraseña del nuevo usuario:
--   mysql -u root -p --init-command="SET @clave='LA_CONTRASEÑA'" < sql/crear-base.sql
-- La misma contraseña va en DB_PASSWORD del archivo .env

CREATE DATABASE IF NOT EXISTS tienda3479 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET @crear = CONCAT('CREATE USER IF NOT EXISTS ''tienda3479''@''localhost'' IDENTIFIED BY ', QUOTE(@clave));
PREPARE sentencia FROM @crear;
EXECUTE sentencia;
DEALLOCATE PREPARE sentencia;

GRANT ALL PRIVILEGES ON tienda3479.* TO 'tienda3479'@'localhost';
FLUSH PRIVILEGES;
