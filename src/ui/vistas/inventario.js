// Almacén y retornos de obra.

import { div, h, p, el, campo, seleccion, boton, tabla, insignia, redibujarLuego } from '../componentes/dom.js';
import * as inventario from '../../dominio/inventario.js';
import * as materiales from '../../dominio/materiales.js';
import { numero, fechaCorta } from '../../core/formato.js';

export function montar(contenedor) {
  let pestana = 'almacen';

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Inventario', 'vista__titulo'));
    contenedor.appendChild(pestanas(pestana, (nueva) => {
      pestana = nueva;
      dibujar();
    }));

    if (pestana === 'almacen') contenedor.appendChild(vistaAlmacen(dibujar));
    else if (pestana === 'retornos') contenedor.appendChild(vistaRetornos(dibujar));
    else contenedor.appendChild(vistaMovimientos());
  }

  dibujar();
}

function pestanas(actual, alCambiar) {
  const caja = div('pestanas');
  for (const [valor, texto] of [
    ['almacen', 'Almacén'],
    ['retornos', 'Retornos de obra'],
    ['movimientos', 'Movimientos'],
  ]) {
    caja.appendChild(
      el('button', {
        tipo: 'button',
        texto,
        clase: 'pestana' + (actual === valor ? ' pestana--activa' : ''),
        alHacerClic: () => alCambiar(valor),
      }),
    );
  }
  return caja;
}

// --- Almacén ----------------------------------------------------------------

function vistaAlmacen(refrescar) {
  const caja = div('panel');
  caja.appendChild(
    p(
      'La columna "Almacén" es material nuevo. "Retornos" es lo que volvió de ' +
        'obras terminadas. Al armar un pedido se gasta primero lo retornado.',
      'texto-tenue',
    ),
  );

  caja.appendChild(
    tabla(
      [
        {
          titulo: 'Material',
          celda: (f) => {
            const nodo = div('celda-material');
            nodo.appendChild(el('span', { texto: f.material.nombre }));
            if (f.bajoMinimo) nodo.appendChild(insignia('bajo mínimo', 'alerta'));
            return nodo;
          },
        },
        { titulo: 'Unidad', celda: (f) => f.material.unidad },
        {
          titulo: 'Almacén',
          clase: 'col-num',
          celda: (f) => entradaCantidad(f, refrescar),
        },
        {
          titulo: 'Retornos',
          clase: 'col-num col-retorno',
          celda: (f) => numero(f.retornos, 2),
        },
        { titulo: 'Total', clase: 'col-num', celda: (f) => numero(f.total, 2) },
        {
          titulo: 'Mínimo',
          clase: 'col-num',
          celda: (f) => entradaMinimo(f, refrescar),
        },
      ],
      inventario.resumen(),
    ),
  );
  return caja;
}

/** Fija la cantidad exacta: es como se hace un conteo físico. */
function entradaCantidad(fila, refrescar) {
  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: fila.almacen,
  });
  entrada.step = '0.01';
  entrada.min = '0';
  entrada.addEventListener('change', () => {
    const resultado = inventario.ajustarAlmacen(fila.material.id, entrada.value);
    if (!resultado.ok) {
      alert(resultado.error);
      entrada.value = fila.almacen;
      return;
    }
    redibujarLuego(refrescar, entrada);
  });
  return entrada;
}

function entradaMinimo(fila, refrescar) {
  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: fila.minimo,
  });
  entrada.step = '1';
  entrada.min = '0';
  entrada.addEventListener('change', () => {
    inventario.fijarMinimo(fila.material.id, entrada.value);
    redibujarLuego(refrescar, entrada);
  });
  return entrada;
}

// --- Retornos ---------------------------------------------------------------

function vistaRetornos(refrescar) {
  const caja = div('panel');
  caja.appendChild(formularioRetorno(refrescar));

  caja.appendChild(h(3, 'Lotes disponibles', 'seccion__titulo'));
  caja.appendChild(
    tabla(
      [
        {
          titulo: 'Material',
          celda: (r) => materiales.obtener(r.material)?.nombre || r.material,
        },
        { titulo: 'Cantidad', clase: 'col-num', celda: (r) => numero(r.cantidad, 2) },
        {
          titulo: 'Condición',
          celda: (r) => insignia(r.condicion, r.condicion === 'nuevo' ? 'exito' : 'neutro'),
        },
        { titulo: 'Vino de', celda: (r) => r.pedidoOrigen || '—' },
        { titulo: 'Fecha', celda: (r) => fechaCorta(r.fecha) },
        { titulo: 'Nota', celda: (r) => r.nota || '—' },
      ],
      inventario.retornosDisponibles(),
      { vacio: 'No hay material retornado disponible.' },
    ),
  );
  return caja;
}

function formularioRetorno(refrescar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Registrar material que volvió de obra' }));

  const material = seleccion(
    'Material',
    materiales.listar().map((m) => ({ valor: m.id, texto: `${m.nombre} (${m.unidad})` })),
  );
  const cantidad = campo('Cantidad', { tipo: 'number', paso: '0.01', minimo: '0' });
  const condicion = seleccion('Condición', [
    { valor: 'usado', texto: 'Usado / retazo aprovechable' },
    { valor: 'nuevo', texto: 'Nuevo, nunca se abrió' },
  ]);
  const pedido = campo('Pedido de origen', { marcador: 'PED-250824-A3F' });
  const nota = campo('Nota', { marcador: 'Media plancha, sin filos rotos' });

  const guardar = boton('Registrar retorno', () => {
    const resultado = inventario.registrarRetorno({
      material: material.entrada.value,
      cantidad: cantidad.entrada.value,
      condicion: condicion.entrada.value,
      pedidoOrigen: pedido.entrada.value || null,
      nota: nota.entrada.value,
    });
    if (!resultado.ok) {
      alert(resultado.error);
      return;
    }
    refrescar();
  }, { clase: 'boton boton--principal' });

  detalles.appendChild(
    div('rejilla rejilla--3', [
      material.campo,
      cantidad.campo,
      condicion.campo,
      pedido.campo,
      nota.campo,
    ]),
  );
  detalles.appendChild(div('cotizador__acciones', [guardar]));
  return detalles;
}

// --- Movimientos ------------------------------------------------------------

function vistaMovimientos() {
  const caja = div('panel');
  caja.appendChild(
    tabla(
      [
        { titulo: 'Fecha', celda: (m) => fechaCorta(m.fecha) },
        {
          titulo: 'Material',
          celda: (m) => materiales.obtener(m.material)?.nombre || m.material,
        },
        { titulo: 'Bolsa', celda: (m) => (m.origen === 'retorno' ? 'Retornos' : 'Almacén') },
        {
          titulo: 'Cambio',
          clase: 'col-num',
          celda: (m) => {
            const signo = m.delta > 0 ? '+' : '';
            return el('span', {
              texto: signo + numero(m.delta, 2),
              clase: m.delta > 0 ? 'texto-ok' : 'texto-peligro',
            });
          },
        },
        { titulo: 'Motivo', celda: (m) => m.motivo || '—' },
        { titulo: 'Referencia', celda: (m) => m.referencia || '—' },
      ],
      inventario.movimientos({ limite: 100 }),
      { vacio: 'Sin movimientos registrados.' },
    ),
  );
  return caja;
}
