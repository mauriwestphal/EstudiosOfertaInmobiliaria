/**
 * RW Consulting — Intake Worker v2.1
 *
 * Endpoints:
 *   POST /analyze    → análisis conversacional en tiempo real con Claude
 *   POST /generate   → generación de JSON estudio completo
 *
 * Secrets (wrangler secret put):
 *   ANTHROPIC_API_KEY   — requerido
 *   ADMIN_WEBHOOK_URL   — opcional: webhook para notificaciones (Slack, Discord, Make, n8n…)
 *
 * KV Bindings:
 *   ESTUDIOS_KV
 */

const ALLOWED_ORIGINS = new Set([
  'https://rwconsulting.cl',
  'https://www.rwconsulting.cl',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:3000',
]);

// ── System prompts ─────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `Eres un asesor senior de mercado inmobiliario de RW Consulting, especializado en estudios de oferta competitiva y estrategia de precios para el mercado residencial chileno.

PERFIL Y TONO:
- Más de 10 años analizando el mercado inmobiliario chileno: comunas, segmentos, tipologías, ciclos de absorción
- Hablás con directores comerciales, gerentes de proyecto e inversionistas — sabés lo que necesitan antes de que lo digan
- Directo y preciso: hacés preguntas que revelan expertise, no formularios genéricos
- Cuando el cliente menciona "un par de tipologías" ya sabés preguntar por orientación, m² y precio objetivo porque sabés que esos factores mueven el precio UF/m² entre 8% y 20%
- Usás "tú" de forma consistente. Profesional pero sin rigidez corporativa
- Nunca repetís información que el cliente ya entregó
- Si el cliente parece desorientado con algún concepto, lo explicás con una analogía breve del mercado

CAMPOS REQUERIDOS según tipo de estudio:
- Tipo 1 (nueva oferta / pricing strategy): nombre_proyecto, direccion_sector, inmobiliaria, tipologias (cantidad + m2 + distribución), amenities, competencia (nombres o links), contacto_nombre, contacto_email
- Tipo 2 (posicionamiento / benchmarking): nombre_proyecto, direccion, inmobiliaria, precios_propios (distribución + orientación + m2 + precio UF), amenities, competencia, contacto_nombre, contacto_email

INSTRUCCIONES OPERATIVAS:
1. Analizá el historial completo — nunca pedís algo que ya fue entregado
2. Extraé todos los datos que el cliente ya dio, en cualquier formato: texto libre, links, descripciones, listas
3. Identificá el campo más crítico que falta e interrogá específicamente por él
4. SIEMPRE pedí contacto_nombre y contacto_email antes de marcar como completo
5. Cuando falte info de competencia vaga ("los proyectos del sector") → pedís nombres o links concretos porque el análisis requiere datos reales, no estimaciones
6. Si el cliente menciona PDF, Excel o planilla → pedís que copie o describa los datos clave directamente en el chat
7. Tus sugerencias suenan a consejo profesional, no a instrucciones de formulario. Ejemplo: "Lo ideal es que incluyas orientación por tipología — en el mercado actual impacta directamente en el precio de lista"
8. is_complete SOLO puede ser true cuando TODOS los campos requeridos están presentes sin excepción

Responde SOLO con JSON válido (comillas dobles, sin comentarios):
{
  "next_question": "pregunta concisa y experta, máximo 3 oraciones",
  "suggestions": ["sugerencia concreta 1", "sugerencia concreta 2", "sugerencia concreta 3"],
  "extracted_data": { "campo": "valor extraído del último mensaje" },
  "missing_fields": ["campo1", "campo2"],
  "is_complete": false,
  "progress_pct": 40
}`;

const GENERATION_SYSTEM_PROMPT = `Eres un analista senior de RW Consulting. Genera un JSON v2.0 completo para un estudio de mercado inmobiliario basado en los datos del cliente.

ESQUEMA OBLIGATORIO v2.0 — genera TODOS los campos, infiere valores razonables cuando falten:
{
  "meta": {
    "codigo": "EST-AAAA-TT-NNNN",
    "version_esquema": "2.0",
    "tipo_estudio": "tipo1 | tipo2",
    "proyecto": "nombre del proyecto",
    "direccion": "dirección completa",
    "cliente": "nombre inmobiliaria",
    "contacto_nombre": "nombre contacto",
    "contacto_email": "email contacto",
    "autor": "RW Consulting",
    "fecha": "YYYY-MM-DD",
    "estado": "pendiente",
    "metodologia": {
      "descripcion": "descripción de la metodología",
      "fuentes": ["Portal Inmobiliario", "recorrido propio", "información cliente"],
      "cobertura_geografica": "radio o descripción del área analizada"
    }
  },
  "proyecto_evaluado": {
    "nombre": "string",
    "inmobiliaria": "string",
    "direccion": "string",
    "tipologias": [
      {
        "tipo": "1D1B | 2D1B | 2D2B | 3D2B | studio | etc",
        "cantidad": 0,
        "m2_min": 0,
        "m2_max": 0,
        "precio_uf_min": 0,
        "precio_uf_max": 0,
        "orientaciones_disponibles": ["Norte", "Sur", "Oriente", "Poniente"]
      }
    ],
    "amenities": ["string"],
    "observaciones": "string"
  },
  "competencia": [
    {
      "proyecto": "string",
      "inmobiliaria": "string",
      "direccion": "string",
      "tipologia": "1D1B | 2D1B | etc",
      "cantidad_unidades": 0,
      "m2_min": 0,
      "m2_max": 0,
      "precio_uf_min": 0,
      "precio_uf_max": 0,
      "precio_uf_m2_prom": 0,
      "estado": "en_venta | en_construccion | terminado | preventa",
      "amenities": ["string"],
      "url_referencia": "string o null"
    }
  ],
  "resumen_mercado": {
    "precio_uf_m2_promedio": 0,
    "precio_uf_m2_min": 0,
    "precio_uf_m2_max": 0,
    "n_proyectos_analizados": 0,
    "n_tipologias_analizadas": 0,
    "tipologia_mas_ofertada": "string",
    "observaciones": "string"
  },
  "recomendacion_precio": [
    {
      "tipologia": "string",
      "precio_uf_sugerido_min": 0,
      "precio_uf_sugerido_max": 0,
      "precio_uf_m2_sugerido": 0,
      "justificacion": "string"
    }
  ],
  "ponderacion_orientacion": [
    {
      "orientacion": "Norte | Sur | Oriente | Poniente",
      "factor": 1.0,
      "descripcion": "descripción del ajuste"
    }
  ],
  "notas": ["string"]
}

