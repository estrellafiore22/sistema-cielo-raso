// Trabajadores de la tienda.

import { div, h, p, el, campo, seleccion, boton, tabla, insignia, redibujarLuego } from '../componentes/dom.js';
import * as personal from '../../dominio/personal.js';
import { soles } from '../../core/formato.js';

export function montar(contenedor) {
  let mostrarInactivos = false;

  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Personal', 'vista__titulo'));
    contenedor.appendChild(
      p(
        'El calendario reparte a esta gente entre los trabajos. Un trabajador ' +
          'solo puede estar en un trabajo por día.',
        'texto-tenue',
      ),
    );

    contenedor.appendChild(formularioNuevo(dibujar));
    contenedor.appendChild(
      div('barra-filtros', [
        boton(
          mostrarInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos',
          () => {
            mostrarInactivos = !mostrarInactivos;
            dibujar();
          },
          { clase: 'boton boton--fantasma boton--pequeno' },
        ),
      ]),
    );

    contenedor.appendChild(
      tabla(
        [
          {
            titulo: 'Nombre',
            celda: (t) => {
              const caja = div('celda-material');
              caja.appendChild(el('span', { texto: t.nombre }));
              if (t.activo === false) caja.appendChild(insignia('inactivo', 'peligro'));
              return caja;
            },
          },
          { titulo: 'Especialidad', celda: (t) => insignia(t.especialidad) },
          { titulo: 'Teléfono', celda: (t) => t.telefono || '—' },
          {
            titulo: 'Pago diario',
            clase: 'col-num',
            celda: (t) => entradaPago(t, dibujar),
          },
          {
            titulo: '',
            clase: 'col-accion',
            celda: (t) =>
              t.activo === false
                ? boton('Reactivar', () => {
                    personal.reactivar(t.id);
                    dibujar();
                  }, { clase: 'boton boton--fantasma boton--pequeno' })
                : boton('Desactivar', () => {
                    if (confirm(`¿Desactivar a ${t.nombre}?`)) {
                      personal.desactivar(t.id);
                      dibujar();
                    }
                  }, { clase: 'boton boton--fantasma boton--pequeno' }),
          },
        ],
        personal.listar({ soloActivos: !mostrarInactivos }),
        { vacio: 'Todavía no hay trabajadores registrados.' },
      ),
    );
  }

  dibujar();
}

function entradaPago(trabajador, refrescar) {
  const entrada = el('input', {
    tipo: 'number',
    clase: 'entrada-mini',
    valor: trabajador.pagoDiario,
  });
  entrada.step = '1';
  entrada.min = '0';
  entrada.addEventListener('change', () => {
    personal.editar(trabajador.id, { pagoDiario: entrada.value });
    redibujarLuego(refrescar);
  });
  return entrada;
}

function formularioNuevo(refrescar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Agregar trabajador' }));

  const nombre = campo('Nombre completo', { requerido: true });
  const especialidad = seleccion(
    'Especialidad',
    personal.ESPECIALIDADES.map((e) => ({ valor: e, texto: e })),
  );
  const telefono = campo('Teléfono', { tipo: 'tel' });
  const pago = campo('Pago diario (S/)', { tipo: 'number', paso: '1', minimo: '0', valor: 0 });

  detalles.appendChild(
    div('rejilla rejilla--4', [nombre.campo, especialidad.campo, telefono.campo, pago.campo]),
  );
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        const resultado = personal.crear({
          nombre: nombre.entrada.value,
          especialidad: especialidad.entrada.value,
          telefono: telefono.entrada.value,
          pagoDiario: pago.entrada.value,
        });
        if (!resultado.ok) {
          alert(resultado.error);
          return;
        }
        nombre.entrada.value = '';
        telefono.entrada.value = '';
        refrescar();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
  return detalles;
}
