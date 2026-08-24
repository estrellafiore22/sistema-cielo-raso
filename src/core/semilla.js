// Datos iniciales. Solo se aplican si la colección está vacía, así que nunca
// pisan información que el administrador ya haya cargado.

import * as bd from './bd.js';
import { CATEGORIAS_BASE, MATERIALES_BASE } from './datos/materiales-base.js';
import { RECETAS_BASE } from './datos/recetas-base.js';

export const CONFIG_POR_DEFECTO = {
  // Datos de la tienda que salen impresos en las boletas
  tienda: {
    nombre: 'Cielo Raso & Drywall',
    ruc: '',
    direccion: '',
    telefono: '',
    yape: '',
    bancoNombre: '',
    bancoCuenta: '',
    bancoCci: '',
  },
  // Transporte
  transporte: {
    tarifaBase: 20, // S/ fijos por salida
    porKm: 2.5, // S/ por kilómetro
    kmLibres: 3, // primeros km sin costo adicional
    minimo: 20, // nunca se cobra menos que esto si hay transporte
  },
  // Operación
  operacion: {
    igv: 18, // porcentaje, informativo
    aplicaIgv: false, // la mayoría de estas ventas son sin factura
    adelantoMinimoPct: 30, // no se acepta un adelanto menor a esto
    personalPorTrabajo: 2, // cuántos trabajadores consume un trabajo típico
    diasAnticipacion: 1, // no se puede pedir para hoy mismo
  },
  // Google Maps. Sin clave el sistema pide los kilómetros a mano.
  mapas: {
    apiKey: '',
    origen: '', // dirección de la tienda, punto de partida
  },
};

/** Siembra todo lo que falte. Devuelve un resumen de lo que creó. */
export function sembrar() {
  const creado = [];

  if (bd.todos('categorias').length === 0) {
    bd.reemplazar('categorias', CATEGORIAS_BASE);
    creado.push(`${CATEGORIAS_BASE.length} categorías`);
  }

  if (bd.todos('materiales').length === 0) {
    bd.reemplazar(
      'materiales',
      MATERIALES_BASE.map((m) => ({
        ...m,
        activo: true,
        creadoEn: new Date().toISOString(),
      })),
    );
    creado.push(`${MATERIALES_BASE.length} materiales`);
  }

  if (bd.todos('recetas').length === 0) {
    bd.reemplazar('recetas', RECETAS_BASE);
    creado.push(`${RECETAS_BASE.length} recetas`);
  }

  // Inventario: una fila por material, en cero. Así el admin solo ajusta
  // cantidades en vez de tener que crear cada fila.
  if (bd.todos('inventario').length === 0) {
    const filas = bd.todos('materiales').map((material) => ({
      id: 'inv_' + material.id,
      material: material.id,
      cantidad: 0,
      minimo: 0,
      ubicacion: 'Almacén principal',
    }));
    bd.reemplazar('inventario', filas);
    creado.push('inventario en cero');
  }

  if (bd.todos('usuarios').length === 0) {
    bd.reemplazar('usuarios', USUARIOS_BASE);
    creado.push('usuarios de acceso');
  }

  for (const [clave, valor] of Object.entries(CONFIG_POR_DEFECTO)) {
    if (bd.config(clave) === null) bd.guardarConfig(clave, valor);
  }

  return creado;
}

// Accesos iniciales. El administrador los cambia desde Ajustes → Usuarios.
// Ver la advertencia sobre seguridad en CLAUDE.md: mientras no haya servidor,
// esto controla la interfaz, no protege los datos.
const USUARIOS_BASE = [
  {
    id: 'u_admin',
    nombre: 'Administrador',
    usuario: 'admin',
    clave: 'admin',
    rol: 'admin',
  },
  {
    id: 'u_prog',
    nombre: 'Programador',
    usuario: 'programador',
    clave: 'programador',
    rol: 'programador',
  },
  {
    id: 'u_cliente',
    nombre: 'Cliente de mostrador',
    usuario: 'cliente',
    clave: 'cliente',
    rol: 'usuario',
  },
];
