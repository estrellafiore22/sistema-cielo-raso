// Lista de pedidos y detalle de cada uno.

import { div, h, p, el, boton, tabla, insignia, seleccion } from '../componentes/dom.js';
import * as pedidosDominio from '../../dominio/pedidos.js';
import * as cola from '../../impresion/cola-impresion.js';
import * as auth from '../../core/auth.js';
import { soles, fechaCorta, fechaHora, numero } from '../../core/formato.js';
import { formularioCobro, formularioCierre } from './pedidos-acciones.js';
import { construir as construirHojaTecnica } from '../../impresion/boleta-tecnica.js';

const COLOR_ESTADO = {
  pendiente: 'neutro',
  confirmado: 'info',
  en_preparacion: 'info',
  despachado: 'alerta',
  entregado: 'exito',
  cancelado: 'peligro',
};

export function montar(contenedor) {
  let filtro = '';
  let seleccionado = null;
  let accion = null; // 'cobro' | 'cierre'
  let mensaje = null;

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Pedidos', 'vista__titulo'));

    const filtroEstado = seleccion(
      'Filtrar por estado',
      [
        { valor: '', texto: 'Todos' },
        ...Object.entries(pedidosDominio.NOMBRES_ESTADO).map(([valor, texto]) => ({
          valor,
          texto,
        })),
      ],
      {
        valor: filtro,
        alCambiar: (evento) => {
          filtro = evento.target.value;
          dibujar();
        },
      },
    );
    contenedor.appendChild(div('barra-filtros', [filtroEstado.campo]));

    const lista = pedidosDominio.listar(filtro ? { estado: filtro } : {});
    contenedor.appendChild(
      tabla(
        [
          { titulo: 'Código', celda: (p) => p.codigo },
          { titulo: 'Fecha', celda: (p) => fechaCorta(p.creadoEn) },
          { titulo: 'Cliente', celda: (p) => p.cliente.nombre },
          {
            titulo: 'Estado',
            celda: (p) => insignia(pedidosDominio.NOMBRES_ESTADO[p.estado], COLOR_ESTADO[p.estado]),
          },
          { titulo: 'Total', clase: 'col-num', celda: (p) => soles(p.cotizacion.total) },
          {
            titulo: 'Saldo',
            clase: 'col-num',
            celda: (p) => (p.pago.saldo > 0 ? soles(p.pago.saldo) : '—'),
          },
          {
            titulo: '',
            clase: 'col-accion',
            celda: (p) =>
              boton('Ver', () => {
                seleccionado = p.id;
                dibujar();
              }, { clase: 'boton boton--fantasma boton--pequeno' }),
          },
        ],
        lista,
        { vacio: 'Todavía no hay pedidos.' },
      ),
    );

    if (mensaje) {
      contenedor.appendChild(p(mensaje, 'mensaje-exito'));
      mensaje = null;
    }

    if (!seleccionado) return;
    const pedido = pedidosDominio.obtener(seleccionado);
    if (!pedido) return;

    const cerrarFicha = () => {
      seleccionado = null;
      accion = null;
      dibujar();
    };

    const abrir = (cual) => {
      accion = accion === cual ? null : cual;
      dibujar();
    };

    const terminar = (texto) => {
      accion = null;
      mensaje = texto;
      dibujar();
    };

    contenedor.appendChild(detalle(pedido, dibujar, cerrarFicha, abrir));

    if (accion === 'cobro') {
      contenedor.appendChild(formularioCobro(pedido, terminar));
    } else if (accion === 'cierre') {
      contenedor.appendChild(formularioCierre(pedido, terminar));
    }
  }

  dibujar();
}

