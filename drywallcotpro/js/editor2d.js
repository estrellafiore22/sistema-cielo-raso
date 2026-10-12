// Interacción con el plano: dedo, lápiz o mouse (Pointer Events).
// Un dedo usa la herramienta; dos dedos acercan y desplazan.

import * as E from './estado.js';
import { camara, aPantalla, aMundo, dibujar, encuadrar } from './vista2d.js';
import { dist, proyectar, redondearA, ortogonal, dentro } from './geom.js';
import { MUEBLES, crearMueble } from './muebles.js';

const lienzo = document.getElementById('lienzo2d');
const ctx = lienzo.getContext('2d');
const ayuda = document.getElementById('ayuda2d');

export const opciones = { herramienta: 'seleccionar', cuadricula: 0.1, orto: true, conMuros: true, mueble: 'cama' };
const punteros = new Map();
let gesto = null;     // { tipo: 'pinza'|'paneo'|'dibujo'|'mover'|'extremo'|'abertura', ... }
let previa = null;
let poligono = [];
let pendiente = false;
let ocultarAyuda = null;

const AYUDAS = {
  seleccionar: 'Toca un elemento para editarlo. Arrastra para moverlo. Arrastra el fondo para desplazarte.',
  muro: 'Arrastra de una esquina a otra para dibujar un muro. Luego puedes escribir su largo exacto.',
  tabique: 'Arrastra para dibujar un tabique de drywall (división interior).',
  ambiente: 'Arrastra en diagonal para crear un ambiente rectangular.',
  poligono: 'Toca cada esquina. Toca la primera esquina para cerrar.',
  puerta: 'Toca un muro para poner una puerta.',
  ventana: 'Toca un muro para poner una ventana.',
  mueble: 'Toca donde quieras poner el mueble.',
  borrar: 'Toca el elemento que quieres borrar.',
};

export function fijarHerramienta(h) {
  opciones.herramienta = h; poligono = []; previa = null;
  ayuda.textContent = AYUDAS[h] || '';
  ayuda.style.opacity = 1;
  clearTimeout(ocultarAyuda);
  ocultarAyuda = setTimeout(() => { ayuda.style.opacity = 0; }, 6000);
  redibujar();
}

export function redibujar() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    const r = lienzo.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (lienzo.width !== Math.round(r.width * dpr) || lienzo.height !== Math.round(r.height * dpr)) {
      lienzo.width = Math.round(r.width * dpr); lienzo.height = Math.round(r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar(ctx, r.width, r.height, E.obtener(), { seleccion: E.seleccion, previa });
  });
}

export function encuadrarTodo() {
  const r = lienzo.getBoundingClientRect();
  encuadrar(E.obtener(), r.width, r.height); redibujar();
}

// Imagen del plano completo para exportar (PNG / PDF).
export function imagenPlano(ancho = 1800, alto = 1300) {
  const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
  const guardada = { ...camara };
  encuadrar(E.obtener(), ancho, alto);
  dibujar(c.getContext('2d'), ancho, alto, E.obtener(), { seleccion: null, previa: null, exportando: true });
  Object.assign(camara, guardada);
  return c.toDataURL('image/png');
}

function posicion(ev) { const r = lienzo.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }

// Imán: primero a extremos de muros cercanos, si no a la cuadrícula.
function iman(p, ignorar) {
  const radio = 14 / camara.esc;
  let mejor = null, dmin = radio;
  for (const m of E.obtener().muros) {
    if (m.id === ignorar) continue;
    for (const q of [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]) { const d = dist(p, q); if (d < dmin) { dmin = d; mejor = q; } }
  }
  if (mejor) return { ...mejor };
  return { x: redondearA(p.x, opciones.cuadricula), y: redondearA(p.y, opciones.cuadricula) };
}

function finDeMuro(a, b) { return opciones.orto ? iman(ortogonal(a, b)) : b; }

