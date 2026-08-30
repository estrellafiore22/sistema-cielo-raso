// Cómo se cortan las planchas y qué recortes sirven para otra parte.
//
// LA REGLA, dicha como la dijo el dueño: un recorte se vuelve a usar si el
// pedazo que hace falta CABE ENTERO dentro de él. No se juntan dos recortes
// chicos para armar uno grande — la junta quedaría en el aire, sin perfil
// detrás. Es la misma regla que las baldosas del cielo raso vinil.
//
// De ahí sale el algoritmo: cada pieza que hay que instalar se busca primero
// en los recortes guardados, y solo si no entra en ninguno se abre una plancha
// nueva. Al cortar una pieza de un rectángulo quedan dos recortes —el de al
// lado y el de abajo—, que se guardan si valen la pena.
//
// No se giran las piezas: la plancha tiene un sentido (el papel y el borde de
// fábrica van a lo largo) y girarla para ahorrar sería un consejo malo.

/** Recortes más chicos que esto no se guardan: estorban más de lo que valen. */
const MINIMO_UTIL = 20;

/**
 * @param {Array<{ancho:number, alto:number, nota?:string}>} piezas  en cm
 * @param {{ancho:number, alto:number}} plancha  medida de fábrica, en cm
 * @param {object} opciones
 *   - minimoUtil: lado mínimo de un recorte para guardarlo
 * @returns {{planchas:number, cortes:Array, sobrantes:Array, aprovechado:number}}
 */
export function repartir(piezas, plancha, { minimoUtil = MINIMO_UTIL } = {}) {
  // De mayor a menor: si primero entran las grandes, las chicas encuentran
  // sitio en los recortes que aquellas dejaron. Al revés no funciona.
  const pendientes = [...piezas]
    .filter((p) => p.ancho > 0 && p.alto > 0)
    .sort((a, b) => b.ancho * b.alto - a.ancho * a.alto);

  const recortes = []; // rectángulos disponibles, de planchas ya abiertas
  const cortes = [];
  let planchas = 0;
  let areaPiezas = 0;

  for (const pieza of pendientes) {
    if (pieza.ancho > plancha.ancho || pieza.alto > plancha.alto) {
      // No entra ni en una plancha entera: hay que empalmarla sobre un perfil.
      cortes.push({ ...pieza, deRecorte: false, noEntra: true });
      planchas += Math.ceil(pieza.ancho / plancha.ancho) *
        Math.ceil(pieza.alto / plancha.alto);
      areaPiezas += pieza.ancho * pieza.alto;
      continue;
    }

    const indice = mejorRecorte(recortes, pieza);
    let hueco;

    if (indice >= 0) {
      hueco = recortes.splice(indice, 1)[0];
    } else {
      hueco = { ancho: plancha.ancho, alto: plancha.alto, origen: 'plancha nueva' };
      planchas += 1;
    }

    cortes.push({ ...pieza, deRecorte: hueco.origen !== 'plancha nueva' });
    areaPiezas += pieza.ancho * pieza.alto;

    for (const resto of partir(hueco, pieza, minimoUtil)) recortes.push(resto);
  }

  const areaPlanchas = planchas * plancha.ancho * plancha.alto;
  return {
    planchas,
    cortes,
    sobrantes: agrupar(recortes),
    aprovechado: areaPlanchas > 0 ? areaPiezas / areaPlanchas : 0,
  };
}

/**
 * El recorte más ajustado donde la pieza entra entera. Gastar el más chico que
 * sirva deja los grandes libres para lo que venga después.
 */
function mejorRecorte(recortes, pieza) {
  let mejor = -1;
  let sobra = Infinity;

  for (let i = 0; i < recortes.length; i += 1) {
    const r = recortes[i];
    if (r.ancho < pieza.ancho || r.alto < pieza.alto) continue;
    const desperdicio = r.ancho * r.alto - pieza.ancho * pieza.alto;
    if (desperdicio < sobra) {
      sobra = desperdicio;
      mejor = i;
    }
  }
  return mejor;
}

/**
 * Al sacar la pieza de la esquina del rectángulo quedan dos pedazos: el de al
 * lado y el de abajo. Se corta por el lado largo para que el recorte grande
 * quede de una pieza y no en dos tiras flacas.
 */
function partir(hueco, pieza, minimoUtil) {
  const anchoSobra = hueco.ancho - pieza.ancho;
  const altoSobra = hueco.alto - pieza.alto;
  const origen = 'recorte';

  const corteVertical = anchoSobra >= altoSobra;
  const pedazos = corteVertical
    ? [
        { ancho: anchoSobra, alto: hueco.alto, origen },
        { ancho: pieza.ancho, alto: altoSobra, origen },
      ]
    : [
        { ancho: hueco.ancho, alto: altoSobra, origen },
        { ancho: anchoSobra, alto: pieza.alto, origen },
      ];

  return pedazos.filter((p) => p.ancho >= minimoUtil && p.alto >= minimoUtil);
}

/** Junta los recortes iguales para poder listarlos sin repetir. */
function agrupar(recortes) {
  const mapa = new Map();
  for (const r of recortes) {
    const clave = `${Math.round(r.ancho)}x${Math.round(r.alto)}`;
    const previo = mapa.get(clave);
    if (previo) previo.cantidad += 1;
    else mapa.set(clave, { ancho: r.ancho, alto: r.alto, cantidad: 1 });
  }
  return Array.from(mapa.values()).sort((a, b) => b.ancho * b.alto - a.ancho * a.alto);
}
