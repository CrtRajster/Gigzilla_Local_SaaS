/**
 * Gigzilla API - Zero-Storage Cloudflare Worker
 *
 * This is the ONLY backend you need!
 * - No database
 * - No personal data storage
 * - Stripe is the source of truth
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
      if (url.pathname === '/verify' && request.method === 'POST') {
        return handleVerify(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/referral-stats' && request.method === 'POST') {
        return handleReferralStats(request, env, stripe, corsHeaders);
      }

      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env, stripe);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString()
        }, 200, corsHeaders);
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
 */
async function handleVerify(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return jsonResponse({
        error: 'Valid email required'
      }, 400, corsHeaders);
    }

    console.log('Verifying subscription for:', email);

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

    return jsonResponse({
      hasSubscription: true,
      status: activeSubscription.status,
      plan: activeSubscription.metadata.plan || 'monthly',
      validUntil: new Date(expiresAt * 1000).toISOString(),
      token: token
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Verify error:', error);
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

    if (customers.data.length === 0) {
      return jsonResponse({
        total_referrals: 0,
        referral_code: generateReferralCode(email)
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
        referral_code: generateReferralCode(email)
      }, 200, corsHeaders);
    }

    const totalReferrals = parseInt(
      subscriptions.data[0].metadata.total_referrals || '0'
    );

    return jsonResponse({
      total_referrals: totalReferrals,
      referral_code: generateReferralCode(email),
      credits_earned: totalReferrals // Each referral = 1 month free
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Referral stats error:', error);
    return jsonResponse({
      error: error.message
    }, 500, corsHeaders);
  }
}

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
        console.log('Trial ending soon:', event.data.object.id);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

/**
 * Process subscription changes and referrals
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
 */
function generateReferralCode(email) {
  // Simple base64 encoding (first 10 chars)
  // Reversible so we can decode it back to email
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
