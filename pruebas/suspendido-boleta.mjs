// Playwright vive fuera del repositorio (ver correr.sh), así que se resuelve
// por ruta absoluta: los módulos ES no miran NODE_PATH. Y como el paquete es
// CommonJS, al importarlo así queda colgado de `default`.
const _pw = await import(process.env.PLAYWRIGHT_MODULO || 'playwright');
const chromium = _pw.chromium || _pw.default.chromium;
const BASE = 'http://localhost:8765';
const DIR = process.env.SALIDA || '/tmp/capturas';
const pasos = []; const errores = [];
const paso = (n, ok, d='') => { pasos.push({n,ok}); console.log(`${ok?'✅':'❌'} ${n}${d?' — '+d:''}`); };

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await nav.newPage({ viewport: { width: 1300, height: 1000 } });
pg.on('pageerror', e => errores.push('pageerror: ' + e.message));
pg.on('console', m => { if (m.type()==='error') errores.push('console: ' + m.text()); });

await pg.goto(BASE, { waitUntil: 'networkidle' });
await pg.fill('.ingreso__formulario input[type="text"]', 'admin');
await pg.fill('.ingreso__formulario input[type="password"]', 'admin');
await pg.click('button[type="submit"]');
await pg.waitForTimeout(500);
// El perimetral ya no debe decir "necesita empate"
const insignias = await pg.evaluate(async () => {
  const s = await import('/src/dominio/suspendido/index.js');
  const r = s.calcular({ ancho: 535, largo: 416, orientacion: 'auto' });
  const out = {};
  for (const m of Object.values(r.calculo.materiales)) {
    if (m.cortes?.length) out[m.nombre] = m.conEmpate ? 'necesita empate' : 'corte libre';
  }
  return out;
});
paso('El ángulo perimetral es corte libre, no empate',
  insignias['Ángulo perimetral'] === 'corte libre', JSON.stringify(insignias));
paso('Las T sí exigen empate',
  insignias['T principal'] === 'necesita empate' && insignias['T terciaria'] === 'necesita empate');

// El sobrante del perimetral ahora rinde varios recortes
const alcancePerimetral = await pg.evaluate(async () => {
  const s = await import('/src/dominio/suspendido/index.js');
  const c = await import('/src/dominio/suspendido/cortes.js');
  const r = s.calcular({ ancho: 700, largo: 416, orientacion: 'vertical' });
  const p = r.calculo.sobrantes.find(x => x.clave === 'perimetral');
  const sobra = [{ largo: 125, cantidad: 1 }];
  return {
    conEmpate: p ? p.conEmpate : null,
    // Sin empate el sobrante se parte varias veces; con empate, solo una.
    libre: c.alcanceDeSobrantes(sobra, 50, false)[0],
    conE: c.alcanceDeSobrantes(sobra, 50, true)[0],
  };
});
paso('Sin empate el sobrante se parte varias veces; con empate, una sola',
  alcancePerimetral.conEmpate === false &&
  alcancePerimetral.libre.recortes === 2 && alcancePerimetral.libre.restoPorPieza === 25 &&
  alcancePerimetral.conE.recortes === 1,
  `125 cm → sin empate ${alcancePerimetral.libre.recortes} de 50 (sobran ${alcancePerimetral.libre.restoPorPieza}), con empate ${alcancePerimetral.conE.recortes}`);

// Hoja técnica
const boleta = await pg.evaluate(async () => {
  const s = await import('/src/dominio/suspendido/index.js');
  const b = await import('/src/impresion/boleta-tecnica.js');
  const r = s.calcular({ ancho: 535, largo: 416, orientacion: 'auto' });
  const hoja = b.construir(r.calculo, { cliente: 'Rosa Mendoza', direccion: 'Av. Los Álamos 456' });
  document.body.appendChild(hoja);
  return {
    texto: hoja.textContent.length,
    tienePlano: !!hoja.querySelector('.plano__svg'),
    lineasPlano: hoja.querySelectorAll('.plano__barras line').length,
    tieneCortes: hoja.textContent.includes('Cortes'),
    tieneSobrantes: hoja.textContent.includes('Queda para otras obras'),
    tieneTotal: hoja.textContent.includes('TOTAL DEL MATERIAL'),
    tieneCliente: hoja.textContent.includes('Rosa Mendoza'),
  };
});
paso('La hoja técnica se construye con el plano dentro',
  boleta.tienePlano && boleta.lineasPlano > 40, `${boleta.lineasPlano} líneas de retícula`);
paso('La hoja lleva cortes, sobrantes, total y cliente',
  boleta.tieneCortes && boleta.tieneSobrantes && boleta.tieneTotal && boleta.tieneCliente);

// La hoja técnica se imprime desde el pedido, no desde una pantalla aparte.

// Captura de la hoja técnica
const pg2 = await nav.newPage({ viewport: { width: 900, height: 1400 } });
await pg2.goto(BASE, { waitUntil: 'networkidle' });
await pg2.evaluate(() => localStorage.setItem('cieloraso:sesion', JSON.stringify({ usuarioId: 'u_admin' })));
await pg2.goto(BASE, { waitUntil: 'networkidle' });
await pg2.evaluate(async () => {
  const bd = await import('/src/core/bd.js');
  bd.guardarConfig('tienda', { nombre: 'Drywall del Norte', ruc: '20512345678', direccion: 'Av. España 1234, Trujillo', telefono: '044-221100' });
  const s = await import('/src/dominio/suspendido/index.js');
  const b = await import('/src/impresion/boleta-tecnica.js');
  const r = s.calcular({ ancho: 535, largo: 416, orientacion: 'auto' });
  document.body.replaceChildren();
  document.body.style.background = '#fff';
  const caja = document.createElement('div');
  caja.className = 'boleta--tecnica';
  caja.style.cssText = 'background:#fff;padding:12px';
  caja.appendChild(b.construir(r.calculo, { cliente: 'Rosa Mendoza', direccion: 'Av. Los Álamos 456, Trujillo' }));
  document.body.appendChild(caja);
});
await pg2.waitForTimeout(500);
await pg2.screenshot({ path: `${DIR}/hoja-tecnica.png`, fullPage: true });

await nav.close();
console.log('\n--- Errores ---');
console.log(errores.length ? errores.join('\n') : 'ninguno');
const f = pasos.filter(p => !p.ok).length;
console.log(`\n${pasos.length - f}/${pasos.length} pruebas pasaron`);
process.exit(f === 0 && errores.length === 0 ? 0 : 1);
