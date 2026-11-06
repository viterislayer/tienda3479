const { ErrorApi } = require('./errores');

// Convierte y valida un valor según su tipo: 'texto', 'fecha', 'numero' o 'entero'
function convertir(campo, tipo, valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  if (tipo === 'texto') return String(valor).trim();
  if (tipo === 'fecha') {
    const texto = String(valor).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(texto))) {
      throw new ErrorApi(400, `El campo "${campo}" debe ser una fecha válida (AAAA-MM-DD).`);
    }
    return texto;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) throw new ErrorApi(400, `El campo "${campo}" debe ser un número.`);
  if (tipo === 'entero' && !Number.isInteger(numero)) throw new ErrorApi(400, `El campo "${campo}" debe ser un número entero.`);
  return numero;
}

// Toma del body solo los campos permitidos y revisa los obligatorios
function leerCampos(body = {}, campos, requeridos = []) {
  const datos = {};
  for (const [campo, tipo] of Object.entries(campos)) {
    datos[campo] = convertir(campo, tipo, body[campo]);
    if (requeridos.includes(campo) && datos[campo] === null) {
      throw new ErrorApi(400, `El campo "${campo}" es obligatorio.`);
    }
  }
  return datos;
}

function leerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApi(400, 'El id debe ser un número entero positivo.');
  return id;
}

module.exports = { convertir, leerCampos, leerId };
