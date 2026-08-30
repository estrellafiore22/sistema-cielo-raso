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

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
pg.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
pg.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
pg.on('dialog', (d) => d.accept());

const entrar = async (usuario = 'admin') => {
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  if (await pg.locator('.ingreso__tarjeta').isVisible().catch(() => false)) {
    await pg.fill('.ingreso__formulario input[type="text"]', usuario);
    await pg.fill('.ingreso__formulario input[type="password"]', usuario);
    await pg.click('button[type="submit"]');
    await pg.waitForTimeout(500);
  }
};
await entrar();

// ============ 1. Escribir sin perder el foco ============
await pg.goto(BASE + '#/cotizador', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
const campoM2 = pg.locator('.cotizador__cuerpo input[type="number"]').first();
await campoM2.click();
await pg.keyboard.type('120', { delay: 50 });
await pg.waitForTimeout(300);
paso('Se puede escribir "120" en metros cuadrados sin perder el foco',
  (await campoM2.inputValue()) === '120', `quedó "${await campoM2.inputValue()}"`);

const totalTrasEscribir = await pg.locator('.resumen__total strong').textContent();
paso('El total se actualiza mientras se escribe',
  /S\/\s*[\d,]/.test(totalTrasEscribir), totalTrasEscribir);

const filasDespiece = await pg.locator('.despiece .tabla tbody tr').count();
paso('El despiece se refresca con lo escrito', filasDespiece >= 8, `${filasDespiece} materiales`);

// ============ 2. Material suelto: cantidad sin perder foco ============
await pg.click('.modalidad >> nth=2');
await pg.waitForTimeout(400);
await pg.click('.categoria >> nth=0');
await pg.waitForTimeout(200);
await pg.click('.material-chip >> nth=0');
await pg.waitForTimeout(400);
const cantidad = pg.locator('.tabla tbody input[type="number"]').first();
await cantidad.click();
await cantidad.press('Control+a');
await pg.keyboard.type('25', { delay: 50 });
await pg.waitForTimeout(300);
paso('Se puede escribir la cantidad de material suelto',
  (await cantidad.inputValue()) === '25', `quedó "${await cantidad.inputValue()}"`);

const totalFila = await pg.locator('.tabla tbody tr').first().locator('td').nth(3).textContent();
paso('El total de la fila se actualiza al cambiar la cantidad',
  totalFila.replace(/[^\d.]/g, '') !== '0', totalFila.trim());

// ============ 3. Cielo raso suspendido como tipo de trabajo ============
await pg.click('.modalidad >> nth=0'); // con mano de obra
await pg.waitForTimeout(400);
const tipos = await pg.locator('.cotizador__cuerpo select option').allTextContents();
paso('El 61×61 aparece en el selector de tipo de trabajo',
  tipos.some((t) => t.includes('61 × 61')), tipos.join(' | '));

await pg.selectOption('.cotizador__cuerpo select', 'suspendido');
await pg.waitForTimeout(700);
paso('Elegir el tipo 61×61 abre su calculadora',
  (await pg.locator('.cotizador__cuerpo').textContent()).includes('T principales en'));
paso('Dibuja el plano dentro del cotizador',
  await pg.locator('.plano__svg').isVisible());

const anchoSusp = pg.locator('.cotizador__cuerpo input[type="number"]').first();
await anchoSusp.click();
await anchoSusp.press('Control+a');
await pg.keyboard.type('5.35', { delay: 40 });
await pg.waitForTimeout(600);
paso('El ancho se carga en metros, sin perder el foco',
  (await anchoSusp.inputValue()) === '5.35', `quedó "${await anchoSusp.inputValue()}"`);

const areaSusp = await pg.locator('.cotizador__cuerpo .campo__valor').first().textContent();
paso('El área del suspendido se recalcula', areaSusp.includes('21.4'), areaSusp);

paso('Con mano de obra avisa qué pasa con la instalación',
  /instalaci[oó]n/i.test(await pg.locator('.cotizador__cuerpo').textContent()));

// El mismo tipo de trabajo se puede vender sin instalación: se cambia la
// modalidad y el tipo de trabajo se mantiene.
await pg.click('.modalidad >> nth=1'); // solo material completo
await pg.waitForTimeout(700);
paso('Cambiar de modalidad conserva el tipo de trabajo 61×61',
  (await pg.locator('.cotizador__cuerpo').textContent()).includes('T principales en') &&
  (await pg.locator('.cotizador__cuerpo input[type="number"]').first().inputValue()) === '5.35');

// Completar el pedido
await pg.click('.cotizador__acciones .boton--principal');
await pg.waitForTimeout(500);
await pg.fill('.bloque .campo__entrada >> nth=0', 'Jr. Bolívar 890, Trujillo');
await pg.fill('input[type="number"] >> nth=0', '9');
await pg.waitForTimeout(500);
const dias = await pg.locator('.dia').count();
if (dias > 0) await pg.locator('.dia').first().click();
await pg.waitForTimeout(200);
await pg.click('.cotizador__acciones .boton--principal');
await pg.waitForTimeout(500);

await pg.fill('.bloque .campo__entrada >> nth=0', 'Carlos Ruiz');
// El teléfono es obligatorio: es con lo que se coordina la entrega.
await pg.fill('.bloque .campo__entrada >> nth=1', '987654321');
await pg.click('.opciones .opcion >> nth=1'); // pago completo
await pg.waitForTimeout(300);
const campos = pg.locator('.panel .campo__entrada');
await campos.nth((await campos.count()) - 1).fill('YAPE-55001');
await pg.click('.cotizador__acciones .boton--principal');
await pg.waitForTimeout(500);
await pg.click('.cotizador__acciones .boton--principal');
await pg.waitForTimeout(800);

const creado = (await pg.locator('#app').textContent()).includes('Pedido registrado');
paso('Se registra un pedido de cielo raso suspendido', creado);

const guardado = await pg.evaluate(() => {
  const ps = JSON.parse(localStorage.getItem('cieloraso:pedidos') || '[]');
  const p = ps.find((x) => x.cotizacion.interno && x.cotizacion.interno.suspendido);
  return p ? {
    codigo: p.codigo,
    modalidad: p.cotizacion.modalidad,
    total: p.cotizacion.total,
    guardaMedidas: !!p.suspendido,
    guardaPlano: !!p.cotizacion.interno.grid,
    clienteVeSoloM2: p.cotizacion.cliente.soloMetrosCuadrados === true,
    lineasInternas: p.cotizacion.interno.lineas.length,
  } : null;
});
paso('El pedido guarda medidas, plano y desglose interno',
  guardado && guardado.guardaMedidas && guardado.guardaPlano && guardado.lineasInternas > 4,
  JSON.stringify(guardado));
paso('La boleta del cliente muestra solo los m²', guardado?.clienteVeSoloM2 === true);

// La boleta del admin lleva el plano dibujado
const boletaAdmin = await pg.evaluate(async () => {
  const bd = await import('/src/core/bd.js');
  const admin = await import('/src/impresion/recibo-admin.js');
  const p = bd.todos('pedidos').find((x) => x.cotizacion.interno?.suspendido);
  const hoja = admin.construir(p);
  return { lineasPlano: hoja.querySelectorAll('.plano__barras line').length };
});
paso('La orden interna del suspendido lleva el plano',
  boletaAdmin.lineasPlano > 40, `${boletaAdmin.lineasPlano} líneas`);

// ============ 3b. Boletas por imprimir ============
// El contador salía en 0 porque solo miraba lo encolado; ahora mira lo que
// falta imprimir de cada pedido vivo.
const porImprimir = await pg.evaluate(async () => {
  const cola = await import('/src/impresion/cola-impresion.js');
  return { total: cola.totalPendientes(), lista: cola.pendientes().map((t) => t.tipo) };
});
paso('Un pedido recién hecho deja su orden interna por imprimir',
  porImprimir.total > 0 && porImprimir.lista.includes('admin'),
  JSON.stringify(porImprimir));

await pg.goto(BASE + '#/', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
const indicador = await pg.locator('.indicador:has-text("Boletas por imprimir") .indicador__valor')
  .textContent();
paso('Inicio muestra las boletas por imprimir, no un cero',
  Number(indicador) === porImprimir.total && Number(indicador) > 0, indicador);

await pg.locator('.indicador:has-text("Pedidos activos")').click();
await pg.waitForTimeout(500);
paso('El indicador de pedidos activos abre la lista filtrada',
  (await pg.evaluate(() => location.hash)) === '#/pedidos?estado=activos' &&
  (await pg.locator('.tabla tbody tr').count()) > 0);

paso('La lista de pedidos dice si el cliente pidió factura',
  (await pg.locator('.tabla thead').textContent()).includes('Comprobante'));

// ============ 4. Cobrar saldo ============
const conSaldo = await pg.evaluate(async () => {
  const ped = await import('/src/dominio/pedidos.js');
  const pre = await import('/src/dominio/precios.js');
  const previo = pre.cotizar({
    modalidad: 'solo_material_completo', recetaId: 'cielo_raso',
    metrosCuadrados: 40, transporte: null,
  });
  const r = ped.crear({
    cliente: { nombre: 'Elena Paredes', telefono: '999111222' },
    modalidad: 'solo_material_completo', recetaId: 'cielo_raso', metrosCuadrados: 40,
    entrega: null,
    pago: { tipo: 'adelanto', monto: Math.ceil(previo.cotizacion.total * 0.4), metodo: 'yape', operacion: 'OP-1' },
  });
  return r.ok ? { id: r.pedido.id, codigo: r.pedido.codigo, saldo: r.pedido.pago.saldo } : { error: r.error };
});
paso('Se crea un pedido con saldo pendiente', !conSaldo.error, `saldo S/${conSaldo.saldo}`);

await pg.goto(BASE + '#/pedidos', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
const filaElena = pg.locator('.tabla tbody tr').filter({ hasText: 'Elena Paredes' }).first();
// La fila ahora trae también los botones de imprimir sus boletas; "Ver" es el
// que abre la ficha.
await filaElena.locator('button:has-text("Ver")').click();
await pg.waitForTimeout(400);
paso('Aparece el botón para cobrar el saldo',
  await pg.locator('button:has-text("Cobrar S/")').isVisible());

await pg.click('button:has-text("Cobrar S/")');
await pg.waitForTimeout(400);
paso('Se abre el formulario de cobro',
  await pg.locator('.panel--accion:has-text("Cobrar saldo")').isVisible());

// Cobro parcial
const montoCobro = pg.locator('.panel--accion input[type="number"]').first();
await montoCobro.click();
await montoCobro.press('Control+a');
await pg.keyboard.type('100', { delay: 40 });
await pg.click('.panel--accion button:has-text("Registrar cobro")');
await pg.waitForTimeout(600);

const trasCobro = await pg.evaluate((id) => {
  const ps = JSON.parse(localStorage.getItem('cieloraso:pedidos') || '[]');
  const p = ps.find((x) => x.id === id);
  return { pagado: p.pago.pagado, saldo: p.pago.saldo, liquidado: p.pago.liquidado };
}, conSaldo.id);
paso('El cobro parcial descuenta del saldo',
  Math.abs(trasCobro.saldo - (conSaldo.saldo - 100)) < 0.01 && trasCobro.liquidado === false,
  `saldo ${conSaldo.saldo} → ${trasCobro.saldo}`);

// ============ 5. Cerrar obra con retornos ============
const despachado = await pg.evaluate(async () => {
  const ped = await import('/src/dominio/pedidos.js');
  const inv = await import('/src/dominio/inventario.js');
  const stock = JSON.parse(localStorage.getItem('cieloraso:inventario'));
  for (const f of stock) f.cantidad = 200;
  localStorage.setItem('cieloraso:inventario', JSON.stringify(stock));

  const p = ped.listar().find((x) => x.cliente.nombre === 'Elena Paredes');
  ped.cambiarEstado(p.id, 'confirmado');
  ped.cambiarEstado(p.id, 'en_preparacion');
  ped.cambiarEstado(p.id, 'despachado');
  return { id: p.id, antes: inv.enRetornos('plancha-st-127') };
});

await pg.goto(BASE + '#/pedidos', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
await pg.locator('.tabla tbody tr').filter({ hasText: 'Elena Paredes' }).first()
  .locator('button:has-text("Ver")').click();
await pg.waitForTimeout(400);
paso('Aparece el botón de cerrar obra en un pedido despachado',
  await pg.locator('button:has-text("Cerrar obra")').isVisible());

await pg.click('button:has-text("Cerrar obra y registrar retornos")');
await pg.waitForTimeout(400);
const volvio = pg.locator('.panel--accion .tabla tbody tr').first().locator('input[type="number"]');
await volvio.click();
await pg.keyboard.type('3', { delay: 40 });
await pg.waitForTimeout(200);
await pg.click('.panel--accion button:has-text("Cerrar obra")');
await pg.waitForTimeout(900);

const trasCierre = await pg.evaluate(async (id) => {
  const inv = await import('/src/dominio/inventario.js');
  const ps = JSON.parse(localStorage.getItem('cieloraso:pedidos') || '[]');
  const p = ps.find((x) => x.id === id);
  return { estado: p.estado, retornos: inv.enRetornos('plancha-st-127') };
}, despachado.id);
paso('Cerrar obra deja el pedido entregado', trasCierre.estado === 'entregado', trasCierre.estado);
paso('El material sobrante vuelve al inventario de retornos',
  trasCierre.retornos > despachado.antes,
  `${despachado.antes} → ${trasCierre.retornos}`);

// ============ 6. Respaldos ============
const respaldos = await pg.evaluate(async () => {
  const r = await import('/src/core/respaldo.js');
  const creado = r.crear('prueba');
  const lista = r.listar();
  // El respaldo no debe contener respaldos anteriores
  const foto = JSON.parse(localStorage.getItem('cieloraso:' + lista[0].id));
  const anidado = Object.keys(foto.datos).some((k) => k.startsWith('respaldo:'));
  return { ok: creado.ok, cantidad: lista.length, pedidos: lista[0].pedidos, anidado };
});
paso('Se puede crear un respaldo', respaldos.ok, `${respaldos.cantidad} foto(s), ${respaldos.pedidos} pedidos`);
paso('El respaldo no se contiene a sí mismo', respaldos.anidado === false);

const restaurado = await pg.evaluate(async () => {
  const r = await import('/src/core/respaldo.js');
  const bd = await import('/src/core/bd.js');
  const antes = bd.todos('pedidos').length;
  // Se borra un pedido y se restaura
  const uno = bd.todos('pedidos')[0];
  bd.eliminar('pedidos', uno.id);
  const tras = bd.todos('pedidos').length;
  const foto = r.listar().filter((f) => f.motivo === 'prueba')[0];
  r.restaurar(foto.id);
  return { antes, tras, despues: bd.todos('pedidos').length };
});
paso('Restaurar devuelve los datos borrados',
  restaurado.tras === restaurado.antes - 1 && restaurado.despues === restaurado.antes,
  `${restaurado.antes} → borrado ${restaurado.tras} → restaurado ${restaurado.despues}`);

// El panel de respaldos se ve para el programador
await pg.evaluate(() => localStorage.removeItem('cieloraso:sesion'));
await entrar('programador');
await pg.goto(BASE + '#/diagnostico', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
paso('El programador ve el panel de respaldos',
  (await pg.locator('#app').textContent()).includes('Respaldos automáticos'));

await pg.screenshot({ path: `${DIR}/diagnostico-respaldos.png`, fullPage: true });

await nav.close();
console.log('\n--- Errores ---');
console.log(errores.length ? errores.join('\n') : 'ninguno');
const f = pasos.filter((p) => !p.ok).length;
console.log(`\n${pasos.length - f}/${pasos.length} pruebas pasaron`);
process.exit(f === 0 && errores.length === 0 ? 0 : 1);
