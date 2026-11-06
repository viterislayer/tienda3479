import {
  api, $, escapar, moneda, aviso, filaVacia, filaCargando, descargarCsv,
  fechaHoy, inicioDeMes, fechaCorta,
} from './comun.js';

let movimientos = [];

const nombreMes = mes => new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
const textoBalance = balance => (balance > 0 ? 'Ganancia' : balance < 0 ? 'Pérdida' : 'Sin diferencia');

// Monto con signo: los egresos se muestran en negativo
function montoConSigno(m) {
  return m.tipo === 'Egreso' ? `− ${moneda(m.monto)}` : `+ ${moneda(m.monto)}`;
}

async function consultar() {
  const desde = $('fin-desde').value;
  const hasta = $('fin-hasta').value;
  $('fin-lista').innerHTML = filaCargando(4);
  try {
    const r = await api(`/api/finanzas/movimientos?desde=${desde}&hasta=${hasta}`);
    movimientos = r.movimientos;
    const t = r.totales;
    $('fin-ingresos').textContent = moneda(t.ingresos);
    $('fin-compras').textContent = moneda(t.compras);
    $('fin-gastos').textContent = moneda(t.gastos);
    $('fin-balance').textContent = moneda(t.balance);
    $('fin-balance-detalle').textContent = textoBalance(t.balance);

    $('fin-lista').innerHTML = movimientos.length
      ? movimientos.map(m => `
        <tr>
          <td>${fechaCorta(m.fecha)}</td>
          <td><span class="insignia ${m.tipo === 'Ingreso' ? 'ok' : 'egreso'}">${m.tipo}</span> <small class="id">${m.origen}</small></td>
          <td>${escapar(m.concepto)}</td>
          <td class="num ${m.tipo === 'Egreso' ? 'monto-egreso' : ''}">${montoConSigno(m)}</td>
        </tr>`).join('')
      : filaVacia(4, 'No hay movimientos en estas fechas.');
  } catch (err) {
    $('fin-lista').innerHTML = filaVacia(4, `Error: ${err.message}`);
    aviso(err.message, 'error');
  }
}

async function cargarMeses() {
  const meses = await api('/api/finanzas/balance-mensual');
  $('fin-meses').innerHTML = meses.length
    ? meses.map(m => `
      <tr>
        <td>${escapar(nombreMes(m.mes))}</td>
        <td class="num">${moneda(m.ingresos)}</td>
        <td class="num">${moneda(m.egresos)}</td>
        <td class="num"><strong>${moneda(m.balance)}</strong> <small class="id">${textoBalance(m.balance)}</small></td>
      </tr>`).join('')
    : filaVacia(4, 'Aún no hay movimientos registrados.');
}

function exportar() {
  descargarCsv(`movimientos-${$('fin-desde').value}-a-${$('fin-hasta').value}.csv`, [
    { titulo: 'Fecha', valor: m => fechaCorta(m.fecha) },
    { titulo: 'Tipo', valor: m => m.tipo },
    { titulo: 'Origen', valor: m => m.origen },
    { titulo: 'Concepto', valor: m => m.concepto },
    { titulo: 'Monto (Q)', valor: m => (m.tipo === 'Egreso' ? -m.monto : m.monto).toFixed(2) },
  ], movimientos);
}

export async function mostrarFinanzas() {
  if (!$('fin-desde').value) $('fin-desde').value = inicioDeMes();
  if (!$('fin-hasta').value) $('fin-hasta').value = fechaHoy();
  await Promise.all([consultar(), cargarMeses()]);
}

export function iniciarFinanzas() {
  $('form-finanzas').addEventListener('submit', e => {
    e.preventDefault();
    if ($('fin-desde').value > $('fin-hasta').value) return aviso('La fecha "desde" no puede ser mayor que "hasta".', 'error');
    consultar();
  });
  $('fin-csv').addEventListener('click', exportar);
}
