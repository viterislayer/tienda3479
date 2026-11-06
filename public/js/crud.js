import { api, $, escapar, moneda, aviso, opcionesSelect } from './comun.js';

// Configuración de cada tabla administrable desde la página
export const TABLAS = {
  productos: {
    ruta: '/api/productos',
    singular: 'producto',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'categoria_id', etiqueta: 'Categoría', tipo: 'select', origen: '/api/categorias', mostrar: 'categoria', requerido: true },
      { col: 'precio', etiqueta: 'Precio', tipo: 'number', step: '0.01', min: '0', requerido: true, formato: moneda },
      { col: 'stock', etiqueta: 'Stock', tipo: 'number', step: '1', min: '0', requerido: true, porDefecto: 0 },
    ],
  },
  categorias: {
    ruta: '/api/categorias',
    singular: 'categoría',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
    ],
  },
  clientes: {
    ruta: '/api/clientes',
    singular: 'cliente',
    campos: [
      { col: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'nit_dpi', etiqueta: 'NIT / DPI', tipo: 'text', requerido: true },
      { col: 'correo', etiqueta: 'Correo', tipo: 'email' },
    ],
  },
};

let config = null;
let filas = [];
let editandoId = null;

function campoHtml(campo, opciones) {
  const requerido = campo.requerido ? 'required' : '';
  if (campo.tipo === 'select') {
    return `<label>${campo.etiqueta}
      <select name="${campo.col}" ${requerido}>
        <option value="">-- Seleccione --</option>${opcionesSelect(opciones, o => o.nombre)}
      </select></label>`;
  }
  const extra = ['step', 'min'].filter(a => campo[a]).map(a => `${a}="${campo[a]}"`).join(' ');
  return `<label>${campo.etiqueta}
    <input name="${campo.col}" type="${campo.tipo}" ${extra} ${requerido}></label>`;
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

async function cargar() {
  const columnas = config.campos.length + 2;
  $('crud-cabecera').innerHTML =
    `<tr><th>ID</th>${config.campos.map(c => `<th>${c.etiqueta}</th>`).join('')}<th>Acciones</th></tr>`;
  try {
    filas = await api(config.ruta);
    $('crud-filas').innerHTML = filas.length
      ? filas.map(f => `
        <tr>
          <td>${f.id}</td>
          ${config.campos.map(c => {
            const valor = f[c.mostrar || c.col];
            return `<td>${escapar(c.formato ? c.formato(valor) : valor)}</td>`;
          }).join('')}
          <td class="botones">
            <button data-accion="editar" data-id="${f.id}">Editar</button>
            <button data-accion="eliminar" data-id="${f.id}" class="peligro">Eliminar</button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="${columnas}" class="vacio">Sin registros</td></tr>`;
  } catch (err) {
    $('crud-filas').innerHTML = `<tr><td colspan="${columnas}" class="vacio">Error: ${escapar(err.message)}</td></tr>`;
  }
}

function editar(id) {
  const fila = filas.find(f => f.id === id);
  editandoId = id;
  for (const c of config.campos) $('form-crud').elements[c.col].value = fila[c.col] ?? '';
  $('crud-titulo').textContent = `Editando ${config.singular} #${id}`;
  $('crud-cancelar').hidden = false;
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
  try {
    const url = editandoId ? `${config.ruta}/${editandoId}` : config.ruta;
    await api(url, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(datos) });
    aviso(editandoId ? 'Cambios guardados.' : 'Registro creado.');
    limpiar();
    cargar();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

export async function mostrarCrud(nombre) {
  config = TABLAS[nombre];
  await pintarFormulario();
  await cargar();
}

export function iniciarCrud() {
  $('form-crud').addEventListener('submit', guardar);
  $('crud-cancelar').addEventListener('click', limpiar);
  $('crud-filas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    btn.dataset.accion === 'editar' ? editar(id) : eliminar(id);
  });
}
