// Playwright vive fuera del repositorio (ver correr.sh), así que se resuelve
// por ruta absoluta: los módulos ES no miran NODE_PATH. Y como el paquete es
// CommonJS, al importarlo así queda colgado de `default`.
const _pw = await import(process.env.PLAYWRIGHT_MODULO || 'playwright');
const chromium = _pw.chromium || _pw.default.chromium;

const BASE = 'http://localhost:8765';
const errores = [];
const pasos = [];

function paso(nombre, ok, detalle = '') {
  pasos.push({ nombre, ok, detalle });
  console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
}

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pagina = await navegador.newPage();

pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push('console: ' + m.text());
});
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await pagina.goto(BASE, { waitUntil: 'networkidle' });

// 1. Pantalla de ingreso
const hayIngreso = await pagina.locator('.ingreso__tarjeta').isVisible();
paso('Carga la pantalla de ingreso', hayIngreso);

// 2. Login como admin
await pagina.fill('.ingreso__formulario input[type="text"]', 'admin');
await pagina.fill('.ingreso__formulario input[type="password"]', 'admin');
await pagina.click('button[type="submit"]');
await pagina.waitForTimeout(600);
paso('Entra como administrador', await pagina.locator('.nav__lista').isVisible());

// 3. Indicadores del panel de inicio
const indicadores = await pagina.locator('.indicador').count();
paso('Panel de inicio con indicadores', indicadores >= 4, `${indicadores} indicadores`);

