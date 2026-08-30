// Boleta técnica del cielo raso suspendido.
//
// Es la hoja que se lleva el personal a la obra: el plano, qué cortar y qué
// comprar. Lleva el mismo plano que se vio en pantalla, para que nadie tenga
// que adivinar cómo se cotizó.

import * as plantilla from './plantilla.js';
import { estatico } from '../ui/componentes/plano.js';
import { soles, numero, fechaHora } from '../core/formato.js';

export function construir(calculo, datos = {}) {
  const hoja = plantilla.elemento('article', 'boleta boleta--tecnica');

  hoja.appendChild(plantilla.encabezadoTienda('Hoja técnica — cielo raso 61 × 61'));
  hoja.appendChild(cabecera(calculo, datos));

  // El plano primero: es lo que se mira en obra.
  const zonaPlano = plantilla.elemento('section', 'boleta__plano');
  zonaPlano.appendChild(plantilla.elemento('h3', null, 'Plano de la retícula'));
  zonaPlano.appendChild(estatico(calculo.grid));
  hoja.appendChild(zonaPlano);

  hoja.appendChild(tablaMaterial(calculo));
  hoja.appendChild(tablaCortes(calculo));
  hoja.appendChild(tablaSobrantes(calculo));
  hoja.appendChild(tablaPrecios(calculo));

  hoja.appendChild(
    plantilla.pie(
      'Documento interno de obra. Las medidas están en centímetros.',
    ),
  );
  return hoja;
}

function cabecera(calculo, datos) {
  const caja = plantilla.elemento('section', 'boleta__datos');
  const lista = plantilla.elemento('dl', 'boleta__lista-datos');

  const filas = [
    ['Fecha', fechaHora(calculo.calculadoEn)],
    ['Medidas', `${numero(calculo.medidas.ancho, 0)} × ${numero(calculo.medidas.largo, 0)} cm`],
    ['Área', `${numero(calculo.medidas.area, 2)} m²`],
    ['T principales', calculo.orientacion === 'vertical' ? 'Verticales' : 'Horizontales'],
    ['Puntos de alambre', `${calculo.materiales.alambre.puntos} cada ${calculo.config.pasoAlambre} cm`],
    ['Clavos', `${calculo.materiales.comboClavos.pares} pares cada ${calculo.config.pasoClavos} cm`],
  ];
  if (datos.cliente) filas.unshift(['Cliente', datos.cliente]);
  if (datos.direccion) filas.push(['Dirección', datos.direccion]);

  for (const [etiqueta, valor] of filas) {
    lista.appendChild(plantilla.elemento('dt', null, etiqueta));
    lista.appendChild(plantilla.elemento('dd', null, valor));
  }
  caja.appendChild(lista);

  if (!calculo.medidas.exactas) {
    caja.appendChild(
      plantilla.elemento(
        'p',
        'boleta__nota',
        'ATENCIÓN: se calculó a partir del área, suponiendo un ambiente ' +
          'cuadrado. Verifica las medidas reales antes de cortar.',
      ),
    );
  }
  return caja;
}

function tablaMaterial(calculo) {
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Material a llevar'));

  const filas = calculo.lineas.filter((l) => l.cantidad > 0);
  caja.appendChild(
    tabla(
      ['Material', 'Se instala', 'Piezas', 'Enteras', 'Cortadas', 'Merma', 'Comprar'],
      filas.map((l) => [
        l.nombre,
        necesario(l.material),
        String(l.material.piezas ?? '—'),
        String(l.material.piezasCompletas ?? '—'),
        String(l.material.barrasCortadas || l.material.baldosasCortadas || '—'),
        l.material.merma ? `${numero(l.material.merma, 0)} cm` : '—',
        `${l.cantidad} ${l.unidad}`,
      ]),
    ),
  );
  return caja;
}

function necesario(material) {
  if (material.clave === 'alambre') return `${numero(material.totalCm / 100, 2)} m`;
  if (material.clave === 'comboClavos') return `${material.consumo} par`;
  if (material.totalCm === null || material.totalCm === undefined) {
    return `${material.unidades} ${material.unidad}`;
  }
  // En los perfiles esto es LARGO total, no cantidad de piezas.
  const partes = [`${material.unidades} bar`];
  if (material.resto > 0) partes.push(`${numero(material.resto, 0)} cm`);
  return partes.join(' + ');
}

