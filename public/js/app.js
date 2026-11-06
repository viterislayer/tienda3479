import { api, $, aviso } from './comun.js';
import { iniciarCrud, mostrarCrud } from './crud.js';
import { iniciarVentas, mostrarVentas } from './ventas.js';

const SERVIDOR_LOCAL = 'http://localhost:3000';

const VISTAS = {
  ventas: ['Ventas', 'Registra ventas y consulta el historial'],
  productos: ['Productos', 'Catálogo, precios y existencias'],
  categorias: ['Categorías', 'Clasificación de los productos'],
  clientes: ['Clientes', 'Datos de facturación de los clientes'],
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
  if (!VISTAS[nombre]) nombre = 'ventas';
  history.replaceState(null, '', `#${nombre}`);
  document.querySelectorAll('#pestanas button').forEach(b => b.classList.toggle('activa', b.dataset.vista === nombre));
  [$('titulo').textContent, $('subtitulo').textContent] = VISTAS[nombre];
  $('vista-ventas').hidden = nombre !== 'ventas';
  $('vista-crud').hidden = nombre === 'ventas';
  try {
    await (nombre === 'ventas' ? mostrarVentas() : mostrarCrud(nombre));
  } catch (err) {
    aviso(err.message, 'error');
  }
}

(async () => {
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
