// ==========================================
// 1. INICIALIZACIÓN DE FIREBASE Y ROLES
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCqH7ae8tDJPYHzhLLhv-dRM6eJ8zfNPN8",
    authDomain: "sistema-drywall-pro.firebaseapp.com",
    projectId: "sistema-drywall-pro",
    storageBucket: "sistema-drywall-pro.firebasestorage.app",
    messagingSenderId: "127748912849",
    appId: "1:127748912849:web:9cf46436b73bf1e193f7f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let rolUsuario = 'cliente'; 

function toggleAuthMode() {
    let login = document.getElementById('formLoginBox'); let registro = document.getElementById('formRegistroBox');
    if(login.style.display === 'none') { login.style.display = 'block'; registro.style.display = 'none'; } 
    else { login.style.display = 'none'; registro.style.display = 'block'; }
}

function iniciarSesion() {
    let email = document.getElementById('txtEmail').value; let pass = document.getElementById('txtPassword').value; let errDiv = document.getElementById('loginError');
    if(!email || !pass) { errDiv.innerText = "Ingresa correo y contraseña"; errDiv.style.display = "block"; return; }
    auth.signInWithEmailAndPassword(email, pass).then(() => { errDiv.style.display = "none"; }).catch(error => { errDiv.innerText = "Error: Credenciales incorrectas."; errDiv.style.display = "block"; });
}

function registrarUsuario() {
    let email = document.getElementById('regEmail').value; let pass = document.getElementById('regPassword').value; let errDiv = document.getElementById('regError');
    if(pass.length < 6) { errDiv.innerText = "Mínimo 6 caracteres"; errDiv.style.display = "block"; return; }
    auth.createUserWithEmailAndPassword(email, pass).then((cred) => {
        return db.collection('usuarios').doc(cred.user.uid).set({ email: email, rol: 'cliente', fechaRegistro: firebase.firestore.FieldValue.serverTimestamp() });
    }).then(() => { errDiv.style.display = "none"; }).catch(error => { errDiv.innerText = "Error: " + error.message; errDiv.style.display = "block"; });
}

function cerrarSesion() { auth.signOut(); }

auth.onAuthStateChanged(async user => {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appWrapper').style.display = 'block'; document.getElementById('userEmailDisplay').innerText = user.email;
        try {
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if(doc.exists) { rolUsuario = doc.data().rol || 'cliente'; } 
            else { await db.collection('usuarios').doc(user.uid).set({ email: user.email, rol: 'cliente' }); rolUsuario = 'cliente'; }
        } catch(e) { console.error(e); rolUsuario = 'cliente'; }
        aplicarRestriccionesUI(rolUsuario); renderizarCatalogo();
    } else {
        document.getElementById('loginScreen').style.display = 'flex'; document.getElementById('appWrapper').style.display = 'none';
    }
});

function aplicarRestriccionesUI(rol) {
    let badge = document.getElementById('badgeRol'); let tabMat = document.getElementById('navTabMat'); let tabDist = document.getElementById('navTabDist'); let inputPrecio = document.getElementById('inputPrecioM2'); let bloquePrecio = document.getElementById('bloquePrecioM2');
    if(rol === 'cliente') {
        badge.innerText = "CLIENTE"; badge.className = "rol-badge bg-primary text-white"; tabMat.style.display = 'none'; tabDist.style.display = 'none'; inputPrecio.setAttribute('readonly', true); bloquePrecio.style.display = 'none';
    } else if(rol === 'admin') {
        badge.innerText = "ADMINISTRADOR"; badge.className = "rol-badge bg-warning text-dark"; tabMat.style.display = 'block'; tabDist.style.display = 'none'; inputPrecio.removeAttribute('readonly'); bloquePrecio.style.display = 'flex';
    } else if(rol === 'programador') {
        badge.innerText = "PROGRAMADOR"; badge.className = "rol-badge bg-danger text-white"; tabMat.style.display = 'block'; tabDist.style.display = 'block'; inputPrecio.removeAttribute('readonly'); bloquePrecio.style.display = 'flex';
    }
}

