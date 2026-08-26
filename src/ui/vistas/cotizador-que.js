// Paso 1: qué se vende.
//
// REGLA DE ESTE PASO: los campos donde el usuario escribe se construyen UNA
// vez y no se vuelven a crear. Lo que se refresca en cada tecla es solo lo
// derivado (el despiece, el plano, el total). Redibujar el formulario entero
// mientras alguien escribe le arranca el foco y se pierde lo tecleado.

import { div, h, p, el, campo, seleccion, boton, tabla } from '../componentes/dom.js';
import { MODALIDADES, NOMBRES_MODALIDAD } from '../../dominio/precios.js';
import { listar as listarRecetas } from '../../dominio/recetas.js';
import { numero, cantidad as fmtCantidad } from '../../core/formato.js';
import { formularioSuelto } from './cotizador-suelto.js';
import { formularioSuspendido } from './cotizador-suspendido.js';

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
  [MODALIDADES.SUSPENDIDO]:
    'Baldosa vinílica sobre retícula de T. Calcula perfiles, cortes y plano, ' +
    'y elige la orientación más barata.',
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
  if (estado.modalidad === MODALIDADES.SUSPENDIDO) return formularioSuspendido(estado, ctx);
  return formularioMetros(estado, ctx);
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

function formularioMetros(estado, ctx) {
  const recetas = listarRecetas();
  const panel = div('panel');
  const zonaDerivada = div('');

  const tipo = seleccion(
    'Tipo de trabajo',
    recetas.map((r) => ({ valor: r.id, texto: r.nombre })),
    {
      valor: estado.recetaId,
      alCambiar: (evento) => {
        estado.recetaId = evento.target.value;
        ctx.recalcular();
        sincronizar();
      },
    },
  );

  const metros = campo('Metros cuadrados', {
    tipo: 'number',
    valor: estado.metrosCuadrados,
    marcador: '0',
    paso: '0.01',
    minimo: '0',
    alEscribir: (evento) => {
      estado.metrosCuadrados = evento.target.value;
      ctx.recalcular();
      sincronizar();
    },
  });

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

  panel.appendChild(div('rejilla rejilla--3', [tipo.campo, metros.campo, desperdicio.campo]));
  panel.appendChild(zonaDerivada);

  function sincronizar() {
    zonaDerivada.replaceChildren();

    const receta = listarRecetas().find((r) => r.id === estado.recetaId);
    if (receta?.descripcion) zonaDerivada.appendChild(p(receta.descripcion, 'texto-tenue'));

    const despiece = estado.cotizacion?.interno?.despiece;
    if (despiece) zonaDerivada.appendChild(vistaDespiece(despiece));
  }

  sincronizar();
  return { nodo: panel, sincronizar };
}

function vistaDespiece(despiece) {
  const caja = div('despiece');
  caja.appendChild(h(3, 'Material que se necesita', 'panel__subtitulo'));
  caja.appendChild(
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        {
          titulo: 'Necesario',
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
      'Se gasta primero el material que volvió de obras anteriores, luego el de almacén.',
      'texto-tenue',
    ),
  );
  return caja;
}
