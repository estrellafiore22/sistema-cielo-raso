// Pestaña "Casa / Techo": datos del proyecto, plantillas de casa
// prefabricada y el techo de calamina con sus tijerales.

import * as E from './estado.js';
import { el, formulario, aviso } from './ui.js';
import { geometriaTecho, calcularTecho } from './calc/techo.js';
import { PLANTILLAS } from './plantillas.js';
import { num } from './unidades.js';

let form = null;
const T = () => E.obtener().techo;
const cambiarT = fn => E.cambiar(p => fn(p.techo));
const n = (v, min, max) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? Math.min(max, Math.max(min, x)) : null; };

export function construirTecho() {
  const f = form = formulario();
  const cont = document.getElementById('formTecho');
  const conNum = (k, min, max) => v => { const x = n(v, min, max); if (x !== null) cambiarT(t => { t[k] = x; }); };
  cont.replaceChildren(
    el('h2', { texto: 'Casa prefabricada y techo' }),
    el('div', { clase: 'tarjeta' }, [
      el('h3', { texto: 'Proyecto' }),
      el('div', { clase: 'rejilla' }, [
        f.entrada('Cliente', () => E.obtener().cliente || '', v => E.cambiar(p => { p.cliente = String(v).slice(0, 80); }), { modo: null }),
        f.entrada('Dirección de obra', () => E.obtener().direccion || '', v => E.cambiar(p => { p.direccion = String(v).slice(0, 120); }), { modo: null }),
      ]),
    ]),
    el('div', { clase: 'tarjeta' }, [
      el('h3', { texto: 'Empezar desde una plantilla' }),
      el('p', { clase: 'nota', texto: 'Reemplaza el plano actual (puedes deshacer con ↶).' }),
      el('div', { clase: 'botones' }, Object.entries(PLANTILLAS).map(([k, pl]) => el('button', { texto: pl.nombre, onclick: () => {
        if (!confirm(`¿Reemplazar el plano actual por “${pl.nombre}”?`)) return;
        const nuevo = pl.crear();
        E.cambiar(p => { Object.keys(p).forEach(x => delete p[x]); Object.assign(p, E.normalizar(nuevo)); });
        E.seleccionar(null); aviso('Plantilla cargada'); document.dispatchEvent(new CustomEvent('dcp:encuadrar'));
      } }))),
    ]),
    el('div', { clase: 'tarjeta' }, [
      el('h3', { texto: 'Techo de calamina' }),
      f.casilla('Calcular techo (casa prefabricada)', () => T().activo, v => cambiarT(t => { t.activo = v; })),
      el('div', { clase: 'rejilla' }, [
        f.seleccion('Tipo de techo', [['dos-aguas', 'Dos aguas'], ['una-agua', 'Una agua']], () => T().tipo, v => cambiarT(t => { t.tipo = v; })),
        f.entrada('Pendiente (%)', () => String(T().pendiente), conNum('pendiente', 0, 100), { nota: '25 % ≈ 14°' }),
        f.entrada('Alero (m)', () => String(T().alero), conNum('alero', 0, 2)),
        f.seleccion('Cumbrera paralela a', [['auto', 'Automático (lado largo)'], ['x', 'Eje X'], ['y', 'Eje Y']], () => T().eje, v => cambiarT(t => { t.eje = v; })),
        f.entrada('Separación de tijerales (m)', () => String(T().sepTijeral), conNum('sepTijeral', 0.3, 3)),
        f.entrada('Separación de correas (m)', () => String(T().sepCorrea), conNum('sepCorrea', 0.3, 2)),
        f.seleccion('Tijeral de', [['madera', 'Madera 2" × 4"'], ['acero', 'Acero liviano (perfil 89)']], () => T().tijeral, v => cambiarT(t => { t.tijeral = v; })),
        f.seleccion('Largo de calamina', [['auto', 'Automático (más barato)'], ['1.8', '1.80 m'], ['2.4', '2.40 m'], ['3', '3.00 m'], ['3.6', '3.60 m']],
          () => String(T().calaminaLargo), v => cambiarT(t => { t.calaminaLargo = v; })),
      ]),
      el('p', { clase: 'nota', texto: 'La planta del techo es el rectángulo que encierra los muros exteriores. La altura de apoyo es la del muro más alto.' }),
    ]),
    el('div', { clase: 'tarjeta' }, [
      el('h3', { texto: 'Resultado' }),
      f.dato('Luz del tijeral', () => { const g = geometriaTecho(E.obtener()); return g ? num(g.S) + ' m' : '—'; }),
      f.dato('Altura del tijeral', () => { const g = geometriaTecho(E.obtener()); return g ? num(g.h) + ' m' : '—'; }),
      f.dato('Cantidad de tijerales', () => { const g = geometriaTecho(E.obtener()); return g ? String(g.nTijerales) : '—'; }),
      f.dato('Área de cubierta', () => { const r = calcularTecho(E.obtener()); return r ? num(r.areaCubierta) + ' m²' : '—'; }),
      f.bloque(() => { const r = calcularTecho(E.obtener()); return r ? r.detalle : ['Activa el techo y dibuja los muros exteriores.']; }, 'corte'),
    ]),
  );
}

export function refrescarTecho() { if (form) form.refrescar(); }
