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


// --- División: la plancha elegida manda ---
const division = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const salida = {};
  for (const [clave, variante, lijado] of [
    ['drywall12', 'drywall-12', false],
    ['drywall38', 'drywall-38', false],
    ['fibro4', 'fibro-4', false],
    ['fibro6', 'fibro-6', false],
    ['fibro8', 'fibro-8', false],
    ['fibro6lijado', 'fibro-6', true],
  ]) {
    const c = precios.cotizar({
      modalidad: 'con_mano_obra', recetaId: 'division',
      metrosCuadrados: 20, variante, lijado, transporte: null,
    });
    const lineas = c.cotizacion.interno.despiece.lineas.map((l) => l.material);
    salida[clave] = {
      porM2: c.cotizacion.total / 20,
      plancha: lineas.find((id) => id.startsWith('plancha')),
      tornillo: lineas.find((id) => id.startsWith('tornillo') && !id.includes('framer')),
      cintaPapel: lineas.includes('cinta-papel'),
      sika: lineas.includes('sika-sellador'),
      lija: lineas.includes('lija-120'),
    };
  }
  return salida;
});
paso('Cada plancha de división cobra su precio por m²',
  division.drywall12.porM2 === 70 && division.drywall38.porM2 === 69 &&
  division.fibro4.porM2 === 100 && division.fibro6.porM2 === 140 &&
  division.fibro8.porM2 === 195,
  Object.entries(division).map(([k, v]) => `${k}=${v.porM2}`).join(' '));

paso('El tornillo lo decide la plancha',
  division.drywall12.tornillo === 'tornillo-drywall-1' &&
  division.fibro6.tornillo === 'tornillo-fibrocemento' &&
  division.fibro6.plancha === 'plancha-fibrocemento-6',
  JSON.stringify({ dry: division.drywall12.tornillo, fib: division.fibro6.tornillo }));

paso('El drywall lleva cinta de papel y el fibrocemento sellador, no cinta',
  division.drywall12.cintaPapel && !division.drywall12.sika &&
  division.fibro6.sika && !division.fibro6.cintaPapel);

paso('El lijado no va por defecto y suma 4 S/ por m² al marcarlo',
  division.fibro6.lija === false && division.fibro6lijado.lija === true &&
  division.fibro6lijado.porM2 === 144,
  `sin lijado ${division.fibro6.porM2} · con lijado ${division.fibro6lijado.porM2}`);


// --- Corte de planchas con recortes reutilizados ---
const corte = await pagina.evaluate(async () => {
  const pl = await import('/src/dominio/planchas/index.js');
  const precios = await import('/src/dominio/precios.js');

  const justo = pl.planificar({ ancho: 3.66, alto: 2.44, caras: 2 });
  const sobra = pl.planificar({ ancho: 3.7, alto: 2.44, caras: 2 });
  const techo = pl.planificar({ ancho: 4.98, alto: 3.96, caras: 1 });

  // Un recorte chico no puede completar una pieza grande.
  const corteMod = await import('/src/dominio/planchas/corte.js');
  const grande = corteMod.repartir(
    [{ ancho: 100, alto: 244 }, { ancho: 100, alto: 244 }],
    { ancho: 122, alto: 244 },
  );

  const cotiza = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'division', variante: 'drywall-12',
    medidas: { ancho: 3.66, largo: 2.44 }, metrosCuadrados: 8.93, transporte: null,
  });
  const linea = cotiza.cotizacion.interno.despiece.lineas
    .find((l) => l.material.startsWith('plancha'));

  return {
    justo: justo.plan.planchas,
    justoSobrantes: justo.plan.sobrantes.length,
    sobra: sobra.plan.planchas,
    sobraDeRecorte: sobra.plan.cortes.filter((c) => c.deRecorte).length,
    techo: techo.plan.planchas,
    techoOrientacion: techo.plan.orientacion,
    dosGrandes: grande.planchas,
    enCotizacion: linea.necesario,
  };
});

paso('Un muro de 3.66 m sale en planchas justas, sin recortes',
  corte.justo === 6 && corte.justoSobrantes === 0, JSON.stringify(corte));
