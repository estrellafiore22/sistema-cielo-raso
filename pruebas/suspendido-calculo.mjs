// Playwright vive fuera del repositorio (ver correr.sh), así que se resuelve
// por ruta absoluta: los módulos ES no miran NODE_PATH. Y como el paquete es
// CommonJS, al importarlo así queda colgado de `default`.
const _pw = await import(process.env.PLAYWRIGHT_MODULO || 'playwright');
const chromium = _pw.chromium || _pw.default.chromium;

const BASE = 'http://localhost:8765';
const pasos = [];
const errores = [];
const paso = (n, ok, d = '') => {
  pasos.push({ n, ok });
  console.log(`${ok ? '✅' : '❌'} ${n}${d ? '\n     ' + d : ''}`);
};

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
await pagina.goto(BASE, { waitUntil: 'networkidle' });

// --- Cortes con empate: el óptimo exacto -----------------------------------
const cortes = await pagina.evaluate(async () => {
  const c = await import('/src/dominio/suspendido/cortes.js');
  return {
    // El ejemplo del dueño: 5 recortes de 20 cm desde terciarias de 61
    cinco20: c.cortarConEmpates(61, [20, 20, 20, 20, 20], 15),
    // Dos de 169 desde principales de 366: entran juntas (338 <= 366)
    dos169: c.cortarConEmpates(366, [169, 169], 15),
    // Cuatro de 50: caben de a dos por barra
    cuatro50: c.cortarConEmpates(366, [50, 50, 50, 50], 15),
    // Sin empate: de 61 salen 3 de 20
    libre: c.cortarLibre(61, [20, 20, 20, 20, 20], 5),
    unidades: c.unidadesYResto(1265, 305),
  };
});

// 5 piezas de 20, máximo 2 por barra → 3 barras
paso('Con empate: 5 recortes de 20 cm salen de 3 terciarias',
  cortes.cinco20.barrasCortadas === 3,
  `barras=${cortes.cinco20.barrasCortadas}, merma=${cortes.cinco20.mermaTotal} cm`);

paso('La barra que lleva una sola pieza deja sobrante útil',
  cortes.cinco20.sobrantes.length === 1 && cortes.cinco20.sobrantes[0].largo === 41,
  JSON.stringify(cortes.cinco20.sobrantes));

paso('Dos piezas de 169 entran en una sola principal',
  cortes.dos169.barrasCortadas === 1,
  `barras=${cortes.dos169.barrasCortadas}`);

paso('Cuatro piezas de 50 usan 2 principales, no 4',
  cortes.cuatro50.barrasCortadas === 2 && cortes.cuatro50.mermaTotal === 532,
  `barras=${cortes.cuatro50.barrasCortadas}, merma=${cortes.cuatro50.mermaTotal} cm`);

// Sin empate, de una baldosa de 61 salen 3 de 20 → 5 piezas en 2 baldosas
paso('Sin empate: 5 recortes de 20 salen de 2 baldosas',
  cortes.libre.barrasCortadas === 2,
  `baldosas=${cortes.libre.barrasCortadas}`);

// 1265 / 305 = 4 unidades y 45 cm
paso('Unidades y resto: 1265 cm = 4 un + 45 cm',
  cortes.unidades.unidades === 4 && cortes.unidades.resto === 45 && cortes.unidades.comprar === 5,
  JSON.stringify(cortes.unidades));

// --- Geometría --------------------------------------------------------------
const geo = await pagina.evaluate(async () => {
  const g = await import('/src/dominio/suspendido/geometria.js');
  const r = g.construir(535, 416, 'vertical');
  const grid = r.grid;
  return {
    principales: grid.principales.length,
    largoPrincipal: grid.principales[0]?.largo,
    tramos: grid.principales[0]?.tramos,
    secundarias: grid.secundarias.length,
    secCompletas: grid.secundarias.filter((s) => s.completa).length,
    secParciales: [...new Set(grid.secundarias.filter((s) => !s.completa).map((s) => s.largo))],
    terciarias: grid.terciarias.length,
    terCompletas: grid.terciarias.filter((t) => t.completa).length,
    terParciales: [...new Set(grid.terciarias.filter((t) => !t.completa).map((t) => t.largo))],
    baldosas: grid.baldosas.length,
    baldosasCompletas: grid.baldosas.filter((b) => b.completa).length,
    columnas: grid.columnas.map((c) => c.largo),
    filas: grid.filas.map((f) => f.largo),
    perimetro: grid.perimetro.total,
  };
});

