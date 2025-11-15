# Gigzilla API - Cloudflare Worker

Zero-storage, serverless API for Gigzilla license validation and subscription management.

## 🎯 Why Cloudflare Workers?

- **€0 Infrastructure Cost** - Free tier: 100k requests/day
- **95.7% Profit Margins** - No database costs
- **Zero Storage** - Stripe is the only database
- **Global Edge Network** - Low latency worldwide
- **Infinite Scalability** - Handles millions of requests
- **No GDPR Liability** - Zero personal data stored

---

## 📋 Prerequisites

Before you start, make sure you have:

- [x] Node.js v18+ installed (Current: v25.1.0)
- [ ] Cloudflare account ([Sign up](https://dash.cloudflare.com/sign-up))
- [ ] Stripe account ([Sign up](https://stripe.com))
- [ ] Wrangler CLI installed globally

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd cloudflare-worker
npm install
```

### 2. Install Wrangler CLI (if not already installed)

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

### 4. Set Up Secrets

For local development, create secrets:

```bash
# Generate a JWT secret (run this first)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add secrets (use test keys from Stripe dashboard)
wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_test_...

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_...

wrangler secret put JWT_SECRET
# Paste: [output from JWT generation above]
```

### 5. Update wrangler.toml (Optional)

Edit `wrangler.toml` to add non-sensitive config:

```toml
[vars]
ENVIRONMENT = "development"
APP_URL = "http://localhost:8787"
LICENSE_GRACE_PERIOD_DAYS = 7
```

### 6. Run Local Development Server

```bash
npm run dev
```

This starts the worker at `http://localhost:8787`

### 7. Test the API

Open a new terminal and test:

```bash
# Health check
curl http://localhost:8787/health

# Start trial
curl -X POST http://localhost:8787/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 📡 API Endpoints

### GET `/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T12:00:00.000Z"
}
```

### POST `/api/verify`
Validate license and device

**Request:**
```json
{
  "email": "user@example.com",
  "machine_id": "sha256_hash_of_hardware"
}
```

**Response:**
```json
{
  "valid": true,
  "tier": "pro",
  "max_devices": 2,
  "offline_token": "jwt_token_here"
}
```

### GET `/api/referral-stats`
Get referral statistics

**Query Parameters:**
- `email`: User email

**Response:**
```json
{
  "referral_code": "ABC123",
  "referrals_count": 5,
  "credits_earned": 45
}
```

### POST `/webhook/stripe`
Handle Stripe webhook events

**Events:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

---

## 🔧 Configuration

### Environment Variables (via Wrangler Secrets)

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `JWT_SECRET` | Secret for signing JWT tokens | Random 64-char string |

### Non-Secret Config (in wrangler.toml)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `production` |
| `APP_URL` | Application URL | `https://gigzilla.site` |
| `LICENSE_GRACE_PERIOD_DAYS` | Offline grace period | `7` |

---

## 🚢 Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Or with wrangler directly
wrangler deploy
```

Your worker will be deployed to: `https://gigzilla-api.your-subdomain.workers.dev`

### Set Up Custom Domain (Optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages → gigzilla-api
3. Click "Custom Domains"
4. Add your domain (e.g., `api.gigzilla.site`)

---

## 🔗 Set Up Stripe Webhook

After deployment:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add Endpoint"
3. Endpoint URL: `https://your-worker-url.workers.dev/webhook/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the webhook signing secret
6. Update the secret:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

---

## 🧪 Testing

### Test with Stripe CLI

Forward webhooks to local development:

```bash
stripe listen --forward-to http://localhost:8787/webhook/stripe
```

Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

### Test License Validation

```bash
# 1. Create trial
curl -X POST http://localhost:8787/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Validate license
curl -X POST http://localhost:8787/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "machine_id":"test_machine_001"
  }'
```

---

## 📊 Monitoring

### View Logs

```bash
# Tail live logs
wrangler tail

# View logs in dashboard
# https://dash.cloudflare.com → Workers → gigzilla-api → Logs
```

### Metrics

View metrics in Cloudflare Dashboard:
- Requests per second
- Errors
- CPU time
- Success rate

---

## 🐛 Troubleshooting

### Issue: "workerd binary installation failed"

**Solution:** We installed with `--ignore-scripts`. Use `npx wrangler` instead:

```bash
npx wrangler dev
npx wrangler deploy
```

### Issue: "Unauthorized" when deploying

**Solution:** Re-authenticate with Cloudflare:

```bash
wrangler logout
wrangler login
```

### Issue: Stripe webhook signature verification fails

**Solution:** Make sure you're using the correct webhook secret:
- Local development: Secret from `stripe listen`
- Production: Secret from Stripe Dashboard webhook settings

### Issue: CORS errors from desktop app

**Solution:** The worker already includes CORS headers. Verify:
- Desktop app is sending requests to correct URL
- `Origin` header matches expected domain

---

## 📁 Project Structure

```
cloudflare-worker/
├── src/
│   └── index.js           # Main worker code (~450 lines)
├── node_modules/          # Dependencies
├── package.json           # Dependencies & scripts
├── wrangler.toml          # Cloudflare Worker config
├── .env.example           # Environment variables template
└── README.md              # This file
```

---

## 🔐 Security Best Practices

1. **Never commit secrets** - Use `wrangler secret put`
2. **Verify webhook signatures** - Always verify Stripe webhooks
3. **Use HTTPS only** - Workers enforce HTTPS by default
4. **Rotate secrets regularly** - Update JWT_SECRET periodically
5. **Monitor suspicious activity** - Check logs for unusual patterns

---

## 💰 Cost Breakdown

**Free Tier:**
- 100,000 requests/day
- Suitable for ~1,000 active users

**Paid Tier (if you exceed free tier):**
- €5/month base
- €0.50 per million requests

**Example:** 10 million requests/month = €5 + €4.50 = €9.50/month

Compare to traditional hosting: €30-50/month 💸

---

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## 🤝 Support

If you run into issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. View logs with `wrangler tail`
3. Check [Cloudflare Community](https://community.cloudflare.com)
4. Review [Gigzilla Documentation](../README.md)

---

**Ready to build!** 🚀

Next step: [Set up Stripe products](../DEVELOPMENT-CHECKLIST.md#1-stripe-account-payment-processing)
