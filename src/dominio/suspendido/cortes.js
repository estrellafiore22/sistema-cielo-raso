// Optimizadores de corte.
//
// Hay dos reglas distintas según el material:
//
// CON EMPATE (T principal, secundaria, terciaria)
//   Una barra trae dos puntas de fábrica. Cada corte parte un tramo en dos,
//   pero solo sirve el tramo que conserva una punta. Por eso de una barra
//   salen COMO MÁXIMO DOS piezas útiles, una por cada punta, y lo que queda
//   en medio es chatarra sin valor.
//   Eso convierte el problema en emparejar cortes de dos en dos sin pasarse
//   del largo de la barra. Con la lista ordenada, dos punteros dan el
//   ÓPTIMO exacto, no una aproximación.
//
// SIN EMPATE (ángulo perimetral, baldosas)
//   Se empalman a tope o se cortan con cuchilla. De una pieza salen tantos
//   pedazos como quepan. Aquí se usa "el más grande primero", que es la
//   heurística estándar para este caso.

const TOL = 0.001;

/**
 * @param {number} largoBarra
 * @param {number[]} largosPedidos  cada pieza que hay que obtener
 * @param {number} minimoSobranteUtil
 */
export function cortarConEmpates(largoBarra, largosPedidos, minimoSobranteUtil = 15) {
  const completas = largosPedidos.filter((l) => l >= largoBarra - TOL).length;
  const porCortar = largosPedidos
    .filter((l) => l > TOL && l < largoBarra - TOL)
    .sort((a, b) => a - b);

  const barras = [];
  let i = 0;
  let j = porCortar.length - 1;

  while (i <= j) {
    if (i === j) {
      barras.push({ piezas: [porCortar[i]] });
      break;
    }
    if (porCortar[i] + porCortar[j] <= largoBarra + TOL) {
      // La más larga y la más corta caben juntas: una por cada punta.
      barras.push({ piezas: [porCortar[j], porCortar[i]] });
      i += 1;
      j -= 1;
    } else {
      // La más larga no admite compañía: se lleva una barra sola.
      barras.push({ piezas: [porCortar[j]] });
      j -= 1;
    }
  }

  return resumir(largoBarra, completas, barras, minimoSobranteUtil, 2);
}

/** Sin restricción de empate: caben tantas piezas como entren. */
export function cortarLibre(largoBarra, largosPedidos, minimoSobranteUtil = 15) {
  const completas = largosPedidos.filter((l) => l >= largoBarra - TOL).length;
  const porCortar = largosPedidos
    .filter((l) => l > TOL && l < largoBarra - TOL)
    .sort((a, b) => b - a);

  const barras = [];
  for (const pieza of porCortar) {
    let colocada = false;
    for (const barra of barras) {
      const usado = barra.piezas.reduce((s, p) => s + p, 0);
      if (usado + pieza <= largoBarra + TOL) {
        barra.piezas.push(pieza);
        colocada = true;
        break;
      }
    }
    if (!colocada) barras.push({ piezas: [pieza] });
  }

  return resumir(largoBarra, completas, barras, minimoSobranteUtil, Infinity);
}

/**
 * Convierte el reparto en el detalle que se imprime: qué se cortó, qué
 * sobró y para cuántos huecos más alcanza cada sobrante.
 */
function resumir(largoBarra, completas, barras, minimoSobranteUtil, maxPiezas) {
  const detalleCortes = [];
  const sobrantes = [];
  let mermaTotal = 0;

  for (const barra of barras) {
    const usado = barra.piezas.reduce((s, p) => s + p, 0);
    const resto = redondear(largoBarra - usado);

    detalleCortes.push({ piezas: barra.piezas.map(redondear), resto });

    // Con la barra llena de piezas útiles no queda nada aprovechable en medio.
    const quedanPuntas = barra.piezas.length < maxPiezas;
    if (resto > TOL) {
      if (quedanPuntas && resto >= minimoSobranteUtil) sobrantes.push(resto);
      else mermaTotal = redondear(mermaTotal + resto);
    }
  }

  const barrasCortadas = barras.length;
  const piezasCortadas = barras.reduce((s, b) => s + b.piezas.length, 0);

  return {
    barrasCompletas: completas,
    barrasCortadas,
    barrasTotales: completas + barrasCortadas,
    piezasCortadas,
    cortes: agruparCortes(detalleCortes),
    detalleCortes,
    sobrantes: agruparSobrantes(sobrantes),
    mermaTotal,
  };
}

/** "4 barras cortadas a 47 cm" en vez de cuatro líneas iguales. */
function agruparCortes(detalle) {
  const mapa = new Map();
  for (const barra of detalle) {
    const clave = barra.piezas.join(' + ');
    if (!mapa.has(clave)) {
      mapa.set(clave, { piezas: barra.piezas, resto: barra.resto, barras: 0 });
    }
    mapa.get(clave).barras += 1;
  }
  return Array.from(mapa.values()).sort((a, b) => b.barras - a.barras);
}

/**
 * Agrupa los sobrantes y calcula para cuántos huecos sirve cada uno.
 * `alcances` se llena después, cuando ya se sabe qué medidas de hueco
 * quedaron pendientes en la obra.
 */
function agruparSobrantes(sobrantes) {
  const mapa = new Map();
  for (const largo of sobrantes) {
    const clave = redondear(largo);
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([largo, cantidad]) => ({ largo, cantidad }))
    .sort((a, b) => b.largo - a.largo);
}

/**
 * Para cada sobrante, cuántos recortes de `medida` salen todavía.
 * Es lo que el dueño pidió: "de 21 cm que sobran, ¿cuántos huecos de 15 tapo?".
 *
 * Ojo: en las T solo sirve el pedazo que conserva la punta de fábrica, así
 * que de un sobrante sale UN recorte útil, no varios. En baldosas y ángulo
 * perimetral sí salen varios.
 */
export function alcanceDeSobrantes(sobrantes, medida, conEmpate) {
  const m = Number(medida);
  if (!Number.isFinite(m) || m <= 0) return [];
  return sobrantes
    .map((s) => {
      const salen = conEmpate ? (s.largo >= m ? 1 : 0) : Math.floor(s.largo / m);
      return {
        largo: s.largo,
        cantidad: s.cantidad,
        recortes: salen * s.cantidad,
        restoPorPieza: redondear(s.largo - salen * m),
      };
    })
    .filter((s) => s.recortes > 0);
}

/** Convierte una cantidad en centímetros a "N unidades y R cm". */
export function unidadesYResto(totalCm, largoUnidad) {
  const total = Math.max(0, Number(totalCm) || 0);
  const unidades = Math.floor(total / largoUnidad + TOL);
  const resto = redondear(total - unidades * largoUnidad);
  return {
    totalCm: redondear(total),
    unidades,
    resto,
    comprar: resto > TOL ? unidades + 1 : unidades,
    sobranteUltima: resto > TOL ? redondear(largoUnidad - resto) : 0,
  };
}

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
