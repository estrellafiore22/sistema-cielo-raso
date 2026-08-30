// Piezas que comparten las tres modalidades de venta: transporte, descuento,
// margen de la tienda y las variantes de plancha de la división.

import * as transporte from './transporte.js';
import * as divisiones from './divisiones.js';
import * as divisionReceta from './division-receta.js';
import { redondear } from '../core/formato.js';

export const MODALIDADES = {
  CON_MANO_OBRA: 'con_mano_obra',
  SOLO_MATERIAL_COMPLETO: 'solo_material_completo',
  MATERIAL_SUELTO: 'material_suelto',
};

export const NOMBRES_MODALIDAD = {
  [MODALIDADES.CON_MANO_OBRA]: 'Instalación con mano de obra',
  [MODALIDADES.SOLO_MATERIAL_COMPLETO]: 'Solo material, paquete completo',
  [MODALIDADES.MATERIAL_SUELTO]: 'Material suelto por unidad',
};



/**
 * La división se hace con distintas planchas y cada una tiene su precio por m²
 * instalado. Devuelve las líneas ya resueltas y la tarifa, o null si el tipo
 * de trabajo no tiene variantes.
 */
export function variantePedida(pedido) {
  if (pedido.recetaId !== divisiones.RECETA_BASE) return null;

  const lijado = Boolean(pedido.lijado);
  const armada = divisionReceta.lineas(pedido.variante, lijado);
  if (!armada.ok) return null;

  // El lijado no viene incluido: se cobra encima del precio de la plancha.
  const precioM2 =
    Number(armada.variante.precioM2) + (lijado ? divisiones.recargoLijado() : 0);

  return {
    lineas: armada.lineas,
    lijado,
    tarifa: { ...armada.variante, precioM2: redondear(precioM2) },
  };
}

export function resolverTransporte(pedido) {
  if (!pedido.transporte) return transporte.sinTransporte();
  const resultado = transporte.calcular(pedido.transporte.km, {
    idaYVuelta: pedido.transporte.idaYVuelta,
    recargo: pedido.transporte.recargo,
  });
  return resultado.ok ? resultado.transporte : transporte.sinTransporte();
}

export function armarCuenta(subtotal, costoTransporte, descuentoPedido) {
  const descuento = Math.max(0, Number(descuentoPedido) || 0);
  const bruto = redondear(subtotal + costoTransporte);
  const total = redondear(Math.max(0, bruto - descuento));
  return { subtotal: redondear(subtotal), descuento, total };
}

export function calcularMargen(total, costoMaterial, manoObra, envio, piso = null) {
  // El transporte se trata como ingreso, no como ganancia: cubre combustible y
  // tiempo. Se descuenta entero para no inflar el margen aparente.
  const ingresoNeto = redondear(total - envio.total);
  const costos = redondear(costoMaterial + manoObra);
  const ganancia = redondear(ingresoNeto - costos);
  const porcentaje = ingresoNeto > 0 ? redondear((ganancia / ingresoNeto) * 100, 1) : 0;

  return {
    ganancia,
    margenPorcentaje: porcentaje,
    // El mismo cuadro que ya mostraba el cielo raso vinil, para que todos los
    // tipos de trabajo terminen diciendo qué le queda a la tienda.
    cuentaTienda: {
      cobradoAlCliente: ingresoNeto,
      materiales: costoMaterial,
      manoObra,
      transporte: envio.total,
      ganancia: redondear(ganancia + envio.total),
      cobroMinimo: piso,
    },
  };
}
