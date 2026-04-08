// RW Consulting — Formulario conversacional inteligente
// Usa IA para analizar respuestas y determinar qué información falta

// State management
const state = {
  messages: [
    { role: 'assistant', content: 'Hola, soy el asistente de RW Consulting. ¿Qué tipo de estudio necesitas?' }
  ],
  currentData: {
    tipo: null,
    datos: {}
  },
  isTyping: false,
  isComplete: false
};

// DOM elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading-indicator');

// Initialize chat
function initChat() {
  // Verify DOM elements exist
  if (!chatContainer || !userInput || !sendButton || !loadingIndicator) {
    console.error('Missing DOM elements:', {
      chatContainer,
      userInput,
      sendButton,
      loadingIndicator
    });
    showError('Error al cargar la interfaz. Por favor, recarga la página.');
    return;
  }
  
  renderMessages();
  userInput.focus();
  
  // Event listeners
  sendButton.addEventListener('click', handleUserMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage();
    }
  });
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.padding = '20px';
  errorDiv.style.margin = '20px';
  errorDiv.style.background = '#fee';
  errorDiv.style.border = '1px solid #f99';
  errorDiv.style.borderRadius = '8px';
  errorDiv.style.color = '#900';
  
  const errorTitle = document.createElement('h3');
  errorTitle.textContent = '❌ Error';
  errorDiv.appendChild(errorTitle);
  
  const errorText = document.createElement('p');
  errorText.textContent = message;
  errorDiv.appendChild(errorText);
  
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Recargar página';
  reloadButton.style.marginTop = '10px';
  reloadButton.style.padding = '8px 16px';
  reloadButton.style.background = '#900';
  reloadButton.style.color = 'white';
  reloadButton.style.border = 'none';
  reloadButton.style.borderRadius = '4px';
  reloadButton.style.cursor = 'pointer';
  reloadButton.addEventListener('click', () => location.reload());
  errorDiv.appendChild(reloadButton);
  
  document.body.appendChild(errorDiv);
}

