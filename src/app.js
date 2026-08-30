// Arranque del sistema.
//
// Orden: capturar errores → migrar datos → sembrar → sesión → rutas → pintar.
// Si algo falla aquí, se muestra una pantalla de emergencia en vez de dejar la
// página en blanco.

import * as errores from './core/errores.js';
import * as bd from './core/bd.js';
import * as migraciones from './core/migraciones.js';
import { sembrar } from './core/semilla.js';
import * as auth from './core/auth.js';
import * as router from './core/router.js';
import * as layout from './ui/componentes/layout.js';
import * as cola from './impresion/cola-impresion.js';
import * as respaldo from './core/respaldo.js';

import * as vistaIngreso from './ui/vistas/ingreso.js';
import * as vistaInicio from './ui/vistas/inicio.js';
import * as vistaCotizador from './ui/vistas/cotizador.js';
import * as vistaPedidos from './ui/vistas/pedidos.js';
import * as vistaCalendario from './ui/vistas/calendario.js';
import * as vistaInventario from './ui/vistas/inventario.js';
import * as vistaMateriales from './ui/vistas/materiales.js';
import * as vistaRecetas from './ui/vistas/recetas.js';
import * as vistaPersonal from './ui/vistas/personal.js';
import * as vistaImpresion from './ui/vistas/impresion.js';
import * as vistaAjustes from './ui/vistas/ajustes.js';
import * as vistaDiagnostico from './ui/vistas/diagnostico.js';

const RUTAS = [
  ['/', { titulo: 'Inicio', vista: (c) => vistaInicio.montar(c) }],
  ['/cotizador', { titulo: 'Nuevo pedido', permiso: 'pedido:crear', vista: (c) => vistaCotizador.montar(c) }],
  ['/pedidos', { titulo: 'Pedidos', permiso: 'pedido:propio:ver', vista: (c) => vistaPedidos.montar(c) }],
  ['/calendario', { titulo: 'Calendario', permiso: 'calendario:editar', vista: (c) => vistaCalendario.montar(c) }],
  ['/inventario', { titulo: 'Inventario', permiso: 'inventario:editar', vista: (c) => vistaInventario.montar(c) }],
  ['/materiales', { titulo: 'Materiales', permiso: 'material:editar', vista: (c) => vistaMateriales.montar(c) }],
  ['/recetas', { titulo: 'Recetas', permiso: 'receta:editar', vista: (c) => vistaRecetas.montar(c) }],
  ['/personal', { titulo: 'Personal', permiso: 'personal:editar', vista: (c) => vistaPersonal.montar(c) }],
  ['/impresion', { titulo: 'Impresión', permiso: 'boleta:admin:imprimir', vista: (c) => vistaImpresion.montar(c) }],
  ['/ajustes', { titulo: 'Ajustes', permiso: 'ajustes:editar', vista: (c) => vistaAjustes.montar(c) }],
  ['/diagnostico', { titulo: 'Diagnóstico', permiso: 'diagnostico:ver', vista: (c) => vistaDiagnostico.montar(c) }],
];

function arrancar() {
  errores.instalar();

  const raiz = document.getElementById('app');
  const cabecera = document.getElementById('cabecera');
  const navegacion = document.getElementById('navegacion');

  try {
    migraciones.aplicar();
    sembrar();
  } catch (error) {
    errores.registrar('arranque.datos', error);
    pantallaEmergencia(raiz, error);
    return;
  }

  auth.iniciar();

  if (!auth.autenticado()) {
    document.body.classList.add('sin-sesion');
    vistaIngreso.montar(raiz, {
      alEntrar: () => {
        document.body.classList.remove('sin-sesion');
        iniciarAplicacion(raiz, cabecera, navegacion);
      },
    });
    return;
  }

  iniciarAplicacion(raiz, cabecera, navegacion);
}

function iniciarAplicacion(raiz, cabecera, navegacion) {
  for (const [camino, config] of RUTAS) router.registrarRuta(camino, config);

  layout.montar({ cabecera, navegacion });

  router.iniciar({
    montarEn: raiz,
    porDefecto: '/',
    alCambiarRuta: () => layout.refrescar({ cabecera, navegacion }),
  });

  // Foto de los datos antes de tocar nada, una vez al día.
  respaldo.automatico();

  // Avisa si quedaron boletas sin imprimir de la sesión anterior.
  cola.revisarAlArrancar();
}

/** Última red de seguridad: si ni los datos cargan, al menos explica qué pasó. */
function pantallaEmergencia(raiz, error) {
  raiz.replaceChildren();

  const caja = document.createElement('div');
  caja.className = 'pantalla-vacia';

  const titulo = document.createElement('h2');
  titulo.textContent = 'El sistema no pudo arrancar';

  const detalle = document.createElement('p');
  detalle.textContent = error?.message || 'Error desconocido';

  const ayuda = document.createElement('p');
  ayuda.className = 'texto-tenue';
  ayuda.textContent =
    'Suele pasar cuando los datos guardados quedaron corruptos. Borrarlos ' +
    'devuelve el sistema a cero, pero se pierde todo lo registrado.';

  const boton = document.createElement('button');
  boton.className = 'boton boton--peligro';
  boton.textContent = 'Borrar datos y reiniciar';
  boton.onclick = async () => {
    if (!confirm('Se borrará todo lo guardado. ¿Continuar?')) return;
    const almacen = await import('./core/almacenamiento.js');
    almacen.vaciar();
    window.location.reload();
  };

  caja.append(titulo, detalle, ayuda, boton);
  raiz.appendChild(caja);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}
