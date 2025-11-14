# Gigzilla SaaS - Setup Checklist

Complete this checklist to deploy your Gigzilla SaaS system.

## ☐ Phase 1: Database Setup (15 minutes)

### Neon PostgreSQL
- [ ] Create account at https://neon.tech
- [ ] Create new project "gigzilla-saas"
- [ ] Copy connection string
- [ ] Open SQL Editor
- [ ] Execute `backend/schema.sql`
- [ ] Verify tables created: `licenses`, `validation_attempts`

**Connection String Format:**
```
postgresql://user:password@host.neon.tech/gigzilla?sslmode=require
```

---

## ☐ Phase 2: Stripe Setup (20 minutes)

### Create Account
- [ ] Sign up at https://stripe.com
- [ ] Complete business verification (if required)
- [ ] Switch to Test Mode for development

### API Keys
- [ ] Go to Developers → API keys
- [ ] Copy **Publishable key** (pk_test_...)
- [ ] Copy **Secret key** (sk_test_...)
- [ ] Store securely (add to .env later)

### Create Products
- [ ] Go to Products → Add Product

**Product 1: Gigzilla Pro**
- [ ] Name: "Gigzilla Pro"
- [ ] Description: "Professional freelancer tools"
- [ ] Price: €9.00 EUR
- [ ] Billing: Monthly recurring
- [ ] Copy Price ID: `price_...`

**Product 2: Gigzilla Business**
- [ ] Name: "Gigzilla Business"
- [ ] Description: "Advanced features for agencies"
- [ ] Price: €19.00 EUR
- [ ] Billing: Monthly recurring
- [ ] Copy Price ID: `price_...`

### Webhook Setup (Do this AFTER deploying backend)
- [ ] Go to Developers → Webhooks
- [ ] Add endpoint: `https://your-backend.railway.app/webhook/stripe`
- [ ] Select events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Copy Webhook Signing Secret: `whsec_...`

---

## ☐ Phase 3: Backend Deployment (30 minutes)

### Local Setup
- [ ] Navigate to backend folder: `cd backend`
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file (copy from `.env.example`)
- [ ] Fill in all environment variables:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://your-connection-string
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (leave empty for now)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
APP_URL=http://localhost:3000
LICENSE_GRACE_PERIOD_DAYS=7
```

### Test Locally
- [ ] Start server: `npm run dev`
- [ ] Open browser: http://localhost:3000/health
- [ ] Should see: `{"status":"ok","timestamp":"..."}`

### Test API Endpoints
```bash
# Test trial creation
curl -X POST http://localhost:3000/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: {"success":true,"license_key":"...","valid_until":"..."}
```

- [ ] Trial creation works
- [ ] License appears in database

### Deploy to Railway
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login: `railway login`
- [ ] Initialize project: `railway init`
- [ ] Name project: "gigzilla-license-server"
- [ ] Add environment variables in Railway dashboard
- [ ] Deploy: `railway up`
- [ ] Copy deployment URL: `https://your-app.railway.app`

### Verify Deployment
- [ ] Visit: `https://your-app.railway.app/health`
- [ ] Test API from deployed URL
- [ ] Check Railway logs for errors

### Update Stripe Webhook
- [ ] Go back to Stripe Webhooks
- [ ] Update endpoint URL to Railway URL
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Railway env vars
- [ ] Test webhook: Send test event from Stripe

---

## ☐ Phase 4: Desktop App Integration (20 minutes)

### Update Configuration
- [ ] Open `gigzilla-desktop/src/license-manager.js`
- [ ] Update `LICENSE_API`:
```javascript
const LICENSE_API = 'https://your-app.railway.app';
```

### Install Dependencies
- [ ] Navigate to desktop folder: `cd gigzilla-desktop`
- [ ] Install dependencies: `npm install`

### Test Development Build
- [ ] Start app: `npm start`
- [ ] Activation screen should appear
- [ ] Enter test email
- [ ] Click "Start Free Trial"
- [ ] App should load successfully
- [ ] Check database: new license created

### Test License Features
- [ ] Close and reopen app (should load without activation)
- [ ] Check backend logs (validation request received)
- [ ] Clear license data and try activation screen again

---

## ☐ Phase 5: Production Build (15 minutes)

### Build Desktop App
- [ ] Update `LICENSE_API` to production URL
- [ ] Update app version in `package.json`
- [ ] Build for Windows: `npm run build:win`
- [ ] Build for macOS: `npm run build:mac` (if on Mac)
- [ ] Build for Linux: `npm run build:linux`

### Test Installer
- [ ] Install built app on test machine
- [ ] Verify activation flow works
- [ ] Test trial creation
- [ ] Test offline grace period (disconnect internet)

---

## ☐ Phase 6: Create Subscription Page (30 minutes)

