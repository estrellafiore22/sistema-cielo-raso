// Optimizador de cortes en una dimensión (primero el más largo que quepa).
// Sirve para láminas de PVC, perfiles, ángulos y madera.

// piezas: largos en metros. largoBarra: largo comercial.
// Una pieza más larga que la barra se arma con barras enteras más un resto
// (empalme), y solo el resto entra al reparto.
export function cortar(piezas, largoBarra, { corte = 0.003 } = {}) {
  const barras = [];
  const resto = [];
  for (const p of piezas) {
    if (p <= 0.001) continue;
    let l = p;
    while (l > largoBarra + 1e-9) { barras.push({ piezas: [largoBarra], sobra: 0, empalme: true }); l -= largoBarra; }
    if (l > 0.001) resto.push(l);
  }
  resto.sort((a, b) => b - a);
  const abiertas = [];
  for (const p of resto) {
    let mejor = null;
    for (const b of abiertas) {
      const necesita = p + (b.piezas.length ? corte : 0);
      if (b.sobra + 1e-9 >= necesita && (!mejor || b.sobra < mejor.sobra)) mejor = b;
    }
    if (!mejor) { mejor = { piezas: [], sobra: largoBarra }; abiertas.push(mejor); }
    mejor.sobra -= p + (mejor.piezas.length ? corte : 0);
    mejor.piezas.push(p);
  }
  return [...barras, ...abiertas];
}

// Agrupa barras iguales para mostrarlas: "6 × [2.80 + 2.80] sobra 0.35".
export function resumenCortes(barras, fmt = v => v.toFixed(2)) {
  const grupos = new Map();
  for (const b of barras) {
    const clave = b.piezas.map(fmt).join(' + ') + (b.empalme ? ' (entera, empalme)' : '');
    const g = grupos.get(clave) || { n: 0, sobra: b.sobra, clave };
    g.n++; grupos.set(clave, g);
  }
  return [...grupos.values()].map(g => `${g.n} × [${g.clave}]` + (g.sobra > 0.005 ? ` sobra ${fmt(g.sobra)}` : ''));
}

export function largoTotal(barras) { return barras.reduce((s, b) => s + b.piezas.reduce((x, y) => x + y, 0), 0); }
