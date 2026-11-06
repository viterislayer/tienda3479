// Aplica en orden las migraciones de sql/migraciones que aún no se han aplicado.
// Cada migración corre en su propia transacción y queda registrada en la tabla schema_migraciones.
// Uso: npm run db:migrar
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { configuracion } = require('../src/db');

const CARPETA = path.join(__dirname, '..', 'sql', 'migraciones');

async function migrar(cliente) {
  await cliente.query(`
    CREATE TABLE IF NOT EXISTS schema_migraciones (
      version     VARCHAR(100) PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const archivos = fs.readdirSync(CARPETA).filter(f => f.endsWith('.sql')).sort();
  const { rows } = await cliente.query('SELECT version FROM schema_migraciones');
  const aplicadas = new Set(rows.map(r => r.version));

  // Bases creadas antes de usar migraciones: si las tablas ya existen, la 001 se marca como aplicada
  if (!aplicadas.size) {
    const { rows: tablas } = await cliente.query(`SELECT to_regclass('public.productos') IS NOT NULL AS existe`);
    if (tablas[0].existe) {
      await cliente.query('INSERT INTO schema_migraciones (version) VALUES ($1)', [archivos[0]]);
      aplicadas.add(archivos[0]);
      console.log(`${archivos[0]}: ya existía, se registra como aplicada.`);
    }
  }

  const pendientes = archivos.filter(f => !aplicadas.has(f));
  for (const archivo of pendientes) {
    await cliente.query('BEGIN');
    try {
      await cliente.query(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
      await cliente.query('INSERT INTO schema_migraciones (version) VALUES ($1)', [archivo]);
      await cliente.query('COMMIT');
      console.log(`${archivo}: aplicada.`);
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw new Error(`${archivo}: ${err.message}`);
    }
  }
  if (!pendientes.length) console.log('La base ya está al día.');
}

module.exports = { migrar };

if (require.main === module) {
  const cliente = new Client(configuracion);
  cliente.connect()
    .then(() => migrar(cliente))
    .then(() => cliente.end())
    .catch(async err => {
      console.error('Error en la migración:', err.message);
      await cliente.end().catch(() => {});
      process.exit(1);
    });
}
