// División / tabique: con qué plancha se hace y si lleva lijado.
//
// El precio por m² lo pone la plancha elegida, con material y mano de obra
// incluidos. El lijado no viene incluido: es un recargo aparte que se marca
// solo cuando el cliente lo pide.

import { div, h, el, p } from '../componentes/dom.js';
import * as divisiones from '../../dominio/divisiones.js';
import { soles } from '../../core/formato.js';

/**
 * @returns {Node|null} null si el tipo de trabajo no tiene variantes.
 */
export function opcionesDivision(estado, alCambiar) {
  if (estado.recetaId !== divisiones.RECETA_BASE) return null;

  const caja = div('bloque');
  caja.appendChild(h(3, 'Con qué plancha', 'panel__subtitulo'));

  const lista = divisiones.variantes();
  if (!lista.some((v) => v.id === estado.variante)) estado.variante = lista[0].id;

  const opciones = div('opciones');
  for (const variante of lista) {
    const boton = el('button', {
      tipo: 'button',
      clase: 'opcion' + (estado.variante === variante.id ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (estado.variante === variante.id) return;
        estado.variante = variante.id;
        for (const otro of opciones.querySelectorAll('.opcion')) {
          otro.classList.remove('opcion--activa');
        }
        boton.classList.add('opcion--activa');
        alCambiar();
      },
    });
    boton.appendChild(el('strong', { texto: variante.nombre }));
    boton.appendChild(
      el('span', {
        clase: 'opcion__precio',
        texto: `${soles(variante.precioM2)} / m² instalado`,
      }),
    );
    opciones.appendChild(boton);
  }
  caja.appendChild(opciones);

  caja.appendChild(
    p(
      'El drywall se cinta con papel y se masilla la junta y los tornillos. ' +
        'El fibrocemento no lleva cinta: la junta se sella y se masilla encima.',
      'texto-tenue',
    ),
  );

  caja.appendChild(casillaLijado(estado, alCambiar));
  return caja;
}

function casillaLijado(estado, alCambiar) {
  const recargo = divisiones.recargoLijado();

  const marca = el('input', {
    tipo: 'checkbox',
    id: 'quiere-lijado',
    alCambiar: (evento) => {
      estado.lijado = evento.target.checked;
      alCambiar();
    },
  });
  marca.checked = Boolean(estado.lijado);

  const etiqueta = el('label', {
    texto: `Agregar lijado (+ ${soles(recargo)} por m²)`,
  });
  etiqueta.setAttribute('for', 'quiere-lijado');

  return div('', [
    div('interruptor', [marca, etiqueta]),
    p(
      'Normalmente no se lija. Se marca solo si el cliente lo pide.',
      'campo__ayuda',
    ),
  ]);
}
