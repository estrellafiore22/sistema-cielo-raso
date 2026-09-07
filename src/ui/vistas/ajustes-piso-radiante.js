// Ajustes: potencia por m² del piso radiante, para calcular la llave térmica.

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as pisoRadiante from '../../dominio/piso-radiante.js';

export function seccionPisoRadiante() {
  const panel = div('panel');
  panel.appendChild(h(3, 'Piso radiante: potencia', 'panel__titulo'));
  panel.appendChild(
    p(
      'Watts por m² de la manta calefactora. Con esto se calcula el ' +
        'amperaje total y la llave termomagnética que se sugiere.',
      'texto-tenue',
    ),
  );

  const potencia = campo('Potencia (W por m²)', {
    tipo: 'number',
    paso: '10',
    minimo: '10',
    valor: pisoRadiante.potenciaPorM2(),
  });

  panel.appendChild(div('rejilla rejilla--3', [potencia.campo]));

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        pisoRadiante.guardarPotenciaPorM2(potencia.entrada.value);
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
