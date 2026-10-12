// Dibujo del plano en un <canvas>. Solo pinta: no maneja el dedo ni el mouse
// (eso está en editor2d.js). Coordenadas del plano en metros, Y hacia abajo.

import { largoMuro, anguloMuro, puntoEn, areaPoligono, centroide, cajaDe } from './geom.js';
import { largo, area } from './unidades.js';
import { calcularBaldosa } from './calc/baldosa.js';
import { calcularPVC } from './calc/pvc.js';
import { nivelesGeometria } from './calc/cielo-drywall.js';
import { NOMBRE_CIELO } from './metrado.js';

export const camara = { esc: 50, ox: 60, oy: 60 };
export const aPantalla = p => ({ x: p.x * camara.esc + camara.ox, y: p.y * camara.esc + camara.oy });
export const aMundo = (x, y) => ({ x: (x - camara.ox) / camara.esc, y: (y - camara.oy) / camara.esc });

const COLOR_CIELO = { ninguno: '#f1f3f5', drywall: '#e3edff', baldosa: '#e4f5e6', pvc: '#fff6d9' };
const cache = new Map();
function enCache(clave, fn) {
  if (!cache.has(clave)) { if (cache.size > 100) cache.clear(); cache.set(clave, fn()); }
  return cache.get(clave);
}

export function encuadrar(proyecto, ancho, alto) {
  const pts = [...proyecto.muros.flatMap(m => [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]),
    ...proyecto.ambientes.flatMap(a => a.puntos)];
  if (!pts.length) { camara.esc = 50; camara.ox = 40; camara.oy = 40; return; }
  const c = cajaDe(pts);
  const margen = Math.min(70, 0.12 * Math.min(ancho, alto));
  camara.esc = Math.max(5, Math.min((ancho - 2 * margen) / Math.max(c.ancho, 1), (alto - 2 * margen) / Math.max(c.largo, 1), 400));
  camara.ox = (ancho - c.ancho * camara.esc) / 2 - c.x0 * camara.esc;
  camara.oy = (alto - c.largo * camara.esc) / 2 - c.y0 * camara.esc;
}

export function dibujar(ctx, ancho, alto, proyecto, estado) {
  ctx.save();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ancho, alto);
  if (!estado.exportando) cuadricula(ctx, ancho, alto);
  proyecto.ambientes.forEach(a => ambiente(ctx, a, estado));
  proyecto.muebles.forEach(m => mueble(ctx, m, estado));
  proyecto.muros.forEach(m => muro(ctx, m, proyecto, estado));
  proyecto.muros.forEach(m => cota(ctx, m, proyecto));
  proyecto.ambientes.forEach(a => etiquetaAmbiente(ctx, a));
  if (estado.previa) previa(ctx, estado.previa);
  ctx.restore();
}

function cuadricula(ctx, ancho, alto) {
  let paso = 0.1;
  while (paso * camara.esc < 8) paso *= paso === 0.1 ? 5 : 2;
  const a = aMundo(0, 0), b = aMundo(ancho, alto);
  ctx.lineWidth = 1;
  for (let x = Math.floor(a.x / paso) * paso; x <= b.x; x += paso) {
    const mayor = Math.abs(x - Math.round(x)) < 1e-6;
    ctx.strokeStyle = mayor ? '#d6dde5' : '#eef1f4';
    const sx = Math.round(x * camara.esc + camara.ox) + 0.5;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, alto); ctx.stroke();
  }
  for (let y = Math.floor(a.y / paso) * paso; y <= b.y; y += paso) {
    const mayor = Math.abs(y - Math.round(y)) < 1e-6;
    ctx.strokeStyle = mayor ? '#d6dde5' : '#eef1f4';
    const sy = Math.round(y * camara.esc + camara.oy) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(ancho, sy); ctx.stroke();
  }
}

