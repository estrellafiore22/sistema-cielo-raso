// Pestaña "Precios": precios de materiales, mano de obra y rendimientos.
// Todo es editable y se guarda en este navegador.

import { el, aviso } from './ui.js';
import { catalogo, fijarPrecio, rend, fijarRend, restaurarTodo, RENDIMIENTOS_BASE } from './precios.js';

const NOMBRES_REND = {
  desperdicioPlancha: 'Desperdicio de planchas (%)', desperdicioPerfil: 'Desperdicio de perfiles (%)',
  cieloSepOmega: 'Cielo: separación de omegas (m)', cieloSepVigueta: 'Cielo: separación de viguetas (m)',
  cieloTornDw: 'Cielo: tornillos drywall por m²', cieloTornPp: 'Cielo: tornillos punta fina por m²',
  cieloCinta: 'Cielo: cinta por m² (m)', cieloMasilla: 'Cielo: masilla por m² (kg)', cieloAlambre: 'Cielo: alambre por m² (kg)',
  cieloClavoCada: 'Cielo: un clavo de disparo cada (m de perímetro)', muroSepParante: 'Muro: separación de parantes (m)',
  muroTornDwCara: 'Muro: tornillos por m² por cara', muroTornPp: 'Muro: tornillos estructura por m²',
  muroCintaCara: 'Muro: cinta por m² por cara (m)', muroMasillaCara: 'Muro: masilla por m² por cara (kg)',
  pvcSepSoporte: 'PVC: separación de soportes (m)', pvcTorn: 'PVC: tornillos por m²',
  techoClavosPorCalamina: 'Techo: clavos por calamina', techoClavo3KgPorTijeral: 'Techo: clavo 3" por tijeral (kg)',
};

const avisarCambio = () => document.dispatchEvent(new CustomEvent('dcp:precios'));
const leer = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) && x >= 0 ? x : null; };

export function construirPrecios() {
  const filas = [];
  let grupo = null;
  for (const m of catalogo()) {
    if (m.grupo !== grupo) { grupo = m.grupo; filas.push(el('tr', { clase: 'grupo' }, el('td', { colspan: 3, texto: grupo }))); }
    const nombre = el('input', { type: 'text', value: m.nombre, enterkeyhint: 'done' });
    nombre.addEventListener('change', () => { fijarPrecio(m.codigo, NaN, nombre.value.trim().slice(0, 80) || m.nombre); avisarCambio(); });
    const precio = el('input', { type: 'text', inputmode: 'decimal', value: m.precio.toFixed(2), style: 'max-width:110px', enterkeyhint: 'done' });
    precio.addEventListener('change', () => {
      const x = leer(precio.value);
      if (x === null) { precio.value = m.precio.toFixed(2); return; }
      fijarPrecio(m.codigo, x); precio.value = x.toFixed(2); estado.textContent = 'propio'; estado.className = 'nota'; avisarCambio();
    });
    const estado = el('span', { clase: m.editado ? 'nota' : 'ejemplo', texto: m.editado ? 'propio' : 'ejemplo' });
    filas.push(el('tr', {}, [el('td', {}, nombre), el('td', { texto: 'S/ por ' + m.unidad }), el('td', { clase: 'num' }, [precio, el('div', {}, estado)])]));
  }
  const R = rend();
  const filasR = Object.keys(RENDIMIENTOS_BASE).map(k => {
    const i = el('input', { type: 'text', inputmode: 'decimal', value: String(R[k]), style: 'max-width:110px', enterkeyhint: 'done' });
    i.addEventListener('change', () => { const x = leer(i.value); if (x === null || x === 0 && !k.startsWith('desperdicio')) { i.value = String(rend()[k]); return; } fijarRend(k, x); avisarCambio(); });
    return el('tr', {}, [el('td', { texto: NOMBRES_REND[k] || k }), el('td', { clase: 'num' }, i), el('td', { clase: 'nota', texto: 'típico: ' + RENDIMIENTOS_BASE[k] })]);
  });
  document.getElementById('vistaPrecios').replaceChildren(
    el('h2', { texto: 'Precios y rendimientos' }),
    el('p', { clase: 'ejemplo', texto: 'Los precios que dicen “ejemplo” son referenciales para Perú. Escribe los de tu proveedor: se guardan en este equipo.' }),
    el('div', { clase: 'tarjeta tabla-caja' }, el('table', {}, [
      el('thead', {}, el('tr', {}, [el('th', { texto: 'Material / servicio' }), el('th', { texto: 'Unidad' }), el('th', { clase: 'num', texto: 'Precio S/' })])),
      el('tbody', {}, filas),
    ])),
    el('h3', { texto: 'Rendimientos (consumo por m²)' }),
    el('div', { clase: 'tarjeta tabla-caja' }, el('table', {}, el('tbody', {}, filasR))),
    el('button', { clase: 'peligro', texto: 'Restaurar precios y rendimientos de ejemplo', onclick: () => {
      if (!confirm('¿Borrar tus precios y volver a los de ejemplo?')) return;
      restaurarTodo(); construirPrecios(); avisarCambio(); aviso('Precios de ejemplo restaurados');
    } }),
  );
}
