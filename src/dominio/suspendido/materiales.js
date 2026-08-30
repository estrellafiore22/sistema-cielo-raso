// De la retícula a la lista de materiales, con el detalle de cada corte.

import { LARGOS, MODULO, NOMBRES } from './config.js';
import { cortarConEmpates, cortarLibre, unidadesYResto } from './cortes.js';

const TOL = 0.001;

export function calcular(grid, cfg) {
  const perimetral = calcularPerimetral(grid, cfg);
  const principal = calcularPrincipal(grid, cfg);

  // Las secundarias que quedarían más cortas que una terciaria se reemplazan
  // por terciarias: es el mismo perfil y cuesta la mitad. Cortar una
  // secundaria de 122 para tapar 47 cm es tirar plata.
  const { resultado: secundaria, aTerciaria } = calcularSecundaria(grid, cfg);
  const terciaria = calcularTerciaria(grid, cfg, aTerciaria);

  const baldosa = calcularBaldosa(grid, cfg);
  const suspension = calcularSuspension(grid, cfg);
  const fijacion = calcularFijacion(grid, cfg);

  return {
    perimetral,
    principal,
    secundaria,
    terciaria,
    baldosa,
    alambre: suspension.alambre,
    tornillo: suspension.tornillo,
    comboClavos: fijacion,
  };
}

// --- Ángulo perimetral ------------------------------------------------------
// Se empalma a tope contra la pared, así que no necesita puntas de empate:
// de una barra salen tantos pedazos como quepan.

function calcularPerimetral(grid, cfg) {
  const piezas = grid.perimetro.lados.flatMap((lado) =>
    trocear(lado.largo, LARGOS.perimetral),
  );
  const corte = cortarLibre(LARGOS.perimetral, piezas, cfg.minimoSobranteUtil);
  const total = grid.perimetro.total;

  return armar('perimetral', LARGOS.perimetral, total, corte, {
    // Se empalma a tope contra la pared: cualquier pedazo sirve.
    conEmpate: false,
    detalle: `Perímetro ${redondear(total)} cm`,
  });
}

// --- T principal ------------------------------------------------------------

function calcularPrincipal(grid, cfg) {
  const lineas = grid.principales;
  const completas = lineas.reduce((s, l) => s + l.tramos.enteras, 0);
  const restos = lineas.map((l) => l.tramos.resto).filter((r) => r > TOL);

  const corte = cortarConEmpates(LARGOS.principal, restos, cfg.minimoSobranteUtil);
  const total = lineas.reduce((s, l) => s + l.largo, 0);

  return armar('principal', LARGOS.principal, total, corte, {
    barrasCompletasExtra: completas,
    detalle: `${lineas.length} línea(s) de ${redondear(lineas[0]?.largo || 0)} cm`,
  });
}

// --- T secundaria -----------------------------------------------------------

function calcularSecundaria(grid, cfg) {
  const largos = grid.secundarias.map((s) => s.largo);
  const completas = largos.filter((l) => l >= LARGOS.secundaria - TOL);

  // Todo lo que quepa dentro de una terciaria se pasa a terciaria.
  const aTerciaria = largos.filter((l) => l > TOL && l <= LARGOS.terciaria + TOL);
  const porCortar = largos.filter(
    (l) => l > LARGOS.terciaria + TOL && l < LARGOS.secundaria - TOL,
  );

  const corte = cortarConEmpates(LARGOS.secundaria, porCortar, cfg.minimoSobranteUtil);
  const total = [...completas, ...porCortar].reduce((s, l) => s + l, 0);

  const resultado = armar('secundaria', LARGOS.secundaria, total, corte, {
    barrasCompletasExtra: completas.length,
    sustituciones: aTerciaria.length
      ? {
          cantidad: aTerciaria.length,
          largo: redondear(aTerciaria[0]),
          nota:
            `${aTerciaria.length} tramo(s) de ${redondear(aTerciaria[0])} cm se ` +
            'resuelven con T terciaria, que es el mismo perfil y cuesta menos.',
        }
      : null,
  });

  return { resultado, aTerciaria };
}