function trazarPoligono(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => { const s = aPantalla(p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
  ctx.closePath();
}

function linea(ctx, a, b) { const p = aPantalla(a), q = aPantalla(b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }

function ambiente(ctx, a, estado) {
  if (a.puntos.length < 3) return;
  const sel = estado.seleccion?.tipo === 'ambiente' && estado.seleccion.id === a.id;
  trazarPoligono(ctx, a.puntos);
  ctx.fillStyle = COLOR_CIELO[a.cielo.tipo] || COLOR_CIELO.ninguno;
  ctx.fill();
  ctx.save(); trazarPoligono(ctx, a.puntos); ctx.clip();
  const clave = a.cielo.tipo + JSON.stringify(a.puntos) + JSON.stringify(a.cielo);
  if (a.cielo.tipo === 'baldosa') {
    const r = enCache('b' + clave, () => calcularBaldosa(a)).rejilla;
    const c = r.caja;
    r.verticales.forEach(v => { ctx.strokeStyle = v.principal ? '#6aa874' : '#a9d3af'; ctx.lineWidth = v.principal ? 1.5 : 1; linea(ctx, { x: v.x, y: c.y0 }, { x: v.x, y: c.y1 }); });
    r.horizontales.forEach(h => { ctx.strokeStyle = h.principal ? '#6aa874' : '#a9d3af'; ctx.lineWidth = h.principal ? 1.5 : 1; linea(ctx, { x: c.x0, y: h.y }, { x: c.x1, y: h.y }); });
  } else if (a.cielo.tipo === 'pvc') {
    const r = enCache('p' + clave, () => calcularPVC(a));
    const c = cajaDe(a.puntos);
    ctx.strokeStyle = '#e2c46d'; ctx.lineWidth = 1;
    if (r.ancho * camara.esc >= 3) {
      if (r.direccion === 'x') for (let y = c.y0 + r.ancho; y < c.y1; y += r.ancho) linea(ctx, { x: c.x0, y }, { x: c.x1, y });
      else for (let x = c.x0 + r.ancho; x < c.x1; x += r.ancho) linea(ctx, { x, y: c.y0 }, { x, y: c.y1 });
    }
  } else if (a.cielo.tipo === 'drywall' && a.cielo.niveles.length) {
    const g = nivelesGeometria(a);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#5b8def'; ctx.lineWidth = 1.2;
    g.franjas.forEach(f => { if (f.interior) { const p = aPantalla({ x: f.interior.x0, y: f.interior.y0 }); ctx.strokeRect(p.x, p.y, (f.interior.x1 - f.interior.x0) * camara.esc, (f.interior.y1 - f.interior.y0) * camara.esc); } });
    ctx.setLineDash([]);
  }
  ctx.restore();
  trazarPoligono(ctx, a.puntos);
  ctx.strokeStyle = sel ? '#1f6feb' : 'rgba(0,0,0,.15)'; ctx.lineWidth = sel ? 3 : 1; ctx.stroke();
  if (sel) a.puntos.forEach(p => manija(ctx, p));
}

function etiquetaAmbiente(ctx, a) {
  if (a.puntos.length < 3) return;
  const c = aPantalla(centroide(a.puntos));
  const k = cajaDe(a.puntos), lado = Math.min(k.ancho, k.largo) * camara.esc;
  if (lado < 30) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let lineas = [[a.nombre, 'bold 13px sans-serif', '#1d2733'], [area(areaPoligono(a.puntos)), '12px sans-serif', '#1d2733'],
    [NOMBRE_CIELO[a.cielo.tipo] + (a.cielo.tipo !== 'ninguno' ? ' · h ' + largo(a.cielo.altura) : ''), '11px sans-serif', '#5d6b7a']];
  if (lado < 75 || k.ancho * camara.esc < 110) lineas = [lineas[1]];
  lineas.forEach(([t, f, col], i) => {
    ctx.font = f; const w = ctx.measureText(t).width;
    const y = c.y + (i - (lineas.length - 1) / 2) * 16;
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(c.x - w / 2 - 3, y - 8, w + 6, 16);
    ctx.fillStyle = col; ctx.fillText(t, c.x, y);
  });
}

function rectRotado(ctx, cx, cy, ang, l, e) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.beginPath(); ctx.rect(-l / 2, -e / 2, l, e); ctx.restore();
}

function muro(ctx, m, proyecto, estado) {
  const L = largoMuro(m); if (L < 0.001) return;
  const ang = anguloMuro(m), e = Math.max(m.espesor * camara.esc, 2);
  const sel = estado.seleccion?.tipo === 'muro' && estado.seleccion.id === m.id;
  const a = aPantalla({ x: m.x1, y: m.y1 }), b = aPantalla({ x: m.x2, y: m.y2 });
  rectRotado(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, ang, L * camara.esc, e);
  ctx.fillStyle = m.sistema === 'existente' ? '#9aa4ae' : m.tipo === 'tabique' ? '#8fb1e9' : '#3b4754';
  ctx.fill();
  if (sel) { ctx.strokeStyle = '#1f6feb'; ctx.lineWidth = 3; ctx.stroke(); }
  for (const ab of proyecto.aberturas.filter(x => x.muroId === m.id)) abertura(ctx, m, ab, ang, e, estado);
  if (sel) { manija(ctx, { x: m.x1, y: m.y1 }); manija(ctx, { x: m.x2, y: m.y2 }); }
}

function abertura(ctx, m, ab, ang, e, estado) {
  const c = aPantalla(puntoEn(m, ab.t));
  const w = ab.ancho * camara.esc;
  const sel = estado.seleccion?.tipo === 'abertura' && estado.seleccion.id === ab.id;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
  ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -e / 2 - 1, w, e + 2);
  ctx.strokeStyle = sel ? '#1f6feb' : '#1d2733'; ctx.lineWidth = sel ? 2.5 : 1.2;
  if (ab.tipo === 'puerta') {
    const lado = ab.lado === -1 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(-w / 2, lado * e / 2); ctx.lineTo(-w / 2, lado * (e / 2 + w)); ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(-w / 2, lado * e / 2, w, lado > 0 ? 0 : -Math.PI / 2, lado > 0 ? Math.PI / 2 : 0); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeRect(-w / 2, -e / 2, w, e);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
  }
  ctx.restore();
}

function mueble(ctx, m, estado) {
  const c = aPantalla(m);
  const sel = estado.seleccion?.tipo === 'mueble' && estado.seleccion.id === m.id;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((m.rot || 0) * Math.PI / 180);
  const w = m.ancho * camara.esc, f = m.fondo * camara.esc;
  ctx.fillStyle = 'rgba(160,120,80,.18)'; ctx.strokeStyle = sel ? '#1f6feb' : '#8a6a4a'; ctx.lineWidth = sel ? 2.5 : 1.2;
  ctx.fillRect(-w / 2, -f / 2, w, f); ctx.strokeRect(-w / 2, -f / 2, w, f);
  ctx.fillStyle = '#6b5136'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (w > 30) ctx.fillText(m.nombre, 0, 0);
  ctx.restore();
}

function cota(ctx, m, proyecto) {
  const L = largoMuro(m);
  if (L * camara.esc < 30) return;
  // La cota va hacia afuera de la casa: del lado contrario al centro de los muros.
  const pts = proyecto.muros.flatMap(w => [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]);
  const cen = centroide(pts);
  const ang = anguloMuro(m), nx = -Math.sin(ang), ny = Math.cos(ang);
  const mid = puntoEn(m, 0.5);
  const lado = ((cen.x - mid.x) * nx + (cen.y - mid.y) * ny) > 0 ? -1 : 1;
  const d = m.espesor / 2 + 22 / camara.esc;
  const a = aPantalla({ x: m.x1 + nx * d * lado, y: m.y1 + ny * d * lado });
  const b = aPantalla({ x: m.x2 + nx * d * lado, y: m.y2 + ny * d * lado });
  ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  [a, b].forEach(p => { ctx.beginPath(); ctx.moveTo(p.x - 4 * Math.cos(ang + Math.PI / 4), p.y - 4 * Math.sin(ang + Math.PI / 4)); ctx.lineTo(p.x + 4 * Math.cos(ang + Math.PI / 4), p.y + 4 * Math.sin(ang + Math.PI / 4)); ctx.stroke(); });
  ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
  let r = ang; if (r > Math.PI / 2 || r < -Math.PI / 2) r += Math.PI;
  ctx.rotate(r); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const t = largo(L); const w = ctx.measureText(t).width;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-w / 2 - 2, -14, w + 4, 13);
  ctx.fillStyle = '#c0392b'; ctx.fillText(t, 0, -2);
  ctx.restore();
}

