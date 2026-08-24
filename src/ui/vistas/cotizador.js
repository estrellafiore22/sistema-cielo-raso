// Nuevo pedido. Asistente de cuatro pasos:
//   1. Modalidad y qué se vende
//   2. Entrega y transporte
//   3. Cliente y pago
//   4. Confirmación e impresión
//
// El estado del pedido vive aquí y cada paso lo va llenando. Los pasos están en
// archivos aparte para que ninguno crezca de más.

import { div, h, p, boton, el } from '../componentes/dom.js';
import { MODALIDADES, NOMBRES_MODALIDAD, cotizar } from '../../dominio/precios.js';
import { soles } from '../../core/formato.js';
import * as pasoQue from './cotizador-que.js';
import * as pasoEntrega from './cotizador-entrega.js';
import * as pasoPago from './cotizador-pago.js';
import * as pasoResumen from './cotizador-resumen.js';

const PASOS = [
  { id: 'que', titulo: 'Qué se vende', modulo: pasoQue },
  { id: 'entrega', titulo: 'Entrega', modulo: pasoEntrega },
  { id: 'pago', titulo: 'Cliente y pago', modulo: pasoPago },
  { id: 'resumen', titulo: 'Confirmar', modulo: pasoResumen },
];

export function montar(contenedor) {
  const estado = estadoInicial();
  let pasoActual = 0;
  let cuerpo = null;

  function irA(indice) {
    pasoActual = Math.max(0, Math.min(PASOS.length - 1, indice));
    dibujar();
  }

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Nuevo pedido', 'vista__titulo'));
    contenedor.appendChild(barraPasos(pasoActual, irA, estado));

    cuerpo = div('cotizador__cuerpo');
    contenedor.appendChild(cuerpo);

    // El resumen vive fuera del paso actual, así que se refresca aparte: si no,
    // el total se queda congelado mientras el usuario escribe los metros.
    const zonaResumen = div('');
    const pintarResumen = () => zonaResumen.replaceChildren(resumenLateral(estado));

    const paso = PASOS[pasoActual];
    paso.modulo.montar(cuerpo, {
      estado,
      siguiente: () => irA(pasoActual + 1),
      anterior: () => irA(pasoActual - 1),
      reiniciar: () => {
        Object.assign(estado, estadoInicial());
        irA(0);
      },
      recalcular: () => {
        const resultado = recalcular(estado);
        pintarResumen();
        return resultado;
      },
    });

    contenedor.appendChild(zonaResumen);
    pintarResumen();
  }

  dibujar();
}

function estadoInicial() {
  return {
    modalidad: MODALIDADES.CON_MANO_OBRA,
    recetaId: 'cielo_raso',
    metrosCuadrados: '',
    desperdicioExtra: 0,
    items: [],
    descuento: 0,
    conEntrega: true,
    entrega: {
      direccion: '',
      referencia: '',
      fecha: '',
      hora: '09:00',
      km: '',
      idaYVuelta: false,
      recargo: 0,
      coordenadas: null,
    },
    cliente: { nombre: '', telefono: '', documento: '' },
    pago: { tipo: 'adelanto', monto: '', metodo: 'yape', operacion: '' },
    cotizacion: null,
    pedidoCreado: null,
  };
}

/** Recalcula la cotización con lo que haya en el estado. Tolera datos a medias. */
export function recalcular(estado) {
  const resultado = cotizar({
    modalidad: estado.modalidad,
    recetaId: estado.recetaId,
    metrosCuadrados: Number(estado.metrosCuadrados) || 0,
    items: estado.items,
    desperdicioExtra: Number(estado.desperdicioExtra) || 0,
    descuento: Number(estado.descuento) || 0,
    transporte: estado.conEntrega
      ? {
          km: Number(estado.entrega.km) || 0,
          idaYVuelta: estado.entrega.idaYVuelta,
          recargo: Number(estado.entrega.recargo) || 0,
        }
      : null,
  });
  estado.cotizacion = resultado.ok ? resultado.cotizacion : null;
  estado.errorCotizacion = resultado.ok ? null : resultado.error;
  return resultado;
}

function barraPasos(actual, irA, estado) {
  const lista = el('ol', { clase: 'pasos' });
  PASOS.forEach((paso, indice) => {
    const item = el('li', {
      clase:
        'pasos__item' +
        (indice === actual ? ' pasos__item--activo' : '') +
        (indice < actual ? ' pasos__item--hecho' : ''),
    });
    const enlace = boton(
      `${indice + 1}. ${paso.titulo}`,
      () => {
        // Solo se puede saltar hacia atrás o al paso siguiente inmediato.
        if (indice <= actual + 1) irA(indice);
      },
      { clase: 'pasos__boton' },
    );
    // No dejar avanzar sin cotización válida
    if (indice > actual && !estado.cotizacion) enlace.disabled = true;
    item.appendChild(enlace);
    lista.appendChild(item);
  });
  return lista;
}

function resumenLateral(estado) {
  const caja = div('cotizador__resumen');
  caja.appendChild(h(3, 'Resumen', 'cotizador__resumen-titulo'));

  if (!estado.cotizacion) {
    caja.appendChild(
      p(estado.errorCotizacion || 'Completa los datos para ver el total.', 'texto-tenue'),
    );
    return caja;
  }

  const c = estado.cotizacion;
  const filas = [
    ['Modalidad', NOMBRES_MODALIDAD[c.modalidad]],
    ['Subtotal', soles(c.subtotal)],
  ];
  if (c.transporte.total > 0) filas.push(['Transporte', soles(c.transporte.total)]);
  if (c.descuento > 0) filas.push(['Descuento', '-' + soles(c.descuento)]);

  const lista = el('dl', { clase: 'resumen__lista' });
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);

  caja.appendChild(
    div('resumen__total', [
      el('span', { texto: 'Total' }),
      el('strong', { texto: soles(c.total) }),
    ]),
  );

  // Aviso de material faltante: se ve desde el primer paso.
  const despiece = c.interno?.despiece;
  if (despiece && despiece.totales.lineasConFaltante > 0) {
    caja.appendChild(
      p(
        `⚠ Faltan ${despiece.totales.lineasConFaltante} material(es) en almacén. ` +
          `Reposición: ${soles(despiece.totales.reposicion)}`,
        'aviso-linea aviso-linea--alerta',
      ),
    );
  }

  return caja;
}
