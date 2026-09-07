// Cielo raso 3D flotante: arma la receta según la forma, las medidas y la
// luz elegidas. Se apoya en geometria.js (las áreas) y materiales.js (la
// lista), y esto solo los junta con la forma que espera el motor de precios.

import { cuadrada, redonda } from './geometria.js';
import { calcular as calcularMateriales } from './materiales.js';
import { FORMAS } from './config.js';

export { FORMAS, LED, NOMBRE_TRABAJO, DISENOS, diseno, config, guardarConfig } from './config.js';
export const RECETA_BASE = 'cenefa_3d';

/**
 * @param {object} pedido
 *   - forma: 'cuadrada' | 'redonda'
 *   - medidas: {ancho, largo} para la cuadrada, o {diametro} para la redonda
 *   - anchoBanda, altoCaida: en metros
 *   - variante: qué plancha (drywall/fibrocemento)
 *   - ledTipo: 'escondida' | 'visible' | 'ninguna'
 *   - planchearCentro: boolean
 */
export function calcular(pedido) {
  const forma = pedido.forma || FORMAS.CUADRADA;
  const geo =
    forma === FORMAS.REDONDA
      ? redonda({
          diametro: pedido.medidas?.diametro,
          anchoBanda: pedido.anchoBanda,
          altoCaida: pedido.altoCaida,
        })
      : cuadrada({
          anchoSala: pedido.medidas?.ancho,
          largoSala: pedido.medidas?.largo,
          anchoBanda: pedido.anchoBanda,
          altoCaida: pedido.altoCaida,
        });
  if (!geo.ok) return geo;

  const materiales = calcularMateriales(geo, {
    varianteId: pedido.variante,
    ledTipo: pedido.ledTipo,
    planchearCentro: Boolean(pedido.planchearCentro),
  });
  if (!materiales.ok) return materiales;

  return {
    ok: true,
    geo,
    lineas: materiales.lineas,
    // El área de referencia con la que se cotiza: la banda es lo que de
    // verdad define el tamaño de la cenefa.
    areaBanda: geo.areaBanda,
  };
}
