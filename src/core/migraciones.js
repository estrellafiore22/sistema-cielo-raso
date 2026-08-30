// Migraciones del esquema de datos.
//
// Cada paso transforma los datos ya guardados para que sigan funcionando con
// la versión nueva del código. Se ejecutan una sola vez y en orden, antes de
// sembrar y antes de que ninguna vista lea nada.

import * as bd from './bd.js';
import { registrar } from './errores.js';
import { MATERIALES_BASE } from './datos/materiales-base.js';

export const VERSION = 2;

export function aplicar() {
  const desde = bd.versionGuardada();
  if (desde >= VERSION) return { migrado: false, desde };

  const aplicados = [];
  try {
    if (desde < 2) {
      aplicados.push(aUnidadesDeConsumo());
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

function redondear(n, decimales) {
  const f = Math.pow(10, decimales);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
