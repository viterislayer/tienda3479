const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const configuracion = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT || 1521}/${process.env.DB_SERVICE || 'FREEPDB1'}`,
};

// Cada sesión usa fechas 'AAAA-MM-DD' (así las fechas de texto se convierten solas)
function prepararSesion(conexion, etiqueta, listo) {
  conexion.execute(`ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD'`).then(() => listo(), listo);
}

let pool = null;
function obtenerPool() {
  pool ??= oracledb.createPool({ ...configuracion, poolMin: 1, poolMax: 10, sessionCallback: prepararSesion })
    .catch(err => { pool = null; throw err; });
  return pool;
}

// Oracle devuelve los nombres de columna en MAYÚSCULAS; la API los entrega en minúsculas
function aMinusculas(filas) {
  return filas.map(fila => Object.fromEntries(Object.entries(fila).map(([col, valor]) => [col.toLowerCase(), valor])));
}

// Respuesta uniforme: rows (SELECT), rowCount (filas afectadas) y outBinds (RETURNING ... INTO)
function resultado(r) {
  return { rows: r.rows ? aMinusculas(r.rows) : [], rowCount: r.rows ? r.rows.length : r.rowsAffected, outBinds: r.outBinds };
}

// Variable de salida para RETURNING id INTO
const ID_SALIDA = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };

// Una sola sentencia, confirmada al terminar
async function query(sql, binds = []) {
  const conexion = await (await obtenerPool()).getConnection();
  try {
    return resultado(await conexion.execute(sql, binds, { autoCommit: true }));
  } finally {
    await conexion.close();
  }
}

// Varias sentencias que se confirman juntas o se deshacen todas si alguna falla
async function transaccion(trabajo) {
  const conexion = await (await obtenerPool()).getConnection();
  try {
    const salida = await trabajo(async (sql, binds = []) => resultado(await conexion.execute(sql, binds)));
    await conexion.commit();
    return salida;
  } catch (err) {
    await conexion.rollback().catch(() => {});
    throw err;
  } finally {
    await conexion.close();
  }
}

// Comprueba la conexión al arrancar
async function init() {
  await query('SELECT 1 FROM DUAL');
}

async function close() {
  if (pool) await (await pool).close(5);
}

module.exports = { configuracion, ID_SALIDA, init, query, transaccion, close };
