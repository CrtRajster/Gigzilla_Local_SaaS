/**
 * Money View
 * Financial overview with stats and invoice management
 */

class MoneyView {
  constructor(store) {
    this.store = store;
    this.filterStatus = 'all';
  }

  async render() {
    const stats = await this.store.getStats();
    const invoices = await this.getFilteredInvoices();

    return `
      <div class="view-header">
        <h1 class="view-title">💰 Money</h1>
        <div class="view-actions">
          <select class="form-select" style="width: 150px;" onchange="moneyView.handleFilterChange(event)">
            <option value="all">All Invoices</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button class="btn btn-primary" onclick="gigzillaApp.showNewInvoiceModal()">
            + New Invoice
          </button>
        </div>
      </div>

      <div class="invoice-container">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Earned</div>
            <div class="stat-value">€${stats.earnedThisMonth.toLocaleString()}</div>
            <div class="stat-change positive">✓ This Month</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pending</div>
            <div class="stat-value">€${stats.pending.toLocaleString()}</div>
            <div class="stat-change">Awaiting payment</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Overdue</div>
            <div class="stat-value ${stats.overdue > 0 ? 'style="color: var(--red-500);"' : ''}">
              €${stats.overdue.toLocaleString()}
            </div>
            ${stats.overdue > 0 ? '<div class="stat-change negative">⚠️ Needs attention</div>' : '<div class="stat-change">✓ All good</div>'}
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Invoices</div>
            <div class="stat-value">${stats.totalInvoices}</div>
            <div class="stat-change">All time</div>
          </div>
        </div>

        <!-- Invoice List -->
        ${invoices.length > 0 ? `
          <div class="invoice-list">
            ${(await Promise.all(invoices.map(invoice => this.renderInvoiceRow(invoice)))).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 48px; color: var(--gray-400); background: white; border-radius: var(--radius-lg);">
            <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
            <div style="font-size: 16px; margin-bottom: 8px;">No invoices found</div>
            <div style="font-size: 14px;">Create your first invoice to get started</div>
          </div>
        `}
      </div>
    `;
  }

  async renderInvoiceRow(invoice) {
    const client = await this.store.getClient(invoice.clientId);
    const statusInfo = this.getStatusInfo(invoice);

    return `
      <div class="invoice-row" onclick="moneyView.showInvoiceDetails('${invoice.id}')">
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div class="invoice-client">${client?.name || 'Unknown Client'}</div>
        <div class="invoice-amount">€${invoice.amount.toLocaleString()}</div>
        <div>
          <span class="badge badge-${statusInfo.badgeClass}">
            ${statusInfo.label}
          </span>
        </div>
        <div>
          ${statusInfo.action}
        </div>
      </div>
    `;
  }

  getStatusInfo(invoice) {
    const now = new Date();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;

    if (invoice.status === 'paid') {
      return {
        label: `Paid ✓`,
        badgeClass: 'success',
        action: `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); moneyView.viewInvoice('${invoice.id}')">View</button>`
      };
    }

    if (invoice.status === 'sent' && dueDate && dueDate < now) {
      const overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      return {
        label: `Overdue (${overdueDays}d)`,
        badgeClass: 'error',
        action: `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); moneyView.sendReminder('${invoice.id}')">Remind</button>`
      };
    }

    if (invoice.status === 'sent') {
      const daysSent = invoice.sentAt ? Math.ceil((now - new Date(invoice.sentAt)) / (1000 * 60 * 60 * 24)) : 0;
      return {
        label: `Sent (${daysSent}d ago)`,
        badgeClass: 'warning',
        action: `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); moneyView.markAsPaid('${invoice.id}')">Mark Paid</button>`
      };
    }

    return {
      label: 'Draft',
      badgeClass: 'neutral',
      action: `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); moneyView.sendInvoice('${invoice.id}')">Send</button>`
    };
  }

  async getFilteredInvoices() {
    const allInvoices = await this.store.getAllInvoices();

    if (this.filterStatus === 'all') return allInvoices;
    if (this.filterStatus === 'overdue') return await this.store.getOverdueInvoices();

    return allInvoices.filter(inv => inv.status === this.filterStatus);
  }

  handleFilterChange(event) {
    this.filterStatus = event.target.value;
    gigzillaApp.refreshCurrentView();
  }

  async showInvoiceDetails(invoiceId) {
    const invoice = await this.store.getInvoice(invoiceId);
    const client = await this.store.getClient(invoice.clientId);
    const project = invoice.projectId ? await this.store.getProject(invoice.projectId) : null;

    gigzillaApp.showModal('Invoice Details', `
      <div style="margin-bottom: 24px;">
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          ${invoice.invoiceNumber}
        </div>
        <div style="font-size: 14px; color: var(--gray-500);">
          ${client?.name || 'Unknown Client'}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <div class="form-label">Amount</div>
          <div style="font-size: 32px; font-weight: 700; color: var(--gray-900);">
            €${invoice.amount.toLocaleString()}
          </div>
        </div>
        <div>
          <div class="form-label">Status</div>
          <div>
            <span class="badge badge-${this.getStatusInfo(invoice).badgeClass}">
              ${this.getStatusInfo(invoice).label}
            </span>
          </div>
        </div>
      </div>

      ${project ? `
        <div style="margin-bottom: 16px;">
          <div class="form-label">Project</div>
          <div style="font-size: 14px; color: var(--gray-700);">
            ${project.name}
          </div>
        </div>
      ` : ''}

      ${invoice.dueDate ? `
        <div style="margin-bottom: 16px;">
          <div class="form-label">Due Date</div>
          <div style="font-size: 14px; color: var(--gray-700);">
            ${this.formatDate(invoice.dueDate)}
          </div>
        </div>
      ` : ''}

      ${invoice.notes ? `
        <div style="margin-bottom: 16px;">
          <div class="form-label">Notes</div>
          <div style="font-size: 14px; color: var(--gray-700);">
            ${invoice.notes}
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
        <div style="font-size: 12px; color: var(--gray-400);">
          Created: ${this.formatDate(invoice.createdAt)}
          ${invoice.sentAt ? `• Sent: ${this.formatDate(invoice.sentAt)}` : ''}
          ${invoice.paidAt ? `• Paid: ${this.formatDate(invoice.paidAt)}` : ''}
        </div>
      </div>
    `, [
      {
        label: invoice.status === 'draft' ? 'Send Invoice' : 'Mark as Paid',
        class: 'btn-primary',
        onclick: () => {
          if (invoice.status === 'draft') {
            this.sendInvoice(invoiceId);
          } else {
            this.markAsPaid(invoiceId);
          }
        }
      },
      {
        label: 'Edit',
        class: 'btn-secondary',
        onclick: () => gigzillaApp.showEditInvoiceModal(invoiceId)
      },
      {
        label: 'Delete',
        class: 'btn-secondary',
        onclick: async () => {
          if (confirm('Are you sure you want to delete this invoice?')) {
            await this.store.deleteInvoice(invoiceId);
            gigzillaApp.closeModal();
            await gigzillaApp.refreshCurrentView();
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

  async sendInvoice(invoiceId) {
    await this.store.updateInvoice(invoiceId, { status: 'sent' });
    alert('Invoice marked as sent!');
    gigzillaApp.closeModal();
    await gigzillaApp.refreshCurrentView();
  }

  async markAsPaid(invoiceId) {
    await this.store.updateInvoice(invoiceId, { status: 'paid' });
    alert('Invoice marked as paid!');
    gigzillaApp.closeModal();
    await gigzillaApp.refreshCurrentView();
  }

  async sendReminder(invoiceId) {
    const invoice = await this.store.getInvoice(invoiceId);
    const client = await this.store.getClient(invoice.clientId);
    alert(`Payment reminder would be sent to ${client?.name} for invoice ${invoice.invoiceNumber}`);
  }

  viewInvoice(invoiceId) {
    this.showInvoiceDetails(invoiceId);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
}

window.MoneyView = MoneyView;
