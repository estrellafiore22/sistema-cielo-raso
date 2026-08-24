// Pantalla de programador: errores, estado de los datos, respaldo y reinicio.

import { div, h, p, el, boton, tabla, tarjeta } from '../componentes/dom.js';
import * as errores from '../../core/errores.js';
import * as almacen from '../../core/almacenamiento.js';
import * as bd from '../../core/bd.js';
import { fechaHora } from '../../core/formato.js';

export function montar(contenedor) {
  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Diagnóstico', 'vista__titulo'));
    contenedor.appendChild(div('rejilla rejilla--2', [panelEstado(), panelRespaldo(dibujar)]));
    contenedor.appendChild(panelErrores(dibujar));
  }
  dibujar();
}

function panelEstado() {
  const filas = bd.COLECCIONES.map((coleccion) => ({
    coleccion,
    registros: bd.todos(coleccion).length,
  }));

  const peso = new Blob([JSON.stringify(almacen.exportarTodo())]).size;

  return tarjeta('Estado de los datos', [
    p(`Versión del esquema: ${bd.versionGuardada()} (actual: ${bd.VERSION_ACTUAL})`),
    p(`Almacenamiento usado: ${(peso / 1024).toFixed(1)} KB`),
    p(
      almacen.disponible()
        ? 'localStorage disponible.'
        : '⚠ localStorage bloqueado: los datos se pierden al cerrar.',
      almacen.disponible() ? 'texto-ok' : 'texto-peligro',
    ),
    tabla(
      [
        { titulo: 'Colección', celda: (f) => f.coleccion },
        { titulo: 'Registros', clase: 'col-num', celda: (f) => String(f.registros) },
      ],
      filas,
    ),
  ]);
}

function panelRespaldo(refrescar) {
  const entradaArchivo = el('input', { tipo: 'file', clase: 'entrada-archivo' });
  entradaArchivo.accept = 'application/json';

  return tarjeta('Respaldo', [
    p(
      'Los datos viven en este navegador. Si se formatea la PC o se limpia el ' +
        'historial, se pierden. Exporta seguido.',
      'texto-tenue',
    ),
    div('cotizador__acciones', [
      boton('⬇ Exportar respaldo', exportar, { clase: 'boton boton--principal' }),
    ]),
    entradaArchivo,
    div('cotizador__acciones', [
      boton('⬆ Importar respaldo', () => importar(entradaArchivo, refrescar), {
        clase: 'boton boton--secundario',
      }),
      boton('🗑 Borrar todo', () => borrarTodo(), {
        clase: 'boton boton--peligro boton--pequeno',
      }),
    ]),
  ]);
}

function exportar() {
  const datos = almacen.exportarTodo();
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `respaldo-cieloraso-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function importar(entradaArchivo, refrescar) {
  const archivo = entradaArchivo.files?.[0];
  if (!archivo) {
    alert('Elige primero un archivo de respaldo.');
    return;
  }
  if (!confirm('Esto reemplaza TODOS los datos actuales. ¿Continuar?')) return;

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      almacen.importarTodo(datos);
      alert('Respaldo restaurado. Se recargará el sistema.');
      window.location.reload();
    } catch (error) {
      errores.registrar('diagnostico.importar', error);
      alert('El archivo no es un respaldo válido.');
    }
  };
  lector.readAsText(archivo);
}

function borrarTodo() {
  if (!confirm('Esto borra TODO: materiales, pedidos, inventario, personal. ¿Seguro?')) return;
  if (!confirm('No hay vuelta atrás. ¿De verdad?')) return;
  almacen.vaciar();
  window.location.reload();
}

function panelErrores(refrescar) {
  const historial = errores.historial();
  const caja = div('panel');
  caja.appendChild(h(3, `Errores registrados (${historial.length})`, 'panel__titulo'));

  if (historial.length === 0) {
    caja.appendChild(p('Ningún error en esta sesión.', 'texto-ok'));
    return caja;
  }

  caja.appendChild(
    div('cotizador__acciones', [
      boton('Limpiar', () => {
        errores.limpiarHistorial();
        refrescar();
      }, { clase: 'boton boton--fantasma boton--pequeno' }),
    ]),
  );

  caja.appendChild(
    tabla(
      [
        { titulo: 'Cuándo', celda: (e) => fechaHora(e.fecha) },
        { titulo: 'Dónde', celda: (e) => e.origen },
        { titulo: 'Mensaje', celda: (e) => e.mensaje },
        {
          titulo: 'Detalle',
          celda: (e) => {
            if (!e.pila) return '—';
            const detalles = el('details');
            detalles.appendChild(el('summary', { texto: 'ver' }));
            detalles.appendChild(el('pre', { clase: 'pila', texto: e.pila }));
            return detalles;
          },
        },
      ],
      historial.slice().reverse(),
    ),
  );
  return caja;
}
