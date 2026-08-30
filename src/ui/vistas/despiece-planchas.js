// Cómo salen las planchas del paño y qué recortes quedan.
//
// Es la información que el maestro necesita antes de subir a cortar, y la que
// explica por qué el sistema pide una plancha más de lo que diría la cuenta
// por metro cuadrado.

import { div, h, p, el, tabla } from '../componentes/dom.js';
import { numero } from '../../core/formato.js';

export function cuadroPlanchas(plan) {
  if (!plan) return div('');

  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Cómo se cortan las planchas', 'panel__subtitulo'));

  caja.appendChild(
    p(
      `${plan.planchas} plancha(s) de ${plan.nombre}, cortadas en ` +
        `${plan.piezas} pieza(s), corriéndolas ${plan.orientacion}. ` +
        `Se aprovecha el ${Math.round(plan.aprovechado * 100)} % del material.`,
      'destacado',
    ),
  );

  const deRecorte = plan.cortes.filter((c) => c.deRecorte).length;
  if (deRecorte > 0) {
    caja.appendChild(
      p(
        `${deRecorte} pieza(s) salen de recortes de otra plancha, no de una ` +
          'entera. Un recorte sirve solo si la pieza entra completa: dos ' +
          'pedazos chicos no arman uno grande, la junta quedaría sin perfil ' +
          'detrás.',
        'aviso-linea aviso-linea--ok',
      ),
    );
  }

  if (plan.ahorroOrientacion > 0) {
    caja.appendChild(
      p(
        `Corriéndolas al revés harían falta ${plan.ahorroOrientacion} plancha(s) más.`,
        'texto-tenue',
      ),
    );
  }

  const diferencia = plan.planchas - Math.ceil(plan.porArea);
  if (diferencia !== 0) {
    caja.appendChild(
      p(
        diferencia > 0
          ? `Son ${diferencia} plancha(s) más de lo que daría la cuenta por ` +
            'metro cuadrado: los recortes que sobran no alcanzan para las ' +
            'piezas que faltan.'
          : `Son ${-diferencia} plancha(s) menos que la cuenta por metro ` +
            'cuadrado, porque los recortes se vuelven a usar.',
        'texto-tenue',
      ),
    );
  }

  if (plan.sobrantes.length > 0) {
    caja.appendChild(el('h4', { texto: 'Recortes que quedan', clase: 'bloque__titulo' }));
    caja.appendChild(
      tabla(
        [
          { titulo: 'Medida', celda: (s) => `${numero(s.ancho, 0)} × ${numero(s.alto, 0)} cm` },
          { titulo: 'Cantidad', clase: 'col-num', celda: (s) => String(s.cantidad) },
        ],
        plan.sobrantes,
      ),
    );
    caja.appendChild(
      p('Sirven para otra obra si la pieza que hace falta entra entera.', 'texto-tenue'),
    );
  }

  return caja;
}
