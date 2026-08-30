// Cómo se lee una cantidad del despiece.
//
// "11.76 plancha" no le dice nada al que va a cargar la camioneta. Lo que
// quiere leer es "11 planchas enteras y un pedazo", y de qué tamaño es ese
// pedazo. Lo mismo con los perfiles: "4.49 barras" son 4 barras y 1.47 m.

import { numero } from '../../core/formato.js';

/**
 * @param {number} valor  cantidad con decimales
 * @param {string} unidad nombre de la unidad ('plancha', 'barra'…)
 * @param {object} material del catálogo; puede traer `dimensiones`
 * @returns {string}
 */
export function cantidadLegible(valor, unidad, material) {
  const total = Number(valor) || 0;
  if (total === 0) return `0 ${unidad || ''}`.trim();

  const enteras = Math.floor(total + 1e-9);
  const resto = total - enteras;

  // Sin decimales no hay nada que explicar.
  if (resto < 0.01) return `${enteras} ${unidad || ''}`.trim();

  const pedazo = trozo(resto, material);
  const cabeza =
    enteras > 0
      ? `${enteras} ${unidad || ''} + ${numero(resto, 2)}`
      : `${numero(resto, 2)} ${unidad || ''}`;

  return pedazo ? `${cabeza.trim()} (${pedazo})` : cabeza.trim();
}

/** Qué mide, en metros, la fracción que sobra de una pieza. */
function trozo(fraccion, material) {
  const medidas = material?.dimensiones;
  if (!medidas) return '';

  // Una plancha se recorta a lo ancho y conserva el alto de fábrica.
  if (medidas.ancho && medidas.largo) {
    return `${numero(medidas.ancho * fraccion, 2)} × ${numero(medidas.largo, 2)} m`;
  }
  if (medidas.largo) return `${numero(medidas.largo * fraccion, 2)} m`;
  return '';
}
