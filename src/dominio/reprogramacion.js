// Reprogramar un trabajo: el equipo suspende la obra y se pasa a otra fecha.
//
// Mover la fecha no basta: hay que llamar al cliente. Por eso queda anotado
// quién se movió y a qué día, y el aviso no se da por hecho hasta que alguien
// lo marca. Esa lista es la que sale en Inicio con el teléfono al lado.

import * as bd from '../core/bd.js';
import * as personal from './personal.js';
import { claveDia } from '../core/formato.js';

/**
 * Mueve un trabajo a otro día: el trabajador suspende la obra y se pasa la
 * fecha. Se mueven todas las asignaciones del pedido y queda anotado en el
 * pedido, para poder llamar al cliente y avisarle.
 */
export function reprogramar(pedidoId, nuevoDia, motivo = '') {
  const pedido = bd.buscarPorId('pedidos', pedidoId);
  if (!pedido) return { ok: false, error: 'Ese pedido no existe' };
  if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
    return { ok: false, error: 'Ese pedido ya está cerrado' };
  }

  const clave = claveDia(nuevoDia);
  const anterior = pedido.entrega?.fecha || null;
  if (clave === anterior) {
    return { ok: false, error: 'Es el mismo día que ya tenía' };
  }

  const asignaciones = bd.donde('asignaciones', { pedido: pedidoId });

  // Nadie puede estar dos veces el mismo día. Si el trabajador ya tiene otra
  // obra en la fecha nueva, se avisa antes de mover nada.
  for (const a of asignaciones) {
    if (ocupadoEse(clave, a.trabajador)) {
      const quien = personal.obtener(a.trabajador);
      return {
        ok: false,
        error: `${quien ? quien.nombre : 'Un trabajador'} ya tiene otra obra ese día`,
      };
    }
  }

  for (const a of asignaciones) bd.actualizar('asignaciones', a.id, { dia: clave });

  const historial = Array.isArray(pedido.reprogramaciones) ? pedido.reprogramaciones : [];
  const actualizado = bd.actualizar('pedidos', pedidoId, {
    entrega: { ...pedido.entrega, fecha: clave },
    reprogramaciones: [
      ...historial,
      {
        de: anterior,
        a: clave,
        motivo: String(motivo || '').trim(),
        cuando: new Date().toISOString(),
        avisado: false,
      },
    ],
  });

  return { ok: true, pedido: actualizado, asignacionesMovidas: asignaciones.length };
}

/** Pedidos movidos de fecha a los que todavía no se les avisó al cliente. */
export function reprogramadosSinAvisar() {
  return bd
    .todos('pedidos')
    .filter((p) => Array.isArray(p.reprogramaciones) && p.reprogramaciones.length > 0)
    .filter((p) => p.estado !== 'cancelado' && p.estado !== 'entregado')
    .map((p) => ({ pedido: p, ultima: p.reprogramaciones[p.reprogramaciones.length - 1] }))
    .filter((x) => !x.ultima.avisado)
    .sort((a, b) => String(b.ultima.cuando).localeCompare(String(a.ultima.cuando)));
}

/** El dueño llamó al cliente: deja de aparecer en Inicio. */
export function marcarAvisado(pedidoId) {
  const pedido = bd.buscarPorId('pedidos', pedidoId);
  if (!pedido || !Array.isArray(pedido.reprogramaciones)) {
    return { ok: false, error: 'Ese pedido no tiene reprogramaciones' };
  }
  const historial = pedido.reprogramaciones.map((r, i) =>
    i === pedido.reprogramaciones.length - 1 ? { ...r, avisado: true } : r,
  );
  bd.actualizar('pedidos', pedidoId, { reprogramaciones: historial });
  return { ok: true };
}

function ocupadoEse(dia, trabajadorId) {
  return bd.todos('asignaciones').some((a) => a.dia === dia && a.trabajador === trabajadorId);
}
