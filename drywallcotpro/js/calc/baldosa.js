// Cielo raso de baldosas modulares (grilla de T). Se centra la retícula para
// que los recortes de los dos bordes queden iguales, y se prueban las dos
// orientaciones de la T principal: gana la más barata.

import { areaPoligono, perimetro, cajaDe, esRectangulo, dist } from '../geom.js';
import { material, rend } from '../precios.js';
import { cortar } from './cortes.js';
import { nuevaLista } from './partidas.js';

const MODULOS = {
  '61x61': { codigo: 'bald-61', p: 0.61, tx: 0.61, ty: 0.61, cuadrada: true },
  '60x60': { codigo: 'bald-60', p: 0.60, tx: 0.60, ty: 0.60, cuadrada: true },
  '61x122': { codigo: 'bald-122', p: 0.61, tx: 1.22, ty: 0.61, cuadrada: false },
};
const EPS = 0.002;

// Reparte `dim` en módulos de `paso` con los recortes iguales a ambos lados.
// Un recorte menor a un cuarto de módulo se ve mal: se agranda tomando un módulo.
export function reparto(dim, paso) {
  let k = Math.floor(dim / paso + 1e-6);
  const r = dim - k * paso;
  let seg;
  if (r < 0.005) seg = Array(k).fill(paso);
  else {
    let b = r / 2;
    if (b < paso / 4 && k >= 1) { k -= 1; b = (r + paso) / 2; }
    seg = [b, ...Array(k).fill(paso), b];
  }
  const lineas = []; let x = 0;
  for (let i = 0; i < seg.length - 1; i++) { x += seg[i]; lineas.push(x); }
  return { seg, lineas };
}

function calcularUna(W, L, mod) {
  const X = reparto(W, mod.tx), Y = reparto(L, mod.ty);
  // T principales: en una grilla cuadrada, una línea sí y otra no (cada 2 módulos).
  let principales, intermedias = [];
  if (mod.cuadrada) {
    principales = X.lineas.filter((_, i) => i % 2 === 0);
    intermedias = X.lineas.filter((_, i) => i % 2 === 1);
  } else principales = X.lineas;
  const apoyos = [0, ...principales, W];
  const huecos = [];
  for (let i = 0; i < apoyos.length - 1; i++) huecos.push(apoyos[i + 1] - apoyos[i]);

  let t122 = 0, t61 = 0;
  for (let j = 0; j < Y.lineas.length; j++) for (const g of huecos) { if (g <= 0.61 + EPS) t61++; else t122++; }
  t61 += intermedias.length * (Y.lineas.length + 1);
  const barrasMain = cortar(principales.map(() => L), 3.66);

  // Baldosas: cada celda pide una pieza; de una baldosa salen varias piezas chicas.
  const celdas = new Map();
  for (const w of X.seg) for (const h of Y.seg) {
    const k = w.toFixed(3) + 'x' + h.toFixed(3);
    celdas.set(k, { w, h, n: (celdas.get(k)?.n || 0) + 1 });
  }
  let baldosas = 0, enteras = 0, cortadas = 0;
  for (const c of celdas.values()) {
    const porBaldosa = Math.max(1, Math.floor((mod.tx + EPS) / c.w)) * Math.max(1, Math.floor((mod.ty + EPS) / c.h));
    baldosas += Math.ceil(c.n / porBaldosa);
    if (Math.abs(c.w - mod.tx) < EPS && Math.abs(c.h - mod.ty) < EPS) enteras += c.n; else cortadas += c.n;
  }
  const colgadores = principales.length * (Math.floor(L / 1.22) + 1);
  return { X, Y, principales, intermedias, t122, t61, mains: barrasMain.length, baldosas, enteras, cortadas, colgadores };
}

const precio = c => material(c)?.precio || 0;

export function calcularBaldosa(amb) {
  const R = rend();
  const mod = MODULOS[amb.cielo.baldosa.modulo] || MODULOS['61x61'];
  const c = cajaDe(amb.puntos);
  const A = areaPoligono(amb.puntos), P = perimetro(amb.puntos);
  const factor = esRectangulo(amb.puntos) ? 1 : A / (c.ancho * c.largo);

  const costo = r => r.mains * precio('t-main') + r.t122 * precio('t-122') + r.t61 * precio('t-61') + r.baldosas * precio(mod.codigo);
  const a = calcularUna(c.ancho, c.largo, mod);   // principales corren a lo largo de Y
  const b = calcularUna(c.largo, c.ancho, mod);   // principales corren a lo largo de X
  const usarA = costo(a) <= costo(b);
  const r = usarA ? a : b;

  const lista = nuevaLista();
  const n = v => Math.ceil(v * factor);
  lista.piezas(mod.codigo, n(r.baldosas), `${r.enteras} enteras, ${r.cortadas} cortadas`);
  lista.piezas('t-main', n(r.mains), `${r.principales.length} líneas`);
  lista.piezas('t-122', n(r.t122));
  lista.piezas('t-61', n(r.t61));
  const lados = amb.puntos.map((p, i) => dist(p, amb.puntos[(i + 1) % amb.puntos.length]));
  lista.piezas('ang-bald', cortar(lados, 3.05).length, 'empalme a tope');
  lista.sumar('alambre', n(r.colgadores) * 0.03, `${n(r.colgadores)} colgadores`);
  lista.sumar('clavo-disp', n(r.colgadores) + P / R.cieloClavoCada);
  lista.sumar('mo-baldosa', A);

  // Retícula en coordenadas del plano, para dibujarla en 2D y 3D.
  const lx = usarA ? r.X.lineas : r.Y.lineas, ly = usarA ? r.Y.lineas : r.X.lineas;
  const sx = usarA ? r.principales : [], sy = usarA ? [] : r.principales;
  const rejilla = {
    caja: c,
    verticales: lx.map(x => ({ x: c.x0 + x, principal: sx.some(v => Math.abs(v - x) < EPS) })),
    horizontales: ly.map(y => ({ y: c.y0 + y, principal: sy.some(v => Math.abs(v - y) < EPS) })),
  };
  const detalle = [
    `Baldosa ${amb.cielo.baldosa.modulo} cm · T principal a lo largo de ${usarA ? 'Y (largo)' : 'X (ancho)'} (la más barata de las dos)`,
    `Recortes de borde: ${(usarA ? r.X.seg[0] : r.Y.seg[0]).toFixed(3)} m y ${(usarA ? r.Y.seg[0] : r.X.seg[0]).toFixed(3)} m`,
  ];
  if (factor !== 1) detalle.push('Ambiente no rectangular: cantidades proporcionales al área.');
  return { lista: lista.items, resumen: [['Área de cielo', A, 'm²'], ['Perímetro', P, 'm']], detalle, area: A, rejilla };
}
