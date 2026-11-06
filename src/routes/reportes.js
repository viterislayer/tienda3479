const express = require('express');
const db = require('../db');

const router = express.Router();
const DIAS_GRAFICA = 14;
const STOCK_BAJO = 3;

// Total vendido (cantidad de ventas y monto) desde una fecha calculada en Oracle
async function totalesDesde(expresionFecha) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT v.id) AS cantidad,
            NVL(SUM(d.cantidad * d.precio_unitario), 0) AS total
       FROM ventas v
       JOIN detalle_venta d ON d.venta_id = v.id
      WHERE v.fecha >= ${expresionFecha}`
  );
  return rows[0];
}

// Devuelve los últimos N días, incluidos los días sin ventas (con total 0)
function completarDias(hoy, filas) {
  const porDia = new Map(filas.map(f => [f.dia, f]));
  const dias = [];
  for (let i = DIAS_GRAFICA - 1; i >= 0; i--) {
    const fecha = new Date(`${hoy}T00:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() - i);
    const dia = fecha.toISOString().slice(0, 10);
    dias.push({ dia, cantidad: porDia.get(dia)?.cantidad || 0, total: porDia.get(dia)?.total || 0 });
  }
  return dias;
}

router.get('/resumen', async (req, res) => {
  const [hoy, mes, total, stock, porDia, topProductos, porCategoria, topClientes, fecha] = await Promise.all([
    totalesDesde('TRUNC(SYSDATE)'),
    totalesDesde(`TRUNC(SYSDATE, 'MM')`),
    totalesDesde(`DATE '1900-01-01'`),
    db.query(
      `SELECT COUNT(CASE WHEN stock = 0 THEN 1 END) AS agotados,
              COUNT(CASE WHEN stock BETWEEN 1 AND :bajo THEN 1 END) AS bajos
         FROM productos`,
      { bajo: STOCK_BAJO }
    ),
    db.query(
      `SELECT TO_CHAR(TRUNC(v.fecha), 'YYYY-MM-DD') AS dia,
              COUNT(DISTINCT v.id) AS cantidad,
              SUM(d.cantidad * d.precio_unitario) AS total
         FROM ventas v
         JOIN detalle_venta d ON d.venta_id = v.id
        WHERE v.fecha >= TRUNC(SYSDATE) - :dias
        GROUP BY TRUNC(v.fecha)`,
      { dias: DIAS_GRAFICA - 1 }
    ),
    db.query(
      `SELECT p.nombre AS producto, SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS total
         FROM detalle_venta d
         JOIN productos p ON p.id = d.producto_id
        GROUP BY p.nombre
        ORDER BY total DESC
        FETCH FIRST 5 ROWS ONLY`
    ),
    db.query(
      `SELECT c.nombre AS categoria, SUM(d.cantidad * d.precio_unitario) AS total
         FROM detalle_venta d
         JOIN productos p ON p.id = d.producto_id
         JOIN categorias c ON c.id = p.categoria_id
        GROUP BY c.nombre
        ORDER BY total DESC`
    ),
    db.query(
      `SELECT cl.nombre AS cliente, COUNT(DISTINCT v.id) AS compras, SUM(d.cantidad * d.precio_unitario) AS total
         FROM ventas v
         JOIN clientes cl ON cl.id = v.cliente_id
         JOIN detalle_venta d ON d.venta_id = v.id
        GROUP BY cl.nombre
        ORDER BY total DESC
        FETCH FIRST 5 ROWS ONLY`
    ),
    db.query(`SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD') AS hoy FROM DUAL`),
  ]);

  res.json({
    hoy,
    mes,
    ticket_promedio: total.cantidad ? total.total / total.cantidad : 0,
    stock: stock.rows[0],
    por_dia: completarDias(fecha.rows[0].hoy, porDia.rows),
    top_productos: topProductos.rows,
    por_categoria: porCategoria.rows,
    top_clientes: topClientes.rows,
  });
});

module.exports = router;
