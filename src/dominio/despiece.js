// De metros cuadrados a lista de materiales a llevar.
//
// Esta es la función que el dueño pidió: "cuando salga un pedido por metro
// cuadrado, dame la lista de todo lo que hay que llevar, tomando en cuenta lo
// que hay en almacén y lo que regresó de trabajos anteriores".
//
// Regla de reparto, en este orden:
//   1. RETORNOS  — primero se gasta lo que volvió de obra, para que no se
//                  acumule material muerto en el depósito.
//   2. ALMACÉN   — luego el stock nuevo.
//   3. FALTANTE  — lo que no alcanza y hay que comprar antes de salir.

import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';
import * as inventario from './inventario.js';
import { redondear } from '../core/formato.js';

/**
 * Calcula el despiece de un trabajo.
 *
 * @param {string} recetaId      'cielo_raso', 'division', ...
 * @param {number} metrosCuadrados
 * @param {object} opciones
 *   - desperdicioExtra: porcentaje adicional sobre toda la receta (0 = ninguno)
 *   - redondearUnidades: true para subir a entero lo que no se vende partido
 * @returns {{ok:boolean, error?:string, despiece?:object}}
 */
export function calcular(recetaId, metrosCuadrados, opciones = {}) {
  const receta = obtenerReceta(recetaId);
  if (!receta) return { ok: false, error: 'Ese tipo de trabajo no existe' };

  const m2 = Number(metrosCuadrados);
  if (!Number.isFinite(m2) || m2 <= 0) {
    return { ok: false, error: 'Los metros cuadrados deben ser mayores a cero' };
  }

  const { desperdicioExtra = 0, redondearUnidades = true } = opciones;
  const factor = 1 + (Number(desperdicioExtra) || 0) / 100;

  const lineas = [];
  for (const linea of receta.lineas) {
    const material = obtenerMaterial(linea.material);
    if (!material) continue; // material borrado: se omite en vez de romper

    // La receta está en unidades de consumo: tornillos, kilos, metros.
    const consumo = redondear((Number(linea.porM2) || 0) * m2 * factor, 2);

    // Lo que hay que comprar va en la unidad en que vende el proveedor.
    const porVenta = Number(material.porVenta) || 1;
    const bruto = consumo / porVenta;
    const necesario = redondearUnidades
      ? subirAUnidadVendible(bruto, material)
      : redondear(bruto, 3);

    lineas.push(repartir(material, necesario, consumo, linea));
  }

  return {
    ok: true,
    despiece: {
      receta: { id: receta.id, nombre: receta.nombre },
      metrosCuadrados: m2,
      desperdicioExtra: Number(desperdicioExtra) || 0,
      lineas,
      totales: totalizar(lineas),
      calculadoEn: new Date().toISOString(),
    },
  };
}

/** Reparte una cantidad necesaria entre retornos, almacén y faltante. */
function repartir(material, necesario, consumo, lineaReceta) {
  const hayRetornos = inventario.enRetornos(material.id);
  const hayAlmacen = inventario.enAlmacen(material.id);

  const deRetornos = Math.min(hayRetornos, necesario);
  const restante = redondear(necesario - deRetornos, 3);
  const deAlmacen = Math.min(hayAlmacen, restante);
  const faltante = redondear(restante - deAlmacen, 3);

  const precioVenta = Number(material.precioVenta) || 0;
  const precioCompra = Number(material.precioCompra) || 0;

  return {
    material: material.id,
    nombre: material.nombre,
    categoria: material.categoria,
    unidad: material.unidad,
    // Lo que se instala, contado como lo cuenta el maestro.
    consumo: redondear(consumo, 2),
    unidadConsumo: material.unidadConsumo || material.unidad,
    porVenta: Number(material.porVenta) || 1,
    consumoPorM2: Number(lineaReceta.porM2) || 0,
    nota: lineaReceta.nota || '',
    necesario: redondear(necesario, 3),
    deRetornos: redondear(deRetornos, 3),
    deAlmacen: redondear(deAlmacen, 3),
    faltante,
    precioVenta,
    precioCompra,
    subtotalVenta: redondear(necesario * precioVenta),
    subtotalCosto: redondear(necesario * precioCompra),
    // Lo faltante hay que comprarlo antes de salir a la obra.
    costoReposicion: redondear(faltante * precioCompra),
  };
}

function totalizar(lineas) {
  const suma = (campo) =>
    redondear(lineas.reduce((total, l) => total + (l[campo] || 0), 0));
  return {
    venta: suma('subtotalVenta'),
    costo: suma('subtotalCosto'),
    reposicion: suma('costoReposicion'),
    lineasConFaltante: lineas.filter((l) => l.faltante > 0).length,
  };
}

/**
 * Sube a la unidad vendible más cercana. No se vende media plancha, ni media
 * caja de clavos. Lo que sí se despacha a granel (tornillos por ciento,
 * masilla por kilo) queda con dos decimales.
 */
function subirAUnidadVendible(cantidad, material) {
  if (material.fraccionable) return redondear(cantidad, 2);
  return Math.ceil(redondear(cantidad, 3));
}

/** ¿Se puede salir a la obra con lo que hay? */
export function puedeCubrirse(despiece) {
  return despiece.lineas.every((l) => l.faltante <= 0);
}

/** Solo lo que falta comprar, para la orden de compra al proveedor. */
export function faltantes(despiece) {
  return despiece.lineas
    .filter((l) => l.faltante > 0)
    .map((l) => ({
      material: l.material,
      nombre: l.nombre,
      unidad: l.unidad,
      cantidad: l.faltante,
      costoEstimado: l.costoReposicion,
    }));
}

/**
 * Descuenta del inventario real lo que consume un despiece. Se llama cuando el
 * pedido pasa a despachado, no cuando se cotiza.
 */
export function descontarDelInventario(despiece, referenciaPedido) {
  const resultados = [];
  for (const linea of despiece.lineas) {
    if (linea.deRetornos > 0) {
      const consumido = inventario.consumirRetornos(
        linea.material,
        linea.deRetornos,
        referenciaPedido,
      );
      resultados.push({ material: linea.material, origen: 'retorno', consumido });
    }
    if (linea.deAlmacen > 0) {
      const r = inventario.moverAlmacen(
        linea.material,
        -linea.deAlmacen,
        'Salida a pedido',
        referenciaPedido,
      );
      resultados.push({
        material: linea.material,
        origen: 'almacen',
        consumido: r.ok ? linea.deAlmacen : 0,
        error: r.ok ? null : r.error,
      });
    }
  }
  return resultados;
}
