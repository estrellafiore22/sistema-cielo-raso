// Cielo raso 3D flotante (cenefa) dentro del cotizador.
//
// No usa el ancho × largo genérico de camposPorM2: pide la forma, las
// medidas del ambiente (o el diámetro), el ancho de banda, la caída, la
// plancha y la luz LED. Se cobra por el área de la banda, no por el
// ambiente completo — eso lo resuelve el motor de precios, acá solo se
// arma el pedido.

import { div, h, p, el, campo, tabla } from '../componentes/dom.js';
import * as cenefa from '../../dominio/cenefa/index.js';
import * as cieloRasoPlanchas from '../../dominio/cielo-raso-planchas.js';
import { agrupar as agruparDespiece } from './despiece-grupos.js';
import { cantidadLegible } from './despiece-cantidad.js';
import { cuadroTienda } from './suspendido-tablas.js';
import { numero } from '../../core/formato.js';

const COLUMNAS_DESPIECE = [
  { titulo: 'Material', celda: (l) => l.nombre },
  { titulo: 'Se instala', clase: 'col-num', celda: (l) => cantidadLegible(l.consumo, l.unidadConsumo, l) },
  { titulo: 'Se compra', clase: 'col-num', celda: (l) => cantidadLegible(l.necesario, l.unidad, l) },
];

export function formularioCenefa(estado, ctx) {
  if (!estado.cenefa) {
    const cfg = cenefa.config();
    estado.cenefa = {
      forma: cenefa.FORMAS.CUADRADA,
      ancho: '',
      largo: '',
      diametro: '',
      anchoBanda: String(cfg.anchoBanda),
      altoCaida: String(cfg.altoCaida),
      variante: 'drywall-12',
      ledTipo: cenefa.LED.NINGUNA,
      planchearCentro: false,
    };
  }
  const c = estado.cenefa;

  const panel = div('panel');
  const zonaMedidas = div('');
  const zonaDerivada = div('');

  panel.appendChild(h(3, 'Forma de la cenefa', 'panel__subtitulo'));
  panel.appendChild(
    div('opciones', [
      opcionForma(c, cenefa.FORMAS.CUADRADA, 'Cuadrada / rectangular'),
      opcionForma(c, cenefa.FORMAS.REDONDA, 'Redonda'),
    ]),
  );

  panel.appendChild(zonaMedidas);
  construirMedidas();

  panel.appendChild(
    div('rejilla rejilla--3', [
      campoNumerico('Ancho de banda (m)', c, 'anchoBanda', '0.05', sincronizarTodo).campo,
      campoNumerico('Alto de caída (m)', c, 'altoCaida', '0.05', sincronizarTodo).campo,
    ]),
  );

  panel.appendChild(h(3, 'Con qué plancha', 'panel__subtitulo'));
  panel.appendChild(selectorPlancha(c, sincronizarTodo));

  panel.appendChild(h(3, 'Luz LED', 'panel__subtitulo'));
  panel.appendChild(
    div('opciones', [
      opcionLed(c, cenefa.LED.NINGUNA, 'Sin luz'),
      opcionLed(c, cenefa.LED.ESCONDIDA, 'Escondida (dentro del cajón)'),
      opcionLed(c, cenefa.LED.VISIBLE, 'A la vista (canaleta + tapa)'),
    ]),
  );

  panel.appendChild(casillaPlanchearCentro(c, sincronizarTodo));
  panel.appendChild(zonaDerivada);

  function opcionForma(objeto, valor, texto) {
    const nodo = el('button', {
      tipo: 'button',
      texto,
      clase: 'opcion' + (objeto.forma === valor ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (objeto.forma === valor) return;
        objeto.forma = valor;
        for (const otra of nodo.parentElement.querySelectorAll('.opcion')) otra.classList.remove('opcion--activa');
        nodo.classList.add('opcion--activa');
        construirMedidas();
        sincronizarTodo();
      },
    });
    return nodo;
  }

  function opcionLed(objeto, valor, texto) {
    const nodo = el('button', {
      tipo: 'button',
      texto,
      clase: 'opcion' + (objeto.ledTipo === valor ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (objeto.ledTipo === valor) return;
        objeto.ledTipo = valor;
        for (const otra of nodo.parentElement.querySelectorAll('.opcion')) otra.classList.remove('opcion--activa');
        nodo.classList.add('opcion--activa');
        sincronizarTodo();
      },
    });
    return nodo;
  }

  function construirMedidas() {
    zonaMedidas.replaceChildren();
    if (c.forma === cenefa.FORMAS.REDONDA) {
      zonaMedidas.appendChild(
        div('rejilla rejilla--3', [campoNumerico('Diámetro (m)', c, 'diametro', '0.01', sincronizarTodo).campo]),
      );
    } else {
      zonaMedidas.appendChild(
        div('rejilla rejilla--3', [
          campoNumerico('Ancho del ambiente (m)', c, 'ancho', '0.01', sincronizarTodo).campo,
          campoNumerico('Largo del ambiente (m)', c, 'largo', '0.01', sincronizarTodo).campo,
        ]),
      );
    }
  }

  function sincronizarTodo() {
    ctx.recalcular();
    sincronizar();
  }

  function sincronizar() {
    zonaDerivada.replaceChildren();

    if (estado.errorCotizacion) {
      zonaDerivada.appendChild(p(estado.errorCotizacion, 'aviso-linea aviso-linea--alerta'));
      return;
    }

    const info = estado.cotizacion?.interno;
    if (!info) {
      zonaDerivada.appendChild(p('Completa las medidas para ver el cálculo.', 'texto-tenue'));
      return;
    }

    if (info.geo) zonaDerivada.appendChild(resumenGeometria(info.geo));
    if (info.despiece) zonaDerivada.appendChild(vistaDespiece(info.despiece));
    zonaDerivada.appendChild(cuadroTienda(info.cuentaTienda));
  }

  sincronizar();
  return { nodo: panel, sincronizar };
}