function tablaCortes(calculo) {
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Cortes'));

  const filas = [];
  for (const linea of calculo.lineas) {
    const m = linea.material;
    if (!m.cortes?.length) continue;
    for (const corte of m.cortes) {
      filas.push([
        m.nombre,
        `${corte.barras} × (${corte.piezas.map((x) => numero(x, 0)).join(' + ')})`,
        corte.resto > 0 ? `${numero(corte.resto, 0)} cm` : '—',
        corte.resto <= 0
          ? '—'
          : !m.conEmpate
            ? 'sirve'
            : corte.piezas.length >= 2
              ? 'merma'
              : 'sirve',
      ]);
    }
  }

  if (!filas.length) {
    caja.appendChild(plantilla.elemento('p', null, 'No hay cortes: las medidas caen justas.'));
    return caja;
  }

  caja.appendChild(tabla(['Material', 'Corte (cm)', 'Queda', 'Sobrante'], filas));

  const sust = calculo.materiales.secundaria.sustituciones;
  if (sust) caja.appendChild(plantilla.elemento('p', 'boleta__nota', sust.nota));

  return caja;
}

function tablaSobrantes(calculo) {
  const conSobrante = calculo.sobrantes.filter((s) => s.piezas.length);
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Queda para otras obras'));

  if (!conSobrante.length) {
    caja.appendChild(plantilla.elemento('p', null, 'Nada aprovechable.'));
    return caja;
  }

  const lista = plantilla.elemento('ul', 'boleta__faltantes-lista');
  for (const s of conSobrante) {
    const piezas = s.piezas.map((p) => `${p.cantidad} × ${numero(p.largo, 0)} cm`).join(' · ');
    const alcance = s.alcances
      .slice(0, 2)
      .map((a) => {
        const total = a.detalle.reduce((t, d) => t + d.recortes, 0);
        return total > 0 ? `${total} recorte(s) de ${numero(a.medida, 0)} cm` : null;
      })
      .filter(Boolean)
      .join(', ');
    lista.appendChild(
      plantilla.elemento(
        'li',
        null,
        `${s.nombre}: ${piezas}${alcance ? ` → alcanza para ${alcance}` : ''}`,
      ),
    );
  }
  caja.appendChild(lista);
  return caja;
}

function tablaPrecios(calculo) {
  const caja = plantilla.elemento('section', 'boleta__despiece');
  caja.appendChild(plantilla.elemento('h3', null, 'Precios'));

  const filas = calculo.lineas.filter((l) => l.cantidad > 0);
  caja.appendChild(
    tabla(
      ['Material', 'Cantidad', 'P. unitario', 'Subtotal'],
      filas.map((l) => [
        l.nombre,
        `${l.cantidad} ${l.unidad}`,
        l.sinPrecio ? 'sin precio' : soles(l.precioUnit),
        soles(l.subtotal),
      ]),
    ),
  );

  caja.appendChild(
    plantilla.bloqueTotales([['TOTAL DEL MATERIAL', calculo.total, { fuerte: true }]]),
  );
  return caja;
}

/** Tabla simple a partir de arreglos de texto. */
function tabla(titulos, filas) {
  const nodo = plantilla.elemento('table', 'boleta__tabla boleta__tabla--densa');

  const thead = plantilla.elemento('thead');
  const filaTitulos = plantilla.elemento('tr');
  titulos.forEach((t, i) => {
    filaTitulos.appendChild(
      plantilla.elemento('th', i === 0 ? 'col-concepto' : 'col-num', t),
    );
  });
  thead.appendChild(filaTitulos);
  nodo.appendChild(thead);

  const tbody = plantilla.elemento('tbody');
  for (const fila of filas) {
    const tr = plantilla.elemento('tr');
    fila.forEach((celda, i) => {
      tr.appendChild(plantilla.elemento('td', i === 0 ? 'col-concepto' : 'col-num', celda));
    });
    tbody.appendChild(tr);
  }
  nodo.appendChild(tbody);
  return nodo;
}
