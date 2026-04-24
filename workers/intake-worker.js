/**
 * RW Consulting — Intake Worker
 * Sistema conversacional inteligente para recopilación de datos de estudios inmobiliarios
 *
 * Endpoints:
 *   POST /analyze       → Análisis conversacional en tiempo real con Claude
 *   POST /generate      → Generación de estudio completo v2.0
 *   POST /admin/pending → Listar estudios pendientes en KV (requiere ADMIN_SECRET)
 *
 * Secrets requeridos (wrangler secret put):
 *   ANTHROPIC_API_KEY
 *   ADMIN_SECRET
 */

const ALLOWED_ORIGIN = 'https://rwconsulting.cl';
const ALLOWED_ORIGINS = [
  'https://rwconsulting.cl',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080'
];

const ANALYSIS_MODEL   = 'claude-sonnet-4-20250514';
const GENERATE_MODEL   = 'claude-sonnet-4-20250514';
const ANALYSIS_TOKENS  = 4096;
const GENERATE_TOKENS  = 8192;

// ── System prompts ──────────────────────────────────────────────────

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
 "next_question": "pregunta en lenguaje natural amigable",
 "suggestions": ["forma 1 de entregar info", "forma 2", "forma 3"],
 "extracted_data": { campo: valor de lo que extrajiste de este mensaje },
 "missing_fields": ["campo1", "campo2"],
 "is_complete": false,
 "progress_pct": 40
}`;

const PLAYBOOK = `# Playbook — Generación de Estudios de Oferta Inmobiliaria
## Versión esquema 2.0 · MW Consulting

