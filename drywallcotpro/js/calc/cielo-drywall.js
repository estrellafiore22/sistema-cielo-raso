// Cielo raso de drywall, plano o por niveles (falso techo escalonado).
//
// Los niveles se cuentan desde la pared hacia el centro: cada uno es una
// franja de `ancho` metros a su `altura`. Lo que queda al medio va a la
// altura principal del cielo. Entre dos alturas distintas hay un "frente"
// vertical que también se forra con plancha.

import { areaPoligono, perimetro, cajaDe, esRectangulo } from '../geom.js';
import { rend } from '../precios.js';
import { nuevaLista } from './partidas.js';

// Geometría de los niveles sobre el rectángulo del ambiente.
export function nivelesGeometria(amb) {
  const c = cajaDe(amb.puntos);
  const cielo = amb.cielo;
  const franjas = [];
  let o = 0;
  for (const n of cielo.niveles) {
    const a = Math.max(0, +n.ancho || 0);
    const ext = inset(c, o), int = inset(c, o + a);
    if (!ext) break;
    franjas.push({ exterior: ext, interior: int, altura: +n.altura || cielo.altura });
    o += a;
    if (!int) break;
  }
  const centro = inset(c, o);
  if (centro) franjas.push({ exterior: centro, interior: null, altura: cielo.altura, centro: true });
  // Frentes: el borde interior de cada franja contra la siguiente.
  const frentes = [];
  for (let i = 0; i < franjas.length - 1; i++) {
    const h1 = franjas[i].altura, h2 = franjas[i + 1].altura;
    if (Math.abs(h1 - h2) > 0.001 && franjas[i].interior) frentes.push({ rect: franjas[i].interior, desde: Math.min(h1, h2), hasta: Math.max(h1, h2) });
  }
  return { franjas, frentes, rectangular: esRectangulo(amb.puntos) };
}

function inset(c, o) {
  const r = { x0: c.x0 + o, y0: c.y0 + o, x1: c.x1 - o, y1: c.y1 - o };
  return r.x1 - r.x0 > 0.01 && r.y1 - r.y0 > 0.01 ? r : null;
}

const perimRect = r => 2 * ((r.x1 - r.x0) + (r.y1 - r.y0));
const areaRect = r => (r.x1 - r.x0) * (r.y1 - r.y0);

export function calcularCieloDrywall(amb) {
  const R = rend();
  const lista = nuevaLista();
  const A = areaPoligono(amb.puntos);
  const P = perimetro(amb.puntos);
  const geo = nivelesGeometria(amb);
  let F = 0, Lf = 0;
  for (const f of geo.frentes) { const l = perimRect(f.rect); Lf += l; F += l * (f.hasta - f.desde); }

  const placa = amb.cielo.placa === 'rh' ? 'pl-dw-rh' : 'pl-dw';
  const dp = 1 + R.desperdicioPlancha / 100, dpf = 1 + R.desperdicioPerfil / 100;
  lista.sumar(placa, (A + F) * dp, 'cielo y frentes');
  lista.sumar('omega', (A / R.cieloSepOmega) * dpf, `cada ${R.cieloSepOmega} m`);
  lista.sumar('par-38', (A / R.cieloSepVigueta) * dpf, `viguetas cada ${R.cieloSepVigueta} m`);
  lista.sumar('angulo', (P + 2 * Lf) * dpf, 'perímetro y frentes');
  lista.sumar('esquinero', Lf * dpf, 'cantos de los niveles');
  lista.sumar('alambre', A * R.cieloAlambre);
  lista.sumar('clavo-disp', P / R.cieloClavoCada + A / (R.cieloSepVigueta * R.cieloSepVigueta));
  lista.sumar('tor-dw', (A + F) * R.cieloTornDw);
  lista.sumar('tor-pp', A * R.cieloTornPp + Lf * 4);
  lista.sumar('cinta', (A + F) * R.cieloCinta + Lf);
  lista.sumar('masilla', (A + F) * R.cieloMasilla);
  lista.sumar('mo-cielo', A);
  lista.sumar('mo-frente', F);

  const resumen = [
    ['Área de cielo', A, 'm²'], ['Perímetro', P, 'm'],
    ['Frentes verticales', F, 'm²'], ['Largo de frentes', Lf, 'm'],
  ];
  const detalle = geo.franjas.map((f, i) => {
    const area = areaRect(f.exterior) - (f.interior ? areaRect(f.interior) : 0);
    const nombre = f.centro ? (geo.franjas.length > 1 ? 'Centro' : 'Cielo') : `Nivel ${i + 1}`;
    return `${nombre}: ${area.toFixed(2)} m² a ${f.altura.toFixed(2)} m de altura`;
  });
  if (amb.cielo.niveles.length && !geo.rectangular) detalle.push('Ojo: el ambiente no es rectangular; los niveles se calculan sobre su rectángulo exterior.');
  return { lista: lista.items, resumen, detalle, area: A };
}
