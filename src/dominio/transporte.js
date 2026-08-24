// Costo de transporte según la distancia entre la tienda y el lugar del trabajo.
//
// La distancia puede venir de Google Maps (src/integraciones/mapas.js) o
// escribirse a mano. El cálculo del precio es el mismo en ambos casos, así que
// vive aquí y no depende del mapa.

import * as bd from '../core/bd.js';
import { redondear } from '../core/formato.js';

export function tarifas() {
  return bd.config('transporte', {
    tarifaBase: 20,
    porKm: 2.5,
    kmLibres: 3,
    minimo: 20,
  });
}

export function guardarTarifas(nuevas) {
  const actuales = tarifas();
  const mezcla = {
    tarifaBase: numeroValido(nuevas.tarifaBase, actuales.tarifaBase),
    porKm: numeroValido(nuevas.porKm, actuales.porKm),
    kmLibres: numeroValido(nuevas.kmLibres, actuales.kmLibres),
    minimo: numeroValido(nuevas.minimo, actuales.minimo),
  };
  bd.guardarConfig('transporte', mezcla);
  return { ok: true, tarifas: mezcla };
}

/**
 * Calcula el costo de una salida.
 *
 * @param {number} km          distancia de la tienda al lugar
 * @param {object} opciones
 *   - ida y vuelta: por defecto se cobra solo la ida; poner idaYVuelta:true
 *     para duplicar los kilómetros cobrables
 *   - recargo: monto fijo extra (zona difícil, escaleras, horario)
 */
export function calcular(km, opciones = {}) {
  const distancia = Number(km);
  if (!Number.isFinite(distancia) || distancia < 0) {
    return { ok: false, error: 'La distancia no es válida' };
  }

  const t = tarifas();
  const { idaYVuelta = false, recargo = 0 } = opciones;

  const kmCobrables = Math.max(0, distancia - (Number(t.kmLibres) || 0));
  const kmFacturados = idaYVuelta ? kmCobrables * 2 : kmCobrables;

  const porDistancia = redondear(kmFacturados * (Number(t.porKm) || 0));
  const base = Number(t.tarifaBase) || 0;
  const extra = Number(recargo) || 0;
  const bruto = redondear(base + porDistancia + extra);
  const total = Math.max(bruto, Number(t.minimo) || 0);

  return {
    ok: true,
    transporte: {
      km: redondear(distancia, 2),
      kmLibres: Number(t.kmLibres) || 0,
      kmCobrables: redondear(kmFacturados, 2),
      idaYVuelta,
      tarifaBase: base,
      porKm: Number(t.porKm) || 0,
      costoDistancia: porDistancia,
      recargo: extra,
      aplicoMinimo: total > bruto,
      total: redondear(total),
    },
  };
}

/** Estructura vacía para pedidos donde el cliente recoge en tienda. */
export function sinTransporte() {
  return {
    km: 0,
    kmCobrables: 0,
    tarifaBase: 0,
    porKm: 0,
    costoDistancia: 0,
    recargo: 0,
    total: 0,
    recogeEnTienda: true,
  };
}

/**
 * Datos de entrega que acompañan al transporte. La dirección exacta y las
 * referencias son obligatorias porque salen impresas en la boleta interna del
 * administrador: es lo que el chofer usa para llegar.
 */
export function validarEntrega(entrega) {
  if (!entrega) return { ok: false, error: 'Faltan los datos de entrega' };
  if (!String(entrega.direccion || '').trim()) {
    return { ok: false, error: 'La dirección exacta es obligatoria' };
  }
  if (!entrega.fecha) {
    return { ok: false, error: 'Elige la fecha de entrega' };
  }
  if (!entrega.hora) {
    return { ok: false, error: 'Elige la hora de entrega' };
  }
  return { ok: true };
}

function numeroValido(valor, porDefecto) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
}
