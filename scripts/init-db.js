// Crea las tablas y los datos de ejemplo ejecutando sql/schema.sql
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  const sentencias = sql
    .split(/;\s*$/m)
    .map(s => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);

  const conn = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
  });
  try {
    for (const sentencia of sentencias) await conn.execute(sentencia);
    await conn.commit();
    console.log(`Base inicializada: ${sentencias.length} sentencias ejecutadas.`);
  } finally {
    await conn.close();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
