// Cuarta modalidad de venta: cielo raso suspendido 61 × 61.
//
// Se apoya entera en src/dominio/suspendido/, que ya sabe calcular la
// retícula, repartir los cortes y elegir la orientación más barata. Aquí solo
// se envuelve el resultado con la forma que espera el motor de cotización.

import { calcular as calcularSuspendido } from './suspendido/index.js';
import { redondear } from '../core/formato.js';
import { NOMBRE_TRABAJO, tarifaElegida } from './suspendido/config.js';

export const CLAVE = 'suspendido';
export const NOMBRE = NOMBRE_TRABAJO;

/**
 * @param {object} pedido
 *   - suspendido: {ancho, largo, metrosCuadrados, orientacion}
 *   - conManoObra: si se cobra la instalación
 *   - transporte, descuento
 */
export function cotizar(pedido, resolverTransporte, armarCuenta) {
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

  const materialCosto = calculo.total;

  const tarifaObra = pedido.conManoObra
    ? Number(calculo.config.manoObraPorM2) || 0
    : 0;
  const manoObra = redondear(tarifaObra * m2);

  // Instalado se cobra por m² de lista o de promoción; solo material se cobra
  // lo que valen los materiales.
  const tarifa = tarifaElegida(pedido.promocion);
  const base = pedido.conManoObra
    ? redondear(tarifa.precio * m2)
    : materialCosto;

  const envio = resolverTransporte(pedido);
  const cuenta = armarCuenta(base, envio.total, pedido.descuento);

  // Lo que le queda a la tienda: lo cobrado menos lo que costó, más el
  // transporte, que también se lo queda la tienda.
  const ganancia = redondear(cuenta.total - materialCosto - manoObra);

  return {
    ok: true,
    cotizacion: {
      modalidad: pedido.modalidad,
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

      tarifa,
      // El cliente ve el trabajo, no la lista de perfiles.
      cliente: {
        soloMetrosCuadrados: true,
        lineas: [
          {
            concepto: pedido.conManoObra
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
        materialVenta: materialCosto,
        materialCosto,
        manoObra,
        manoObraPorM2: tarifaObra,
        // Desglose que solo ve la tienda.
        cuentaTienda: {
          cobradoAlCliente: cuenta.total - envio.total,
          materiales: materialCosto,
          manoObra,
          transporte: envio.total,
          ganancia,
          tarifa,
        },
        // El plano se guarda con el pedido para poder reimprimirlo igual
        // aunque después cambien las medidas por defecto.
        grid: calculo.grid,
        ganancia,
        margenPorcentaje:
          cuenta.total > 0 ? redondear((ganancia / cuenta.total) * 100, 1) : 0,
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
