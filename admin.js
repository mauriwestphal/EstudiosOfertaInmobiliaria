// Admin Console JavaScript
// RW Consulting — Consola de administración

// State management
const state = {
  currentSection: 'dashboard',
  studies: [],
  filteredStudies: [],
  currentStudy: null,
  adminSecret: null
};

// DOM elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const pendingCountElements = document.querySelectorAll('#pendingCount, #pendingCount2');
const statPending = document.getElementById('stat-pending');
const statApproved = document.getElementById('stat-approved');
const statRejected = document.getElementById('stat-rejected');
const logoutButton = document.getElementById('logoutButton');
const currentDateElement = document.getElementById('current-date');
const studiesTableBody = document.querySelector('#studies-table tbody');
const modalOverlay = document.querySelector('.modal-overlay');
const modalClose = document.querySelector('.modal-close');
const modalTabs = document.querySelectorAll('.modal-tab');
const tabContents = document.querySelectorAll('.tab-content');
const jsonViewer = document.querySelector('.json-viewer');
const approveButton = document.getElementById('approveButton');
const rejectButton = document.getElementById('rejectButton');
const refreshButton = document.getElementById('refreshButton');

// Initialize admin console
function initAdminConsole() {
  // Check for admin secret in URL
  const urlParams = new URLSearchParams(window.location.search);
  state.adminSecret = urlParams.get('admin_secret');
  
  if (!state.adminSecret) {
    alert('Acceso no autorizado. Se requiere admin_secret en la URL.');
    window.location.href = 'index.html';
    return;
  }
  
  // Set current date
  const now = new Date();
  currentDateElement.textContent = now.toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Load studies
  loadStudies();
  
  // Show dashboard by default
  showSection('dashboard');
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) {
        showSection(section);
      }
    });
  });
  
  // Logout
  logoutButton.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión de administración?')) {
      window.location.href = 'index.html';
    }
  });
  
  // Modal
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Modal tabs
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      showTab(tabId);
    });
  });
  
  // Study actions
  if (approveButton) {
    approveButton.addEventListener('click', approveStudy);
  }
  
  if (rejectButton) {
    rejectButton.addEventListener('click', rejectStudy);
  }
  
  if (refreshButton) {
    refreshButton.addEventListener('click', loadStudies);
  }
}

// Load studies from API
async function loadStudies() {
  try {
    // Show loading state
    if (studiesTableBody) {
      studiesTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="loading">
            <div class="loading-spinner"></div>
            Cargando estudios...
          </td>
        </tr>
      `;
    }
    
    // In production, this would call the admin API
    // For now, simulate loading
    setTimeout(() => {
      // Simulated data
      state.studies = [
        {
          id: '1',
          codigo: 'EST-2026-KI-4V7P',
          proyecto: 'Edificio PUQON',
          cliente: 'Klein Inmobiliaria',
          fecha: '2026-04-05',
          estado: 'pendiente',
          contacto_email: 'cliente@ejemplo.cl',
          json: {
            meta: {
              codigo: 'EST-2026-KI-4V7P',
              version_esquema: '2.0',
              proyecto: 'Edificio PUQON',
              direccion: 'Calle Principal 123, Pucón',
              cliente: 'Klein Inmobiliaria',
              autor: 'RW Consulting',
              fecha: '2026-04-05'
            },
            proyecto_evaluado: {
              nombre: 'Edificio PUQON',
              desarrollador: 'Klein Inmobiliaria',
              direccion: 'Calle Principal 123, Pucón',
              sector: 'Centro',
              total_unidades: 50,
              precio_promedio_uf: 1800,
              uf_m2_neto_depto: 32.5
            }
          }
        },
        {
          id: '2',
          codigo: 'EST-2026-GV-9X2M',
          proyecto: 'Condominio Vicuña',
          cliente: 'Grupo Vicuña',
          fecha: '2026-04-03',
          estado: 'aprobado',
          contacto_email: 'vicuña@ejemplo.cl',
          json: {
            meta: {
              codigo: 'EST-2026-GV-9X2M',
              version_esquema: '2.0',
              proyecto: 'Condominio Vicuña',
              direccion: 'Av. Principal 456, Peñaflor',
              cliente: 'Grupo Vicuña',
              autor: 'RW Consulting',
              fecha: '2026-04-03'
            },
            proyecto_evaluado: {
              nombre: 'Condominio Vicuña',
              desarrollador: 'Grupo Vicuña',
              direccion: 'Av. Principal 456, Peñaflor',
              sector: 'Residencial',
              total_unidades: 120,
              precio_promedio_uf: 2200,
              uf_m2_neto_depto: 28.7
            }
          }
        }
      ];
      
      updateStats();
      renderStudiesTable();
    }, 1000);
    
  } catch (error) {
    console.error('Error loading studies:', error);
    if (studiesTableBody) {
      studiesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--error); padding: 40px;">
            Error al cargar los estudios. Intenta nuevamente.
          </td>
        </tr>
      `;
    }
  }
}

// Update statistics
function updateStats() {
  const pending = state.studies.filter(s => s.estado === 'pendiente').length;
  const approved = state.studies.filter(s => s.estado === 'aprobado').length;
  const rejected = state.studies.filter(s => s.estado === 'rechazado').length;
  const total = state.studies.length;
  
  // Update stats cards
  if (statPending) statPending.textContent = pending;
  if (statApproved) statApproved.textContent = approved;
  if (statRejected) statRejected.textContent = rejected;
  
  // Update badge counts
  pendingCountElements.forEach(el => {
    el.textContent = pending;
  });
}

