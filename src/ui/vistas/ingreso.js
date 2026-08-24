// Pantalla de ingreso.

import { el, div, p, h, campo, boton, error } from '../componentes/dom.js';
import * as auth from '../../core/auth.js';
import * as bd from '../../core/bd.js';

export function montar(contenedor, { alEntrar }) {
  contenedor.replaceChildren();
  const tienda = bd.config('tienda', {});

  const usuario = campo('Usuario', { marcador: 'admin', requerido: true });
  const clave = campo('Contraseña', { tipo: 'password', requerido: true });
  const zonaError = div('ingreso__error');

  const formulario = el(
    'form',
    {
      clase: 'ingreso__formulario',
      alEnviar: (evento) => {
        evento.preventDefault();
        zonaError.replaceChildren();

        const resultado = auth.entrar(
          usuario.entrada.value,
          clave.entrada.value,
        );
        if (!resultado.ok) {
          zonaError.appendChild(error(resultado.error));
          clave.entrada.value = '';
          clave.entrada.focus();
          return;
        }
        alEntrar(resultado.sesion);
      },
    },
    [
      usuario.campo,
      clave.campo,
      zonaError,
      boton('Entrar', null, { clase: 'boton boton--principal boton--ancho', tipo: 'submit' }),
    ],
  );

  const tarjeta = div('ingreso__tarjeta', [
    el('span', { clase: 'ingreso__logo', texto: '▦' }),
    h(1, tienda.nombre || 'Cielo Raso & Drywall', 'ingreso__titulo'),
    p('Sistema de ventas e inventario', 'ingreso__subtitulo'),
    formulario,
    ayudaPrimerUso(),
  ]);

  contenedor.appendChild(div('ingreso', [tarjeta]));
  usuario.entrada.focus();
}

/**
 * Solo se muestra mientras las contraseñas sigan siendo las de fábrica.
 * En cuanto el administrador las cambia, este bloque desaparece.
 */
function ayudaPrimerUso() {
  const usuarios = bd.todos('usuarios');
  const sinCambiar = usuarios.filter((u) => u.clave === u.usuario);
  if (sinCambiar.length === 0) return div('');

  const caja = div('ingreso__ayuda');
  caja.appendChild(p('Accesos iniciales (cámbialos en Ajustes):', 'ingreso__ayuda-titulo'));
  const lista = el('ul', { clase: 'ingreso__ayuda-lista' });
  for (const u of sinCambiar) {
    lista.appendChild(el('li', { texto: `${u.usuario} / ${u.clave} — ${u.rol}` }));
  }
  caja.appendChild(lista);
  return caja;
}
