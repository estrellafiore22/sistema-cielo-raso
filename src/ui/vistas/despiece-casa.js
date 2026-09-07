// Desglose de precio de la casa prefabricada: tijeral+techo por un lado,
// paredes por otro, cada uno con su propio S//m².

import { div, h, el } from '../componentes/dom.js';
import { soles, numero } from '../../core/formato.js';

export function cuadroCasa(medidasCasa) {
  if (!medidasCasa) return div('');

  const caja = div('bloque bloque--resaltado');
  caja.appendChild(h(3, 'Cómo se arma el precio', 'panel__subtitulo'));

  const lista = el('dl', { clase: 'resumen__lista' });
  const filas = [
    ['Área de piso', `${numero(medidasCasa.areaPiso, 2)} m²`],
    ['Tijeral + techo', `${numero(medidasCasa.areaPiso, 2)} m² → ${soles(medidasCasa.tijeralTecho)}`],
    ['Perímetro', `${numero(medidasCasa.perimetro, 2)} ml`],
    ['Paredes', `${numero(medidasCasa.areaPared, 2)} m² → ${soles(medidasCasa.paredes)}`],
  ];
  for (const [etiqueta, valor] of filas) {
    lista.appendChild(el('dt', { texto: etiqueta }));
    lista.appendChild(el('dd', { texto: valor }));
  }
  caja.appendChild(lista);

  caja.appendChild(
    div('resumen__total', [
      el('span', { texto: 'Antes del redondeo' }),
      el('strong', { texto: soles(medidasCasa.total) }),
    ]),
  );
  return caja;
}
