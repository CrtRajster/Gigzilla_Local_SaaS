/**
 * Pipeline View
 * Kanban board for project workflow
 */

class PipelineView {
  constructor(store) {
    this.store = store;
    this.draggedProject = null;
  }

  async render() {
    const projects = await this.store.getAllProjects();
    const statuses = [
      { key: 'to_start', label: 'To Start', icon: '📋' },
      { key: 'working', label: 'Working', icon: '⚡' },
      { key: 'done', label: 'Done', icon: '✓' },
      { key: 'paid', label: 'Paid', icon: '💰' }
    ];

    return `
      <div class="view-header">
        <h1 class="view-title">🎯 Pipeline</h1>
        <div class="view-actions">
          <button class="btn btn-primary" onclick="gigzillaApp.showNewProjectModal()">
            + New Project
          </button>
        </div>
      </div>

      <div class="kanban-container">
        <div class="kanban-board">
          ${statuses.map(status => this.renderColumn(status, projects)).join('')}
        </div>
      </div>
    `;
  }

  renderColumn(status, allProjects) {
    const projects = allProjects.filter(p => p.status === status.key);

    return `
      <div class="kanban-column" data-status="${status.key}">
        <div class="kanban-column-header">
          <span>${status.icon} ${status.label}</span>
          <span class="kanban-count">${projects.length}</span>
        </div>
        <div class="kanban-cards"
             ondrop="pipelineView.handleDrop(event, '${status.key}')"
             ondragover="pipelineView.handleDragOver(event)">
          ${projects.map(project => this.renderCard(project)).join('')}
        </div>
      </div>
    `;
  }

  renderCard(project) {
    const client = this.store.getClient(project.clientId);

    return `
      <div class="kanban-card"
           draggable="true"
           data-project-id="${project.id}"
           ondragstart="pipelineView.handleDragStart(event, '${project.id}')"
           ondragend="pipelineView.handleDragEnd(event)"
           onclick="pipelineView.showProjectDetails('${project.id}')">
        <div class="kanban-card-title">${project.name}</div>
        <div class="kanban-card-client">${client?.name || 'Unknown Client'}</div>
        <div class="kanban-card-amount">€${project.amount.toLocaleString()}</div>
        ${project.deadline ? `
          <div class="kanban-card-meta">
            Due: ${this.formatDate(project.deadline)}
            ${this.isOverdue(project.deadline) ? ' <span style="color: var(--red-500);">⚠️</span>' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  handleDragStart(event, projectId) {
    this.draggedProject = projectId;
    event.currentTarget.style.opacity = '0.5';
  }

  handleDragEnd(event) {
    event.currentTarget.style.opacity = '1';
  }

  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
  }

  async handleDrop(event, newStatus) {
    event.preventDefault();
    event.currentTarget.style.background = '';

    if (this.draggedProject) {
      await this.store.updateProject(this.draggedProject, { status: newStatus });
      gigzillaApp.refreshCurrentView();
      this.draggedProject = null;
    }
  }

  async showProjectDetails(projectId) {
    const project = await this.store.getProject(projectId);
    const client = await this.store.getClient(project.clientId);

    gigzillaApp.showModal('Project Details', `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
          ${project.name}
        </div>
        <div style="font-size: 14px; color: var(--gray-500); margin-bottom: 16px;">
          ${client?.name || 'Unknown Client'}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div>
            <div class="form-label">Amount</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--gray-900);">
              €${project.amount.toLocaleString()}
            </div>
          </div>
          <div>
            <div class="form-label">Status</div>
            <div>
              <span class="badge badge-${this.getStatusBadgeClass(project.status)}">
                ${project.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        ${project.description ? `
          <div style="margin-bottom: 16px;">
            <div class="form-label">Description</div>
            <div style="font-size: 14px; color: var(--gray-700);">
              ${project.description}
            </div>
          </div>
        ` : ''}
        ${project.deadline ? `
          <div style="margin-bottom: 16px;">
            <div class="form-label">Deadline</div>
            <div style="font-size: 14px; color: var(--gray-700);">
              ${this.formatDate(project.deadline)}
            </div>
          </div>
        ` : ''}
      </div>
    `, [
      {
        label: 'Edit',
        class: 'btn-secondary',
        onclick: () => gigzillaApp.showEditProjectModal(projectId)
      },
      {
        label: 'Delete',
        class: 'btn-secondary',
        onclick: () => {
          if (confirm('Are you sure you want to delete this project?')) {
            this.store.deleteProject(projectId);
            gigzillaApp.closeModal();
            gigzillaApp.refreshCurrentView();
          }
        }
      },
      {
        label: 'Close',
        class: 'btn-ghost',
        onclick: () => gigzillaApp.closeModal()
      }
    ]);
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

  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  isOverdue(deadline) {
    return new Date(deadline) < new Date();
  }
}

window.PipelineView = PipelineView;
