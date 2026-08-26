// Cuarta modalidad de venta: cielo raso suspendido 61 × 61.
//
// Se apoya entera en src/dominio/suspendido/, que ya sabe calcular la
// retícula, repartir los cortes y elegir la orientación más barata. Aquí solo
// se envuelve el resultado con la forma que espera el motor de cotización.

import { calcular as calcularSuspendido } from './suspendido/index.js';
import { redondear } from '../core/formato.js';

export const CLAVE = 'suspendido';
export const NOMBRE = 'Cielo raso suspendido 61 × 61';

/**
 * @param {object} pedido
 *   - suspendido: {ancho, largo, metrosCuadrados, orientacion}
 *   - conManoObra: si se cobra la instalación
 *   - transporte, descuento
 */
export function cotizar(pedido, resolverTransporte, armarCuenta, calcularMargen) {
  const entrada = pedido.suspendido || {};
  const resultado = calcularSuspendido({
    ancho: entrada.ancho,
    largo: entrada.largo,
    metrosCuadrados: entrada.metrosCuadrados,
    orientacion: entrada.orientacion || 'auto',
  });
  if (!resultado.ok) return resultado;

  const calculo = resultado.calculo;
  const m2 = calculo.medidas.area;

  const materialVenta = calculo.total;
  const materialCosto = materialVenta; // el precio cargado ya es el de compra

  const tarifaObra = pedido.conManoObra
    ? Number(calculo.config.manoObraPorM2) || 0
    : 0;
  const manoObra = redondear(tarifaObra * m2);

  const envio = resolverTransporte(pedido);
  const base = redondear(materialVenta + manoObra);
  const cuenta = armarCuenta(base, envio.total, pedido.descuento);

  return {
    ok: true,
    cotizacion: {
      modalidad: CLAVE,
      nombreModalidad: NOMBRE,
      trabajo: {
        id: CLAVE,
        nombre: NOMBRE,
        metrosCuadrados: m2,
        ancho: calculo.medidas.ancho,
        largo: calculo.medidas.largo,
        orientacion: calculo.orientacion,
      },
      transporte: envio,
      ...cuenta,

      // El cliente ve el trabajo, no la lista de perfiles.
      cliente: {
        soloMetrosCuadrados: true,
        lineas: [
          {
            concepto: manoObra > 0
              ? `${NOMBRE} instalado — ${m2} m²`
              : `Material para ${NOMBRE} — ${m2} m²`,
            cantidad: m2,
            unidad: 'm²',
            precioUnitario: m2 > 0 ? redondear(base / m2) : 0,
            total: base,
          },
        ],
        transporte: envio.total,
        descuento: cuenta.descuento,
        total: cuenta.total,
      },

      // El administrador se lleva todo: cortes, sobrantes, plano y márgenes.
      interno: {
        suspendido: calculo,
        lineas: calculo.lineas
          .filter((l) => l.cantidad > 0)
          .map((l) => ({
            material: l.clave,
            nombre: l.nombre,
            unidad: l.unidad,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnit,
            total: l.subtotal,
            precioCompra: l.precioUnit,
            costo: l.subtotal,
          })),
        materialVenta,
        materialCosto,
        manoObra,
        manoObraPorM2: tarifaObra,
        // El plano se guarda con el pedido para poder reimprimirlo igual
        // aunque después cambien las medidas por defecto.
        grid: calculo.grid,
        ...calcularMargen(cuenta.total, materialCosto, manoObra, envio),
      },
    },
  };
}

/** Datos mínimos que hay que guardar para poder recalcular o reimprimir. */
export function parametros(entrada) {
  return {
    ancho: Number(entrada.ancho) || null,
    largo: Number(entrada.largo) || null,
    metrosCuadrados: Number(entrada.metrosCuadrados) || null,
    orientacion: entrada.orientacion || 'auto',
  };
}
