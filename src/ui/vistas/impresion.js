// Cola de impresión: boletas que quedaron sin imprimir.

import { div, h, p, boton, tabla, insignia } from '../componentes/dom.js';
import * as cola from '../../impresion/cola-impresion.js';
import * as bd from '../../core/bd.js';
import { fechaHora } from '../../core/formato.js';

export function montar(contenedor) {
  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Cola de impresión', 'vista__titulo'));
    contenedor.appendChild(
      p(
        'Aquí está toda boleta que todavía no salió por impresora, se haya ' +
          'intentado o no. Una página web no puede saber si hay impresora ' +
          'conectada ni imprimir sin confirmación; los navegadores lo bloquean. ' +
          'Lo que sí hace el sistema es no perderle el rastro a ninguna.',
        'texto-tenue',
      ),
    );

    const pendientes = cola.pendientes();

    if (pendientes.length === 0) {
      contenedor.appendChild(p('No hay boletas pendientes.', 'pantalla-vacia'));
      return;
    }

    contenedor.appendChild(
      div('cotizador__acciones', [
        boton('🖨️ Imprimir todas', async (evento) => {
          evento.target.disabled = true;
          evento.target.textContent = 'Imprimiendo…';
          const resultado = await cola.imprimirPendientes();
          alert(
            `Impresas: ${resultado.impresas}.` +
              (resultado.fallidas ? ` Fallidas: ${resultado.fallidas}.` : ''),
          );
          dibujar();
        }, { clase: 'boton boton--principal' }),
        boton('Recuperar descartadas', () => {
          cola.limpiarCola();
          dibujar();
        }, { clase: 'boton boton--fantasma boton--pequeno' }),
      ]),
    );

    contenedor.appendChild(
      tabla(
        [
          {
            titulo: 'Pedido',
            celda: (t) => t.codigo || '(borrado)',
          },
          {
            titulo: 'Tipo',
            celda: (t) =>
              insignia(
                t.tipo === cola.TIPOS.ADMIN ? 'orden interna' : 'boleta cliente',
                t.tipo === cola.TIPOS.ADMIN ? 'alerta' : 'info',
              ),
          },
          {
            titulo: 'Cliente',
            celda: (t) => bd.buscarPorId('pedidos', t.pedido)?.cliente?.nombre || '—',
          },
          { titulo: 'Esperando desde', celda: (t) => fechaHora(t.encoladoEn) },
          { titulo: 'Intentos', clase: 'col-num', celda: (t) => String(t.intentos || 0) },
          {
            titulo: '',
            clase: 'col-accion',
            celda: (t) => {
              const acciones = div('celda-acciones');
              const pedido = bd.buscarPorId('pedidos', t.pedido);
              if (pedido) {
                acciones.appendChild(
                  boton('Imprimir', () => {
                    cola.imprimir(pedido, t.tipo);
                    dibujar();
                  }, { clase: 'boton boton--pequeno' }),
                );
              }
              acciones.appendChild(
                boton('Descartar', () => {
                  cola.descartar(t.pedido, t.tipo);
                  dibujar();
                }, { clase: 'boton boton--fantasma boton--pequeno' }),
              );
              return acciones;
            },
          },
        ],
        pendientes,
      ),
    );
  }

  dibujar();
}
