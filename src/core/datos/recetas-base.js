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
];
