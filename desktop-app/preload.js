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
