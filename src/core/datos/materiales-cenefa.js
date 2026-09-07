// Catálogo del cielo raso 3D flotante: perfilería de LED y esquinero para la
// cenefa. La plancha y la estructura de la caja reusan lo que ya existe
// (drywall/fibrocemento, riel, parante, omega, angular).

import { SIMPLE } from './unidades.js';

export const MATERIALES_CENEFA = [
  {
    // Solo hace falta con LED a la vista: sostiene la tira y la deja al ras.
    id: 'canaleta-aluminio-led',
    nombre: 'Canaleta de aluminio para LED × 2.00 m',
    dimensiones: { largo: 2 },
    categoria: 'iluminacion',
    unidad: 'barra',
    precioCompra: 18,
    precioVenta: 25,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'tapa-difusora-led',
    nombre: 'Tapa difusora para canaleta LED × 2.00 m',
    dimensiones: { largo: 2 },
    categoria: 'iluminacion',
    unidad: 'barra',
    precioCompra: 9,
    precioVenta: 13,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    // Se corta a la medida exacta, no por barra cerrada: se vende fraccionada.
    id: 'tira-led',
    nombre: 'Tira LED, por metro',
    categoria: 'iluminacion',
    unidad: 'm',
    unidadConsumo: null,
    porVenta: 1,
    fraccionable: true,
    precioCompra: 8,
    precioVenta: 12,
    rendimiento: null,
  },
  {
    // Uno por ambiente, no por metro: se agrega aparte, como el termostato
    // del piso radiante.
    id: 'driver-led',
    nombre: 'Driver / fuente para tira LED',
    categoria: 'iluminacion',
    unidad: 'unidad',
    precioCompra: 35,
    precioVenta: 48,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'esquinero-pvc',
    nombre: 'Esquinero de PVC × 3.00 m',
    dimensiones: { largo: 3 },
    categoria: 'acabados',
    unidad: 'barra',
    precioCompra: 7,
    precioVenta: 10,
    rendimiento: null,
    ...SIMPLE,
  },
];