// Render all messages
function renderMessages() {
  chatContainer.innerHTML = '';
  
  state.messages.forEach((msg, index) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = msg.content;
    
    messageDiv.appendChild(contentDiv);
    
    // Add options for assistant messages with options
    if (msg.role === 'assistant' && msg.options) {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'message-options';
      
      msg.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option.text;
        button.addEventListener('click', () => {
          handleOptionSelection(option.value);
        });
        optionsDiv.appendChild(button);
      });
      
      messageDiv.appendChild(optionsDiv);
    }
    
    chatContainer.appendChild(messageDiv);
  });
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Handle user message
async function handleUserMessage() {
  const userMessage = userInput.value.trim();
  if (!userMessage || state.isTyping || state.isComplete) return;
  
  // Add user message to state
  state.messages.push({ role: 'user', content: userMessage });
  renderMessages();
  
  // Clear input
  userInput.value = '';
  
  // Show typing indicator
  state.isTyping = true;
  loadingIndicator.style.display = 'block';
  
  try {
    // Send to AI for analysis
    const response = await analyzeConversation(userMessage);
    
    // Process AI response
    if (response.success) {
      // Update current data with extracted data
      if (response.extracted_data) {
        Object.assign(state.currentData.datos, response.extracted_data);
      }
      
      // Add AI response to messages
      state.messages.push({ 
        role: 'assistant', 
        content: response.next_question 
      });
      
      // Check if conversation is complete
      if (response.is_complete) {
        state.isComplete = true;
        // Show summary and generate button
        showSummaryAndGenerate();
      }
    } else {
      // Handle error
      state.messages.push({ 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.' 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    state.messages.push({ 
      role: 'assistant', 
      content: 'Lo siento, hubo un error de conexión. Por favor, intenta de nuevo.' 
    });
  } finally {
    // Hide typing indicator
    state.isTyping = false;
    loadingIndicator.style.display = 'none';
    renderMessages();
  }
}

// Handle option selection (for study type)
async function handleOptionSelection(value) {
  if (value === 'tipo1' || value === 'tipo2') {
    state.currentData.tipo = value;
    
    // Add user selection to messages
    state.messages.push({ 
      role: 'user', 
      content: value === 'tipo1' 
        ? 'Tengo un proyecto por construir y quiero saber cómo posicionar precios' 
        : 'Tengo un proyecto activo y quiero compararlo con el mercado' 
    });
    
    // Analyze conversation with the new context
    state.isTyping = true;
    loadingIndicator.style.display = 'block';
    
    try {
      const response = await analyzeConversation('');
      
      if (response.success) {
        state.messages.push({ 
          role: 'assistant', 
          content: response.next_question 
        });
      }
    } catch (error) {
      state.messages.push({ 
        role: 'assistant', 
        content: 'Por favor, cuéntame más sobre tu proyecto.' 
      });
    } finally {
      state.isTyping = false;
      loadingIndicator.style.display = 'none';
      renderMessages();
    }
  }
}

// Analyze conversation with AI
async function analyzeConversation(userMessage) {
  // Prepare messages for analysis (last 5 messages for context)
  const recentMessages = [...state.messages];
  if (userMessage) {
    recentMessages.push({ role: 'user', content: userMessage });
  }
  
  try {
    const response = await fetch('https://rw-intake.rw-consulting.workers.dev/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: recentMessages.slice(-5), // Last 5 messages for context
        currentData: state.currentData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Fallback to simulation mode if worker is not available
    console.warn('Worker not available, using simulation mode:', error.message);
    return simulateAnalysis(recentMessages, state.currentData);
  }
}

// Simulate AI analysis when worker is not available
function simulateAnalysis(messages, currentData) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // Simple logic to simulate AI responses
  if (!currentData.tipo) {
    return {
      success: true,
      analysis: 'Usuario inició conversación',
      missing_info: ['tipo_estudio'],
      next_question: '¿Qué tipo de estudio necesitas? (1) Proyecto por construir o (2) Proyecto activo',
      is_complete: false,
      extracted_data: {}
    };
  }
  
  if (!currentData.datos.nombre_proyecto) {
    return {
      success: true,
      analysis: 'Usuario seleccionó tipo de estudio',
      missing_info: ['nombre_proyecto', 'direccion', 'inmobiliaria'],
      next_question: '¿Cuál es el nombre del proyecto?',
      is_complete: false,
      extracted_data: {}
    };
  }
  
  // Continue with other fields...
  return {
    success: true,
    analysis: 'Continuando con recopilación de datos',
    missing_info: ['información_adicional'],
    next_question: 'Por favor, proporciona más detalles sobre tu proyecto.',
    is_complete: false,
    extracted_data: {}
  };
}

// Show summary and generate button
function showSummaryAndGenerate() {
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'summary-container';
  
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Resumen del estudio';
  summaryDiv.appendChild(summaryTitle);
  
  const summaryContent = document.createElement('div');
  summaryContent.className = 'summary-content';
  
  // Add summary of collected data
  const fields = [
    { key: 'nombre_proyecto', label: 'Nombre del proyecto:' },
    { key: 'direccion', label: 'Dirección/Sector:' },
    { key: 'inmobiliaria', label: 'Inmobiliaria/Desarrollador:' },
    { key: 'tipologias', label: 'Tipologías:' },
    { key: 'amenities', label: 'Amenities:' },
    { key: 'competencia', label: 'Competencia:' },
    { key: 'contacto_nombre', label: 'Tu nombre:' },
    { key: 'contacto_email', label: 'Tu email:' }
  ];
  
  fields.forEach(field => {
    if (state.currentData.datos[field.key]) {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'summary-field';
      
      const label = document.createElement('strong');
      label.textContent = field.label;
      
      const value = document.createElement('span');
      value.textContent = state.currentData.datos[field.key];
      
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(document.createTextNode(' '));
      fieldDiv.appendChild(value);
      summaryContent.appendChild(fieldDiv);
    }
  });
  
  summaryDiv.appendChild(summaryContent);
  
  // Add generate button
  const generateButton = document.createElement('button');
  generateButton.id = 'generate-button';
  generateButton.className = 'generate-button';
  generateButton.textContent = 'Generar estudio';
  generateButton.addEventListener('click', generateStudy);
  
  summaryDiv.appendChild(generateButton);
  
  // Add to chat
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant-message';
  messageDiv.appendChild(summaryDiv);
  
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Generate study
async function generateStudy() {
  const generateButton = document.getElementById('generate-button');
  if (!generateButton) return;
  
  // Disable button and show loading
  generateButton.disabled = true;
  generateButton.textContent = 'Generando...';
  
  // Add required fields if missing
  if (!state.currentData.datos.contacto_nombre) {
    state.currentData.datos.contacto_nombre = 'Cliente';
  }
  
  if (!state.currentData.datos.contacto_email) {
    state.currentData.datos.contacto_email = 'cliente@ejemplo.cl';
  }
  
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
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'success-message';
      
      const successTitle = document.createElement('h3');
      successTitle.textContent = '✅ Estudio generado correctamente';
      successDiv.appendChild(successTitle);
      
      const successText = document.createElement('p');
      successText.textContent = `Tu estudio ha sido generado con el código: ${result.codigo}`;
      successDiv.appendChild(successText);
      
      const infoText = document.createElement('p');
      infoText.className = 'info-text';
      infoText.textContent = 'El estudio está pendiente de revisión. Te contactaremos por email cuando esté listo.';
      successDiv.appendChild(infoText);
      
      // Add to chat
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message assistant-message';
      messageDiv.appendChild(successDiv);
      
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      
      // Remove generate button
      generateButton.remove();
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('Error generating study:', error);
    
    // Fallback to simulation mode
    console.warn('Worker not available, using simulation mode for generation');
    
    // Show success message with simulated data
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    
    const successTitle = document.createElement('h3');
    successTitle.textContent = '✅ Estudio generado correctamente (modo simulación)';
    successDiv.appendChild(successTitle);
    
    const successText = document.createElement('p');
    successText.textContent = 'Tu estudio ha sido generado con el código: EST-2026-TEST-1234 (modo simulación)';
    successDiv.appendChild(successText);
    
    const infoText = document.createElement('p');
    infoText.className = 'info-text';
    infoText.textContent = 'El estudio está pendiente de revisión. En producción, esto generaría un estudio real.';
    successDiv.appendChild(infoText);
    
    // Add to chat
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    messageDiv.appendChild(successDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Remove generate button
    generateButton.remove();
  }
}

// Add initial options to first message
state.messages[0].options = [
  { text: 'Tengo un proyecto por construir y quiero saber cómo posicionar precios', value: 'tipo1' },
  { text: 'Tengo un proyecto activo y quiero compararlo con el mercado', value: 'tipo2' }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initChat);