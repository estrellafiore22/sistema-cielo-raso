// Funciona sin internet después de la primera visita.
// Archivos propios: se sirven del caché y se actualizan por detrás.
// Librerías (Three.js, jsPDF): versión fija, del caché para siempre.

const VERSION = 'dcp-v1';
const PROPIOS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'iconos/icono.svg', 'iconos/apple-touch-icon.png',
  'js/app.js', 'js/estado.js', 'js/geom.js', 'js/unidades.js', 'js/ui.js', 'js/precios.js', 'js/metrado.js',
  'js/editor2d.js', 'js/vista2d.js', 'js/propiedades.js', 'js/propiedades-ambiente.js', 'js/muebles.js',
  'js/plantillas.js', 'js/ui-techo.js', 'js/ui-metrado.js', 'js/ui-precios.js', 'js/exportar.js',
  'js/descargar.js', 'js/proyectos.js', 'js/vista3d.js', 'js/vista3d-partes.js',
  'js/calc/cortes.js', 'js/calc/partidas.js', 'js/calc/cielo-drywall.js', 'js/calc/baldosa.js',
  'js/calc/pvc.js', 'js/calc/muros.js', 'js/calc/techo.js',
];
const EXTERNOS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(PROPIOS);
    await Promise.all(EXTERNOS.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const externo = url.origin !== location.origin;
  e.respondWith(caches.open(VERSION).then(async c => {
    const enCache = await c.match(e.request, { ignoreSearch: !externo });
    const deRed = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (enCache) { if (!externo) deRed.catch(() => {}); return enCache; }
    return deRed;
  }));
});
