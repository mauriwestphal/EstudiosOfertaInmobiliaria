/**
 * RW Consulting — Intake Conversacional (reconstrucción completa)
 * Interfaz de chat inteligente para recopilación de datos de estudios inmobiliarios
 */

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
  // Mensaje de bienvenida
  addMessage('assistant', 'Hola, soy el asistente de RW Consulting. ¿Qué tipo de estudio necesitas?');
  
  // Botones de tipo de estudio
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'suggestions-container';
  buttonContainer.style.marginTop = '12px';
  
  const tipo1Button = createSuggestionChip('Tengo un proyecto por construir y quiero saber cómo posicionar precios');
  const tipo2Button = createSuggestionChip('Tengo un proyecto activo y quiero compararlo con el mercado');
  
  tipo1Button.addEventListener('click', () => selectStudyType('tipo1'));
  tipo2Button.addEventListener('click', () => selectStudyType('tipo2'));
  
  buttonContainer.appendChild(tipo1Button);
  buttonContainer.appendChild(tipo2Button);
  
  // Agregar al chat
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant-message';
  messageDiv.appendChild(buttonContainer);
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
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
      
      // Si está completo, mostrar botón de generar
      if (state.isComplete) {
        showGenerateButton();
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

function showGenerateButton() {
  if (!generateButton) return;
  
  generateButton.classList.remove('hidden');
  
  // Agregar mensaje del asistente
  addMessage('assistant', '¡Perfecto! Ya tengo toda la información necesaria. Puedes generar tu estudio ahora.');
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