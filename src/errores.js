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

function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });

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
