// Motor de cotización. Tres modalidades de venta.
//
//   1. CON_MANO_OBRA          se cobra el m² instalado: material + obra
//   2. SOLO_MATERIAL_COMPLETO se venden m² de material, sin instalación
//   3. MATERIAL_SUELTO        el cliente arma su lista del catálogo
//
// Cada cotización devuelve DOS vistas del mismo cálculo:
//   - `cliente`: lo que el cliente puede ver
//   - `interno`: lo que solo ve el administrador (costos, despiece, origen
//                del material, margen)
//
// La diferencia importa sobre todo en SOLO_MATERIAL_COMPLETO, donde el dueño
// pidió que la boleta del cliente muestre únicamente los metros cuadrados.

import { calcular as calcularDespiece } from './despiece.js';
import { obtener as obtenerReceta } from './recetas.js';
import { obtener as obtenerMaterial } from './materiales.js';
import * as transporte from './transporte.js';
import { redondear } from '../core/formato.js';
import * as suspendido from './precios-suspendido.js';

export const MODALIDADES = {
  CON_MANO_OBRA: 'con_mano_obra',
  SOLO_MATERIAL_COMPLETO: 'solo_material_completo',
  MATERIAL_SUELTO: 'material_suelto',
  SUSPENDIDO: suspendido.CLAVE,
};

export const NOMBRES_MODALIDAD = {
  [MODALIDADES.CON_MANO_OBRA]: 'Instalación con mano de obra',
  [MODALIDADES.SOLO_MATERIAL_COMPLETO]: 'Solo material, paquete completo',
  [MODALIDADES.MATERIAL_SUELTO]: 'Material suelto por unidad',
  [MODALIDADES.SUSPENDIDO]: suspendido.NOMBRE,
};

/**
 * Punto de entrada único.
 *
 * @param {object} pedido
 *   - modalidad
 *   - recetaId, metrosCuadrados      (modalidades 1 y 2)
 *   - items: [{material, cantidad}]  (modalidad 3)
 *   - desperdicioExtra               porcentaje opcional
 *   - transporte: {km, idaYVuelta, recargo} o null si recoge en tienda
 *   - descuento                      monto fijo en soles
 */
export function cotizar(pedido) {
  switch (pedido.modalidad) {
    case MODALIDADES.CON_MANO_OBRA:
      return cotizarConManoObra(pedido);
    case MODALIDADES.SOLO_MATERIAL_COMPLETO:
      return cotizarMaterialCompleto(pedido);
    case MODALIDADES.MATERIAL_SUELTO:
      return cotizarMaterialSuelto(pedido);
    case MODALIDADES.SUSPENDIDO:
      return suspendido.cotizar(pedido, resolverTransporte, armarCuenta, calcularMargen);
    default:
      return { ok: false, error: 'Modalidad de venta no reconocida' };
  }
}

// --- 1. Con mano de obra ----------------------------------------------------

function cotizarConManoObra(pedido) {
  const resultado = calcularDespiece(pedido.recetaId, pedido.metrosCuadrados, {
    desperdicioExtra: pedido.desperdicioExtra,
  });
  if (!resultado.ok) return resultado;

  const despiece = resultado.despiece;
  const receta = obtenerReceta(pedido.recetaId);
  const m2 = despiece.metrosCuadrados;

  const materialVenta = despiece.totales.venta;
  const manoObra = redondear((Number(receta.manoObraPorM2) || 0) * m2);
  const envio = resolverTransporte(pedido);

  const base = redondear(materialVenta + manoObra);
  const cuenta = armarCuenta(base, envio.total, pedido.descuento);

  return {
    ok: true,
    cotizacion: {
      modalidad: MODALIDADES.CON_MANO_OBRA,
      nombreModalidad: NOMBRES_MODALIDAD[MODALIDADES.CON_MANO_OBRA],
      trabajo: { id: receta.id, nombre: receta.nombre, metrosCuadrados: m2 },
      transporte: envio,
      ...cuenta,

      // El cliente ve el trabajo instalado, no el desglose de tornillos.
      cliente: {
        lineas: [
          {
            concepto: `${receta.nombre} — ${m2} m² instalado`,
            cantidad: m2,
            unidad: 'm²',
            precioUnitario: redondear(base / m2),
            total: base,
          },
        ],
        transporte: envio.total,
        descuento: cuenta.descuento,
        total: cuenta.total,
      },

      interno: {
        despiece,
        materialVenta,
        materialCosto: despiece.totales.costo,
        manoObra,
        manoObraPorM2: Number(receta.manoObraPorM2) || 0,
        costoReposicion: despiece.totales.reposicion,
        ...calcularMargen(cuenta.total, despiece.totales.costo, manoObra, envio),
      },
    },
  };
}

// --- 2. Solo material completo ----------------------------------------------

