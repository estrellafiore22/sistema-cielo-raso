// Panel de un ambiente: nombre, medidas y su cielo raso.

import * as E from './estado.js';
import { el } from './ui.js';
import { largo, leerLargo, valorEditable, area, unidadActual, num } from './unidades.js';
import { areaPoligono, perimetro, cajaDe, esRectangulo, dist } from './geom.js';
import { calcularCielo, NOMBRE_CIELO } from './metrado.js';

const u = () => `(${unidadActual()})`;

function moverEsquinas(p, cambios) {
  for (const [viejo, nuevo] of cambios) for (const m of p.muros) {
    if (dist({ x: m.x1, y: m.y1 }, viejo) < 0.005) { m.x1 = nuevo.x; m.y1 = nuevo.y; }
    if (dist({ x: m.x2, y: m.y2 }, viejo) < 0.005) { m.x2 = nuevo.x; m.y2 = nuevo.y; }
  }
}

// Cambia ancho o largo de un ambiente rectangular; sus muros lo acompañan.
function redimensionar(a, ancho, largoY) {
  E.cambiar(p => {
    const c = cajaDe(a.puntos);
    const cambios = [];
    a.puntos.forEach(q => {
      const n = { x: Math.abs(q.x - c.x1) < 0.005 ? c.x0 + ancho : q.x, y: Math.abs(q.y - c.y1) < 0.005 ? c.y0 + largoY : q.y };
      cambios.push([{ ...q }, n]); q.x = n.x; q.y = n.y;
    });
    moverEsquinas(p, cambios);
  });
}

const PLANTILLAS = {
  plano: [],
  cajon: [{ ancho: 0.60, altura: 2.25 }],
  escalonado: [{ ancho: 0.50, altura: 2.15 }, { ancho: 0.40, altura: 2.28 }],
  bajo: [{ ancho: 0.80, altura: 2.40 }],
};

