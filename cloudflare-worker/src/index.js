/**
 * Gigzilla API - Zero-Storage Cloudflare Worker
 *
 * Production-ready license validation with:
 * - Trial management (14 days, no credit card)
 * - Device limit enforcement (3 devices per license)
 * - Offline grace period (7 days via JWT)
 * - Comprehensive error handling
 * - Detailed logging
 *
 * Data storage: Stripe only (zero-storage architecture)
 */

import Stripe from 'stripe';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for desktop app
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize Stripe
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);

      // Route handlers
      if (url.pathname === '/api/start-trial' && request.method === 'POST') {
        return handleStartTrial(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/api/validate' && request.method === 'POST') {
        return handleValidateLicense(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/api/license-info' && request.method === 'POST') {
        return handleGetLicenseInfo(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/api/referral-stats' && request.method === 'GET') {
        return handleReferralStats(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env, stripe);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }, 200, corsHeaders);
      }

      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);

    } catch (error) {
      console.error('[CRITICAL] Unhandled error:', error);
      return jsonResponse({
        error: 'Internal Server Error',
        message: error.message
      }, 500, corsHeaders);
    }
  }
};

// ============================================
// LICENSE VALIDATION FUNCTIONS
// ============================================

/**
 * Create 14-day free trial
 * POST /api/start-trial
 * Body: { email: string }
 */
