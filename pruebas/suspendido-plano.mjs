// Playwright vive fuera del repositorio (ver correr.sh), así que se resuelve
// por ruta absoluta: los módulos ES no miran NODE_PATH. Y como el paquete es
// CommonJS, al importarlo así queda colgado de `default`.
const _pw = await import(process.env.PLAYWRIGHT_MODULO || 'playwright');
const chromium = _pw.chromium || _pw.default.chromium;

const BASE = 'http://localhost:8765';
const DIR = process.env.SALIDA || '/tmp/capturas';
const pasos = [];
const errores = [];
const paso = (n, ok, d = '') => {
  pasos.push({ n, ok });
  console.log(`${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
};

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1000 } });
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await pagina.goto(BASE, { waitUntil: 'networkidle' });
await pagina.fill('.ingreso__formulario input[type="text"]', 'admin');
await pagina.fill('.ingreso__formulario input[type="password"]', 'admin');
await pagina.click('button[type="submit"]');
await pagina.waitForTimeout(500);

await pagina.goto(BASE + '#/suspendido', { waitUntil: 'networkidle' });
await pagina.waitForTimeout(700);

paso('La pantalla carga', await pagina.locator('.plano__svg').isVisible());

const conteos = await pagina.evaluate(() => ({
  principales: document.querySelectorAll('.plano__barras line[stroke="#c0392b"]').length,
  todas: document.querySelectorAll('.plano__barras line').length,
  baldosas: document.querySelectorAll('.plano__baldosas rect').length,
  puntos: document.querySelectorAll('.plano__puntos circle').length,
  cotas: document.querySelectorAll('.plano__cotas line').length,
  etiquetas: document.querySelectorAll('.plano__etiquetas text').length,
}));
paso('Dibuja retícula, baldosas, puntos y cotas',
  conteos.todas > 50 && conteos.baldosas === 63 && conteos.puntos > 0 && conteos.cotas > 10,
  JSON.stringify(conteos));

paso('Rotula medidas en el plano', conteos.etiquetas > 15, `${conteos.etiquetas} etiquetas`);

// Tablas
const tablas = await pagina.evaluate(() => {
  const texto = document.querySelector('#app').textContent;
  return {
    tecnica: texto.includes('Material a instalar'),
    recortes: texto.includes('Recortes y sobrantes'),
    precios: texto.includes('Total del material'),
    orientacion: texto.includes('T principales en'),
    filas: document.querySelectorAll('.tabla tbody tr').length,
  };
});
paso('Muestra las tres tablas y el aviso de orientación',
  tablas.tecnica && tablas.recortes && tablas.precios && tablas.orientacion,
  JSON.stringify(tablas));

// Cambiar medida → el plano se actualiza
const antes = await pagina.evaluate(() => document.querySelectorAll('.plano__baldosas rect').length);
await pagina.fill('.panel input[type="number"] >> nth=0', '700');
await pagina.waitForTimeout(600);
const despues = await pagina.evaluate(() => document.querySelectorAll('.plano__baldosas rect').length);
paso('El plano se redibuja al cambiar la medida', despues !== antes, `${antes} → ${despues} baldosas`);

const areaTexto = await pagina.locator('#suspendido-area').textContent();
paso('El área se recalcula sola', areaTexto.includes('29.12'), areaTexto);

// Zoom con rueda
const antesZoom = await pagina.evaluate(() =>
  document.querySelector('.plano__camara').getAttribute('transform'));
await pagina.locator('.plano__svg').hover();
await pagina.mouse.wheel(0, -400);
await pagina.waitForTimeout(300);
const despuesZoom = await pagina.evaluate(() =>
  document.querySelector('.plano__camara').getAttribute('transform'));
paso('La rueda del ratón acerca el plano', antesZoom !== despuesZoom,
  `${antesZoom} → ${despuesZoom}`);

// El texto se contra-escala para no crecer con el zoom
const fuente = await pagina.evaluate(() => {
  const k = Number(document.querySelector('.plano__camara').getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]);
  const f = Number(document.querySelector('.plano__etiquetas').getAttribute('font-size'));
  return { k, f };
});
paso('El texto no crece con el zoom', fuente.k > 1 && fuente.f > 0,
  `escala=${fuente.k.toFixed(2)} fuente=${fuente.f}`);

// Botón Ajustar vuelve a encuadrar
await pagina.click('button:has-text("Ajustar")');
await pagina.waitForTimeout(300);
const encuadrado = await pagina.evaluate(() =>
  document.querySelector('.plano__camara').getAttribute('transform'));
paso('El botón Ajustar vuelve a encuadrar', encuadrado === 'translate(0 0) scale(1)', encuadrado);

// Arrastrar mueve el plano
const caja = await pagina.locator('.plano__svg').boundingBox();
await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await pagina.mouse.down();
await pagina.mouse.move(caja.x + caja.width / 2 + 80, caja.y + caja.height / 2 + 40, { steps: 5 });
await pagina.mouse.up();
await pagina.waitForTimeout(200);
const movido = await pagina.evaluate(() =>
  document.querySelector('.plano__camara').getAttribute('transform'));
paso('Arrastrar mueve el plano', movido !== 'translate(0 0) scale(1)', movido);

// Girar las principales
await pagina.click('button:has-text("Ajustar")');
const orientacionAntes = await pagina.locator('.bloque--resaltado .destacado').textContent();
await pagina.click('button:has-text("Girar las T principales")');
await pagina.waitForTimeout(600);
const orientacionDespues = await pagina.locator('.bloque--resaltado .destacado').textContent();
paso('El botón gira las T principales', orientacionAntes !== orientacionDespues,
  `${orientacionAntes.trim()} → ${orientacionDespues.trim()}`);

// Modo solo m²
await pagina.click('button:has-text("Solo metros cuadrados")');
await pagina.waitForTimeout(300);
await pagina.fill('.panel input[type="number"] >> nth=0', '43.92');
await pagina.waitForTimeout(600);
const avisoM2 = (await pagina.locator('#app').textContent()).includes('supone un ambiente');
paso('Modo solo m² avisa que las medidas son supuestas', avisoM2);

await pagina.click('button:has-text("Ancho × largo")');
await pagina.waitForTimeout(500);
await pagina.click('button:has-text("Ajustar")');
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: `${DIR}/plano-suspendido.png`, fullPage: true });

await navegador.close();
console.log('\n--- Errores ---');
console.log(errores.length ? errores.join('\n') : 'ninguno');
const fallidos = pasos.filter((p) => !p.ok).length;
console.log(`\n${pasos.length - fallidos}/${pasos.length} pruebas pasaron`);
process.exit(fallidos === 0 && errores.length === 0 ? 0 : 1);
