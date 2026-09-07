// Arma una receta cuya plancha se elige en el momento: división y cielo raso
// comparten esta misma lógica, solo cambia la estructura base y el juego de
// variantes.
//
// La receta guardada trae la estructura, que no cambia (riel/parante o
// omega/angular, tornillo framer, clavos). Sobre esa base se cambia lo que sí
// depende de la plancha —la plancha misma, el tornillo que la agarra y el
// acabado de las juntas— y se agrega el lijado solo si el cliente lo pidió.
//
// Se arma al vuelo, no se guarda: así el dueño edita una sola receta en
// pantalla y todas las variantes siguen cuadrando.

import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';

/**
 * @param {object} opciones
 *   - recetaId: receta base guardada ('division', 'cielo_raso')
 *   - variante: la variante ya resuelta ({ plancha, tornillo, acabado, ... })
 *   - acabadoPorM2: mapa { [acabado]: [línea, ...] }
 *   - lijado: { linea } | null — se agrega solo si conLijado es true
 *   - conLijado: boolean
 *   - extra: línea adicional a agregar tal cual (aislante, por ejemplo)
 * @returns {{ok:boolean, error?:string, lineas?:Array}}
 */
export function armarLineas({ recetaId, variante, acabadoPorM2, lijado, conLijado, extra }) {
  const base = obtenerReceta(recetaId);
  if (!base) return { ok: false, error: `No está cargada la receta de ${recetaId}` };

  const salida = [];
  for (const linea of base.lineas) {
    const material = obtenerMaterial(linea.material);
    if (!material) continue;

    // Los acabados los pone la variante: el fibrocemento no lleva cinta.
    if (material.categoria === 'acabados') continue;

    if (material.categoria === 'planchas') {
      salida.push({ ...linea, material: variante.plancha });
      continue;
    }

    // El tornillo de plancha cambia con la plancha; el framer, no.
    if (esTornilloDePlancha(material)) {
      salida.push({ ...linea, material: variante.tornillo });
      continue;
    }

    salida.push({ ...linea });
  }

  for (const linea of acabadoPorM2[variante.acabado] || []) salida.push({ ...linea });
  if (conLijado && lijado) salida.push({ ...lijado.linea });
  if (extra) salida.push({ ...extra });

  return { ok: true, lineas: salida };
}

/**
 * Distingue el tornillo que sujeta la plancha del que une perfil con perfil.
 * El framer se queda igual con cualquier plancha.
 */
function esTornilloDePlancha(material) {
  if (material.categoria !== 'tornilleria') return false;
  return !/framer/i.test(material.id) && !/framer/i.test(material.nombre);
}
