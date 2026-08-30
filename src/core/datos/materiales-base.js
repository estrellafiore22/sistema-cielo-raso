// Catálogo inicial de materiales.
//
// PRECIOS REFERENCIALES. El administrador los edita desde el sistema; estos
// solo sirven para que la primera vez que se abre no esté todo vacío.
//
// DOS UNIDADES POR MATERIAL, y es la distinción que evita confusiones:
//
//   unidad          Cómo lo VENDE el proveedor y cómo se cobra.
//                   Un ciento de tornillos, un balde de masilla.
//   unidadConsumo   Cómo se GASTA en obra y cómo lo cuenta el maestro.
//                   Tornillos sueltos, kilos de masilla.
//   porVenta        Cuántas unidades de consumo trae una unidad de venta.
//                   100 tornillos por ciento, 28 kg por balde.
//   fraccionable    Si se puede comprar parte de una unidad de venta.
//                   Una caja de clavos no se parte; masilla a granel sí.
//
// Las recetas se escriben en unidades de CONSUMO, que es como razona el
// maestro: 22 tornillos por m², no 0.22 cientos por m².

export const CATEGORIAS_BASE = [
  { id: 'planchas', nombre: 'Planchas', orden: 1 },
  { id: 'perfiles', nombre: 'Perfiles metálicos', orden: 2 },
  { id: 'tornilleria', nombre: 'Tornillería', orden: 3 },
  { id: 'fijacion', nombre: 'Fijación y colgado', orden: 4 },
  { id: 'acabados', nombre: 'Acabados', orden: 5 },
  { id: 'aislamiento', nombre: 'Aislamiento', orden: 6 },
  { id: 'otros', nombre: 'Otros', orden: 7 },
];

/** Valores por defecto: la mayoría se vende y se gasta en la misma unidad. */
const SIMPLE = { unidadConsumo: null, porVenta: 1, fraccionable: false };