// ==========================================
// 2. MOTOR CAD, INGENIERÍA Y FINANZAS
// ==========================================
let inventario = { perimetrales: "Ángulo Perim.", principales: "T Principal", secundarias: "T Secundaria", terciarias: "T Terciaria", baldosas: "Baldosas (61x61)", clavos: "Clavos/Fulminantes", alambre: "Alambre #12" };
let compras = {}; let gridForzadoHorizontal = null; let lucesArray = []; let mostrarFondo = false; let vigasArray = []; 
let canvasScale = 1; let canvasOffsetX = 0; let canvasOffsetY = 0; let gridOpt = null; let objetoEditando = null; 
let preciosBase = { perim: 4.0, main: 7.3, sec: 2.2, ter: 1.2, bald: 3.4, clav: 20.0, alam: 8.0 };

let catalogoLuces = [
    { id: 1, nombre: "Dicroico Redondo", size: 15, isSquare: false, watts: "12W", marca: "Genérico", precio: 15.00 },
    { id: 2, nombre: "Plafón Redondo", size: 30, isSquare: false, watts: "24W", marca: "Genérico", precio: 35.00 },
    { id: 3, nombre: "Panel Cuadrado", size: 61, isSquare: true, watts: "48W", marca: "Premium", precio: 80.00 }
];

document.getElementById('canvasContainer').addEventListener('wheel', function(e) {
    e.preventDefault(); if(e.deltaY < 0) { escalaZoomActual += 0.1; } else { escalaZoomActual -= 0.1; } 
    if(escalaZoomActual < 0.5) escalaZoomActual = 0.5; if(escalaZoomActual > 3.0) escalaZoomActual = 3.0;
    document.getElementById('planoCanvas').style.transform = `scale(${escalaZoomActual})`;
}, { passive: false });
let escalaZoomActual = 1;

function mostrarAdvertencia(mensaje) {
    let toast = document.getElementById('toastAdvertencia'); toast.innerText = mensaje; toast.style.display = 'block';
    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; }, 500); }, 3000);
}

function renderizarCatalogo() {
    let html = `<h6 class="text-secondary fw-bold border-bottom pb-2">💡 Accesorios <span class="small text-muted">(Arrastra al plano)</span></h6>`;
    catalogoLuces.forEach(l => {
        let isBig = parseFloat(l.size) >= 30;
        let iconStr = l.isSquare ? `<div class="drag-icon text-dark" style="background:#ffc107; border:2px solid #333;">💡</div>` : `<div class="drag-icon bg-warning" style="border-radius:50%; ${isBig?'width:50px; height:50px;':''}">💡</div>`;
        let editAttr = (rolUsuario === 'admin' || rolUsuario === 'programador') ? `ondblclick="abrirEdicionCatalogo(${l.id})"` : ``;
        let editMsg = (rolUsuario === 'admin' || rolUsuario === 'programador') ? `<br><span class="text-primary small">(Doble clic para editar info)</span>` : ``;
        html += `<div class="draggable-item shadow-sm" draggable="true" ondragstart="iniciarArrastre(event, 'luz', ${l.id})" ${editAttr}>${iconStr}<div class="lh-sm"><strong>${l.nombre} (${l.size}cm)</strong><br><span class="text-muted small">${l.marca} - ${l.watts} | <strong class="text-success fs-6">S/ ${l.precio.toFixed(2)}</strong></span>${editMsg}</div></div>`;
    });
    html += `<button onclick="limpiarPlano()" class="btn btn-sm btn-outline-danger w-100 mt-3 fw-bold shadow-sm">🗑️ Limpiar Accesorios del Plano</button>`;
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
    let id = parseInt(document.getElementById('catEditId').value); let index = catalogoLuces.findIndex(l => l.id === id);
    if(index > -1) {
        catalogoLuces[index].nombre = document.getElementById('catEditNombre').value; catalogoLuces[index].size = parseFloat(document.getElementById('catEditSize').value) || 0;
        catalogoLuces[index].precio = parseFloat(document.getElementById('catEditPrecio').value) || 0; catalogoLuces[index].watts = document.getElementById('catEditWatts').value;
        catalogoLuces[index].marca = document.getElementById('catEditMarca').value;
    }
    bootstrap.Modal.getInstance(document.getElementById('modalEdicionCatalogo')).hide(); renderizarCatalogo(); calcularPresupuesto();
}

function iniciarArrastre(e, tipo, id_or_val) { e.dataTransfer.setData('tipo', tipo); e.dataTransfer.setData('idVal', id_or_val); }
function permitirSoltar(e) { e.preventDefault(); }

