// Arranque: conecta pestañas, barra de herramientas y avisos de cambios.

import * as E from './estado.js';
import { aviso } from './ui.js';
import { fijarUnidad } from './unidades.js';
import { iniciarEditor, fijarHerramienta, redibujar, encuadrarTodo, opciones, borrar } from './editor2d.js';
import { actualizarPanel } from './propiedades.js';
import { construirTecho, refrescarTecho } from './ui-techo.js';
import { construirMetrado, refrescarMetrado } from './ui-metrado.js';
import { construirPrecios } from './ui-precios.js';
import { abrirExportar } from './exportar.js';
import { abrirProyectos, guardarActual } from './proyectos.js';

// La app nunca muere por un error: avisa y sigue.
window.addEventListener('error', e => { console.error(e.error || e.message); aviso('Ocurrió un error: ' + (e.message || 'desconocido')); });
window.addEventListener('unhandledrejection', e => { console.error(e.reason); aviso('Ocurrió un error: ' + (e.reason?.message || e.reason)); });

const $ = s => document.querySelector(s);
const PREF = 'dcp:preferencias';
let pestana = 'plano';
let vista3d = null; // se carga recién al abrir la pestaña 3D (Three.js pesa)

function leerPref() { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } }
function guardarPref() { try { localStorage.setItem(PREF, JSON.stringify({ cuadricula: opciones.cuadricula, orto: opciones.orto, unidad: $('#selUnidad').value })); } catch { /* nada */ } }

async function cargar3d() {
  if (!vista3d) {
    try { vista3d = await import('./vista3d.js'); }
    catch (e) { console.error(e); aviso('No se pudo cargar el 3D. Revisa tu conexión a internet.'); return null; }
    document.querySelectorAll('.opciones3d input').forEach(c => c.dispatchEvent(new Event('change')));
  }
  return vista3d;
}

async function mostrarPestana(nombre) {
  pestana = nombre;
  document.querySelectorAll('.pestanas button').forEach(b => b.classList.toggle('activa', b.dataset.pestana === nombre));
  document.querySelectorAll('.pestana').forEach(s => s.classList.toggle('activa', s.id === 'pestana-' + nombre));
  if (nombre === 'tres') (await cargar3d())?.mostrar3d(true);
  else vista3d?.mostrar3d(false);
  if (nombre === 'plano') redibujar();
  if (nombre === 'techo') refrescarTecho();
  if (nombre === 'metrado') refrescarMetrado();
}

function alCambiar(motivo) {
  redibujar();
  actualizarPanel(motivo === 'carga');
  vista3d?.marcarSucia();
  if (motivo === 'seleccion' || motivo === 'arrastre') return;
  if (pestana === 'techo') refrescarTecho();
  if (pestana === 'metrado') refrescarMetrado();
  const n = $('#nombreProyecto');
  if (n !== document.activeElement) n.value = E.obtener().nombre;
}

function iniciar() {
  E.iniciar();
  const pref = leerPref();
  if (pref.cuadricula !== undefined) { opciones.cuadricula = pref.cuadricula; $('#selCuadricula').value = String(pref.cuadricula); }
  if (pref.orto !== undefined) { opciones.orto = pref.orto; $('#chkOrto').checked = pref.orto; }
  if (pref.unidad) { $('#selUnidad').value = pref.unidad; fijarUnidad(pref.unidad); }

  iniciarEditor();
  construirTecho(); construirMetrado(); construirPrecios();
  E.suscribir(alCambiar);
  actualizarPanel(true);
  $('#nombreProyecto').value = E.obtener().nombre;
  requestAnimationFrame(encuadrarTodo);

  document.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => mostrarPestana(b.dataset.pestana)));
  document.querySelectorAll('#herramientas [data-herr]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#herramientas [data-herr]').forEach(x => x.classList.toggle('activa', x === b));
    fijarHerramienta(b.dataset.herr);
    if (b.dataset.herr !== 'seleccionar') E.seleccionar(null); else actualizarPanel(true);
  }));
  $('#btnEncuadrar').addEventListener('click', encuadrarTodo);
  $('#selCuadricula').addEventListener('change', e => { opciones.cuadricula = +e.target.value; guardarPref(); });
  $('#chkOrto').addEventListener('change', e => { opciones.orto = e.target.checked; guardarPref(); });
  $('#selUnidad').addEventListener('change', e => { fijarUnidad(e.target.value); guardarPref(); redibujar(); actualizarPanel(true); refrescarMetrado(); });
  $('#nombreProyecto').addEventListener('change', e => E.cambiar(p => { p.nombre = e.target.value.trim().slice(0, 60) || 'Proyecto'; }));
  $('#btnDeshacer').addEventListener('click', E.deshacer);
  $('#btnRehacer').addEventListener('click', E.rehacer);
  $('#btnProyectos').addEventListener('click', abrirProyectos);
  $('#btnExportar').addEventListener('click', abrirExportar);

  const vis = { chk3dTecho: 'techo', chk3dCubierta: 'cubierta', chk3dCielo: 'cielos', chk3dMuros: 'muros', chk3dMuebles: 'muebles' };
  for (const [id, k] of Object.entries(vis)) $('#' + id).addEventListener('change', e => vista3d?.fijarVisible(k, e.target.checked));
  $('#btn3dVista').addEventListener('click', () => vista3d?.vistaInicial());

  document.addEventListener('dcp:encuadrar', () => requestAnimationFrame(encuadrarTodo));
  document.addEventListener('dcp:precios', () => { refrescarMetrado(); refrescarTecho(); actualizarPanel(true); redibujar(); vista3d?.marcarSucia(); });

  document.addEventListener('keydown', e => {
    const escribiendo = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !escribiendo) { e.preventDefault(); e.shiftKey ? E.rehacer() : E.deshacer(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); guardarActual(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !escribiendo && E.seleccion && pestana === 'plano') borrar(E.seleccion);
    else if (e.key === 'Escape') { E.seleccionar(null); fijarHerramienta(opciones.herramienta); }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

iniciar();
