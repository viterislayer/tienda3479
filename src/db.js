const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

async function init() {
  await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
  });
}

async function query(sql, binds = {}) {
  const conn = await oracledb.getConnection();
  try {
    return await conn.execute(sql, binds);
  } finally {
    await conn.close();
  }
}

async function close() {
  await oracledb.getPool().close(5);
}

module.exports = { init, query, close };
