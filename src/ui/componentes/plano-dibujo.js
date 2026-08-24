// Dibuja el plano de la retícula en SVG. Solo construye nodos; el acercar y
// alejar vive en plano.js.

import { COLORES } from '../../dominio/suspendido/config.js';
import { preparar, rotuloTramos } from '../../dominio/suspendido/dibujo.js';

const NS = 'http://www.w3.org/2000/svg';

// Márgenes para las cotas, en centímetros del propio plano.
const MARGEN = { izq: 120, arriba: 120, der: 60, abajo: 60 };

const GROSOR = { perimetral: 4, principal: 3, secundaria: 2, terciaria: 1.2 };

export function svg(etiqueta, atributos = {}, hijos = []) {
  const nodo = document.createElementNS(NS, etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor !== null && valor !== undefined) nodo.setAttribute(clave, String(valor));
  }
  for (const hijo of [].concat(hijos)) if (hijo) nodo.appendChild(hijo);
  return nodo;
}

/**
 * @returns {{raiz: SVGElement, camara: SVGGElement, etiquetas: SVGGElement, caja: object}}
 */
export function construir(grid) {
  const plano = preparar(grid);
  const { ancho: A, largo: L } = plano;

  const caja = {
    x: -MARGEN.izq,
    y: -MARGEN.arriba,
    ancho: A + MARGEN.izq + MARGEN.der,
    alto: L + MARGEN.arriba + MARGEN.abajo,
  };

  const raiz = svg('svg', {
    viewBox: `${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}`,
    class: 'plano__svg',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': `Plano de la retícula, ${A} por ${L} centímetros`,
  });

  const camara = svg('g', { class: 'plano__camara' });
  const etiquetas = svg('g', { class: 'plano__etiquetas', 'font-size': 14 });

  camara.appendChild(baldosas(plano));
  camara.appendChild(barras(plano, etiquetas));
  camara.appendChild(puntos(plano));
  camara.appendChild(cotas(plano, etiquetas));
  camara.appendChild(etiquetas);

  raiz.appendChild(camara);
  return { raiz, camara, etiquetas, caja };
}

/** Las baldosas al fondo; las recortadas van sombreadas. */
function baldosas(plano) {
  const grupo = svg('g', { class: 'plano__baldosas' });
  for (const b of plano.baldosas) {
    grupo.appendChild(
      svg('rect', {
        x: b.x1,
        y: b.y1,
        width: b.x2 - b.x1,
        height: b.y2 - b.y1,
        fill: b.completa ? 'var(--plano-baldosa)' : COLORES.baldosaCorte,
        'fill-opacity': b.completa ? 0.35 : 0.55,
        stroke: 'none',
      }),
    );
  }
  return grupo;
}

function barras(plano, etiquetas) {
  const grupo = svg('g', { class: 'plano__barras' });
  const orden = ['terciaria', 'secundaria', 'principal', 'perimetral'];

  for (const tipo of orden) {
    for (const s of plano.segmentos.filter((s) => s.tipo === tipo)) {
      grupo.appendChild(
        svg('line', {
          x1: s.x1,
          y1: s.y1,
          x2: s.x2,
          y2: s.y2,
          stroke: COLORES[tipo],
          'stroke-width': GROSOR[tipo],
          'stroke-linecap': 'square',
          'vector-effect': 'non-scaling-stroke',
        }),
      );

      // Rótulo solo donde aporta: en las principales y en las piezas cortadas.
      if (tipo === 'principal') {
        etiquetas.appendChild(
          texto(medio(s), rotuloTramos(s), COLORES.principal, 'principal'),
        );
      } else if (s.completa === false) {
        etiquetas.appendChild(
          texto(medio(s), `${redondear(s.largo)}`, COLORES.cotaRecorte, 'recorte'),
        );
      }
    }
  }
  return grupo;
}

