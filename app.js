// =====================================================================
// === SECCIÓN 1: FIREBASE Y SISTEMA DE ROLES (WP DASHBOARD) ===
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCqH7ae8tDJPYHzhLLhv-dRM6eJ8zfNPN8",
    authDomain: "sistema-drywall-pro.firebaseapp.com",
    projectId: "sistema-drywall-pro",
    storageBucket: "sistema-drywall-pro.firebasestorage.app",
    messagingSenderId: "127748912849",
    appId: "1:127748912849:web:9cf46436b73bf1e193f7f0"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore();
let rolUsuario = 'cliente'; 
let moduloActivo = null; // Saber qué diseñador está abierto (ej. 'baldosas')

function toggleAuthMode() {
    let l = document.getElementById('formLoginBox'); let r = document.getElementById('formRegistroBox');
    l.style.display = l.style.display === 'none' ? 'block' : 'none'; r.style.display = r.style.display === 'none' ? 'block' : 'none';
}

function iniciarSesion() {
    let email = document.getElementById('txtEmail').value; let pass = document.getElementById('txtPassword').value; let errDiv = document.getElementById('loginError');
    if(!email || !pass) { errDiv.innerText = "Ingresa correo y contraseña"; errDiv.style.display = "block"; return; }
    auth.signInWithEmailAndPassword(email, pass).catch(e => { errDiv.innerText = "Error: Credenciales incorrectas."; errDiv.style.display = "block"; });
}

function registrarUsuario() {
    let email = document.getElementById('regEmail').value; let pass = document.getElementById('regPassword').value; let errDiv = document.getElementById('regError');
    if(pass.length < 6) { errDiv.innerText = "Mínimo 6 caracteres"; errDiv.style.display = "block"; return; }
    auth.createUserWithEmailAndPassword(email, pass).then((cred) => {
        return db.collection('usuarios').doc(cred.user.uid).set({ email: email, rol: 'cliente', fecha: firebase.firestore.FieldValue.serverTimestamp() });
    }).catch(e => { errDiv.innerText = "Error: " + e.message; errDiv.style.display = "block"; });
}

function cerrarSesion() { auth.signOut(); }

auth.onAuthStateChanged(async user => {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        try {
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if(doc.exists) rolUsuario = doc.data().rol || 'cliente';
            else { await db.collection('usuarios').doc(user.uid).set({ email: user.email, rol: 'cliente' }); rolUsuario = 'cliente'; }
        } catch(e) { rolUsuario = 'cliente'; }
        aplicarRestriccionesUI(rolUsuario, user.email); renderizarCatalogo();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardWrapper').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'none';
    }
});

function aplicarRestriccionesUI(rol, email) {
    let badge = document.getElementById('badgeRol'); let tabMat = document.getElementById('navTabMat'); let tabDist = document.getElementById('navTabDist'); 
    let inputPrecio = document.getElementById('inputPrecioM2'); let bloquePrecio = document.getElementById('bloquePrecioM2');
    
    if(rol === 'admin' || rol === 'programador') {
        document.getElementById('menuIA').style.display = 'block';
        document.getElementById('dashboardWrapper').style.display = 'flex'; document.getElementById('appWrapper').style.display = 'none';
        document.getElementById('dashEmail').innerText = email; document.getElementById('dashRol').innerText = rol.toUpperCase();
        document.getElementById('btnVolverDash').style.display = 'inline-block';
        badge.innerText = rol.toUpperCase(); badge.className = rol==='admin' ? "rol-badge bg-warning text-dark" : "rol-badge bg-danger text-white";
        tabMat.style.display = 'block'; tabDist.style.display = rol === 'programador' ? 'block' : 'none'; 
        inputPrecio.removeAttribute('readonly'); bloquePrecio.style.display = 'flex';
    } else {
        document.getElementById('dashboardWrapper').style.display = 'none'; 
        abrirDiseñadorCAD('baldosas'); // Clientes van directo a la herramienta de baldosas
        badge.innerText = "CLIENTE"; badge.className = "rol-badge bg-primary text-white";
        tabMat.style.display = 'none'; tabDist.style.display = 'none'; 
        inputPrecio.setAttribute('readonly', true); bloquePrecio.style.display = 'none';
        document.getElementById('btnVolverDash').style.display = 'none';
    }
}

function abrirDiseñadorCAD(tipo) { 
    moduloActivo = tipo;
    document.getElementById('dashboardWrapper').style.display = 'none'; 
    document.getElementById('appWrapper').style.display = 'block'; 
    
    // Cambiar Título según herramienta
    if(tipo === 'baldosas') document.getElementById('tituloHerramientaCAD').innerText = "🏗️ CAD: Cielo Raso (Baldosas)";
    // Aquí agregaremos if(tipo === 'drywall_ambas') ... cuando construyamos esas secciones.
}

function volverDashboard() { document.getElementById('appWrapper').style.display = 'none'; document.getElementById('dashboardWrapper').style.display = 'flex'; }


// =====================================================================
// === SECCIÓN 2: SISTEMA DE LOGÍSTICA, MAPAS GPS Y CHECKOUT ===
// =====================================================================
let map = null; let routingControl = null; let costoTransporteActual = 0; let costoTotalProyectoSinFlete = 0;
const shopLocation = [-15.4965, -70.1332]; 

function abrirCheckout() {
    new bootstrap.Modal(document.getElementById('modalCheckout')).show();
    document.getElementById('chkCostoProyecto').innerText = `S/ ${costoTotalProyectoSinFlete.toFixed(2)}`;
    calcularResumenPago();
}