// --- T terciaria ------------------------------------------------------------

function calcularTerciaria(grid, cfg, heredadas) {
  const largos = [...grid.terciarias.map((t) => t.largo), ...heredadas];
  const completas = largos.filter((l) => l >= LARGOS.terciaria - TOL);
  const porCortar = largos.filter((l) => l > TOL && l < LARGOS.terciaria - TOL);

  const corte = cortarConEmpates(LARGOS.terciaria, porCortar, cfg.minimoSobranteUtil);
  const total = largos.reduce((s, l) => s + l, 0);

  return armar('terciaria', LARGOS.terciaria, total, corte, {
    barrasCompletasExtra: completas.length,
    recibidas: heredadas.length,
  });
}

// --- Baldosas ---------------------------------------------------------------
// Se cortan con cuchilla, no llevan empate: de una baldosa salen varios
// pedazos mientras alcancen.

function calcularBaldosa(grid, cfg) {
  const completas = grid.baldosas.filter((b) => b.completa).length;

  const enAncho = grid.baldosas
    .filter((b) => b.cortadaAncho && !b.cortadaAlto)
    .map((b) => b.ancho);
  const enAlto = grid.baldosas
    .filter((b) => b.cortadaAlto && !b.cortadaAncho)
    .map((b) => b.alto);
  const esquinas = grid.baldosas.filter((b) => b.cortadaAncho && b.cortadaAlto);

  const corteAncho = cortarLibre(MODULO, enAncho, cfg.minimoSobranteUtil);
  const corteAlto = cortarLibre(MODULO, enAlto, cfg.minimoSobranteUtil);

  // Cada esquina se resuelve con una baldosa propia: hay que cortarla en las
  // dos direcciones y el pedazo restante ya no sirve para otra esquina.
  const baldosasEsquina = esquinas.length;

  const comprar =
    completas + corteAncho.barrasCortadas + corteAlto.barrasCortadas + baldosasEsquina;

  return {
    clave: 'baldosa',
    nombre: NOMBRES.baldosa,
    unidad: 'baldosa',
    largoUnidad: MODULO,
    piezasCompletas: completas,
    comprar,
    totalCm: null,
    unidades: comprar,
    resto: 0,
    sobranteUltima: 0,
    cortes: [
      ...corteAncho.cortes.map((c) => ({ ...c, direccion: 'ancho' })),
      ...corteAlto.cortes.map((c) => ({ ...c, direccion: 'alto' })),
    ],
    baldosasCortadas:
      corteAncho.barrasCortadas + corteAlto.barrasCortadas + baldosasEsquina,
    esquinas: esquinas.map((e) => ({ ancho: e.ancho, alto: e.alto })),
    sobrantes: [...corteAncho.sobrantes, ...corteAlto.sobrantes],
    merma: redondear(corteAncho.mermaTotal + corteAlto.mermaTotal),
    conEmpate: false,
  };
}

// --- Suspensión: alambre y tornillos ----------------------------------------

