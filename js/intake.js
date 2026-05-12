/**
 * RW Consulting — Intake Conversacional (reconstrucción completa)
 * Interfaz de chat inteligente para recopilación de datos de estudios inmobiliarios
 */

// ── Etiquetas legibles para campos recopilados ───────────────────

const FIELD_LABELS = {
  nombre_proyecto:  'Nombre del proyecto',
  direccion_sector: 'Dirección / Sector',
  direccion:        'Dirección',
  inmobiliaria:     'Inmobiliaria',
  tipologias:       'Tipologías',
  amenities:        'Amenidades',
  competencia:      'Competencia',
  precios_propios:  'Precios propios',
  contacto_nombre:  'Nombre de contacto',
  contacto_email:   'Email de contacto',
};

// ── Estado global ─────────────────────────────────────────────────

const state = {
  messages: [],           // historial de conversación [{role, content}]
  currentData: {          // datos recopilados hasta ahora
    tipo: null,
    datos: {}
  },
  missingFields: [],      // campos que faltan según IA
  progressPct: 0,         // progreso de recopilación
  isComplete: false,      // si ya se recopiló toda la info
  isLoading: false        // si está procesando una respuesta
};

// ── Elementos DOM ─────────────────────────────────────────────────

let chatContainer, userInput, sendButton, progressFill, suggestionsContainer, generateButton;

// ── Inicialización ────────────────────────────────────────────────

function init() {
  // Obtener elementos DOM
  chatContainer = document.getElementById('chat-container');
  userInput = document.getElementById('user-input');
  sendButton = document.getElementById('send-button');
  progressFill = document.getElementById('progress-fill');
  suggestionsContainer = document.getElementById('suggestions-container');
  generateButton = document.getElementById('generate-button');

  // Verificar que todos los elementos existen
  if (!chatContainer || !userInput || !sendButton) {
    console.error('Missing required DOM elements');
    return;
  }

  // Configurar event listeners
  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (generateButton) {
    generateButton.addEventListener('click', generateStudy);
  }

  // Iniciar conversación
  startConversation();
}

// ── Flujo de conversación ────────────────────────────────────────

function startConversation() {
  addMessage('assistant', 'Bienvenido a RW Consulting. Vamos a definir el estudio de mercado que necesita tu proyecto. ¿En qué etapa estás?');

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'suggestions-container';
  buttonContainer.style.marginTop = '12px';

  const tipo1Button = createSuggestionChip('Tengo un proyecto por construir y quiero saber cómo posicionar precios');
  const tipo2Button = createSuggestionChip('Tengo un proyecto activo y quiero compararlo con el mercado');
  const contactButton = createSuggestionChip('Prefiero que me contacten');
  contactButton.style.borderColor = 'var(--warm)';
  contactButton.style.color = 'var(--warm)';

  function disableTypeButtons() {
    [tipo1Button, tipo2Button, contactButton].forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.5';
      b.style.cursor = 'default';
      b.style.transform = 'none';
    });
  }

  tipo1Button.addEventListener('click', () => { disableTypeButtons(); selectStudyType('tipo1'); });
  tipo2Button.addEventListener('click', () => { disableTypeButtons(); selectStudyType('tipo2'); });
  contactButton.addEventListener('click', () => { disableTypeButtons(); showContactForm(); });

  buttonContainer.appendChild(tipo1Button);
  buttonContainer.appendChild(tipo2Button);
  buttonContainer.appendChild(contactButton);

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant-message';
  messageDiv.appendChild(buttonContainer);
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

function showContactForm() {
  addMessage('user', 'Prefiero que me contacten');
  addMessage('assistant', 'Perfecto. Dejá tus datos y te contactamos a la brevedad.');

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message assistant-message';

  const form = document.createElement('div');
  form.style.cssText = 'background:var(--mist);border:1px solid var(--border-solid);border-radius:12px;padding:20px;margin-top:4px;display:flex;flex-direction:column;gap:12px;min-width:280px;';

  const fields = [
    { name: 'nombre',  label: 'Nombre',           type: 'text',  required: true  },
    { name: 'email',   label: 'Email',             type: 'email', required: true  },
    { name: 'empresa', label: 'Empresa (opcional)',type: 'text',  required: false },
    { name: 'mensaje', label: 'Mensaje (opcional)',type: 'textarea', required: false },
  ];

  const inputs = {};
  fields.forEach(f => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:0.85rem;font-weight:600;color:var(--text-secondary);';
    label.textContent = f.label;
    const el = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
    if (f.type !== 'textarea') el.type = f.type;
    el.style.cssText = 'padding:10px 12px;border:1px solid var(--border-solid);border-radius:8px;font-family:Urbanist,sans-serif;font-size:0.9rem;outline:none;resize:vertical;';
    el.rows = 3;
    inputs[f.name] = el;
    label.appendChild(el);
    form.appendChild(label);
  });

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Enviar';
  submitBtn.style.cssText = 'padding:12px;background:var(--teal);color:#fff;border:none;border-radius:8px;font-family:Urbanist,sans-serif;font-size:0.95rem;font-weight:600;cursor:pointer;';
  submitBtn.addEventListener('click', () => submitContactForm(inputs, submitBtn));
  form.appendChild(submitBtn);

  msgDiv.appendChild(form);
  chatContainer.appendChild(msgDiv);

  // Ocultar input de texto
  const inputArea = document.querySelector('.chat-input-area');
  if (inputArea) inputArea.style.display = 'none';

  scrollToBottom();
}

