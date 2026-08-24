// Paso 3: datos del cliente y pago.
// No se puede pasar de aquí sin pago: adelanto (mínimo configurable) o completo.

import { div, h, p, el, campo, boton, error } from '../componentes/dom.js';
import * as pagos from '../../dominio/pagos.js';
import { soles } from '../../core/formato.js';

export function montar(contenedor, ctx) {
  const { estado, siguiente, anterior } = ctx;
  contenedor.replaceChildren();

  const total = estado.cotizacion?.total || 0;
  const minimo = pagos.adelantoMinimo(total);
  const zonaError = div('');

  const panel = div('panel', [
    bloqueCliente(estado),
    bloquePago(estado, total, minimo, () => montar(contenedor, ctx)),
    bloqueDatosCobro(),
    zonaError,
  ]);

  contenedor.appendChild(panel);
  contenedor.appendChild(
    div('cotizador__acciones', [
      boton('← Volver', anterior, { clase: 'boton boton--fantasma' }),
      boton('Revisar y confirmar →', () => {
        zonaError.replaceChildren();

        if (!String(estado.cliente.nombre).trim()) {
          zonaError.appendChild(error('Escribe el nombre del cliente.'));
          return;
        }

        const validacion = pagos.validar({
          total,
          tipo: estado.pago.tipo,
          monto: estado.pago.monto,
          metodo: estado.pago.metodo,
          operacion: estado.pago.operacion,
        });
        if (!validacion.ok) {
          zonaError.appendChild(error(validacion.error));
          return;
        }
        siguiente();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
}

function bloqueCliente(estado) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Cliente', 'panel__subtitulo'));

  const nombre = campo('Nombre completo', {
    valor: estado.cliente.nombre,
    requerido: true,
    alEscribir: (e) => {
      estado.cliente.nombre = e.target.value;
    },
  });
  const telefono = campo('Teléfono', {
    tipo: 'tel',
    valor: estado.cliente.telefono,
    alEscribir: (e) => {
      estado.cliente.telefono = e.target.value;
    },
  });
  const documento = campo('DNI / RUC', {
    valor: estado.cliente.documento,
    alEscribir: (e) => {
      estado.cliente.documento = e.target.value;
    },
  });

  caja.appendChild(div('rejilla rejilla--3', [nombre.campo, telefono.campo, documento.campo]));
  return caja;
}

function bloquePago(estado, total, minimo, repintar) {
  const caja = div('bloque');
  caja.appendChild(h(3, 'Pago', 'panel__subtitulo'));
  caja.appendChild(
    p(`Total del pedido: ${soles(total)}`, 'destacado'),
  );

  // Tipo de pago
  const tipos = div('opciones');
  for (const [valor, texto] of [
    [pagos.TIPOS.ADELANTO, `Adelanto (mínimo ${soles(minimo)})`],
    [pagos.TIPOS.COMPLETO, `Pago completo — ${soles(total)}`],
  ]) {
    const activo = estado.pago.tipo === valor;
    tipos.appendChild(
      el('button', {
        tipo: 'button',
        texto,
        clase: 'opcion' + (activo ? ' opcion--activa' : ''),
        alHacerClic: () => {
          estado.pago.tipo = valor;
          if (valor === pagos.TIPOS.COMPLETO) estado.pago.monto = total;
          repintar();
        },
      }),
    );
  }
  caja.appendChild(tipos);

  // Monto, solo si es adelanto
  if (estado.pago.tipo === pagos.TIPOS.ADELANTO) {
    const monto = campo('Monto del adelanto (S/)', {
      tipo: 'number',
      valor: estado.pago.monto,
      paso: '0.10',
      minimo: String(minimo),
      ayuda: `No se acepta menos de ${soles(minimo)}.`,
      alEscribir: (e) => {
        estado.pago.monto = e.target.value;
      },
    });
    const saldo = Number(total) - (Number(estado.pago.monto) || 0);
    const bloque = div('rejilla rejilla--2', [monto.campo]);
    if (saldo > 0) {
      bloque.appendChild(
        div('campo', [
          el('span', { clase: 'campo__etiqueta', texto: 'Saldo a cobrar en la entrega' }),
          el('strong', { clase: 'campo__valor', texto: soles(saldo) }),
        ]),
      );
    }
    caja.appendChild(bloque);
  }

  // Método
  const metodos = div('opciones');
  for (const [valor, texto] of [
    [pagos.METODOS.YAPE, '📱 Yape'],
    [pagos.METODOS.TRANSFERENCIA, '🏦 Transferencia bancaria'],
  ]) {
    const activo = estado.pago.metodo === valor;
    metodos.appendChild(
      el('button', {
        tipo: 'button',
        texto,
        clase: 'opcion' + (activo ? ' opcion--activa' : ''),
        alHacerClic: () => {
          estado.pago.metodo = valor;
          repintar();
        },
      }),
    );
  }
  caja.appendChild(metodos);

  const operacion = campo('N° de operación', {
    valor: estado.pago.operacion,
    marcador: 'Código que devuelve Yape o el banco',
    ayuda: 'Obligatorio. Es la prueba de que el pago entró.',
    alEscribir: (e) => {
      estado.pago.operacion = e.target.value;
    },
  });
  caja.appendChild(div('rejilla rejilla--2', [operacion.campo]));

  return caja;
}

function bloqueDatosCobro() {
  const datos = pagos.datosCobro();
  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Dónde paga el cliente', 'panel__subtitulo'));

  const filas = [];
  if (datos.yape) filas.push(['Yape', datos.yape]);
  if (datos.banco) filas.push(['Banco', datos.banco]);
  if (datos.cuenta) filas.push(['Cuenta', datos.cuenta]);
  if (datos.cci) filas.push(['CCI', datos.cci]);
  if (datos.titular) filas.push(['Titular', datos.titular]);

  if (filas.length === 0) {
    caja.appendChild(
      p('Falta configurar el número de Yape y la cuenta bancaria en Ajustes → Tienda.', 'texto-tenue'),
    );
    return caja;
  }

  const lista = el('dl', { clase: 'resumen__lista' });
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);
  return caja;
}
