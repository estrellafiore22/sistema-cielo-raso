// De un paño de muro o de techo a la lista de planchas que hay que comprar.
//
// Antes esto era un número por metro cuadrado: 0.726 planchas/m². Ese número
// no distingue un muro de 3.66 m —que sale en planchas justas— de uno de
// 3.70 m, que obliga a abrir una plancha más para una tira de 4 cm. Ahora se
// arma el corte de verdad y se cuentan las planchas que salen.
//
// El paño se cubre en COLUMNAS del ancho de la plancha, de arriba abajo. Es
// como se instala: la junta vertical cae sobre el parante, y la horizontal se
// evita mientras la plancha alcance.

import { repartir } from './corte.js';

/** Medida de fábrica de una plancha, en centímetros. */
export const PLANCHA = { ancho: 122, alto: 244 };

/**
 * @param {object} pano
 *   - ancho, alto: del paño, en metros
 *   - caras: 1 (cielo raso, una cara) o 2 (división)
 * @param {object} opciones
 *   - plancha: medida de fábrica en cm
 *   - desperdicioExtra: porcentaje, por si el techo es muy recortado
 * @returns {{ok:boolean, error?:string, plan?:object}}
 */
export function planificar(pano, opciones = {}) {
  const ancho = Math.round((Number(pano?.ancho) || 0) * 100);
  const alto = Math.round((Number(pano?.alto) || 0) * 100);
  const caras = Number(pano?.caras) === 2 ? 2 : 1;
  const plancha = opciones.plancha || PLANCHA;

  if (ancho <= 0 || alto <= 0) {
    return { ok: false, error: 'El paño necesita ancho y alto mayores a cero' };
  }

  // Se prueban las dos formas de correr las planchas —columnas de pie y
  // columnas acostadas— y gana la que gasta menos. Es la misma idea que ya
  // usa el cielo raso vinil con las T principales.
  // Lo que se voltea es el PAÑO, no la plancha: correr las columnas a lo
  // largo o a lo ancho. La plancha se corta siempre en su propio sentido, que
  // es lo que la hace resistir.
  const opcionesCorte = [
    { nombre: 'a lo ancho', piezas: piezasDe(ancho, alto, caras, plancha) },
    { nombre: 'a lo largo', piezas: piezasDe(alto, ancho, caras, plancha) },
  ].map((o) => ({ ...o, reparto: repartir(o.piezas, plancha) }));

  const elegida = opcionesCorte.reduce((a, b) =>
    b.reparto.planchas < a.reparto.planchas ? b : a,
  );
  const otra = opcionesCorte.find((o) => o !== elegida);

  const reparto = elegida.reparto;
  const extra = Math.max(0, Number(opciones.desperdicioExtra) || 0);
  const planchas = Math.ceil(reparto.planchas * (1 + extra / 100));

  return {
    ok: true,
    plan: {
      ...reparto,
      planchas,
      piezas: elegida.piezas.length,
      orientacion: elegida.nombre,
      ahorroOrientacion: otra ? otra.reparto.planchas - reparto.planchas : 0,
      caras,
      area: (ancho / 100) * (alto / 100) * caras,
      plancha,
      // Cuántas planchas habría dado la cuenta vieja, solo por área.
      porArea: Number((((ancho / 100) * (alto / 100) * caras) /
        ((plancha.ancho / 100) * (plancha.alto / 100))).toFixed(2)),
    },
  };
}

function piezasDe(ancho, alto, caras, plancha) {
  const piezas = [];
  for (let cara = 1; cara <= caras; cara += 1) {
    for (const pieza of columnas(ancho, alto, plancha)) piezas.push({ ...pieza, cara });
  }
  return piezas;
}

/**
 * Las piezas de una cara: columnas enteras del ancho de la plancha y, si el
 * paño no da justo, una tira final más angosta. Si el paño es más alto que la
 * plancha, la columna se completa con un pedazo arriba.
 */
function columnas(ancho, alto, plancha) {
  const piezas = [];
  const enteras = Math.floor(ancho / plancha.ancho);
  const tira = ancho - enteras * plancha.ancho;

  const anchos = [];
  for (let i = 0; i < enteras; i += 1) anchos.push(plancha.ancho);
  if (tira > 0) anchos.push(tira);

  for (const anchoColumna of anchos) {
    let restante = alto;
    while (restante > 0) {
      const altoPieza = Math.min(restante, plancha.alto);
      piezas.push({ ancho: anchoColumna, alto: altoPieza });
      restante -= altoPieza;
    }
  }
  return piezas;
}
