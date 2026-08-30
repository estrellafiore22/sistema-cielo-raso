// Panel de inicio. Lo que el dueño necesita ver al abrir el sistema.

import { div, h, p, el, boton, tarjeta, tabla } from '../componentes/dom.js';
import * as auth from '../../core/auth.js';
import * as router from '../../core/router.js';
import * as pedidos from '../../dominio/pedidos.js';
import * as inventario from '../../dominio/inventario.js';
import * as calendario from '../../dominio/calendario.js';
import * as reprogramacion from '../../dominio/reprogramacion.js';
import * as cola from '../../impresion/cola-impresion.js';
import { soles, fechaCorta, hoy } from '../../core/formato.js';

export function montar(contenedor) {
  contenedor.replaceChildren();
  const sesion = auth.sesion();

  contenedor.appendChild(h(2, `Hola, ${sesion.nombre}`, 'vista__titulo'));
  contenedor.appendChild(
    div('acciones-rapidas', [
      boton('+ Nuevo pedido', () => router.ir('/cotizador'), {
        clase: 'boton boton--principal boton--grande',
      }),
    ]),
  );

  if (!auth.esAdmin()) {
    contenedor.appendChild(panelCliente());
    return;
  }

  contenedor.appendChild(indicadores());

  // Lo primero: obras movidas de fecha a las que falta avisarle al cliente.
  // Es una llamada de teléfono, y si no se hace el equipo llega a una puerta
  // cerrada.
  const movidos = panelReprogramados(() => montar(contenedor));
  if (movidos) contenedor.appendChild(movidos);

  contenedor.appendChild(
    div('rejilla rejilla--2', [panelHoy(), panelPendientes(), panelStock(), panelImpresion()]),
  );
}

function panelCliente() {
  return tarjeta('Tus pedidos', [
    p('Aquí verás los pedidos que registres.', 'texto-tenue'),
    boton('Ver mis pedidos', () => router.ir('/pedidos'), { clase: 'boton' }),
  ]);
}

function indicadores() {
  const porCobrar = pedidos.pendientesDeCobro();
  const saldoTotal = porCobrar.reduce((suma, p) => suma + (Number(p.pago?.saldo) || 0), 0);

  // Cada indicador lleva a la pantalla que lo explica: ver un número sin poder
  // abrirlo obliga a buscar a mano lo que el sistema ya sabe.
  const datos = [
    ['Pedidos activos', String(pedidos.activos().length), '/pedidos?estado=activos'],
    ['Por cobrar', soles(saldoTotal), '/pedidos?estado=por_cobrar'],
    ['Material bajo mínimo', String(inventario.bajoMinimo().length), '/inventario'],
    ['Boletas por imprimir', String(cola.totalPendientes()), '/impresion'],
  ];

  return div(
    'indicadores',
    datos.map(([etiqueta, valor, destino]) =>
      el(
        'button',
        {
          tipo: 'button',
          clase: 'indicador indicador--enlace',
          alHacerClic: () => router.ir(destino),
        },
        [
          el('span', { clase: 'indicador__etiqueta', texto: etiqueta }),
          el('strong', { clase: 'indicador__valor', texto: valor }),
          el('span', { clase: 'indicador__pie', texto: 'Ver →' }),
        ],
      ),
    ),
  );
}

function panelHoy() {
  const estado = calendario.estadoDia(hoy());
  const contenido = [
    p(
      `${estado.ocupados} de ${estado.totalPersonal} trabajando · ${estado.libres} libre(s)`,
      'destacado',
    ),
  ];

  if (estado.trabajos.length === 0) {
    contenido.push(p('Nadie asignado hoy.', 'texto-tenue'));
  } else {
    for (const trabajo of estado.trabajos) {
      const pedido = trabajo.pedido ? pedidos.obtener(trabajo.pedido) : null;
      contenido.push(
        div('trabajo-linea', [
          el('strong', { texto: pedido ? pedido.codigo : 'Sin pedido' }),
          el('span', {
            texto: trabajo.equipo.map((t) => t.nombre).join(', '),
            clase: 'texto-tenue',
          }),
        ]),
      );
    }
  }

  contenido.push(
    estado.cabeOtroTrabajo
      ? p(`Cabe ${estado.equiposDisponibles} equipo(s) más hoy.`, 'aviso-linea aviso-linea--ok')
      : p('Todo el personal está ocupado hoy.', 'aviso-linea aviso-linea--alerta'),
  );

  contenido.push(
    boton('Ver calendario', () => router.ir('/calendario'), { clase: 'boton boton--fantasma boton--pequeno' }),
  );

  return tarjeta('Hoy', contenido);
}

