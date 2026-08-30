// Modalidad 3: el cliente arma su lista desde el catálogo por categorías.
// La boleta muestra material, precio unitario, cantidad y total.

import { obtener as obtenerMaterial } from './materiales.js';
import { redondear } from '../core/formato.js';
import {
  resolverTransporte,
  armarCuenta,
  calcularMargen,
  MODALIDADES,
  NOMBRES_MODALIDAD,
} from './precios-comun.js';

export function cotizarMaterialSuelto(pedido) {
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
