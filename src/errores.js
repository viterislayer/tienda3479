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

// Códigos ORA más comunes
const ERRORES_ORACLE = {
  1: [409, 'Ya existe un registro con ese valor (dato duplicado).'],
  1400: [400, 'Falta un campo obligatorio.'],
  1438: [400, 'Un número es demasiado grande.'],
  1722: [400, 'Un valor no tiene el formato correcto.'],
  1841: [400, 'La fecha no es válida.'],
  1861: [400, 'La fecha no es válida.'],
  2290: [400, 'Un valor no cumple las reglas de la base de datos.'],
  2291: [400, 'El registro relacionado no existe.'],
  2292: [409, 'No se puede eliminar porque tiene registros relacionados.'],
  12899: [400, 'Un texto es demasiado largo.'],
};

// Nombre de la restricción que falló, sacado del mensaje de Oracle:
//   ORA-00001: unique constraint (TIENDA3479.UQ_CLIENTES_CORREO) violated
//   ORA-02290: check constraint (TIENDA3479.CK_PRODUCTOS_STOCK) violated
function restriccion(err) {
  if (err.errorNum !== 1 && err.errorNum !== 2290) return null;
  const coincidencia = /\((?:[^.()]+\.)?([^()]+)\)/.exec(err.message || '');
  return coincidencia ? coincidencia[1].toLowerCase() : null;
}

function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos enviados son demasiado grandes.' });

  const especifico = RESTRICCIONES[restriccion(err)];
  if (especifico) return res.status(especifico[0]).json({ error: especifico[1] });

  const conocido = ERRORES_ORACLE[err.errorNum];
  if (conocido) return res.status(conocido[0]).json({ error: conocido[1] });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { ErrorApi, manejarErrores, restriccion };
