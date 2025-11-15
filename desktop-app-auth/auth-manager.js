/**
 * Gigzilla Desktop App - Authentication Manager
 *
 * Zero-storage authentication using Stripe + JWT tokens
 * All user data stays local on their machine
 *
 * Features:
 * - Hardware-based machine ID generation (SHA-256)
 * - API communication with Cloudflare Workers backend
 * - Secure local storage of license data and JWT tokens
 * - Offline grace period (7 days via JWT)
 * - Automatic re-validation logic
 * - Comprehensive error handling
 */

const { shell } = require('electron');
const machineId = require('./machine-id');

// Configuration
const API_URL = process.env.API_URL || 'https://gigzilla-api.YOUR-USERNAME.workers.dev';
const STRIPE_CHECKOUT_URL = process.env.STRIPE_CHECKOUT_URL || 'https://gigzilla.site/subscribe';

// Re-validation settings
const REVALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const OFFLINE_GRACE_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Validate JWT token locally (for offline mode)
 * Returns { valid: boolean, expired: boolean, data: object|null }
 */
function validateJWT(token) {
  try {
    if (!token) {
      return { valid: false, expired: false, data: null };
    }

    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expired: false, data: null };
    }

    // Decode payload (Base64URL)
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    const data = JSON.parse(payload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const expired = data.exp && data.exp < now;

    return {
      valid: !expired,
      expired: expired,
      data: data
    };

  } catch (error) {
    console.error('[JWT] Error validating token:', error);
    return { valid: false, expired: false, data: null };
  }
}

/**
 * Start free trial
 * Creates a 14-day trial via API, then opens Stripe Checkout
 */
async function startTrial(email) {
  try {
    console.log('[START_TRIAL] Starting trial for:', email);

    // Store pending email
    await electronAPI.storeSet('pending_email', email);

    // Call API to create trial
    const response = await fetch(`${API_URL}/api/start-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.success) {
      console.log('[START_TRIAL] Trial created successfully:', data);

      // Open Stripe Checkout in browser
      const referralCode = generateReferralCode(email);
      const checkoutUrl = `${STRIPE_CHECKOUT_URL}?email=${encodeURIComponent(email)}&ref=${referralCode}`;
      await shell.openExternal(checkoutUrl);

      return {
        success: true,
        message: data.message || 'Trial started! Opening subscription page...',
        validUntil: data.valid_until,
        maxDevices: data.max_devices || 3
      };

    } else {
      // Handle API errors
      throw new Error(data.error || data.message || 'Failed to start trial');
    }

  } catch (error) {
    console.error('[START_TRIAL] Error:', error);
    throw error;
  }
}

/**
 * Validate license with API
 * Registers device if not already registered
 * Returns JWT token for offline mode
 */
async function validateLicense(email, providedMachineId = null) {
  try {
    // Generate machine ID if not provided
    let machineIdValue = providedMachineId;
    if (!machineIdValue) {
      machineIdValue = await machineId.getMachineId();
    }

    console.log('[VALIDATE] Validating license for:', email);
    console.log('[VALIDATE] Machine ID:', machineIdValue.substring(0, 16) + '...');

    const response = await fetch(`${API_URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, machine_id: machineIdValue })
    });

    const data = await response.json();

    if (data.valid) {
      console.log('[VALIDATE] License valid:', data.license.status);

      // Store license data and JWT token
      await electronAPI.storeSet('auth_token', data.offline_token);
      await electronAPI.storeSet('token_expiry', data.offline_valid_until);
      await electronAPI.storeSet('user_email', email);
      await electronAPI.storeSet('machine_id', machineIdValue);
      await electronAPI.storeSet('license_data', JSON.stringify(data.license));
      await electronAPI.storeSet('last_validation', new Date().toISOString());

      return {
        valid: true,
        license: data.license,
        offlineToken: data.offline_token,
        offlineValidUntil: data.offline_valid_until
      };

    } else {
      console.log('[VALIDATE] License invalid:', data.reason);

      return {
        valid: false,
        reason: data.reason,
        message: data.message,
        details: data
      };
    }

  } catch (error) {
    console.error('[VALIDATE] Error:', error);
    throw error;
  }
}

