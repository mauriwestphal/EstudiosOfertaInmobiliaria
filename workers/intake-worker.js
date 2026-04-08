/**
 * RW Consulting — Intake Worker (versión simple)
 * Endpoints:
 * - POST /generate → Genera estudio completo
 * - POST /analyze → Análisis conversacional en tiempo real
 */

// Función para analizar conversación en tiempo real
async function handleConversation(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { messages, currentData } = body;

    // Validar que tenemos mensajes
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'messages array is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Para desarrollo: devolver respuesta simulada
    return new Response(JSON.stringify({
      success: true,
      analysis: 'Análisis de prueba: usuario proporcionó información inicial',
      missing_info: ['nombre_proyecto', 'direccion', 'inmobiliaria'],
      next_question: '¿Cuál es el nombre del proyecto?',
      is_complete: false,
      extracted_data: {}
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Error analyzing conversation',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Función para generar estudio completo
async function handleGenerate(request, env, corsHeaders) {
  try {
    const requestData = await request.json();
    
    // Validate required fields
    if (!requestData.tipo || !requestData.datos) {
      return new Response('Missing required fields: tipo, datos', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Para desarrollo: devolver respuesta simulada
    return new Response(JSON.stringify({
      success: true,
      estudio_id: 'test-id-123',
      codigo: 'EST-2026-TEST-1234',
      mensaje: 'Estudio generado correctamente (modo prueba)'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Error al generar el estudio'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Main fetch handler
export default {
  async fetch(request, env) {
    // CORS headers
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://rwconsulting.cl',
      'http://localhost:8000',
      'http://localhost:8080',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:8080'
    ];
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'https://rwconsulting.cl',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Route to appropriate handler
      if (path === '/generate') {
        return await handleGenerate(request, env, corsHeaders);
      } else if (path === '/analyze') {
        return await handleConversation(request, env, corsHeaders);
      }

      return new Response('Not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};