// 535 → mains en 122,244,366,488 = 4
paso('5.35 × 4.16 m da 4 T principales', geo.principales === 4, `principales=${geo.principales}`);
paso('Cada principal mide 416 cm = 1 barra + 50 cm de recorte',
  geo.largoPrincipal === 416 && geo.tramos.enteras === 1 && geo.tramos.resto === 50,
  JSON.stringify(geo.tramos));

// filas de secundarias: 61..366 = 6 filas; paños = 4 de 122 + 1 de 47
paso('Secundarias: 6 filas × 5 paños = 30 piezas',
  geo.secundarias === 30 && geo.secCompletas === 24,
  `total=${geo.secundarias}, completas=${geo.secCompletas}, parciales=${JSON.stringify(geo.secParciales)}`);

paso('El paño final de secundaria mide 47 cm',
  geo.secParciales.length === 1 && geo.secParciales[0] === 47);

// terciarias: 4 posiciones × 7 bandas = 28; última banda 50 cm
paso('Terciarias: 4 posiciones × 7 bandas = 28 piezas',
  geo.terciarias === 28 && geo.terCompletas === 24,
  `total=${geo.terciarias}, completas=${geo.terCompletas}, parciales=${JSON.stringify(geo.terParciales)}`);

// baldosas: 9 columnas × 7 filas = 63
paso('Baldosas: 9 × 7 = 63, de las cuales 48 enteras',
  geo.baldosas === 63 && geo.baldosasCompletas === 48,
  `total=${geo.baldosas}, enteras=${geo.baldosasCompletas}`);

paso('Perímetro = 2×(535+416) = 1902 cm', geo.perimetro === 1902, `${geo.perimetro} cm`);

// --- Cálculo completo -------------------------------------------------------
const calc = await pagina.evaluate(async () => {
  const s = await import('/src/dominio/suspendido/index.js');
  const r = s.calcular({ ancho: 535, largo: 416, orientacion: 'auto' });
  if (!r.ok) return { error: r.error };
  const c = r.calculo;
  const linea = (k) => c.lineas.find((l) => l.clave === k);
  return {
    orientacion: c.orientacion,
    comparacion: c.comparacion,
    total: c.total,
    area: c.medidas.area,
    principal: linea('principal'),
    secundaria: linea('secundaria'),
    terciaria: linea('terciaria'),
    perimetral: linea('perimetral'),
    baldosa: linea('baldosa'),
    alambre: linea('alambre'),
    combo: linea('comboClavos'),
    sustituciones: c.materiales.secundaria.sustituciones,
    sobrantes: c.sobrantes.map((s) => ({ nombre: s.nombre, piezas: s.piezas, merma: s.merma })),
    faltanPrecios: c.faltanPrecios,
  };
});

paso('El cálculo completo corre sin error', !calc.error, calc.error || '');

paso('Elige la orientación más barata y muestra el ahorro',
  calc.comparacion.ahorro >= 0 && ['vertical', 'horizontal'].includes(calc.orientacion),
  `elegida=${calc.orientacion} S/${calc.comparacion.elegida.total} · alternativa=${calc.comparacion.alternativa.orientacion} S/${calc.comparacion.alternativa.total} · ahorro S/${calc.comparacion.ahorro}`);

paso('Sustituye las secundarias cortas por terciarias',
  calc.sustituciones && calc.sustituciones.cantidad > 0,
  calc.sustituciones ? `${calc.sustituciones.cantidad} tramos de ${calc.sustituciones.largo} cm` : 'sin sustitución');

// alambre: cobrado por metro entero
paso('El alambre se cobra por metro entero',
  calc.alambre.unidad === 'm' && Number.isInteger(calc.alambre.cantidad),
  `${calc.alambre.cantidad} m · ${calc.alambre.material.puntos} puntos cada ${calc.alambre.material.paso} cm`);

