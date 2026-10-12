// Junta los cálculos de cada parte del proyecto en un solo metrado y
// presupuesto. Las cantidades se pasan de unidad de consumo a unidad de
// venta (redondeando hacia arriba) recién aquí, al final.

import { calcularCieloDrywall } from './calc/cielo-drywall.js';
import { calcularBaldosa } from './calc/baldosa.js';
import { calcularPVC } from './calc/pvc.js';
import { calcularMuros } from './calc/muros.js';
import { calcularTecho } from './calc/techo.js';
import { catalogo, material } from './precios.js';

const CALC_CIELO = { drywall: calcularCieloDrywall, baldosa: calcularBaldosa, pvc: calcularPVC };
export const NOMBRE_CIELO = { ninguno: 'Sin cielo raso', drywall: 'Drywall', baldosa: 'Baldosa', pvc: 'Láminas PVC' };

export function calcularCielo(amb) {
  const f = CALC_CIELO[amb.cielo.tipo];
  if (!f || amb.puntos.length < 3) return null;
  try { return f(amb); } catch (e) { console.error(e); return null; }
}

export function calcularTodo(proyecto) {
  const secciones = [];
  for (const amb of proyecto.ambientes) {
    const r = calcularCielo(amb);
    if (r) secciones.push({ titulo: `Cielo ${NOMBRE_CIELO[amb.cielo.tipo].toLowerCase()} · ${amb.nombre}`, ...r });
  }
  const muros = calcularMuros(proyecto);
  if (muros.lista.length) secciones.push({
    titulo: 'Muros y tabiques', lista: muros.lista,
    resumen: [['Tabiques drywall', muros.areaTabique, 'm²'], ['Muros prefabricados', muros.areaPrefab, 'm²']],
    detalle: muros.filas.map((f, i) => `Muro ${i + 1} (${f.sistema}): ${f.largo.toFixed(2)} × ${f.altura.toFixed(2)} m, ${f.vanos} vano(s) → ${f.area.toFixed(2)} m² netos`),
  });
  const techo = calcularTecho(proyecto);
  if (techo) secciones.push({ titulo: 'Techo y tijerales', ...techo });

  // Totales por material.
  const acumulado = new Map();
  for (const s of secciones) for (const it of s.lista) {
    const a = acumulado.get(it.codigo) || { consumo: 0, venta: 0 };
    if (it.enVenta) a.venta += it.cantidad; else a.consumo += it.cantidad;
    acumulado.set(it.codigo, a);
  }
  const filas = [];
  for (const m of catalogo()) {
    const a = acumulado.get(m.codigo);
    if (!a) continue;
    const cantidad = a.venta + Math.ceil(a.consumo / m.rinde - 1e-9);
    if (cantidad <= 0 && a.consumo <= 0) continue;
    const esMO = m.grupo === 'Mano de obra';
    const cant = esMO ? Math.round((a.venta + a.consumo) * 100) / 100 : cantidad;
    filas.push({ ...m, cantidad: cant, necesario: a.consumo, subtotal: cant * m.precio, esMO });
  }
  const p = proyecto.presupuesto;
  const materiales = filas.filter(f => !f.esMO).reduce((s, f) => s + f.subtotal, 0);
  const manoObra = p.incluirMO ? filas.filter(f => f.esMO).reduce((s, f) => s + f.subtotal, 0) : 0;
  const transporte = +p.transporte || 0;
  const costo = materiales + manoObra + transporte;
  const margen = costo * (+p.margen || 0) / 100;
  const subtotal = costo + margen;
  const igv = p.igv ? subtotal * 0.18 : 0;
  return { secciones, filas, totales: { materiales, manoObra, transporte, margen, subtotal, igv, total: subtotal + igv } };
}

export { material };
