const express = require('express');
const db = require('../db');

const router = express.Router();
const DIAS_GRAFICA = 14;
const STOCK_BAJO = 3;
// Las conexiones trabajan en hora de Guatemala, así que CURDATE() y DATE(fecha) ya son días de Guatemala
const INICIO_MES = `DATE_FORMAT(CURDATE(), '%Y-%m-01')`;

// Cantidad de ventas y monto vendido a partir de un día (o de todo el historial)
async function totalesDesde(desde) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT v.id) AS cantidad,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
       FROM ventas v
       JOIN detalle_venta d ON d.venta_id = v.id
      WHERE ${desde ? `DATE(v.fecha) >= ${desde}` : 'TRUE'}`
  );
  return rows[0];
}

router.get('/resumen', async (req, res) => {
  const [hoy, mes, total, egresosMes, stock, porDia, topProductos, porCategoria, topClientes] = await Promise.all([
    totalesDesde('CURDATE()'),
    totalesDesde(INICIO_MES),
    totalesDesde(null),
    db.query(
      `SELECT COALESCE(SUM(CASE WHEN origen = 'Compra' THEN monto END), 0) AS compras,
              COALESCE(SUM(CASE WHEN origen = 'Gasto' THEN monto END), 0) AS gastos
         FROM vista_movimientos
        WHERE tipo = 'Egreso' AND fecha >= ${INICIO_MES}`
    ),
    db.query(
      `SELECT COUNT(CASE WHEN stock = 0 THEN 1 END) AS agotados,
              COUNT(CASE WHEN stock BETWEEN 1 AND ? THEN 1 END) AS bajos
         FROM productos`,
      [STOCK_BAJO]
    ),
    // WITH RECURSIVE genera los 14 días aunque no haya ventas; el LEFT JOIN los deja en 0
    db.query(
      `WITH RECURSIVE dias (dia) AS (
         SELECT CURDATE() - INTERVAL ? DAY
         UNION ALL
         SELECT dia + INTERVAL 1 DAY FROM dias WHERE dia < CURDATE()
       )
       SELECT DATE_FORMAT(dias.dia, '%Y-%m-%d') AS dia,
              COUNT(DISTINCT v.id) AS cantidad,
              COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
         FROM dias
         LEFT JOIN ventas v ON DATE(v.fecha) = dias.dia
         LEFT JOIN detalle_venta d ON d.venta_id = v.id
        GROUP BY dias.dia
        ORDER BY dias.dia`,
      [DIAS_GRAFICA - 1]
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

  const { compras, gastos } = egresosMes.rows[0];
  res.json({
    hoy,
    mes,
    egresos_mes: { compras, gastos, total: compras + gastos },
    balance_mes: mes.total - compras - gastos,
    ticket_promedio: total.cantidad ? total.total / total.cantidad : 0,
    stock: stock.rows[0],
    por_dia: porDia.rows,
    top_productos: topProductos.rows,
    por_categoria: porCategoria.rows,
    top_clientes: topClientes.rows,
  });
});

module.exports = router;
