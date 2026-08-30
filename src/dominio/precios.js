// Motor de cotización. Tres modalidades de venta.
//
//   1. CON_MANO_OBRA          se cobra el m² instalado: material + obra
//   2. SOLO_MATERIAL_COMPLETO se venden m² de material, sin instalación
//   3. MATERIAL_SUELTO        el cliente arma su lista del catálogo
//
// Cada cotización devuelve DOS vistas del mismo cálculo:
//   - `cliente`: lo que el cliente puede ver
//   - `interno`: lo que solo ve el administrador (costos, despiece, origen
//                del material, margen)
//
// La diferencia importa sobre todo en SOLO_MATERIAL_COMPLETO, donde el dueño
// pidió que la boleta del cliente muestre únicamente los metros cuadrados.

import * as suspendido from './precios-suspendido.js';
import { cotizarConManoObra, cotizarMaterialCompleto } from './precios-obra.js';
import { cotizarMaterialSuelto } from './precios-suelto.js';
// Las modalidades viven en precios-comun.js: las necesitan los tres motores y
// definirlas aquí crearía una dependencia circular. Se importan para poder
// usarlas en este archivo y se vuelven a exportar para el resto del sistema.
import {
  resolverTransporte,
  armarCuenta,
  MODALIDADES,
  NOMBRES_MODALIDAD,
} from './precios-comun.js';

export { MODALIDADES, NOMBRES_MODALIDAD };


/**
 * El cielo raso suspendido 61 × 61 es un TIPO DE TRABAJO, no una modalidad:
 * se puede vender con mano de obra o solo el material, igual que un cielo raso
 * de drywall. Se reconoce por este identificador en `recetaId`.
 */
export const TRABAJO_SUSPENDIDO = suspendido.CLAVE;


/**
 * Punto de entrada único.
 *
 * @param {object} pedido
 *   - modalidad
 *   - recetaId, metrosCuadrados      (modalidades 1 y 2)
 *   - items: [{material, cantidad}]  (modalidad 3)
 *   - desperdicioExtra               porcentaje opcional
 *   - transporte: {km, idaYVuelta, recargo} o null si recoge en tienda
 *   - descuento                      monto fijo en soles
 */
export function cotizar(pedido) {
  // El 61 × 61 tiene su propio motor de cálculo, pero se vende con las mismas
  // modalidades que el resto.
  if (pedido.recetaId === TRABAJO_SUSPENDIDO) {
    return suspendido.cotizar(
      { ...pedido, conManoObra: pedido.modalidad === MODALIDADES.CON_MANO_OBRA },
      resolverTransporte,
      armarCuenta,
    );
  }

  switch (pedido.modalidad) {
    case MODALIDADES.CON_MANO_OBRA:
      return cotizarConManoObra(pedido);
    case MODALIDADES.SOLO_MATERIAL_COMPLETO:
      return cotizarMaterialCompleto(pedido);
    case MODALIDADES.MATERIAL_SUELTO:
      return cotizarMaterialSuelto(pedido);
    default:
      return { ok: false, error: 'Modalidad de venta no reconocida' };
  }
}
