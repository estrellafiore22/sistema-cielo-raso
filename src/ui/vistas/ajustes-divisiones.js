// Ajustes: precio por m² de cada plancha de división, y el recargo de lijado.
//
// El precio es del trabajo INSTALADO: incluye material y mano de obra. Es lo
// que se le cobra al cliente por metro cuadrado de muro.

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as divisiones from '../../dominio/divisiones.js';

export function seccionDivisiones() {
  const panel = div('panel');
  panel.appendChild(h(3, 'División / tabique: precio por plancha', 'panel__titulo'));
  panel.appendChild(
    p(
      'Precio del m² instalado, con material y mano de obra incluidos. Es lo ' +
        'que ve el cliente; el desglose de materiales queda para la orden interna.',
      'texto-tenue',
    ),
  );

  const campos = {};
  for (const variante of divisiones.variantes()) {
    campos[variante.id] = campo(`${variante.nombre} (S/ por m²)`, {
      tipo: 'number',
      paso: '1',
      minimo: '0',
      valor: variante.precioM2,
    });
  }

  const lijado = campo('Recargo por lijado (S/ por m²)', {
    tipo: 'number',
    paso: '0.50',
    minimo: '0',
    valor: divisiones.recargoLijado(),
    ayuda: 'Se suma al precio de la plancha solo cuando el cliente pide lijado.',
  });

  panel.appendChild(
    div('rejilla rejilla--3', [...Object.values(campos).map((c) => c.campo), lijado.campo]),
  );

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        const cambios = {};
        for (const [id, c] of Object.entries(campos)) cambios[id] = c.entrada.value;
        divisiones.guardarPrecios(cambios);
        divisiones.guardarRecargoLijado(lijado.entrada.value);
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
