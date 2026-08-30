// Mover un trabajo a otra fecha, desde el calendario.
//
// El caso real: el trabajador llega, no puede empezar (falta material, llovió,
// el cliente no estaba) y hay que pasar la obra a otro día. Mover la fecha es
// la mitad del trabajo; la otra mitad es llamar al cliente, y eso el sistema
// lo deja pendiente hasta que alguien lo marque.

import { div, el, p, campo, boton, seleccion } from '../componentes/dom.js';
import * as reprogramacion from '../../dominio/reprogramacion.js';
import * as calendario from '../../dominio/calendario.js';
import { fechaCorta } from '../../core/formato.js';

const MOTIVOS = [
  'Faltó material',
  'Lluvia',
  'El cliente no estaba',
  'La obra no estaba lista',
  'Se alargó el trabajo anterior',
];

export function formularioMover(pedido, refrescar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '📅 Mover este trabajo a otro día' }));

  // Solo días que todavía admiten un trabajo de este tamaño.
  const trabajo = pedido.cotizacion?.trabajo;
  const disponibles = calendario
    .proximosDias(28, {
      requiereEquipo: true,
      recetaId: trabajo?.id || null,
      metrosCuadrados: trabajo?.metrosCuadrados || 0,
    })
    .filter((d) => d.disponibilidad.disponible && d.dia !== pedido.entrega?.fecha);

  if (disponibles.length === 0) {
    detalles.appendChild(
      p(
        'No hay ningún día libre en las próximas 4 semanas para un trabajo de ' +
          'este tamaño. Libera un día o bloquea menos fechas.',
        'aviso-linea aviso-linea--alerta',
      ),
    );
    return detalles;
  }

  const nuevoDia = seleccion(
    'Nueva fecha',
    disponibles.map((d) => ({
      valor: d.dia,
      texto: `${fechaCorta(d.dia)} — ${Math.round(d.carga.jornadasLibres * 100)}% libre`,
    })),
  );

  const motivo = seleccion('Motivo', [
    ...MOTIVOS.map((m) => ({ valor: m, texto: m })),
    { valor: 'otro', texto: 'Otro (escribir)' },
  ]);

  const otroMotivo = campo('¿Cuál?', { marcador: 'Se explica en una línea' });
  otroMotivo.campo.hidden = true;
  motivo.entrada.addEventListener('change', () => {
    otroMotivo.campo.hidden = motivo.entrada.value !== 'otro';
  });

  const aviso = div('');

  detalles.appendChild(div('rejilla rejilla--2', [nuevoDia.campo, motivo.campo]));
  detalles.appendChild(otroMotivo.campo);
  detalles.appendChild(aviso);
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Mover el trabajo', () => {
        const texto =
          motivo.entrada.value === 'otro' ? otroMotivo.entrada.value : motivo.entrada.value;
        const resultado = reprogramacion.reprogramar(pedido.id, nuevoDia.entrada.value, texto);
        if (!resultado.ok) {
          aviso.replaceChildren(p(resultado.error, 'aviso-linea aviso-linea--alerta'));
          return;
        }
        alert(
          `Movido al ${fechaCorta(nuevoDia.entrada.value)}. ` +
            `Falta avisarle a ${pedido.cliente.nombre}: ${pedido.cliente.telefono || 'sin teléfono'}.`,
        );
        refrescar();
      }, { clase: 'boton boton--principal boton--pequeno' }),
    ]),
  );

  return detalles;
}
