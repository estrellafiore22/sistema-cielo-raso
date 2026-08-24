// Boleta del CLIENTE.
//
// Regla que el dueño dejó clara: en la venta de "solo material completo" el
// cliente ve ÚNICAMENTE los metros cuadrados que compró. Nada de despiece,
// nada de precios por material, nada de de dónde sale el material.
//
// En material suelto sí ve el detalle: material, precio unitario, cantidad y
// total por línea.

import * as plantilla from './plantilla.js';
import { fechaLarga } from '../core/formato.js';

export function construir(pedido) {
  const cotizacion = pedido.cotizacion;
  const vista = cotizacion.cliente;

  const hoja = plantilla.elemento('article', 'boleta boleta--cliente');
  hoja.appendChild(plantilla.encabezadoTienda('Comprobante de pedido'));
  hoja.appendChild(plantilla.datosPedido(pedido));

  // Qué compró
  const detalle = plantilla.elemento('section', 'boleta__detalle');
  detalle.appendChild(
    plantilla.elemento('h3', null, cotizacion.nombreModalidad),
  );
  detalle.appendChild(
    plantilla.tablaLineas(vista.lineas, { mostrarPrecioUnitario: true }),
  );
  hoja.appendChild(detalle);

  // Entrega
  if (!pedido.entrega.recogeEnTienda) {
    hoja.appendChild(bloqueEntrega(pedido));
  } else {
    const aviso = plantilla.elemento('section', 'boleta__entrega');
    aviso.appendChild(plantilla.elemento('h3', null, 'Entrega'));
    aviso.appendChild(
      plantilla.elemento('p', null, 'Recojo en tienda. No incluye transporte.'),
    );
    hoja.appendChild(aviso);
  }

  // Totales
  hoja.appendChild(
    plantilla.bloqueTotales([
      ['Subtotal', cotizacion.subtotal],
      vista.transporte > 0 ? ['Transporte', vista.transporte] : null,
      vista.descuento > 0 ? ['Descuento', vista.descuento, { negativo: true }] : null,
      ['Total', cotizacion.total, { fuerte: true }],
      ['Pagado', pedido.pago.pagado],
      pedido.pago.saldo > 0
        ? ['Saldo a pagar en la entrega', pedido.pago.saldo, { fuerte: true }]
        : null,
    ].filter(Boolean)),
  );

  hoja.appendChild(plantilla.bloquePago(pedido.pago));

  hoja.appendChild(
    plantilla.pie(
      pedido.pago.saldo > 0
        ? `Queda pendiente el saldo, que se cobra al momento de la entrega. ` +
            `Conserve este comprobante.`
        : 'Pedido pagado en su totalidad. Conserve este comprobante.',
    ),
  );

  return hoja;
}

function bloqueEntrega(pedido) {
  const caja = plantilla.elemento('section', 'boleta__entrega');
  caja.appendChild(plantilla.elemento('h3', null, 'Entrega'));

  const lista = plantilla.elemento('dl', 'boleta__lista-datos');
  const filas = [
    ['Dirección', pedido.entrega.direccion],
    ['Fecha', fechaLarga(pedido.entrega.fecha)],
    ['Hora', pedido.entrega.hora],
  ];
  if (pedido.entrega.referencia) filas.push(['Referencia', pedido.entrega.referencia]);

  for (const [etiqueta, valor] of filas) {
    lista.appendChild(plantilla.elemento('dt', null, etiqueta));
    lista.appendChild(plantilla.elemento('dd', null, valor));
  }
  caja.appendChild(lista);
  return caja;
}
