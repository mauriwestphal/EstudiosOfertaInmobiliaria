// Admin Console JavaScript
// RW Consulting — Consola de administración

const INTAKE_WORKER_URL = 'https://rw-intake.rw-consulting.workers.dev';
const PUBLISH_WORKER_URL = 'https://rw-publish.rw-consulting.workers.dev';

// State management
const state = {
  currentSection: 'dashboard',
  studies: [],
  filteredStudies: [],
  currentStudy: null,
  adminSecret: null,
  loading: false
};

// DOM elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const pendingCountElements = document.querySelectorAll('#pendingCount, #pendingCount2');
const statPending = document.getElementById('stat-pending');
const statApproved = document.getElementById('stat-approved');
const statRejected = document.getElementById('stat-rejected');
const statTotal = document.getElementById('stat-total');
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
  const urlParams = new URLSearchParams(window.location.search);
  state.adminSecret = urlParams.get('admin_secret');

  if (!state.adminSecret) {
    alert('Acceso no autorizado. Se requiere admin_secret en la URL.');
    window.location.href = 'index.html';
    return;
  }

  const now = new Date();
  currentDateElement.textContent = now.toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  setupEventListeners();
  loadStudies();
  showSection('dashboard');
}

function setupEventListeners() {
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) showSection(section);
    });
  });

  logoutButton.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión de administración?')) {
      window.location.href = 'index.html';
    }
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showTab(tab.dataset.tab);
    });
  });

  if (approveButton) approveButton.addEventListener('click', () => approveStudy());
  if (rejectButton) rejectButton.addEventListener('click', () => rejectStudy());
  if (refreshButton) refreshButton.addEventListener('click', loadStudies);
}

async function loadStudies() {
  if (state.loading) return;
  state.loading = true;

  try {
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

    const response = await fetch(`${INTAKE_WORKER_URL}/admin/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_secret: state.adminSecret })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    state.studies = result.success && Array.isArray(result.estudios) ? result.estudios : [];
    updateStats();
    renderStudiesTable();

  } catch (error) {
    console.error('Error loading studies:', error);
    if (studiesTableBody) {
      studiesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px;">
            <p style="color: var(--error); margin-bottom: 8px;">Error: ${error.message}</p>
            <p style="color: var(--text-muted); font-size: 0.85em;">Verifica que el intake-worker funcione y ADMIN_SECRET sea correcto.</p>
            <button onclick="loadStudies()" style="margin-top: 12px; padding: 8px 20px; background: var(--teal); color: white; border: none; border-radius: 6px; cursor: pointer;">Reintentar</button>
          </td>
        </tr>
      `;
    }
  } finally {
    state.loading = false;
  }
}

function updateStats() {
  const pending = state.studies.filter(s => s.estado === 'pendiente').length;
  const approved = state.studies.filter(s => s.estado === 'aprobado').length;
  const rejected = state.studies.filter(s => s.estado === 'rechazado').length;
  const total = state.studies.length;

  if (statPending) statPending.textContent = pending;
  if (statApproved) statApproved.textContent = approved;
  if (statRejected) statRejected.textContent = rejected;
  if (statTotal) statTotal.textContent = total;

  pendingCountElements.forEach(el => { el.textContent = pending; });
}

