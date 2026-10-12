// Estado del proyecto abierto, deshacer/rehacer y guardado automático.

const CLAVE_ACTUAL = 'dcp:actual';
const oyentes = new Set();
let proyecto = null;
let pasado = [], futuro = [];
export let seleccion = null; // { tipo: 'muro'|'abertura'|'ambiente'|'mueble', id }

export const nuevoId = () => Math.random().toString(36).slice(2, 10);

export function cieloPorDefecto(tipo = 'ninguno') {
  return {
    tipo, altura: 2.40, niveles: [],
    baldosa: { modulo: '61x61' },
    pvc: { ancho: 0.20, largo: 5.95, direccion: 'auto' },
  };
}

export function techoPorDefecto() {
  return {
    activo: true, tipo: 'dos-aguas', pendiente: 25, alero: 0.40, eje: 'auto',
    sepTijeral: 1.00, sepCorrea: 0.80, tijeral: 'madera', calaminaLargo: 'auto',
  };
}

function muro(x1, y1, x2, y2, tipo = 'muro') {
  return { id: nuevoId(), x1, y1, x2, y2, tipo, sistema: tipo === 'tabique' ? 'drywall' : 'prefabricado',
    espesor: tipo === 'tabique' ? 0.10 : 0.12, altura: 2.40 };
}

// Casa prefabricada de ejemplo, 6 × 9 m, para que la app no arranque vacía.
export function proyectoEjemplo() {
  const m = [
    muro(0, 0, 6, 0), muro(6, 0, 6, 9), muro(6, 9, 0, 9), muro(0, 9, 0, 0),
    muro(0, 5, 6, 5, 'tabique'), muro(3, 5, 3, 9, 'tabique'),
  ];
  const sala = { id: nuevoId(), nombre: 'Sala - comedor', puntos: [{x:0,y:0},{x:6,y:0},{x:6,y:5},{x:0,y:5}], cielo: cieloPorDefecto('drywall') };
  sala.cielo.niveles = [{ ancho: 0.60, altura: 2.25 }];
  const d1 = { id: nuevoId(), nombre: 'Dormitorio 1', puntos: [{x:0,y:5},{x:3,y:5},{x:3,y:9},{x:0,y:9}], cielo: cieloPorDefecto('pvc') };
  const d2 = { id: nuevoId(), nombre: 'Dormitorio 2', puntos: [{x:3,y:5},{x:6,y:5},{x:6,y:9},{x:3,y:9}], cielo: cieloPorDefecto('baldosa') };
  return {
    version: 1, nombre: 'Casa prefabricada 6 × 9', cliente: '', creado: Date.now(),
    muros: m,
    aberturas: [
      { id: nuevoId(), muroId: m[0].id, t: 0.5, tipo: 'puerta', ancho: 0.90, alto: 2.10, alfeizar: 0 },
      { id: nuevoId(), muroId: m[1].id, t: 0.3, tipo: 'ventana', ancho: 1.20, alto: 1.00, alfeizar: 1.00 },
      { id: nuevoId(), muroId: m[4].id, t: 0.25, tipo: 'puerta', ancho: 0.80, alto: 2.10, alfeizar: 0 },
      { id: nuevoId(), muroId: m[4].id, t: 0.75, tipo: 'puerta', ancho: 0.80, alto: 2.10, alfeizar: 0 },
      { id: nuevoId(), muroId: m[2].id, t: 0.25, tipo: 'ventana', ancho: 1.00, alto: 1.00, alfeizar: 1.00 },
      { id: nuevoId(), muroId: m[2].id, t: 0.75, tipo: 'ventana', ancho: 1.00, alto: 1.00, alfeizar: 1.00 },
    ],
    ambientes: [sala, d1, d2],
    muebles: [
      { id: nuevoId(), tipo: 'cama', nombre: 'Cama 2 plazas', x: 1.5, y: 7.6, ancho: 1.40, fondo: 1.90, alto: 0.50, rot: 0 },
      { id: nuevoId(), tipo: 'sofa', nombre: 'Sofá', x: 1.6, y: 1.0, ancho: 2.00, fondo: 0.85, alto: 0.80, rot: 0 },
      { id: nuevoId(), tipo: 'mesa', nombre: 'Mesa', x: 4.3, y: 3.0, ancho: 1.20, fondo: 0.80, alto: 0.75, rot: 0 },
    ],
    techo: techoPorDefecto(),
  };
}