### Create Simple Checkout Page
Create `subscribe.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Subscribe to Gigzilla</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <h1>Subscribe to Gigzilla</h1>
  <button id="checkout-pro">Pro - €9/month</button>
  <button id="checkout-business">Business - €19/month</button>

  <script>
    const stripe = Stripe('pk_live_YOUR_KEY');
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    async function createCheckout(priceId) {
      const response = await fetch('https://your-backend/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, price_id: priceId })
      });
      const session = await response.json();
      stripe.redirectToCheckout({ sessionId: session.id });
    }

    document.getElementById('checkout-pro').onclick = () => {
      createCheckout('price_PRO_ID');
    };

    document.getElementById('checkout-business').onclick = () => {
      createCheckout('price_BUSINESS_ID');
    };
  </script>
</body>
</html>
```

### Add Checkout Endpoint to Backend
Add to `backend/src/index.js`:

```javascript
app.post('/create-checkout-session', async (req, res) => {
  const { email, price_id } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{
      price: price_id,
      quantity: 1,
    }],
    success_url: 'https://gigzilla.site/success',
    cancel_url: 'https://gigzilla.site/cancel',
  });

  res.json({ id: session.id });
});
```

- [ ] Add checkout endpoint to backend
- [ ] Deploy updated backend
- [ ] Host subscribe.html page
- [ ] Test subscription flow

---

## ☐ Phase 7: Final Testing (30 minutes)

### Test Complete Flow
- [ ] Install fresh copy of app
- [ ] Start trial with real email
- [ ] Verify email received (if email configured)
- [ ] Use app for a few minutes
- [ ] Close and reopen (should work)
- [ ] Check backend logs (validation requests)

### Test Subscription Flow
- [ ] Wait for trial to expire (or manually expire in DB)
- [ ] App should show "Trial Expired" screen
- [ ] Click "Subscribe Now"
- [ ] Complete Stripe checkout (use test card)
- [ ] Verify webhook received in logs
- [ ] Check database: status should be "active"
- [ ] Click "Refresh" in app
- [ ] App should load successfully

### Test Stripe Test Cards
Use these for testing:
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0027 6000 3184`

### Test Edge Cases
- [ ] Try activating on 3 devices (should fail on 3rd)
- [ ] Test with no internet (grace period should work)
- [ ] Test grace period expiration
- [ ] Cancel subscription in Stripe (license should deactivate)
- [ ] Resubscribe (license should reactivate)

---

## ☐ Phase 8: Go Live (15 minutes)

### Switch to Production
- [ ] Get production Stripe keys
- [ ] Update backend `.env` with live keys
- [ ] Update webhook to use live endpoint
- [ ] Set `NODE_ENV=production`
- [ ] Rebuild desktop app with production API URL

### Domain Setup
- [ ] Point `api.gigzilla.site` to Railway
- [ ] Set up SSL certificate (Railway auto)
- [ ] Test API at production domain

### Launch
- [ ] Upload installer to website
- [ ] Create download page
- [ ] Set up analytics (optional)
- [ ] Monitor first users

---

## ☐ Phase 9: Monitoring Setup (Optional)

### Set Up Alerts
- [ ] Railway: Enable deployment notifications
- [ ] Stripe: Enable webhook failure alerts
- [ ] Neon: Enable usage alerts

### Analytics
- [ ] Track daily signups
- [ ] Track conversion rate
- [ ] Monitor churn
- [ ] Track device usage

---

## Troubleshooting Common Issues

### "Network Error" in Desktop App
- Check if backend is running
- Verify LICENSE_API URL is correct
- Check firewall settings

### Webhook Not Received
- Verify webhook URL in Stripe
- Check signing secret matches
- Look at Stripe webhook logs
- Test with Stripe CLI

### Database Connection Failed
- Verify DATABASE_URL is correct
- Check Neon project is active
- Ensure `?sslmode=require` is in URL

### License Invalid
- Check email and license_key in database
- Verify machine_id generation works
- Check license status (not expired/cancelled)

---

## Quick Reference

### Important URLs
- Backend: `https://your-app.railway.app`
- Stripe Dashboard: `https://dashboard.stripe.com`
- Neon Console: `https://console.neon.tech`
- Railway Dashboard: `https://railway.app`

### Important Commands
```bash
# Backend
cd backend
npm run dev          # Start dev server
npm start            # Start production server
railway up           # Deploy to Railway

# Desktop
cd gigzilla-desktop
npm start            # Run development
npm run build:win    # Build for Windows
```

### Test Stripe Cards
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0027 6000 3184

---

## Completion

Once all checkboxes are complete, your Gigzilla SaaS is live! 🎉

**Next Steps:**
1. Marketing and user acquisition
2. Customer support setup
3. Feature development
4. Scale infrastructure as needed

**Questions?** Check:
- README.md for architecture overview
- DEPLOYMENT.md for detailed guides
- Stripe docs: https://stripe.com/docs
- Railway docs: https://docs.railway.app
