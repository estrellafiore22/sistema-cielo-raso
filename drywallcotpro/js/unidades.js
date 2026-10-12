// Formato de longitudes, áreas y soles. La unidad de trabajo interna es
// siempre el METRO; "mm" solo cambia cómo se muestra y cómo se escribe.

let unidad = 'm';

export function fijarUnidad(u) { unidad = u === 'mm' ? 'mm' : 'm'; }
export function unidadActual() { return unidad; }

export function largo(m, conUnidad = true) {
  if (!isFinite(m)) return '—';
  if (unidad === 'mm') return Math.round(m * 1000) + (conUnidad ? ' mm' : '');
  return m.toFixed(2) + (conUnidad ? ' m' : '');
}

// Lee lo que escribió el usuario en la unidad visible y devuelve metros.
// Acepta coma decimal: en Perú se escribe "2,40".
export function leerLargo(texto) {
  const n = parseFloat(String(texto).replace(',', '.'));
  if (!isFinite(n)) return NaN;
  return unidad === 'mm' ? n / 1000 : n;
}

export function valorEditable(m) {
  return unidad === 'mm' ? String(Math.round(m * 1000)) : String(+m.toFixed(3));
}

export const area = (m2) => (isFinite(m2) ? m2.toFixed(2) : '—') + ' m²';

export function soles(n) {
  return 'S/ ' + (Math.round(n * 100) / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const num = (n, d = 2) => (+n).toLocaleString('es-PE', { maximumFractionDigits: d });
