# Gigzilla Local SaaS - Development Setup Checklist

This checklist covers all accounts and services needed to develop and deploy Gigzilla.

---

## ✅ Phase 1: Essential Accounts (Required for Development)

### 1. Stripe Account (Payment Processing)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Create Stripe account at https://stripe.com
- [ ] Enable Test Mode
- [ ] Get Test API Keys:
  - [ ] Secret Key (sk_test_...)
  - [ ] Publishable Key (pk_test_...)
- [ ] Create Products in Test Mode:
  - [ ] Gigzilla Pro (€9/month, 3 devices) - Get Price ID
  - [ ] Gigzilla Pro Annual (€90/year, 3 devices) - Get Price ID
  - [ ] Gigzilla Pro Lifetime (€360 one-time, 3 devices, AppSumo exclusive) - Get Price ID
- [ ] Set up Test Webhook Endpoint:
  - [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
  - [ ] Run `stripe login` to authenticate
  - [ ] For local testing: `stripe listen --forward-to http://localhost:8787/webhook/stripe`
  - [ ] Note down webhook signing secret (whsec_...)

**Links:**
- Dashboard: https://dashboard.stripe.com
- Test API Keys: https://dashboard.stripe.com/test/apikeys
- Products: https://dashboard.stripe.com/test/products
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli

**Cost:** Free (test mode), 1.5% + €0.25 per transaction in production

---

### 2. Cloudflare Account (Backend Deployment)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Create Cloudflare account at https://cloudflare.com
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Login to Wrangler: `wrangler login`
- [ ] Verify authentication: `wrangler whoami`

**Links:**
- Sign up: https://dash.cloudflare.com/sign-up
- Workers Dashboard: https://dash.cloudflare.com/workers
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/

**Cost:**
- Free tier: 100,000 requests/day (sufficient for 1000+ users)
- Paid: €5/month for 10M requests + €0.50/million additional

---

## ⚙️ Phase 2: Development Tools (Local Setup)

### 3. Node.js & npm
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Node.js v18+ installed (Current: v25.1.0 ✅)
- [ ] npm installed (comes with Node.js)
- [ ] Verify: `node --version` should show v18.0.0 or higher
- [ ] Verify: `npm --version`

**Links:**
- Download: https://nodejs.org (LTS version recommended)

**Cost:** Free

---

### 4. Git & GitHub
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Git installed locally
- [ ] GitHub account (you already have: CrtRajster)
- [ ] Repository cloned: Gigzilla_Local_SaaS ✅
- [ ] SSH keys configured for GitHub
- [ ] Verify: `git status` works in project directory

**Links:**
- Git Download: https://git-scm.com
- GitHub: https://github.com
- Your Repo: https://github.com/CrtRajster/Gigzilla_Local_SaaS

**Cost:** Free

---

### 5. Code Editor / IDE
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**Recommended:**
- [ ] VS Code (recommended for JavaScript/Node.js)
- [ ] Extensions installed:
  - [ ] ESLint (code linting)
  - [ ] Prettier (code formatting)
  - [ ] Wrangler (Cloudflare Workers support)
  - [ ] Thunder Client or REST Client (API testing)

**Alternative IDEs:**
- WebStorm (JetBrains)
- Sublime Text
- Atom

**Cost:** Free (VS Code)

---

## 📦 Phase 3: Optional Services (For Production)

### 6. Domain Name (Optional but Recommended)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Register domain (suggestion: gigzilla.site or similar)
- [ ] Point domain to Cloudflare Workers
- [ ] Set up DNS records

**Recommended Registrars:**
- Namecheap (€10-15/year)
- Google Domains (€12/year)
- Cloudflare Registrar (at cost pricing)

**Cost:** €10-15/year

---

### 7. Email Service (For Transactional Emails)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Set up email service for sending:
  - License activation emails
  - Payment confirmations
  - Password resets
  - Referral notifications

**Recommended Services:**
- [ ] SendGrid (100 emails/day free)
- [ ] Mailgun (5,000 emails/month free for 3 months)
- [ ] Amazon SES (€0.10 per 1,000 emails)
- [ ] Resend (3,000 emails/month free)

**Cost:** Free tier available, ~€10/month for 10k emails

---

### 8. Error Tracking & Monitoring (Recommended)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Set up error tracking service
- [ ] Integrate with Cloudflare Worker
- [ ] Set up uptime monitoring

**Recommended Services:**
- [ ] Sentry (5k errors/month free) - Error tracking
- [ ] UptimeRobot (50 monitors free) - Uptime monitoring
- [ ] BetterStack (formerly Logtail) - Logging

**Cost:** Free tiers available

---

### 9. Analytics (Optional)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Desktop app usage analytics
- [ ] API usage tracking
- [ ] Landing page analytics

**Recommended Services:**
- [ ] PostHog (self-hosted or cloud, privacy-focused)
- [ ] Mixpanel (100k events/month free)
- [ ] Plausible (privacy-focused, paid only €9/month)

**Cost:** Free tiers available or €9-30/month

---

## 🧪 Phase 4: Testing Accounts

### 10. Test Stripe Accounts
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Create test email accounts for testing flows:
  - [ ] test-trial@yourdomain.com (trial flow)
  - [ ] test-pro@yourdomain.com (Pro subscription)
  - [ ] test-business@yourdomain.com (Business subscription)
  - [ ] test-referral@yourdomain.com (referral flow)

**Use test credit cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Auth required: `4000 0027 6000 3184`

**Links:**
- Test Cards: https://stripe.com/docs/testing#cards

**Cost:** Free

---

## 🚀 Phase 5: Production Deployment (When Ready)

### 11. Production Stripe Account
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Complete Stripe account verification
- [ ] Add business details
- [ ] Set up bank account for payouts
- [ ] Switch to Live Mode
- [ ] Get Live API Keys
- [ ] Recreate products in Live Mode
- [ ] Set up Production Webhook

**Cost:** 1.5% + €0.25 per transaction

---

### 12. SSL Certificate (Included with Cloudflare)
**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

**What you need:**
- [ ] Enable SSL in Cloudflare
- [ ] Set SSL mode to "Full (strict)"

**Cost:** Free (included with Cloudflare)

---

## 📋 Quick Reference: Account Credentials Storage

Create a secure password manager entry with:

```
SERVICE: Gigzilla Development Accounts
───────────────────────────────────────

STRIPE (Test)
- Email: [your-email]
- Dashboard: https://dashboard.stripe.com
- Secret Key: sk_test_... (from Stripe Dashboard)
- Publishable Key: pk_test_... (from Stripe Dashboard)
- Webhook Secret: whsec_... (add after deployment)
- Pro Monthly Price ID: price_... (from Gigzilla Pro product)
- Pro Annual Price ID: price_... (from Gigzilla Pro Annual product)
- Pro Lifetime Price ID: price_... (from Gigzilla Pro Lifetime product)

CLOUDFLARE
- Email: [your-email]
- Dashboard: https://dash.cloudflare.com
- Account ID: [from dashboard]
- API Token: [from wrangler login]

GITHUB
- Username: CrtRajster
- Repo: git@github.com:CrtRajster/Gigzilla_Local_SaaS.git

DOMAIN (if registered)
- Domain: gigzilla.site
- Registrar: [registrar-name]
- Login: [registrar-login]

EMAIL SERVICE (if used)
- Service: [SendGrid/Mailgun/etc]
- API Key: [api-key]

MONITORING (if used)
- Sentry DSN: [dsn]
- UptimeRobot: [account]
```

---

## 🎯 Current Progress Summary

**Essential Accounts (Must Have):**
- [x] GitHub Account & Repository
- [ ] Stripe Account (Test Mode)
- [ ] Cloudflare Account

**Development Tools:**
- [x] Node.js v25.1.0
- [x] npm
- [x] Git
- [ ] Code Editor Setup
- [ ] Stripe CLI

**Optional Services:**
- [ ] Domain Name
- [ ] Email Service
- [ ] Error Tracking
- [ ] Analytics

**Estimated Setup Time:** 2-3 hours for all essential accounts

---

## 📞 Support Links

**If you get stuck:**
- Stripe Support: https://support.stripe.com
- Cloudflare Community: https://community.cloudflare.com
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- GitHub Gigzilla Repo: https://github.com/CrtRajster/Gigzilla_Local_SaaS

---

## ✅ Next Steps After Checklist Complete

Once you have all essential accounts set up:

1. **Update .env.example** with your actual test credentials
2. **Test local development** with `npm run dev`
3. **Deploy to Cloudflare Workers** with `wrangler deploy`
4. **Set up Stripe webhook** pointing to your deployed worker
5. **Test complete flow:** trial → subscription → license validation

Good luck! 🚀
