// Piezas compartidas por las dos boletas. Construyen nodos del DOM, no cadenas
// de HTML: así ningún dato del cliente puede inyectar etiquetas.

import * as bd from '../core/bd.js';
import { soles, fechaHora, cantidad as fmtCantidad } from '../core/formato.js';

export function elemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined && texto !== null) nodo.textContent = String(texto);
  return nodo;
}

export function encabezadoTienda(subtitulo) {
  const tienda = bd.config('tienda', {});
  const caja = elemento('header', 'boleta__encabezado');

  caja.appendChild(elemento('h1', 'boleta__tienda', tienda.nombre || 'Cielo Raso & Drywall'));

  const datos = [];
  if (tienda.ruc) datos.push(`RUC ${tienda.ruc}`);
  if (tienda.direccion) datos.push(tienda.direccion);
  if (tienda.telefono) datos.push(`Tel. ${tienda.telefono}`);
  if (datos.length) {
    caja.appendChild(elemento('p', 'boleta__tienda-datos', datos.join(' · ')));
  }

  if (subtitulo) caja.appendChild(elemento('h2', 'boleta__tipo', subtitulo));
  return caja;
}

export function datosPedido(pedido, { interno = false } = {}) {
  const caja = elemento('section', 'boleta__datos');
  const filas = [
    ['Pedido', pedido.codigo],
    ['Fecha', fechaHora(pedido.creadoEn)],
    ['Cliente', pedido.cliente.nombre],
  ];
  if (pedido.cliente.documento) filas.push(['DNI / RUC', pedido.cliente.documento]);
  if (pedido.cliente.telefono) filas.push(['Teléfono', pedido.cliente.telefono]);
  if (interno) filas.push(['Estado', pedido.estado]);

  const lista = elemento('dl', 'boleta__lista-datos');
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(elemento('dt', null, etiqueta));
    lista.appendChild(elemento('dd', null, valor));
  }
  caja.appendChild(lista);
  return caja;
}

/** Tabla de líneas. `columnas` decide qué se muestra en cada boleta. */
export function tablaLineas(lineas, { mostrarPrecioUnitario = true } = {}) {
  const tabla = elemento('table', 'boleta__tabla');

  const thead = elemento('thead');
  const filaTitulos = elemento('tr');
  filaTitulos.appendChild(elemento('th', 'col-concepto', 'Descripción'));
  filaTitulos.appendChild(elemento('th', 'col-num', 'Cantidad'));
  if (mostrarPrecioUnitario) {
    filaTitulos.appendChild(elemento('th', 'col-num', 'P. unitario'));
  }
  filaTitulos.appendChild(elemento('th', 'col-num', 'Total'));
  thead.appendChild(filaTitulos);
  tabla.appendChild(thead);

  const tbody = elemento('tbody');
  for (const linea of lineas) {
    const fila = elemento('tr');
    fila.appendChild(elemento('td', 'col-concepto', linea.concepto));
    fila.appendChild(
      elemento('td', 'col-num', fmtCantidad(linea.cantidad, linea.unidad || '')),
    );
    if (mostrarPrecioUnitario) {
      fila.appendChild(elemento('td', 'col-num', soles(linea.precioUnitario)));
    }
    fila.appendChild(elemento('td', 'col-num', soles(linea.total)));
    tbody.appendChild(fila);
  }
  tabla.appendChild(tbody);
  return tabla;
}

/** Bloque de totales. `filas` es [[etiqueta, monto, {fuerte, negativo}]]. */
export function bloqueTotales(filas) {
  const caja = elemento('section', 'boleta__totales');
  for (const [etiqueta, monto, opciones = {}] of filas) {
    if (monto === null || monto === undefined) continue;
    const fila = elemento('div', 'boleta__total-fila');
    if (opciones.fuerte) fila.classList.add('boleta__total-fila--fuerte');
    fila.appendChild(elemento('span', 'boleta__total-etiqueta', etiqueta));
    const valor = opciones.negativo ? -Math.abs(monto) : monto;
    fila.appendChild(elemento('span', 'boleta__total-monto', soles(valor)));
    caja.appendChild(fila);
  }
  return caja;
}

export function bloquePago(pago) {
  const caja = elemento('section', 'boleta__pago');
  caja.appendChild(elemento('h3', null, 'Pago'));

  const lista = elemento('dl', 'boleta__lista-datos');
  const filas = [
    ['Método', pago.nombreMetodo],
    ['Tipo', pago.tipo === 'completo' ? 'Pago completo' : 'Adelanto'],
    ['N° operación', pago.operacion],
    ['Pagado', soles(pago.pagado)],
  ];
  if (pago.saldo > 0) filas.push(['Saldo por cobrar', soles(pago.saldo)]);

  for (const [etiqueta, valor] of filas) {
    lista.appendChild(elemento('dt', null, etiqueta));
    lista.appendChild(elemento('dd', null, valor));
  }
  caja.appendChild(lista);
  return caja;
}

export function pie(texto) {
  const caja = elemento('footer', 'boleta__pie');
  caja.appendChild(elemento('p', null, texto));
  return caja;
}
