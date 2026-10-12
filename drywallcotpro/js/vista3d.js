// Vista 3D generada desde el plano. Se arma de nuevo cada vez que el plano
// cambia y la pestaña está visible; mientras tanto solo se marca "sucia".

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as E from './estado.js';
import { largoMuro, anguloMuro, cajaDe } from './geom.js';
import { losa, cieloDe, techoDe } from './vista3d-partes.js';
import { MUEBLES } from './muebles.js';

const caja = document.getElementById('lienzo3d');
let renderer, escena, camara, controles, grupos, sucia = true, activa = false, primeraVez = true;

const MAT = {
  muro: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.95 }),
  tabique: new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.95 }),
  existente: new THREE.MeshStandardMaterial({ color: 0xc9c3b8, roughness: 1 }),
  piso: new THREE.MeshStandardMaterial({ color: 0xcdb497, roughness: 0.9, side: THREE.DoubleSide }),
  puerta: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.7 }),
  vidrio: new THREE.MeshStandardMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.35, roughness: 0.1 }),
};

function iniciar() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  caja.appendChild(renderer.domElement);
  escena = new THREE.Scene();
  escena.background = new THREE.Color(0xdfe8f0);
  camara = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
  controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.maxPolarAngle = Math.PI * 0.95;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 1.1));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4); sol.position.set(15, 25, 10); escena.add(sol);
  const suelo = new THREE.GridHelper(80, 80, 0xb8c4cf, 0xcfd8e0); suelo.position.y = -0.01; escena.add(suelo);
  grupos = {};
  for (const k of ['muros', 'pisos', 'cielos', 'techo', 'cubierta', 'muebles']) { grupos[k] = new THREE.Group(); escena.add(grupos[k]); }
  new ResizeObserver(ajustar).observe(caja);
  bucle();
}

function ajustar() {
  if (!renderer) return;
  const w = caja.clientWidth, h = caja.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  camara.aspect = w / h; camara.updateProjectionMatrix();
}

function bucle() {
  requestAnimationFrame(bucle);
  if (!activa) return;
  if (sucia) { reconstruir(); sucia = false; }
  controles.update();
  renderer.render(escena, camara);
}

function vaciar(g) {
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  g.clear();
}

const matMuebles = new Map();
function matMueble(color) {
  if (!matMuebles.has(color)) matMuebles.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  return matMuebles.get(color);
}

function caja3(ancho, alto, fondo, mat, x, y, z, rotY) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), mat);
  m.position.set(x, y, z); m.rotation.y = rotY;
  return m;
}

// Muro con sus vanos: tramos llenos + dintel y antepecho de cada vano.
function muro3d(m, aberturas) {
  const g = new THREE.Group();
  const L = largoMuro(m); if (L < 0.01) return g;
  const ang = anguloMuro(m), dx = Math.cos(ang), dy = Math.sin(ang), H = m.altura, e = m.espesor;
  const mat = m.sistema === 'existente' ? MAT.existente : m.tipo === 'tabique' ? MAT.tabique : MAT.muro;
  const pieza = (s0, s1, z0, z1, material = mat, esp = e) => {
    if (s1 - s0 < 0.005 || z1 - z0 < 0.005) return;
    const s = (s0 + s1) / 2;
    g.add(caja3(s1 - s0, z1 - z0, esp, material, m.x1 + dx * s, (z0 + z1) / 2, m.y1 + dy * s, -ang));
  };
  const vanos = aberturas.filter(a => a.muroId === m.id)
    .map(a => ({ a, s0: Math.max(0, a.t * L - a.ancho / 2), s1: Math.min(L, a.t * L + a.ancho / 2) }))
    .sort((p, q) => p.s0 - q.s0);
  let s = 0;
  for (const v of vanos) {
    pieza(s, v.s0, 0, H);
    const z0 = v.a.alfeizar || 0, z1 = Math.min(H, z0 + v.a.alto);
    pieza(v.s0, v.s1, 0, z0);
    pieza(v.s0, v.s1, z1, H);
    if (v.a.tipo === 'ventana') pieza(v.s0, v.s1, z0, z1, MAT.vidrio, 0.02);
    else pieza(v.s0, v.s0 + 0.04, z0, z1, MAT.puerta, 0.04);
    s = Math.max(s, v.s1);
  }
  pieza(s, L, 0, H);
  return g;
}

function reconstruir() {
  const p = E.obtener();
  Object.values(grupos).forEach(vaciar);
  p.muros.forEach(m => grupos.muros.add(muro3d(m, p.aberturas)));
  p.ambientes.forEach(a => {
    if (a.puntos.length < 3) return;
    const piso = losa(a.puntos, 0.002, MAT.piso); grupos.pisos.add(piso);
    try { grupos.cielos.add(cieloDe(a)); } catch (e) { console.error(e); }
  });
  try { const t = techoDe(p); grupos.techo.add(t.estructura); grupos.cubierta.add(t.cubierta); } catch (e) { console.error(e); }
  p.muebles.forEach(mu => {
    const mat = matMueble(MUEBLES[mu.tipo]?.color ?? 0xb08a5c);
    grupos.muebles.add(caja3(mu.ancho, mu.alto, mu.fondo, mat, mu.x, mu.alto / 2, mu.y, -(mu.rot || 0) * Math.PI / 180));
  });
  aplicarVisibilidad();
  if (primeraVez) { vistaInicial(); primeraVez = false; }
}

export function vistaInicial() {
  const p = E.obtener();
  const pts = [...p.muros.flatMap(m => [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]), ...p.ambientes.flatMap(a => a.puntos)];
  const c = pts.length ? cajaDe(pts) : { x0: 0, y0: 0, x1: 5, y1: 5, ancho: 5, largo: 5 };
  const cx = (c.x0 + c.x1) / 2, cz = (c.y0 + c.y1) / 2, d = Math.max(c.ancho, c.largo, 3);
  controles.target.set(cx, 1.2, cz);
  camara.position.set(cx + d * 0.9, d * 0.95, cz + d * 1.15);
  controles.update();
}

const visible = { techo: true, cubierta: true, cielos: true, muros: true, muebles: true };
export function fijarVisible(k, v) { visible[k] = v; aplicarVisibilidad(); }
function aplicarVisibilidad() { if (grupos) for (const k of Object.keys(visible)) grupos[k].visible = visible[k]; }

export function mostrar3d(si) {
  activa = si;
  if (si && !renderer) iniciar();
  if (si) { ajustar(); sucia = true; }
}

export function marcarSucia() { sucia = true; }

// Imagen de la vista 3D actual (para PNG o PDF). Si nunca se abrió, la arma.
export function imagen3d(ancho = 1600, alto = 1100) {
  if (!renderer) iniciar();
  const antes = activa; activa = true;
  if (sucia || primeraVez) { reconstruir(); sucia = false; }
  const pr = renderer.getPixelRatio();
  renderer.setPixelRatio(1); renderer.setSize(ancho, alto, false);
  camara.aspect = ancho / alto; camara.updateProjectionMatrix();
  renderer.render(escena, camara);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(pr); activa = antes; ajustar();
  return url;
}