export const MATERIALES_BASE = [
  // --- Planchas ---
  {
    id: 'plancha-st-8',
    nombre: 'Plancha drywall estándar 8 mm (1.22 × 2.44 m)',
    categoria: 'planchas',
    unidad: 'plancha',
    precioCompra: 26,
    precioVenta: 34,
    rendimiento: 2.9768,
    ...SIMPLE,
  },
  {
    id: 'plancha-st-127',
    nombre: 'Plancha drywall estándar 12.7 mm (1.22 × 2.44 m)',
    categoria: 'planchas',
    unidad: 'plancha',
    precioCompra: 34,
    precioVenta: 44,
    rendimiento: 2.9768,
    ...SIMPLE,
  },
  {
    id: 'plancha-rh-127',
    nombre: 'Plancha drywall resistente a humedad 12.7 mm',
    categoria: 'planchas',
    unidad: 'plancha',
    precioCompra: 46,
    precioVenta: 58,
    rendimiento: 2.9768,
    ...SIMPLE,
  },
  {
    id: 'plancha-fibrocemento-6',
    nombre: 'Plancha fibrocemento 6 mm (1.22 × 2.44 m)',
    categoria: 'planchas',
    unidad: 'plancha',
    precioCompra: 48,
    precioVenta: 62,
    rendimiento: 2.9768,
    ...SIMPLE,
  },

  // --- Perfiles ---
  {
    id: 'riel-64',
    nombre: 'Riel 64 mm × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 11,
    precioVenta: 15,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'parante-64',
    nombre: 'Parante 64 mm × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 12,
    precioVenta: 16,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'riel-89',
    nombre: 'Riel 89 mm × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 14,
    precioVenta: 19,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'parante-89',
    nombre: 'Parante 89 mm × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 15,
    precioVenta: 20,
    rendimiento: null,
    ...SIMPLE,
  },
  {
    id: 'omega',
    nombre: 'Perfil omega × 3.00 m',
    categoria: 'perfiles',
    unidad: 'barra',
    precioCompra: 9,
    precioVenta: 13,
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

  // --- Tornillería: se vende por ciento, se gasta de a uno ---
  {
    id: 'tornillo-drywall-1',
    nombre: 'Tornillo drywall 6 × 1" punta fina',
    categoria: 'tornilleria',
    unidad: 'ciento',
    unidadConsumo: 'tornillo',
    porVenta: 100,
    fraccionable: true,
    precioCompra: 4.5,
    precioVenta: 7,
    rendimiento: null,
  },
  {
    id: 'tornillo-drywall-158',
    nombre: 'Tornillo drywall 6 × 1 5/8" punta fina',
    categoria: 'tornilleria',
    unidad: 'ciento',
    unidadConsumo: 'tornillo',
    porVenta: 100,
    fraccionable: true,
    precioCompra: 6,
    precioVenta: 9,
    rendimiento: null,
  },
  {
    id: 'tornillo-framer',
    nombre: 'Tornillo framer 8 × 1/2"',
    categoria: 'tornilleria',
    unidad: 'ciento',
    unidadConsumo: 'tornillo',
    porVenta: 100,
    fraccionable: true,
    precioCompra: 5,
    precioVenta: 8,
    rendimiento: null,
  },

  // --- Fijación ---
  {
    // La caja trae 100 clavos y 100 fulminantes: van siempre de a par y no
    // se venden por separado, así que se cuenta el par.
    id: 'clavo-impacto',
    nombre: 'Combo clavo + fulminante (caja de 100 pares)',
    categoria: 'fijacion',
    unidad: 'caja',
    unidadConsumo: 'par',
    porVenta: 100,
    fraccionable: false,
    precioCompra: 12,
    precioVenta: 20,
    rendimiento: null,
  },
  {
    id: 'alambre-16',
    nombre: 'Alambre galvanizado N° 16',
    categoria: 'fijacion',
    unidad: 'kg',
    unidadConsumo: null,
    porVenta: 1,
    fraccionable: true,
    precioCompra: 8,
    precioVenta: 12,
    rendimiento: null,
  },
  {
    id: 'colgante',
    nombre: 'Colgante regulable',
    categoria: 'fijacion',
    unidad: 'unidad',
    precioCompra: 2.5,
    precioVenta: 4,
    rendimiento: null,
    ...SIMPLE,
  },

  // --- Acabados ---
  {
    id: 'masilla-28',
    nombre: 'Masilla lista, balde 28 kg',
    categoria: 'acabados',
    unidad: 'balde',
    unidadConsumo: 'kg',
    porVenta: 28,
    fraccionable: true,
    precioCompra: 68,
    precioVenta: 88,
    rendimiento: null,
  },
  {
    id: 'cinta-malla',
    nombre: 'Cinta malla de fibra 90 m',
    categoria: 'acabados',
    unidad: 'rollo',
    unidadConsumo: 'm',
    porVenta: 90,
    fraccionable: false,
    precioCompra: 9,
    precioVenta: 14,
    rendimiento: null,
  },
  {
    id: 'cinta-papel',
    nombre: 'Cinta de papel 75 m',
    categoria: 'acabados',
    unidad: 'rollo',
    unidadConsumo: 'm',
    porVenta: 75,
    fraccionable: false,
    precioCompra: 7,
    precioVenta: 11,
    rendimiento: null,
  },
  {
    id: 'lija-120',
    nombre: 'Lija N° 120, pliego',
    categoria: 'acabados',
    unidad: 'pliego',
    precioCompra: 1.2,
    precioVenta: 2,
    rendimiento: null,
    ...SIMPLE,
  },

  // --- Aislamiento ---
  {
    id: 'lana-vidrio',
    nombre: 'Lana de vidrio, rollo 12 m²',
    categoria: 'aislamiento',
    unidad: 'rollo',
    unidadConsumo: 'm²',
    porVenta: 12,
    fraccionable: false,
    precioCompra: 95,
    precioVenta: 125,
    rendimiento: 12,
  },
];
