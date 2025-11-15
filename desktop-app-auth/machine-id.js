/**
 * Gigzilla Desktop App - Machine ID Generation System
 *
 * Generates a unique, hardware-based machine ID for device tracking
 * Uses multiple hardware identifiers for consistency and privacy
 *
 * Features:
 * - Hardware fingerprinting (CPU, MAC, motherboard, system UUID)
 * - Cross-platform support (Windows, macOS, Linux)
 * - SHA-256 hashing for privacy
 * - Persistent caching across app restarts
 * - Hardware change detection
 * - VM detection and graceful handling
 * - Manual device deactivation support
 */

const crypto = require('crypto');
const os = require('os');
const { networkInterfaces } = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Get CPU information
 * Returns model name and core count
 */
function getCPUInfo() {
  try {
    const cpus = os.cpus();

    if (cpus && cpus.length > 0) {
      return {
        model: cpus[0].model,
        cores: cpus.length,
        speed: cpus[0].speed
      };
    }

    return null;
  } catch (error) {
    console.error('[MACHINE_ID] Error getting CPU info:', error.message);
    return null;
  }
}

/**
 * Get MAC addresses from network interfaces
 * Filters out virtual/internal interfaces
 */
function getMACAddresses() {
  try {
    const interfaces = networkInterfaces();
    const macAddresses = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal, loopback, and virtual interfaces
        if (!iface.internal &&
            iface.mac !== '00:00:00:00:00:00' &&
            !name.toLowerCase().includes('virtual') &&
            !name.toLowerCase().includes('vmware') &&
            !name.toLowerCase().includes('vbox')) {
          macAddresses.push(iface.mac);
        }
      }
    }

    // Sort for consistency
    return macAddresses.sort();

  } catch (error) {
    console.error('[MACHINE_ID] Error getting MAC addresses:', error.message);
    return [];
  }
}

/**
 * Get system UUID (platform-specific)
 * This is a unique identifier provided by the system
 */
function getSystemUUID() {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows: Use WMIC to get UUID
      try {
        const output = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 5000 });
        const lines = output.split('\n').map(line => line.trim()).filter(Boolean);

        if (lines.length > 1) {
          const uuid = lines[1].trim();
          if (uuid && uuid !== 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
            return uuid;
          }
        }
      } catch (wmicError) {
        console.error('[MACHINE_ID] WMIC error:', wmicError.message);
      }

    } else if (platform === 'darwin') {
      // macOS: Use ioreg to get IOPlatformUUID
      try {
        const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID',
          { encoding: 'utf8', timeout: 5000 });
        const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);

        if (match && match[1]) {
          return match[1];
        }
      } catch (ioregError) {
        console.error('[MACHINE_ID] ioreg error:', ioregError.message);
      }

    } else if (platform === 'linux') {
      // Linux: Try /etc/machine-id or /var/lib/dbus/machine-id
      try {
        if (fs.existsSync('/etc/machine-id')) {
          return fs.readFileSync('/etc/machine-id', 'utf8').trim();
        } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
          return fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
        }
      } catch (fileError) {
        console.error('[MACHINE_ID] File read error:', fileError.message);
      }
    }

    return null;

  } catch (error) {
    console.error('[MACHINE_ID] Error getting system UUID:', error.message);
    return null;
  }
}

/**
 * Get motherboard serial number (platform-specific)
 * May not be available on all systems
 */