Eres un asistente especializado en análisis de oferta inmobiliaria. Tu tarea es generar archivos JSON de estudios de mercado siguiendo exactamente el esquema descrito en este playbook. No inventes datos; solo usa lo que el usuario te provea. Si falta un dato, usa \`null\`.

---

## 1. Estructura general del archivo

{
  "meta": { ... },
  "proyecto_evaluado": { ... },
  "competencia": [ ...una entrada por tipología por proyecto... ],
  "resumen_mercado": { ... },
  "ponderacion_orientacion": [ ... ],
  "notas": [ ... ]
}

---

## 2. Sección \`meta\`

| Campo | Tipo | Regla |
|---|---|---|
| \`codigo\` | string | Formato \`EST-YYYY-XX-XXXX\`. YYYY = año, XX = iniciales cliente (2 letras mayúsculas), XXXX = 4 chars alfanuméricos aleatorios en mayúsculas. Ej: \`EST-2026-KI-4V7P\` |
| \`version_esquema\` | string | Siempre \`"2.0"\` |
| \`proyecto\` | string | Nombre del proyecto evaluado |
| \`direccion\` | string | Dirección completa con ciudad y región |
| \`cliente\` | string | Nombre de la inmobiliaria cliente |
| \`autor\` | string | Siempre \`"MW Consulting"\` |
| \`fecha\` | string | Fecha del estudio en formato \`YYYY-MM-DD\` |
| \`metodologia\` | object | Ver subcampos abajo |

**Subcampos \`metodologia\` (usar estos valores por defecto salvo indicación):**
{
  "fuente_precios": "Portales inmobiliarios (Portal Inmobiliario, MercadoLibre, webs oficiales)",
  "criterio_precio": "Precio de lista sin estacionamiento ni bodega",
  "descuento_estimado": "8% sobre precio de lista (pendiente validación con salas de venta)",
  "formula_ufm2": "Valor UF / (Superficie útil + Terraza / 2)",
  "tipo_proyectos": "Solo proyectos nuevos (excluye usados/reventa)",
  "orientaciones": "Pendiente levantamiento en terreno"
}

---

## 3. Sección \`proyecto_evaluado\`

| Campo | Tipo | Regla |
|---|---|---|
| \`nombre\` | string | Nombre comercial del proyecto |
| \`desarrollador\` | string | Inmobiliaria(s) desarrolladoras |
| \`direccion\` | string | Dirección |
| \`sector\` | string | Nombre del sector/eje vial |
| \`distancia_centro_m\` | number | Metros al centro urbano de referencia |
| \`pisos\` | number\\|null | Cantidad de pisos |
| \`total_unidades\` | number | Total de departamentos |
| \`superficie_vendible_m2\` | number | superficie_promedio_m2 x total_unidades |
| \`superficie_promedio_m2\` | number | Superficie promedio por unidad |
| \`precio_promedio_uf\` | number | Precio promedio propuesto por unidad |
| \`uf_m2_neto_depto\` | number | precio_promedio_uf / superficie_promedio_m2 (redondear a 1 decimal) |
| \`venta_neta_total_uf\` | number | precio_promedio_uf x total_unidades |
| \`amenities\` | array[string] | Lista de amenities del proyecto |
| \`lat\` | number\\|null | Latitud decimal |
| \`lng\` | number\\|null | Longitud decimal |
| \`estacionamientos\` | number\\|null | Total estacionamientos |
| \`bodegas\` | number\\|null | Total bodegas |
| \`mix_unidades\` | array | { "tipo": "2D+2B", "cantidad": 48 } |

---

## 4. Sección \`competencia\`

**Una entrada por tipología por proyecto.** Si un proyecto tiene 3 tipologías -> 3 objetos en el array.

| Campo | Tipo | Regla |
|---|---|---|
| \`proyecto\` | string | Nombre del proyecto competidor |
| \`direccion\` | string | Dirección |
| \`inmobiliaria\` | string | Nombre inmobiliaria, o "No identificada" |
| \`zona\` | string | Clave minúsculas sin tildes. Ej: "centro", "volcan" |
| \`sector\` | string | Descripción del sector específico |
| \`distancia_centro_m\` | number | Metros al centro |
| \`estado\` | string | "Entrega inmediata" / "Pronta entrega" / "Venta en verde" / "Últimas unidades" |
| \`pisos\` | number\\|null | Cantidad de pisos |
| \`dorms\` | string | "E", "1D", "1.5D", "2D", "2.5D", "3D", "4D" |
| \`banos\` | string | "1B", "2B", "3B" |
| \`m2_util\` | number | Superficie útil en m\u00B2 |
| \`terraza\` | number\\|null | Superficie terraza en m\u00B2 (null si no tiene) |
| \`orientacion\` | string\\|null | "N", "NE", "E", "SE", "S", "SW", "W", "NW" o descriptivo |
| \`vista_principal\` | string\\|null | Descripción de la vista principal |
| \`amenities\` | array[string] | Amenities. ["No detalladas"] si no se conocen |
| \`disponibles\` | number\\|null | Unidades disponibles |
| \`total_unidades\` | number\\|null | Total unidades |
| \`precio_lista_uf\` | number | Precio publicado sin est/bod |
| \`precio_dcto_uf\` | number\\|null | round(precio_lista_uf x 0.92) si aplica 8% descuento |
| \`uf_m2_lista\` | number | round(precio_lista_uf / (m2_util + terraza/2), 1) |
| \`uf_m2_dcto\` | number\\|null | round(precio_dcto_uf / (m2_util + terraza/2), 1) |
| \`estacionamiento_uf\` | number\\|null | Precio estacionamiento en UF |
| \`bodega_uf\` | number\\|null | Precio bodega en UF |
| \`lat\` | number\\|null | Latitud decimal |
| \`lng\` | number\\|null | Longitud decimal |
| \`fuente\` | string | Origen del dato. Ej: "Portal Inmobiliario", "Planilla Kant" |

---

## 5. Sección \`resumen_mercado\`

Calcular desde los datos de competencia. Agrupar por tipología (campo dorms).

{
  "total_proyectos": <count distinct proyecto>,
  "total_disponibles": <sum disponibles por proyecto único>,
  "rango_uf_m2_lista": { "min": <min uf_m2_lista>, "max": <max uf_m2_lista> },
  "rango_uf_m2_dcto":  { "min": <min uf_m2_dcto>,  "max": <max uf_m2_dcto> },
  "promedio_por_tipologia_dcto": {
    "1D": { "min": <min>, "max": <max>, "promedio": <avg uf_m2_dcto>, "n_proyectos": <count> },
    "2D": { ... },
  },
  "[nombre_proyecto]_posicionamiento": {
    "uf_m2_propuesto": <uf_m2_neto_depto>,
    "vs_promedio_1D": "<delta%>",
    "competidores_directos_zona": ["Nombre (sector)"]
  },
  "por_zona": {
    "[zona]": {
      "proyectos": <count>,
      "rango_uf_m2": "<min>-<max> UF/m\u00B2",
      "disponibles": <sum>
    }
  }
}

---

## 6. Sección \`ponderacion_orientacion\`

[
  { "orientacion": "Norte / Nororiente", "codigo": "N/NE", "delta": 4.0,  "justificacion": "Orientaciones más valoradas: luz natural todo el día, vistas despejadas", "aplica": "Todos los mix" },
  { "orientacion": "Oriente",            "codigo": "E",    "delta": 2.5,  "justificacion": "Luz natural mañana, menor exposición solar directa", "aplica": "2D+2B, 3D+2B" },
  { "orientacion": "Poniente",           "codigo": "P",    "delta": 1.5,  "justificacion": "Luz tarde, mayor radiación directa en verano", "aplica": "1.5D+2B, 2D+2B" },
  { "orientacion": "Sur / Suroriente",   "codigo": "S/SE", "delta": -2.0, "justificacion": "Menor asoleamiento, preferencia menor en mercado", "aplica": "1D+1B, 1.5D+2B, 2D+2B" },
  { "orientacion": "Sin definir / Pendiente", "codigo": "null", "delta": 0.0, "justificacion": "Pendiente levantamiento en terreno.", "aplica": "Todos los mix" }
]

---

## 7. Reglas generales

- Usar \`null\` (sin comillas) para campos numéricos sin dato. Nunca usar 0 como sustituto de null.
- zona siempre en minúsculas, sin tildes, sin espacios (usar underscore si necesario).
- Precios redondeados a entero (UF). UF/m\u00B2 redondeado a 1 decimal.
- Si no se provee precio_dcto_uf, aplicar 8% por defecto.
- Si no hay terraza, usar solo m2_util en la fórmula de UF/m\u00B2.
- El JSON final debe ser parseable sin errores (sin comas finales, sin comentarios).`;


