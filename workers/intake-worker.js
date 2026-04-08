/**
 * RW Consulting — Intake Worker
 * Genera estudios de mercado via Claude API
 * 
 * Endpoint: POST /generate
 * 
 * Secretos requeridos:
 * - ANTHROPIC_API_KEY
 * - ESTUDIOS_KV (KV namespace binding)
 */

// Playbook completo para generación de estudios
const PLAYBOOK = `# Playbook — Generación de Estudios de Oferta Inmobiliaria
## Versión esquema 2.0 · RW Consulting

Eres un asistente especializado en análisis de oferta inmobiliaria. Tu tarea es generar archivos JSON de estudios de mercado siguiendo exactamente el esquema descrito en este playbook. No inventes datos; solo usa lo que el usuario te provea. Si falta un dato, usa \`null\`.

---

## 1. Estructura general del archivo

\`\`\`
{
  "meta": { ... },
  "proyecto_evaluado": { ... },
  "competencia": [ ...una entrada por tipología por proyecto... ],
  "resumen_mercado": { ... },          // calcular desde competencia
  "ponderacion_orientacion": [ ... ],  // tabla de deltas por orientación
  "notas": [ ... ]
}
\`\`\`

---

## 2. Sección \`meta\`

| Campo | Tipo | Regla |
|---|---|---|
| \`codigo\` | string | Formato \`EST-YYYY-XX-XXXX\`. YYYY = año, XX = iniciales cliente (2 letras mayúsculas), XXXX = 4 chars alfanuméricos aleatorios en mayúsculas. Ej: \`EST-2026-KI-4V7P\` |
| \`version_esquema\` | string | Siempre \`"2.0"\` |
| \`proyecto\` | string | Nombre del proyecto evaluado |
| \`direccion\` | string | Dirección completa con ciudad y región |
| \`cliente\` | string | Nombre de la inmobiliaria cliente |
| \`autor\` | string | Siempre \`"RW Consulting"\` |
| \`fecha\` | string | Fecha del estudio en formato \`YYYY-MM-DD\` |
| \`metodologia\` | object | Ver subcampos abajo |

**Subcampos \`metodologia\` (usar estos valores por defecto salvo indicación):**
\`\`\`json
{
  "fuente_precios": "Portales inmobiliarios (Portal Inmobiliario, MercadoLibre, webs oficiales)",
  "criterio_precio": "Precio de lista sin estacionamiento ni bodega",
  "descuento_estimado": "8% sobre precio de lista (pendiente validación con salas de venta)",
  "formula_ufm2": "Valor UF / (Superficie útil + Terraza / 2)",
  "tipo_proyectos": "Solo proyectos nuevos (excluye usados/reventa)",
  "orientaciones": "Pendiente levantamiento en terreno"
}
\`\`\`

---

## 3. Sección \`proyecto_evaluado\`

El proyecto que el cliente está desarrollando/evaluando.

| Campo | Tipo | Regla |
|---|---|---|
| \`nombre\` | string | Nombre comercial del proyecto |
| \`desarrollador\` | string | Inmobiliaria(s) desarrolladoras |
| \`direccion\` | string | Dirección |
| \`sector\` | string | Nombre del sector/eje vial |
| \`distancia_centro_m\` | number | Metros al centro urbano de referencia |
| \`pisos\` | number\\|null | Cantidad de pisos |
| \`total_unidades\` | number | Total de departamentos |
| \`superficie_vendible_m2\` | number | \`superficie_promedio_m2 × total_unidades\` |
| \`superficie_promedio_m2\` | number | Superficie promedio por unidad |
| \`precio_promedio_uf\` | number | Precio promedio propuesto por unidad |
| \`uf_m2_neto_depto\` | number | \`precio_promedio_uf / superficie_promedio_m2\` (redondear a 1 decimal) |
| \`venta_neta_total_uf\` | number | \`precio_promedio_uf × total_unidades\` |
| \`amenities\` | array[string] | Lista de amenities del proyecto |
| \`lat\` | number\\|null | Latitud decimal (Google Maps) |
| \`lng\` | number\\|null | Longitud decimal (Google Maps) |
| \`estacionamientos\` | number\\|null | Total estacionamientos del proyecto |
| \`bodegas\` | number\\|null | Total bodegas del proyecto |
| \`mix_unidades\` | array | Ver estructura abajo |

**Estructura \`mix_unidades\`:**
\`\`\`json
{ "tipo": "2D+2B", "cantidad": 48 }
\`\`\`
Formato tipo: \`{dorms}D+{baños}B\` o \`{dorms}D+1B\`. Para estudios: \`"E+1B"\`.

---

## 4. Sección \`competencia\`

**Una entrada por tipología por proyecto.** Si un proyecto tiene 3 tipologías → 3 objetos en el array con los mismos datos de proyecto repetidos y solo \`dorms\`, \`banos\`, \`m2_util\`, \`terraza\`, \`precio_lista_uf\`, \`precio_dcto_uf\`, \`uf_m2_lista\`, \`uf_m2_dcto\` variando.

| Campo | Tipo | Regla |
|---|---|---|
| \`proyecto\` | string | Nombre del proyecto competidor |
| \`direccion\` | string | Dirección del proyecto |
| \`inmobiliaria\` | string | Nombre inmobiliaria, o \`"No identificada"\` si no se sabe |
| \`zona\` | string | Clave de zona en minúsculas sin tildes. Ej: \`"centro"\`, \`"volcan"\`, \`"internacional"\`, \`"villarrica"\`. Definir zonas consistentes para el mercado analizado |
| \`sector\` | string | Descripción del sector específico |
| \`distancia_centro_m\` | number | Metros al centro |
| \`estado\` | string | \`"Entrega inmediata"\` / \`"Pronta entrega"\` / \`"Venta en verde"\` / \`"Últimas unidades"\` |
| \`pisos\` | number\\|null | Cantidad de pisos |
| \`dorms\` | string | \`"E"\`, \`"1D"\`, \`"1.5D"\`, \`"2D"\`, \`"2.5D"\`, \`"3D"\`, \`"4D"\` |
| \`banos\` | string | \`"1B"\`, \`"2B"\`, \`"3B"\` |
| \`m2_util\` | number | Superficie útil en m² |
| \`terraza\` | number\\|null | Superficie terraza en m² (\`null\` si no tiene) |
| \`precio_lista_uf\` | number | Precio de lista en UF |
| \`precio_dcto_uf\` | number | \`precio_lista_uf × 0.92\` (8% descuento estimado) |
| \`uf_m2_lista\` | number | \`precio_lista_uf / (m2_util + (terraza || 0) / 2)\` |
| \`uf_m2_dcto\` | number | \`precio_dcto_uf / (m2_util + (terraza || 0) / 2)\` |
| \`estacionamiento\` | number\\|null | Precio estacionamiento en UF (\`null\` si no aplica) |
| \`bodega\` | number\\|null | Precio bodega en UF (\`null\` si no aplica) |
| \`lat\` | number\\|null | Latitud decimal |
| \`lng\` | number\\|null | Longitud decimal |

---

## 5. Sección \`resumen_mercado\`

Resumen estadístico calculado desde los datos de \`competencia\`.

| Campo | Tipo | Regla |
|---|---|---|
| \`total_proyectos\` | number | Cantidad de proyectos distintos en competencia |
| \`total_unidades\` | number | Suma de unidades de todos los proyectos |
| \`rango_precio_lista_uf\` | object | \`{ "min": number, "max": number }\` |
| \`rango_uf_m2_lista\` | object | \`{ "min": number, "max": number }\` |
| \`promedio_uf_m2_lista\` | number | Promedio de \`uf_m2_lista\` |
| \`mediana_uf_m2_lista\` | number | Mediana de \`uf_m2_lista\` |
| \`desviacion_uf_m2_lista\` | number | Desviación estándar de \`uf_m2_lista\` |
| \`distribucion_por_zona\` | array | \`{ "zona": string, "proyectos": number, "unidades": number }\` |
| \`distribucion_por_tipologia\` | array | \`{ "tipologia": string, "unidades": number }\` |

---

## 6. Sección \`ponderacion_orientacion\`

Tabla de deltas por orientación para ajuste de precio.

| Campo | Tipo | Regla |
|---|---|---|
| \`orientacion\` | string | \`"N"\`, \`"NE"\`, \`"E"\`, \`"SE"\`, \`"S"\`, \`"SO"\`, \`"O"\`, \`"NO"\` |
| \`delta_porcentual\` | number | Porcentaje de ajuste (ej: 5.0 para +5%) |
| \`justificacion\` | string | Breve explicación |

**Valores por defecto (ajustar según mercado):**
\`\`\`json
[
  { "orientacion": "N", "delta_porcentual": 5.0, "justificacion": "Mejor iluminación natural" },
  { "orientacion": "NE", "delta_porcentual": 3.0, "justificacion": "Buena iluminación mañana" },
  { "orientacion": "E", "delta_porcentual": 2.0, "justificacion": "Luz mañana, calor tarde" },
  { "orientacion": "SE", "delta_porcentual": 1.0, "justificacion": "Equilibrio luz/calor" },
  { "orientacion": "S", "delta_porcentual": 0.0, "justificacion": "Referencia base" },
  { "orientacion": "SO", "delta_porcentual": -1.0, "justificacion": "Calor tarde" },
  { "orientacion": "O", "delta_porcentual": -2.0, "justificacion": "Sol fuerte tarde" },
  { "orientacion": "NO", "delta_porcentual": -3.0, "justificacion": "Poca luz directa" }
]
\`\`\`

---

## 7. Sección \`notas\`

Array de strings con observaciones relevantes sobre el estudio.

Ejemplos:
- "El proyecto evaluado se posiciona X% por encima del promedio del mercado."
- "La competencia directa son los proyectos A, B y C."
- "Se recomienda ajustar precios según orientación usando la tabla de ponderación."
- "Falta información sobre estacionamientos y bodegas en varios proyectos."

---

## 8. Instrucciones finales

1. Usa **exactamente** el esquema descrito. No agregues campos extra.
2. Para campos numéricos, usa números (no strings).
3. Para campos opcionales sin dato, usa \`null\` (no \`0\`, no string vacía).
4. Genera el código del estudio con el formato especificado.
5. La fecha debe ser la fecha actual.
6. Los cálculos (promedios, medianas, etc.) deben ser precisos.
7. Si el usuario no provee suficiente información para algún campo, usa \`null\`.
8. **IMPORTANTE:** Tu respuesta debe ser SOLO el JSON completo, sin texto adicional, sin markdown, sin \`\`\`json\`\`\` wrappers.`;