function renderStudiesTable() {
  if (!studiesTableBody) return;

  let filteredStudies = [];
  switch (state.currentSection) {
    case 'pending':    filteredStudies = state.studies.filter(s => s.estado === 'pendiente'); break;
    case 'approved':   filteredStudies = state.studies.filter(s => s.estado === 'aprobado'); break;
    case 'rejected':   filteredStudies = state.studies.filter(s => s.estado === 'rechazado'); break;
    default:           filteredStudies = state.studies;
  }

  state.filteredStudies = filteredStudies;

  if (filteredStudies.length === 0) {
    studiesTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg viewBox="0 0 20 20" fill="currentColor" width="40" height="40">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
          <p>No hay estudios en esta categoría</p>
        </td>
      </tr>
    `;
    return;
  }

  studiesTableBody.innerHTML = filteredStudies.map(study => `
    <tr data-study-id="${study.estudio_id}">
      <td><div class="study-code">${study.codigo}</div></td>
      <td><div class="study-project">${study.proyecto}</div><div class="study-client">${study.cliente || ''}</div></td>
      <td><div class="study-date">${study.createdAt ? new Date(study.createdAt).toLocaleDateString('es-CL') : '-'}</div></td>
      <td><span class="status-badge status-${study.estado}">${study.estado === 'pendiente' ? 'Pendiente' : study.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}</span></td>
      <td>${study.contacto_email || '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="action-button view" title="Ver detalles" onclick="viewStudy('${study.estudio_id}')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
          </button>
          ${study.estado === 'pendiente' ? `
            <button class="action-button approve" title="Aprobar" onclick="approveStudy('${study.estudio_id}')">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            </button>
            <button class="action-button reject" title="Rechazar" onclick="rejectStudy('${study.estudio_id}')">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function showSection(section) {
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
  contentSections.forEach(el => {
    el.classList.toggle('active', el.id === `${section}-section`);
  });
  state.currentSection = section;
  if (section !== 'settings') renderStudiesTable();
}

function viewStudy(estudioId) {
  const study = state.studies.find(s => s.estudio_id === estudioId);
  if (!study) return;

  state.currentStudy = study;

  document.querySelector('.modal-header h2').textContent = study.proyecto;
  document.querySelector('.study-code-modal').textContent = study.codigo;
  const statusEl = document.querySelector('.study-status-modal');
  statusEl.textContent = study.estado === 'pendiente' ? 'Pendiente' : study.estado === 'aprobado' ? 'Aprobado' : 'Rechazado';
  statusEl.className = `study-status-modal status-${study.estado}`;

  jsonViewer.textContent = JSON.stringify(study.json || {}, null, 2);

  const contactInfo = document.querySelector('#details-tab .study-contact-info');
  if (contactInfo) {
    contactInfo.innerHTML = `
      <p><strong>Contacto:</strong> ${study.contacto_nombre || 'No especificado'}</p>
      <p><strong>Email:</strong> ${study.contacto_email || 'No especificado'}</p>
      <p><strong>Tipo:</strong> ${study.tipo === 'tipo1' ? 'Nueva oferta' : study.tipo === 'tipo2' ? 'Posicionamiento' : study.tipo || 'No especificado'}</p>
      <p><strong>Código:</strong> ${study.codigo}</p>
      <p><strong>Fecha solicitud:</strong> ${study.createdAt ? new Date(study.createdAt).toLocaleString('es-CL') : '-'}</p>
    `;
  }

  approveButton.style.display = study.estado === 'pendiente' ? 'inline-block' : 'none';
  rejectButton.style.display = study.estado === 'pendiente' ? 'inline-block' : 'none';

  modalOverlay.classList.add('active');
  showTab('details');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  state.currentStudy = null;
}

function showTab(tabId) {
  modalTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabId));
  tabContents.forEach(el => el.classList.toggle('active', el.id === `${tabId}-tab`));
}

async function approveStudy(estudioId) {
  const study = (estudioId ? state.studies.find(s => s.estudio_id === estudioId) : state.currentStudy);
  if (!study) return;

  if (!confirm(`¿Aprobar el estudio ${study.codigo}?\n\nEsto publicará el JSON en GitHub y enviará un email al cliente.`)) return;

  try {
    const response = await fetch(`${PUBLISH_WORKER_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudio_id: study.estudio_id,
        codigo: study.codigo,
        json: study.json,
        email_cliente: study.contacto_email,
        cliente_nombre: study.contacto_nombre || study.cliente || '',
        proyecto_nombre: study.proyecto,
        admin_secret: state.adminSecret
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      study.estado = 'aprobado';
      updateStats();
      renderStudiesTable();

      if (state.currentStudy) closeModal();

      alert(`✅ Estudio ${study.codigo} publicado correctamente.\n\n${result.email_sent ? '📧 Email enviado.' : '⚠️ Email no enviado.'}`);
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('Error approving study:', error);
    alert(`❌ Error al aprobar: ${error.message}`);
  }
}

async function rejectStudy(estudioId) {
  const study = (estudioId ? state.studies.find(s => s.estudio_id === estudioId) : state.currentStudy);
  if (!study) return;

  const reason = prompt(`¿Por qué rechazas el estudio ${study.codigo}? (opcional)`);
  if (reason === null) return;

  try {
    const response = await fetch(`${INTAKE_WORKER_URL}/admin/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudio_id: study.estudio_id, admin_secret: state.adminSecret, motivo: reason || '' })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    study.estado = 'rechazado';
    updateStats();
    renderStudiesTable();
    if (state.currentStudy) closeModal();
    alert(`Estudio ${study.codigo} rechazado.`);
  } catch (error) {
    console.error('Error rejecting study:', error);
    alert(`Error al rechazar: ${error.message}`);
  }
}

window.viewStudy = viewStudy;
window.approveStudy = approveStudy;
window.rejectStudy = rejectStudy;
window.loadStudies = loadStudies;

document.addEventListener('DOMContentLoaded', initAdminConsole);