function soltarObjeto(e) {
    e.preventDefault(); const tipo = e.dataTransfer.getData('tipo'); const canvas = document.getElementById('planoCanvas');
    const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX; const my = (e.clientY - rect.top) * scaleY;
    const wPx = gridOpt.dimLargo * canvasScale; const hPx = gridOpt.dimAncho * canvasScale;

    if (mx < canvasOffsetX || mx > canvasOffsetX + wPx || my < canvasOffsetY || my > canvasOffsetY + hPx) { return mostrarAdvertencia("⚠️ Fuera del ángulo perimetral."); }

    if (tipo === 'luz') {
        const idCat = parseInt(e.dataTransfer.getData('idVal')); const lC = catalogoLuces.find(l => l.id === idCat); if(!lC) return;
        let gS = 0.61 * canvasScale; let tx = Math.floor((mx - canvasOffsetX) / gS); let ty = Math.floor((my - canvasOffsetY) / gS);
        let maxC = Math.ceil(gridOpt.dimLargo / 0.61); let maxR = Math.ceil(gridOpt.dimAncho / 0.61);

        if(tx >= 0 && tx < maxC && ty >= 0 && ty < maxR) {
            if(lucesArray.find(l => l.tileX === tx && l.tileY === ty)) return mostrarAdvertencia("⚠️ Solo un accesorio por baldosa.");
            lucesArray.push({ tileX: tx, tileY: ty, size: lC.size, isSquare: lC.isSquare, precio: lC.precio, watts: lC.watts, marca: lC.marca, nombre: lC.nombre });
        }
    } 
    calcularPresupuesto(); 
}

function limpiarPlano() { lucesArray = []; calcularPresupuesto(); }
function forzarRotacionGrid() { gridForzadoHorizontal = gridForzadoHorizontal === null ? false : !gridForzadoHorizontal; calcularPresupuesto(); }

document.getElementById('planoCanvas').addEventListener('dblclick', function(e) {
    const rect = this.getBoundingClientRect(); const clickX = (e.clientX - rect.left) * (this.width / rect.width); const clickY = (e.clientY - rect.top) * (this.height / rect.height);
    let obj = null; let gS = 0.61 * canvasScale;
    for(let i=0; i<lucesArray.length; i++) {
        let cx = canvasOffsetX + (lucesArray[i].tileX * gS) + (gS / 2); let cy = canvasOffsetY + (lucesArray[i].tileY * gS) + (gS / 2);
        let r = Math.max((lucesArray[i].size / 100 * canvasScale)/2, 20);
        if(Math.sqrt(Math.pow(clickX-cx,2) + Math.pow(clickY-cy,2)) <= r) { obj = { tipo: 'luz', index: i }; break; }
    }
    if(obj) { objetoEditando = obj; new bootstrap.Modal(document.getElementById('modalEdicion')).show(); }
});

function eliminarObjeto() { if(objetoEditando.tipo === 'luz') lucesArray.splice(objetoEditando.index, 1); bootstrap.Modal.getInstance(document.getElementById('modalEdicion')).hide(); objetoEditando = null; calcularPresupuesto(); }

function generarDesglosePerfil(enteros, cortesArr, longPerfilCm) {
    let cantCortes = cortesArr.length; let totalUn = enteros; let html = `<strong>Enteros:</strong> ${enteros} un<br>`;
    if (cantCortes > 0) {
        let tam = cortesArr[0]; let pU = Math.ceil(cantCortes / 2); totalUn += pU;
        html += `<strong>Cortes:</strong> ${cantCortes} de ${tam}cm (${pU} un)<br>`;
        let pU1 = cantCortes % 2 !== 0 ? 1 : 0; let pU2 = Math.floor(cantCortes / 2);
        let mU = longPerfilCm - tam; let mI = longPerfilCm - (tam * 2);
        let det = []; if (pU1 > 0) det.push(`útil: ${mU}cm x ${pU1}un`); if (pU2 > 0 && mI > 0) det.push(`inútil: ${mI}cm x ${pU2}un`);
        if (det.length > 0) html += `<span class="text-muted small">- ${det.join('<br>- ')}</span>`;
    }
    return { html, totalUn };
}

// Variables financieras globales
let costoTotalProyectoSinFlete = 0;

