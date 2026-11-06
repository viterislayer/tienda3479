// Crea las tablas (sql/schema.sql) y carga los datos (sql/datos.sql)
// Uso: npm run db:init            -> tablas + datos
//      npm run db:init -- --vacia -> solo tablas
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');

function leerSentencias(archivo) {
  return fs.readFileSync(path.join(__dirname, '..', 'sql', archivo), 'utf8')
    .split(/;\s*$/m)
    .map(s => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

async function main() {
  const archivos = process.argv.includes('--vacia') ? ['schema.sql'] : ['schema.sql', 'datos.sql'];

  const conn = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
  });
  try {
    for (const archivo of archivos) {
      const sentencias = leerSentencias(archivo);
      for (const sentencia of sentencias) await conn.execute(sentencia);
      console.log(`${archivo}: ${sentencias.length} sentencias ejecutadas.`);
    }
    await conn.commit();
    console.log('Base inicializada.');
  } finally {
    await conn.close();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
