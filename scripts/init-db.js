// Deja la base desde cero: borra tablas y vistas, aplica las migraciones y carga los datos (sql/datos.sql)
// Uso: npm run db:init            -> estructura + datos
//      npm run db:init -- --vacia -> solo estructura
// ATENCION: borra todos los datos. Para actualizar una base existente use npm run db:migrar
require('dotenv').config({ quiet: true });
const path = require('path');
const oracledb = require('oracledb');
const { conectar, migrar, sentencias } = require('./migrar');

async function borrarTodo(conexion) {
  const { rows } = await conexion.execute(
    `SELECT object_name, object_type FROM user_objects WHERE object_type IN ('VIEW', 'TABLE')`,
    [], { outFormat: oracledb.OUT_FORMAT_ARRAY }
  );
  for (const [nombre, tipo] of rows.filter(([, t]) => t === 'VIEW')) await conexion.execute(`DROP VIEW "${nombre}"`);
  for (const [nombre] of rows.filter(([, t]) => t === 'TABLE')) await conexion.execute(`DROP TABLE "${nombre}" CASCADE CONSTRAINTS PURGE`);
}

async function main() {
  const conexion = await conectar();
  try {
    await borrarTodo(conexion);
    await migrar(conexion);
    if (!process.argv.includes('--vacia')) {
      for (const sentencia of sentencias(path.join(__dirname, '..', 'sql', 'datos.sql'))) await conexion.execute(sentencia);
      await conexion.commit();
      console.log('datos.sql: cargado.');
    }
    console.log('Base inicializada.');
  } finally {
    await conexion.close();
  }
}

main().catch(err => {
  console.error('Error al inicializar la base:', err.message);
  process.exit(1);
});
