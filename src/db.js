const mysql = require('mysql2/promise');

// Hora de Guatemala (UTC-6, sin horario de verano): las fechas DATETIME se guardan y leen en esa zona
const ZONA = '-06:00';

const configuracion = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  timezone: ZONA,
  decimalNumbers: true, // DECIMAL llega como número y no como texto
  dateStrings: ['DATE'], // DATE llega tal cual ('2026-11-05') para no correrse de día
};

const pool = mysql.createPool({ ...configuracion, connectionLimit: 10 });

// Cada conexión nueva trabaja en hora de Guatemala (NOW(), CURDATE(), DEFAULT CURRENT_TIMESTAMP)
pool.pool.on('connection', conexion => conexion.query(`SET time_zone = '${ZONA}'`));

// Respuesta uniforme: rows (SELECT), rowCount (filas afectadas) e insertId (INSERT)
function resultado([datos]) {
  return Array.isArray(datos)
    ? { rows: datos, rowCount: datos.length }
    : { rows: [], rowCount: datos.affectedRows, insertId: datos.insertId };
}

// Una sola sentencia
async function query(sql, parametros = []) {
  return resultado(await pool.query(sql, parametros));
}

// Varias sentencias que se confirman juntas o se deshacen todas si alguna falla
async function transaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const salida = await trabajo(async (sql, parametros) => resultado(await conexion.query(sql, parametros)));
    await conexion.commit();
    return salida;
  } catch (err) {
    await conexion.rollback().catch(() => {});
    throw err;
  } finally {
    conexion.release();
  }
}

// Comprueba la conexión al arrancar
async function init() {
  await pool.query('SELECT 1');
}

function close() {
  return pool.end();
}

module.exports = { configuracion, ZONA, init, query, transaccion, close };