function calcularPresupuesto() {
    const largo = parseFloat(document.getElementById('inputLargo').value) || 0;
    const ancho = parseFloat(document.getElementById('inputAncho').value) || 0;
    const pM2 = parseFloat(document.getElementById('inputPrecioM2').value) || 30;

    if (largo <= 0 || ancho <= 0) return;
    const m2 = largo * ancho; const perimetro = (largo * 2) + (ancho * 2);

    let tLuces = lucesArray.reduce((s, l) => s + (parseFloat(l.precio) || 0), 0);
    costoTotalProyectoSinFlete = (m2 * pM2) + tLuces;
    document.getElementById('totalClienteDisplay').innerText = `S/ ${costoTotalProyectoSinFlete.toFixed(2)}`;

    gridOpt = { dimLargo: largo, dimAncho: ancho, esHorizontal: true };
    if(gridForzadoHorizontal !== null) gridOpt.esHorizontal = gridForzadoHorizontal;

    let conteo = { mEnt:0, mCort:[], sEnt:0, sCort:[], tEnt:0, tCort:[], ptos:0 };
    for(let s = 1.22; s < gridOpt.dimAncho; s += 1.22) { conteo.mEnt += Math.floor(gridOpt.dimLargo / 3.66); let so = Math.round((gridOpt.dimLargo % 3.66) * 100); if(so > 0) conteo.mCort.push(so); conteo.ptos += Math.ceil(gridOpt.dimLargo / 1.22); }
    for(let p = 0.61; p < gridOpt.dimLargo; p += 0.61) { for(let s = 0; s < gridOpt.dimAncho; s += 1.22) { let t = Math.round(Math.min(1.22, gridOpt.dimAncho - s) * 100); if(t === 122) conteo.sEnt++; else if(t > 0) { if(t <= 61) conteo.tCort.push(t); else conteo.sCort.push(t); } } }
    for(let s = 0.61; s < gridOpt.dimAncho; s += 1.22) { for(let p = 0; p < gridOpt.dimLargo; p += 0.61) { let t = Math.round(Math.min(0.61, gridOpt.dimLargo - p) * 100); if(t === 61) conteo.tEnt++; else if(t > 0) conteo.tCort.push(t); } }

    let pCm = Math.round(perimetro * 100); compras.perimetrales = Math.floor(pCm / 305) + (pCm % 305 > 0 ? 1 : 0);
    let rMain = generarDesglosePerfil(conteo.mEnt, conteo.mCort, 366); compras.principales = rMain.totalUn;
    let rSec = generarDesglosePerfil(conteo.sEnt, conteo.sCort, 122); compras.secundarias = rSec.totalUn;
    let rTer = generarDesglosePerfil(conteo.tEnt, conteo.tCort, 61); compras.terciarias = rTer.totalUn;

    let bL = Math.floor(largo / 0.61); let resL = Math.round((largo % 0.61) * 100); let bA = Math.floor(ancho / 0.61); let resA = Math.round((ancho % 0.61) * 100);
    let tBaldNuevas = bL * bA; let l61 = lucesArray.filter(l => l.isSquare && l.size >= 60).length; if(l61 > 0) tBaldNuevas -= l61;
    let txtB = `<strong>Enteros:</strong> ${bL * bA - l61} baldosas<br>`;

    if(resL>0 || resA>0) {
        function procCorteB(tam, cant) { if(cant===0 || tam===0) return 0; let n = 0; let pxB = Math.floor(61/tam); if(cant>0) { n = Math.ceil(cant/pxB); } return n; }
        tBaldNuevas += procCorteB(resL, bA); tBaldNuevas += procCorteB(resA, bL);
        if(resL>0 && resA>0) tBaldNuevas++;
    }
    compras.baldosas = tBaldNuevas < 0 ? 0 : tBaldNuevas;
    compras.clavos = Math.ceil((perimetro * 100) / 35) + conteo.ptos;
    compras.alambreMts = Math.ceil((conteo.ptos * 20) / 100); 

    let html = `
        <tr><td class="fw-bold align-middle">${inventario.perimetrales}</td><td class="text-primary fw-bold text-center align-middle">${compras.perimetrales} un</td><td class="small align-middle">Req ${pCm} cm</td></tr>
        <tr><td class="fw-bold text-success align-middle">⭐ ${inventario.principales}</td><td class="text-primary fw-bold text-center align-middle">${compras.principales} un</td><td class="small align-middle">${rMain.html}</td></tr>
        <tr><td class="fw-bold text-info align-middle">${inventario.secundarias}</td><td class="text-primary fw-bold text-center align-middle">${compras.secundarias} un</td><td class="small align-middle">${rSec.html}</td></tr>
        <tr><td class="fw-bold text-warning align-middle">${inventario.terciarias}</td><td class="text-primary fw-bold text-center align-middle">${compras.terciarias} un</td><td class="small align-middle">${rTer.html}</td></tr>
        <tr><td class="fw-bold text-danger align-middle">🔲 ${inventario.baldosas}</td><td class="text-primary fw-bold text-center align-middle">${compras.baldosas} un</td><td class="small align-middle">${txtB}</td></tr>
    `;
    document.getElementById('tablaResultados').innerHTML = html;

    dibujarPlanoVisual(largo, ancho);
    actualizarCotizadorYDistribucion(m2, pM2, tLuces);
    document.getElementById('areaTrabajo').style.display = 'flex';
}