paso('Un muro de 3.70 m obliga a abrir otra plancha, y su recorte se reusa',
  corte.sobra === 7 && corte.sobraDeRecorte >= 1);
paso('Dos piezas de 100 cm no salen de una plancha de 122: el recorte no completa',
  corte.dosGrandes === 2, `${corte.dosGrandes} plancha(s)`);
paso('El techo elige la orientación que gasta menos planchas',
  corte.techo === 8 && typeof corte.techoOrientacion === 'string',
  `${corte.techo} planchas ${corte.techoOrientacion}`);
paso('La cotización usa el corte real, no la regla por m²',
  corte.enCotizacion === 6, `${corte.enCotizacion} planchas`);


// --- Boleta que no queda en blanco aunque window.print() no bloquee ---
const boleta = await pagina.evaluate(async () => {
  const ped = await import('/src/dominio/pedidos.js');
  const per = await import('/src/dominio/personal.js');
  const cola = await import('/src/impresion/cola-impresion.js');
  const bd = await import('/src/core/bd.js');

  if (per.listar({ soloActivos: true }).length === 0) {
    per.crear({ nombre: 'M1', especialidad: 'maestro' });
    per.crear({ nombre: 'M2', especialidad: 'maestro' });
  }
  const r = ped.crear({
    modalidad: 'con_mano_obra', recetaId: 'division', variante: 'drywall-12',
    medidas: { ancho: 3, largo: 2.4 }, metrosCuadrados: 7.2,
    cliente: { nombre: 'Prueba Blanco', telefono: '900000001' },
    entrega: null,
    pago: { tipo: 'completo', metodo: 'yape', operacion: 'OP-2' },
  });
  const pedido = bd.buscarPorId('pedidos', r.pedido.id);

  // Muchos navegadores no bloquean window.print(): regresa al toque. Si la
  // boleta se limpia en ese instante, sale en blanco.
  const original = window.print;
  window.print = () => {};
  cola.imprimir(pedido, cola.TIPOS.CLIENTE);
  const justoDespues = (document.getElementById('area-impresion')?.textContent || '').trim();

  window.dispatchEvent(new Event('afterprint'));
  await new Promise((r2) => setTimeout(r2, 50));
  const trasAfterprint = (document.getElementById('area-impresion')?.textContent || '').trim();
  window.print = original;

  return { justoDespues: justoDespues.length, trasAfterprint };
});
paso('La boleta sigue en el área justo después de imprimir, aunque print() no bloquee',
  boleta.justoDespues > 0, `${boleta.justoDespues} caracteres`);
paso('El área se limpia recién cuando el navegador avisa que terminó (afterprint)',
  boleta.trasAfterprint === '');


// --- Precio de compra vs. precio de venta según el tipo de venta ---
const preciosDeCompra = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');

  const cieloObra = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'cielo_raso', metrosCuadrados: 20, transporte: null,
  }).cotizacion;
  const cieloCompleto = precios.cotizar({
    modalidad: 'solo_material_completo', recetaId: 'cielo_raso', metrosCuadrados: 20, transporte: null,
  }).cotizacion;
  const suelto = precios.cotizar({
    modalidad: 'material_suelto',
    items: [{ material: 'plancha-st-127', cantidad: 10 }],
    transporte: null,
  }).cotizacion;

  const vinilObra = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'suspendido',
    suspendido: { ancho: 500, largo: 400, orientacion: 'auto' }, transporte: null,
  }).cotizacion;
  const vinilCompleto = precios.cotizar({
    modalidad: 'solo_material_completo', recetaId: 'suspendido',
    suspendido: { ancho: 500, largo: 400, orientacion: 'auto' }, transporte: null,
  }).cotizacion;

  const materiales = await import('/src/dominio/materiales.js');
  const plancha = materiales.obtener('plancha-st-127');

  return {
    // Instalado: lo cobrado por material debe ser el costo de compra.
    cieloObraCobrado: cieloObra.total - cieloObra.interno.manoObra,
    cieloObraCosto: cieloObra.interno.materialCosto,
    cieloObraVenta: cieloObra.interno.materialVenta,
    // Solo material: se cobra a precio de venta, con margen.
    cieloCompletoBase: cieloCompleto.subtotal,
    cieloCompletoVenta: cieloCompleto.interno.materialVenta,
    // Material suelto: precio de venta, y el costo de compra queda aparte.
    sueltoTotal: suelto.subtotal,
    sueltoEsperado: 10 * plancha.precioVenta,
    sueltoCosto: suelto.interno.materialCosto,
    sueltoCostoEsperado: 10 * plancha.precioCompra,
    // Vinil instalado: el cuadro de la tienda resta el costo real, no la venta.
    vinilCuentaMateriales: vinilObra.interno.cuentaTienda.materiales,
    vinilCosto: vinilObra.interno.materialCosto,
    vinilVenta: vinilObra.interno.materialVenta,
    vinilCompletoBase: vinilCompleto.subtotal,
    vinilCompletoVenta: vinilCompleto.interno.materialVenta,
  };
});

