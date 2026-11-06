require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const db = require('./db');
const crearCrud = require('./routes/crud');
const ventas = require('./routes/ventas');
const compras = require('./routes/compras');
const finanzas = require('./routes/finanzas');
const reportes = require('./routes/reportes');
const { manejarErrores } = require('./errores');

const app = express();
app.use(express.json());

// Permite llamar a la API desde otros orígenes (Postman, otras apps)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/estado', async (req, res) => {
  const { rows } = await db.query('SELECT CURRENT_USER() AS usuario, DATABASE() AS base');
  res.json({ conectado: true, ...rows[0] });
});

app.use('/api/categorias', crearCrud({
  tabla: 'categorias',
  campos: { nombre: 'texto' },
  requeridos: ['nombre'],
  orden: 'nombre',
}));

app.use('/api/productos', crearCrud({
  tabla: 'productos',
  campos: { nombre: 'texto', precio: 'numero', stock: 'entero', categoria_id: 'entero' },
  requeridos: ['nombre', 'precio', 'stock', 'categoria_id'],
  consulta: `SELECT p.id, p.nombre, p.precio, p.stock, p.categoria_id, c.nombre AS categoria
               FROM productos p
               JOIN categorias c ON c.id = p.categoria_id`,
  columnaId: 'p.id',
  orden: 'p.nombre',
}));

app.use('/api/clientes', crearCrud({
  tabla: 'clientes',
  campos: { nombre: 'texto', nit_dpi: 'texto', correo: 'texto' },
  requeridos: ['nombre', 'nit_dpi'],
  orden: 'nombre',
}));

app.use('/api/proveedores', crearCrud({
  tabla: 'proveedores',
  campos: { nombre: 'texto', nit: 'texto', telefono: 'texto' },
  requeridos: ['nombre', 'nit'],
  orden: 'nombre',
}));

app.use('/api/tipos-gasto', crearCrud({
  tabla: 'tipos_gasto',
  campos: { nombre: 'texto' },
  requeridos: ['nombre'],
  orden: 'nombre',
}));

app.use('/api/gastos', crearCrud({
  tabla: 'gastos',
  campos: { fecha: 'fecha', tipo_gasto_id: 'entero', descripcion: 'texto', monto: 'numero' },
  requeridos: ['fecha', 'tipo_gasto_id', 'descripcion', 'monto'],
  consulta: `SELECT g.id, g.fecha, g.tipo_gasto_id, t.nombre AS tipo_gasto, g.descripcion, g.monto
               FROM gastos g
               JOIN tipos_gasto t ON t.id = g.tipo_gasto_id`,
  columnaId: 'g.id',
  orden: 'g.fecha DESC, g.id DESC',
}));

app.use('/api/ventas', ventas);
app.use('/api/compras', compras);
app.use('/api/finanzas', finanzas);
app.use('/api/reportes', reportes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use(manejarErrores);

db.init()
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Servidor listo en http://localhost:${port}`));
  })
  .catch(err => {
    console.error('No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await db.close().catch(() => {});
  process.exit(0);
});
