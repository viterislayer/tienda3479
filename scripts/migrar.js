// Aplica en orden las migraciones de sql/migraciones que aún no se han aplicado
// y las registra en la tabla schema_migraciones.
// Uso: npm run db:migrar
// Nota: en Oracle los CREATE/ALTER se confirman solos, por eso cada archivo se registra apenas termina.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const { configuracion } = require('../src/db');

const CARPETA = path.join(__dirname, '..', 'sql', 'migraciones');

// Oracle ejecuta una sentencia a la vez: se separa el archivo por ';' al final de línea
function sentencias(archivo) {
  return fs.readFileSync(archivo, 'utf8')
    .split(/;\s*$/m)
    .map(s => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

function conectar() {
  return oracledb.getConnection(configuracion);
}

async function migrar(conexion) {
  await conexion.execute(`
    CREATE TABLE IF NOT EXISTS schema_migraciones (
      version     VARCHAR2(100) PRIMARY KEY,
      aplicada_en DATE DEFAULT SYSDATE NOT NULL
    )`);

  const { rows } = await conexion.execute('SELECT version FROM schema_migraciones', [], { outFormat: oracledb.OUT_FORMAT_ARRAY });
  const aplicadas = new Set(rows.map(([version]) => version));
  const pendientes = fs.readdirSync(CARPETA).filter(f => f.endsWith('.sql')).sort().filter(f => !aplicadas.has(f));

  for (const archivo of pendientes) {
    for (const sentencia of sentencias(path.join(CARPETA, archivo))) {
      try {
        await conexion.execute(sentencia);
      } catch (err) {
        throw new Error(`${archivo}: ${err.message}\n${sentencia.slice(0, 120)}`);
      }
    }
    await conexion.execute('INSERT INTO schema_migraciones (version) VALUES (:v)', { v: archivo }, { autoCommit: true });
    console.log(`${archivo}: aplicada.`);
  }
  if (!pendientes.length) console.log('La base ya está al día.');
}

module.exports = { conectar, migrar, sentencias };

if (require.main === module) {
  (async () => {
    const conexion = await conectar();
    try {
      await migrar(conexion);
    } finally {
      await conexion.close();
    }
  })().catch(err => {
    console.error('Error en la migración:', err.message);
    process.exit(1);
  });
}