// Render studies table
function renderStudiesTable() {
  if (!studiesTableBody) return;
  
  // Filter studies based on current section
  let filteredStudies = [];
  switch (state.currentSection) {
    case 'pending':
      filteredStudies = state.studies.filter(s => s.estado === 'pendiente');
      break;
    case 'approved':
      filteredStudies = state.studies.filter(s => s.estado === 'aprobado');
      break;
    case 'rejected':
      filteredStudies = state.studies.filter(s => s.estado === 'rechazado');
      break;
    default:
      filteredStudies = state.studies;
  }
  
  state.filteredStudies = filteredStudies;
  
  if (filteredStudies.length === 0) {
    studiesTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
          <p>No hay estudios en esta categoría</p>
        </td>
      </tr>
    `;
    return;
  }
  
  studiesTableBody.innerHTML = filteredStudies.map(study => `
    <tr data-study-id="${study.id}">
      <td>
        <div class="study-code">${study.codigo}</div>
      </td>
      <td>
        <div class="study-project">${study.proyecto}</div>
        <div class="study-client">${study.cliente}</div>
      </td>
      <td>
        <div class="study-date">${study.fecha}</div>
      </td>
      <td>
        <span class="status-badge status-${study.estado}">
          ${study.estado === 'pendiente' ? 'Pendiente' : 
            study.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
        </span>
      </td>
      <td>
        ${study.contacto_email}
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-button view" title="Ver detalles" onclick="viewStudy('${study.id}')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
            </svg>
          </button>
          ${study.estado === 'pendiente' ? `
            <button class="action-button approve" title="Aprobar" onclick="approveStudy('${study.id}')">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button class="action-button reject" title="Rechazar" onclick="rejectStudy('${study.id}')">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Show section
function showSection(section) {
  // Update navigation
  navItems.forEach(item => {
    if (item.dataset.section === section) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update content sections
  contentSections.forEach(contentSection => {
    if (contentSection.id === `${section}-section`) {
      contentSection.classList.add('active');
    } else {
      contentSection.classList.remove('active');
    }
  });
  
  // Update state
  state.currentSection = section;
  
  // Render studies table for this section
  if (section !== 'settings') {
    renderStudiesTable();
  }
}

// View study details
function viewStudy(studyId) {
  const study = state.studies.find(s => s.id === studyId);
  if (!study) return;
  
  state.currentStudy = study;
  
  // Update modal content
  document.querySelector('.modal-header h2').textContent = study.proyecto;
  document.querySelector('.study-code-modal').textContent = study.codigo;
  document.querySelector('.study-status-modal').textContent = 
    study.estado === 'pendiente' ? 'Pendiente' : 
    study.estado === 'aprobado' ? 'Aprobado' : 'Rechazado';
  document.querySelector('.study-status-modal').className = `study-status-modal status-${study.estado}`;
  
  // Show JSON in viewer
  jsonViewer.textContent = JSON.stringify(study.json, null, 2);
  
  // Update action buttons
  if (study.estado === 'pendiente') {
    approveButton.style.display = 'inline-block';
    rejectButton.style.display = 'inline-block';
  } else {
    approveButton.style.display = 'none';
    rejectButton.style.display = 'none';
  }
  
  // Show modal
  modalOverlay.classList.add('active');
  showTab('details');
}

// Close modal
function closeModal() {
  modalOverlay.classList.remove('active');
  state.currentStudy = null;
}

// Show tab in modal
function showTab(tabId) {
  modalTabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  tabContents.forEach(content => {
    if (content.id === `${tabId}-tab`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// Approve study
async function approveStudy(studyId) {
  const study = studyId ? state.studies.find(s => s.id === studyId) : state.currentStudy;
  if (!study) return;
  
  if (!confirm(`¿Aprobar el estudio ${study.codigo}? Esto publicará el estudio y enviará un email al cliente.`)) {
    return;
  }
  
  try {
    // Call publish-worker
    const response = await fetch('https://rw-publish.rw-consulting.workers.dev/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.adminSecret}`
      },
      body: JSON.stringify({
        estudio_id: study.id,
        codigo: study.codigo,
        json: study.json,
        email_cliente: study.contacto_email,
        cliente_nombre: study.cliente,
        proyecto_nombre: study.proyecto
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Update study status
      study.estado = 'aprobado';
      
      // Update UI
      updateStats();
      renderStudiesTable();
      
      if (state.currentStudy) {
        closeModal();
      }
      
      alert(`Estudio ${study.codigo} aprobado y publicado correctamente.\n\nEmail enviado: ${result.email_sent ? 'Sí' : 'No'}\nCommit: ${result.github?.commit_url || 'N/A'}`);
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
    
  } catch (error) {
    console.error('Error approving study:', error);
    alert(`Error al aprobar el estudio: ${error.message}\n\nEl estudio no se publicó. Intenta nuevamente.`);
  }
}

// Reject study
async function rejectStudy(studyId) {
  const study = studyId ? state.studies.find(s => s.id === studyId) : state.currentStudy;
  if (!study) return;
  
  const reason = prompt(`¿Por qué rechazas el estudio ${study.codigo}? (opcional)`);
  
  if (reason === null) {
    return; // User cancelled
  }
  
  try {
    // In production, this would call the admin API
    // For now, simulate rejection
    study.estado = 'rechazado';
    
    // Update UI
    updateStats();
    renderStudiesTable();
    
    if (state.currentStudy) {
      closeModal();
    }
    
    alert(`Estudio ${study.codigo} rechazado.`);
    
  } catch (error) {
    console.error('Error rejecting study:', error);
    alert('Error al rechazar el estudio. Intenta nuevamente.');
  }
}

// Make functions available globally
window.viewStudy = viewStudy;
window.approveStudy = approveStudy;
window.rejectStudy = rejectStudy;

// Initialize on load
document.addEventListener('DOMContentLoaded', initAdminConsole);