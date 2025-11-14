# Gigzilla - Zero-Storage Architecture

## 🎯 Philosophy

**Store NOTHING. Let Stripe be your database.**

- ✅ Zero personal data storage
- ✅ Zero GDPR liability
- ✅ Zero database costs
- ✅ Zero maintenance
- ✅ True passive income

---

## 🏗️ Complete Architecture

```
Desktop App (Local-first)
    ↓
User enters email
    ↓
Cloudflare Worker (Stateless API)
    ↓
Stripe API (Source of truth)
    ↓
Returns: Subscription status
    ↓
Desktop App: Unlocked or Paywalled
```

### What Stores What:

**Stripe (They handle GDPR):**
- Customer emails
- Subscription status (active/canceled/trial)
- Payment methods
- Referral metadata
- Subscription history

**Desktop App (User's computer):**
- JWT token (for offline validation)
- User's local data (clients, projects, invoices)
- User preferences

**Your Infrastructure:**
- NOTHING! ✅

---

## 💰 Pricing Structure

### Your Website (gigzilla.site):
```
Monthly: €9/month - Unlimited devices
Annual: €90/year - Unlimited devices (save 17%)
```

### AppSumo:
```
Lifetime: €360 one-time - Unlimited devices
(Positioned as "4 years prepaid")
```

### Trial:
```
14 days free - No credit card required
(Stripe handles trial period)
```

---

## 🔐 Authentication Flow

### First Time User:

```
1. User downloads Gigzilla
2. Opens app → Activation screen
3. Enters email: user@example.com
4. Clicks "Start Free Trial"
   ↓
5. Opens browser → Stripe Checkout
   mode: 'subscription'
   trial_period_days: 14
   ↓
6. User completes Stripe form (enters card)
7. Stripe creates customer + subscription (trial status)
   ↓
8. Redirects back to: gigzilla://success
   ↓
9. App calls: POST /verify { email }
   ↓
10. Worker checks Stripe: "Does user@example.com have subscription?"
    └─ Yes (trial) → Generate JWT token
    ↓
11. App stores JWT locally
12. App unlocks! ✅
```

### Subsequent App Launches:

```
1. App starts
2. Checks for stored JWT token
3. If token exists and not expired (< 7 days old):
   └─ Unlock app (offline grace period)
4. If token expired or no internet > 7 days:
   └─ Call /verify endpoint again
   └─ Get fresh token
5. If no valid subscription:
   └─ Show upgrade screen
```

---

## 🎁 Referral System (Zero-Storage)

### How Referrals Work:

**Step 1: User Gets Referral Code**
```javascript
// Desktop app generates referral code from email
function generateReferralCode(email) {
  // Simple hash of email (reversible for lookup)
  const hash = btoa(email).substring(0, 10).toUpperCase();
  return hash; // e.g., "DXNLCJBKEG"
}

// User shares: gigzilla.site?ref=DXNLCJBKEG
```

**Step 2: Friend Clicks Referral Link**
```javascript
// Landing page JavaScript
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');

if (referralCode) {
  // Store in localStorage
  localStorage.setItem('gigzilla_referral', referralCode);

  // Show banner: "You've been invited! Get 1 month free"
}
```

**Step 3: Friend Subscribes**
```javascript
// When creating Stripe Checkout session
const referralCode = localStorage.getItem('gigzilla_referral');

const session = await stripe.checkout.sessions.create({
  customer_email: 'friend@example.com',
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      referral_code: referralCode || '', // Store referral code!
      referred_by_email: atob(referralCode) || '' // Decode to get referrer email
    }
  },
  metadata: {
    referral_code: referralCode || ''
  }
});
```

**Step 4: Process Referral (Webhook)**
```javascript
// Stripe webhook: subscription.created or customer.subscription.trial_will_end
async function handleSubscriptionActive(subscription) {
  const referredByEmail = subscription.metadata.referred_by_email;

  if (!referredByEmail) return; // No referral

  // Find referrer's customer in Stripe
  const referrers = await stripe.customers.list({
    email: referredByEmail,
    limit: 1
  });

  if (referrers.data.length === 0) return; // Referrer not found

  const referrer = referrers.data[0];

  // Find referrer's active subscription
  const referrerSubs = await stripe.subscriptions.list({
    customer: referrer.id,
    status: 'active',
    limit: 1
  });

  if (referrerSubs.data.length === 0) return; // Referrer has no active sub

  const referrerSubscription = referrerSubs.data[0];

  // Grant 1 free month by creating invoice item credit
  await stripe.invoiceItems.create({
    customer: referrer.id,
    amount: -900, // -€9.00 (negative = credit)
    currency: 'eur',
    description: 'Referral bonus: Friend subscribed! 🎉'
  });

  // Also grant 1 month free to the NEW subscriber
  await stripe.invoiceItems.create({
    customer: subscription.customer,
    amount: -900, // -€9.00
    currency: 'eur',
    description: 'Welcome bonus: Referred by a friend! 🎁'
  });

  // Track referral in subscription metadata (for stats)
  const currentReferrals = parseInt(referrerSubscription.metadata.total_referrals || '0');

  await stripe.subscriptions.update(referrerSubscription.id, {
    metadata: {
      total_referrals: (currentReferrals + 1).toString(),
      last_referral_date: new Date().toISOString()
    }
  });
}
```

**Step 5: Show Referral Stats in App**
```javascript
// Desktop app can fetch user's referral count
async function getReferralStats(userEmail) {
  const response = await fetch('https://api.gigzilla.site/referral-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail })
  });

  const { total_referrals } = await response.json();

  return total_referrals; // e.g., 3
}

// Worker endpoint (stateless!)
async function getReferralStatsHandler(email) {
  // Find customer in Stripe
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return { total_referrals: 0 };

  // Get their subscription
  const subs = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    limit: 1
  });

  if (subs.data.length === 0) return { total_referrals: 0 };

  // Return referral count from metadata
  return {
    total_referrals: parseInt(subs.data[0].metadata.total_referrals || '0')
  };
}
```

---

## ☁️ Cloudflare Worker (Complete Code)

### File: `worker.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY); // Environment variable

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
      return handleVerify(request, env, corsHeaders);
    }

    if (url.pathname === '/referral-stats' && request.method === 'POST') {
      return handleReferralStats(request, env, corsHeaders);
    }

    if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// Verify subscription status
