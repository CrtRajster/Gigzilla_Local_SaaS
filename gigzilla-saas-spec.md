# Gigzilla SaaS - Complete Build Specification

## Overview
Transform Gigzilla desktop app into a local-first SaaS with minimal server infrastructure. All user data stays local, server only handles license validation via Stripe subscriptions.

---

## Project Structure

```
gigzilla-saas/
├── backend/                          # License validation server
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.js                 # Main API server
│   │   ├── stripe-webhook.js        # Stripe event handlers
│   │   ├── license-validation.js    # License logic
│   │   └── database.js              # Neon PostgreSQL connection
│   └── schema.sql                   # Database schema
│
├── desktop-app/                     # Modified Gigzilla desktop app
│   ├── package.json
│   ├── main.js                      # Electron main process (updated)
│   ├── preload.js                   # Security bridge (updated)
│   ├── src/
│   │   ├── index.html              # Entry point (updated)
│   │   ├── renderer.js             # UI logic (updated with license checks)
│   │   ├── styles.css              # Styling
│   │   ├── license-manager.js      # NEW: License validation client
│   │   └── activation-screen.js    # NEW: Activation/upgrade UI
│   └── build/
│       └── (icons)
│
└── admin-dashboard/                 # Optional: View licenses
    ├── package.json
    ├── pages/
    │   └── index.html
    └── (simple dashboard to view active licenses)
```

---

## Step 1: Backend - License Validation Server

### File: `backend/package.json`

```json
{
  "name": "gigzilla-license-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "stripe": "^14.9.0",
    "dotenv": "^16.3.1",
    "postgres": "^3.4.3",
    "cors": "^2.8.5",
    "uuid": "^9.0.1"
  }
}
```

---

### File: `backend/.env.example`

```env
# Server
PORT=3000
NODE_ENV=production

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/gigzilla?sslmode=require

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App
APP_URL=https://gigzilla.site
LICENSE_GRACE_PERIOD_DAYS=7
```

---

### File: `backend/schema.sql`

```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  license_key UUID UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trial', -- trial, active, expired, cancelled
  tier VARCHAR(50) DEFAULT 'free', -- free, pro, business
  machine_ids TEXT[], -- Array of allowed machine IDs
  max_devices INTEGER DEFAULT 2,
  valid_until TIMESTAMP,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email ON licenses(email);
CREATE INDEX idx_license_key ON licenses(license_key);
CREATE INDEX idx_stripe_customer ON licenses(stripe_customer_id);

-- Validation attempts tracking (prevent abuse)
CREATE TABLE validation_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  ip_address VARCHAR(50),
  machine_id VARCHAR(255),
  success BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validation_email ON validation_attempts(email);
CREATE INDEX idx_validation_ip ON validation_attempts(ip_address);
```

---

### File: `backend/src/database.js`

```javascript
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;
```

---

### File: `backend/src/license-validation.js`

```javascript
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
```

---

### File: `backend/src/stripe-webhook.js`

