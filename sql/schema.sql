-- Esquema de la base DB_TIENDA3479 (Oracle)
-- Ejecutar conectado como el usuario de la base, por ejemplo en SQL Developer.

CREATE TABLE PRODUCTOS (
  ID      NUMBER        PRIMARY KEY,
  NOMBRE  VARCHAR2(100),
  PRECIO  NUMBER(10,2),
  STOCK   NUMBER
);

CREATE TABLE CLIENTES (
  ID       NUMBER        PRIMARY KEY,
  NOMBRE   VARCHAR2(100),
  NIT_DPI  VARCHAR2(20),
  CORREO   VARCHAR2(100)
);

-- Datos de ejemplo
INSERT INTO PRODUCTOS (ID, NOMBRE, PRECIO, STOCK) VALUES (1, 'Laptop HP', 4500, 8);
INSERT INTO PRODUCTOS (ID, NOMBRE, PRECIO, STOCK) VALUES (2, 'Mouse inalambrico', 85.50, 8);

INSERT INTO CLIENTES (ID, NOMBRE, NIT_DPI, CORREO) VALUES (1, 'Ana Lopez', '1234567-8', 'ana.lopez@correo.com');
INSERT INTO CLIENTES (ID, NOMBRE, NIT_DPI, CORREO) VALUES (2, 'Carlos Perez', '2345678-9', 'carlos.perez@correo.com');

COMMIT;
