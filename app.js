let inventario = {
    perimetrales: "Ángulo Perimetral (3.05 m)",
    principales:  "T Principal (3.66 m)",
    secundarias:  "T Secundaria (1.22 m)",
    terciarias:   "T Terciaria (0.61 m)",
    baldosas:     "Baldosas (61x61 cm)",
    clavos:       "Clavos y Fulminantes",
    alambre:      "Alambre Galv. #12"
};

// Variable Global para guardar las compras redondeadas para el Cotizador
let compras = {}; 
let escalaZoomActual = 1;

function zoomPlano(incremento) {
    escalaZoomActual += incremento;
    if(escalaZoomActual < 0.5) escalaZoomActual = 0.5;
    if(escalaZoomActual > 3.0) escalaZoomActual = 3.0;
    document.getElementById('planoCanvas').style.transform = `scale(${escalaZoomActual})`;
}

function resetZoom() {
    escalaZoomActual = 1;
    document.getElementById('planoCanvas').style.transform = `scale(1)`;
}

// Generador de textos para perfilería (T)
function generarDesglosePerfil(enteros, cortesArr, longPerfilCm) {
    let cantCortes = cortesArr.length;
    let totalUn = enteros;
    let html = `<strong>Enteros:</strong> ${enteros} un<br>`;

    if (cantCortes > 0) {
        let tamañoCorte = cortesArr[0];
        let perfilesUsados = Math.ceil(cantCortes / 2);
        totalUn += perfilesUsados;
        
        let perfilesUnCorte = cantCortes % 2 !== 0 ? 1 : 0;
        let perfilesDosCortes = Math.floor(cantCortes / 2);
        
        let medUtil = longPerfilCm - tamañoCorte;
        let medInutil = longPerfilCm - (tamañoCorte * 2);

        html += `<strong>Cortes:</strong> ${cantCortes} de ${tamañoCorte}cm (${perfilesUsados} un)`;
        
        let detalles = [];
        if (perfilesUnCorte > 0) detalles.push(`sobrante útil de ${medUtil}cm para ${perfilesUnCorte} un`);
        if (perfilesDosCortes > 0 && medInutil > 0) detalles.push(`sobrante inútil de ${medInutil}cm para ${perfilesDosCortes} un`);
        
        if (detalles.length > 0) html += ` <span class="text-muted small">- ${detalles.join(', ')}</span>`;
    }
    return { html, totalUn };
}

