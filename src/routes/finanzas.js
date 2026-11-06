const express = require('express');
const db = require('../db');
const { ErrorApi } = require('../errores');
const { convertir } = require('../validacion');

const router = express.Router();

// Rango de fechas; si no se indica, va del primer día del mes a hoy
const RANGO = `fecha BETWEEN NVL(TO_DATE(:desde, 'YYYY-MM-DD'), TRUNC(SYSDATE, 'MM'))
                         AND NVL(TO_DATE(:hasta, 'YYYY-MM-DD'), TRUNC(SYSDATE))`;

router.get('/movimientos', async (req, res) => {
  const desde = convertir('desde', 'fecha', req.query.desde);
  const hasta = convertir('hasta', 'fecha', req.query.hasta);
  if (desde && hasta && desde > hasta) throw new ErrorApi(400, 'La fecha "desde" no puede ser mayor que "hasta".');

  const [movimientos, totales] = await Promise.all([
    db.query(
      `SELECT tipo, origen, referencia, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, concepto, monto
         FROM vista_movimientos
        WHERE ${RANGO}
        ORDER BY vista_movimientos.fecha DESC, tipo, referencia DESC`,
      { desde, hasta }
    ),
    db.query(
      `SELECT NVL(SUM(CASE WHEN tipo = 'Ingreso' THEN monto END), 0) AS ingresos,
              NVL(SUM(CASE WHEN origen = 'Compra' THEN monto END), 0) AS compras,
              NVL(SUM(CASE WHEN origen = 'Gasto' THEN monto END), 0) AS gastos
         FROM vista_movimientos
        WHERE ${RANGO}`,
      { desde, hasta }
    ),
  ]);

  const { ingresos, compras, gastos } = totales.rows[0];
  res.json({
    totales: { ingresos, compras, gastos, egresos: compras + gastos, balance: ingresos - compras - gastos },
    movimientos: movimientos.rows,
  });
});

// Balance de los últimos 12 meses con movimientos
router.get('/balance-mensual', async (req, res) => {
  const { rows } = await db.query(
    `SELECT TO_CHAR(mes, 'YYYY-MM') AS mes, ingresos, egresos, balance
       FROM vista_balance_mensual
      ORDER BY vista_balance_mensual.mes DESC
      FETCH FIRST 12 ROWS ONLY`
  );
  res.json(rows);
});

module.exports = router;
