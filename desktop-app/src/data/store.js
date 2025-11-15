/**
 * Gigzilla In-Memory Data Store
 *
 * This is a temporary in-memory store for prototyping.
 * Will be replaced with SQLite in Task 3.6
 *
 * Data persists in localStorage for now
 */

class DataStore {
  constructor() {
    this.clients = [];
    this.projects = [];
    this.invoices = [];
    this.activities = [];

    // Load from localStorage if available
    this.load();

    // Auto-save on changes
    this.autoSaveEnabled = true;
  }

  // ==========================================
  // CLIENTS
  // ==========================================

  addClient(clientData) {
    const client = {
      id: this.generateId('client'),
      name: clientData.name,
      email: clientData.email || '',
      phone: clientData.phone || '',
      company: clientData.company || clientData.name,
      notes: clientData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.push(client);
    this.addActivity('client_created', `New client added: ${client.name}`);
    this.save();
    return client;
  }

  updateClient(id, updates) {
    const client = this.clients.find(c => c.id === id);
    if (client) {
      Object.assign(client, updates, { updatedAt: new Date().toISOString() });
      this.addActivity('client_updated', `Client updated: ${client.name}`);
      this.save();
      return client;
    }
    return null;
  }

  deleteClient(id) {
    const index = this.clients.findIndex(c => c.id === id);
    if (index !== -1) {
      const client = this.clients[index];
      this.clients.splice(index, 1);
      this.addActivity('client_deleted', `Client deleted: ${client.name}`);
      this.save();
      return true;
    }
    return false;
  }

  getClient(id) {
    return this.clients.find(c => c.id === id);
  }

  getAllClients() {
    return this.clients.sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  searchClients(query) {
    const q = query.toLowerCase();
    return this.clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  addProject(projectData) {
    const project = {
      id: this.generateId('project'),
      name: projectData.name,
      clientId: projectData.clientId,
      description: projectData.description || '',
      amount: parseFloat(projectData.amount) || 0,
      currency: projectData.currency || '€',
      status: projectData.status || 'to_start', // to_start, working, done, paid
      deadline: projectData.deadline || null,
      startedAt: projectData.status === 'working' ? new Date().toISOString() : null,
      completedAt: null,
      paidAt: null,
      invoiceId: null,
      notes: projectData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.projects.push(project);

    const client = this.getClient(project.clientId);
    this.addActivity('project_created', `New project: ${project.name} (${client?.name || 'Unknown'})`);
    this.save();
    return project;
  }

  updateProject(id, updates) {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      const oldStatus = project.status;
      Object.assign(project, updates, { updatedAt: new Date().toISOString() });

      // Track status transitions
      if (updates.status && updates.status !== oldStatus) {
        if (updates.status === 'working' && !project.startedAt) {
          project.startedAt = new Date().toISOString();
        }
        if (updates.status === 'done' && !project.completedAt) {
          project.completedAt = new Date().toISOString();
        }
        if (updates.status === 'paid' && !project.paidAt) {
          project.paidAt = new Date().toISOString();
        }

        this.addActivity('project_status_changed',
          `Project "${project.name}" moved to ${updates.status.replace('_', ' ')}`
        );
      }

      this.save();
      return project;
    }
    return null;
  }

  deleteProject(id) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      const project = this.projects[index];
      this.projects.splice(index, 1);
      this.addActivity('project_deleted', `Project deleted: ${project.name}`);
      this.save();
      return true;
    }
    return false;
  }

  getProject(id) {
    return this.projects.find(p => p.id === id);
  }

  getAllProjects() {
    return this.projects.sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  getProjectsByStatus(status) {
    return this.projects.filter(p => p.status === status);
  }

  getProjectsByClient(clientId) {
    return this.projects.filter(p => p.clientId === clientId);
  }

  // ==========================================
  // INVOICES
  // ==========================================

  addInvoice(invoiceData) {
    const invoiceNumber = this.generateInvoiceNumber();

    const invoice = {
      id: this.generateId('invoice'),
      invoiceNumber: invoiceNumber,
      projectId: invoiceData.projectId,
      clientId: invoiceData.clientId,
      amount: parseFloat(invoiceData.amount) || 0,
      currency: invoiceData.currency || '€',
      status: invoiceData.status || 'draft', // draft, sent, paid, overdue
      items: invoiceData.items || [],
      notes: invoiceData.notes || '',
      dueDate: invoiceData.dueDate || this.getDefaultDueDate(),
      sentAt: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.invoices.push(invoice);

    const client = this.getClient(invoice.clientId);
    this.addActivity('invoice_created',
      `Invoice ${invoiceNumber} created for ${client?.name || 'Unknown'} (€${invoice.amount})`
    );
    this.save();
    return invoice;
  }

  updateInvoice(id, updates) {
    const invoice = this.invoices.find(i => i.id === id);
    if (invoice) {
      const oldStatus = invoice.status;
      Object.assign(invoice, updates, { updatedAt: new Date().toISOString() });

      // Track status transitions
      if (updates.status && updates.status !== oldStatus) {
        if (updates.status === 'sent' && !invoice.sentAt) {
          invoice.sentAt = new Date().toISOString();
        }
        if (updates.status === 'paid' && !invoice.paidAt) {
          invoice.paidAt = new Date().toISOString();

          // Also mark related project as paid
          if (invoice.projectId) {
            this.updateProject(invoice.projectId, { status: 'paid', invoiceId: invoice.id });
          }
        }

        this.addActivity('invoice_status_changed',
          `Invoice ${invoice.invoiceNumber} marked as ${updates.status}`
        );
      }

      this.save();
      return invoice;
    }
    return null;
  }

  deleteInvoice(id) {
    const index = this.invoices.findIndex(i => i.id === id);
    if (index !== -1) {
      const invoice = this.invoices[index];
      this.invoices.splice(index, 1);
      this.addActivity('invoice_deleted', `Invoice ${invoice.invoiceNumber} deleted`);
      this.save();
      return true;
    }
    return false;
  }

  getInvoice(id) {
    return this.invoices.find(i => i.id === id);
  }

  getAllInvoices() {
    return this.invoices.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  getInvoicesByStatus(status) {
    return this.invoices.filter(i => i.status === status);
  }

  getOverdueInvoices() {
    const now = new Date();
    return this.invoices.filter(i => {
      if (i.status === 'paid') return false;
      if (!i.dueDate) return false;
      return new Date(i.dueDate) < now;
    });
  }

  // ==========================================
  // STATISTICS & ANALYTICS
  // ==========================================

  getStats() {
    const now = new Date();
    const thisMonth = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    };

    // Calculate earned this month (paid invoices)
    const earnedThisMonth = this.invoices
      .filter(i => i.status === 'paid' && i.paidAt &&
        new Date(i.paidAt) >= thisMonth.start && new Date(i.paidAt) <= thisMonth.end)
      .reduce((sum, i) => sum + i.amount, 0);

    // Calculate pending (sent but not paid)
    const pending = this.invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + i.amount, 0);

    // Calculate overdue
    const overdue = this.getOverdueInvoices()
      .reduce((sum, i) => sum + i.amount, 0);

    // Active projects
    const activeProjects = this.projects.filter(p =>
      p.status === 'working' || p.status === 'to_start'
    ).length;

    // Project pipeline
    const pipeline = {
      to_start: this.getProjectsByStatus('to_start').length,
      working: this.getProjectsByStatus('working').length,
      done: this.getProjectsByStatus('done').length,
      paid: this.getProjectsByStatus('paid').length
    };

    return {
      earnedThisMonth,
      pending,
      overdue,
      activeProjects,
      pipeline,
      totalClients: this.clients.length,
      totalProjects: this.projects.length,
      totalInvoices: this.invoices.length
    };
  }

  getClientStats(clientId) {
    const projects = this.getProjectsByClient(clientId);
    const invoices = this.invoices.filter(i => i.clientId === clientId);

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    const pendingRevenue = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      projectCount: projects.length,
      totalRevenue,
      pendingRevenue,
      activeProjects: projects.filter(p => p.status === 'working').length
    };
  }

  // ==========================================
  // ACTIVITY LOG
  // ==========================================

  addActivity(type, message) {
    const activity = {
      id: this.generateId('activity'),
      type: type,
      message: message,
      timestamp: new Date().toISOString()
    };

    this.activities.unshift(activity); // Add to beginning

    // Keep only last 50 activities
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(0, 50);
    }

    this.save();
  }

