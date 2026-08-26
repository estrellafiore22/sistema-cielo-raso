// Boleta INTERNA del administrador. Lleva todo lo que la del cliente esconde:
//
//   · metros cuadrados pedidos
//   · despiece completo de materiales
//   · de qué bolsa sale cada material (almacén o retorno de obra anterior)
//   · qué falta comprar antes de salir
//   · transporte con distancia y dirección exacta
//   · costos, margen y —lo más importante para el chofer— cuánto cobrar al llegar

import * as plantilla from './plantilla.js';
import { soles, cantidad as fmtCantidad, fechaLarga, numero } from '../core/formato.js';
import { enlaceNavegacion } from '../integraciones/mapas.js';
import { estatico as planoEstatico } from '../ui/componentes/plano.js';

export function construir(pedido) {
  const cotizacion = pedido.cotizacion;
  const interno = cotizacion.interno;

  const hoja = plantilla.elemento('article', 'boleta boleta--admin');
  hoja.appendChild(plantilla.encabezadoTienda('Orden interna — no entregar al cliente'));
  hoja.appendChild(plantilla.datosPedido(pedido, { interno: true }));

  // Qué se vendió
  const resumen = plantilla.elemento('section', 'boleta__detalle');
  resumen.appendChild(plantilla.elemento('h3', null, cotizacion.nombreModalidad));
  if (cotizacion.trabajo) {
    resumen.appendChild(
      plantilla.elemento(
        'p',
        'boleta__destacado',
        `${cotizacion.trabajo.nombre} — ${numero(cotizacion.trabajo.metrosCuadrados, 2)} m²`,
      ),
    );
  }
  hoja.appendChild(resumen);

  // Plano de la retícula, en los pedidos de cielo raso suspendido.
  if (interno.grid) {
    const zonaPlano = plantilla.elemento('section', 'boleta__plano');
    zonaPlano.appendChild(plantilla.elemento('h3', null, 'Plano de la retícula'));
    zonaPlano.appendChild(planoEstatico(interno.grid));
    hoja.appendChild(zonaPlano);
  }

  // Despiece con origen del material
  if (interno.despiece) {
    hoja.appendChild(tablaDespiece(interno.despiece));
    const faltan = interno.despiece.lineas.filter((l) => l.faltante > 0);
    if (faltan.length) hoja.appendChild(tablaFaltantes(faltan, interno.despiece.totales));
  }

  // Material suelto: lista con costo
  if (interno.lineas) hoja.appendChild(tablaMaterialSuelto(interno.lineas));

  // Entrega y transporte
  hoja.appendChild(bloqueEntregaInterno(pedido, cotizacion.transporte));

  // Cuentas
  hoja.appendChild(
    plantilla.bloqueTotales([
      ['Material (venta)', interno.materialVenta],
      interno.manoObra > 0 ? ['Mano de obra', interno.manoObra] : null,
      cotizacion.transporte.total > 0 ? ['Transporte', cotizacion.transporte.total] : null,
      cotizacion.descuento > 0
        ? ['Descuento', cotizacion.descuento, { negativo: true }]
        : null,
      ['TOTAL DEL PEDIDO', cotizacion.total, { fuerte: true }],
      ['Adelanto recibido', pedido.pago.pagado, { negativo: true }],
      ['COBRAR AL LLEGAR', pedido.pago.cobrarEnEntrega, { fuerte: true }],
    ].filter(Boolean)),
  );

  hoja.appendChild(bloqueCostos(interno, cotizacion));
  hoja.appendChild(plantilla.bloquePago(pedido.pago));
  hoja.appendChild(
    plantilla.pie('Documento interno. Contiene costos y márgenes de la tienda.'),
  );

  return hoja;
}

function tablaDespiece(despiece) {
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Material a llevar'));

  const tabla = plantilla.elemento('table', 'boleta__tabla boleta__tabla--densa');

  const thead = plantilla.elemento('thead');
  const titulos = plantilla.elemento('tr');
  for (const [texto, clase] of [
    ['Material', 'col-concepto'],
    ['Total', 'col-num'],
    ['De retornos', 'col-num'],
    ['De almacén', 'col-num'],
    ['Falta', 'col-num'],
  ]) {
    titulos.appendChild(plantilla.elemento('th', clase, texto));
  }
  thead.appendChild(titulos);
  tabla.appendChild(thead);

  const tbody = plantilla.elemento('tbody');
  for (const linea of despiece.lineas) {
    const fila = plantilla.elemento('tr');
    if (linea.faltante > 0) fila.classList.add('fila--falta');

    fila.appendChild(plantilla.elemento('td', 'col-concepto', linea.nombre));
    fila.appendChild(
      plantilla.elemento('td', 'col-num', fmtCantidad(linea.necesario, linea.unidad)),
    );
    fila.appendChild(
      plantilla.elemento(
        'td',
        'col-num col-retorno',
        linea.deRetornos > 0 ? fmtCantidad(linea.deRetornos) : '—',
      ),
    );
    fila.appendChild(
      plantilla.elemento(
        'td',
        'col-num',
        linea.deAlmacen > 0 ? fmtCantidad(linea.deAlmacen) : '—',
      ),
    );
    fila.appendChild(
      plantilla.elemento(
        'td',
        'col-num col-falta',
        linea.faltante > 0 ? fmtCantidad(linea.faltante) : '—',
      ),
    );
    tbody.appendChild(fila);
  }
  tabla.appendChild(tbody);
  caja.appendChild(tabla);

  caja.appendChild(
    plantilla.elemento(
      'p',
      'boleta__nota',
      'Gastar primero lo de retornos. La columna "Falta" es lo que hay que ' +
        'comprar antes de salir a la obra.',
    ),
  );
  return caja;
}

