// Al cargar, recuperar las llaves guardadas en la PC
window.onload = () => {
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';
    document.getElementById('aiKey').value = localStorage.getItem('aiKey') || '';
};

function guardarConfig() {
    localStorage.setItem('ghUser', document.getElementById('ghUser').value.trim());
    localStorage.setItem('ghRepo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('ghToken', document.getElementById('ghToken').value.trim());
    localStorage.setItem('aiKey', document.getElementById('aiKey').value.trim());
    log("✅ Llaves guardadas correctamente en la memoria del navegador.");
}

function log(mensaje) {
    const logs = document.getElementById('logs');
    logs.innerHTML += `<div>> ${mensaje}</div>`;
    logs.scrollTop = logs.scrollHeight;
}

function encodeBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// ------------------------------------------------------------------
// NUEVO: SISTEMA DE AUTODETECCIÓN DE MODELOS DE GOOGLE
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// NUEVO: SISTEMA DE AUTODETECCIÓN DE MODELOS DE GOOGLE (ACTUALIZADO 2026)
// ------------------------------------------------------------------
async function obtenerMejorModelo(aiKey) {
    log("🔍 Preguntándole a Google qué modelos tienes disponibles...");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${aiKey}`);
    const data = await res.json();
    
    if (data.error) throw new Error("Error al leer modelos de Google: " + data.error.message);

    // Filtramos solo los modelos que sirven para generar contenido
    const modelosValidos = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"));
    const nombres = modelosValidos.map(m => m.name.replace("models/", ""));
    
    log(`✅ Tienes ${nombres.length} modelos disponibles en tu cuenta.`);
    
    // Agregamos el modelo 3.6-flash que Google nos exige usar ahora
    if (nombres.includes("gemini-3.6-flash")) return "gemini-3.6-flash";
    if (nombres.includes("gemini-2.5-flash")) return "gemini-2.5-flash";
    if (nombres.includes("gemini-1.5-pro")) return "gemini-1.5-pro";
    if (nombres.includes("gemini-1.5-flash")) return "gemini-1.5-flash";
    if (nombres.includes("gemini-1.0-pro")) return "gemini-1.0-pro";
    
    // Si falla, coge el primer modelo de la lista que Google devuelva
    return nombres[0];
}

// ------------------------------------------------------------------
// MOTOR PRINCIPAL DEL AGENTE IA
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

    try {
        // 1. AUTO-DETECTAR MODELO
        const modeloElegido = await obtenerMejorModelo(aiKey);
        log(`🚀 Modelo seleccionado por la IA: ${modeloElegido}`);

        // 2. LLAMAR A LA IA
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloElegido}:generateContent?key=${aiKey}`;
        
        const promptCompleto = `Eres un Desarrollador Full-Stack Experto creando el sistema Drywall ERP.
        Tu objetivo es generar código fuente completo basado en las instrucciones del usuario.
        DEBES responder ÚNICA y EXCLUSIVAMENTE con un objeto JSON válido.
        
        El JSON debe tener exactamente esta estructura estricta:
        {
            "html": "<!DOCTYPE html><html>...codigo completo de erp.html...</html>",
            "js": "// Codigo completo de erp.js..."
        }

        INSTRUCCIONES DEL CLIENTE PARA CONSTRUIR EL SISTEMA:
        ${prompt}`;

        const payload = { contents: [{ parts: [{ text: promptCompleto }] }] };

        const response = await fetch(url, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error("Rechazo de Google: " + data.error.message);
        if (!data.candidates || data.candidates.length === 0) throw new Error("Google no devolvió código.");

        let respuestaTexto = data.candidates[0].content.parts[0].text;
        
        // 3. EXTRACCIÓN SEGURA DEL JSON (Ignora textos adicionales de la IA)
        const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("La IA no devolvió el formato JSON esperado.");
        
        const codigoGenerado = JSON.parse(jsonMatch[0]);

        log("✅ Código generado por la IA con éxito.");
        log("🌐 Subiendo archivos a tu repositorio GitHub...");

        // 4. SUBIR A GITHUB
        await subirArchivoAGitHub(ghUser, ghRepo, ghToken, 'erp.html', codigoGenerado.html);
        await subirArchivoAGitHub(ghUser, ghRepo, ghToken, 'erp.js', codigoGenerado.js);

        log("🚀 ¡ÉXITO TOTAL! Los archivos erp.html y erp.js han sido creados.");
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

    try {
        const getRes = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
        if(getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch(e) {}

    const body = {
        message: `🤖 Auto-Developer actualizó ${nombreArchivo}`,
        content: encodeBase64(contenido)
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if(!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(`GitHub rechazó ${nombreArchivo}: ${errorData.message}`);
    }
}
