/**
 * Gigzilla Desktop App - Electron Main Process
 *
 * Handles:
 * - App lifecycle and window management
 * - License validation on startup
 * - Authentication flow (activation screen vs main app)
 * - Menu bar with Account/License management
 * - IPC communication with renderer processes
 * - License state management
 * - Offline mode handling
 * - License expiration warnings
 */

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import authentication manager
const authManager = require('../desktop-app-auth/auth-manager');

// Import database service
const DatabaseService = require('./src/database/database-service');
let databaseService = null;

// Initialize secure storage
const store = new Store({
  name: 'gigzilla-license',
  encryptionKey: 'gigzilla-secure-storage-key-2025' // Change this in production!
});

// Global state
let mainWindow = null;
let activationWindow = null;
let loadingWindow = null;
let licenseState = {
  isValid: false,
  license: null,
  offline: false,
  needsActivation: true
};

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(async () => {
  console.log('[MAIN] App ready, initializing...');

  // Initialize database
  databaseService = new DatabaseService();
  databaseService.initialize();

  // Show loading screen
  createLoadingWindow();

  // Validate license on startup
  await validateLicenseOnStartup();

  // Create appropriate window based on license state
  if (licenseState.needsActivation) {
    createActivationWindow();
  } else {
    createMainWindow();
  }

  // Close loading window
  if (loadingWindow) {
    loadingWindow.close();
    loadingWindow = null;
  }

  // Create menu bar
  createMenuBar();

  // Start periodic license check (every 24 hours)
  startPeriodicLicenseCheck();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (licenseState.needsActivation) {
        createActivationWindow();
      } else {
        createMainWindow();
      }
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
 * Create loading window
 */
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  loadingWindow.center();
}

/**
 * Create activation window (license entry)
 */
function createActivationWindow() {
  console.log('[MAIN] Creating activation window...');

  activationWindow = new BrowserWindow({
    width: 600,
    height: 650,
    minWidth: 500,
    minHeight: 550,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  activationWindow.loadFile(path.join(__dirname, '../desktop-app-auth/activation-screen.html'));

  activationWindow.on('closed', () => {
    activationWindow = null;
  });
}

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

  // Check license expiration on window focus
  mainWindow.on('focus', () => {
    checkLicenseExpiration();
  });
}

// ============================================
// LICENSE VALIDATION
// ============================================

/**
 * Validate license on app startup
 */
async function validateLicenseOnStartup() {
  try {
    console.log('[MAIN] Validating license on startup...');

    const result = await authManager.validateOnStartup();

    licenseState = {
      isValid: result.valid || false,
      license: result.license || null,
      offline: result.offline || false,
      offlineMode: result.offlineMode || false,
      needsActivation: result.needsActivation || false,
      warning: result.warning || null
    };

    console.log('[MAIN] License state:', {
      valid: licenseState.isValid,
      needsActivation: licenseState.needsActivation,
      offline: licenseState.offline
    });

    // Show offline warning if applicable
    if (licenseState.offlineMode && licenseState.warning) {
      setTimeout(() => {
        showNotification('Working Offline', licenseState.warning);
      }, 2000);
    }

  } catch (error) {
    console.error('[MAIN] License validation error:', error);
    licenseState.needsActivation = true;
  }
}

/**
 * Periodic license check (every 24 hours)
 */
function startPeriodicLicenseCheck() {
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    console.log('[MAIN] Periodic license check...');

    try {
      const currentUser = await authManager.getCurrentUser();

      if (currentUser && currentUser.email) {
        const result = await authManager.checkSubscription(currentUser.email);

        if (!result.isValid) {
          console.warn('[MAIN] License no longer valid!');

          // Show dialog and switch to activation screen
          const response = await dialog.showMessageBox({
            type: 'warning',
            title: 'License Invalid',
            message: 'Your license is no longer valid.',
            detail: result.message || 'Please renew your subscription to continue using Gigzilla.',
            buttons: ['Renew License', 'Continue Limited Mode'],
            defaultId: 0
          });

          if (response.response === 0) {
            // Open renewal page
            shell.openExternal('https://gigzilla.site/subscribe');
          }
        }
      }
    } catch (error) {
      console.error('[MAIN] Periodic check error:', error);
    }
  }, CHECK_INTERVAL);
}

/**
 * Check for license expiration warnings
 */
