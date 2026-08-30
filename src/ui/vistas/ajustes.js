// Ajustes: datos de la tienda, tarifas de transporte, reglas de operación,
// Google Maps, notificaciones y usuarios.

import { div, h, p, el, campo, boton, exito, tabla, seleccion, redibujarLuego } from '../componentes/dom.js';
import * as bd from '../../core/bd.js';
import * as transporte from '../../dominio/transporte.js';
import { seccionCapacidad } from './ajustes-capacidad.js';
import { seccionDivisiones } from './ajustes-divisiones.js';
import * as mapas from '../../integraciones/mapas.js';
import * as notificaciones from '../../integraciones/notificaciones.js';
import * as auth from '../../core/auth.js';
import { panelAjustes as panelSuspendido } from './suspendido-ajustes.js';

export function montar(contenedor) {
  function dibujar() {
    contenedor.replaceChildren();
    contenedor.appendChild(h(2, 'Ajustes', 'vista__titulo'));
    contenedor.appendChild(seccionTienda());
    contenedor.appendChild(seccionTransporte());
    contenedor.appendChild(seccionOperacion());
    contenedor.appendChild(seccionCapacidad());
    contenedor.appendChild(seccionDivisiones());
    contenedor.appendChild(panelSuspendido(dibujar));
    contenedor.appendChild(seccionMapas());
    contenedor.appendChild(seccionNotificaciones());
    contenedor.appendChild(seccionUsuarios(dibujar));
  }
  dibujar();
}

/** Construye una sección con campos que se guardan todos juntos. */
function seccionGuardable(titulo, descripcion, campos, alGuardar) {
  const panel = div('panel');
  panel.appendChild(h(3, titulo, 'panel__titulo'));
  if (descripcion) panel.appendChild(p(descripcion, 'texto-tenue'));

  const rejilla = div('rejilla rejilla--3');
  for (const c of campos) rejilla.appendChild(c.campo);
  panel.appendChild(rejilla);

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        alGuardar();
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );
  return panel;
}

function seccionTienda() {
  const actual = bd.config('tienda', {});
  const campos = {
    nombre: campo('Nombre de la tienda', { valor: actual.nombre || '' }),
    ruc: campo('RUC', { valor: actual.ruc || '' }),
    telefono: campo('Teléfono', { valor: actual.telefono || '' }),
    direccion: campo('Dirección', { valor: actual.direccion || '' }),
    yape: campo('Número de Yape', { valor: actual.yape || '' }),
    bancoNombre: campo('Banco', { valor: actual.bancoNombre || '' }),
    bancoCuenta: campo('N° de cuenta', { valor: actual.bancoCuenta || '' }),
    bancoCci: campo('CCI', { valor: actual.bancoCci || '' }),
  };

  return seccionGuardable(
    'Datos de la tienda',
    'Salen impresos en las boletas y se muestran al cliente al momento de pagar.',
    Object.values(campos),
    () => {
      const nuevo = {};
      for (const [clave, c] of Object.entries(campos)) nuevo[clave] = c.entrada.value.trim();
      bd.guardarConfig('tienda', nuevo);
    },
  );
}

function seccionTransporte() {
  const actual = transporte.tarifas();
  const campos = {
    tarifaBase: campo('Tarifa base por salida (S/)', {
      tipo: 'number', paso: '0.50', minimo: '0', valor: actual.tarifaBase,
    }),
    porKm: campo('Costo por kilómetro (S/)', {
      tipo: 'number', paso: '0.10', minimo: '0', valor: actual.porKm,
    }),
    kmLibres: campo('Kilómetros sin costo', {
      tipo: 'number', paso: '0.5', minimo: '0', valor: actual.kmLibres,
      ayuda: 'Dentro de este radio solo se cobra la tarifa base.',
    }),
    minimo: campo('Cobro mínimo de transporte (S/)', {
      tipo: 'number', paso: '0.50', minimo: '0', valor: actual.minimo,
    }),
  };

  return seccionGuardable(
    'Transporte',
    'Fórmula: tarifa base + (km − km libres) × costo por km. Nunca por debajo del mínimo.',
    Object.values(campos),
    () => {
      transporte.guardarTarifas({
        tarifaBase: campos.tarifaBase.entrada.value,
        porKm: campos.porKm.entrada.value,
        kmLibres: campos.kmLibres.entrada.value,
        minimo: campos.minimo.entrada.value,
      });
    },
  );
}

function seccionOperacion() {
  const actual = bd.config('operacion', {});
  const campos = {
    adelantoMinimoPct: campo('Adelanto mínimo (%)', {
      tipo: 'number', paso: '1', minimo: '0', valor: actual.adelantoMinimoPct,
      ayuda: 'Ningún pedido se acepta con menos que esto.',
    }),
    personalPorTrabajo: campo('Trabajadores por obra', {
      tipo: 'number', paso: '1', minimo: '1', valor: actual.personalPorTrabajo,
      ayuda: 'Define cuándo el calendario dice que "ya no cabe otro trabajo".',
    }),
    diasAnticipacion: campo('Días de anticipación', {
      tipo: 'number', paso: '1', minimo: '0', valor: actual.diasAnticipacion,
      ayuda: 'Con 1, el cliente no puede pedir para hoy.',
    }),
    cobroMinimo: campo('Cobro mínimo con mano de obra (S/)', {
      tipo: 'number', paso: '10', minimo: '0',
      valor: actual.cobroMinimo ?? 250,
      ayuda: 'Ninguna obra instalada se cobra por debajo de esto. Mandar al ' +
        'equipo cuesta lo mismo sea la obra grande o chica.',
    }),
  };

  return seccionGuardable('Reglas de operación', null, Object.values(campos), () => {
    bd.guardarConfig('operacion', {
      ...actual,
      adelantoMinimoPct: Number(campos.adelantoMinimoPct.entrada.value) || 0,
      personalPorTrabajo: Number(campos.personalPorTrabajo.entrada.value) || 1,
      diasAnticipacion: Number(campos.diasAnticipacion.entrada.value) || 0,
      cobroMinimo: Number(campos.cobroMinimo.entrada.value) || 0,
    });
  });
}

