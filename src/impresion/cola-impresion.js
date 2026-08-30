// Impresión y cola de pendientes.
//
// LÍMITE REAL DEL NAVEGADOR, dicho sin rodeos: una página web NO puede saber si
// hay una impresora conectada, ni imprimir sin que alguien confirme el diálogo.
// No existe una API para eso; los navegadores lo bloquean a propósito.
//
// Lo que sí se puede hacer, y es lo que hace este archivo:
//   · Al emitir una boleta se abre el diálogo de impresión automáticamente.
//   · Se anota qué boletas SÍ salieron. Todo pedido vivo cuya boleta no está
//     anotada cuenta como pendiente, se haya intentado imprimir o no.
//   · Esa cuenta sobrevive al cierre del navegador.
//   · Al volver a abrir el sistema, avisa cuántas hay pendientes y las imprime
//     todas seguidas con un clic.
//
// Para impresión 100 % automática y sin diálogo haría falta un pequeño programa
// instalado en la PC de la tienda. Está anotado en docs/pendientes.md.

import * as bd from '../core/bd.js';
import { registrar } from '../core/errores.js';
import { construir as construirCliente } from './recibo-cliente.js';
import { construir as construirAdmin } from './recibo-admin.js';
import * as notificaciones from '../integraciones/notificaciones.js';

const CONTENEDOR_ID = 'area-impresion';

export const TIPOS = { CLIENTE: 'cliente', ADMIN: 'admin' };

/**
 * Imprime una boleta ahora. Si falla o se cancela, la deja en cola.
 * @returns {{ok:boolean, encolado:boolean}}
 */
export function imprimir(pedido, tipo = TIPOS.CLIENTE, { encolarSiFalla = true } = {}) {
  try {
    pintar(pedido, tipo);
    window.print();
    marcarImpreso(pedido.id, tipo);
    return { ok: true, encolado: false };
  } catch (error) {
    registrar('impresion.imprimir', error, { pedido: pedido.codigo, tipo });
    if (encolarSiFalla) {
      encolar(pedido.id, tipo);
      return { ok: false, encolado: true };
    }
    return { ok: false, encolado: false };
  } finally {
    limpiar();
  }
}

/**
 * Imprime un nodo cualquiera. Lo usan las hojas que no salen de un pedido,
 * como la hoja técnica del cielo raso suspendido.
 */
export function imprimirNodo(nodo) {
  try {
    const contenedor = area();
    contenedor.replaceChildren(nodo);
    window.print();
    return { ok: true };
  } catch (error) {
    registrar('impresion.imprimirNodo', error);
    return { ok: false, error: 'No se pudo abrir el diálogo de impresión' };
  } finally {
    limpiar();
  }
}

/** Deja la boleta lista en el área de impresión sin lanzar el diálogo. */
function pintar(pedido, tipo) {
  const contenedor = area();
  contenedor.replaceChildren();
  const hoja =
    tipo === TIPOS.ADMIN ? construirAdmin(pedido) : construirCliente(pedido);
  contenedor.appendChild(hoja);
}

function limpiar() {
  const contenedor = document.getElementById(CONTENEDOR_ID);
  if (contenedor) contenedor.replaceChildren();
}

