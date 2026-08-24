// Inventario en dos bolsas separadas:
//
//   ALMACÉN  — material nuevo, comprado, sin usar.
//   RETORNOS — material que volvió de un trabajo con mano de obra terminado.
//              Planchas cortadas, retazos de perfil, tornillos sobrantes.
//
// Se llevan aparte a propósito: al armar un pedido conviene gastar primero lo
// retornado, y la boleta interna del administrador debe decir de qué bolsa
// sale cada cosa.

import * as bd from '../core/bd.js';
import { redondear } from '../core/formato.js';
import { emitir } from '../core/bus.js';

// --- Consulta ---------------------------------------------------------------

/** Cantidad disponible en almacén de un material. */
export function enAlmacen(materialId) {
  const fila = bd.donde('inventario', { material: materialId })[0];
  return fila ? Number(fila.cantidad) || 0 : 0;
}

/** Cantidad total retornada y aún disponible de un material. */
export function enRetornos(materialId) {
  return bd
    .donde('retornos', { material: materialId })
    .filter((r) => r.estado === 'disponible')
    .reduce((suma, r) => suma + (Number(r.cantidad) || 0), 0);
}

export function disponibleTotal(materialId) {
  return redondear(enAlmacen(materialId) + enRetornos(materialId));
}

/** Foto completa del inventario, para la pantalla de almacén. */
export function resumen() {
  return bd.todos('materiales').map((material) => {
    const fila = bd.donde('inventario', { material: material.id })[0];
    const almacen = fila ? Number(fila.cantidad) || 0 : 0;
    const retornos = enRetornos(material.id);
    const minimo = fila ? Number(fila.minimo) || 0 : 0;
    return {
      material,
      almacen,
      retornos,
      total: redondear(almacen + retornos),
      minimo,
      bajoMinimo: minimo > 0 && almacen + retornos < minimo,
      ubicacion: fila ? fila.ubicacion : 'Almacén principal',
    };
  });
}

export function bajoMinimo() {
  return resumen().filter((fila) => fila.bajoMinimo);
}

// --- Movimientos de almacén -------------------------------------------------

/** Suma (positivo) o resta (negativo) del almacén y deja rastro. */
export function moverAlmacen(materialId, delta, motivo, referencia = null) {
  const cambio = Number(delta);
  if (!Number.isFinite(cambio) || cambio === 0) {
    return { ok: false, error: 'La cantidad no es válida' };
  }

  let fila = bd.donde('inventario', { material: materialId })[0];
  if (!fila) {
    fila = bd.insertar('inventario', {
      id: 'inv_' + materialId,
      material: materialId,
      cantidad: 0,
      minimo: 0,
      ubicacion: 'Almacén principal',
    });
  }

  const anterior = Number(fila.cantidad) || 0;
  const nueva = redondear(anterior + cambio);
  if (nueva < 0) {
    return {
      ok: false,
      error: `No hay suficiente en almacén. Disponible: ${anterior}`,
    };
  }

  bd.actualizar('inventario', fila.id, { cantidad: nueva });
  registrarMovimiento({
    material: materialId,
    origen: 'almacen',
    delta: cambio,
    anterior,
    nueva,
    motivo,
    referencia,
  });

  emitir('inventario:cambio', { material: materialId, almacen: nueva });
  return { ok: true, cantidad: nueva };
}

/** Fija la cantidad exacta. Se usa en el conteo físico del almacén. */
export function ajustarAlmacen(materialId, cantidadFinal, motivo = 'Ajuste de conteo') {
  const objetivo = Number(cantidadFinal);
  if (!Number.isFinite(objetivo) || objetivo < 0) {
    return { ok: false, error: 'La cantidad no es válida' };
  }
  const actual = enAlmacen(materialId);
  if (redondear(objetivo) === redondear(actual)) return { ok: true, cantidad: actual };
  return moverAlmacen(materialId, objetivo - actual, motivo);
}

export function fijarMinimo(materialId, minimo) {
  const fila = bd.donde('inventario', { material: materialId })[0];
  if (!fila) return { ok: false, error: 'El material no está en inventario' };
  bd.actualizar('inventario', fila.id, { minimo: Number(minimo) || 0 });
  return { ok: true };
}

// --- Retornos de obra -------------------------------------------------------

/**
 * Registra material que volvió de un trabajo terminado.
 * `condicion`: 'nuevo' (nunca se abrió) | 'usado' (retazo aprovechable).
 */
export function registrarRetorno({
  material,
  cantidad,
  pedidoOrigen = null,
  condicion = 'usado',
  nota = '',
}) {
  const monto = Number(cantidad);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: 'La cantidad debe ser mayor a cero' };
  }
  if (!bd.buscarPorId('materiales', material)) {
    return { ok: false, error: 'Ese material no existe' };
  }

  const retorno = bd.insertar('retornos', {
    material,
    cantidad: redondear(monto),
    pedidoOrigen,
    condicion,
    nota,
    estado: 'disponible',
    fecha: new Date().toISOString(),
  });

  registrarMovimiento({
    material,
    origen: 'retorno',
    delta: monto,
    motivo: `Retorno de obra${pedidoOrigen ? ' ' + pedidoOrigen : ''}`,
    referencia: retorno.id,
  });

  emitir('retorno:registrado', retorno);
  return { ok: true, retorno };
}

/** Lotes de retorno disponibles, del más antiguo al más nuevo. */
export function retornosDisponibles(materialId = null) {
  let lista = bd.todos('retornos').filter((r) => r.estado === 'disponible');
  if (materialId) lista = lista.filter((r) => r.material === materialId);
  return lista.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

/**
 * Consume cantidad de los lotes de retorno, del más antiguo primero.
 * Devuelve cuánto se pudo consumir realmente.
 */
export function consumirRetornos(materialId, cantidad, referencia = null) {
  let porConsumir = Number(cantidad) || 0;
  let consumido = 0;

  for (const lote of retornosDisponibles(materialId)) {
    if (porConsumir <= 0) break;
    const enLote = Number(lote.cantidad) || 0;
    const toma = Math.min(enLote, porConsumir);
    const resto = redondear(enLote - toma);

    bd.actualizar('retornos', lote.id, {
      cantidad: resto,
      estado: resto <= 0 ? 'agotado' : 'disponible',
    });

    porConsumir = redondear(porConsumir - toma);
    consumido = redondear(consumido + toma);
  }

  if (consumido > 0) {
    registrarMovimiento({
      material: materialId,
      origen: 'retorno',
      delta: -consumido,
      motivo: 'Salida a pedido',
      referencia,
    });
    emitir('inventario:cambio', { material: materialId });
  }

  return consumido;
}

// --- Historial --------------------------------------------------------------

function registrarMovimiento(datos) {
  bd.insertar('movimientos', { ...datos, fecha: new Date().toISOString() });
}

export function movimientos({ material = null, limite = 100 } = {}) {
  let lista = bd.todos('movimientos');
  if (material) lista = lista.filter((m) => m.material === material);
  return lista
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, limite);
}
