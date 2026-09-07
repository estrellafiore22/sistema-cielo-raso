// Casa prefabricada: estructura de tijeral (parante + riel) con techo de
// calamina, simple o termoacústica, más las paredes perimetrales.
//
// El dueño lo cobra con dos cuentas separadas, no con una receta por m² de
// piso:
//
//   Tijeral + techo:  ancho × largo (m² de piso) × precio por m²
//   Paredes:          perímetro × altura × precio por m²
//
// Ejemplo de 3 × 4 m: perímetro (3+4+3+4=14 ml) × 2.40 m = 33.6 m² de pared;
// tijeral+techo = 3×4 = 12 m². Cada cuenta tiene su propio precio por m²
// porque son trabajos distintos: parado en andamio forrando el perímetro no
// es lo mismo que armar el techo.

import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';
import * as bd from '../core/bd.js';

export const RECETA_BASE = 'casa_prefabricada';

export const TECHOS = [
  { id: 'calamina', nombre: 'Calamina simple', material: 'calamina' },
  { id: 'calamina-termoacustica', nombre: 'Calamina termoacústica', material: 'calamina-termoacustica' },
];

const POR_DEFECTO = {
  alturaPared: 2.4,
  precioTijeralTechoM2: 75,
  precioParedM2: 135,
};

export function config() {
  return { ...POR_DEFECTO, ...(bd.config('casaPrefabricada', {}) || {}) };
}

export function guardarConfig(cambios) {
  const actual = config();
  const nueva = { ...actual };
  for (const [clave, valor] of Object.entries(cambios || {})) {
    const n = Number(valor);
    if (Number.isFinite(n) && n > 0) nueva[clave] = n;
  }
  bd.guardarConfig('casaPrefabricada', nueva);
  return { ok: true, config: nueva };
}

export function techo(id) {
  return TECHOS.find((t) => t.id === id) || TECHOS[0];
}

/**
 * @param {number} ancho, largo  del piso, en metros
 * @returns {{areaPiso, perimetro, areaPared, tijeralTecho, paredes, total}}
 */
export function medidas(ancho, largo) {
  const a = Number(ancho) || 0;
  const l = Number(largo) || 0;
  const cfg = config();

  const areaPiso = a * l;
  const perimetro = 2 * (a + l);
  const areaPared = perimetro * cfg.alturaPared;

  const tijeralTecho = areaPiso * cfg.precioTijeralTechoM2;
  const paredes = areaPared * cfg.precioParedM2;

  return {
    areaPiso,
    perimetro,
    areaPared,
    tijeralTecho,
    paredes,
    total: tijeralTecho + paredes,
  };
}

/**
 * Arma la receta con el techo elegido y las líneas de pared reescaladas al
 * perímetro real, para que el motor de despiece —que multiplica todo por una
 * sola área— termine gastando lo mismo que gastaría calculando pared y techo
 * por separado.
 *
 * @param {string} techoId
 * @param {number} ancho, largo  del piso, en metros
 */
export function lineas(techoId, ancho, largo) {
  const base = obtenerReceta(RECETA_BASE);
  if (!base) return { ok: false, error: 'No está cargada la receta de casa prefabricada' };

  const elegido = techo(techoId);
  const m = medidas(ancho, largo);
  // El motor de despiece va a multiplicar cada línea por areaPiso: para que
  // una línea calibrada por m² de PARED gaste lo correcto, se reescala por
  // cuántas veces más grande es la pared que el piso.
  const escalaPared = m.areaPiso > 0 ? m.areaPared / m.areaPiso : 0;

  const salida = base.lineas.map((linea) => {
    const material = obtenerMaterial(linea.material);
    if (material?.categoria === 'techos') return { ...linea, material: elegido.material };
    return { ...linea, porM2: (Number(linea.porM2) || 0) * escalaPared };
  });

  return { ok: true, lineas: salida, techo: elegido, medidas: m };
}
