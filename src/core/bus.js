// Bus de eventos. Permite que los módulos se avisen sin conocerse entre sí.
// Ejemplo: pedidos.js emite 'pedido:creado' y la vista del calendario se entera
// sin que pedidos.js sepa que el calendario existe.

import { registrar } from './errores.js';

const suscriptores = new Map();

/** Suscribe un manejador. Devuelve la función para cancelar la suscripción. */
export function escuchar(evento, manejador) {
  if (!suscriptores.has(evento)) suscriptores.set(evento, new Set());
  suscriptores.get(evento).add(manejador);
  return () => suscriptores.get(evento)?.delete(manejador);
}

/**
 * Emite un evento. Un manejador que falla se registra pero no impide que los
 * demás se ejecuten: un módulo roto no puede tumbar a los otros.
 */
export function emitir(evento, datos) {
  const conjunto = suscriptores.get(evento);
  if (!conjunto) return;
  for (const manejador of conjunto) {
    try {
      manejador(datos);
    } catch (error) {
      registrar('bus:' + evento, error, { datos });
    }
  }
}

export function olvidarTodo() {
  suscriptores.clear();
}
