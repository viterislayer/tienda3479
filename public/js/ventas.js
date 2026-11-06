import { api, $, escapar, moneda, fecha, aviso, opcionesSelect } from './comun.js';

let productos = [];
let lineas = []; // { producto_id, nombre, precio, cantidad }

function pintarLineas() {
  $('venta-lineas').innerHTML = lineas.length
    ? lineas.map((l, i) => `
      <tr>
        <td>${escapar(l.nombre)}</td>
        <td>${moneda(l.precio)}</td>
        <td>${l.cantidad}</td>
        <td>${moneda(l.precio * l.cantidad)}</td>
        <td><button type="button" class="peligro" data-quitar="${i}">Quitar</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="vacio">Agregue productos a la venta</td></tr>';
  $('venta-total').textContent = moneda(lineas.reduce((t, l) => t + l.precio * l.cantidad, 0));
}

function agregarLinea() {
  const producto = productos.find(p => p.id === Number($('venta-producto').value));
  const cantidad = Number($('venta-cantidad').value);
  if (!producto) return aviso('Seleccione un producto.', 'error');
  if (!Number.isInteger(cantidad) || cantidad <= 0) return aviso('La cantidad debe ser un entero mayor que cero.', 'error');

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
  if (!lineas.length) return aviso('Agregue al menos un producto.', 'error');
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

async function cargarHistorial() {
  const ventas = await api('/api/ventas');
  $('ventas-lista').innerHTML = ventas.length
    ? ventas.map(v => `
      <tr>
        <td>${v.id}</td>
        <td>${fecha(v.fecha)}</td>
        <td>${escapar(v.cliente)}</td>
        <td>${v.productos}</td>
        <td>${moneda(v.total)}</td>
        <td class="botones">
          <button data-accion="ver" data-id="${v.id}">Ver</button>
          <button data-accion="anular" data-id="${v.id}" class="peligro">Anular</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="vacio">Sin ventas registradas</td></tr>';
}

async function verDetalle(id) {
  try {
    const v = await api(`/api/ventas/${id}`);
    const panel = $('venta-detalle');
    panel.innerHTML = `
      <h3>Venta #${v.id} · ${fecha(v.fecha)}</h3>
      <p>Cliente: <strong>${escapar(v.cliente)}</strong> (NIT/DPI: ${escapar(v.nit_dpi)})</p>
      <table>
        <thead><tr><th>Producto</th><th>Precio unitario</th><th>Cantidad</th><th>Subtotal</th></tr></thead>
        <tbody>${v.detalle.map(d => `
          <tr>
            <td>${escapar(d.producto)}</td>
            <td>${moneda(d.precio_unitario)}</td>
            <td>${d.cantidad}</td>
            <td>${moneda(d.subtotal)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><th colspan="3">Total</th><th>${moneda(v.total)}</th></tr></tfoot>
      </table>`;
    panel.hidden = false;
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function anular(id) {
  if (!confirm(`¿Anular la venta #${id}? El stock se devolverá a los productos.`)) return;
  try {
    await api(`/api/ventas/${id}`, { method: 'DELETE' });
    aviso(`Venta #${id} anulada.`);
    await mostrarVentas();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

export async function mostrarVentas() {
  const [clientes, listaProductos] = await Promise.all([api('/api/clientes'), api('/api/productos')]);
  productos = listaProductos;
  $('venta-cliente').innerHTML = '<option value="">-- Seleccione --</option>' + opcionesSelect(clientes, c => `${c.nombre} (${c.nit_dpi})`);
  $('venta-producto').innerHTML = opcionesSelect(
    productos.filter(p => p.stock > 0),
    p => `${p.nombre} · ${moneda(p.precio)} · stock ${p.stock}`
  );
  $('venta-detalle').hidden = true;
  pintarLineas();
  await cargarHistorial();
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