function dibujarPlanoVisual(largo, ancho) {
    const canvas = document.getElementById('planoCanvas'); const ctx = canvas.getContext('2d');
    canvas.width = document.getElementById('canvasContainer').clientWidth * 1.5; 
    canvas.height = document.getElementById('canvasContainer').clientHeight * 1.5;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let scale = Math.min((canvas.width - 150) / largo, (canvas.height - 150) / ancho);
    canvasScale = scale; let wPx = largo * scale; let hPx = ancho * scale;
    let offX = (canvas.width - wPx) / 2; let offY = (canvas.height - hPx) / 2;
    canvasOffsetX = offX; canvasOffsetY = offY;

    ctx.strokeStyle = "#dc3545"; ctx.fillStyle = "#dc3545"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(offX, offY - 40); ctx.lineTo(offX + wPx, offY - 40); ctx.stroke();
    ctx.font = "bold 18px Arial"; ctx.textAlign = "center"; ctx.fillText(`${largo.toFixed(2)} m`, offX + wPx/2, offY - 45);
    
    ctx.beginPath(); ctx.moveTo(offX - 40, offY); ctx.lineTo(offX - 40, offY + hPx); ctx.stroke();
    ctx.save(); ctx.translate(offX - 45, offY + hPx/2); ctx.rotate(-Math.PI/2); ctx.fillText(`${ancho.toFixed(2)} m`, 0, 0); ctx.restore();

    ctx.fillStyle = "#333"; ctx.font = "bold 12px Arial";
    let pX = gridOpt.esHorizontal ? 0.61 : 1.22; let xA = 0;
    for (let x = pX; x < largo; x += pX) { let px = offX + (x * scale); ctx.beginPath(); ctx.moveTo(px, offY); ctx.lineTo(px, offY - 8); ctx.stroke(); ctx.fillText(Math.round(x * 100), px, offY - 12); xA = x; }
    if (largo - xA > 0.01) { ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round((largo - xA)*100), offX + wPx, offY - 12); }

    ctx.fillStyle = "#333"; let pY = gridOpt.esHorizontal ? 1.22 : 0.61; let yA = 0; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let y = pY; y < ancho; y += pY) { let py = offY + (y * scale); ctx.beginPath(); ctx.moveTo(offX, py); ctx.lineTo(offX - 8, py); ctx.stroke(); ctx.fillText(Math.round(y * 100), offX - 12, py); yA = y; }
    if (ancho - yA > 0.01) { ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round((ancho - yA)*100), offX - 12, offY + hPx); }

    ctx.lineWidth = 3; ctx.strokeStyle = '#000000'; ctx.strokeRect(offX, offY, wPx, hPx);

    if (gridOpt.esHorizontal) {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 2; 
        for (let y = 1.22; y < ancho; y += 1.22) { ctx.beginPath(); ctx.moveTo(offX, offY + (y*scale)); ctx.lineTo(offX + wPx, offY + (y*scale)); ctx.stroke(); }
        for (let x = 0.61; x < largo; x += 0.61) {
            for(let y = 0; y < ancho; y += 1.22) { let tramo = Math.min(1.22, ancho - y); ctx.strokeStyle = (tramo <= 0.61) ? '#fd7e14' : '#007bff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(offX + (x*scale), offY + (y*scale)); ctx.lineTo(offX + (x*scale), offY + ((y+tramo)*scale)); ctx.stroke(); }
        }
        ctx.strokeStyle = '#fd7e14'; 
        for (let y = 0.61; y < ancho; y += 1.22) { for(let x = 0; x < largo; x += 0.61) { let tramo = Math.min(0.61, largo - x); ctx.beginPath(); ctx.moveTo(offX + (x*scale), offY + (y*scale)); ctx.lineTo(offX + ((x+tramo)*scale), offY + (y*scale)); ctx.stroke(); } }
    } else {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 2; 
        for (let x = 1.22; x < largo; x += 1.22) { ctx.beginPath(); ctx.moveTo(offX + (x*scale), offY); ctx.lineTo(offX + (x*scale), offY + hPx); ctx.stroke(); }
        for (let y = 0.61; y < ancho; y += 0.61) {
            for(let x = 0; x < largo; x += 1.22) { let tramo = Math.min(1.22, largo - x); ctx.strokeStyle = (tramo <= 0.61) ? '#fd7e14' : '#007bff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(offX + (x*scale), offY + (y*scale)); ctx.lineTo(offX + ((x+tramo)*scale), offY + (y*scale)); ctx.stroke(); }
        }
        ctx.strokeStyle = '#fd7e14'; 
        for (let x = 0.61; x < largo; x += 1.22) { for(let y = 0; y < ancho; y += 0.61) { let tramo = Math.min(0.61, ancho - y); ctx.beginPath(); ctx.moveTo(offX + (x*scale), offY + (y*scale)); ctx.lineTo(offX + (x*scale), offY + ((y+tramo)*scale)); ctx.stroke(); } }
    }

    lucesArray.forEach((l) => {
        let gS = 0.61 * scale; let cX = offX + (l.tileX * gS) + (gS / 2); let cY = offY + (l.tileY * gS) + (gS / 2); let sPx = (l.size / 100) * scale;
        ctx.fillStyle = l.isSquare ? 'rgba(255,193,7,0.9)' : 'rgba(255,255,255,0.9)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        if(l.isSquare) { ctx.fillRect(cX - sPx/2, cY - sPx/2, sPx, sPx); ctx.strokeRect(cX - sPx/2, cY - sPx/2, sPx, sPx); } 
        else { ctx.beginPath(); ctx.arc(cX, cY, sPx/2, 0, 2*Math.PI); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255, 215, 0, 0.5)"; ctx.beginPath(); ctx.arc(cX, cY, sPx/4, 0, 2*Math.PI); ctx.fill(); }
    });
}

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
        tg += tLuces; document.getElementById('granTotal').innerText = tg.toFixed(2);
        
        let tCl = (m2 * pM2) + tLuces; let pMo = parseFloat(document.getElementById('m_obra') ? document.getElementById('m_obra').value : 5.5); let tMo = m2 * pMo;
        let isTerc = document.getElementById('terc_mo') ? document.getElementById('terc_mo').checked : true;
        let gn = tCl - tg; if(isTerc) gn -= tMo;
        
        let dHtml = `
            <div class="mb-2 d-flex justify-content-between"><span class="small fw-bold">Costo Cliente:</span> <strong class="text-success fs-5">S/ ${tCl.toFixed(2)}</strong></div>
            <div class="mb-2 d-flex justify-content-between bg-light p-2 rounded"><span class="small text-muted">Mano Obra (S/ m²):</span><input type="number" id="m_obra" class="form-control form-control-sm w-25 text-end fw-bold" value="${pMo}" oninput="calcT()"></div>
            <div class="mb-2 d-flex justify-content-between border-bottom pb-1"><span class="small text-muted">Pago Mano Obra:</span> <strong class="text-danger">S/ ${tMo.toFixed(2)}</strong></div>
            <div class="mb-3 d-flex justify-content-between border-bottom pb-1"><span class="small text-muted">Inversión Materiales:</span> <strong class="text-danger">S/ ${tg.toFixed(2)}</strong></div>
            <div class="form-check form-switch mb-4 p-3 bg-light border"><input class="form-check-input ms-0 me-2" type="checkbox" id="terc_mo" onchange="calcT()" ${isTerc?'checked':''}><label class="form-check-label small fw-bold">Contratar Instalador Externo</label></div>
            <div class="alert alert-success d-flex justify-content-between align-items-center shadow-sm"><span class="fw-bold">GANANCIA NETA:</span> <strong class="fs-3 ${gn<0?'text-danger':'text-success'}">S/ ${gn.toFixed(2)}</strong></div>
        `;
        document.getElementById('cuerpoDistribucion').innerHTML = dHtml;
    };
    calcT();
}

