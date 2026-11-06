import {
  api, $, escapar, moneda, aviso, opcionesSelect, insigniaStock, filaVacia, filaCargando,
  coincide, descargarCsv, hoyArchivo,
} from './comun.js';

// Configuración de cada tabla administrable desde la página
export const TABLAS = {
  productos: {
    ruta: '/api/productos',
    singular: 'producto',
    plural: 'Productos',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'categoria_id', etiqueta: 'Categoría', tipo: 'select', origen: '/api/categorias', mostrar: 'categoria', requerido: true },
      { col: 'precio', etiqueta: 'Precio (Q)', tipo: 'number', step: '0.01', min: '0', requerido: true, num: true, formato: moneda },
      { col: 'stock', etiqueta: 'Stock', tipo: 'number', step: '1', min: '0', requerido: true, num: true, porDefecto: 0, html: insigniaStock },
    ],
  },
  categorias: {
    ruta: '/api/categorias',
    singular: 'categoría',
    plural: 'Categorías',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
    ],
  },
  clientes: {
    ruta: '/api/clientes',
    singular: 'cliente',
    plural: 'Clientes',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'nit_dpi', etiqueta: 'NIT / DPI', tipo: 'text', requerido: true },
      { col: 'correo', etiqueta: 'Correo', tipo: 'email' },
    ],
  },
};

let nombreTabla = null;
let config = null;
let filas = [];
let editandoId = null;

const valorVisible = (campo, fila) => fila[campo.mostrar || campo.col];

function campoHtml(campo, opciones) {
  const requerido = campo.requerido ? 'required' : '';
  if (campo.tipo === 'select') {
    return `<label>${campo.etiqueta}
      <select name="${campo.col}" ${requerido}>
        <option value="">Seleccione...</option>${opcionesSelect(opciones, o => o.nombre)}
      </select></label>`;
  }
  const extra = ['step', 'min'].filter(a => campo[a]).map(a => `${a}="${campo[a]}"`).join(' ');
  return `<label>${campo.etiqueta}
    <input name="${campo.col}" type="${campo.tipo}" ${extra} ${requerido}></label>`;
}

function celda(campo, fila) {
  const valor = valorVisible(campo, fila);
  const contenido = campo.html ? campo.html(valor) : escapar(valor == null ? '—' : campo.formato ? campo.formato(valor) : valor);
  return `<td class="${campo.num ? 'num' : ''}">${contenido}</td>`;
}

async function pintarFormulario() {
  const opciones = {};
  for (const campo of config.campos.filter(c => c.origen)) opciones[campo.col] = await api(campo.origen);
  $('crud-campos').innerHTML = config.campos.map(c => campoHtml(c, opciones[c.col])).join('');
  limpiar();
}

function limpiar() {
  editandoId = null;
  const form = $('form-crud');
  form.reset();
  for (const c of config.campos) if (c.porDefecto !== undefined) form.elements[c.col].value = c.porDefecto;
  $('crud-titulo').textContent = `Nuevo ${config.singular}`;
  $('crud-cancelar').hidden = true;
}

function filtradas() {
  return filas.filter(f => coincide(f, $('crud-buscar').value, [f2 => f2.id, ...config.campos.map(c => f2 => valorVisible(c, f2))]));
}

function pintarFilas() {
  const columnas = config.campos.length + 2;
  const visibles = filtradas();
  $('crud-listado').textContent = `${config.plural} (${visibles.length}${visibles.length !== filas.length ? ` de ${filas.length}` : ''})`;
  $('crud-filas').innerHTML = visibles.length
    ? visibles.map(f => `
      <tr>
        <td class="id">${f.id}</td>
        ${config.campos.map(c => celda(c, f)).join('')}
        <td class="botones">
          <button class="boton-tabla" data-accion="editar" data-id="${f.id}">Editar</button>
          <button class="boton-tabla peligro" data-accion="eliminar" data-id="${f.id}">Eliminar</button>
        </td>
      </tr>`).join('')
    : filaVacia(columnas, filas.length ? 'Ningún registro coincide con la búsqueda.' : `Todavía no hay registros. Agrega el primer ${config.singular}.`);
}

async function cargar() {
  const columnas = config.campos.length + 2;
  $('crud-cabecera').innerHTML = `<tr><th>#</th>${config.campos
    .map(c => `<th class="${c.num ? 'num' : ''}">${c.etiqueta}</th>`).join('')}<th><span class="sr-only">Acciones</span></th></tr>`;
  $('crud-filas').innerHTML = filaCargando(columnas);
  try {
    filas = await api(config.ruta);
    pintarFilas();
  } catch (err) {
    $('crud-filas').innerHTML = filaVacia(columnas, `Error: ${err.message}`);
  }
}

function editar(id) {
  const fila = filas.find(f => f.id === id);
  editandoId = id;
  for (const c of config.campos) $('form-crud').elements[c.col].value = fila[c.col] ?? '';
  $('crud-titulo').textContent = `Editando ${config.singular} #${id}`;
  $('crud-cancelar').hidden = false;
  $('form-crud').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('form-crud').elements[config.campos[0].col].focus({ preventScroll: true });
}

async function eliminar(id) {
  if (!confirm(`¿Eliminar ${config.singular} #${id}?`)) return;
  try {
    await api(`${config.ruta}/${id}`, { method: 'DELETE' });
    if (editandoId === id) limpiar();
    aviso('Registro eliminado.');
    cargar();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

async function guardar(e) {
  e.preventDefault();
  const datos = {};
  for (const c of config.campos) {
    const valor = e.target.elements[c.col].value.trim();
    datos[c.col] = valor === '' ? null : (c.tipo === 'number' || c.tipo === 'select') ? Number(valor) : valor;
  }
  const boton = e.submitter;
  boton.disabled = true;
  try {
    const url = editandoId ? `${config.ruta}/${editandoId}` : config.ruta;
    await api(url, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(datos) });
    aviso(editandoId ? 'Cambios guardados.' : `${config.singular[0].toUpperCase()}${config.singular.slice(1)} registrado.`);
    limpiar();
    cargar();
  } catch (err) {
    aviso(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

function exportar() {
  const columnas = [
    { titulo: 'ID', valor: f => f.id },
    ...config.campos.map(c => ({ titulo: c.etiqueta, valor: f => valorVisible(c, f) })),
  ];
  descargarCsv(`${nombreTabla}-${hoyArchivo()}.csv`, columnas, filtradas());
}

export async function mostrarCrud(nombre) {
  nombreTabla = nombre;
  config = TABLAS[nombre];
  $('crud-buscar').value = '';
  await pintarFormulario();
  await cargar();
}

export function iniciarCrud() {
  $('form-crud').addEventListener('submit', guardar);
  $('crud-cancelar').addEventListener('click', limpiar);
  $('crud-buscar').addEventListener('input', pintarFilas);
  $('crud-csv').addEventListener('click', exportar);
  $('crud-filas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    btn.dataset.accion === 'editar' ? editar(id) : eliminar(id);
  });
}
