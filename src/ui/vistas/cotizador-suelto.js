// Material suelto: carrito y catálogo por categorías.
//
// Los campos de cantidad no se vuelven a crear al escribir; solo se refresca
// la celda del total de esa fila y el resumen lateral.

import { div, h, p, el, boton, tabla } from '../componentes/dom.js';
import { porCategoria, obtener as obtenerMaterial } from '../../dominio/materiales.js';
import { soles } from '../../core/formato.js';

export function formularioSuelto(estado, ctx) {
  const panel = div('panel');
  const zonaCarrito = div('');
  const zonaCatalogo = div('');

  function pintarCarrito() {
    zonaCarrito.replaceChildren();
    zonaCarrito.appendChild(h(3, 'Materiales en el pedido', 'panel__subtitulo'));

    if (estado.items.length === 0) {
      zonaCarrito.appendChild(p('Aún no has agregado materiales.', 'texto-tenue'));
      return;
    }

    zonaCarrito.appendChild(
      tabla(
        [
          {
            titulo: 'Material',
            celda: (item) => obtenerMaterial(item.material)?.nombre || item.material,
          },
          { titulo: 'Cantidad', clase: 'col-num', celda: (item) => entradaCantidad(item) },
          {
            titulo: 'P. unitario',
            clase: 'col-num',
            celda: (item) => soles(obtenerMaterial(item.material)?.precioVenta || 0),
          },
          {
            titulo: 'Total',
            clase: 'col-num',
            celda: (item) => {
              // La celda se guarda para poder refrescarla sin rehacer la fila.
              item._celdaTotal = el('span', { texto: totalDe(item) });
              return item._celdaTotal;
            },
          },
          {
            titulo: '',
            clase: 'col-accion',
            celda: (item) =>
              boton('✕', () => {
                estado.items = estado.items.filter((i) => i !== item);
                ctx.recalcular();
                pintarCarrito();
                pintarCatalogo();
              }, { clase: 'boton boton--fantasma boton--pequeno' }),
          },
        ],
        estado.items,
      ),
    );
  }

  function entradaCantidad(item) {
    const entrada = el('input', {
      tipo: 'number',
      clase: 'entrada-mini',
      valor: item.cantidad,
    });
    entrada.min = '0';
    entrada.step = '0.01';
    entrada.addEventListener('input', () => {
      item.cantidad = Number(entrada.value) || 0;
      ctx.recalcular();
      if (item._celdaTotal) item._celdaTotal.textContent = totalDe(item);
    });
    return entrada;
  }

  function pintarCatalogo() {
    zonaCatalogo.replaceChildren();
    zonaCatalogo.appendChild(h(3, 'Agregar del catálogo', 'panel__subtitulo'));

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
              ctx.recalcular();
              pintarCarrito();
              pintarCatalogo();
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
      zonaCatalogo.appendChild(detalles);
    }
  }

  panel.append(zonaCarrito, zonaCatalogo);
  pintarCarrito();
  pintarCatalogo();

  return {
    nodo: panel,
    // Nada derivado que refrescar aquí: cada fila cuida su propio total.
    sincronizar: () => {},
  };
}

function totalDe(item) {
  const material = obtenerMaterial(item.material);
  return soles((material?.precioVenta || 0) * (Number(item.cantidad) || 0));
}
