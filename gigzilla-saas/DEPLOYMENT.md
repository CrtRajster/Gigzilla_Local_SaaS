# Gigzilla SaaS - Deployment Guide

## Overview
This guide covers the complete deployment process for the Gigzilla SaaS system, including backend license server, database setup, Stripe configuration, and desktop app builds.

---

## Prerequisites

### Required Accounts
- [ ] Neon PostgreSQL account (https://neon.tech)
- [ ] Stripe account (https://stripe.com)
- [ ] Railway/Render/Fly.io account (for backend hosting)
- [ ] Domain name (e.g., gigzilla.site)

### Required Tools
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Stripe CLI (optional, for webhook testing)

---

## Part 1: Database Setup (Neon PostgreSQL)

### Step 1: Create Database

1. Go to https://neon.tech
2. Sign up or log in
3. Create a new project called "gigzilla-saas"
4. Copy your connection string (starts with `postgresql://...`)

### Step 2: Run Database Schema

1. Connect to your database using the SQL Editor in Neon dashboard
2. Copy and paste the contents of `backend/schema.sql`
3. Execute the SQL script to create tables and indexes

**Expected Output:**
```
✓ licenses table created
✓ validation_attempts table created
✓ Indexes created
```

### Step 3: Verify Tables

Run this query to verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see:
- `licenses`
- `validation_attempts`

---

## Part 2: Stripe Setup

### Step 1: Get API Keys

1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

**Important:** Use test keys (`pk_test_...` and `sk_test_...`) during development!

### Step 2: Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Create two products:

**Product 1: Gigzilla Pro**
- Name: Gigzilla Pro
- Price: €9.00 EUR / month
- Billing: Recurring
- Copy the **Price ID** (starts with `price_...`)

**Product 2: Gigzilla Business**
- Name: Gigzilla Business
- Price: €19.00 EUR / month
- Billing: Recurring
- Copy the **Price ID** (starts with `price_...`)

### Step 3: Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL** to: `https://your-backend-url.railway.app/webhook/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

---

## Part 3: Backend Deployment (Railway)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Create Environment File

Create `backend/.env` file:

```env
# Server
PORT=3000
NODE_ENV=production

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://your-user:your-password@your-host.neon.tech/gigzilla?sslmode=require

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxx

# App
APP_URL=https://gigzilla.site
LICENSE_GRACE_PERIOD_DAYS=7
```

### Step 3: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000/health - you should see:
```json
{"status":"ok","timestamp":"2025-01-13T..."}
```

### Step 4: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add your environment variables in Railway dashboard
# Settings → Variables → Add all .env variables

# Deploy
railway up
```

### Step 5: Verify Deployment

Once deployed, test the endpoints:

```bash
# Health check
curl https://your-app.railway.app/health

# Start trial (test)
curl -X POST https://your-app.railway.app/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Step 6: Update Stripe Webhook URL

1. Go back to Stripe Dashboard → Webhooks
2. Update the endpoint URL to your Railway URL:
   `https://your-app.railway.app/webhook/stripe`

---

## Part 4: Desktop App Configuration

### Step 1: Update License API URL

Edit `gigzilla-desktop/src/license-manager.js`:

```javascript
const LICENSE_API = 'https://your-app.railway.app'; // Change this!
```

### Step 2: Install Dependencies

```bash
cd gigzilla-desktop
npm install
```

### Step 3: Test Development Build

```bash
npm start
```

The app should launch and show the activation screen.

### Step 4: Build for Distribution

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

The installer will be created in the `dist/` folder.

---

## Part 5: Testing the Complete Flow

### Test 1: Trial Activation

1. Launch the desktop app
2. Enter an email address
3. Click "Start Free Trial"
4. The app should load successfully
5. Check the database - you should see a new license record

### Test 2: License Validation

1. Close and reopen the app
2. The app should load without asking for activation (license cached)
3. Check backend logs - you should see validation requests

### Test 3: Subscription Flow

1. In the desktop app, click to subscribe (when trial expires)
2. Complete Stripe checkout
3. Verify webhook received in backend logs
4. Check database - license status should be "active"

### Test 4: Device Limit

1. Generate a fake machine ID
2. Try to activate on more than 2 devices
3. Should show "Device Limit Reached" error

### Test 5: Offline Grace Period

1. Disconnect from internet
2. Launch the app
3. Should work for 7 days with cached license
4. Should show grace period warning

---

## Part 6: Production Checklist

### Security

- [ ] Use production Stripe keys (not test keys)
- [ ] Enable HTTPS for backend
- [ ] Set secure CORS policy in backend
- [ ] Rotate webhook signing secret regularly
- [ ] Use environment variables (never commit secrets)

### Performance

- [ ] Database connection pooling configured
- [ ] Backend server has proper timeout settings
- [ ] Rate limiting enabled on API endpoints
- [ ] CDN configured for static assets

### Monitoring

- [ ] Set up error logging (e.g., Sentry)
- [ ] Monitor backend uptime
- [ ] Track license validation success rate
- [ ] Alert on failed webhook deliveries

### Legal

- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] GDPR compliance (if serving EU)
- [ ] Refund policy

---

## Part 7: Troubleshooting

### Issue: Desktop app shows "Network Error"

**Solution:**
- Check if backend is running: `curl https://your-backend/health`
- Verify LICENSE_API URL in license-manager.js
- Check firewall settings

### Issue: Stripe webhook not received

**Solution:**
- Verify webhook URL is correct in Stripe Dashboard
- Check webhook signing secret matches .env
- Use Stripe CLI to test: `stripe listen --forward-to localhost:3000/webhook/stripe`

### Issue: License validation fails

**Solution:**
- Check database connection
- Verify email and license_key are correct
- Check backend logs for errors
- Ensure machine_id is being generated correctly

### Issue: Trial already exists

**Solution:**
- This is expected behavior - the API returns existing license
- Check database for duplicate email entries
- Clear license data in app: Settings → Clear Data

---

## Part 8: Maintenance

### Monitoring Metrics

Track these in your dashboard:
- Daily active users
- Trial conversion rate
- Churn rate
- Device limit hits
- Grace period usage
- Failed validation attempts

### Database Maintenance

Run monthly:
```sql
-- Clean old validation attempts (keep 90 days)
DELETE FROM validation_attempts
WHERE attempted_at < NOW() - INTERVAL '90 days';

-- Check expired trials
SELECT COUNT(*) FROM licenses
WHERE status = 'trial' AND valid_until < NOW();
```

### Backup Strategy

- Neon provides automatic backups
- Export license data monthly:
  ```sql
  SELECT * FROM licenses ORDER BY created_at DESC;
  ```
- Keep backups encrypted and secure

---

## Part 9: Scaling

### When to Scale

Scale when you reach:
- 10,000+ active licenses
- 100+ validation requests/second
- Database response time > 100ms

### Scaling Options

**Backend:**
- Add more Railway instances
- Use load balancer
- Implement Redis for caching

**Database:**
- Upgrade Neon plan
- Add read replicas
- Implement connection pooling

---

## Support

For issues or questions:
- Check logs first (backend and desktop app)
- Review this documentation
- Contact support@gigzilla.site

---

## Quick Reference

### Important URLs
- Backend API: `https://your-app.railway.app`
- Health Check: `https://your-app.railway.app/health`
- Stripe Dashboard: `https://dashboard.stripe.com`
- Neon Console: `https://console.neon.tech`

### Important Files
- Backend: `backend/src/index.js`
- License Logic: `backend/src/license-validation.js`
- Desktop License Manager: `gigzilla-desktop/src/license-manager.js`
- Database Schema: `backend/schema.sql`

### Environment Variables
```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
```

---

## Done!

Your Gigzilla SaaS is now deployed and ready to accept users! 🚀

Next steps:
1. Marketing and user acquisition
2. Monitor metrics and usage
3. Iterate based on user feedback
4. Scale as needed
