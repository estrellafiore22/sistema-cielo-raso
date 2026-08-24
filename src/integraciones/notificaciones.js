// Avisos importantes.
//
// Intenta usar las notificaciones del sistema operativo (las que salen en la
// esquina de la pantalla aunque el navegador esté minimizado). Si el usuario no
// dio permiso, cae a un aviso dentro de la página. Nunca deja al usuario sin
// enterarse.

import { registrar } from '../core/errores.js';

const SOPORTADO = typeof Notification !== 'undefined';

export function estadoPermiso() {
  if (!SOPORTADO) return 'no_soportado';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/** Se llama desde un botón: los navegadores exigen gesto del usuario. */
export async function pedirPermiso() {
  if (!SOPORTADO) {
    return { ok: false, error: 'Este navegador no soporta notificaciones' };
  }
  if (Notification.permission === 'granted') return { ok: true };
  if (Notification.permission === 'denied') {
    return {
      ok: false,
      error:
        'Las notificaciones están bloqueadas. Habilítalas en el candado de la barra de direcciones.',
    };
  }
  try {
    const permiso = await Notification.requestPermission();
    return permiso === 'granted'
      ? { ok: true }
      : { ok: false, error: 'No se concedió el permiso' };
  } catch (error) {
    registrar('notificaciones.pedirPermiso', error);
    return { ok: false, error: 'No se pudo pedir el permiso' };
  }
}

/**
 * Lanza un aviso importante.
 * @param {string} titulo
 * @param {string} cuerpo
 * @param {object} opciones - {urgente: true} mantiene el aviso hasta que se cierre
 */
export function avisar(titulo, cuerpo, opciones = {}) {
  const mostrado = avisarSistema(titulo, cuerpo, opciones);
  // El aviso en pantalla se muestra siempre: si la ventana está abierta, el
  // usuario lo ve ahí aunque el del sistema también haya salido.
  avisarEnPagina(titulo, cuerpo, opciones);
  return mostrado;
}

function avisarSistema(titulo, cuerpo, opciones) {
  if (!SOPORTADO || Notification.permission !== 'granted') return false;
  try {
    const notificacion = new Notification(titulo, {
      body: cuerpo,
      tag: opciones.tag || undefined,
      requireInteraction: Boolean(opciones.urgente),
      icon: opciones.icono || undefined,
    });
    notificacion.onclick = () => {
      window.focus();
      notificacion.close();
      if (typeof opciones.alHacerClic === 'function') opciones.alHacerClic();
    };
    return true;
  } catch (error) {
    registrar('notificaciones.avisarSistema', error);
    return false;
  }
}

function avisarEnPagina(titulo, cuerpo, opciones) {
  try {
    let contenedor = document.getElementById('avisos');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'avisos';
      contenedor.className = 'avisos';
      document.body.appendChild(contenedor);
    }

    const aviso = document.createElement('div');
    aviso.className = `aviso aviso--${opciones.tipo || 'info'}`;
    if (opciones.urgente) aviso.classList.add('aviso--urgente');

    const encabezado = document.createElement('strong');
    encabezado.className = 'aviso__titulo';
    encabezado.textContent = titulo;

    const texto = document.createElement('p');
    texto.className = 'aviso__cuerpo';
    texto.textContent = cuerpo;

    const cerrar = document.createElement('button');
    cerrar.className = 'aviso__cerrar';
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar aviso');
    cerrar.textContent = '×';
    cerrar.onclick = () => aviso.remove();

    aviso.append(encabezado, texto, cerrar);
    contenedor.appendChild(aviso);

    if (!opciones.urgente) setTimeout(() => aviso.remove(), 8000);
  } catch (error) {
    registrar('notificaciones.avisarEnPagina', error);
  }
}

// --- Avisos concretos del negocio -------------------------------------------

export function pedidoNuevo(pedido) {
  avisar(
    '🧾 Pedido nuevo',
    `${pedido.codigo} — ${pedido.cliente.nombre}. ` +
      `Adelanto recibido: S/ ${pedido.pago.pagado}.`,
    { urgente: true, tipo: 'exito', tag: 'pedido-' + pedido.codigo },
  );
}

export function stockBajo(filas) {
  if (!filas.length) return;
  const nombres = filas.slice(0, 3).map((f) => f.material.nombre).join(', ');
  const resto = filas.length > 3 ? ` y ${filas.length - 3} más` : '';
  avisar('📦 Stock bajo', `${nombres}${resto}.`, { tipo: 'alerta' });
}

export function faltaMaterial(pedido, faltantes) {
  avisar(
    '⚠️ Falta material para despachar',
    `${pedido.codigo}: ${faltantes.length} material(es) por comprar antes de salir.`,
    { urgente: true, tipo: 'alerta' },
  );
}

export function impresionPendiente(cantidad) {
  avisar(
    '🖨️ Impresiones en espera',
    `Hay ${cantidad} boleta(s) esperando impresora. Se imprimirán al conectarla.`,
    { tipo: 'info' },
  );
}
