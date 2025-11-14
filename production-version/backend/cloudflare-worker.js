/**
 * Gigzilla API - Production Cloudflare Worker
 *
 * Zero-Storage Architecture:
 * - No database
 * - No personal data storage
 * - Stripe is the source of truth
 * - €0 infrastructure cost
 * - 95%+ profit margins
 *
 * Features:
 * - Email-based authentication (unlimited devices)
 * - JWT tokens (7-day offline grace period)
 * - Referral system (both users get 1 month free)
 * - Auto-pause fair billing (only pay when working)
 * - Webhook handling (subscription lifecycle)
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
      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '2.0.0-production'
        }, 200, corsHeaders);
      }

      if (url.pathname === '/verify' && request.method === 'POST') {
        return handleVerify(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/referral-stats' && request.method === 'POST') {
        return handleReferralStats(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/pause-subscription' && request.method === 'POST') {
        return handlePauseSubscription(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/resume-subscription' && request.method === 'POST') {
        return handleResumeSubscription(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env, stripe);
      }

      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);

    } catch (error) {
      console.error('Unhandled error:', error);
      return jsonResponse({
        error: 'Internal Server Error',
        message: error.message
      }, 500, corsHeaders);
    }
  }
};

/**
 * Verify if user has active subscription
 * POST /verify
 * Body: { email: string }
 *
 * Returns:
 * - hasSubscription: boolean
 * - status: 'active' | 'trialing' | 'expired'
 * - token: JWT (valid for 7 days)
 */
