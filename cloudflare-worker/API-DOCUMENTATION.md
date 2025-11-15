# Gigzilla API Documentation

Complete API reference for the Gigzilla License Validation API.

**Base URL:** `https://your-worker.workers.dev` (or your custom domain)

---

## Authentication

All endpoints except `/health` and `/webhook/stripe` require no authentication headers. Identification is done via email address provided in the request body.

The Stripe webhook endpoint requires a valid Stripe webhook signature header.

---

## Endpoints

### Health Check

Check if the API is running.

**Endpoint:** `GET /health`

**Request:**
```http
GET /health HTTP/1.1
Host: your-worker.workers.dev
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Start Free Trial

Create a 14-day free trial for a new user.

**Endpoint:** `POST /api/start-trial`

**Request:**
```http
POST /api/start-trial HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK` (Success)
```json
{
  "success": true,
  "valid_until": "2025-01-27T12:00:00.000Z",
  "message": "Your 14-day free trial has started!",
  "max_devices": 3
}
```

**Response:** `200 OK` (Already Exists - Active Trial)
```json
{
  "success": true,
  "already_exists": true,
  "valid_until": "2025-01-27T12:00:00.000Z",
  "message": "You already have an active trial"
}
```

**Response:** `200 OK` (Already Has Subscription)
```json
{
  "success": true,
  "already_exists": true,
  "message": "You already have an active subscription"
}
```

**Response:** `400 Bad Request` (Invalid Email)
```json
{
  "success": false,
  "error": "INVALID_EMAIL",
  "message": "Please provide a valid email address"
}
```

**Response:** `400 Bad Request` (Trial Expired)
```json
{
  "success": false,
  "error": "TRIAL_EXPIRED",
  "message": "Your trial has expired. Please subscribe to continue using Gigzilla.",
  "expired_at": "2025-01-10T12:00:00.000Z"
}
```

---

### Validate License

Validate a license and register/validate a device.

**Endpoint:** `POST /api/validate`

**Request:**
```http
POST /api/validate HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json

