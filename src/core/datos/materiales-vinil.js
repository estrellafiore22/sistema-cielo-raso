// Catálogo del cielo raso vinil: la retícula de T, el ángulo perimetral,
// la fijación tipo L y el alambre.
//
// Están aquí, en el catálogo común, y no escondidos en el motor de
// cálculo, porque la tienda también los vende sueltos: necesitan precio de
// compra y de venta editables como cualquier otro material.

import { SIMPLE } from './unidades.js';

export const MATERIALES_VINIL = [
  {
    // Cielo raso vinil. Se apoya sobre la retícula, se corta con cuchilla.
    id: 'baldosa-vinil-61',
    nombre: 'Baldosa vinílica 61 × 61 cm',
    dimensiones: { ancho: 0.61, largo: 0.61 },
    categoria: 'planchas',
    unidad: 'unidad',
    precioCompra: 2.6,
    precioVenta: 3.5,
    rendimiento: 0.372,
    ...SIMPLE,
  },
  {
    // El alambre del cielo raso vinil se cobra por metro, no por kilo: se
    // corta a la medida de cuánto cuelga el cielo raso de la losa.
    id: 'alambre-colgar',
    nombre: 'Alambre galvanizado para colgar (por metro)',
    categoria: 'fijacion',
    unidad: 'm',
    precioCompra: 5.5,
    precioVenta: 8,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    // Va clavada a la losa con fulminante; de ella cuelga el alambre.
    id: 'fijacion-tipo-l',
    nombre: 'Fijación tipo L',
    categoria: 'fijacion',
    unidad: 'unidad',
    precioCompra: 1,
    precioVenta: 1.5,
    rendimiento: null,
    ...SIMPLE,
  },
  // --- Retícula del cielo raso vinil ---
  {
    id: 't-principal',
    nombre: 'T principal 3.66 m (cielo raso vinil)',
    dimensiones: { largo: 3.66 },
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 5.5,
    precioVenta: 7.3,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 't-secundaria',
    nombre: 'T secundaria 1.22 m (cielo raso vinil)',
    dimensiones: { largo: 1.22 },
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 1.6,
    precioVenta: 2.2,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 't-terciaria',
    nombre: 'T terciaria 0.61 m (cielo raso vinil)',
    dimensiones: { largo: 0.61 },
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 0.9,
    precioVenta: 1.2,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'angulo-perimetral',
    nombre: 'Ángulo perimetral 3.05 m (cielo raso vinil)',
    dimensiones: { largo: 3.05 },
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 3,
    precioVenta: 4,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'angular-24',
    nombre: 'Angular 24 × 24 mm × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 7,
    precioVenta: 10,
    rendimiento: null,
    ...SIMPLE,
  },
];
