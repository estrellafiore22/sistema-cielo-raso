// Panel lateral: edita con medidas exactas lo que está seleccionado.
// Se reconstruye solo cuando cambia QUÉ se edita; si solo cambian valores
// (arrastre, deshacer) se refresca sin tocar el campo que tiene el foco.

import * as E from './estado.js';
import { el, formulario } from './ui.js';
import { largo, leerLargo, valorEditable, area, unidadActual } from './unidades.js';
import { largoMuro, anguloMuro, dist, areaPoligono } from './geom.js';
import { areaNetaMuro } from './calc/muros.js';
import { opciones, borrar, cerrarPoligono, MUEBLES } from './editor2d.js';
import { formAmbiente } from './propiedades-ambiente.js';

const panel = document.getElementById('panelPropiedades');
let clave = null, form = null;

const u = () => `(${unidadActual()})`;
// Fija un largo escrito por el usuario; ignora valores vacíos o negativos.
const conLargo = (fn, min = 0.01) => v => { const m = leerLargo(v); if (isFinite(m) && m >= min) E.cambiar(() => fn(m)); };

export function actualizarPanel(forzar = false) {
  const obj = E.seleccionado();
  const k = obj ? E.seleccion.tipo + obj.id + (obj.tipo || '') + (obj.cielo ? obj.cielo.tipo + obj.cielo.niveles.length : '') + unidadActual()
    : 'h:' + opciones.herramienta + unidadActual() + E.obtener().ambientes.length;
  if (!forzar && k === clave && form) { form.refrescar(); return; }
  clave = k;
  form = formulario();
  const contenido = obj ? construir(E.seleccion.tipo, obj, form) : sinSeleccion(form);
  panel.replaceChildren(...contenido.filter(Boolean));
}

function construir(tipo, o, f) {
  const quitar = el('button', { clase: 'peligro', texto: 'Borrar', onclick: () => borrar(E.seleccion) });
  if (tipo === 'muro') return formMuro(o, f, quitar);
  if (tipo === 'abertura') return formAbertura(o, f, quitar);
  if (tipo === 'mueble') return formMueble(o, f, quitar);
  if (tipo === 'ambiente') return formAmbiente(o, f, quitar);
  return [];
}

function moverExtremo(p, viejo, nuevo) {
  for (const m of p.muros) {
    if (dist({ x: m.x1, y: m.y1 }, viejo) < 0.005) { m.x1 = nuevo.x; m.y1 = nuevo.y; }
    if (dist({ x: m.x2, y: m.y2 }, viejo) < 0.005) { m.x2 = nuevo.x; m.y2 = nuevo.y; }
  }
}

function formMuro(m, f, quitar) {
  const fijarLargoAngulo = (L, angDeg) => E.cambiar(p => {
    const a = angDeg * Math.PI / 180;
    moverExtremo(p, { x: m.x2, y: m.y2 }, { x: m.x1 + Math.cos(a) * L, y: m.y1 + Math.sin(a) * L });
  });
  return [
    el('h3', { texto: m.tipo === 'tabique' ? 'Tabique' : 'Muro' }),
    f.entrada(`Largo ${u()}`, () => valorEditable(largoMuro(m)), v => { const L = leerLargo(v); if (L > 0.01) fijarLargoAngulo(L, anguloMuro(m) * 180 / Math.PI); }),
    f.entrada('Ángulo (°) · 0 = derecha, 90 = abajo', () => String(Math.round(anguloMuro(m) * 1800 / Math.PI) / 10),
      v => { const a = parseFloat(String(v).replace(',', '.')); if (isFinite(a)) fijarLargoAngulo(largoMuro(m), a); }),
    el('div', { clase: 'fila' }, [
      f.entrada(`Altura ${u()}`, () => valorEditable(m.altura), conLargo(v => { m.altura = v; }, 0.1)),
      f.entrada(`Espesor ${u()}`, () => valorEditable(m.espesor), conLargo(v => { m.espesor = v; }, 0.02)),
    ]),
    f.seleccion('Tipo', [['muro', 'Muro'], ['tabique', 'Tabique / división']], () => m.tipo, v => E.cambiar(() => { m.tipo = v; })),
    f.seleccion('Sistema constructivo', [['prefabricado', 'Prefabricado (fibrocemento + drywall)'], ['drywall', 'Drywall dos caras'], ['existente', 'Existente (no se metra)']],
      () => m.sistema, v => E.cambiar(() => { m.sistema = v; })),
    f.casilla('Zona húmeda (plancha RH)', () => m.humedo, v => E.cambiar(() => { m.humedo = v; })),
    f.dato('Área neta (sin vanos)', () => area(areaNetaMuro(m, E.obtener().aberturas))),
    f.dato('Inicio', () => `${largo(m.x1)} ; ${largo(m.y1)}`),
    el('p', { clase: 'nota', texto: 'Al cambiar el largo se mueve el extremo final, y los muros unidos a él lo siguen.' }),
    quitar,
  ];
}

