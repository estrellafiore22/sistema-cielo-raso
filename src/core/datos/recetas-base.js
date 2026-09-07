// Recetas: cuánto material se consume por cada m² de trabajo.
//
// Esto es el corazón del cálculo. Cuando llega un pedido "150 m² de cielo raso",
// el sistema multiplica cada línea de la receta por 150 y obtiene la lista de
// materiales a llevar.
//
// LOS CONSUMOS VAN EN UNIDADES DE CONSUMO, no de venta: 22 tornillos por m²,
// no 0.22 cientos. Es como cuenta el maestro, y así el número se puede
// discutir con él. La conversión a lo que se compra (cientos, baldes, cajas)
// la hace el sistema al final, con el campo `porVenta` de cada material.
//
// LOS CONSUMOS SON ESTIMADOS DE MERCADO. El administrador los edita desde
// Ajustes → Recetas, porque cada maestro trabaja con sus propios rendimientos y
// separaciones de perfil. Cambiar aquí el número cambia todas las cotizaciones
// futuras, no las ya emitidas.
//
// Ojo con el nombre: "cielo raso de drywall" es plancha atornillada a perfiles.
// El cielo raso suspendido de baldosa 61 × 61 es otro sistema y tiene su propio
// motor de cálculo en src/dominio/suspendido/.

