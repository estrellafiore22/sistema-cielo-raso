// Plano interactivo: acercar con la rueda del ratón o pellizcando la pantalla,
// arrastrar para mover, y un botón para volver a encuadrar.
//
// Cada vez que cambian las medidas se vuelve a dibujar y queda encuadrado
// completo, listo para acercar.

import { el, div, boton } from './dom.js';
import { construir } from './plano-dibujo.js';
import { COLORES, NOMBRES } from '../../dominio/suspendido/config.js';

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 14;
const TEXTO_PX = 12;
// Fracción de la ventana que el plano tiene que seguir ocupando, pase lo que
// pase, para que no se pueda arrastrar hasta perderlo.
const VISIBLE_MINIMO = 0.4;

export function crear(grid) {
  const contenedor = div('plano');
  let camara = null;
  let etiquetas = null;
  let raizSvg = null;

  let k = 1;
  let tx = 0;
  let ty = 0;

  const punteros = new Map();
  let pellizcoPrevio = 0;
  let cajaContenido = null;

  function aplicar() {
    if (!camara) return;
    limitar();
    camara.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    ajustarTexto();
  }

  /**
   * Impide arrastrar el plano hasta perderlo de vista.
   *
   * No lo encierra: exigir que entre completo movería el encuadre inicial,
   * porque las cotas sobresalen un poco del marco. Lo que se exige es que
   * siempre quede a la vista un buen pedazo, así siempre se sabe dónde está
   * y se puede volver arrastrando.
   */
  function limitar() {
    const caja = contenido();
    if (!caja || !raizSvg) return;

    const vista = raizSvg.viewBox.baseVal;
    tx = entre(tx, caja.x, caja.width, vista.width);
    ty = entre(ty, caja.y, caja.height, vista.height);
  }

  function entre(valor, inicio, largo, ventana) {
    // Nunca menos de esto asomando; con un plano diminuto, el plano entero.
    const minimoVisible = Math.min(ventana * VISIBLE_MINIMO, k * largo);
    const bajo = minimoVisible - k * (inicio + largo);
    const alto = ventana - minimoVisible - k * inicio;
    return Math.min(Math.max(valor, Math.min(bajo, alto)), Math.max(bajo, alto));
  }

  /** Medidas del dibujo, sin la cámara aplicada. Se calculan una sola vez. */
  function contenido() {
    if (cajaContenido || !camara) return cajaContenido;
    try {
      const b = camara.getBBox();
      if (b.width > 0 && b.height > 0) cajaContenido = b;
    } catch {
      // getBBox falla si el nodo todavía no está pintado; se reintenta luego.
    }
    return cajaContenido;
  }

  /** El texto se mantiene del mismo tamaño en pantalla al acercar. */
  function ajustarTexto() {
    if (!etiquetas || !raizSvg) return;
    const anchoPx = raizSvg.getBoundingClientRect().width;
    const anchoCaja = Number(raizSvg.viewBox.baseVal.width) || 1;
    const escalaBase = anchoPx > 0 ? anchoPx / anchoCaja : 1;
    const tamano = TEXTO_PX / Math.max(escalaBase * k, 0.0001);
    etiquetas.setAttribute('font-size', tamano.toFixed(2));
  }

  function ajustar() {
    k = 1;
    tx = 0;
    ty = 0;
    aplicar();
  }

  /** Acerca manteniendo fijo el punto del plano que está bajo el cursor. */
  function zoomEn(puntoCaja, factor) {
    const nuevo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k * factor));
    if (nuevo === k) return;
    tx = puntoCaja.x - ((puntoCaja.x - tx) * nuevo) / k;
    ty = puntoCaja.y - ((puntoCaja.y - ty) * nuevo) / k;
    k = nuevo;
    aplicar();
  }

  /** Pasa coordenadas de pantalla a coordenadas del viewBox. */
  function aCaja(evento) {
    const ctm = raizSvg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function conectar(svgNodo) {
    svgNodo.addEventListener(
      'wheel',
      (evento) => {
        evento.preventDefault();
        zoomEn(aCaja(evento), evento.deltaY < 0 ? 1.15 : 1 / 1.15);
      },
      { passive: false },
    );

    svgNodo.addEventListener('pointerdown', (evento) => {
      svgNodo.setPointerCapture(evento.pointerId);
      punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
      svgNodo.classList.add('plano__svg--arrastrando');
    });

    svgNodo.addEventListener('pointermove', (evento) => {
      if (!punteros.has(evento.pointerId)) return;
      const anterior = punteros.get(evento.pointerId);
      punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

      if (punteros.size === 1) {
        // Arrastrar: se mueve tanto como el dedo, en unidades del viewBox.
        const ctm = raizSvg.getScreenCTM();
        const escala = ctm ? ctm.a : 1;
        tx += (evento.clientX - anterior.x) / escala;
        ty += (evento.clientY - anterior.y) / escala;
        aplicar();
        return;
      }

      if (punteros.size === 2) {
        const [a, b] = Array.from(punteros.values());
        const distancia = Math.hypot(a.x - b.x, a.y - b.y);
        if (pellizcoPrevio > 0) {
          const centro = aCaja({
            clientX: (a.x + b.x) / 2,
            clientY: (a.y + b.y) / 2,
          });
          zoomEn(centro, distancia / pellizcoPrevio);
        }
        pellizcoPrevio = distancia;
      }
    });

    const soltar = (evento) => {
      punteros.delete(evento.pointerId);
      if (punteros.size < 2) pellizcoPrevio = 0;
      if (punteros.size === 0) svgNodo.classList.remove('plano__svg--arrastrando');
    };
    svgNodo.addEventListener('pointerup', soltar);
    svgNodo.addEventListener('pointercancel', soltar);
    svgNodo.addEventListener('pointerleave', soltar);
  }

  function dibujar(nuevoGrid) {
    contenedor.replaceChildren();
    if (!nuevoGrid) {
      contenedor.appendChild(
        el('p', { clase: 'texto-tenue', texto: 'Ingresa las medidas para ver el plano.' }),
      );
      return;
    }

    const partes = construir(nuevoGrid);
    camara = partes.camara;
    etiquetas = partes.etiquetas;
    raizSvg = partes.raiz;
    cajaContenido = null;

    const lienzo = div('plano__lienzo', [raizSvg]);
    contenedor.append(barraHerramientas(), lienzo, leyenda());

    conectar(raizSvg);
    ajustar();
    // El plano recién entra al documento aquí: hasta ahora getBBox no medía.
    requestAnimationFrame(aplicar);

    // El texto depende del ancho real en pantalla, que cambia al girar el
    // celular o al redimensionar la ventana.
    if (typeof ResizeObserver !== 'undefined') {
      const observador = new ResizeObserver(() => ajustarTexto());
      observador.observe(lienzo);
    }
    requestAnimationFrame(ajustarTexto);
  }

  function barraHerramientas() {
    return div('plano__barra', [
      el('span', { clase: 'plano__ayuda', texto: 'Rueda o pellizca para acercar · arrastra para mover' }),
      div('plano__acciones', [
        boton('−', () => zoomEn(centroCaja(), 1 / 1.3), { clase: 'boton boton--pequeno' }),
        boton('+', () => zoomEn(centroCaja(), 1.3), { clase: 'boton boton--pequeno' }),
        boton('Ajustar', ajustar, { clase: 'boton boton--secundario boton--pequeno' }),
      ]),
    ]);
  }

  function centroCaja() {
    const caja = raizSvg.viewBox.baseVal;
    return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
  }

  dibujar(grid);

  return {
    nodo: contenedor,
    actualizar: dibujar,
    ajustar,
  };
}

