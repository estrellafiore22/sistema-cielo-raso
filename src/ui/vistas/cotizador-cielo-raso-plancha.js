// Cielo raso de plancha: con qué plancha se hace y si lleva lijado.
//
// A diferencia de la división, aquí no hay un precio por m² fijo por
// plancha: se sigue cobrando material a costo + mano de obra. El lijado
// tampoco tiene un precio fijo donde sumarse, así que se recarga directo
// sobre la mano de obra.

import { div, h, el, p } from '../componentes/dom.js';
import * as cieloRasoPlanchas from '../../dominio/cielo-raso-planchas.js';
import { soles } from '../../core/formato.js';

/**
 * @returns {Node|null} null si el tipo de trabajo no tiene variantes.
 */
export function opcionesCieloRaso(estado, alCambiar) {
  if (estado.recetaId !== cieloRasoPlanchas.RECETA_BASE) return null;

  const caja = div('bloque');
  caja.appendChild(h(3, 'Con qué plancha', 'panel__subtitulo'));

  const lista = cieloRasoPlanchas.variantes();
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
  const recargo = cieloRasoPlanchas.recargoLijado();

  const marca = el('input', {
    tipo: 'checkbox',
    id: 'quiere-lijado-cielo-raso',
    alCambiar: (evento) => {
      estado.lijado = evento.target.checked;
      alCambiar();
    },
  });
  marca.checked = Boolean(estado.lijado);

  const etiqueta = el('label', {
    texto: `Agregar lijado (+ ${soles(recargo)} por m² de mano de obra)`,
  });
  etiqueta.setAttribute('for', 'quiere-lijado-cielo-raso');

  return div('', [
    div('interruptor', [marca, etiqueta]),
    p(
      'Normalmente no se lija. Se marca solo si el cliente lo pide.',
      'campo__ayuda',
    ),
  ]);
}
