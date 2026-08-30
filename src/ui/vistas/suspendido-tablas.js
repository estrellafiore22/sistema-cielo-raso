// Tablas de resultado del cielo raso suspendido.
//
// Dos tablas separadas a propósito:
//   TÉCNICA  lo que se instala y se corta, en unidades y centímetros
//   PRECIOS  lo que se compra, en la unidad en que cobra el proveedor

import { div, h, p, el, tabla, insignia, boton } from '../componentes/dom.js';
import { soles, numero } from '../../core/formato.js';
import { guardarConfig, tarifasCliente } from '../../dominio/suspendido/config.js';

export function tablaTecnica(calculo, alCambiar) {
  const filas = calculo.lineas.filter((l) => l.cantidad > 0);

  return div('bloque', [
    h(3, 'Material a instalar', 'panel__subtitulo'),
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        {
          titulo: 'Se instala',
          clase: 'col-num',
          celda: (l) => seInstala(l.material, alCambiar),
        },
        {
          titulo: 'Piezas',
          clase: 'col-num',
          celda: (l) => (l.material.piezas ? String(l.material.piezas) : '\u2014'),
        },
        {
          titulo: 'Enteras',
          clase: 'col-num',
          celda: (l) => (l.material.piezasCompletas ?? '\u2014'),
        },
        {
          titulo: 'Cortadas',
          clase: 'col-num',
          celda: (l) =>
            l.material.barrasCortadas || l.material.baldosasCortadas || '\u2014',
        },
        {
          titulo: 'Merma',
          clase: 'col-num col-falta',
          celda: (l) =>
            l.material.merma ? `${numero(l.material.merma, 0)} cm` : '\u2014',
        },
        {
          titulo: 'Comprar',
          clase: 'col-num',
          celda: (l) => `${l.cantidad} ${l.unidad}`,
        },
      ],
      filas,
    ),
    p(
      'Ojo con leer "se instala" como piezas: en los perfiles es el LARGO ' +
        'total, contado en barras de f\u00e1brica. Las piezas van en su propia ' +
        'columna y siempre son m\u00e1s que las barras a comprar, porque de una ' +
        'barra cortada salen dos piezas \u00fatiles.',
      'texto-tenue',
    ),
  ]);
}

/** Lo que de verdad entra en la obra, en la unidad que corresponde. */
function seInstala(material, alCambiar) {
  // El alambre se edita aqu\u00ed mismo: cu\u00e1nto cuelga cambia en cada obra.
  if (material.clave === 'alambre') return celdaAlambre(material, alCambiar);

  if (material.clave === 'comboClavos') return `${material.consumo} par`;

  if (material.totalCm === null || material.totalCm === undefined) {
    return `${material.unidades} ${material.unidad}`;
  }

  const partes = [`${material.unidades} bar`];
  if (material.resto > 0) partes.push(`${numero(material.resto, 0)} cm`);
  return partes.join(' + ');
}

function celdaAlambre(material, alCambiar) {
  const caja = div('celda-alambre');
  caja.appendChild(el('strong', { texto: `${numero(material.totalCm / 100, 2)} m` }));

  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: material.distanciaLosa,
    atributos: { 'aria-label': 'Ca\u00edda desde la losa, en cent\u00edmetros' },
  });
  entrada.min = '1';
  entrada.step = '5';
  entrada.addEventListener('change', () => {
    guardarConfig({ distanciaLosa: entrada.value });
    if (typeof alCambiar === 'function') alCambiar();
  });

  caja.appendChild(
    div('celda-alambre__editor', [
      el('span', { clase: 'celda-alambre__etiqueta', texto: 'Ca\u00edda (cm)' }),
      entrada,
    ]),
  );
  caja.appendChild(
    el('span', {
      clase: 'celda-alambre__nota',
      texto:
        `${material.puntos} puntos \u00d7 ${material.cmPorPunto} cm ` +
        `(+${material.sobranteAmarre} de amarre)`,
    }),
  );
  return caja;
}

