// Paso 1: qué se vende.
//
// REGLA DE ESTE PASO: los campos donde el usuario escribe se construyen UNA
// vez y no se vuelven a crear. Lo que se refresca en cada tecla es solo lo
// derivado (el despiece, el plano, el total). Redibujar el formulario entero
// mientras alguien escribe le arranca el foco y se pierde lo tecleado.

import { div, h, p, el, campo, seleccion, boton, tabla } from '../componentes/dom.js';
import { MODALIDADES, NOMBRES_MODALIDAD, TRABAJO_SUSPENDIDO } from '../../dominio/precios.js';
import { listar as listarRecetas } from '../../dominio/recetas.js';
import { numero, cantidad as fmtCantidad } from '../../core/formato.js';
import { formularioSuelto } from './cotizador-suelto.js';
import { formularioSuspendido } from './cotizador-suspendido.js';
import { cuadroTienda } from './suspendido-tablas.js';

const DESCRIPCIONES = {
  [MODALIDADES.CON_MANO_OBRA]:
    'Se cobra el metro cuadrado instalado. Incluye material y mano de obra. ' +
    'Reserva personal en el calendario.',
  [MODALIDADES.SOLO_MATERIAL_COMPLETO]:
    'Se venden metros cuadrados de material, sin instalación. La boleta del ' +
    'cliente muestra solo los m²; la interna lleva el despiece completo.',
  [MODALIDADES.MATERIAL_SUELTO]:
    'El cliente arma su lista desde el catálogo. La boleta muestra material, ' +
    'precio unitario, cantidad y total.',
};

