// Techo de casa prefabricada: tijerales, correas y calamina.
// La planta del techo es el rectángulo que encierra los muros exteriores.

import { cajaDe } from '../geom.js';
import { material, rend } from '../precios.js';
import { cortar, resumenCortes } from './cortes.js';
import { nuevaLista } from './partidas.js';

export const CALAMINA = { anchoUtil: 0.76, traslape: 0.15, largos: [1.80, 2.40, 3.00, 3.60] };
const codCal = L => 'cal-' + Math.round(L * 100);

export function geometriaTecho(proyecto) {
  const t = proyecto.techo;
  let muros = proyecto.muros.filter(m => m.tipo !== 'tabique');
  if (!muros.length) muros = proyecto.muros;
  if (!muros.length) return null;
  const c = cajaDe(muros.flatMap(m => [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]));
  if (c.ancho < 0.5 || c.largo < 0.5) return null;
  const eje = t.eje === 'x' || t.eje === 'y' ? t.eje : (c.ancho >= c.largo ? 'x' : 'y');
  const S = eje === 'x' ? c.largo : c.ancho;     // luz que salva el tijeral
  const Lr = eje === 'x' ? c.ancho : c.largo;    // largo de la cumbrera
  const p = Math.max(0, +t.pendiente || 0) / 100;
  const dosAguas = t.tipo !== 'una-agua';
  const run = dosAguas ? S / 2 : S;
  const h = run * p;
  const k = Math.sqrt(1 + p * p);
  const alero = Math.max(0, +t.alero || 0);
  const faldon = dosAguas ? (run + alero) * k : (S + 2 * alero) * k;
  const W = Lr + 2 * alero;
  const n = Math.max(2, Math.ceil(Lr / Math.max(0.3, +t.sepTijeral || 1)) + 1);
  const posiciones = Array.from({ length: n }, (_, i) => (Lr * i) / (n - 1));
  const alturaMuro = Math.max(...muros.map(m => m.altura || 2.4));
  return { caja: c, eje, S, Lr, run, h, p, k, alero, faldon, W, dosAguas, nTijerales: n, posiciones, alturaMuro };
}

// Piezas de un tijeral (largos en m), para metrado y para el dibujo 3D.
export function piezasTijeral(g) {
  if (g.dosAguas) {
    return [
      ['Cordón inferior', g.S], ['Par izquierdo', (g.run + g.alero) * g.k], ['Par derecho', (g.run + g.alero) * g.k],
      ['Pendolón', g.h], ['Diagonal', Math.hypot(g.run / 2, g.h / 2)], ['Diagonal', Math.hypot(g.run / 2, g.h / 2)],
    ];
  }
  return [
    ['Cordón inferior', g.S], ['Par', (g.S + 2 * g.alero) * g.k], ['Montante alto', g.h],
    ['Montante medio', g.h / 2], ['Diagonal', Math.hypot(g.S / 2, g.h / 2)],
  ];
}

// Mejor combinación de calaminas para cubrir un faldón: n hojas de L1 y una última de L2.
export function filasCalamina(faldon, forzado) {
  const opciones = forzado ? [forzado] : CALAMINA.largos;
  const precio = L => material(codCal(L))?.precio || L * 10;
  let mejor = null;
  for (const L1 of opciones) for (const L2 of opciones) for (let n1 = 0; n1 <= 12; n1++) {
    const cubre = n1 * L1 + L2 - n1 * CALAMINA.traslape;
    if (cubre + 1e-6 < faldon) continue;
    const costo = n1 * precio(L1) + precio(L2);
    if (!mejor || costo < mejor.costo - 1e-6 || (Math.abs(costo - mejor.costo) < 1e-6 && n1 + 1 < mejor.hojas.length)) {
      mejor = { costo, hojas: [...Array(n1).fill(L1), L2] };
    }
    break;
  }
  return mejor;
}

export function calcularTecho(proyecto) {
  const t = proyecto.techo;
  if (!t.activo) return null;
  const g = geometriaTecho(proyecto);
  if (!g) return null;
  const R = rend();
  const lista = nuevaLista();
  const madera = t.tijeral !== 'acero';

  const piezas = piezasTijeral(g);
  const todas = [];
  for (let i = 0; i < g.nTijerales; i++) piezas.forEach(([, l]) => todas.push(l));
  const barrasTij = cortar(todas, madera ? 3.05 : 3.00);
  lista.piezas(madera ? 'mad-2x4' : 'par-89', barrasTij.length, `${g.nTijerales} tijerales`);

  const faldones = g.dosAguas ? 2 : 1;
  const nCorreas = (Math.ceil(g.faldon / Math.max(0.3, +t.sepCorrea || 0.8)) + 1) * faldones;
  const barrasCor = cortar(Array(nCorreas).fill(g.W), madera ? 3.05 : 3.00);
  lista.piezas(madera ? 'mad-2x3' : 'par-64', barrasCor.length, `${nCorreas} correas de ${g.W.toFixed(2)} m`);
  if (madera) lista.sumar('clavo-3', g.nTijerales * R.techoClavo3KgPorTijeral + nCorreas * 0.1);
  else lista.sumar('tor-pp', g.nTijerales * 30 + nCorreas * g.nTijerales * 2);

  const columnas = Math.ceil(g.W / CALAMINA.anchoUtil - 1e-6);
  const forzado = t.calaminaLargo === 'auto' ? null : +t.calaminaLargo;
  const fila = filasCalamina(g.faldon, forzado);
  const conteo = {};
  fila.hojas.forEach(L => { conteo[L] = (conteo[L] || 0) + columnas * faldones; });
  let hojas = 0;
  for (const [L, n] of Object.entries(conteo)) { lista.piezas(codCal(+L), n); hojas += n; }
  if (g.dosAguas) lista.piezas('cumbrera', Math.ceil(g.W / (1.80 - CALAMINA.traslape)));
  lista.sumar('clavo-cal', hojas * R.techoClavosPorCalamina);

  const areaCubierta = g.faldon * g.W * faldones;
  lista.sumar('mo-techo', areaCubierta);
  lista.piezas('mo-tijeral', g.nTijerales);

  const detalle = [
    `Techo ${g.dosAguas ? 'a dos aguas' : 'a una agua'}, pendiente ${t.pendiente}% (${(Math.atan(g.p) * 180 / Math.PI).toFixed(1)}°), cumbrera paralela a ${g.eje.toUpperCase()}`,
    `Luz ${g.S.toFixed(2)} m · altura de tijeral ${g.h.toFixed(2)} m · faldón ${g.faldon.toFixed(2)} m con alero`,
    `${g.nTijerales} tijerales cada ${(g.Lr / (g.nTijerales - 1)).toFixed(2)} m. Piezas por tijeral: ` + piezas.map(([n, l]) => `${n} ${l.toFixed(2)}`).join(', '),
    `Calamina por faldón: ${columnas} columnas × [${fila.hojas.map(l => l.toFixed(2)).join(' + ')}] con traslape ${CALAMINA.traslape} m`,
    'Cortes de ' + (madera ? 'madera 2"×4"' : 'perfil 89') + ':', ...resumenCortes(barrasTij).map(s => '  ' + s),
  ];
  return { lista: lista.items, detalle, geo: g, areaCubierta,
    resumen: [['Área de cubierta', areaCubierta, 'm²'], ['Tijerales', g.nTijerales, 'und'], ['Calaminas', hojas, 'und']] };
}
