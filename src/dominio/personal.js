// Trabajadores de la tienda. El calendario los reparte entre los trabajos.

import * as bd from '../core/bd.js';

export const ESPECIALIDADES = [
  'maestro',
  'ayudante',
  'empastador',
  'chofer',
];

export function listar({ soloActivos = true } = {}) {
  const lista = bd.todos('personal');
  return (soloActivos ? lista.filter((p) => p.activo !== false) : lista).sort(
    (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export function obtener(id) {
  return bd.buscarPorId('personal', id);
}

export function crear({ nombre, especialidad = 'ayudante', telefono = '', pagoDiario = 0 }) {
  if (!String(nombre || '').trim()) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }
  const trabajador = bd.insertar('personal', {
    nombre: String(nombre).trim(),
    especialidad: ESPECIALIDADES.includes(especialidad) ? especialidad : 'ayudante',
    telefono: String(telefono).trim(),
    pagoDiario: Number(pagoDiario) || 0,
    activo: true,
  });
  return { ok: true, trabajador };
}

export function editar(id, cambios) {
  if (cambios.nombre !== undefined && !String(cambios.nombre).trim()) {
    return { ok: false, error: 'El nombre no puede quedar vacío' };
  }
  const trabajador = bd.actualizar('personal', id, {
    ...cambios,
    ...(cambios.pagoDiario !== undefined
      ? { pagoDiario: Number(cambios.pagoDiario) || 0 }
      : {}),
  });
  return trabajador
    ? { ok: true, trabajador }
    : { ok: false, error: 'El trabajador no existe' };
}

/** No se borra: se desactiva, para no perder el historial de asignaciones. */
export function desactivar(id) {
  const trabajador = bd.actualizar('personal', id, { activo: false });
  return trabajador
    ? { ok: true, trabajador }
    : { ok: false, error: 'El trabajador no existe' };
}

export function reactivar(id) {
  const trabajador = bd.actualizar('personal', id, { activo: true });
  return trabajador
    ? { ok: true, trabajador }
    : { ok: false, error: 'El trabajador no existe' };
}

export function totalActivos() {
  return listar({ soloActivos: true }).length;
}