```javascript
import Stripe from 'stripe';
import { activateLicense, deactivateLicense } from './license-validation.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleStripeWebhook(req, res) {
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

  console.log('Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        // Get subscription to determine tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        
        // Map price ID to tier (you'll set these in Stripe)
        let tier = 'pro';
        if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          tier = 'business';
        }

        await activateLicense(customerEmail, customerId, subscriptionId, tier);
        console.log(`License activated for ${customerEmail}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email;

        if (subscription.status === 'active') {
          const priceId = subscription.items.data[0].price.id;
          let tier = 'pro';
          if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
            tier = 'business';
          }
          await activateLicense(email, customerId, subscription.id, tier);
        } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
          await deactivateLicense(subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await deactivateLicense(subscription.id);
        console.log(`License deactivated for subscription ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
```

---

### File: `backend/src/index.js`

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  validateLicense, 
  createTrialLicense, 
  getLicenseByEmail 
} from './license-validation.js';
import { handleStripeWebhook } from './stripe-webhook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Allow desktop app to connect
app.use(cors({
  origin: '*', // In production, restrict to your domain
  methods: ['POST', 'GET']
}));

// Raw body for Stripe webhooks
app.post('/webhook/stripe', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

// JSON body parser for other routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validate license
app.post('/api/validate', async (req, res) => {
  try {
    const { email, license_key, machine_id } = req.body;

    if (!email || !license_key) {
      return res.status(400).json({ 
        valid: false, 
        reason: 'MISSING_CREDENTIALS' 
      });
    }

    const result = await validateLicense(email, license_key, machine_id);
    res.json(result);
  } catch (error) {
    console.error('Validation endpoint error:', error);
    res.status(500).json({ valid: false, reason: 'SERVER_ERROR' });
  }
});

// Start trial
app.post('/api/start-trial', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    // Check if email already has a license
    const existing = await getLicenseByEmail(email);
    if (existing) {
      return res.json({ 
        success: true, 
        license_key: existing.license_key,
        already_exists: true 
      });
    }

    const result = await createTrialLicense(email);
    res.json(result);
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// Get license info (for checking status)
app.post('/api/license-info', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const license = await getLicenseByEmail(email);
    
    if (!license) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      license: {
        email: license.email,
        license_key: license.license_key,
        status: license.status,
        tier: license.tier,
        valid_until: license.valid_until,
        devices_used: license.machine_ids?.length || 0,
        max_devices: license.max_devices
      }
    });
  } catch (error) {
    console.error('License info error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Gigzilla License Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  console.log(`✓ Database connected`);
});

export default app;
```

---

## Step 2: Desktop App - License Integration

### File: `desktop-app/src/license-manager.js` (NEW)

```javascript
// License Manager - Handles all license validation logic
import { app } from 'electron';
import os from 'os';
import crypto from 'crypto';

const LICENSE_API = 'https://api.gigzilla.site'; // Change to your domain
const GRACE_PERIOD_DAYS = 7;

export class LicenseManager {
  constructor() {
    this.machineId = this.generateMachineId();
  }

  generateMachineId() {
    // Create unique machine identifier (non-reversible)
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

  async validateLicense(email, licenseKey) {
    try {
      const response = await fetch(`${LICENSE_API}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          license_key: licenseKey,
          machine_id: this.machineId
        }),
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error('Validation request failed');
      }

      const result = await response.json();
      
      if (result.valid) {
        // Store successful validation timestamp
        await window.electronAPI.storeSet('last_validated', Date.now());
        await window.electronAPI.storeSet('license_status', 'active');
      }

      return result;
    } catch (error) {
      console.error('License validation error:', error);
      
      // Check grace period if offline
      return await this.checkGracePeriod();
    }
  }

  async checkGracePeriod() {
    try {
      const lastValidated = await window.electronAPI.storeGet('last_validated');
      const licenseStatus = await window.electronAPI.storeGet('license_status');

      if (!lastValidated || licenseStatus !== 'active') {
        return { valid: false, reason: 'NEVER_VALIDATED' };
      }

      const daysSinceValidation = (Date.now() - lastValidated) / (1000 * 60 * 60 * 24);

      if (daysSinceValidation < GRACE_PERIOD_DAYS) {
        return { 
          valid: true, 
          offline: true,
          grace_period_remaining: Math.ceil(GRACE_PERIOD_DAYS - daysSinceValidation)
        };
      }

      return { valid: false, reason: 'GRACE_PERIOD_EXPIRED' };
    } catch (error) {
      console.error('Grace period check error:', error);
      return { valid: false, reason: 'ERROR' };
    }
  }

  async startTrial(email) {
    try {
      const response = await fetch(`${LICENSE_API}/api/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        timeout: 5000
      });

      return await response.json();
    } catch (error) {
      console.error('Start trial error:', error);
      return { success: false, error: 'NETWORK_ERROR' };
    }
  }

  async checkLicenseInfo(email) {
    try {
      const response = await fetch(`${LICENSE_API}/api/license-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        timeout: 5000
      });

      return await response.json();
    } catch (error) {
      console.error('Check license info error:', error);
      return { found: false };
    }
  }

  getMachineId() {
    return this.machineId;
  }
}

export default LicenseManager;
```

---

### File: `desktop-app/src/activation-screen.js` (NEW)

```javascript
// Activation Screen UI Components
export function renderActivationScreen() {
  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="max-width: 500px; width: 100%; padding: 2rem;">
        <div style="background: white; border-radius: 1rem; padding: 3rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="font-size: 2.5rem; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem;">
              Gigzilla
            </h1>
            <p style="color: #6b7280;">We'll Get You Paid</p>
          </div>

          <div id="activation-content">
            ${renderEmailForm()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEmailForm() {
  return `
    <div>
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; text-align: center;">
        Start Your Free Trial
      </h2>
      <p style="color: #6b7280; text-align: center; margin-bottom: 2rem;">
        14 days free, no credit card required
      </p>

      <form id="email-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Email</label>
          <input 
            type="email" 
            id="trial-email" 
            required 
            placeholder="you@example.com"
            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem;"
          />
        </div>

        <button 
          type="submit"
          style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer;"
        >
          Start Free Trial
        </button>
      </form>

      <div style="margin-top: 1.5rem; text-align: center;">
        <p style="color: #6b7280; font-size: 0.875rem;">Already have a license?</p>
        <button 
          onclick="app.showLicenseForm()"
          style="margin-top: 0.5rem; color: #667eea; background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline;"
        >
          Activate License
        </button>
      </div>
    </div>
  `;
}

export function renderLicenseForm() {
  return `
    <div>
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; text-align: center;">
        Activate Your License
      </h2>

      <form id="license-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Email</label>
          <input 
            type="email" 
            id="license-email" 
            required 
            placeholder="you@example.com"
            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem;"
          />
        </div>

        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">License Key</label>
          <input 
            type="text" 
            id="license-key" 
            required 
            placeholder="xxxx-xxxx-xxxx-xxxx"
            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; font-family: monospace;"
          />
        </div>

        <button 
          type="submit"
          style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer;"
        >
          Activate License
        </button>
      </form>

      <div style="margin-top: 1.5rem; text-align: center;">
        <button 
          onclick="app.showEmailForm()"
          style="color: #667eea; background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline;"
        >
          ← Back to Trial
        </button>
      </div>
    </div>
  `;
}

export function renderExpiredScreen(license) {
  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="max-width: 500px; width: 100%; padding: 2rem;">
        <div style="background: white; border-radius: 1rem; padding: 3rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">⏰</div>
            <h2 style="font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem;">
              ${license?.status === 'trial' ? 'Trial Expired' : 'Subscription Expired'}
            </h2>
            <p style="color: #6b7280;">
              Your ${license?.tier || 'trial'} access has ended
            </p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 0.5rem; padding: 1rem; margin-bottom: 2rem;">
            <p style="color: #92400e; font-size: 0.875rem;">
              Don't lose your work! Your data is safe locally. Subscribe to continue using Gigzilla.
            </p>
          </div>

          <button 
            onclick="app.openSubscribePage()"
            style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; margin-bottom: 1rem;"
          >
            Subscribe Now - From €9/month
          </button>

          <button 
            onclick="app.refreshLicense()"
            style="width: 100%; padding: 0.75rem; background: #f3f4f6; color: #374151; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;"
          >
            I've Already Subscribed - Refresh
          </button>

          <div style="margin-top: 2rem; text-align: center;">
            <p style="color: #6b7280; font-size: 0.875rem;">
              Your local data is safe and will remain accessible once you subscribe.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderMaxDevicesScreen(devicesUsed, maxDevices) {
  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="max-width: 500px; width: 100%; padding: 2rem;">
        <div style="background: white; border-radius: 1rem; padding: 3rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🖥️</div>
            <h2 style="font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem;">
              Device Limit Reached
            </h2>
            <p style="color: #6b7280;">
              You're using ${devicesUsed} of ${maxDevices} allowed devices
            </p>
          </div>

          <div style="background: #fee2e2; border: 1px solid #f87171; border-radius: 0.5rem; padding: 1rem; margin-bottom: 2rem;">
            <p style="color: #991b1b; font-size: 0.875rem;">
              To use Gigzilla on this device, please deactivate one of your other devices or upgrade your plan.
            </p>
          </div>

          <button 
            onclick="app.openManageDevices()"
            style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; margin-bottom: 1rem;"
          >
            Manage Devices
          </button>

          <button 
            onclick="app.openUpgradePage()"
            style="width: 100%; padding: 0.75rem; background: #f3f4f6; color: #374151; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  `;
}
```

---

### File: `desktop-app/src/renderer.js` (UPDATED - Add to beginning)

```javascript
import LicenseManager from './license-manager.js';
import { 
  renderActivationScreen, 
  renderLicenseForm, 
  renderExpiredScreen,
  renderMaxDevicesScreen 
} from './activation-screen.js';

// Gigzilla Desktop - Renderer Process with License Management
class GigzillaApp {
  constructor() {
    this.licenseManager = new LicenseManager();
    this.activeTab = 'dashboard';
    this.clients = [];
    this.projects = [];
    this.invoices = [];
    this.integrations = {
      upwork: false,
      gmail: false,
      sms: false,
      twitter: false,
      linkedin: false,
      smsNumber: ''
    };
    this.licenseValid = false;
    this.licenseData = null;
    
    this.init();
  }

  async init() {
    // Check license first
    await this.checkLicense();
    
    if (this.licenseValid) {
      await this.loadData();
      this.render();
      this.attachEventListeners();
    } else {
      this.renderActivationFlow();
    }
  }

  async checkLicense() {
    try {
      const storedEmail = await window.electronAPI.storeGet('license_email');
      const storedKey = await window.electronAPI.storeGet('license_key');

      if (!storedEmail || !storedKey) {
        this.licenseValid = false;
        return;
      }

      const result = await this.licenseManager.validateLicense(storedEmail, storedKey);
      
      if (result.valid) {
        this.licenseValid = true;
        this.licenseData = result.license || {};
        
        // Show grace period warning if offline
        if (result.offline) {
          this.showGracePeriodWarning(result.grace_period_remaining);
        }
      } else {
        this.licenseValid = false;
        this.licenseData = result.license || null;
      }
    } catch (error) {
      console.error('License check error:', error);
      this.licenseValid = false;
    }
  }

  showGracePeriodWarning(daysRemaining) {
    // Show subtle warning that user is in grace period
    console.log(`Grace period: ${daysRemaining} days remaining`);
    // You can add a banner to the UI here
  }

  renderActivationFlow() {
    const root = document.getElementById('root');
    root.innerHTML = renderActivationScreen();
    
    // Attach event listeners for activation forms
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => this.handleTrialStart(e));
    }
  }

  async handleTrialStart(e) {
    e.preventDefault();
    const email = document.getElementById('trial-email').value;
    
    if (!email) return;

    // Show loading state
    const content = document.getElementById('activation-content');
    content.innerHTML = '<div style="text-align: center; padding: 2rem;">Starting trial...</div>';

    const result = await this.licenseManager.startTrial(email);
    
    if (result.success) {
      // Store license info
      await window.electronAPI.storeSet('license_email', email);
      await window.electronAPI.storeSet('license_key', result.license_key);
      
      // Show success and reload
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Trial Started!</h3>
          <p style="color: #6b7280;">Launching Gigzilla...</p>
        </div>
      `;
      
      setTimeout(() => {
        this.init();
      }, 1500);
    } else {
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;">✗</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Error</h3>
          <p style="color: #6b7280; margin-bottom: 1rem;">${result.error || 'Could not start trial'}</p>
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Try Again
          </button>
        </div>
      `;
    }
  }

  showLicenseForm() {
    const content = document.getElementById('activation-content');
    content.innerHTML = renderLicenseForm();
    
    const licenseForm = document.getElementById('license-form');
    if (licenseForm) {
      licenseForm.addEventListener('submit', (e) => this.handleLicenseActivation(e));
    }
  }

  showEmailForm() {
    const content = document.getElementById('activation-content');
    content.innerHTML = renderEmailForm();
    
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => this.handleTrialStart(e));
    }
  }

  async handleLicenseActivation(e) {
    e.preventDefault();
    const email = document.getElementById('license-email').value;
    const licenseKey = document.getElementById('license-key').value;
    
    if (!email || !licenseKey) return;

    const content = document.getElementById('activation-content');
    content.innerHTML = '<div style="text-align: center; padding: 2rem;">Validating license...</div>';

    const result = await this.licenseManager.validateLicense(email, licenseKey);
    
    if (result.valid) {
      await window.electronAPI.storeSet('license_email', email);
      await window.electronAPI.storeSet('license_key', licenseKey);
      
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">License Activated!</h3>
          <p style="color: #6b7280;">Launching Gigzilla...</p>
        </div>
      `;
      
      setTimeout(() => {
        this.init();
      }, 1500);
    } else {
      let errorMessage = 'Invalid license';
      if (result.reason === 'EXPIRED') errorMessage = 'This license has expired';
      if (result.reason === 'MAX_DEVICES_REACHED') {
        errorMessage = `Device limit reached (${result.devices_used}/${result.max_devices})`;
      }
      
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;">✗</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Activation Failed</h3>
          <p style="color: #6b7280; margin-bottom: 1rem;">${errorMessage}</p>
          <button onclick="app.showLicenseForm()" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Try Again
          </button>
        </div>
      `;
    }
  }

  openSubscribePage() {
    const email = this.licenseData?.email || '';
    window.electronAPI.openExternal(`https://gigzilla.site/subscribe?email=${encodeURIComponent(email)}`);
  }

  async refreshLicense() {
    await this.checkLicense();
    if (this.licenseValid) {
      this.init();
    } else {
      alert('License still not active. Please complete your subscription and try again.');
    }
  }

  openManageDevices() {
    window.electronAPI.openExternal('https://gigzilla.site/account/devices');
  }

  openUpgradePage() {
    window.electronAPI.openExternal('https://gigzilla.site/upgrade');
  }

  // ... rest of the existing GigzillaApp code from previous artifact ...
  // (All the existing methods for clients, projects, etc.)
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new GigzillaApp();
});

