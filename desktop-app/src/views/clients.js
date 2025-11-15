/**
 * Clients View
 * Apple Notes-style clean list with expandable details
 */

class ClientsView {
  constructor(store) {
    this.store = store;
    this.searchQuery = '';
  }

  async render() {
    const clients = this.searchQuery
      ? await this.store.searchClients(this.searchQuery)
      : await this.store.getAllClients();

    // Render all client cards (async operation)
    const clientCards = clients.length > 0
      ? (await Promise.all(clients.map(client => this.renderClientCard(client)))).join('')
      : `
          <div style="text-align: center; padding: 48px; color: var(--gray-400);">
            <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
            <div style="font-size: 16px; margin-bottom: 8px;">No clients yet</div>
            <div style="font-size: 14px;">Add your first client to get started</div>
          </div>
        `;

    return `
      <div class="view-header">
        <h1 class="view-title">👥 Clients</h1>
        <div class="view-actions">
          <input type="search"
                 placeholder="Search clients..."
                 class="form-input"
                 style="width: 250px;"
                 oninput="clientsView.handleSearch(event)"
                 value="${this.searchQuery}">
          <button class="btn btn-primary" onclick="gigzillaApp.showNewClientModal()">
            + New Client
          </button>
        </div>
      </div>

      <div class="clients-container">
        ${clientCards}
      </div>
    `;
  }

  async renderClientCard(client) {
    const stats = await this.store.getClientStats(client.id);
    const projects = await this.store.getProjectsByClient(client.id);
    const recentProjects = projects.slice(0, 3);

    return `
      <div class="client-card">
        <div class="client-header">
          <div class="client-name">🏢 ${client.name}</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="clientsView.editClient('${client.id}')">
              Edit
            </button>
            <button class="btn btn-ghost btn-sm" onclick="clientsView.deleteClient('${client.id}')">
              Delete
            </button>
          </div>
        </div>

        <div class="client-contact">
          ${client.email ? `${client.email}` : ''}
          ${client.email && client.phone ? ' • ' : ''}
          ${client.phone ? `${client.phone}` : ''}
        </div>

        <hr class="client-divider">

        <div class="client-stats">
          ${stats.projectCount} project${stats.projectCount !== 1 ? 's' : ''} •
          €${stats.totalRevenue.toLocaleString()} total revenue •
          ${stats.activeProjects} active
        </div>

        ${recentProjects.length > 0 ? `
          <div class="expandable-section" id="client-${client.id}-projects">
            <div class="expandable-header" onclick="clientsView.toggleExpand('${client.id}')">
              <span class="expand-icon">▶</span>
              <span>Recent projects</span>
            </div>
            <div class="expandable-content">
              ${recentProjects.map(project => `
                <div class="client-project-item">
                  • ${project.name} (€${project.amount.toLocaleString()}) -
                  ${this.getStatusLabel(project.status)}
                </div>
              `).join('')}
              ${projects.length > 3 ? `
                <div class="client-project-item" style="color: var(--gray-400);">
                  + ${projects.length - 3} more...
                </div>
              ` : ''}
            </div>
          </div>

          <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="clientsView.viewAllProjects('${client.id}')">
              View All Projects
            </button>
            <button class="btn btn-ghost btn-sm" onclick="gigzillaApp.showNewProjectModal('${client.id}')">
              + New Project
            </button>
          </div>
        ` : `
          <div style="margin-top: 16px;">
            <button class="btn btn-ghost btn-sm" onclick="gigzillaApp.showNewProjectModal('${client.id}')">
              + Add First Project
            </button>
          </div>
        `}
      </div>
    `;
  }

  toggleExpand(clientId) {
    const section = document.getElementById(`client-${clientId}-projects`);
    if (section) {
      section.classList.toggle('expanded');
    }
  }

  handleSearch(event) {
    this.searchQuery = event.target.value;
    gigzillaApp.refreshCurrentView();
  }

  async editClient(clientId) {
    const client = await this.store.getClient(clientId);
    if (!client) return;

    gigzillaApp.showModal('Edit Client', `
      <div class="form-field">
        <label class="form-label">Company Name *</label>
        <input type="text" class="form-input" id="edit-client-name" value="${client.name}" required>
      </div>
      <div class="form-field">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="edit-client-email" value="${client.email || ''}">
      </div>
      <div class="form-field">
        <label class="form-label">Phone</label>
        <input type="tel" class="form-input" id="edit-client-phone" value="${client.phone || ''}">
      </div>
      <div class="form-field">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="edit-client-notes">${client.notes || ''}</textarea>
      </div>
    `, [
      {
        label: 'Save',
        class: 'btn-primary',
        onclick: async () => {
          const name = document.getElementById('edit-client-name').value.trim();
          if (!name) {
            alert('Please enter a company name');
            return;
          }

          await this.store.updateClient(clientId, {
            name: name,
            email: document.getElementById('edit-client-email').value.trim(),
            phone: document.getElementById('edit-client-phone').value.trim(),
            notes: document.getElementById('edit-client-notes').value.trim()
          });

          gigzillaApp.closeModal();
          await gigzillaApp.refreshCurrentView();
        }
      },
      {
        label: 'Cancel',
        class: 'btn-ghost',
        onclick: () => gigzillaApp.closeModal()
      }
    ]);
  }

  async deleteClient(clientId) {
    const client = await this.store.getClient(clientId);
    const projects = await this.store.getProjectsByClient(clientId);

    if (projects.length > 0) {
      if (!confirm(`This client has ${projects.length} project(s). Deleting will remove the client but keep the projects. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete ${client.name}?`)) {
        return;
      }
    }

    await this.store.deleteClient(clientId);
    await gigzillaApp.refreshCurrentView();
  }

  async viewAllProjects(clientId) {
    const client = await this.store.getClient(clientId);
    const projects = await this.store.getProjectsByClient(clientId);

    gigzillaApp.showModal(`Projects for ${client.name}`, `
      <div style="max-height: 400px; overflow-y: auto;">
        ${projects.map(project => `
          <div style="padding: 12px; border-bottom: 1px solid var(--gray-100);">
            <div style="font-weight: 600; margin-bottom: 4px;">${project.name}</div>
            <div style="font-size: 14px; color: var(--gray-600);">
              €${project.amount.toLocaleString()} •
              <span class="badge badge-${this.getStatusBadgeClass(project.status)}">
                ${project.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `, [
      {
        label: 'Close',
        class: 'btn-ghost',
        onclick: () => gigzillaApp.closeModal()
      }
    ]);
  }

  getStatusLabel(status) {
    const labels = {
      'to_start': 'To Start',
      'working': 'Working',
      'done': 'Done',
      'paid': 'Paid ✓'
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status) {
    const classes = {
      'to_start': 'neutral',
      'working': 'warning',
      'done': 'success',
      'paid': 'success'
    };
    return classes[status] || 'neutral';
  }
}

window.ClientsView = ClientsView;
