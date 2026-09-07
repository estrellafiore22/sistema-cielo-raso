// Piezas que comparten las tres modalidades de venta: transporte, descuento,
// margen de la tienda y las variantes de plancha de la división.

import * as transporte from './transporte.js';
import * as divisiones from './divisiones.js';
import * as divisionReceta from './division-receta.js';
import * as cieloRasoPlanchas from './cielo-raso-planchas.js';
import * as cieloRasoReceta from './cielo-raso-receta.js';
import * as pisoRadiante from './piso-radiante.js';
import * as casaPrefabricada from './casa-prefabricada.js';
import * as cenefa from './cenefa/index.js';
import { obtener as obtenerMaterial } from './materiales.js';
import { planificar } from './planchas/index.js';
import { redondear } from '../core/formato.js';

export const MODALIDADES = {
  CON_MANO_OBRA: 'con_mano_obra',
  SOLO_MATERIAL_COMPLETO: 'solo_material_completo',
  MATERIAL_SUELTO: 'material_suelto',
};

export const NOMBRES_MODALIDAD = {
  [MODALIDADES.CON_MANO_OBRA]: 'Instalación con mano de obra',
  [MODALIDADES.SOLO_MATERIAL_COMPLETO]: 'Solo material, paquete completo',
  [MODALIDADES.MATERIAL_SUELTO]: 'Material suelto por unidad',
};



/**
 * La división se hace con distintas planchas y cada una tiene su precio por m²
 * instalado. Devuelve las líneas ya resueltas y la tarifa, o null si el tipo
 * de trabajo no tiene variantes.
 */
export function variantePedida(pedido) {
  if (pedido.recetaId === divisiones.RECETA_BASE) {
    const lijado = Boolean(pedido.lijado);
    const armada = divisionReceta.lineas(pedido.variante, lijado, pedido.aislante || 'ninguno');
    if (!armada.ok) return null;

    // La división se cobra por m² fijo: el lijado no viene incluido, se
    // suma encima del precio de la plancha.
    const precioM2 =
      Number(armada.variante.precioM2) + (lijado ? divisiones.recargoLijado() : 0);

    return {
      nombre: armada.variante.nombre,
      lineas: armada.lineas,
      lijado,
      tarifa: { ...armada.variante, precioM2: redondear(precioM2) },
    };
  }

  if (pedido.recetaId === casaPrefabricada.RECETA_BASE) {
    const ancho = Number(pedido.medidas?.ancho) || 0;
    const largo = Number(pedido.medidas?.largo) || 0;
    const armada = casaPrefabricada.lineas(pedido.techo, ancho, largo);
    if (!armada.ok) return null;

    // El precio no sale de un S//m² fijo ni de material a costo: es la
    // cuenta compuesta del dueño (tijeral + techo por m² de piso, paredes
    // por m² de perímetro × altura). Con instalación se cobra esa cuenta tal
    // cual; sin instalación (paquete completo) se sigue vendiendo material a
    // precio de venta, como el resto de trabajos.
    return {
      nombre: armada.techo.nombre,
      lineas: armada.lineas,
      tarifa: null,
      cobradoDirecto: pedido.modalidad === MODALIDADES.CON_MANO_OBRA ? armada.medidas.total : null,
      medidasCasa: armada.medidas,
    };
  }

  if (pedido.recetaId === cieloRasoPlanchas.RECETA_BASE) {
    const lijado = Boolean(pedido.lijado);
    const armada = cieloRasoReceta.lineas(pedido.variante, lijado);
    if (!armada.ok) return null;

    // El cielo raso no tiene un precio por m² fijo por plancha: se sigue
    // cobrando material a costo + mano de obra. El lijado, al no haber
    // tarifa donde sumarlo, se agrega directo a la mano de obra.
    return {
      nombre: armada.variante.nombre,
      lineas: armada.lineas,
      lijado,
      tarifa: null,
      recargoLijadoManoObra: lijado ? cieloRasoPlanchas.recargoLijado() : 0,
    };
  }

  if (pedido.recetaId === cenefa.RECETA_BASE) {
    const armada = cenefa.calcular(pedido);
    if (!armada.ok) return null;

    // Sin tarifa fija: el dueño pidió sobre todo saber el costo del
    // material de cada diseño, así que se sigue cobrando material a costo +
    // mano de obra, como el cielo raso de plancha.
    return {
      nombre: cenefa.diseno(pedido.diseno || pedido.forma).nombre,
      lineas: armada.lineas,
      tarifa: null,
      // La mano de obra de la cenefa se edita en Ajustes, no en la receta
      // guardada: el cascarón de recetas-base.js queda solo como marcador.
      manoObraPorM2: cenefa.config().manoObraPorM2,
      // Las líneas ya vienen escaladas contra el área de la banda, no la del
      // ambiente completo: el motor de despiece tiene que multiplicar por
      // esa misma área, no por lo que el usuario escribió como "m²".
      metrosCuadradosEfectivo: armada.areaBanda,
      geo: armada.geo,
    };
  }

  return null;
}