export function tablaPrecios(calculo) {
  const filas = calculo.lineas.filter((l) => l.cantidad > 0);

  const cuerpo = div('bloque', [
    h(3, 'Precios', 'panel__subtitulo'),
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        { titulo: 'Cantidad', clase: 'col-num', celda: (l) => `${l.cantidad} ${l.unidad}` },
        {
          titulo: 'P. unitario',
          clase: 'col-num',
          celda: (l) =>
            l.sinPrecio
              ? el('span', { clase: 'texto-peligro', texto: 'sin precio' })
              : soles(l.precioUnit),
        },
        { titulo: 'Subtotal', clase: 'col-num', celda: (l) => soles(l.subtotal) },
      ],
      filas,
    ),
    div('resumen__total', [
      el('span', { texto: 'Total del material' }),
      el('strong', { texto: soles(calculo.total) }),
    ]),
  ]);

  if (calculo.faltanPrecios.length) {
    cuerpo.appendChild(
      p(
        `Sin precio cargado: ${calculo.faltanPrecios.join(', ')}. ` +
          'Cárgalo abajo para que el total sea real.',
        'aviso-linea aviso-linea--alerta',
      ),
    );
  }

  cuerpo.appendChild(
    p(
      'El alambre se cobra por metro entero y los clavos por combo de ' +
        `${calculo.config.paresPorCombo} pares, aunque se usen menos.`,
      'texto-tenue',
    ),
  );

  return cuerpo;
}

/** Detalle de cortes: qué se recorta y para qué sirve lo que sobra. */
export function tablaRecortes(calculo) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Recortes y sobrantes', 'panel__subtitulo'));

  const conCortes = calculo.lineas.filter(
    (l) => l.material.cortes && l.material.cortes.length > 0,
  );

  if (conCortes.length === 0) {
    caja.appendChild(p('Las medidas caen justas: no hay que cortar nada.', 'texto-ok'));
  }

  for (const linea of conCortes) {
    const m = linea.material;
    const bloque = div('recorte');
    bloque.appendChild(
      div('recorte__cabecera', [
        el('strong', { texto: m.nombre }),
        insignia(m.conEmpate ? 'necesita empate' : 'corte libre', m.conEmpate ? 'alerta' : 'neutro'),
      ]),
    );

    bloque.appendChild(
      tabla(
        [
          {
            titulo: 'Se corta',
            celda: (c) =>
              `${c.barras} ${etiquetaPieza(m)}${c.barras > 1 ? 's' : ''} → ` +
              c.piezas.map((x) => `${numero(x, 0)} cm`).join(' + '),
          },
          {
            titulo: 'Queda',
            clase: 'col-num',
            celda: (c) => (c.resto > 0 ? `${numero(c.resto, 0)} cm` : '—'),
          },
          {
            titulo: 'Sirve',
            celda: (c) => celdaSirve(m, c),
          },
        ],
        m.cortes,
      ),
    );

    if (m.sustituciones) {
      bloque.appendChild(p(m.sustituciones.nota, 'aviso-linea aviso-linea--ok'));
    }

    caja.appendChild(bloque);
  }

  const sobrantes = calculo.sobrantes.filter((s) => s.piezas.length);
  if (sobrantes.length) {
    caja.appendChild(h(4, 'Queda para otras obras', 'bloque__titulo'));
    for (const s of sobrantes) {
      const linea = s.piezas
        .map((x) => `${x.cantidad} × ${numero(x.largo, 0)} cm`)
        .join(' · ');
      const detalle = div('recorte__sobrante');
      detalle.appendChild(el('strong', { texto: s.nombre + ': ' }));
      detalle.appendChild(el('span', { texto: linea }));

      for (const alcance of s.alcances.slice(0, 3)) {
        const total = alcance.detalle.reduce((t, d) => t + d.recortes, 0);
        if (total > 0) {
          detalle.appendChild(
            el('span', {
              clase: 'recorte__alcance',
              texto: ` — alcanza para ${total} recorte(s) de ${numero(alcance.medida, 0)} cm`,
            }),
          );
        }
      }
      caja.appendChild(detalle);
    }
  }

  return caja;
}

/** Si el sobrante todavía se puede usar, y por qué. */
function celdaSirve(material, corte) {
  if (corte.resto <= 0) return '—';
  if (!material.conEmpate) {
    return el('span', { clase: 'texto-ok', texto: 'sí' });
  }
  return corte.piezas.length >= 2
    ? el('span', { clase: 'texto-peligro', texto: 'no, sin empate' })
    : el('span', { clase: 'texto-ok', texto: 'sí, con empate' });
}

