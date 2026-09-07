// Cuarta modalidad de venta: cielo raso suspendido 61 × 61.
//
// Se apoya entera en src/dominio/suspendido/, que ya sabe calcular la
// retícula, repartir los cortes y elegir la orientación más barata. Aquí solo
// se envuelve el resultado con la forma que espera el motor de cotización.

import { calcular as calcularSuspendido } from './suspendido/index.js';
import { redondear } from '../core/formato.js';
import { NOMBRE_TRABAJO, tarifaElegida } from './suspendido/config.js';
import * as cobroMinimo from './cobro-minimo.js';

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

  // Dos totales, con dos tarifas distintas: lo que se le cobra al cliente por
  // el material (venta) y lo que de verdad le cuesta a la tienda (compra).
  const materialVenta = calculo.total;
  const materialCosto = calculo.totalCosto;

  const tarifaObra = pedido.conManoObra
    ? Number(calculo.config.manoObraPorM2) || 0
    : 0;
  const manoObra = redondear(tarifaObra * m2);

  // Instalado se cobra por m² de lista o de promoción, no por lo que valen
  // los materiales: la ganancia del material queda en la mano de obra, y al
  // cliente se le pasa el material a precio de compra. Solo material sí se
  // vende con el margen de venta puesto.
  const tarifa = tarifaElegida(pedido.promocion);
  // Una obra de 3 × 2 se cotiza bien y aun así deja a la tienda en cero: el
  // equipo se traslada igual. Por eso hay un piso de cobro.
  const piso = cobroMinimo.aplicar(
    pedido.conManoObra ? redondear(tarifa.precio * m2) : materialVenta,
    pedido.conManoObra,
  );
  const base = piso.base;

  const envio = resolverTransporte(pedido);
  const cuenta = armarCuenta(base, envio.total, pedido.descuento);

  // Lo que le queda a la tienda: lo cobrado menos lo que de verdad costó el
  // material, más el transporte, que también se lo queda la tienda.
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
            precioCompra: l.costoUnit,
            costo: l.subtotalCosto,
          })),
        materialVenta,
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
          cobroMinimo: piso,
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