async function handleStartTrial(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !isValidEmail(email)) {
      console.warn('[START_TRIAL] Invalid email:', email);
      return jsonResponse({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please provide a valid email address'
      }, 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[START_TRIAL] Creating trial for:', normalizedEmail);

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      const metadata = customer.metadata || {};

      console.log('[START_TRIAL] Customer exists:', customer.id);

      // Check if they already have a trial or subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });

      const hasActiveSubscription = subscriptions.data.some(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );

      if (hasActiveSubscription) {
        console.log('[START_TRIAL] Customer already has active subscription');
        return jsonResponse({
          success: true,
          already_exists: true,
          message: 'You already have an active subscription'
        }, 200, corsHeaders);
      }

      // Check if trial already used
      if (metadata.trial_created_at) {
        const trialValidUntil = new Date(metadata.trial_valid_until);
        const now = new Date();

        if (trialValidUntil > now) {
          // Trial still valid
          console.log('[START_TRIAL] Active trial exists, valid until:', trialValidUntil);
          return jsonResponse({
            success: true,
            already_exists: true,
            valid_until: trialValidUntil.toISOString(),
            message: 'You already have an active trial'
          }, 200, corsHeaders);
        } else {
          // Trial expired, suggest subscription
          console.log('[START_TRIAL] Trial expired:', trialValidUntil);
          return jsonResponse({
            success: false,
            error: 'TRIAL_EXPIRED',
            message: 'Your trial has expired. Please subscribe to continue using Gigzilla.',
            expired_at: trialValidUntil.toISOString()
          }, 400, corsHeaders);
        }
      }
    }

    // Create trial
    const trialValidUntil = new Date();
    trialValidUntil.setDate(trialValidUntil.getDate() + 14); // 14-day trial

    const customerData = {
      email: normalizedEmail,
      metadata: {
        status: 'trial',
        tier: 'free',
        trial_created_at: new Date().toISOString(),
        trial_valid_until: trialValidUntil.toISOString(),
        max_devices: '3',
        machine_ids: JSON.stringify([]), // Empty array for devices
        created_via: 'desktop_app'
      },
      description: 'Gigzilla Trial User'
    };

    let customer;
    if (existingCustomers.data.length > 0) {
      // Update existing customer with trial info
      customer = await stripe.customers.update(
        existingCustomers.data[0].id,
        { metadata: customerData.metadata }
      );
      console.log('[START_TRIAL] Updated existing customer:', customer.id);
    } else {
      // Create new customer
      customer = await stripe.customers.create(customerData);
      console.log('[START_TRIAL] Created new customer:', customer.id);
    }

    console.log('[START_TRIAL] ✅ Trial created successfully');

    return jsonResponse({
      success: true,
      valid_until: trialValidUntil.toISOString(),
      message: 'Your 14-day free trial has started!',
      max_devices: 3
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[START_TRIAL] Error:', error);
    return jsonResponse({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create trial. Please try again.'
    }, 500, corsHeaders);
  }
}

/**
 * Validate license and register/validate device
 * POST /api/validate
 * Body: { email: string, machine_id: string }
 */
async function handleValidateLicense(request, env, stripe, corsHeaders) {
  try {
    const { email, machine_id } = await request.json();

    // Validate input
    if (!email || !isValidEmail(email)) {
      console.warn('[VALIDATE] Invalid email:', email);
      return jsonResponse({
        valid: false,
        reason: 'INVALID_EMAIL',
        message: 'Please provide a valid email address'
      }, 400, corsHeaders);
    }

    if (!machine_id || machine_id.length < 10) {
      console.warn('[VALIDATE] Invalid machine_id');
      return jsonResponse({
        valid: false,
        reason: 'INVALID_MACHINE_ID',
        message: 'Invalid device identifier'
      }, 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[VALIDATE] Validating license for:', normalizedEmail);

    // Find customer
    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.warn('[VALIDATE] No customer found for:', normalizedEmail);
      return jsonResponse({
        valid: false,
        reason: 'NO_LICENSE',
        message: 'No license found. Please start a free trial first.'
      }, 404, corsHeaders);
    }

    const customer = customers.data[0];
    const metadata = customer.metadata || {};

    console.log('[VALIDATE] Customer found:', customer.id, 'Status:', metadata.status);

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });

    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    let licenseStatus = metadata.status || 'inactive';
    let tier = metadata.tier || 'free';
    let validUntil = null;
    let maxDevices = parseInt(metadata.max_devices || '3');

    // Determine license validity
    if (activeSubscription) {
      // Has active Stripe subscription
      licenseStatus = 'active';
      tier = activeSubscription.metadata.tier || 'pro';
      console.log('[VALIDATE] Active subscription found:', activeSubscription.id);
    } else if (metadata.status === 'trial') {
      // Check trial expiration
      validUntil = new Date(metadata.trial_valid_until);
      const now = new Date();

      if (validUntil < now) {
        console.log('[VALIDATE] Trial expired:', validUntil);
        return jsonResponse({
          valid: false,
          reason: 'TRIAL_EXPIRED',
          message: 'Your trial has expired. Please subscribe to continue.',
          expired_at: validUntil.toISOString()
        }, 200, corsHeaders);
      }

      console.log('[VALIDATE] Valid trial, expires:', validUntil);
    } else {
      console.log('[VALIDATE] No active subscription or trial');
      return jsonResponse({
        valid: false,
        reason: 'NO_ACTIVE_LICENSE',
        message: 'No active license. Please subscribe or start a trial.'
      }, 200, corsHeaders);
    }

    // Device limit check
    const machineIds = JSON.parse(metadata.machine_ids || '[]');
    console.log('[VALIDATE] Current devices:', machineIds.length, '/', maxDevices);

    if (!machineIds.includes(machine_id)) {
      // New device
      if (machineIds.length >= maxDevices) {
        console.warn('[VALIDATE] Device limit reached:', machineIds.length, '>=', maxDevices);
        return jsonResponse({
          valid: false,
          reason: 'MAX_DEVICES_REACHED',
          message: `Device limit reached (${maxDevices} devices). Please deactivate a device first.`,
          devices_used: machineIds.length,
          max_devices: maxDevices
        }, 200, corsHeaders);
      }

      // Register new device
      machineIds.push(machine_id);
      await stripe.customers.update(customer.id, {
        metadata: {
          ...metadata,
          machine_ids: JSON.stringify(machineIds),
          last_validated: new Date().toISOString()
        }
      });

      console.log('[VALIDATE] ✅ New device registered:', machine_id.substring(0, 8) + '...');
    } else {
      // Update last validated
      await stripe.customers.update(customer.id, {
        metadata: {
          ...metadata,
          last_validated: new Date().toISOString()
        }
      });

      console.log('[VALIDATE] ✅ Existing device validated');
    }

    // Generate offline JWT token (7-day grace period)
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const token = await generateJWT({
      email: normalizedEmail,
      customer_id: customer.id,
      status: licenseStatus,
      tier: tier,
      machine_id: machine_id,
      exp: expiresAt
    }, env.JWT_SECRET);

    console.log('[VALIDATE] ✅ Validation successful');

    return jsonResponse({
      valid: true,
      license: {
        email: normalizedEmail,
        status: licenseStatus,
        tier: tier,
        valid_until: validUntil ? validUntil.toISOString() : null,
        devices_used: machineIds.length,
        max_devices: maxDevices
      },
      offline_token: token,
      offline_valid_until: new Date(expiresAt * 1000).toISOString()
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[VALIDATE] Error:', error);
    return jsonResponse({
      valid: false,
      reason: 'SERVER_ERROR',
      message: 'Validation failed. Please try again.'
    }, 500, corsHeaders);
  }
}

/**
 * Get license information (for UI display)
 * POST /api/license-info
 * Body: { email: string }
 */
async function handleGetLicenseInfo(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email || !isValidEmail(email)) {
      return jsonResponse({
        found: false,
        error: 'INVALID_EMAIL'
      }, 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[LICENSE_INFO] Fetching info for:', normalizedEmail);

    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log('[LICENSE_INFO] No customer found');
      return jsonResponse({
        found: false
      }, 200, corsHeaders);
    }

    const customer = customers.data[0];
    const metadata = customer.metadata || {};

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });

    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    let status = metadata.status || 'inactive';
    let tier = metadata.tier || 'free';
    let validUntil = null;
    let nextBillingDate = null;

    if (activeSubscription) {
      status = 'active';
      tier = activeSubscription.metadata.tier || 'pro';
      nextBillingDate = new Date(activeSubscription.current_period_end * 1000).toISOString();
    } else if (metadata.status === 'trial') {
      validUntil = metadata.trial_valid_until;
    }

    const machineIds = JSON.parse(metadata.machine_ids || '[]');

    console.log('[LICENSE_INFO] ✅ Info retrieved');

    return jsonResponse({
      found: true,
      license: {
        email: normalizedEmail,
        status: status,
        tier: tier,
        valid_until: validUntil,
        next_billing_date: nextBillingDate,
        devices_used: machineIds.length,
        max_devices: parseInt(metadata.max_devices || '3'),
        created_at: metadata.trial_created_at || customer.created
      }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[LICENSE_INFO] Error:', error);
    return jsonResponse({
      found: false,
      error: 'SERVER_ERROR'
    }, 500, corsHeaders);
  }
}

/**
 * Get user's referral statistics
 * GET /api/referral-stats?email=user@example.com
 */
async function handleReferralStats(request, env, stripe, corsHeaders) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[REFERRAL_STATS] Fetching stats for:', normalizedEmail);

    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      return jsonResponse({
        total_referrals: 0,
        referral_code: generateReferralCode(normalizedEmail),
        credits_earned: 0
      }, 200, corsHeaders);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1
    });

    const totalReferrals = subscriptions.data.length > 0
      ? parseInt(subscriptions.data[0].metadata.total_referrals || '0')
      : 0;

    console.log('[REFERRAL_STATS] ✅ Total referrals:', totalReferrals);

    return jsonResponse({
      total_referrals: totalReferrals,
      referral_code: generateReferralCode(normalizedEmail),
      credits_earned: totalReferrals * 9 // €9 per referral
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[REFERRAL_STATS] Error:', error);
    return jsonResponse({
      error: 'SERVER_ERROR'
    }, 500, corsHeaders);
  }
}

