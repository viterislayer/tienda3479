// Aplica en orden las migraciones de sql/migraciones que aún no se han aplicado
// y las registra en la tabla schema_migraciones.
// Uso: npm run db:migrar
// Nota: en MySQL los CREATE/ALTER se confirman solos, por eso cada archivo se registra apenas termina.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { configuracion, ZONA } = require('../src/db');

const CARPETA = path.join(__dirname, '..', 'sql', 'migraciones');

function conectar() {
  return mysql.createConnection({ ...configuracion, multipleStatements: true });
}

async function migrar(conexion) {
  await conexion.query(`SET time_zone = '${ZONA}'`);
  await conexion.query(`
    CREATE TABLE IF NOT EXISTS schema_migraciones (
      version     VARCHAR(100) PRIMARY KEY,
      aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) COMMENT = 'Migraciones de estructura ya aplicadas'`);

  const [filas] = await conexion.query('SELECT version FROM schema_migraciones');
  const aplicadas = new Set(filas.map(f => f.version));
  const pendientes = fs.readdirSync(CARPETA).filter(f => f.endsWith('.sql')).sort().filter(f => !aplicadas.has(f));

  for (const archivo of pendientes) {
    try {
      await conexion.query(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
    } catch (err) {
      throw new Error(`${archivo}: ${err.message}`);
    }
    await conexion.query('INSERT INTO schema_migraciones (version) VALUES (?)', [archivo]);
    console.log(`${archivo}: aplicada.`);
  }
  if (!pendientes.length) console.log('La base ya está al día.');
}

module.exports = { conectar, migrar };

if (require.main === module) {
  (async () => {
    const conexion = await conectar();
    try {
      await migrar(conexion);
    } finally {
      await conexion.end();
    }
  })().catch(err => {
    console.error('Error en la migración:', err.message);
    process.exit(1);
  });
}