/**
 * Check subscription status
 * Handles both online validation and offline mode (JWT)
 * Returns: { isValid: boolean, status: string, license: object, offline: boolean }
 */
async function checkSubscription(email) {
  try {
    console.log('[CHECK_SUBSCRIPTION] Checking subscription for:', email);

    // Get stored data
    const cachedToken = await electronAPI.storeGet('auth_token');
    const tokenExpiry = await electronAPI.storeGet('token_expiry');
    const lastValidation = await electronAPI.storeGet('last_validation');
    const storedEmail = await electronAPI.storeGet('user_email');
    const storedMachineId = await electronAPI.storeGet('machine_id');
    const currentMachineId = storedMachineId || await machineId.getMachineId();

    // Check if we need to revalidate (email changed or 24h passed)
    const needsRevalidation =
      !lastValidation ||
      email !== storedEmail ||
      (Date.now() - new Date(lastValidation).getTime() > REVALIDATION_INTERVAL);

    // Check offline token validity
    if (cachedToken && tokenExpiry) {
      const jwt = validateJWT(cachedToken);

      if (jwt.valid) {
        console.log('[CHECK_SUBSCRIPTION] Using cached JWT token (offline mode)');

        // If token is still valid and we don't need revalidation, use it
        if (!needsRevalidation) {
          const licenseData = await electronAPI.storeGet('license_data');
          const license = licenseData ? JSON.parse(licenseData) : null;

          return {
            isValid: true,
            status: license?.status || 'active',
            license: license,
            offline: true,
            tokenExpiresAt: tokenExpiry
          };
        }
      } else if (jwt.expired) {
        console.log('[CHECK_SUBSCRIPTION] JWT token expired, revalidating online...');
      }
    }

    // Try online validation
    try {
      const result = await validateLicense(email, currentMachineId);

      if (result.valid) {
        return {
          isValid: true,
          status: result.license.status,
          license: result.license,
          offline: false
        };
      } else {
        return {
          isValid: false,
          status: 'invalid',
          reason: result.reason,
          message: result.message
        };
      }

    } catch (networkError) {
      console.warn('[CHECK_SUBSCRIPTION] Network error, checking offline token:', networkError.message);

      // Network error - check if we have a valid offline token
      if (cachedToken && tokenExpiry) {
        const jwt = validateJWT(cachedToken);

        if (jwt.valid) {
          console.log('[CHECK_SUBSCRIPTION] Using offline mode (no internet)');

          const licenseData = await electronAPI.storeGet('license_data');
          const license = licenseData ? JSON.parse(licenseData) : null;

          return {
            isValid: true,
            status: license?.status || 'active',
            license: license,
            offline: true,
            offlineMode: true,
            warning: 'Working offline. Please connect to the internet to revalidate.',
            tokenExpiresAt: tokenExpiry
          };
        } else {
          throw new Error('Offline token expired. Please connect to the internet to revalidate your license.');
        }
      }

      throw networkError;
    }

  } catch (error) {
    console.error('[CHECK_SUBSCRIPTION] Error:', error);
    throw error;
  }
}

/**
 * Get license information (for UI display)
 */
