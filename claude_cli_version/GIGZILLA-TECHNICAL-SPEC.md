# Gigzilla - Complete Technical Specification

## Table of Contents
1. [Project Structure](#project-structure)
2. [Desktop App Implementation](#desktop-app-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [Security Implementation](#security-implementation)
8. [Deployment Configuration](#deployment-configuration)

---

## Project Structure

### Repository Organization

```
gigzilla/
├── desktop/                    # Electron desktop app
│   ├── src/
│   │   ├── main.js            # Electron main process
│   │   ├── preload.js         # IPC bridge
│   │   ├── renderer.js        # UI logic
│   │   ├── components/        # UI components
│   │   │   ├── dashboard.js
│   │   │   ├── pipeline.js
│   │   │   ├── money.js
│   │   │   ├── clients.js
│   │   │   └── settings.js
│   │   ├── managers/          # Business logic
│   │   │   ├── license-manager.js
│   │   │   ├── project-manager.js
│   │   │   ├── invoice-manager.js
│   │   │   ├── payment-manager.js
│   │   │   └── notification-manager.js
│   │   ├── services/          # External integrations
│   │   │   ├── paypal-service.js
│   │   │   ├── stripe-service.js
│   │   │   ├── email-service.js
│   │   │   ├── sms-service.js
│   │   │   └── whatsapp-service.js
│   │   ├── utils/             # Utilities
│   │   │   ├── crypto.js      # Encryption
│   │   │   ├── date.js        # Date formatting
│   │   │   ├── currency.js    # Currency formatting
│   │   │   └── validation.js  # Form validation
│   │   └── styles/            # CSS
│   │       ├── main.css
│   │       ├── components.css
│   │       └── themes.css
│   ├── assets/                # Static files
│   │   ├── icons/
│   │   └── images/
│   ├── package.json
│   ├── package-lock.json
│   └── electron-builder.yml   # Build configuration
│
├── backend/                    # License validation server
│   ├── src/
│   │   ├── index.js           # Express server
│   │   ├── database.js        # PostgreSQL connection
│   │   ├── routes/
│   │   │   ├── license.js     # License validation routes
│   │   │   └── webhook.js     # Stripe webhooks
│   │   ├── services/
│   │   │   ├── license-service.js
│   │   │   └── stripe-service.js
│   │   └── utils/
│   │       ├── validation.js
│   │       └── security.js
│   ├── schema.sql             # Database schema
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   └── README.md
│
├── docs/                       # Documentation
│   ├── GIGZILLA-COMPLETE-OVERVIEW.md
│   ├── GIGZILLA-FEATURES-AND-UX.md
│   ├── GIGZILLA-AUTOMATION-AND-INTEGRATIONS.md
│   ├── GIGZILLA-TECHNICAL-SPEC.md (this file)
│   └── GIGZILLA-IMPLEMENTATION-PLAN.md
│
└── README.md                   # Project overview
```

---

## Desktop App Implementation

### Main Process (main.js)

```javascript
// desktop/src/main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  encryptionKey: 'your-encryption-key' // Generated per installation
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hidden', // Custom title bar
    backgroundColor: '#f9fafb'
  });

  mainWindow.loadFile('src/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('open:external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});
```

### Preload Script (preload.js)

```javascript
// desktop/src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  },

  // System
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),

  // Notifications
  notify: (title, message) => ipcRenderer.invoke('notify', title, message)
});
```

### Renderer Process (renderer.js)

```javascript
// desktop/src/renderer.js
class GigzillaApp {
  constructor() {
    this.state = {
      user: null,
      license: null,
      clients: [],
      projects: [],
      invoices: [],
      payments: [],
      settings: {},
      profile: {},
      currentView: 'dashboard'
    };

    this.licenseManager = new LicenseManager();
    this.projectManager = new ProjectManager();
    this.invoiceManager = new InvoiceManager();
    this.paymentManager = new PaymentManager();
    this.notificationManager = new NotificationManager();
  }

  async init() {
    // Check license first
    await this.checkLicense();

    if (this.state.license && this.state.license.valid) {
      // Load local data
      await this.loadData();

      // Start background services
      this.startBackgroundServices();

      // Render UI
      this.render();

      // Setup event listeners
      this.setupEventListeners();
    } else {
      // Show activation screen
      this.renderActivationFlow();
    }
  }

  async checkLicense() {
    try {
      const license = await this.licenseManager.validateLicense();
      this.state.license = license;
      return license.valid;
    } catch (error) {
      console.error('License validation error:', error);
      return false;
    }
  }

  async loadData() {
    const data = await window.electronAPI.store.get('appData');

    if (data) {
      this.state.clients = data.clients || [];
      this.state.projects = data.projects || [];
      this.state.invoices = data.invoices || [];
      this.state.payments = data.payments || [];
      this.state.settings = data.settings || this.getDefaultSettings();
      this.state.profile = data.profile || {};
    } else {
      // First time setup
      this.state.settings = this.getDefaultSettings();
    }
  }

  async saveData() {
    const data = {
      clients: this.state.clients,
      projects: this.state.projects,
      invoices: this.state.invoices,
      payments: this.state.payments,
      settings: this.state.settings,
      profile: this.state.profile,
      lastSaved: new Date().toISOString()
    };

    await window.electronAPI.store.set('appData', data);
  }

  getDefaultSettings() {
    return {
      currency: 'EUR',
      invoiceNumberFormat: 'INV-{YYYY}-{###}',
      invoiceStartNumber: 1,
      invoiceResetYearly: true,
      autoInvoiceEnabled: true,
      autoInvoiceDelay: 0, // days
      defaultInvoiceTemplate: 'friendly',
      invoiceDueDays: 14,
      reminderEnabled: true,
      reminderSchedule: [3, 0, -3, -7], // days relative to due date
      defaultReminderStrategy: 'standard',
      paymentDetectionEnabled: true,
      paymentCheckInterval: 15, // minutes
      notifications: {
        paymentReceived: ['desktop', 'whatsapp'],
        invoiceSent: ['desktop'],
        paymentOverdue: ['desktop', 'email'],
        projectDeadline: ['desktop'],
        reminderSent: []
      },
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      backupEnabled: true,
      backupFrequency: 'daily',
      backupTime: '03:00',
      backupKeepCount: 30
    };
  }

  startBackgroundServices() {
    // Payment detection (every 15 minutes)
    if (this.state.settings.paymentDetectionEnabled) {
      setInterval(() => {
        this.paymentManager.checkForPayments();
      }, this.state.settings.paymentCheckInterval * 60 * 1000);
    }

    // Reminder processing (every hour)
    if (this.state.settings.reminderEnabled) {
      setInterval(() => {
        this.invoiceManager.processReminders();
      }, 60 * 60 * 1000);
    }

    // Auto-backup (daily at configured time)
    if (this.state.settings.backupEnabled) {
      this.scheduleBackup();
    }

    // License re-validation (every 24 hours)
    setInterval(() => {
      this.licenseManager.validateLicense();
    }, 24 * 60 * 60 * 1000);
  }

  render() {
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="app-container">
        ${this.renderSidebar()}
        <div class="main-content">
          ${this.renderCurrentView()}
        </div>
      </div>
    `;
  }

  renderSidebar() {
    return `
      <aside class="sidebar">
        <div class="app-logo">
          <h1>Gigzilla</h1>
        </div>
        <nav class="main-nav">
          <a href="#dashboard" class="${this.state.currentView === 'dashboard' ? 'active' : ''}">
            🏠 Dashboard
          </a>
          <a href="#pipeline" class="${this.state.currentView === 'pipeline' ? 'active' : ''}">
            🎯 Pipeline
          </a>
          <a href="#money" class="${this.state.currentView === 'money' ? 'active' : ''}">
            💰 Money
          </a>
          <a href="#clients" class="${this.state.currentView === 'clients' ? 'active' : ''}">
            👥 Clients
          </a>
          <a href="#settings" class="${this.state.currentView === 'settings' ? 'active' : ''}">
            ⚙️ Settings
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-profile">
            <img src="${this.state.profile.avatar || 'assets/default-avatar.png'}" alt="Profile">
            <span>${this.state.profile.name || 'User'}</span>
          </div>
        </div>
      </aside>
    `;
  }

  renderCurrentView() {
    switch (this.state.currentView) {
      case 'dashboard':
        return this.renderDashboard();
      case 'pipeline':
        return this.renderPipeline();
      case 'money':
        return this.renderMoney();
      case 'clients':
        return this.renderClients();
      case 'settings':
        return this.renderSettings();
      default:
        return this.renderDashboard();
    }
  }

  // View renderers implemented in separate component files
  renderDashboard() {
    return Dashboard.render(this.state);
  }

  renderPipeline() {
    return Pipeline.render(this.state);
  }

  renderMoney() {
    return Money.render(this.state);
  }

  renderClients() {
    return Clients.render(this.state);
  }

  renderSettings() {
    return Settings.render(this.state);
  }

  setupEventListeners() {
    // Global search (Cmd+K or /)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        this.showGlobalSearch();
      }
    });

    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const view = e.target.getAttribute('href').substring(1);
        this.navigateTo(view);
      }
    });

    // Auto-save on data change
    let saveTimeout;
    this.onStateChange = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveData();
      }, 1000); // Debounce 1 second
    };
  }

  navigateTo(view) {
    this.state.currentView = view;
    this.render();
    this.setupEventListeners();
  }
}

