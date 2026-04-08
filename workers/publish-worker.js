/**
 * RW Consulting — Publish Worker
 * Publica estudios aprobados en GitHub y envía emails a clientes
 * 
 * Endpoint: POST /publish
 * 
 * Secretos requeridos:
 * - GITHUB_TOKEN
 * - GITHUB_OWNER
 * - GITHUB_REPO
 * - RESEND_API_KEY
 * - EMAIL_FROM
 * - ADMIN_SECRET
 */

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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    try {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Missing or invalid Authorization header', { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      const token = authHeader.substring(7);
      if (token !== env.ADMIN_SECRET) {
        return new Response('Invalid admin token', { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      // Parse request body
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return new Response('Content-Type must be application/json', { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      const requestData = await request.json();
      
      // Validate required fields
      if (!requestData.estudio_id || !requestData.codigo || !requestData.json || !requestData.email_cliente) {
        return new Response('Missing required fields: estudio_id, codigo, json, email_cliente', { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      const { estudio_id, codigo, json, email_cliente, cliente_nombre, proyecto_nombre } = requestData;

      // Step 1: Push JSON to GitHub
      const githubResult = await pushToGitHub(codigo, json, env);
      
      if (!githubResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'GitHub push failed',
          details: githubResult.error
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Step 2: Send email to client
      const emailResult = await sendEmailToClient({
        codigo,
        email_cliente,
        cliente_nombre,
        proyecto_nombre,
        commit_url: githubResult.commit_url
      }, env);

      if (!emailResult.success) {
        console.warn('Email sending failed, but study was published:', emailResult.error);
        // Continue anyway - the study is published
      }

      // Step 3: Return success response
      return new Response(JSON.stringify({
        success: true,
        estudio_id,
        codigo,
        github: {
          commit_url: githubResult.commit_url,
          file_url: githubResult.file_url
        },
        email_sent: emailResult.success,
        message: 'Estudio publicado exitosamente'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error in publish-worker:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error al publicar el estudio'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Push JSON file to GitHub
async function pushToGitHub(codigo, jsonData, env) {
  const fileName = `${codigo}.json`;
  const filePath = `estudios/${fileName}`;
  
  // Get current file SHA (if exists)
  let currentSha = null;
  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RW-Consulting-Publish-Worker'
        }
      }
    );

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      currentSha = fileData.sha;
    }
  } catch (error) {
    // File doesn't exist yet, that's fine
    console.log(`File ${filePath} doesn't exist yet, will create new`);
  }

  // Prepare commit message
  const commitMessage = currentSha 
    ? `Actualizar estudio ${codigo}`
    : `Agregar estudio ${codigo}`;

  // Create or update file
  const content = JSON.stringify(jsonData, null, 2);
  const contentEncoded = btoa(unescape(encodeURIComponent(content)));

  const putResponse = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'RW-Consulting-Publish-Worker'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentEncoded,
        sha: currentSha || undefined,
        branch: 'main'
      })
    }
  );

  if (!putResponse.ok) {
    const errorText = await putResponse.text();
    console.error('GitHub API error:', errorText);
    return {
      success: false,
      error: `GitHub API returned ${putResponse.status}: ${errorText}`
    };
  }

  const result = await putResponse.json();
  
  return {
    success: true,
    commit_url: result.commit.html_url,
    file_url: result.content.html_url
  };
}

// Send email to client via Resend
async function sendEmailToClient(data, env) {
  const { codigo, email_cliente, cliente_nombre, proyecto_nombre, commit_url } = data;
  
  const clientName = cliente_nombre || 'Cliente';
  const projectName = proyecto_nombre || 'tu proyecto';
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estudio de mercado listo - RW Consulting</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f7f9f9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1D6A6A;
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      background-color: white;
      padding: 40px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 12px rgba(46, 46, 56, 0.1);
    }
    .code-box {
      background-color: #E0F0EF;
      border: 2px solid #1D6A6A;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
      font-family: monospace;
      font-size: 24px;
      font-weight: 700;
      color: #155A5A;
    }
    .button {
      display: inline-block;
      background-color: #1D6A6A;
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #155A5A;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
    .signature {
      margin-top: 30px;
      color: #1D6A6A;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RW Consulting</h1>
      <p>Estudios de mercado inmobiliario</p>
    </div>
    <div class="content">
      <h2>¡Hola ${clientName}!</h2>
      <p>Tu estudio de mercado para <strong>${projectName}</strong> está listo.</p>
      
      <p>Hemos analizado la oferta del sector y generado un informe completo con:</p>
      <ul>
        <li>Análisis de competencia directa</li>
        <li>Posicionamiento de precios recomendado</li>
        <li>Comparativa por tipología y orientación</li>
        <li>Recomendaciones estratégicas</li>
      </ul>
      
      <div class="code-box">
        ${codigo}
      </div>
      
      <p>Para acceder al estudio completo:</p>
      
      <div style="text-align: center;">
        <a href="https://rwconsulting.cl/viewer.html?codigo=${codigo}" class="button">
          Ver estudio completo
        </a>
      </div>
      
      <p>O visita <a href="https://rwconsulting.cl">rwconsulting.cl</a> e ingresa el código arriba.</p>
      
      <div class="signature">
        <p>Saludos cordiales,<br>
        <strong>Mauricio Westphal</strong><br>
        RW Consulting</p>
      </div>
      
      <div class="footer">
        <p>Este es un email automático. Por favor no respondas a este mensaje.</p>
        <p>RW Consulting · estudios@rwconsulting.cl</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const emailText = `
¡Hola ${clientName}!

Tu estudio de mercado para ${projectName} está listo.

Código de acceso: ${codigo}

Para ver el estudio completo, visita:
https://rwconsulting.cl/viewer.html?codigo=${codigo}

O ingresa el código en rwconsulting.cl

Saludos cordiales,
Mauricio Westphal
RW Consulting

---

Este es un email automático. Por favor no respondas a este mensaje.
RW Consulting · estudios@rwconsulting.cl
  `;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email_cliente,
        subject: `Estudio de mercado listo - ${codigo}`,
        html: emailHtml,
        text: emailText
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      return {
        success: false,
        error: `Resend API returned ${resendResponse.status}: ${errorText}`
      };
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result.id);
    
    return {
      success: true,
      email_id: result.id
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}