function calcularSuspension(grid, cfg) {
  const paso = cfg.pasoAlambre;
  const lineas = grid.principales.length;

  // Un punto en cada extremo más los intermedios, sobre cada T principal.
  const largoLinea = grid.principales[0]?.largo || 0;
  const puntosPorLinea = lineas > 0 ? Math.floor(largoLinea / paso + TOL) + 1 : 0;
  const puntos = lineas * puntosPorLinea;

  // Por cada punto: lo que cuelga hasta la baldosa, más lo que se gasta
  // amarrando arriba y abajo.
  const cmPorPunto =
    (Number(cfg.distanciaLosa) || 0) + (Number(cfg.sobranteAmarre) || 0);
  const totalCm = puntos * cmPorPunto;

  return {
    alambre: {
      clave: 'alambre',
      nombre: NOMBRES.alambre,
      unidad: 'm',
      largoUnidad: 100,
      puntos,
      puntosPorLinea,
      lineas,
      paso,
      cmPorPunto,
      distanciaLosa: Number(cfg.distanciaLosa) || 0,
      sobranteAmarre: Number(cfg.sobranteAmarre) || 0,
      totalCm: redondear(totalCm),
      // Se cobra por metro, así que se redondea hacia arriba.
      unidades: Math.ceil(totalCm / 100),
      comprar: Math.ceil(totalCm / 100),
      cortes: [],
      sobrantes: [],
      merma: 0,
      conEmpate: false,
      detalle:
        `${puntos} punto(s) cada ${paso} cm × ${cmPorPunto} cm ` +
        `(${cfg.distanciaLosa} de caída + ${cfg.sobranteAmarre} de amarre)`,
    },
    tornillo: {
      clave: 'tornillo',
      nombre: NOMBRES.tornillo,
      unidad: 'un',
      puntos,
      unidades: puntos * cfg.tornillosPorPunto,
      comprar: puntos * cfg.tornillosPorPunto,
      cortes: [],
      sobrantes: [],
      merma: 0,
      conEmpate: false,
      detalle: `${cfg.tornillosPorPunto} por cada punto de alambre`,
    },
  };
}

// --- Fijación del perimetral: clavo + fulminante ----------------------------

function calcularFijacion(grid, cfg) {
  const paso = cfg.pasoClavos;
  const pares = grid.perimetro.lados.reduce(
    (suma, lado) => suma + Math.floor(lado.largo / paso + TOL) + 1,
    0,
  );
  // Se venden en combo; un combo cubre `paresPorCombo` pares.
  const combos = pares > 0 ? Math.ceil(pares / cfg.paresPorCombo) : 0;

  return {
    clave: 'comboClavos',
    nombre: NOMBRES.comboClavos,
    unidad: 'combo',
    unidadConsumo: 'par',
    pares,
    paso,
    paresPorCombo: cfg.paresPorCombo,
    // Lo que se instala son pares; lo que se compra son combos.
    consumo: pares,
    unidades: combos,
    comprar: combos,
    cortes: [],
    sobrantes: [],
    merma: 0,
    conEmpate: false,
    detalle: `${pares} par(es) cada ${paso} cm en el perímetro`,
  };
}

// --- Utilidades -------------------------------------------------------------

/** Parte un lado largo en pedazos que quepan en una barra de fábrica. */
function trocear(largo, largoBarra) {
  const salida = [];
  let resto = largo;
  while (resto > largoBarra + TOL) {
    salida.push(largoBarra);
    resto = redondear(resto - largoBarra);
  }
  if (resto > TOL) salida.push(resto);
  return salida;
}

function armar(clave, largoUnidad, totalCm, corte, extra = {}) {
  const medida = unidadesYResto(totalCm, largoUnidad);
  const completas = (extra.barrasCompletasExtra || 0) + corte.barrasCompletas;
  const piezas = completas + corte.piezasCortadas;

  return {
    clave,
    nombre: NOMBRES[clave],
    unidad: 'un',
    largoUnidad,
    totalCm: medida.totalCm,
    // "3 un y 50 cm": lo que realmente se instala
    unidades: medida.unidades,
    resto: medida.resto,
    sobranteUltima: medida.sobranteUltima,
    // Lo que hay que comprar sale del reparto de cortes, no de dividir el total:
    // una barra cortada a la mitad no rinde dos barras.
    piezasCompletas: completas,
    // Piezas que se instalan de verdad, enteras más recortadas.
    piezas,
    barrasCortadas: corte.barrasCortadas,
    comprar: completas + corte.barrasCortadas,
    cortes: corte.cortes,
    sobrantes: corte.sobrantes,
    merma: corte.mermaTotal,
    conEmpate: true,
    ...extra,
  };
}

function redondear(n, decimales = 2) {
  const f = Math.pow(10, decimales);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
