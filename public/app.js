const CONFIG = {
  productos: {
    singular: 'producto',
    campos: [
      { col: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'PRECIO', etiqueta: 'Precio', tipo: 'number', step: '0.01' },
      { col: 'STOCK', etiqueta: 'Stock', tipo: 'number', step: '1' },
    ],
  },
  clientes: {
    singular: 'cliente',
    campos: [
      { col: 'NOMBRE', etiqueta: 'Nombre', tipo: 'text', requerido: true },
      { col: 'NIT_DPI', etiqueta: 'NIT / DPI', tipo: 'text' },
      { col: 'CORREO', etiqueta: 'Correo', tipo: 'email' },
    ],
  },
};

let tablaActual = 'productos';
let editandoId = null;
let filasActuales = [];

const SERVIDOR = 'http://localhost:3000';

const $ = id => document.getElementById(id);

async function api(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(ruta, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  } catch {
    throw new Error('No se pudo contactar al servidor. Ejecuta "npm start" en la carpeta del proyecto.');
  }
  const esJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = esJson ? await res.json() : null;
  if (!res.ok || !esJson) throw new Error(data?.error || `El servidor respondió ${res.status} sin datos válidos`);
  return data;
}

function escapar(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function verificarEstado() {
  try {
    const e = await api('/api/estado');
    $('estado').textContent = `Conectado: ${e.USUARIO} @ ${e.BASE}`;
    $('estado').className = 'estado ok';
    return true;
  } catch (err) {
    $('estado').textContent = 'Sin conexión a la BD';
    $('estado').title = err.message;
    $('estado').className = 'estado error';
    return false;
  }
}

function pintarFormulario() {
  $('campos').innerHTML = CONFIG[tablaActual].campos.map(c => `
    <label>${c.etiqueta}
      <input name="${c.col}" type="${c.tipo}" ${c.step ? `step="${c.step}"` : ''} ${c.requerido ? 'required' : ''}>
    </label>`).join('');
  limpiarFormulario();
}

function limpiarFormulario() {
  editandoId = null;
  $('formulario').reset();
  $('tituloForm').textContent = `Nuevo ${CONFIG[tablaActual].singular}`;
  $('btnCancelar').hidden = true;
}

async function cargarDatos() {
  const cfg = CONFIG[tablaActual];
  const columnas = cfg.campos.length + 2;
  $('cabecera').innerHTML = `<tr><th>ID</th>${cfg.campos.map(c => `<th>${c.etiqueta}</th>`).join('')}<th>Acciones</th></tr>`;
  try {
    filasActuales = await api(`/api/${tablaActual}`);
    $('filas').innerHTML = filasActuales.length
      ? filasActuales.map(f => `
        <tr>
          <td>${f.ID}</td>
          ${cfg.campos.map(c => `<td>${escapar(f[c.col])}</td>`).join('')}
          <td class="botones">
            <button data-accion="editar" data-id="${f.ID}">Editar</button>
            <button data-accion="eliminar" data-id="${f.ID}" class="peligro">Eliminar</button>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="${columnas}">Sin registros</td></tr>`;
  } catch (err) {
    $('filas').innerHTML = `<tr><td colspan="${columnas}">Error: ${escapar(err.message)}</td></tr>`;
  }
}

function editar(id) {
  const fila = filasActuales.find(f => f.ID === id);
  editandoId = id;
  for (const c of CONFIG[tablaActual].campos) $('formulario').elements[c.col].value = fila[c.col] ?? '';
  $('tituloForm').textContent = `Editando ${CONFIG[tablaActual].singular} #${id}`;
  $('btnCancelar').hidden = false;
}

async function eliminar(id) {
  if (!confirm(`¿Eliminar el registro #${id}?`)) return;
  try {
    await api(`/api/${tablaActual}/${id}`, { method: 'DELETE' });
    if (editandoId === id) limpiarFormulario();
    cargarDatos();
  } catch (err) {
    alert(err.message);
  }
}

$('filas').addEventListener('click', e => {
  const btn = e.target.closest('button[data-accion]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  btn.dataset.accion === 'editar' ? editar(id) : eliminar(id);
});

$('formulario').addEventListener('submit', async e => {
  e.preventDefault();
  const datos = {};
  for (const c of CONFIG[tablaActual].campos) {
    const v = e.target.elements[c.col].value.trim();
    datos[c.col] = v === '' ? null : c.tipo === 'number' ? Number(v) : v;
  }
  try {
    const url = editandoId ? `/api/${tablaActual}/${editandoId}` : `/api/${tablaActual}`;
    await api(url, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(datos) });
    limpiarFormulario();
    cargarDatos();
  } catch (err) {
    alert(err.message);
  }
});

$('btnCancelar').addEventListener('click', limpiarFormulario);

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelector('.tab.activa').classList.remove('activa');
  btn.classList.add('activa');
  tablaActual = btn.dataset.tabla;
  pintarFormulario();
  cargarDatos();
}));

(async () => {
  // Si en local la página se abrió fuera del servidor Node (Live Preview, Live Server, doble clic), se redirige a él
  const esLocalSinServidor = location.protocol === 'file:'
    || (['localhost', '127.0.0.1'].includes(location.hostname) && location.origin !== SERVIDOR);
  if (!(await verificarEstado()) && esLocalSinServidor) {
    location.replace(SERVIDOR);
    return;
  }
  pintarFormulario();
  cargarDatos();
})();
