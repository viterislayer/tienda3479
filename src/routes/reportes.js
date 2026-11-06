const express = require('express');
const db = require('../db');

const router = express.Router();
const DIAS_GRAFICA = 14;
const STOCK_BAJO = 3;
// El servidor de Oracle está en hora de Guatemala, así que SYSDATE y TRUNC(fecha) ya son días de Guatemala
const HOY = 'TRUNC(SYSDATE)';
const INICIO_MES = `TRUNC(SYSDATE, 'MM')`;

// Cantidad de ventas y monto vendido a partir de un día (o de todo el historial)
async function totalesDesde(desde) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT v.id) AS cantidad,
            NVL(SUM(d.cantidad * d.precio_unitario), 0) AS total
       FROM ventas v
       JOIN detalle_venta d ON d.venta_id = v.id
      WHERE ${desde ? `TRUNC(v.fecha) >= ${desde}` : '1 = 1'}`
  );
  return rows[0];
}

router.get('/resumen', async (req, res) => {
  const [hoy, mes, total, egresosMes, stock, porDia, topProductos, porCategoria, topClientes] = await Promise.all([
    totalesDesde(HOY),
    totalesDesde(INICIO_MES),
    totalesDesde(null),
    db.query(
      `SELECT NVL(SUM(CASE WHEN origen = 'Compra' THEN monto END), 0) AS compras,
              NVL(SUM(CASE WHEN origen = 'Gasto' THEN monto END), 0) AS gastos
         FROM vista_movimientos
        WHERE tipo = 'Egreso' AND fecha >= ${INICIO_MES}`
    ),
    db.query(
      `SELECT COUNT(CASE WHEN stock = 0 THEN 1 END) AS agotados,
              COUNT(CASE WHEN stock BETWEEN 1 AND :bajo THEN 1 END) AS bajos
         FROM productos`,
      { bajo: STOCK_BAJO }
    ),
    // CONNECT BY LEVEL genera los 14 días aunque no haya ventas; el LEFT JOIN los deja en 0
    db.query(
      `SELECT TO_CHAR(dias.dia, 'YYYY-MM-DD') AS dia,
              COUNT(DISTINCT v.id) AS cantidad,
              NVL(SUM(d.cantidad * d.precio_unitario), 0) AS total
         FROM (SELECT ${HOY} - (LEVEL - 1) AS dia FROM DUAL CONNECT BY LEVEL <= :dias) dias
         LEFT JOIN ventas v ON TRUNC(v.fecha) = dias.dia
         LEFT JOIN detalle_venta d ON d.venta_id = v.id
        GROUP BY dias.dia
        ORDER BY dias.dia`,
      { dias: DIAS_GRAFICA }
    ),
    db.query(
      `SELECT p.nombre AS producto, SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS total
         FROM detalle_venta d
         JOIN productos p ON p.id = d.producto_id
        GROUP BY p.id, p.nombre
        ORDER BY total DESC
        FETCH FIRST 5 ROWS ONLY`
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
        FETCH FIRST 5 ROWS ONLY`
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