paso('Cielo raso instalado cobra el material a precio de compra, no de venta',
  // El redondeo comercial baja el total hasta 9 soles: se compara con
  // tolerancia, no con igualdad exacta.
  Math.abs(preciosDeCompra.cieloObraCobrado - preciosDeCompra.cieloObraCosto) < 10 &&
  preciosDeCompra.cieloObraCosto < preciosDeCompra.cieloObraVenta,
  JSON.stringify({ cobrado: preciosDeCompra.cieloObraCobrado, costo: preciosDeCompra.cieloObraCosto, venta: preciosDeCompra.cieloObraVenta }));

paso('Solo material completo sigue cobrando a precio de venta',
  preciosDeCompra.cieloCompletoBase === preciosDeCompra.cieloCompletoVenta);

paso('Material suelto cobra a precio de venta y expone el costo aparte',
  preciosDeCompra.sueltoTotal === preciosDeCompra.sueltoEsperado &&
  preciosDeCompra.sueltoCosto === preciosDeCompra.sueltoCostoEsperado,
  JSON.stringify(preciosDeCompra));

paso('El cuadro de la tienda del vinil resta el costo real, no el de venta',
  preciosDeCompra.vinilCuentaMateriales === preciosDeCompra.vinilCosto &&
  preciosDeCompra.vinilCosto < preciosDeCompra.vinilVenta,
  JSON.stringify({ cuenta: preciosDeCompra.vinilCuentaMateriales, costo: preciosDeCompra.vinilCosto, venta: preciosDeCompra.vinilVenta }));

paso('El paquete completo del vinil sigue cobrando a precio de venta',
  preciosDeCompra.vinilCompletoBase === preciosDeCompra.vinilCompletoVenta);


// --- Material suelto no queda atrapado por el recetaId del vinil ---
const sueltoConRecetaVinil = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  // El tipo de trabajo por defecto de Nuevo pedido es "suspendido" (vinil).
  // Si el cliente cambia a material suelto sin tocar el selector de tipo de
  // trabajo, ese recetaId queda pegado y no debe mandar la cotización al
  // motor del vinil, que le pediría ancho y largo sin sentido.
  const r = precios.cotizar({
    modalidad: 'material_suelto',
    recetaId: 'suspendido',
    items: [{ material: 'plancha-st-127', cantidad: 2 }],
    transporte: null,
  });
  return { ok: r.ok, error: r.error, total: r.cotizacion?.total };
});
paso('Material suelto cotiza aunque el recetaId haya quedado en "suspendido"',
  sueltoConRecetaVinil.ok === true && sueltoConRecetaVinil.total > 0,
  JSON.stringify(sueltoConRecetaVinil));


