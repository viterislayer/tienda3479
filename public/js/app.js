import { api, $, aviso } from './comun.js';
import { iniciarCrud, mostrarCrud } from './crud.js';
import { iniciarVentas, mostrarVentas } from './ventas.js';

const SERVIDOR_LOCAL = 'http://localhost:3000';

async function verificarEstado() {
  try {
    const e = await api('/api/estado');
    $('estado').textContent = `Conectado: ${e.usuario} @ ${e.base}`;
    $('estado').className = 'estado ok';
    return true;
  } catch (err) {
    $('estado').textContent = 'Sin conexión a la BD';
    $('estado').title = err.message;
    $('estado').className = 'estado error';
    return false;
  }
}

async function mostrarVista(nombre) {
  document.querySelectorAll('#pestanas button').forEach(b => b.classList.toggle('activa', b.dataset.vista === nombre));
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

  mostrarVista('ventas');
})();
