// Tablas de resultado del cielo raso suspendido.
//
// Dos tablas separadas a propósito:
//   TÉCNICA  lo que se instala y se corta, en unidades y centímetros
//   PRECIOS  lo que se compra, en la unidad en que cobra el proveedor

import { div, h, p, el, tabla, insignia, boton } from '../componentes/dom.js';
import { soles, numero } from '../../core/formato.js';

export function tablaTecnica(calculo) {
  const filas = calculo.lineas.filter((l) => l.cantidad > 0);

  return div('bloque', [
    h(3, 'Material a instalar', 'panel__subtitulo'),
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        {
          titulo: 'Necesario',
          clase: 'col-num',
          celda: (l) => necesario(l.material),
        },
        {
          titulo: 'Enteras',
          clase: 'col-num',
          celda: (l) => (l.material.piezasCompletas ?? '—'),
        },
        {
          titulo: 'Cortadas',
          clase: 'col-num',
          celda: (l) =>
            l.material.barrasCortadas || l.material.baldosasCortadas || '—',
        },
        {
          titulo: 'Merma',
          clase: 'col-num col-falta',
          celda: (l) => (l.material.merma ? `${numero(l.material.merma, 0)} cm` : '—'),
        },
        { titulo: 'Comprar', clase: 'col-num', celda: (l) => `${l.cantidad} un` },
      ],
      filas,
    ),
    p(
      '"Necesario" es lo que realmente se instala. "Comprar" sale del reparto ' +
        'de cortes: una barra partida no rinde dos barras.',
      'texto-tenue',
    ),
  ]);
}

/** "3 un + 50 cm" — y para lo que se cuenta por pieza, solo las unidades. */
function necesario(material) {
  if (material.totalCm === null || material.totalCm === undefined) {
    return `${material.unidades} un`;
  }
  if (material.clave === 'alambre') {
    return `${numero(material.totalCm / 100, 2)} m`;
  }
  const partes = [`${material.unidades} un`];
  if (material.resto > 0) partes.push(`${numero(material.resto, 0)} cm`);
  return partes.join(' + ');
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