async function checkLicenseExpiration() {
  try {
    const currentUser = await authManager.getCurrentUser();

    if (!currentUser || !currentUser.license) {
      return;
    }

    const license = currentUser.license;

    // Check trial expiration (7 days warning)
    if (license.status === 'trial' && license.valid_until) {
      const validUntil = new Date(license.valid_until);
      const now = new Date();
      const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 7 && daysRemaining > 0) {
        showNotification(
          'Trial Ending Soon',
          `Your trial expires in ${daysRemaining} days. Subscribe to continue using Gigzilla.`
        );
      }
    }

    // Check offline token expiration
    if (currentUser.offlineStatus && currentUser.offlineStatus.isValid) {
      const daysRemaining = currentUser.offlineStatus.daysRemaining;

      if (daysRemaining <= 2 && daysRemaining > 0) {
        showNotification(
          'Connect to Internet',
          `Offline mode expires in ${daysRemaining} days. Please connect to revalidate your license.`
        );
      }
    }

  } catch (error) {
    console.error('[MAIN] License expiration check error:', error);
  }
}

/**
 * Show system notification
 */
function showNotification(title, body) {
  if (mainWindow) {
    mainWindow.webContents.send('show-notification', { title, body });
  }
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
      label: 'Account',
      submenu: [
        {
          label: 'License Information',
          click: () => showLicenseInfo()
        },
        {
          label: 'Manage Devices',
          click: () => showDeviceManagement()
        },
        { type: 'separator' },
        {
          label: 'Upgrade Plan',
          click: () => {
            shell.openExternal('https://gigzilla.site/subscribe');
          }
        },
        {
          label: 'Referral Program',
          click: () => showReferralInfo()
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => handleLogout()
        },
        {
          label: 'Deactivate This Device',
          click: () => handleDeviceDeactivation()
        }
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
 * Show license information dialog
 */
async function showLicenseInfo() {
  try {
    const currentUser = await authManager.getCurrentUser();

    if (!currentUser) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No License',
        message: 'No active license found.',
        buttons: ['OK']
      });
      return;
    }

    const license = currentUser.license || {};
    const offlineStatus = currentUser.offlineStatus || {};

    let detail = `Email: ${currentUser.email}\n`;
    detail += `Status: ${license.status || 'Unknown'}\n`;
    detail += `Tier: ${license.tier || 'Free'}\n`;
    detail += `Devices: ${license.devices_used || 0}/${license.max_devices || 3}\n`;

    if (license.valid_until) {
      detail += `Trial Expires: ${new Date(license.valid_until).toLocaleDateString()}\n`;
    }

    if (license.next_billing_date) {
      detail += `Next Billing: ${new Date(license.next_billing_date).toLocaleDateString()}\n`;
    }

    if (offlineStatus.isValid) {
      detail += `\nOffline Mode: ${offlineStatus.message}`;
    }

    dialog.showMessageBox({
      type: 'info',
      title: 'License Information',
      message: 'Your Gigzilla License',
      detail: detail,
      buttons: ['OK']
    });

  } catch (error) {
    console.error('[MAIN] License info error:', error);
    dialog.showErrorBox('Error', 'Failed to retrieve license information.');
  }
}

/**
 * Show device management dialog
 */
async function showDeviceManagement() {
  try {
    const currentUser = await authManager.getCurrentUser();

    if (!currentUser) {
      dialog.showMessageBox({
        type: 'warning',
        title: 'No License',
        message: 'No active license found.',
        buttons: ['OK']
      });
      return;
    }

    const result = await authManager.getActiveDevices(currentUser.email);

    if (!result.success || result.devices.length === 0) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Device Management',
        message: 'No devices registered yet.',
        buttons: ['OK']
      });
      return;
    }

    // Build device list
    let detail = `Devices Used: ${result.devicesUsed}/${result.maxDevices}\n\n`;
    result.devices.forEach((device, index) => {
      detail += `${index + 1}. ${device.preview}\n`;
      if (device.registeredAt) {
        detail += `   Registered: ${new Date(device.registeredAt).toLocaleDateString()}\n`;
      }
      detail += '\n';
    });

    detail += '\nTo deactivate a device, use the "Deactivate This Device" option from the Account menu on that device.';

    dialog.showMessageBox({
      type: 'info',
      title: 'Device Management',
      message: 'Registered Devices',
      detail: detail,
      buttons: ['OK']
    });

  } catch (error) {
    console.error('[MAIN] Device management error:', error);
    dialog.showErrorBox('Error', 'Failed to retrieve device information.');
  }
}

/**
 * Show referral information
 */