export function proyectoVacio() {
  return { version: 1, nombre: 'Proyecto nuevo', cliente: '', creado: Date.now(),
    muros: [], aberturas: [], ambientes: [], muebles: [], techo: { ...techoPorDefecto(), activo: false } };
}

// Completa campos que un proyecto viejo o importado no traiga.
export function normalizar(p) {
  const base = proyectoVacio();
  const r = { ...base, ...p };
  for (const k of ['muros', 'aberturas', 'ambientes', 'muebles']) r[k] = Array.isArray(r[k]) ? r[k] : [];
  r.techo = { ...techoPorDefecto(), ...(p.techo || {}) };
  r.presupuesto = { margen: 20, igv: false, transporte: 0, incluirMO: true, ...(p.presupuesto || {}) };
  r.ambientes.forEach(a => {
    const c = cieloPorDefecto();
    a.cielo = { ...c, ...(a.cielo || {}) };
    a.cielo.baldosa = { ...c.baldosa, ...(a.cielo.baldosa || {}) };
    a.cielo.pvc = { ...c.pvc, ...(a.cielo.pvc || {}) };
    a.cielo.niveles = Array.isArray(a.cielo.niveles) ? a.cielo.niveles : [];
  });
  return r;
}

export function obtener() { return proyecto; }

export function cargar(p, { limpiarHistorial = true } = {}) {
  proyecto = normalizar(JSON.parse(JSON.stringify(p)));
  if (limpiarHistorial) { pasado = []; futuro = []; }
  seleccion = null;
  guardarLocal();
  avisar('carga');
}

export function iniciar() {
  let guardado = null;
  try { guardado = JSON.parse(localStorage.getItem(CLAVE_ACTUAL)); } catch { /* sin datos */ }
  cargar(guardado && guardado.muros ? guardado : proyectoEjemplo());
}

// Toda modificación pasa por aquí: guarda una foto para deshacer.
export function cambiar(fn, { silencioso = false } = {}) {
  pasado.push(JSON.stringify(proyecto));
  if (pasado.length > 80) pasado.shift();
  futuro = [];
  fn(proyecto);
  guardarLocal();
  if (!silencioso) avisar('cambio');
}

// Para arrastres: una sola foto al empezar y cambios libres después.
export function fotoParaDeshacer() {
  pasado.push(JSON.stringify(proyecto));
  if (pasado.length > 80) pasado.shift();
  futuro = [];
}
export function modificarSinFoto(fn) { fn(proyecto); avisar('arrastre'); }
export function terminarArrastre() { guardarLocal(); avisar('cambio'); }

export function deshacer() {
  if (!pasado.length) return;
  futuro.push(JSON.stringify(proyecto));
  proyecto = JSON.parse(pasado.pop());
  validarSeleccion(); guardarLocal(); avisar('cambio');
}
export function rehacer() {
  if (!futuro.length) return;
  pasado.push(JSON.stringify(proyecto));
  proyecto = JSON.parse(futuro.pop());
  validarSeleccion(); guardarLocal(); avisar('cambio');
}

export function seleccionar(sel) { seleccion = sel; avisar('seleccion'); }

export function buscar(tipo, id) {
  const lista = { muro: 'muros', abertura: 'aberturas', ambiente: 'ambientes', mueble: 'muebles' }[tipo];
  return lista ? proyecto[lista].find(e => e.id === id) : null;
}

export function seleccionado() { return seleccion ? buscar(seleccion.tipo, seleccion.id) : null; }

function validarSeleccion() { if (seleccion && !seleccionado()) seleccion = null; }

function guardarLocal() {
  try { localStorage.setItem(CLAVE_ACTUAL, JSON.stringify(proyecto)); } catch { /* lleno o bloqueado */ }
}

export function suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar(motivo) { oyentes.forEach(fn => { try { fn(motivo); } catch (e) { console.error(e); } }); }