// ============================================
// STRIPE WEBHOOK HANDLERS
// ============================================

/**
 * Handle Stripe webhooks
 * POST /webhook/stripe
 */
async function handleStripeWebhook(request, env, stripe) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[WEBHOOK] ⚠️  Signature verification failed:', err.message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    console.log('[WEBHOOK] ✅ Event received:', event.type);

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, stripe);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, stripe);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, stripe);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object, stripe);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, stripe);
        break;

      case 'customer.subscription.trial_will_end':
        console.log('[WEBHOOK] Trial ending soon:', event.data.object.id);
        // TODO: Send email notification
        break;

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

/**
 * Handle checkout completion - activate license
 */
async function handleCheckoutCompleted(session, stripe) {
  console.log('[CHECKOUT_COMPLETED] Session:', session.id);

  try {
    const customer = await stripe.customers.retrieve(session.customer);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    // Determine tier from price ID
    const priceId = subscription.items.data[0].price.id;
    let tier = 'pro';
    let billingPeriod = 'monthly';

    // You can add logic here to determine tier based on price ID
    // For now, we'll use metadata from checkout or default to 'pro'

    // Update customer metadata to mark as active subscriber
    await stripe.customers.update(customer.id, {
      metadata: {
        status: 'active',
        tier: tier,
        subscription_id: subscription.id,
        activated_at: new Date().toISOString(),
        max_devices: '3',
        machine_ids: customer.metadata.machine_ids || JSON.stringify([])
      }
    });

    // Update subscription metadata
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        tier: tier,
        billing_period: billingPeriod
      }
    });

    console.log('[CHECKOUT_COMPLETED] ✅ License activated for:', customer.email);

  } catch (error) {
    console.error('[CHECKOUT_COMPLETED] Error:', error);
  }
}

