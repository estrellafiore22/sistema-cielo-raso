// Pedidos: el objeto que amarra cotización, entrega, pago y calendario.
//
// Un pedido guarda una COPIA de su cotización. Si mañana cambian los precios o
// las recetas, las boletas ya emitidas siguen diciendo lo mismo que el día que
// se cobraron. Eso no es opcional en un negocio.

import * as bd from '../core/bd.js';
import * as pagos from './pagos.js';
import * as calendario from './calendario.js';
import * as transporte from './transporte.js';
import { cotizar } from './precios.js';
import { descontarDelInventario } from './despiece.js';
import { nuevoCodigo } from '../core/formato.js';
import { emitir } from '../core/bus.js';

export const ESTADOS = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
  EN_PREPARACION: 'en_preparacion',
  DESPACHADO: 'despachado',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
};

export const NOMBRES_ESTADO = {
  [ESTADOS.PENDIENTE]: 'Pendiente',
  [ESTADOS.CONFIRMADO]: 'Confirmado',
  [ESTADOS.EN_PREPARACION]: 'En preparación',
  [ESTADOS.DESPACHADO]: 'Despachado',
  [ESTADOS.ENTREGADO]: 'Entregado',
  [ESTADOS.CANCELADO]: 'Cancelado',
};

/**
 * Crea un pedido completo. Falla entero si algo no cuadra: no deja pedidos a
 * medias.
 *
 * @param {object} datos
 *   - cliente: {nombre, telefono, documento}
 *   - modalidad, recetaId, metrosCuadrados, items, desperdicioExtra, descuento
 *   - entrega: {direccion, referencia, fecha, hora, km, idaYVuelta, recargo}
 *     o null si recoge en tienda
 *   - pago: {tipo, monto, metodo, operacion}
 */
export function crear(datos) {
  if (!String(datos.cliente?.nombre || '').trim()) {
    return { ok: false, error: 'El nombre del cliente es obligatorio' };
  }
  if (!String(datos.cliente?.telefono || '').trim()) {
    return { ok: false, error: 'El teléfono del cliente es obligatorio' };
  }
  if (datos.cliente?.factura && !String(datos.cliente?.documento || '').trim()) {
    return { ok: false, error: 'Para emitir factura hace falta el RUC' };
  }

  const conEntrega = Boolean(datos.entrega);
  if (conEntrega) {
    const validacion = transporte.validarEntrega(datos.entrega);
    if (!validacion.ok) return validacion;
  }

  // 1. Cotizar
  const resultado = cotizar({
    modalidad: datos.modalidad,
    recetaId: datos.recetaId,
    metrosCuadrados: datos.metrosCuadrados,
    items: datos.items,
    suspendido: datos.suspendido,
    promocion: datos.promocion,
    desperdicioExtra: datos.desperdicioExtra,
    descuento: datos.descuento,
    transporte: conEntrega
      ? {
          km: datos.entrega.km,
          idaYVuelta: datos.entrega.idaYVuelta,
          recargo: datos.entrega.recargo,
        }
      : null,
  });
  if (!resultado.ok) return resultado;
  const cotizacion = resultado.cotizacion;

  // 2. Validar el pago contra el total ya calculado
  const validacionPago = pagos.validar({
    total: cotizacion.total,
    tipo: datos.pago?.tipo,
    monto: datos.pago?.monto,
    metodo: datos.pago?.metodo,
    operacion: datos.pago?.operacion,
    comprobante: datos.pago?.comprobante,
  });
  if (!validacionPago.ok) return validacionPago;

  // 3. Confirmar que el día elegido sigue disponible
  if (conEntrega) {
    // Reserva equipo cualquier venta que incluya instalación.
    const requiereEquipo = datos.modalidad === 'con_mano_obra';
    const dia = calendario.disponibleParaPedido(datos.entrega.fecha, {
      requiereEquipo,
      // Con los m² y el tipo de trabajo, el calendario sabe si ese día
      // todavía tiene jornada libre, no solo si sobra gente.
      recetaId: cotizacion.trabajo?.id || null,
      metrosCuadrados: cotizacion.trabajo?.metrosCuadrados || 0,
    });
    if (!dia.disponible) {
      return { ok: false, error: `No se puede entregar ese día: ${dia.motivo}` };
    }
  }

  // 4. Guardar
  const pedido = bd.insertar('pedidos', {
    codigo: nuevoCodigo('PED'),
    estado: ESTADOS.PENDIENTE,
    cliente: {
      nombre: String(datos.cliente.nombre).trim(),
      telefono: String(datos.cliente.telefono).trim(),
      documento: String(datos.cliente.documento || '').trim(),
      // Con factura hace falta el RUC; con boleta, ni el documento.
      factura: Boolean(datos.cliente.factura),
    },
    cotizacion,
    entrega: conEntrega
      ? {
          direccion: String(datos.entrega.direccion).trim(),
          referencia: String(datos.entrega.referencia || '').trim(),
          fecha: datos.entrega.fecha,
          hora: datos.entrega.hora,
          km: Number(datos.entrega.km) || 0,
          coordenadas: datos.entrega.coordenadas || null,
        }
      : { recogeEnTienda: true },
    pago: validacionPago.pago,
    // Se guardan los datos de entrada del cielo raso suspendido para poder
    // reimprimir la hoja técnica tal como se cotizó.
    suspendido: datos.suspendido || null,
    creadoPor: datos.creadoPor || null,
  });

  pagos.registrar(pedido.id, validacionPago.pago);
  emitir('pedido:creado', pedido);
  return { ok: true, pedido };
}

