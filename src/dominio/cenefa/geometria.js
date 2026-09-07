// Geometría de la cenefa 3D flotante: cuadrada o redonda.
//
// Es una "caja" que baja del techo, corriendo pegada al perímetro del
// ambiente (cuadrada) o como un anillo (redonda). Tiene tres superficies que
// importan para el material:
//
//   banda           el techo de la caja, horizontal, del ancho de la cenefa
//   caída exterior  la cara vertical exterior de la caja (contra la pared o
//                   el borde de afuera)
//   caída interior  la cara vertical interior, donde empieza el hueco central
//
// Son niveles PLANOS a propósito, no un editor de profundidad: cada nivel es
// una superficie con su propia área, no una malla 3D.

/**
 * @param {object} p
 *   - anchoSala, largoSala: medidas del ambiente, en metros
 *   - anchoBanda: cuánto avanza la cenefa desde la pared hacia el centro
 *   - altoCaida: cuánto baja la caja, en metros
 */
export function cuadrada({ anchoSala, largoSala, anchoBanda, altoCaida }) {
  const ancho = Number(anchoSala) || 0;
  const largo = Number(largoSala) || 0;
  const banda = Number(anchoBanda) || 0;
  const caida = Number(altoCaida) || 0;

  if (ancho <= 0 || largo <= 0) {
    return { ok: false, error: 'El ambiente necesita ancho y largo mayores a cero' };
  }
  if (banda <= 0) return { ok: false, error: 'El ancho de la cenefa debe ser mayor a cero' };

  const anchoInterior = ancho - 2 * banda;
  const largoInterior = largo - 2 * banda;
  if (anchoInterior <= 0 || largoInterior <= 0) {
    return {
      ok: false,
      error: 'La cenefa es tan ancha que no deja hueco central. Baja el ancho de la banda.',
    };
  }

  const perimetroExterior = 2 * (ancho + largo);
  const perimetroInterior = 2 * (anchoInterior + largoInterior);
  const areaTotal = ancho * largo;
  const areaCentro = anchoInterior * largoInterior;
  const areaBanda = areaTotal - areaCentro;

  return {
    ok: true,
    forma: 'cuadrada',
    perimetroExterior,
    perimetroInterior,
    areaBanda,
    areaCentro,
    areaCaidaExterior: perimetroExterior * caida,
    areaCaidaInterior: perimetroInterior * caida,
  };
}

/**
 * @param {object} p
 *   - diametro: del anillo exterior, en metros
 *   - anchoBanda, altoCaida: igual que en la cuadrada
 */
export function redonda({ diametro, anchoBanda, altoCaida }) {
  const d = Number(diametro) || 0;
  const banda = Number(anchoBanda) || 0;
  const caida = Number(altoCaida) || 0;

  if (d <= 0) return { ok: false, error: 'El diámetro debe ser mayor a cero' };
  if (banda <= 0) return { ok: false, error: 'El ancho de la cenefa debe ser mayor a cero' };

  const radioExterior = d / 2;
  const radioInterior = radioExterior - banda;
  if (radioInterior <= 0) {
    return {
      ok: false,
      error: 'La cenefa es tan ancha que no deja hueco central. Baja el ancho de la banda.',
    };
  }

  const perimetroExterior = 2 * Math.PI * radioExterior;
  const perimetroInterior = 2 * Math.PI * radioInterior;
  const areaCentro = Math.PI * radioInterior * radioInterior;
  const areaBanda = Math.PI * (radioExterior * radioExterior - radioInterior * radioInterior);

  return {
    ok: true,
    forma: 'redonda',
    perimetroExterior,
    perimetroInterior,
    areaBanda,
    areaCentro,
    areaCaidaExterior: perimetroExterior * caida,
    areaCaidaInterior: perimetroInterior * caida,
  };
}
