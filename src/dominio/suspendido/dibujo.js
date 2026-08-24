// Convierte la retícula en segmentos y cotas listos para dibujar.
//
// Vive en dominio y no toca el DOM: recibe la retícula, devuelve coordenadas.
// Así el plano de la pantalla y el de la boleta impresa salen del mismo sitio
// y no se pueden contradecir.

import { LARGOS } from './config.js';

const TOL = 0.001;

export function preparar(grid) {
  return {
    ancho: grid.ancho,
    largo: grid.largo,
    orientacion: grid.orientacion,
    baldosas: grid.baldosas,
    segmentos: segmentos(grid),
    puntos: puntosDeSuspension(grid),
    cotasX: cadena(grid.columnasCota || cotaX(grid), 'x'),
    cotasY: cadena(grid.filasCota || cotaY(grid), 'y'),
  };
}

/** Todas las barras como segmentos rectos, sin importar la orientación. */
function segmentos(grid) {
  const salida = [];

  // Perímetro: cuatro tramos cerrando el ambiente
  const { ancho: A, largo: L } = grid;
  salida.push(
    { tipo: 'perimetral', x1: 0, y1: 0, x2: A, y2: 0, largo: A },
    { tipo: 'perimetral', x1: A, y1: 0, x2: A, y2: L, largo: L },
    { tipo: 'perimetral', x1: A, y1: L, x2: 0, y2: L, largo: A },
    { tipo: 'perimetral', x1: 0, y1: L, x2: 0, y2: 0, largo: L },
  );

  for (const p of grid.principales) {
    salida.push(
      p.horizontal
        ? { tipo: 'principal', x1: p.x1, y1: p.y, x2: p.x2, y2: p.y, largo: p.largo, tramos: p.tramos }
        : { tipo: 'principal', x1: p.x, y1: p.y1, x2: p.x, y2: p.y2, largo: p.largo, tramos: p.tramos },
    );
  }

  for (const s of grid.secundarias) {
    salida.push(
      s.vertical
        ? { tipo: 'secundaria', x1: s.x, y1: s.y1, x2: s.x, y2: s.y2, largo: s.largo, completa: s.completa }
        : { tipo: 'secundaria', x1: s.x1, y1: s.y, x2: s.x2, y2: s.y, largo: s.largo, completa: s.completa },
    );
  }

  for (const t of grid.terciarias) {
    salida.push(
      t.horizontal
        ? { tipo: 'terciaria', x1: t.x1, y1: t.y, x2: t.x2, y2: t.y, largo: t.largo, completa: t.completa }
        : { tipo: 'terciaria', x1: t.x, y1: t.y1, x2: t.x, y2: t.y2, largo: t.largo, completa: t.completa },
    );
  }

  return salida;
}

/** Puntos de alambre: repartidos sobre cada T principal. */
function puntosDeSuspension(grid, paso = 122) {
  const salida = [];
  for (const p of grid.principales) {
    if (p.horizontal) {
      for (let d = 0; d <= p.largo + TOL; d += paso) {
        salida.push({ x: Math.min(p.x1 + d, p.x2), y: p.y });
      }
    } else {
      for (let d = 0; d <= p.largo + TOL; d += paso) {
        salida.push({ x: p.x, y: Math.min(p.y1 + d, p.y2) });
      }
    }
  }
  return salida;
}

/**
 * Cota horizontal: los paños que cruzan las T secundarias. El último es el
 * recorte, y se marca aparte porque es el que decide cuánto material se pierde.
 */
function cotaX(grid) {
  const cortes = new Set([0, grid.ancho]);
  for (const s of grid.segmentosPrincipalesX || lineasPrincipalesX(grid)) cortes.add(s);
  return aTramos(Array.from(cortes).sort((a, b) => a - b));
}

function cotaY(grid) {
  const cortes = new Set([0, grid.largo]);
  for (const s of lineasSecundariasY(grid)) cortes.add(s);
  return aTramos(Array.from(cortes).sort((a, b) => a - b));
}

function lineasPrincipalesX(grid) {
  const salida = [];
  for (const p of grid.principales) if (!p.horizontal) salida.push(p.x);
  for (const s of grid.secundarias) if (s.vertical) salida.push(s.x);
  return [...new Set(salida)];
}

function lineasSecundariasY(grid) {
  const salida = [];
  for (const p of grid.principales) if (p.horizontal) salida.push(p.y);
  for (const s of grid.secundarias) if (!s.vertical) salida.push(s.y);
  return [...new Set(salida)];
}

function aTramos(cortes) {
  const salida = [];
  for (let i = 0; i < cortes.length - 1; i += 1) {
    const largo = redondear(cortes[i + 1] - cortes[i]);
    if (largo > TOL) salida.push({ desde: cortes[i], hasta: cortes[i + 1], largo });
  }
  return salida;
}

/** Marca cuál tramo es el recorte final para pintarlo distinto. */
function cadena(tramos, eje) {
  if (!tramos.length) return [];
  const mayor = Math.max(...tramos.map((t) => t.largo));
  return tramos.map((t, i) => ({
    ...t,
    eje,
    indice: i + 1,
    esRecorte: t.largo < mayor - TOL,
  }));
}

/**
 * Resumen corto de los cortes de una barra, para rotularla en el plano.
 * "366 + 50" dice de un vistazo cómo se arma esa línea.
 */
export function rotuloTramos(segmento) {
  if (!segmento.tramos) return `${redondear(segmento.largo)}`;
  const { enteras, resto } = segmento.tramos;
  const partes = [];
  if (enteras > 0) partes.push(enteras > 1 ? `${enteras}×${LARGOS.principal}` : `${LARGOS.principal}`);
  if (resto > TOL) partes.push(`${redondear(resto)}`);
  return partes.join(' + ');
}

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
