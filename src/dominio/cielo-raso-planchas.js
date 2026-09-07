// Cielo raso de plancha: con qué plancha se hace.
//
// Mismo principio que la división (`divisiones.js`), pero una sola cara: la
// estructura de omega + angular no cambia, y lo que sí cambia es la plancha,
// el tornillo que la agarra y el acabado de la junta. A diferencia de la
// división, aquí no hay un precio por m² fijo por plancha: se sigue cobrando
// material a costo + mano de obra, como el resto de trabajos sin tarifa.

import * as bd from '../core/bd.js';

export const RECETA_BASE = 'cielo_raso';

export const VARIANTES_BASE = [
  { id: 'drywall-12', nombre: 'Drywall 1/2" (12.7 mm)', plancha: 'plancha-st-127', tornillo: 'tornillo-drywall-1', acabado: 'drywall' },
  { id: 'drywall-38', nombre: 'Drywall 3/8" (9.5 mm)', plancha: 'plancha-st-95', tornillo: 'tornillo-drywall-1', acabado: 'drywall' },
  { id: 'fibro-4', nombre: 'Fibrocemento 4 mm', plancha: 'plancha-fibrocemento-4', tornillo: 'tornillo-fibrocemento', acabado: 'fibrocemento' },
  { id: 'fibro-6', nombre: 'Fibrocemento 6 mm', plancha: 'plancha-fibrocemento-6', tornillo: 'tornillo-fibrocemento', acabado: 'fibrocemento' },
  { id: 'fibro-8', nombre: 'Fibrocemento 8 mm', plancha: 'plancha-fibrocemento-8', tornillo: 'tornillo-fibrocemento', acabado: 'fibrocemento' },
  { id: 'fibro-10', nombre: 'Fibrocemento 10 mm', plancha: 'plancha-fibrocemento-10', tornillo: 'tornillo-fibrocemento', acabado: 'fibrocemento' },
];

/** Consumos de acabado por m², una sola cara: la mitad de lo que lleva la división. */
export const ACABADO_POR_M2 = {
  drywall: [
    { material: 'cinta-papel', porM2: 1.6, nota: '1.6 m de junta por m².' },
    { material: 'cinta-malla', porM2: 0.1, nota: 'Solo para encuentros sueltos y parches.' },
    { material: 'masilla-28', porM2: 0.2, nota: 'Junta y cabeza de tornillo, no empaste total.' },
  ],
  fibrocemento: [
    { material: 'sika-sellador', porM2: 0.15, nota: 'La junta se sella; el fibrocemento no lleva cinta.' },
    { material: 'masilla-28', porM2: 0.13, nota: 'Tapa los tornillos y empareja sobre el sellador.' },
  ],
};

export const LIJADO = {
  linea: { material: 'lija-120', porM2: 0.05, nota: 'Un pliego rinde ~20 m² de lijado.' },
  recargoPorM2: 4,
};

export function variantes() {
  const guardadas = bd.config('cieloRasoPrecios', {});
  return VARIANTES_BASE.map((v) => ({ ...v, ...guardadas[v.id] }));
}

export function variante(id) {
  const lista = variantes();
  return lista.find((v) => v.id === id) || lista[0];
}

export function recargoLijado() {
  const cfg = bd.config('cieloRasoLijado', {});
  const n = Number(cfg.recargoPorM2);
  return Number.isFinite(n) && n >= 0 ? n : LIJADO.recargoPorM2;
}

export function guardarRecargoLijado(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Recargo inválido' };
  bd.guardarConfig('cieloRasoLijado', { recargoPorM2: n });
  return { ok: true };
}
