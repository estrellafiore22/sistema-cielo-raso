// Panel de separaciones y precios del cielo raso suspendido.
// Vive aparte para que la pantalla principal no se infle.

import { div, h, el, campo, boton } from '../componentes/dom.js';
import * as cfg from '../../dominio/suspendido/config.js';

/** Separaciones y precios, para que el admin los ajuste sin salir de aquí. */
export function panelAjustes(recalcular) {
  const detalles = el('details', { clase: 'panel panel--plegable' });
  detalles.appendChild(
    el('summary', { texto: 'Cielo raso 61 × 61: separaciones y precios' }),
  );

  const actual = cfg.config();
  const tarifa = cfg.precios();

  const campos = {
    cmAlambrePorPunto: campo('Alambre por punto (cm)', {
      tipo: 'number', valor: actual.cmAlambrePorPunto, paso: '5', minimo: '1',
      ayuda: 'Depende de qué tan abajo va el cielo raso.',
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

  const preciosCampos = {};
  for (const [clave, nombre] of Object.entries(cfg.NOMBRES)) {
    if (!(clave in tarifa)) continue;
    preciosCampos[clave] = campo(`${nombre} (S/)`, {
      tipo: 'number', valor: tarifa[clave], paso: '0.10', minimo: '0',
    });
  }

  detalles.appendChild(
    el('p', {
      clase: 'texto-tenue',
      texto:
        'Solo afectan al cielo raso suspendido de baldosa 61 × 61. El resto ' +
        'de los trabajos se calcula con las recetas.',
    }),
  );
  detalles.appendChild(h(4, 'Separaciones', 'bloque__titulo'));
  detalles.appendChild(div('rejilla rejilla--3', Object.values(campos).map((c) => c.campo)));
  detalles.appendChild(h(4, 'Precios unitarios', 'bloque__titulo'));
  detalles.appendChild(
    div('rejilla rejilla--3', Object.values(preciosCampos).map((c) => c.campo)),
  );

  detalles.appendChild(
    div('cotizador__acciones', [
      boton('Guardar y recalcular', () => {
        const cambiosCfg = {};
        for (const [clave, c] of Object.entries(campos)) cambiosCfg[clave] = c.entrada.value;
        cfg.guardarConfig(cambiosCfg);

        const cambiosPrecio = {};
        for (const [clave, c] of Object.entries(preciosCampos)) {
          cambiosPrecio[clave] = c.entrada.value;
        }
        cfg.guardarPrecios(cambiosPrecio);

        recalcular();
      }, { clase: 'boton boton--principal' }),
    ]),
  );

  return detalles;
}