// Initialize app
const app = new GigzillaApp();
app.init();
```

### License Manager (license-manager.js)

```javascript
// desktop/src/managers/license-manager.js
const crypto = require('crypto');
const os = require('os');

class LicenseManager {
  constructor() {
    this.apiUrl = process.env.LICENSE_API_URL || 'https://api.gigzilla.app';
  }

  generateMachineId() {
    const identifier = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0].model
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(identifier)
      .digest('hex')
      .substring(0, 32);
  }

  async validateLicense() {
    const license = await window.electronAPI.store.get('license');

    if (!license) {
      return { valid: false, reason: 'no_license' };
    }

    // Check grace period (allow 7 days offline)
    const lastValidated = new Date(license.lastValidated);
    const daysSinceValidation = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceValidation < 7) {
      return { valid: true, cached: true };
    }

    // Validate with server
    try {
      const response = await fetch(`${this.apiUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: license.email,
          licenseKey: license.key,
          machineId: this.generateMachineId()
        })
      });

      const result = await response.json();

      if (result.valid) {
        license.lastValidated = new Date().toISOString();
        license.status = result.status;
        license.tier = result.tier;
        await window.electronAPI.store.set('license', license);
        return { valid: true, ...result };
      } else {
        return { valid: false, reason: result.reason };
      }
    } catch (error) {
      // Network error - use grace period
      if (daysSinceValidation < 7) {
        return { valid: true, cached: true, offline: true };
      } else {
        return { valid: false, reason: 'validation_failed', error: error.message };
      }
    }
  }

  async startTrial(email) {
    try {
      const response = await fetch(`${this.apiUrl}/api/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          machineId: this.generateMachineId()
        })
      });

      const result = await response.json();

      if (result.success) {
        await window.electronAPI.store.set('license', {
          email: email,
          key: result.licenseKey,
          status: 'trial',
          tier: 'free',
          validUntil: result.validUntil,
          lastValidated: new Date().toISOString()
        });

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async activateLicense(email, licenseKey) {
    try {
      const response = await fetch(`${this.apiUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          licenseKey: licenseKey,
          machineId: this.generateMachineId()
        })
      });

      const result = await response.json();

      if (result.valid) {
        await window.electronAPI.store.set('license', {
          email: email,
          key: licenseKey,
          status: result.status,
          tier: result.tier,
          validUntil: result.validUntil,
          lastValidated: new Date().toISOString()
        });

        return { success: true };
      } else {
        return { success: false, error: result.reason };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = LicenseManager;
```

### Project Manager (project-manager.js)

```javascript
// desktop/src/managers/project-manager.js
const { v4: uuidv4 } = require('uuid');

class ProjectManager {
  constructor(app) {
    this.app = app;
  }

  async createProject(projectData) {
    const project = {
      id: uuidv4(),
      name: projectData.name,
      clientId: projectData.clientId,
      amount: projectData.amount,
      currency: projectData.currency || this.app.state.settings.currency,
      status: 'to_start', // to_start, working, done, paid
      deadline: projectData.deadline || null,
      platform: projectData.platform || 'direct',
      notes: projectData.notes || '',
      attachments: [],
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    this.app.state.projects.push(project);
    await this.app.saveData();

    // Log activity
    this.app.logActivity({
      type: 'project_created',
      projectId: project.id,
      clientId: project.clientId
    });

    return project;
  }

  async updateProject(projectId, updates) {
    const project = this.app.state.projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const oldStatus = project.status;

    Object.assign(project, updates, {
      updatedDate: new Date().toISOString()
    });

    await this.app.saveData();

    // If status changed to "done", trigger auto-invoice
    if (oldStatus !== 'done' && project.status === 'done') {
      if (this.app.state.settings.autoInvoiceEnabled) {
        this.app.invoiceManager.showAutoInvoicePrompt(project);
      }
    }

    return project;
  }

  async deleteProject(projectId) {
    const index = this.app.state.projects.findIndex(p => p.id === projectId);

    if (index === -1) {
      throw new Error('Project not found');
    }

    // Check for related data
    const relatedInvoices = this.app.state.invoices.filter(i => i.projectId === projectId);

    if (relatedInvoices.length > 0) {
      const confirmed = await this.app.confirm(
        'Delete Project?',
        `This will also delete ${relatedInvoices.length} invoice(s). This cannot be undone.`
      );

      if (!confirmed) return false;

      // Delete related invoices
      relatedInvoices.forEach(invoice => {
        this.app.invoiceManager.deleteInvoice(invoice.id);
      });
    }

    this.app.state.projects.splice(index, 1);
    await this.app.saveData();

    return true;
  }

  getProjects(filter = {}) {
    let projects = this.app.state.projects;

    if (filter.status) {
      projects = projects.filter(p => p.status === filter.status);
    }

    if (filter.clientId) {
      projects = projects.filter(p => p.clientId === filter.clientId);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(search)
      );
    }

    return projects;
  }

  getProjectsByStatus() {
    return {
      toStart: this.getProjects({ status: 'to_start' }),
      working: this.getProjects({ status: 'working' }),
      done: this.getProjects({ status: 'done' }),
      paid: this.getProjects({ status: 'paid' })
    };
  }
}

module.exports = ProjectManager;
```

---

## Backend Implementation

### Express Server (index.js)

```javascript
// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import sql from './database.js';
import licenseRoutes from './routes/license.js';
import webhookRoutes from './routes/webhook.js';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));

// Body parsing
app.use('/webhook/stripe', express.raw({ type: 'application/json' })); // Raw for Stripe
app.use(express.json()); // JSON for other routes

// Routes
app.use('/api', licenseRoutes);
app.use('/webhook', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});

export { stripe, sql };
```

### Database Connection (database.js)

```javascript
// backend/src/database.js
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export default sql;
```

### License Routes (routes/license.js)

```javascript
// backend/src/routes/license.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../database.js';

const router = express.Router();

// Start trial
router.post('/start-trial', async (req, res) => {
  try {
    const { email, machineId } = req.body;

    // Validate input
    if (!email || !machineId) {
      return res.status(400).json({
        success: false,
        error: 'Email and machine ID required'
      });
    }

    // Check if email already exists
    const existing = await sql`
      SELECT * FROM licenses WHERE email = ${email}
    `;

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Create trial license
    const licenseKey = uuidv4();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14); // 14-day trial

    await sql`
      INSERT INTO licenses (
        email,
        license_key,
        status,
        tier,
        machine_ids,
        max_devices,
        valid_until,
        last_validated,
        created_at
      ) VALUES (
        ${email},
        ${licenseKey},
        'trial',
        'free',
        ARRAY[${machineId}],
        2,
        ${validUntil},
        NOW(),
        NOW()
      )
    `;

    res.json({
      success: true,
      licenseKey,
      validUntil: validUntil.toISOString()
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create trial'
    });
  }
});

// Validate license
router.post('/validate', async (req, res) => {
  try {
    const { email, licenseKey, machineId } = req.body;

    // Validate input
    if (!email || !licenseKey || !machineId) {
      return res.status(400).json({
        valid: false,
        reason: 'Missing required fields'
      });
    }

    // Get license
    const licenses = await sql`
      SELECT * FROM licenses
      WHERE email = ${email} AND license_key = ${licenseKey}
    `;

    if (licenses.length === 0) {
      return res.json({
        valid: false,
        reason: 'License not found'
      });
    }

    const license = licenses[0];

    // Check expiration
    if (license.valid_until && new Date(license.valid_until) < new Date()) {
      return res.json({
        valid: false,
        reason: 'License expired'
      });
    }

    // Check status
    if (license.status === 'cancelled' || license.status === 'expired') {
      return res.json({
        valid: false,
        reason: 'License inactive'
      });
    }

    // Check device limit
    if (!license.machine_ids.includes(machineId)) {
      if (license.machine_ids.length >= license.max_devices) {
        return res.json({
          valid: false,
          reason: 'Device limit reached',
          maxDevices: license.max_devices,
          activeDevices: license.machine_ids.length
        });
      }

      // Add new machine ID
      await sql`
        UPDATE licenses
        SET machine_ids = array_append(machine_ids, ${machineId}),
            last_validated = NOW()
        WHERE id = ${license.id}
      `;
    } else {
      // Update last validated
      await sql`
        UPDATE licenses
        SET last_validated = NOW()
        WHERE id = ${license.id}
      `;
    }

    res.json({
      valid: true,
      status: license.status,
      tier: license.tier,
      validUntil: license.valid_until
    });
  } catch (error) {
    console.error('Validate error:', error);
    res.status(500).json({
      valid: false,
      reason: 'Validation failed'
    });
  }
});

// Get license info
router.get('/license-info', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const licenses = await sql`
      SELECT
        email,
        status,
        tier,
        valid_until,
        max_devices,
        array_length(machine_ids, 1) as active_devices
      FROM licenses
      WHERE email = ${email}
    `;

    if (licenses.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json(licenses[0]);
  } catch (error) {
    console.error('License info error:', error);
    res.status(500).json({ error: 'Failed to get license info' });
  }
});

export default router;
```

### Stripe Webhook (routes/webhook.js)

```javascript
// backend/src/routes/webhook.js
import express from 'express';
import { stripe, sql } from '../index.js';

const router = express.Router();

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCheckoutCompleted(session) {
  const customerEmail = session.customer_email;
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const tier = subscription.items.data[0].price.lookup_key; // 'pro' or 'business'

  // Update license
  await sql`
    UPDATE licenses
    SET
      stripe_customer_id = ${customerId},
      stripe_subscription_id = ${subscriptionId},
      status = 'active',
      tier = ${tier},
      valid_until = NULL
    WHERE email = ${customerEmail}
  `;

  console.log(`License activated for ${customerEmail} - ${tier} tier`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;
  const tier = subscription.items.data[0].price.lookup_key;

  await sql`
    UPDATE licenses
    SET
      status = ${status === 'active' ? 'active' : 'expired'},
      tier = ${tier}
    WHERE stripe_customer_id = ${customerId}
  `;

  console.log(`Subscription updated for customer ${customerId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  await sql`
    UPDATE licenses
    SET
      status = 'cancelled',
      valid_until = NOW() + INTERVAL '7 days'
    WHERE stripe_customer_id = ${customerId}
  `;

  console.log(`Subscription cancelled for customer ${customerId}`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  // Stripe will retry automatically, but we can log it
  console.log(`Payment failed for customer ${customerId}`);

  // Optionally notify user via email
}

export default router;
```

---

## Database Schema

### PostgreSQL Schema (schema.sql)

```sql
-- backend/schema.sql

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  license_key UUID UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trial',
  tier VARCHAR(50) DEFAULT 'free',
  machine_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_devices INTEGER DEFAULT 2,
  valid_until TIMESTAMP,
  last_validated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_email ON licenses(email);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_stripe_customer ON licenses(stripe_customer_id);

-- Validation attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS validation_attempts (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  email VARCHAR(255),
  attempted_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_validation_ip ON validation_attempts(ip_address, attempted_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Data Models

### Local Storage Data Models (Desktop App)

```typescript
// Type definitions (for reference)

interface Client {
  id: string; // UUID
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  tags?: string[];
  paymentHistory?: PaymentRecord[];
  paymentMetrics?: {
    totalInvoices: number;
    paidOnTime: number;
    onTimeRate: number;
    avgDaysLate: number;
  };
  reminderSchedule?: 'standard' | 'gentle' | 'aggressive' | 'minimal' | 'none';
  createdDate: string; // ISO date
  updatedDate: string; // ISO date
}

interface Project {
  id: string; // UUID
  name: string;
  clientId: string; // Reference to Client
  amount: number;
  currency: string; // 'EUR', 'USD', etc.
  status: 'to_start' | 'working' | 'done' | 'paid';
  deadline?: string; // ISO date
  platform?: 'direct' | 'upwork' | 'fiverr' | 'other';
  notes?: string;
  attachments?: Attachment[];
  recurring?: boolean;
  recurringTemplateId?: string;
  createdDate: string; // ISO date
  updatedDate: string; // ISO date
}

interface Invoice {
  id: string; // UUID
  number: string; // 'INV-2025-042'
  projectId: string; // Reference to Project
  clientId: string; // Reference to Client
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'cancelled';
  createdDate: string; // ISO date
  sentDate?: string; // ISO date
  dueDate?: string; // ISO date
  paidDate?: string; // ISO date
  partialAmount?: number;
  remainingAmount?: number;
  templateId?: string;
  notes?: string;
}

interface Payment {
  id: string; // UUID
  invoiceId: string; // Reference to Invoice
  amount: number;
  currency: string;
  method: 'paypal' | 'stripe' | 'bank_transfer' | 'cash' | 'other';
  transactionId?: string;
  receivedDate: string; // ISO date
  autoDetected: boolean;
  notes?: string;
}

interface Reminder {
  id: string; // UUID
  invoiceId: string; // Reference to Invoice
  templateType: 'gentle' | 'dueToday' | 'overdue' | 'finalNotice';
  scheduledDate: string; // ISO date
  sentDate?: string; // ISO date
  status: 'scheduled' | 'sent' | 'cancelled';
  cancelReason?: string;
  channels?: ('email' | 'sms' | 'whatsapp')[];
}

interface Profile {
  name: string;
  businessName?: string;
  email: string;
  phone?: string;
  website?: string;
  avatar?: string; // Base64 or file path
  paypalEmail?: string;
  bankDetails?: string;
  logo?: string; // Base64 or file path
  brandColor?: string; // Hex color
  invoiceFooter?: string;
  emailSignature?: string;
}

interface Settings {
  // Currency
  currency: string;

  // Invoice
  invoiceNumberFormat: string;
  invoiceStartNumber: number;
  invoiceResetYearly: boolean;
  autoInvoiceEnabled: boolean;
  autoInvoiceDelay: number;
  defaultInvoiceTemplate: string;
  invoiceDueDays: number;

  // Reminders
  reminderEnabled: boolean;
  reminderSchedule: number[];
  defaultReminderStrategy: string;

  // Payments
  paymentDetectionEnabled: boolean;
  paymentCheckInterval: number;

  // Notifications
  notifications: {
    [eventType: string]: string[]; // Event type → channels
  };
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;

  // Backup
  backupEnabled: boolean;
  backupFrequency: string;
  backupTime: string;
  backupKeepCount: number;
}
```

---

## Security Implementation

### Encryption (utils/crypto.js)

```javascript
// desktop/src/utils/crypto.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

class CryptoUtil {
  static generateKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );
  }

  static encrypt(text, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.generateKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  static decrypt(encryptedData, password) {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = this.generateKey(password, salt);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = CryptoUtil;
```

### Rate Limiting (Backend)

```javascript
// backend/src/middleware/rate-limit.js
const rateLimits = new Map();

export function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, []);
    }

    const requests = rateLimits.get(ip);

    // Remove old requests outside window
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    recentRequests.push(now);
    rateLimits.set(ip, recentRequests);

    next();
  };
}
```

---

## Deployment Configuration

### Environment Variables

**Backend (.env):**
```bash
# Server
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*

# Database
DATABASE_URL=postgresql://user:password@host:5432/gigzilla

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Security
JWT_SECRET=your-super-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
```

**Desktop (.env):**
```bash
LICENSE_API_URL=https://api.gigzilla.app
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Electron Builder Configuration

```yaml
# desktop/electron-builder.yml
appId: com.gigzilla.app
productName: Gigzilla
copyright: Copyright © 2025 Gigzilla

directories:
  output: dist
  buildResources: assets

files:
  - src/**/*
  - node_modules/**/*
  - package.json

mac:
  category: public.app-category.business
  icon: assets/icon.icns
  target:
    - dmg
    - zip
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: assets/entitlements.mac.plist
  entitlementsInherit: assets/entitlements.mac.plist

win:
  icon: assets/icon.ico
  target:
    - nsis
    - portable

linux:
  icon: assets/icon.png
  target:
    - AppImage
    - deb
  category: Office

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

publish:
  provider: github
  owner: yourusername
  repo: gigzilla
  releaseType: release
```

### Docker Configuration (Backend)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=gigzilla
      - POSTGRES_USER=gigzilla
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  postgres_data:
```

---

**Next:** See `GIGZILLA-IMPLEMENTATION-PLAN.md` for step-by-step development roadmap and prompts for Claude Code to build each component.
