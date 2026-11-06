import {
  api, $, escapar, moneda, fecha, aviso, opcionesSelect, filaVacia, filaCargando,
  coincide, descargarCsv, hoyArchivo, confirmar, conCarga, celdaFecha, resaltarFila,
} from './comun.js';

let productos = [];
let compras = [];
let lineas = []; // { producto_id, nombre, cantidad, costo }

function pintarLineas() {
  $('compra-lineas').innerHTML = lineas.length
    ? lineas.map((l, i) => `
      <tr>
        <td>${escapar(l.nombre)}<br><small class="id">${moneda(l.costo)} c/u</small></td>
        <td class="num">${l.cantidad}</td>
        <td class="num">${moneda(l.costo * l.cantidad)}</td>
        <td class="botones"><button type="button" class="boton-tabla peligro" data-quitar="${i}" aria-label="Quitar ${escapar(l.nombre)}">Quitar</button></td>
      </tr>`).join('')
    : filaVacia(4, 'Agrega los productos que entraron.');
  $('compra-total').textContent = moneda(lineas.reduce((t, l) => t + l.costo * l.cantidad, 0));
}

function pintarSelects(proveedores) {
  const actual = $('compra-proveedor').value;
  $('compra-proveedor').innerHTML = proveedores.length
    ? '<option value="">Seleccione un proveedor...</option>' + opcionesSelect(proveedores, p => `${p.nombre} · NIT ${p.nit}`)
    : '<option value="">Primero registra un proveedor</option>';
  if (proveedores.some(p => String(p.id) === actual)) $('compra-proveedor').value = actual;

  $('compra-producto').innerHTML = productos.length
    ? opcionesSelect(productos, p => `${p.nombre} · ${p.stock} en stock`)
    : '<option value="">Primero registra un producto</option>';
}

function filtradas() {
  return compras.filter(c => coincide(c, $('compras-buscar').value, [x => x.id, x => x.proveedor, x => fecha(x.fecha)]));
}

function pintarHistorial() {
  const visibles = filtradas();
  $('compras-lista').innerHTML = visibles.length
    ? visibles.map(c => `
      <tr data-id="${c.id}">
        <td class="id">${c.id}</td>
        <td>${celdaFecha(c.fecha)}</td>
        <td>${escapar(c.proveedor)}</td>
        <td class="num">${c.productos}</td>
        <td class="num"><strong>${moneda(c.total)}</strong></td>
        <td class="botones">
          <button class="boton-tabla" data-accion="ver" data-id="${c.id}">Detalle</button>
          <button class="boton-tabla peligro" data-accion="anular" data-id="${c.id}">Anular</button>
        </td>
      </tr>`).join('')
    : filaVacia(6, compras.length ? 'Ninguna compra coincide con la búsqueda.' : 'Aún no hay compras registradas.');
}

function agregarLinea() {
  const producto = productos.find(p => p.id === Number($('compra-producto').value));
  const cantidad = Number($('compra-cantidad').value);
  const costoTexto = $('compra-costo').value.trim();
  const costo = Number(costoTexto);
  if (!producto) return aviso('Selecciona un producto.', 'error');
  if (!Number.isInteger(cantidad) || cantidad <= 0) return aviso('La cantidad debe ser un número entero mayor que cero.', 'error');
  if (costoTexto === '' || !Number.isFinite(costo) || costo < 0) return aviso('Escribe el costo unitario (puede ser 0).', 'error');

  const existente = lineas.find(l => l.producto_id === producto.id);
  if (existente && existente.costo !== costo) return aviso(`"${producto.nombre}" ya está en el detalle con otro costo.`, 'error');

  if (existente) existente.cantidad += cantidad;
  else lineas.push({ producto_id: producto.id, nombre: producto.nombre, cantidad, costo });
  $('compra-cantidad').value = 1;
  $('compra-costo').value = '';
  pintarLineas();
}

async function registrarCompra(e) {
  e.preventDefault();
  if (!lineas.length) return aviso('Agrega al menos un producto al detalle.', 'error');
  try {
    const compra = await conCarga(e.submitter, 'Registrando...', () => api('/api/compras', {
      method: 'POST',
      body: JSON.stringify({
        proveedor_id: Number($('compra-proveedor').value),
        productos: lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad, costo_unitario: l.costo })),
      }),
    }));
    aviso(`Compra #${compra.id} registrada por ${moneda(compra.total)}. El stock se actualizó.`);
    lineas = [];
    $('compra-proveedor').value = '';
    await mostrarCompras();
    resaltarFila($('compras-lista'), compra.id);
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function verDetalle(id) {
  try {
    const c = await api(`/api/compras/${id}`);
    $('venta-detalle').innerHTML = `
      <div class="comprobante-cabecera">
        <div>
          <h3>Compra #${c.id}</h3>
          <p class="meta">${fecha(c.fecha)}</p>
        </div>
        <div class="tienda"><strong>Tienda 3479</strong>Registro de compra</div>
      </div>
      <p class="meta">Proveedor: <strong>${escapar(c.proveedor)}</strong> · NIT ${escapar(c.nit)}</p>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead><tr><th>Producto</th><th class="num">Costo unitario</th><th class="num">Cantidad</th><th class="num">Subtotal</th></tr></thead>
          <tbody>${c.detalle.map(d => `
            <tr>
              <td>${escapar(d.producto)}</td>
              <td class="num">${moneda(d.costo_unitario)}</td>
              <td class="num">${d.cantidad}</td>
              <td class="num">${moneda(d.subtotal)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr><th colspan="3">Total</th><th class="num">${moneda(c.total)}</th></tr></tfoot>
        </table>
      </div>`;
    $('modal-venta').showModal();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function anular(id) {
  const ok = await confirmar({ titulo: `¿Anular la compra #${id}?`, texto: 'Se retirará del stock la mercadería que entró.', boton: 'Anular compra' });
  if (!ok) return;
  try {
    await api(`/api/compras/${id}`, { method: 'DELETE' });
    aviso(`Compra #${id} anulada.`);
    await mostrarCompras();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

function exportar() {
  descargarCsv(`compras-${hoyArchivo()}.csv`, [
    { titulo: 'Compra', valor: c => c.id },
    { titulo: 'Fecha', valor: c => fecha(c.fecha) },
    { titulo: 'Proveedor', valor: c => c.proveedor },
    { titulo: 'Productos', valor: c => c.productos },
    { titulo: 'Total (Q)', valor: c => c.total.toFixed(2) },
  ], filtradas());
}

export async function mostrarCompras() {
  if (!$('compras-lista').children.length) $('compras-lista').innerHTML = filaCargando(6);
  const [proveedores, listaProductos, listaCompras] = await Promise.all([
    api('/api/proveedores'), api('/api/productos'), api('/api/compras'),
  ]);
  productos = listaProductos;
  compras = listaCompras;
  pintarSelects(proveedores);
  pintarHistorial();
  pintarLineas();
}

export function iniciarCompras() {
  $('btn-agregar-compra').addEventListener('click', agregarLinea);
  $('form-compra').addEventListener('submit', registrarCompra);
  $('compras-buscar').addEventListener('input', pintarHistorial);
  $('compras-csv').addEventListener('click', exportar);
  $('compra-lineas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-quitar]');
    if (!btn) return;
    lineas.splice(Number(btn.dataset.quitar), 1);
    pintarLineas();
  });
  $('compras-lista').addEventListener('click', e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    btn.dataset.accion === 'ver' ? verDetalle(id) : anular(id);
  });
}
