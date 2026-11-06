import {
  api, $, escapar, moneda, fecha, aviso, opcionesSelect, filaVacia, filaCargando,
  coincide, descargarCsv, hoyArchivo, confirmar, conCarga, celdaFecha, resaltarFila,
} from './comun.js';

let productos = [];
let ventas = [];
let lineas = []; // { producto_id, nombre, precio, cantidad }

function pintarLineas() {
  $('venta-lineas').innerHTML = lineas.length
    ? lineas.map((l, i) => `
      <tr>
        <td>${escapar(l.nombre)}<br><small class="id">${moneda(l.precio)} c/u</small></td>
        <td class="num">${l.cantidad}</td>
        <td class="num">${moneda(l.precio * l.cantidad)}</td>
        <td class="botones"><button type="button" class="boton-tabla peligro" data-quitar="${i}" aria-label="Quitar ${escapar(l.nombre)}">Quitar</button></td>
      </tr>`).join('')
    : filaVacia(4, 'Agrega productos para armar la venta.');
  $('venta-total').textContent = moneda(lineas.reduce((t, l) => t + l.precio * l.cantidad, 0));
}

function pintarSelects(clientes) {
  const clienteActual = $('venta-cliente').value;
  $('venta-cliente').innerHTML = clientes.length
    ? '<option value="">Seleccione un cliente...</option>' + opcionesSelect(clientes, c => `${c.nombre} · NIT/DPI ${c.nit_dpi}`)
    : '<option value="">Primero registra un cliente</option>';
  if (clientes.some(c => String(c.id) === clienteActual)) $('venta-cliente').value = clienteActual;

  const disponibles = productos.filter(p => p.stock > 0);
  $('venta-producto').innerHTML = disponibles.length
    ? opcionesSelect(disponibles, p => `${p.nombre} · ${moneda(p.precio)} · ${p.stock} disponibles`)
    : '<option value="">No hay productos con stock</option>';
}

function filtradas() {
  return ventas.filter(v => coincide(v, $('ventas-buscar').value, [x => x.id, x => x.cliente, x => fecha(x.fecha)]));
}

function pintarHistorial() {
  const visibles = filtradas();
  $('ventas-lista').innerHTML = visibles.length
    ? visibles.map(v => `
      <tr data-id="${v.id}">
        <td class="id">${v.id}</td>
        <td>${celdaFecha(v.fecha)}</td>
        <td>${escapar(v.cliente)}</td>
        <td class="num">${v.productos}</td>
        <td class="num"><strong>${moneda(v.total)}</strong></td>
        <td class="botones">
          <button class="boton-tabla" data-accion="ver" data-id="${v.id}">Comprobante</button>
          <button class="boton-tabla peligro" data-accion="anular" data-id="${v.id}">Anular</button>
        </td>
      </tr>`).join('')
    : filaVacia(6, ventas.length ? 'Ninguna venta coincide con la búsqueda.' : 'Aún no hay ventas registradas.');
}

function agregarLinea() {
  const producto = productos.find(p => p.id === Number($('venta-producto').value));
  const cantidad = Number($('venta-cantidad').value);
  if (!producto) return aviso('Selecciona un producto.', 'error');
  if (!Number.isInteger(cantidad) || cantidad <= 0) return aviso('La cantidad debe ser un número entero mayor que cero.', 'error');

  const existente = lineas.find(l => l.producto_id === producto.id);
  const total = cantidad + (existente?.cantidad || 0);
  if (total > producto.stock) return aviso(`Solo hay ${producto.stock} unidades de "${producto.nombre}".`, 'error');

  if (existente) existente.cantidad = total;
  else lineas.push({ producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad });
  $('venta-cantidad').value = 1;
  pintarLineas();
}

async function registrarVenta(e) {
  e.preventDefault();
  if (!lineas.length) return aviso('Agrega al menos un producto al detalle.', 'error');
  try {
    const venta = await conCarga(e.submitter, 'Registrando...', () => api('/api/ventas', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: Number($('venta-cliente').value),
        productos: lineas.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })),
      }),
    }));
    aviso(`Venta #${venta.id} registrada por ${moneda(venta.total)}.`);
    lineas = [];
    $('venta-cliente').value = '';
    await mostrarVentas();
    resaltarFila($('ventas-lista'), venta.id);
    verComprobante(venta.id);
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function verComprobante(id) {
  try {
    const v = await api(`/api/ventas/${id}`);
    $('venta-detalle').innerHTML = `
      <div class="comprobante-cabecera">
        <div>
          <h3>Comprobante de venta #${v.id}</h3>
          <p class="meta">${fecha(v.fecha)}</p>
        </div>
        <div class="tienda"><strong>Tienda 3479</strong>Sistema de ventas</div>
      </div>
      <p class="meta">Cliente: <strong>${escapar(v.cliente)}</strong> · NIT/DPI ${escapar(v.nit_dpi)}</p>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead><tr><th>Producto</th><th class="num">Precio unitario</th><th class="num">Cantidad</th><th class="num">Subtotal</th></tr></thead>
          <tbody>${v.detalle.map(d => `
            <tr>
              <td>${escapar(d.producto)}</td>
              <td class="num">${moneda(d.precio_unitario)}</td>
              <td class="num">${d.cantidad}</td>
              <td class="num">${moneda(d.subtotal)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr><th colspan="3">Total</th><th class="num">${moneda(v.total)}</th></tr></tfoot>
        </table>
      </div>`;
    $('modal-venta').showModal();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function anular(id) {
  const ok = await confirmar({ titulo: `¿Anular la venta #${id}?`, texto: 'El stock regresará a los productos y la venta saldrá de los ingresos.', boton: 'Anular venta' });
  if (!ok) return;
  try {
    await api(`/api/ventas/${id}`, { method: 'DELETE' });
    aviso(`Venta #${id} anulada.`);
    await mostrarVentas();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

function exportar() {
  descargarCsv(`ventas-${hoyArchivo()}.csv`, [
    { titulo: 'Venta', valor: v => v.id },
    { titulo: 'Fecha', valor: v => fecha(v.fecha) },
    { titulo: 'Cliente', valor: v => v.cliente },
    { titulo: 'Productos', valor: v => v.productos },
    { titulo: 'Total (Q)', valor: v => v.total.toFixed(2) },
  ], filtradas());
}

export async function mostrarVentas() {
  if (!$('ventas-lista').children.length) $('ventas-lista').innerHTML = filaCargando(6);
  const [clientes, listaProductos, listaVentas] = await Promise.all([
    api('/api/clientes'), api('/api/productos'), api('/api/ventas'),
  ]);
  productos = listaProductos;
  ventas = listaVentas;
  pintarSelects(clientes);
  pintarHistorial();
  pintarLineas();
}

export function iniciarVentas() {
  $('btn-agregar').addEventListener('click', agregarLinea);
  $('form-venta').addEventListener('submit', registrarVenta);
  $('ventas-buscar').addEventListener('input', pintarHistorial);
  $('ventas-csv').addEventListener('click', exportar);
  $('btn-imprimir').addEventListener('click', () => window.print());
  $('venta-lineas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-quitar]');
    if (!btn) return;
    lineas.splice(Number(btn.dataset.quitar), 1);
    pintarLineas();
  });
  $('ventas-lista').addEventListener('click', e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    btn.dataset.accion === 'ver' ? verComprobante(id) : anular(id);
  });
}