document.getElementById('modalCheckout').addEventListener('shown.bs.modal', function () {
    if(!map) {
        map = L.map('mapaTransporte').setView(shopLocation, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSMap' }).addTo(map);
        routingControl = L.Routing.control({
            waypoints: [ L.latLng(shopLocation), L.latLng([-15.5000, -70.1300]) ], 
            routeWhileDragging: true, show: false, addWaypoints: false, language: 'es',
            createMarker: function(i, wp, nWps) {
                if (i === 0) return L.marker(wp.latLng, {draggable: false}).bindPopup("<b>Tienda</b>");
                return L.marker(wp.latLng, {draggable: true}).bindPopup("<b>Obra Cliente</b>");
            }
        }).addTo(map);
        routingControl.on('routesfound', function(e) { calcularFleteRuta(e.routes[0].summary.totalDistance); });
    }
    map.invalidateSize();
});

async function buscarDireccion() {
    let dir = document.getElementById('chkDireccion').value; if(!dir) return;
    document.getElementById('chkDistanciaTxt').innerText = "Buscando...";
    try {
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dir + ', Juliaca, Peru')}`); 
        let data = await res.json();
        if(data.length > 0) {
            let newLatLng = L.latLng(data[0].lat, data[0].lon);
            routingControl.spliceWaypoints(routingControl.getWaypoints().length - 1, 1, newLatLng); map.panTo(newLatLng);
        } else { alert("No se encontró. Mueve el pin manualmente."); }
    } catch(e) { console.error(e); }
}

function calcularFleteRuta(distanciaMetros) {
    let distanciaKm = distanciaMetros / 1000;
    if(distanciaKm <= 5) costoTransporteActual = 20; else costoTransporteActual = 20 + ((distanciaKm - 5) * 8);
    document.getElementById('chkDistanciaTxt').innerText = `${distanciaKm.toFixed(2)} km (En Ruta GPS)`;
    document.getElementById('chkCostoFlete').innerText = `S/ ${costoTransporteActual.toFixed(2)}`;
    calcularResumenPago();
}

function calcularResumenPago() {
    let p = parseInt(document.getElementById('chkTipoPago').value);
    document.getElementById('chkMontoCobrar').innerText = `S/ ${((costoTotalProyectoSinFlete + costoTransporteActual) * p / 100).toFixed(2)}`;
}

function confirmarPedido() {
    let n = document.getElementById('chkNombre').value.trim(); let c = document.getElementById('chkCelular').value.trim(); let d = document.getElementById('chkDireccion').value.trim();
    if(!/^\d{8}$/.test(n) && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+/.test(n)) return alert("Ingresa Nombres completos o DNI (8 dígitos).");
    if(!/^9\d{8}$/.test(c)) return alert("Celular inválido (9 dígitos, empezando con 9).");
    if(d.length < 5) return alert("Ingresa una dirección válida.");

    let p = parseInt(document.getElementById('chkTipoPago').value); let tG = costoTotalProyectoSinFlete + costoTransporteActual; let mC = (tG * p) / 100;
    
    document.getElementById('tFecha').innerText = new Date().toLocaleString(); document.getElementById('tCliente').innerText = n + " | Cel: " + c;
    document.getElementById('tDir').innerText = d; document.getElementById('tM2').innerText = (parseFloat(document.getElementById('inputLargo').value) * parseFloat(document.getElementById('inputAncho').value)).toFixed(2);
    document.getElementById('tDist').innerText = document.getElementById('chkDistanciaTxt').innerText; document.getElementById('tProy').innerText = `S/ ${costoTotalProyectoSinFlete.toFixed(2)}`;
    document.getElementById('tFlete').innerText = `S/ ${costoTransporteActual.toFixed(2)}`; document.getElementById('tPagado').innerText = `S/ ${mC.toFixed(2)} (${p}%)`;
    document.getElementById('tDeuda').innerText = `S/ ${(tG - mC).toFixed(2)}`;

    bootstrap.Modal.getInstance(document.getElementById('modalCheckout')).hide(); new bootstrap.Modal(document.getElementById('modalRecibo')).show();
}

function descargarRecibo(tipo) {
    const t = document.getElementById('ticketContenido');
    if(tipo === 'png') { html2canvas(t).then(c => { let l = document.createElement('a'); l.download = 'Recibo.png'; l.href = c.toDataURL(); l.click(); }); } 
    else if(tipo === 'pdf') { html2canvas(t).then(c => { const i = c.toDataURL('image/png'); const pdf = new window.jspdf.jsPDF('p', 'mm', 'a5'); const w = pdf.internal.pageSize.getWidth(); pdf.addImage(i, 'PNG', 0, 0, w, (c.height * w) / c.width); pdf.save("Recibo.pdf"); }); }
}


// =====================================================================
// === SECCIÓN 3: MOTOR CAD CIELO RASO (BALDOSAS AVANZADO) ===
// =====================================================================
let inventario = { perimetrales: "Ángulo Perim.", principales: "T Principal", secundarias: "T Secundaria", terciarias: "T Terciaria", baldosas: "Baldosas (61x61)", clavos: "Clavos/Fulminantes", alambre: "Alambre #12" };
let compras = {}; let gridForzadoHorizontal = null; let canvasScale = 1; let canvasOffsetX = 0; let canvasOffsetY = 0; let gridOpt = null; 
let preciosBase = { perim: 4.0, main: 7.3, sec: 2.2, ter: 1.2, bald: 3.4, clav: 20.0, alam: 8.0 };

// Variables Avanzadas del Motor CAD
let lucesArray = []; 
let vigasArray = []; 
let offsetGrillaCentral = { x: 0, y: 0 }; 
let orientacionVigaGlobal = 0; // 0=Arriba, 1=Derecha, 2=Abajo, 3=Izquierda

function generarDesglosePerfil(enteros, cortesArr) {
    let c = cortesArr.length; let t = enteros; let h = `<strong>Enteros:</strong> ${enteros} un<br>`;
    if (c > 0) { let p = Math.ceil(c / 2); t += p; h += `<strong>Cortes:</strong> ${c} (${p} extras)`; }
    return { html: h, totalUn: t };
}

// ----------------------------------------------------
// BOTONES DE CONFIGURACIÓN AVANZADA
// ----------------------------------------------------
function girarVigaGlobal() { orientacionVigaGlobal = (orientacionVigaGlobal + 1) % 4; calcularPresupuesto(); }
function forzarRotacionGrid() { gridForzadoHorizontal = gridForzadoHorizontal === null ? false : !gridForzadoHorizontal; calcularPresupuesto(); }
function centrarFocosYMaterial() { offsetGrillaCentral = { x: 0.305, y: 0.305 }; calcularPresupuesto(); }
function centrarSoloFocos() { offsetGrillaCentral = { x: 0, y: 0 }; calcularPresupuesto(); }
function reestablecerFocos() { offsetGrillaCentral = { x: 0, y: 0 }; limpiarPlano(); }

function calcularPresupuesto() {
    if(moduloActivo !== 'baldosas') return; // Seguridad modular
    
    const largo = parseFloat(document.getElementById('inputLargo').value) || 0; const ancho = parseFloat(document.getElementById('inputAncho').value) || 0;
    const pM2 = parseFloat(document.getElementById('inputPrecioM2').value) || 30;
    if (largo <= 0 || ancho <= 0) return;
    const m2 = largo * ancho; const perimetro = (largo * 2) + (ancho * 2);

    let tLuces = lucesArray.reduce((s, l) => s + (parseFloat(l.precio) || 0), 0);
    costoTotalProyectoSinFlete = (m2 * pM2) + tLuces;
    document.getElementById('totalClienteDisplay').innerText = `S/ ${costoTotalProyectoSinFlete.toFixed(2)}`;

    gridOpt = { dimLargo: largo, dimAncho: ancho, esHorizontal: true };
    if(gridForzadoHorizontal !== null) gridOpt.esHorizontal = gridForzadoHorizontal;

    let conteo = { mEnt:0, mCort:[], sEnt:0, sCort:[], tEnt:0, tCort:[], ptos:0 };
    for(let s = 1.22; s < ancho; s += 1.22) { conteo.mEnt += Math.floor(largo / 3.66); let so = Math.round((largo % 3.66) * 100); if(so > 0) conteo.mCort.push(so); conteo.ptos += Math.ceil(largo / 1.22); }
    for(let p = 0.61; p < largo; p += 0.61) { for(let s = 0; s < ancho; s += 1.22) { let t = Math.round(Math.min(1.22, ancho - s) * 100); if(t === 122) conteo.sEnt++; else if(t > 0) { if(t <= 61) conteo.tCort.push(t); else conteo.sCort.push(t); } } }
    for(let s = 0.61; s < ancho; s += 1.22) { for(let p = 0; p < largo; p += 0.61) { let t = Math.round(Math.min(0.61, largo - p) * 100); if(t === 61) conteo.tEnt++; else if(t > 0) conteo.tCort.push(t); } }

    let pCm = Math.round(perimetro * 100); compras.perimetrales = Math.floor(pCm / 305) + (pCm % 305 > 0 ? 1 : 0);
    let rMain = generarDesglosePerfil(conteo.mEnt, conteo.mCort); compras.principales = rMain.totalUn;
    let rSec = generarDesglosePerfil(conteo.sEnt, conteo.sCort); compras.secundarias = rSec.totalUn;
    let rTer = generarDesglosePerfil(conteo.tEnt, conteo.tCort); compras.terciarias = rTer.totalUn;

    // Cálculo Avanzado de Baldosas con BASURERO VIRTUAL
    let bL = Math.floor(largo / 0.61); let resL = Math.round((largo % 0.61) * 100); 
    let bA = Math.floor(ancho / 0.61); let resA = Math.round((ancho % 0.61) * 100);
    let tBaldNuevas = bL * bA; let scrapBin = [];
    
    let l61 = lucesArray.filter(l => l.isSquare && l.size >= 60).length; 
    if(l61 > 0) tBaldNuevas -= l61;
    let txtB = `<strong>Enteros:</strong> ${bL * bA - l61} baldosas<br>`;

    function procCorteB(tam, cant, nom) {
        if(cant===0 || tam===0) return 0;
        let rR = 0;
        for(let i=0; i<scrapBin.length; i++) { while(scrapBin[i] >= tam && cant > 0) { scrapBin[i]-=tam; cant--; rR++; } }
        let n = 0; let pxB = Math.floor(61/tam);
        if(cant>0) {
            n = Math.ceil(cant/pxB); let ru = cant%pxB; if(ru===0) ru = pxB;
            let su = 61-(ru*tam); let rl = 61%tam;
            for(let k=0; k<n-1; k++) { if(rl>0) scrapBin.push(rl); }
            if(su>0) scrapBin.push(su);
        }
        return n;
    }

    if(resL>0 || resA>0) {
        tBaldNuevas += procCorteB(resL, bA, "Largo"); tBaldNuevas += procCorteB(resA, bL, "Ancho");
        if(resL>0 && resA>0) {
            let m = Math.max(resL, resA); let cub = false;
            for(let i=0; i<scrapBin.length; i++) { if(scrapBin[i]>=m) { scrapBin[i]-=m; cub=true; break; } }
            if(!cub) { tBaldNuevas++; let sE = 61-m; if(sE>0) scrapBin.push(sE); }
        }
    }
    
    compras.baldosas = tBaldNuevas < 0 ? 0 : tBaldNuevas;
    compras.clavos = Math.ceil((perimetro * 100) / 35) + conteo.ptos; compras.alambreMts = Math.ceil((conteo.ptos * 20) / 100); 

    let html = `
        <tr><td class="fw-bold align-middle">${inventario.perimetrales}</td><td class="text-primary fw-bold text-center align-middle">${compras.perimetrales} un</td><td class="small align-middle">Req ${pCm} cm</td></tr>
        <tr><td class="fw-bold text-success align-middle">⭐ ${inventario.principales}</td><td class="text-primary fw-bold text-center align-middle">${compras.principales} un</td><td class="small align-middle">${rMain.html}</td></tr>
        <tr><td class="fw-bold text-info align-middle">${inventario.secundarias}</td><td class="text-primary fw-bold text-center align-middle">${compras.secundarias} un</td><td class="small align-middle">${rSec.html}</td></tr>
        <tr><td class="fw-bold text-warning align-middle">${inventario.terciarias}</td><td class="text-primary fw-bold text-center align-middle">${compras.terciarias} un</td><td class="small align-middle">${rTer.html}</td></tr>
        <tr><td class="fw-bold text-danger align-middle">🔲 ${inventario.baldosas}</td><td class="text-primary fw-bold text-center align-middle">${compras.baldosas} un</td><td class="small align-middle">${txtB} (Recortes optimizados)</td></tr>
    `;
    document.getElementById('tablaResultados').innerHTML = html;

    dibujarPlanoVisual(largo, ancho);
    if(typeof actualizarCotizadorYDistribucion === "function") actualizarCotizadorYDistribucion(m2, pM2, tLuces);
    document.getElementById('areaTrabajo').style.display = 'flex';
}

function mostrarAdvertencia(mensaje) {
    let toast = document.getElementById('toastAdvertencia'); toast.innerText = mensaje; toast.style.display = 'block';
    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; }, 500); }, 3000);
}

// =====================================================================
// === SECCIÓN 3.1: DRAG & DROP Y CATÁLOGO ===
// =====================================================================
let catalogoLuces = [ { id: 1, nombre: "Dicroico Redondo", size: 15, isSquare: false, watts: "12W", marca: "Genérico", precio: 15.00 }, { id: 2, nombre: "Panel Cuadrado", size: 61, isSquare: true, watts: "48W", marca: "Premium", precio: 80.00 } ];

function renderizarCatalogo() {
    let html = ``;
    catalogoLuces.forEach(l => {
        let iconStr = l.isSquare ? `<div class="drag-icon text-dark" style="background:#ffc107;">💡</div>` : `<div class="drag-icon bg-warning" style="border-radius:50%;">💡</div>`;
        let editAttr = (rolUsuario === 'admin' || rolUsuario === 'programador') ? `ondblclick="abrirEdicionCatalogo(${l.id})"` : ``;
        html += `<div class="draggable-item shadow-sm" draggable="true" ondragstart="iniciarArrastre(event, 'luz', ${l.id})" ${editAttr}>${iconStr}<div class="lh-sm"><strong>${l.nombre} (${l.size}cm)</strong><br><span class="text-muted small">${l.marca} | <strong class="text-success fs-6">S/ ${l.precio.toFixed(2)}</strong></span></div></div>`;
    });
    document.getElementById('contenedorCatalogo').innerHTML = html;
}

function abrirEdicionCatalogo(id) {
    let luz = catalogoLuces.find(l => l.id === id); if(!luz) return;
    document.getElementById('catEditId').value = luz.id; document.getElementById('catEditNombre').value = luz.nombre;
    document.getElementById('catEditSize').value = luz.size; document.getElementById('catEditPrecio').value = luz.precio;
    document.getElementById('catEditWatts').value = luz.watts; document.getElementById('catEditMarca').value = luz.marca;
    new bootstrap.Modal(document.getElementById('modalEdicionCatalogo')).show();
}

function guardarEdicionCatalogo() {
    let id = parseInt(document.getElementById('catEditId').value); let idx = catalogoLuces.findIndex(l => l.id === id);
    if(idx > -1) {
        catalogoLuces[idx].nombre = document.getElementById('catEditNombre').value; catalogoLuces[idx].size = parseFloat(document.getElementById('catEditSize').value) || 0;
        catalogoLuces[idx].precio = parseFloat(document.getElementById('catEditPrecio').value) || 0; catalogoLuces[idx].watts = document.getElementById('catEditWatts').value; catalogoLuces[idx].marca = document.getElementById('catEditMarca').value;
    }
    bootstrap.Modal.getInstance(document.getElementById('modalEdicionCatalogo')).hide(); renderizarCatalogo(); calcularPresupuesto();
}

function iniciarArrastre(e, tipo, id_val) { e.dataTransfer.setData('tipo', tipo); e.dataTransfer.setData('idVal', id_val); }
function permitirSoltar(e) { e.preventDefault(); }
function soltarObjeto(e) {
    e.preventDefault(); const canvas = document.getElementById('planoCanvas'); const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width); const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const wPx = gridOpt.dimLargo * canvasScale; const hPx = gridOpt.dimAncho * canvasScale;

    if (mx < canvasOffsetX || mx > canvasOffsetX + wPx || my < canvasOffsetY || my > canvasOffsetY + hPx) { return mostrarAdvertencia("⚠️ Fuera del ángulo perimetral."); }

    const idCat = parseInt(e.dataTransfer.getData('idVal')); const lC = catalogoLuces.find(l => l.id === idCat); if(!lC) return;
    
    // CÁLCULO DE POSICIÓN CONSIDERANDO EL CENTRADO (OFFSET)
    let gS = 0.61 * canvasScale; 
    let tx = Math.floor((mx - canvasOffsetX - (offsetGrillaCentral.x * canvasScale)) / gS); 
    let ty = Math.floor((my - canvasOffsetY - (offsetGrillaCentral.y * canvasScale)) / gS);
    
    if(lucesArray.find(l => l.tileX === tx && l.tileY === ty)) return mostrarAdvertencia("⚠️ Solo un accesorio por baldosa.");
    lucesArray.push({ tileX: tx, tileY: ty, size: lC.size, isSquare: lC.isSquare, precio: lC.precio, nombre: lC.nombre });
    calcularPresupuesto(); 
}

function limpiarPlano() { lucesArray = []; calcularPresupuesto(); }

document.getElementById('planoCanvas').addEventListener('dblclick', function(e) {
    const rect = this.getBoundingClientRect(); const cX = (e.clientX - rect.left) * (this.width / rect.width); const cY = (e.clientY - rect.top) * (this.height / rect.height);
    let obj = null; let gS = 0.61 * canvasScale;
    let offGrillaX = offsetGrillaCentral.x * canvasScale; let offGrillaY = offsetGrillaCentral.y * canvasScale;

    for(let i=0; i<lucesArray.length; i++) {
        let lx = canvasOffsetX + offGrillaX + (lucesArray[i].tileX * gS) + (gS / 2); 
        let ly = canvasOffsetY + offGrillaY + (lucesArray[i].tileY * gS) + (gS / 2);
        let r = Math.max((lucesArray[i].size / 100 * canvasScale)/2, 20);
        if(Math.sqrt(Math.pow(cX-lx,2) + Math.pow(cY-ly,2)) <= r) { obj = { tipo: 'luz', index: i }; break; }
    }
    if(obj) { objetoEditando = obj; new bootstrap.Modal(document.getElementById('modalEdicion')).show(); }
});
function eliminarObjeto() { if(objetoEditando.tipo === 'luz') lucesArray.splice(objetoEditando.index, 1); bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide(); objetoEditando = null; calcularPresupuesto(); }

// =====================================================================
// === SECCIÓN 3.2: DIBUJO DEL PLANO VISUAL CON FÍSICA AVANZADA ===
// =====================================================================
function dibujarPlanoVisual(largo, ancho) {
    const canvas = document.getElementById('planoCanvas'); const ctx = canvas.getContext('2d');
    canvas.width = document.getElementById('canvasContainer').clientWidth * 1.5; 
    canvas.height = document.getElementById('canvasContainer').clientHeight * 1.5;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let scale = Math.min((canvas.width - 150) / largo, (canvas.height - 150) / ancho);
    canvasScale = scale; let wPx = largo * scale; let hPx = ancho * scale;
    canvasOffsetX = (canvas.width - wPx) / 2; canvasOffsetY = (canvas.height - hPx) / 2;

    // COTAS EXTERNAS GENERALES
    ctx.strokeStyle = "#dc3545"; ctx.fillStyle = "#dc3545"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(canvasOffsetX, canvasOffsetY - 40); ctx.lineTo(canvasOffsetX + wPx, canvasOffsetY - 40); ctx.stroke();
    ctx.font = "bold 18px Arial"; ctx.textAlign = "center"; ctx.fillText(`${largo.toFixed(2)} m`, canvasOffsetX + wPx/2, canvasOffsetY - 45);
    ctx.beginPath(); ctx.moveTo(canvasOffsetX - 40, canvasOffsetY); ctx.lineTo(canvasOffsetX - 40, canvasOffsetY + hPx); ctx.stroke();
    ctx.save(); ctx.translate(canvasOffsetX - 45, canvasOffsetY + hPx/2); ctx.rotate(-Math.PI/2); ctx.fillText(`${ancho.toFixed(2)} m`, 0, 0); ctx.restore();

    // COTAS ACUMULATIVAS (EJE X y Y)
    ctx.fillStyle = "#333"; ctx.font = "bold 12px Arial";
    let pX = gridOpt.esHorizontal ? 0.61 : 1.22; let xA = 0;
    for (let x = pX; x < largo; x += pX) { let px = canvasOffsetX + (x * scale); ctx.beginPath(); ctx.moveTo(px, canvasOffsetY); ctx.lineTo(px, canvasOffsetY - 8); ctx.stroke(); ctx.fillText(Math.round(x * 100), px, canvasOffsetY - 12); xA = x; }
    if (largo - xA > 0.01) { ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round((largo - xA)*100), canvasOffsetX + wPx, canvasOffsetY - 12); }
    ctx.fillStyle = "#333"; let pY = gridOpt.esHorizontal ? 1.22 : 0.61; let yA = 0; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let y = pY; y < ancho; y += pY) { let py = canvasOffsetY + (y * scale); ctx.beginPath(); ctx.moveTo(canvasOffsetX, py); ctx.lineTo(canvasOffsetX - 8, py); ctx.stroke(); ctx.fillText(Math.round(y * 100), canvasOffsetX - 12, py); yA = y; }
    if (ancho - yA > 0.01) { ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round((ancho - yA)*100), canvasOffsetX - 12, canvasOffsetY + hPx); }

    // DIBUJO DE FONDO: LADRILLOS Y CEMENTO
    let objLadTam = document.getElementById('ladTam');
    if(objLadTam) {
        let ladTamMts = (parseFloat(objLadTam.value) || 30) / 100;
        let cemTamMts = (parseFloat(document.getElementById('cemTam').value) || 10) / 100;
        let cemIniMts = (parseFloat(document.getElementById('cemIni').value) || 10) / 100;

        let isCemento = true; let posY = cemIniMts;
        if(cemIniMts > 0) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(canvasOffsetX, canvasOffsetY, wPx, cemIniMts * scale); isCemento = false; }
        while(posY < ancho) {
            let hMts = isCemento ? cemTamMts : ladTamMts; if(posY + hMts > ancho) hMts = ancho - posY;
            ctx.fillStyle = isCemento ? '#e0e0e0' : '#f5c6cb'; ctx.fillRect(canvasOffsetX, canvasOffsetY + (posY * scale), wPx, hMts * scale);
            posY += hMts; isCemento = !isCemento;
        }
    }

    // DIBUJO DE VIGAS
    let chkViga = document.getElementById('checkMostrarViga');
    if(chkViga && chkViga.checked) {
        let vigAlto = (parseFloat(document.getElementById('vigAlto').value) || 15) / 100;
        let vigEspacio = parseFloat(document.getElementById('vigEspacio').value) || 0;
        ctx.fillStyle = "rgba(139,69,19, 0.7)"; 
        if(orientacionVigaGlobal === 0) ctx.fillRect(canvasOffsetX, canvasOffsetY + (vigEspacio * scale), wPx, vigAlto * scale);
        else if(orientacionVigaGlobal === 1) ctx.fillRect(canvasOffsetX + wPx - (vigEspacio * scale) - (vigAlto * scale), canvasOffsetY, vigAlto * scale, hPx);
        else if(orientacionVigaGlobal === 2) ctx.fillRect(canvasOffsetX, canvasOffsetY + hPx - (vigEspacio * scale) - (vigAlto * scale), wPx, vigAlto * scale);
        else if(orientacionVigaGlobal === 3) ctx.fillRect(canvasOffsetX + (vigEspacio * scale), canvasOffsetY, vigAlto * scale, hPx);
    }

    // GRILLA DRYWALL CON OFFSET (Centrado de focos)
    ctx.lineWidth = 3; ctx.strokeStyle = '#000000'; ctx.strokeRect(canvasOffsetX, canvasOffsetY, wPx, hPx);
    let offGrillaX = offsetGrillaCentral.x * scale; let offGrillaY = offsetGrillaCentral.y * scale;

    if (gridOpt.esHorizontal) {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 2; 
        for (let y = 1.22 + offsetGrillaCentral.y; y < ancho; y += 1.22) { ctx.beginPath(); ctx.moveTo(canvasOffsetX, canvasOffsetY + (y*scale)); ctx.lineTo(canvasOffsetX + wPx, canvasOffsetY + (y*scale)); ctx.stroke(); }
        for (let x = 0.61 + offsetGrillaCentral.x; x < largo; x += 0.61) {
            for(let y = 0 + offsetGrillaCentral.y; y < ancho; y += 1.22) { let tramo = Math.min(1.22, ancho - y); ctx.strokeStyle = (tramo <= 0.61) ? '#fd7e14' : '#007bff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(canvasOffsetX + (x*scale), canvasOffsetY + (y*scale)); ctx.lineTo(canvasOffsetX + (x*scale), canvasOffsetY + ((y+tramo)*scale)); ctx.stroke(); }
        }
        ctx.strokeStyle = '#fd7e14'; 
        for (let y = 0.61 + offsetGrillaCentral.y; y < ancho; y += 1.22) { for(let x = 0 + offsetGrillaCentral.x; x < largo; x += 0.61) { let tramo = Math.min(0.61, largo - x); ctx.beginPath(); ctx.moveTo(canvasOffsetX + (x*scale), canvasOffsetY + (y*scale)); ctx.lineTo(canvasOffsetX + ((x+tramo)*scale), canvasOffsetY + (y*scale)); ctx.stroke(); } }
    } else {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 2; 
        for (let x = 1.22 + offsetGrillaCentral.x; x < largo; x += 1.22) { ctx.beginPath(); ctx.moveTo(canvasOffsetX + (x*scale), canvasOffsetY); ctx.lineTo(canvasOffsetX + (x*scale), canvasOffsetY + hPx); ctx.stroke(); }
        for (let y = 0.61 + offsetGrillaCentral.y; y < ancho; y += 0.61) {
            for(let x = 0 + offsetGrillaCentral.x; x < largo; x += 1.22) { let tramo = Math.min(1.22, largo - x); ctx.strokeStyle = (tramo <= 0.61) ? '#fd7e14' : '#007bff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(canvasOffsetX + (x*scale), canvasOffsetY + (y*scale)); ctx.lineTo(canvasOffsetX + ((x+tramo)*scale), canvasOffsetY + (y*scale)); ctx.stroke(); }
        }
        ctx.strokeStyle = '#fd7e14'; 
        for (let x = 0.61 + offsetGrillaCentral.x; x < largo; x += 1.22) { for(let y = 0 + offsetGrillaCentral.y; y < ancho; y += 0.61) { let tramo = Math.min(0.61, ancho - y); ctx.beginPath(); ctx.moveTo(canvasOffsetX + (x*scale), canvasOffsetY + (y*scale)); ctx.lineTo(canvasOffsetX + (x*scale), canvasOffsetY + ((y+tramo)*scale)); ctx.stroke(); } }
    }

    lucesArray.forEach((l) => {
        let gS = 0.61 * scale; let cX = canvasOffsetX + offGrillaX + (l.tileX * gS) + (gS / 2); let cY = canvasOffsetY + offGrillaY + (l.tileY * gS) + (gS / 2); let sPx = (l.size / 100) * scale;
        ctx.fillStyle = l.isSquare ? 'rgba(255,193,7,0.9)' : 'rgba(255,255,255,0.9)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        if(l.isSquare) { ctx.fillRect(cX - sPx/2, cY - sPx/2, sPx, sPx); ctx.strokeRect(cX - sPx/2, cY - sPx/2, sPx, sPx); } 
        else { ctx.beginPath(); ctx.arc(cX, cY, sPx/2, 0, 2*Math.PI); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255, 215, 0, 0.5)"; ctx.beginPath(); ctx.arc(cX, cY, sPx/4, 0, 2*Math.PI); ctx.fill(); }
    });
}
// =====================================================================
// === SECCIÓN 4: COTIZADOR Y DISTRIBUCIÓN (FINANZAS) ===
// =====================================================================
function actualizarCotizadorYDistribucion(m2, pM2, tLuces) {
    let html = `
        <div class="row g-1 mb-1 align-items-center"><div class="col-5">Ángulo (${compras.perimetrales})</div><div class="col-4"><input type="number" id="p_perim" class="form-control form-control-sm" value="${preciosBase.perim}" oninput="calcT()"></div><div class="col-3 text-end fw-bold" id="s_perim"></div></div>
        <div class="row g-1 mb-1 align-items-center"><div class="col-5">T Princ (${compras.principales})</div><div class="col-4"><input type="number" id="p_main" class="form-control form-control-sm" value="${preciosBase.main}" oninput="calcT()"></div><div class="col-3 text-end fw-bold" id="s_main"></div></div>
        <div class="row g-1 mb-1 align-items-center"><div class="col-5">T Sec (${compras.secundarias})</div><div class="col-4"><input type="number" id="p_sec" class="form-control form-control-sm" value="${preciosBase.sec}" oninput="calcT()"></div><div class="col-3 text-end fw-bold" id="s_sec"></div></div>
        <div class="row g-1 mb-1 align-items-center"><div class="col-5">T Terc (${compras.terciarias})</div><div class="col-4"><input type="number" id="p_ter" class="form-control form-control-sm" value="${preciosBase.ter}" oninput="calcT()"></div><div class="col-3 text-end fw-bold" id="s_ter"></div></div>
        <div class="row g-1 mb-1 align-items-center"><div class="col-5">Baldosas (${compras.baldosas})</div><div class="col-4"><input type="number" id="p_bald" class="form-control form-control-sm" value="${preciosBase.bald}" oninput="calcT()"></div><div class="col-3 text-end text-danger fw-bold" id="s_bald"></div></div>
    `;
    lucesArray.forEach(l => { html += `<div class="row g-1 mb-1 text-muted"><div class="col-5 small text-truncate">Luz: ${l.nombre}</div><div class="col-4"></div><div class="col-3 text-end small">S/ ${l.precio.toFixed(2)}</div></div>`; });
    document.getElementById('cuerpoCotizador').innerHTML = html;

    window.calcT = function() {
        let tg = 0; let it = [ { id: 'perim', c: compras.perimetrales }, { id: 'main', c: compras.principales }, { id: 'sec', c: compras.secundarias }, { id: 'ter', c: compras.terciarias }, { id: 'bald', c: compras.baldosas } ];
        it.forEach(i => { let s = (parseFloat(document.getElementById(`p_${i.id}`).value)||0) * i.c; document.getElementById(`s_${i.id}`).innerText = "S/ " + s.toFixed(2); tg += s; });
        document.getElementById('granTotal').innerText = tg.toFixed(2);
        
        let tCl = (m2 * pM2) + tLuces; let pMo = parseFloat(document.getElementById('m_obra') ? document.getElementById('m_obra').value : 5.5); let tMo = m2 * pMo;
        let isTerc = document.getElementById('terc_mo') ? document.getElementById('terc_mo').checked : true;
        let gn = tCl - tg; if(isTerc) gn -= tMo;
        
        let dHtml = `
            <div class="mb-2 d-flex justify-content-between"><span class="small fw-bold">Costo Cliente:</span> <strong class="text-success fs-5">S/ ${tCl.toFixed(2)}</strong></div>
            <div class="mb-2 d-flex justify-content-between bg-light p-2 rounded"><span class="small text-muted">Mano Obra (S/ m²):</span><input type="number" id="m_obra" class="form-control form-control-sm w-25 text-end fw-bold" value="${pMo}" oninput="calcT()"></div>
            <div class="mb-2 d-flex justify-content-between border-bottom pb-1"><span class="small text-muted">Pago Mano Obra:</span> <strong class="text-danger">S/ ${tMo.toFixed(2)}</strong></div>
            <div class="mb-3 d-flex justify-content-between border-bottom pb-1"><span class="small text-muted">Inversión Materiales:</span> <strong class="text-danger">S/ ${tg.toFixed(2)}</strong></div>
            <div class="form-check form-switch mb-4 p-3 bg-light border"><input class="form-check-input ms-0 me-2" type="checkbox" id="terc_mo" onchange="calcT()" ${isTerc?'checked':''}><label class="form-check-label small fw-bold">Instalador Externo</label></div>
            <div class="alert alert-success d-flex justify-content-between align-items-center"><span class="fw-bold">GANANCIA NETA:</span> <strong class="fs-3 ${gn<0?'text-danger':'text-success'}">S/ ${gn.toFixed(2)}</strong></div>
        `;
        document.getElementById('cuerpoDistribucion').innerHTML = dHtml;
    };
    calcT();
}
// =====================================================================
// === SECCIÓN 6: AGENTE IA (AUTODEVELOPER CONECTADO A GITHUB) ===
// =====================================================================

function abrirModuloIA() {
    // Ocultar bienvenida, mostrar IA
    document.getElementById('dashBienvenida').style.display = 'none';
    document.getElementById('panelIA').style.display = 'block';
    
    // Cargar credenciales guardadas en el navegador
    document.getElementById('iaRepo').value = localStorage.getItem('iaRepo') || '';
    document.getElementById('iaGitToken').value = localStorage.getItem('iaGitToken') || '';
    document.getElementById('iaGeminiToken').value = localStorage.getItem('iaGeminiToken') || '';
}

function guardarCredencialesIA() {
    localStorage.setItem('iaRepo', document.getElementById('iaRepo').value.trim());
    localStorage.setItem('iaGitToken', document.getElementById('iaGitToken').value.trim());
    localStorage.setItem('iaGeminiToken', document.getElementById('iaGeminiToken').value.trim());
    alert("✅ Credenciales guardadas de forma segura en tu navegador.");
}

async function ejecutarAgenteIA() {
    const repo = document.getElementById('iaRepo').value.trim();
    const gitToken = document.getElementById('iaGitToken').value.trim();
    const geminiToken = document.getElementById('iaGeminiToken').value.trim();
    const prompt = document.getElementById('iaPrompt').value.trim();
    const log = document.getElementById('iaLog');
    const btn = document.getElementById('btnEjecutarIA');

    if(!repo || !gitToken || !geminiToken || !prompt) return alert("Faltan datos o credenciales.");

    btn.disabled = true; btn.innerText = "⏳ Programando y Analizando... (Puede tardar 1 o 2 minutos)";
    log.style.display = 'block'; log.innerText = "> [SISTEMA] Iniciando Agente IA Autónomo...\n";

    try {
        // 1. Descargar el código fuente en vivo desde GitHub
        log.innerText += "> [GITHUB] Descargando index.html y app.js de la nube...\n";
        const htmlData = await fetchGitHubFile(repo, 'index.html', gitToken);
        const jsData = await fetchGitHubFile(repo, 'app.js', gitToken);

        // Decodificar Base64 a texto (soportando tildes y caracteres latinos)
        let currentHtml = decodeURIComponent(escape(atob(htmlData.content)));
        let currentJs = decodeURIComponent(escape(atob(jsData.content)));

        // 2. Comunicarse con la IA de Google (Gemini)
        log.innerText += "> [IA GEMINI] Enviando código al cerebro neuronal. Escribiendo nueva actualización...\n";
        const systemPrompt = `Eres el Desarrollador Principal de este ERP.
El dueño del sistema te ha pedido lo siguiente: "${prompt}".
Lee el código actual cuidadosamente y aplica la lógica necesaria sin romper la arquitectura existente.

[CÓDIGO ACTUAL INDEX.HTML]:
\`\`\`html\n${currentHtml}\n\`\`\`

[CÓDIGO ACTUAL APP.JS]:
\`\`\`javascript\n${currentJs}\n\`\`\`

REGLA ESTRICTA: Devuelve ÚNICAMENTE un objeto JSON puro (SIN comillas invertidas de markdown, SIN la palabra json). El formato debe ser estrictamente este:
{
  "html": "<aqui todo el codigo html completo y actualizado>",
  "js": "<aqui todo el codigo js completo y actualizado>"
}`;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiToken}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });
        
        const geminiData = await geminiResponse.json();
        if(geminiData.error) throw new Error(geminiData.error.message);
        
        let aiText = geminiData.candidates[0].content.parts[0].text;
        
        // Limpiar el formato Markdown si Gemini lo pone por error
        aiText = aiText.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '').trim();
        const newCode = JSON.parse(aiText);

        if(!newCode.html || !newCode.js) throw new Error("La IA no devolvió el formato esperado.");

        // 3. Subir el nuevo código de regreso a GitHub
        log.innerText += "> [GITHUB] Código generado exitosamente. Compilando y subiendo index.html...\n";
        await updateGitHubFile(repo, 'index.html', newCode.html, htmlData.sha, gitToken);
        
        log.innerText += "> [GITHUB] Subiendo app.js...\n";
        await updateGitHubFile(repo, 'app.js', newCode.js, jsData.sha, gitToken);

        log.innerText += "\n✅ [DESPLIEGUE EXITOSO] Los cambios han sido subidos a la rama principal de GitHub.\n🌐 Vercel está compilando la página. Entra a tu web en 1 minuto y presiona F5 para ver los cambios.";
    } catch (error) {
        log.innerText += `\n❌ ERROR CRÍTICO: ${error.message}`;
        console.error(error);
    }
    btn.disabled = false; btn.innerText = "🚀 Generar y Subir a GitHub";
}

// Funciones Auxiliares para GitHub REST API
async function fetchGitHubFile(repo, path, token) {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: { 'Authorization': `token ${token}` } });
    if(!res.ok) throw new Error(`No se pudo descargar ${path} del repositorio.`);
    return await res.json();
}

async function updateGitHubFile(repo, path, content, sha, token) {
    // Codificar a Base64 soportando tildes y eñes
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    const body = { message: `🤖 Update ${path} via Autodeveloper AI`, content: encodedContent, sha: sha };
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error(`Falló la subida de ${path} a GitHub.`);
    return await res.json();
}
