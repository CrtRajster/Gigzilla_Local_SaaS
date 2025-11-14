# Gigzilla - Zero-Storage Deployment Guide

## 🎯 Overview

This guide will help you deploy Gigzilla with **ZERO personal data storage** and minimal costs.

**What you'll deploy:**
1. Cloudflare Worker (FREE) - API for subscription verification
2. Stripe Account - Handles all payments and customer data
3. Static Landing Page (FREE) - Cloudflare Pages
4. Desktop App - Electron app with local data

**Monthly Cost: €0** (until you hit millions of requests)

---

## 📋 Prerequisites

### Required Accounts:
- [ ] Stripe account (https://stripe.com)
- [ ] Cloudflare account (https://cloudflare.com)
- [ ] Domain name (optional but recommended)
- [ ] GitHub account (for deploying landing page)

### Required Tools:
- [ ] Node.js 18+ installed
- [ ] npm or pnpm installed
- [ ] Git installed
- [ ] Wrangler CLI (`npm install -g wrangler`)

---

## Part 1: Stripe Setup (15 minutes)

### Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Sign up for an account
3. Complete business verification
4. **Important:** Start in TEST mode first!

### Step 2: Create Products

**In Stripe Dashboard → Products → Add product:**

**Product 1: Gigzilla Monthly**
```
Name: Gigzilla Monthly
Description: Monthly subscription to Gigzilla
Price: €9.00 EUR
Billing period: Monthly
Recurring: Yes
```
📝 Copy the **Price ID** (starts with `price_...`)

**Product 2: Gigzilla Annual**
```
Name: Gigzilla Annual
Description: Annual subscription to Gigzilla (save 17%)
Price: €90.00 EUR
Billing period: Yearly
Recurring: Yes
```
📝 Copy the **Price ID** (starts with `price_...`)

### Step 3: Enable Trial Period

1. Go to **Settings** → **Billing** → **Customer portal**
2. Enable: "Allow customers to cancel subscriptions"
3. Enable: "Allow customers to update payment methods"
4. Set trial period: 14 days (set in checkout, not product)

### Step 4: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Test** keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

📝 **Save these for later!**

### Step 5: Create Webhook (Do this AFTER deploying Cloudflare Worker)

We'll come back to this in Part 3.

---

## Part 2: Deploy Cloudflare Worker (10 minutes)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

This will open a browser window to authorize.

### Step 2: Set Up Worker Project

```bash
cd cloudflare-worker

# Install dependencies
npm install

# Generate a secret for JWT tokens
openssl rand -base64 32
# Copy this output - you'll use it as JWT_SECRET
```

### Step 3: Configure Environment Variables

```bash
# Add Stripe Secret Key
wrangler secret put STRIPE_SECRET_KEY
# Paste your Stripe secret key (sk_test_...)

# Add JWT Secret
wrangler secret put JWT_SECRET
# Paste the random string you generated above

# We'll add STRIPE_WEBHOOK_SECRET later (after creating webhook)
```

### Step 4: Deploy!

```bash
wrangler deploy
```

You'll get a URL like:
```
https://gigzilla-api.YOUR-USERNAME.workers.dev
```

📝 **Copy this URL!** You'll need it for:
1. Stripe webhook
2. Desktop app configuration

### Step 5: Test the API

```bash
# Health check
curl https://gigzilla-api.YOUR-USERNAME.workers.dev/health

# Should return:
# {"status":"ok","timestamp":"2025-01-13T..."}
```

✅ **Cloudflare Worker is live!**

---

## Part 3: Configure Stripe Webhook (5 minutes)

### Step 1: Create Webhook in Stripe

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://gigzilla-api.YOUR-USERNAME.workers.dev/webhook/stripe
   ```
4. Select events to listen for:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `customer.subscription.trial_will_end`

5. Click **"Add endpoint"**

### Step 2: Get Webhook Secret

1. Click on the webhook you just created
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 3: Add Webhook Secret to Worker

```bash
cd cloudflare-worker

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste the webhook secret (whsec_...)
```

### Step 4: Test Webhook

Use Stripe CLI to test:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Test the webhook
stripe trigger customer.subscription.created
```

Check your Cloudflare Worker logs to see if webhook was received.

✅ **Stripe webhook configured!**

---

## Part 4: Deploy Landing Page (15 minutes)

### Step 1: Create Landing Page

Create a simple `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Gigzilla - Freelance Business Manager</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <h1>Gigzilla</h1>
  <p>Manage your freelance business, locally.</p>

  <button id="subscribeMonthly">Subscribe Monthly (€9/month)</button>
  <button id="subscribeAnnual">Subscribe Annually (€90/year)</button>

  <script>
    const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // CHANGE THIS!

    const PRICE_MONTHLY = 'price_xxxxx'; // CHANGE THIS!
    const PRICE_ANNUAL = 'price_yyyyy'; // CHANGE THIS!

    // Get referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    const email = urlParams.get('email');

    // Store referral code
    if (referralCode) {
      localStorage.setItem('gigzilla_referral', referralCode);
    }

    // Subscribe function
    async function subscribe(priceId) {
      try {
        const referral = localStorage.getItem('gigzilla_referral');

        // Create checkout session
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_SECRET_KEY', // INSECURE! Move to backend
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'success_url': window.location.origin + '/success',
            'cancel_url': window.location.origin,
            'mode': 'subscription',
            'customer_email': email || '',
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': '1',
            'subscription_data[trial_period_days]': '14',
            'subscription_data[metadata][referral_code]': referral || '',
            'subscription_data[metadata][referred_by_email]': referral ? atob(referral) : ''
          })
        });

        const session = await response.json();
        stripe.redirectToCheckout({ sessionId: session.id });

      } catch (error) {
        alert('Error: ' + error.message);
      }
    }

    document.getElementById('subscribeMonthly').addEventListener('click', () => {
      subscribe(PRICE_MONTHLY);
    });

    document.getElementById('subscribeAnnual').addEventListener('click', () => {
      subscribe(PRICE_ANNUAL);
    });
  </script>
</body>
</html>
```

**Security Note:** The above code has Stripe secret key in frontend (BAD!). For production, create a backend endpoint to create checkout sessions.

### Step 2: Deploy to Cloudflare Pages

```bash
# Create a GitHub repo with your landing page
git init
git add index.html
git commit -m "Initial landing page"
git push origin main

# Go to Cloudflare Dashboard → Pages
# Click "Create a project"
# Connect to GitHub
# Select your repository
# Click "Deploy"
```

Your site will be live at:
```
https://gigzilla.pages.dev
```

### Step 3: Add Custom Domain (Optional)

1. In Cloudflare Pages → Your project → Custom domains
2. Add: `gigzilla.site`
3. Update DNS records as instructed

✅ **Landing page is live!**

---

## Part 5: Build Desktop App (20 minutes)

### Step 1: Update API URL

Edit `desktop-app-auth/auth-manager.js`:

```javascript
const API_URL = 'https://gigzilla-api.YOUR-USERNAME.workers.dev';
const STRIPE_CHECKOUT_URL = 'https://gigzilla.site/subscribe';
```

### Step 2: Integrate Auth Module

Copy files to your Electron app:

```bash
cp desktop-app-auth/auth-manager.js gigzilla-desktop/src/
cp desktop-app-auth/activation-screen.html gigzilla-desktop/src/
```

### Step 3: Update Main Process

Edit `gigzilla-desktop/main.js`:

```javascript
const { app, BrowserWindow, shell } = require('electron');

let mainWindow;

app.on('ready', async () => {
  // Check subscription status
  const { authManager } = require('./src/auth-manager');
  const currentUser = await authManager.getCurrentUser();

  if (!currentUser) {
    // Show activation screen
    mainWindow = new BrowserWindow({
      width: 600,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    mainWindow.loadFile('src/activation-screen.html');

  } else {
    // Check if subscription is still valid
    const status = await authManager.checkSubscription(currentUser.email);

    if (status.isValid) {
      // Load main app
      mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      mainWindow.loadFile('src/index.html');

    } else {
      // Show activation screen
      mainWindow = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      mainWindow.loadFile('src/activation-screen.html');
    }
  }
});
```

### Step 4: Test Locally

```bash
cd gigzilla-desktop
npm install
npm start
```

You should see the activation screen!

### Step 5: Build Installers

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Installers will be in the `dist/` folder.

✅ **Desktop app is ready!**

---

## Part 6: Testing Everything (10 minutes)

### Test Flow:

1. **Open desktop app**
   - Should show activation screen

2. **Enter email and click "Start Free Trial"**
   - Browser should open with Stripe Checkout
   - Enter test card: `4242 4242 4242 4242`
   - Complete checkout

3. **Back in desktop app, click "I Already Subscribed"**
   - Should verify subscription
   - Should unlock app

4. **Close and reopen app**
   - Should stay unlocked (using cached token)

5. **Test referral flow**
   - Get referral link from app
   - Open in browser with `?ref=XXX`
   - Subscribe with different email
   - Check Stripe Dashboard → both customers should have €9 credit

### Test Webhook:

```bash
stripe trigger customer.subscription.created
```

Check logs:
```bash
wrangler tail
```

You should see webhook processing.

✅ **Everything works!**

---

## Part 7: Go Live (Production)

### Step 1: Switch Stripe to Live Mode

1. Stripe Dashboard → Toggle "Test mode" to OFF
2. Go to **Developers** → **API keys**
3. Copy your **Live** keys:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### Step 2: Update Cloudflare Worker Secrets

```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste LIVE secret key (sk_live_...)
```

### Step 3: Update Webhook to Live Mode

1. Stripe Dashboard (Live mode) → Developers → Webhooks
2. Create new webhook endpoint (same URL)
3. Copy new webhook secret
4. Update Worker:

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste LIVE webhook secret
```

### Step 4: Update Landing Page

Replace test publishable key with live key:

```javascript
const stripe = Stripe('pk_live_YOUR_LIVE_KEY');
```

### Step 5: Build Production Desktop App

Update API URLs to production, then build:

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

### Step 6: Distribute!

Upload installers to:
- Your website
- GitHub Releases
- AppSumo (if doing lifetime deal)

✅ **You're LIVE!**

---

## 📊 Monitoring

### Cloudflare Dashboard:
- Workers → Your worker → Analytics
- See requests, errors, response time

### Stripe Dashboard:
- Customers → See all subscribers
- Subscriptions → MRR, churn rate
- Analytics → Revenue, trends

### No other monitoring needed!

---

## 💰 Cost Breakdown (First Year)

### Infrastructure:
```
Cloudflare Worker: €0 (100k requests/day free)
Cloudflare Pages: €0 (unlimited sites)
Domain: €12/year
Total Infrastructure: €12/year
```

### Per Customer (Monthly):
```
Revenue: €9
Stripe fee: €0.39 (1.5% + €0.25)
Net: €8.61 (95.7% margin!)
```

### Example at 100 Customers:
```
Monthly revenue: €900
Stripe fees: €39
Infrastructure: €1/month
Net profit: €860/month

Profit margin: 95.5% 🤯
```

---

## 🎉 You Did It!

You now have:
- ✅ Zero-storage SaaS architecture
- ✅ Subscription system with 14-day trials
- ✅ Referral program (1 month free)
- ✅ Offline-capable desktop app
- ✅ €0 monthly infrastructure costs
- ✅ 95%+ profit margins
- ✅ Zero GDPR liability
- ✅ True passive income

**Total setup time: ~2 hours**
**Maintenance time: ~0 hours/month**

---

## 🐛 Troubleshooting

### Desktop app shows "Network Error"
```bash
# Check if Worker is running:
curl https://gigzilla-api.YOUR-USERNAME.workers.dev/health

# Should return: {"status":"ok"}
```

### Webhook not receiving events
1. Check webhook URL is correct in Stripe
2. Verify webhook secret is set in Worker
3. Test with Stripe CLI:
   ```bash
   stripe trigger customer.subscription.created
   ```
4. Check Worker logs:
   ```bash
   wrangler tail
   ```

### Referral not working
1. Check `subscription_data[metadata]` is set in checkout
2. Verify webhook is processing `customer.subscription.updated`
3. Check Stripe Dashboard → Customer → Subscription → Metadata

### User can't log in
1. Verify email exists in Stripe Customers
2. Check if subscription is active
3. Check Worker logs for errors

---

## 📚 Resources

- Stripe API Docs: https://stripe.com/docs/api
- Cloudflare Workers: https://developers.cloudflare.com/workers
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Webhooks: https://stripe.com/docs/webhooks

---

## 🚀 Next Steps

1. **Marketing:**
   - Launch on Product Hunt
   - List on free directories (Capterra, G2, AlternativeTo)
   - Create AppSumo lifetime deal
   - SEO content for freelancers

2. **Features:**
   - Add more automation
   - Build integrations (Upwork, PayPal)
   - Mobile app (React Native)

3. **Scale:**
   - At 10k+ users, consider upgrading Cloudflare plan
   - Add analytics (privacy-friendly: Plausible)
   - Add customer support (Intercom/Crisp)

---

**Congratulations! You have a truly passive SaaS business!** 🎉
