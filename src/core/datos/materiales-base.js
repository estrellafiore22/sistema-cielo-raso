// Catálogo inicial de materiales: junta las dos familias que vende la tienda.
//
// El detalle de cada una vive aparte porque son dos negocios distintos:
//   · materiales-drywall.js  planchas, perfiles, tornillería y acabados
//   · materiales-vinil.js    la retícula del cielo raso vinil
//
// Las categorías y la regla de las dos unidades están en unidades.js.

import { MATERIALES_DRYWALL } from './materiales-drywall.js';
import { MATERIALES_VINIL } from './materiales-vinil.js';

export { CATEGORIAS_BASE } from './unidades.js';

export const MATERIALES_BASE = [...MATERIALES_DRYWALL, ...MATERIALES_VINIL];
