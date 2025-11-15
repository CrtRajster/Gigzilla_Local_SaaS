/**
 * Gigzilla Main App Controller
 * Handles navigation, modals, and view management
 */

class GigzillaApp {
  constructor() {
    this.store = window.gigzillaStore;
    this.currentView = 'dashboard';

    // Initialize views
    this.views = {
      dashboard: new DashboardView(this.store),
      pipeline: new PipelineView(this.store),
      clients: new ClientsView(this.store),
      money: new MoneyView(this.store)
    };

    // Make views globally accessible for event handlers
    window.dashboardView = this.views.dashboard;
    window.pipelineView = this.views.pipeline;
    window.clientsView = this.views.clients;
    window.moneyView = this.views.money;

    this.init();
  }

  init() {
    console.log('[APP] Gigzilla App initialized');
    this.renderCurrentView();
    this.setupNavigation();
  }

  setupNavigation() {
    // Set up sidebar navigation
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.navigateTo(view);
      });
    });
  }

  navigateTo(viewName) {
    if (!this.views[viewName]) {
      console.error(`[APP] View "${viewName}" not found`);
      return;
    }

    this.currentView = viewName;
    this.renderCurrentView();
    this.updateActiveNav();
  }

  renderCurrentView() {
    const container = document.getElementById('main-content');
    if (!container) {
      console.error('[APP] Main content container not found');
      return;
    }

    const view = this.views[this.currentView];
    container.innerHTML = view.render();
  }

  refreshCurrentView() {
    this.renderCurrentView();
  }

  updateActiveNav() {
    document.querySelectorAll('[data-view]').forEach(item => {
      if (item.dataset.view === this.currentView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // ==========================================
  // MODAL SYSTEM
  // ==========================================

  showModal(title, content, buttons = []) {
    const existingModal = document.querySelector('.modal-backdrop');
    if (existingModal) {
      existingModal.remove();
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttons.map((btn, idx) => `
            <button class="btn ${btn.class || 'btn-secondary'}" data-button-index="${idx}">
              ${btn.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add click handlers to buttons
    backdrop.querySelectorAll('[data-button-index]').forEach(btn => {
      const index = parseInt(btn.dataset.buttonIndex);
      if (buttons[index] && buttons[index].onclick) {
        btn.addEventListener('click', buttons[index].onclick);
      }
    });

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeModal();
      }
    });

    document.body.appendChild(backdrop);
  }

  closeModal() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
      modal.remove();
    }
  }

  // ==========================================
  // NEW CLIENT MODAL
  // ==========================================

  showNewClientModal() {
    this.showModal('✨ New Client', `
      <div class="form-field">
        <label class="form-label">Company Name *</label>
        <input type="text" class="form-input" id="new-client-name" placeholder="Acme Corp" autofocus required>
      </div>
      <div class="form-field">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="new-client-email" placeholder="john@acme.com">
      </div>
      <div class="form-field">
        <label class="form-label">Phone</label>
        <input type="tel" class="form-input" id="new-client-phone" placeholder="+1 (555) 123-4567">
      </div>
      <div class="form-field">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="new-client-notes" placeholder="Additional notes..."></textarea>
      </div>
    `, [
      {
        label: 'Create Client',
        class: 'btn-primary',
        onclick: () => {
          const name = document.getElementById('new-client-name').value.trim();
          if (!name) {
            alert('Please enter a company name');
            return;
          }

          this.store.addClient({
            name: name,
            email: document.getElementById('new-client-email').value.trim(),
            phone: document.getElementById('new-client-phone').value.trim(),
            notes: document.getElementById('new-client-notes').value.trim()
          });

          this.closeModal();
          this.refreshCurrentView();
        }
      },
      {
        label: 'Cancel',
        class: 'btn-ghost',
        onclick: () => this.closeModal()
      }
    ]);
  }

  // ==========================================
  // NEW PROJECT MODAL
  // ==========================================

  showNewProjectModal(preselectedClientId = null) {
    const clients = this.store.getAllClients();

    this.showModal('✨ New Project', `
      <div class="form-field">
        <label class="form-label">Project Name *</label>
        <input type="text" class="form-input" id="new-project-name" placeholder="Logo design" autofocus required>
      </div>
      <div class="form-field">
        <label class="form-label">Client *</label>
        ${clients.length > 0 ? `
          <select class="form-select" id="new-project-client">
            <option value="">Select a client...</option>
            ${clients.map(client => `
              <option value="${client.id}" ${preselectedClientId === client.id ? 'selected' : ''}>
                ${client.name}
              </option>
            `).join('')}
            <option value="__new__">+ Add new client</option>
          </select>
        ` : `
          <input type="text" class="form-input" id="new-project-client-name" placeholder="Client name">
          <div style="font-size: 13px; color: var(--gray-500); margin-top: 4px;">
            No clients yet. Enter a name to create one.
          </div>
        `}
      </div>
      <div class="form-field">
        <label class="form-label">Amount (€) *</label>
        <input type="number" class="form-input" id="new-project-amount" placeholder="1500" min="0" step="0.01" required>
      </div>
      <div class="form-field">
        <label class="form-label">Deadline</label>
        <input type="date" class="form-input" id="new-project-deadline">
      </div>
      <div class="form-field">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="new-project-description" placeholder="Project details..."></textarea>
      </div>
    `, [
      {
        label: 'Create Project',
        class: 'btn-primary',
        onclick: () => {
          const name = document.getElementById('new-project-name').value.trim();
          const amount = parseFloat(document.getElementById('new-project-amount').value);

          if (!name || !amount) {
            alert('Please enter a project name and amount');
            return;
          }

          let clientId;
          const clientSelect = document.getElementById('new-project-client');
          const clientNameInput = document.getElementById('new-project-client-name');

          if (clientSelect) {
            const selectedValue = clientSelect.value;
            if (!selectedValue) {
              alert('Please select a client');
              return;
            }
            if (selectedValue === '__new__') {
              const clientName = prompt('Enter new client name:');
              if (!clientName) return;
              const newClient = this.store.addClient({ name: clientName });
              clientId = newClient.id;
            } else {
              clientId = selectedValue;
            }
          } else if (clientNameInput) {
            const clientName = clientNameInput.value.trim();
            if (!clientName) {
              alert('Please enter a client name');
              return;
            }
            const newClient = this.store.addClient({ name: clientName });
            clientId = newClient.id;
          }

          this.store.addProject({
            name: name,
            clientId: clientId,
            amount: amount,
            deadline: document.getElementById('new-project-deadline').value,
            description: document.getElementById('new-project-description').value.trim()
          });

          this.closeModal();
          this.refreshCurrentView();
        }
      },
      {
        label: 'Cancel',
        class: 'btn-ghost',
        onclick: () => this.closeModal()
      }
    ]);
  }

  // ==========================================
  // NEW INVOICE MODAL
  // ==========================================

  showNewInvoiceModal() {
    const projects = this.store.getAllProjects().filter(p => p.status === 'done' || p.status === 'working');
    const clients = this.store.getAllClients();

    this.showModal('📧 New Invoice', `
      <div class="form-field">
        <label class="form-label">Client *</label>
        <select class="form-select" id="new-invoice-client" onchange="gigzillaApp.updateProjectsForClient()" required>
          <option value="">Select a client...</option>
          ${clients.map(client => `
            <option value="${client.id}">${client.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-field">
        <label class="form-label">Project (optional)</label>
        <select class="form-select" id="new-invoice-project">
          <option value="">Select a project...</option>
        </select>
      </div>
      <div class="form-field">
        <label class="form-label">Amount (€) *</label>
        <input type="number" class="form-input" id="new-invoice-amount" placeholder="1500" min="0" step="0.01" required>
      </div>
      <div class="form-field">
        <label class="form-label">Due Date</label>
        <input type="date" class="form-input" id="new-invoice-duedate" value="${this.store.getDefaultDueDate()}">
      </div>
      <div class="form-field">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="new-invoice-notes" placeholder="Payment terms, thank you note, etc."></textarea>
      </div>
    `, [
      {
        label: 'Create Invoice',
        class: 'btn-primary',
        onclick: () => {
          const clientId = document.getElementById('new-invoice-client').value;
          const amount = parseFloat(document.getElementById('new-invoice-amount').value);

          if (!clientId || !amount) {
            alert('Please select a client and enter an amount');
            return;
          }

          const projectId = document.getElementById('new-invoice-project').value || null;

          this.store.addInvoice({
            clientId: clientId,
            projectId: projectId,
            amount: amount,
            dueDate: document.getElementById('new-invoice-duedate').value,
            notes: document.getElementById('new-invoice-notes').value.trim()
          });

          this.closeModal();
          this.refreshCurrentView();
        }
      },
      {
        label: 'Cancel',
        class: 'btn-ghost',
        onclick: () => this.closeModal()
      }
    ]);
  }

  updateProjectsForClient() {
    const clientId = document.getElementById('new-invoice-client').value;
    const projectSelect = document.getElementById('new-invoice-project');

    if (!clientId || !projectSelect) return;

    const projects = this.store.getProjectsByClient(clientId);
    projectSelect.innerHTML = `
      <option value="">Select a project...</option>
      ${projects.map(project => `
        <option value="${project.id}">${project.name} (€${project.amount})</option>
      `).join('')}
    `;

    // Auto-fill amount if only one project
    if (projects.length === 1) {
      document.getElementById('new-invoice-amount').value = projects[0].amount;
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gigzillaApp = new GigzillaApp();
  });
} else {
  window.gigzillaApp = new GigzillaApp();
}
