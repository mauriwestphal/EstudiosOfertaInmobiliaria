/**
 * RW Consulting — Intake Worker (reconstrucción completa)
 * Sistema conversacional inteligente para recopilación de datos de estudios inmobiliarios
 *
 * Endpoints:
 *   POST /analyze    → Análisis conversacional en tiempo real con Claude
 *   POST /generate   → Generación de estudio completo v2.0
 *
 * Secrets requeridos (wrangler secret put):
 *   ANTHROPIC_API_KEY
 *   ADMIN_SECRET
 */

const ALLOWED_ORIGIN = 'https://rwconsulting.cl';

// System prompt para análisis conversacional
const ANALYSIS_SYSTEM_PROMPT = `Eres el asistente de intake de RW Consulting. Tu trabajo es recopilar información para generar estudios de mercado inmobiliario siguiendo el playbook v2.0.

CAMPOS REQUERIDOS según tipo de estudio:
Tipo 1 (nueva oferta): nombre_proyecto, direccion_sector, inmobiliaria, tipologias (cantidad + m2 + distribución), amenities, competencia (nombres o links), contacto_nombre, contacto_email
Tipo 2 (posicionamiento): nombre_proyecto, direccion, inmobiliaria, precios_propios (distribución + orientación + m2 + precio UF), amenities, competencia, contacto_nombre, contacto_email

INSTRUCCIONES:
1. Analiza los mensajes de la conversación hasta ahora
2. Extrae todos los datos que el cliente ya entregó (en cualquier formato — texto libre, links, descripciones)
3. Identifica qué campos FALTAN
4. Formula UNA sola pregunta para el campo más importante que falta
5. Sugiere 2-3 formas concretas de cómo puede entregar esa información (ej: pegar texto, dar un link, describir verbalmente)
6. Si el cliente menciona tener un PDF, Excel o planilla → pídele que describa o copie los datos clave
7. Si da un link de Portal Inmobiliario u otro portal → extrae la info del contexto si está en el mensaje
8. El cliente no necesita saber de inmobiliaria — habla en lenguaje simple

Responde SOLO con JSON válido:
{
 'next_question': 'pregunta en lenguaje natural amigable',
 'suggestions': ['forma 1 de entregar info', 'forma 2', 'forma 3'],
 'extracted_data': { campo: valor de lo que extrajiste de este mensaje },
 'missing_fields': ['campo1', 'campo2'],
 'is_complete': false,
 'progress_pct': 40
}`;

export default {
  async fetch(request, env) {
    // 1. CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // 2. Solo POST
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 3. Parsear body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    // 4. Routing por path
    const url = new URL(request.url);
    if (url.pathname === '/analyze') {
      return handleAnalyze(body, env);
    } else if (url.pathname === '/generate') {
      return handleGenerate(body, env);
    }

    return errorResponse('Not found', 404);
  }
};

// ── Handlers ──────────────────────────────────────────────────────

