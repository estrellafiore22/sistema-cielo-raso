// Administración del catálogo: crear materiales y editar precios de compra y venta.

import { div, h, p, el, campo, seleccion, boton, tabla, error, exito, redibujarLuego } from '../componentes/dom.js';
import * as materiales from '../../dominio/materiales.js';
import { soles } from '../../core/formato.js';

export function montar(contenedor) {
  let mostrarInactivos = false;
  let mensaje = null;

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Materiales y precios', 'vista__titulo'));

    if (mensaje) {
      contenedor.appendChild(
        mensaje.ok ? exito(mensaje.texto) : error(mensaje.texto),
      );
      mensaje = null;
    }

    contenedor.appendChild(formularioNuevo((resultado) => {
      mensaje = resultado;
      dibujar();
    }));

    const alternar = boton(
      mostrarInactivos ? 'Ocultar desactivados' : 'Mostrar desactivados',
      () => {
        mostrarInactivos = !mostrarInactivos;
        dibujar();
      },
      { clase: 'boton boton--fantasma boton--pequeno' },
    );
    contenedor.appendChild(div('barra-filtros', [alternar]));

    for (const grupo of agrupar(mostrarInactivos)) {
      contenedor.appendChild(h(3, grupo.categoria.nombre, 'seccion__titulo'));
      contenedor.appendChild(tablaMateriales(grupo.materiales, () => dibujar()));
    }

    contenedor.appendChild(
      p(
        'Los precios que cambies aquí se aplican a las cotizaciones nuevas. ' +
          'Los pedidos ya emitidos conservan el precio con el que se cobraron.',
        'texto-tenue',
      ),
    );
  }

  dibujar();
}

function agrupar(incluirInactivos) {
  const lista = materiales.listar({ soloActivos: !incluirInactivos });
  return materiales
    .categorias()
    .map((categoria) => ({
      categoria,
      materiales: lista.filter((m) => m.categoria === categoria.id),
    }))
    .filter((grupo) => grupo.materiales.length > 0);
}

function tablaMateriales(lista, refrescar) {
  return tabla(
    [
      {
        titulo: 'Material',
        celda: (m) => {
          const caja = div('celda-material');
          caja.appendChild(el('span', { texto: m.nombre }));
          if (m.activo === false) {
            caja.appendChild(el('span', { clase: 'insignia insignia--peligro', texto: 'desactivado' }));
          }
          return caja;
        },
      },
      { titulo: 'Se vende en', celda: (m) => m.unidad },
      {
        titulo: 'Se gasta en',
        celda: (m) =>
          materiales.porVenta(m) > 1
            ? `${materiales.unidadDeConsumo(m)} (${materiales.porVenta(m)} por ${m.unidad})`
            : '—',
      },
      {
        titulo: 'P. compra',
        clase: 'col-num',
        celda: (m) => entradaPrecio(m, 'precioCompra', refrescar),
      },
      {
        titulo: 'P. venta',
        clase: 'col-num',
        celda: (m) => entradaPrecio(m, 'precioVenta', refrescar),
      },
      {
        titulo: 'Margen',
        clase: 'col-num',
        celda: (m) => {
          const { ganancia, porcentaje } = materiales.margen(m);
          const nodo = el('span', {
            texto: `${soles(ganancia)} (${porcentaje} %)`,
            clase: ganancia <= 0 ? 'texto-peligro' : 'texto-ok',
          });
          return nodo;
        },
      },
      {
        titulo: '',
        clase: 'col-accion',
        celda: (m) =>
          m.activo === false
            ? boton('Reactivar', () => {
                materiales.reactivar(m.id);
                refrescar();
              }, { clase: 'boton boton--fantasma boton--pequeno' })
            : boton('Desactivar', () => {
                if (confirm(`¿Desactivar "${m.nombre}"? Dejará de aparecer en el catálogo.`)) {
                  materiales.desactivar(m.id);
                  refrescar();
                }
              }, { clase: 'boton boton--fantasma boton--pequeno' }),
      },
    ],
    lista,
  );
}

/** Campo editable en línea. Guarda al salir del campo, no en cada tecla. */
function entradaPrecio(material, propiedad, refrescar) {
  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: material[propiedad],
  });
  entrada.step = '0.10';
  entrada.min = '0';

  entrada.addEventListener('change', () => {
    const resultado = materiales.editar(material.id, {
      [propiedad]: Number(entrada.value),
    });
    if (!resultado.ok) {
      alert(resultado.error);
      entrada.value = material[propiedad];
      return;
    }
    redibujarLuego(refrescar, entrada);
  });

  return entrada;
}

function formularioNuevo(alGuardar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Agregar material nuevo' }));

  const nombre = campo('Nombre', { marcador: 'Plancha drywall 15 mm' });
  const categoria = seleccion(
    'Categoría',
    materiales.categorias().map((c) => ({ valor: c.id, texto: c.nombre })),
  );
  const unidad = campo('Unidad de venta', {
    valor: 'unidad',
    marcador: 'plancha, barra, ciento, balde…',
    ayuda: 'Cómo lo cobra el proveedor.',
  });
  const unidadConsumo = campo('Unidad de consumo', {
    marcador: 'tornillo, kg, m…',
    ayuda: 'Cómo se cuenta en obra. Déjalo vacío si es la misma.',
  });
  const porVenta = campo('Cuántas trae la unidad de venta', {
    tipo: 'number', paso: '1', minimo: '1',
    ayuda: '100 tornillos por ciento, 28 kg por balde.',
  });
  const fraccionable = el('input', { tipo: 'checkbox', id: 'material-fraccionable' });
  const etiquetaFrac = el('label', { texto: 'Se puede comprar una parte' });
  etiquetaFrac.setAttribute('for', 'material-fraccionable');
  const campoFrac = div('campo', [
    el('span', { clase: 'campo__etiqueta', texto: 'Fraccionable' }),
    div('interruptor', [fraccionable, etiquetaFrac]),
  ]);
  const compra = campo('Precio de compra (S/)', { tipo: 'number', paso: '0.10', minimo: '0', valor: 0 });
  const venta = campo('Precio de venta (S/)', { tipo: 'number', paso: '0.10', minimo: '0', valor: 0 });
  const rendimiento = campo('Rendimiento (m² por unidad)', {
    tipo: 'number',
    paso: '0.0001',
    minimo: '0',
    ayuda: 'Solo para planchas y rollos. Déjalo vacío si no aplica.',
  });

  const guardar = boton('Guardar material', () => {
    const resultado = materiales.crear({
      nombre: nombre.entrada.value,
      categoria: categoria.entrada.value,
      unidad: unidad.entrada.value,
      unidadConsumo: unidadConsumo.entrada.value,
      porVenta: porVenta.entrada.value,
      fraccionable: fraccionable.checked,
      precioCompra: compra.entrada.value,
      precioVenta: venta.entrada.value,
      rendimiento: rendimiento.entrada.value || null,
    });
    alGuardar(
      resultado.ok
        ? { ok: true, texto: `"${resultado.material.nombre}" agregado al catálogo.` }
        : { ok: false, texto: resultado.error },
    );
  }, { clase: 'boton boton--principal' });

  detalles.appendChild(
    div('rejilla rejilla--3', [
      nombre.campo,
      categoria.campo,
      unidad.campo,
      unidadConsumo.campo,
      porVenta.campo,
      campoFrac,
      compra.campo,
      venta.campo,
      rendimiento.campo,
    ]),
  );
  detalles.appendChild(div('cotizador__acciones', [guardar]));
  return detalles;
}