// --- Cielo raso también elige plancha, igual que división ---
const cieloPlancha = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const salida = {};
  for (const variante of ['drywall-12', 'fibro-6', 'fibro-10']) {
    const c = precios.cotizar({
      modalidad: 'con_mano_obra', recetaId: 'cielo_raso', variante, metrosCuadrados: 20, transporte: null,
    });
    const lineas = c.cotizacion.interno.despiece.lineas.map((l) => l.material);
    salida[variante] = {
      plancha: lineas.find((id) => id.startsWith('plancha')),
      // El redondeo comercial baja el total hasta 9 soles: se compara con
    // tolerancia, no con igualdad exacta.
    esCosto: Math.abs(
      (c.cotizacion.total - c.cotizacion.interno.manoObra) - c.cotizacion.interno.materialCosto,
    ) < 10,
    };
  }
  const sinVariante = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'cielo_raso', metrosCuadrados: 20, transporte: null,
  });
  salida.default = sinVariante.cotizacion.interno.despiece.lineas
    .map((l) => l.material).find((id) => id.startsWith('plancha'));
  return salida;
});
paso('Cielo raso elige plancha (drywall o fibrocemento) y cobra a costo',
  cieloPlancha['drywall-12'].plancha === 'plancha-st-127' &&
  cieloPlancha['fibro-6'].plancha === 'plancha-fibrocemento-6' &&
  cieloPlancha['fibro-10'].plancha === 'plancha-fibrocemento-10' &&
  Object.values(cieloPlancha).every((v) => v.esCosto !== false),
  JSON.stringify(cieloPlancha));
paso('Sin elegir plancha, cielo raso sigue usando drywall 1/2" por defecto',
  cieloPlancha.default === 'plancha-st-127');

// --- Aislante térmico opcional en división ---
const aislante = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const sinAislante = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'division', variante: 'drywall-12',
    metrosCuadrados: 20, transporte: null,
  });
  const conTecnopor = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'division', variante: 'drywall-12',
    aislante: 'tecnopor-2', metrosCuadrados: 20, transporte: null,
  });
  const lineas = conTecnopor.cotizacion.interno.despiece.lineas.map((l) => l.material);
  return {
    tieneTecnopor: lineas.includes('tecnopor-2'),
    sinAislanteNoLoTiene: sinAislante.cotizacion.interno.despiece.lineas
      .map((l) => l.material).includes('tecnopor-2') === false,
    costoSubio: conTecnopor.cotizacion.interno.materialCosto > sinAislante.cotizacion.interno.materialCosto,
  };
});
paso('El aislante térmico se agrega solo si se elige, y sube el costo de material',
  aislante.tieneTecnopor && aislante.sinAislanteNoLoTiene && aislante.costoSubio,
  JSON.stringify(aislante));


// --- Baldosa PVC comparte la retícula del vinil, solo cambia el acabado ---
const pvc = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const base = {
    recetaId: 'suspendido',
    suspendido: { ancho: 500, largo: 400, orientacion: 'auto' }, transporte: null,
  };
  const completoVinil = precios.cotizar({
    ...base, modalidad: 'solo_material_completo',
    suspendido: { ...base.suspendido, baldosa: 'vinil' },
  });
  const completoPvc = precios.cotizar({
    ...base, modalidad: 'solo_material_completo',
    suspendido: { ...base.suspendido, baldosa: 'pvc' },
  });
  const obraVinil = precios.cotizar({
    ...base, modalidad: 'con_mano_obra',
    suspendido: { ...base.suspendido, baldosa: 'vinil' },
  });
  const obraPvc = precios.cotizar({
    ...base, modalidad: 'con_mano_obra',
    suspendido: { ...base.suspendido, baldosa: 'pvc' },
  });
  return {
    nombrePvc: completoPvc.cotizacion.interno.lineas.find((l) => l.material === 'baldosa').nombre,
    completoDistinto: completoVinil.cotizacion.total !== completoPvc.cotizacion.total,
    // Instalado se cobra por m² fijo: no cambia con la baldosa elegida.
    obraIgual: obraVinil.cotizacion.total === obraPvc.cotizacion.total,
    // Pero el margen interno sí baja, porque el PVC cuesta más.
    gananciaPvcMenor:
      obraPvc.cotizacion.interno.ganancia < obraVinil.cotizacion.interno.ganancia,
    trabajoPvc: obraPvc.cotizacion.trabajo.nombre,
  };
});
paso('La baldosa PVC usa la misma retícula del vinil, con su propio nombre y precio',
  pvc.nombrePvc === 'Baldosa PVC 61 × 61' && pvc.completoDistinto, JSON.stringify(pvc));
