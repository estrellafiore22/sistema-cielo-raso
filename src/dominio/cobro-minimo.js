// Cobro mínimo de una salida con mano de obra.
//
// Una obra de 3 × 2 m se cotiza correcta y aun así deja a la tienda en cero:
// el equipo se traslada, carga, monta y vuelve igual que en una obra grande,
// y ese costo no baja con los metros. Por eso un trabajo instalado nunca se
// cobra por debajo de este piso.
//
// Solo aplica a la venta CON MANO DE OBRA. Vender material suelto o el paquete
// completo no manda gente a ningún lado, así que ahí no hay piso que poner.

import * as bd from '../core/bd.js';

const POR_DEFECTO = 250;

export function minimo() {
  const cfg = bd.config('operacion', {});
  const valor = Number(cfg.cobroMinimo);
  return Number.isFinite(valor) && valor >= 0 ? valor : POR_DEFECTO;
}

/**
 * Sube el cobro al piso si se quedó corto.
 * @returns {{base:number, aplico:boolean, minimo:number}}
 */
export function aplicar(base, conManoObra) {
  const piso = minimo();
  if (!conManoObra || !(piso > 0) || base >= piso) {
    return { base, aplico: false, minimo: piso };
  }
  return { base: piso, aplico: true, minimo: piso };
}
