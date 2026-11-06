import { api, $, aviso } from './comun.js';
import { iniciarCrud, mostrarCrud } from './crud.js';
import { iniciarVentas, mostrarVentas } from './ventas.js';
import { iniciarCompras, mostrarCompras } from './compras.js';
import { iniciarFinanzas, mostrarFinanzas } from './finanzas.js';
import { iniciarResumen, mostrarResumen } from './resumen.js';

const SERVIDOR_LOCAL = 'http://localhost:3000';

// Cada vista: título, subtítulo, sección que se muestra y función que carga sus datos
const crud = nombre => ['vista-crud', () => mostrarCrud(nombre)];
const VISTAS = {
  resumen: ['Resumen', 'Indicadores del negocio en tiempo real', 'vista-resumen', mostrarResumen],
  ventas: ['Ventas', 'Registra ventas y consulta el historial', 'vista-ventas', mostrarVentas],
  compras: ['Compras', 'Mercadería comprada a proveedores; aumenta el stock', 'vista-compras', mostrarCompras],
  gastos: ['Gastos', 'Gastos de operación: alquiler, servicios, sueldos', ...crud('gastos')],
  finanzas: ['Finanzas', 'Ingresos, egresos y balance', 'vista-finanzas', mostrarFinanzas],
  productos: ['Productos', 'Catálogo, precios y existencias', ...crud('productos')],
  categorias: ['Categorías', 'Clasificación de los productos', ...crud('categorias')],
  clientes: ['Clientes', 'Datos de facturación de los clientes', ...crud('clientes')],
  proveedores: ['Proveedores', 'Empresas a las que se compra mercadería', ...crud('proveedores')],
  tipos_gasto: ['Tipos de gasto', 'Clasificación de los gastos de operación', ...crud('tipos_gasto')],
};
const SECCIONES = ['vista-resumen', 'vista-ventas', 'vista-compras', 'vista-finanzas', 'vista-crud'];

async function verificarEstado() {
  try {
    const e = await api('/api/estado');
    $('estado-texto').textContent = 'Conectado';
    $('estado').title = `Oracle · ${e.base} · respuesta en ${e.latencia_ms} ms`;
    $('estado').className = 'estado ok';
    $('version').textContent = `v${e.version} · Oracle ${e.latencia_ms} ms`;
    return true;
  } catch (err) {
    $('estado-texto').textContent = 'Sin conexión';
    $('estado').title = err.message;
    $('estado').className = 'estado error';
    $('version').textContent = '';
    return false;
  }
}

// Atajo: "/" lleva al buscador de la sección visible (como en GitHub o Gmail)
function atajos(e) {
  const escribiendo = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (e.key !== '/' || escribiendo || document.querySelector('dialog[open]')) return;
  const buscador = [...document.querySelectorAll('input[type="search"]')].find(i => i.offsetParent !== null);
  if (buscador) {
    e.preventDefault();
    buscador.focus();
  }
}

async function mostrarVista(nombre) {
  if (!VISTAS[nombre]) nombre = 'resumen';
  const [titulo, subtitulo, seccion, mostrar] = VISTAS[nombre];
  history.replaceState(null, '', `#${nombre}`);
  document.querySelectorAll('#pestanas button').forEach(b => {
    const activa = b.dataset.vista === nombre;
    b.classList.toggle('activa', activa);
    activa ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  $('titulo').textContent = titulo;
  $('subtitulo').textContent = subtitulo;
  document.title = `${titulo} · Tienda 3479`;
  for (const id of SECCIONES) $(id).hidden = id !== seccion;
  try {
    await mostrar();
  } catch (err) {
    aviso(err.message, 'error');
  }
}

(async () => {
  $('fecha-hoy').textContent = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  iniciarResumen();
  iniciarCrud();
  iniciarVentas();
  iniciarCompras();
  iniciarFinanzas();
  $('pestanas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-vista]');
    if (btn) mostrarVista(btn.dataset.vista);
  });

  // En local, si la página se abrió fuera del servidor Node (Live Preview, Live Server), se redirige a él
  const enLocalSinServidor = ['localhost', '127.0.0.1'].includes(location.hostname) && location.origin !== SERVIDOR_LOCAL;
  if (!(await verificarEstado()) && enLocalSinServidor) return location.replace(SERVIDOR_LOCAL);

  document.addEventListener('keydown', atajos);
  setInterval(verificarEstado, 30000);
  mostrarVista(location.hash.slice(1));
})();
