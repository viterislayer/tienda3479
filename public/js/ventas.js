import { api, $, escapar, moneda, fecha, aviso, opcionesSelect, filaVacia, filaCargando, STOCK_BAJO } from './comun.js';

let productos = [];
let lineas = []; // { producto_id, nombre, precio, cantidad }

function pintarLineas() {
  $('venta-lineas').innerHTML = lineas.length
    ? lineas.map((l, i) => `
      <tr>
        <td>${escapar(l.nombre)}<br><small class="id">${moneda(l.precio)} c/u</small></td>
        <td class="num">${l.cantidad}</td>
        <td class="num">${moneda(l.precio * l.cantidad)}</td>
        <td class="botones"><button type="button" class="boton-tabla peligro" data-quitar="${i}">Quitar</button></td>
      </tr>`).join('')
    : filaVacia(4, 'Agrega productos para armar la venta.');
  $('venta-total').textContent = moneda(lineas.reduce((t, l) => t + l.precio * l.cantidad, 0));
}

function pintarSelects(clientes) {
  $('venta-cliente').innerHTML = clientes.length
    ? '<option value="">Seleccione un cliente...</option>' + opcionesSelect(clientes, c => `${c.nombre} · NIT/DPI ${c.nit_dpi}`)
    : '<option value="">Primero registra un cliente</option>';

  const disponibles = productos.filter(p => p.stock > 0);
  $('venta-producto').innerHTML = disponibles.length
    ? opcionesSelect(disponibles, p => `${p.nombre} · ${moneda(p.precio)} · ${p.stock} disponibles`)
    : '<option value="">No hay productos con stock</option>';
}

function pintarIndicadores(ventas) {
  $('kpi-ventas').textContent = ventas.length;
  $('kpi-ingresos').textContent = moneda(ventas.reduce((t, v) => t + v.total, 0));
  $('kpi-stock').textContent = productos.filter(p => p.stock <= STOCK_BAJO).length;
}

function pintarHistorial(ventas) {
  $('ventas-lista').innerHTML = ventas.length
    ? ventas.map(v => `
      <tr>
        <td class="id">${v.id}</td>
        <td>${fecha(v.fecha)}</td>
        <td>${escapar(v.cliente)}</td>
        <td class="num">${v.productos}</td>
        <td class="num"><strong>${moneda(v.total)}</strong></td>
        <td class="botones">
          <button class="boton-tabla" data-accion="ver" data-id="${v.id}">Ver detalle</button>
          <button class="boton-tabla peligro" data-accion="anular" data-id="${v.id}">Anular</button>
        </td>
      </tr>`).join('')
    : filaVacia(6, 'Aún no hay ventas registradas.');
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
  const boton = e.submitter;
  boton.disabled = true;
  try {
    const venta = await api('/api/ventas', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: Number($('venta-cliente').value),
        productos: lineas.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })),
      }),
    });
    aviso(`Venta #${venta.id} registrada por ${moneda(venta.total)}.`);
    lineas = [];
    await mostrarVentas();
  } catch (err) {
    aviso(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

async function verDetalle(id) {
  try {
    const v = await api(`/api/ventas/${id}`);
    $('venta-detalle').innerHTML = `
      <h3>Venta #${v.id}</h3>
      <p class="meta">${fecha(v.fecha)} · ${escapar(v.cliente)} · NIT/DPI ${escapar(v.nit_dpi)}</p>
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
  if (!confirm(`¿Anular la venta #${id}? El stock regresará a los productos.`)) return;
  try {
    await api(`/api/ventas/${id}`, { method: 'DELETE' });
    aviso(`Venta #${id} anulada.`);
    await mostrarVentas();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

export async function mostrarVentas() {
  if (!$('ventas-lista').children.length) $('ventas-lista').innerHTML = filaCargando(6);
  const [clientes, listaProductos, ventas] = await Promise.all([
    api('/api/clientes'), api('/api/productos'), api('/api/ventas'),
  ]);
  productos = listaProductos;
  pintarSelects(clientes);
  pintarIndicadores(ventas);
  pintarHistorial(ventas);
  pintarLineas();
}

export function iniciarVentas() {
  $('btn-agregar').addEventListener('click', agregarLinea);
  $('form-venta').addEventListener('submit', registrarVenta);
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
    btn.dataset.accion === 'ver' ? verDetalle(id) : anular(id);
  });
}
