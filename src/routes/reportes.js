const express = require('express');
const db = require('../db');

const router = express.Router();
const DIAS_GRAFICA = 14;
const STOCK_BAJO = 3;
// Las fechas se guardan con zona horaria; los días se cuentan en hora de Guatemala
const ZONA = 'America/Guatemala';
const HOY = `(now() AT TIME ZONE '${ZONA}')::date`;
const DIA_VENTA = `(v.fecha AT TIME ZONE '${ZONA}')::date`;

// Cantidad de ventas y monto vendido a partir de un día (o de todo el historial)
async function totalesDesde(desde) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT v.id) AS cantidad,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
       FROM ventas v
       JOIN detalle_venta d ON d.venta_id = v.id
      WHERE ${desde ? `${DIA_VENTA} >= ${desde}` : 'TRUE'}`
  );
  return rows[0];
}

router.get('/resumen', async (req, res) => {
  const [hoy, mes, total, stock, porDia, topProductos, porCategoria, topClientes] = await Promise.all([
    totalesDesde(HOY),
    totalesDesde(`date_trunc('month', ${HOY})::date`),
    totalesDesde(null),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE stock = 0) AS agotados,
              COUNT(*) FILTER (WHERE stock BETWEEN 1 AND $1) AS bajos
         FROM productos`,
      [STOCK_BAJO]
    ),
    // generate_series crea los 14 días aunque no haya ventas; el LEFT JOIN los deja en 0
    db.query(
      `SELECT to_char(dias.dia, 'YYYY-MM-DD') AS dia,
              COUNT(DISTINCT v.id) AS cantidad,
              COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
         FROM generate_series(${HOY} - ($1::int - 1), ${HOY}, interval '1 day') AS dias(dia)
         LEFT JOIN ventas v ON ${DIA_VENTA} = dias.dia::date
         LEFT JOIN detalle_venta d ON d.venta_id = v.id
        GROUP BY dias.dia
        ORDER BY dias.dia`,
      [DIAS_GRAFICA]
    ),
    db.query(
      `SELECT p.nombre AS producto, SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS total
         FROM detalle_venta d
         JOIN productos p ON p.id = d.producto_id
        GROUP BY p.id, p.nombre
        ORDER BY total DESC
        LIMIT 5`
    ),
    db.query(
      `SELECT c.nombre AS categoria, SUM(d.cantidad * d.precio_unitario) AS total
         FROM detalle_venta d
         JOIN productos p ON p.id = d.producto_id
         JOIN categorias c ON c.id = p.categoria_id
        GROUP BY c.id, c.nombre
        ORDER BY total DESC`
    ),
    db.query(
      `SELECT cl.nombre AS cliente, COUNT(DISTINCT v.id) AS compras, SUM(d.cantidad * d.precio_unitario) AS total
         FROM ventas v
         JOIN clientes cl ON cl.id = v.cliente_id
         JOIN detalle_venta d ON d.venta_id = v.id
        GROUP BY cl.id, cl.nombre
        ORDER BY total DESC
        LIMIT 5`
    ),
  ]);

  res.json({
    hoy,
    mes,
    ticket_promedio: total.cantidad ? total.total / total.cantidad : 0,
    stock: stock.rows[0],
    por_dia: porDia.rows,
    top_productos: topProductos.rows,
    por_categoria: porCategoria.rows,
    top_clientes: topClientes.rows,
  });
});

module.exports = router;
