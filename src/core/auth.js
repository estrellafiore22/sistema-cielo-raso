// Sesión y roles.
//
// IMPORTANTE: esto controla qué ve y qué toca cada persona en la interfaz.
// No es seguridad real. Mientras los datos vivan en el navegador, cualquiera
// con acceso a esa PC puede abrir las herramientas de desarrollo y cambiarlos.
// Si algún día hay servidor, la autorización se reimplementa allí.

import * as bd from './bd.js';
import * as almacen from './almacenamiento.js';
import { emitir } from './bus.js';

const CLAVE_SESION = 'sesion';

export const ROLES = ['usuario', 'admin', 'programador'];

// Cada rol hereda los permisos de los anteriores.
const JERARQUIA = { usuario: 1, admin: 2, programador: 3 };

const PERMISOS = {
  'catalogo:ver': 'usuario',
  'pedido:crear': 'usuario',
  'pedido:propio:ver': 'usuario',
  'boleta:cliente:imprimir': 'usuario',

  'material:editar': 'admin',
  'material:crear': 'admin',
  'material:eliminar': 'admin',
  'precio:editar': 'admin',
  'receta:editar': 'admin',
  'inventario:editar': 'admin',
  'retorno:registrar': 'admin',
  'calendario:editar': 'admin',
  'personal:editar': 'admin',
  'pedido:todos:ver': 'admin',
  'pedido:estado:cambiar': 'admin',
  'boleta:admin:imprimir': 'admin',
  'ajustes:editar': 'admin',

  'diagnostico:ver': 'programador',
  'datos:exportar': 'programador',
  'datos:importar': 'programador',
  'datos:resetear': 'programador',
};

let sesionActual = null;

export function iniciar() {
  const guardada = almacen.leer(CLAVE_SESION);
  if (guardada && guardada.usuarioId) {
    const usuario = bd.buscarPorId('usuarios', guardada.usuarioId);
    if (usuario) {
      sesionActual = construirSesion(usuario);
      return sesionActual;
    }
  }
  return null;
}

export function entrar(nombreUsuario, clave) {
  const usuario = bd
    .todos('usuarios')
    .find(
      (u) =>
        u.usuario.toLowerCase() === String(nombreUsuario).trim().toLowerCase() &&
        u.clave === clave,
    );
  if (!usuario) return { ok: false, error: 'Usuario o contraseña incorrectos' };

  sesionActual = construirSesion(usuario);
  almacen.escribir(CLAVE_SESION, { usuarioId: usuario.id });
  emitir('auth:entrada', sesionActual);
  return { ok: true, sesion: sesionActual };
}

export function salir() {
  sesionActual = null;
  almacen.borrar(CLAVE_SESION);
  emitir('auth:salida', null);
}

export function sesion() {
  return sesionActual;
}

export function rol() {
  return sesionActual ? sesionActual.rol : null;
}

export function autenticado() {
  return sesionActual !== null;
}

/** ¿El rol actual alcanza para este permiso? */
export function puede(permiso) {
  if (!sesionActual) return false;
  const requerido = PERMISOS[permiso];
  if (!requerido) return false; // permiso desconocido: se niega
  return JERARQUIA[sesionActual.rol] >= JERARQUIA[requerido];
}

/** Lanza si no tiene permiso. Para usar al inicio de acciones sensibles. */
export function exigir(permiso) {
  if (!puede(permiso)) {
    throw new Error(`Sin permiso para "${permiso}"`);
  }
}

export function esAdmin() {
  return puede('material:editar');
}

export function esProgramador() {
  return rol() === 'programador';
}

function construirSesion(usuario) {
  return {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    rol: ROLES.includes(usuario.rol) ? usuario.rol : 'usuario',
    desde: new Date().toISOString(),
  };
}
