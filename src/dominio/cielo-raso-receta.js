// Arma la receta de cielo raso según la plancha elegida. La lógica común con
// la división vive en receta-con-plancha.js.

import { armarLineas } from './receta-con-plancha.js';
import { ACABADO_POR_M2, LIJADO, variante, RECETA_BASE } from './cielo-raso-planchas.js';

/**
 * @param {string} varianteId
 * @param {boolean} conLijado
 * @returns {{ok:boolean, error?:string, lineas?:Array, variante?:object}}
 */
export function lineas(varianteId, conLijado = false) {
  const elegida = variante(varianteId);
  const resultado = armarLineas({
    recetaId: RECETA_BASE,
    variante: elegida,
    acabadoPorM2: ACABADO_POR_M2,
    lijado: LIJADO,
    conLijado,
  });
  return resultado.ok ? { ...resultado, variante: elegida } : resultado;
}
