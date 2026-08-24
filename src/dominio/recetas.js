// Recetas de consumo por m². El administrador las edita y eso cambia todas las
// cotizaciones futuras. Las cotizaciones ya emitidas guardan su propia copia
// del despiece, así que no se alteran hacia atrás.

import * as bd from '../core/bd.js';
import { obtener as obtenerMaterial } from './materiales.js';

export function listar() {
  return bd.todos('recetas');
}

export function obtener(id) {
  return bd.buscarPorId('recetas', id);
}

/** Recetas con el detalle de cada material resuelto, para mostrarlas. */
export function detallada(id) {
  const receta = obtener(id);
  if (!receta) return null;
  return {
    ...receta,
    lineas: receta.lineas.map((linea) => ({
      ...linea,
      materialDatos: obtenerMaterial(linea.material),
    })),
  };
}

export function guardar(receta) {
  const validacion = validar(receta);
  if (!validacion.ok) return validacion;
  const guardada = bd.guardar('recetas', {
    ...receta,
    manoObraPorM2: Number(receta.manoObraPorM2) || 0,
    lineas: receta.lineas.map((l) => ({
      material: l.material,
      porM2: Number(l.porM2) || 0,
      nota: l.nota || '',
    })),
  });
  return { ok: true, receta: guardada };
}

/** Cambia el consumo de una sola línea. Es la edición más frecuente. */
export function editarLinea(recetaId, materialId, porM2) {
  const receta = obtener(recetaId);
  if (!receta) return { ok: false, error: 'La receta no existe' };

  const consumo = Number(porM2);
  if (!Number.isFinite(consumo) || consumo < 0) {
    return { ok: false, error: 'El consumo no es válido' };
  }

  const lineas = receta.lineas.map((l) =>
    l.material === materialId ? { ...l, porM2: consumo } : l,
  );
  return guardar({ ...receta, lineas });
}

export function agregarLinea(recetaId, materialId, porM2, nota = '') {
  const receta = obtener(recetaId);
  if (!receta) return { ok: false, error: 'La receta no existe' };
  if (!obtenerMaterial(materialId)) {
    return { ok: false, error: 'Ese material no existe' };
  }
  if (receta.lineas.some((l) => l.material === materialId)) {
    return { ok: false, error: 'Ese material ya está en la receta' };
  }
  return guardar({
    ...receta,
    lineas: [...receta.lineas, { material: materialId, porM2: Number(porM2) || 0, nota }],
  });
}

export function quitarLinea(recetaId, materialId) {
  const receta = obtener(recetaId);
  if (!receta) return { ok: false, error: 'La receta no existe' };
  return guardar({
    ...receta,
    lineas: receta.lineas.filter((l) => l.material !== materialId),
  });
}

export function editarManoObra(recetaId, precioPorM2) {
  const receta = obtener(recetaId);
  if (!receta) return { ok: false, error: 'La receta no existe' };
  const precio = Number(precioPorM2);
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: 'El precio de mano de obra no es válido' };
  }
  return guardar({ ...receta, manoObraPorM2: precio });
}

function validar(receta) {
  if (!receta || !receta.id) return { ok: false, error: 'Falta el identificador' };
  if (!receta.nombre) return { ok: false, error: 'Falta el nombre' };
  if (!Array.isArray(receta.lineas) || receta.lineas.length === 0) {
    return { ok: false, error: 'La receta necesita al menos un material' };
  }
  for (const linea of receta.lineas) {
    if (!obtenerMaterial(linea.material)) {
      return { ok: false, error: `El material "${linea.material}" no existe` };
    }
  }
  return { ok: true };
}
