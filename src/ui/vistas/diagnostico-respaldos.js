// Panel de respaldos automáticos.

import { div, h, p, boton, tabla, insignia } from '../componentes/dom.js';
import * as respaldo from '../../core/respaldo.js';
import { fechaHora } from '../../core/formato.js';

export function panelRespaldos(refrescar) {
  const fotos = respaldo.listar();
  const caja = div('panel');

  caja.appendChild(h(3, 'Respaldos automáticos', 'panel__titulo'));
  caja.appendChild(
    p(
      'El sistema guarda una foto de los datos al abrir, una vez al día. ' +
        'Sirve si algo se corrompe o si alguien borra algo por error.',
      'texto-tenue',
    ),
  );
  caja.appendChild(
    p(
      'Ojo: las fotos viven en este mismo navegador. Si se formatea la PC o se ' +
        'limpia el historial se pierden igual que los datos. Contra eso solo ' +
        'sirve exportar a archivo.',
      'aviso-linea aviso-linea--alerta',
    ),
  );

  caja.appendChild(
    div('cotizador__acciones', [
      boton('Guardar foto ahora', () => {
        const r = respaldo.crear('manual');
        alert(r.ok ? 'Respaldo guardado.' : r.error);
        refrescar();
      }, { clase: 'boton boton--principal boton--pequeno' }),
    ]),
  );

  if (fotos.length === 0) {
    caja.appendChild(p('Todavía no hay respaldos guardados.', 'texto-tenue'));
    return caja;
  }

  caja.appendChild(
    tabla(
      [
        { titulo: 'Cuándo', celda: (f) => fechaHora(f.fecha) },
        {
          titulo: 'Motivo',
          celda: (f) => insignia(f.motivo, f.motivo === 'manual' ? 'info' : 'neutro'),
        },
        { titulo: 'Pedidos', clase: 'col-num', celda: (f) => String(f.pedidos) },
        {
          titulo: 'Peso',
          clase: 'col-num',
          celda: (f) => `${(f.peso / 1024).toFixed(0)} KB`,
        },
        {
          titulo: '',
          clase: 'col-accion',
          celda: (f) => {
            const acciones = div('celda-acciones');
            acciones.appendChild(
              boton('Restaurar', () => {
                if (!confirm(
                  `Esto reemplaza TODOS los datos actuales por los del ` +
                  `${fechaHora(f.fecha)}.\n\nAntes de hacerlo se guarda una foto ` +
                  `del estado actual, así que también se puede deshacer.\n\n¿Continuar?`,
                )) return;
                const r = respaldo.restaurar(f.id);
                if (!r.ok) {
                  alert(r.error);
                  return;
                }
                alert('Datos restaurados. Se recargará el sistema.');
                window.location.reload();
              }, { clase: 'boton boton--pequeno' }),
            );
            acciones.appendChild(
              boton('✕', () => {
                if (!confirm('¿Borrar este respaldo?')) return;
                respaldo.eliminar(f.id);
                refrescar();
              }, { clase: 'boton boton--fantasma boton--pequeno' }),
            );
            return acciones;
          },
        },
      ],
      fotos,
    ),
  );

  return caja;
}

/** Aviso de cuánto hace que no se exporta a archivo. */
export function avisoExportacion() {
  const dias = respaldo.diasSinExportar();

  if (dias === null) {
    return p(
      '⚠ Nunca has exportado los datos a un archivo. Si se pierde esta PC, se ' +
        'pierde todo. Exporta ahora y guarda el archivo fuera de la máquina.',
      'aviso-linea aviso-linea--alerta',
    );
  }
  if (dias >= 7) {
    return p(
      `⚠ Hace ${dias} día(s) que no exportas a archivo.`,
      'aviso-linea aviso-linea--alerta',
    );
  }
  return p(
    `Última exportación a archivo: hace ${dias === 0 ? 'menos de un día' : `${dias} día(s)`}.`,
    'aviso-linea aviso-linea--ok',
  );
}
