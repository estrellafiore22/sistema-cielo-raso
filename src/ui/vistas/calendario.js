// Calendario de trabajo: quién está ocupado cada día, cuánta gente queda libre
// y qué días se pueden ofrecer al cliente.

import { div, h, p, el, seleccion, boton, insignia } from '../componentes/dom.js';
import * as calendario from '../../dominio/calendario.js';
import * as personal from '../../dominio/personal.js';
import * as pedidos from '../../dominio/pedidos.js';
import { fechaCorta, fechaLarga, hoy } from '../../core/formato.js';

export function montar(contenedor) {
  let diaElegido = hoy();

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Calendario', 'vista__titulo'));

    if (personal.totalActivos() === 0) {
      contenedor.appendChild(
        p('Primero registra a tu personal en la pantalla de Personal.', 'aviso-linea aviso-linea--alerta'),
      );
    }

    contenedor.appendChild(leyenda());
    contenedor.appendChild(
      rejillaDias(diaElegido, (dia) => {
        diaElegido = dia;
        dibujar();
      }),
    );
    contenedor.appendChild(panelDia(diaElegido, dibujar));
  }

  dibujar();
}

function leyenda() {
  return div('leyenda', [
    el('span', { clase: 'leyenda__item leyenda__item--libre', texto: 'Personal libre' }),
    el('span', { clase: 'leyenda__item leyenda__item--parcial', texto: 'Parcialmente ocupado' }),
    el('span', { clase: 'leyenda__item leyenda__item--lleno', texto: 'Sin personal libre' }),
    el('span', { clase: 'leyenda__item leyenda__item--bloqueado', texto: 'Bloqueado' }),
  ]);
}

function rejillaDias(elegido, alElegir) {
  const caja = div('calendario');
  for (const dia of calendario.proximosDias(28)) {
    let clase = 'calendario__dia';
    if (dia.bloqueado) clase += ' calendario__dia--bloqueado';
    else if (dia.libres === 0 && dia.totalPersonal > 0) clase += ' calendario__dia--lleno';
    else if (dia.ocupados > 0) clase += ' calendario__dia--parcial';
    else clase += ' calendario__dia--libre';
    if (dia.dia === elegido) clase += ' calendario__dia--elegido';
    if (dia.esHoy) clase += ' calendario__dia--hoy';

    const boton = el('button', {
      tipo: 'button',
      clase,
      alHacerClic: () => alElegir(dia.dia),
    });
    boton.appendChild(el('strong', { texto: fechaCorta(dia.dia) }));
    boton.appendChild(
      el('span', {
        clase: 'calendario__detalle',
        texto: dia.bloqueado ? 'Bloqueado' : `${dia.libres}/${dia.totalPersonal} libres`,
      }),
    );
    caja.appendChild(boton);
  }
  return caja;
}

function panelDia(dia, refrescar) {
  const estado = calendario.estadoDia(dia);
  const caja = div('panel');

  caja.appendChild(h(3, fechaLarga(dia), 'panel__titulo'));

  if (estado.bloqueado) {
    caja.appendChild(p(`Día bloqueado: ${estado.bloqueado}`, 'aviso-linea aviso-linea--alerta'));
    caja.appendChild(
      boton('Desbloquear día', () => {
        calendario.desbloquear(dia);
        refrescar();
      }, { clase: 'boton boton--pequeno' }),
    );
  } else {
    caja.appendChild(
      p(
        `${estado.ocupados} ocupado(s) · ${estado.libres} libre(s) de ${estado.totalPersonal}`,
        'destacado',
      ),
    );
    caja.appendChild(
      estado.cabeOtroTrabajo
        ? p(
            `Sí queda gente: caben ${estado.equiposDisponibles} trabajo(s) más este día.`,
            'aviso-linea aviso-linea--ok',
          )
        : p('No queda personal libre para otro trabajo este día.', 'aviso-linea aviso-linea--alerta'),
    );
  }

  // Trabajos del día
  caja.appendChild(h(4, 'Trabajos asignados', 'seccion__titulo'));
  if (estado.trabajos.length === 0) {
    caja.appendChild(p('Nadie asignado.', 'texto-tenue'));
  } else {
    for (const trabajo of estado.trabajos) {
      const pedido = trabajo.pedido ? pedidos.obtener(trabajo.pedido) : null;
      const bloque = div('bloque');
      bloque.appendChild(
        el('h5', {
          clase: 'bloque__titulo',
          texto: pedido
            ? `${pedido.codigo} — ${pedido.cliente.nombre}`
            : 'Trabajo sin pedido asociado',
        }),
      );
      if (pedido?.entrega?.direccion) {
        bloque.appendChild(p(pedido.entrega.direccion, 'texto-tenue'));
      }
      const equipo = div('equipo');
      for (const miembro of trabajo.equipo) {
        equipo.appendChild(
          div('equipo__miembro', [
            el('span', { texto: miembro.nombre }),
            insignia(miembro.especialidad),
            boton('✕', () => {
              calendario.liberar(miembro.asignacionId);
              refrescar();
            }, { clase: 'boton boton--fantasma boton--pequeno' }),
          ]),
        );
      }
      bloque.appendChild(equipo);
      caja.appendChild(bloque);
    }
  }

  caja.appendChild(formularioAsignar(dia, estado, refrescar));

  if (!estado.bloqueado) {
    caja.appendChild(
      div('cotizador__acciones', [
        boton('Bloquear este día', () => {
          const motivo = prompt('¿Por qué se bloquea? (feriado, inventario, etc.)');
          if (motivo === null) return;
          calendario.bloquear(dia, motivo);
          refrescar();
        }, { clase: 'boton boton--fantasma boton--pequeno' }),
      ]),
    );
  }

  return caja;
}

function formularioAsignar(dia, estado, refrescar) {
  if (estado.personalLibre.length === 0) return div('');

  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Asignar trabajador a este día' }));

  const trabajador = seleccion(
    'Trabajador',
    estado.personalLibre.map((t) => ({ valor: t.id, texto: `${t.nombre} (${t.especialidad})` })),
  );

  const activos = pedidos
    .listar()
    .filter((p) => !['entregado', 'cancelado'].includes(p.estado));
  const pedido = seleccion('Pedido', [
    { valor: '', texto: 'Sin pedido' },
    ...activos.map((p) => ({ valor: p.id, texto: `${p.codigo} — ${p.cliente.nombre}` })),
  ]);

  detalles.appendChild(div('rejilla rejilla--2', [trabajador.campo, pedido.campo]));
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Asignar', () => {
        const resultado = calendario.asignar({
          dia,
          trabajadorId: trabajador.entrada.value,
          pedidoId: pedido.entrada.value || null,
        });
        if (!resultado.ok) {
          alert(resultado.error);
          return;
        }
        refrescar();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
  return detalles;
}