export function formAmbiente(a, f, quitar) {
  const c = a.cielo;
  const rect = esRectangulo(a.puntos);
  const cambiarCielo = fn => E.cambiar(() => fn(c));
  const partes = [
    el('h3', { texto: 'Ambiente' }),
    f.entrada('Nombre', () => a.nombre, v => E.cambiar(() => { a.nombre = String(v).slice(0, 40) || 'Ambiente'; }), { modo: null }),
    f.dato('Área', () => area(areaPoligono(a.puntos))),
    f.dato('Perímetro', () => largo(perimetro(a.puntos))),
  ];
  if (rect) partes.push(el('div', { clase: 'fila' }, [
    f.entrada(`Ancho X ${u()}`, () => valorEditable(cajaDe(a.puntos).ancho), v => { const m = leerLargo(v); if (m > 0.1) redimensionar(a, m, cajaDe(a.puntos).largo); }),
    f.entrada(`Largo Y ${u()}`, () => valorEditable(cajaDe(a.puntos).largo), v => { const m = leerLargo(v); if (m > 0.1) redimensionar(a, cajaDe(a.puntos).ancho, m); }),
  ]));

  partes.push(el('h3', { texto: 'Cielo raso' }),
    f.seleccion('Tipo de cielo raso', Object.entries(NOMBRE_CIELO), () => c.tipo, v => cambiarCielo(x => { x.tipo = v; })));
  if (c.tipo === 'ninguno') { partes.push(quitar); return partes; }

  partes.push(f.entrada(c.tipo === 'drywall' && c.niveles.length ? `Altura del centro ${u()}` : `Altura del cielo ${u()}`,
    () => valorEditable(c.altura), v => { const m = leerLargo(v); if (m > 1) cambiarCielo(x => { x.altura = m; }); }));

  if (c.tipo === 'drywall') {
    partes.push(f.seleccion('Plancha', [['st', 'Estándar ST'], ['rh', 'RH (baño, cocina, zona húmeda)']], () => c.placa || 'st', v => cambiarCielo(x => { x.placa = v; })));
    partes.push(el('h3', { texto: 'Niveles (desde la pared hacia el centro)' }));
    if (!rect) partes.push(el('p', { clase: 'ejemplo', texto: 'El ambiente no es rectangular: los niveles se trazan sobre su rectángulo exterior.' }));
    c.niveles.forEach((n, i) => partes.push(el('div', { clase: 'nivel' }, [
      el('b', { texto: `Nivel ${i + 1}` }),
      el('div', { clase: 'fila' }, [
        f.entrada(`Ancho de franja ${u()}`, () => valorEditable(n.ancho), v => { const m = leerLargo(v); if (m > 0.02) cambiarCielo(() => { n.ancho = m; }); }),
        f.entrada(`Altura ${u()}`, () => valorEditable(n.altura), v => { const m = leerLargo(v); if (m > 1) cambiarCielo(() => { n.altura = m; }); }),
      ]),
      el('button', { clase: 'peligro', texto: 'Quitar nivel', onclick: () => cambiarCielo(x => x.niveles.splice(i, 1)) }),
    ])));
    partes.push(el('div', { clase: 'botones' }, [
      el('button', { texto: '+ Agregar nivel', onclick: () => cambiarCielo(x => {
        const ult = x.niveles[x.niveles.length - 1];
        x.niveles.push({ ancho: 0.40, altura: Math.round(((ult ? ult.altura : x.altura) - 0.15) * 100) / 100 });
      }) }),
    ]));
    const sel = el('select', {}, [el('option', { value: '', texto: 'Plantilla rápida…' }),
      el('option', { value: 'plano', texto: 'Cielo plano (un nivel)' }), el('option', { value: 'cajon', texto: 'Cajón perimetral' }),
      el('option', { value: 'escalonado', texto: 'Escalonado 2 niveles' }), el('option', { value: 'bajo', texto: 'Centro más bajo (isla)' })]);
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      const t = sel.value;
      cambiarCielo(x => { x.niveles = PLANTILLAS[t].map(n => ({ ...n })); x.altura = t === 'bajo' ? 2.25 : 2.40; });
    });
    partes.push(el('label', { clase: 'campo' }, ['Plantillas', sel]));
  } else if (c.tipo === 'baldosa') {
    partes.push(f.seleccion('Módulo de baldosa', [['61x61', '61 × 61 cm'], ['60x60', '60 × 60 cm'], ['61x122', '61 × 122 cm']],
      () => c.baldosa.modulo, v => cambiarCielo(x => { x.baldosa.modulo = v; })));
  } else if (c.tipo === 'pvc') {
    partes.push(el('div', { clase: 'fila' }, [
      f.seleccion('Ancho de lámina', [['0.2', '20 cm'], ['0.25', '25 cm'], ['0.3', '30 cm']], () => String(+c.pvc.ancho), v => cambiarCielo(x => { x.pvc.ancho = +v; })),
      f.entrada(`Largo de lámina ${u()}`, () => valorEditable(c.pvc.largo), v => { const m = leerLargo(v); if (m > 0.5) cambiarCielo(x => { x.pvc.largo = m; }); }),
    ]),
    f.seleccion('Dirección de las láminas', [['auto', 'Automática (menos láminas)'], ['x', 'A lo largo de X'], ['y', 'A lo largo de Y']],
      () => c.pvc.direccion, v => cambiarCielo(x => { x.pvc.direccion = v; })));
  }

  partes.push(el('h3', { texto: 'Cálculo de este cielo' }),
    f.bloque(() => {
      const r = calcularCielo(a); if (!r) return ['—'];
      return [...r.resumen.map(([t, v, un]) => `${t}: ${num(v)} ${un}`), ...r.detalle];
    }, 'corte'),
    el('p', { clase: 'nota', texto: 'El metrado completo con precios está en la pestaña “Metrado y S/”.' }),
    quitar);
  return partes;
}
