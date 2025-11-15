/**
 * Dashboard View
 * Bento-style overview with metrics and recent activity
 */

class DashboardView {
  constructor(store) {
    this.store = store;
  }

  async render() {
    const stats = await this.store.getStats();
    const overdueInvoices = await this.store.getOverdueInvoices();
    const recentActivities = await this.store.getRecentActivities(5);

    return `
      <div class="dashboard-grid">
        <!-- This Month Card -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <span class="icon">💰</span>
            <span>This Month</span>
          </div>
          <div style="margin-bottom: 16px;">
            <div style="font-size: 32px; font-weight: 700; color: var(--gray-900); margin-bottom: 8px;">
              €${stats.earnedThisMonth.toLocaleString()}
            </div>
            <div style="font-size: 14px; color: var(--gray-500);">
              Earned this month
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-size: 18px; font-weight: 600; color: var(--gray-700);">
              €${stats.pending.toLocaleString()}
            </div>
            <div style="font-size: 13px; color: var(--gray-500);">
              Pending payment
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="gigzillaApp.navigateTo('money')">
            View Money →
          </button>
        </div>

        <!-- Needs Attention Card -->
        <div class="dashboard-card ${overdueInvoices.length > 0 ? 'attention' : ''}">
          <div class="dashboard-card-header">
            <span class="icon">⚠️</span>
            <span>Needs Attention</span>
          </div>
          ${overdueInvoices.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: var(--gray-700); margin-bottom: 12px;">
                ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's' : ''} overdue
              </div>
              ${overdueInvoices.slice(0, 3).map(inv => {
                const client = this.store.getClient(inv.clientId);
                const overdueDays = Math.ceil((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                  <div style="font-size: 13px; color: var(--gray-600); margin-bottom: 4px;">
                    • ${client?.name || 'Unknown'}: €${inv.amount} (${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue)
                  </div>
                `;
              }).join('')}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="gigzillaApp.navigateTo('money')">
              View Invoices →
            </button>
          ` : `
            <div style="font-size: 14px; color: var(--green-600); margin-bottom: 16px;">
              ✓ All caught up! No overdue invoices.
            </div>
          `}
        </div>

        <!-- Project Pipeline Card -->
        <div class="dashboard-card span-2" style="grid-column: 1;">
          <div class="dashboard-card-header">
            <span class="icon">📊</span>
            <span>Project Pipeline</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 24px; font-weight: 700; color: var(--gray-900);">
                ${stats.pipeline.to_start}
              </div>
              <div style="font-size: 13px; color: var(--gray-500);">
                To Start
              </div>
            </div>
            <div>
              <div style="font-size: 24px; font-weight: 700; color: var(--blue-500);">
                ${stats.pipeline.working}
              </div>
              <div style="font-size: 13px; color: var(--gray-500);">
                Working
              </div>
            </div>
            <div>
              <div style="font-size: 24px; font-weight: 700; color: var(--green-500);">
                ${stats.pipeline.done}
              </div>
              <div style="font-size: 13px; color: var(--gray-500);">
                Done
              </div>
            </div>
            <div>
              <div style="font-size: 24px; font-weight: 700; color: var(--gray-600);">
                ${stats.pipeline.paid}
              </div>
              <div style="font-size: 13px; color: var(--gray-500);">
                Paid
              </div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="gigzillaApp.navigateTo('pipeline')">
            View Pipeline →
          </button>
        </div>

        <!-- Quick Actions Card -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <span class="icon">🎯</span>
            <span>Quick Actions</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-primary btn-sm" onclick="gigzillaApp.showNewProjectModal()">
              + New Project
            </button>
            <button class="btn btn-secondary btn-sm" onclick="gigzillaApp.showNewClientModal()">
              + New Client
            </button>
            <button class="btn btn-secondary btn-sm" onclick="gigzillaApp.showNewInvoiceModal()">
              📧 New Invoice
            </button>
          </div>
        </div>

        <!-- Recent Activity Card -->
        <div class="dashboard-card span-2">
          <div class="dashboard-card-header">
            <span class="icon">🎉</span>
            <span>Recent Activity</span>
          </div>
          <ul class="activity-list">
            ${recentActivities.length > 0 ? recentActivities.map(activity => `
              <li class="activity-item">
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
              </li>
            `).join('') : `
              <li class="activity-item">
                <div class="activity-message" style="color: var(--gray-400);">
                  No recent activity
                </div>
              </li>
            `}
          </ul>
        </div>
      </div>
    `;
  }

  formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

window.DashboardView = DashboardView;
