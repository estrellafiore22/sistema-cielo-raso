// Arma la receta de división según la plancha elegida. La lógica común con
// el cielo raso vive en receta-con-plancha.js.

import { armarLineas } from './receta-con-plancha.js';
import { ACABADO_POR_M2, LIJADO, variante, aislante, RECETA_BASE } from './divisiones.js';

/**
 * @param {string} varianteId
 * @param {boolean} conLijado
 * @param {string} aislanteId  'ninguno' si no lleva
 * @returns {{ok:boolean, error?:string, lineas?:Array, variante?:object}}
 */
export function lineas(varianteId, conLijado = false, aislanteId = 'ninguno') {
  const elegida = variante(varianteId);
  const elegidoAislante = aislante(aislanteId);

  const resultado = armarLineas({
    recetaId: RECETA_BASE,
    variante: elegida,
    acabadoPorM2: ACABADO_POR_M2,
    lijado: LIJADO,
    conLijado,
    extra: elegidoAislante.material
      ? { material: elegidoAislante.material, porM2: elegidoAislante.porM2, nota: elegidoAislante.nombre }
      : null,
  });
  return resultado.ok ? { ...resultado, variante: elegida } : resultado;
}
