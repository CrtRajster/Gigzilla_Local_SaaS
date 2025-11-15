/**
 * Gigzilla API - Zero-Storage Cloudflare Worker
 *
 * Simple email-based subscription verification with:
 * - Email-based subscription verification (no license keys)
 * - JWT token generation (7-day offline grace period)
 * - Referral system (zero-storage via Stripe metadata)
 * - Stripe webhook handling
 *
 * Data storage: Stripe only (zero-storage architecture)
 */

import Stripe from 'stripe';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Initialize Stripe with environment variable
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route requests
    if (url.pathname === '/verify' && request.method === 'POST') {
      return handleVerify(request, env, stripe, corsHeaders);
    }

    if (url.pathname === '/referral-stats' && request.method === 'POST') {
      return handleReferralStats(request, env, stripe, corsHeaders);
    }

    if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
      return handleStripeWebhook(request, env, stripe);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// Verify subscription status
async function handleVerify(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    if (!email) {
      return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }

    // Search Stripe for customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return jsonResponse({
        hasSubscription: false,
        reason: 'NO_CUSTOMER'
      }, 200, corsHeaders);
    }

    const customer = customers.data[0];

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    // Also check trial subscriptions
    const trialSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit: 1
    });

    const activeSubscriptions = [...subscriptions.data, ...trialSubscriptions.data];

    if (activeSubscriptions.length === 0) {
      return jsonResponse({
        hasSubscription: false,
        reason: 'NO_ACTIVE_SUBSCRIPTION'
      }, 200, corsHeaders);
    }

    const subscription = activeSubscriptions[0];

    // Generate JWT token (valid for 7 days - offline grace period)
    const token = await generateJWT({
      email: email,
      customerId: customer.id,
      subscriptionId: subscription.id,
      plan: subscription.items.data[0].price.id,
      status: subscription.status,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    }, env.JWT_SECRET);

    return jsonResponse({
      hasSubscription: true,
      status: subscription.status,
      plan: subscription.metadata.plan || 'monthly',
      token: token
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Verify error:', error);
    return jsonResponse({
      error: 'Internal server error',
      details: error.message
    }, 500, corsHeaders);
  }
}

// Get referral stats
async function handleReferralStats(request, env, stripe, corsHeaders) {
  try {
    const { email } = await request.json();

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return jsonResponse({ total_referrals: 0 }, 200, corsHeaders);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return jsonResponse({ total_referrals: 0 }, 200, corsHeaders);
    }

    const totalReferrals = parseInt(
      subscriptions.data[0].metadata.total_referrals || '0'
    );

    return jsonResponse({
      total_referrals: totalReferrals,
      referral_code: btoa(email).substring(0, 10).toUpperCase()
    }, 200, corsHeaders);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Handle Stripe webhooks
async function handleStripeWebhook(request, env, stripe) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook Error', { status: 400 });
    }

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, stripe);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        // 3 days before trial ends - could send notification
        break;
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook Error', { status: 500 });
  }
}

// Process subscription change (including referrals)
async function handleSubscriptionChange(subscription, stripe) {
  const referredByEmail = subscription.metadata.referred_by_email;

  if (!referredByEmail) return;

  // Check if referral bonus already granted
  if (subscription.metadata.referral_bonus_granted === 'true') return;

  // Only grant bonus when subscription becomes active (trial ended + first payment)
  if (subscription.status !== 'active') return;

  try {
    // Find referrer
    const referrers = await stripe.customers.list({
      email: referredByEmail,
      limit: 1
    });

    if (referrers.data.length === 0) return;

    const referrer = referrers.data[0];

    // Grant credit to referrer
    await stripe.invoiceItems.create({
      customer: referrer.id,
      amount: -900, // -€9.00
      currency: 'eur',
      description: 'Referral bonus: Friend subscribed! 🎉'
    });

    // Grant credit to new subscriber
    await stripe.invoiceItems.create({
      customer: subscription.customer,
      amount: -900, // -€9.00
      currency: 'eur',
      description: 'Welcome bonus: Referred by a friend! 🎁'
    });

    // Update referrer's subscription metadata
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
          total_referrals: (currentReferrals + 1).toString()
        }
      });
    }

    // Mark this subscription as bonus granted
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...subscription.metadata,
        referral_bonus_granted: 'true'
      }
    });

  } catch (error) {
    console.error('Referral processing error:', error);
  }
}

async function handlePaymentSuccess(invoice) {
  // Could track successful payments, send receipts, etc.
  console.log('Payment succeeded:', invoice.id);
}

// Helper: Generate JWT
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

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}
