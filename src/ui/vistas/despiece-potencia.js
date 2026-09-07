// Cuánto amperaje pedir para el piso radiante.
//
// No reemplaza el cálculo de un electricista para la instalación real: es lo
// que el vendedor necesita para hablar con el cliente de la llave térmica que
// va a necesitar.

import { div, h, p } from '../componentes/dom.js';

export function cuadroPotencia(potencia) {
  if (!potencia) return div('');

  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Potencia eléctrica', 'panel__subtitulo'));
  caja.appendChild(
    p(
      `${potencia.watts} W en total (${potencia.amperios} A con el margen de ` +
        `seguridad). Llave termomagnética recomendada: ${potencia.llaveRecomendada} A.`,
      'destacado',
    ),
  );
  caja.appendChild(
    p(
      'Esto no reemplaza el cálculo del electricista para la instalación ' +
        'eléctrica final; es una referencia para cotizar.',
      'texto-tenue',
    ),
  );
  return caja;
}