function tablaFaltantes(faltan, totales) {
  const caja = plantilla.elemento('section', 'boleta__faltantes');
  caja.appendChild(
    plantilla.elemento('h3', null, '⚠ Comprar antes de despachar'),
  );
  const lista = plantilla.elemento('ul', 'boleta__faltantes-lista');
  for (const linea of faltan) {
    lista.appendChild(
      plantilla.elemento(
        'li',
        null,
        `${linea.nombre}: ${fmtCantidad(linea.faltante, linea.unidad)} ` +
          `(≈ ${soles(linea.costoReposicion)})`,
      ),
    );
  }
  caja.appendChild(lista);
  caja.appendChild(
    plantilla.elemento(
      'p',
      'boleta__destacado',
      `Costo estimado de reposición: ${soles(totales.reposicion)}`,
    ),
  );
  return caja;
}

function tablaMaterialSuelto(lineas) {
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Material pedido'));

  const tabla = plantilla.elemento('table', 'boleta__tabla boleta__tabla--densa');
  const thead = plantilla.elemento('thead');
  const titulos = plantilla.elemento('tr');
  for (const [texto, clase] of [
    ['Material', 'col-concepto'],
    ['Cantidad', 'col-num'],
    ['P. venta', 'col-num'],
    ['Costo', 'col-num'],
    ['Total', 'col-num'],
  ]) {
    titulos.appendChild(plantilla.elemento('th', clase, texto));
  }
  thead.appendChild(titulos);
  tabla.appendChild(thead);

  const tbody = plantilla.elemento('tbody');
  for (const linea of lineas) {
    const fila = plantilla.elemento('tr');
    fila.appendChild(plantilla.elemento('td', 'col-concepto', linea.nombre));
    fila.appendChild(
      plantilla.elemento('td', 'col-num', fmtCantidad(linea.cantidad, linea.unidad)),
    );
    fila.appendChild(plantilla.elemento('td', 'col-num', soles(linea.precioUnitario)));
    fila.appendChild(plantilla.elemento('td', 'col-num', soles(linea.costo)));
    fila.appendChild(plantilla.elemento('td', 'col-num', soles(linea.total)));
    tbody.appendChild(fila);
  }
  tabla.appendChild(tbody);
  caja.appendChild(tabla);
  return caja;
}

function bloqueEntregaInterno(pedido, envio) {
  const caja = plantilla.elemento('section', 'boleta__entrega');
  caja.appendChild(plantilla.elemento('h3', null, 'Entrega y transporte'));

  if (pedido.entrega.recogeEnTienda) {
    caja.appendChild(plantilla.elemento('p', null, 'Recojo en tienda.'));
    return caja;
  }

  const lista = plantilla.elemento('dl', 'boleta__lista-datos');
  const filas = [
    ['Dirección exacta', pedido.entrega.direccion],
    ['Referencia', pedido.entrega.referencia || '—'],
    ['Fecha', fechaLarga(pedido.entrega.fecha)],
    ['Hora', pedido.entrega.hora],
    ['Distancia', `${numero(envio.km, 2)} km`],
    ['Km cobrables', `${numero(envio.kmCobrables, 2)} km (${envio.kmLibres} libres)`],
    ['Tarifa base', soles(envio.tarifaBase)],
    ['Costo por distancia', soles(envio.costoDistancia)],
    ['Total transporte', soles(envio.total)],
  ];
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(plantilla.elemento('dt', null, etiqueta));
    lista.appendChild(plantilla.elemento('dd', null, valor));
  }
  caja.appendChild(lista);

  const enlace = plantilla.elemento('p', 'boleta__nota');
  enlace.textContent =
    'Ruta: ' + enlaceNavegacion(pedido.entrega.direccion, pedido.entrega.coordenadas);
  caja.appendChild(enlace);

  return caja;
}

function bloqueCostos(interno, cotizacion) {
  const caja = plantilla.elemento('section', 'boleta__costos');
  caja.appendChild(plantilla.elemento('h3', null, 'Costos y margen'));
  caja.appendChild(
    plantilla.bloqueTotales([
      ['Costo del material', interno.materialCosto],
      interno.manoObra > 0 ? ['Mano de obra pagada', interno.manoObra] : null,
      ['Ingreso sin transporte', cotizacion.total - cotizacion.transporte.total],
      ['Ganancia', interno.ganancia, { fuerte: true }],
    ].filter(Boolean)),
  );
  caja.appendChild(
    plantilla.elemento('p', 'boleta__nota', `Margen: ${interno.margenPorcentaje} %`),
  );
  return caja;
}
