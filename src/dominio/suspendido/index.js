// Cálculo completo de un cielo raso suspendido.
//
// Prueba las dos orientaciones posibles de la T principal y se queda con la
// que cuesta menos. La diferencia no es cosmética: si el largo del ambiente
// deja un recorte chico, cada línea de principal obliga a sacrificar una
// barra de 366 cm para sacar un pedacito, porque el resto queda sin puntas
// de empate y ya no sirve.

import { construir } from './geometria.js';
import { calcular as calcularMateriales } from './materiales.js';
import { alcanceDeSobrantes } from './cortes.js';
import { config, precios, LARGOS } from './config.js';
import { redondear } from '../../core/formato.js';

export { LARGOS, NOMBRES, COLORES } from './config.js';
export * as configuracion from './config.js';

const ORIENTACIONES = ['vertical', 'horizontal'];

/**
 * @param {object} entrada
 *   - ancho, largo   en centímetros (lo preciso)
 *   - metrosCuadrados  alternativa cuando no se conocen las medidas
 *   - orientacion    'vertical' | 'horizontal' | 'auto'
 */
export function calcular(entrada) {
  const medidas = resolverMedidas(entrada);
  if (!medidas.ok) return medidas;

  const cfg = config();
  const tarifa = precios();
  const pedida = entrada.orientacion || 'auto';

  const opciones = [];
  for (const orientacion of ORIENTACIONES) {
    const geo = construir(medidas.ancho, medidas.largo, orientacion);
    if (!geo.ok) return geo;
    const materiales = calcularMateriales(geo.grid, cfg);
    const cuenta = cotizar(materiales, tarifa);
    opciones.push({ orientacion, grid: geo.grid, materiales, ...cuenta });
  }

  const masBarata = opciones.reduce((a, b) => (b.total < a.total ? b : a));
  const elegida =
    pedida === 'auto' ? masBarata : opciones.find((o) => o.orientacion === pedida);

  const otra = opciones.find((o) => o.orientacion !== elegida.orientacion);

  return {
    ok: true,
    calculo: {
      ...elegida,
      medidas,
      config: cfg,
      precios: tarifa,
      orientacionPedida: pedida,
      esLaMasBarata: elegida.orientacion === masBarata.orientacion,
      comparacion: {
        elegida: { orientacion: elegida.orientacion, total: elegida.total },
        alternativa: { orientacion: otra.orientacion, total: otra.total },
        ahorro: redondear(otra.total - elegida.total),
      },
      sobrantes: resumirSobrantes(elegida.materiales),
      calculadoEn: new Date().toISOString(),
    },
  };
}

function resolverMedidas(entrada) {
  const ancho = Number(entrada.ancho);
  const largo = Number(entrada.largo);

  if (Number.isFinite(ancho) && Number.isFinite(largo) && ancho > 0 && largo > 0) {
    return {
      ok: true,
      ancho,
      largo,
      area: redondear((ancho * largo) / 10000, 2),
      exactas: true,
    };
  }

  // Sin medidas reales solo se puede suponer un ambiente cuadrado. Sirve para
  // un precio de referencia, no para mandar a cortar.
  const area = Number(entrada.metrosCuadrados);
  if (Number.isFinite(area) && area > 0) {
    const lado = redondear(Math.sqrt(area) * 100, 1);
    return {
      ok: true,
      ancho: lado,
      largo: lado,
      area: redondear(area, 2),
      exactas: false,
      aviso:
        'Solo diste los metros cuadrados, así que el cálculo supone un ambiente ' +
        'cuadrado. Los cortes y el plano cambian con las medidas reales: carga ' +
        'ancho × largo antes de mandar a cortar.',
    };
  }

  return {
    ok: false,
    error: 'Ingresa ancho y largo, o al menos los metros cuadrados',
  };
}

/** Precio de cada material según cómo lo cobra el proveedor. */
function cotizar(materiales, tarifa) {
  const lineas = [];

  for (const clave of [
    'perimetral',
    'principal',
    'secundaria',
    'terciaria',
    'baldosa',
    'alambre',
    'tornillo',
    'comboClavos',
  ]) {
    const material = materiales[clave];
    if (!material) continue;

    const cantidad = material.comprar || 0;
    const precioUnit = Number(tarifa[clave]) || 0;
    const subtotal = redondear(cantidad * precioUnit);

    lineas.push({
      clave,
      nombre: material.nombre,
      cantidad,
      unidad: unidadDeCobro(clave),
      precioUnit,
      subtotal,
      sinPrecio: precioUnit === 0 && cantidad > 0,
      material,
    });
  }

  return {
    lineas,
    total: redondear(lineas.reduce((s, l) => s + l.subtotal, 0)),
    faltanPrecios: lineas.filter((l) => l.sinPrecio).map((l) => l.nombre),
  };
}

function unidadDeCobro(clave) {
  if (clave === 'alambre') return 'm';
  if (clave === 'comboClavos') return 'combo';
  if (clave === 'baldosa') return 'baldosa';
  return 'un';
}

/**
 * Junta todo lo que sobra con punta de empate y calcula para cuántos huecos
 * más alcanza, tomando como referencia los recortes que ya hizo esta obra.
 */
function resumirSobrantes(materiales) {
  const salida = [];

  for (const clave of ['perimetral', 'principal', 'secundaria', 'terciaria', 'baldosa']) {
    const material = materiales[clave];
    if (!material || !material.sobrantes?.length) continue;

    // Las medidas de recorte que esta obra ya usó son las candidatas naturales
    // para reaprovechar el sobrante en el mismo proyecto.
    const medidasUsadas = new Set();
    for (const corte of material.cortes || []) {
      for (const pieza of corte.piezas || []) medidasUsadas.add(redondear(pieza));
    }

    const alcances = Array.from(medidasUsadas)
      .sort((a, b) => b - a)
      .map((medida) => ({
        medida,
        detalle: alcanceDeSobrantes(material.sobrantes, medida, material.conEmpate),
      }))
      .filter((a) => a.detalle.length > 0);

    salida.push({
      clave,
      nombre: material.nombre,
      conEmpate: material.conEmpate,
      piezas: material.sobrantes,
      totalCm: redondear(
        material.sobrantes.reduce((s, p) => s + p.largo * p.cantidad, 0),
      ),
      alcances,
      merma: material.merma,
    });
  }

  return salida;
}

/**
 * Convierte el cálculo en las líneas que consume el motor de cotización del
 * sistema, para que un cielo raso suspendido se pueda vender como cualquier
 * otro pedido.
 */
export function aLineasDePedido(calculo) {
  return calculo.lineas
    .filter((l) => l.cantidad > 0)
    .map((l) => ({
      concepto: l.nombre,
      cantidad: l.cantidad,
      unidad: l.unidad,
      precioUnitario: l.precioUnit,
      total: l.subtotal,
    }));
}
