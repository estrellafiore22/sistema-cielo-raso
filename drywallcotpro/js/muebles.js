// Muebles básicos: cajas con medidas típicas. Sirven para ver el espacio,
// no para un render realista.

import { nuevoId } from './estado.js';

export const MUEBLES = {
  cama: { nombre: 'Cama 2 plazas', ancho: 1.40, fondo: 1.90, alto: 0.50, color: 0x8fa9c9 },
  cama1: { nombre: 'Cama 1½ plaza', ancho: 1.05, fondo: 1.90, alto: 0.50, color: 0x8fa9c9 },
  sofa: { nombre: 'Sofá', ancho: 2.00, fondo: 0.85, alto: 0.80, color: 0x9c7f6a },
  mesa: { nombre: 'Mesa comedor', ancho: 1.20, fondo: 0.80, alto: 0.75, color: 0xb08a5c },
  silla: { nombre: 'Silla', ancho: 0.45, fondo: 0.45, alto: 0.90, color: 0xb08a5c },
  ropero: { nombre: 'Ropero', ancho: 1.50, fondo: 0.60, alto: 2.10, color: 0xcbb79a },
  escritorio: { nombre: 'Escritorio', ancho: 1.20, fondo: 0.60, alto: 0.75, color: 0xb08a5c },
  cocina: { nombre: 'Cocina', ancho: 0.60, fondo: 0.60, alto: 0.90, color: 0xd0d4d8 },
  mueblecocina: { nombre: 'Mueble de cocina', ancho: 2.00, fondo: 0.60, alto: 0.90, color: 0xe6e0d6 },
  refri: { nombre: 'Refrigeradora', ancho: 0.70, fondo: 0.70, alto: 1.75, color: 0xe9ecef },
  inodoro: { nombre: 'Inodoro', ancho: 0.40, fondo: 0.70, alto: 0.75, color: 0xf8f9fa },
  lavatorio: { nombre: 'Lavatorio', ancho: 0.55, fondo: 0.45, alto: 0.85, color: 0xf8f9fa },
  ducha: { nombre: 'Ducha', ancho: 0.90, fondo: 0.90, alto: 0.10, color: 0xdbe7f0 },
  tv: { nombre: 'Mueble TV', ancho: 1.60, fondo: 0.45, alto: 0.55, color: 0x6c5b4c },
};

export function crearMueble(tipo, p) {
  const b = MUEBLES[tipo] || MUEBLES.mesa;
  return { id: nuevoId(), tipo, nombre: b.nombre, x: p.x, y: p.y, ancho: b.ancho, fondo: b.fondo, alto: b.alto, rot: 0 };
}