// Qué hay bajo el dedo, con prioridad a lo más chico.
export function tocar(p) {
  const pr = E.obtener();
  const tol = 10 / camara.esc;
  for (const ab of pr.aberturas) {
    const m = pr.muros.find(x => x.id === ab.muroId); if (!m) continue;
    const q = proyectar(m, p), L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    if (q.d < m.espesor / 2 + tol && Math.abs(q.t - ab.t) * L < ab.ancho / 2) return { tipo: 'abertura', id: ab.id };
  }
  for (const mu of [...pr.muebles].reverse()) {
    const r = -(mu.rot || 0) * Math.PI / 180, dx = p.x - mu.x, dy = p.y - mu.y;
    const lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
    if (Math.abs(lx) <= mu.ancho / 2 && Math.abs(ly) <= mu.fondo / 2) return { tipo: 'mueble', id: mu.id };
  }
  for (const m of pr.muros) if (proyectar(m, p).d < m.espesor / 2 + tol) return { tipo: 'muro', id: m.id };
  for (const a of [...pr.ambientes].reverse()) if (dentro(p, a.puntos)) return { tipo: 'ambiente', id: a.id };
  return null;
}

function nuevoMuro(a, b, tipo) {
  const ex = E.obtener().muros.find(m => (dist(a, { x: m.x1, y: m.y1 }) < 0.01 && dist(b, { x: m.x2, y: m.y2 }) < 0.01) ||
    (dist(b, { x: m.x1, y: m.y1 }) < 0.01 && dist(a, { x: m.x2, y: m.y2 }) < 0.01));
  if (ex) return null;
  return { id: E.nuevoId(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, tipo,
    sistema: tipo === 'tabique' ? 'drywall' : (E.obtener().sistemaMuros || 'prefabricado'),
    espesor: tipo === 'tabique' ? 0.10 : 0.12, altura: 2.40 };
}

function crearAmbiente(puntos) {
  const n = E.obtener().ambientes.length + 1;
  const amb = { id: E.nuevoId(), nombre: 'Ambiente ' + n, puntos, cielo: E.cieloPorDefecto('drywall') };
  E.cambiar(p => {
    p.ambientes.push(amb);
    if (opciones.conMuros) puntos.forEach((q, i) => { const m = nuevoMuro(q, puntos[(i + 1) % puntos.length], 'muro'); if (m) p.muros.push(m); });
  });
  E.seleccionar({ tipo: 'ambiente', id: amb.id });
}

function alBajar(ev) {
  lienzo.setPointerCapture(ev.pointerId);
  punteros.set(ev.pointerId, posicion(ev));
  if (punteros.size === 2) { // pasa a pinza: cancela lo que estaba haciendo el primer dedo
    if (gesto && gesto.tipo !== 'paneo' && gesto.foto) E.terminarArrastre();
    const [a, b] = [...punteros.values()];
    gesto = { tipo: 'pinza', d: Math.hypot(b.x - a.x, b.y - a.y), c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    previa = null; redibujar(); return;
  }
  if (punteros.size > 2) return;
  const s = posicion(ev), p = aMundo(s.x, s.y);
  const h = opciones.herramienta;
  gesto = { tipo: 'toque', inicio: s, p, mundo: p };
  if (ev.button === 1 || ev.button === 2) { gesto.tipo = 'paneo'; return; }

  if (h === 'seleccionar') {
    const sel = E.seleccion, obj = E.seleccionado();
    if (sel?.tipo === 'muro' && obj) {
      for (const [k, q] of [[1, { x: obj.x1, y: obj.y1 }], [2, { x: obj.x2, y: obj.y2 }]]) {
        if (dist(aPantalla(q), s) < 16) { E.fotoParaDeshacer(); gesto = { tipo: 'extremo', muro: obj, k, orig: q, foto: true }; return; }
      }
    }
    const t = tocar(p);
    if (t) {
      E.seleccionar(t);
      E.fotoParaDeshacer();
      gesto = { tipo: t.tipo === 'abertura' ? 'abertura' : 'mover', obj: E.buscar(t.tipo, t.id), sel: t, ultimo: iman(p), foto: true, movio: false };
    } else { E.seleccionar(null); gesto = { tipo: 'paneo' }; }
  } else if (h === 'muro' || h === 'tabique' || h === 'ambiente') {
    gesto = { tipo: 'dibujo', a: iman(p) };
    previa = { tipo: h === 'ambiente' ? 'rect' : 'linea', a: gesto.a, b: gesto.a, cursor: gesto.a };
    redibujar();
  }
}

function alMover(ev) {
  if (!punteros.has(ev.pointerId)) {
    if (opciones.herramienta === 'poligono' && poligono.length && ev.pointerType === 'mouse') {
      const s = posicion(ev); previa = { tipo: 'poligono', puntos: poligono, cursor: iman(aMundo(s.x, s.y)) }; redibujar();
    }
    return;
  }
  const anterior = punteros.get(ev.pointerId);
  const s = posicion(ev);
  punteros.set(ev.pointerId, s);
  if (!gesto) return;
  if (gesto.tipo === 'pinza' && punteros.size === 2) {
    const [a, b] = [...punteros.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    zoomEn(c.x, c.y, d / gesto.d);
    camara.ox += c.x - gesto.c.x; camara.oy += c.y - gesto.c.y;
    gesto.d = d; gesto.c = c; redibujar(); return;
  }
  const p = aMundo(s.x, s.y);
  if (gesto.tipo === 'toque' || gesto.tipo === 'paneo') {
    if (gesto.tipo === 'toque' && dist(s, gesto.inicio) < 8) return;
    if (gesto.tipo === 'toque' && opciones.herramienta === 'poligono') return;
    gesto.tipo = 'paneo';
    camara.ox += s.x - anterior.x; camara.oy += s.y - anterior.y; redibujar();
  } else if (gesto.tipo === 'dibujo') {
    const b = previa.tipo === 'rect' ? iman(p) : finDeMuro(gesto.a, iman(p));
    previa = { ...previa, b, cursor: b }; redibujar();
  } else if (gesto.tipo === 'extremo') {
    const q = iman(p, gesto.muro.id), o = gesto.orig;
    E.modificarSinFoto(pr => {
      for (const m of pr.muros) {
        if (dist({ x: m.x1, y: m.y1 }, o) < 0.005) { m.x1 = q.x; m.y1 = q.y; }
        if (dist({ x: m.x2, y: m.y2 }, o) < 0.005) { m.x2 = q.x; m.y2 = q.y; }
      }
    });
    gesto.orig = q;
  } else if (gesto.tipo === 'mover') {
    const q = iman(p), dx = q.x - gesto.ultimo.x, dy = q.y - gesto.ultimo.y;
    if (!dx && !dy) return;
    gesto.ultimo = q; gesto.movio = true;
    E.modificarSinFoto(() => mover(gesto.sel.tipo, gesto.obj, dx, dy));
  } else if (gesto.tipo === 'abertura') {
    const m = E.obtener().muros.find(x => x.id === gesto.obj.muroId);
    if (m) { const L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1); const t = proyectar(m, p).t, mg = gesto.obj.ancho / 2 / L;
      E.modificarSinFoto(() => { gesto.obj.t = Math.min(1 - mg, Math.max(mg, t)); }); }
  }
}

function mover(tipo, obj, dx, dy) {
  if (tipo === 'mueble') { obj.x += dx; obj.y += dy; }
  else if (tipo === 'ambiente') obj.puntos.forEach(q => { q.x += dx; q.y += dy; });
  else if (tipo === 'muro') {
    const ext = [{ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 }];
    for (const m of E.obtener().muros) {
      if (m === obj) continue;
      for (const o of ext) {
        if (dist({ x: m.x1, y: m.y1 }, o) < 0.005) { m.x1 += dx; m.y1 += dy; }
        if (dist({ x: m.x2, y: m.y2 }, o) < 0.005) { m.x2 += dx; m.y2 += dy; }
      }
    }
    obj.x1 += dx; obj.y1 += dy; obj.x2 += dx; obj.y2 += dy;
  }
}

function alSoltar(ev) {
  if (!punteros.has(ev.pointerId)) return;
  punteros.delete(ev.pointerId);
  if (!gesto) return;
  if (gesto.tipo === 'pinza') { if (punteros.size === 0) gesto = null; return; }
  const h = opciones.herramienta;
  if (gesto.tipo === 'dibujo') {
    const { a, b } = previa; previa = null;
    if (h === 'ambiente') {
      if (Math.abs(b.x - a.x) > 0.1 && Math.abs(b.y - a.y) > 0.1) {
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
        crearAmbiente([{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]);
      }
    } else if (dist(a, b) > 0.05) {
      const m = nuevoMuro(a, b, h);
      if (m) { E.cambiar(p => p.muros.push(m)); E.seleccionar({ tipo: 'muro', id: m.id }); }
    }
    redibujar();
  } else if (gesto.tipo === 'toque') toque(gesto.mundo);
  else if (gesto.foto) E.terminarArrastre();
  gesto = null;
}

function toque(p) {
  const h = opciones.herramienta, pr = E.obtener();
  if (h === 'poligono') {
    const q = iman(p);
    if (poligono.length >= 3 && dist(aPantalla(q), aPantalla(poligono[0])) < 18) {
      const pts = poligono; poligono = []; previa = null; crearAmbiente(pts); return;
    }
    poligono.push(q); previa = { tipo: 'poligono', puntos: poligono, cursor: q }; redibujar(); return;
  }
  if (h === 'puerta' || h === 'ventana') {
    const t = tocar(p); const m = t?.tipo === 'muro' ? pr.muros.find(x => x.id === t.id) : null;
    if (!m) return;
    const ab = { id: E.nuevoId(), muroId: m.id, t: proyectar(m, p).t, tipo: h,
      ancho: h === 'puerta' ? 0.90 : 1.20, alto: h === 'puerta' ? 2.10 : 1.00, alfeizar: h === 'puerta' ? 0 : 1.00 };
    const L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    if (ab.ancho > L) ab.ancho = Math.max(0.3, L - 0.1);
    ab.t = Math.min(1 - ab.ancho / 2 / L, Math.max(ab.ancho / 2 / L, ab.t));
    E.cambiar(x => x.aberturas.push(ab)); E.seleccionar({ tipo: 'abertura', id: ab.id });
  } else if (h === 'mueble') {
    const mu = crearMueble(opciones.mueble, iman(p));
    E.cambiar(x => x.muebles.push(mu)); E.seleccionar({ tipo: 'mueble', id: mu.id });
  } else if (h === 'borrar') {
    const t = tocar(p); if (t) borrar(t);
  }
}

export function borrar(t) {
  E.cambiar(p => {
    if (t.tipo === 'muro') { p.muros = p.muros.filter(m => m.id !== t.id); p.aberturas = p.aberturas.filter(a => a.muroId !== t.id); }
    if (t.tipo === 'abertura') p.aberturas = p.aberturas.filter(a => a.id !== t.id);
    if (t.tipo === 'mueble') p.muebles = p.muebles.filter(a => a.id !== t.id);
    if (t.tipo === 'ambiente') p.ambientes = p.ambientes.filter(a => a.id !== t.id);
  });
  E.seleccionar(null);
}

export function cerrarPoligono() {
  if (poligono.length >= 3) { const pts = poligono; poligono = []; previa = null; crearAmbiente(pts); }
}

function zoomEn(x, y, f) {
  const nuevo = Math.max(5, Math.min(600, camara.esc * f)); f = nuevo / camara.esc;
  camara.ox = x - (x - camara.ox) * f; camara.oy = y - (y - camara.oy) * f; camara.esc = nuevo;
}

export function iniciarEditor() {
  lienzo.addEventListener('pointerdown', alBajar);
  lienzo.addEventListener('pointermove', alMover);
  lienzo.addEventListener('pointerup', alSoltar);
  lienzo.addEventListener('pointercancel', alSoltar);
  lienzo.addEventListener('contextmenu', e => e.preventDefault());
  lienzo.addEventListener('wheel', e => { e.preventDefault(); const s = posicion(e); zoomEn(s.x, s.y, Math.exp(-e.deltaY * 0.0015)); redibujar(); }, { passive: false });
  // Safari en iPhone: evita el zoom de página con gestos sobre el plano.
  ['gesturestart', 'gesturechange'].forEach(t => lienzo.addEventListener(t, e => e.preventDefault()));
  new ResizeObserver(redibujar).observe(lienzo);
  fijarHerramienta('seleccionar');
}

export { MUEBLES };