function cotizarMaterialCompleto(pedido) {
  const resultado = calcularDespiece(pedido.recetaId, pedido.metrosCuadrados, {
    desperdicioExtra: pedido.desperdicioExtra,
  });
  if (!resultado.ok) return resultado;

  const despiece = resultado.despiece;
  const receta = obtenerReceta(pedido.recetaId);
  const m2 = despiece.metrosCuadrados;

  const materialVenta = despiece.totales.venta;
  const envio = resolverTransporte(pedido);
  const cuenta = armarCuenta(materialVenta, envio.total, pedido.descuento);

  return {
    ok: true,
    cotizacion: {
      modalidad: MODALIDADES.SOLO_MATERIAL_COMPLETO,
      nombreModalidad: NOMBRES_MODALIDAD[MODALIDADES.SOLO_MATERIAL_COMPLETO],
      trabajo: { id: receta.id, nombre: receta.nombre, metrosCuadrados: m2 },
      transporte: envio,
      ...cuenta,

      // Requisito del dueño: la boleta del cliente muestra SOLO los metros
      // cuadrados comprados. Sin lista de materiales, sin precios unitarios.
      cliente: {
        soloMetrosCuadrados: true,
        lineas: [
          {
            concepto: `Material completo para ${receta.nombre}`,
            cantidad: m2,
            unidad: 'm²',
            precioUnitario: redondear(materialVenta / m2),
            total: materialVenta,
          },
        ],
        transporte: envio.total,
        descuento: cuenta.descuento,
        total: cuenta.total,
      },

      // La boleta del administrador sí lleva todo: qué material sale de
      // almacén, qué sale de retornos, transporte con distancia y dirección.
      interno: {
        despiece,
        materialVenta,
        materialCosto: despiece.totales.costo,
        manoObra: 0,
        costoReposicion: despiece.totales.reposicion,
        ...calcularMargen(cuenta.total, despiece.totales.costo, 0, envio),
      },
    },
  };
}

// --- 3. Material suelto -----------------------------------------------------

function cotizarMaterialSuelto(pedido) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  if (items.length === 0) {
    return { ok: false, error: 'Agrega al menos un material al pedido' };
  }

  const lineas = [];
  for (const item of items) {
    const material = obtenerMaterial(item.material);
    if (!material) {
      return { ok: false, error: `El material "${item.material}" no existe` };
    }
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, error: `Cantidad no válida en ${material.nombre}` };
    }

    const precioUnitario = Number(material.precioVenta) || 0;
    lineas.push({
      material: material.id,
      nombre: material.nombre,
      categoria: material.categoria,
      unidad: material.unidad,
      cantidad,
      precioUnitario,
      total: redondear(cantidad * precioUnitario),
      precioCompra: Number(material.precioCompra) || 0,
      costo: redondear(cantidad * (Number(material.precioCompra) || 0)),
    });
  }

  const materialVenta = redondear(
    lineas.reduce((suma, l) => suma + l.total, 0),
  );
  const materialCosto = redondear(lineas.reduce((suma, l) => suma + l.costo, 0));
  const envio = resolverTransporte(pedido);
  const cuenta = armarCuenta(materialVenta, envio.total, pedido.descuento);

  return {
    ok: true,
    cotizacion: {
      modalidad: MODALIDADES.MATERIAL_SUELTO,
      nombreModalidad: NOMBRES_MODALIDAD[MODALIDADES.MATERIAL_SUELTO],
      trabajo: null,
      transporte: envio,
      ...cuenta,

      // Aquí el cliente sí ve el detalle: material, precio unitario, cantidad
      // y total por línea.
      cliente: {
        lineas: lineas.map((l) => ({
          concepto: l.nombre,
          cantidad: l.cantidad,
          unidad: l.unidad,
          precioUnitario: l.precioUnitario,
          total: l.total,
        })),
        transporte: envio.total,
        descuento: cuenta.descuento,
        total: cuenta.total,
      },

      interno: {
        lineas,
        materialVenta,
        materialCosto,
        manoObra: 0,
        ...calcularMargen(cuenta.total, materialCosto, 0, envio),
      },
    },
  };
}

// --- Piezas comunes ---------------------------------------------------------

function resolverTransporte(pedido) {
  if (!pedido.transporte) return transporte.sinTransporte();
  const resultado = transporte.calcular(pedido.transporte.km, {
    idaYVuelta: pedido.transporte.idaYVuelta,
    recargo: pedido.transporte.recargo,
  });
  return resultado.ok ? resultado.transporte : transporte.sinTransporte();
}

function armarCuenta(subtotal, costoTransporte, descuentoPedido) {
  const descuento = Math.max(0, Number(descuentoPedido) || 0);
  const bruto = redondear(subtotal + costoTransporte);
  const total = redondear(Math.max(0, bruto - descuento));
  return { subtotal: redondear(subtotal), descuento, total };
}

function calcularMargen(total, costoMaterial, manoObra, envio) {
  // El transporte se trata como ingreso, no como ganancia: cubre combustible y
  // tiempo. Se descuenta entero para no inflar el margen aparente.
  const ingresoNeto = redondear(total - envio.total);
  const costos = redondear(costoMaterial + manoObra);
  const ganancia = redondear(ingresoNeto - costos);
  const porcentaje = ingresoNeto > 0 ? redondear((ganancia / ingresoNeto) * 100, 1) : 0;
  return { ganancia, margenPorcentaje: porcentaje };
}
