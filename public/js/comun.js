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

// A partir de esta cantidad un producto se considera con stock bajo
export const STOCK_BAJO = 3;

export function insigniaStock(stock) {
  const tipo = stock === 0 ? 'peligro' : stock <= STOCK_BAJO ? 'alerta' : 'ok';
  const texto = stock === 0 ? 'Agotado' : stock <= STOCK_BAJO ? `${stock} · Bajo` : stock;
  return `<span class="insignia ${tipo}">${texto}</span>`;
}

export function filaVacia(columnas, mensaje) {
  return `<tr><td colspan="${columnas}" class="vacio">${escapar(mensaje)}</td></tr>`;
}

export function filaCargando(columnas) {
  return `<tr><td colspan="${columnas}" class="vacio cargando">Cargando...</td></tr>`;
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

export function opcionesSelect(items, texto) {
  return items.map(item => `<option value="${item.id}">${escapar(texto(item))}</option>`).join('');
}

// Texto en minúsculas y sin tildes, para buscar sin importar acentos
export function normalizar(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function coincide(fila, busqueda, campos) {
  const termino = normalizar(busqueda.trim());
  return !termino || campos.some(campo => normalizar(campo(fila)).includes(termino));
}

// Descarga un archivo CSV que Excel abre con tildes correctas (BOM UTF-8)
export function descargarCsv(nombreArchivo, columnas, filas) {
  const celda = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const lineas = [
    columnas.map(c => celda(c.titulo)).join(','),
    ...filas.map(fila => columnas.map(c => celda(c.valor(fila))).join(',')),
  ];
  const archivo = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

// Fecha de hoy en hora local, formato AAAA-MM-DD (para inputs de fecha y nombres de archivo)
export function fechaHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const hoyArchivo = fechaHoy;

// Primer día del mes actual, formato AAAA-MM-DD
export function inicioDeMes() {
  return `${fechaHoy().slice(0, 8)}01`;
}

// '2026-11-05' -> '05/11/2026' (sin conversión de zona horaria)
export function fechaCorta(valor) {
  const [a, m, d] = String(valor).split('-');
  return `${d}/${m}/${a}`;
}

// Ventana de confirmación con el diseño de la página (reemplaza al confirm() del navegador)
export function confirmar({ titulo = '¿Confirmar?', texto = '', boton = 'Confirmar' } = {}) {
  const modal = $('modal-confirmar');
  $('confirmar-titulo').textContent = titulo;
  $('confirmar-texto').textContent = texto;
  $('confirmar-si').textContent = boton;
  return new Promise(resolver => {
    const cerrar = valor => {
      modal.removeEventListener('close', alCerrar);
      $('confirmar-si').onclick = $('confirmar-no').onclick = null;
      if (modal.open) modal.close();
      resolver(valor);
    };
    const alCerrar = () => cerrar(false);
    modal.addEventListener('close', alCerrar);
    $('confirmar-si').onclick = () => cerrar(true);
    $('confirmar-no').onclick = () => cerrar(false);
    modal.showModal();
    $('confirmar-no').focus();
  });
}

// Desactiva el botón y muestra un texto de carga mientras se ejecuta la acción
export async function conCarga(boton, texto, accion) {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.classList.add('cargando-btn');
  boton.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapar(texto)}`;
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.classList.remove('cargando-btn');
    boton.innerHTML = original;
  }
}

// "hace 5 min", "ayer", "hace 3 días"...; la fecha completa queda en el title
const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export function tiempoRelativo(valor) {
  const segundos = Math.round((new Date(valor) - Date.now()) / 1000);
  const unidades = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unidad, tamano] of unidades) {
    if (Math.abs(segundos) >= tamano) return relativo.format(Math.round(segundos / tamano), unidad);
  }
  return 'hace un momento';
}

export function celdaFecha(valor) {
  return `<span title="${escapar(fecha(valor))}">${escapar(tiempoRelativo(valor))}</span>`;
}

// Resalta por un momento la fila recién creada o editada
export function resaltarFila(contenedor, id) {
  const fila = contenedor.querySelector(`tr[data-id="${id}"]`);
  if (!fila) return;
  fila.classList.add('fila-nueva');
  fila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => fila.classList.remove('fila-nueva'), 2200);
}
