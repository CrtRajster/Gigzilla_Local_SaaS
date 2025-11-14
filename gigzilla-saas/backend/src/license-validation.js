import sql from './database.js';
import { v4 as uuidv4 } from 'uuid';

export async function validateLicense(email, licenseKey, machineId) {
  try {
    // Get license from database
    const [license] = await sql`
      SELECT * FROM licenses
      WHERE email = ${email} AND license_key = ${licenseKey}
      LIMIT 1
    `;

    if (!license) {
      return { valid: false, reason: 'INVALID_LICENSE' };
    }

    // Check if expired
    if (license.status === 'expired' || license.status === 'cancelled') {
      return { valid: false, reason: 'EXPIRED', license };
    }

    // Check valid_until date
    if (license.valid_until && new Date(license.valid_until) < new Date()) {
      // Auto-expire
      await sql`
        UPDATE licenses
        SET status = 'expired', updated_at = NOW()
        WHERE id = ${license.id}
      `;
      return { valid: false, reason: 'EXPIRED', license };
    }

    // Check device limit
    if (machineId && license.machine_ids) {
      if (!license.machine_ids.includes(machineId)) {
        // New device
        if (license.machine_ids.length >= license.max_devices) {
          return {
            valid: false,
            reason: 'MAX_DEVICES_REACHED',
            devices_used: license.machine_ids.length,
            max_devices: license.max_devices
          };
        }

        // Add new machine ID
        await sql`
          UPDATE licenses
          SET machine_ids = array_append(machine_ids, ${machineId}),
              last_validated = NOW(),
              updated_at = NOW()
          WHERE id = ${license.id}
        `;
      } else {
        // Update last validated
        await sql`
          UPDATE licenses
          SET last_validated = NOW(), updated_at = NOW()
          WHERE id = ${license.id}
        `;
      }
    }

    // Log successful validation
    await sql`
      INSERT INTO validation_attempts (email, machine_id, success)
      VALUES (${email}, ${machineId}, true)
    `;

    return {
      valid: true,
      license: {
        email: license.email,
        status: license.status,
        tier: license.tier,
        valid_until: license.valid_until,
        devices_used: license.machine_ids?.length || 0,
        max_devices: license.max_devices
      }
    };
  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, reason: 'SERVER_ERROR' };
  }
}

export async function createTrialLicense(email) {
  try {
    const licenseKey = uuidv4();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14); // 14-day trial

    const [license] = await sql`
      INSERT INTO licenses (email, license_key, status, tier, valid_until, machine_ids)
      VALUES (${email}, ${licenseKey}, 'trial', 'free', ${validUntil}, ARRAY[]::TEXT[])
      ON CONFLICT (email)
      DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;

    return {
      success: true,
      license_key: license.license_key,
      valid_until: license.valid_until
    };
  } catch (error) {
    console.error('Create trial error:', error);
    return { success: false, error: error.message };
  }
}

export async function activateLicense(email, stripeCustomerId, stripeSubscriptionId, tier) {
  try {
    // Check if license exists
    const [existing] = await sql`
      SELECT * FROM licenses WHERE email = ${email} LIMIT 1
    `;

    if (existing) {
      // Update existing license
      await sql`
        UPDATE licenses
        SET
          stripe_customer_id = ${stripeCustomerId},
          stripe_subscription_id = ${stripeSubscriptionId},
          status = 'active',
          tier = ${tier},
          valid_until = NULL,
          updated_at = NOW()
        WHERE email = ${email}
      `;
    } else {
      // Create new license
      const licenseKey = uuidv4();
      await sql`
        INSERT INTO licenses (
          email, license_key, stripe_customer_id, stripe_subscription_id,
          status, tier, machine_ids
        )
        VALUES (
          ${email}, ${licenseKey}, ${stripeCustomerId}, ${stripeSubscriptionId},
          'active', ${tier}, ARRAY[]::TEXT[]
        )
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Activate license error:', error);
    return { success: false, error: error.message };
  }
}

export async function deactivateLicense(stripeSubscriptionId) {
  try {
    await sql`
      UPDATE licenses
      SET status = 'cancelled', updated_at = NOW()
      WHERE stripe_subscription_id = ${stripeSubscriptionId}
    `;
    return { success: true };
  } catch (error) {
    console.error('Deactivate license error:', error);
    return { success: false, error: error.message };
  }
}

export async function getLicenseByEmail(email) {
  try {
    const [license] = await sql`
      SELECT * FROM licenses WHERE email = ${email} LIMIT 1
    `;
    return license;
  } catch (error) {
    console.error('Get license error:', error);
    return null;
  }
}