function getMotherboardSerial() {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows: Use WMIC to get motherboard serial
      try {
        const output = execSync('wmic baseboard get serialnumber',
          { encoding: 'utf8', timeout: 5000 });
        const lines = output.split('\n').map(line => line.trim()).filter(Boolean);

        if (lines.length > 1) {
          const serial = lines[1].trim();
          if (serial && serial !== 'To be filled by O.E.M.' && serial !== 'Default string') {
            return serial;
          }
        }
      } catch (wmicError) {
        console.error('[MACHINE_ID] WMIC motherboard error:', wmicError.message);
      }

    } else if (platform === 'darwin') {
      // macOS: Use system_profiler
      try {
        const output = execSync('system_profiler SPHardwareDataType | grep "Serial Number"',
          { encoding: 'utf8', timeout: 5000 });
        const match = output.match(/Serial Number.*:\s*(.+)/);

        if (match && match[1]) {
          return match[1].trim();
        }
      } catch (profilerError) {
        console.error('[MACHINE_ID] system_profiler error:', profilerError.message);
      }

    } else if (platform === 'linux') {
      // Linux: Try DMI info (requires root on some systems)
      try {
        if (fs.existsSync('/sys/class/dmi/id/board_serial')) {
          const serial = fs.readFileSync('/sys/class/dmi/id/board_serial', 'utf8').trim();
          if (serial && serial !== 'To be filled by O.E.M.') {
            return serial;
          }
        }
      } catch (dmiError) {
        console.error('[MACHINE_ID] DMI error:', dmiError.message);
      }
    }

    return null;

  } catch (error) {
    console.error('[MACHINE_ID] Error getting motherboard serial:', error.message);
    return null;
  }
}

/**
 * Detect if running in a virtual machine
 * Checks common VM indicators
 */
