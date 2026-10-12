// Guardar y abrir proyectos. Se guardan en este navegador y, como respaldo,
// se pueden bajar a un archivo .json y abrir en cualquier otro equipo.

import * as E from './estado.js';
import { el, aviso } from './ui.js';
import { archivoProyecto } from './exportar.js';
import { PLANTILLAS } from './plantillas.js';

const CLAVE = 'dcp:proyectos';
const dlg = document.getElementById('dlgProyectos');

function lista() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } }
function guardarLista(l) {
  try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; }
  catch { aviso('No hay espacio para guardar. Exporta y borra proyectos viejos.'); return false; }
}

export function guardarActual() {
  const p = E.obtener();
  const l = lista();
  const id = String(p.creado);
  l[id] = { nombre: p.nombre, cliente: p.cliente || '', fecha: Date.now(), datos: p };
  if (guardarLista(l)) aviso('Proyecto guardado');
}

function abrirArchivo() {
  const i = el('input', { type: 'file', accept: '.json,application/json' });
  i.addEventListener('change', async () => {
    const f = i.files[0]; if (!f) return;
    try {
      const datos = JSON.parse(await f.text());
      if (!Array.isArray(datos.muros)) throw new Error('no es un proyecto');
      delete datos.preciosUsados; delete datos.app;
      E.cargar(datos); dlg.close(); aviso('Proyecto abierto');
      document.dispatchEvent(new CustomEvent('dcp:encuadrar'));
    } catch (e) { aviso('Ese archivo no es un proyecto de DrywallCot Pro'); }
  });
  i.click();
}

export function abrirProyectos() {
  const l = lista();
  const items = Object.entries(l).sort((a, b) => b[1].fecha - a[1].fecha).map(([id, x]) => el('li', {}, [
    el('div', { clase: 't' }, [x.nombre, el('small', { texto: (x.cliente ? x.cliente + ' · ' : '') + new Date(x.fecha).toLocaleString('es-PE') })]),
    el('button', { texto: 'Abrir', onclick: () => {
      guardarActualSilencioso();
      E.cargar(x.datos); dlg.close(); aviso('Abierto: ' + x.nombre); document.dispatchEvent(new CustomEvent('dcp:encuadrar'));
    } }),
    el('button', { clase: 'peligro', texto: '✕', title: 'Borrar', onclick: () => {
      if (!confirm(`¿Borrar “${x.nombre}” de este equipo?`)) return;
      const n = lista(); delete n[id]; guardarLista(n); abrirProyectos();
    } }),
  ]));
  const plantilla = el('select', {}, Object.entries(PLANTILLAS).map(([k, v]) => el('option', { value: k, texto: v.nombre })));
  dlg.replaceChildren(
    el('div', { clase: 'cuerpo' }, [
      el('h3', { texto: 'Proyectos' }),
      el('div', { clase: 'botones', style: 'margin-bottom:12px' }, [
        el('button', { clase: 'primario', texto: 'Guardar el actual', onclick: () => { guardarActual(); abrirProyectos(); } }),
        el('button', { texto: 'Bajar archivo .json', onclick: archivoProyecto }),
        el('button', { texto: 'Abrir archivo…', onclick: abrirArchivo }),
      ]),
      el('label', { clase: 'campo' }, ['Proyecto nuevo desde', el('div', { clase: 'fila' }, [plantilla,
        el('button', { texto: 'Crear', onclick: () => {
          guardarActualSilencioso();
          E.cargar(PLANTILLAS[plantilla.value].crear()); dlg.close(); aviso('Proyecto nuevo'); document.dispatchEvent(new CustomEvent('dcp:encuadrar'));
        } })])]),
      el('h3', { texto: 'Guardados en este equipo' }),
      items.length ? el('ul', { clase: 'lista-proy' }, items) : el('p', { clase: 'nota', texto: 'Todavía no guardaste proyectos.' }),
      el('p', { clase: 'nota', texto: 'Los proyectos viven en este navegador. Baja el archivo .json de vez en cuando como respaldo.' }),
    ]),
    el('div', { clase: 'pie' }, el('button', { texto: 'Cerrar', onclick: () => dlg.close() })),
  );
  if (!dlg.open) dlg.showModal();
}

// Antes de cambiar de proyecto, el actual queda guardado si ya estaba en la lista.
function guardarActualSilencioso() {
  const p = E.obtener(), l = lista(), id = String(p.creado);
  if (l[id]) { l[id] = { ...l[id], nombre: p.nombre, cliente: p.cliente || '', fecha: Date.now(), datos: p }; guardarLista(l); }
}