export function resolverTransporte(pedido) {
  if (!pedido.transporte) return transporte.sinTransporte();
  const resultado = transporte.calcular(pedido.transporte.km, {
    idaYVuelta: pedido.transporte.idaYVuelta,
    recargo: pedido.transporte.recargo,
  });
  return resultado.ok ? resultado.transporte : transporte.sinTransporte();
}

/**
 * Redondeo comercial: el total baja al múltiplo de 10 hacia abajo, nunca más
 * de 9 soles. Es la misma cortesía que hace cualquier tienda al cobrar
 * ("cóbrame 340 en vez de 347"), y aplica igual a todos los tipos de trabajo
 * porque vive en el punto donde las tres modalidades arman su cuenta final.
 * Ese descuento sale del margen de la tienda, no se le suma a nadie más.
 */
export function redondeoComercial(total) {
  return Math.floor(total / 10) * 10;
}

export function armarCuenta(subtotal, costoTransporte, descuentoPedido) {
  const descuento = Math.max(0, Number(descuentoPedido) || 0);
  const bruto = redondear(subtotal + costoTransporte);
  const total = redondeoComercial(redondear(Math.max(0, bruto - descuento)));
  return { subtotal: redondear(subtotal), descuento, total };
}

export function calcularMargen(total, costoMaterial, manoObra, envio, piso = null) {
  // El transporte se trata como ingreso, no como ganancia: cubre combustible y
  // tiempo. Se descuenta entero para no inflar el margen aparente.
  const ingresoNeto = redondear(total - envio.total);
  const costos = redondear(costoMaterial + manoObra);
  const ganancia = redondear(ingresoNeto - costos);
  const porcentaje = ingresoNeto > 0 ? redondear((ganancia / ingresoNeto) * 100, 1) : 0;

  return {
    ganancia,
    margenPorcentaje: porcentaje,
    // El mismo cuadro que ya mostraba el cielo raso vinil, para que todos los
    // tipos de trabajo terminen diciendo qué le queda a la tienda.
    cuentaTienda: {
      cobradoAlCliente: ingresoNeto,
      materiales: costoMaterial,
      manoObra,
      transporte: envio.total,
      ganancia: redondear(ganancia + envio.total),
      cobroMinimo: piso,
    },
  };
}

/** Cuántas caras se planchan: la división lleva dos, el cielo raso una. */
const CARAS = { [divisiones.RECETA_BASE]: 2 };

/**
 * Materiales que van en cantidad fija por trabajo, no por m² — un termostato
 * por ambiente, por ejemplo. Cada tipo de trabajo que los necesite declara su
 * propio mapa en su archivo de dominio.
 */
export function cantidadesFijasDe(pedido) {
  if (pedido.recetaId === pisoRadiante.RECETA_BASE) return pisoRadiante.CANTIDADES_FIJAS;
  if (pedido.recetaId === cenefa.RECETA_BASE && pedido.ledTipo !== cenefa.LED.NINGUNA) {
    return { 'driver-led': 1 };
  }
  return null;
}

export function planDePlanchas(pedido, lineas) {
  // La cenefa usa "medidas" para el ambiente (o el diámetro), no para un
  // paño rectangular único: su plancha no se corta con este optimizador.
  if (pedido.recetaId === cenefa.RECETA_BASE) return null;

  const medidas = pedido.medidas;
  const ancho = Number(medidas?.ancho) || 0;
  const largo = Number(medidas?.largo) || 0;
  if (ancho <= 0 || largo <= 0) return null;

  const linea = (lineas || []).find(
    (l) => obtenerMaterial(l.material)?.categoria === 'planchas',
  );
  if (!linea) return null;

  const material = obtenerMaterial(linea.material);
  const resultado = planificar(
    { ancho, alto: largo, caras: CARAS[pedido.recetaId] || 1 },
    {
      plancha: enCentimetros(material.dimensiones),
      desperdicioExtra: pedido.desperdicioExtra,
    },
  );
  if (!resultado.ok) return null;

  return {
    plan: { ...resultado.plan, material: material.id, nombre: material.nombre },
    cantidades: { [material.id]: resultado.plan.planchas },
  };
}

function enCentimetros(dimensiones) {
  if (!dimensiones?.ancho || !dimensiones?.largo) return undefined;
  return {
    ancho: Math.round(dimensiones.ancho * 100),
    alto: Math.round(dimensiones.largo * 100),
  };
}
