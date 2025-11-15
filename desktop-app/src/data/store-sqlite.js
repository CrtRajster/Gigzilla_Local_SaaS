/**
 * Gigzilla SQLite Data Store (Renderer Process)
 * Communicates with main process database via IPC
 *
 * This replaces the in-memory store.js with persistent SQLite storage
 * Maintains the same API for compatibility with existing views
 */

class DataStore {
  constructor() {
    this.migrated = false;
    this.init();
  }

  async init() {
    // Check if we need to migrate from localStorage
    const oldData = localStorage.getItem('gigzilla_data');
    if (oldData && !this.migrated) {
      await this.migrateFromLocalStorage(oldData);
    }

    // Check if we have any data, if not load sample data
    const clients = await this.getAllClients();
    if (clients.length === 0) {
      await this.loadSampleData();
    }
  }

  // ==========================================
  // CLIENTS
  // ==========================================

  async addClient(clientData) {
    const client = await window.electronAPI.invoke('db:addClient', clientData);
    return client;
  }

  async updateClient(id, updates) {
    return await window.electronAPI.invoke('db:updateClient', id, updates);
  }

  async deleteClient(id) {
    return await window.electronAPI.invoke('db:deleteClient', id);
  }

  async getClient(id) {
    return await window.electronAPI.invoke('db:getClient', id);
  }

  async getAllClients() {
    return await window.electronAPI.invoke('db:getAllClients');
  }

  async searchClients(query) {
    return await window.electronAPI.invoke('db:searchClients', query);
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  async addProject(projectData) {
    return await window.electronAPI.invoke('db:addProject', projectData);
  }

  async updateProject(id, updates) {
    return await window.electronAPI.invoke('db:updateProject', id, updates);
  }

  async deleteProject(id) {
    return await window.electronAPI.invoke('db:deleteProject', id);
  }

  async getProject(id) {
    return await window.electronAPI.invoke('db:getProject', id);
  }

  async getAllProjects() {
    return await window.electronAPI.invoke('db:getAllProjects');
  }

  async getProjectsByStatus(status) {
    return await window.electronAPI.invoke('db:getProjectsByStatus', status);
  }

  async getProjectsByClient(clientId) {
    return await window.electronAPI.invoke('db:getProjectsByClient', clientId);
  }

  // ==========================================
  // INVOICES
  // ==========================================

  async addInvoice(invoiceData) {
    return await window.electronAPI.invoke('db:addInvoice', invoiceData);
  }

  async updateInvoice(id, updates) {
    return await window.electronAPI.invoke('db:updateInvoice', id, updates);
  }

  async deleteInvoice(id) {
    return await window.electronAPI.invoke('db:deleteInvoice', id);
  }

  async getInvoice(id) {
    return await window.electronAPI.invoke('db:getInvoice', id);
  }

  async getAllInvoices() {
    return await window.electronAPI.invoke('db:getAllInvoices');
  }

  async getInvoicesByStatus(status) {
    return await window.electronAPI.invoke('db:getInvoicesByStatus', status);
  }

  async getOverdueInvoices() {
    return await window.electronAPI.invoke('db:getOverdueInvoices');
  }

  // ==========================================
  // STATISTICS & ANALYTICS
  // ==========================================

  async getStats() {
    return await window.electronAPI.invoke('db:getStats');
  }

  async getClientStats(clientId) {
    return await window.electronAPI.invoke('db:getClientStats', clientId);
  }

  // ==========================================
  // ACTIVITY LOG
  // ==========================================

  async getRecentActivities(limit = 10) {
    return await window.electronAPI.invoke('db:getRecentActivities', limit);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  async generateId(prefix) {
    return await window.electronAPI.invoke('db:generateId', prefix);
  }

  async generateInvoiceNumber() {
    return await window.electronAPI.invoke('db:generateInvoiceNumber');
  }

  async getDefaultDueDate() {
    return await window.electronAPI.invoke('db:getDefaultDueDate');
  }

  // ==========================================
  // MIGRATION FROM LOCALSTORAGE
  // ==========================================

  async migrateFromLocalStorage(oldDataString) {
    try {
      console.log('[STORE] Migrating data from localStorage to SQLite...');

      const oldData = JSON.parse(oldDataString);

      // Import data to SQLite
      const result = await window.electronAPI.invoke('db:importData', oldData);

      console.log('[STORE] Migration completed:', result);

      // Mark as migrated and clear localStorage
      this.migrated = true;
      localStorage.removeItem('gigzilla_data');
      localStorage.setItem('gigzilla_migrated', 'true');

      return result;
    } catch (error) {
      console.error('[STORE] Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // SAMPLE DATA (for demo)
  // ==========================================

  async loadSampleData() {
    console.log('[STORE] Loading sample data...');

    try {
      // Add sample clients
      const acme = await this.addClient({
        name: 'Acme Corp',
        email: 'john@acme.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corp'
      });

      const beta = await this.addClient({
        name: 'Beta Inc',
        email: 'sarah@betainc.com',
        phone: '+1 (555) 234-5678',
        company: 'Beta Inc'
      });

      const gamma = await this.addClient({
        name: 'Gamma LLC',
        email: 'mike@gamma.com',
        phone: '+1 (555) 345-6789',
        company: 'Gamma LLC'
      });

      // Add sample projects
      const p1 = await this.addProject({
        name: 'Logo design',
        client_id: acme.id,
        description: 'Design new company logo and brand identity',
        amount: 1500,
        status: 'working',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      await this.addProject({
        name: 'Website redesign',
        client_id: beta.id,
        description: 'Complete website overhaul with modern design',
        amount: 5000,
        status: 'to_start',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      const p3 = await this.addProject({
        name: 'Brand guidelines',
        client_id: gamma.id,
        description: 'Complete brand guide documentation',
        amount: 2500,
        status: 'done'
      });

      await this.addProject({
        name: 'App UI design',
        client_id: acme.id,
        description: 'Mobile app interface design',
        amount: 3000,
        status: 'paid'
      });

      // Add sample invoices
      await this.addInvoice({
        project_id: p3.id,
        client_id: gamma.id,
        amount: 2500,
        status: 'sent',
        due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      await this.addInvoice({
        project_id: p1.id,
        client_id: acme.id,
        amount: 1500,
        status: 'draft'
      });

      console.log('[STORE] Sample data loaded successfully');
    } catch (error) {
      console.error('[STORE] Failed to load sample data:', error);
    }
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================

  async backup(outputPath) {
    return await window.electronAPI.invoke('db:backup', outputPath);
  }

  async restore(backupPath) {
    return await window.electronAPI.invoke('db:restore', backupPath);
  }
}

// Create global store instance (async initialization)
window.gigzillaStore = new DataStore();

console.log('[STORE] SQLite data store initialized');
