// Paso 1: qué se vende.
// Según la modalidad muestra el formulario de m² o el catálogo de material suelto.

import { div, h, p, el, campo, seleccion, boton, tabla } from '../componentes/dom.js';
import { MODALIDADES, NOMBRES_MODALIDAD } from '../../dominio/precios.js';
import { listar as listarRecetas } from '../../dominio/recetas.js';
import { porCategoria, obtener as obtenerMaterial } from '../../dominio/materiales.js';
import { soles, numero, cantidad as fmtCantidad } from '../../core/formato.js';

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

  function repintarFormulario() {
    zonaFormulario.replaceChildren();
    if (estado.modalidad === MODALIDADES.MATERIAL_SUELTO) {
      zonaFormulario.appendChild(formularioSuelto(estado, recalcular, repintarFormulario));
    } else {
      zonaFormulario.appendChild(formularioMetros(estado, recalcular, repintarFormulario));
    }
  }

  contenedor.appendChild(selectorModalidad(estado, () => {
    recalcular(estado);
    repintarFormulario();
  }));
  contenedor.appendChild(zonaFormulario);
  repintarFormulario();

  contenedor.appendChild(
    div('cotizador__acciones', [
      boton('Continuar a entrega →', () => {
        const resultado = recalcular(estado);
        if (!resultado.ok) {
          alert(resultado.error);
          return;
        }
        siguiente();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
}

function selectorModalidad(estado, alCambiar) {
  const caja = div('modalidades');
  for (const valor of Object.values(MODALIDADES)) {
    const activa = estado.modalidad === valor;
    const tarjeta = el('button', {
      tipo: 'button',
      clase: 'modalidad' + (activa ? ' modalidad--activa' : ''),
      alHacerClic: () => {
        estado.modalidad = valor;
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

function formularioMetros(estado, recalcular, repintar) {
  const recetas = listarRecetas();

  const tipo = seleccion(
    'Tipo de trabajo',
    recetas.map((r) => ({ valor: r.id, texto: r.nombre })),
    {
      valor: estado.recetaId,
      alCambiar: (evento) => {
        estado.recetaId = evento.target.value;
        recalcular(estado);
        repintar();
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
      recalcular(estado);
      repintar();
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
      recalcular(estado);
      repintar();
    },
  });

  const panel = div('panel', [
    div('rejilla rejilla--3', [tipo.campo, metros.campo, desperdicio.campo]),
  ]);

  const receta = recetas.find((r) => r.id === estado.recetaId);
  if (receta?.descripcion) panel.appendChild(p(receta.descripcion, 'texto-tenue'));

  const despiece = estado.cotizacion?.interno?.despiece;
  if (despiece) panel.appendChild(vistaDespiece(despiece));

  return panel;
}

function vistaDespiece(despiece) {
  const caja = div('despiece');
  caja.appendChild(h(3, 'Material que se necesita', 'panel__subtitulo'));
  caja.appendChild(
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.nombre },
        { titulo: 'Necesario', clase: 'col-num', celda: (l) => fmtCantidad(l.necesario, l.unidad) },
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

// --- Material suelto --------------------------------------------------------

function formularioSuelto(estado, recalcular, repintar) {
  const panel = div('panel');

  // Carrito
  panel.appendChild(h(3, 'Materiales en el pedido', 'panel__subtitulo'));
  if (estado.items.length === 0) {
    panel.appendChild(p('Aún no has agregado materiales.', 'texto-tenue'));
  } else {
    panel.appendChild(
      tabla(
        [
          {
            titulo: 'Material',
            celda: (item) => obtenerMaterial(item.material)?.nombre || item.material,
          },
          {
            titulo: 'Cantidad',
            clase: 'col-num',
            celda: (item) => {
              const entrada = el('input', {
                tipo: 'number',
                clase: 'entrada-mini',
                valor: item.cantidad,
                alEscribir: (evento) => {
                  item.cantidad = Number(evento.target.value) || 0;
                  recalcular(estado);
                },
              });
              entrada.min = '0';
              entrada.step = '0.01';
              return entrada;
            },
          },
          {
            titulo: 'P. unitario',
            clase: 'col-num',
            celda: (item) => soles(obtenerMaterial(item.material)?.precioVenta || 0),
          },
          {
            titulo: 'Total',
            clase: 'col-num',
            celda: (item) =>
              soles((obtenerMaterial(item.material)?.precioVenta || 0) * item.cantidad),
          },
          {
            titulo: '',
            clase: 'col-accion',
            celda: (item) =>
              boton(
                '✕',
                () => {
                  estado.items = estado.items.filter((i) => i !== item);
                  recalcular(estado);
                  repintar();
                },
                { clase: 'boton boton--fantasma boton--pequeno' },
              ),
          },
        ],
        estado.items,
      ),
    );
  }

  // Catálogo por categorías
  panel.appendChild(h(3, 'Agregar del catálogo', 'panel__subtitulo'));
  for (const grupo of porCategoria()) {
    const detalles = el('details', { clase: 'categoria' });
    detalles.appendChild(el('summary', { texto: grupo.categoria.nombre }));

    const rejilla = div('rejilla rejilla--catalogo');
    for (const material of grupo.materiales) {
      const yaEsta = estado.items.some((i) => i.material === material.id);
      rejilla.appendChild(
        el('button', {
          tipo: 'button',
          clase: 'material-chip' + (yaEsta ? ' material-chip--agregado' : ''),
          deshabilitado: yaEsta,
          alHacerClic: () => {
            estado.items.push({ material: material.id, cantidad: 1 });
            recalcular(estado);
            repintar();
          },
        }, [
          el('span', { clase: 'material-chip__nombre', texto: material.nombre }),
          el('span', {
            clase: 'material-chip__precio',
            texto: `${soles(material.precioVenta)} / ${material.unidad}`,
          }),
        ]),
      );
    }
    detalles.appendChild(rejilla);
    panel.appendChild(detalles);
  }

  return panel;
}