async function submitContactForm(inputs, btn) {
  const nombre  = inputs.nombre.value.trim();
  const email   = inputs.email.value.trim();
  const empresa = inputs.empresa.value.trim();
  const mensaje = inputs.mensaje.value.trim();

  if (!nombre || !email) {
    inputs.nombre.style.borderColor = nombre ? '' : 'red';
    inputs.email.style.borderColor  = email  ? '' : 'red';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const res = await fetch('https://rw-intake.rw-consulting.workers.dev/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, empresa, mensaje, fuente: 'intake' }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    addMessage('assistant', `Listo, ${nombre}. Te contactamos pronto al ${email}. ¡Gracias!`);
    btn.closest('div[style]').remove();
  } catch {
    btn.disabled = false;
    btn.textContent = 'Reintentar';
    addMessage('assistant', 'Hubo un error al enviar. Podés contactarnos directamente en contacto@rwconsulting.cl');
  }
}

function selectStudyType(tipo) {
  state.currentData.tipo = tipo;
  
  // Agregar mensaje del usuario
  const userMsg = tipo === 'tipo1' 
    ? 'Tengo un proyecto por construir y quiero saber cómo posicionar precios'
    : 'Tengo un proyecto activo y quiero compararlo con el mercado';
  
  addMessage('user', userMsg);
  
  // Enviar al análisis IA
  analyzeConversation();
}

// ── Análisis con IA ──────────────────────────────────────────────

async function analyzeConversation() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  showLoading(true);
  
  try {
    const response = await fetch('https://rw-intake.rw-consulting.workers.dev/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: state.messages,
        currentData: state.currentData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Actualizar estado con datos extraídos
      if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
        state.currentData.datos = { ...state.currentData.datos, ...result.extracted_data };
      }
      
      // Actualizar progreso
      state.progressPct = result.progress_pct || 0;
      state.missingFields = result.missing_fields || [];
      state.isComplete = result.is_complete || false;
      
      // Actualizar UI
      updateProgressBar();
      
      // Mostrar respuesta del asistente
      addMessage('assistant', result.next_question);
      
      // Mostrar sugerencias
      showSuggestions(result.suggestions || []);
      
      // Si está completo, mostrar resumen + botón de generar
      if (state.isComplete) {
        showSummaryAndGenerateButton();
      }
    } else {
      throw new Error(result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    addMessage('assistant', 'Lo siento, hubo un error al procesar tu respuesta. Por favor, intenta de nuevo.');
  } finally {
    state.isLoading = false;
    showLoading(false);
  }
}

// ── Envío de mensajes ────────────────────────────────────────────

function sendMessage() {
  const message = userInput.value.trim();
  if (!message || state.isLoading) return;
  
  // Agregar mensaje del usuario
  addMessage('user', message);
  userInput.value = '';
  
  // Limpiar sugerencias
  clearSuggestions();
  
  // Enviar al análisis IA
  analyzeConversation();
}

// ── Generación de estudio ────────────────────────────────────────

async function generateStudy() {
  if (!generateButton) return;
  
  generateButton.disabled = true;
  generateButton.textContent = 'Generando...';
  
  try {
    const response = await fetch('https://rw-intake.rw-consulting.workers.dev/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state.currentData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccessMessage(result.codigo);
      // Remover botón de generar
      generateButton.remove();
    } else {
      throw new Error(result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Error generating study:', error);
    showErrorMessage();
    // Rehabilitar botón
    generateButton.disabled = false;
    generateButton.textContent = 'Generar estudio';
  }
}

function showSuccessMessage(codigo) {
  // Mostrar éxito
  const successDiv = document.createElement('div');
  successDiv.className = 'message assistant-message';
  
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  
  const successTitle = document.createElement('h3');
  successTitle.textContent = '✅ Estudio generado correctamente';
  successTitle.style.marginBottom = '8px';
  successTitle.style.color = 'var(--teal)';
  bubble.appendChild(successTitle);
  
  const successText = document.createElement('p');
  successText.textContent = `Tu estudio ha sido generado con el código: ${codigo}`;
  successText.style.marginBottom = '8px';
  successText.style.fontWeight = '500';
  bubble.appendChild(successText);
  
  const infoText = document.createElement('p');
  infoText.textContent = 'El estudio está pendiente de revisión. Te contactaremos por email cuando esté listo.';
  infoText.style.fontSize = '0.85rem';
  infoText.style.color = 'var(--text-secondary)';
  bubble.appendChild(infoText);
  
  successDiv.appendChild(bubble);
  chatContainer.appendChild(successDiv);
  scrollToBottom();
}

function showErrorMessage() {
  // Mostrar error
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message assistant-message';
  
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  
  const errorTitle = document.createElement('h3');
  errorTitle.textContent = '❌ Error al generar el estudio';
  errorTitle.style.marginBottom = '8px';
  errorTitle.style.color = 'var(--warm-dark)';
  bubble.appendChild(errorTitle);
  
  const errorText = document.createElement('p');
  errorText.textContent = 'Hubo un error al generar tu estudio. Por favor, intenta de nuevo o contacta a soporte.';
  errorText.style.marginBottom = '8px';
  bubble.appendChild(errorText);
  
  const contactText = document.createElement('p');
  contactText.textContent = 'Si el problema persiste, contáctanos en contacto@rwconsulting.cl';
  contactText.style.fontSize = '0.85rem';
  contactText.style.color = 'var(--text-secondary)';
  bubble.appendChild(contactText);
  
  errorDiv.appendChild(bubble);
  chatContainer.appendChild(errorDiv);
  scrollToBottom();
}

// ── UI Helpers ───────────────────────────────────────────────────

function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = content;
  
  messageDiv.appendChild(bubble);
  chatContainer.appendChild(messageDiv);
  
  // Guardar en historial
  state.messages.push({ role, content });
  
  scrollToBottom();
}

function createSuggestionChip(text) {
  const chip = document.createElement('div');
  chip.className = 'suggestion-chip';
  chip.textContent = text;
  return chip;
}

function showSuggestions(suggestions) {
  clearSuggestions();
  
  if (!suggestionsContainer || suggestions.length === 0) return;
  
  suggestions.forEach(suggestion => {
    const chip = createSuggestionChip(suggestion);
    chip.addEventListener('click', () => {
      userInput.value = suggestion;
      sendMessage();
    });
    suggestionsContainer.appendChild(chip);
  });
  
  suggestionsContainer.style.display = 'block';
}

function clearSuggestions() {
  if (suggestionsContainer) {
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'none';
  }
}

function formatFieldValue(value) {
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function buildSummaryCard(datos) {
  const card = document.createElement('div');
  card.className = 'summary-card';

  const title = document.createElement('div');
  title.className = 'summary-card-title';
  title.textContent = 'Resumen de tu solicitud';
  card.appendChild(title);

  const entries = Object.entries(datos);
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No se registraron datos aún.';
    empty.style.color = 'var(--text-secondary)';
    card.appendChild(empty);
    return card;
  }

  entries.forEach(([key, value]) => {
    const row = document.createElement('div');
    row.className = 'summary-field';

    const label = document.createElement('span');
    label.className = 'summary-field-label';
    label.textContent = FIELD_LABELS[key] || key;

    const val = document.createElement('span');
    val.className = 'summary-field-value';
    val.textContent = formatFieldValue(value);

    row.appendChild(label);
    row.appendChild(val);
    card.appendChild(row);
  });

  return card;
}

function showSummaryAndGenerateButton() {
  clearSuggestions();

  // Mostrar resumen como burbuja del asistente (sin pushear al historial)
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message assistant-message';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const intro = document.createElement('p');
  intro.textContent = 'Revisá los datos antes de continuar. Si algo está mal, escríbelo abajo.';
  intro.style.marginBottom = '12px';
  bubble.appendChild(intro);

  bubble.appendChild(buildSummaryCard(state.currentData.datos));

  const note = document.createElement('p');
  note.textContent = 'Cuando todo esté correcto, generá tu estudio con el botón de abajo.';
  note.style.marginTop = '12px';
  note.style.fontSize = '0.85rem';
  note.style.color = 'var(--text-secondary)';
  bubble.appendChild(note);

  msgDiv.appendChild(bubble);
  chatContainer.appendChild(msgDiv);

  // TODO: [DEUDA TÉCNICA] — mostrar pasarela de pago aquí antes de habilitar el botón
  if (generateButton) {
    generateButton.classList.remove('hidden');
  }

  scrollToBottom();
}

function updateProgressBar() {
  if (progressFill) {
    progressFill.style.width = `${state.progressPct}%`;
  }
}

function showLoading(show) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
  
  if (sendButton) {
    sendButton.disabled = show;
  }
  
  if (userInput) {
    userInput.disabled = show;
  }
}

function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 100);
}

// ── Inicializar cuando el DOM esté listo ──────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}