function puntos(plano) {
  const grupo = svg('g', { class: 'plano__puntos' });
  for (const p of plano.puntos) {
    grupo.appendChild(
      svg('circle', {
        cx: p.x,
        cy: p.y,
        r: 5,
        fill: 'none',
        stroke: COLORES.principal,
        'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke',
      }),
    );
  }
  return grupo;
}

/** Cadenas de cota arriba y a la izquierda, más las medidas totales. */
function cotas(plano, etiquetas) {
  const grupo = svg('g', { class: 'plano__cotas' });
  const { ancho: A, largo: L } = plano;

  const yCota = -45;
  const xCota = -45;

  for (const t of plano.cotasX) {
    const color = t.esRecorte ? COLORES.cotaRecorte : COLORES.cota;
    grupo.appendChild(linea(t.desde, yCota, t.hasta, yCota, color));
    grupo.appendChild(marca(t.desde, yCota, color, true));
    grupo.appendChild(marca(t.hasta, yCota, color, true));
    etiquetas.appendChild(
      texto({ x: (t.desde + t.hasta) / 2, y: yCota - 14 }, `${redondear(t.largo)}`, color, 'cota'),
    );
  }

  for (const t of plano.cotasY) {
    const color = t.esRecorte ? COLORES.cotaRecorte : COLORES.cota;
    grupo.appendChild(linea(xCota, t.desde, xCota, t.hasta, color));
    grupo.appendChild(marca(xCota, t.desde, color, false));
    grupo.appendChild(marca(xCota, t.hasta, color, false));
    etiquetas.appendChild(
      texto({ x: xCota - 12, y: (t.desde + t.hasta) / 2 }, `${redondear(t.largo)}`, color, 'cota-v'),
    );
  }

  // Totales, por fuera de las cadenas
  grupo.appendChild(linea(0, -95, A, -95, COLORES.cota));
  grupo.appendChild(marca(0, -95, COLORES.cota, true));
  grupo.appendChild(marca(A, -95, COLORES.cota, true));
  etiquetas.appendChild(
    texto({ x: A / 2, y: -105 }, `${redondear(A)} cm`, COLORES.cota, 'total'),
  );

  grupo.appendChild(linea(-95, 0, -95, L, COLORES.cota));
  grupo.appendChild(marca(-95, 0, COLORES.cota, false));
  grupo.appendChild(marca(-95, L, COLORES.cota, false));
  etiquetas.appendChild(
    texto({ x: -105, y: L / 2 }, `${redondear(L)} cm`, COLORES.cota, 'total-v'),
  );

  return grupo;
}

function linea(x1, y1, x2, y2, color) {
  return svg('line', {
    x1, y1, x2, y2,
    stroke: color,
    'stroke-width': 1,
    'vector-effect': 'non-scaling-stroke',
  });
}

/** Marca de extremo de cota: una rayita perpendicular. */
function marca(x, y, color, horizontal) {
  const d = 8;
  return svg('line', {
    x1: horizontal ? x : x - d,
    y1: horizontal ? y - d : y,
    x2: horizontal ? x : x + d,
    y2: horizontal ? y + d : y,
    stroke: color,
    'stroke-width': 1,
    'vector-effect': 'non-scaling-stroke',
  });
}

function texto(pos, contenido, color, clase) {
  const vertical = clase === 'cota-v' || clase === 'total-v';
  const nodo = svg('text', {
    x: pos.x,
    y: pos.y,
    fill: color,
    'text-anchor': vertical ? 'end' : 'middle',
    'dominant-baseline': 'middle',
    class: 'plano__texto plano__texto--' + clase,
    'font-weight': clase === 'total' || clase === 'total-v' ? 700 : 500,
  });
  if (vertical) nodo.setAttribute('transform', `rotate(-90 ${pos.x} ${pos.y})`);
  nodo.textContent = contenido;
  return nodo;
}

function medio(s) {
  return { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 };
}

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
