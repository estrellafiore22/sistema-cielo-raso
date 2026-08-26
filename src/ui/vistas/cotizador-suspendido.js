// Cielo raso suspendido dentro del cotizador.
//
// Mismos campos que la pantalla suelta de /suspendido, pero acá el cálculo
// termina en un pedido con cliente, transporte y pago.

import { div, h, p, el, campo, boton } from '../componentes/dom.js';
import * as plano from '../componentes/plano.js';
import { config as configSuspendido } from '../../dominio/suspendido/config.js';
import { tablaTecnica, tablaPrecios, avisoOrientacion } from './suspendido-tablas.js';
import { numero, soles } from '../../core/formato.js';

export function formularioSuspendido(estado, ctx) {
  const panel = div('panel');
  const zonaPlano = div('');
  const zonaDerivada = div('');
  const cfg = configSuspendido();

  const lienzo = plano.crear(null);

  const ancho = campo('Ancho (cm)', {
    tipo: 'number',
    valor: estado.suspendido.ancho,
    paso: '1',
    minimo: '1',
    alEscribir: (e) => {
      estado.suspendido.ancho = e.target.value;
      ctx.recalcular();
      sincronizar();
    },
  });

  const largo = campo('Largo (cm)', {
    tipo: 'number',
    valor: estado.suspendido.largo,
    paso: '1',
    minimo: '1',
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

  // Mano de obra: solo se ofrece si hay una tarifa cargada.
  const zonaObra = div('');
  if (Number(cfg.manoObraPorM2) > 0) {
    const interruptor = div('interruptor');
    const entrada = el('input', {
      tipo: 'checkbox',
      id: 'suspendido-obra',
      alCambiar: (e) => {
        estado.conManoObra = e.target.checked;
        ctx.recalcular();
        sincronizar();
      },
    });
    entrada.checked = Boolean(estado.conManoObra);
    const etiqueta = el('label', {
      texto: `Incluir instalación (${soles(cfg.manoObraPorM2)} por m²)`,
    });
    etiqueta.setAttribute('for', 'suspendido-obra');
    interruptor.append(entrada, etiqueta);
    zonaObra.appendChild(interruptor);
  } else {
    zonaObra.appendChild(
      p(
        'Se vende solo el material. Para cobrar la instalación, carga la mano ' +
          'de obra por m² en la pantalla de Cielo raso 61×61.',
        'texto-tenue',
      ),
    );
  }
  panel.appendChild(zonaObra);

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
    zonaDerivada.appendChild(tablaTecnica(calculo));
    zonaDerivada.appendChild(tablaPrecios(calculo));
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

function areaTexto(estado) {
  const a = Number(estado.suspendido.ancho);
  const l = Number(estado.suspendido.largo);
  if (!Number.isFinite(a) || !Number.isFinite(l) || a <= 0 || l <= 0) return '—';
  return `${numero((a * l) / 10000, 2)} m²`;
}