function isVirtualMachine() {
  try {
    const platform = os.platform();
    const cpus = os.cpus();

    // Check CPU model for VM indicators
    if (cpus && cpus.length > 0) {
      const cpuModel = cpus[0].model.toLowerCase();

      if (cpuModel.includes('virtual') ||
          cpuModel.includes('vmware') ||
          cpuModel.includes('qemu') ||
          cpuModel.includes('kvm') ||
          cpuModel.includes('xen')) {
        return true;
      }
    }

    // Check hostname for VM indicators
    const hostname = os.hostname().toLowerCase();
    if (hostname.includes('virtual') ||
        hostname.includes('vmware') ||
        hostname.includes('vbox')) {
      return true;
    }

    // Platform-specific checks
    if (platform === 'win32') {
      try {
        const output = execSync('wmic computersystem get manufacturer',
          { encoding: 'utf8', timeout: 5000 });
        const manufacturer = output.toLowerCase();

        if (manufacturer.includes('vmware') ||
            manufacturer.includes('virtualbox') ||
            manufacturer.includes('parallels') ||
            manufacturer.includes('qemu') ||
            manufacturer.includes('xen')) {
          return true;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return false;

  } catch (error) {
    console.error('[MACHINE_ID] Error detecting VM:', error.message);
    return false;
  }
}

/**
 * Collect all hardware identifiers
 * Returns object with all available hardware info
 */
function collectHardwareIdentifiers() {
  console.log('[MACHINE_ID] Collecting hardware identifiers...');

  const identifiers = {
    // Basic OS info (always available)
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),

    // Hardware info (may be null)
    cpu: getCPUInfo(),
    macAddresses: getMACAddresses(),
    systemUUID: getSystemUUID(),
    motherboardSerial: getMotherboardSerial(),

    // Environment info
    isVM: isVirtualMachine(),
    osRelease: os.release(),

    // Timestamp for debugging
    collectedAt: new Date().toISOString()
  };

  console.log('[MACHINE_ID] Collected identifiers:', {
    platform: identifiers.platform,
    arch: identifiers.arch,
    cpuModel: identifiers.cpu?.model,
    macCount: identifiers.macAddresses.length,
    hasSystemUUID: !!identifiers.systemUUID,
    hasMotherboardSerial: !!identifiers.motherboardSerial,
    isVM: identifiers.isVM
  });

  return identifiers;
}

/**
 * Generate machine ID from hardware identifiers
 * Uses SHA-256 hash for privacy and consistency
 */
function generateMachineIdFromHardware(identifiers) {
  try {
    // Build fingerprint from available identifiers
    const fingerprintParts = [
      identifiers.platform,
      identifiers.arch,
      identifiers.hostname
    ];

    // Add CPU info if available
    if (identifiers.cpu) {
      fingerprintParts.push(identifiers.cpu.model);
      fingerprintParts.push(identifiers.cpu.cores.toString());
    }

    // Add MAC addresses (most reliable for physical machines)
    if (identifiers.macAddresses.length > 0) {
      fingerprintParts.push(...identifiers.macAddresses);
    }

    // Add system UUID if available (highly unique)
    if (identifiers.systemUUID) {
      fingerprintParts.push(identifiers.systemUUID);
    }

    // Add motherboard serial if available
    if (identifiers.motherboardSerial) {
      fingerprintParts.push(identifiers.motherboardSerial);
    }

    // Create fingerprint string
    const fingerprint = fingerprintParts.join('|');

    // Hash with SHA-256 for privacy
    const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');

    console.log('[MACHINE_ID] Generated machine ID:', hash.substring(0, 16) + '...');
    console.log('[MACHINE_ID] Fingerprint components:', fingerprintParts.length);

    return hash;

  } catch (error) {
    console.error('[MACHINE_ID] Error generating machine ID:', error.message);
    throw error;
  }
}

/**
 * Get or generate machine ID
 * Uses cached ID if available, generates new one if not
 *
 * @param {boolean} forceRegenerate - Force regeneration even if cached
 * @returns {Promise<string>} Machine ID (SHA-256 hash)
 */
async function getMachineId(forceRegenerate = false) {
  try {
    // Check for cached machine ID
    if (!forceRegenerate) {
      const cachedId = await electronAPI.storeGet('machine_id');
      const cachedIdentifiers = await electronAPI.storeGet('machine_identifiers');

      if (cachedId && cachedIdentifiers) {
        console.log('[MACHINE_ID] Using cached machine ID');
        return cachedId;
      }
    }

    // Generate new machine ID
    console.log('[MACHINE_ID] Generating new machine ID...');

    const identifiers = collectHardwareIdentifiers();
    const machineId = generateMachineIdFromHardware(identifiers);

    // Cache machine ID and identifiers
    await electronAPI.storeSet('machine_id', machineId);
    await electronAPI.storeSet('machine_identifiers', JSON.stringify(identifiers));

    return machineId;

  } catch (error) {
    console.error('[MACHINE_ID] Error getting machine ID:', error.message);
    throw error;
  }
}

/**
 * Check if machine ID is cached
 */
async function isMachineIdCached() {
  try {
    const cachedId = await electronAPI.storeGet('machine_id');
    return !!cachedId;
  } catch (error) {
    console.error('[MACHINE_ID] Error checking cache:', error.message);
    return false;
  }
}

/**
 * Clear cached machine ID
 * Used for manual device deactivation
 */
async function clearMachineId() {
  try {
    console.log('[MACHINE_ID] Clearing cached machine ID...');

    await electronAPI.storeDelete('machine_id');
    await electronAPI.storeDelete('machine_identifiers');

    return { success: true };
  } catch (error) {
    console.error('[MACHINE_ID] Error clearing machine ID:', error.message);
    throw error;
  }
}

/**
 * Detect hardware changes
 * Compares current hardware with cached identifiers
 *
 * @returns {Promise<object>} Change detection result
 */
async function detectHardwareChange() {
  try {
    const cachedIdentifiers = await electronAPI.storeGet('machine_identifiers');

    if (!cachedIdentifiers) {
      return {
        changed: false,
        reason: 'No cached identifiers found',
        isFirstRun: true
      };
    }

    const cached = JSON.parse(cachedIdentifiers);
    const current = collectHardwareIdentifiers();

    // Compare key identifiers
    const changes = {
      platform: cached.platform !== current.platform,
      arch: cached.arch !== current.arch,
      hostname: cached.hostname !== current.hostname,
      cpu: JSON.stringify(cached.cpu) !== JSON.stringify(current.cpu),
      macAddresses: JSON.stringify(cached.macAddresses) !== JSON.stringify(current.macAddresses),
      systemUUID: cached.systemUUID !== current.systemUUID,
      motherboardSerial: cached.motherboardSerial !== current.motherboardSerial
    };

    const changedItems = Object.keys(changes).filter(key => changes[key]);

    if (changedItems.length > 0) {
      console.log('[MACHINE_ID] Hardware changes detected:', changedItems);

      return {
        changed: true,
        changedItems: changedItems,
        details: changes,
        severity: getSeverity(changedItems),
        recommendation: getRecommendation(changedItems)
      };
    }

    return {
      changed: false,
      reason: 'No hardware changes detected'
    };

  } catch (error) {
    console.error('[MACHINE_ID] Error detecting hardware change:', error.message);
    return {
      changed: false,
      error: error.message
    };
  }
}

/**
 * Get severity of hardware changes
 */
function getSeverity(changedItems) {
  // Critical changes that should trigger revalidation
  const criticalChanges = ['systemUUID', 'motherboardSerial'];

  // Major changes that might be legitimate upgrades
  const majorChanges = ['cpu', 'macAddresses'];

  // Minor changes that are usually safe
  const minorChanges = ['hostname'];

  if (changedItems.some(item => criticalChanges.includes(item))) {
    return 'critical';
  } else if (changedItems.some(item => majorChanges.includes(item))) {
    return 'major';
  } else if (changedItems.some(item => minorChanges.includes(item))) {
    return 'minor';
  }

  return 'unknown';
}

/**
 * Get recommendation based on changes
 */
function getRecommendation(changedItems) {
  const severity = getSeverity(changedItems);

  if (severity === 'critical') {
    return 'This appears to be a different machine. You may need to deactivate your license on the old device.';
  } else if (severity === 'major') {
    return 'Significant hardware changes detected (possibly upgrade). License will be revalidated.';
  } else if (severity === 'minor') {
    return 'Minor changes detected. License should remain valid.';
  }

  return 'Hardware changes detected. License will be revalidated.';
}

/**
 * Get detailed machine information for debugging
 * Returns non-hashed hardware details
 */
async function getMachineInfo() {
  try {
    const identifiers = collectHardwareIdentifiers();
    const cachedId = await electronAPI.storeGet('machine_id');

    return {
      machineId: cachedId,
      machineIdPreview: cachedId ? cachedId.substring(0, 16) + '...' : null,
      platform: identifiers.platform,
      arch: identifiers.arch,
      hostname: identifiers.hostname,
      cpu: identifiers.cpu,
      macAddresses: identifiers.macAddresses.length,
      hasSystemUUID: !!identifiers.systemUUID,
      hasMotherboardSerial: !!identifiers.motherboardSerial,
      isVM: identifiers.isVM,
      osRelease: identifiers.osRelease,
      collectedAt: identifiers.collectedAt
    };

  } catch (error) {
    console.error('[MACHINE_ID] Error getting machine info:', error.message);
    throw error;
  }
}

/**
 * Validate machine ID format
 * Ensures machine ID is a valid SHA-256 hash
 */
function isValidMachineId(machineId) {
  if (!machineId || typeof machineId !== 'string') {
    return false;
  }

  // SHA-256 hash is 64 characters (hex)
  return /^[a-f0-9]{64}$/i.test(machineId);
}

/**
 * Reset machine ID on hardware change
 * Regenerates machine ID and clears cached identifiers
 */
async function resetMachineId(reason = 'Manual reset') {
  try {
    console.log('[MACHINE_ID] Resetting machine ID. Reason:', reason);

    // Clear old data
    await clearMachineId();

    // Generate new machine ID
    const newMachineId = await getMachineId(true);

    console.log('[MACHINE_ID] Machine ID reset complete');

    return {
      success: true,
      newMachineId: newMachineId,
      reason: reason
    };

  } catch (error) {
    console.error('[MACHINE_ID] Error resetting machine ID:', error.message);
    throw error;
  }
}

// Export all functions
module.exports = {
  // Core functions
  getMachineId,
  isMachineIdCached,
  clearMachineId,

  // Hardware change detection
  detectHardwareChange,
  resetMachineId,

  // Utilities
  getMachineInfo,
  isValidMachineId,
  isVirtualMachine,

  // Low-level functions (for advanced usage)
  collectHardwareIdentifiers,
  generateMachineIdFromHardware,
  getCPUInfo,
  getMACAddresses,
  getSystemUUID,
  getMotherboardSerial
};
