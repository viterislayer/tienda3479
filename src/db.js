const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function init() {
  await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
  });
}

// Oracle devuelve los nombres de columna en MAYÚSCULAS; la API los entrega en minúsculas
function aMinusculas(filas) {
  return filas.map(fila =>
    Object.fromEntries(Object.entries(fila).map(([col, valor]) => [col.toLowerCase(), valor]))
  );
}

async function ejecutar(conn, sql, binds = {}, opciones = {}) {
  const resultado = await conn.execute(sql, binds, opciones);
  if (resultado.rows) resultado.rows = aMinusculas(resultado.rows);
  return resultado;
}

// Una sola sentencia, confirmada al terminar
async function query(sql, binds = {}) {
  const conn = await oracledb.getConnection();
  try {
    return await ejecutar(conn, sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}

// Varias sentencias que se confirman juntas o se deshacen todas si alguna falla
async function transaccion(trabajo) {
  const conn = await oracledb.getConnection();
  try {
    const resultado = await trabajo((sql, binds) => ejecutar(conn, sql, binds));
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.close();
  }
}

async function close() {
  await oracledb.getPool().close(5);
}

module.exports = { init, query, transaccion, close, BIND_OUT: oracledb.BIND_OUT, NUMBER: oracledb.NUMBER };
