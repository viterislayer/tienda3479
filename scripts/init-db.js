// Deja la base desde cero: borra tablas y vistas, aplica las migraciones y carga los datos (sql/datos.sql)
// Uso: npm run db:init            -> estructura + datos
//      npm run db:init -- --vacia -> solo estructura
// ATENCION: borra todos los datos. Para actualizar una base existente use npm run db:migrar
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { conectar, migrar } = require('./migrar');

async function borrarTodo(conexion) {
  const [objetos] = await conexion.query(
    `SELECT table_name AS nombre, table_type AS tipo
       FROM information_schema.tables
      WHERE table_schema = DATABASE()`
  );
  await conexion.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { nombre, tipo } of objetos) {
    await conexion.query(`DROP ${tipo === 'VIEW' ? 'VIEW' : 'TABLE'} IF EXISTS \`${nombre}\``);
  }
  await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function main() {
  const conexion = await conectar();
  try {
    await borrarTodo(conexion);
    await migrar(conexion);
    if (!process.argv.includes('--vacia')) {
      await conexion.query(fs.readFileSync(path.join(__dirname, '..', 'sql', 'datos.sql'), 'utf8'));
      console.log('datos.sql: cargado.');
    }
    console.log('Base inicializada.');
  } finally {
    await conexion.end();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
