// Cielo raso de láminas de PVC (largas, ~5.95 m). Se calcula cuántas tiras
// hacen falta a lo ancho, cuánto mide cada una y cómo sacarlas de las láminas
// con el menor desperdicio. Se prueban las dos direcciones.

import { areaPoligono, perimetro, cajaDe, esRectangulo, dist } from '../geom.js';
import { rend } from '../precios.js';
import { cortar, resumenCortes } from './cortes.js';
import { nuevaLista } from './partidas.js';

const CODIGO = { 20: 'pvc-20', 25: 'pvc-25', 30: 'pvc-30' };

// Láminas que corren a lo largo de `recorrido`, apiladas a lo ancho de `trav`.
export function planPVC(recorrido, trav, ancho, largo) {
  const tiras = Math.ceil(trav / ancho - 1e-6);
  const ultima = trav - (tiras - 1) * ancho; // la última se corta a lo largo
  const barras = cortar(Array(tiras).fill(recorrido), largo);
  const usado = tiras * recorrido;
  return { tiras, ultima, barras, laminas: barras.length, desperdicio: barras.length * largo - usado };
}

export function calcularPVC(amb) {
  const R = rend();
  const cfg = amb.cielo.pvc;
  const ancho = +cfg.ancho || 0.20, largo = +cfg.largo || 5.95;
  const c = cajaDe(amb.puntos);
  const A = areaPoligono(amb.puntos), P = perimetro(amb.puntos);

  const enX = planPVC(c.ancho, c.largo, ancho, largo); // láminas paralelas a X
  const enY = planPVC(c.largo, c.ancho, ancho, largo);
  let dir = cfg.direccion;
  if (dir !== 'x' && dir !== 'y') dir = enX.laminas < enY.laminas || (enX.laminas === enY.laminas && enX.desperdicio <= enY.desperdicio) ? 'x' : 'y';
  const plan = dir === 'x' ? enX : enY;
  const recorrido = dir === 'x' ? c.ancho : c.largo;
  const trav = dir === 'x' ? c.largo : c.ancho;
  const factor = esRectangulo(amb.puntos) ? 1 : A / (c.ancho * c.largo);

  const lista = nuevaLista();
  const codigo = CODIGO[Math.round(ancho * 100)] || 'pvc-20';
  lista.piezas(codigo, Math.ceil(plan.laminas * factor), `${plan.tiras} tiras de ${recorrido.toFixed(2)} m`);
  const lados = amb.puntos.map((p, i) => dist(p, amb.puntos[(i + 1) % amb.puntos.length]));
  const molduras = cortar(lados, largo);
  lista.piezas('pvc-mold', molduras.length, 'perímetro');
  // Soportes (omega) perpendiculares a las láminas, cada `pvcSepSoporte`.
  const lineas = Math.floor(recorrido / R.pvcSepSoporte) + 1;
  lista.sumar('omega', lineas * trav * factor * (1 + R.desperdicioPerfil / 100), `${lineas} líneas de soporte`);
  lista.sumar('tor-pp', A * R.pvcTorn);
  lista.sumar('clavo-disp', P / R.cieloClavoCada + lineas * 2);
  lista.sumar('mo-pvc', A);

  const detalle = [
    `Láminas de ${(ancho * 100).toFixed(0)} cm × ${largo.toFixed(2)} m corriendo a lo largo de ${dir.toUpperCase()} ${cfg.direccion === 'auto' ? '(la que usa menos láminas)' : '(elegida)'}`,
    `${plan.tiras} tiras de ${recorrido.toFixed(2)} m; la última se corta a ${(plan.ultima * 100).toFixed(1)} cm de ancho`,
    `Desperdicio a lo largo: ${plan.desperdicio.toFixed(2)} m de lámina`,
    'Cortes por lámina:', ...resumenCortes(plan.barras).map(t => '  ' + t),
    'Molduras:', ...resumenCortes(molduras).map(t => '  ' + t),
  ];
  if (factor !== 1) detalle.push('Ambiente no rectangular: láminas proporcionales al área (revisar a mano).');
  return { lista: lista.items, resumen: [['Área de cielo', A, 'm²'], ['Perímetro', P, 'm'], ['Láminas', plan.laminas, 'und']],
    detalle, area: A, direccion: dir, ancho };
}
