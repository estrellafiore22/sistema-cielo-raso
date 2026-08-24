// Base de datos por colecciones sobre el adaptador de almacenamiento.
//
// Cada colección es un arreglo de objetos con `id`. La API imita lo mínimo de
// una base de datos real para que migrar a un backend sea directo.

import * as almacen from './almacenamiento.js';
import { registrar } from './errores.js';
import { emitir } from './bus.js';

export const COLECCIONES = [
  'materiales',
  'categorias',
  'recetas',
  'inventario',
  'retornos',
  'movimientos',
  'personal',
  'asignaciones',
  'pedidos',
  'pagos',
  'colaImpresion',
  'usuarios',
];

const CLAVE_VERSION = 'version';
export const VERSION_ACTUAL = 1;

/** Devuelve la colección completa. Siempre un arreglo, nunca null. */
export function todos(coleccion) {
  const datos = almacen.leer(coleccion);
  return Array.isArray(datos) ? datos : [];
}

export function buscarPorId(coleccion, id) {
  return todos(coleccion).find((registro) => registro.id === id) || null;
}

/** Filtra por coincidencia exacta de todas las propiedades de `criterio`. */
export function donde(coleccion, criterio) {
  const claves = Object.keys(criterio || {});
  return todos(coleccion).filter((registro) =>
    claves.every((k) => registro[k] === criterio[k]),
  );
}

/** Reemplaza la colección entera. Uso interno y de importación de respaldos. */
export function reemplazar(coleccion, registros) {
  const ok = almacen.escribir(coleccion, Array.isArray(registros) ? registros : []);
  if (ok) emitir('bd:cambio', { coleccion });
  return ok;
}

export function insertar(coleccion, registro) {
  const lista = todos(coleccion);
  const nuevo = {
    ...registro,
    id: registro.id || generarId(coleccion),
    creadoEn: registro.creadoEn || new Date().toISOString(),
  };
  lista.push(nuevo);
  reemplazar(coleccion, lista);
  emitir(`${coleccion}:insertado`, nuevo);
  return nuevo;
}

/** Actualiza por id mezclando `cambios`. Devuelve el registro nuevo o null. */
export function actualizar(coleccion, id, cambios) {
  const lista = todos(coleccion);
  const indice = lista.findIndex((registro) => registro.id === id);
  if (indice === -1) {
    registrar('bd.actualizar', new Error('Registro no encontrado'), {
      coleccion,
      id,
    });
    return null;
  }
  const actualizado = {
    ...lista[indice],
    ...cambios,
    id,
    actualizadoEn: new Date().toISOString(),
  };
  lista[indice] = actualizado;
  reemplazar(coleccion, lista);
  emitir(`${coleccion}:actualizado`, actualizado);
  return actualizado;
}

export function eliminar(coleccion, id) {
  const lista = todos(coleccion);
  const restantes = lista.filter((registro) => registro.id !== id);
  if (restantes.length === lista.length) return false;
  reemplazar(coleccion, restantes);
  emitir(`${coleccion}:eliminado`, { id });
  return true;
}

/**
 * Inserta si no existe, actualiza si existe. Útil para las recetas y la
 * configuración, donde el id lo define el negocio y no el sistema.
 */
export function guardar(coleccion, registro) {
  if (registro.id && buscarPorId(coleccion, registro.id)) {
    return actualizar(coleccion, registro.id, registro);
  }
  return insertar(coleccion, registro);
}

let contador = 0;
export function generarId(prefijo = 'id') {
  contador += 1;
  return `${prefijo}_${Date.now().toString(36)}_${contador.toString(36)}`;
}

// --- Configuración suelta (no es una colección) -----------------------------

export function config(clave, porDefecto = null) {
  const valor = almacen.leer('config:' + clave);
  return valor === null ? porDefecto : valor;
}

export function guardarConfig(clave, valor) {
  almacen.escribir('config:' + clave, valor);
  emitir('config:cambio', { clave, valor });
}

// --- Versión y migraciones --------------------------------------------------

export function versionGuardada() {
  return almacen.leer(CLAVE_VERSION) || 0;
}

export function marcarVersion(version) {
  almacen.escribir(CLAVE_VERSION, version);
}

/**
 * Aplica migraciones pendientes. Hoy solo hay versión 1, pero la estructura
 * está lista para cuando cambie el esquema y ya existan datos reales.
 */
export function migrar() {
  const desde = versionGuardada();
  if (desde >= VERSION_ACTUAL) return { migrado: false, desde };
  // Futuras migraciones: if (desde < 2) { ...transformar datos... }
  marcarVersion(VERSION_ACTUAL);
  return { migrado: true, desde, hasta: VERSION_ACTUAL };
}