// Make app globally available for inline onclick handlers
window.app = app;
```

---

### File: `desktop-app/preload.js` (UPDATED - Add openExternal)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store:delete', key),
  storeClear: () => ipcRenderer.invoke('store:clear'),
  
  // File operations
  exportData: (data) => ipcRenderer.invoke('dialog:export', data),
  importData: () => ipcRenderer.invoke('dialog:import'),
  
  // NEW: Open external URLs
  openExternal: (url) => ipcRenderer.invoke('open:external', url)
});
```

---

### File: `desktop-app/main.js` (UPDATED - Add openExternal handler)

```javascript
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build/icon.png'),
    title: 'Gigzilla - We\'ll Get You Paid'
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
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

ipcMain.handle('store:clear', () => {
  store.clear();
  return true;
});

ipcMain.handle('dialog:export', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Gigzilla Data',
    defaultPath: `gigzilla-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (!result.canceled) {
    const fs = require('fs');
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('dialog:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Gigzilla Data',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const fs = require('fs');
    const data = fs.readFileSync(result.filePaths[0], 'utf8');
    return { success: true, data: JSON.parse(data) };
  }
  return { success: false };
});

// NEW: Open external URL in default browser
ipcMain.handle('open:external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});
```

---

## Step 3: Deployment Instructions

### Deploy Backend (Railway/Render/Fly.io)

```bash
# 1. Create Neon PostgreSQL database
# - Go to neon.tech
# - Create new database
# - Copy connection string

# 2. Create Stripe account
# - Go to stripe.com
# - Get API keys
# - Create products (Pro €9, Business €19)
# - Set up webhook endpoint

# 3. Deploy to Railway
cd backend
railway login
railway init
railway add
# Set environment variables in Railway dashboard
railway up

# 4. Configure Stripe webhook
# - URL: https://your-app.railway.app/webhook/stripe
# - Events: checkout.session.completed, customer.subscription.*
```

### Build Desktop App

```bash
cd desktop-app
npm install
npm run build:win  # Creates installer
```

---

## Step 4: Stripe Setup

### Create Products in Stripe Dashboard

1. **Product 1: Gigzilla Pro**
   - Price: €9/month
   - Billing: Recurring
   - Copy Price ID → Add to .env as STRIPE_PRO_PRICE_ID

2. **Product 2: Gigzilla Business**
   - Price: €19/month
   - Billing: Recurring
   - Copy Price ID → Add to .env as STRIPE_BUSINESS_PRICE_ID

### Create Checkout Page (gigzilla.site/subscribe)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Subscribe to Gigzilla</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <script>
    const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY');
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    // Create checkout session
    fetch('https://api.gigzilla.site/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email,
        price_id: 'price_YOUR_PRICE_ID'  // Pro or Business
      })
    })
    .then(res => res.json())
    .then(session => {
      stripe.redirectToCheckout({ sessionId: session.id });
    });
  </script>
</body>
</html>
```

---

## Testing Checklist

- [ ] Backend server running and responding to /health
- [ ] Database schema applied
- [ ] Stripe webhook receiving events
- [ ] Trial creation works
- [ ] License validation works
- [ ] Desktop app shows activation screen
- [ ] Trial activation flow works
- [ ] Subscription flow works (Stripe test mode)
- [ ] License refresh after subscription works
- [ ] Grace period works when offline
- [ ] Device limit enforcement works
- [ ] Expired license shows upgrade screen

---

## Environment Variables Summary

### Backend (.env)
```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
APP_URL=https://gigzilla.site
LICENSE_GRACE_PERIOD_DAYS=7
```

### Desktop App (hardcoded in license-manager.js)
```javascript
const LICENSE_API = 'https://api.gigzilla.site';
```

---

## Post-Launch Monitoring

Track these metrics:
- License validation requests per day
- Trial conversions
- Churn rate
- Device limit hits
- Grace period usage

---

## Done!

You now have a complete local-first SaaS architecture with:
- ✅ License validation server
- ✅ Stripe subscription integration
- ✅ Desktop app with activation flow
- ✅ Offline grace period
- ✅ Device limit enforcement
- ✅ Zero user data storage (just licenses)

Deploy backend → Update desktop app API URL → Build installer → Launch!
