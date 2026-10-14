// Cabecera, menú de navegación y pie. Se redibuja cuando cambia la sesión.

import { el, div, boton } from './dom.js';
import * as auth from '../../core/auth.js';
import * as router from '../../core/router.js';
import * as cola from '../../impresion/cola-impresion.js';
import * as bd from '../../core/bd.js';

export function montar({ cabecera, navegacion }) {
  dibujarCabecera(cabecera);
  dibujarNavegacion(navegacion);
}

function dibujarCabecera(contenedor) {
  contenedor.replaceChildren();
  const tienda = bd.config('tienda', {});
  const sesion = auth.sesion();

  const marca = div('cabecera__marca', [
    // Logo de la tienda: versión para fondo claro y para fondo oscuro (la CSS elige).
    el('img', { clase: 'cabecera__logo cabecera__logo--claro', atributos: { src: 'assets/img/logo-claro.png', alt: tienda.nombre || 'Multiservicios DECscorp' } }),
    el('img', { clase: 'cabecera__logo cabecera__logo--oscuro', atributos: { src: 'assets/img/logo-oscuro.png', alt: tienda.nombre || 'Multiservicios DECscorp' } }),
  ]);

  const derecha = div('cabecera__derecha');

  const pendientes = cola.totalPendientes();
  if (pendientes > 0 && auth.puede('boleta:admin:imprimir')) {
    derecha.appendChild(
      boton(`🖨️ ${pendientes} por imprimir`, () => router.ir('/impresion'), {
        clase: 'boton boton--alerta boton--pequeno',
      }),
    );
  }

  if (sesion) {
    derecha.appendChild(
      div('cabecera__usuario', [
        el('span', { clase: 'cabecera__usuario-nombre', texto: sesion.nombre }),
        el('span', { clase: 'cabecera__usuario-rol', texto: sesion.rol }),
      ]),
    );
    derecha.appendChild(
      boton(
        'Salir',
        () => {
          auth.salir();
          window.location.reload();
        },
        { clase: 'boton boton--fantasma boton--pequeno' },
      ),
    );
  }

  contenedor.append(marca, derecha);
}

function dibujarNavegacion(contenedor) {
  contenedor.replaceChildren();
  if (!auth.autenticado()) return;

  const actual = router.rutaActual();
  const lista = el('ul', { clase: 'nav__lista' });

  for (const ruta of router.rutasVisibles()) {
    const enlace = el('a', {
      clase: 'nav__enlace' + (ruta.camino === actual ? ' nav__enlace--activo' : ''),
      href: '#' + ruta.camino,
      texto: ruta.titulo,
    });
    if (ruta.icono) enlace.dataset.icono = ruta.icono;
    lista.appendChild(el('li', {}, [enlace]));
  }

  contenedor.appendChild(lista);
}

/** Se vuelve a llamar en cada cambio de ruta para marcar el enlace activo. */
export function refrescar({ cabecera, navegacion }) {
  dibujarCabecera(cabecera);
  dibujarNavegacion(navegacion);
}
