// Error con código HTTP y mensaje pensado para el usuario
class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Mensajes específicos según la regla (restricción) de la base que no se cumplió
const RESTRICCIONES = {
  uq_categorias_nombre: [409, 'Ya existe una categoría con ese nombre.'],
  uq_clientes_correo: [409, 'Ya existe un cliente con ese correo.'],
  uq_clientes_nit_dpi: [409, 'Ya existe un cliente con ese NIT/DPI.'],
  uq_proveedores_nit: [409, 'Ya existe un proveedor con ese NIT.'],
  uq_tipos_gasto_nombre: [409, 'Ya existe un tipo de gasto con ese nombre.'],
  ck_categorias_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_productos_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_clientes_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_proveedores_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_tipos_gasto_nombre: [400, 'El nombre no puede estar vacío.'],
  ck_clientes_nit_dpi: [400, 'El NIT/DPI solo puede tener números, K y guion.'],
  ck_proveedores_nit: [400, 'El NIT solo puede tener números, K y guion.'],
  ck_clientes_correo: [400, 'El correo no tiene un formato válido.'],
  ck_productos_precio: [400, 'El precio no puede ser negativo.'],
  ck_productos_stock: [400, 'El stock no puede ser negativo.'],
  ck_gastos_descripcion: [400, 'La descripción no puede estar vacía.'],
  ck_gastos_monto: [400, 'El monto debe ser mayor que cero.'],
  ck_detalle_venta_cantidad: [400, 'La cantidad debe ser mayor que cero.'],
  ck_detalle_compra_cantidad: [400, 'La cantidad debe ser mayor que cero.'],
  ck_detalle_compra_costo: [400, 'El costo no puede ser negativo.'],
};

// Códigos de error de MySQL más comunes
const ERRORES_MYSQL = {
  1048: [400, 'Falta un campo obligatorio.'],
  1062: [409, 'Ya existe un registro con ese valor (dato duplicado).'],
  1264: [400, 'Un número es demasiado grande.'],
  1292: [400, 'Un valor no tiene el formato correcto.'],
  1366: [400, 'Un valor no tiene el formato correcto.'],
  1406: [400, 'Un texto es demasiado largo.'],
  1451: [409, 'No se puede eliminar porque tiene registros relacionados.'],
  1452: [400, 'El registro relacionado no existe.'],
  3819: [400, 'Un valor no cumple las reglas de la base de datos.'],
};

// Nombre de la restricción que falló, sacado del mensaje de MySQL:
//   1062: "Duplicate entry 'x' for key 'clientes.uq_clientes_correo'"
//   3819: "Check constraint 'ck_productos_stock' is violated."
function restriccion(err) {
  const coincidencia = err.errno === 1062
    ? /for key '(?:[^.']+\.)?([^']+)'/.exec(err.sqlMessage || '')
    : err.errno === 3819 ? /constraint '([^']+)'/.exec(err.sqlMessage || '') : null;
  return coincidencia ? coincidencia[1] : null;
}

function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });

  const especifico = RESTRICCIONES[restriccion(err)];
  if (especifico) return res.status(especifico[0]).json({ error: especifico[1] });

  const conocido = ERRORES_MYSQL[err.errno];
  if (conocido) return res.status(conocido[0]).json({ error: conocido[1] });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { ErrorApi, manejarErrores, restriccion };