export const RECETAS_BASE = [
  {
    id: 'cielo_raso',
    nombre: 'Cielo raso de drywall (una cara)',
    manoObraPorM2: 22,
    descripcion:
      'Estructura de omega colgada con alambre, angular en el perímetro y ' +
      'plancha de 12.7 mm empastada.',
    lineas: [
      {
        material: 'plancha-st-127',
        porM2: 0.363,
        nota: 'Una plancha cubre 2.9768 m². Incluye 8 % de desperdicio por cortes.',
      },
      {
        material: 'omega',
        porM2: 0.833,
        nota: 'Omega cada 0.40 m = 2.5 ml/m². Barra de 3 m.',
      },
      {
        material: 'angular-24',
        porM2: 0.167,
        nota: 'Angular perimetral, estimado 0.5 ml/m² en ambientes típicos.',
      },
      {
        material: 'alambre-16',
        porM2: 0.15,
        nota: 'Kilos de alambre de colgado. Sube si el falso techo está muy separado de la losa.',
      },
      {
        material: 'clavo-impacto',
        porM2: 4,
        nota: '4 pares de clavo + fulminante por m², para angular y colgantes.',
      },
      {
        material: 'tornillo-drywall-1',
        porM2: 22,
        nota: '22 tornillos por m² fijando plancha a omega.',
      },
      {
        material: 'tornillo-framer',
        porM2: 8,
        nota: '8 tornillos por m² en uniones de perfil.',
      },
      {
        material: 'cinta-malla',
        porM2: 1.6,
        nota: '1.6 metros de junta por m².',
      },
      {
        material: 'masilla-28',
        porM2: 0.45,
        nota: '0.45 kg por m² a dos manos.',
      },
      {
        material: 'lija-120',
        porM2: 0.05,
        nota: 'Un pliego rinde aproximadamente 20 m² de lijado.',
      },
    ],
  },

  {
    id: 'division',
    nombre: 'División / tabique (doble cara)',
    manoObraPorM2: 25,
    descripcion:
      'Tabique con riel y parante de 64 mm, planchado por ambas caras y ' +
      'empastado. El m² se mide por cara vista del muro.',
    lineas: [
      {
        material: 'plancha-st-127',
        porM2: 0.726,
        nota: 'Dos caras: 0.672 planchas/m² más 8 % de desperdicio.',
      },
      {
        material: 'riel-64',
        porM2: 0.277,
        nota: 'Riel superior e inferior. 0.83 ml/m² para muro de 2.40 m.',
      },
      {
        material: 'parante-64',
        porM2: 0.833,
        nota: 'Parante cada 0.40 m = 2.5 ml/m². Barra de 3 m.',
      },
      {
        material: 'tornillo-drywall-1',
        porM2: 30,
        nota: '30 tornillos por m² contando las dos caras.',
      },
      {
        material: 'tornillo-framer',
        porM2: 10,
        nota: '10 tornillos por m² en encuentros de riel y parante.',
      },
      {
        material: 'clavo-impacto',
        porM2: 3,
        nota: '3 pares por m² fijando rieles a piso y techo.',
      },
      {
        material: 'cinta-malla',
        porM2: 3,
        nota: '3 metros de junta por m² por las dos caras.',
      },
      {
        material: 'masilla-28',
        porM2: 0.9,
        nota: '0.9 kg por m² contando ambas caras.',
      },
      {
        material: 'lija-120',
        porM2: 0.1,
        nota: 'Doble superficie a lijar.',
      },
    ],
  },

  {
    id: 'cielo_raso_humedad',
    nombre: 'Cielo raso de drywall en zona húmeda (baño, cocina, exterior techado)',
    manoObraPorM2: 26,
    descripcion:
      'Igual que el cielo raso de drywall estándar pero con plancha resistente ' +
      'a la humedad. Se cotiza más caro por el material.',
    lineas: [
      {
        material: 'plancha-rh-127',
        porM2: 0.363,
        nota: 'Plancha RH. Mismo rendimiento que la estándar.',
      },
      { material: 'omega', porM2: 0.833, nota: 'Omega cada 0.40 m.' },
      { material: 'angular-24', porM2: 0.167, nota: 'Angular perimetral.' },
      { material: 'alambre-16', porM2: 0.15, nota: 'Kilos de alambre de colgado.' },
      { material: 'clavo-impacto', porM2: 4, nota: '4 pares por m².' },
      {
        material: 'tornillo-drywall-1',
        porM2: 22,
        nota: '22 tornillos por m².',
      },
      { material: 'tornillo-framer', porM2: 8, nota: '8 tornillos por m².' },
      { material: 'cinta-malla', porM2: 1.6, nota: '1.6 m de junta por m².' },
      { material: 'masilla-28', porM2: 0.45, nota: '0.45 kg por m².' },
      { material: 'lija-120', porM2: 0.05, nota: 'Lijado.' },
    ],
  },

  {
    id: 'laminado_pvc',
    nombre: 'Laminado PVC (pared o cielo raso 3D flotante)',
    manoObraPorM2: 18,
    descripcion:
      'Panel de PVC de 0.25 × 5.95 m, encajado a presión sobre la superficie ' +
      'existente. No lleva estructura de riel ni parante: es revestimiento.',
    lineas: [
      {
        material: 'laminado-pvc',
        porM2: 0.672,
        nota: 'Un panel cubre 1.4875 m². Incluye 8 % de desperdicio por cortes.',
      },
      {
        material: 'perfil-remate-pvc',
        porM2: 0.4,
        nota: 'Perfil de remate en el perímetro, estimado 0.4 ml/m².',
      },
      {
        material: 'adhesivo-laminado-pvc',
        porM2: 0.25,
        nota: 'Un cartucho rinde 4 m².',
      },
    ],
  },

  {
    id: 'piso_epoxico_marmolado',
    nombre: 'Piso en resina epóxica marmolada',
    manoObraPorM2: 45,
    descripcion:
      'Piso continuo vertido: imprimante, base epóxica con efecto marmolado ' +
      'y sellador final. Sin juntas.',
    lineas: [
      { material: 'primer-epoxico', porM2: 0.15, nota: 'Imprimante sobre el contrapiso.' },
      { material: 'kit-epoxico-base', porM2: 1.5, nota: 'Capa base de 1.5 mm aprox.' },
      { material: 'pigmento-marmolado', porM2: 15, nota: '15 ml por m² para el efecto veteado.' },
      { material: 'sellador-poliuretano-piso', porM2: 0.2, nota: 'Sellado final, brillo y resistencia al tránsito.' },
    ],
  },

  {
    id: 'piso_epoxico_flakes',
    nombre: 'Piso epóxico con flakes',
    manoObraPorM2: 38,
    descripcion:
      'Piso continuo vertido: imprimante, base epóxica, chips decorativos ' +
      'esparcidos y sellador final que los cubre y nivela.',
    lineas: [
      { material: 'primer-epoxico', porM2: 0.15, nota: 'Imprimante sobre el contrapiso.' },
      { material: 'kit-epoxico-base', porM2: 1.5, nota: 'Capa base de 1.5 mm aprox.' },
      { material: 'flakes-decorativos', porM2: 0.1, nota: 'Chips esparcidos a mano, cobertura decorativa.' },
      { material: 'sellador-poliuretano-piso', porM2: 0.3, nota: 'Capa más gruesa: nivela sobre los chips.' },
    ],
  },

  {
    id: 'piso_radiante',
    nombre: 'Piso radiante con calefacción eléctrica',
    manoObraPorM2: 40,
    descripcion:
      'Manta calefactora bajo el piso terminado, con aislante reflectivo y ' +
      'un termostato por ambiente. La instalación eléctrica final la hace un ' +
      'electricista habilitado.',
    lineas: [
      { material: 'manta-calefactora', porM2: 1, nota: 'Cobertura directa, m² a m².' },
      { material: 'aislante-reflectivo-radiante', porM2: 1, nota: 'Va debajo de la manta. Rollo de 10 m².' },
      { material: 'cinta-aislante-electrica', porM2: 0.05, nota: 'Empalmes del cable calefactor.' },
      // Cantidad real: 1 por ambiente, no por m². La sobreescribe
      // src/dominio/piso-radiante.js — este número es solo un valor de
      // partida para que la línea no aparezca en cero antes de calcular.
      { material: 'termostato-piso-radiante', porM2: 0.01, nota: '1 por ambiente, no escala con el área.' },
    ],
  },

  {
    id: 'casa_prefabricada',
    nombre: 'Casa prefabricada (tijeral y techo de calamina)',
    manoObraPorM2: 120,
    descripcion:
      'Estructura de parante y riel armada como tijeral, con techo de ' +
      'calamina. El precio se arma aparte, en src/dominio/casa-prefabricada.js: ' +
      'tijeral + techo por m² de piso, paredes por m² de perímetro × altura.',
    lineas: [
      // Estos números son por m² de PARED, no de piso: casa-prefabricada.js
      // los reescala según el perímetro real antes de multiplicar por el
      // área que recibe el motor de despiece.
      { material: 'riel-64', porM2: 0.277, nota: 'Riel superior e inferior, por m² de pared.' },
      { material: 'parante-64', porM2: 0.833, nota: 'Parante cada 0.40 m, por m² de pared.' },
      { material: 'tornillo-framer', porM2: 10, nota: 'Uniones de riel y parante, por m² de pared.' },
      { material: 'clavo-impacto', porM2: 3, nota: 'Fijación de la estructura a la base, por m² de pared.' },
      // Este sí es por m² de piso directo: el techo cubre lo mismo que el
      // piso, sin vuelo adicional.
      { material: 'calamina', porM2: 0.347, nota: 'Una plancha de calamina cubre 2.88 m² de techo.' },
    ],
  },
];
