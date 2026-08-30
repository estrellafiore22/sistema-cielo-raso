// Ajustes: cuántos m² rinde un equipo al día, por tipo de trabajo.
//
// Es el número que decide cuántas obras entran en una fecha. El dueño lo dijo
// así: 20 m² de vinil se hacen en media jornada, así que ese día caben dos
// trabajos; una división de 40 m² se lleva el día entero.

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as carga from '../../dominio/carga.js';
import * as recetas from '../../dominio/recetas.js';
import { NOMBRE_TRABAJO } from '../../dominio/suspendido/config.js';

export function seccionCapacidad() {
  const actual = carga.config();
  const panel = div('panel');
  panel.appendChild(h(3, 'Cuánto rinde un equipo al día', 'panel__titulo'));
  panel.appendChild(
    p(
      'Con estos m² el calendario sabe si un día todavía admite otro trabajo. ' +
        'Dos obras de 20 m² llenan una jornada de 40 m² igual que una sola de 40.',
      'texto-tenue',
    ),
  );

  const tipos = [
    { id: 'suspendido', nombre: NOMBRE_TRABAJO },
    ...recetas.listar().map((r) => ({ id: r.id, nombre: r.nombre })),
  ];

  const campos = {};
  for (const tipo of tipos) {
    campos[tipo.id] = campo(`${tipo.nombre} (m² al día)`, {
      tipo: 'number',
      paso: '1',
      minimo: '1',
      valor: carga.capacidadDe(tipo.id),
    });
  }

  const tope = campo('Máximo de trabajos por día', {
    tipo: 'number',
    paso: '1',
    minimo: '1',
    valor: actual.maxTrabajosPorDia,
    ayuda: 'Por más chicas que sean las obras, el traslado no se recupera.',
  });

  const rejilla = div('rejilla rejilla--3');
  for (const c of Object.values(campos)) rejilla.appendChild(c.campo);
  rejilla.appendChild(tope.campo);
  panel.appendChild(rejilla);

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        const capacidad = {};
        for (const [id, c] of Object.entries(campos)) capacidad[id] = c.entrada.value;
        carga.guardarConfig({
          capacidad,
          maxTrabajosPorDia: tope.entrada.value,
        });
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