REGLAS:
- codigo: EST-AAAA donde AAAA=año actual, TT=T1 o T2, NNNN=4 dígitos random
- Si no tienes datos de competencia específicos, genera 2-3 proyectos referenciales plausibles para el sector. Indica en notas que son referenciales.
- Genera recomendacion_precio para cada tipología del proyecto evaluado
- Responde SOLO con JSON válido, sin texto adicional, sin markdown`;

// ── Main handler ───────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, request);
    }

    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, request);
    }

    const url = new URL(request.url);
    if (url.pathname === '/analyze') {
      return handleAnalyze(body, env, request);
    } else if (url.pathname === '/generate') {
      return handleGenerate(body, env, request);
    }

    return errorResponse('Not found', 404, request);
  }
};

// ── Handlers ──────────────────────────────────────────────────────

async function handleAnalyze(body, env, request) {
  try {
    const { messages, currentData } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array is required', 400, request);
    }

    const userPrompt = `Analiza esta conversación para recopilar datos del estudio inmobiliario.

Tipo de estudio: ${currentData?.tipo || 'no seleccionado aún'}

Datos ya recopilados:
${JSON.stringify(currentData?.datos || {}, null, 2)}

Conversación reciente (últimos 6 mensajes):
${messages.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Extrae datos del último mensaje, identifica campos faltantes y formula la siguiente pregunta.`;

    const claudeResponse = await callClaude(userPrompt, ANALYSIS_SYSTEM_PROMPT, env);
    const analysis = extractJSON(claudeResponse);

    if (!analysis.next_question || !Array.isArray(analysis.suggestions)) {
      return errorResponse('Invalid analysis response from AI', 502, request);
    }

    return corsResponse({ success: true, ...analysis }, 200, request);

  } catch (error) {
    console.error('handleAnalyze error:', error);
    return errorResponse('Analysis failed: ' + error.message, 502, request);
  }
}

async function handleGenerate(body, env, request) {
  try {
    const { tipo, datos } = body;

    if (!tipo || !datos) {
      return errorResponse('tipo and datos are required', 400, request);
    }

    const userPrompt = `Genera el JSON completo v2.0 para este estudio.

Tipo: ${tipo}
Fecha actual: ${new Date().toISOString().split('T')[0]}
Datos del cliente:
${JSON.stringify(datos, null, 2)}`;

    const claudeResponse = await callClaude(userPrompt, GENERATION_SYSTEM_PROMPT, env);
    const estudioJSON = extractJSON(claudeResponse);

    if (!estudioJSON.meta?.codigo) {
      return errorResponse('Generated JSON missing required fields', 502, request);
    }

    const estudioId = crypto.randomUUID();
    const codigo = estudioJSON.meta.codigo;

    await env.ESTUDIOS_KV.put(
      `estudio:${estudioId}`,
      JSON.stringify({
        ...estudioJSON,
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: 60 * 60 * 24 * 90 }
    );

    notifyAdmin(estudioId, codigo, tipo, datos, env).catch(err =>
      console.error('Admin notification failed:', err)
    );

    return corsResponse({ success: true, estudio_id: estudioId, codigo }, 200, request);

  } catch (error) {
    console.error('handleGenerate error:', error);
    return errorResponse('Generation failed: ' + error.message, 502, request);
  }
}

// ── Helpers ───────────────────────────────────────────────────────

async function callClaude(prompt, systemPrompt, env) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.find(b => b.type === 'text')?.text || '';
}

async function notifyAdmin(estudioId, codigo, tipo, datos, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

  const tipoLabel = tipo === 'tipo1' ? 'Tipo 1 — Nueva oferta' : 'Tipo 2 — Posicionamiento';
  const text = [
    `🏢 <b>Nuevo estudio recibido</b>`,
    ``,
    `📋 Código: <code>${codigo}</code>`,
    `🆔 ID: <code>${estudioId}</code>`,
    `🏗 Proyecto: ${datos.nombre_proyecto || '(sin nombre)'}`,
    `📊 Tipo: ${tipoLabel}`,
    `👤 Contacto: ${datos.contacto_nombre || '(sin nombre)'}`,
    `📧 Email: ${datos.contacto_email || '(sin email)'}`,
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}

function extractJSON(text) {
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const start = clean.indexOf('{') !== -1 ? clean.indexOf('{') : clean.indexOf('[');
  const end = clean.lastIndexOf('}') !== -1 ? clean.lastIndexOf('}') : clean.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(clean.substring(start, end + 1));
}

function getAllowedOrigin(request) {
  const origin = request?.headers?.get('Origin') || '';
  return ALLOWED_ORIGINS.has(origin) ? origin : 'https://rwconsulting.cl';
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function corsResponse(body, status = 200, request) {
  const headers = corsHeaders(request);
  if (body === null) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function errorResponse(msg, status = 400, request) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  });
}
