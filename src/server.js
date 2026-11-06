require('dotenv').config();
const path = require('path');
const express = require('express');
const oracledb = require('oracledb');
const db = require('./db');

// Tablas expuestas por la API y sus columnas editables (ID se genera solo)
const TABLAS = {
  productos: { tabla: 'PRODUCTOS', columnas: ['NOMBRE', 'PRECIO', 'STOCK'] },
  clientes: { tabla: 'CLIENTES', columnas: ['NOMBRE', 'NIT_DPI', 'CORREO'] },
};

const app = express();
app.use(express.json());

// Permite llamar a la API desde otros orígenes (Live Preview, Postman web, otras apps)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/estado', async (req, res) => {
  try {
    const r = await db.query(`SELECT USER AS USUARIO, SYS_CONTEXT('USERENV','CON_NAME') AS BASE FROM DUAL`);
    res.json({ conectado: true, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ conectado: false, error: e.message });
  }
});

function tomarDatos(cfg, body) {
  const datos = {};
  for (const col of cfg.columnas) datos[col] = body[col] ?? body[col.toLowerCase()] ?? null;
  return datos;
}

for (const [ruta, cfg] of Object.entries(TABLAS)) {
  const base = `/api/${ruta}`;
  const cols = cfg.columnas;

  app.get(base, async (req, res, next) => {
    try {
      const r = await db.query(`SELECT ID, ${cols.join(', ')} FROM ${cfg.tabla} ORDER BY ID`);
      res.json(r.rows);
    } catch (e) { next(e); }
  });

  app.get(`${base}/:id`, async (req, res, next) => {
    try {
      const r = await db.query(`SELECT ID, ${cols.join(', ')} FROM ${cfg.tabla} WHERE ID = :id`, { id: Number(req.params.id) });
      if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });
      res.json(r.rows[0]);
    } catch (e) { next(e); }
  });

  app.post(base, async (req, res, next) => {
    try {
      const datos = tomarDatos(cfg, req.body);
      const r = await db.query(
        `INSERT INTO ${cfg.tabla} (ID, ${cols.join(', ')})
         VALUES ((SELECT NVL(MAX(ID), 0) + 1 FROM ${cfg.tabla}), ${cols.map(c => ':' + c).join(', ')})
         RETURNING ID INTO :nuevoId`,
        { ...datos, nuevoId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
      );
      res.status(201).json({ ID: r.outBinds.nuevoId[0], ...datos });
    } catch (e) { next(e); }
  });

  app.put(`${base}/:id`, async (req, res, next) => {
    try {
      const datos = tomarDatos(cfg, req.body);
      const r = await db.query(
        `UPDATE ${cfg.tabla} SET ${cols.map(c => `${c} = :${c}`).join(', ')} WHERE ID = :id`,
        { ...datos, id: Number(req.params.id) }
      );
      if (!r.rowsAffected) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ID: Number(req.params.id), ...datos });
    } catch (e) { next(e); }
  });

  app.delete(`${base}/:id`, async (req, res, next) => {
    try {
      const r = await db.query(`DELETE FROM ${cfg.tabla} WHERE ID = :id`, { id: Number(req.params.id) });
      if (!r.rowsAffected) return res.status(404).json({ error: 'No encontrado' });
      res.json({ eliminado: true });
    } catch (e) { next(e); }
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message });
});

// En local se levanta el servidor; en Vercel se exporta la app y la plataforma la ejecuta
if (require.main === module) {
  db.getPool()
    .then(() => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => console.log(`Servidor listo en http://localhost:${port}`));
    })
    .catch(e => {
      console.error('No se pudo conectar a Oracle:', e.message);
      process.exit(1);
    });

  process.on('SIGINT', async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
}

module.exports = app;
