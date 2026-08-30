// Ayudantes para construir interfaz sin escribir HTML como texto.
//
// Todo el texto entra por `textContent`, así que un nombre de cliente con
// caracteres raros nunca puede inyectar etiquetas.

/**
 * Redibuja una vista DESPUÉS de que el navegador termine el evento en curso.
 *
 * Hace falta para los campos que se editan en línea: si un manejador de
 * `change` borra y reconstruye la tabla en el acto, el navegador todavía está
 * despachando el blur del campo y falla con "the node to be removed is no
 * longer a child of this node". Aplazar un tick lo evita.
 */
export function redibujarLuego(fn, ancla = null) {
  setTimeout(() => {
    // Si la pantalla ya cambió, el campo que originó esto no está en la
    // página y no hay nada que refrescar. Redibujar aquí pintaría la vista
    // vieja encima de la nueva.
    if (ancla && !ancla.isConnected) return;

    const activo = document.activeElement;
    if (!escribiendoEn(activo)) {
      fn();
      return;
    }

    // Alguien ya está escribiendo en OTRO campo. Redibujar ahora le arranca
    // ese campo de las manos: en el escritorio se pierde el foco y en el
    // celular se cierra el teclado, así que al escribir "18" solo queda "1".
    // El dato editado ya se guardó; el redibujado espera a que suelte.
    const alSalir = () => {
      activo.removeEventListener('blur', alSalir);
      if (!activo.isConnected) return;
      redibujarLuego(fn, ancla);
    };
    activo.addEventListener('blur', alSalir);
  }, 0);
}

function escribiendoEn(nodo) {
  if (!nodo || nodo === document.body) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(nodo.tagName);
}

export function el(etiqueta, opciones = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);

  if (opciones.clase) nodo.className = opciones.clase;
  if (opciones.texto !== undefined && opciones.texto !== null) {
    nodo.textContent = String(opciones.texto);
  }
  if (opciones.id) nodo.id = opciones.id;
  if (opciones.tipo) nodo.type = opciones.tipo;
  if (opciones.valor !== undefined) nodo.value = opciones.valor;
  if (opciones.marcador) nodo.placeholder = opciones.marcador;
  if (opciones.href) nodo.href = opciones.href;
  if (opciones.deshabilitado) nodo.disabled = true;

  if (opciones.atributos) {
    for (const [clave, valor] of Object.entries(opciones.atributos)) {
      if (valor !== null && valor !== undefined) nodo.setAttribute(clave, valor);
    }
  }
  if (opciones.datos) {
    for (const [clave, valor] of Object.entries(opciones.datos)) {
      nodo.dataset[clave] = valor;
    }
  }
  if (opciones.alHacerClic) nodo.addEventListener('click', opciones.alHacerClic);
  if (opciones.alCambiar) nodo.addEventListener('change', opciones.alCambiar);
  if (opciones.alEscribir) nodo.addEventListener('input', opciones.alEscribir);
  if (opciones.alEnviar) nodo.addEventListener('submit', opciones.alEnviar);

  for (const hijo of [].concat(hijos)) {
    if (hijo) nodo.appendChild(hijo);
  }
  return nodo;
}

export const div = (clase, hijos) => el('div', { clase }, hijos);
export const p = (texto, clase) => el('p', { texto, clase });
export const h = (nivel, texto, clase) => el('h' + nivel, { texto, clase });

export function boton(texto, alHacerClic, { clase = 'boton', tipo = 'button', deshabilitado = false } = {}) {
  return el('button', { texto, clase, tipo, alHacerClic, deshabilitado });
}

/** Campo de formulario con etiqueta. Devuelve {campo, entrada}. */
export function campo(etiquetaTexto, opciones = {}) {
  const id = opciones.id || 'campo_' + Math.random().toString(36).slice(2, 8);
  const etiqueta = el('label', { texto: etiquetaTexto, clase: 'campo__etiqueta' });
  etiqueta.setAttribute('for', id);

  const entrada = el(opciones.multilinea ? 'textarea' : 'input', {
    id,
    clase: 'campo__entrada',
    tipo: opciones.multilinea ? undefined : opciones.tipo || 'text',
    valor: opciones.valor ?? '',
    marcador: opciones.marcador,
    atributos: opciones.atributos,
    alEscribir: opciones.alEscribir,
    alCambiar: opciones.alCambiar,
  });
  if (opciones.paso !== undefined) entrada.step = opciones.paso;
  if (opciones.minimo !== undefined) entrada.min = opciones.minimo;
  if (opciones.requerido) entrada.required = true;

  const contenedor = div('campo', [etiqueta, entrada]);
  if (opciones.ayuda) contenedor.appendChild(p(opciones.ayuda, 'campo__ayuda'));
  return { campo: contenedor, entrada };
}

/** Lista desplegable. `opciones` es [{valor, texto}]. */
export function seleccion(etiquetaTexto, listaOpciones, opciones = {}) {
  const id = opciones.id || 'sel_' + Math.random().toString(36).slice(2, 8);
  const etiqueta = el('label', { texto: etiquetaTexto, clase: 'campo__etiqueta' });
  etiqueta.setAttribute('for', id);

  const select = el('select', { id, clase: 'campo__entrada', alCambiar: opciones.alCambiar });
  for (const opcion of listaOpciones) {
    const nodo = el('option', { texto: opcion.texto, valor: opcion.valor });
    if (opcion.valor === opciones.valor) nodo.selected = true;
    select.appendChild(nodo);
  }

  const contenedor = div('campo', [etiqueta, select]);
  if (opciones.ayuda) contenedor.appendChild(p(opciones.ayuda, 'campo__ayuda'));
  return { campo: contenedor, entrada: select };
}

/** Tabla simple. `columnas` = [{titulo, clase, celda:(fila)=>Node|string}] */
export function tabla(columnas, filas, { vacio = 'Sin datos' } = {}) {
  if (!filas.length) return p(vacio, 'tabla-vacia');

  const thead = el('thead', {}, [
    el(
      'tr',
      {},
      columnas.map((c) => el('th', { texto: c.titulo, clase: c.clase })),
    ),
  ]);

  const tbody = el(
    'tbody',
    {},
    filas.map((fila) =>
      el(
        'tr',
        {},
        columnas.map((columna) => {
          const celda = el('td', { clase: columna.clase });
          const contenido = columna.celda(fila);
          if (contenido instanceof Node) celda.appendChild(contenido);
          else celda.textContent = contenido ?? '';
          return celda;
        }),
      ),
    ),
  );

  return el('div', { clase: 'tabla-envoltura' }, [
    el('table', { clase: 'tabla' }, [thead, tbody]),
  ]);
}

export function tarjeta(titulo, hijos, clase = '') {
  return div('tarjeta ' + clase, [h(3, titulo, 'tarjeta__titulo'), ...[].concat(hijos)]);
}

export function insignia(texto, tipo = 'neutro') {
  return el('span', { texto, clase: `insignia insignia--${tipo}` });
}

/** Mensaje de error dentro de un formulario. */
export function error(texto) {
  return p(texto, 'mensaje-error');
}

export function exito(texto) {
  return p(texto, 'mensaje-exito');
}