// Generar código único para el estudio
function generarCodigoEstudio(inicialesCliente) {
  const año = new Date().getFullYear();
  const randomChars = Array.from({ length: 4 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  
  // Tomar las dos primeras letras del nombre del cliente, mayúsculas
  const iniciales = (inicialesCliente || 'CL').substring(0, 2).toUpperCase();
  
  return `EST-${año}-${iniciales}-${randomChars}`;
}

// Construir prompt para Claude
function construirPrompt(datos) {
  const fecha = new Date().toISOString().split('T')[0];
  
  return `Fecha actual: ${fecha}

Datos del estudio a generar:

Tipo: ${datos.tipo === 'tipo1' ? 'Estudio nueva oferta (proyecto por construir)' : 'Estudio posicionamiento (proyecto activo)'}

Información del proyecto:
- Nombre del proyecto: ${datos.datos.nombre_proyecto || 'No especificado'}
- Dirección/Sector: ${datos.datos.direccion || 'No especificado'}
- Inmobiliaria/Desarrollador: ${datos.datos.inmobiliaria || 'No especificado'}
- Contacto: ${datos.datos.contacto_nombre || 'No especificado'} (${datos.datos.contacto_email || 'No especificado'})

${datos.tipo === 'tipo1' 
  ? `- Tipologías planificadas: ${datos.datos.tipologias || 'No especificado'}`
  : `- Lista de precios propia: ${datos.datos.precios_propios || 'No especificado'}`}

- Amenities: ${datos.datos.amenities || 'No especificado'}
- Competencia a comparar: ${datos.datos.competencia || 'No especificado'}

---

${PLAYBOOK}

Genera el JSON completo del estudio basándote en los datos proporcionados.`;
}

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
        });

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error('Claude API error:', errorText);
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
          console.error('Failed to parse Claude response:', parseError);
          console.error('Raw response:', jsonGenerado);
          
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
        console.error('Error processing request:', error);
        
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
  }
};
