// De la geometría de la cenefa a la lista de materiales.
//
// Reusa los factores por m² ya calibrados de división (estructura de la
// caída) y cielo raso (estructura que se sujeta al techo, y la plancha con
// su acabado): son la misma física, solo cambia a qué superficie se aplican.

import { obtener as obtenerMaterial } from '../materiales.js';
import * as cieloRasoPlanchas from '../cielo-raso-planchas.js';
import { LED } from './config.js';

// Nivel 1: estructura que se sujeta al techo. Mismos factores que el cielo
// raso de drywall, por m² de banda (+ centro, si se planchea).
const OMEGA_POR_M2 = 0.833;
const ALAMBRE_KG_POR_M2 = 0.15;
const CLAVO_NIVEL1_POR_M2 = 4;

// Nivel 2: estructura de la caída (la cenefa misma). Mismos factores que la
// división, por m² de cara vertical.
const RIEL_POR_M2_CAIDA = 0.277;
const PARANTE_POR_M2_CAIDA = 0.833;
const TORNILLO_FRAMER_POR_M2_CAIDA = 10;
const CLAVO_NIVEL2_POR_M2 = 3;

/**
 * @param {object} geo   resultado de geometria.cuadrada() o .redonda()
 * @param {object} opciones
 *   - varianteId: qué plancha (drywall/fibrocemento)
 *   - ledTipo: 'escondida' | 'visible' | 'ninguna'
 *   - planchearCentro: si el hueco central también lleva cielo raso
 * @returns {{ok:boolean, error?:string, lineas?:Array, areaPlancha?:number}}
 */
export function calcular(geo, { varianteId, ledTipo, planchearCentro }) {
  const variante = cieloRasoPlanchas.variante(varianteId);
  if (!geo.areaBanda || geo.areaBanda <= 0) {
    return { ok: false, error: 'Área de la cenefa inválida' };
  }

  const areaNivel1 = geo.areaBanda + (planchearCentro ? geo.areaCentro : 0);
  const areaCaidaTotal = geo.areaCaidaExterior + geo.areaCaidaInterior;
  const areaPlancha = geo.areaBanda + areaCaidaTotal + (planchearCentro ? geo.areaCentro : 0);

  // consumo[materialId] = cantidad en la unidad de CONSUMO de ese material
  // (para los perfiles, coincide con la de venta: son barras enteras).
  const consumo = {};
  const sumar = (materialId, cantidad) => {
    if (!(cantidad > 0)) return;
    consumo[materialId] = (consumo[materialId] || 0) + cantidad;
  };
  // Perímetros y otras medidas lineales se pasan a barras con el largo real
  // del material, en vez de un número fijo: si mañana cambia el largo de
  // fábrica en el catálogo, esto se ajusta solo.
  const enBarras = (materialId, metros) => {
    const largo = obtenerMaterial(materialId)?.dimensiones?.largo;
    if (!largo) return;
    sumar(materialId, metros / largo);
  };

  // --- Nivel 1: estructura que se sujeta al techo ---
  sumar('omega', OMEGA_POR_M2 * areaNivel1);
  sumar('alambre-16', ALAMBRE_KG_POR_M2 * areaNivel1);
  enBarras('angular-24', geo.perimetroExterior); // contra la pared, a tope
  sumar('clavo-impacto', CLAVO_NIVEL1_POR_M2 * areaNivel1);

  // --- Nivel 2: estructura de la cenefa (la caída) ---
  sumar('riel-64', RIEL_POR_M2_CAIDA * areaCaidaTotal);
  sumar('parante-64', PARANTE_POR_M2_CAIDA * areaCaidaTotal);
  sumar('tornillo-framer', TORNILLO_FRAMER_POR_M2_CAIDA * areaCaidaTotal);
  sumar('clavo-impacto', CLAVO_NIVEL2_POR_M2 * areaCaidaTotal);

  // --- Nivel 3: acabado — plancha, su tornillo, su junta, y el esquinero
  // donde la banda horizontal se encuentra con la caída vertical ---
  const rendimientoPlancha = obtenerMaterial(variante.plancha)?.rendimiento || 2.98;
  sumar(variante.plancha, areaPlancha / rendimientoPlancha);
  sumar(variante.tornillo, tornilloPorM2(variante.acabado) * areaPlancha);
  for (const l of cieloRasoPlanchas.ACABADO_POR_M2[variante.acabado] || []) {
    sumar(l.material, l.porM2 * areaPlancha);
  }
  enBarras('esquinero-pvc', geo.perimetroExterior + geo.perimetroInterior);

  // --- Luz LED: escondida (solo tira) o a la vista (canaleta + tapa) ---
  if (ledTipo === LED.VISIBLE) {
    enBarras('canaleta-aluminio-led', geo.perimetroInterior);
    enBarras('tapa-difusora-led', geo.perimetroInterior);
    sumar('tira-led', geo.perimetroInterior);
  } else if (ledTipo === LED.ESCONDIDA) {
    // Escondida dentro del cajón de drywall: el mismo drywall del nivel 3
    // hace de escondite, así que solo hace falta la tira.
    sumar('tira-led', geo.perimetroInterior);
  }
  if (ledTipo !== LED.NINGUNA) {
    // Un driver por trabajo, no por metro: este número es solo un valor de
    // partida para que la línea exista, precios-comun.js lo pisa con 1 vía
    // cantidadesFijasDe (mismo mecanismo que el termostato del piso radiante).
    sumar('driver-led', 0.01);
  }

  const lineas = Object.entries(consumo).map(([material, cantidad]) => ({
    material,
    // Se pasa ya resuelto: la receta guardada de cenefa_3d es un cascarón
    // vacío, porque el consumo depende de la forma y las medidas del día.
    porM2: cantidad / geo.areaBanda,
  }));

  return { ok: true, lineas, areaPlancha, areaNivel1, areaCaidaTotal };
}

function tornilloPorM2(acabado) {
  // Mismo criterio que cielo-raso-planchas.js: tornillos de plancha.
  return acabado === 'fibrocemento' ? 12 : 22;
}
