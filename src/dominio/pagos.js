// Pagos: Yape o transferencia bancaria, con adelanto o pago completo.
//
// Regla del negocio, sin excepciones: NO se acepta un pedido sin pago. O el
// cliente adelanta al menos el mínimo configurado, o paga todo.

import * as bd from '../core/bd.js';
import { redondear } from '../core/formato.js';
import { emitir } from '../core/bus.js';

export const METODOS = {
  YAPE: 'yape',
  TRANSFERENCIA: 'transferencia',
  // Solo para pedidos tomados en el mostrador: el cliente paga ahí mismo.
  // No se ofrece cuando el pedido lo hace el cliente desde su cuenta.
  TIENDA: 'tienda',
};

export const NOMBRES_METODO = {
  [METODOS.YAPE]: 'Yape',
  [METODOS.TRANSFERENCIA]: 'Transferencia bancaria',
  [METODOS.TIENDA]: 'Pago en tienda',
};

/** Métodos que puede usar quien está tomando el pedido. */
export function metodosDisponibles({ enMostrador }) {
  return Object.values(METODOS).filter(
    (m) => m !== METODOS.TIENDA || enMostrador,
  );
}

export const TIPOS = {
  ADELANTO: 'adelanto',
  COMPLETO: 'completo',
};

/** Datos de cobro de la tienda, para mostrarlos al cliente al pagar. */
export function datosCobro() {
  const tienda = bd.config('tienda', {});
  return {
    yape: tienda.yape || '',
    banco: tienda.bancoNombre || '',
    cuenta: tienda.bancoCuenta || '',
    cci: tienda.bancoCci || '',
    titular: tienda.nombre || '',
  };
}

export function adelantoMinimoPct() {
  const config = bd.config('operacion', { adelantoMinimoPct: 30 });
  return Number(config.adelantoMinimoPct) || 0;
}

/** Monto mínimo en soles que hay que adelantar para un total dado. */
export function adelantoMinimo(total) {
  return redondear(((Number(total) || 0) * adelantoMinimoPct()) / 100);
}

/**
 * Valida un pago antes de aceptar el pedido.
 * Devuelve el desglose de lo pagado y lo que queda por cobrar en la entrega.
 */
export function validar({ total, tipo, monto, metodo, operacion, comprobante }) {
  const totalPedido = Number(total) || 0;
  if (totalPedido <= 0) {
    return { ok: false, error: 'El total del pedido no es válido' };
  }

  if (!Object.values(METODOS).includes(metodo)) {
    return { ok: false, error: 'Elige Yape o transferencia bancaria' };
  }

  // El pago en tienda no deja código de operación: el comprobante es el
  // efectivo en caja.
  if (metodo !== METODOS.TIENDA && !String(operacion || '').trim() && !comprobante) {
    return {
      ok: false,
      error: 'Ingresa el número de operación o adjunta la captura del pago',
    };
  }

  if (tipo === TIPOS.COMPLETO) {
    return {
      ok: true,
      pago: construir({
        tipo,
        metodo,
        operacion,
        comprobante,
        pagado: totalPedido,
        total: totalPedido,
      }),
    };
  }

  if (tipo === TIPOS.ADELANTO) {
    const pagado = Number(monto);
    if (!Number.isFinite(pagado) || pagado <= 0) {
      return { ok: false, error: 'Ingresa el monto del adelanto' };
    }
    const minimo = adelantoMinimo(totalPedido);
    if (pagado < minimo) {
      return {
        ok: false,
        error: `El adelanto mínimo es ${adelantoMinimoPct()}% del total`,
        minimo,
      };
    }
    if (pagado > totalPedido) {
      return { ok: false, error: 'El adelanto no puede ser mayor al total' };
    }
    return {
      ok: true,
      pago: construir({ tipo, metodo, operacion, comprobante, pagado, total: totalPedido }),
    };
  }

  // Cualquier otra cosa, incluido "sin pago", se rechaza.
  return {
    ok: false,
    error: 'No se puede registrar un pedido sin pago. Elige adelanto o pago completo.',
  };
}

function construir({ tipo, metodo, operacion, comprobante, pagado, total }) {
  const saldo = redondear(total - pagado);
  return {
    tipo,
    metodo,
    nombreMetodo: NOMBRES_METODO[metodo],
    operacion: String(operacion || '').trim(),
    // Captura de la transferencia o del Yape, guardada con el pedido.
    comprobante: comprobante || null,
    total: redondear(total),
    pagado: redondear(pagado),
    saldo,
    // Esto es lo que el chofer cobra al llegar. Va impreso en la boleta interna.
    cobrarEnEntrega: saldo,
    liquidado: saldo <= 0,
    fecha: new Date().toISOString(),
  };
}

/** Guarda el pago asociado a un pedido y lo deja en el historial. */
export function registrar(pedidoId, pago) {
  const registro = bd.insertar('pagos', { ...pago, pedido: pedidoId });
  emitir('pago:registrado', registro);
  return registro;
}

/** Cobro del saldo al momento de la entrega. */
export function registrarSaldo(pedidoId, { metodo, operacion = '', monto }) {
  const pedido = bd.buscarPorId('pedidos', pedidoId);
  if (!pedido) return { ok: false, error: 'El pedido no existe' };

  const porCobrar = Number(pedido.pago?.saldo) || 0;
  if (porCobrar <= 0) return { ok: false, error: 'Ese pedido ya está pagado' };

  const cobrado = Number(monto);
  if (!Number.isFinite(cobrado) || cobrado <= 0) {
    return { ok: false, error: 'El monto no es válido' };
  }

  const nuevoSaldo = redondear(porCobrar - cobrado);
  const pagoActualizado = {
    ...pedido.pago,
    pagado: redondear((Number(pedido.pago.pagado) || 0) + cobrado),
    saldo: nuevoSaldo,
    cobrarEnEntrega: Math.max(0, nuevoSaldo),
    liquidado: nuevoSaldo <= 0,
  };

  bd.actualizar('pedidos', pedidoId, { pago: pagoActualizado });
  registrar(pedidoId, {
    tipo: 'saldo',
    metodo,
    nombreMetodo: NOMBRES_METODO[metodo] || metodo,
    operacion,
    pagado: cobrado,
    saldo: nuevoSaldo,
    fecha: new Date().toISOString(),
  });

  return { ok: true, pago: pagoActualizado };
}

export function historial(pedidoId) {
  return bd
    .donde('pagos', { pedido: pedidoId })
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}