function selectorPlancha(c, alCambiar) {
  const opciones = div('opciones');
  const lista = cieloRasoPlanchas.variantes();
  if (!lista.some((v) => v.id === c.variante)) c.variante = lista[0].id;

  for (const variante of lista) {
    const boton = el('button', {
      tipo: 'button',
      clase: 'opcion' + (c.variante === variante.id ? ' opcion--activa' : ''),
      alHacerClic: () => {
        if (c.variante === variante.id) return;
        c.variante = variante.id;
        for (const otra of opciones.querySelectorAll('.opcion')) otra.classList.remove('opcion--activa');
        boton.classList.add('opcion--activa');
        alCambiar();
      },
    });
    boton.appendChild(el('strong', { texto: variante.nombre }));
    opciones.appendChild(boton);
  }
  return opciones;
}

function casillaPlanchearCentro(c, alCambiar) {
  const marca = el('input', {
    tipo: 'checkbox',
    id: 'cenefa-planchear-centro',
    alCambiar: (evento) => {
      c.planchearCentro = evento.target.checked;
      alCambiar();
    },
  });
  marca.checked = Boolean(c.planchearCentro);

  const etiqueta = el('label', {
    texto: 'También cubrir el centro con cielo raso (si no, queda abierto o con otro acabado)',
  });
  etiqueta.setAttribute('for', 'cenefa-planchear-centro');

  return div('interruptor', [marca, etiqueta]);
}

function campoNumerico(etiqueta, objeto, clave, paso, alCambiar) {
  return campo(etiqueta, {
    tipo: 'number',
    valor: objeto[clave],
    paso,
    minimo: '0',
    alEscribir: (evento) => {
      objeto[clave] = evento.target.value;
      alCambiar();
    },
  });
}

function resumenGeometria(geo) {
  const caja = div('panel');
  caja.appendChild(h(3, 'Niveles de la cenefa', 'panel__subtitulo'));
  const filas = [
    ['Nivel 1 — estructura al techo', `${numero(geo.areaBanda, 2)} m² de banda`],
    ['Nivel 2 — caída (perímetros)', `ext. ${numero(geo.perimetroExterior, 2)} m, int. ${numero(geo.perimetroInterior, 2)} m`],
    ['Nivel 3 — acabado', 'plancha sobre la banda y la caída'],
    ['Hueco central', `${numero(geo.areaCentro, 2)} m²`],
  ];
  const lista = el('dl', { clase: 'resumen__lista' });
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);
  return caja;
}

function vistaDespiece(despiece) {
  const caja = div('despiece');
  caja.appendChild(h(3, 'Material que se necesita', 'panel__subtitulo'));
  const grupos = agruparDespiece(despiece.lineas);
  const zonaTabla = div('');
  let filtro = 'todo';

  const pintarTabla = () => {
    const filas = filtro === 'estructura' ? grupos.estructura : filtro === 'acabado' ? grupos.acabado : despiece.lineas;
    zonaTabla.replaceChildren(tabla(COLUMNAS_DESPIECE, filas, { vacio: 'Nada en este grupo.' }));
  };

  const opciones = div('opciones opciones--chica');
  for (const [valor, texto] of [['todo', 'Todo'], ['estructura', 'Solo estructura'], ['acabado', 'Solo acabado']]) {
    const boton = el('button', {
      tipo: 'button',
      clase: 'opcion' + (filtro === valor ? ' opcion--activa' : ''),
      texto,
      alHacerClic: () => {
        filtro = valor;
        for (const otra of opciones.querySelectorAll('.opcion')) otra.classList.remove('opcion--activa');
        boton.classList.add('opcion--activa');
        pintarTabla();
      },
    });
    opciones.appendChild(boton);
  }
  caja.appendChild(opciones);
  caja.appendChild(zonaTabla);
  pintarTabla();
  return caja;
}
