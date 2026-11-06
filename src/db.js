const fs = require('fs');
const os = require('os');
const path = require('path');
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

// En la nube (Oracle Autonomous Database con mTLS) el wallet llega como variable de entorno
function prepararWallet() {
  if (!process.env.DB_WALLET_PEM_BASE64) return {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-'));
  fs.writeFileSync(path.join(dir, 'ewallet.pem'), Buffer.from(process.env.DB_WALLET_PEM_BASE64, 'base64'));
  return { walletLocation: dir, walletPassword: process.env.DB_WALLET_PASSWORD };
}

async function init() {
  await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    ...prepararWallet(),
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