// ==========================================
// 4. MÓDULO LOGÍSTICO (MAPAS Y PEDIDOS)
// ==========================================
let map = null;
let marker = null;
let costoTransporteActual = 0;
const shopLocation = [-15.4965, -70.1332]; // Juliaca, Puno (Coordenadas de la tienda)
const precioFletePorKm = 3.00; // S/ 3.00 por Kilómetro

function abrirCheckout() {
    new bootstrap.Modal(document.getElementById('modalCheckout')).show();
    
    // Rellenar datos base del modal
    document.getElementById('chkCostoProyecto').innerText = `S/ ${costoTotalProyectoSinFlete.toFixed(2)}`;
    calcularResumenPago();
}

// Inicializar Leaflet cuando el modal se termina de abrir (Si no, el mapa se bugea)
document.getElementById('modalCheckout').addEventListener('shown.bs.modal', function () {
    if(!map) {
        map = L.map('mapaTransporte').setView(shopLocation, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        // Marcador de la Tienda (Fijo)
        L.marker(shopLocation).addTo(map).bindPopup("<b>Tu Tienda Drywall</b><br>Jr. Tumbes 1112").openPopup();

        // Marcador del Cliente (Arrastrable)
        marker = L.marker([-15.5000, -70.1300], {draggable: true}).addTo(map).bindPopup("Ubicación del Cliente");

        marker.on('dragend', function(e) {
            calcularFlete(marker.getLatLng());
        });
        
        calcularFlete(marker.getLatLng());
    }
    map.invalidateSize();
});

function calcularFlete(clienteLatLng) {
    // Cálculo de distancia lineal (Haversine) provisto por Leaflet en Metros
    let distanciaMetros = map.distance(shopLocation, clienteLatLng);
    let distanciaKm = (distanciaMetros / 1000).toFixed(2);
    
    costoTransporteActual = distanciaKm * precioFletePorKm;
    
    // Mínimo flete de 10 soles para cuadras cercanas
    if(costoTransporteActual < 10 && distanciaKm > 0) costoTransporteActual = 10;
    
    document.getElementById('chkDistanciaTxt').innerText = `${distanciaKm} km`;
    document.getElementById('chkCostoFlete').innerText = `S/ ${costoTransporteActual.toFixed(2)}`;
    
    calcularResumenPago();
}

function calcularResumenPago() {
    let porcentaje = parseInt(document.getElementById('chkTipoPago').value);
    let totalGeneral = costoTotalProyectoSinFlete + costoTransporteActual;
    let montoACobrar = (totalGeneral * porcentaje) / 100;
    
    document.getElementById('chkMontoCobrar').innerText = `S/ ${montoACobrar.toFixed(2)}`;
}

function confirmarPedido() {
    let nombre = document.getElementById('chkNombre').value;
    let celular = document.getElementById('chkCelular').value;
    if(!nombre || !celular) { alert("Por favor, ingrese el nombre y celular del cliente."); return; }

    let porcentaje = parseInt(document.getElementById('chkTipoPago').value);
    let medioPago = document.getElementById('chkMedioPago').value;
    let ubicacion = marker.getLatLng();

    let pedido = {
        cliente: nombre, celular: celular,
        m2: parseFloat(document.getElementById('inputLargo').value) * parseFloat(document.getElementById('inputAncho').value),
        costoProyecto: costoTotalProyectoSinFlete,
        flete: costoTransporteActual,
        totalGeneral: costoTotalProyectoSinFlete + costoTransporteActual,
        porcentajeCobrado: porcentaje,
        montoCobrado: (costoTotalProyectoSinFlete + costoTransporteActual) * (porcentaje/100),
        metodoPago: medioPago,
        estado: 'Pendiente',
        coordenadas: { lat: ubicacion.lat, lng: ubicacion.lng },
        materiales: compras,
        luces: lucesArray,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Guardar en Firebase
    db.collection('pedidos').add(pedido)
    .then((docRef) => {
        alert("✅ ¡Pedido Registrado con Éxito! Código: " + docRef.id);
        bootstrap.Modal.getInstance(document.getElementById('modalCheckout')).hide();
        // Limpiar
        document.getElementById('chkNombre').value = "";
        document.getElementById('chkCelular').value = "";
    })
    .catch((error) => {
        alert("Error al guardar el pedido: " + error);
    });
}