{
  "email": "user@example.com",
  "machine_id": "sha256_hash_of_hardware_identifier_min_10_chars"
}
```

**Parameters:**
- `email` (string, required): User's email address
- `machine_id` (string, required): Unique hardware identifier (min 10 characters, should be SHA-256 hash of hardware info)

**Response:** `200 OK` (Valid License)
```json
{
  "valid": true,
  "license": {
    "email": "user@example.com",
    "status": "active",
    "tier": "pro",
    "valid_until": null,
    "devices_used": 2,
    "max_devices": 3
  },
  "offline_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "offline_valid_until": "2025-01-20T12:00:00.000Z"
}
```

**Response:** `200 OK` (Trial Valid)
```json
{
  "valid": true,
  "license": {
    "email": "user@example.com",
    "status": "trial",
    "tier": "free",
    "valid_until": "2025-01-27T12:00:00.000Z",
    "devices_used": 1,
    "max_devices": 3
  },
  "offline_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "offline_valid_until": "2025-01-20T12:00:00.000Z"
}
```

**Response:** `200 OK` (Invalid - Trial Expired)
```json
{
  "valid": false,
  "reason": "TRIAL_EXPIRED",
  "message": "Your trial has expired. Please subscribe to continue.",
  "expired_at": "2025-01-10T12:00:00.000Z"
}
```

**Response:** `200 OK` (Invalid - Device Limit Reached)
```json
{
  "valid": false,
  "reason": "MAX_DEVICES_REACHED",
  "message": "Device limit reached (3 devices). Please deactivate a device first.",
  "devices_used": 3,
  "max_devices": 3
}
```

**Response:** `200 OK` (Invalid - No Active License)
```json
{
  "valid": false,
  "reason": "NO_ACTIVE_LICENSE",
  "message": "No active license. Please subscribe or start a trial."
}
```

**Response:** `404 Not Found` (No License)
```json
{
  "valid": false,
  "reason": "NO_LICENSE",
  "message": "No license found. Please start a free trial first."
}
```

**Response:** `400 Bad Request` (Invalid Email)
```json
{
  "valid": false,
  "reason": "INVALID_EMAIL",
  "message": "Please provide a valid email address"
}
```

**Response:** `400 Bad Request` (Invalid Machine ID)
```json
{
  "valid": false,
  "reason": "INVALID_MACHINE_ID",
  "message": "Invalid device identifier"
}
```

---

### Get License Information

Retrieve license information for a user (for UI display).

**Endpoint:** `POST /api/license-info`

**Request:**
```http
POST /api/license-info HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK` (License Found - Trial)
```json
{
  "found": true,
  "license": {
    "email": "user@example.com",
    "status": "trial",
    "tier": "free",
    "valid_until": "2025-01-27T12:00:00.000Z",
    "next_billing_date": null,
    "devices_used": 2,
    "max_devices": 3,
    "created_at": "2025-01-13T12:00:00.000Z"
  }
}
```

**Response:** `200 OK` (License Found - Active Subscription)
```json
{
  "found": true,
  "license": {
    "email": "user@example.com",
    "status": "active",
    "tier": "pro",
    "valid_until": null,
    "next_billing_date": "2025-02-13T12:00:00.000Z",
    "devices_used": 1,
    "max_devices": 3,
    "created_at": "2025-01-13T12:00:00.000Z"
  }
}
```

**Response:** `200 OK` (Not Found)
```json
{
  "found": false
}
```

**Response:** `400 Bad Request` (Invalid Email)
```json
{
  "found": false,
  "error": "INVALID_EMAIL"
}
```

---

### Get Referral Statistics

Get user's referral statistics and referral code.

**Endpoint:** `GET /api/referral-stats?email=user@example.com`

**Request:**
```http
GET /api/referral-stats?email=user@example.com HTTP/1.1
Host: your-worker.workers.dev
```

**Response:** `200 OK`
```json
{
  "total_referrals": 5,
  "referral_code": "ABCD123456",
  "credits_earned": 45
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "Email required"
}
```

---

### Get Active Devices

Get list of all devices registered to a license.

**Endpoint:** `POST /api/devices`

**Request:**
```http
POST /api/devices HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK` (Devices Found)
```json
{
  "found": true,
  "devices": [
    {
      "id": "3a7f9c2e1b4d8f6a...",
      "preview": "3a7f9c2e...8f6a",
      "registeredAt": "2025-01-13T12:00:00.000Z",
      "index": 0
    },
    {
      "id": "7b2c4d8e3f9a1c5d...",
      "preview": "7b2c4d8e...1c5d",
      "registeredAt": "2025-01-13T12:00:00.000Z",
      "index": 1
    }
  ],
  "devices_used": 2,
  "max_devices": 3
}
```

**Response:** `200 OK` (No Devices)
```json
{
  "found": false,
  "devices": []
}
```

**Response:** `400 Bad Request`
```json
{
  "error": "INVALID_EMAIL",
  "message": "Please provide a valid email address"
}
```

---

### Deactivate Device

Deactivate a specific device, removing it from the license and freeing up a slot.

**Endpoint:** `POST /api/deactivate-device`

**Request:**
```http
POST /api/deactivate-device HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json

