// Cielo raso suspendido dentro del cotizador.
//
// Mismos campos que la pantalla suelta de /suspendido, pero acá el cálculo
// termina en un pedido con cliente, transporte y pago.

import { div, h, p, el, campo, boton } from '../componentes/dom.js';
import * as plano from '../componentes/plano.js';
import { config as configSuspendido } from '../../dominio/suspendido/config.js';
import { MODALIDADES } from '../../dominio/precios.js';
import {
  tablaTecnica,
  tablaPrecios,
  avisoOrientacion,
  cuadroTienda,
  selectorPromocion,
} from './suspendido-tablas.js';
import { numero, soles } from '../../core/formato.js';

export function formularioSuspendido(estado, ctx) {
  const panel = div('panel');
  const zonaPlano = div('');
  const zonaDerivada = div('');
  const cfg = configSuspendido();

  const lienzo = plano.crear(null);

  const ancho = campo('Ancho (m)', {
    tipo: 'number',
    valor: estado.suspendido.ancho,
    paso: '0.01',
    minimo: '0.1',
    alEscribir: (e) => {
      estado.suspendido.ancho = e.target.value;
      ctx.recalcular();
      sincronizar();
    },
  });

  const largo = campo('Largo (m)', {
    tipo: 'number',
    valor: estado.suspendido.largo,
    paso: '0.01',
    minimo: '0.1',
    alEscribir: (e) => {
      estado.suspendido.largo = e.target.value;
      ctx.recalcular();
      sincronizar();
    },
  });

  const celdaArea = el('strong', { clase: 'campo__valor', texto: areaTexto(estado) });
  const area = div('campo', [
    el('span', { clase: 'campo__etiqueta', texto: 'Área' }),
    celdaArea,
  ]);

  panel.appendChild(div('rejilla rejilla--3', [ancho.campo, largo.campo, area]));

  // La instalación se cobra o no según la modalidad de venta, no aparte.
  const conObra = estado.modalidad === MODALIDADES.CON_MANO_OBRA;
  const tarifa = Number(cfg.manoObraPorM2) || 0;

  if (conObra && tarifa > 0) {
    panel.appendChild(
      p(`Incluye instalación a ${soles(tarifa)} por m².`, 'aviso-linea aviso-linea--ok'),
    );
  } else if (conObra) {
    panel.appendChild(
      p(
        'Elegiste vender con mano de obra, pero no hay tarifa de instalación ' +
          'cargada para este sistema: se está cobrando solo el material. ' +
          'Cárgala en Ajustes → Cielo raso vinil.',
        'aviso-linea aviso-linea--alerta',
      ),
    );
  } else {
    panel.appendChild(p('Se vende solo el material, sin instalación.', 'texto-tenue'));
  }

  panel.appendChild(
    div('opciones', [
      opcionOrientacion(estado, 'auto', 'Orientación automática', sincronizarTodo),
      opcionOrientacion(estado, 'vertical', 'Principales verticales', sincronizarTodo),
      opcionOrientacion(estado, 'horizontal', 'Principales horizontales', sincronizarTodo),
    ]),
  );

  panel.appendChild(div('panel', [lienzo.nodo]));
  panel.appendChild(zonaDerivada);

  function sincronizarTodo() {
    ctx.recalcular();
    sincronizar();
  }

  function sincronizar() {
    celdaArea.textContent = areaTexto(estado);

    const calculo = estado.cotizacion?.interno?.suspendido || null;
    lienzo.actualizar(calculo?.grid || null);

    zonaDerivada.replaceChildren();
    if (!calculo) {
      zonaDerivada.appendChild(
        p(estado.errorCotizacion || 'Ingresa las medidas.', 'texto-tenue'),
      );
      return;
    }

    zonaDerivada.appendChild(
      avisoOrientacion(calculo, () => {
        estado.suspendido.orientacion =
          calculo.orientacion === 'vertical' ? 'horizontal' : 'vertical';
        sincronizarTodo();
      }),
    );
    zonaDerivada.appendChild(tablaTecnica(calculo, sincronizarTodo));
    zonaDerivada.appendChild(tablaPrecios(calculo));

    // Solo con instalación tiene sentido cobrar por m² y hablar de ganancia.
    if (conObra) {
      zonaDerivada.appendChild(
        selectorPromocion(estado, calculo.medidas.area, sincronizarTodo),
      );
    }
    zonaDerivada.appendChild(
      cuadroTienda(estado.cotizacion?.interno?.cuentaTienda),
    );
  }

  sincronizar();
  return { nodo: panel, sincronizar };
}

function opcionOrientacion(estado, valor, texto, alCambiar) {
  const nodo = el('button', {
    tipo: 'button',
    texto,
    clase: 'opcion' + (estado.suspendido.orientacion === valor ? ' opcion--activa' : ''),
    alHacerClic: () => {
      estado.suspendido.orientacion = valor;
      for (const otra of nodo.parentElement.querySelectorAll('.opcion')) {
        otra.classList.remove('opcion--activa');
      }
      nodo.classList.add('opcion--activa');
      alCambiar();
    },
  });
  return nodo;
}

/** El ancho y el largo se cargan en metros, que es como se miden en obra. */
function areaTexto(estado) {
  const a = Number(estado.suspendido.ancho);
  const l = Number(estado.suspendido.largo);
  if (!Number.isFinite(a) || !Number.isFinite(l) || a <= 0 || l <= 0) return '—';
  return `${numero(a * l, 2)} m²`;
}