// clavos: combos de 100
paso('Clavos y fulminantes se cobran por combo de 100 pares',
  calc.combo.unidad === 'combo' && calc.combo.cantidad === Math.ceil(calc.combo.material.pares / 100),
  `${calc.combo.material.pares} pares → ${calc.combo.cantidad} combo(s)`);

paso('Cada material informa unidades + centímetros de merma',
  calc.principal.material.unidades >= 0 && calc.principal.material.resto >= 0,
  `Principal: ${calc.principal.material.unidades} un + ${calc.principal.material.resto} cm · comprar ${calc.principal.cantidad} un`);

paso('Reporta los sobrantes que sirven para otras obras',
  calc.sobrantes.length > 0,
  calc.sobrantes.map((s) => `${s.nombre}: ${s.piezas.map((p) => `${p.cantidad}×${p.largo}cm`).join(', ')} (merma ${s.merma}cm)`).join(' | '));

paso('Avisa qué materiales no tienen precio cargado',
  Array.isArray(calc.faltanPrecios),
  calc.faltanPrecios.join(', ') || 'ninguno');

// --- Solo m² ----------------------------------------------------------------
const soloArea = await pagina.evaluate(async () => {
  const s = await import('/src/dominio/suspendido/index.js');
  const r = s.calcular({ metrosCuadrados: 43.92 });
  return r.ok ? { exactas: r.calculo.medidas.exactas, aviso: !!r.calculo.medidas.aviso, total: r.calculo.total } : { error: r.error };
});
paso('Acepta solo m² pero avisa que las medidas son supuestas',
  soloArea.exactas === false && soloArea.aviso === true,
  `total S/${soloArea.total}`);


// --- Cobro mínimo y cuadro de la tienda ---
const minimo = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const chico = { modalidad: 'con_mano_obra', recetaId: 'suspendido',
    suspendido: { ancho: 300, largo: 200, orientacion: 'auto' }, transporte: null };
  const grande = { ...chico, suspendido: { ancho: 600, largo: 500, orientacion: 'auto' } };
  const a = precios.cotizar(chico);
  const b = precios.cotizar(grande);
  return {
    chico: a.cotizacion.total,
    chicoAplico: a.cotizacion.interno.cuentaTienda.cobroMinimo.aplico,
    grande: b.cotizacion.total,
    grandeAplico: b.cotizacion.interno.cuentaTienda.cobroMinimo.aplico,
  };
});
paso('Una obra de 3 x 2 m no baja del cobro mínimo de 250',
  minimo.chico === 250 && minimo.chicoAplico === true, JSON.stringify(minimo));
paso('Una obra grande cobra su precio, no el mínimo',
  minimo.grande > 250 && minimo.grandeAplico === false, JSON.stringify(minimo));

const cuadros = await pagina.evaluate(async () => {
  const precios = await import('/src/dominio/precios.js');
  const salida = {};
  for (const recetaId of ['suspendido', 'division', 'cielo_raso']) {
    const r = precios.cotizar({
      modalidad: 'con_mano_obra',
      recetaId,
      metrosCuadrados: 40,
      suspendido: { ancho: 600, largo: 500, orientacion: 'auto' },
      transporte: { km: 10 },
    });
    const c = r.cotizacion?.interno?.cuentaTienda;
    salida[recetaId] = c
      ? Math.abs(c.ganancia - (c.cobradoAlCliente - c.materiales - c.manoObra + c.transporte)) < 0.02
      : false;
  }
  return salida;
});
paso('Todos los tipos de trabajo cierran cuentas de la tienda',
  Object.values(cuadros).every(Boolean), JSON.stringify(cuadros));

await navegador.close();
console.log('\n--- Errores ---');
console.log(errores.length ? errores.join('\n') : 'ninguno');
const fallidos = pasos.filter((p) => !p.ok).length;
console.log(`\n${pasos.length - fallidos}/${pasos.length} pruebas pasaron`);
process.exit(fallidos === 0 && errores.length === 0 ? 0 : 1);