export function montar(contenedor, ctx) {
  const { estado, siguiente, recalcular } = ctx;
  contenedor.replaceChildren();

  const zonaFormulario = div('cotizador__panel');
  let formulario = null;

  function cambiarModalidad() {
    zonaFormulario.replaceChildren();
    formulario = construir(estado, ctx);
    zonaFormulario.appendChild(formulario.nodo);
  }

  contenedor.appendChild(
    selectorModalidad(estado, () => {
      recalcular();
      cambiarModalidad();
    }),
  );
  contenedor.appendChild(zonaFormulario);

  cambiarModalidad();

  contenedor.appendChild(
    div('cotizador__acciones', [
      boton('Continuar a entrega →', () => {
        const resultado = recalcular();
        if (!resultado.ok) {
          alert(resultado.error);
          return;
        }
        siguiente();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
}

function construir(estado, ctx) {
  if (estado.modalidad === MODALIDADES.MATERIAL_SUELTO) return formularioSuelto(estado, ctx);
  return porTipoDeTrabajo(estado, ctx);
}

function selectorModalidad(estado, alCambiar) {
  const caja = div('modalidades');
  for (const valor of Object.values(MODALIDADES)) {
    const activa = estado.modalidad === valor;
    const tarjeta = el('button', {
      tipo: 'button',
      clase: 'modalidad' + (activa ? ' modalidad--activa' : ''),
      alHacerClic: () => {
        if (estado.modalidad === valor) return;
        estado.modalidad = valor;
        // Se repinta el selector entero para mover el resaltado.
        for (const otra of caja.querySelectorAll('.modalidad')) {
          otra.classList.remove('modalidad--activa');
        }
        tarjeta.classList.add('modalidad--activa');
        alCambiar();
      },
    });
    tarjeta.appendChild(el('strong', { texto: NOMBRES_MODALIDAD[valor] }));
    tarjeta.appendChild(el('span', { clase: 'modalidad__texto', texto: DESCRIPCIONES[valor] }));
    caja.appendChild(tarjeta);
  }
  return caja;
}

// --- Modalidades por metro cuadrado -----------------------------------------

/**
 * El tipo de trabajo manda: casi todos se calculan con una receta por m², pero
 * el cielo raso suspendido 61 × 61 tiene su propio motor y pide ancho × largo.
 * Al cambiar el tipo se rehace solo esa parte, nunca el selector.
 */
function porTipoDeTrabajo(estado, ctx) {
  const panel = div('panel');
  const zonaCampos = div('');
  let sub = null;

  // El orden es el que pidió el dueño: primero lo que más vende.
  const recetas = listarRecetas();
  const orden = ['division'];
  const opciones = [
    { valor: TRABAJO_SUSPENDIDO, texto: 'Cielo raso vinil (baldosa 61 × 61)' },
    ...orden
      .map((id) => recetas.find((r) => r.id === id))
      .filter(Boolean)
      .map((r) => ({ valor: r.id, texto: r.nombre })),
    ...recetas
      .filter((r) => !orden.includes(r.id))
      .map((r) => ({ valor: r.id, texto: r.nombre })),
  ];

  const tipo = seleccion('Tipo de trabajo', opciones, {
    valor: estado.recetaId,
    alCambiar: (evento) => {
      estado.recetaId = evento.target.value;
      construirSub();
      ctx.recalcular();
      sub?.sincronizar();
    },
  });

  function construirSub() {
    zonaCampos.replaceChildren();
    sub =
      estado.recetaId === TRABAJO_SUSPENDIDO
        ? formularioSuspendido(estado, ctx)
        : camposPorM2(estado, ctx);
    zonaCampos.appendChild(sub.nodo);
  }

  panel.appendChild(div('rejilla rejilla--2', [tipo.campo]));
  panel.appendChild(zonaCampos);
  construirSub();

  return { nodo: panel, sincronizar: () => sub?.sincronizar() };
}

function camposPorM2(estado, ctx) {
  const caja = div('');
  const zonaDerivada = div('');

  // Se pide como se mide en obra: ancho por largo, en metros. Los m² salen de
  // ahí y se muestran al lado, sin que nadie los escriba.
  if (!estado.medidas) estado.medidas = { ancho: '', largo: '' };

  const medida = (clave, etiqueta) =>
    campo(etiqueta, {
      tipo: 'number',
      valor: estado.medidas[clave],
      marcador: '0.00',
      paso: '0.01',
      minimo: '0',
      alEscribir: (evento) => {
        estado.medidas[clave] = evento.target.value;
        estado.metrosCuadrados = areaDeMedidas(estado.medidas);
        ctx.recalcular();
        sincronizar();
      },
    });

  const ancho = medida('ancho', 'Ancho (m)');
  const largo = medida('largo', 'Largo (m)');

  // Celda derivada: se refresca sola, nunca se reconstruye.
  const valorArea = el('strong', { clase: 'campo__valor', texto: '0.00 m²' });
  const area = div('campo', [
    el('span', { clase: 'campo__etiqueta', texto: 'Área' }),
    valorArea,
    p('Ancho × largo. Es lo que se cobra.', 'campo__ayuda'),
  ]);

  const desperdicio = campo('Desperdicio extra (%)', {
    tipo: 'number',
    valor: estado.desperdicioExtra,
    paso: '1',
    minimo: '0',
    ayuda: 'Las recetas ya incluyen un 8 %. Sube esto solo en techos muy recortados.',
    alEscribir: (evento) => {
      estado.desperdicioExtra = evento.target.value;
      ctx.recalcular();
      sincronizar();
    },
  });

  caja.appendChild(div('rejilla rejilla--3', [ancho.campo, largo.campo, area]));
  caja.appendChild(div('rejilla rejilla--2', [desperdicio.campo]));
  caja.appendChild(zonaDerivada);

  function sincronizar() {
    valorArea.textContent = `${numero(Number(estado.metrosCuadrados) || 0, 2)} m²`;
    zonaDerivada.replaceChildren();

    const receta = listarRecetas().find((r) => r.id === estado.recetaId);
    if (receta?.descripcion) zonaDerivada.appendChild(p(receta.descripcion, 'texto-tenue'));

    const despiece = estado.cotizacion?.interno?.despiece;
    if (despiece) zonaDerivada.appendChild(vistaDespiece(despiece));

    // El mismo cierre de cuentas que el cielo raso vinil: todo tipo de trabajo
    // termina diciendo qué le queda a la tienda.
    zonaDerivada.appendChild(cuadroTienda(estado.cotizacion?.interno?.cuentaTienda));
  }

  sincronizar();
  return { nodo: caja, sincronizar };
}

function vistaDespiece(despiece) {
  const caja = div('despiece');
  caja.appendChild(h(3, 'Material que se necesita', 'panel__subtitulo'));
  caja.appendChild(
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        {
          titulo: 'Se instala',
          clase: 'col-num',
          celda: (l) => fmtCantidad(l.consumo, l.unidadConsumo),
        },
        {
          titulo: 'Se compra',
          clase: 'col-num',
          celda: (l) => fmtCantidad(l.necesario, l.unidad),
        },
        {
          titulo: 'De retornos',
          clase: 'col-num col-retorno',
          celda: (l) => (l.deRetornos > 0 ? numero(l.deRetornos, 2) : '—'),
        },
        {
          titulo: 'De almacén',
          clase: 'col-num',
          celda: (l) => (l.deAlmacen > 0 ? numero(l.deAlmacen, 2) : '—'),
        },
        {
          titulo: 'Falta',
          clase: 'col-num col-falta',
          celda: (l) => (l.faltante > 0 ? numero(l.faltante, 2) : '—'),
        },
      ],
      despiece.lineas,
    ),
  );
  caja.appendChild(
    p(
      '"Se instala" es como lo cuenta el maestro; "se compra" es como lo vende ' +
        'el proveedor. Las columnas de origen van en unidad de compra, y se ' +
        'gasta primero el material que volvió de obras anteriores.',
      'texto-tenue',
    ),
  );
  return caja;
}

/** m² a partir de ancho y largo en metros. Devuelve texto, como el campo. */
function areaDeMedidas({ ancho, largo }) {
  const a = Number(ancho) || 0;
  const l = Number(largo) || 0;
  if (a <= 0 || l <= 0) return '';
  return String(Number((a * l).toFixed(2)));
}