paso('Instalado no cambia el precio al cliente al elegir PVC, pero baja el margen',
  pvc.obraIgual && pvc.gananciaPvcMenor, JSON.stringify(pvc));
paso('El trabajo se rotula "(baldosa PVC)" solo cuando se elige PVC',
  pvc.trabajoPvc.includes('baldosa PVC'));


// --- Laminado PVC: sin estructura, reusa el motor de corte de planchas ---
const laminado = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const soloM2 = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'laminado_pvc', metrosCuadrados: 20, transporte: null,
  });
  const conMedidas = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'laminado_pvc',
    medidas: { ancho: 5, largo: 3 }, metrosCuadrados: 15, transporte: null,
  });
  return {
    lineas: soloM2.cotizacion.interno.despiece.lineas.map((l) => l.material).sort(),
    tienePlan: !!conMedidas.cotizacion.interno.planchas,
    materialPlan: conMedidas.cotizacion.interno.planchas?.material,
    planchas: conMedidas.cotizacion.interno.planchas?.planchas,
  };
});
paso('Laminado PVC pide panel, perfil de remate y adhesivo',
  laminado.lineas.includes('laminado-pvc') &&
  laminado.lineas.includes('perfil-remate-pvc') &&
  laminado.lineas.includes('adhesivo-laminado-pvc'),
  JSON.stringify(laminado.lineas));
paso('Con ancho y largo, el laminado PVC se corta de verdad (no por m² a secas)',
  laminado.tienePlan && laminado.materialPlan === 'laminado-pvc' && laminado.planchas > 0,
  JSON.stringify(laminado));


// --- Pisos epóxicos y piso radiante con cálculo de potencia ---
const pisos = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const marmolado = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'piso_epoxico_marmolado', metrosCuadrados: 20, transporte: null,
  });
  const flakes = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'piso_epoxico_flakes', metrosCuadrados: 20, transporte: null,
  });
  const radianteChico = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'piso_radiante', metrosCuadrados: 10, transporte: null,
  });
  const radianteGrande = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'piso_radiante', metrosCuadrados: 40, transporte: null,
  });
  const termo = (c) => c.cotizacion.interno.despiece.lineas
    .find((l) => l.material === 'termostato-piso-radiante')?.necesario;
  return {
    marmoladoOk: marmolado.ok,
    tienePigmento: marmolado.cotizacion.interno.despiece.lineas.some((l) => l.material === 'pigmento-marmolado'),
    flakesOk: flakes.ok,
    tieneFlakes: flakes.cotizacion.interno.despiece.lineas.some((l) => l.material === 'flakes-decorativos'),
    termoChico: termo(radianteChico),
    termoGrande: termo(radianteGrande),
    wattsChico: radianteChico.cotizacion.interno.potencia.watts,
    wattsGrande: radianteGrande.cotizacion.interno.potencia.watts,
    llaveGrande: radianteGrande.cotizacion.interno.potencia.llaveRecomendada,
  };
});
paso('Piso epóxico marmolado y con flakes cotizan cada uno con su insumo propio',
  pisos.marmoladoOk && pisos.tienePigmento && pisos.flakesOk && pisos.tieneFlakes,
  JSON.stringify({ m: pisos.tienePigmento, f: pisos.tieneFlakes }));
paso('El piso radiante pide un solo termostato sin importar el área',
  pisos.termoChico === 1 && pisos.termoGrande === 1,
  `10 m² -> ${pisos.termoChico} · 40 m² -> ${pisos.termoGrande}`);
paso('La potencia del piso radiante escala con el área y sugiere una llave mayor',
  pisos.wattsGrande === pisos.wattsChico * 4 && pisos.llaveGrande > 10,
  JSON.stringify({ wattsChico: pisos.wattsChico, wattsGrande: pisos.wattsGrande, llave: pisos.llaveGrande }));


