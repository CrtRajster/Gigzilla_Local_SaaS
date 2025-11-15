/**
 * Database Service
 * Main process service that handles all database operations
 * Exposes IPC handlers for renderer process to communicate with database
 */

const { ipcMain } = require('electron');
const DatabaseManager = require('./db-manager');

class DatabaseService {
  constructor() {
    this.db = null;
    this.setupIPC();
  }

  initialize() {
    try {
      this.db = new DatabaseManager();
      console.log('[DatabaseService] Database initialized');
      return true;
    } catch (error) {
      console.error('[DatabaseService] Failed to initialize:', error);
      return false;
    }
  }

  setupIPC() {
    // ==========================================
    // CLIENTS
    // ==========================================

    ipcMain.handle('db:addClient', async (event, client) => {
      return this.db.addClient(client);
    });

    ipcMain.handle('db:getClient', async (event, id) => {
      return this.db.getClient(id);
    });

    ipcMain.handle('db:getAllClients', async (event) => {
      return this.db.getAllClients();
    });

    ipcMain.handle('db:updateClient', async (event, id, updates) => {
      return this.db.updateClient(id, updates);
    });

    ipcMain.handle('db:deleteClient', async (event, id) => {
      return this.db.deleteClient(id);
    });

    ipcMain.handle('db:searchClients', async (event, query) => {
      return this.db.searchClients(query);
    });

    // ==========================================
    // PROJECTS
    // ==========================================

    ipcMain.handle('db:addProject', async (event, project) => {
      return this.db.addProject(project);
    });

    ipcMain.handle('db:getProject', async (event, id) => {
      return this.db.getProject(id);
    });

    ipcMain.handle('db:getAllProjects', async (event) => {
      return this.db.getAllProjects();
    });

    ipcMain.handle('db:getProjectsByStatus', async (event, status) => {
      return this.db.getProjectsByStatus(status);
    });

    ipcMain.handle('db:getProjectsByClient', async (event, clientId) => {
      return this.db.getProjectsByClient(clientId);
    });

    ipcMain.handle('db:updateProject', async (event, id, updates) => {
      return this.db.updateProject(id, updates);
    });

    ipcMain.handle('db:deleteProject', async (event, id) => {
      return this.db.deleteProject(id);
    });

    // ==========================================
    // INVOICES
    // ==========================================

    ipcMain.handle('db:addInvoice', async (event, invoice) => {
      return this.db.addInvoice(invoice);
    });

    ipcMain.handle('db:getInvoice', async (event, id) => {
      return this.db.getInvoice(id);
    });

    ipcMain.handle('db:getAllInvoices', async (event) => {
      return this.db.getAllInvoices();
    });

    ipcMain.handle('db:getInvoicesByStatus', async (event, status) => {
      return this.db.getInvoicesByStatus(status);
    });

    ipcMain.handle('db:getOverdueInvoices', async (event) => {
      return this.db.getOverdueInvoices();
    });

    ipcMain.handle('db:updateInvoice', async (event, id, updates) => {
      return this.db.updateInvoice(id, updates);
    });

    ipcMain.handle('db:deleteInvoice', async (event, id) => {
      return this.db.deleteInvoice(id);
    });

    // ==========================================
    // STATISTICS
    // ==========================================

    ipcMain.handle('db:getStats', async (event) => {
      return this.db.getStats();
    });

    ipcMain.handle('db:getClientStats', async (event, clientId) => {
      return this.db.getClientStats(clientId);
    });

    // ==========================================
    // ACTIVITY
    // ==========================================

    ipcMain.handle('db:getRecentActivities', async (event, limit) => {
      return this.db.getRecentActivities(limit);
    });

    // ==========================================
    // SETTINGS
    // ==========================================

    ipcMain.handle('db:getSetting', async (event, key) => {
      return this.db.getSetting(key);
    });

    ipcMain.handle('db:setSetting', async (event, key, value, type) => {
      return this.db.setSetting(key, value, type);
    });

    ipcMain.handle('db:getAllSettings', async (event) => {
      return this.db.getAllSettings();
    });

    // ==========================================
    // BACKUP & RESTORE
    // ==========================================

    ipcMain.handle('db:backup', async (event, outputPath) => {
      return this.db.backup(outputPath);
    });

    ipcMain.handle('db:restore', async (event, backupPath) => {
      return this.db.restore(backupPath);
    });

    // ==========================================
    // MIGRATION
    // ==========================================

    ipcMain.handle('db:importData', async (event, data) => {
      return this.db.importData(data);
    });

    // ==========================================
    // UTILITIES
    // ==========================================

    ipcMain.handle('db:generateId', async (event, prefix) => {
      return this.db.generateId(prefix);
    });

    ipcMain.handle('db:generateInvoiceNumber', async (event) => {
      return this.db.generateInvoiceNumber();
    });

    ipcMain.handle('db:getDefaultDueDate', async (event) => {
      return this.db.getDefaultDueDate();
    });

    console.log('[DatabaseService] IPC handlers registered');
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseService;