function formAbertura(a, f, quitar) {
  const muro = () => E.obtener().muros.find(m => m.id === a.muroId);
  const L = () => largoMuro(muro());
  return [
    el('h3', { texto: a.tipo === 'puerta' ? 'Puerta' : 'Ventana' }),
    f.seleccion('Tipo', [['puerta', 'Puerta'], ['ventana', 'Ventana']], () => a.tipo, v => E.cambiar(() => {
      a.tipo = v; if (v === 'puerta') a.alfeizar = 0; else if (!a.alfeizar) a.alfeizar = 1.0;
    })),
    el('div', { clase: 'fila' }, [
      f.entrada(`Ancho ${u()}`, () => valorEditable(a.ancho), conLargo(v => { a.ancho = Math.min(v, L()); }, 0.2)),
      f.entrada(`Alto ${u()}`, () => valorEditable(a.alto), conLargo(v => { a.alto = v; }, 0.2)),
    ]),
    a.tipo === 'ventana' ? f.entrada(`Alféizar (altura desde el piso) ${u()}`, () => valorEditable(a.alfeizar || 0), conLargo(v => { a.alfeizar = v; }, 0)) : null,
    f.entrada(`Distancia desde el inicio del muro ${u()}`, () => valorEditable(a.t * L() - a.ancho / 2),
      conLargo(v => { a.t = Math.min(1 - a.ancho / 2 / L(), (v + a.ancho / 2) / L()); }, 0)),
    a.tipo === 'puerta' ? f.seleccion('Abre hacia', [['1', 'Un lado'], ['-1', 'El otro lado']], () => String(a.lado === -1 ? -1 : 1), v => E.cambiar(() => { a.lado = +v; })) : null,
    quitar,
  ];
}

function formMueble(m, f, quitar) {
  return [
    el('h3', { texto: 'Mueble' }),
    f.entrada('Nombre', () => m.nombre, v => E.cambiar(() => { m.nombre = String(v).slice(0, 40); }), { modo: null }),
    el('div', { clase: 'fila' }, [
      f.entrada(`Ancho ${u()}`, () => valorEditable(m.ancho), conLargo(v => { m.ancho = v; }, 0.05)),
      f.entrada(`Fondo ${u()}`, () => valorEditable(m.fondo), conLargo(v => { m.fondo = v; }, 0.05)),
    ]),
    el('div', { clase: 'fila' }, [
      f.entrada(`Alto ${u()}`, () => valorEditable(m.alto), conLargo(v => { m.alto = v; }, 0.02)),
      f.entrada('Giro (°)', () => String(m.rot || 0), v => { const r = parseFloat(v); if (isFinite(r)) E.cambiar(() => { m.rot = ((r % 360) + 360) % 360; }); }),
    ]),
    el('div', { clase: 'botones' }, [el('button', { texto: 'Girar 90°', onclick: () => E.cambiar(() => { m.rot = ((m.rot || 0) + 90) % 360; }) }), quitar]),
  ];
}

function sinSeleccion(f) {
  const h = opciones.herramienta;
  const partes = [];
  if (h === 'ambiente' || h === 'poligono') {
    partes.push(el('h3', { texto: 'Nuevo ambiente' }),
      f.casilla('Crear también sus muros', () => opciones.conMuros, v => { opciones.conMuros = v; }));
    if (h === 'poligono') partes.push(el('button', { clase: 'primario', texto: 'Cerrar polígono', onclick: cerrarPoligono }));
  } else if (h === 'mueble') {
    partes.push(el('h3', { texto: 'Mueble a colocar' }),
      f.seleccion('Tipo', Object.entries(MUEBLES).map(([k, v]) => [k, v.nombre]), () => opciones.mueble, v => { opciones.mueble = v; }));
  } else if (h === 'muro') {
    partes.push(el('h3', { texto: 'Muros nuevos' }),
      f.seleccion('Sistema de los muros nuevos', [['prefabricado', 'Prefabricado'], ['drywall', 'Drywall'], ['existente', 'Existente (no se metra)']],
        () => E.obtener().sistemaMuros || 'prefabricado', v => E.cambiar(p => { p.sistemaMuros = v; })));
  }
  const p = E.obtener();
  partes.push(el('h3', { texto: 'Resumen del plano' }),
    f.dato('Ambientes', () => String(E.obtener().ambientes.length)),
    f.dato('Área total de ambientes', () => area(E.obtener().ambientes.reduce((s, a) => s + areaPoligono(a.puntos), 0))),
    f.dato('Muros y tabiques', () => String(E.obtener().muros.length)),
    f.dato('Largo total de muros', () => largo(E.obtener().muros.reduce((s, m) => s + largoMuro(m), 0))),
    el('p', { clase: 'nota', texto: p.ambientes.length ? 'Toca un ambiente para elegir su cielo raso (drywall por niveles, baldosa o PVC).' : 'Usa “Ambiente” para dibujar tu primer espacio.' }));
  return partes;
}