{
  "email": "user@example.com",
  "machine_id": "3a7f9c2e1b4d8f6a..."
}
```

**Response:** `200 OK` (Success)
```json
{
  "success": true,
  "message": "Device deactivated successfully",
  "devices_remaining": 1,
  "max_devices": 3
}
```

**Response:** `404 Not Found` (Device Not Registered)
```json
{
  "success": false,
  "error": "DEVICE_NOT_FOUND",
  "message": "This device is not registered to your license"
}
```

**Response:** `404 Not Found` (No Customer)
```json
{
  "success": false,
  "error": "NO_CUSTOMER",
  "message": "No license found for this email"
}
```

**Response:** `400 Bad Request` (Invalid Email)
```json
{
  "success": false,
  "error": "INVALID_EMAIL",
  "message": "Please provide a valid email address"
}
```

**Response:** `400 Bad Request` (Invalid Machine ID)
```json
{
  "success": false,
  "error": "INVALID_MACHINE_ID",
  "message": "Invalid device identifier"
}
```

---

### Stripe Webhook

Handle Stripe webhook events.

**Endpoint:** `POST /webhook/stripe`

**Request:**
```http
POST /webhook/stripe HTTP/1.1
Host: your-worker.workers.dev
Content-Type: application/json
Stripe-Signature: t=1640000000,v1=abcd1234...

{
  "type": "checkout.session.completed",
  "data": { ... }
}
```

**Events Handled:**
- `checkout.session.completed` - New subscription created, activate license
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled, deactivate license
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.trial_will_end` - Trial ending soon

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Response:** `400 Bad Request` (Invalid Signature)
```
Webhook signature verification failed
```

---

## Data Storage

All data is stored in **Stripe customer metadata**. No separate database is used.

### Customer Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | License status: `trial`, `active`, `cancelled`, `inactive` |
| `tier` | string | Subscription tier: `free`, `pro` |
| `trial_created_at` | ISO 8601 | When trial was created |
| `trial_valid_until` | ISO 8601 | When trial expires |
| `max_devices` | string | Maximum devices allowed (default: `"3"`) |
| `machine_ids` | JSON string | Array of registered machine IDs |
| `last_validated` | ISO 8601 | Last validation timestamp |
| `subscription_id` | string | Stripe subscription ID (for active subscriptions) |
| `activated_at` | ISO 8601 | When subscription was activated |
| `cancelled_at` | ISO 8601 | When subscription was cancelled |
| `created_via` | string | Source: `desktop_app`, `web`, etc. |