// --- Consulta ---------------------------------------------------------------

export function listar({ estado = null, desde = null, hasta = null } = {}) {
  let lista = bd.todos('pedidos');
  if (estado) lista = lista.filter((p) => p.estado === estado);
  if (desde) lista = lista.filter((p) => p.creadoEn >= desde);
  if (hasta) lista = lista.filter((p) => p.creadoEn <= hasta);
  return lista.sort((a, b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));
}

export function obtener(id) {
  return bd.buscarPorId('pedidos', id);
}

export function porCodigo(codigo) {
  return bd.todos('pedidos').find((p) => p.codigo === codigo) || null;
}

/** Pedidos de un día, para el calendario. */
export function delDia(dia) {
  return bd.todos('pedidos').filter((p) => p.entrega?.fecha === dia);
}

/**
 * Pedidos que todavía dan trabajo: ni entregados ni cancelados. Es lo que el
 * dueño llama "pedidos que no ha recogido el cliente".
 */
export function activos() {
  return listar().filter(
    (p) => p.estado !== ESTADOS.ENTREGADO && p.estado !== ESTADOS.CANCELADO,
  );
}

export function pendientesDeCobro() {
  return listar().filter(
    (p) => p.estado !== ESTADOS.CANCELADO && (Number(p.pago?.saldo) || 0) > 0,
  );
}

// --- Cambios de estado ------------------------------------------------------

const TRANSICIONES = {
  [ESTADOS.PENDIENTE]: [ESTADOS.CONFIRMADO, ESTADOS.CANCELADO],
  [ESTADOS.CONFIRMADO]: [ESTADOS.EN_PREPARACION, ESTADOS.CANCELADO],
  [ESTADOS.EN_PREPARACION]: [ESTADOS.DESPACHADO, ESTADOS.CANCELADO],
  [ESTADOS.DESPACHADO]: [ESTADOS.ENTREGADO],
  [ESTADOS.ENTREGADO]: [],
  [ESTADOS.CANCELADO]: [],
};

export function cambiarEstado(pedidoId, nuevoEstado) {
  const pedido = obtener(pedidoId);
  if (!pedido) return { ok: false, error: 'El pedido no existe' };

  const permitidos = TRANSICIONES[pedido.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    return {
      ok: false,
      error: `No se puede pasar de "${NOMBRES_ESTADO[pedido.estado]}" a "${
        NOMBRES_ESTADO[nuevoEstado]
      }"`,
    };
  }

  // Al despachar se descuenta el material del inventario de verdad.
  if (nuevoEstado === ESTADOS.DESPACHADO) {
    const despiece = pedido.cotizacion?.interno?.despiece;
    if (despiece) descontarDelInventario(despiece, pedido.codigo);
  }

  // Al cancelar se libera el personal reservado.
  if (nuevoEstado === ESTADOS.CANCELADO) {
    calendario.liberarPedido(pedidoId);
  }

  const actualizado = bd.actualizar('pedidos', pedidoId, {
    estado: nuevoEstado,
    [`fecha_${nuevoEstado}`]: new Date().toISOString(),
  });
  emitir('pedido:estado', actualizado);
  return { ok: true, pedido: actualizado };
}

/**
 * Cierra un trabajo con mano de obra: lo marca entregado y deja registrado el
 * material que sobró, que vuelve al inventario de retornos.
 * `sobrantes`: [{material, cantidad, condicion, nota}]
 */
export function cerrarConRetornos(pedidoId, sobrantes = []) {
  const pedido = obtener(pedidoId);
  if (!pedido) return { ok: false, error: 'El pedido no existe' };

  const cambio = cambiarEstado(pedidoId, ESTADOS.ENTREGADO);
  if (!cambio.ok) return cambio;

  // Importación diferida: inventario no necesita conocer pedidos.
  return import('./inventario.js').then((inventario) => {
    const registrados = [];
    for (const sobrante of sobrantes) {
      const r = inventario.registrarRetorno({
        material: sobrante.material,
        cantidad: sobrante.cantidad,
        pedidoOrigen: pedido.codigo,
        condicion: sobrante.condicion || 'usado',
        nota: sobrante.nota || '',
      });
      if (r.ok) registrados.push(r.retorno);
    }
    calendario.liberarPedido(pedidoId);
    return { ok: true, pedido: cambio.pedido, retornos: registrados };
  });
}
