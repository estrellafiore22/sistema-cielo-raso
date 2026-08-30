// Captura de imagen para los comprobantes de pago.
//
// La foto se achica antes de guardarla. Una captura de Yape sale de 2 o 3 MB y
// los datos viven en el navegador, donde hay unos pocos megas en total: sin
// achicar, tres pedidos llenarían el almacenamiento.

import { div, el, p, boton } from './dom.js';
import { registrar } from '../../core/errores.js';

const LADO_MAXIMO = 900;
const CALIDAD = 0.6;

/**
 * @param {object} opciones
 *   - etiqueta: texto del campo
 *   - ayuda: texto pequeño debajo
 *   - alCambiar: (dataUrl | null) => void
 * @returns {{campo: Node, valor: () => string|null, limpiar: () => void}}
 */
export function campoImagen({ etiqueta, ayuda, alCambiar } = {}) {
  let valor = null;

  const entrada = el('input', { tipo: 'file', clase: 'entrada-archivo' });
  entrada.accept = 'image/*';
  // En el celular abre la cámara directamente.
  entrada.setAttribute('capture', 'environment');

  const vistaPrevia = div('comprobante__vista');
  const estado = p('', 'campo__ayuda');

  const quitar = boton(
    'Quitar imagen',
    () => {
      valor = null;
      entrada.value = '';
      vistaPrevia.replaceChildren();
      quitar.hidden = true;
      estado.textContent = '';
      if (alCambiar) alCambiar(null);
    },
    { clase: 'boton boton--fantasma boton--pequeno' },
  );
  quitar.hidden = true;

  entrada.addEventListener('change', async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;

    estado.textContent = 'Procesando la imagen…';
    try {
      valor = await achicar(archivo);
      vistaPrevia.replaceChildren(
        el('img', {
          clase: 'comprobante__imagen',
          atributos: { src: valor, alt: 'Comprobante de pago' },
        }),
      );
      quitar.hidden = false;
      estado.textContent = `Listo (${Math.round(valor.length / 1024)} KB).`;
      if (alCambiar) alCambiar(valor);
    } catch (error) {
      registrar('imagen.campoImagen', error);
      valor = null;
      estado.textContent = 'No se pudo leer esa imagen. Prueba con otra.';
      if (alCambiar) alCambiar(null);
    }
  });

  const campo = div('campo', [
    el('span', { clase: 'campo__etiqueta', texto: etiqueta || 'Imagen' }),
    entrada,
    ayuda ? p(ayuda, 'campo__ayuda') : null,
    estado,
    vistaPrevia,
    quitar,
  ]);

  return { campo, valor: () => valor, limpiar: () => quitar.click() };
}

/** Reduce la foto a un lado máximo y la devuelve como JPEG en base64. */
function achicar(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => rechazar(new Error('El archivo no es una imagen'));
      imagen.onload = () => {
        try {
          const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
          const lienzo = document.createElement('canvas');
          lienzo.width = Math.round(imagen.width * escala);
          lienzo.height = Math.round(imagen.height * escala);
          lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
          resolver(lienzo.toDataURL('image/jpeg', CALIDAD));
        } catch (error) {
          rechazar(error);
        }
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

/** Muestra un comprobante guardado, para el detalle del pedido. */
export function verComprobante(dataUrl) {
  if (!dataUrl) return div('');
  return div('comprobante__vista', [
    el('img', {
      clase: 'comprobante__imagen',
      atributos: { src: dataUrl, alt: 'Comprobante de pago' },
    }),
  ]);
}
