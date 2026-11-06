// Deja la base desde cero: borra todo, aplica las migraciones y carga los datos (sql/datos.sql)
// Uso: npm run db:init            -> estructura + datos
//      npm run db:init -- --vacia -> solo estructura
// ATENCION: borra todos los datos. Para actualizar una base existente use npm run db:migrar
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { configuracion } = require('../src/db');
const { migrar } = require('./migrar');

async function main() {
  const cliente = new Client(configuracion);
  await cliente.connect();
  try {
    await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrar(cliente);
    if (!process.argv.includes('--vacia')) {
      await cliente.query(fs.readFileSync(path.join(__dirname, '..', 'sql', 'datos.sql'), 'utf8'));
      console.log('datos.sql: cargado.');
    }
    console.log('Base inicializada.');
  } finally {
    await cliente.end();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
