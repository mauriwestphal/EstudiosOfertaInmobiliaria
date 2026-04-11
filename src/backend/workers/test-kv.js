/**
 * Script de prueba para KV namespace
 * Ejecutar en Cloudflare Workers una vez configurado
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Test endpoint
      if (path === '/test' || path === '/test/') {
        return handleTest(env, corsHeaders);
      }
      
      // Write endpoint
      if (path === '/write' && request.method === 'POST') {
        return handleWrite(request, env, corsHeaders);
      }
      
      // Read endpoint
      if (path === '/read' && request.method === 'GET') {
        return handleRead(env, corsHeaders);
      }
      
      // List endpoint
      if (path === '/list' && request.method === 'GET') {
        return handleList(env, corsHeaders);
      }
      
      return new Response('Not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
      
    } catch (error) {
      console.error('Error in test-kv:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Test endpoint
async function handleTest(env, corsHeaders) {
  const testKey = 'test:' + Date.now();
  const testValue = { 
    timestamp: new Date().toISOString(),
    message: 'KV namespace test successful'
  };
  
  try {
    // Write test data
    await env.ESTUDIOS_KV.put(testKey, JSON.stringify(testValue));
    
    // Read test data
    const storedValue = await env.ESTUDIOS_KV.get(testKey);
    
    // Delete test data
    await env.ESTUDIOS_KV.delete(testKey);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'KV namespace is working correctly',
      test: {
        key: testKey,
        written: testValue,
        read: storedValue ? JSON.parse(storedValue) : null,
        deleted: true
      },
      kv_binding: 'ESTUDIOS_KV',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'KV namespace test failed',
      kv_binding: 'ESTUDIOS_KV',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Write endpoint
async function handleWrite(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { key, value } = data;
    
    if (!key || value === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing key or value'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    await env.ESTUDIOS_KV.put(key, JSON.stringify(value));
    
    return new Response(JSON.stringify({
      success: true,
      key,
      message: 'Value written successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Read endpoint
async function handleRead(env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (!key) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing key parameter'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const value = await env.ESTUDIOS_KV.get(key);
    
    return new Response(JSON.stringify({
      success: true,
      key,
      value: value ? JSON.parse(value) : null,
      exists: value !== null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// List endpoint (simplified - KV doesn't have native list)
async function handleList(env, corsHeaders) {
  try {
    // Note: Cloudflare KV doesn't have a native list operation
    // This is a simplified version for testing
    const testKeys = ['test:setup', 'test:connection'];
    
    const results = {};
    for (const key of testKeys) {
      const value = await env.ESTUDIOS_KV.get(key);
      if (value) {
        results[key] = JSON.parse(value);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'KV list test (limited functionality)',
      keys_found: Object.keys(results).length,
      results,
      note: 'Cloudflare KV does not support native listing of keys. This is a test of specific known keys.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}