function calcularPresupuesto() {
    resetZoom();
    document.getElementById('seccionCotizador').style.display = 'none'; // Ocultar cotizador al recalcular
    document.getElementById('btnCotizador').style.display = 'inline-block'; 

    const largo = parseFloat(document.getElementById('inputLargo').value);
    const ancho = parseFloat(document.getElementById('inputAncho').value);
    const cmAlambre = parseFloat(document.getElementById('inputAlambrePunto').value);

    if (isNaN(largo) || isNaN(ancho) || largo <= 0 || ancho <= 0 || isNaN(cmAlambre)) return alert("Datos inválidos.");

    const m2 = largo * ancho;
    const perimetro = (largo * 2) + (ancho * 2);

    let simL = { orientacion: "Paralelas al Largo", dimP: largo, dimS: ancho, desp: (Math.round((largo % 3.66) * 100) > 0 ? (366 - Math.round((largo % 3.66) * 100)) * Math.floor(ancho / 1.22) : 0), esHorizontal: true };
    let simA = { orientacion: "Paralelas al Ancho", dimP: ancho, dimS: largo, desp: (Math.round((ancho % 3.66) * 100) > 0 ? (366 - Math.round((ancho % 3.66) * 100)) * Math.floor(largo / 1.22) : 0), esHorizontal: false };
    let opt = simL.desp <= simA.desp ? simL : simA;

    let conteo = { mEnt:0, mCort:[], sEnt:0, sCort:[], tEnt:0, tCort:[], ptosSuspension:0 };

    for(let s = 1.22; s < opt.dimS; s += 1.22) {
        let enteras = Math.floor(opt.dimP / 3.66);
        let sobrante = Math.round((opt.dimP % 3.66) * 100);
        conteo.mEnt += enteras;
        if(sobrante > 0) conteo.mCort.push(sobrante);
        conteo.ptosSuspension += Math.ceil(opt.dimP / 1.22);
    }
    for(let p = 0.61; p < opt.dimP; p += 0.61) {
        for(let s = 0; s < opt.dimS; s += 1.22) {
            let tramo = Math.round(Math.min(1.22, opt.dimS - s) * 100);
            if(tramo === 122) conteo.sEnt++;
            else if(tramo > 0) {
                if(tramo <= 61) conteo.tCort.push(tramo);
                else conteo.sCort.push(tramo);
            }
        }
    }
    for(let s = 0.61; s < opt.dimS; s += 1.22) {
        for(let p = 0; p < opt.dimP; p += 0.61) {
            let tramo = Math.round(Math.min(0.61, opt.dimP - p) * 100);
            if(tramo === 61) conteo.tEnt++;
            else if(tramo > 0) conteo.tCort.push(tramo);
        }
    }

    // --- PROCESAR TEXTOS Y TOTALES EXACTOS ---
    let perimCmTotales = Math.round(perimetro * 100);
    let perimEnteros = Math.floor(perimCmTotales / 305);
    let perimCmRestantes = perimCmTotales % 305;
    compras.perimetrales = perimCmRestantes > 0 ? perimEnteros + 1 : perimEnteros; // Redondeo para compra
    let txtPerim = `<strong>Enteros:</strong> ${perimEnteros} un<br>` + (perimCmRestantes > 0 ? `<strong>Cortes:</strong> 1 de ${perimCmRestantes}cm` : "");
    let stringTotalPerim = perimCmRestantes > 0 ? `${perimEnteros} un y ${perimCmRestantes} cm` : `${perimEnteros} un`;

    let resMain = generarDesglosePerfil(conteo.mEnt, conteo.mCort, 366);
    let resSec = generarDesglosePerfil(conteo.sEnt, conteo.sCort, 122);
    let resTer = generarDesglosePerfil(conteo.tEnt, conteo.tCort, 61);
    
    compras.principales = resMain.totalUn;
    compras.secundarias = resSec.totalUn;
    compras.terciarias = resTer.totalUn;

    // --- ALGORITMO AVANZADO DE BALDOSAS CON "BASURERO DE RECICLAJE" ---
    let baldosasL = Math.floor(largo / 0.61);
    let resL = Math.round((largo % 0.61) * 100);
    let baldosasA = Math.floor(ancho / 0.61);
    let resA = Math.round((ancho % 0.61) * 100);
    let enterasBaldosas = baldosasL * baldosasA;
    let totalBaldosasNuevas = enterasBaldosas;
    
    let scrapBin = []; // Almacena los retazos disponibles
    let txtBaldosas = `<strong>Enteros:</strong> ${enterasBaldosas} baldosas<br>`;

    function procesarCorteBaldosa(tamaño, cantidad, nombre) {
        if(cantidad === 0 || tamaño === 0) return "";
        let recortesReciclados = 0;
        
        // 1. Buscar en el basurero
        for(let i=0; i<scrapBin.length; i++) {
            while(scrapBin[i] >= tamaño && cantidad > 0) {
                scrapBin[i] -= tamaño;
                cantidad--;
                recortesReciclados++;
            }
        }
        
        let txt = `<strong>Corte ${nombre}:</strong> `;
        let prefijo = recortesReciclados > 0 ? `Se usaron los ${recortesReciclados} retazos restantes del anterior corte entonces son ` : "";
        
        // 2. Cortar baldosas nuevas para lo que falta
        let nuevas = 0;
        let piezasPorBaldosa = Math.floor(61/tamaño);
        
        if(cantidad > 0) {
            nuevas = Math.ceil(cantidad / piezasPorBaldosa);
            let recortesEnUltima = cantidad % piezasPorBaldosa;
            if(recortesEnUltima === 0) recortesEnUltima = piezasPorBaldosa;
            
            // Fórmula corregida: 61 - lo que realmente se usó de esa baldosa
            let sobranteUltima = 61 - (recortesEnUltima * tamaño);
            
            // Guardar mermas en el basurero para el siguiente lado
            let remanentePorCorteLleno = 61 % tamaño;
            for(let k=0; k<nuevas-1; k++) {
                if(remanentePorCorteLleno > 0) scrapBin.push(remanentePorCorteLleno);
            }
            if(sobranteUltima > 0) scrapBin.push(sobranteUltima);

            txt += `${prefijo}${cantidad} de ${tamaño}cm (${nuevas} baldosas) - restante 1 retazo de ${sobranteUltima}cm<br>`;
        } else {
            txt += `Se usaron ${recortesReciclados} retazos restantes para cubrir todo este lado (0 baldosas nuevas).<br>`;
        }
        return { txt, nuevas };
    }

    if (resL > 0 || resA > 0) {
        txtBaldosas += `<strong>Cortes:</strong><br>`;
        let procL = procesarCorteBaldosa(resL, baldosasA, "Largo");
        txtBaldosas += procL.txt;
        totalBaldosasNuevas += procL.nuevas;

        let procA = procesarCorteBaldosa(resA, baldosasL, "Ancho");
        txtBaldosas += procA.txt;
        totalBaldosasNuevas += procA.nuevas;

        // Esquina final
        if (resL > 0 && resA > 0) {
            let maxLado = Math.max(resL, resA);
            let cubierta = false;
            for(let i=0; i<scrapBin.length; i++) {
                if(scrapBin[i] >= maxLado) {
                    scrapBin[i] -= maxLado;
                    cubierta = true; break;
                }
            }
            if(cubierta) {
                txtBaldosas += `<strong>Esquina:</strong> 1 de ${resL}x${resA}cm (Cubierta con retazo reciclado)<br>`;
            } else {
                totalBaldosasNuevas += 1;
                let sobranteEsq = 61 - maxLado;
                if(sobranteEsq > 0) scrapBin.push(sobranteEsq);
                txtBaldosas += `<strong>Esquina:</strong> 1 de ${resL}x${resA}cm (1 baldosa) - restante 1 retazo de ${sobranteEsq}cm<br>`;
            }
        }
    }
    compras.baldosas = totalBaldosasNuevas;

    // Fijaciones
    let clavosPerim = Math.ceil((perimetro * 100) / 35);
    compras.clavos = clavosPerim + conteo.ptosSuspension;
    compras.alambreMts = Math.ceil((conteo.ptosSuspension * cmAlambre) / 100); // Guardado en metros redondeado

    // --- RENDERIZAR TABLA CON 3 COLUMNAS EXACTAS ---
    let html = `
        <tr>
            <td class="fw-bold align-middle">${inventario.perimetrales}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${stringTotalPerim}</td>
            <td class="small align-middle">${txtPerim}</td>
        </tr>
        <tr>
            <td class="fw-bold text-success align-middle">⭐ ${inventario.principales}<br><span class="small text-muted fw-normal">${opt.orientacion}</span></td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${resMain.totalUn} un</td>
            <td class="small align-middle">${resMain.html}</td>
        </tr>
        <tr>
            <td class="fw-bold text-info align-middle">${inventario.secundarias}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${resSec.totalUn} un</td>
            <td class="small align-middle">${resSec.html}</td>
        </tr>
        <tr>
            <td class="fw-bold text-warning align-middle">${inventario.terciarias}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${resTer.totalUn} un</td>
            <td class="small align-middle">${resTer.html}</td>
        </tr>
        <tr>
            <td class="fw-bold text-danger align-middle">🔲 ${inventario.baldosas}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${totalBaldosasNuevas} un</td>
            <td class="small align-middle">${txtBaldosas}</td>
        </tr>
        <tr class="table-light">
            <td class="fw-bold align-middle">${inventario.clavos}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${compras.clavos} pares</td>
            <td class="small align-middle">Fijación c/35cm + Cuelgues</td>
        </tr>
        <tr class="table-light">
            <td class="fw-bold align-middle">${inventario.alambre}</td>
            <td class="text-primary fw-bold fs-5 text-center align-middle">${compras.alambreMts} mts</td>
            <td class="small align-middle">Puntos de cuelgue a ${cmAlambre}cm c/u</td>
        </tr>
    `;

    document.getElementById('txtMetraje').innerText = `${m2.toFixed(2)} m² (Perímetro: ${perimetro.toFixed(2)} m)`;
    document.getElementById('tablaResultados').innerHTML = html;
    document.getElementById('seccionResultados').style.display = 'flex';

    dibujarPlanoVisual(largo, ancho, opt);
}