### Subscription Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `tier` | string | Subscription tier: `pro` |
| `billing_period` | string | Billing period: `monthly`, `annual`, `lifetime` |
| `total_referrals` | string | Number of successful referrals |
| `last_referral_date` | ISO 8601 | Last successful referral date |
| `referred_by_email` | string | Email of referrer (if applicable) |
| `referral_bonus_granted` | string | `"true"` if bonus already granted |
| `referral_bonus_date` | ISO 8601 | When bonus was granted |

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_EMAIL` | Email format is invalid |
| `INVALID_MACHINE_ID` | Machine ID is invalid or too short |
| `NO_LICENSE` | No license found for this email |
| `NO_ACTIVE_LICENSE` | License exists but is not active |
| `TRIAL_EXPIRED` | Free trial has expired |
| `MAX_DEVICES_REACHED` | Device limit has been reached |
| `SERVER_ERROR` | Internal server error occurred |

---

## License Status Values

| Status | Description |
|--------|-------------|
| `trial` | User is on a free 14-day trial |
| `active` | User has an active paid subscription |
| `cancelled` | Subscription was cancelled |
| `inactive` | No trial or subscription |

---

## Offline Grace Period

The `/api/validate` endpoint returns a **JWT token** (`offline_token`) that allows the desktop app to work offline for **7 days**.

### JWT Token Structure

```json
{
  "email": "user@example.com",
  "customer_id": "cus_...",
  "status": "active",
  "tier": "pro",
  "machine_id": "sha256_hash...",
  "exp": 1640000000
}
```

The token is signed with `JWT_SECRET` and can be validated locally by the desktop app without internet access.

---

## Device Limit Enforcement

Each license tier has a **device limit** (default: 3 devices).

**How it works:**
1. When a user validates their license from a new device, the `machine_id` is checked
2. If the device is not in the `machine_ids` array:
   - If `devices_used < max_devices`: Register the new device
   - If `devices_used >= max_devices`: Reject with `MAX_DEVICES_REACHED`
3. Registered devices can validate unlimited times

**Managing devices:**

Users can view and manage their registered devices using the device management endpoints:

1. **List devices**: Use `POST /api/devices` to see all registered devices
   - Shows device ID preview (first 8 + last 4 characters)
   - Shows registration date
   - Shows total devices used vs. max allowed

2. **Deactivate a device**: Use `POST /api/deactivate-device` to remove a device
   - Removes device from license, freeing up a slot
   - Allows user to install on a different machine
   - Useful when replacing hardware or switching computers

**Example workflow:**
```
1. User has 3/3 devices registered
2. User wants to install on a new laptop
3. User calls /api/devices to see all registered devices
4. User identifies old desktop to deactivate
5. User calls /api/deactivate-device with old desktop's machine_id
6. Slot freed: now 2/3 devices
7. User can install on new laptop successfully
```

**Security notes:**
- Device deactivation requires email + machine_id verification
- Only the device owner (email) can deactivate their devices
- Machine IDs are hashed (SHA-256) for privacy
- Last deactivation timestamp is tracked in metadata

---

## Referral System

Users can refer friends and earn **€9 credit** for each successful referral.

**How it works:**
1. User gets their unique referral code from `/api/referral-stats`
2. Friend signs up with referral code in checkout metadata
3. When friend's subscription becomes `active`, both users get €9 credit
4. Credits are applied as negative invoice items on next billing

**Referral Code Generation:**
- Base64 encoding of email (first 10 characters)
- Example: `test@example.com` → `dGVzdEBleGF`

---

## Testing

Use Stripe test mode for all development and testing.

**Test Email:**
```
test@example.com
```

**Test Machine ID:**
```
test_machine_001_abcdef1234567890
```

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## Rate Limiting

Currently, no rate limiting is implemented. This should be added in production.

**Recommended limits:**
- `/api/start-trial`: 5 requests per hour per IP
- `/api/validate`: 60 requests per hour per email
- `/api/license-info`: 60 requests per hour per email

---

## CORS

All endpoints (except webhook) include CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Logging

All endpoints log actions with prefixed tags:

- `[START_TRIAL]` - Trial creation
- `[VALIDATE]` - License validation
- `[LICENSE_INFO]` - License info retrieval
- `[REFERRAL_STATS]` - Referral stats
- `[WEBHOOK]` - Webhook events
- `[CHECKOUT_COMPLETED]` - Checkout completion
- `[SUBSCRIPTION_DELETED]` - Subscription cancellation
- `[PAYMENT_SUCCESS]` - Successful payment
- `[PAYMENT_FAILED]` - Failed payment
- `[REFERRAL]` - Referral processing
- `[CRITICAL]` - Critical errors

View logs with:
```bash
wrangler tail
```

---

## Example Usage

### Creating a Trial and Validating

```javascript
// 1. Start trial
const trialResponse = await fetch('https://api.gigzilla.test/api/start-trial', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

const trialData = await trialResponse.json();
console.log(trialData);
// { success: true, valid_until: '2025-01-27...', max_devices: 3 }

// 2. Validate license
const validateResponse = await fetch('https://api.gigzilla.test/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    machine_id: 'sha256_abc123...'
  })
});

const validateData = await validateResponse.json();
console.log(validateData);
// { valid: true, license: {...}, offline_token: '...' }
```

---

## Security Best Practices

1. **Never expose API secrets** - Store `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET` as Cloudflare Worker secrets
2. **Verify webhook signatures** - Always validate Stripe webhook signatures
3. **Use HTTPS** - Cloudflare Workers enforce HTTPS by default
4. **Hash machine IDs** - Use SHA-256 to hash hardware identifiers before sending
5. **Validate all inputs** - Email format, machine ID length, etc.
6. **Monitor logs** - Watch for suspicious validation patterns

---

## Support

For API issues or questions:
- Check logs: `wrangler tail`
- Review Stripe Dashboard events
- Contact support: support@gigzilla.site

---

**API Version:** 1.0.0
**Last Updated:** 2025-01-13
