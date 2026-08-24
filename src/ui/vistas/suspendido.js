// Calculadora de cielo raso suspendido con baldosas de 61 × 61 cm.
//
// El plano acompaña todo el proceso: se redibuja con cada cambio de medida y
// queda encuadrado completo, listo para acercar.

import { div, h, p, el, campo, boton, error, redibujarLuego } from '../componentes/dom.js';
import * as plano from '../componentes/plano.js';
import * as suspendido from '../../dominio/suspendido/index.js';
import { panelAjustes } from './suspendido-ajustes.js';
import { tablaTecnica, tablaPrecios, tablaRecortes, avisoOrientacion } from './suspendido-tablas.js';
import { numero } from '../../core/formato.js';
import * as auth from '../../core/auth.js';
import { construir as construirBoletaTecnica } from '../../impresion/boleta-tecnica.js';
import { imprimirNodo } from '../../impresion/cola-impresion.js';

const CLAVE_BORRADOR = 'suspendido:borrador';

export function montar(contenedor) {
  const estado = {
    modo: 'medidas', // 'medidas' | 'area'
    ancho: 535,
    largo: 416,
    metrosCuadrados: '',
    orientacion: 'auto',
    calculo: null,
    errorCalculo: null,
  };

  let lienzo = null;
  let zonaResultado = null;
  let sincronizarCampos = () => {};

  function recalcular() {
    sincronizarCampos();
    const entrada =
      estado.modo === 'medidas'
        ? { ancho: Number(estado.ancho), largo: Number(estado.largo) }
        : { metrosCuadrados: Number(estado.metrosCuadrados) };
    entrada.orientacion = estado.orientacion;

    const resultado = suspendido.calcular(entrada);
    estado.calculo = resultado.ok ? resultado.calculo : null;
    estado.errorCalculo = resultado.ok ? null : resultado.error;

    if (lienzo) lienzo.actualizar(estado.calculo?.grid || null);
    pintarResultado();
  }

  function pintarResultado() {
    if (!zonaResultado) return;
    zonaResultado.replaceChildren();

    if (estado.errorCalculo) {
      zonaResultado.appendChild(error(estado.errorCalculo));
      return;
    }
    if (!estado.calculo) return;

    const c = estado.calculo;

    if (c.medidas.aviso) {
      zonaResultado.appendChild(p(c.medidas.aviso, 'aviso-linea aviso-linea--alerta'));
    }

    zonaResultado.appendChild(resumenArea(c));
    zonaResultado.appendChild(
      div('cotizador__acciones', [
        boton('🖨️ Imprimir hoja técnica', () => {
          imprimirNodo(construirBoletaTecnica(c));
        }, { clase: 'boton boton--principal' }),
      ]),
    );
    zonaResultado.appendChild(
      avisoOrientacion(c, () => {
        estado.orientacion =
          c.orientacion === 'vertical' ? 'horizontal' : 'vertical';
        recalcular();
      }),
    );
    zonaResultado.appendChild(tablaTecnica(c));
    zonaResultado.appendChild(tablaRecortes(c));
    zonaResultado.appendChild(tablaPrecios(c));
  }

  contenedor.replaceChildren();
  contenedor.appendChild(h(2, 'Cielo raso suspendido 61 × 61', 'vista__titulo'));
  contenedor.appendChild(
    p(
      'Baldosa vinílica sobre retícula de T. Calcula el material, reparte los ' +
        'recortes para no botar barras enteras y dibuja el plano.',
      'texto-tenue',
    ),
  );

  const form = formulario(estado, recalcular);
  sincronizarCampos = form.sincronizar;
  contenedor.appendChild(form.nodo);

  // El plano va arriba de las tablas: es lo que el maestro mira primero.
  lienzo = plano.crear(null);
  contenedor.appendChild(div('panel', [lienzo.nodo]));

  zonaResultado = div('');
  contenedor.appendChild(zonaResultado);

  if (auth.puede('ajustes:editar')) {
    contenedor.appendChild(panelAjustes(recalcular));
  }

  recalcular();
}