async function showReferralInfo() {
  try {
    const currentUser = await authManager.getCurrentUser();

    if (!currentUser) {
      dialog.showMessageBox({
        type: 'warning',
        title: 'No License',
        message: 'Please activate Gigzilla first.',
        buttons: ['OK']
      });
      return;
    }

    const stats = await authManager.getReferralStats(currentUser.email);

    let detail = `Your Referral Code: ${stats.referralCode}\n\n`;
    detail += `Total Referrals: ${stats.totalReferrals}\n`;
    detail += `Credits Earned: €${stats.creditsEarned}\n\n`;
    detail += `Share your referral link:\n${stats.referralLink}\n\n`;
    detail += `Earn €9 for each friend who subscribes!`;

    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Referral Program',
      message: 'Refer Friends, Earn Credits',
      detail: detail,
      buttons: ['Copy Referral Link', 'Close'],
      defaultId: 0
    });

    if (response.response === 0) {
      // Copy referral link to clipboard
      const { clipboard } = require('electron');
      clipboard.writeText(stats.referralLink);

      dialog.showMessageBox({
        type: 'info',
        title: 'Copied!',
        message: 'Referral link copied to clipboard.',
        buttons: ['OK']
      });
    }

  } catch (error) {
    console.error('[MAIN] Referral info error:', error);
    dialog.showErrorBox('Error', 'Failed to retrieve referral information.');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  const response = await dialog.showMessageBox({
    type: 'question',
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    detail: 'You will need to activate Gigzilla again to continue using it.',
    buttons: ['Cancel', 'Logout'],
    defaultId: 0,
    cancelId: 0
  });

  if (response.response === 1) {
    try {
      await authManager.logout();

      // Close main window and show activation screen
      if (mainWindow) {
        mainWindow.close();
      }

      licenseState.needsActivation = true;
      createActivationWindow();

    } catch (error) {
      console.error('[MAIN] Logout error:', error);
      dialog.showErrorBox('Error', 'Failed to logout.');
    }
  }
}

/**
 * Handle device deactivation
 */
async function handleDeviceDeactivation() {
  const response = await dialog.showMessageBox({
    type: 'warning',
    title: 'Deactivate This Device',
    message: 'Are you sure you want to deactivate this device?',
    detail: 'This will remove this device from your license and free up a slot. You will need to activate Gigzilla again on this device.',
    buttons: ['Cancel', 'Deactivate'],
    defaultId: 0,
    cancelId: 0
  });

  if (response.response === 1) {
    try {
      const result = await authManager.deactivateCurrentDevice();

      if (result.success) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Device Deactivated',
          message: 'This device has been deactivated successfully.',
          detail: `Devices remaining: ${result.devicesRemaining}/${result.maxDevices}`,
          buttons: ['OK']
        });

        // Close app and restart to show activation screen
        app.relaunch();
        app.quit();
      } else {
        dialog.showErrorBox('Deactivation Failed', result.message || 'Failed to deactivate device.');
      }

    } catch (error) {
      console.error('[MAIN] Device deactivation error:', error);
      dialog.showErrorBox('Error', 'Failed to deactivate device.');
    }
  }
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
 * Handle license activation success
 */
ipcMain.on('license-activated', async (event) => {
  console.log('[MAIN] License activated, switching to main app...');

  // Close activation window
  if (activationWindow) {
    activationWindow.close();
  }

  // Revalidate license
  await validateLicenseOnStartup();

  // Create main window
  createMainWindow();
});

/**
 * Get license state
 */
ipcMain.handle('get-license-state', async () => {
  return licenseState;
});

/**
 * Refresh license
 */
ipcMain.handle('refresh-license', async () => {
  await validateLicenseOnStartup();
  return licenseState;
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

/**
 * Validate license via auth manager
 */
ipcMain.handle('auth:validateLicense', async (event, email) => {
  try {
    console.log('[MAIN] Validating license for:', email);
    const result = await authManager.validateLicense(email);

    // Update license state
    if (result.valid) {
      licenseState.isValid = true;
      licenseState.license = result.license;
      licenseState.needsActivation = false;
      licenseState.offline = false;

      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('license-updated', licenseState);
      }
    }

    return result;
  } catch (error) {
    console.error('[MAIN] License validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
});

/**
 * Check subscription status via auth manager
 */
ipcMain.handle('auth:checkSubscription', async (event, email) => {
  try {
    console.log('[MAIN] Checking subscription for:', email);
    const result = await authManager.checkSubscription(email);

    // Update license state
    if (result.isValid) {
      licenseState.isValid = true;
      licenseState.license = result.license;
      licenseState.needsActivation = false;
      licenseState.offline = result.offline || false;

      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('license-updated', licenseState);
      }
    }

    return result;
  } catch (error) {
    console.error('[MAIN] Subscription check error:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
});

/**
 * Refresh subscription via auth manager
 */
ipcMain.handle('auth:refreshSubscription', async (event) => {
  try {
    console.log('[MAIN] Refreshing subscription...');
    const result = await authManager.refreshSubscription();

    // Update license state
    if (result.success) {
      licenseState.isValid = true;
      licenseState.license = result.license;
      licenseState.needsActivation = false;
      licenseState.offline = false;

      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('license-updated', licenseState);
      }
    }

    return result;
  } catch (error) {
    console.error('[MAIN] Subscription refresh error:', error);
    return {
      success: false,
      error: error.message
    };
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
