-- Datos reales de la Tienda 3479
-- Se cargan después de schema.sql con: npm run db:init

INSERT INTO categorias (nombre) VALUES ('Computadoras');
INSERT INTO categorias (nombre) VALUES ('Accesorios');
INSERT INTO categorias (nombre) VALUES ('Telefonia');

INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Laptop HP', 4500, 8, (SELECT id FROM categorias WHERE nombre = 'Computadoras'));
INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Mouse inalambrico', 85.50, 8, (SELECT id FROM categorias WHERE nombre = 'Accesorios'));
INSERT INTO productos (nombre, precio, stock, categoria_id)
  VALUES ('Telefono', 300, 1, (SELECT id FROM categorias WHERE nombre = 'Telefonia'));

INSERT INTO clientes (nombre, nit_dpi, correo) VALUES ('Ana Lopez', '1234567-8', 'ana.lopez.nuevo@correo.com');
INSERT INTO clientes (nombre, nit_dpi, correo) VALUES ('Carlos Perez', '2345678-9', 'carlos.perez@correo.com');

COMMIT;
