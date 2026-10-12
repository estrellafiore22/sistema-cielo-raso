// Catálogo de materiales, mano de obra y rendimientos. Todos los precios son
// DE EJEMPLO y editables en la pestaña Precios; se guardan en este navegador.
//
// `unidad` es como se compra; `rinde` es cuánto trae esa unidad en la medida
// de consumo (`consumo`). Ej.: un ciento de tornillos rinde 100 tornillos.

const CLAVE = 'dcp:precios';
const CLAVE_REND = 'dcp:rendimientos';

export const MATERIALES_BASE = [
  // grupo, código, nombre, unidad, rinde, consumo, precio
  ['Drywall', 'pl-dw', 'Plancha drywall ST 1/2" 1.22 × 2.44 m', 'plancha', 2.9768, 'm²', 32.00],
  ['Drywall', 'pl-dw-rh', 'Plancha drywall RH (zona húmeda) 1/2" 1.22 × 2.44 m', 'plancha', 2.9768, 'm²', 45.00],
  ['Drywall', 'pl-fc', 'Plancha fibrocemento 6 mm 1.22 × 2.44 m', 'plancha', 2.9768, 'm²', 58.00],
  ['Perfiles', 'riel-64', 'Riel 64 mm × 3.00 m', 'pieza', 3, 'm', 9.50],
  ['Perfiles', 'par-64', 'Parante 64 mm × 3.00 m', 'pieza', 3, 'm', 11.50],
  ['Perfiles', 'riel-89', 'Riel 89 mm × 3.00 m', 'pieza', 3, 'm', 13.50],
  ['Perfiles', 'par-89', 'Parante 89 mm × 3.00 m', 'pieza', 3, 'm', 16.00],
  ['Perfiles', 'par-38', 'Parante 38 mm × 3.00 m (vigueta de cielo)', 'pieza', 3, 'm', 9.00],
  ['Perfiles', 'omega', 'Perfil omega × 3.00 m', 'pieza', 3, 'm', 8.50],
  ['Perfiles', 'angulo', 'Ángulo perimetral drywall × 3.00 m', 'pieza', 3, 'm', 6.00],
  ['Perfiles', 'esquinero', 'Esquinero metálico × 3.00 m', 'pieza', 3, 'm', 4.50],
  ['Fijación', 'tor-dw', 'Tornillo drywall 6 × 1"', 'ciento', 100, 'und', 4.50],
  ['Fijación', 'tor-pp', 'Tornillo 7/16" punta fina (estructura)', 'ciento', 100, 'und', 4.00],
  ['Fijación', 'tor-fc', 'Tornillo fibrocemento 8 × 1 1/4"', 'ciento', 100, 'und', 9.00],
  ['Fijación', 'clavo-disp', 'Clavo de disparo + fulminante', 'ciento', 100, 'und', 45.00],
  ['Fijación', 'alambre', 'Alambre N° 16 (colgadores)', 'kg', 1, 'kg', 7.00],
  ['Acabado', 'cinta', 'Cinta de papel × 75 m', 'rollo', 75, 'm', 9.00],
  ['Acabado', 'masilla', 'Masilla lista × 20 kg', 'balde', 20, 'kg', 55.00],
  ['Baldosa', 'bald-61', 'Baldosa vinil 61 × 61 cm', 'und', 1, 'und', 9.50],
  ['Baldosa', 'bald-60', 'Baldosa 60 × 60 cm', 'und', 1, 'und', 9.00],
  ['Baldosa', 'bald-122', 'Baldosa vinil 61 × 122 cm', 'und', 1, 'und', 18.00],
  ['Baldosa', 't-main', 'T principal × 3.66 m', 'pieza', 1, 'und', 12.00],
  ['Baldosa', 't-122', 'T secundaria × 1.22 m', 'pieza', 1, 'und', 4.20],
  ['Baldosa', 't-61', 'T secundaria × 0.61 m', 'pieza', 1, 'und', 2.20],
  ['Baldosa', 'ang-bald', 'Ángulo perimetral baldosa × 3.05 m', 'pieza', 1, 'und', 5.00],
  ['PVC', 'pvc-20', 'Lámina PVC 20 cm × 5.95 m', 'lámina', 1, 'und', 22.00],
  ['PVC', 'pvc-25', 'Lámina PVC 25 cm × 5.95 m', 'lámina', 1, 'und', 27.00],
  ['PVC', 'pvc-30', 'Lámina PVC 30 cm × 5.95 m', 'lámina', 1, 'und', 32.00],
  ['PVC', 'pvc-mold', 'Moldura / ángulo PVC × 5.95 m', 'pieza', 1, 'und', 8.00],
  ['Techo', 'cal-180', 'Calamina galvanizada 0.83 × 1.80 m', 'und', 1, 'und', 18.00],
  ['Techo', 'cal-240', 'Calamina galvanizada 0.83 × 2.40 m', 'und', 1, 'und', 24.00],
  ['Techo', 'cal-300', 'Calamina galvanizada 0.83 × 3.00 m', 'und', 1, 'und', 30.00],
  ['Techo', 'cal-360', 'Calamina galvanizada 0.83 × 3.60 m', 'und', 1, 'und', 36.00],
  ['Techo', 'cumbrera', 'Cumbrera galvanizada × 1.80 m', 'und', 1, 'und', 12.00],
  ['Techo', 'clavo-cal', 'Clavo para calamina con jebe', 'ciento', 100, 'und', 12.00],
  ['Techo', 'mad-2x4', 'Madera tornillo 2" × 4" × 10\' (3.05 m)', 'pieza', 3.05, 'm', 22.00],
  ['Techo', 'mad-2x3', 'Madera tornillo 2" × 3" × 10\' (correas)', 'pieza', 3.05, 'm', 16.00],
  ['Techo', 'clavo-3', 'Clavo 3"', 'kg', 1, 'kg', 6.00],
  ['Mano de obra', 'mo-cielo', 'Instalación cielo raso drywall', 'm²', 1, 'm²', 25.00],
  ['Mano de obra', 'mo-frente', 'Frentes / descolgados de cielo', 'm²', 1, 'm²', 30.00],
  ['Mano de obra', 'mo-baldosa', 'Instalación cielo raso baldosa', 'm²', 1, 'm²', 12.00],
  ['Mano de obra', 'mo-pvc', 'Instalación cielo raso PVC', 'm²', 1, 'm²', 15.00],
  ['Mano de obra', 'mo-tabique', 'Tabique drywall (por m² de muro)', 'm²', 1, 'm²', 30.00],
  ['Mano de obra', 'mo-prefab', 'Muro prefabricado (por m² de muro)', 'm²', 1, 'm²', 35.00],
  ['Mano de obra', 'mo-techo', 'Techo de calamina (por m² de cubierta)', 'm²', 1, 'm²', 18.00],
  ['Mano de obra', 'mo-tijeral', 'Armado y montaje de tijeral', 'und', 1, 'und', 40.00],
];

