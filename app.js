// Al cargar, recuperar las llaves guardadas en la PC
window.onload = () => {
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';
    document.getElementById('aiKey').value = localStorage.getItem('aiKey') || '';
};

function guardarConfig() {
    localStorage.setItem('ghUser', document.getElementById('ghUser').value);
    localStorage.setItem('ghRepo', document.getElementById('ghRepo').value);
    localStorage.setItem('ghToken', document.getElementById('ghToken').value);
    localStorage.setItem('aiKey', document.getElementById('aiKey').value);
    log("✅ Llaves guardadas correctamente en la memoria del navegador.");
}

function log(mensaje) {
    const logs = document.getElementById('logs');
    logs.innerHTML += `<div>> ${mensaje}</div>`;
    logs.scrollTop = logs.scrollHeight;
}

// Convertir texto a Base64 compatible con GitHub (Caracteres latinos)
function encodeBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// ------------------------------------------------------------------
// MOTOR PRINCIPAL DEL AGENTE IA
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// MOTOR PRINCIPAL DEL AGENTE IA (VERSIÓN MEJORADA CON DETECTOR DE ERRORES)
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// MOTOR PRINCIPAL DEL AGENTE IA (VERSIÓN UNIVERSAL GEMINI-PRO 1.0)
// ------------------------------------------------------------------
async function ejecutarAgente() {
    const prompt = document.getElementById('promptIA').value;
    const aiKey = document.getElementById('aiKey').value.trim();
    const ghUser = document.getElementById('ghUser').value.trim();
    const ghRepo = document.getElementById('ghRepo').value.trim();
    const ghToken = document.getElementById('ghToken').value.trim();

    if(!prompt || !aiKey || !ghToken) return log("❌ Error: Faltan llaves o el prompt está vacío.");

    document.getElementById('btnGenerar').disabled = true;
    document.getElementById('btnGenerar').innerText = "⏳ Pensando y Escribiendo Código...";
    log("🧠 Conectando con Gemini 1.0 Pro (Versión Universal)...");

    try {
        // 1. LLAMAR A LA IA (GEMINI 1.0 PRO)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${aiKey}`;
        
        // Unificamos las instrucciones para máxima compatibilidad
        const promptCompleto = `Eres un Desarrollador Full-Stack Experto creando el sistema Drywall ERP.
        Tu objetivo es generar código fuente completo basado en las instrucciones del usuario.
        DEBES responder ÚNICA y EXCLUSIVAMENTE con un objeto JSON válido. NO uses Markdown, no uses backticks (\`\`\`), no pongas texto antes ni después.
        
        El JSON debe tener exactamente esta estructura estricta:
        {
            "html": "<!DOCTYPE html><html>...codigo completo de erp.html...</html>",
            "js": "// Codigo completo de erp.js..."
        }

        AQUÍ ESTÁN LAS INSTRUCCIONES DEL CLIENTE PARA CONSTRUIR EL SISTEMA:
        ${prompt}`;

        const payload = {
            contents: [{ parts: [{ text: promptCompleto }] }]
        };

        const response = await fetch(url, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        
        const data = await response.json();
        
        // Detector de errores
        if (data.error) throw new Error("Rechazo de Google: " + data.error.message);
        if (!data.candidates || data.candidates.length === 0) throw new Error("Google no devolvió código.");

        // Extraer la respuesta
        let respuestaTexto = data.candidates[0].content.parts[0].text;
        
        // FILTRO LIMPIADOR: Por si la IA manda ```json ... ``` por error
        respuestaTexto = respuestaTexto.replace(/```json/g, "").replace(/```html/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();

        const codigoGenerado = JSON.parse(respuestaTexto);

        log("✅ Código generado por la IA con éxito.");
        log("🌐 Conectando con GitHub para subir archivos...");

        // 2. SUBIR A GITHUB
        await subirArchivoAGitHub(ghUser, ghRepo, ghToken, 'erp.html', codigoGenerado.html);
        await subirArchivoAGitHub(ghUser, ghRepo, ghToken, 'erp.js', codigoGenerado.js);

        log("🚀 ¡ÉXITO TOTAL! Los archivos erp.html y erp.js han sido creados en GitHub.");
        log("👉 Vercel está compilando. En 30 segundos visita: tu-pagina.vercel.app/erp.html");

    } catch (error) {
        log(`❌ ERROR CRÍTICO: ${error.message}`);
        console.error(error);
    }

    document.getElementById('btnGenerar').disabled = false;
    document.getElementById('btnGenerar').innerText = "🚀 Generar y Subir a GitHub";
}

// ------------------------------------------------------------------
// CONEXIÓN CON LA API DE GITHUB
// ------------------------------------------------------------------
async function subirArchivoAGitHub(propietario, repositorio, token, nombreArchivo, contenido) {
    const url = `https://api.github.com/repos/${propietario}/${repositorio}/contents/${nombreArchivo}`;
    let sha = null;

    // A) Verificar si el archivo ya existe para obtener su SHA (Requisito de GitHub para sobreescribir)
    log(`Buscando si ${nombreArchivo} ya existe...`);
    try {
        const getRes = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
        if(getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
            log(`${nombreArchivo} encontrado. Sobreescribiendo...`);
        } else {
            log(`${nombreArchivo} es nuevo. Creando archivo...`);
        }
    } catch(e) {}

    // B) Subir el archivo
    const body = {
        message: `🤖 Auto-Developer actualizó ${nombreArchivo}`,
        content: encodeBase64(contenido)
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if(!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(`GitHub rechazó la subida de ${nombreArchivo}: ${errorData.message}`);
    }
}