function area() {
  let contenedor = document.getElementById(CONTENEDOR_ID);
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = CONTENEDOR_ID;
    contenedor.className = 'area-impresion';
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

// --- Cola -------------------------------------------------------------------

export function encolar(pedidoId, tipo) {
  if (estaImpresa(pedidoId, tipo)) return null;
  return anotar(pedidoId, tipo, { estado: 'pendiente' });
}

/**
 * Boletas que todavía no salieron por impresora.
 *
 * OJO: no se calcula sobre lo que alguien encoló, sino sobre lo que FALTA. Un
 * pedido cuya boleta nunca se mandó a imprimir no dejó ninguna fila en la cola,
 * y antes por eso el contador decía 0 aunque hubiera boletas sin imprimir. Aquí
 * se recorren los pedidos vivos y se descuenta lo que ya está impreso o lo que
 * el dueño descartó a mano.
 */
export function pendientes() {
  const filas = bd.todos('colaImpresion');
  const registro = (pedidoId, tipo) =>
    filas.find((t) => t.pedido === pedidoId && t.tipo === tipo);

  const salida = [];
  for (const pedido of bd.todos('pedidos')) {
    // Un pedido cancelado no se imprime.
    if (pedido.estado === 'cancelado') continue;

    for (const tipo of [TIPOS.CLIENTE, TIPOS.ADMIN]) {
      const fila = registro(pedido.id, tipo);
      if (fila && fila.estado !== 'pendiente') continue;
      salida.push({
        id: fila?.id || null,
        pedido: pedido.id,
        codigo: pedido.codigo,
        tipo,
        intentos: Number(fila?.intentos) || 0,
        encoladoEn: fila?.encoladoEn || pedido.creadoEn,
      });
    }
  }

  return salida.sort((a, b) => String(a.encoladoEn).localeCompare(String(b.encoladoEn)));
}

export function totalPendientes() {
  return pendientes().length;
}

/** Boletas sin imprimir de un pedido concreto. */
export function pendientesDe(pedidoId) {
  return pendientes().filter((t) => t.pedido === pedidoId);
}

export function estaImpresa(pedidoId, tipo) {
  return anotacion(pedidoId, tipo)?.estado === 'impreso';
}

function anotacion(pedidoId, tipo) {
  return bd.todos('colaImpresion').find((t) => t.pedido === pedidoId && t.tipo === tipo);
}

/** Deja anotado el estado de una boleta, exista o no la fila. */
function anotar(pedidoId, tipo, cambios) {
  const fila = anotacion(pedidoId, tipo);
  if (fila) return bd.actualizar('colaImpresion', fila.id, cambios);
  return bd.insertar('colaImpresion', {
    pedido: pedidoId,
    tipo,
    intentos: 0,
    encoladoEn: new Date().toISOString(),
    ...cambios,
  });
}

function marcarImpreso(pedidoId, tipo) {
  anotar(pedidoId, tipo, { estado: 'impreso', impresoEn: new Date().toISOString() });
}

/** El dueño decide que esa boleta no hace falta. Deja de contar. */
export function descartar(pedidoId, tipo) {
  return anotar(pedidoId, tipo, { estado: 'descartado' });
}

/** Vuelve a contar como pendiente lo que se descartó. */
export function limpiarCola() {
  const vivas = bd.todos('colaImpresion').filter((t) => t.estado === 'impreso');
  bd.reemplazar('colaImpresion', vivas);
}

/**
 * Imprime todas las pendientes, una tras otra.
 *
 * Van con pausa entre cada una porque el navegador ignora un `print()` mientras
 * el diálogo anterior sigue abierto; sin la pausa solo saldría la primera.
 */
export async function imprimirPendientes({ pausaMs = 1200 } = {}) {
  const cola = pendientes();
  if (cola.length === 0) return { ok: true, impresas: 0 };

  let impresas = 0;
  let fallidas = 0;

  for (const trabajo of cola) {
    const pedido = bd.buscarPorId('pedidos', trabajo.pedido);
    if (!pedido) continue;

    anotar(trabajo.pedido, trabajo.tipo, {
      estado: 'pendiente',
      intentos: (Number(trabajo.intentos) || 0) + 1,
    });

    const resultado = imprimir(pedido, trabajo.tipo, { encolarSiFalla: false });
    if (resultado.ok) impresas += 1;
    else fallidas += 1;

    await esperar(pausaMs);
  }

  return { ok: fallidas === 0, impresas, fallidas };
}

/**
 * Se llama al arrancar el sistema. Si quedaron boletas sin imprimir de la
 * sesión anterior, avisa. No imprime solo: hacerlo sin que el usuario lo pida
 * abriría diálogos de impresión de la nada.
 */
export function revisarAlArrancar() {
  const cantidad = totalPendientes();
  if (cantidad > 0) notificaciones.impresionPendiente(cantidad);
  return cantidad;
}

/**
 * Emite las dos boletas de un pedido: la del cliente y la interna.
 *
 * La interna no se lanza al toque porque el navegador solo abre un diálogo de
 * impresión a la vez. Queda pendiente y sale desde Inicio o desde el pedido.
 */
export function emitirAmbas(pedido) {
  const cliente = imprimir(pedido, TIPOS.CLIENTE);
  return { cliente, adminEnCola: !estaImpresa(pedido.id, TIPOS.ADMIN) };
}

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