function dibujarPlanoVisual(largo, ancho, opt) {
    const canvas = document.getElementById('planoCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 150;
    const maxW = canvas.width - (padding * 2);
    const maxH = canvas.height - (padding * 2);
    let escalaX = maxW / largo;
    let escalaY = maxH / ancho;
    let escala = Math.min(escalaX, escalaY); 

    let wPx = largo * escala;
    let hPx = ancho * escala;
    let offsetX = (canvas.width - wPx) / 2;
    let offsetY = (canvas.height - hPx) / 2;

    // Cotas Acumulativas Internas
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Arial";
    let pasoX = opt.esHorizontal ? 0.61 : 1.22;
    let xAcum = 0;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    for (let x = pasoX; x < largo; x += pasoX) {
        let px = offsetX + (x * escala);
        ctx.beginPath(); ctx.moveTo(px, offsetY); ctx.lineTo(px, offsetY - 10); ctx.stroke();
        ctx.fillText(Math.round(x * 100), px, offsetY - 15);
        xAcum = x;
    }
    let cutX = largo - xAcum;
    if (cutX > 0.01) {
        let px = offsetX + wPx;
        ctx.beginPath(); ctx.moveTo(px, offsetY); ctx.lineTo(px, offsetY - 10); ctx.stroke();
        ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round(cutX * 100), px, offsetY - 15);
    }

    ctx.fillStyle = "#333";
    let pasoY = opt.esHorizontal ? 1.22 : 0.61;
    let yAcum = 0;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let y = pasoY; y < ancho; y += pasoY) {
        let py = offsetY + (y * escala);
        ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX - 10, py); ctx.stroke();
        ctx.fillText(Math.round(y * 100), offsetX - 15, py);
        yAcum = y;
    }
    let cutY = ancho - yAcum;
    if (cutY > 0.01) {
        let py = offsetY + hPx;
        ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX - 10, py); ctx.stroke();
        ctx.fillStyle = "#dc3545"; ctx.fillText(Math.round(cutY * 100), offsetX - 15, py);
    }

    // Cuadrícula y Cotas Externas se mantienen iguales...
    ctx.lineWidth = 6; ctx.strokeStyle = '#000000';
    ctx.strokeRect(offsetX, offsetY, wPx, hPx);

    if (opt.esHorizontal) {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 5;
        for (let y = 1.22; y < ancho; y += 1.22) { ctx.beginPath(); ctx.moveTo(offsetX, offsetY + (y * escala)); ctx.lineTo(offsetX + wPx, offsetY + (y * escala)); ctx.stroke(); }
        for (let x = 0.61; x < largo; x += 0.61) {
            for(let y = 0; y < ancho; y += 1.22) {
                let tramo = Math.min(1.22, ancho - y);
                ctx.strokeStyle = (tramo <= 0.61 && tramo > 0) ? '#fd7e14' : '#007bff';
                ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(offsetX + (x * escala), offsetY + (y * escala)); ctx.lineTo(offsetX + (x * escala), offsetY + ((y+tramo) * escala)); ctx.stroke();
            }
        }
        ctx.strokeStyle = '#fd7e14'; ctx.lineWidth = 3;
        for (let y = 0.61; y < ancho; y += 1.22) {
            for(let x = 0; x < largo; x += 0.61) {
                let tramo = Math.min(0.61, largo - x);
                ctx.beginPath(); ctx.moveTo(offsetX + (x * escala), offsetY + (y * escala)); ctx.lineTo(offsetX + ((x+tramo) * escala), offsetY + (y * escala)); ctx.stroke();
            }
        }
    } else {
        ctx.strokeStyle = '#28a745'; ctx.lineWidth = 5;
        for (let x = 1.22; x < largo; x += 1.22) { ctx.beginPath(); ctx.moveTo(offsetX + (x * escala), offsetY); ctx.lineTo(offsetX + (x * escala), offsetY + hPx); ctx.stroke(); }
        for (let y = 0.61; y < ancho; y += 0.61) {
            for(let x = 0; x < largo; x += 1.22) {
                let tramo = Math.min(1.22, largo - x);
                ctx.strokeStyle = (tramo <= 0.61 && tramo > 0) ? '#fd7e14' : '#007bff';
                ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(offsetX + (x * escala), offsetY + (y * escala)); ctx.lineTo(offsetX + ((x+tramo) * escala), offsetY + (y * escala)); ctx.stroke();
            }
        }
        ctx.strokeStyle = '#fd7e14'; ctx.lineWidth = 3;
        for (let x = 0.61; x < largo; x += 1.22) {
            for(let y = 0; y < ancho; y += 0.61) {
                let tramo = Math.min(0.61, ancho - y);
                ctx.beginPath(); ctx.moveTo(offsetX + (x * escala), offsetY + (y * escala)); ctx.lineTo(offsetX + (x * escala), offsetY + ((y+tramo) * escala)); ctx.stroke();
            }
        }
    }
}

