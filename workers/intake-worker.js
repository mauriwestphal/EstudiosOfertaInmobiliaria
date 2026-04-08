    // Validate required fields
    if (!requestData.tipo || !requestData.datos) {
      return new Response('Missing required fields: tipo, datos', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Generate study ID
    const estudioId = crypto.randomUUID();
    const codigo = generarCodigoEstudio(requestData.datos.inmobiliaria);
    
    // Build prompt for Claude
    const prompt = construirPrompt(requestData);
    
    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const jsonGenerado = claudeData.content[0].text;

    // Try to parse the JSON to validate it
    let estudioJson;
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      const jsonMatch = jsonGenerado.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }
      estudioJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Try to fix common JSON issues
      try {
        // Remove markdown code blocks
        const cleaned = jsonGenerado
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        estudioJson = JSON.parse(cleaned);
      } catch (secondError) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to generate valid JSON',
          raw_response: jsonGenerado.substring(0, 500) + '...'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Ensure the generated JSON has the required code
    if (!estudioJson.meta || !estudioJson.meta.codigo) {
      estudioJson.meta = estudioJson.meta || {};
      estudioJson.meta.codigo = codigo;
      estudioJson.meta.version_esquema = '2.0';
      estudioJson.meta.autor = 'RW Consulting';
      estudioJson.meta.fecha = new Date().toISOString().split('T')[0];
    }

    // Store in KV
    const kvKey = `estudio:${estudioId}`;
    await env.ESTUDIOS_KV.put(kvKey, JSON.stringify({
      id: estudioId,
      codigo: codigo,
      json: estudioJson,
      estado: 'pendiente_revision',
      fecha_solicitud: new Date().toISOString(),
      datos_solicitud: requestData,
      contacto_email: requestData.datos.contacto_email
    }));

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      estudio_id: estudioId,
      codigo: codigo,
      json_generado: estudioJson,
      mensaje: 'Estudio generado correctamente'
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