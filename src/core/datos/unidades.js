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
export const SIMPLE = { unidadConsumo: null, porVenta: 1, fraccionable: false };