async function getLicenseInfo(email) {
  try {
    console.log('[LICENSE_INFO] Getting license info for:', email);

    const response = await fetch(`${API_URL}/api/license-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.found) {
      return {
        found: true,
        license: data.license
      };
    } else {
      return {
        found: false
      };
    }

  } catch (error) {
    console.error('[LICENSE_INFO] Error:', error);

    // Try to return cached data
    const licenseData = await electronAPI.storeGet('license_data');
    if (licenseData) {
      return {
        found: true,
        license: JSON.parse(licenseData),
        cached: true
      };
    }

    throw error;
  }
}

/**
 * Get referral statistics
 */
async function getReferralStats(email) {
  try {
    console.log('[REFERRAL_STATS] Getting stats for:', email);

    const response = await fetch(`${API_URL}/api/referral-stats?email=${encodeURIComponent(email)}`, {
      method: 'GET'
    });

    const data = await response.json();

    return {
      totalReferrals: data.total_referrals || 0,
      referralCode: data.referral_code,
      creditsEarned: data.credits_earned || 0,
      referralLink: `${STRIPE_CHECKOUT_URL}?ref=${data.referral_code}`
    };

  } catch (error) {
    console.error('[REFERRAL_STATS] Error:', error);

    // Return fallback with generated code
    return {
      totalReferrals: 0,
      referralCode: generateReferralCode(email),
      creditsEarned: 0,
      referralLink: `${STRIPE_CHECKOUT_URL}?ref=${generateReferralCode(email)}`
    };
  }
}

/**
 * Refresh subscription status (after user subscribes)
 */
async function refreshSubscription() {
  try {
    console.log('[REFRESH] Refreshing subscription status...');

    const email = await electronAPI.storeGet('pending_email') ||
                  await electronAPI.storeGet('user_email');

    if (!email) {
      throw new Error('No email found. Please enter your email.');
    }

    const result = await checkSubscription(email);

    if (result.isValid) {
      // Clear pending email
      await electronAPI.storeDelete('pending_email');

      return {
        success: true,
        status: result.status,
        license: result.license,
        message: 'Subscription activated! 🎉'
      };
    } else {
      return {
        success: false,
        reason: result.reason,
        message: result.message || 'No active subscription found.'
      };
    }

  } catch (error) {
    console.error('[REFRESH] Error:', error);
    throw error;
  }
}

/**
 * Subscribe (opens Stripe Checkout)
 */
async function subscribe(email, plan = 'monthly') {
  try {
    console.log('[SUBSCRIBE] Opening Stripe Checkout for:', email, plan);

    const referralCode = generateReferralCode(email);
    const checkoutUrl = `${STRIPE_CHECKOUT_URL}?email=${encodeURIComponent(email)}&plan=${plan}&ref=${referralCode}`;

    await shell.openExternal(checkoutUrl);

    return {
      success: true,
      message: 'Opening subscription page...'
    };

  } catch (error) {
    console.error('[SUBSCRIBE] Error:', error);
    throw error;
  }
}

/**
 * Generate referral code from email (matches backend logic)
 */
function generateReferralCode(email) {
  try {
    const encoded = Buffer.from(email.toLowerCase().trim()).toString('base64');
    return encoded.substring(0, 10).toUpperCase();
  } catch (e) {
    return email.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}

/**
 * Check if license needs revalidation
 * Should be called periodically (e.g., on app startup, every 24h)
 */
async function needsRevalidation() {
  try {
    const lastValidation = await electronAPI.storeGet('last_validation');

    if (!lastValidation) {
      return true;
    }

    const timeSinceValidation = Date.now() - new Date(lastValidation).getTime();

    return timeSinceValidation > REVALIDATION_INTERVAL;

  } catch (error) {
    console.error('[NEEDS_REVALIDATION] Error:', error);
    return true;
  }
}

/**
 * Get offline mode status
 * Returns info about offline token validity and time remaining
 */
async function getOfflineStatus() {
  try {
    const cachedToken = await electronAPI.storeGet('auth_token');
    const tokenExpiry = await electronAPI.storeGet('token_expiry');

    if (!cachedToken || !tokenExpiry) {
      return {
        hasOfflineToken: false,
        isValid: false,
        message: 'No offline token available'
      };
    }

    const jwt = validateJWT(cachedToken);
    const expiryDate = new Date(tokenExpiry);
    const now = new Date();
    const timeRemaining = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      hasOfflineToken: true,
      isValid: jwt.valid,
      expired: jwt.expired,
      expiresAt: tokenExpiry,
      timeRemaining: timeRemaining,
      daysRemaining: daysRemaining,
      hoursRemaining: hoursRemaining,
      message: jwt.valid
        ? `Offline mode available for ${daysRemaining}d ${hoursRemaining}h`
        : 'Offline token expired'
    };

  } catch (error) {
    console.error('[OFFLINE_STATUS] Error:', error);
    return {
      hasOfflineToken: false,
      isValid: false,
      message: 'Error checking offline status'
    };
  }
}

/**
 * Get current user info (from local storage)
 */
async function getCurrentUser() {
  try {
    const email = await electronAPI.storeGet('user_email');
    const licenseData = await electronAPI.storeGet('license_data');
    const tokenExpiry = await electronAPI.storeGet('token_expiry');
    const lastValidation = await electronAPI.storeGet('last_validation');

    if (!email) {
      return null;
    }

    const license = licenseData ? JSON.parse(licenseData) : null;
    const offlineStatus = await getOfflineStatus();

    return {
      email,
      license,
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
      lastValidation: lastValidation ? new Date(lastValidation) : null,
      offlineStatus
    };

  } catch (error) {
    console.error('[GET_CURRENT_USER] Error:', error);
    return null;
  }
}

/**
 * Get list of active devices registered to license
 */
async function getActiveDevices(email) {
  try {
    console.log('[GET_DEVICES] Getting active devices for:', email);

    const response = await fetch(`${API_URL}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.found) {
      console.log('[GET_DEVICES] ✅ Found', data.devices.length, 'devices');
      return {
        success: true,
        devices: data.devices,
        devicesUsed: data.devices_used,
        maxDevices: data.max_devices
      };
    } else {
      return {
        success: true,
        devices: [],
        devicesUsed: 0,
        maxDevices: 3
      };
    }

  } catch (error) {
    console.error('[GET_DEVICES] Error:', error);
    throw error;
  }
}

