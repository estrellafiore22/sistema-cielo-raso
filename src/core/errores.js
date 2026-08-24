// Captura global de errores. El objetivo es que la aplicación nunca se quede
// en pantalla blanca: si algo revienta, se registra, se avisa y se sigue.

const REGISTRO_MAX = 200;
const registro = [];

/** Guarda un error en el registro en memoria y en consola. */
export function registrar(origen, error, extra) {
  const entrada = {
    fecha: new Date().toISOString(),
    origen,
    mensaje: error && error.message ? error.message : String(error),
    pila: error && error.stack ? error.stack : null,
    extra: extra ?? null,
  };
  registro.push(entrada);
  if (registro.length > REGISTRO_MAX) registro.shift();
  console.error(`[${origen}]`, error, extra ?? '');
  return entrada;
}

export function historial() {
  return registro.slice();
}

export function limpiarHistorial() {
  registro.length = 0;
}

/**
 * Envuelve una función para que nunca propague una excepción.
 * Si falla, registra el error y devuelve `respaldo`.
 */
export function protegido(fn, origen, respaldo = null) {
  return function (...args) {
    try {
      const salida = fn.apply(this, args);
      // Si devuelve una promesa, también hay que atraparla.
      if (salida && typeof salida.then === 'function') {
        return salida.catch((error) => {
          registrar(origen, error, { args });
          return respaldo;
        });
      }
      return salida;
    } catch (error) {
      registrar(origen, error, { args });
      return respaldo;
    }
  };
}

/** Muestra un aviso flotante de error sin depender del resto de la interfaz. */
export function avisarEnPantalla(mensaje) {
  try {
    let caja = document.getElementById('aviso-error-global');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'aviso-error-global';
      caja.className = 'aviso-error-global';
      document.body.appendChild(caja);
    }
    const linea = document.createElement('div');
    linea.className = 'aviso-error-global__linea';
    linea.textContent = mensaje;
    caja.appendChild(linea);
    setTimeout(() => linea.remove(), 12000);
  } catch (error) {
    // Si ni siquiera esto funciona, no queda nada más que hacer.
    console.error('No se pudo mostrar el aviso de error', error);
  }
}

/** Instala los manejadores globales. Se llama una sola vez al arrancar. */
export function instalar() {
  window.addEventListener('error', (evento) => {
    registrar('window.error', evento.error || evento.message, {
      archivo: evento.filename,
      linea: evento.lineno,
    });
    avisarEnPantalla('Ocurrió un error interno. El sistema sigue funcionando.');
  });

  window.addEventListener('unhandledrejection', (evento) => {
    registrar('promesa', evento.reason);
    avisarEnPantalla('Una operación no se completó. Revisa Diagnóstico.');
    evento.preventDefault();
  });
}