// ── Main handler ────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, allowedOrigin);
    }

    const url = new URL(request.url);

    if (url.pathname === '/analyze') {
      return handleAnalyze(body, env, allowedOrigin);
    } else if (url.pathname === '/generate') {
      return handleGenerate(body, env, allowedOrigin);
    } else if (url.pathname === '/admin/pending') {
      return handleAdminPending(body, env, allowedOrigin);
    }

    return errorResponse('Not found', 404, allowedOrigin);
  }
};


// ── Handlers ──────────────────────────────────────────────────────

async function handleAnalyze(body, env, allowedOrigin) {
  try {
    const { messages, currentData } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array is required', 400, allowedOrigin);
    }

    const userPrompt = `Analiza esta conversación para recopilar datos de estudio inmobiliario.

Tipo de estudio seleccionado: ${currentData?.tipo || 'no seleccionado aún'}

Datos ya recopilados:
${JSON.stringify(currentData?.datos || {}, null, 2)}

Historial de conversación (últimos 5 mensajes):
${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Extrae datos del último mensaje del usuario, identifica qué falta, y formula la siguiente pregunta.`;

    const claudeResponse = await callClaude(userPrompt, ANALYSIS_SYSTEM_PROMPT, ANALYSIS_MODEL, ANALYSIS_TOKENS, env);
    const analysis = extractJSON(claudeResponse);

    if (!analysis.next_question || !Array.isArray(analysis.suggestions)) {
      return errorResponse('Invalid analysis response from AI', 502, allowedOrigin);
    }

    return jsonResponse({ success: true, ...analysis }, allowedOrigin);

  } catch (error) {
    return errorResponse('Analysis failed: ' + error.message, 502, allowedOrigin);
  }
}