// Consumos por unidad de obra. Valores típicos, editables.
export const RENDIMIENTOS_BASE = {
  desperdicioPlancha: 10,   // %
  desperdicioPerfil: 5,     // %
  cieloSepOmega: 0.40,      // m
  cieloSepVigueta: 1.20,    // m
  cieloTornDw: 15,          // und / m²
  cieloTornPp: 8,           // und / m²
  cieloCinta: 1.4,          // m / m²
  cieloMasilla: 0.40,       // kg / m²
  cieloAlambre: 0.05,       // kg / m²
  cieloClavoCada: 0.60,     // m de perímetro por clavo de disparo
  muroSepParante: 0.406,    // m
  muroTornDwCara: 12,       // und / m² por cara
  muroTornPp: 4,            // und / m²
  muroCintaCara: 1.0,       // m / m² por cara
  muroMasillaCara: 0.35,    // kg / m² por cara
  pvcSepSoporte: 0.60,      // m entre listones/omegas
  pvcTorn: 10,              // und / m²
  techoClavosPorCalamina: 8,
  techoClavo3KgPorTijeral: 0.5,
};

let materiales = null, rendimientos = null;

function leer(clave) { try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; } }
function escribir(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* bloqueado */ } }

export function catalogo() {
  if (!materiales) {
    const guardado = leer(CLAVE) || {};
    materiales = MATERIALES_BASE.map(([grupo, codigo, nombre, unidad, rinde, consumo, precio]) => ({
      grupo, codigo, nombre, unidad, rinde, consumo, precio,
      ...(guardado[codigo] ? { precio: +guardado[codigo].precio, nombre: guardado[codigo].nombre || nombre } : {}),
      editado: !!guardado[codigo],
    }));
  }
  return materiales;
}

export function material(codigo) { return catalogo().find(m => m.codigo === codigo); }

export function fijarPrecio(codigo, precio, nombre) {
  const m = material(codigo); if (!m) return;
  if (isFinite(precio)) m.precio = precio;
  if (nombre) m.nombre = nombre;
  m.editado = true;
  const g = leer(CLAVE) || {};
  g[codigo] = { precio: m.precio, nombre: m.nombre };
  escribir(CLAVE, g);
}

export function rend() {
  if (!rendimientos) rendimientos = { ...RENDIMIENTOS_BASE, ...(leer(CLAVE_REND) || {}) };
  return rendimientos;
}
export function fijarRend(clave, v) { rend()[clave] = v; escribir(CLAVE_REND, rendimientos); }

export function restaurarTodo() {
  try { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_REND); } catch { /* nada */ }
  materiales = null; rendimientos = null;
}

// Para guardar los precios dentro de un archivo de proyecto.
export function exportarPrecios() { return { precios: leer(CLAVE) || {}, rendimientos: leer(CLAVE_REND) || {} }; }
