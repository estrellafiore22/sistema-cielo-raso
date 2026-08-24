// Calendario de trabajo.
//
// Responde dos preguntas que el dueño pidió explícitamente:
//   1. ¿Qué días ya está trabajando el personal y en qué trabajo?
//   2. ¿Queda gente libre ese día para mandar a otro trabajo?
//
// Y de ahí sale la tercera: qué días puede elegir un cliente al pedir.

import * as bd from '../core/bd.js';
import * as personal from './personal.js';
import { claveDia, hoy } from '../core/formato.js';

/** Una asignación = un trabajador ocupado un día en un pedido. */
export function asignar({ dia, trabajadorId, pedidoId, nota = '' }) {
  const clave = claveDia(dia);

  if (!personal.obtener(trabajadorId)) {
    return { ok: false, error: 'Ese trabajador no existe' };
  }
  if (yaAsignado(clave, trabajadorId)) {
    return { ok: false, error: 'Ese trabajador ya está asignado ese día' };
  }

  const asignacion = bd.insertar('asignaciones', {
    dia: clave,
    trabajador: trabajadorId,
    pedido: pedidoId || null,
    nota,
  });
  return { ok: true, asignacion };
}

export function liberar(asignacionId) {
  return bd.eliminar('asignaciones', asignacionId)
    ? { ok: true }
    : { ok: false, error: 'Esa asignación no existe' };
}

/** Quita a todo el personal asignado a un pedido. Al cancelarlo, por ejemplo. */
export function liberarPedido(pedidoId) {
  const asignaciones = bd.donde('asignaciones', { pedido: pedidoId });
  for (const a of asignaciones) bd.eliminar('asignaciones', a.id);
  return asignaciones.length;
}

function yaAsignado(dia, trabajadorId) {
  return bd
    .todos('asignaciones')
    .some((a) => a.dia === dia && a.trabajador === trabajadorId);
}

// --- Estado de un día -------------------------------------------------------

/**
 * Todo lo que hay que saber de un día:
 * quién trabaja, en qué, cuánta gente queda libre y si se puede pedir.
 */
export function estadoDia(dia) {
  const clave = claveDia(dia);
  const asignaciones = bd.todos('asignaciones').filter((a) => a.dia === clave);
  const activos = personal.listar({ soloActivos: true });

  const ocupadosIds = new Set(asignaciones.map((a) => a.trabajador));
  const ocupados = activos.filter((t) => ocupadosIds.has(t.id));
  const libres = activos.filter((t) => !ocupadosIds.has(t.id));

  // Trabajos distintos activos ese día
  const trabajos = new Map();
  for (const a of asignaciones) {
    const clavePedido = a.pedido || 'sin_pedido';
    if (!trabajos.has(clavePedido)) trabajos.set(clavePedido, []);
    const trabajador = personal.obtener(a.trabajador);
    trabajos.get(clavePedido).push({
      asignacionId: a.id,
      trabajadorId: a.trabajador,
      nombre: trabajador ? trabajador.nombre : '(trabajador eliminado)',
      especialidad: trabajador ? trabajador.especialidad : '—',
      nota: a.nota,
    });
  }

  const config = bd.config('operacion', {
    personalPorTrabajo: 2,
    diasAnticipacion: 1,
  });
  const porTrabajo = Number(config.personalPorTrabajo) || 1;

  return {
    dia: clave,
    totalPersonal: activos.length,
    ocupados: ocupados.length,
    libres: libres.length,
    personalLibre: libres,
    personalOcupado: ocupados,
    trabajos: Array.from(trabajos.entries()).map(([pedido, equipo]) => ({
      pedido: pedido === 'sin_pedido' ? null : pedido,
      equipo,
    })),
    // ¿Alcanza la gente libre para mandar otro equipo completo?
    cabeOtroTrabajo: libres.length >= porTrabajo,
    equiposDisponibles: Math.floor(libres.length / porTrabajo),
    bloqueado: esBloqueado(clave),
  };
}

/**
 * Días bloqueados a mano por el administrador: feriados, inventario,
 * mantenimiento de camioneta.
 */
export function bloquear(dia, motivo = '') {
  const bloqueados = bd.config('diasBloqueados', {});
  bloqueados[claveDia(dia)] = motivo || 'No disponible';
  bd.guardarConfig('diasBloqueados', bloqueados);
  return { ok: true };
}

export function desbloquear(dia) {
  const bloqueados = bd.config('diasBloqueados', {});
  delete bloqueados[claveDia(dia)];
  bd.guardarConfig('diasBloqueados', bloqueados);
  return { ok: true };
}

export function esBloqueado(dia) {
  const bloqueados = bd.config('diasBloqueados', {});
  return bloqueados[claveDia(dia)] || null;
}

// --- Disponibilidad para pedidos --------------------------------------------

/**
 * ¿Puede un cliente pedir para este día?
 * Necesita: no estar bloqueado, respetar la anticipación mínima y tener
 * equipo libre si el pedido lleva mano de obra.
 */
export function disponibleParaPedido(dia, { requiereEquipo = true } = {}) {
  const clave = claveDia(dia);
  const config = bd.config('operacion', { diasAnticipacion: 1 });

  const bloqueo = esBloqueado(clave);
  if (bloqueo) return { disponible: false, motivo: bloqueo };

  const minimo = new Date();
  minimo.setDate(minimo.getDate() + (Number(config.diasAnticipacion) || 0));
  if (clave < claveDia(minimo)) {
    const dias = Number(config.diasAnticipacion) || 0;
    return {
      disponible: false,
      motivo:
        dias === 0
          ? 'Fecha pasada'
          : `Se necesita ${dias} día(s) de anticipación`,
    };
  }

  if (!requiereEquipo) return { disponible: true, motivo: null };

  const estado = estadoDia(clave);
  if (estado.totalPersonal === 0) {
    return { disponible: false, motivo: 'No hay personal registrado' };
  }
  if (!estado.cabeOtroTrabajo) {
    return { disponible: false, motivo: 'Todo el personal ya está ocupado' };
  }
  return {
    disponible: true,
    motivo: null,
    equiposDisponibles: estado.equiposDisponibles,
  };
}

/** Los próximos N días con su estado, para pintar el calendario. */
export function proximosDias(cantidad = 30, opciones = {}) {
  const salida = [];
  const cursor = new Date();
  for (let i = 0; i < cantidad; i += 1) {
    const clave = claveDia(cursor);
    salida.push({
      dia: clave,
      esHoy: clave === hoy(),
      ...estadoDia(clave),
      disponibilidad: disponibleParaPedido(clave, opciones),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return salida;
}
