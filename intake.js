// State management
const state = {
  currentStep: 0,
  studyType: null,
  collectedData: {},
  isTyping: false
};

// Conversation flow definition
const conversationFlow = [
  // Step 0: Welcome and study type selection
  {
    type: 'agent',
    content: 'Hola, soy el asistente de RW Consulting. ¿Qué tipo de estudio necesitas?',
    options: [
      { text: 'Tengo un proyecto por construir y quiero saber cómo posicionar precios', value: 'tipo1' },
      { text: 'Tengo un proyecto activo y quiero compararlo con el mercado', value: 'tipo2' }
    ]
  },
  // Step 1: Project name (both types)
  {
    type: 'agent',
    content: 'Perfecto. ¿Cuál es el nombre del proyecto?',
    field: 'nombre_proyecto'
  },
  // Step 2: Address or sector
  {
    type: 'agent',
    content: '¿En qué dirección o sector se emplazará el proyecto?',
    field: 'direccion'
  },
  // Step 3: Real estate company/developer
  {
    type: 'agent',
    content: '¿Nombre de la inmobiliaria o desarrollador?',
    field: 'inmobiliaria'
  },
  // Step 4: Typologies (Tipo 1) or Price list (Tipo 2)
  {
    type: 'conditional',
    condition: (state) => state.studyType === 'tipo1',
    content: 'Describe las tipologías planificadas (ej: "30 departamentos 2D+2B de 55m2 y 20 de 1D+1B de 38m2")',
    field: 'tipologias'
  },
  {
    type: 'conditional',
    condition: (state) => state.studyType === 'tipo2',
    content: 'Describe la lista de precios actual (distribución, orientación, m2 útil, terraza, precio en UF)',
    field: 'precios_propios'
  },
  // Step 5: Amenities
  {
    type: 'agent',
    content: '¿Qué amenities incluirá el proyecto?',
    field: 'amenities'
  },
  // Step 6: Competition
  {
    type: 'agent',
    content: '¿Qué proyectos de la competencia quieres comparar? (nombres, sectores)',
    field: 'competencia'
  },
  // Step 7: Contact name
  {
    type: 'agent',
    content: '¿Tu nombre completo?',
    field: 'contacto_nombre'
  },
  // Step 8: Contact email
  {
    type: 'agent',
    content: '¿Tu email?',
    field: 'contacto_email',
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Por favor ingresa un email válido';
    }
  },
  // Step 9: Summary and confirmation
  {
    type: 'summary',
    content: 'Revisa los datos recopilados:'
  }
];

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const statusMessage = document.getElementById('statusMessage');
const chatContainer = document.querySelector('.chat-container');

// Initialize conversation
function initConversation() {
  state.currentStep = 0;
  state.studyType = null;
  state.collectedData = {};
  chatMessages.innerHTML = '';
  statusMessage.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  showNextStep();
}

// Show next step in conversation
function showNextStep() {
  const step = conversationFlow[state.currentStep];
  
  if (step.type === 'conditional') {
    if (!step.condition(state)) {
      state.currentStep++;
      showNextStep();
      return;
    }
  }

  if (step.type === 'summary') {
    showSummary();
    return;
  }

  showTypingIndicator(() => {
    addMessage('agent', step.content);
    
    if (step.options) {
      showOptions(step.options);
    } else {
      enableInput();
    }
  });
}

// Show typing indicator
function showTypingIndicator(callback) {
  state.isTyping = true;
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message-typing';
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setTimeout(() => {
    chatMessages.removeChild(typingDiv);
    state.isTyping = false;
    callback();
  }, 1000);
}

