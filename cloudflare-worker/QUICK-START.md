# Gigzilla Worker - Quick Start (Windows)

If you encountered errors installing wrangler globally, use this local installation method instead.

## Step 1: Install Dependencies Locally

```bash
cd cloudflare-worker
npm install
```

This installs wrangler locally in the project (no global installation needed).

## Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This opens your browser to authenticate with Cloudflare.

## Step 3: Add Secrets

Use `npx wrangler` instead of just `wrangler`:

### JWT Secret (Already Generated)
```bash
npx wrangler secret put JWT_SECRET
```
When prompted, paste:
```
e76ryZuV87Km3A8qw4/Oy2HNUar6vfY/zsh18Bzfip8=
```

### Stripe Secret Key
```bash
npx wrangler secret put STRIPE_SECRET_KEY
```
When prompted, paste your Stripe key:
- Get from: https://dashboard.stripe.com/test/apikeys
- Format: `sk_test_...` (test mode) or `sk_live_...` (production)

### Stripe Webhook Secret
```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```
When prompted, paste your webhook signing secret:
- Create webhook first (see step 5)
- Format: `whsec_...`

## Step 4: Deploy Worker

```bash
npm run deploy
```

Or:
```bash
npx wrangler deploy
```

You'll see output like:
```
✨ Compiled Worker successfully
🌍 Uploading...
✨ Success! Deployed to:
   https://gigzilla-api.<your-subdomain>.workers.dev
```

**Save this URL!** You'll need it for:
- Desktop app configuration
- Stripe webhook setup

## Step 5: Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://gigzilla-api.<your-subdomain>.workers.dev/webhook/stripe`
4. Select events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `customer.subscription.trial_will_end`
5. Click **"Add endpoint"**
6. Click **"Reveal"** to see signing secret (starts with `whsec_`)
7. Add the webhook secret (Step 3 above)

## Step 6: Test Deployment

### Test Health Endpoint
```bash
curl https://gigzilla-api.<your-subdomain>.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-...",
  "version": "1.0.0"
}
```

### Test Verify Endpoint
```bash
curl -X POST https://gigzilla-api.<your-subdomain>.workers.dev/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\"}"
```

Expected (no subscription):
```json
{
  "hasSubscription": false,
  "reason": "NO_CUSTOMER"
}
```

## Step 7: Local Development (Optional)

Run worker locally for testing:

```bash
npm run dev
```

Or:
```bash
npx wrangler dev
```

The worker will run at: `http://localhost:8787`

Test locally:
```bash
curl http://localhost:8787/health
```

## Using NPM Scripts

The `package.json` includes convenient scripts:

```bash
# Start local dev server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Run tests
npm test
```

## Secrets Management

### List all secrets
```bash
npx wrangler secret list
```

### Update a secret
```bash
npx wrangler secret put STRIPE_SECRET_KEY
```

### Delete a secret
```bash
npx wrangler secret delete SECRET_NAME
```

## View Logs

```bash
npx wrangler tail
```

Or view in dashboard:
1. Go to: https://dash.cloudflare.com
2. Workers & Pages → gigzilla-api
3. Logs tab

## Troubleshooting

### Error: "wrangler: command not found"
Use `npx wrangler` instead of just `wrangler`.

### Error: "Authentication required"
Run: `npx wrangler login`

### Error: "Webhook signature verification failed"
Make sure you added the correct `STRIPE_WEBHOOK_SECRET`:
```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

### Check which secrets are configured
```bash
npx wrangler secret list
```

You should see:
- JWT_SECRET
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

## Next Steps

1. ✅ Deploy worker
2. ✅ Add all three secrets
3. ✅ Configure Stripe webhook
4. ✅ Test endpoints
5. 🔄 Update desktop app with worker URL
6. 🔄 Test full authentication flow

## Worker URL

After deployment, your worker is available at:
```
https://gigzilla-api.<your-subdomain>.workers.dev
```

Save this URL for the desktop app configuration.

## Important Files

- `wrangler.toml` - Worker configuration
- `src/index.js` - Worker code (334 lines)
- `package.json` - Dependencies and scripts
- `SECRETS.md` - Quick reference for secrets (gitignored)

## Production Checklist

Before going to production:

- [ ] Switch Stripe to live mode
- [ ] Update `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
- [ ] Create live webhook endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
- [ ] Test all endpoints with real Stripe data
- [ ] Configure custom domain (optional)
- [ ] Monitor logs for errors

---

**Generated JWT Secret:** `e76ryZuV87Km3A8qw4/Oy2HNUar6vfY/zsh18Bzfip8=`

Keep this secure and use it when adding the JWT_SECRET.
