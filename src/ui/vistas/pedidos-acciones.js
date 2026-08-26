// Acciones sobre un pedido que necesitan un formulario: cobrar el saldo y
// cerrar la obra devolviendo el material sobrante al inventario.

import { div, h, p, el, campo, seleccion, boton, tabla, error, exito } from '../componentes/dom.js';
import * as pagos from '../../dominio/pagos.js';
import * as pedidos from '../../dominio/pedidos.js';
import * as materiales from '../../dominio/materiales.js';
import { soles, numero } from '../../core/formato.js';

// --- Cobrar el saldo --------------------------------------------------------

export function formularioCobro(pedido, alTerminar) {
  const saldo = Number(pedido.pago?.saldo) || 0;
  const panel = div('panel panel--accion');
  panel.appendChild(h(3, 'Cobrar saldo', 'panel__titulo'));
  panel.appendChild(p(`Pendiente: ${soles(saldo)}`, 'destacado'));

  const monto = campo('Monto cobrado (S/)', {
    tipo: 'number',
    valor: saldo,
    paso: '0.10',
    minimo: '0',
    ayuda: 'Si el cliente abona una parte, se descuenta y queda el resto.',
  });

  const metodo = seleccion('Método', [
    { valor: pagos.METODOS.YAPE, texto: 'Yape' },
    { valor: pagos.METODOS.TRANSFERENCIA, texto: 'Transferencia bancaria' },
    { valor: 'efectivo', texto: 'Efectivo' },
  ]);

  const operacion = campo('N° de operación', {
    ayuda: 'Déjalo vacío si fue en efectivo.',
  });

  const zonaError = div('');

  panel.appendChild(div('rejilla rejilla--3', [monto.campo, metodo.campo, operacion.campo]));
  panel.appendChild(zonaError);
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Registrar cobro', () => {
        zonaError.replaceChildren();
        const resultado = pagos.registrarSaldo(pedido.id, {
          metodo: metodo.entrada.value,
          operacion: operacion.entrada.value,
          monto: monto.entrada.value,
        });
        if (!resultado.ok) {
          zonaError.appendChild(error(resultado.error));
          return;
        }
        alTerminar(
          resultado.pago.liquidado
            ? 'Pedido cobrado por completo.'
            : `Quedan ${soles(resultado.pago.saldo)} por cobrar.`,
        );
      }, { clase: 'boton boton--principal' }),
      boton('Cancelar', () => alTerminar(null), { clase: 'boton boton--fantasma' }),
    ]),
  );

  return panel;
}

// --- Cerrar la obra con retornos -------------------------------------------

export function formularioCierre(pedido, alTerminar) {
  const panel = div('panel panel--accion');
  panel.appendChild(h(3, 'Cerrar obra y registrar retornos', 'panel__titulo'));
  panel.appendChild(
    p(
      'Anota el material que volvió de la obra. Entra al inventario de ' +
        'retornos y se gasta primero en el siguiente pedido.',
      'texto-tenue',
    ),
  );

  // Se propone lo que salió en el despiece: es de ahí de donde puede sobrar.
  const candidatos = materialesDelPedido(pedido);
  const filas = candidatos.map((c) => ({ ...c, cantidad: 0, condicion: 'usado', nota: '' }));

  if (filas.length === 0) {
    panel.appendChild(p('Este pedido no llevó material despiezado.', 'texto-tenue'));
  } else {
    panel.appendChild(
      tabla(
        [
          { titulo: 'Material', celda: (f) => f.nombre },
          {
            titulo: 'Se llevó',
            clase: 'col-num',
            celda: (f) => `${numero(f.llevado, 2)} ${f.unidad}`,
          },
          {
            titulo: 'Volvió',
            clase: 'col-num',
            celda: (f) => {
              const entrada = el('input', { tipo: 'number', clase: 'entrada-mini', valor: 0 });
              entrada.step = '0.01';
              entrada.min = '0';
              entrada.max = String(f.llevado);
              entrada.addEventListener('input', () => {
                f.cantidad = Number(entrada.value) || 0;
              });
              return entrada;
            },
          },
          {
            titulo: 'Condición',
            celda: (f) => {
              const select = el('select', { clase: 'campo__entrada entrada-mini-ancha' });
              select.appendChild(el('option', { valor: 'usado', texto: 'Retazo' }));
              select.appendChild(el('option', { valor: 'nuevo', texto: 'Sin abrir' }));
              select.addEventListener('change', () => {
                f.condicion = select.value;
              });
              return select;
            },
          },
        ],
        filas,
      ),
    );
  }

  const zonaError = div('');
  panel.appendChild(zonaError);
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Cerrar obra', async (evento) => {
        zonaError.replaceChildren();
        evento.target.disabled = true;

        const sobrantes = filas
          .filter((f) => f.cantidad > 0)
          .map((f) => ({
            material: f.material,
            cantidad: f.cantidad,
            condicion: f.condicion,
            nota: f.nota,
          }));

        try {
          const resultado = await pedidos.cerrarConRetornos(pedido.id, sobrantes);
          if (!resultado.ok) {
            evento.target.disabled = false;
            zonaError.appendChild(error(resultado.error));
            return;
          }
          alTerminar(
            sobrantes.length
              ? `Obra cerrada. ${resultado.retornos.length} material(es) volvieron al inventario.`
              : 'Obra cerrada sin material de retorno.',
          );
        } catch (fallo) {
          evento.target.disabled = false;
          zonaError.appendChild(error('No se pudo cerrar la obra.'));
        }
      }, { clase: 'boton boton--principal' }),
      boton('Cancelar', () => alTerminar(null), { clase: 'boton boton--fantasma' }),
    ]),
  );

  return panel;
}

/** Materiales que salieron con el pedido, con la cantidad que se llevó. */
function materialesDelPedido(pedido) {
  const interno = pedido.cotizacion?.interno;
  if (!interno) return [];

  if (interno.despiece) {
    return interno.despiece.lineas.map((l) => ({
      material: l.material,
      nombre: l.nombre,
      unidad: l.unidad,
      llevado: l.necesario,
    }));
  }

  if (interno.lineas) {
    return interno.lineas.map((l) => ({
      material: l.material,
      nombre: l.nombre,
      unidad: l.unidad,
      llevado: l.cantidad,
    }));
  }

  return [];
}

export { exito };
