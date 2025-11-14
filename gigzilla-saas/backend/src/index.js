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
