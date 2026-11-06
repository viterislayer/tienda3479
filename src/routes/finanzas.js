const express = require('express');
const db = require('../db');
const { ErrorApi } = require('../errores');
const { convertir } = require('../validacion');

const router = express.Router();

// Ingresos y egresos de un rango de fechas (por defecto, el mes actual en hora de Guatemala)
router.get('/movimientos', async (req, res) => {
  const desde = convertir('desde', 'fecha', req.query.desde);
  const hasta = convertir('hasta', 'fecha', req.query.hasta);
  if (desde && hasta && desde > hasta) throw new ErrorApi(400, 'La fecha "desde" no puede ser mayor que "hasta".');

  const rango = `fecha BETWEEN COALESCE($1::date, date_trunc('month', (now() AT TIME ZONE 'America/Guatemala'))::date)
                         AND COALESCE($2::date, (now() AT TIME ZONE 'America/Guatemala')::date)`;

  const [movimientos, totales] = await Promise.all([
    db.query(
      `SELECT tipo, origen, referencia, fecha, concepto, monto
         FROM vista_movimientos
        WHERE ${rango}
        ORDER BY fecha DESC, tipo, referencia DESC`,
      [desde, hasta]
    ),
    db.query(
      `SELECT COALESCE(SUM(monto) FILTER (WHERE tipo = 'Ingreso'), 0) AS ingresos,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'Compra'), 0) AS compras,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'Gasto'), 0) AS gastos
         FROM vista_movimientos
        WHERE ${rango}`,
      [desde, hasta]
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
    `SELECT to_char(mes, 'YYYY-MM') AS mes, ingresos, egresos, balance
       FROM vista_balance_mensual
      ORDER BY mes DESC
      LIMIT 12`
  );
  res.json(rows);
});

module.exports = router;
