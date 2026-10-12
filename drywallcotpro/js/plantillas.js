// Casas prefabricadas típicas para empezar rápido. Todo queda editable.

import { nuevoId, cieloPorDefecto, techoPorDefecto, proyectoVacio } from './estado.js';

function muro(x1, y1, x2, y2, tipo = 'muro') {
  return { id: nuevoId(), x1, y1, x2, y2, tipo, sistema: tipo === 'tabique' ? 'drywall' : 'prefabricado',
    espesor: tipo === 'tabique' ? 0.10 : 0.12, altura: 2.40 };
}
const rect = (x0, y0, x1, y1) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
const amb = (nombre, pts, cielo = 'drywall') => ({ id: nuevoId(), nombre, puntos: pts, cielo: cieloPorDefecto(cielo) });
const vano = (m, t, tipo) => ({ id: nuevoId(), muroId: m.id, t, tipo, ancho: tipo === 'puerta' ? 0.90 : 1.20, alto: tipo === 'puerta' ? 2.10 : 1.00, alfeizar: tipo === 'puerta' ? 0 : 1.00 });

export const PLANTILLAS = {
  '6x6': { nombre: 'Casa 6 × 6 m · 1 dormitorio', crear: () => casa(6, 6, 1) },
  '6x9': { nombre: 'Casa 6 × 9 m · 2 dormitorios', crear: () => casa(6, 9, 2) },
  '7x12': { nombre: 'Casa 7.2 × 12 m · 3 dormitorios + baño', crear: () => casa(7.2, 12, 3) },
  'vacio': { nombre: 'Plano vacío (diseño de interiores)', crear: () => proyectoVacio() },
};

// Zona social adelante, dormitorios atrás, divididos por tabiques.
function casa(A, L, dorm) {
  const p = proyectoVacio();
  p.nombre = `Casa prefabricada ${A} × ${L}`;
  p.techo = techoPorDefecto();
  const ext = [muro(0, 0, A, 0), muro(A, 0, A, L), muro(A, L, 0, L), muro(0, L, 0, 0)];
  p.muros.push(...ext);
  p.aberturas.push(vano(ext[0], 0.3, 'puerta'), vano(ext[0], 0.75, 'ventana'));
  const fondo = dorm >= 3 ? 3.6 : Math.min(4, L / 2);
  const ySoc = L - fondo;
  const div = muro(0, ySoc, A, ySoc, 'tabique');
  p.muros.push(div);
  const sala = amb('Sala - comedor', rect(0, 0, A, ySoc));
  sala.cielo.niveles = [{ ancho: 0.60, altura: 2.25 }];
  p.ambientes.push(sala);
  if (dorm >= 3) { // baño y cocina en la franja del medio
    const yM = ySoc - 2.4;
    const t = muro(0, yM, A, yM, 'tabique'), t2 = muro(2.4, yM, 2.4, ySoc, 'tabique');
    p.muros.push(t, t2);
    sala.puntos = rect(0, 0, A, yM);
    p.ambientes.push(amb('Baño', rect(0, yM, 2.4, ySoc), 'pvc'), amb('Cocina', rect(2.4, yM, A, ySoc), 'baldosa'));
    p.aberturas.push(vano(t, 0.17, 'puerta'), vano(t, 0.65, 'puerta'));
  }
  const ancho = A / dorm;
  for (let i = 0; i < dorm; i++) {
    const x0 = i * ancho, x1 = (i + 1) * ancho;
    p.ambientes.push(amb('Dormitorio ' + (i + 1), rect(x0, ySoc, x1, L), i % 2 ? 'baldosa' : 'pvc'));
    if (i > 0) p.muros.push(muro(x0, ySoc, x0, L, 'tabique'));
    p.aberturas.push({ ...vano(div, (x0 + 0.6) / A, 'puerta'), ancho: 0.80 });
    p.aberturas.push(vano(ext[2], 1 - (x0 + x1) / 2 / A, 'ventana'));
  }
  return p;
}