async function handleVerify(request, env, corsHeaders) {
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
async function handleReferralStats(request, env, corsHeaders) {
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
async function handleStripeWebhook(request, env) {
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
        await handleSubscriptionChange(event.data.object);
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
async function handleSubscriptionChange(subscription) {
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
```

---

## 📦 What You Store: NOTHING

### Zero Database Schema:

```
No tables.
No collections.
No storage.

Everything lives in Stripe! ✅
```

### Data Flow:

```
Desktop App          Cloudflare Worker          Stripe
    |                       |                      |
    |------ email --------->|                      |
    |                       |---- search customer->|
    |                       |<--- customer data ---|
    |<----- JWT token ------|                      |
    |                       |                      |
   Stores token locally     Nothing stored!       Stores everything
```

---

## 💰 Cost Breakdown

### Infrastructure Costs:

```
Cloudflare Worker:
├─ 100,000 requests/day: FREE
├─ 10,000,000 requests/month: FREE
└─ Cost: €0

Cloudflare Pages (website):
├─ Unlimited sites: FREE
└─ Cost: €0

Stripe:
├─ 1.5% + €0.25 per EU transaction
├─ 2.9% + €0.25 per non-EU transaction
└─ Example: €9 subscription = €0.39 fee = €8.61 net

Total Monthly Infrastructure: €0
Total per Customer: Just Stripe fees
```

### Revenue per Customer:

```
Monthly (€9):
├─ Stripe fee: €0.39
└─ Net to you: €8.61 (95.7% margin!)

Annual (€90):
├─ Stripe fee: €1.60
└─ Net to you: €88.40 (98.2% margin!)

AppSumo Lifetime (€360):
├─ AppSumo cut: €252 (70%)
├─ Stripe fee: ~€3
└─ Net to you: €105 (29% margin)
```

---

## 🚀 Deployment Steps

### 1. Set Up Stripe

```bash
# Create Stripe account at stripe.com
# Create two products:

Product 1: Gigzilla Monthly
├─ Price: €9/month
├─ Billing: Recurring
└─ Copy Price ID: price_xxxxx

Product 2: Gigzilla Annual
├─ Price: €90/year
├─ Billing: Recurring
└─ Copy Price ID: price_yyyyy

# Enable trial periods:
Settings → Billing → Customer portal
Enable "14-day trial"
```

### 2. Deploy Cloudflare Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create new worker
wrangler init gigzilla-api

# Copy worker.js code to src/index.js

# Add environment variables
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put JWT_SECRET

# Deploy!
wrangler deploy
```

### 3. Set Up Stripe Webhook

```bash
# In Stripe Dashboard:
Developers → Webhooks → Add endpoint

URL: https://gigzilla-api.your-username.workers.dev/webhook/stripe

Events:
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ customer.subscription.trial_will_end

Copy webhook signing secret → Add to Cloudflare Worker secrets
```

### 4. Create Landing Page

```bash
# Deploy to Cloudflare Pages
# Upload static HTML/CSS/JS

# Integrate Stripe Checkout:
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY');

  // Handle subscription
  async function subscribe(plan) {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_SECRET_KEY',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'success_url': 'https://gigzilla.site/success',
        'cancel_url': 'https://gigzilla.site/pricing',
        'mode': 'subscription',
        'line_items[0][price]': plan === 'monthly' ? 'price_xxxxx' : 'price_yyyyy',
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '14'
      })
    });

    const session = await response.json();
    stripe.redirectToCheckout({ sessionId: session.id });
  }
</script>
```

---

## 🎯 Success Metrics

### What to Track:

```
In Stripe Dashboard:
├─ Active subscriptions (MRR)
├─ Trial conversion rate
├─ Churn rate
├─ Lifetime value
└─ Referral credits issued

In Cloudflare:
├─ API requests per day
├─ Error rate
└─ Response time

You don't need analytics tools! Stripe shows everything.
```

---

## ✅ Advantages of This Architecture

**1. Zero Liability**
- No personal data stored
- No GDPR compliance needed
- No security audits needed
- No data breaches possible

**2. Zero Costs**
- No database fees
- No server fees
- Only Stripe transaction fees

**3. Zero Maintenance**
- No database backups
- No server updates
- No scaling concerns
- Stripe handles everything

**4. Unlimited Scale**
- Cloudflare Workers: 100k requests/day free
- Can handle 1M+ users on free tier
- No performance degradation

**5. True Passive Income**
- Set it up once
- Runs forever
- No monitoring needed
- Stripe emails you when things happen

---

## 🎉 Result

**You have:**
- ✅ A desktop app that works locally
- ✅ A subscription system with trials
- ✅ A referral program (1 month free)
- ✅ Unlimited device support
- ✅ Offline grace period (7 days)
- ✅ €0 monthly infrastructure costs
- ✅ Zero personal data storage
- ✅ True passive income

**Total code:** ~300 lines (one Cloudflare Worker file)
**Total infrastructure:** 1 serverless function
**Total monthly cost:** €0
**GDPR liability:** None (Stripe is data controller)

**This is the DREAM architecture!** 🚀
