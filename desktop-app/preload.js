/**
 * Gigzilla Desktop App - Preload Script
 *
 * Security bridge between main and renderer processes
 * Exposes safe APIs to renderer while maintaining security
 *
 * Features:
 * - Secure storage API (electron-store)
 * - IPC communication
 * - System information
 * - No direct Node.js access to renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// ============================================
// EXPOSED APIs
// ============================================

/**
 * Expose electronAPI to renderer process
 * All communication goes through this secure bridge
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==========================================
  // STORAGE API
  // ==========================================

  /**
   * Get value from secure storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Value
   */
  storeGet: (key) => {
    return ipcRenderer.invoke('store-get', key);
  },

  /**
   * Set value in secure storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<void>}
   */
  storeSet: (key, value) => {
    return ipcRenderer.invoke('store-set', key, value);
  },

  /**
   * Delete value from secure storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  storeDelete: (key) => {
    return ipcRenderer.invoke('store-delete', key);
  },

  // ==========================================
  // LICENSE MANAGEMENT
  // ==========================================

  /**
   * Get current license state
   * @returns {Promise<object>} License state
   */
  getLicenseState: () => {
    return ipcRenderer.invoke('get-license-state');
  },

  /**
   * Refresh license from server
   * @returns {Promise<object>} Updated license state
   */
  refreshLicense: () => {
    return ipcRenderer.invoke('refresh-license');
  },

  /**
   * Notify main process that license was activated
   */
  licenseActivated: () => {
    ipcRenderer.send('license-activated');
  },

  /**
   * Generic IPC invoke for database operations and auth
   * @param {string} channel - IPC channel name
   * @param {...any} args - Arguments to pass
   * @returns {Promise<any>} Result from main process
   */
  invoke: (channel, ...args) => {
    // Whitelist allowed channels for security
    const allowedChannels = [
      // Database operations
      'db:addClient', 'db:getClient', 'db:getAllClients', 'db:updateClient', 'db:deleteClient', 'db:searchClients',
      'db:addProject', 'db:getProject', 'db:getAllProjects', 'db:getProjectsByStatus', 'db:getProjectsByClient', 'db:updateProject', 'db:deleteProject',
      'db:addInvoice', 'db:getInvoice', 'db:getAllInvoices', 'db:getInvoicesByStatus', 'db:getOverdueInvoices', 'db:updateInvoice', 'db:deleteInvoice',
      'db:getStats', 'db:getClientStats', 'db:getRecentActivities',
      'db:getSetting', 'db:setSetting', 'db:getAllSettings',
      'db:backup', 'db:restore', 'db:importData',
      'db:generateId', 'db:generateInvoiceNumber', 'db:getDefaultDueDate',
      // Auth operations
      'auth:validateLicense', 'auth:checkSubscription', 'auth:refreshSubscription'
    ];

    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.warn('[PRELOAD] Blocked unauthorized IPC channel:', channel);
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    }
  },

  /**
   * Open URL in system browser
   * @param {string} url - URL to open
   * @returns {Promise<void>}
   */
  openExternal: (url) => {
    return ipcRenderer.invoke('open-external', url);
  },

  // ==========================================
  // SYSTEM INFORMATION
  // ==========================================

  /**
   * Get platform information
   * @returns {string} Platform ('win32', 'darwin', 'linux')
   */
  getPlatform: () => {
    return process.platform;
  },

  /**
   * Get app version
   * @returns {string} Version
   */
  getVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  /**
   * Listen for messages from main process
   * @param {string} channel - Event channel
   * @param {function} callback - Callback function
   */
  on: (channel, callback) => {
    const validChannels = [
      'show-notification',
      'license-updated',
      'new-client',
      'new-project',
      'export-data',
      'show-preferences'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    } else {
      console.warn('[PRELOAD] Invalid channel:', channel);
    }
  },

  /**
   * Remove event listener
   * @param {string} channel - Event channel
   * @param {function} callback - Callback function
   */
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// ============================================
// GLOBAL FETCH POLYFILL
// ============================================

/**
 * Ensure fetch is available in renderer
 * (Electron has fetch built-in, but this ensures compatibility)
 */
if (typeof window !== 'undefined' && !window.fetch) {
  window.fetch = require('node-fetch');
}

// ============================================
// CONSOLE LOGGING
// ============================================

/**
 * Log preload script loaded
 */
console.log('[PRELOAD] Preload script loaded successfully');
console.log('[PRELOAD] Platform:', process.platform);
console.log('[PRELOAD] Node version:', process.versions.node);
console.log('[PRELOAD] Electron version:', process.versions.electron);
console.log('[PRELOAD] Chrome version:', process.versions.chrome);