function seccionMapas() {
  const actual = mapas.configuracion();
  const campos = {
    origen: campo('Dirección de la tienda (punto de partida)', {
      valor: actual.origen,
      marcador: 'Av. España 1234, Trujillo, Perú',
    }),
    apiKey: campo('Clave de Google Maps', {
      tipo: 'password',
      valor: actual.apiKey,
      ayuda: 'Habilita "Distance Matrix API" y restringe la clave a tu dominio.',
    }),
  };

  const panel = seccionGuardable(
    'Google Maps',
    'Sirve para calcular la distancia sola. Sin clave el sistema pide los kilómetros a mano y funciona igual.',
    Object.values(campos),
    () => {
      mapas.guardarConfiguracion({
        origen: campos.origen.entrada.value,
        apiKey: campos.apiKey.entrada.value,
      });
    },
  );

  panel.appendChild(
    p(
      mapas.activo()
        ? '✅ Google Maps está configurado.'
        : 'ℹ️ Google Maps no está configurado. Los kilómetros se escriben a mano.',
      'texto-tenue',
    ),
  );
  return panel;
}

function seccionNotificaciones() {
  const panel = div('panel');
  panel.appendChild(h(3, 'Notificaciones', 'panel__titulo'));

  const estado = notificaciones.estadoPermiso();
  const textos = {
    granted: '✅ Las notificaciones del sistema están activas.',
    denied: '⛔ Están bloqueadas. Habilítalas desde el candado de la barra de direcciones.',
    default: 'Aún no has dado permiso.',
    no_soportado: 'Este navegador no soporta notificaciones del sistema.',
  };
  panel.appendChild(p(textos[estado], 'texto-tenue'));

  if (estado === 'default') {
    panel.appendChild(
      div('cotizador__acciones', [
        boton('Activar notificaciones', async (evento) => {
          const resultado = await notificaciones.pedirPermiso();
          alert(resultado.ok ? 'Notificaciones activadas.' : resultado.error);
          evento.target.disabled = true;
        }, { clase: 'boton boton--principal' }),
      ]),
    );
  }

  panel.appendChild(
    div('cotizador__acciones', [
      boton('Probar aviso', () => {
        notificaciones.avisar('Prueba', 'Así se ven los avisos del sistema.', {
          tipo: 'exito',
        });
      }, { clase: 'boton boton--fantasma boton--pequeno' }),
    ]),
  );
  return panel;
}

function seccionUsuarios(refrescar) {
  const panel = div('panel');
  panel.appendChild(h(3, 'Usuarios y accesos', 'panel__titulo'));
  panel.appendChild(
    p(
      'Cambia las contraseñas de fábrica. Recuerda que esto controla la ' +
        'interfaz, no protege los datos: cualquiera con acceso a esta PC puede verlos.',
      'texto-tenue',
    ),
  );

  panel.appendChild(
    tabla(
      [
        { titulo: 'Nombre', celda: (u) => u.nombre },
        { titulo: 'Usuario', celda: (u) => u.usuario },
        { titulo: 'Rol', celda: (u) => u.rol },
        {
          titulo: 'Contraseña',
          celda: (u) => {
            const entrada = el('input', { tipo: 'password', clase: 'entrada-mini', valor: u.clave });
            entrada.addEventListener('change', () => {
              if (!entrada.value.trim()) {
                alert('La contraseña no puede quedar vacía.');
                entrada.value = u.clave;
                return;
              }
              bd.actualizar('usuarios', u.id, { clave: entrada.value });
              redibujarLuego(refrescar, entrada);
            });
            return entrada;
          },
        },
      ],
      bd.todos('usuarios'),
    ),
  );

  if (auth.esProgramador()) panel.appendChild(formularioUsuario(refrescar));
  return panel;
}

function formularioUsuario(refrescar) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(el('summary', { texto: '+ Agregar usuario' }));

  const nombre = campo('Nombre');
  const usuario = campo('Usuario');
  const clave = campo('Contraseña', { tipo: 'password' });
  const rol = seleccion('Rol', auth.ROLES.map((r) => ({ valor: r, texto: r })));

  detalles.appendChild(div('rejilla rejilla--4', [nombre.campo, usuario.campo, clave.campo, rol.campo]));
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Crear usuario', () => {
        if (!nombre.entrada.value.trim() || !usuario.entrada.value.trim() || !clave.entrada.value) {
          alert('Completa nombre, usuario y contraseña.');
          return;
        }
        const existe = bd
          .todos('usuarios')
          .some((u) => u.usuario.toLowerCase() === usuario.entrada.value.trim().toLowerCase());
        if (existe) {
          alert('Ese usuario ya existe.');
          return;
        }
        bd.insertar('usuarios', {
          nombre: nombre.entrada.value.trim(),
          usuario: usuario.entrada.value.trim(),
          clave: clave.entrada.value,
          rol: rol.entrada.value,
        });
        refrescar();
      }, { clase: 'boton boton--principal' }),
    ]),
  );
  return detalles;
}
