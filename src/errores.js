// Error con código HTTP y mensaje pensado para el usuario
class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Traducción de los errores de Oracle más comunes a respuestas claras
const ERRORES_ORACLE = {
  1: [409, 'Ya existe un registro con ese valor (dato duplicado).'],
  1400: [400, 'Falta un campo obligatorio.'],
  1438: [400, 'Un número es demasiado grande.'],
  2290: [400, 'Un valor no cumple las reglas (por ejemplo, un precio o stock negativo).'],
  2291: [400, 'El registro relacionado no existe.'],
  2292: [409, 'No se puede eliminar porque tiene registros relacionados.'],
  12899: [400, 'Un texto es demasiado largo.'],
};

function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });

  const oracle = ERRORES_ORACLE[err.errorNum];
  if (oracle) return res.status(oracle[0]).json({ error: oracle[1] });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { ErrorApi, manejarErrores };
