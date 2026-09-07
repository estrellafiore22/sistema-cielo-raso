// Ajustes: medidas por defecto del cielo raso 3D flotante (cenefa).
//
// La plancha, el tornillo y el acabado se editan en Materiales; acá solo se
// ajustan las medidas de partida que el vendedor puede pisar en cada pedido.

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as cenefa from '../../dominio/cenefa/index.js';

export function seccionCenefa() {
  const panel = div('panel');
  panel.appendChild(h(3, 'Cielo raso 3D flotante (cenefa)', 'panel__titulo'));
  panel.appendChild(
    p(
      'Medidas de partida para una cenefa nueva. El vendedor las puede ' +
        'cambiar en cada pedido según el diseño.',
      'texto-tenue',
    ),
  );

  const actual = cenefa.config();
  const anchoBanda = campo('Ancho de la banda (m)', {
    tipo: 'number',
    paso: '0.05',
    minimo: '0.1',
    valor: actual.anchoBanda,
    ayuda: 'Cuánto avanza la cenefa desde la pared hacia el centro.',
  });
  const altoCaida = campo('Alto de la caída (m)', {
    tipo: 'number',
    paso: '0.05',
    minimo: '0.05',
    valor: actual.altoCaida,
    ayuda: 'Cuánto baja la caja respecto al cielo raso plano.',
  });
  const manoObraPorM2 = campo('Mano de obra (S/ por m² de banda)', {
    tipo: 'number',
    paso: '1',
    minimo: '0',
    valor: actual.manoObraPorM2,
  });

  panel.appendChild(div('rejilla rejilla--3', [anchoBanda.campo, altoCaida.campo, manoObraPorM2.campo]));

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        cenefa.guardarConfig({
          anchoBanda: anchoBanda.entrada.value,
          altoCaida: altoCaida.entrada.value,
          manoObraPorM2: manoObraPorM2.entrada.value,
        });
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