function etiquetaPieza(material) {
  return material.clave === 'baldosa' ? 'baldosa' : 'barra';
}

/** Aviso de la orientación elegida y cuánto ahorra. */
export function avisoOrientacion(calculo, alCambiar) {
  const c = calculo.comparacion;
  const caja = div('bloque bloque--resaltado');

  caja.appendChild(
    p(
      `T principales en ${nombreOrientacion(calculo.orientacion)} — ${soles(c.elegida.total)}`,
      'destacado',
    ),
  );

  if (c.ahorro > 0) {
    caja.appendChild(
      p(
        `En ${nombreOrientacion(c.alternativa.orientacion)} costaría ` +
          `${soles(c.alternativa.total)}. Esta orientación ahorra ${soles(c.ahorro)}.`,
        'aviso-linea aviso-linea--ok',
      ),
    );
  } else if (c.ahorro < 0) {
    caja.appendChild(
      p(
        `Forzaste esta orientación. En ${nombreOrientacion(c.alternativa.orientacion)} ` +
          `costaría ${soles(c.alternativa.total)}, o sea ${soles(-c.ahorro)} menos.`,
        'aviso-linea aviso-linea--alerta',
      ),
    );
  } else {
    caja.appendChild(p('Las dos orientaciones cuestan lo mismo.', 'texto-tenue'));
  }

  caja.appendChild(
    div('cotizador__acciones', [
      boton('Girar las T principales', alCambiar, {
        clase: 'boton boton--secundario boton--pequeno',
      }),
    ]),
  );
  return caja;
}

export function nombreOrientacion(orientacion) {
  return orientacion === 'vertical' ? 'vertical' : 'horizontal';
}

/**
 * Lo que de verdad le queda a la tienda. No se le muestra al cliente: va en
 * la pantalla del vendedor y en la orden interna.
 */
export function cuadroTienda(cuenta) {
  if (!cuenta) return div('');

  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Cuentas de la tienda', 'panel__subtitulo'));

  const lista = el('dl', { clase: 'resumen__lista' });
  const filas = [
    ['Precio cobrado al cliente', soles(cuenta.cobradoAlCliente)],
    ['Precio de materiales', '\u2212 ' + soles(cuenta.materiales)],
    ['Precio por mano de obra', '\u2212 ' + soles(cuenta.manoObra)],
    ['Precio por transporte', '+ ' + soles(cuenta.transporte)],
  ];
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);

  caja.appendChild(
    div('resumen__total', [
      el('span', { texto: 'Ganancia de la tienda' }),
      el('strong', {
        texto: soles(cuenta.ganancia),
        clase: cuenta.ganancia < 0 ? 'texto-peligro' : 'texto-ok',
      }),
    ]),
  );

  if (cuenta.ganancia < 0) {
    caja.appendChild(
      p(
        'Est\u00e1s vendiendo por debajo del costo. Revisa el precio por m\u00b2 o la ' +
          'promoci\u00f3n elegida.',
        'aviso-linea aviso-linea--alerta',
      ),
    );
  }

  caja.appendChild(
    p(
      'El transporte suma porque tambi\u00e9n queda para la tienda.',
      'texto-tenue',
    ),
  );
  return caja;
}

/** Selector de precio de lista o promoci\u00f3n. */
export function selectorPromocion(estado, m2, alCambiar) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Precio al cliente', 'panel__subtitulo'));

  const opciones = div('opciones');
  for (const tarifa of tarifasCliente()) {
    const activa = (estado.promocion || 'lista') === tarifa.id;
    const boton = el('button', {
      tipo: 'button',
      clase: 'opcion' + (activa ? ' opcion--activa' : ''),
      alHacerClic: () => {
        estado.promocion = tarifa.id;
        alCambiar();
      },
    });
    boton.appendChild(el('strong', { texto: tarifa.nombre }));
    boton.appendChild(
      el('span', { clase: 'opcion__precio', texto: `${soles(tarifa.precio)} / m\u00b2` }),
    );
    opciones.appendChild(boton);
  }
  caja.appendChild(opciones);
  caja.appendChild(
    p('Los precios de promoci\u00f3n se editan en Ajustes.', 'texto-tenue'),
  );
  return caja;
}
