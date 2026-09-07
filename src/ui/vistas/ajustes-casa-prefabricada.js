// Ajustes: precios de la casa prefabricada.

import { div, h, p, campo, boton, exito } from '../componentes/dom.js';
import * as casaPrefabricada from '../../dominio/casa-prefabricada.js';

export function seccionCasaPrefabricada() {
  const actual = casaPrefabricada.config();
  const panel = div('panel');
  panel.appendChild(h(3, 'Casa prefabricada: precios', 'panel__titulo'));
  panel.appendChild(
    p(
      'Tijeral + techo se cobra por m² de piso. Las paredes, por m² de ' +
        'perímetro × altura (perímetro = la suma de los 4 lados).',
      'texto-tenue',
    ),
  );

  const campos = {
    precioTijeralTechoM2: campo('Tijeral + techo (S/ por m² de piso)', {
      tipo: 'number', paso: '1', minimo: '0', valor: actual.precioTijeralTechoM2,
    }),
    precioParedM2: campo('Pared (S/ por m²)', {
      tipo: 'number', paso: '1', minimo: '0', valor: actual.precioParedM2,
    }),
    alturaPared: campo('Altura de pared (m)', {
      tipo: 'number', paso: '0.10', minimo: '0', valor: actual.alturaPared,
    }),
  };

  panel.appendChild(div('rejilla rejilla--3', Object.values(campos).map((c) => c.campo)));

  const aviso = div('');
  panel.appendChild(
    div('cotizador__acciones', [
      boton('Guardar', () => {
        const cambios = {};
        for (const [clave, c] of Object.entries(campos)) cambios[clave] = c.entrada.value;
        casaPrefabricada.guardarConfig(cambios);
        aviso.replaceChildren(exito('Guardado.'));
        setTimeout(() => aviso.replaceChildren(), 3000);
      }, { clase: 'boton boton--principal' }),
      aviso,
    ]),
  );

  return panel;
}