function detalle(pedido, refrescar, cerrar, abrir) {
  const caja = div('panel panel--detalle');
  caja.appendChild(
    div('panel__cabecera', [
      h(3, `Pedido ${pedido.codigo}`, 'panel__titulo'),
      boton('✕', cerrar, { clase: 'boton boton--fantasma boton--pequeno' }),
    ]),
  );

  const c = pedido.cotizacion;
  caja.appendChild(
    listaDatos([
      ['Cliente', pedido.cliente.nombre],
      pedido.cliente.telefono ? ['Teléfono', pedido.cliente.telefono] : null,
      ['Registrado', fechaHora(pedido.creadoEn)],
      ['Modalidad', c.nombreModalidad],
      c.trabajo ? ['Trabajo', `${c.trabajo.nombre} — ${numero(c.trabajo.metrosCuadrados, 2)} m²`] : null,
      ['Estado', pedidosDominio.NOMBRES_ESTADO[pedido.estado]],
    ]),
  );

  if (!pedido.entrega.recogeEnTienda) {
    caja.appendChild(el('h4', { texto: 'Entrega', clase: 'bloque__titulo' }));
    caja.appendChild(
      listaDatos([
        ['Dirección', pedido.entrega.direccion],
        pedido.entrega.referencia ? ['Referencia', pedido.entrega.referencia] : null,
        ['Fecha', fechaCorta(pedido.entrega.fecha)],
        ['Hora', pedido.entrega.hora],
        ['Distancia', `${numero(pedido.entrega.km, 2)} km`],
        ['Transporte', soles(c.transporte.total)],
      ]),
    );
  }

  caja.appendChild(el('h4', { texto: 'Cuentas', clase: 'bloque__titulo' }));
  caja.appendChild(
    listaDatos([
      ['Total', soles(c.total)],
      ['Pagado', soles(pedido.pago.pagado)],
      ['Saldo', soles(pedido.pago.saldo)],
      ['Método', pedido.pago.nombreMetodo],
      ['N° operación', pedido.pago.operacion],
    ]),
  );

  // Despiece, solo para administradores
  if (auth.puede('boleta:admin:imprimir') && c.interno?.despiece) {
    caja.appendChild(el('h4', { texto: 'Material a llevar', clase: 'bloque__titulo' }));
    caja.appendChild(
      tabla(
        [
          { titulo: 'Material', celda: (l) => l.nombre },
          { titulo: 'Necesario', clase: 'col-num', celda: (l) => `${numero(l.necesario, 2)} ${l.unidad}` },
          { titulo: 'Retornos', clase: 'col-num col-retorno', celda: (l) => (l.deRetornos > 0 ? numero(l.deRetornos, 2) : '—') },
          { titulo: 'Almacén', clase: 'col-num', celda: (l) => (l.deAlmacen > 0 ? numero(l.deAlmacen, 2) : '—') },
          { titulo: 'Falta', clase: 'col-num col-falta', celda: (l) => (l.faltante > 0 ? numero(l.faltante, 2) : '—') },
        ],
        c.interno.despiece.lineas,
      ),
    );
  }

  caja.appendChild(acciones(pedido, refrescar, abrir));
  return caja;
}

function acciones(pedido, refrescar, abrir) {
  const caja = div('cotizador__acciones');

  // Cobrar el saldo: mientras quede algo por cobrar y el pedido siga vivo.
  if (
    auth.puede('pedido:estado:cambiar') &&
    pedido.estado !== 'cancelado' &&
    (Number(pedido.pago?.saldo) || 0) > 0
  ) {
    caja.appendChild(
      boton(`💵 Cobrar ${soles(pedido.pago.saldo)}`, () => abrir('cobro'), {
        clase: 'boton boton--principal boton--pequeno',
      }),
    );
  }

  // Cerrar la obra: solo tiene sentido cuando el material ya salió.
  if (auth.puede('retorno:registrar') && pedido.estado === 'despachado') {
    caja.appendChild(
      boton('📦 Cerrar obra y registrar retornos', () => abrir('cierre'), {
        clase: 'boton boton--secundario boton--pequeno',
      }),
    );
  }

  caja.appendChild(
    boton('🧾 Boleta del cliente', () => cola.imprimir(pedido, cola.TIPOS.CLIENTE), {
      clase: 'boton boton--secundario boton--pequeno',
    }),
  );

  if (auth.puede('boleta:admin:imprimir')) {
    caja.appendChild(
      boton('📋 Orden interna', () => cola.imprimir(pedido, cola.TIPOS.ADMIN), {
        clase: 'boton boton--secundario boton--pequeno',
      }),
    );
  }

  // Los pedidos de cielo raso 61 × 61 llevan además la hoja de obra, con el
  // plano, los cortes y los sobrantes.
  const suspendido = pedido.cotizacion?.interno?.suspendido;
  if (suspendido && auth.puede('boleta:admin:imprimir')) {
    caja.appendChild(
      boton('📐 Hoja técnica 61×61', () => {
        cola.imprimirNodo(
          construirHojaTecnica(suspendido, {
            cliente: pedido.cliente.nombre,
            direccion: pedido.entrega?.direccion || '',
          }),
        );
      }, { clase: 'boton boton--secundario boton--pequeno' }),
    );
  }

  if (auth.puede('pedido:estado:cambiar')) {
    for (const siguiente of siguientesEstados(pedido.estado)) {
      caja.appendChild(
        boton(
          `→ ${pedidosDominio.NOMBRES_ESTADO[siguiente]}`,
          () => {
            const resultado = pedidosDominio.cambiarEstado(pedido.id, siguiente);
            if (!resultado.ok) alert(resultado.error);
            refrescar();
          },
          { clase: 'boton boton--pequeno' },
        ),
      );
    }
  }

  return caja;
}

function siguientesEstados(estado) {
  const mapa = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['en_preparacion', 'cancelado'],
    en_preparacion: ['despachado', 'cancelado'],
    // De despachado a entregado se pasa desde "Cerrar obra", que además
    // registra el material que volvió. Si no, se cerraría sin devolver nada.
    despachado: [],
    entregado: [],
    cancelado: [],
  };
  return mapa[estado] || [];
}

function listaDatos(pares) {
  const lista = el('dl', { clase: 'resumen__lista' });
  for (const par of pares.filter(Boolean)) {
    lista.appendChild(el('dt', { texto: par[0] }));
    lista.appendChild(el('dd', { texto: par[1] }));
  }
  return lista;
}
