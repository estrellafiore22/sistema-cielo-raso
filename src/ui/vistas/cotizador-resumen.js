// Paso 4: confirmar, guardar el pedido e imprimir.

import { div, h, p, el, boton, error, exito } from '../componentes/dom.js';
import * as pedidos from '../../dominio/pedidos.js';
import * as cola from '../../impresion/cola-impresion.js';
import * as notificaciones from '../../integraciones/notificaciones.js';
import * as auth from '../../core/auth.js';
import * as router from '../../core/router.js';
import { faltantes } from '../../dominio/despiece.js';
import { soles, numero, fechaLarga } from '../../core/formato.js';

export function montar(contenedor, ctx) {
  const { estado, anterior, reiniciar } = ctx;
  contenedor.replaceChildren();

  if (estado.pedidoCreado) {
    contenedor.appendChild(pantallaCreado(estado, reiniciar));
    return;
  }

  const zonaError = div('');
  contenedor.appendChild(resumenCompleto(estado));
  contenedor.appendChild(zonaError);
  contenedor.appendChild(
    div('cotizador__acciones', [
      boton('← Volver', anterior, { clase: 'boton boton--fantasma' }),
      boton(
        'Registrar pedido',
        (evento) => {
          zonaError.replaceChildren();
          evento.target.disabled = true;

          const resultado = pedidos.crear({
            cliente: estado.cliente,
            modalidad: estado.modalidad,
            recetaId: estado.recetaId,
            metrosCuadrados: Number(estado.metrosCuadrados) || 0,
            items: estado.items,
            desperdicioExtra: Number(estado.desperdicioExtra) || 0,
            descuento: Number(estado.descuento) || 0,
            entrega: estado.conEntrega
              ? {
                  ...estado.entrega,
                  km: Number(estado.entrega.km) || 0,
                }
              : null,
            pago: estado.pago,
            creadoPor: auth.sesion()?.usuarioId || null,
          });

          if (!resultado.ok) {
            evento.target.disabled = false;
            zonaError.appendChild(error(resultado.error));
            return;
          }

          estado.pedidoCreado = resultado.pedido;
          notificaciones.pedidoNuevo(resultado.pedido);

          const despiece = resultado.pedido.cotizacion.interno?.despiece;
          if (despiece) {
            const falta = faltantes(despiece);
            if (falta.length) notificaciones.faltaMaterial(resultado.pedido, falta);
          }

          montar(contenedor, ctx);
        },
        { clase: 'boton boton--principal' },
      ),
    ]),
  );
}

function resumenCompleto(estado) {
  const c = estado.cotizacion;
  const panel = div('panel');

  if (!c) {
    panel.appendChild(error('No hay una cotización válida. Vuelve al primer paso.'));
    return panel;
  }

  panel.appendChild(h(3, 'Revisa antes de registrar', 'panel__subtitulo'));

  panel.appendChild(
    filas('Pedido', [
      ['Modalidad', c.nombreModalidad],
      c.trabajo ? ['Trabajo', `${c.trabajo.nombre} — ${numero(c.trabajo.metrosCuadrados, 2)} m²`] : null,
      ['Cliente', estado.cliente.nombre],
      estado.cliente.telefono ? ['Teléfono', estado.cliente.telefono] : null,
    ]),
  );

  if (estado.conEntrega) {
    panel.appendChild(
      filas('Entrega', [
        ['Dirección', estado.entrega.direccion],
        estado.entrega.referencia ? ['Referencia', estado.entrega.referencia] : null,
        ['Fecha', fechaLarga(estado.entrega.fecha)],
        ['Hora', estado.entrega.hora],
        ['Distancia', `${numero(estado.entrega.km, 2)} km`],
      ]),
    );
  } else {
    panel.appendChild(filas('Entrega', [['Modalidad', 'Recojo en tienda']]));
  }

  const saldo = c.total - (Number(estado.pago.monto) || c.total);
  panel.appendChild(
    filas('Cuentas', [
      ['Subtotal', soles(c.subtotal)],
      c.transporte.total > 0 ? ['Transporte', soles(c.transporte.total)] : null,
      c.descuento > 0 ? ['Descuento', '-' + soles(c.descuento)] : null,
      ['Total', soles(c.total)],
      ['Pago', estado.pago.tipo === 'completo' ? 'Completo' : 'Adelanto'],
      ['Método', estado.pago.metodo === 'yape' ? 'Yape' : 'Transferencia'],
      ['Monto pagado', soles(estado.pago.tipo === 'completo' ? c.total : estado.pago.monto)],
      saldo > 0 ? ['Cobrar en la entrega', soles(saldo)] : null,
    ]),
  );

  return panel;
}

function filas(titulo, pares) {
  const caja = div('bloque');
  caja.appendChild(el('h4', { texto: titulo, clase: 'bloque__titulo' }));
  const lista = el('dl', { clase: 'resumen__lista' });
  for (const par of pares.filter(Boolean)) {
    lista.appendChild(el('dt', { texto: par[0] }));
    lista.appendChild(el('dd', { texto: par[1] }));
  }
  caja.appendChild(lista);
  return caja;
}

function pantallaCreado(estado, reiniciar) {
  const pedido = estado.pedidoCreado;
  const caja = div('panel panel--exito');

  caja.appendChild(el('span', { clase: 'panel__icono', texto: '✅' }));
  caja.appendChild(h(2, 'Pedido registrado', 'panel__titulo'));
  caja.appendChild(exito(`Código: ${pedido.codigo}`));
  caja.appendChild(
    p(
      pedido.pago.saldo > 0
        ? `Se cobra ${soles(pedido.pago.cobrarEnEntrega)} al momento de la entrega.`
        : 'El pedido está pagado por completo.',
      'destacado',
    ),
  );

  const acciones = div('cotizador__acciones');
  acciones.appendChild(
    boton('🧾 Imprimir boleta del cliente', () => {
      cola.imprimir(pedido, cola.TIPOS.CLIENTE);
    }, { clase: 'boton boton--principal' }),
  );

  if (auth.puede('boleta:admin:imprimir')) {
    acciones.appendChild(
      boton('📋 Imprimir orden interna', () => {
        cola.imprimir(pedido, cola.TIPOS.ADMIN);
      }, { clase: 'boton boton--secundario' }),
    );
  }

  acciones.appendChild(
    boton('Nuevo pedido', reiniciar, { clase: 'boton boton--fantasma' }),
  );
  acciones.appendChild(
    boton('Ver pedidos', () => router.ir('/pedidos'), { clase: 'boton boton--fantasma' }),
  );

  caja.appendChild(acciones);
  return caja;
}
