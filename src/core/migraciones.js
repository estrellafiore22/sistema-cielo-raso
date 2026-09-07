// Migraciones del esquema de datos.
//
// Cada paso transforma los datos ya guardados para que sigan funcionando con
// la versión nueva del código. Se ejecutan una sola vez y en orden, antes de
// sembrar y antes de que ninguna vista lea nada.

import * as bd from './bd.js';
import { registrar } from './errores.js';
import { MATERIALES_BASE, CATEGORIAS_BASE } from './datos/materiales-base.js';
import { RECETAS_BASE } from './datos/recetas-base.js';
import { MATERIAL_DE } from '../dominio/suspendido/config.js';

export const VERSION = 6;

export function aplicar() {
  const desde = bd.versionGuardada();
  if (desde >= VERSION) return { migrado: false, desde };

  const aplicados = [];
  try {
    if (desde < 2) {
      aplicados.push(aUnidadesDeConsumo());
    }
    if (desde < 3) {
      aplicados.push(preciosDelVinilAlCatalogo());
    }
    if (desde < 4) {
      aplicados.push(agregarMaterialesNuevos());
    }
    if (desde < 5) {
      aplicados.push(agregarMaterialesNuevos());
      aplicados.push(agregarRecetasNuevas());
    }
    if (desde < 6) {
      aplicados.push(agregarRecetasNuevas());
    }
    bd.marcarVersion(VERSION);
    return { migrado: true, desde, hasta: VERSION, aplicados };
  } catch (error) {
    registrar('migraciones.aplicar', error, { desde });
    return { migrado: false, desde, error: 'No se pudieron migrar los datos' };
  }
}

/**
 * Versión 2: separar la unidad en que se VENDE un material de la unidad en
 * que se GASTA.
 *
 * Antes las recetas decían "0.22 cientos de tornillo por m²", que nadie en
 * obra piensa así. Ahora dicen "22 tornillos por m²" y el sistema convierte a
 * cientos al momento de comprar.
 *
 * La conversión de las recetas es multiplicar por `porVenta`, así que las
 * cantidades finales y los precios no cambian: solo cambia cómo se leen.
 */
function aUnidadesDeConsumo() {
  const base = new Map(MATERIALES_BASE.map((m) => [m.id, m]));

  // 1. Los materiales estrenan los campos nuevos.
  const materiales = bd.todos('materiales').map((material) => {
    const referencia = base.get(material.id);
    if (!referencia) {
      // Material creado a mano: se vende y se gasta en la misma unidad.
      return {
        ...material,
        unidadConsumo: material.unidadConsumo ?? null,
        porVenta: Number(material.porVenta) || 1,
        fraccionable: material.fraccionable ?? false,
      };
    }
    return {
      ...material,
      // Los precios que el administrador haya tocado se respetan.
      unidad: referencia.unidad,
      unidadConsumo: referencia.unidadConsumo ?? null,
      porVenta: Number(referencia.porVenta) || 1,
      fraccionable: Boolean(referencia.fraccionable),
      // El nombre solo se pisa si sigue siendo el de fábrica: si el dueño lo
      // renombró, manda el suyo.
      nombre: material.nombre === NOMBRES_VIEJOS[material.id]
        ? referencia.nombre
        : material.nombre,
    };
  });
  if (materiales.length) bd.reemplazar('materiales', materiales);

  // 2. Las recetas pasan de unidades de venta a unidades de consumo.
  const factorDe = new Map(materiales.map((m) => [m.id, Number(m.porVenta) || 1]));
  const recetas = bd.todos('recetas').map((receta) => ({
    ...receta,
    nombre: receta.nombre === 'Cielo raso suspendido (una cara)'
      ? 'Cielo raso de drywall (una cara)'
      : receta.nombre,
    lineas: (receta.lineas || []).map((linea) => {
      const factor = factorDe.get(linea.material) || 1;
      return factor === 1
        ? linea
        : { ...linea, porM2: redondear((Number(linea.porM2) || 0) * factor, 4) };
    }),
  }));
  if (recetas.length) bd.reemplazar('recetas', recetas);

  return `${materiales.length} materiales y ${recetas.length} recetas`;
}