function leyenda() {
  const items = [
    ['perimetral', NOMBRES.perimetral],
    ['principal', NOMBRES.principal],
    ['secundaria', NOMBRES.secundaria],
    ['terciaria', NOMBRES.terciaria],
  ];
  const caja = div('plano__leyenda');
  for (const [clave, nombre] of items) {
    const muestra = el('span', { clase: 'plano__muestra plano__muestra--' + clave });
    muestra.style.background = COLORES[clave];
    caja.appendChild(div('plano__leyenda-item', [muestra, el('span', { texto: nombre })]));
  }
  caja.appendChild(
    div('plano__leyenda-item', [
      el('span', { clase: 'plano__muestra plano__muestra--corte' }),
      el('span', { texto: 'Baldosa recortada' }),
    ]),
  );
  caja.appendChild(
    div('plano__leyenda-item', [
      el('span', { clase: 'plano__muestra plano__muestra--punto' }),
      el('span', { texto: 'Punto de alambre' }),
    ]),
  );
  return caja;
}

/** Versión estática, sin controles, para las boletas impresas. */
export function estatico(grid) {
  if (!grid) return div('');
  const partes = construir(grid);
  partes.etiquetas.setAttribute('font-size', 16);
  return div('plano plano--impreso', [div('plano__lienzo', [partes.raiz]), leyenda()]);
}