// --- Casa prefabricada: techo simple o termoacústico ---
const casa = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const simple = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'casa_prefabricada', techo: 'calamina',
    metrosCuadrados: 40, transporte: null,
  });
  const termo = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'casa_prefabricada', techo: 'calamina-termoacustica',
    metrosCuadrados: 40, transporte: null,
  });
  const material = (c) => c.cotizacion.interno.despiece.lineas.map((l) => l.material).find((m) => m.startsWith('calamina'));
  return {
    materialSimple: material(simple),
    materialTermo: material(termo),
    costoDistinto: simple.cotizacion.interno.materialCosto !== termo.cotizacion.interno.materialCosto,
  };
});
paso('Casa prefabricada elige entre calamina simple y termoacústica',
  casa.materialSimple === 'calamina' && casa.materialTermo === 'calamina-termoacustica' &&
  casa.costoDistinto, JSON.stringify(casa));


// --- Redondeo comercial: baja al múltiplo de 10, hasta 9 soles ---
const redondeo = await pagina.evaluate(async () => {
  const comun = await import('/src/dominio/precios-comun.js');
  return {
    r1: comun.redondeoComercial(5436),
    r2: comun.redondeoComercial(5430),
    r3: comun.redondeoComercial(5439.99),
    r4: comun.redondeoComercial(9),
  };
});
paso('El redondeo comercial baja al múltiplo de 10, nunca más de 9 soles',
  redondeo.r1 === 5430 && redondeo.r2 === 5430 && redondeo.r3 === 5430 && redondeo.r4 === 0,
  JSON.stringify(redondeo));


// --- Casa prefabricada: precio real por perímetro, con el ejemplo del dueño ---
const casaReal = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const casaPref = await import('/src/dominio/casa-prefabricada.js');

  // Casa de 3 × 4 m: perímetro 14 ml × 2.4 = 33.6 m² de pared × 135 = 4536;
  // tijeral+techo 12 m² × 75 = 900. Total 5436, redondeado a 5430.
  const medidas = casaPref.medidas(3, 4);
  const c = precios.cotizar({
    modalidad: 'con_mano_obra', recetaId: 'casa_prefabricada', techo: 'calamina',
    medidas: { ancho: 3, largo: 4 }, metrosCuadrados: 12, transporte: null,
  });
  return {
    tijeralTecho: medidas.tijeralTecho,
    paredes: medidas.paredes,
    totalCrudo: medidas.total,
    totalCotizado: c.cotizacion.total,
    subtotal: c.cotizacion.subtotal,
  };
});
paso('Casa prefabricada de 3×4 reproduce exacto el ejemplo del dueño',
  casaReal.tijeralTecho === 900 && casaReal.paredes === 4536 &&
  casaReal.totalCrudo === 5436 && casaReal.subtotal === 5436 &&
  casaReal.totalCotizado === 5430,
  JSON.stringify(casaReal));


// --- Ver estructura aparte del acabado en el despiece ---
const grupos = await pagina.evaluate(async () => {
  const g = await import('/src/ui/vistas/despiece-grupos.js');
  const d = await import('/src/dominio/despiece.js');
  const r = d.calcular('division', 20);
  const agrupado = g.agrupar(r.despiece.lineas);
  return {
    total: r.despiece.lineas.length,
    estructura: agrupado.estructura.length,
    acabado: agrupado.acabado.length,
    sumaOk: agrupado.estructura.length + agrupado.acabado.length === r.despiece.lineas.length,
    plancharEnAcabado: agrupado.acabado.some((l) => l.material.startsWith('plancha')),
    rielEnEstructura: agrupado.estructura.some((l) => l.material === 'riel-64'),
  };
});
paso('El despiece se separa en estructura y acabado sin perder líneas',
  grupos.sumaOk && grupos.plancharEnAcabado && grupos.rielEnEstructura,
  JSON.stringify(grupos));

await navegador.close();

console.log('\n--- Errores de consola/página ---');
if (errores.length === 0) console.log('ninguno');
else errores.forEach((e) => console.log('  ' + e));

const fallidos = pasos.filter((p) => !p.ok);
console.log(`\n${pasos.length - fallidos.length}/${pasos.length} pruebas pasaron`);
process.exit(fallidos.length === 0 && errores.length === 0 ? 0 : 1);
