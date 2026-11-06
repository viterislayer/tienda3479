const express = require('express');
const db = require('../db');
const { ErrorApi } = require('../errores');
const { leerCampos, leerId } = require('../validacion');

/**
 * Crea las rutas GET, POST, PUT y DELETE de una tabla.
 * - campos: columnas editables y su tipo ('texto', 'fecha', 'numero', 'entero')
 * - consulta: SELECT para listar (permite JOIN); por defecto lee la tabla sola
 * - columnaId: columna id dentro de la consulta (ej. 'p.id' si hay alias)
 */
function crearCrud({ tabla, campos, requeridos = [], consulta, columnaId = 'id', orden }) {
  const router = express.Router();
  const columnas = Object.keys(campos);
  const select = consulta || `SELECT id, ${columnas.join(', ')} FROM ${tabla}`;

  async function buscar(id) {
    const { rows } = await db.query(`${select} WHERE ${columnaId} = ?`, [id]);
    if (!rows.length) throw new ErrorApi(404, 'Registro no encontrado.');
    return rows[0];
  }

  router.get('/', async (req, res) => {
    const { rows } = await db.query(`${select} ORDER BY ${orden || columnaId}`);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    res.json(await buscar(leerId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const datos = leerCampos(req.body, campos, requeridos);
    const { insertId } = await db.query(
      `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      columnas.map(c => datos[c])
    );
    res.status(201).json(await buscar(insertId));
  });

  router.put('/:id', async (req, res) => {
    const id = leerId(req.params.id);
    const datos = leerCampos(req.body, campos, requeridos);
    const { rowCount } = await db.query(
      `UPDATE ${tabla} SET ${columnas.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...columnas.map(c => datos[c]), id]
    );
    if (!rowCount) throw new ErrorApi(404, 'Registro no encontrado.');
    res.json(await buscar(id));
  });

  router.delete('/:id', async (req, res) => {
    const { rowCount } = await db.query(`DELETE FROM ${tabla} WHERE id = ?`, [leerId(req.params.id)]);
    if (!rowCount) throw new ErrorApi(404, 'Registro no encontrado.');
    res.status(204).end();
  });

  return router;
}

module.exports = crearCrud;
