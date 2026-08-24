// Recetas: cuánto material se consume por cada m² de trabajo.
//
// Esto es el corazón del cálculo. Cuando llega un pedido "150 m² de cielo raso",
// el sistema multiplica cada línea de la receta por 150 y obtiene la lista de
// materiales a llevar.
//
// LOS CONSUMOS SON ESTIMADOS DE MERCADO. El administrador los edita desde
// Ajustes → Recetas, porque cada maestro trabaja con sus propios rendimientos y
// separaciones de perfil. Cambiar aquí el número cambia todas las cotizaciones
// futuras, no las ya emitidas.
//
// Campos de cada línea:
//   material      id de MATERIALES_BASE
//   porM2         unidades consumidas por metro cuadrado
//   nota          por qué ese número, para que el admin sepa qué está tocando

export const RECETAS_BASE = [
  {
    id: 'cielo_raso',
    nombre: 'Cielo raso suspendido (una cara)',
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
        nota: 'Alambre de colgado. Sube si el falso techo está muy separado de la losa.',
      },
      {
        material: 'clavo-impacto',
        porM2: 0.04,
        nota: '4 clavos por m² para fijar angular y colgantes.',
      },
      {
        material: 'tornillo-drywall-1',
        porM2: 0.22,
        nota: '22 tornillos por m² fijando plancha a omega.',
      },
      {
        material: 'tornillo-framer',
        porM2: 0.08,
        nota: '8 por m² en uniones de perfil.',
      },
      {
        material: 'cinta-malla',
        porM2: 0.018,
        nota: '1.6 ml de junta por m². Rollo de 90 m.',
      },
      {
        material: 'masilla-28',
        porM2: 0.016,
        nota: '0.45 kg por m² a dos manos. Balde de 28 kg.',
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
        porM2: 0.3,
        nota: '30 tornillos por m² contando las dos caras.',
      },
      {
        material: 'tornillo-framer',
        porM2: 0.1,
        nota: '10 por m² en encuentros de riel y parante.',
      },
      {
        material: 'clavo-impacto',
        porM2: 0.03,
        nota: 'Fijación de rieles a piso y techo.',
      },
      {
        material: 'cinta-malla',
        porM2: 0.033,
        nota: '3 ml de junta por m² por las dos caras.',
      },
      {
        material: 'masilla-28',
        porM2: 0.032,
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
    nombre: 'Cielo raso en zona húmeda (baño, cocina, exterior techado)',
    manoObraPorM2: 26,
    descripcion:
      'Igual que el cielo raso estándar pero con plancha resistente a la ' +
      'humedad. Se cotiza más caro por el material.',
    lineas: [
      {
        material: 'plancha-rh-127',
        porM2: 0.363,
        nota: 'Plancha RH. Mismo rendimiento que la estándar.',
      },
      { material: 'omega', porM2: 0.833, nota: 'Omega cada 0.40 m.' },
      { material: 'angular-24', porM2: 0.167, nota: 'Angular perimetral.' },
      { material: 'alambre-16', porM2: 0.15, nota: 'Alambre de colgado.' },
      { material: 'clavo-impacto', porM2: 0.04, nota: 'Fijación.' },
      {
        material: 'tornillo-drywall-1',
        porM2: 0.22,
        nota: 'Fijación de plancha.',
      },
      { material: 'tornillo-framer', porM2: 0.08, nota: 'Uniones de perfil.' },
      { material: 'cinta-malla', porM2: 0.018, nota: 'Juntas.' },
      { material: 'masilla-28', porM2: 0.016, nota: 'Empaste.' },
      { material: 'lija-120', porM2: 0.05, nota: 'Lijado.' },
    ],
  },
];
