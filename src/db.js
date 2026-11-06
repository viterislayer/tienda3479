const { Pool, types } = require('pg');

// PostgreSQL entrega NUMERIC y BIGINT (resultado de COUNT/SUM) como texto; la API los entrega como números
types.setTypeParser(types.builtins.NUMERIC, valor => parseFloat(valor));
types.setTypeParser(types.builtins.INT8, valor => parseInt(valor, 10));

const configuracion = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const pool = new Pool({ ...configuracion, max: 10 });

// Una sola sentencia
function query(sql, parametros = []) {
  return pool.query(sql, parametros);
}

// Varias sentencias que se confirman juntas o se deshacen todas si alguna falla
async function transaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo((sql, parametros) => cliente.query(sql, parametros));
    await cliente.query('COMMIT');
    return resultado;
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

// Comprueba la conexión al arrancar
async function init() {
  await pool.query('SELECT 1');
}

function close() {
  return pool.end();
}

module.exports = { configuracion, init, query, transaccion, close };
