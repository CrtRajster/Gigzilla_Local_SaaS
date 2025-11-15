# AppSumo Integration - Lifetime Tier

This document explains how to integrate Gigzilla with AppSumo using the hidden lifetime tier.

## Overview

Gigzilla supports a **hidden lifetime tier** priced at **€360** (one-time payment). This tier is not shown in the desktop app UI and is exclusively for AppSumo deals.

## Stripe Configuration

**Required Credentials:**
- Secret Key: Your Stripe secret key (test or production)
- Publishable Key: Your Stripe publishable key (test or production)

**Required Price IDs:**
- Monthly: Your monthly price ID (€9/month)
- Annual: Your annual price ID (€90/year)
- **Lifetime: Your lifetime price ID (€360 one-time)**

Configure these in your `.env` file (see `.env.example` for template).

## API Endpoint

### Create Lifetime Checkout Session

**Endpoint:** `POST /api/create-checkout-session`

**Request:**
```json
{
  "email": "customer@example.com",
  "billing_period": "lifetime"
}
```

**Response:**
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/c/pay/...",
  "session_id": "cs_test_..."
}
```

## Test with cURL

```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@appsumo.com",
    "billing_period": "lifetime"
  }'
```

## AppSumo Integration Steps

### 1. AppSumo Purchase Flow

When a customer purchases from AppSumo:

1. AppSumo sends customer email to your webhook/API
2. Your integration creates a Stripe Checkout Session with `billing_period: "lifetime"`
3. Customer is redirected to Stripe Checkout to complete payment
4. Upon payment completion, Stripe webhook activates the license

### 2. Webhook Handler

The webhook handler (`stripe-webhook.js`) automatically detects lifetime purchases:

```javascript
// Detects mode='payment' for lifetime vs mode='subscription' for recurring
if (mode === 'payment') {
  // Lifetime purchase
  await activateLicense(email, customerId, `lifetime_${customerId}`, 'pro', 'lifetime');
}
```

### 3. License Activation

Lifetime licenses are activated with:
- **Tier:** `pro`
- **Billing Period:** `lifetime`
- **Subscription ID:** `lifetime_{customerId}` (unique identifier)
- **Expiration:** No expiration (lifetime access)

## Test Stripe Checkout

Use Stripe test card numbers:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

**Decline:**
- Card: `4000 0000 0000 0002`

## Verification

After successful checkout, verify the license was activated:

```bash
curl -X POST http://localhost:3000/api/license-info \
  -H "Content-Type: application/json" \
  -d '{"email": "test@appsumo.com"}'
```

Expected response:
```json
{
  "found": true,
  "license": {
    "email": "test@appsumo.com",
    "tier": "pro",
    "status": "active",
    "valid_until": null,  // or very far future date
    "max_devices": 3
  }
}
```

## Important Notes

1. **Hidden from UI:** The lifetime tier is NOT shown in the desktop app upgrade screen
2. **API Only:** Only accessible via the API endpoint with `billing_period: "lifetime"`
3. **One-time Payment:** Uses Stripe Checkout `mode: 'payment'` instead of `mode: 'subscription'`
4. **No Recurring Billing:** Customer is charged once (€360) and has lifetime access
5. **AppSumo Exclusive:** This tier is specifically for AppSumo deals

## Environment Variables

Make sure these are set in your `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_ANNUAL_PRICE_ID=price_your_annual_price_id
STRIPE_LIFETIME_PRICE_ID=price_your_lifetime_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Production Deployment

Before going live:

1. Replace test credentials with live Stripe keys
2. Create a live Stripe Product for "Gigzilla Pro Lifetime"
3. Set price to €360 (one-time)
4. Update `STRIPE_LIFETIME_PRICE_ID` with the live price ID
5. Set up Stripe webhook endpoint in production
6. Add webhook secret to `STRIPE_WEBHOOK_SECRET`
7. Test with real payment (can refund after testing)

## Support

For AppSumo integration support, contact your development team.