/**
 * Deactivate a specific device
 * Removes device from license, freeing up a slot
 */
async function deactivateDevice(email, machineIdToRemove) {
  try {
    console.log('[DEACTIVATE_DEVICE] Deactivating device for:', email);
    console.log('[DEACTIVATE_DEVICE] Machine ID:', machineIdToRemove.substring(0, 8) + '...');

    const response = await fetch(`${API_URL}/api/deactivate-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, machine_id: machineIdToRemove })
    });

    const data = await response.json();

    if (data.success) {
      console.log('[DEACTIVATE_DEVICE] ✅ Device deactivated successfully');
      return {
        success: true,
        message: data.message,
        devicesRemaining: data.devices_remaining,
        maxDevices: data.max_devices
      };
    } else {
      console.error('[DEACTIVATE_DEVICE] Failed:', data.error);
      return {
        success: false,
        error: data.error,
        message: data.message
      };
    }

  } catch (error) {
    console.error('[DEACTIVATE_DEVICE] Error:', error);
    throw error;
  }
}

/**
 * Deactivate current device
 * Convenience function to deactivate the device the app is running on
 */
async function deactivateCurrentDevice() {
  try {
    console.log('[DEACTIVATE_CURRENT] Deactivating current device...');

    const email = await electronAPI.storeGet('user_email');
    const currentMachineId = await machineId.getMachineId();

    if (!email) {
      throw new Error('No user logged in');
    }

    const result = await deactivateDevice(email, currentMachineId);

    if (result.success) {
      // Clear local data after deactivation
      await machineId.clearMachineId();
      await logout();

      console.log('[DEACTIVATE_CURRENT] ✅ Current device deactivated and data cleared');
    }

    return result;

  } catch (error) {
    console.error('[DEACTIVATE_CURRENT] Error:', error);
    throw error;
  }
}

/**
 * Log out (clear local data)
 */
async function logout() {
  try {
    console.log('[LOGOUT] Clearing local data...');

    await electronAPI.storeDelete('auth_token');
    await electronAPI.storeDelete('token_expiry');
    await electronAPI.storeDelete('user_email');
    await electronAPI.storeDelete('machine_id');
    await electronAPI.storeDelete('license_data');
    await electronAPI.storeDelete('last_validation');
    await electronAPI.storeDelete('pending_email');

    return { success: true };

  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    throw error;
  }
}

/**
 * Validate on app startup
 * Checks license and revalidates if needed
 */
async function validateOnStartup() {
  try {
    console.log('[STARTUP] Validating license on app startup...');

    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.email) {
      console.log('[STARTUP] No user found, showing activation screen');
      return {
        needsActivation: true,
        message: 'Please activate Gigzilla to continue'
      };
    }

    // Check if we need to revalidate
    const shouldRevalidate = await needsRevalidation();

    if (shouldRevalidate) {
      console.log('[STARTUP] License needs revalidation (24h passed)');

      try {
        const result = await checkSubscription(currentUser.email);

        if (result.isValid) {
          console.log('[STARTUP] License revalidated successfully');
          return {
            needsActivation: false,
            valid: true,
            license: result.license,
            offline: result.offline
          };
        } else {
          console.log('[STARTUP] License invalid:', result.reason);
          return {
            needsActivation: true,
            valid: false,
            reason: result.reason,
            message: result.message
          };
        }

      } catch (error) {
        console.warn('[STARTUP] Revalidation failed, checking offline mode:', error.message);

        // Network error - check offline token
        const offlineStatus = await getOfflineStatus();

        if (offlineStatus.isValid) {
          console.log('[STARTUP] Using offline mode');
          return {
            needsActivation: false,
            valid: true,
            license: currentUser.license,
            offline: true,
            offlineMode: true,
            warning: `Working offline. ${offlineStatus.message}`
          };
        } else {
          console.log('[STARTUP] Offline token expired');
          return {
            needsActivation: true,
            valid: false,
            message: 'Offline token expired. Please connect to the internet to revalidate your license.'
          };
        }
      }

    } else {
      console.log('[STARTUP] Using cached license (validated within 24h)');

      // Check offline token validity
      const offlineStatus = await getOfflineStatus();

      if (offlineStatus.isValid) {
        return {
          needsActivation: false,
          valid: true,
          license: currentUser.license,
          offline: true,
          offlineStatus: offlineStatus
        };
      } else {
        // Try online validation
        try {
          const result = await checkSubscription(currentUser.email);
          return {
            needsActivation: !result.isValid,
            valid: result.isValid,
            license: result.license,
            offline: result.offline,
            reason: result.reason,
            message: result.message
          };
        } catch (error) {
          return {
            needsActivation: true,
            valid: false,
            message: 'License validation failed. Please check your internet connection.'
          };
        }
      }
    }

  } catch (error) {
    console.error('[STARTUP] Error:', error);
    return {
      needsActivation: true,
      valid: false,
      error: error.message
    };
  }
}

// Export all functions
module.exports = {
  // Core authentication
  startTrial,
  validateLicense,
  checkSubscription,
  refreshSubscription,
  subscribe,

  // License info
  getLicenseInfo,
  getReferralStats,
  getCurrentUser,

  // Device management
  getActiveDevices,
  deactivateDevice,
  deactivateCurrentDevice,

  // Utilities
  generateReferralCode,
  validateJWT,
  needsRevalidation,
  getOfflineStatus,
  validateOnStartup,

  // Machine ID management (from machine-id module)
  getMachineId: machineId.getMachineId,
  clearMachineId: machineId.clearMachineId,
  detectHardwareChange: machineId.detectHardwareChange,
  getMachineInfo: machineId.getMachineInfo,
  isVirtualMachine: machineId.isVirtualMachine,

  // Cleanup
  logout
};