function panelPendientes() {
  const lista = pedidos.pendientesDeCobro().slice(0, 6);
  return tarjeta('Saldos por cobrar', [
    tabla(
      [
        { titulo: 'Pedido', celda: (p) => p.codigo },
        { titulo: 'Cliente', celda: (p) => p.cliente.nombre },
        { titulo: 'Saldo', clase: 'col-num', celda: (p) => soles(p.pago.saldo) },
      ],
      lista,
      { vacio: 'Todo cobrado.' },
    ),
  ]);
}

function panelStock() {
  const bajos = inventario.bajoMinimo().slice(0, 6);
  return tarjeta('Material bajo mínimo', [
    tabla(
      [
        { titulo: 'Material', celda: (f) => f.material.nombre },
        { titulo: 'Total', clase: 'col-num', celda: (f) => String(f.total) },
        { titulo: 'Mínimo', clase: 'col-num', celda: (f) => String(f.minimo) },
      ],
      bajos,
      { vacio: 'Todo el stock está sobre el mínimo.' },
    ),
    boton('Ir a inventario', () => router.ir('/inventario'), {
      clase: 'boton boton--fantasma boton--pequeno',
    }),
  ]);
}

function panelImpresion() {
  const pendientes = cola.pendientes();
  const contenido = [];

  if (pendientes.length === 0) {
    contenido.push(p('No hay boletas esperando impresora.', 'texto-tenue'));
    return tarjeta('Boletas por imprimir', contenido);
  }

  contenido.push(
    p(`${pendientes.length} boleta(s) sin imprimir.`, 'aviso-linea aviso-linea--alerta'),
  );
  contenido.push(
    tabla(
      [
        { titulo: 'Pedido', celda: (t) => t.codigo },
        {
          titulo: 'Boleta',
          celda: (t) => (t.tipo === cola.TIPOS.ADMIN ? 'orden interna' : 'del cliente'),
        },
        { titulo: 'Desde', celda: (t) => fechaCorta(t.encoladoEn) },
      ],
      pendientes.slice(0, 6),
    ),
  );
  contenido.push(
    div('cotizador__acciones', [
      boton('Imprimir todas ahora', async (evento) => {
        evento.target.disabled = true;
        const resultado = await cola.imprimirPendientes();
        evento.target.disabled = false;
        alert(`Impresas: ${resultado.impresas}. Fallidas: ${resultado.fallidas || 0}.`);
        router.ir('/impresion');
      }, { clase: 'boton boton--principal boton--pequeno' }),
      boton('Ver todas', () => router.ir('/impresion'), {
        clase: 'boton boton--fantasma boton--pequeno',
      }),
    ]),
  );

  return tarjeta('Boletas por imprimir', contenido);
}

function panelReprogramados(refrescar) {
  const movidos = reprogramacion.reprogramadosSinAvisar();
  if (movidos.length === 0) return null;

  return tarjeta('Trabajos movidos de fecha — falta avisar', [
    p(
      'Llama al cliente y confirma la nueva fecha. Después marca el aviso ' +
        'para que deje de aparecer aquí.',
      'texto-tenue',
    ),
    tabla(
      [
        { titulo: 'Pedido', celda: (x) => x.pedido.codigo },
        { titulo: 'Cliente', celda: (x) => x.pedido.cliente.nombre },
        { titulo: 'Teléfono', celda: (x) => x.pedido.cliente.telefono || 'sin teléfono' },
        {
          titulo: 'Se movió',
          celda: (x) => `${fechaCorta(x.ultima.de)} → ${fechaCorta(x.ultima.a)}`,
        },
        { titulo: 'Motivo', celda: (x) => x.ultima.motivo || '—' },
        {
          titulo: '',
          clase: 'col-accion',
          celda: (x) =>
            boton('Ya avisé', () => {
              reprogramacion.marcarAvisado(x.pedido.id);
              refrescar();
            }, { clase: 'boton boton--pequeno' }),
        },
      ],
      movidos,
    ),
  ], 'tarjeta--alerta');
}
