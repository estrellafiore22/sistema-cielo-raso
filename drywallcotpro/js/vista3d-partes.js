// Piezas 3D de cielos rasos y techo. Plano (x, y) → Three (x, altura, y).

import * as THREE from 'three';
import { nivelesGeometria } from './calc/cielo-drywall.js';
import { calcularBaldosa } from './calc/baldosa.js';
import { calcularPVC } from './calc/pvc.js';
import { geometriaTecho } from './calc/techo.js';
import { cajaDe } from './geom.js';

const MAT = {
  drywall: new THREE.MeshStandardMaterial({ color: 0xf7f7f2, side: THREE.DoubleSide, roughness: 0.9 }),
  frente: new THREE.MeshStandardMaterial({ color: 0xeceae2, side: THREE.DoubleSide, roughness: 0.9 }),
  baldosa: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, side: THREE.DoubleSide, roughness: 0.95 }),
  pvc: new THREE.MeshStandardMaterial({ color: 0xfaf6ea, side: THREE.DoubleSide, roughness: 0.5 }),
  madera: new THREE.MeshStandardMaterial({ color: 0xa47448, roughness: 0.8 }),
  hastial: new THREE.MeshStandardMaterial({ color: 0xe9e4da, side: THREE.DoubleSide, roughness: 0.95 }),
  acero: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.4 }),
};
const LINEA_T = new THREE.LineBasicMaterial({ color: 0x9a9a9a });
const LINEA_T_PRIN = new THREE.LineBasicMaterial({ color: 0x6f6f6f });
const LINEA_PVC = new THREE.LineBasicMaterial({ color: 0xd8cfb5 });

// Polígono plano horizontal a la altura h (con huecos opcionales).
export function losa(puntos, h, material, huecos = []) {
  const forma = new THREE.Shape(puntos.map(p => new THREE.Vector2(p.x, p.y)));
  huecos.forEach(hq => forma.holes.push(new THREE.Path(hq.map(p => new THREE.Vector2(p.x, p.y)))));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(forma), material);
  m.rotation.x = Math.PI / 2; m.position.y = h;
  return m;
}

const rectPts = r => [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }];

function lineas(segmentos, h, material) {
  const pos = [];
  segmentos.forEach(([a, b]) => pos.push(a.x, h, a.y, b.x, h, b.y));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, material);
}

// Pared vertical de un rectángulo entre dos alturas (frente de un nivel).
function frente(r, desde, hasta) {
  const g = new THREE.Group();
  const pts = rectPts(r);
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, hasta - desde), MAT.frente);
    m.position.set((a.x + b.x) / 2, (desde + hasta) / 2, (a.y + b.y) / 2);
    m.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
    g.add(m);
  }
  return g;
}

export function cieloDe(amb) {
  const g = new THREE.Group();
  const c = amb.cielo;
  if (c.tipo === 'drywall') {
    if (!c.niveles.length) g.add(losa(amb.puntos, c.altura, MAT.drywall));
    else {
      const geo = nivelesGeometria(amb);
      geo.franjas.forEach(f => g.add(losa(rectPts(f.exterior), f.altura, MAT.drywall, f.interior ? [rectPts(f.interior)] : [])));
      geo.frentes.forEach(f => g.add(frente(f.rect, f.desde, f.hasta)));
    }
  } else if (c.tipo === 'baldosa') {
    g.add(losa(amb.puntos, c.altura, MAT.baldosa));
    const r = calcularBaldosa(amb).rejilla, k = r.caja, h = c.altura - 0.004;
    g.add(lineas(r.verticales.filter(v => !v.principal).map(v => [{ x: v.x, y: k.y0 }, { x: v.x, y: k.y1 }])
      .concat(r.horizontales.filter(v => !v.principal).map(v => [{ x: k.x0, y: v.y }, { x: k.x1, y: v.y }])), h, LINEA_T));
    g.add(lineas(r.verticales.filter(v => v.principal).map(v => [{ x: v.x, y: k.y0 }, { x: v.x, y: k.y1 }])
      .concat(r.horizontales.filter(v => v.principal).map(v => [{ x: k.x0, y: v.y }, { x: k.x1, y: v.y }])), h, LINEA_T_PRIN));
  } else if (c.tipo === 'pvc') {
    g.add(losa(amb.puntos, c.altura, MAT.pvc));
    const r = calcularPVC(amb), k = cajaDe(amb.puntos), seg = [];
    if (r.direccion === 'x') for (let y = k.y0 + r.ancho; y < k.y1 - 0.001; y += r.ancho) seg.push([{ x: k.x0, y }, { x: k.x1, y }]);
    else for (let x = k.x0 + r.ancho; x < k.x1 - 0.001; x += r.ancho) seg.push([{ x, y: k.y0 }, { x, y: k.y1 }]);
    g.add(lineas(seg, c.altura - 0.004, LINEA_PVC));
  }
  return g;
}