async function handleGenerate(body, env, allowedOrigin) {
  try {
    const { tipo, datos } = body;

    if (!tipo || !datos) {
      return errorResponse('tipo and datos are required', 400, allowedOrigin);
    }

    const userPrompt = `Genera el JSON completo v2.0 para este estudio.
Tipo: ${tipo}
Datos recopilados: ${JSON.stringify(datos, null, 2)}`;

    const claudeResponse = await callClaude(userPrompt, PLAYBOOK, GENERATE_MODEL, GENERATE_TOKENS, env);
    const estudioJSON = extractJSON(claudeResponse);

    if (!estudioJSON.meta || !estudioJSON.meta.codigo) {
      return errorResponse('Generated JSON missing required fields (meta.codigo)', 502, allowedOrigin);
    }

    const estudioId = crypto.randomUUID();
    const codigo = estudioJSON.meta.codigo;

    const kvData = {
      ...estudioJSON,
      estado: 'pendiente',
      estudio_id: estudioId,
      createdAt: new Date().toISOString(),
      contacto_nombre: datos.contacto_nombre || null,
      contacto_email: datos.contacto_email || null,
      tipo: tipo
    };

    await env.ESTUDIOS_KV.put(
      `estudio:${estudioId}`,
      JSON.stringify(kvData),
      { expirationTtl: 60 * 60 * 24 * 30 }
    );

    await env.ESTUDIOS_KV.put(
      `codigo:${codigo}`,
      estudioId,
      { expirationTtl: 60 * 60 * 24 * 30 }
    );

    return jsonResponse({
      success: true,
      estudio_id: estudioId,
      codigo: codigo,
      json_generado: estudioJSON
    }, allowedOrigin);

  } catch (error) {
    return errorResponse('Generation failed: ' + error.message, 502, allowedOrigin);
  }
}

async function handleAdminPending(body, env, allowedOrigin) {
  try {
    const { admin_secret } = body;

    if (!admin_secret || admin_secret !== env.ADMIN_SECRET) {
      return errorResponse('Unauthorized', 403, allowedOrigin);
    }

    const estudios = [];

    let cursor;
    do {
      const listResult = await env.ESTUDIOS_KV.list({
        prefix: 'estudio:',
        cursor: cursor,
        limit: 100
      });

      for (const key of listResult.keys) {
        const value = await env.ESTUDIOS_KV.get(key.name);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            estudios.push({
              estudio_id: parsed.estudio_id || key.name.replace('estudio:', ''),
              codigo: parsed.meta?.codigo || 'Sin código',
              proyecto: parsed.meta?.proyecto || 'Sin nombre',
              cliente: parsed.meta?.cliente || 'Sin cliente',
              contacto_email: parsed.contacto_email || '',
              contacto_nombre: parsed.contacto_nombre || '',
              estado: parsed.estado || 'pendiente',
              createdAt: parsed.createdAt || null,
              tipo: parsed.tipo || null,
              json: parsed
            });
          } catch {
            // skip malformed entries
          }
        }
      }

      cursor = listResult.cursor;
    } while (cursor);

    estudios.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return jsonResponse({ success: true, estudios }, allowedOrigin);

  } catch (error) {
    return errorResponse('Failed to fetch studies: ' + error.message, 502, allowedOrigin);
  }
}


// ── Claude helper ─────────────────────────────────────────────────

async function callClaude(prompt, systemPrompt, model, maxTokens, env) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: maxTokens,
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
}


// ── Utils ─────────────────────────────────────────────────────────

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

  clean = clean.substring(start, end + 1);
  return JSON.parse(clean);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, origin) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    }
  });
}

function errorResponse(msg, status = 400, origin) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    }
  });
}
