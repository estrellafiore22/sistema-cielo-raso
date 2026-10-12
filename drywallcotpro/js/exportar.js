// Exportar: imagen del plano, imagen 3D, PDF completo y archivo de proyecto.

import * as E from './estado.js';
import { el, aviso } from './ui.js';
import { imagenPlano } from './editor2d.js';
import { imagen3d } from './vista3d.js';
import { calcularTodo } from './metrado.js';
import { descargar, dataUrlABlob, nombreArchivo } from './descargar.js';
import { exportarPrecios } from './precios.js';

const dlg = document.getElementById('dlgExportar');

export function abrirExportar() {
  const p = E.obtener();
  const accion = (texto, fn, nota) => el('div', { style: 'margin-bottom:10px' }, [
    el('button', { clase: 'primario', style: 'width:100%', texto, onclick: async () => {
      try { await fn(); } catch (e) { console.error(e); aviso('No se pudo exportar: ' + e.message); }
    } }), nota ? el('div', { clase: 'nota', texto: nota }) : null]);
  dlg.replaceChildren(
    el('div', { clase: 'cuerpo' }, [
      el('h3', { texto: 'Exportar “' + p.nombre + '”' }),
      accion('PDF completo (plano + 3D + presupuesto)', pdf, 'Para enviar al cliente por WhatsApp o correo.'),
      accion('Imagen del plano 2D (PNG)', async () => descargar(await dataUrlABlob(imagenPlano()), nombreArchivo(p.nombre + '-plano', 'png'))),
      accion('Imagen de la vista 3D (PNG)', async () => descargar(await dataUrlABlob(imagen3d()), nombreArchivo(p.nombre + '-3d', 'png')), 'Sale con el ángulo que dejaste en la pestaña Vista 3D.'),
      accion('Archivo del proyecto (.json)', archivoProyecto, 'Para guardarlo como respaldo o abrirlo en otro equipo (Proyectos → Abrir archivo).'),
    ]),
    el('div', { clase: 'pie' }, el('button', { texto: 'Cerrar', onclick: () => dlg.close() })),
  );
  dlg.showModal();
}

export async function archivoProyecto() {
  const p = E.obtener();
  const datos = { app: 'DrywallCot Pro', ...p, preciosUsados: exportarPrecios() };
  await descargar(new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' }), nombreArchivo(p.nombre, 'json'));
}

const S = n => 'S/ ' + (Math.round(n * 100) / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const N = n => (+n).toLocaleString('es-PE', { maximumFractionDigits: 2 });

async function pdf() {
  if (!window.jspdf) throw new Error('falta la librería PDF (¿sin internet la primera vez?)');
  aviso('Armando el PDF…');
  const p = E.obtener();
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 12;
  const cabecera = titulo => {
    doc.setFillColor(29, 39, 51); doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(255); doc.setFontSize(13); doc.text('DrywallCot Pro', M, 11.5);
    doc.setFontSize(10); doc.text(titulo, W - M, 11.5, { align: 'right' });
    doc.setTextColor(30);
  };
  cabecera('Plano 2D');
  doc.setFontSize(15); doc.text(p.nombre, M, 28);
  doc.setFontSize(10);
  const info = [p.cliente && 'Cliente: ' + p.cliente, p.direccion && 'Obra: ' + p.direccion, 'Fecha: ' + new Date().toLocaleDateString('es-PE')].filter(Boolean);
  doc.text(info.join('   ·   '), M, 34);
  doc.addImage(imagenPlano(1800, 1300), 'PNG', M, 40, W - 2 * M, (W - 2 * M) * 1300 / 1800);
  doc.addPage(); cabecera('Vista 3D');
  doc.addImage(imagen3d(1600, 1100), 'PNG', M, 26, W - 2 * M, (W - 2 * M) * 1100 / 1600);

  const r = calcularTodo(p);
  doc.addPage(); cabecera('Metrado y presupuesto');
  let y = 28;
  const linea = (cols, { negrita = false, tam = 9 } = {}) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(tam);
    const soloTexto = cols.length === 1;
    const partes = cols[0] != null ? doc.splitTextToSize(String(cols[0]), soloTexto ? W - 2 * M : 105) : [''];
    if (y + partes.length * 4.2 > 284) { doc.addPage(); cabecera('Metrado y presupuesto (cont.)'); y = 28; doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(tam); }
    const xs = [M, 128, 131, 168, W - M];
    doc.text(partes, M, y);
    cols.slice(1).forEach((c, i) => { if (c != null) doc.text(String(c), xs[i + 1], y, { align: i + 1 === 2 ? 'left' : 'right' }); });
    y += Math.max(5.2, partes.length * 4.2 + 1);
  };
  linea(['Material / partida', 'Cant.', 'Unid.', 'P. unit.', 'Subtotal'], { negrita: true });
  let grupo = null;
  for (const f of r.filas) {
    if (f.esMO && !p.presupuesto.incluirMO) continue;
    if (f.grupo !== grupo) { grupo = f.grupo; y += 1; linea([grupo], { negrita: true }); }
    linea([f.nombre, N(f.cantidad), f.unidad, S(f.precio), S(f.subtotal)]);
  }
  y += 3;
  const t = r.totales;
  [['Materiales', t.materiales], ['Mano de obra', t.manoObra], ['Transporte', t.transporte], [`Margen ${p.presupuesto.margen} %`, t.margen], ['Subtotal', t.subtotal],
    ...(p.presupuesto.igv ? [['IGV 18 %', t.igv]] : [])].forEach(([k, v]) => linea([null, null, null, k, S(v)]));
  linea([null, null, null, 'TOTAL', S(t.total)], { negrita: true, tam: 12 });
  y += 4;
  doc.setFont('helvetica', 'normal');
  for (const s of r.secciones) {
    linea([s.titulo], { negrita: true });
    for (const d of s.detalle || []) linea([d.replace(/→/g, '->')], { tam: 8 });
    y += 1;
  }
  doc.setFontSize(7); doc.setTextColor(120);
  doc.text('Cantidades calculadas con rendimientos típicos; verificar en obra. Precios referenciales en soles (S/).', M, 292);
  await descargar(doc.output('blob'), nombreArchivo(p.nombre, 'pdf'));
}
