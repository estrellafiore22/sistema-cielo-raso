// Respaldos automáticos de los datos.
//
// Guarda una foto completa de la base antes de que algo la pueda estropear:
// al arrancar el día, y a mano cuando el programador lo pida.
//
// QUÉ PROTEGE Y QUÉ NO, sin adornos:
//   · Protege contra un error del sistema que corrompa los datos, o contra
//     un cambio del administrador del que se arrepienta.
//   · NO protege contra formatear la PC ni contra limpiar el historial del
//     navegador: las fotos viven en el mismo sitio que los datos.
//     Para eso está la exportación a archivo, que hay que hacer a mano.

import * as almacen from './almacenamiento.js';
import { registrar } from './errores.js';

const PREFIJO = 'respaldo:';
const MAXIMO = 3;
const HORAS_ENTRE_AUTOMATICOS = 20;

/**
 * Toma una foto de todos los datos.
 * Excluye las fotos anteriores: si no, cada respaldo contendría al anterior
 * y el almacenamiento crecería al doble en cada vuelta.
 */
export function crear(motivo = 'manual') {
  try {
    const datos = {};
    for (const clave of almacen.claves()) {
      if (clave.startsWith(PREFIJO)) continue;
      datos[clave] = almacen.leer(clave);
    }

    const foto = {
      fecha: new Date().toISOString(),
      motivo,
      datos,
    };

    const id = PREFIJO + Date.now();
    if (!almacen.escribir(id, foto)) {
      // Casi siempre es falta de espacio: se borra la más vieja y se reintenta.
      const viejas = listar();
      if (viejas.length > 0) {
        almacen.borrar(viejas[viejas.length - 1].id);
        if (!almacen.escribir(id, foto)) {
          return { ok: false, error: 'No hay espacio para guardar el respaldo' };
        }
      } else {
        return { ok: false, error: 'No hay espacio para guardar el respaldo' };
      }
    }

    podar();
    return { ok: true, id, fecha: foto.fecha };
  } catch (error) {
    registrar('respaldo.crear', error);
    return { ok: false, error: 'No se pudo crear el respaldo' };
  }
}

/** Fotos guardadas, de la más nueva a la más vieja. */
export function listar() {
  return almacen
    .claves()
    .filter((c) => c.startsWith(PREFIJO))
    .map((id) => {
      const foto = almacen.leer(id);
      if (!foto || !foto.datos) return null;
      return {
        id,
        fecha: foto.fecha,
        motivo: foto.motivo,
        colecciones: Object.keys(foto.datos).length,
        pedidos: Array.isArray(foto.datos.pedidos) ? foto.datos.pedidos.length : 0,
        peso: tamano(foto),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

/** Deja solo las más recientes. */
function podar() {
  const fotos = listar();
  for (const vieja of fotos.slice(MAXIMO)) almacen.borrar(vieja.id);
}

/**
 * Vuelve a un respaldo. Antes de pisar nada guarda una foto del estado
 * actual, para que restaurar por error también tenga vuelta atrás.
 */
export function restaurar(id) {
  const foto = almacen.leer(id);
  if (!foto || !foto.datos) {
    return { ok: false, error: 'Ese respaldo no existe o está dañado' };
  }

  crear('antes-de-restaurar');

  try {
    // Se borra lo que hay, menos las fotos: si no, restaurar las perdería.
    for (const clave of almacen.claves()) {
      if (!clave.startsWith(PREFIJO)) almacen.borrar(clave);
    }
    for (const [clave, valor] of Object.entries(foto.datos)) {
      almacen.escribir(clave, valor);
    }
    return { ok: true, fecha: foto.fecha };
  } catch (error) {
    registrar('respaldo.restaurar', error, { id });
    return { ok: false, error: 'No se pudo restaurar el respaldo' };
  }
}

export function eliminar(id) {
  if (!id.startsWith(PREFIJO)) return { ok: false, error: 'Identificador no válido' };
  almacen.borrar(id);
  return { ok: true };
}

/**
 * Se llama al arrancar el sistema. Toma una foto si la última ya tiene sus
 * horas, para no llenar el almacenamiento con fotos de la misma sesión.
 */
export function automatico() {
  try {
    const fotos = listar();
    if (fotos.length > 0) {
      const horas = (Date.now() - new Date(fotos[0].fecha).getTime()) / 3600000;
      if (horas < HORAS_ENTRE_AUTOMATICOS) return { ok: true, omitido: true };
    }
    // Sin datos que perder no tiene sentido respaldar.
    const pedidos = almacen.leer('pedidos');
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return { ok: true, omitido: true };
    }
    return crear('automático');
  } catch (error) {
    registrar('respaldo.automatico', error);
    return { ok: false, error: 'No se pudo respaldar al arrancar' };
  }
}

/** Cuándo se exportó por última vez a archivo, que es el respaldo de verdad. */
export function ultimaExportacion() {
  return almacen.leer('config:ultimaExportacion') || null;
}

export function marcarExportacion() {
  almacen.escribir('config:ultimaExportacion', new Date().toISOString());
}

/** Días desde la última exportación a archivo. null si nunca se hizo. */
export function diasSinExportar() {
  const ultima = ultimaExportacion();
  if (!ultima) return null;
  return Math.floor((Date.now() - new Date(ultima).getTime()) / 86400000);
}

function tamano(valor) {
  try {
    return new Blob([JSON.stringify(valor)]).size;
  } catch (error) {
    return 0;
  }
}
