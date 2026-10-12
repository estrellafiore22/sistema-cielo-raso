// Muros y tabiques: área neta (sin vanos) y materiales según el sistema.
//   drywall      → tabique: estructura 64 mm, plancha drywall en las dos caras
//   prefabricado → muro de casa: estructura 89 mm, fibrocemento afuera, drywall adentro
//   existente    → no se metra (albañilería u otro)

import { largoMuro } from '../geom.js';
import { rend } from '../precios.js';
import { nuevaLista } from './partidas.js';

export function areaNetaMuro(m, aberturas) {
  const vanos = aberturas.filter(a => a.muroId === m.id)
    .reduce((s, a) => s + a.ancho * Math.min(a.alto, m.altura - (a.alfeizar || 0)), 0);
  return Math.max(0, largoMuro(m) * m.altura - vanos);
}

export function calcularMuros(proyecto) {
  const R = rend();
  const lista = nuevaLista();
  const filas = [];
  let areaTabique = 0, areaPrefab = 0;
  const dp = 1 + R.desperdicioPlancha / 100, dpf = 1 + R.desperdicioPerfil / 100;

  for (const m of proyecto.muros) {
    if (m.sistema === 'existente') continue;
    const L = largoMuro(m), h = m.altura;
    const vanos = proyecto.aberturas.filter(a => a.muroId === m.id);
    const A = areaNetaMuro(m, proyecto.aberturas);
    const parantes = Math.ceil(L / R.muroSepParante) + 1 + vanos.length * 2;
    const rieles = 2 * L + vanos.reduce((s, a) => s + a.ancho * (a.alfeizar > 0 ? 2 : 1), 0);
    const prefab = m.sistema === 'prefabricado';
    const est = prefab ? '89' : '64';
    lista.sumar('par-' + est, parantes * h * dpf);
    lista.sumar('riel-' + est, rieles * dpf);
    lista.sumar('clavo-disp', (2 * L) / 0.6);
    lista.sumar('tor-pp', A * R.muroTornPp);
    const interior = m.humedo ? 'pl-dw-rh' : 'pl-dw';
    if (prefab) {
      lista.sumar('pl-fc', A * dp, 'cara exterior');
      lista.sumar(interior, A * dp, 'cara interior');
      lista.sumar('tor-fc', A * R.muroTornDwCara);
      lista.sumar('tor-dw', A * R.muroTornDwCara);
      lista.sumar('cinta', A * R.muroCintaCara);
      lista.sumar('masilla', A * R.muroMasillaCara * 2);
      lista.sumar('mo-prefab', A);
      areaPrefab += A;
    } else {
      lista.sumar(interior, 2 * A * dp, 'dos caras');
      lista.sumar('tor-dw', 2 * A * R.muroTornDwCara);
      lista.sumar('cinta', 2 * A * R.muroCintaCara);
      lista.sumar('masilla', 2 * A * R.muroMasillaCara);
      lista.sumar('mo-tabique', A);
      areaTabique += A;
    }
    filas.push({ id: m.id, sistema: m.sistema, largo: L, altura: h, area: A, vanos: vanos.length });
  }
  return { lista: lista.items, filas, areaTabique, areaPrefab };
}
