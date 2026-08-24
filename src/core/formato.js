// Formato de moneda, fechas y números. Todo el sistema usa Soles peruanos.

const MONEDA = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

const FECHA_LARGA = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const FECHA_CORTA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const HORA = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
});

/** S/ 1,234.50 */
export function soles(monto) {
  const n = Number(monto);
  return MONEDA.format(Number.isFinite(n) ? n : 0);
}

/** Redondea a 2 decimales evitando los errores clásicos de punto flotante. */
export function redondear(n, decimales = 2) {
  const valor = Number(n);
  if (!Number.isFinite(valor)) return 0;
  const factor = Math.pow(10, decimales);
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** Número con separador de miles, sin símbolo de moneda. */
export function numero(n, decimales = 2) {
  const valor = Number(n);
  if (!Number.isFinite(valor)) return '0';
  return valor.toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Cantidades de material: enteros sin decimales, fracciones con dos. */
export function cantidad(n, unidad = '') {
  const valor = Number(n) || 0;
  const texto = Number.isInteger(valor) ? String(valor) : numero(valor, 2);
  return unidad ? `${texto} ${unidad}` : texto;
}

export function fechaLarga(valor) {
  const d = aFecha(valor);
  return d ? FECHA_LARGA.format(d) : '—';
}

export function fechaCorta(valor) {
  const d = aFecha(valor);
  return d ? FECHA_CORTA.format(d) : '—';
}

export function fechaHora(valor) {
  const d = aFecha(valor);
  return d ? `${FECHA_CORTA.format(d)} ${HORA.format(d)}` : '—';
}

/** Convierte a Date lo que se pueda; devuelve null si no es una fecha válida. */
export function aFecha(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clave de día en formato AAAA-MM-DD, que es como se guardan en el calendario. */
export function claveDia(valor) {
  const d = aFecha(valor) || new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function hoy() {
  return claveDia(new Date());
}

/** Identificador corto y legible para pedidos: PED-250824-A3F */
export function nuevoCodigo(prefijo) {
  const d = new Date();
  const aa = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const azar = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefijo}-${aa}${mm}${dd}-${azar}`;
}
