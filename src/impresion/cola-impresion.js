// Impresión y cola de pendientes.
//
// LÍMITE REAL DEL NAVEGADOR, dicho sin rodeos: una página web NO puede saber si
// hay una impresora conectada, ni imprimir sin que alguien confirme el diálogo.
// No existe una API para eso; los navegadores lo bloquean a propósito.
//
// Lo que sí se puede hacer, y es lo que hace este archivo:
//   · Al emitir una boleta se abre el diálogo de impresión automáticamente.
//   · Si nadie la imprime (se cancela, no hay impresora, se cerró la ventana),
//     la boleta queda EN COLA, guardada.
//   · La cola sobrevive al cierre del navegador.
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
  const yaEsta = bd
    .todos('colaImpresion')
    .some((t) => t.pedido === pedidoId && t.tipo === tipo && t.estado === 'pendiente');
  if (yaEsta) return null;

  const trabajo = bd.insertar('colaImpresion', {
    pedido: pedidoId,
    tipo,
    estado: 'pendiente',
    intentos: 0,
    encoladoEn: new Date().toISOString(),
  });
  return trabajo;
}

export function pendientes() {
  return bd
    .todos('colaImpresion')
    .filter((t) => t.estado === 'pendiente')
    .sort((a, b) => String(a.encoladoEn).localeCompare(String(b.encoladoEn)));
}

export function totalPendientes() {
  return pendientes().length;
}

function marcarImpreso(pedidoId, tipo) {
  for (const trabajo of pendientes()) {
    if (trabajo.pedido === pedidoId && trabajo.tipo === tipo) {
      bd.actualizar('colaImpresion', trabajo.id, {
        estado: 'impreso',
        impresoEn: new Date().toISOString(),
      });
    }
  }
}

export function descartar(trabajoId) {
  return bd.actualizar('colaImpresion', trabajoId, { estado: 'descartado' });
}

export function limpiarCola() {
  const vivos = bd.todos('colaImpresion').filter((t) => t.estado === 'pendiente');
  bd.reemplazar('colaImpresion', vivos);
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
    if (!pedido) {
      descartar(trabajo.id);
      continue;
    }

    bd.actualizar('colaImpresion', trabajo.id, {
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

/** Emite las dos boletas de un pedido: la del cliente y la interna. */
export function emitirAmbas(pedido) {
  const cliente = imprimir(pedido, TIPOS.CLIENTE);
  encolar(pedido.id, TIPOS.ADMIN);
  return { cliente, adminEnCola: true };
}

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
