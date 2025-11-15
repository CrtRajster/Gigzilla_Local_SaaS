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

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { email, billing_period } = req.body;

    if (!email || !billing_period) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: email, billing_period'
      });
    }

    // Validate billing period (including hidden 'lifetime' for AppSumo)
    if (!['monthly', 'annual', 'lifetime'].includes(billing_period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing_period. Must be "monthly", "annual", or "lifetime"'
      });
    }

    // Get the correct Stripe Price ID based on billing period
    const priceIdMap = {
      'monthly': process.env.STRIPE_MONTHLY_PRICE_ID,
      'annual': process.env.STRIPE_ANNUAL_PRICE_ID,
      'lifetime': process.env.STRIPE_LIFETIME_PRICE_ID  // Hidden tier for AppSumo
    };

    const priceId = priceIdMap[billing_period];

    if (!priceId) {
      return res.status(500).json({
        success: false,
        error: 'Price ID not configured for this billing period'
      });
    }

    // Import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Determine checkout mode (subscription for recurring, payment for one-time)
    const mode = billing_period === 'lifetime' ? 'payment' : 'subscription';

    // Create Stripe Checkout Session
    const sessionConfig = {
      customer_email: email,
      mode: mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout/cancel`,
      metadata: {
        email: email,
        tier: 'pro',
        billing_period: billing_period
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    };

    // Add subscription_data only for subscription mode
    if (mode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          email: email,
          tier: 'pro',
          billing_period: billing_period
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`[CHECKOUT] Created ${mode} session for ${email} - ${billing_period}`);
    console.log(`[CHECKOUT] Session URL: ${session.url}`);

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Gigzilla License Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  console.log(`✓ Database connected`);
});

export default app;
