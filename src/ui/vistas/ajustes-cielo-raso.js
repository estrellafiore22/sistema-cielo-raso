// Ajustes: recargo de lijado del cielo raso de plancha.
//
// Las planchas mismas se editan en Materiales (no hay precio fijo por m² acá,
// el cielo raso se cobra a costo de material + mano de obra).

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as cieloRaso from '../../dominio/cielo-raso-planchas.js';

export function seccionCieloRaso() {
  const panel = div('panel');
  panel.appendChild(h(3, 'Cielo raso de plancha: lijado', 'panel__titulo'));
  panel.appendChild(
    p(
      'Las planchas de drywall y fibrocemento se editan en Materiales. Aquí ' +
        'solo se ajusta cuánto se recarga la mano de obra cuando el cliente ' +
        'pide lijado.',
      'texto-tenue',
    ),
  );

  const lijado = campo('Recargo por lijado (S/ por m² de mano de obra)', {
    tipo: 'number',
    paso: '0.50',
    minimo: '0',
    valor: cieloRaso.recargoLijado(),
  });

  panel.appendChild(div('rejilla rejilla--3', [lijado.campo]));

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        cieloRaso.guardarRecargoLijado(lijado.entrada.value);
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
