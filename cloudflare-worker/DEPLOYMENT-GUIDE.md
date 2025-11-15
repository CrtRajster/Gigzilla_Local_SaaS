# Gigzilla Cloudflare Worker - Deployment Guide

This guide walks you through deploying the Gigzilla zero-storage authentication worker to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account** - Free tier works fine
2. **Wrangler CLI** - Cloudflare's command-line tool
3. **Stripe Account** - For subscription management
4. **Node.js** - v16 or higher

## Step 1: Install Wrangler

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

## Step 2: Generate JWT Secret

Generate a secure random secret for JWT token signing:

```bash
openssl rand -base64 32
```

**Generated Secret (SAVE THIS):**
```
e76ryZuV87Km3A8qw4/Oy2HNUar6vfY/zsh18Bzfip8=
```

⚠️ **Important:** Save this secret securely. You'll need it in Step 4.

## Step 3: Get Stripe API Keys

### 3.1 Get Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)

### 3.2 Set Up Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your worker URL: `https://gigzilla-api.<your-subdomain>.workers.dev/webhook/stripe`
   - Or your custom domain if configured
4. Select these events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `customer.subscription.trial_will_end`
5. Click **"Add endpoint"**
6. Click **"Reveal"** next to "Signing secret" and copy it (starts with `whsec_`)

## Step 4: Configure Worker Secrets

Navigate to the worker directory and add secrets:

```bash
cd cloudflare-worker

# Add Stripe Secret Key
wrangler secret put STRIPE_SECRET_KEY
# When prompted, paste: sk_test_... (or sk_live_...)

# Add JWT Secret
wrangler secret put JWT_SECRET
# When prompted, paste: e76ryZuV87Km3A8qw4/Oy2HNUar6vfY/zsh18Bzfip8=

# Add Stripe Webhook Secret
wrangler secret put STRIPE_WEBHOOK_SECRET
# When prompted, paste: whsec_...
```

**Note:** Each command will prompt you to paste the secret value. Press Enter after pasting.

## Step 5: Review Configuration

Check `wrangler.toml`:

```toml
name = "gigzilla-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Secrets are stored securely in Cloudflare (not in this file)
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
# JWT_SECRET

[vars]
ENVIRONMENT = "production"
```

**Optional:** Update the worker name if you want a different subdomain:
- Current: `https://gigzilla-api.<your-subdomain>.workers.dev`
- Custom: Change `name = "my-custom-name"`

## Step 6: Deploy Worker

```bash
# Deploy to Cloudflare
wrangler deploy

# You should see output like:
# ✨ Compiled Worker successfully
# 🌍 Uploading...
# ✨ Success! Deployed to:
#    https://gigzilla-api.<your-subdomain>.workers.dev
```

## Step 7: Test Deployment

### 7.1 Test Health Endpoint

```bash
curl https://gigzilla-api.<your-subdomain>.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T...",
  "version": "1.0.0"
}
```

### 7.2 Test Verification Endpoint

Create a test customer in Stripe, then:

```bash
curl -X POST https://gigzilla-api.<your-subdomain>.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response (no subscription):
```json
{
  "hasSubscription": false,
  "reason": "NO_CUSTOMER"
}
```

### 7.3 Test Webhook Endpoint

Use Stripe CLI to forward test events:

```bash
stripe listen --forward-to https://gigzilla-api.<your-subdomain>.workers.dev/webhook/stripe
```

Trigger a test event:
```bash
stripe trigger customer.subscription.created
```

## Step 8: Update Desktop App Configuration

Update your desktop app to use the deployed worker URL:

**File:** `desktop-app/src/config.js` (or wherever API URL is configured)

```javascript
const API_URL = 'https://gigzilla-api.<your-subdomain>.workers.dev';
```

## Step 9: Configure Custom Domain (Optional)

### Using Cloudflare Dashboard:

1. Go to **Workers & Pages** → **gigzilla-api**
2. Click **Settings** → **Triggers**
3. Click **Add Custom Domain**
4. Enter: `api.gigzilla.site` (or your domain)
5. Click **Add Custom Domain**

### Using Wrangler:

Add to `wrangler.toml`:

```toml
routes = [
  { pattern = "api.gigzilla.site", zone_name = "gigzilla.site" }
]
```

Then redeploy:
```bash
wrangler deploy
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `JWT_SECRET` | Secret for signing JWT tokens | `e76ryZuV87Km...` |

## API Endpoints

### POST /verify
Verify email subscription and return JWT token.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "hasSubscription": true,
  "status": "active",
  "plan": "monthly",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /referral-stats
Get user's referral statistics.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "total_referrals": 5,
  "referral_code": "dXNlckBleGFt"
}
```

### POST /webhook/stripe
Handle Stripe webhook events (signature verified).

## Monitoring & Logs

### View Real-time Logs

```bash
wrangler tail
```

### View Logs in Dashboard

1. Go to **Workers & Pages** → **gigzilla-api**
2. Click **Logs** tab
3. View real-time requests and errors

### Check Analytics

1. Go to **Workers & Pages** → **gigzilla-api**
2. Click **Analytics** tab
3. View requests, errors, and performance

## Troubleshooting

### Issue: "Webhook signature verification failed"

**Solution:** Make sure you added the correct `STRIPE_WEBHOOK_SECRET` from the Stripe Dashboard webhook settings.

```bash
# Update the secret
wrangler secret put STRIPE_WEBHOOK_SECRET
```

### Issue: "STRIPE_SECRET_KEY is not defined"

**Solution:** Add the missing secret:

```bash
wrangler secret put STRIPE_SECRET_KEY
```

### Issue: Worker returns 500 errors

**Solution:** Check logs for detailed error:

```bash
wrangler tail
```

Then make a request to see the error details.

### Issue: CORS errors in desktop app

**Solution:** The worker already includes CORS headers. Make sure your desktop app is making requests with proper headers:

```javascript
fetch('https://your-worker.workers.dev/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: 'user@example.com' })
});
```

## Security Checklist

- ✅ All secrets stored in Cloudflare Workers (not in code)
- ✅ Webhook signature verification enabled
- ✅ CORS configured for desktop app access
- ✅ JWT tokens expire after 7 days (offline grace period)
- ✅ No database - all data in Stripe (zero-storage architecture)

## Production Deployment

When ready for production:

1. Switch Stripe to **live mode**
2. Get **live** API keys from Stripe Dashboard
3. Update secrets with live keys:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   # Paste: sk_live_...

   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste: whsec_... (from live webhook)
   ```
4. Update webhook endpoint in Stripe to production URL
5. Deploy:
   ```bash
   wrangler deploy
   ```

## Cost Estimate

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- **Cost:** $0/month for most small apps

**Cloudflare Workers Paid Plan ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- Plenty for most SaaS apps

**Stripe:**
- No monthly fees
- Transaction fees apply when processing payments
- Webhook events are free

## Support

For issues with:
- **Worker deployment:** Check Cloudflare Workers documentation
- **Stripe integration:** Check Stripe API documentation
- **Worker code:** Review `cloudflare-worker/src/index.js`

## Next Steps

1. ✅ Deploy worker to Cloudflare
2. ✅ Configure Stripe webhook
3. ✅ Test endpoints
4. 🔄 Update desktop app with worker URL
5. 🔄 Test full authentication flow
6. 🔄 Deploy desktop app to users

---

**Generated JWT Secret:** `e76ryZuV87Km3A8qw4/Oy2HNUar6vfY/zsh18Bzfip8=`

⚠️ **Keep this secret secure!** Do not commit to version control.