/**
 * Handle subscription changes and referrals
 */
async function handleSubscriptionChange(subscription, stripe) {
  const referredByEmail = subscription.metadata.referred_by_email;

  // Process referral bonus if applicable
  if (referredByEmail && subscription.metadata.referral_bonus_granted !== 'true') {
    if (subscription.status === 'active') {
      await processReferralBonus(subscription, referredByEmail, stripe);
    }
  }

  console.log('[SUBSCRIPTION_CHANGE] Subscription updated:', subscription.id);
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription, stripe) {
  console.log('[SUBSCRIPTION_DELETED] Subscription cancelled:', subscription.id);

  try {
    const customer = await stripe.customers.retrieve(subscription.customer);

    // Update customer metadata
    await stripe.customers.update(customer.id, {
      metadata: {
        ...customer.metadata,
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      }
    });

    console.log('[SUBSCRIPTION_DELETED] ✅ License deactivated for:', customer.email);

  } catch (error) {
    console.error('[SUBSCRIPTION_DELETED] Error:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(invoice, stripe) {
  console.log('[PAYMENT_SUCCESS] ✅ Payment succeeded:', invoice.id, '€' + (invoice.amount_paid / 100));
  // Could send receipt email here
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice, stripe) {
  console.log('[PAYMENT_FAILED] ❌ Payment failed:', invoice.id);
  // Could send payment failure notification email here
}

/**
 * Process referral bonus
 */
async function processReferralBonus(subscription, referredByEmail, stripe) {
  try {
    console.log('[REFERRAL] Processing bonus for:', referredByEmail);

    const referrers = await stripe.customers.list({
      email: referredByEmail.toLowerCase().trim(),
      limit: 1
    });

    if (referrers.data.length === 0) {
      console.log('[REFERRAL] Referrer not found:', referredByEmail);
      return;
    }

    const referrer = referrers.data[0];

    // Create invoice credit for referrer (€9)
    await stripe.invoiceItems.create({
      customer: referrer.id,
      amount: -900,
      currency: 'eur',
      description: '🎉 Referral bonus: A friend subscribed!'
    });

    console.log('[REFERRAL] ✅ Granted €9 credit to referrer:', referrer.email);

    // Create invoice credit for new subscriber (€9)
    await stripe.invoiceItems.create({
      customer: subscription.customer,
      amount: -900,
      currency: 'eur',
      description: '🎁 Welcome bonus: You were referred!'
    });

    console.log('[REFERRAL] ✅ Granted €9 credit to new subscriber');

    // Update referrer's subscription metadata
    const referrerSubs = await stripe.subscriptions.list({
      customer: referrer.id,
      status: 'active',
      limit: 1
    });

    if (referrerSubs.data.length > 0) {
      const currentReferrals = parseInt(referrerSubs.data[0].metadata.total_referrals || '0');

      await stripe.subscriptions.update(referrerSubs.data[0].id, {
        metadata: {
          ...referrerSubs.data[0].metadata,
          total_referrals: (currentReferrals + 1).toString(),
          last_referral_date: new Date().toISOString()
        }
      });

      console.log('[REFERRAL] ✅ Updated referrer total:', currentReferrals + 1);
    }

    // Mark bonus as granted
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...subscription.metadata,
        referral_bonus_granted: 'true',
        referral_bonus_date: new Date().toISOString()
      }
    });

    console.log('[REFERRAL] ✅ Referral bonus processing complete');

  } catch (error) {
    console.error('[REFERRAL] Error:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Generate referral code from email
 */
function generateReferralCode(email) {
  try {
    const encoded = btoa(email.toLowerCase().trim());
    return encoded.substring(0, 10).toUpperCase();
  } catch (e) {
    return email.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}

/**
 * Generate JWT token (for offline validation)
 */
async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = await sign(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Sign data with HMAC-SHA256
 */
async function sign(data, secret) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return base64UrlEncode(signature);
}

/**
 * Base64 URL encode (for JWT)
 */
function base64UrlEncode(data) {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Helper: JSON response
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}