function formulario(estado, recalcular) {
  const panel = div('panel');
  const zonaCampos = div('');
  // El área es un dato derivado: si no se refresca aparte, se queda con el
  // valor con el que se dibujó el formulario y miente.
  let celdaArea = null;

  function pintarCampos() {
    zonaCampos.replaceChildren();
    celdaArea = null;

    if (estado.modo === 'medidas') {
      const ancho = campo('Ancho (cm)', {
        tipo: 'number',
        valor: estado.ancho,
        paso: '1',
        minimo: '1',
        alEscribir: (e) => {
          estado.ancho = e.target.value;
          recalcular();
        },
      });
      const largo = campo('Largo (cm)', {
        tipo: 'number',
        valor: estado.largo,
        paso: '1',
        minimo: '1',
        alEscribir: (e) => {
          estado.largo = e.target.value;
          recalcular();
        },
      });
      celdaArea = el('strong', {
        clase: 'campo__valor',
        id: 'suspendido-area',
        texto: areaTexto(estado),
      });
      const area = div('campo', [
        el('span', { clase: 'campo__etiqueta', texto: 'Área' }),
        celdaArea,
      ]);
      zonaCampos.appendChild(div('rejilla rejilla--3', [ancho.campo, largo.campo, area]));
    } else {
      const m2 = campo('Metros cuadrados', {
        tipo: 'number',
        valor: estado.metrosCuadrados,
        paso: '0.01',
        minimo: '0',
        ayuda: 'Sin ancho × largo el sistema supone un ambiente cuadrado.',
        alEscribir: (e) => {
          estado.metrosCuadrados = e.target.value;
          recalcular();
        },
      });
      zonaCampos.appendChild(div('rejilla rejilla--2', [m2.campo]));
    }
  }

  panel.appendChild(
    div('opciones', [
      opcion('Ancho × largo', estado.modo === 'medidas', () => {
        estado.modo = 'medidas';
        pintarCampos();
        recalcular();
      }),
      opcion('Solo metros cuadrados', estado.modo === 'area', () => {
        estado.modo = 'area';
        pintarCampos();
        recalcular();
      }),
    ]),
  );

  panel.appendChild(zonaCampos);
  pintarCampos();

  panel.appendChild(
    div('opciones', [
      opcion('Orientación automática', estado.orientacion === 'auto', () => {
        estado.orientacion = 'auto';
        redibujarLuego(recalcular);
      }),
      opcion('Principales verticales', estado.orientacion === 'vertical', () => {
        estado.orientacion = 'vertical';
        redibujarLuego(recalcular);
      }),
      opcion('Principales horizontales', estado.orientacion === 'horizontal', () => {
        estado.orientacion = 'horizontal';
        redibujarLuego(recalcular);
      }),
    ]),
  );

  return {
    nodo: panel,
    sincronizar: () => {
      if (celdaArea) celdaArea.textContent = areaTexto(estado);
    },
  };
}

function opcion(texto, activa, alHacerClic) {
  return el('button', {
    tipo: 'button',
    texto,
    clase: 'opcion' + (activa ? ' opcion--activa' : ''),
    alHacerClic,
  });
}

function areaTexto(estado) {
  const a = Number(estado.ancho);
  const l = Number(estado.largo);
  if (!Number.isFinite(a) || !Number.isFinite(l)) return '—';
  return `${numero((a * l) / 10000, 2)} m²`;
}

function resumenArea(c) {
  const caja = div('indicadores');
  const datos = [
    ['Área', `${numero(c.medidas.area, 2)} m²`],
    ['Medidas', `${numero(c.medidas.ancho, 0)} × ${numero(c.medidas.largo, 0)} cm`],
    ['Baldosas', String(c.materiales.baldosa.comprar)],
    ['Puntos de alambre', String(c.materiales.alambre.puntos)],
  ];
  for (const [etiqueta, valor] of datos) {
    caja.appendChild(
      div('indicador', [
        el('span', { clase: 'indicador__etiqueta', texto: etiqueta }),
        el('strong', { clase: 'indicador__valor', texto: valor }),
      ]),
    );
  }
  return caja;
}

export { CLAVE_BORRADOR };
