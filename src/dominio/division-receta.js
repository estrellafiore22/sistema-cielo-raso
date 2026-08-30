// Arma la receta que corresponde a una división según la plancha elegida.
//
// La receta guardada trae la estructura, que no cambia: riel, parante,
// tornillo framer y clavos con fulminante. Sobre esa base se cambia lo que sí
// depende de la plancha —la plancha misma, el tornillo que la agarra y el
// acabado de las juntas— y se agrega el lijado solo si el cliente lo pidió.
//
// Se arma al vuelo, no se guarda: así el dueño edita una sola receta en
// pantalla y las cinco variantes siguen cuadrando.

import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';
import { ACABADO_POR_M2, LIJADO, variante } from './divisiones.js';

/**
 * @param {string} varianteId
 * @param {boolean} conLijado
 * @returns {{ok:boolean, error?:string, lineas?:Array, variante?:object}}
 */
export function lineas(varianteId, conLijado = false) {
  const base = obtenerReceta('division');
  if (!base) return { ok: false, error: 'No está cargada la receta de división' };

  const elegida = variante(varianteId);
  const salida = [];

  for (const linea of base.lineas) {
    const material = obtenerMaterial(linea.material);
    if (!material) continue;

    // Los acabados los pone la variante: el fibrocemento no lleva cinta.
    if (material.categoria === 'acabados') continue;

    if (material.categoria === 'planchas') {
      salida.push({ ...linea, material: elegida.plancha });
      continue;
    }

    // El tornillo de plancha cambia con la plancha; el framer, no.
    if (esTornilloDePlancha(material)) {
      salida.push({ ...linea, material: elegida.tornillo });
      continue;
    }

    salida.push({ ...linea });
  }

  for (const linea of ACABADO_POR_M2[elegida.acabado] || []) salida.push({ ...linea });
  if (conLijado) salida.push({ ...LIJADO.linea });

  return { ok: true, lineas: salida, variante: elegida };
}

/**
 * Distingue el tornillo que sujeta la plancha del que une perfil con perfil.
 * El framer se queda igual con cualquier plancha.
 */
function esTornilloDePlancha(material) {
  if (material.categoria !== 'tornilleria') return false;
  return !/framer/i.test(material.id) && !/framer/i.test(material.nombre);
}
