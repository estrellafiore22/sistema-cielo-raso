// Las dos modalidades que se venden por metro cuadrado de trabajo:
//
//   1. CON_MANO_OBRA          el m² instalado, material y obra
//   2. SOLO_MATERIAL_COMPLETO el paquete de material, sin instalación
//
// Las dos parten del mismo despiece; cambian en qué se le cobra al cliente y
// en cuánto le muestra la boleta.

import { calcular as calcularDespiece } from './despiece.js';
import { obtener as obtenerReceta } from './recetas.js';
import * as cobroMinimo from './cobro-minimo.js';
import * as pisoRadiante from './piso-radiante.js';
import { redondear } from '../core/formato.js';
import {
  variantePedida,
  planDePlanchas,
  cantidadesFijasDe,
  resolverTransporte,
  armarCuenta,
  calcularMargen,
  MODALIDADES,
  NOMBRES_MODALIDAD,
} from './precios-comun.js';

export function cotizarConManoObra(pedido) {
  const variante = variantePedida(pedido);
  const lineasReceta = variante?.lineas || obtenerReceta(pedido.recetaId)?.lineas;
  const planchas = planDePlanchas(pedido, lineasReceta);

  const resultado = calcularDespiece(pedido.recetaId, pedido.metrosCuadrados, {
    desperdicioExtra: pedido.desperdicioExtra,
    lineas: variante?.lineas,
    cantidades: { ...planchas?.cantidades, ...cantidadesFijasDe(pedido.recetaId) },
  });
  if (!resultado.ok) return resultado;

  const despiece = resultado.despiece;
  const receta = obtenerReceta(pedido.recetaId);
  const m2 = despiece.metrosCuadrados;

  const materialVenta = despiece.totales.venta;
  const materialCosto = despiece.totales.costo;
  // Sin tarifa por m² (cielo raso, por ejemplo), el lijado no tiene dónde
  // sumarse más que a la mano de obra: no hay precio fijo que recargar.
  const manoObra = redondear(
    (Number(receta.manoObraPorM2) || 0) * m2 + (variante?.recargoLijadoManoObra || 0) * m2,
  );
  const envio = resolverTransporte(pedido);

  // Instalado, el material se le pasa al cliente a lo que cuesta comprarlo,
  // no a precio de venta: el margen de un trabajo con mano de obra sale de la
  // mano de obra, no de recargar el material. Con tarifa por m² (división,
  // por ejemplo) el precio ya viene fijo y ni se mira el costo del material.
  const tarifa = variante?.tarifa || null;
  const cobrado =
    variante?.cobradoDirecto != null
      ? redondear(variante.cobradoDirecto)
      : tarifa
        ? redondear(tarifa.precioM2 * m2)
        : redondear(materialCosto + manoObra);

  // Una salida chica no puede dejar a la tienda en cero: hay un piso.
  const piso = cobroMinimo.aplicar(cobrado, true);
  const base = piso.base;
  const cuenta = armarCuenta(base, envio.total, pedido.descuento);

  return {
    ok: true,
    cotizacion: {
      modalidad: MODALIDADES.CON_MANO_OBRA,
      nombreModalidad: NOMBRES_MODALIDAD[MODALIDADES.CON_MANO_OBRA],
      trabajo: {
        id: receta.id,
        nombre: variante ? `${receta.nombre} — ${variante.nombre}` : receta.nombre,
        metrosCuadrados: m2,
        variante: pedido.variante || null,
        lijado: Boolean(variante?.lijado),
      },
      transporte: envio,
      ...cuenta,

      // El cliente ve el trabajo instalado, no el desglose de tornillos.
      cliente: {
        lineas: [
          {
            concepto:
              `${receta.nombre}${variante ? ' — ' + variante.nombre : ''}` +
              ` — ${m2} m² instalado`,
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
        tarifa: variante?.tarifa || null,
        lijado: Boolean(variante?.lijado),
        // Cómo se cortan las planchas y qué recortes quedan para otra obra.
        planchas: planchas?.plan || null,
        // Cuánto amperaje pedir, si el trabajo es piso radiante.
        potencia: pedido.recetaId === pisoRadiante.RECETA_BASE
          ? pisoRadiante.calcularPotencia(m2)
          : null,
        // Desglose de tijeral+techo vs. paredes, si es una casa prefabricada.
        medidasCasa: variante?.medidasCasa || null,
        ...calcularMargen(cuenta.total, despiece.totales.costo, manoObra, envio, piso),
      },
    },
  };
}

export function cotizarMaterialCompleto(pedido) {
  // Sin instalación no hay tarifa por m²: se cobra lo que valen los
  // materiales. Pero el paquete tiene que llevar la plancha que se eligió.
  const variante = variantePedida(pedido);
  const lineasReceta = variante?.lineas || obtenerReceta(pedido.recetaId)?.lineas;
  const planchas = planDePlanchas(pedido, lineasReceta);

  const resultado = calcularDespiece(pedido.recetaId, pedido.metrosCuadrados, {
    desperdicioExtra: pedido.desperdicioExtra,
    lineas: variante?.lineas,
    cantidades: { ...planchas?.cantidades, ...cantidadesFijasDe(pedido.recetaId) },
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
      trabajo: {
        id: receta.id,
        nombre: variante ? `${receta.nombre} — ${variante.nombre}` : receta.nombre,
        metrosCuadrados: m2,
        variante: pedido.variante || null,
      },
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
        planchas: planchas?.plan || null,
        potencia: pedido.recetaId === pisoRadiante.RECETA_BASE
          ? pisoRadiante.calcularPotencia(m2)
          : null,
        ...calcularMargen(cuenta.total, despiece.totales.costo, 0, envio),
      },
    },
  };
}
