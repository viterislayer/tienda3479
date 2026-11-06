import { api, $, aviso } from './comun.js';
import { iniciarCrud, mostrarCrud } from './crud.js';
import { iniciarVentas, mostrarVentas } from './ventas.js';
import { iniciarResumen, mostrarResumen } from './resumen.js';

const SERVIDOR_LOCAL = 'http://localhost:3000';

const VISTAS = {
  resumen: ['Resumen', 'Indicadores del negocio en tiempo real', mostrarResumen],
  ventas: ['Ventas', 'Registra ventas y consulta el historial', mostrarVentas],
  productos: ['Productos', 'Catálogo, precios y existencias', () => mostrarCrud('productos')],
  categorias: ['Categorías', 'Clasificación de los productos', () => mostrarCrud('categorias')],
  clientes: ['Clientes', 'Datos de facturación de los clientes', () => mostrarCrud('clientes')],
};

async function verificarEstado() {
  try {
    const e = await api('/api/estado');
    $('estado-texto').textContent = `Conectado a ${e.base}`;
    $('estado').title = `Usuario: ${e.usuario}`;
    $('estado').className = 'estado ok';
    return true;
  } catch (err) {
    $('estado-texto').textContent = 'Sin conexión a la base';
    $('estado').title = err.message;
    $('estado').className = 'estado error';
    return false;
  }
}

async function mostrarVista(nombre) {
  if (!VISTAS[nombre]) nombre = 'resumen';
  const [titulo, subtitulo, mostrar] = VISTAS[nombre];
  history.replaceState(null, '', `#${nombre}`);
  document.querySelectorAll('#pestanas button').forEach(b => {
    const activa = b.dataset.vista === nombre;
    b.classList.toggle('activa', activa);
    activa ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  $('titulo').textContent = titulo;
  $('subtitulo').textContent = subtitulo;
  document.title = `${titulo} · Tienda 3479`;
  $('vista-resumen').hidden = nombre !== 'resumen';
  $('vista-ventas').hidden = nombre !== 'ventas';
  $('vista-crud').hidden = !['productos', 'categorias', 'clientes'].includes(nombre);
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
  $('pestanas').addEventListener('click', e => {
    const btn = e.target.closest('button[data-vista]');
    if (btn) mostrarVista(btn.dataset.vista);
  });

  // En local, si la página se abrió fuera del servidor Node (Live Preview, Live Server), se redirige a él
  const enLocalSinServidor = ['localhost', '127.0.0.1'].includes(location.hostname) && location.origin !== SERVIDOR_LOCAL;
  if (!(await verificarEstado()) && enLocalSinServidor) return location.replace(SERVIDOR_LOCAL);

  mostrarVista(location.hash.slice(1));
})();
