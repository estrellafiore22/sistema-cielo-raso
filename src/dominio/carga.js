// Cuánta obra cabe en un día.
//
// Contar trabajadores libres no alcanza: no es lo mismo mandar un equipo a
// 15 m² de cielo raso vinil que a 60 m² de división. El dueño lo dijo con
// números: 20 m² de vinil se hacen en media jornada, así que ese día entran
// dos trabajos; una división de 40 m² se come el día entero y entra una sola.
//
// De ahí sale la regla: cada tipo de trabajo tiene una CAPACIDAD DIARIA en m²
// por equipo. Un trabajo ocupa la fracción de día que le corresponde y el día
// se llena cuando se agota esa capacidad. Encima va un tope de trabajos por
// día, porque el tiempo de traslado no se recupera aunque las obras sean
// chicas.

import * as bd from '../core/bd.js';

const POR_DEFECTO = {
  // m² que un equipo termina en una jornada, por tipo de trabajo.
  capacidad: {
    suspendido: 40,
    cielo_raso: 40,
    division: 40,
    cielo_raso_humedad: 30,
  },
  // Capacidad de un tipo de trabajo no listado arriba.
  capacidadGeneral: 40,
  // Traslado, carga y descarga: más de esto no rinde por más chico que sea.
  maxTrabajosPorDia: 2,
};

export function config() {
  const guardada = bd.config('carga', {});
  return {
    ...POR_DEFECTO,
    ...guardada,
    capacidad: { ...POR_DEFECTO.capacidad, ...(guardada.capacidad || {}) },
  };
}

export function guardarConfig(cambios) {
  const actual = config();
  const nueva = { ...actual, ...cambios };
  nueva.capacidad = { ...actual.capacidad, ...(cambios.capacidad || {}) };
  nueva.capacidadGeneral = Number(nueva.capacidadGeneral) || POR_DEFECTO.capacidadGeneral;
  nueva.maxTrabajosPorDia =
    Number(nueva.maxTrabajosPorDia) || POR_DEFECTO.maxTrabajosPorDia;
  for (const [clave, valor] of Object.entries(nueva.capacidad)) {
    nueva.capacidad[clave] = Number(valor) || POR_DEFECTO.capacidadGeneral;
  }
  bd.guardarConfig('carga', nueva);
  return nueva;
}

/** m² que un equipo hace en un día para ese tipo de trabajo. */
export function capacidadDe(recetaId) {
  const cfg = config();
  return Number(cfg.capacidad[recetaId]) || cfg.capacidadGeneral;
}

/**
 * Qué fracción de la jornada se lleva un trabajo. Un trabajo más grande que la
 * capacidad se lleva el día entero: se reparte en varios días, pero para
 * efectos de "¿cabe otro hoy?" el día ya está tomado.
 */
export function fraccionDeDia(recetaId, metrosCuadrados) {
  const m2 = Number(metrosCuadrados) || 0;
  if (m2 <= 0) return 0;
  return Math.min(1, m2 / capacidadDe(recetaId));
}

/** Los trabajos de un día, sacados de las asignaciones de personal. */
export function trabajosDelDia(dia) {
  const asignaciones = bd.todos('asignaciones').filter((a) => a.dia === dia && a.pedido);
  const vistos = new Set();
  const salida = [];

  for (const a of asignaciones) {
    if (vistos.has(a.pedido)) continue;
    vistos.add(a.pedido);

    const pedido = bd.buscarPorId('pedidos', a.pedido);
    if (!pedido || pedido.estado === 'cancelado') continue;

    const trabajo = pedido.cotizacion?.trabajo;
    salida.push({
      pedido: pedido.id,
      codigo: pedido.codigo,
      cliente: pedido.cliente?.nombre || '',
      recetaId: trabajo?.id || null,
      nombre: trabajo?.nombre || 'Material',
      metrosCuadrados: Number(trabajo?.metrosCuadrados) || 0,
      fraccion: fraccionDeDia(trabajo?.id, trabajo?.metrosCuadrados),
    });
  }
  return salida;
}

/** Cuánto del día ya está comprometido. */
export function cargaDia(dia) {
  const trabajos = trabajosDelDia(dia);
  const usado = trabajos.reduce((suma, t) => suma + t.fraccion, 0);
  return {
    dia,
    trabajos,
    cantidad: trabajos.length,
    jornadasUsadas: usado,
    jornadasLibres: Math.max(0, 1 - usado),
    maxTrabajos: config().maxTrabajosPorDia,
  };
}

/**
 * ¿Entra un trabajo más ese día?
 * @returns {{cabe:boolean, motivo:string|null, carga:object}}
 */
export function cabeTrabajo(dia, { recetaId, metrosCuadrados } = {}) {
  const carga = cargaDia(dia);

  if (carga.cantidad >= carga.maxTrabajos) {
    return {
      cabe: false,
      motivo: `Ya hay ${carga.cantidad} trabajos ese día`,
      carga,
    };
  }

  const pide = fraccionDeDia(recetaId, metrosCuadrados);
  // Un pedido sin m² (material suelto) no ocupa jornada de obra.
  if (pide === 0) return { cabe: true, motivo: null, carga };

  // Margen de un centímetro cuadrado para que 20 + 20 sobre 40 no se caiga por
  // el redondeo del punto flotante.
  if (pide > carga.jornadasLibres + 1e-9) {
    return {
      cabe: false,
      motivo: `Ese día ya tiene ${Math.round(carga.jornadasUsadas * 100)}% de jornada tomada`,
      carga,
    };
  }
  return { cabe: true, motivo: null, carga };
}
