// Entrega un archivo al usuario. En iPhone/iPad (sobre todo como app de
// pantalla de inicio) la descarga directa falla a veces: ahí se usa el menú
// Compartir del sistema, que permite "Guardar en Archivos" o enviar por WhatsApp.

const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function descargar(blob, nombre) {
  const archivo = new File([blob], nombre, { type: blob.type });
  if (esIOS && navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function dataUrlABlob(url) { return (await fetch(url)).blob(); }

export const nombreArchivo = (base, ext) =>
  (base || 'proyecto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50) + '.' + ext;
