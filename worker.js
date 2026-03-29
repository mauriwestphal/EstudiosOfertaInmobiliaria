/**
 * MW Consulting — Cloudflare Worker
 * Proxy seguro para API de Anthropic con validación de código de estudio
 *
 * DEPLOY:
 *   1. wrangler secret put ANTHROPIC_API_KEY    ← tu key de Anthropic
 *   2. wrangler secret put VALID_CODES          ← JSON array: ["EST-2026-KI-4V7P","EST-2025-GC-8F3K"]
 *   3. wrangler deploy
 *
 * CORS: ajusta ALLOWED_ORIGIN a tu dominio de producción
 */

const ALLOWED_ORIGIN = '*'; // En producción: 'https://rwconsulting.cl'
const MODEL          = 'claude-sonnet-4-20250514';
const MAX_TOKENS     = 1024;

// Prompt de sistema base — se inyecta antes del contexto JSON
const SYSTEM_BASE = `Eres un asistente especializado en análisis inmobiliario para MW Consulting.
Tu función es responder preguntas sobre el estudio de mercado que te será entregado como contexto JSON.

REGLAS ESTRICTAS:
1. Responde SOLO basándote en los datos del estudio. No uses información externa ni hagas suposiciones fuera del JSON.
2. Si la pregunta no puede responderse con los datos disponibles, dilo claramente: "Ese dato no está en el estudio."
3. Nunca hagas recomendaciones de inversión. Si te preguntan si es buena inversión, di que el estudio entrega datos comparativos pero no constituye asesoría de inversión.
4. Sé conciso. Máximo 3–4 párrafos por respuesta. Usa listas cuando haya múltiples items.
5. Usa el mismo idioma que el usuario (español).
6. Los precios están en UF (Unidades de Fomento chilenas). No conviertas a pesos a menos que te lo pidan.
7. Cuando cites números, sé preciso con los datos del JSON.

DISCLAIMER (incluye en primera respuesta de cada sesión):
"⚠️ Las respuestas son orientativas y se basan exclusivamente en los datos del estudio. No constituyen asesoría de inversión."`;

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age':       '86400',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { codigo, messages, estudioJson } = body;

    // ── Validar código de acceso ──────────────────────────────────
    let validCodes = [];
    try {
      validCodes = JSON.parse(env.VALID_CODES || '[]');
    } catch {
      return errorResponse('Worker misconfigured', 500);
    }

    if (!codigo || !validCodes.includes(codigo)) {
      return errorResponse('Código de acceso no válido', 403);
    }

    // ── Validar payload ───────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages requerido', 400);
    }
    if (!estudioJson || typeof estudioJson !== 'object') {
      return errorResponse('estudioJson requerido', 400);
    }

    // ── Construir prompt de sistema con contexto del estudio ──────
    const systemPrompt = `${SYSTEM_BASE}

---
DATOS DEL ESTUDIO (JSON):
${JSON.stringify(estudioJson, null, 2)}
---`;

    // ── Llamada a Anthropic ───────────────────────────────────────
    let anthropicRes;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: MAX_TOKENS,
          system:     systemPrompt,
          messages:   messages,
        }),
      });
    } catch (err) {
      return errorResponse('Error contacting Anthropic API', 502);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return errorResponse(`Anthropic error: ${errText}`, anthropicRes.status);
    }

    const data = await anthropicRes.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';

    return new Response(JSON.stringify({ response: text }), {
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      }
    });
  }
};

function errorResponse(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    }
  });
}
