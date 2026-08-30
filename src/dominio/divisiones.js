// Variantes de la división / tabique: con qué plancha se hace.
//
// La estructura es siempre la misma —riel, parante, tornillo framer y clavos—
// pero la plancha cambia todo lo demás: el tornillo que la agarra, cómo se
// tratan las juntas y cuánto se cobra el m² instalado.
//
//   · Drywall        se cinta con papel y se masilla la junta y los tornillos.
//   · Fibrocemento   no lleva cinta: la junta se sella y se masilla encima.
//
// El precio por m² es CON material y mano de obra incluidos, que es como lo
// cotiza la tienda. Se edita en Ajustes.

import * as bd from '../core/bd.js';

export const ACABADOS = { DRYWALL: 'drywall', FIBROCEMENTO: 'fibrocemento' };

export const VARIANTES_BASE = [
  {
    id: 'drywall-12',
    nombre: 'Drywall 1/2" (12.7 mm)',
    plancha: 'plancha-st-127',
    tornillo: 'tornillo-drywall-1',
    acabado: ACABADOS.DRYWALL,
    precioM2: 70,
  },
  {
    id: 'drywall-38',
    nombre: 'Drywall 3/8" (9.5 mm)',
    plancha: 'plancha-st-95',
    tornillo: 'tornillo-drywall-1',
    acabado: ACABADOS.DRYWALL,
    precioM2: 69,
  },
  {
    id: 'fibro-4',
    nombre: 'Fibrocemento 4 mm',
    plancha: 'plancha-fibrocemento-4',
    tornillo: 'tornillo-fibrocemento',
    acabado: ACABADOS.FIBROCEMENTO,
    precioM2: 100,
  },
  {
    id: 'fibro-6',
    nombre: 'Fibrocemento 6 mm',
    plancha: 'plancha-fibrocemento-6',
    tornillo: 'tornillo-fibrocemento',
    acabado: ACABADOS.FIBROCEMENTO,
    precioM2: 140,
  },
  {
    id: 'fibro-8',
    nombre: 'Fibrocemento 8 mm',
    plancha: 'plancha-fibrocemento-8',
    tornillo: 'tornillo-fibrocemento',
    acabado: ACABADOS.FIBROCEMENTO,
    precioM2: 195,
  },
];

/**
 * Consumos de acabado por m² de muro, contando las DOS caras.
 *
 * La masilla es solo para la junta y para tapar los tornillos, no para
 * empastar la plancha entera: por eso es bastante menos de lo que pedía la
 * receta vieja. La cinta de malla casi no se usa —queda para un encuentro
 * suelto o un parche— y el trabajo real lo hace la cinta de papel.
 */
export const ACABADO_POR_M2 = {
  [ACABADOS.DRYWALL]: [
    { material: 'cinta-papel', porM2: 3, nota: '3 m de junta por m², las dos caras.' },
    { material: 'cinta-malla', porM2: 0.2, nota: 'Solo para encuentros sueltos y parches.' },
    { material: 'masilla-28', porM2: 0.35, nota: 'Junta y cabeza de tornillo. No es empaste total.' },
  ],
  [ACABADOS.FIBROCEMENTO]: [
    { material: 'sika-sellador', porM2: 0.3, nota: 'La junta se sella; el fibrocemento no lleva cinta.' },
    { material: 'masilla-28', porM2: 0.25, nota: 'Tapa los tornillos y empareja sobre el sellador.' },
  ],
};

/** Lijado: no va por defecto. Si el cliente lo pide, se cobra aparte. */
export const LIJADO = {
  linea: { material: 'lija-120', porM2: 0.1, nota: 'Doble superficie a lijar.' },
  recargoPorM2: 4,
};

export const RECETA_BASE = 'division';

export function variantes() {
  const guardadas = bd.config('divisionesPrecios', {});
  return VARIANTES_BASE.map((v) => {
    const precio = Number(guardadas[v.id]);
    return Number.isFinite(precio) && precio > 0 ? { ...v, precioM2: precio } : { ...v };
  });
}

export function variante(id) {
  const lista = variantes();
  return lista.find((v) => v.id === id) || lista[0];
}

export function guardarPrecios(cambios) {
  const guardadas = { ...bd.config('divisionesPrecios', {}) };
  for (const [id, valor] of Object.entries(cambios || {})) {
    const n = Number(valor);
    if (Number.isFinite(n) && n >= 0) guardadas[id] = n;
  }
  bd.guardarConfig('divisionesPrecios', guardadas);
  return { ok: true, variantes: variantes() };
}

export function recargoLijado() {
  const cfg = bd.config('divisionesLijado', {});
  const n = Number(cfg.recargoPorM2);
  return Number.isFinite(n) && n >= 0 ? n : LIJADO.recargoPorM2;
}

export function guardarRecargoLijado(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Recargo inválido' };
  bd.guardarConfig('divisionesLijado', { recargoPorM2: n });
  return { ok: true };
}
