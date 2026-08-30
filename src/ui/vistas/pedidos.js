// Lista de pedidos. La ficha de cada uno vive en pedidos-detalle.js.

import { div, h, p, boton, tabla, insignia, seleccion } from '../componentes/dom.js';
import * as pedidosDominio from '../../dominio/pedidos.js';
import * as cola from '../../impresion/cola-impresion.js';
import { soles, fechaCorta } from '../../core/formato.js';
import { formularioCobro, formularioCierre } from './pedidos-acciones.js';
import { detalle } from './pedidos-detalle.js';

const COLOR_ESTADO = {
  pendiente: 'neutro',
  confirmado: 'info',
  en_preparacion: 'info',
  despachado: 'alerta',
  entregado: 'exito',
  cancelado: 'peligro',
};

// Además de los estados sueltos, dos filtros que responden a preguntas del
// dueño: "¿qué pedidos siguen abiertos?" y "¿a quién le falta cobrarle?".
const FILTROS = {
  activos: { texto: 'Activos (sin entregar)', lista: () => pedidosDominio.activos() },
  por_cobrar: { texto: 'Con saldo por cobrar', lista: () => pedidosDominio.pendientesDeCobro() },
};

export function montar(contenedor, parametros = {}) {
  let filtro = parametros.estado || '';
  let seleccionado = null;
  let accion = null; // 'cobro' | 'cierre'
  let mensaje = null;

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Pedidos', 'vista__titulo'));

    const filtroEstado = seleccion(
      'Filtrar',
      [
        { valor: '', texto: 'Todos' },
        ...Object.entries(FILTROS).map(([valor, f]) => ({ valor, texto: f.texto })),
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
    contenedor.appendChild(
      listado(
        lista(filtro),
        (p) => {
          seleccionado = p.id;
          dibujar();
        },
        dibujar,
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

function lista(filtro) {
  if (FILTROS[filtro]) return FILTROS[filtro].lista();
  return pedidosDominio.listar(filtro ? { estado: filtro } : {});
}

function listado(filas, alVer, refrescar) {
  return tabla(
    [
      { titulo: 'Código', celda: (p) => p.codigo },
      { titulo: 'Fecha', celda: (p) => fechaCorta(p.creadoEn) },
      { titulo: 'Cliente', celda: (p) => p.cliente.nombre },
      { titulo: 'Teléfono', celda: (p) => p.cliente.telefono || '—' },
      {
        titulo: 'Comprobante',
        celda: (p) =>
          p.cliente.factura ? insignia('factura', 'alerta') : insignia('boleta', 'neutro'),
      },
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
      { titulo: 'Boletas', clase: 'col-accion', celda: (p) => impresion(p, refrescar) },
      {
        titulo: '',
        clase: 'col-accion',
        celda: (p) =>
          boton('Ver', () => alVer(p), { clase: 'boton boton--fantasma boton--pequeno' }),
      },
    ],
    filas,
    { vacio: 'No hay pedidos que mostrar con ese filtro.' },
  );
}

/** Botones para sacar desde aquí mismo las boletas que le falten al pedido. */
function impresion(pedido, refrescar) {
  const faltan = cola.pendientesDe(pedido.id);
  if (faltan.length === 0) return insignia('impresas', 'exito');

  const caja = div('celda-acciones');
  for (const trabajo of faltan) {
    const nombre = trabajo.tipo === cola.TIPOS.ADMIN ? '📋 Interna' : '🧾 Cliente';
    caja.appendChild(
      boton(nombre, () => {
        cola.imprimir(pedido, trabajo.tipo);
        refrescar();
      }, { clase: 'boton boton--secundario boton--pequeno' }),
    );
  }
  return caja;
}
