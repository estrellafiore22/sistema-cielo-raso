// Casa prefabricada: estructura de tijeral (parante + riel) con techo de
// calamina, simple o termoacústica.
//
// Se cotiza por m² de PISO, como pide el cliente ("una casa de 40 m²"), no
// por separado pared y techo: la receta ya trae la relación entre ellos
// estimada para una casa rectangular típica de 2.4 m de altura. Es un
// estimado de mercado, igual que el resto de las recetas — se ajusta desde
// Ajustes → Recetas si no calza con cómo se arma en obra.

import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';

export const RECETA_BASE = 'casa_prefabricada';

export const TECHOS = [
  { id: 'calamina', nombre: 'Calamina simple', material: 'calamina' },
  { id: 'calamina-termoacustica', nombre: 'Calamina termoacústica', material: 'calamina-termoacustica' },
];

export function techo(id) {
  return TECHOS.find((t) => t.id === id) || TECHOS[0];
}

/** Arma la receta con el techo elegido. Sin variante: la estructura no cambia. */
export function lineas(techoId) {
  const base = obtenerReceta(RECETA_BASE);
  if (!base) return { ok: false, error: 'No está cargada la receta de casa prefabricada' };

  const elegido = techo(techoId);
  const salida = base.lineas.map((linea) => {
    const material = obtenerMaterial(linea.material);
    if (material?.categoria === 'techos') return { ...linea, material: elegido.material };
    return { ...linea };
  });

  return { ok: true, lineas: salida, techo: elegido };
}
