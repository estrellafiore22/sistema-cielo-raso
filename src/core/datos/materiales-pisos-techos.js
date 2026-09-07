// Catálogo de pisos epóxicos, techos de calamina y piso radiante eléctrico.
//
// PRECIOS REFERENCIALES: el administrador los edita desde Materiales.

import { SIMPLE } from './unidades.js';

export const MATERIALES_PISOS_TECHOS = [
  // --- Piso epóxico: base para marmolado y para flakes ---
  {
    // Resina + endurecedor vienen empacados juntos como kit A+B. Se cuenta en
    // kilos porque el consumo real depende del espesor de la capa.
    id: 'kit-epoxico-base',
    nombre: 'Kit epóxico A+B, balde 5 kg',
    categoria: 'pisos',
    unidad: 'kit',
    unidadConsumo: 'kg',
    porVenta: 5,
    fraccionable: true,
    precioCompra: 95,
    precioVenta: 130,
    rendimiento: null,
  },
  {
    id: 'primer-epoxico',
    nombre: 'Primer/imprimante epóxico, galón',
    categoria: 'pisos',
    unidad: 'galón',
    unidadConsumo: 'kg',
    porVenta: 4,
    fraccionable: true,
    precioCompra: 55,
    precioVenta: 75,
    rendimiento: null,
  },
  {
    id: 'pigmento-marmolado',
    nombre: 'Pigmento decorativo marmolado, frasco 250 ml',
    categoria: 'pisos',
    unidad: 'frasco',
    unidadConsumo: 'ml',
    porVenta: 250,
    fraccionable: true,
    precioCompra: 18,
    precioVenta: 25,
    rendimiento: null,
  },
  {
    id: 'flakes-decorativos',
    nombre: 'Flakes decorativos, bolsa 1 kg',
    categoria: 'pisos',
    unidad: 'bolsa',
    unidadConsumo: 'kg',
    porVenta: 1,
    fraccionable: true,
    precioCompra: 22,
    precioVenta: 30,
    rendimiento: null,
  },
  {
    id: 'sellador-poliuretano-piso',
    nombre: 'Sellador poliuretano para piso, galón',
    categoria: 'pisos',
    unidad: 'galón',
    unidadConsumo: 'kg',
    porVenta: 4,
    fraccionable: true,
    precioCompra: 85,
    precioVenta: 115,
    rendimiento: null,
  },

  // --- Techos: calamina, simple o con aislante termoacústico ---
  {
    // Ancho útil 80 cm es el estándar de la calamina ondulada; el largo se
    // vende en tramos de 3.60 m. Con esa medida se corta igual que una
    // plancha: por columnas, con `src/dominio/planchas/`.
    id: 'calamina',
    nombre: 'Calamina galvanizada (0.80 × 3.60 m)',
    dimensiones: { ancho: 0.8, largo: 3.6 },
    categoria: 'techos',
    unidad: 'plancha',
    precioCompra: 32,
    precioVenta: 42,
    rendimiento: 2.88,
    ...SIMPLE,
  },
  {
    id: 'calamina-termoacustica',
    nombre: 'Calamina termoacústica (0.80 × 3.60 m)',
    dimensiones: { ancho: 0.8, largo: 3.6 },
    categoria: 'techos',
    unidad: 'plancha',
    precioCompra: 68,
    precioVenta: 88,
    rendimiento: 2.88,
    ...SIMPLE,
  },

  // --- Piso radiante eléctrico ---
  {
    // Se compran mantas listas por metro cuadrado de cobertura, no se cortan
    // a medida: para el cálculo se cuentan m² directos.
    id: 'manta-calefactora',
    nombre: 'Manta calefactora eléctrica, por m²',
    categoria: 'electrico',
    unidad: 'm²',
    precioCompra: 145,
    precioVenta: 190,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    // Uno por ambiente, no por m²: se agrega aparte en la receta.
    id: 'termostato-piso-radiante',
    nombre: 'Termostato para piso radiante',
    categoria: 'electrico',
    unidad: 'unidad',
    precioCompra: 120,
    precioVenta: 160,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'aislante-reflectivo-radiante',
    nombre: 'Aislante reflectivo bajo piso radiante, rollo 10 m²',
    categoria: 'electrico',
    unidad: 'rollo',
    unidadConsumo: 'm²',
    porVenta: 10,
    fraccionable: false,
    precioCompra: 60,
    precioVenta: 80,
    rendimiento: 10,
  },
  {
    id: 'cinta-aislante-electrica',
    nombre: 'Cinta aislante eléctrica',
    categoria: 'electrico',
    unidad: 'unidad',
    precioCompra: 3,
    precioVenta: 5,
    rendimiento: null,
    ...SIMPLE,
  },
];
