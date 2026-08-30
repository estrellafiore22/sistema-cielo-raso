// Panel de separaciones y precios del cielo raso suspendido.
// Vive aparte para que la pantalla principal no se infle.

import { div, h, el, campo, boton, tabla } from '../componentes/dom.js';
import * as cfg from '../../dominio/suspendido/config.js';
import * as router from '../../core/router.js';
import { soles } from '../../core/formato.js';

/** Separaciones y precios, para que el admin los ajuste sin salir de aquí. */
export function panelAjustes(recalcular) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(
    el('summary', { texto: 'Cielo raso vinil: separaciones y precios' }),
  );

  const actual = cfg.config();
  const tarifa = cfg.precios();

  const campos = {
    distanciaLosa: campo('Caída desde la losa (cm)', {
      tipo: 'number', valor: actual.distanciaLosa, paso: '5', minimo: '1',
      ayuda: 'También se puede editar desde la tabla de materiales.',
    }),
    sobranteAmarre: campo('Sobrante de amarre por punto (cm)', {
      tipo: 'number', valor: actual.sobranteAmarre, paso: '1', minimo: '0',
      ayuda: 'Lo que se gasta amarrando el alambre arriba y abajo.',
    }),
    precioM2: campo('Precio al cliente por m² (S/)', {
      tipo: 'number', valor: actual.precioM2, paso: '0.50', minimo: '0',
      ayuda: 'Precio de lista del trabajo instalado.',
    }),
    m2PorTrabajadorDia: campo('m² por trabajador al día', {
      tipo: 'number', valor: actual.m2PorTrabajadorDia, paso: '1', minimo: '1',
      ayuda: 'El calendario lo usa para saber cuántos trabajos caben en un día.',
    }),
    pasoAlambre: campo('Separación entre puntos (cm)', {
      tipo: 'number', valor: actual.pasoAlambre, paso: '1', minimo: '10',
      ayuda: 'La norma pide 122 cm como máximo.',
    }),
    pasoClavos: campo('Separación de clavos (cm)', {
      tipo: 'number', valor: actual.pasoClavos, paso: '1', minimo: '5',
      ayuda: 'Los manuales piden 30 cm como máximo.',
    }),
    paresPorCombo: campo('Pares por combo', {
      tipo: 'number', valor: actual.paresPorCombo, paso: '1', minimo: '1',
    }),
    manoObraPorM2: campo('Mano de obra por m² (S/)', {
      tipo: 'number', valor: actual.manoObraPorM2, paso: '0.50', minimo: '0',
      ayuda: 'Se cobra solo si vendes con mano de obra. En cero no se cobra.',
    }),
    minimoSobranteUtil: campo('Sobrante mínimo útil (cm)', {
      tipo: 'number', valor: actual.minimoSobranteUtil, paso: '1', minimo: '1',
      ayuda: 'Más corto que esto se considera merma.',
    }),
  };

  detalles.appendChild(
    el('p', {
      clase: 'texto-tenue',
      texto:
        'Solo afectan al cielo raso vinil de baldosa 61 × 61. El resto de ' +
        'los trabajos se calcula con las recetas.',
    }),
  );
  detalles.appendChild(h(4, 'Separaciones', 'bloque__titulo'));
  detalles.appendChild(div('rejilla rejilla--3', Object.values(campos).map((c) => c.campo)));
  // Promociones: precios especiales que el vendedor puede elegir.
  const promos = actual.promociones || {};
  const camposPromo = {
    promo1: campo('Promoción 1 (S/ por m²)', {
      tipo: 'number', valor: promos.promo1 ?? '', paso: '0.50', minimo: '0',
    }),
    promo2: campo('Promoción 2 (S/ por m²)', {
      tipo: 'number', valor: promos.promo2 ?? '', paso: '0.50', minimo: '0',
    }),
    promo3: campo('Promoción 3 (S/ por m²)', {
      tipo: 'number', valor: promos.promo3 ?? '', paso: '0.50', minimo: '0',
    }),
  };
  detalles.appendChild(h(4, 'Promociones', 'bloque__titulo'));
  detalles.appendChild(
    el('p', {
      clase: 'texto-tenue',
      texto: 'En cero, la promoción no aparece como opción al cotizar.',
    }),
  );
  detalles.appendChild(
    div('rejilla rejilla--3', Object.values(camposPromo).map((c) => c.campo)),
  );

  // Los precios de las piezas ya no se editan aquí: viven en el catálogo de
  // Materiales, junto al resto, porque la tienda también las vende sueltas.
  detalles.appendChild(h(4, 'Precios de las piezas', 'bloque__titulo'));
  detalles.appendChild(
    el('p', {
      clase: 'texto-tenue',
      texto:
        'Se editan en Materiales, con precio de compra y de venta como ' +
        'cualquier otro material. Aquí solo se muestran los vigentes.',
    }),
  );
  detalles.appendChild(
    tabla(
      [
        { titulo: 'Pieza', celda: (f) => f.nombre },
        { titulo: 'Precio de venta', clase: 'col-num', celda: (f) => soles(f.precio) },
      ],
      Object.entries(cfg.NOMBRES)
        .filter(([clave]) => clave in tarifa)
        .map(([clave, nombre]) => ({ nombre, precio: tarifa[clave] })),
    ),
  );
  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Ir a Materiales', () => router.ir('/materiales'), {
        clase: 'boton boton--fantasma boton--pequeno',
      }),
    ]),
  );

  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Guardar y recalcular', () => {
        const cambiosCfg = {};
        for (const [clave, c] of Object.entries(campos)) cambiosCfg[clave] = c.entrada.value;
        cambiosCfg.promociones = {};
        for (const [clave, c] of Object.entries(camposPromo)) {
          cambiosCfg.promociones[clave] = c.entrada.value;
        }
        cfg.guardarConfig(cambiosCfg);

        recalcular();
      }, { clase: 'boton boton--principal' }),
    ]),
  );

  return detalles;
}