async function handleVerify(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return jsonResponse({
        error: 'Valid email required'
      }, 400, corsHeaders);
    }

    console.log('✓ Verifying subscription for:', email);

    // Search Stripe for customer with this email
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1
    });

    if (customers.data.length === 0) {
      return jsonResponse({
        hasSubscription: false,
        reason: 'NO_CUSTOMER',
        message: 'No account found. Please subscribe first.'
      }, 200, corsHeaders);
    }

    const customer = customers.data[0];

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });

    // Find active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      return jsonResponse({
        hasSubscription: false,
        reason: 'NO_ACTIVE_SUBSCRIPTION',
        message: 'Your subscription has expired. Please renew.'
      }, 200, corsHeaders);
    }

    // Generate JWT token (valid for 7 days - offline grace period)
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

    const token = await generateJWT({
      email: email.toLowerCase().trim(),
      customerId: customer.id,
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status,
      exp: expiresAt
    }, env.JWT_SECRET);

    console.log('✓ Subscription verified:', activeSubscription.status);

    return jsonResponse({
      hasSubscription: true,
      status: activeSubscription.status,
      plan: activeSubscription.metadata.plan || 'monthly',
      validUntil: new Date(expiresAt * 1000).toISOString(),
      token: token
    }, 200, corsHeaders);

  } catch (error) {
    console.error('❌ Verify error:', error);
    return jsonResponse({
      error: 'Verification failed',
      message: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Get user's referral statistics
 * POST /referral-stats
 * Body: { email: string }
 *
 * Returns:
 * - total_referrals: number
 * - referral_code: string (shareable code)
 * - credits_earned: number (free months)
 */
async function handleReferralStats(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email) {
      return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }

    // Find customer
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1
    });

    const referralCode = generateReferralCode(email);

    if (customers.data.length === 0) {
      return jsonResponse({
        total_referrals: 0,
        referral_code: referralCode,
        credits_earned: 0,
        share_url: `https://gigzilla.site?ref=${referralCode}`
      }, 200, corsHeaders);
    }

    // Get their subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return jsonResponse({
        total_referrals: 0,
        referral_code: referralCode,
        credits_earned: 0,
        share_url: `https://gigzilla.site?ref=${referralCode}`
      }, 200, corsHeaders);
    }

    const totalReferrals = parseInt(
      subscriptions.data[0].metadata.total_referrals || '0'
    );

    return jsonResponse({
      total_referrals: totalReferrals,
      referral_code: referralCode,
      credits_earned: totalReferrals, // Each referral = 1 month free (€9)
      share_url: `https://gigzilla.site?ref=${referralCode}`
    }, 200, corsHeaders);

  } catch (error) {
    console.error('❌ Referral stats error:', error);
    return jsonResponse({
      error: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Pause subscription (Auto-Pause Fair Billing)
 * POST /pause-subscription
 * Body: { email: string }
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - pausedAt: ISO timestamp
 */
async function handlePauseSubscription(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email) {
      return jsonResponse({
        success: false,
        error: 'Email required'
      }, 400, corsHeaders);
    }

    console.log('⏸️  Pausing subscription for:', email);

    // Find customer
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1
    });

    if (customers.data.length === 0) {
      return jsonResponse({
        success: false,
        error: 'Customer not found'
      }, 404, corsHeaders);
    }

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No active subscription found'
      }, 404, corsHeaders);
    }

    const subscription = subscriptions.data[0];

    // Check if already paused
    if (subscription.pause_collection) {
      return jsonResponse({
        success: true,
        message: 'Subscription is already paused',
        pausedAt: subscription.metadata.paused_at || null
      }, 200, corsHeaders);
    }

    // Pause subscription
    await stripe.subscriptions.update(subscription.id, {
      pause_collection: {
        behavior: 'void'  // Don't charge while paused
      },
      metadata: {
        ...subscription.metadata,
        paused_at: new Date().toISOString(),
        paused_reason: 'no_active_projects'
      }
    });

    console.log('✅ Subscription paused for:', email);

    return jsonResponse({
      success: true,
      message: 'Subscription paused successfully. You won\'t be charged until you resume.',
      pausedAt: new Date().toISOString()
    }, 200, corsHeaders);

  } catch (error) {
    console.error('❌ Pause subscription error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Resume subscription (Auto-Resume Fair Billing)
 * POST /resume-subscription
 * Body: { email: string }
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - resumedAt: ISO timestamp
 */
async function handleResumeSubscription(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email) {
      return jsonResponse({
        success: false,
        error: 'Email required'
      }, 400, corsHeaders);
    }

    console.log('▶️  Resuming subscription for:', email);

    // Find customer
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1
    });

    if (customers.data.length === 0) {
      return jsonResponse({
        success: false,
        error: 'Customer not found'
      }, 404, corsHeaders);
    }

    // Find subscription (include paused ones)
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No subscription found'
      }, 404, corsHeaders);
    }

    const subscription = subscriptions.data[0];

    // Check if paused
    if (!subscription.pause_collection) {
      return jsonResponse({
        success: true,
        message: 'Subscription is already active'
      }, 200, corsHeaders);
    }

    // Resume subscription
    await stripe.subscriptions.update(subscription.id, {
      pause_collection: null,  // Remove pause
      metadata: {
        ...subscription.metadata,
        resumed_at: new Date().toISOString(),
        resume_reason: 'new_project_created'
      }
    });

    console.log('✅ Subscription resumed for:', email);

    return jsonResponse({
      success: true,
      message: 'Subscription resumed successfully. Welcome back!',
      resumedAt: new Date().toISOString()
    }, 200, corsHeaders);

  } catch (error) {
    console.error('❌ Resume subscription error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Handle Stripe webhooks
 * POST /webhook/stripe
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - customer.subscription.trial_will_end
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
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    console.log('✅ Webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, stripe);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object, stripe);
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription canceled:', event.data.object.id);
        break;

      case 'customer.subscription.trial_will_end':
        // 3 days before trial ends - could send notification email
        console.log('Trial ending soon for:', event.data.object.customer);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

/**
 * Process subscription changes and referrals
 *
 * When a subscription becomes active (after trial):
 * 1. Check if user was referred
 * 2. Grant €9 credit to referrer
 * 3. Grant €9 credit to new subscriber
 * 4. Update referrer's referral count
 * 5. Mark bonus as granted (prevent duplicates)
 */
async function handleSubscriptionChange(subscription, stripe) {
  const referredByEmail = subscription.metadata.referred_by_email;

  // No referral code, skip
  if (!referredByEmail) {
    console.log('No referral for subscription:', subscription.id);
    return;
  }

  // Check if referral bonus already granted
  if (subscription.metadata.referral_bonus_granted === 'true') {
    console.log('Referral bonus already granted for:', subscription.id);
    return;
  }

  // Only grant bonus when subscription becomes active (after trial ends and first payment)
  if (subscription.status !== 'active') {
    console.log('Subscription not active yet, waiting to grant referral bonus');
    return;
  }

  try {
    console.log('Processing referral bonus for:', referredByEmail);

    // Find referrer in Stripe
    const referrers = await stripe.customers.list({
      email: referredByEmail.toLowerCase().trim(),
      limit: 1
    });

    if (referrers.data.length === 0) {
      console.log('Referrer not found:', referredByEmail);
      return;
    }

    const referrer = referrers.data[0];

    // Create invoice credit for referrer (€9 off next invoice)
    await stripe.invoiceItems.create({
      customer: referrer.id,
      amount: -900, // -€9.00 (negative = credit)
      currency: 'eur',
      description: '🎉 Referral bonus: A friend subscribed!'
    });

    console.log('✅ Granted €9 credit to referrer:', referrer.email);

    // Create invoice credit for new subscriber (€9 off next invoice)
    await stripe.invoiceItems.create({
      customer: subscription.customer,
      amount: -900, // -€9.00
      currency: 'eur',
      description: '🎁 Welcome bonus: You were referred by a friend!'
    });

    console.log('✅ Granted €9 credit to new subscriber');

    // Update referrer's subscription metadata (track referral count)
    const referrerSubs = await stripe.subscriptions.list({
      customer: referrer.id,
      status: 'active',
      limit: 1
    });

    if (referrerSubs.data.length > 0) {
      const currentReferrals = parseInt(
        referrerSubs.data[0].metadata.total_referrals || '0'
      );

      await stripe.subscriptions.update(referrerSubs.data[0].id, {
        metadata: {
          total_referrals: (currentReferrals + 1).toString(),
          last_referral_date: new Date().toISOString()
        }
      });

      console.log(`✅ Updated referrer's total referrals to: ${currentReferrals + 1}`);
    }

    // Mark this subscription as bonus granted (prevent double-granting)
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...subscription.metadata,
        referral_bonus_granted: 'true',
        referral_bonus_date: new Date().toISOString()
      }
    });

    console.log('✅ Referral bonus processing complete!');

  } catch (error) {
    console.error('❌ Referral processing error:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(invoice, stripe) {
  console.log('✅ Payment succeeded:', invoice.id, '€' + (invoice.amount_paid / 100));

  // Could send receipt email, update analytics, etc.
  // But we don't store anything! Just log it.
}

/**
 * Generate referral code from email
 * Simple base64 encoding (reversible)
 */
function generateReferralCode(email) {
  try {
    const encoded = btoa(email.toLowerCase().trim());
    return encoded.substring(0, 10).toUpperCase();
  } catch (e) {
    // Fallback to hash if btoa fails
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