/**
 * Nombres que traía el sistema antes de la versión 2. Sirven para saber si el
 * dueño renombró un material o si todavía tiene el nombre de fábrica.
 */
const NOMBRES_VIEJOS = {
  'clavo-impacto': 'Clavo de impacto 1/4 × 1"',
};

/**
 * Versión 3: los precios del cielo raso vinil pasan al catálogo de Materiales.
 *
 * Vivían en un rincón que solo tocaba la pantalla de Ajustes. La tienda
 * también vende esas piezas sueltas, así que necesitan precio de compra y de
 * venta como cualquier otro material. Lo que el dueño ya había editado manda
 * sobre el precio de fábrica: se copia tal cual al material nuevo.
 */
/**
 * Versión 4: catálogo nuevo para baldosa PVC, laminado PVC, pisos epóxicos,
 * calamina y piso radiante.
 *
 * Solo se agregan los IDs que todavía no existen: si el dueño ya tiene datos
 * guardados, esto no toca ni un precio de lo que ya venía.
 */
function agregarMaterialesNuevos() {
  const categorias = bd.todos('categorias');
  const idsCategoria = new Set(categorias.map((c) => c.id));
  const categoriasNuevas = CATEGORIAS_BASE.filter((c) => !idsCategoria.has(c.id));
  if (categoriasNuevas.length > 0) {
    bd.reemplazar('categorias', [...categorias, ...categoriasNuevas]);
  }

  const materiales = bd.todos('materiales');
  const idsMaterial = new Set(materiales.map((m) => m.id));
  const nuevos = MATERIALES_BASE.filter((m) => !idsMaterial.has(m.id)).map((m) => ({
    ...m,
    activo: true,
    creadoEn: new Date().toISOString(),
  }));
  if (nuevos.length > 0) {
    bd.reemplazar('materiales', [...materiales, ...nuevos]);
  }

  return `catálogo nuevo: ${categoriasNuevas.length} categoría(s), ${nuevos.length} material(es)`;
}

/**
 * Versión 5: agrega el laminado PVC (material y receta) y cualquier otra
 * receta nueva que no exista todavía. Mismo criterio que el catálogo: solo se
 * insertan los IDs que faltan.
 */
function agregarRecetasNuevas() {
  const recetas = bd.todos('recetas');
  const idsReceta = new Set(recetas.map((r) => r.id));
  const nuevas = RECETAS_BASE.filter((r) => !idsReceta.has(r.id));
  if (nuevas.length > 0) {
    bd.reemplazar('recetas', [...recetas, ...nuevas]);
  }
  return `recetas nuevas: ${nuevas.length}`;
}

function preciosDelVinilAlCatalogo() {
  const editados = bd.config('suspendidoPrecios', null);
  if (!editados) return 'vinil al catálogo: no había precios editados';

  const materiales = bd.todos('materiales');
  let copiados = 0;

  for (const [clave, materialId] of Object.entries(MATERIAL_DE)) {
    const precio = Number(editados[clave]);
    if (!Number.isFinite(precio) || precio <= 0) continue;

    const material = materiales.find((m) => m.id === materialId);
    if (!material) continue;

    // El margen que tenía el material de fábrica se conserva.
    const margen =
      material.precioVenta > 0 ? material.precioCompra / material.precioVenta : 0.75;
    material.precioVenta = precio;
    material.precioCompra = redondear(precio * (margen || 0.75), 2);
    copiados += 1;
  }

  bd.reemplazar('materiales', materiales);
  return `vinil al catálogo: ${copiados} precio(s) conservados`;
}

function redondear(n, decimales) {
  const f = Math.pow(10, decimales);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