// Barra de sección rectangular entre dos puntos 3D.
function barra(a, b, material, ancho = 0.05, alto = 0.10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const L = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, L), material);
  m.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  m.lookAt(vb);
  return m;
}

function texturaCalamina() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8;
  const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#8d969e'); gr.addColorStop(0.5, '#d9dee2'); gr.addColorStop(1, '#8d969e');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 8);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const TEX_CAL = texturaCalamina();

// Techo: { estructura: tijerales y correas, cubierta: calamina }.
export function techoDe(proyecto) {
  const estructura = new THREE.Group(), cubierta = new THREE.Group();
  const t = proyecto.techo;
  const g = t.activo ? geometriaTecho(proyecto) : null;
  if (!g) return { estructura, cubierta };
  const c = g.caja, H = g.alturaMuro, p = g.p;
  // (s = a lo ancho de la luz, r = a lo largo de la cumbrera, z = altura) → mundo
  const mundo = (s, r, z) => g.eje === 'x' ? [c.x0 + r, z, c.y0 + s] : [c.x0 + s, z, c.y0 + r];
  const mat = t.tijeral === 'acero' ? MAT.acero : MAT.madera;
  const S = g.S, h = g.h, al = g.alero;
  const piezas = g.dosAguas
    ? [[[0, H], [S, H]], [[-al, H - al * p], [S / 2, H + h]], [[S + al, H - al * p], [S / 2, H + h]],
       [[S / 2, H], [S / 2, H + h]], [[S / 2, H], [S / 4, H + h / 2]], [[S / 2, H], [3 * S / 4, H + h / 2]]]
    : [[[0, H], [S, H]], [[-al, H + h + al * p], [S + al, H - al * p]], [[0, H], [0, H + h]],
       [[S / 2, H], [S / 2, H + h / 2]], [[0, H], [S / 2, H + h / 2]]];
  for (const r of g.posiciones) for (const [a, b] of piezas) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) continue;
    estructura.add(barra(mundo(a[0], r, a[1]), mundo(b[0], r, b[1]), mat));
  }
  // Faldones: de alero a cumbrera (dos aguas) o de lado a lado (una agua).
  const faldones = g.dosAguas
    ? [[[-al, H - al * p], [S / 2, H + h]], [[S + al, H - al * p], [S / 2, H + h]]]
    : [[[S + al, H - al * p], [-al, H + h + al * p]]];
  const sepC = Math.max(0.3, +t.sepCorrea || 0.8), e = 0.06;
  for (const [a, b] of faldones) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(L / sepC);
    for (let i = 0; i <= n; i++) {
      const f = i / n, s = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f + e;
      estructura.add(barra(mundo(s, -al, z), mundo(s, g.Lr + al, z), mat, 0.05, 0.05));
    }
    const v = [mundo(a[0], -al, a[1] + 2 * e), mundo(a[0], g.Lr + al, a[1] + 2 * e), mundo(b[0], g.Lr + al, b[1] + 2 * e), mundo(b[0], -al, b[1] + 2 * e)];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]], 3));
    const ondas = g.W / 0.0762, largoF = L;
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, ondas, 0, ondas, largoF, 0, 0, ondas, largoF, 0, largoF], 2));
    geo.computeVertexNormals();
    cubierta.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TEX_CAL, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide })));
  }
  // Hastiales: el triángulo que cierra el muro bajo el techo en cada extremo.
  const tri = g.dosAguas ? [[0, H], [S, H], [S / 2, H + h]] : [[0, H], [S, H], [0, H + h]];
  for (const r of [0, g.Lr]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap(([s, z]) => mundo(s, r, z)), 3));
    geo.computeVertexNormals();
    cubierta.add(new THREE.Mesh(geo, MAT.hastial));
  }
  return { estructura, cubierta };
}