// ==========================================
// MÓDULO DEL COTIZADOR FINANCIERO
// ==========================================
function mostrarCotizador() {
    document.getElementById('seccionCotizador').style.display = 'block';
    document.getElementById('btnCotizador').style.display = 'none';
    
    // Cálculo de Cajas de Clavos/Fulminantes (1 caja = 100 pares, redondeado hacia arriba)
    let cajasClavos = Math.ceil(compras.clavos / 100);

    // Array de items con sus precios por defecto configurados
    let items = [
        { id: 'c_perim', nombre: inventario.perimetrales, cant: compras.perimetrales, und: 'un', precioBase: 4.0 },
        { id: 'c_main', nombre: inventario.principales, cant: compras.principales, und: 'un', precioBase: 7.3 },
        { id: 'c_sec', nombre: inventario.secundarias, cant: compras.secundarias, und: 'un', precioBase: 2.2 },
        { id: 'c_ter', nombre: inventario.terciarias, cant: compras.terciarias, und: 'un', precioBase: 1.2 },
        { id: 'c_bald', nombre: inventario.baldosas, cant: compras.baldosas, und: 'un', precioBase: '' }, // Sin precio por defecto
        { id: 'c_clav', nombre: "Combo Clavos y Fulminantes (Caja x100)", cant: cajasClavos, und: 'cajas', precioBase: 20.0 },
        { id: 'c_alam', nombre: "Alambre Galv. #12 (Metros)", cant: compras.alambreMts, und: 'un', precioBase: 8.0 }
    ];

    let html = '';
    items.forEach(it => {
        // Si hay un precio por defecto, lo colocamos en el input, sino lo dejamos vacío
        let valorPrecio = it.precioBase !== '' ? `value="${it.precioBase}"` : '';
        
        html += `
        <tr>
            <td class="fw-bold">${it.nombre}</td>
            <td class="fw-bold text-primary fs-5">${it.cant} ${it.und}</td>
            <td>
                <input type="number" class="form-control precio-input" id="precio_${it.id}" 
                       oninput="calcularTotalGastos('${it.id}', ${it.cant})" 
                       placeholder="Ej. 15.50" step="0.10" min="0" ${valorPrecio}>
            </td>
            <td class="fw-bold fs-5 text-secondary">S/ <span id="sub_${it.id}">0.00</span></td>
        </tr>`;
    });
    
    document.getElementById('cuerpoCotizador').innerHTML = html;

    // Ejecutar el cálculo automáticamente al mostrar la tabla para sumar los precios por defecto
    items.forEach(it => {
        calcularTotalGastos(it.id, it.cant);
    });
}

function calcularTotalGastos(id, cantidad) {
    let precio = parseFloat(document.getElementById(`precio_${id}`).value) || 0;
    // Se calcula el subtotal y se fija a 2 decimales
    document.getElementById(`sub_${id}`).innerText = (precio * cantidad).toFixed(2);
    
    let totalGeneral = 0;
    document.querySelectorAll('[id^="sub_"]').forEach(el => {
        totalGeneral += parseFloat(el.innerText) || 0;
    });
    // Se actualiza el Gran Total
    document.getElementById('granTotal').innerText = totalGeneral.toFixed(2);
}