// Add message to chat
function addMessage(sender, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${sender}`;
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show option buttons
function showOptions(options) {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  
  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'option-button';
    button.textContent = option.text;
    button.onclick = () => handleOptionSelect(option.value);
    optionsContainer.appendChild(button);
  });
  
  chatMessages.appendChild(optionsContainer);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle option selection
function handleOptionSelect(value) {
  if (state.currentStep === 0) {
    state.studyType = value;
  }
  
  const step = conversationFlow[state.currentStep];
  if (step.field) {
    state.collectedData[step.field] = value;
  }
  
  addMessage('user', getOptionText(value));
  removeOptions();
  state.currentStep++;
  showNextStep();
}

// Get option text for display
function getOptionText(value) {
  const step = conversationFlow[state.currentStep];
  if (!step.options) return value;
  
  const option = step.options.find(opt => opt.value === value);
  return option ? option.text : value;
}

// Remove option buttons
function removeOptions() {
  const optionsContainer = chatMessages.querySelector('.options-container');
  if (optionsContainer) {
    chatMessages.removeChild(optionsContainer);
  }
}

// Enable text input
function enableInput() {
  chatInput.disabled = false;
  sendButton.disabled = false;
  chatInput.focus();
}

// Disable text input
function disableInput() {
  chatInput.disabled = true;
  sendButton.disabled = true;
}

// Handle send button click
function handleSend() {
  const value = chatInput.value.trim();
  if (!value || state.isTyping) return;

  const step = conversationFlow[state.currentStep];
  
  // Validation
  if (step.validation) {
    const validationResult = step.validation(value);
    if (typeof validationResult === 'string') {
      showTypingIndicator(() => {
        addMessage('agent', validationResult);
      });
      return;
    }
  }

  // Store data
  if (step.field) {
    state.collectedData[step.field] = value;
  }

  // Add user message
  addMessage('user', value);
  chatInput.value = '';
  disableInput();

  // Move to next step
  state.currentStep++;
  
  if (state.currentStep < conversationFlow.length) {
    showNextStep();
  }
}

// Show summary of collected data
function showSummary() {
  showTypingIndicator(() => {
    addMessage('agent', conversationFlow[state.currentStep].content);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-container';
    
    let summaryHTML = '<h3>Resumen del estudio</h3>';
    
    const fieldLabels = {
      nombre_proyecto: 'Nombre del proyecto',
      direccion: 'Dirección/Sector',
      inmobiliaria: 'Inmobiliaria/Desarrollador',
      tipologias: 'Tipologías',
      precios_propios: 'Lista de precios',
      amenities: 'Amenities',
      competencia: 'Competencia a comparar',
      contacto_nombre: 'Nombre de contacto',
      contacto_email: 'Email de contacto'
    };
    
    Object.keys(fieldLabels).forEach(field => {
      if (state.collectedData[field]) {
        summaryHTML += `
          <div class="summary-item">
            <span class="summary-label">${fieldLabels[field]}:</span>
            <span class="summary-value">${state.collectedData[field]}</span>
          </div>
        `;
      }
    });
    
    summaryHTML += `
      <div class="summary-actions">
        <button class="action-button action-confirm" id="confirmButton">Confirmar y enviar</button>
        <button class="action-button action-edit" id="editButton">Editar datos</button>
      </div>
    `;
    
    summaryDiv.innerHTML = summaryHTML;
    chatMessages.appendChild(summaryDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add event listeners for summary buttons
    document.getElementById('confirmButton').onclick = submitStudy;
    document.getElementById('editButton').onclick = () => {
      chatMessages.removeChild(summaryDiv);
      state.currentStep = 0;
      initConversation();
    };
  });
}

// Submit study to intake-worker
async function submitStudy() {
  showTypingIndicator(() => {
    addMessage('agent', 'Enviando solicitud...');
    
    // Prepare data for API
    const studyData = {
      tipo: state.studyType,
      datos: state.collectedData
    };
    
    // For now, simulate API call
    setTimeout(() => {
      chatContainer.classList.add('hidden');
      statusMessage.classList.remove('hidden');
      
      // In production, this would call the intake-worker
      // fetch('https://rw-intake.rw-consulting.workers.dev/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(studyData)
      // })
      // .then(response => response.json())
      // .then(data => {
      //   if (data.success) {
      //     chatContainer.classList.add('hidden');
      //     statusMessage.classList.remove('hidden');
      //   } else {
      //     addMessage('agent', 'Hubo un error al enviar la solicitud. Por favor intenta nuevamente.');
      //   }
      // })
      // .catch(error => {
      //   addMessage('agent', 'El servicio está en mantenimiento. Por favor contacta a Mauricio directamente.');
      // });
    }, 1500);
  });
}

// Event listeners
sendButton.addEventListener('click', handleSend);

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

chatInput.addEventListener('input', () => {
  sendButton.disabled = chatInput.value.trim() === '' || state.isTyping;
  
  // Auto-resize textarea
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// Start conversation
initConversation();