-- Crea el usuario (esquema) de la tienda en Oracle.
-- Ejecutar una sola vez como administrador (SYSTEM) en la base FREEPDB1, por ejemplo en SQL Developer
-- o con:  sql SYSTEM@localhost:1521/FREEPDB1 @sql/crear-base.sql
-- Cambie LA_CONTRASEÑA por la contraseña que va en DB_PASSWORD del archivo .env

CREATE USER tienda3479 IDENTIFIED BY "LA_CONTRASEÑA" QUOTA UNLIMITED ON USERS;
GRANT DB_DEVELOPER_ROLE TO tienda3479;
GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE TO tienda3479;
