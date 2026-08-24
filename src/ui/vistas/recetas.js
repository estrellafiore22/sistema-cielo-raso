// Recetas: cuánto material entra en cada m². Aquí el maestro ajusta el sistema
// a cómo trabaja de verdad.

import { div, h, p, el, campo, seleccion, boton, tabla, redibujarLuego } from '../componentes/dom.js';
import * as recetas from '../../dominio/recetas.js';
import * as materiales from '../../dominio/materiales.js';
import { soles, numero } from '../../core/formato.js';

export function montar(contenedor) {
  let activa = recetas.listar()[0]?.id || null;

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Recetas por m²', 'vista__titulo'));
    contenedor.appendChild(
      p(
        'Estos números deciden cuánto material se lleva a cada obra y cuánto ' +
          'cuesta el m². Ajústalos a cómo trabajan tus maestros.',
        'texto-tenue',
      ),
    );

    const lista = recetas.listar();
    contenedor.appendChild(
      div('pestanas', lista.map((r) =>
        el('button', {
          tipo: 'button',
          texto: r.nombre,
          clase: 'pestana' + (r.id === activa ? ' pestana--activa' : ''),
          alHacerClic: () => {
            activa = r.id;
            dibujar();
          },
        }),
      )),
    );

    const receta = recetas.detallada(activa);
    if (receta) contenedor.appendChild(panelReceta(receta, dibujar));
  }

  dibujar();
}

function panelReceta(receta, refrescar) {
  const caja = div('panel');
  if (receta.descripcion) caja.appendChild(p(receta.descripcion, 'texto-tenue'));

  // Mano de obra
  const manoObra = campo('Mano de obra por m² (S/)', {
    tipo: 'number',
    valor: receta.manoObraPorM2,
    paso: '0.50',
    minimo: '0',
    ayuda: 'Solo se cobra en la modalidad con instalación.',
    alCambiar: (evento) => {
      const resultado = recetas.editarManoObra(receta.id, evento.target.value);
      if (!resultado.ok) alert(resultado.error);
      redibujarLuego(refrescar);
    },
  });
  caja.appendChild(div('rejilla rejilla--2', [manoObra.campo, costoPorM2(receta)]));

  // Líneas
  caja.appendChild(h(3, 'Material por m²', 'seccion__titulo'));
  caja.appendChild(
    tabla(
      [
        { titulo: 'Material', celda: (l) => l.materialDatos?.nombre || l.material },
        { titulo: 'Unidad', celda: (l) => l.materialDatos?.unidad || '—' },
        {
          titulo: 'Por m²',
          clase: 'col-num',
          celda: (l) => entradaConsumo(receta.id, l, refrescar),
        },
        {
          titulo: 'Costo/m²',
          clase: 'col-num',
          celda: (l) => soles((l.materialDatos?.precioCompra || 0) * l.porM2),
        },
        {
          titulo: 'Venta/m²',
          clase: 'col-num',
          celda: (l) => soles((l.materialDatos?.precioVenta || 0) * l.porM2),
        },
        { titulo: 'Por qué', celda: (l) => l.nota || '—' },
        {
          titulo: '',
          clase: 'col-accion',
          celda: (l) =>
            boton('✕', () => {
              if (confirm(`¿Quitar "${l.materialDatos?.nombre}" de la receta?`)) {
                recetas.quitarLinea(receta.id, l.material);
                refrescar();
              }
            }, { clase: 'boton boton--fantasma boton--pequeno' }),
        },
      ],
      receta.lineas,
    ),
  );

  caja.appendChild(formularioLinea(receta, refrescar));
  return caja;
}

function entradaConsumo(recetaId, linea, refrescar) {
  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: linea.porM2,
  });
  entrada.step = '0.001';
  entrada.min = '0';
  entrada.addEventListener('change', () => {
    const resultado = recetas.editarLinea(recetaId, linea.material, entrada.value);
    if (!resultado.ok) {
      alert(resultado.error);
      entrada.value = linea.porM2;
      return;
    }
    redibujarLuego(refrescar);
  });
  return entrada;
}

function costoPorM2(receta) {
  let costo = 0;
  let venta = 0;
  for (const linea of receta.lineas) {
    costo += (linea.materialDatos?.precioCompra || 0) * linea.porM2;
    venta += (linea.materialDatos?.precioVenta || 0) * linea.porM2;
  }
  const conObra = venta + (Number(receta.manoObraPorM2) || 0);

  return div('bloque bloque--resaltado', [
    el('h4', { texto: 'Precio resultante por m²', clase: 'bloque__titulo' }),
    el('dl', { clase: 'resumen__lista' }, [
      el('dt', { texto: 'Costo del material' }),
      el('dd', { texto: soles(costo) }),
      el('dt', { texto: 'Venta solo material' }),
      el('dd', { texto: soles(venta) }),
      el('dt', { texto: 'Venta con mano de obra' }),
      el('dd', { texto: soles(conObra) }),
    ]),
  ]);
}

function formularioLinea(receta, refrescar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Agregar material a esta receta' }));

  const yaEstan = new Set(receta.lineas.map((l) => l.material));
  const disponibles = materiales
    .listar()
    .filter((m) => !yaEstan.has(m.id))
    .map((m) => ({ valor: m.id, texto: `${m.nombre} (${m.unidad})` }));

  if (disponibles.length === 0) {
    detalles.appendChild(p('Todos los materiales ya están en esta receta.', 'texto-tenue'));
    return detalles;
  }

  const material = seleccion('Material', disponibles);
  const consumo = campo('Consumo por m²', { tipo: 'number', paso: '0.001', minimo: '0' });
  const nota = campo('Por qué ese número', { marcador: 'Separación cada 0.40 m' });

  detalles.appendChild(div('rejilla rejilla--3', [material.campo, consumo.campo, nota.campo]));
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Agregar', () => {
        const resultado = recetas.agregarLinea(
          receta.id,
          material.entrada.value,
          consumo.entrada.value,
          nota.entrada.value,
        );
        if (!resultado.ok) {
          alert(resultado.error);
          return;
        }
        refrescar();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
  return detalles;
}
