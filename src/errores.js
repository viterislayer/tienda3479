// Error con código HTTP y mensaje pensado para el usuario
class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Traducción de los códigos de error de PostgreSQL (SQLSTATE) más comunes
const ERRORES_POSTGRES = {
  '23505': [409, 'Ya existe un registro con ese valor (dato duplicado).'],
  '23502': [400, 'Falta un campo obligatorio.'],
  '23514': [400, 'Un valor no cumple las reglas (por ejemplo, un precio o stock negativo).'],
  '22001': [400, 'Un texto es demasiado largo.'],
  '22003': [400, 'Un número es demasiado grande.'],
  '22P02': [400, 'Un valor no tiene el formato correcto.'],
};

// Mensajes específicos según la regla (restricción) de la base que no se cumplió
const RESTRICCIONES = {
  uq_categorias_nombre: [409, 'Ya existe una categoría con ese nombre.'],
  uq_clientes_correo: [409, 'Ya existe un cliente con ese correo.'],
  clientes_nit_dpi_key: [409, 'Ya existe un cliente con ese NIT/DPI.'],
  ck_categorias_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_productos_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_clientes_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_clientes_nit_dpi: [400, 'El NIT/DPI solo puede tener números, K y guion.'],
  ck_clientes_correo: [400, 'El correo no tiene un formato válido.'],
  productos_precio_check: [400, 'El precio no puede ser negativo.'],
  productos_stock_check: [400, 'El stock no puede ser negativo.'],
  uq_proveedores_nit: [409, 'Ya existe un proveedor con ese NIT.'],
  ck_proveedores_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_proveedores_nit: [400, 'El NIT solo puede tener números, K y guion.'],
  uq_tipos_gasto_nombre: [409, 'Ya existe un tipo de gasto con ese nombre.'],
  ck_tipos_gasto_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_gastos_descripcion: [400, 'La descripción no puede estar vacía.'],
  ck_gastos_monto: [400, 'El monto debe ser mayor que cero.'],
  ck_detalle_compra_cantidad: [400, 'La cantidad debe ser mayor que cero.'],
  ck_detalle_compra_costo: [400, 'El costo no puede ser negativo.'],
};

function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });

  const restriccion = RESTRICCIONES[err.constraint];
  if (restriccion) return res.status(restriccion[0]).json({ error: restriccion[1] });

  // Llave foránea: al borrar significa que hay registros que dependen de este; al guardar, que el relacionado no existe
  if (err.code === '23503') {
    return req.method === 'DELETE'
      ? res.status(409).json({ error: 'No se puede eliminar porque tiene registros relacionados.' })
      : res.status(400).json({ error: 'El registro relacionado no existe.' });
  }

  const conocido = ERRORES_POSTGRES[err.code];
  if (conocido) return res.status(conocido[0]).json({ error: conocido[1] });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { ErrorApi, manejarErrores };
