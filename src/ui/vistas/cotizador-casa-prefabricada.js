// Casa prefabricada: con qué techo se hace.

import { div, h, el, p } from '../componentes/dom.js';
import * as casaPrefabricada from '../../dominio/casa-prefabricada.js';

/**
 * @returns {Node|null} null si el tipo de trabajo no es casa prefabricada.
 */
export function opcionesCasaPrefabricada(estado, alCambiar) {
  if (estado.recetaId !== casaPrefabricada.RECETA_BASE) return null;

  const caja = div('bloque');
  caja.appendChild(h(3, 'Techo', 'panel__subtitulo'));

  if (!casaPrefabricada.TECHOS.some((t) => t.id === estado.techo)) {
    estado.techo = casaPrefabricada.TECHOS[0].id;
  }

  const opciones = div('opciones');
  for (const opcion of casaPrefabricada.TECHOS) {
    const boton = el('button', {
      tipo: 'button',
      clase: 'opcion' + (estado.techo === opcion.id ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (estado.techo === opcion.id) return;
        estado.techo = opcion.id;
        for (const otro of opciones.querySelectorAll('.opcion')) {
          otro.classList.remove('opcion--activa');
        }
        boton.classList.add('opcion--activa');
        alCambiar();
      },
    });
    boton.appendChild(el('strong', { texto: opcion.nombre }));
    opciones.appendChild(boton);
  }
  caja.appendChild(opciones);
  caja.appendChild(
    p(
      'Se cotiza por m² de piso: pared y techo salen de una relación ' +
        'estimada para una casa rectangular de 2.4 m de altura.',
      'texto-tenue',
    ),
  );
  return caja;
}
