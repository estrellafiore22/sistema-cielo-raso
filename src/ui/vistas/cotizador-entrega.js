// Paso 2: entrega, distancia y transporte.
//
// Si Google Maps está configurado calcula los kilómetros solo. Si no lo está, o
// si Google falla, se escriben a mano y la venta sigue igual.

import { div, h, p, el, campo, boton, error } from '../componentes/dom.js';
import { MODALIDADES } from '../../dominio/precios.js';
import * as mapas from '../../integraciones/mapas.js';
import * as calendario from '../../dominio/calendario.js';
import * as personal from '../../dominio/personal.js';
import * as router from '../../core/router.js';
import { soles, numero, hoy, fechaCorta } from '../../core/formato.js';

export function montar(contenedor, ctx) {
  const { estado, siguiente, anterior, recalcular } = ctx;
  contenedor.replaceChildren();

  const panel = div('panel');
  panel.appendChild(interruptorEntrega(estado, () => {
    recalcular(estado);
    montar(contenedor, ctx);
  }));

  if (estado.conEntrega) {
    panel.appendChild(bloqueDireccion(estado, recalcular, () => montar(contenedor, ctx)));
    panel.appendChild(bloqueFecha(estado, recalcular));
    panel.appendChild(bloqueCosto(estado));
  } else {
    panel.appendChild(
      p('El cliente recoge en tienda. No se cobra transporte.', 'texto-tenue'),
    );
  }

  contenedor.appendChild(panel);
  contenedor.appendChild(
    div('cotizador__acciones', [
      boton('← Volver', anterior, { clase: 'boton boton--fantasma' }),
      boton('Continuar a pago →', () => {
        const validacion = validar(estado);
        if (!validacion.ok) {
          alert(validacion.error);
          return;
        }
        recalcular(estado);
        siguiente();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
}

function interruptorEntrega(estado, alCambiar) {
  const caja = div('opciones');

  const opcion = (conEntrega, titulo, detalle) => {
    const activa = estado.conEntrega === conEntrega;
    const nodo = el('button', {
      tipo: 'button',
      clase: 'opcion' + (activa ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (estado.conEntrega === conEntrega) return;
        estado.conEntrega = conEntrega;
        alCambiar();
      },
    });
    nodo.appendChild(el('strong', { texto: titulo }));
    nodo.appendChild(el('span', { clase: 'opcion__precio', texto: detalle }));
    return nodo;
  };

  caja.append(
    opcion(true, 'Llevar al lugar del cliente', 'Se cobra transporte por distancia'),
    opcion(false, 'Recojo en tienda', 'No se cobra transporte'),
  );
  return caja;
}

function bloqueDireccion(estado, recalcular, repintar) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Dirección de entrega', 'panel__subtitulo'));

  const direccion = campo('Dirección exacta', {
    valor: estado.entrega.direccion,
    marcador: 'Av. Ejemplo 123, Urb. Los Pinos, Trujillo',
    alEscribir: (evento) => {
      estado.entrega.direccion = evento.target.value;
    },
  });

  const referencia = campo('Referencia', {
    valor: estado.entrega.referencia,
    marcador: 'Portón azul, frente al parque',
    ayuda: 'Sale impreso en la orden interna. Es lo que usa el chofer para llegar.',
    alEscribir: (evento) => {
      estado.entrega.referencia = evento.target.value;
    },
  });

  const km = campo('Distancia (km)', {
    tipo: 'number',
    valor: estado.entrega.km,
    paso: '0.1',
    minimo: '0',
    alEscribir: (evento) => {
      estado.entrega.km = evento.target.value;
      recalcular(estado);
      repintar();
    },
  });

  const zonaMapa = div('bloque__mapa');
  if (mapas.activo()) {
    zonaMapa.appendChild(
      boton(
        '📍 Calcular distancia con Google Maps',
        async (evento) => {
          const btn = evento.target;
          btn.disabled = true;
          btn.textContent = 'Consultando…';
          const resultado = await mapas.distanciaHasta(estado.entrega.direccion);
          btn.disabled = false;
          btn.textContent = '📍 Calcular distancia con Google Maps';

          if (!resultado.ok) {
            zonaMapa.appendChild(error(resultado.error + ' Escribe los km a mano.'));
            return;
          }
          estado.entrega.km = resultado.km;
          if (resultado.direccionNormalizada) {
            estado.entrega.direccion = resultado.direccionNormalizada;
          }
          recalcular(estado);
          repintar();
        },
        { clase: 'boton boton--secundario' },
      ),
    );
  } else {
    zonaMapa.appendChild(
      p(
        'Google Maps no está configurado. Escribe los kilómetros a mano, o ' +
          'configúralo en Ajustes → Mapas para que se calculen solos.',
        'texto-tenue',
      ),
    );
  }

  caja.appendChild(div('rejilla rejilla--2', [direccion.campo, referencia.campo]));
  caja.appendChild(div('rejilla rejilla--2', [km.campo, zonaMapa]));
  return caja;
}

function bloqueFecha(estado, recalcular) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Fecha y hora', 'panel__subtitulo'));

  const requiereEquipo = estado.modalidad === MODALIDADES.CON_MANO_OBRA;

  // Caso típico del primer día de uso: nadie ha cargado a los trabajadores
  // todavía. Sin esto el usuario ve "no hay días" y no sabe por qué.
  if (requiereEquipo && personal.totalActivos() === 0) {
    caja.appendChild(
      error(
        'Todavía no has registrado a tus trabajadores, y un trabajo con mano ' +
          'de obra necesita un equipo asignado.',
      ),
    );
    caja.appendChild(
      div('cotizador__acciones', [
        boton('Ir a Personal', () => router.ir('/personal'), {
          clase: 'boton boton--principal',
        }),
      ]),
    );
    caja.appendChild(
      p(
        'Si solo vas a vender el material, vuelve al primer paso y elige ' +
          '"Solo material, paquete completo": esa modalidad no necesita personal.',
        'texto-tenue',
      ),
    );
    return caja;
  }

  const dias = calendario
    .proximosDias(21, { requiereEquipo })
    .filter((d) => d.disponibilidad.disponible);

  if (dias.length === 0) {
    caja.appendChild(
      error(
        requiereEquipo
          ? 'Todo tu personal está ocupado en las próximas 3 semanas. Libera ' +
              'un día en el calendario o agrega más trabajadores.'
          : 'No hay días disponibles. Revisa los días bloqueados en el calendario.',
      ),
    );
    return caja;
  }

  const rejilla = div('dias');
  for (const dia of dias.slice(0, 14)) {
    const elegido = estado.entrega.fecha === dia.dia;
    const btn = el('button', {
      tipo: 'button',
      clase: 'dia' + (elegido ? ' dia--elegido' : ''),
      alHacerClic: () => {
        estado.entrega.fecha = dia.dia;
        for (const otro of rejilla.querySelectorAll('.dia')) {
          otro.classList.remove('dia--elegido');
        }
        btn.classList.add('dia--elegido');
      },
    });
    btn.appendChild(el('strong', { texto: fechaCorta(dia.dia) }));
    if (requiereEquipo) {
      btn.appendChild(
        el('span', {
          clase: 'dia__libres',
          texto: `${dia.libres} libre(s)`,
        }),
      );
    }
    if (dia.dia === hoy()) btn.appendChild(el('span', { clase: 'dia__hoy', texto: 'hoy' }));
    rejilla.appendChild(btn);
  }
  caja.appendChild(rejilla);

  const hora = campo('Hora de entrega', {
    tipo: 'time',
    valor: estado.entrega.hora,
    alEscribir: (evento) => {
      estado.entrega.hora = evento.target.value;
    },
  });
  caja.appendChild(div('rejilla rejilla--2', [hora.campo]));
  return caja;
}

function bloqueCosto(estado) {
  const envio = estado.cotizacion?.transporte;
  if (!envio) return div('');

  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Costo del transporte', 'panel__subtitulo'));

  const lista = el('dl', { clase: 'resumen__lista' });
  const filas = [
    ['Distancia', `${numero(envio.km, 2)} km`],
    ['Km libres', `${envio.kmLibres} km`],
    ['Km cobrables', `${numero(envio.kmCobrables, 2)} km`],
    ['Tarifa base', soles(envio.tarifaBase)],
    ['Por distancia', soles(envio.costoDistancia)],
    ['Total transporte', soles(envio.total)],
  ];
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);

  if (envio.aplicoMinimo) {
    caja.appendChild(p('Se aplicó la tarifa mínima de salida.', 'texto-tenue'));
  }
  return caja;
}

function validar(estado) {
  if (!estado.conEntrega) return { ok: true };
  if (!String(estado.entrega.direccion).trim()) {
    return { ok: false, error: 'Escribe la dirección exacta de entrega.' };
  }
  if (!estado.entrega.fecha) {
    return { ok: false, error: 'Elige el día de entrega.' };
  }
  if (!estado.entrega.hora) {
    return { ok: false, error: 'Elige la hora de entrega.' };
  }
  if (!Number(estado.entrega.km) && Number(estado.entrega.km) !== 0) {
    return { ok: false, error: 'Ingresa la distancia en kilómetros.' };
  }
  return { ok: true };
}
