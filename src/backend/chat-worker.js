/**
 * RW Consulting — Cloudflare Worker
 * Asesor estratégico inmobiliario — proxy seguro para API de Anthropic
 *
 * DEPLOY:
 *   1. wrangler secret put ANTHROPIC_API_KEY    ← tu key de Anthropic
 *   2. wrangler secret put VALID_CODES          ← JSON array: ["EST-2026-KI-4V7P","EST-2025-GC-8F3K"]
 *   3. wrangler deploy
 *
 * CORS: ajusta ALLOWED_ORIGIN a tu dominio de producción
 */

const ALLOWED_ORIGIN = 'https://rwconsulting.cl';
const ALLOWED_ORIGINS = [
  'https://rwconsulting.cl',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080'
];
const MODEL      = 'claude-sonnet-4-5-20251022';
const MAX_TOKENS = 4096;

// Prompt de sistema — asesor estratégico inmobiliario
const SYSTEM_BASE = `Eres un asesor estratégico inmobiliario senior de RW Consulting, especializado en el mercado chileno de proyectos de vivienda nueva.

ROL Y AUDIENCIA:
Asesoras a dos tipos de clientes que consultan estudios de mercado:
1. Inversionistas: Personas o empresas que evalúan comprar unidades como activo de inversión (renta, plusvalía o reventa)
2. Inmobiliarias: Equipos de ventas y gerencias que buscan posicionar su proyecto y definir estrategias de precios competitivas

CAPACIDADES DE ANÁLISIS Y ASESORIA:
Tu valor está en interpretar los datos del estudio con criterio estratégico:
- Posicionamiento competitivo: si el proyecto está caro, en línea o económico vs. el mercado, con datos concretos
- Estrategia de precios: recomendaciones de ajuste fundamentadas en la brecha vs. competencia por tipología
- Análisis por tipología: qué mix tiene mejor penetración de mercado, cuáles están sobre o subprecio
- Brechas de mercado: tipologías, zonas u orientaciones con menor competencia o mayor absorción potencial
- Riesgo de saturación: basado en el stock disponible total y cantidad de proyectos activos
- Primas por orientación: cuánto agregan las orientaciones según los datos de ponderación del estudio
- Competidores directos: los más comparables por ubicación, tipología y precio, y cómo diferenciarse
- Señales de oportunidad: precios muy superiores o inferiores al promedio que indiquen nichos sin explotar

CÓMO RESPONDER:
1. Fundamenta cada recomendación con números del estudio: cita UF/m², porcentaje de diferencia, stock disponible, etc.
2. Sé directo y propositivo. Los clientes buscan orientación concreta, no solo descripción de tablas.
3. Cuando apliques criterio de mercado general más allá del estudio, indícalo: "Como referencia general de mercado..."
4. Usa listas y comparaciones numéricas para que la información sea escaneable.
5. Respuestas de largo medio (3-6 párrafos o hasta 10 bullets). Si la pregunta requiere más profundidad, ofrece continuar.
6. Precios siempre en UF. Solo convierte a CLP si el usuario lo pide explícitamente.
7. Usa español. Si el usuario escribe en otro idioma, responde en ese idioma.
8. Si identificas algo relevante que el usuario no preguntó pero debería saber, mencionalo al final con "💡 Nota adicional:".

LIMITACIONES (mencionar solo si aplica al contexto):
- El análisis se basa en los datos del estudio, que tienen una fecha de corte; las condiciones del mercado pueden haber cambiado.
- No incluye factores macroeconómicos actuales, tasas hipotecarias ni condiciones de crédito vigentes.
- No reemplaza due diligence legal, técnica ni financiera especializada.

DISCLAIMER (incluir solo en la primera respuesta de la sesión, de forma breve):
"📊 *Análisis basado en el estudio de mercado RW Consulting. Orientativo — complementa pero no reemplaza asesoría especializada.*"`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGIN;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  allowedOrigin,
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
      return errorResponse('Invalid JSON body', 400, origin);
    }

    const { codigo, messages, estudioJson } = body;

    // Validar código de acceso
    let validCodes = [];
    try {
      validCodes = JSON.parse(env.VALID_CODES || '[]');
    } catch {
      return errorResponse('Worker misconfigured', 500, origin);
    }

    if (!codigo || !validCodes.includes(codigo)) {
      return errorResponse('Código de acceso no válido', 403, origin);
    }

    // Validar payload
    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages requerido', 400, origin);
    }
    if (!estudioJson || typeof estudioJson !== 'object') {
      return errorResponse('estudioJson requerido', 400, origin);
    }

    // Construir prompt con contexto del estudio
    const systemPrompt = `${SYSTEM_BASE}

---
DATOS DEL ESTUDIO (JSON):
${JSON.stringify(estudioJson, null, 2)}
---`;

    // Llamada a Anthropic
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
      return errorResponse('Error contacting Anthropic API', 502, origin);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return errorResponse(`Anthropic error: ${errText}`, anthropicRes.status, origin);
    }

    const data = await anthropicRes.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';

    return new Response(JSON.stringify({ response: text }), {
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      }
    });
  }
};

function errorResponse(msg, status = 400, origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGIN;
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
    }
  });
}
