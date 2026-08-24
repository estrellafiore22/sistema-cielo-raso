// Adaptador de persistencia.
//
// Este es el ÚNICO archivo que sabe dónde viven los datos. Hoy usa
// localStorage. Para pasar a un backend real (Supabase, Firebase, API propia)
// se reemplaza este archivo respetando la misma interfaz y nada más cambia.
//
// Interfaz: leer(clave) -> valor | null ;  escribir(clave, valor) ;
//           borrar(clave) ; claves() ; disponible()

import { registrar } from './errores.js';

const PREFIJO = 'cieloraso:';

/** ¿Hay almacenamiento utilizable? En modo incógnito puede no haberlo. */
export function disponible() {
  try {
    const prueba = PREFIJO + '__prueba__';
    localStorage.setItem(prueba, '1');
    localStorage.removeItem(prueba);
    return true;
  } catch (error) {
    return false;
  }
}

// Respaldo en memoria para cuando localStorage está bloqueado. La sesión
// funciona igual, pero los datos se pierden al cerrar. Mejor eso que no arrancar.
const memoria = new Map();
const usarMemoria = !disponible();

if (usarMemoria) {
  registrar(
    'almacenamiento',
    new Error('localStorage no disponible; usando memoria temporal'),
  );
}

export function leer(clave) {
  try {
    const crudo = usarMemoria
      ? memoria.get(PREFIJO + clave)
      : localStorage.getItem(PREFIJO + clave);
    if (crudo === null || crudo === undefined) return null;
    return JSON.parse(crudo);
  } catch (error) {
    registrar('almacenamiento.leer', error, { clave });
    return null;
  }
}

export function escribir(clave, valor) {
  try {
    const crudo = JSON.stringify(valor);
    if (usarMemoria) {
      memoria.set(PREFIJO + clave, crudo);
    } else {
      localStorage.setItem(PREFIJO + clave, crudo);
    }
    return true;
  } catch (error) {
    // El caso típico aquí es QuotaExceededError: se llenó el almacenamiento.
    registrar('almacenamiento.escribir', error, { clave });
    return false;
  }
}

export function borrar(clave) {
  try {
    if (usarMemoria) memoria.delete(PREFIJO + clave);
    else localStorage.removeItem(PREFIJO + clave);
    return true;
  } catch (error) {
    registrar('almacenamiento.borrar', error, { clave });
    return false;
  }
}

/** Todas las claves del sistema, sin el prefijo. */
export function claves() {
  try {
    const origen = usarMemoria
      ? Array.from(memoria.keys())
      : Object.keys(localStorage);
    return origen
      .filter((k) => k.startsWith(PREFIJO))
      .map((k) => k.slice(PREFIJO.length));
  } catch (error) {
    registrar('almacenamiento.claves', error);
    return [];
  }
}

/** Vuelca todo el contenido. Se usa para exportar respaldos. */
export function exportarTodo() {
  const salida = {};
  for (const clave of claves()) salida[clave] = leer(clave);
  return salida;
}

/** Restaura un respaldo completo. Sobrescribe lo que haya. */
export function importarTodo(datos) {
  if (!datos || typeof datos !== 'object') return false;
  for (const [clave, valor] of Object.entries(datos)) escribir(clave, valor);
  return true;
}

/** Borra absolutamente todos los datos del sistema. Irreversible. */
export function vaciar() {
  for (const clave of claves()) borrar(clave);
}
