// Llama a la API y devuelve el JSON, o lanza un Error con el mensaje del servidor
export async function api(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(ruta, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  } catch {
    throw new Error('No se pudo contactar al servidor.');
  }
  if (res.status === 204) return null;

  const esJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = esJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  if (!esJson) throw new Error('Respuesta inválida del servidor.');
  return data;
}

export const $ = id => document.getElementById(id);

export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function moneda(valor) {
  return 'Q ' + Number(valor || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fecha(valor) {
  return new Date(valor).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
}

let temporizador;
export function aviso(mensaje, tipo = 'ok') {
  const caja = $('aviso');
  caja.textContent = mensaje;
  caja.className = `aviso ${tipo}`;
  caja.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { caja.hidden = true; }, 4000);
}

export function opcionesSelect(items, texto, seleccionado) {
  return items.map(item =>
    `<option value="${item.id}" ${item.id === seleccionado ? 'selected' : ''}>${escapar(texto(item))}</option>`
  ).join('');
}
