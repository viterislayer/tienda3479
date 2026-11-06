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

// El pool se crea en la primera consulta (necesario en entornos serverless como Vercel)
let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      ...prepararWallet(),
      poolMin: 0,
      poolMax: 5,
    }).catch(err => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

async function query(sql, binds = {}) {
  const conn = await (await getPool()).getConnection();
  try {
    return await conn.execute(sql, binds);
  } finally {
    await conn.close();
  }
}

async function close() {
  if (poolPromise) await (await poolPromise).close(5);
}

module.exports = { getPool, query, close };
