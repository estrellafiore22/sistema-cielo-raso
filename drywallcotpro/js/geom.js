// Geometría plana pura. Sin DOM.

export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

export function largoMuro(m) { return Math.hypot(m.x2 - m.x1, m.y2 - m.y1); }

export function anguloMuro(m) { return Math.atan2(m.y2 - m.y1, m.x2 - m.x1); }

// Punto del muro a la fracción t (0 = inicio, 1 = fin).
export function puntoEn(m, t) { return { x: m.x1 + (m.x2 - m.x1) * t, y: m.y1 + (m.y2 - m.y1) * t }; }

// Proyección de p sobre el segmento: fracción t y distancia.
export function proyectar(m, p) {
  const dx = m.x2 - m.x1, dy = m.y2 - m.y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - m.x1) * dx + (p.y - m.y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q = puntoEn(m, t);
  return { t, d: dist(p, q), punto: q };
}

export function areaPoligono(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function perimetro(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) s += dist(pts[i], pts[(i + 1) % pts.length]);
  return s;
}

export function centroide(pts) {
  let x = 0, y = 0;
  pts.forEach(p => { x += p.x; y += p.y; });
  return { x: x / pts.length, y: y / pts.length };
}

export function cajaDe(pts) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  return { x0, y0, x1, y1, ancho: x1 - x0, largo: y1 - y0 };
}

export function dentro(p, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// Un ambiente es "rectangular" si tiene 4 esquinas alineadas a los ejes.
// Los cielos por niveles y las cuadrículas se calculan sobre ese rectángulo.
export function esRectangulo(pts) {
  if (pts.length !== 4) return false;
  const c = cajaDe(pts), tol = 0.005;
  return pts.every(p => (Math.abs(p.x - c.x0) < tol || Math.abs(p.x - c.x1) < tol) &&
                        (Math.abs(p.y - c.y0) < tol || Math.abs(p.y - c.y1) < tol));
}

export function redondearA(v, paso) { return paso > 0 ? Math.round(v / paso) * paso : v; }

// Lleva el punto final a la horizontal o vertical más cercana.
export function ortogonal(a, b) {
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
}
