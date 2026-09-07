// Separa el despiece en Estructura y Acabado, igual que se pidió para las
// divisiones: la estructura es lo que arma y sostiene (perfiles, fijación,
// techos), el acabado es la plancha y lo que tapa la junta (planchas,
// tornillería, acabados como cinta/masilla/sellador/lija).

const GRUPO_DE_CATEGORIA = {
  perfiles: 'estructura',
  fijacion: 'estructura',
  techos: 'estructura',
  electrico: 'estructura',
  aislamiento: 'estructura',
  planchas: 'acabado',
  tornilleria: 'acabado',
  acabados: 'acabado',
  pisos: 'acabado',
  otros: 'acabado',
};

/** @returns {{estructura: Array, acabado: Array}} */
export function agrupar(lineas) {
  const estructura = [];
  const acabado = [];
  for (const linea of lineas) {
    const grupo = GRUPO_DE_CATEGORIA[linea.categoria] || 'acabado';
    (grupo === 'estructura' ? estructura : acabado).push(linea);
  }
  return { estructura, acabado };
}