  getRecentActivities(limit = 10) {
    return this.activities.slice(0, limit);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const existingThisYear = this.invoices.filter(i =>
      i.invoiceNumber.startsWith(`INV-${year}`)
    ).length;

    const number = (existingThisYear + 1).toString().padStart(3, '0');
    return `INV-${year}-${number}`;
  }

  getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14 days from now
    return date.toISOString().split('T')[0];
  }

  // ==========================================
  // PERSISTENCE (localStorage)
  // ==========================================

  save() {
    if (!this.autoSaveEnabled) return;

    try {
      const data = {
        clients: this.clients,
        projects: this.projects,
        invoices: this.invoices,
        activities: this.activities,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem('gigzilla_data', JSON.stringify(data));
    } catch (error) {
      console.error('[STORE] Failed to save to localStorage:', error);
    }
  }

  load() {
    try {
      const stored = localStorage.getItem('gigzilla_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.clients = data.clients || [];
        this.projects = data.projects || [];
        this.invoices = data.invoices || [];
        this.activities = data.activities || [];

        console.log('[STORE] Loaded data from localStorage:', {
          clients: this.clients.length,
          projects: this.projects.length,
          invoices: this.invoices.length,
          activities: this.activities.length
        });
      } else {
        // Load sample data for demo
        this.loadSampleData();
      }
    } catch (error) {
      console.error('[STORE] Failed to load from localStorage:', error);
      this.loadSampleData();
    }
  }

  clear() {
    this.clients = [];
    this.projects = [];
    this.invoices = [];
    this.activities = [];
    localStorage.removeItem('gigzilla_data');
    console.log('[STORE] All data cleared');
  }

  // ==========================================
  // SAMPLE DATA (for demo)
  // ==========================================

  loadSampleData() {
    console.log('[STORE] Loading sample data...');

    // Add sample clients
    const acme = this.addClient({
      name: 'Acme Corp',
      email: 'john@acme.com',
      phone: '+1 (555) 123-4567',
      company: 'Acme Corp'
    });

    const beta = this.addClient({
      name: 'Beta Inc',
      email: 'sarah@betainc.com',
      phone: '+1 (555) 234-5678',
      company: 'Beta Inc'
    });

    const gamma = this.addClient({
      name: 'Gamma LLC',
      email: 'mike@gamma.com',
      phone: '+1 (555) 345-6789',
      company: 'Gamma LLC'
    });

    // Add sample projects
    const p1 = this.addProject({
      name: 'Logo design',
      clientId: acme.id,
      description: 'Design new company logo and brand identity',
      amount: 1500,
      status: 'working',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    this.addProject({
      name: 'Website redesign',
      clientId: beta.id,
      description: 'Complete website overhaul with modern design',
      amount: 5000,
      status: 'to_start',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    const p3 = this.addProject({
      name: 'Brand guidelines',
      clientId: gamma.id,
      description: 'Complete brand guide documentation',
      amount: 2500,
      status: 'done'
    });

    this.addProject({
      name: 'App UI design',
      clientId: acme.id,
      description: 'Mobile app interface design',
      amount: 3000,
      status: 'paid'
    });

    // Add sample invoices
    this.addInvoice({
      projectId: p3.id,
      clientId: gamma.id,
      amount: 2500,
      status: 'sent',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    this.addInvoice({
      projectId: p1.id,
      clientId: acme.id,
      amount: 1500,
      status: 'draft'
    });

    console.log('[STORE] Sample data loaded successfully');
  }
}

// Create global store instance
window.gigzillaStore = new DataStore();

console.log('[STORE] Data store initialized');