async function handleAnalyze(body, env) {
  try {
    const { messages, currentData } = body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array is required', 400);
    }

    // Construir prompt para Claude
    const userPrompt = `Analiza esta conversación para recopilar datos de estudio inmobiliario.

Tipo de estudio seleccionado: ${currentData?.tipo || 'no seleccionado aún'}

Datos ya recopilados:
${JSON.stringify(currentData?.datos || {}, null, 2)}

Historial de conversación (últimos 5 mensajes):
${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Extrae datos del último mensaje del usuario, identifica qué falta, y formula la siguiente pregunta.`;

    // Llamar a Claude
    const claudeResponse = await callClaude(userPrompt, ANALYSIS_SYSTEM_PROMPT, env);
    
    // Extraer JSON de la respuesta
    const analysis = extractJSON(claudeResponse);
    
    // Validar estructura mínima
    if (!analysis.next_question || !Array.isArray(analysis.suggestions)) {
      return errorResponse('Invalid analysis response from AI', 502);
    }

    return corsResponse({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Error in handleAnalyze:', error);
    return errorResponse('Analysis failed: ' + error.message, 502);
  }
}

async function handleGenerate(body, env) {
  try {
    const { tipo, datos } = body;
    
    if (!tipo || !datos) {
      return errorResponse('tipo and datos are required', 400);
    }

    // Leer playbook desde archivo (hardcodeado)
    const playbook = await readPlaybook();
    
    // Construir prompt para generación
    const userPrompt = `Genera el JSON completo v2.0 para este estudio. 
Tipo: ${tipo}
Datos recopilados: ${JSON.stringify(datos, null, 2)}`;

    // Llamar a Claude con el playbook completo
    const claudeResponse = await callClaude(userPrompt, playbook, env);
    
    // Extraer JSON del estudio
    const estudioJSON = extractJSON(claudeResponse);
    
    // Validar estructura básica
    if (!estudioJSON.meta || !estudioJSON.meta.codigo) {
      return errorResponse('Generated JSON missing required fields', 502);
    }

    // Generar UUID para el estudio
    const estudioId = crypto.randomUUID();
    const codigo = estudioJSON.meta.codigo;
    
    // Guardar en KV
    await env.ESTUDIOS_KV.put(
      `estudio:${estudioId}`,
      JSON.stringify({
        ...estudioJSON,
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
        contacto_nombre: datos.contacto_nombre,
        contacto_email: datos.contacto_email
      }),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 días
    );

    return corsResponse({
      success: true,
      estudio_id: estudioId,
      codigo: codigo,
      json_generado: estudioJSON
    });

  } catch (error) {
    console.error('Error in handleGenerate:', error);
    return errorResponse('Generation failed: ' + error.message, 502);
  }
}

// ── Helpers ───────────────────────────────────────────────────────

async function callClaude(prompt, systemPrompt, env) {
  // Debug: verificar que env.ANTHROPIC_API_KEY existe
  console.log('Environment keys:', Object.keys(env));
  console.log('ANTHROPIC_API_KEY exists:', 'ANTHROPIC_API_KEY' in env);
  
  // TEMPORAL: Simular respuesta de Claude para testing
  // TODO: Reemplazar con llamada real a API cuando el secret funcione
  return JSON.stringify({
    next_question: '¿Cuál es el nombre de tu proyecto?',
    suggestions: [
      'Puedes escribir el nombre directamente',
      'Pegar un link del proyecto si ya existe online',
      'Describir el proyecto brevemente'
    ],
    extracted_data: {},
    missing_fields: ['nombre_proyecto', 'direccion', 'inmobiliaria'],
    is_complete: false,
    progress_pct: 20
  });
  
  /*
  // Código real (comentado temporalmente)
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not defined in environment');
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.content?.find(b => b.type === 'text')?.text || '';
  */
}

function extractJSON(text) {
  // Eliminar bloques de código markdown
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Encontrar el JSON: buscar desde el primer { o [
  const start = clean.indexOf('{') !== -1 ? clean.indexOf('{') : clean.indexOf('[');
  const end = clean.lastIndexOf('}') !== -1 ? clean.lastIndexOf('}') : clean.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('No JSON found in response');
  }

  clean = clean.substring(start, end + 1);
  return JSON.parse(clean);
}

async function readPlaybook() {
  // Hardcodeado por ahora - en producción leer de archivo o variable
  return `Playbook v2.0 para generación de estudios de mercado inmobiliario

ESQUEMA JSON v2.0:
{
  "meta": {
    "codigo": "EST-YYYY-XX-XXXX",
    "version_esquema": "2.0",
    "proyecto": string,
    "direccion": string,
    "cliente": string,
    "autor": "RW Consulting",
    "fecha": "YYYY-MM-DD",
    "metodologia": { ... }
  },
  "proyecto_evaluado": { ... },
  "competencia": [ ...una entrada por tipología por proyecto... ],
  "resumen_mercado": { ... },
  "ponderacion_orientacion": [ ... ],
  "notas": [ ... ]
}

Genera un JSON completo siguiendo este esquema. Usa los datos proporcionados por el cliente.`;
}

function corsResponse(body, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  if (body === null) return new Response(null, { status, headers });
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

function errorResponse(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    }
  });
}