// 4. Materiales sembrados
await pagina.goto(BASE + '#/materiales', { waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
const filasMat = await pagina.locator('.tabla tbody tr').count();
paso('Catálogo de materiales sembrado', filasMat >= 15, `${filasMat} materiales`);

// 5. Editar un precio de venta
const primerPrecioVenta = pagina.locator('.tabla tbody tr').first().locator('input').nth(1);
await primerPrecioVenta.fill('99.5');
await primerPrecioVenta.dispatchEvent('change');
await pagina.waitForTimeout(400);
const guardado = await pagina.evaluate(() => {
  const mats = JSON.parse(localStorage.getItem('cieloraso:materiales'));
  return mats.some((m) => m.precioVenta === 99.5);
});
paso('Editar precio de venta persiste', guardado);

// 6. Inventario: cargar stock
await pagina.goto(BASE + '#/inventario', { waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
await pagina.evaluate(() => {
  const inv = JSON.parse(localStorage.getItem('cieloraso:inventario'));
  for (const fila of inv) fila.cantidad = 50;
  localStorage.setItem('cieloraso:inventario', JSON.stringify(inv));
});

// 7. Registrar un retorno de obra vía dominio
const retorno = await pagina.evaluate(async () => {
  const inv = await import('/src/dominio/inventario.js');
  const r = inv.registrarRetorno({ material: 'plancha-st-127', cantidad: 5, condicion: 'usado' });
  return { ok: r.ok, enRetornos: inv.enRetornos('plancha-st-127') };
});
paso('Registrar retorno de obra', retorno.ok && retorno.enRetornos === 5, `retornos=${retorno.enRetornos}`);

// 8. Despiece reparte retornos → almacén → faltante
const despiece = await pagina.evaluate(async () => {
  const d = await import('/src/dominio/despiece.js');
  const r = d.calcular('cielo_raso', 100);
  if (!r.ok) return { error: r.error };
  const plancha = r.despiece.lineas.find((l) => l.material === 'plancha-st-127');
  return {
    necesario: plancha.necesario,
    deRetornos: plancha.deRetornos,
    deAlmacen: plancha.deAlmacen,
    faltante: plancha.faltante,
    lineas: r.despiece.lineas.length,
  };
});
paso(
  'Despiece de 100 m² usa primero los retornos',
  despiece.necesario === 37 && despiece.deRetornos === 5 && despiece.deAlmacen === 32 && despiece.faltante === 0,
  JSON.stringify(despiece),
);

// 9. Las tres modalidades cotizan
const cotizaciones = await pagina.evaluate(async () => {
  const p = await import('/src/dominio/precios.js');
  const conObra = p.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'cielo_raso', metrosCuadrados: 100,
    transporte: { km: 10 },
  });
  const soloMat = p.cotizar({
    modalidad: 'solo_material_completo', recetaId: 'cielo_raso', metrosCuadrados: 100,
    transporte: { km: 10 },
  });
  const suelto = p.cotizar({
    modalidad: 'material_suelto',
    items: [{ material: 'omega', cantidad: 20 }, { material: 'masilla-28', cantidad: 2 }],
    transporte: null,
  });
  return {
    conObra: conObra.ok ? conObra.cotizacion.total : conObra.error,
    manoObra: conObra.ok ? conObra.cotizacion.interno.manoObra : null,
    soloMat: soloMat.ok ? soloMat.cotizacion.total : soloMat.error,
    soloMatClienteSoloM2: soloMat.ok ? soloMat.cotizacion.cliente.soloMetrosCuadrados : null,
    soloMatLineasCliente: soloMat.ok ? soloMat.cotizacion.cliente.lineas.length : null,
    soloMatLineasInternas: soloMat.ok ? soloMat.cotizacion.interno.despiece.lineas.length : null,
    suelto: suelto.ok ? suelto.cotizacion.total : suelto.error,
    sueltoLineas: suelto.ok ? suelto.cotizacion.cliente.lineas.length : null,
  };
});
paso('Cotiza con mano de obra', typeof cotizaciones.conObra === 'number' && cotizaciones.manoObra === 2200,
  `total=${cotizaciones.conObra} obra=${cotizaciones.manoObra}`);
paso('Cotiza solo material completo', typeof cotizaciones.soloMat === 'number', `total=${cotizaciones.soloMat}`);
paso(
  'Boleta cliente de material completo oculta el despiece',
  cotizaciones.soloMatClienteSoloM2 === true &&
    cotizaciones.soloMatLineasCliente === 1 &&
    cotizaciones.soloMatLineasInternas > 5,
  `cliente=${cotizaciones.soloMatLineasCliente} interno=${cotizaciones.soloMatLineasInternas}`,
);
paso('Cotiza material suelto', typeof cotizaciones.suelto === 'number' && cotizaciones.sueltoLineas === 2,
  `total=${cotizaciones.suelto}`);

// 10. Transporte por distancia
const transporte = await pagina.evaluate(async () => {
  const t = await import('/src/dominio/transporte.js');
  const cerca = t.calcular(2);
  const lejos = t.calcular(23);
  return { cerca: cerca.transporte.total, lejos: lejos.transporte.total };
});
// tarifa base 20, km libres 3, 2.5/km → 23km: 20 + (20*2.5) = 70
paso('Transporte cobra por distancia', transporte.cerca === 20 && transporte.lejos === 70,
  JSON.stringify(transporte));

// 11. Pagos: rechaza sin pago y adelanto insuficiente
const pagosTest = await pagina.evaluate(async () => {
  const p = await import('/src/dominio/pagos.js');
  return {
    sinPago: p.validar({ total: 1000, tipo: 'ninguno', metodo: 'yape', operacion: '1' }).ok,
    bajo: p.validar({ total: 1000, tipo: 'adelanto', monto: 100, metodo: 'yape', operacion: '1' }).ok,
    sinOperacion: p.validar({ total: 1000, tipo: 'completo', metodo: 'yape', operacion: '' }).ok,
    ok: p.validar({ total: 1000, tipo: 'adelanto', monto: 400, metodo: 'yape', operacion: 'OP1' }),
  };
});
paso('Rechaza pedido sin pago', pagosTest.sinPago === false);
paso('Rechaza adelanto bajo el mínimo', pagosTest.bajo === false);
paso('Exige número de operación', pagosTest.sinOperacion === false);
paso('Acepta adelanto válido y calcula saldo',
  pagosTest.ok.ok === true && pagosTest.ok.pago.saldo === 600, `saldo=${pagosTest.ok.pago?.saldo}`);

// 12. Personal y calendario
const cal = await pagina.evaluate(async () => {
  const per = await import('/src/dominio/personal.js');
  const cal = await import('/src/dominio/calendario.js');
  per.crear({ nombre: 'Juan Maestro', especialidad: 'maestro' });
  per.crear({ nombre: 'Luis Ayudante', especialidad: 'ayudante' });
  per.crear({ nombre: 'Ana Empastadora', especialidad: 'empastador' });
  const lista = per.listar();
  const manana = new Date(); manana.setDate(manana.getDate() + 2);
  const dia = manana.toISOString().slice(0, 10);
  cal.asignar({ dia, trabajadorId: lista[0].id, pedidoId: null });
  cal.asignar({ dia, trabajadorId: lista[1].id, pedidoId: null });
  const estado = cal.estadoDia(dia);
  const repetido = cal.asignar({ dia, trabajadorId: lista[0].id });
  return {
    total: estado.totalPersonal, ocupados: estado.ocupados, libres: estado.libres,
    cabeOtro: estado.cabeOtroTrabajo, repetidoRechazado: repetido.ok === false,
  };
});
paso('Calendario cuenta ocupados y libres',
  cal.total === 3 && cal.ocupados === 2 && cal.libres === 1, JSON.stringify(cal));
paso('No cabe otro trabajo con 1 libre y equipos de 2', cal.cabeOtro === false);
paso('No permite asignar dos veces el mismo día', cal.repetidoRechazado);

// 13. Crear pedido completo
const pedido = await pagina.evaluate(async () => {
  const ped = await import('/src/dominio/pedidos.js');
  const pre = await import('/src/dominio/precios.js');
  const manana = new Date(); manana.setDate(manana.getDate() + 3);
  const previo = pre.cotizar({
    modalidad: 'solo_material_completo', recetaId: 'cielo_raso',
    metrosCuadrados: 50, transporte: { km: 12 },
  });
  const adelanto = Math.ceil(previo.cotizacion.total * 0.4);
  const r = ped.crear({
    cliente: { nombre: 'María Torres', telefono: '999888777' },
    modalidad: 'solo_material_completo',
    recetaId: 'cielo_raso',
    metrosCuadrados: 50,
    entrega: {
      direccion: 'Av. Los Álamos 456, Trujillo', referencia: 'Puerta verde',
      fecha: manana.toISOString().slice(0, 10), hora: '10:00', km: 12,
    },
    pago: { tipo: 'adelanto', monto: adelanto, metodo: 'yape', operacion: 'YAPE-77123' },
  });
  return r.ok
    ? { ok: true, codigo: r.pedido.codigo, total: r.pedido.cotizacion.total,
        saldo: r.pedido.pago.saldo, id: r.pedido.id }
    : { ok: false, error: r.error };
});
paso('Crea un pedido completo', pedido.ok, pedido.ok ? `${pedido.codigo} total=${pedido.total} saldo=${pedido.saldo}` : pedido.error);

// 14. Boletas se construyen sin reventar
if (!pedido.ok) { console.log('Sin pedido, se omiten las pruebas de boleta'); await navegador.close(); process.exit(1); }
const boletas = await pagina.evaluate(async (pedidoId) => {
  const bd = await import('/src/core/bd.js');
  const cliente = await import('/src/impresion/recibo-cliente.js');
  const admin = await import('/src/impresion/recibo-admin.js');
  const p = bd.buscarPorId('pedidos', pedidoId);
  const hojaCliente = cliente.construir(p);
  const hojaAdmin = admin.construir(p);
  return {
    clienteTexto: hojaCliente.textContent.length,
    adminTexto: hojaAdmin.textContent.length,
    clienteTieneDespiece: hojaCliente.textContent.includes('Perfil omega'),
    adminTieneDespiece: hojaAdmin.textContent.includes('Perfil omega'),
    adminTieneCobrar: hojaAdmin.textContent.includes('COBRAR AL LLEGAR'),
    adminTieneDireccion: hojaAdmin.textContent.includes('Av. Los Álamos 456'),
    adminTieneDistancia: hojaAdmin.textContent.includes('12.00 km'),
  };
}, pedido.id);
paso('Boleta del cliente NO muestra el despiece', boletas.clienteTieneDespiece === false);
paso('Orden interna SÍ muestra el despiece', boletas.adminTieneDespiece === true);
paso('Orden interna muestra cuánto cobrar al llegar', boletas.adminTieneCobrar === true);
paso('Orden interna muestra dirección y distancia',
  boletas.adminTieneDireccion && boletas.adminTieneDistancia);

// 15. Navegar por todas las pantallas sin errores
for (const ruta of ['/', '/cotizador', '/pedidos', '/calendario', '/inventario',
                    '/materiales', '/recetas', '/personal', '/impresion', '/ajustes']) {
  await pagina.goto(BASE + '#' + ruta, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(250);
  const vacia = await pagina.locator('#app').innerHTML();
  if (vacia.trim().length < 50) errores.push(`Ruta ${ruta} quedó vacía`);
}
paso('Todas las pantallas de admin cargan', true);

// 16. Rol usuario no ve pantallas de admin
await pagina.evaluate(() => localStorage.removeItem('cieloraso:sesion'));
await pagina.goto(BASE, { waitUntil: 'networkidle' });
await pagina.fill('.ingreso__formulario input[type="text"]', 'cliente');
await pagina.fill('.ingreso__formulario input[type="password"]', 'cliente');
await pagina.click('button[type="submit"]');
await pagina.waitForTimeout(500);
const enlaces = await pagina.locator('.nav__enlace').allTextContents();
paso('Cliente no ve Materiales ni Inventario',
  !enlaces.includes('Materiales') && !enlaces.includes('Inventario'),
  enlaces.join(', '));

await pagina.goto(BASE + '#/materiales', { waitUntil: 'networkidle' });
await pagina.waitForTimeout(300);
const bloqueado = (await pagina.locator('#app').textContent()).includes('No tienes permiso');
paso('Cliente bloqueado al forzar la URL de Materiales', bloqueado);


// --- Los materiales del cielo raso vinil viven en el catálogo ---
const catalogo = await pagina.evaluate(async () => {
  const mat = await import('/src/dominio/materiales.js');
  const cfg = await import('/src/dominio/suspendido/config.js');
  const ids = Object.values(cfg.MATERIAL_DE);
  const faltan = ids.filter((id) => !mat.obtener(id));

  // Cambiar el precio en Materiales tiene que llegar al cálculo del vinil.
  mat.editar('baldosa-vinil-61', { precioVenta: 4.25 });
  const tras = cfg.precios().baldosa;
  mat.editar('baldosa-vinil-61', { precioVenta: 3.5 });

  return { faltan, tras, vuelto: cfg.precios().baldosa };
});
paso('Las piezas del cielo raso vinil están en el catálogo de materiales',
  catalogo.faltan.length === 0, catalogo.faltan.join(', ') || 'ninguna falta');
paso('El precio del catálogo manda en el cálculo del vinil',
  catalogo.tras === 4.25 && catalogo.vuelto === 3.5, JSON.stringify(catalogo));

const legible = await pagina.evaluate(async () => {
  const m = await import('/src/ui/vistas/despiece-cantidad.js');
  const plancha = { dimensiones: { ancho: 1.22, largo: 2.44 } };
  const barra = { dimensiones: { largo: 3 } };
  return {
    plancha: m.cantidadLegible(11.76, 'plancha', plancha),
    barra: m.cantidadLegible(4.49, 'barra', barra),
    entera: m.cantidadLegible(12, 'plancha', plancha),
  };
});
paso('El despiece dice cuántas piezas enteras y de qué tamaño es el pedazo',
  legible.plancha.startsWith('11 plancha + 0.76') && legible.plancha.includes('2.44 m') &&
  legible.barra.includes('1.47 m') && legible.entera === '12 plancha',
  JSON.stringify(legible));

await navegador.close();

console.log('\n--- Errores de consola/página ---');
if (errores.length === 0) console.log('ninguno');
else errores.forEach((e) => console.log('  ' + e));

const fallidos = pasos.filter((p) => !p.ok);
console.log(`\n${pasos.length - fallidos.length}/${pasos.length} pruebas pasaron`);
process.exit(fallidos.length === 0 && errores.length === 0 ? 0 : 1);
