-- Crea el usuario y la base de datos de la tienda en PostgreSQL.
-- Ejecutar una sola vez como administrador, indicando la contraseña del nuevo usuario:
--   psql -U postgres -h localhost -v clave='LA_CONTRASEÑA' -f sql/crear-base.sql
-- La misma contraseña va en DB_PASSWORD del archivo .env

CREATE ROLE tienda3479 LOGIN PASSWORD :'clave';
CREATE DATABASE tienda3479 OWNER tienda3479 ENCODING 'UTF8';