function manija(ctx, p) {
  const s = aPantalla(p);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1f6feb'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function previa(ctx, pv) {
  ctx.strokeStyle = '#1f6feb'; ctx.fillStyle = 'rgba(31,111,235,.12)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  if (pv.tipo === 'linea') {
    linea(ctx, pv.a, pv.b);
    const L = Math.hypot(pv.b.x - pv.a.x, pv.b.y - pv.a.y);
    etiqueta(ctx, aPantalla({ x: (pv.a.x + pv.b.x) / 2, y: (pv.a.y + pv.b.y) / 2 }), largo(L));
  } else if (pv.tipo === 'rect') {
    const pts = [pv.a, { x: pv.b.x, y: pv.a.y }, pv.b, { x: pv.a.x, y: pv.b.y }];
    trazarPoligono(ctx, pts); ctx.fill(); ctx.stroke();
    etiqueta(ctx, aPantalla({ x: (pv.a.x + pv.b.x) / 2, y: (pv.a.y + pv.b.y) / 2 }),
      `${largo(Math.abs(pv.b.x - pv.a.x))} × ${largo(Math.abs(pv.b.y - pv.a.y))}`);
  } else if (pv.tipo === 'poligono' && pv.puntos.length) {
    ctx.beginPath();
    [...pv.puntos, pv.cursor].filter(Boolean).forEach((p, i) => { const s = aPantalla(p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.stroke();
    pv.puntos.forEach(p => manija(ctx, p));
  }
  ctx.setLineDash([]);
  if (pv.cursor) { const s = aPantalla(pv.cursor); ctx.fillStyle = '#1f6feb'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill(); }
}

function etiqueta(ctx, s, t) {
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(t).width;
  ctx.fillStyle = '#1f6feb'; ctx.fillRect(s.x - w / 2 - 6, s.y - 24, w + 12, 20);
  ctx.fillStyle = '#fff'; ctx.fillText(t, s.x, s.y - 14);
}
