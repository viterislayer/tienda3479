-- Datos iniciales de la Tienda 3479
-- Se cargan después de las migraciones con: npm run db:init

INSERT INTO categorias (nombre) VALUES
  ('Computadoras'),
  ('Accesorios'),
  ('Telefonia');

INSERT INTO productos (nombre, precio, stock, categoria_id) VALUES
  ('Laptop HP',         4500.00, 8, (SELECT id FROM categorias WHERE nombre = 'Computadoras')),
  ('Mouse inalambrico',   85.50, 8, (SELECT id FROM categorias WHERE nombre = 'Accesorios')),
  ('Telefono',           300.00, 1, (SELECT id FROM categorias WHERE nombre = 'Telefonia'));

INSERT INTO clientes (nombre, nit_dpi, correo) VALUES
  ('Ana Lopez',    '1234567-8', 'ana.lopez.nuevo@correo.com'),
  ('Carlos Perez', '2345678-9', 'carlos.perez@correo.com');

INSERT INTO tipos_gasto (nombre) VALUES
  ('Alquiler'),
  ('Servicios (luz, agua, internet)'),
  ('Sueldos'),
  ('Transporte'),
  ('Mantenimiento'),
  ('Otros');
