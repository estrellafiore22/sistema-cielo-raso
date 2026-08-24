// Distancia entre la tienda y el lugar del trabajo.
//
// Si hay clave de Google Maps configurada, la calcula sola. Si no la hay —o si
// Google falla— el sistema NO se rompe: pide los kilómetros a mano y sigue.
// Esa es la razón de que transporte.js no dependa de este archivo.
//
// Para activar Google Maps:
//   1. console.cloud.google.com → crear proyecto
//   2. Habilitar "Distance Matrix API" y "Places API"
//   3. Crear una clave de API y restringirla al dominio de la página
//   4. Pegarla en Ajustes → Mapas, junto con la dirección de la tienda

import * as bd from '../core/bd.js';
import { registrar } from '../core/errores.js';

export function configuracion() {
  return bd.config('mapas', { apiKey: '', origen: '' });
}

export function guardarConfiguracion({ apiKey, origen }) {
  bd.guardarConfig('mapas', {
    apiKey: String(apiKey || '').trim(),
    origen: String(origen || '').trim(),
  });
  return { ok: true };
}

export function activo() {
  const config = configuracion();
  return Boolean(config.apiKey && config.origen);
}

/**
 * Distancia en kilómetros por carretera entre la tienda y un destino.
 *
 * Devuelve siempre un objeto con `ok`. Cuando `ok` es false, la interfaz debe
 * pedir los kilómetros a mano en lugar de mostrar un error y bloquear la venta.
 */
export async function distanciaHasta(direccionDestino) {
  const config = configuracion();

  if (!config.apiKey) {
    return { ok: false, motivo: 'sin_clave', error: 'Google Maps no está configurado' };
  }
  if (!config.origen) {
    return {
      ok: false,
      motivo: 'sin_origen',
      error: 'Falta la dirección de la tienda en Ajustes → Mapas',
    };
  }
  if (!String(direccionDestino || '').trim()) {
    return { ok: false, motivo: 'sin_destino', error: 'Escribe la dirección de entrega' };
  }

  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${encodeURIComponent(config.origen)}` +
    `&destinations=${encodeURIComponent(direccionDestino)}` +
    '&units=metric&mode=driving' +
    `&key=${encodeURIComponent(config.apiKey)}`;

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`Google respondió ${respuesta.status}`);
    }
    const datos = await respuesta.json();

    if (datos.status !== 'OK') {
      throw new Error(datos.error_message || datos.status);
    }
    const elemento = datos.rows?.[0]?.elements?.[0];
    if (!elemento || elemento.status !== 'OK') {
      return {
        ok: false,
        motivo: 'sin_ruta',
        error: 'No se encontró una ruta a esa dirección',
      };
    }

    return {
      ok: true,
      km: Math.round((elemento.distance.value / 1000) * 100) / 100,
      duracionMin: Math.round(elemento.duration.value / 60),
      direccionNormalizada: datos.destination_addresses?.[0] || direccionDestino,
    };
  } catch (error) {
    registrar('mapas.distanciaHasta', error, { direccionDestino });
    return {
      ok: false,
      motivo: 'error_red',
      error: 'No se pudo consultar Google Maps. Ingresa los kilómetros a mano.',
    };
  }
}

/** Enlace para abrir la dirección en la app de mapas del celular del chofer. */
export function enlaceNavegacion(direccion, coordenadas = null) {
  if (coordenadas && coordenadas.lat && coordenadas.lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordenadas.lat},${coordenadas.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    direccion,
  )}`;
}
