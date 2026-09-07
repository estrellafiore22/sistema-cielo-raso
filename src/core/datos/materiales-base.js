// Catálogo inicial de materiales: junta las familias que vende la tienda.
//
// El detalle de cada una vive aparte porque son negocios distintos:
//   · materiales-drywall.js       planchas, perfiles, tornillería y acabados
//   · materiales-vinil.js         retícula del cielo raso vinil, PVC y laminado
//   · materiales-pisos-techos.js  pisos epóxicos, calamina, piso radiante
//
// Las categorías y la regla de las dos unidades están en unidades.js.

import { MATERIALES_DRYWALL } from './materiales-drywall.js';
import { MATERIALES_VINIL } from './materiales-vinil.js';
import { MATERIALES_PISOS_TECHOS } from './materiales-pisos-techos.js';

export { CATEGORIAS_BASE } from './unidades.js';

export const MATERIALES_BASE = [
  ...MATERIALES_DRYWALL,
  ...MATERIALES_VINIL,
  ...MATERIALES_PISOS_TECHOS,
];
