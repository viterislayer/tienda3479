-- 001: tablas normalizadas (3FN) con llaves, reglas de calidad e índices - MySQL 8

-- ---------- Catálogos ----------

CREATE TABLE categorias (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(50) NOT NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
  CONSTRAINT ck_categorias_nombre CHECK (TRIM(nombre) <> '')
) COMMENT = 'Clasificación de los productos';

CREATE TABLE productos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  precio        DECIMAL(10,2) NOT NULL,
  stock         INT NOT NULL DEFAULT 0 COMMENT 'Unidades disponibles; baja al vender y sube al comprar',
  categoria_id  INT NOT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT ck_productos_nombre CHECK (TRIM(nombre) <> ''),
  CONSTRAINT ck_productos_precio CHECK (precio >= 0),
  CONSTRAINT ck_productos_stock  CHECK (stock >= 0)
) COMMENT = 'Catálogo de productos con precio y existencias';

CREATE TABLE clientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  nit_dpi    VARCHAR(20) NOT NULL COMMENT 'NIT o DPI del cliente, único',
  correo     VARCHAR(100) NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_clientes_nit_dpi UNIQUE (nit_dpi),
  CONSTRAINT uq_clientes_correo  UNIQUE (correo),
  CONSTRAINT ck_clientes_nombre  CHECK (TRIM(nombre) <> ''),
  CONSTRAINT ck_clientes_nit_dpi CHECK (REGEXP_LIKE(nit_dpi, '^[0-9Kk-]+$')),
  CONSTRAINT ck_clientes_correo  CHECK (correo IS NULL OR REGEXP_LIKE(correo, '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'))
) COMMENT = 'Clientes con sus datos de facturación';

CREATE TABLE proveedores (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  nit        VARCHAR(20) NOT NULL,
  telefono   VARCHAR(20) NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_proveedores_nit UNIQUE (nit),
  CONSTRAINT ck_proveedores_nombre CHECK (TRIM(nombre) <> ''),
  CONSTRAINT ck_proveedores_nit CHECK (REGEXP_LIKE(nit, '^[0-9Kk-]+$'))
) COMMENT = 'Proveedores a los que se compra mercadería';

CREATE TABLE tipos_gasto (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(50) NOT NULL,
  CONSTRAINT uq_tipos_gasto_nombre UNIQUE (nombre),
  CONSTRAINT ck_tipos_gasto_nombre CHECK (TRIM(nombre) <> '')
) COMMENT = 'Clasificación de los gastos de operación';

-- ---------- Ingresos: ventas ----------

CREATE TABLE ventas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id  INT NOT NULL,
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la venta (hora de Guatemala)',
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  INDEX idx_ventas_fecha (fecha)
) COMMENT = 'Encabezado de cada venta: cliente y fecha (ingreso)';

CREATE TABLE detalle_venta (
  venta_id         INT NOT NULL,
  producto_id      INT NOT NULL,
  cantidad         INT NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL COMMENT 'Precio al momento de la venta (no cambia si después cambia el precio)',
  PRIMARY KEY (venta_id, producto_id),
  CONSTRAINT fk_detalle_venta_venta    FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_venta_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT ck_detalle_venta_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_detalle_venta_precio   CHECK (precio_unitario >= 0)
) COMMENT = 'Productos de cada venta (resuelve la relación N:M entre ventas y productos)';

-- ---------- Egresos: compras y gastos ----------

CREATE TABLE compras (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  INDEX idx_compras_fecha (fecha)
) COMMENT = 'Encabezado de cada compra: proveedor y fecha (egreso)';

CREATE TABLE detalle_compra (
  compra_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  costo_unitario  DECIMAL(10,2) NOT NULL COMMENT 'Costo pagado al proveedor por unidad',
  PRIMARY KEY (compra_id, producto_id),
  CONSTRAINT fk_detalle_compra_compra   FOREIGN KEY (compra_id) REFERENCES compras (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT ck_detalle_compra_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_detalle_compra_costo    CHECK (costo_unitario >= 0)
) COMMENT = 'Productos de cada compra; al registrarla aumenta el stock';

CREATE TABLE gastos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tipo_gasto_id  INT NOT NULL,
  descripcion    VARCHAR(200) NOT NULL,
  monto          DECIMAL(10,2) NOT NULL,
  fecha          DATE NOT NULL DEFAULT (CURDATE()),
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gastos_tipo FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto (id),
  CONSTRAINT ck_gastos_descripcion CHECK (TRIM(descripcion) <> ''),
  CONSTRAINT ck_gastos_monto CHECK (monto > 0),
  INDEX idx_gastos_fecha (fecha)
) COMMENT = 'Gastos de operación: alquiler, servicios, sueldos, etc. (egreso)';
