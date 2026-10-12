// Pestaña "Metrado y S/": cantidades a comprar y presupuesto.
// Los ajustes del presupuesto se construyen una vez; las tablas se rehacen.

import * as E from './estado.js';
import { el, formulario } from './ui.js';
import { calcularTodo } from './metrado.js';
import { soles, num } from './unidades.js';

let form = null, tablas = null;
const P = () => E.obtener().presupuesto;

export function construirMetrado() {
  const f = form = formulario();
  tablas = el('div');
  const numero = (k, min, max) => v => { const x = parseFloat(String(v).replace(',', '.')); if (isFinite(x)) E.cambiar(p => { p.presupuesto[k] = Math.min(max, Math.max(min, x)); }); };
  document.getElementById('vistaMetrado').replaceChildren(
    el('h2', { texto: 'Metrado y presupuesto' }),
    el('div', { clase: 'tarjeta' }, [
      el('div', { clase: 'rejilla' }, [
        f.entrada('Margen / utilidad (%)', () => String(P().margen), numero('margen', 0, 500)),
        f.entrada('Transporte (S/)', () => String(P().transporte), numero('transporte', 0, 1e6)),
        f.casilla('Incluir mano de obra', () => P().incluirMO, v => E.cambiar(p => { p.presupuesto.incluirMO = v; })),
        f.casilla('Sumar IGV 18 %', () => P().igv, v => E.cambiar(p => { p.presupuesto.igv = v; })),
      ]),
      el('p', { clase: 'ejemplo', texto: 'Los precios son de EJEMPLO. Cámbialos por los tuyos en la pestaña Precios.' }),
    ]),
    tablas,
  );
  refrescarMetrado();
}

export function refrescarMetrado() {
  if (!form) return;
  form.refrescar();
  const r = calcularTodo(E.obtener());
  const t = r.totales;
  const resumen = el('div', { clase: 'tarjeta' }, [
    el('h3', { texto: 'Presupuesto' }),
    ...[['Materiales', t.materiales], ['Mano de obra', t.manoObra], ['Transporte', t.transporte], [`Margen (${P().margen} %)`, t.margen],
      ['Subtotal', t.subtotal], ...(P().igv ? [['IGV 18 %', t.igv]] : [])]
      .map(([k, v]) => el('div', { clase: 'dato' }, [el('span', { texto: k }), el('b', { texto: soles(v) })])),
    el('div', { clase: 'dato', style: 'font-size:18px' }, [el('span', { texto: 'TOTAL' }), el('b', { texto: soles(t.total) })]),
  ]);

  const filas = [];
  let grupo = null;
  for (const f of r.filas) {
    if (f.esMO && !P().incluirMO) continue;
    if (f.grupo !== grupo) { grupo = f.grupo; filas.push(el('tr', { clase: 'grupo' }, [el('td', { colspan: 5, texto: grupo })])); }
    filas.push(el('tr', {}, [
      el('td', {}, [f.nombre, f.necesario > 0 && !f.esMO && f.rinde !== 1 ? el('div', { clase: 'nota', texto: `se necesitan ${num(f.necesario)} ${f.consumo}` }) : null]),
      el('td', { clase: 'num', texto: num(f.cantidad) }), el('td', { texto: f.unidad }),
      el('td', { clase: 'num', texto: soles(f.precio) }), el('td', { clase: 'num', texto: soles(f.subtotal) }),
    ]));
  }
  const tabla = el('div', { clase: 'tarjeta' }, [
    el('h3', { texto: 'Lista de materiales a comprar' }),
    r.filas.length ? el('div', { clase: 'tabla-caja' }, el('table', {}, [
      el('thead', {}, el('tr', {}, ['Material', 'Cant.', 'Unidad', 'P. unit.', 'Subtotal'].map((h, i) => el('th', { clase: i && i !== 2 ? 'num' : '', texto: h })))),
      el('tbody', {}, filas),
    ])) : el('p', { texto: 'Dibuja ambientes con cielo raso, muros o activa el techo para ver el metrado.' }),
  ]);

  const secciones = r.secciones.map(s => el('details', { clase: 'tarjeta' }, [
    el('summary', { texto: s.titulo }),
    ...(s.resumen || []).map(([k, v, u]) => el('div', { clase: 'dato' }, [el('span', { texto: k }), el('b', { texto: `${num(v)} ${u}` })])),
    el('div', { clase: 'corte', style: 'margin-top:8px' }, (s.detalle || []).map(d => el('div', { texto: d }))),
  ]));
  tablas.replaceChildren(resumen, tabla, el('h3', { texto: 'Detalle por partida (cortes y cálculos)' }), ...secciones);
}

export function datosMetrado() { return calcularTodo(E.obtener()); }
