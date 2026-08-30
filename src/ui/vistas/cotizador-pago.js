// Paso 3: datos del cliente y pago.
// No se puede pasar de aquí sin pago: adelanto (mínimo configurable) o completo.

import { div, h, p, el, campo, boton, error } from '../componentes/dom.js';
import * as pagos from '../../dominio/pagos.js';
import * as auth from '../../core/auth.js';
import { campoImagen } from '../componentes/imagen.js';
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
        if (!String(estado.cliente.telefono).trim()) {
          zonaError.appendChild(error('El teléfono del cliente es obligatorio.'));
          return;
        }
        if (estado.cliente.factura && !String(estado.cliente.documento).trim()) {
          zonaError.appendChild(error('Para emitir factura hace falta el RUC.'));
          return;
        }

        const validacion = pagos.validar({
          total,
          tipo: estado.pago.tipo,
          monto: estado.pago.monto,
          metodo: estado.pago.metodo,
          operacion: estado.pago.operacion,
          comprobante: estado.pago.comprobante,
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
    requerido: true,
    ayuda: 'Obligatorio: es con lo que se coordina la entrega.',
    alEscribir: (e) => {
      estado.cliente.telefono = e.target.value;
    },
  });
  const documento = campo('DNI / RUC', {
    valor: estado.cliente.documento,
    ayuda: 'Opcional, salvo que se pida factura.',
    alEscribir: (e) => {
      estado.cliente.documento = e.target.value;
    },
  });

  const marca = el('input', {
    tipo: 'checkbox',
    id: 'quiere-factura',
    alCambiar: (e) => {
      estado.cliente.factura = e.target.checked;
      documento.entrada.required = e.target.checked;
      repintarAyuda();
    },
  });
  marca.checked = Boolean(estado.cliente.factura);
  const etiqueta = el('label', { texto: 'Generar factura' });
  etiqueta.setAttribute('for', 'quiere-factura');

  const ayudaFactura = p('', 'campo__ayuda');
  function repintarAyuda() {
    ayudaFactura.textContent = estado.cliente.factura
      ? 'Con factura el RUC pasa a ser obligatorio.'
      : 'Sin factura se emite boleta simple.';
  }
  repintarAyuda();

  caja.appendChild(div('rejilla rejilla--3', [nombre.campo, telefono.campo, documento.campo]));
  caja.appendChild(div('interruptor', [marca, etiqueta]));
  caja.appendChild(ayudaFactura);
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

  // Método. "Pago en tienda" solo aparece cuando el pedido se toma en el
  // mostrador: un cliente pidiendo desde su cuenta no puede elegirlo.
  const enMostrador = auth.puede('pedido:todos:ver');
  const nombresMetodo = {
    [pagos.METODOS.YAPE]: '📱 Yape',
    [pagos.METODOS.TRANSFERENCIA]: '🏦 Transferencia bancaria',
    [pagos.METODOS.TIENDA]: '🏪 Pago en tienda',
  };

  const metodos = div('opciones');
  for (const valor of pagos.metodosDisponibles({ enMostrador })) {
    const texto = nombresMetodo[valor];
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

  // En tienda se paga en efectivo en el mostrador: no hay código ni captura.
  if (estado.pago.metodo === pagos.METODOS.TIENDA) {
    caja.appendChild(
      p('Se cobra en el mostrador. No hace falta código de operación.', 'texto-tenue'),
    );
    return caja;
  }

  const operacion = campo('N° de operación', {
    valor: estado.pago.operacion,
    marcador: 'Código que devuelve Yape o el banco',
    alEscribir: (e) => {
      estado.pago.operacion = e.target.value;
    },
  });

  const comprobante = campoImagen({
    etiqueta: 'Captura del pago',
    ayuda: 'La foto se achica sola antes de guardarla.',
    alCambiar: (dataUrl) => {
      estado.pago.comprobante = dataUrl;
    },
  });

  caja.appendChild(div('rejilla rejilla--2', [operacion.campo, comprobante.campo]));
  caja.appendChild(
    p(
      'Con una de las dos basta: el código de operación o la captura.',
      'texto-tenue',
    ),
  );

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
