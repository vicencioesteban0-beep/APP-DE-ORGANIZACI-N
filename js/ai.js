(function(window) {
  'use strict';

  const MODEL = 'gemini-1.5-flash';
  const BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/';

  /* ── Llamada base a Gemini ──────────────────────────────── */
  async function _llamar(prompt, opciones = {}) {
    const key = await DB.getConfig('geminiApiKey');
    if (!key) throw new Error('Configura tu API key de Gemini en Configuración → IA.');

    const url  = `${BASE}${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     opciones.temperatura ?? 0.4,
        maxOutputTokens: opciones.maxTokens   ?? 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `Error HTTP ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new Error('Gemini no devolvió texto.');
    return texto.trim();
  }

  /* ── Funciones DI ───────────────────────────────────────── */

  async function mejorarTexto(texto) {
    const prompt = `Eres un experto en Diseño Instruccional. Mejora y estructura el siguiente texto:
- Corrige ortografía, puntuación y gramática
- Organiza las ideas con claridad usando Markdown (encabezados, listas donde corresponda)
- Mantén el contenido y la voz original del autor
- No agregues ni inventes información
- Responde SOLO con el texto mejorado en Markdown, sin explicaciones

TEXTO:
${texto}`;
    return _llamar(prompt, { temperatura: 0.3 });
  }

  async function resumir(texto) {
    const prompt = `Eres un experto en Diseño Instruccional. Genera un resumen ejecutivo del siguiente contenido:
- Máximo 150 palabras
- Usa viñetas para los puntos clave
- Incluye: propósito principal, puntos clave, conclusiones o próximos pasos si los hay
- Responde en Markdown

CONTENIDO:
${texto}`;
    return _llamar(prompt, { temperatura: 0.3, maxTokens: 512 });
  }

  async function generarObjetivos(texto) {
    const prompt = `Eres un experto en Diseño Instruccional con dominio de la Taxonomía de Bloom revisada.
A partir del siguiente contenido, redacta objetivos de aprendizaje:
- Usa verbos de acción observables (ej: identificar, aplicar, analizar, diseñar)
- Indica el nivel de Bloom de cada objetivo: [Recordar] [Comprender] [Aplicar] [Analizar] [Evaluar] [Crear]
- Formato: lista numerada en Markdown
- Mínimo 3, máximo 6 objetivos
- Redacta en infinitivo desde la perspectiva del aprendiz

CONTENIDO:
${texto}`;
    return _llamar(prompt, { temperatura: 0.4, maxTokens: 800 });
  }

  async function mejorarTranscripcion(texto) {
    const prompt = `Eres un experto en Diseño Instruccional. Tienes una transcripción de audio/video en bruto.
Mejórala para que sea legible y útil como material de estudio o referencia:
- Elimina muletillas, repeticiones y texto irrelevante
- Corrige la puntuación y separa las ideas en párrafos
- Si hay conceptos técnicos, mantenlos exactos
- Agrega encabezados Markdown si identificas secciones temáticas
- No inventes contenido ni cambies el significado
- Responde SOLO con la transcripción mejorada en Markdown

TRANSCRIPCIÓN:
${texto}`;
    return _llamar(prompt, { temperatura: 0.2, maxTokens: 3000 });
  }

  async function expandir(texto) {
    const prompt = `Eres un experto en Diseño Instruccional. Expande y desarrolla las siguientes notas breves:
- Desarrolla cada idea con detalle suficiente para ser comprensible
- Agrega contexto, ejemplos o aplicaciones prácticas donde sea relevante
- Mantén el enfoque en Diseño Instruccional y aprendizaje
- Usa Markdown con encabezados y listas estructuradas
- No inventes datos ni cites fuentes que no estén en el texto original

NOTAS:
${texto}`;
    return _llamar(prompt, { temperatura: 0.5, maxTokens: 2000 });
  }

  async function extraerAcciones(texto) {
    const prompt = `Eres un asistente de Diseño Instruccional. Extrae del siguiente texto todas las tareas, compromisos y próximos pasos:
- Lista cada acción con un checkbox Markdown: - [ ] Acción
- Si hay un responsable mencionado, agrégalo: - [ ] Acción _(Responsable)_
- Si hay fecha, agrégala: - [ ] Acción — 15 nov
- Si no hay acciones claras, escribe: "No se identificaron acciones concretas."
- Responde SOLO con la lista, sin explicaciones adicionales

TEXTO:
${texto}`;
    return _llamar(prompt, { temperatura: 0.2, maxTokens: 512 });
  }

  async function generarEvaluacion(texto) {
    const prompt = `Eres un experto en evaluación del aprendizaje. A partir de este contenido, diseña 5 preguntas de evaluación:
- 2 preguntas de comprensión (pueden ser abiertas o de opción múltiple)
- 2 preguntas de aplicación (casos o situaciones)
- 1 pregunta de análisis o evaluación de nivel superior
- Usa Markdown con numeración clara
- Para opción múltiple: agrega 4 alternativas y marca la correcta con **(correcta)**

CONTENIDO:
${texto}`;
    return _llamar(prompt, { temperatura: 0.5, maxTokens: 1500 });
  }

  /* ── Verificar conexión ─────────────────────────────────── */
  async function verificarKey(key) {
    const url  = `${BASE}${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const body = { contents: [{ parts: [{ text: 'Responde solo: OK' }] }] };
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error ${res.status}`);
    }
    return true;
  }

  window.AI = {
    mejorarTexto,
    resumir,
    generarObjetivos,
    mejorarTranscripcion,
    expandir,
    extraerAcciones,
    generarEvaluacion,
    verificarKey,
  };

})(window);
