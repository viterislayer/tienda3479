import { api, $, escapar, moneda } from './comun.js';

const ALTO = 240;
const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 64 };
const SVG = 'http://www.w3.org/2000/svg';

let dias = [];

const fechaCorta = dia => new Date(`${dia}T12:00:00`).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
const fechaLarga = dia => new Date(`${dia}T12:00:00`).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });

// Redondea hacia arriba a un valor "limpio" (1, 2 o 5 × 10^n)
function valorLimpio(valor) {
  if (valor <= 0) return 100;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  return [1, 2, 5, 10].find(p => valor <= p * potencia) * potencia;
}

// Escalones del eje Y: paso limpio y techo múltiplo del paso (ej. 0, 2k, 4k, 6k)
function escalaEje(maximo) {
  const paso = valorLimpio(maximo / 4);
  const techo = Math.max(paso, paso * Math.ceil(maximo / paso));
  return { paso, techo };
}

function compacto(valor) {
  if (valor >= 1000) return `Q ${(valor / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}k`;
  return `Q ${valor}`;
}

function nodo(tipo, atributos, texto) {
  const el = document.createElementNS(SVG, tipo);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Barra con la punta superior redondeada (4px) y la base recta sobre el eje
function rutaBarra(x, y, ancho, alto) {
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`;
}

function pintarGrafica() {
  const contenedor = $('grafica');
  const ancho = contenedor.clientWidth || 700;
  const altoPlot = ALTO - MARGEN.arriba - MARGEN.abajo;
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha;
  const { paso: pasoEje, techo: maximo } = escalaEje(Math.max(...dias.map(d => d.total)));
  const escalaY = valor => MARGEN.arriba + altoPlot - (valor / maximo) * altoPlot;
  const ranura = anchoPlot / dias.length;
  const anchoBarra = Math.min(28, ranura * 0.62);

  const svg = nodo('svg', { viewBox: `0 0 ${ancho} ${ALTO}`, height: ALTO, role: 'img', 'aria-label': 'Ventas por día de los últimos 14 días' });

  for (let valor = 0; valor <= maximo; valor += pasoEje) {
    const y = escalaY(valor);
    svg.append(nodo('line', { class: valor === 0 ? 'base' : 'guia', x1: MARGEN.izquierda, x2: ancho - MARGEN.derecha, y1: y, y2: y }));
    svg.append(nodo('text', { class: 'eje', x: MARGEN.izquierda - 10, y: y + 4, 'text-anchor': 'end' }, compacto(valor)));
  }

  const paso = ranura < 34 ? 2 : 1;
  dias.forEach((d, i) => {
    const x = MARGEN.izquierda + ranura * i;
    const altoBarra = Math.max(0, escalaY(0) - escalaY(d.total));
    const zona = nodo('rect', { class: 'zona', x, y: MARGEN.arriba, width: ranura, height: altoPlot, 'data-indice': i });
    const barra = nodo('path', { class: 'barra-dato', d: rutaBarra(x + (ranura - anchoBarra) / 2, escalaY(d.total), anchoBarra, altoBarra) });
    svg.append(zona, barra);
    if ((dias.length - 1 - i) % paso === 0) {
      svg.append(nodo('text', { class: 'eje', x: x + ranura / 2, y: ALTO - 8, 'text-anchor': 'middle' }, fechaCorta(d.dia)));
    }
  });

  if (dias.every(d => d.total === 0)) {
    svg.append(nodo('text', { class: 'sin-datos', x: MARGEN.izquierda + anchoPlot / 2, y: MARGEN.arriba + altoPlot / 2, 'text-anchor': 'middle' },
      'Sin ventas en los últimos 14 días'));
  }

  contenedor.replaceChildren(svg);
}

function mostrarTooltip(e) {
  const zona = e.target.closest('.zona');
  const tooltip = $('grafica-tooltip');
  $('grafica').querySelectorAll('.barra-dato.activa').forEach(b => b.classList.remove('activa'));
  if (!zona) { tooltip.hidden = true; return; }

  const d = dias[Number(zona.dataset.indice)];
  zona.nextSibling.classList.add('activa');
  tooltip.innerHTML = `<strong>${moneda(d.total)}</strong>${escapar(fechaLarga(d.dia))} · ${d.cantidad} ${d.cantidad === 1 ? 'venta' : 'ventas'}`;
  tooltip.hidden = false;

  const tarjeta = $('grafica').closest('.tarjeta').getBoundingClientRect();
  const caja = zona.getBoundingClientRect();
  const x = Math.min(Math.max(caja.left + caja.width / 2 - tarjeta.left - tooltip.offsetWidth / 2, 8), tarjeta.width - tooltip.offsetWidth - 8);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${caja.top - tarjeta.top - 10}px`;
}

// Versión en tabla de la gráfica para lectores de pantalla
function pintarTablaAccesible() {
  $('grafica-tabla').innerHTML = `<caption>Ventas por día</caption>
    <tr><th>Día</th><th>Ventas</th><th>Monto</th></tr>
    ${dias.map(d => `<tr><td>${fechaLarga(d.dia)}</td><td>${d.cantidad}</td><td>${moneda(d.total)}</td></tr>`).join('')}`;
}

function lista(id, filas, etiqueta, detalle) {
  const maximo = Math.max(...filas.map(f => f.total), 0);
  $(id).innerHTML = filas.length
    ? filas.map(f => `
      <li>
        <div class="barras-fila"><span>${escapar(etiqueta(f))}</span><strong>${moneda(f.total)}</strong></div>
        <div class="barras-pista"><div class="barras-valor" style="width:${maximo ? (f.total / maximo) * 100 : 0}%"></div></div>
        ${detalle ? `<small>${escapar(detalle(f))}</small>` : ''}
      </li>`).join('')
    : '<li class="vacio-lista">Aún no hay ventas registradas.</li>';
}

export async function mostrarResumen() {
  const r = await api('/api/reportes/resumen');
  dias = r.por_dia;

  $('r-hoy').textContent = r.hoy.cantidad;
  $('r-hoy-monto').textContent = `${moneda(r.hoy.total)} vendidos`;
  $('r-mes').textContent = moneda(r.mes.total);
  $('r-mes-ventas').textContent = `${r.mes.cantidad} ${r.mes.cantidad === 1 ? 'venta' : 'ventas'} este mes`;
  $('r-ticket').textContent = moneda(r.ticket_promedio);
  const alertas = r.stock.bajos + r.stock.agotados;
  $('r-stock').textContent = alertas ? `${alertas} ${alertas === 1 ? 'alerta' : 'alertas'}` : 'En orden';
  $('r-stock-detalle').textContent = `${r.stock.bajos} con stock bajo · ${r.stock.agotados} agotados`;

  pintarGrafica();
  pintarTablaAccesible();
  lista('r-productos', r.top_productos, f => f.producto, f => `${f.unidades} ${f.unidades === 1 ? 'unidad' : 'unidades'}`);
  lista('r-categorias', r.por_categoria, f => f.categoria);
  lista('r-clientes', r.top_clientes, f => f.cliente, f => `${f.compras} ${f.compras === 1 ? 'compra' : 'compras'}`);
}

export function iniciarResumen() {
  $('grafica').addEventListener('mousemove', mostrarTooltip);
  $('grafica').addEventListener('mouseleave', () => mostrarTooltip({ target: document.body }));
  let espera;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => { if (dias.length && !$('vista-resumen').hidden) pintarGrafica(); }, 150);
  });
}
