// Crea las tablas (sql/schema.sql) y carga los datos (sql/datos.sql) en una sola transacción
// Uso: npm run db:init            -> tablas + datos
//      npm run db:init -- --vacia -> solo tablas
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { configuracion } = require('../src/db');

const leer = archivo => fs.readFileSync(path.join(__dirname, '..', 'sql', archivo), 'utf8');

async function main() {
  const archivos = process.argv.includes('--vacia') ? ['schema.sql'] : ['schema.sql', 'datos.sql'];
  const cliente = new Client(configuracion);
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    for (const archivo of archivos) {
      await cliente.query(leer(archivo));
      console.log(`${archivo} ejecutado.`);
    }
    await cliente.query('COMMIT');
    console.log('Base inicializada.');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    await cliente.end();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
