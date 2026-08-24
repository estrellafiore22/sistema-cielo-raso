// Retícula del cielo raso suspendido para baldosas de 61 × 61 cm.
//
// Cómo se arma el sistema, que es lo que decide todos los conteos:
//
//   · El ángulo perimetral corre pegado a las cuatro paredes.
//   · Las T principales van paralelas entre sí, cada 122 cm, de pared a pared.
//   · Las T secundarias (122) cruzan perpendicular a las principales, cada
//     61 cm, apoyándose de principal a principal.
//   · Las T terciarias (61) van paralelas a las principales, justo en el medio
//     de cada paño de 122, y parten el paño de 122 × 61 en dos baldosas.
//
// Sin DOM: entra ancho y largo, sale la retícula en coordenadas.

import { MODULO, PASO_PRINCIPAL } from './config.js';

const TOL = 0.001;

/**
 * @param {number} ancho  cm, eje X
 * @param {number} largo  cm, eje Y
 * @param {'vertical'|'horizontal'} orientacion
 *   'vertical'   → las T principales corren a lo largo del eje Y
 *   'horizontal' → corren a lo largo del eje X
 */
export function construir(ancho, largo, orientacion = 'vertical') {
  const A = Number(ancho);
  const L = Number(largo);
  if (!Number.isFinite(A) || !Number.isFinite(L) || A <= 0 || L <= 0) {
    return { ok: false, error: 'El ancho y el largo deben ser mayores a cero' };
  }

  // Se resuelve siempre con las principales en Y y, si hace falta, se gira
  // el resultado al final. Así hay una sola versión de la matemática.
  const girar = orientacion === 'horizontal';
  const W = girar ? L : A;
  const H = girar ? A : L;

  const reticula = calcular(W, H);
  const salida = girar ? transponer(reticula) : reticula;

  return {
    ok: true,
    grid: {
      ...salida,
      ancho: A,
      largo: L,
      area: redondear((A * L) / 10000, 3),
      orientacion,
    },
  };
}

/** Toda la matemática, con las principales corriendo en Y. */
function calcular(W, H) {
  // Columnas y filas de baldosa
  const columnas = tramos(W);
  const filas = tramos(H);

  // Líneas de la retícula en X: las pares son principales, las impares terciarias
  const lineasX = [];
  for (let k = 1; k * MODULO < W - TOL; k += 1) {
    lineasX.push({ x: k * MODULO, tipo: k % 2 === 0 ? 'principal' : 'terciaria' });
  }

  const principales = lineasX
    .filter((l) => l.tipo === 'principal')
    .map((l) => ({ x: l.x, y1: 0, y2: H, largo: H, tramos: partirBarra(H, 366) }));

  // Los paños en X que tiene que cruzar cada T secundaria
  const panos = [];
  let cursor = 0;
  for (const linea of lineasX.filter((l) => l.tipo === 'principal')) {
    panos.push({ x1: cursor, x2: linea.x, largo: redondear(linea.x - cursor) });
    cursor = linea.x;
  }
  if (W - cursor > TOL) {
    panos.push({ x1: cursor, x2: W, largo: redondear(W - cursor) });
  }

  // Secundarias: una por paño, en cada línea horizontal de 61
  const secundarias = [];
  for (let m = 1; m * MODULO < H - TOL; m += 1) {
    const y = m * MODULO;
    for (const pano of panos) {
      secundarias.push({
        y,
        x1: pano.x1,
        x2: pano.x2,
        largo: pano.largo,
        completa: Math.abs(pano.largo - PASO_PRINCIPAL) < TOL,
      });
    }
  }

  // Terciarias: en cada línea impar de X, dentro de cada banda de 61 en Y
  const terciarias = [];
  const xTerciarias = lineasX.filter((l) => l.tipo === 'terciaria').map((l) => l.x);
  for (const fila of filas) {
    for (const x of xTerciarias) {
      terciarias.push({
        x,
        y1: fila.desde,
        y2: fila.hasta,
        largo: fila.largo,
        completa: Math.abs(fila.largo - MODULO) < TOL,
      });
    }
  }

  // Baldosas
  const baldosas = [];
  for (const fila of filas) {
    for (const columna of columnas) {
      baldosas.push({
        x1: columna.desde,
        x2: columna.hasta,
        y1: fila.desde,
        y2: fila.hasta,
        ancho: columna.largo,
        alto: fila.largo,
        cortadaAncho: !columna.completa,
        cortadaAlto: !fila.completa,
        completa: columna.completa && fila.completa,
      });
    }
  }

  // Puntos de suspensión sobre cada principal
  return {
    W,
    H,
    columnas,
    filas,
    panos,
    principales,
    secundarias,
    terciarias,
    baldosas,
    perimetro: {
      total: redondear(2 * (W + H)),
      lados: [
        { nombre: 'Superior', largo: W },
        { nombre: 'Derecho', largo: H },
        { nombre: 'Inferior', largo: W },
        { nombre: 'Izquierdo', largo: H },
      ],
    },
  };
}

/** Parte una longitud en módulos de 61, marcando el recorte final. */
function tramos(total) {
  const salida = [];
  let desde = 0;
  while (total - desde > MODULO + TOL) {
    salida.push({ desde, hasta: desde + MODULO, largo: MODULO, completa: true });
    desde += MODULO;
  }
  const resto = redondear(total - desde);
  if (resto > TOL) {
    salida.push({
      desde,
      hasta: total,
      largo: resto,
      completa: Math.abs(resto - MODULO) < TOL,
    });
  }
  return salida;
}

/**
 * Cómo se cubre un largo con barras de fábrica empalmadas de punta a punta:
 * tantas enteras como quepan más un recorte final.
 */
export function partirBarra(largoTotal, largoBarra) {
  const enteras = Math.floor((largoTotal + TOL) / largoBarra);
  const resto = redondear(largoTotal - enteras * largoBarra);
  return { enteras, resto: resto > TOL ? resto : 0 };
}

/** Gira la retícula 90°: lo que era X pasa a ser Y. */
function transponer(r) {
  const girarLinea = (l) => ({ ...l });
  return {
    W: r.H,
    H: r.W,
    columnas: r.filas,
    filas: r.columnas,
    panos: r.panos,
    principales: r.principales.map((p) => ({
      y: p.x,
      x1: p.y1,
      x2: p.y2,
      largo: p.largo,
      tramos: p.tramos,
      horizontal: true,
    })),
    secundarias: r.secundarias.map((s) => ({
      x: s.y,
      y1: s.x1,
      y2: s.x2,
      largo: s.largo,
      completa: s.completa,
      vertical: true,
    })),
    terciarias: r.terciarias.map((t) => ({
      y: t.x,
      x1: t.y1,
      x2: t.y2,
      largo: t.largo,
      completa: t.completa,
      horizontal: true,
    })),
    baldosas: r.baldosas.map((b) => ({
      x1: b.y1,
      x2: b.y2,
      y1: b.x1,
      y2: b.x2,
      ancho: b.alto,
      alto: b.ancho,
      cortadaAncho: b.cortadaAlto,
      cortadaAlto: b.cortadaAncho,
      completa: b.completa,
    })),
    perimetro: {
      total: r.perimetro.total,
      lados: [
        { nombre: 'Superior', largo: r.H },
        { nombre: 'Derecho', largo: r.W },
        { nombre: 'Inferior', largo: r.H },
        { nombre: 'Izquierdo', largo: r.W },
      ],
    },
    _girarLinea: girarLinea,
  };
}

function redondear(n, decimales = 2) {
  const f = Math.pow(10, decimales);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
