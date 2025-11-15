/**
 * Gigzilla Desktop App - Electron Main Process
 *
 * Handles:
 * - App lifecycle and window management
 * - Menu bar
 * - IPC communication with renderer processes
 * - Database initialization
 */

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import database service
const DatabaseService = require('./src/database/database-service');
let databaseService = null;

// Initialize secure storage
const store = new Store({
  name: 'gigzilla-data',
  encryptionKey: 'gigzilla-secure-storage-key-2025' // Change this in production!
});

// Global state
let mainWindow = null;

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(async () => {
  console.log('[MAIN] App ready, initializing...');

  // Initialize database
  databaseService = new DatabaseService();
  databaseService.initialize();

  // Create main window
  createMainWindow();

  // Create menu bar
  createMenuBar();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connection
  if (databaseService) {
    databaseService.close();
  }
});

// ============================================
// WINDOW CREATION
// ============================================

/**
 * Create main application window
 */
function createMainWindow() {
  console.log('[MAIN] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// MENU BAR
// ============================================

/**
 * Create application menu bar
 */
function createMenuBar() {
  const template = [
    {
      label: 'Gigzilla',
      submenu: [
        {
          label: 'About Gigzilla',
          click: () => showAboutDialog()
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => showPreferences()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Client',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToRenderer('new-client')
        },
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => sendToRenderer('new-project')
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          click: () => sendToRenderer('export-data')
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://gigzilla.site/docs');
          }
        },
        {
          label: 'Contact Support',
          click: () => {
            shell.openExternal('mailto:support@gigzilla.site');
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => checkForUpdates()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================
// MENU HANDLERS
// ============================================

/**
 * Show about dialog
 */
function showAboutDialog() {
  dialog.showMessageBox({
    type: 'info',
    title: 'About Gigzilla',
    message: 'Gigzilla',
    detail: `Version: 1.0.0\nFreelancer Management Platform\n\n© 2025 Gigzilla\nhttps://gigzilla.site`,
    buttons: ['OK']
  });
}

/**
 * Show preferences window
 */
function showPreferences() {
  sendToRenderer('show-preferences');
}

/**
 * Check for updates
 */
function checkForUpdates() {
  dialog.showMessageBox({
    type: 'info',
    title: 'Check for Updates',
    message: 'You are using the latest version.',
    detail: 'Version: 1.0.0',
    buttons: ['OK']
  });
}

/**
 * Send message to renderer process
 */
function sendToRenderer(channel, data = null) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, data);
  }
}

// ============================================
// IPC HANDLERS
// ============================================

/**
 * Expose electron store API to renderer
 */
ipcMain.handle('store-get', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', async (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', async (event, key) => {
  store.delete(key);
});

/**
 * Open external URL in system browser
 */
ipcMain.handle('open-external', async (event, url) => {
  try {
    console.log('[MAIN] Opening external URL:', url);
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('[MAIN] Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// ERROR HANDLING
// ============================================

process.on('uncaughtException', (error) => {
  console.error('[MAIN] Uncaught exception:', error);
  dialog.showErrorBox('Application Error', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('[MAIN] Unhandled rejection:', error);
});
