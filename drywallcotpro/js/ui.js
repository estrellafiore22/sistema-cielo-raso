// Ayudas para construir formularios sin innerHTML con datos del usuario.
// Los campos se construyen UNA vez; `refrescar()` actualiza los valores que
// no se están editando y los datos derivados, sin destruir el campo enfocado.

export function el(tag, attrs = {}, hijos = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'texto') e.textContent = v;
    else if (k === 'clase') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(hijos) ? hijos : [hijos]).forEach(h => h != null && e.append(h instanceof Node ? h : document.createTextNode(h)));
  return e;
}

export function formulario() {
  const campos = [], derivados = [];
  return {
    // Número o texto: se confirma al salir del campo o con Enter.
    entrada(etiqueta, leer, escribir, { tipo = 'text', modo = 'decimal', nota } = {}) {
      const i = el('input', { type: tipo, inputmode: tipo === 'text' && modo ? modo : undefined, enterkeyhint: 'done' });
      i.value = leer();
      i.addEventListener('change', () => { escribir(i.value); i.value = leer(); });
      i.addEventListener('keydown', e => { if (e.key === 'Enter') i.blur(); });
      campos.push({ el: i, leer });
      return el('label', { clase: 'campo' }, [etiqueta, i, nota ? el('span', { clase: 'nota', texto: nota }) : null]);
    },
    seleccion(etiqueta, opciones, leer, escribir) {
      const s = el('select', {}, opciones.map(([v, t]) => el('option', { value: v, texto: t })));
      s.value = String(leer());
      s.addEventListener('change', () => escribir(s.value));
      campos.push({ el: s, leer: () => String(leer()) });
      return el('label', { clase: 'campo' }, [etiqueta, s]);
    },
    casilla(etiqueta, leer, escribir) {
      const c = el('input', { type: 'checkbox' }); c.checked = !!leer();
      c.addEventListener('change', () => escribir(c.checked));
      campos.push({ el: c, leer, casilla: true });
      return el('label', { clase: 'campo', style: 'flex-direction:row;align-items:center;gap:8px' }, [c, etiqueta]);
    },
    dato(etiqueta, fn) {
      const b = el('b'); derivados.push({ el: b, fn });
      try { b.textContent = fn(); } catch { b.textContent = '—'; }
      return el('div', { clase: 'dato' }, [el('span', { texto: etiqueta }), b]);
    },
    bloque(fn, clase = 'nota') {
      const d = el('div', { clase }); derivados.push({ el: d, fn, bloque: true });
      pintarBloque(d, fn);
      return d;
    },
    refrescar() {
      for (const c of campos) {
        if (c.el === document.activeElement) continue;
        try { if (c.casilla) c.el.checked = !!c.leer(); else c.el.value = c.leer(); } catch { /* objeto borrado */ }
      }
      for (const d of derivados) {
        if (d.bloque) pintarBloque(d.el, d.fn);
        else { try { d.el.textContent = d.fn(); } catch { d.el.textContent = '—'; } }
      }
    },
  };
}

function pintarBloque(d, fn) {
  let lineas = [];
  try { lineas = fn() || []; } catch { lineas = []; }
  d.replaceChildren(...lineas.map(t => el('div', { texto: t })));
}

let temporizador;
export function aviso(texto) {
  const a = document.getElementById('aviso');
  a.textContent = texto; a.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => a.classList.remove('visible'), 2600);
}

export function numero(texto) { const n = parseFloat(String(texto).replace(',', '.')); return isFinite(n) ? n : NaN; }
