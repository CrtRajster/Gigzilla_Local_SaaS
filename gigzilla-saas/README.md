# Gigzilla SaaS - Local-First SaaS Architecture

Transform the Gigzilla desktop app into a subscription-based SaaS with minimal server infrastructure. All user data stays local on their machines - the server only handles license validation via Stripe subscriptions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Gigzilla Desktop App                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   All User   │  │   License    │  │  Activation  │     │
│  │   Data is    │  │   Manager    │  │   Screen     │     │
│  │   Local!     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         │                  └──────────────────┘             │
│         │                         │                         │
└─────────┼─────────────────────────┼─────────────────────────┘
          │                         │
          │                         │ License Validation
          │                         ▼
          │             ┌────────────────────────┐
          │             │   License Server       │
          │             │   (Express API)        │
          │             │                        │
          │             │  - /api/validate       │
          │             │  - /api/start-trial    │
          │             │  - /webhook/stripe     │
          │             └────────────────────────┘
          │                         │
          │                         │
          │                         ▼
          │             ┌────────────────────────┐
          │             │   Neon PostgreSQL      │
          │             │   (Licenses Only)      │
          │             └────────────────────────┘
          │                         │
          │                         │
          ▼                         ▼
    ┌─────────────┐     ┌────────────────────────┐
    │   Local     │     │   Stripe Webhooks     │
    │   Storage   │     │   (Subscriptions)     │
    └─────────────┘     └────────────────────────┘
```

## Key Features

✅ **Local-First**: All user data stays on their computer
✅ **14-Day Free Trial**: No credit card required
✅ **Stripe Subscriptions**: Pro (€9/mo) & Business (€19/mo)
✅ **Offline Grace Period**: 7-day grace period when offline
✅ **Device Limit**: Configurable per tier
✅ **Auto-Sync**: License validates on startup
✅ **Zero User Data**: Server never sees client/project data

## Project Structure

```
gigzilla-saas/
├── backend/                     # License validation server
│   ├── src/
│   │   ├── index.js            # Main API server
│   │   ├── license-validation.js  # License logic
│   │   ├── stripe-webhook.js   # Stripe event handlers
│   │   └── database.js         # Neon PostgreSQL connection
│   ├── schema.sql              # Database schema
│   ├── package.json
│   └── .env.example
│
├── gigzilla-desktop/           # Modified desktop app
│   ├── src/
│   │   ├── license-manager.js  # NEW: License client
│   │   ├── activation-screen.js # NEW: Activation UI
│   │   ├── renderer.js         # UPDATED: Added license checks
│   │   └── ...
│   ├── main.js                 # UPDATED: Added openExternal
│   ├── preload.js              # UPDATED: Added IPC bridge
│   └── package.json
│
├── DEPLOYMENT.md               # Deployment guide
└── README.md                   # This file
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Database Setup

1. Create Neon PostgreSQL database
2. Run `backend/schema.sql` to create tables
3. Update `DATABASE_URL` in `.env`

### 3. Stripe Configuration

1. Create Stripe account
2. Set up products (Pro & Business)
3. Configure webhook endpoint
4. Update Stripe keys in `.env`

### 4. Desktop App

```bash
cd gigzilla-desktop
npm install

# Update LICENSE_API in src/license-manager.js
# Then test locally:
npm start

# Build for distribution:
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## Environment Variables

### Backend (.env)

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
APP_URL=https://gigzilla.site
LICENSE_GRACE_PERIOD_DAYS=7
```

### Desktop App

Update in `src/license-manager.js`:
```javascript
const LICENSE_API = 'https://api.gigzilla.site';
```

## API Endpoints

### POST /api/validate
Validate a license key and machine ID.

**Request:**
```json
{
  "email": "user@example.com",
  "license_key": "uuid-here",
  "machine_id": "machine-hash"
}
```

**Response:**
```json
{
  "valid": true,
  "license": {
    "email": "user@example.com",
    "status": "active",
    "tier": "pro",
    "devices_used": 1,
    "max_devices": 2
  }
}
```

### POST /api/start-trial
Start a 14-day free trial.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "license_key": "uuid-here",
  "valid_until": "2025-01-27T..."
}
```

### POST /webhook/stripe
Receive Stripe webhook events (subscription lifecycle).

## Database Schema

### licenses table
```sql
- id (serial)
- email (varchar, unique)
- license_key (uuid, unique)
- stripe_customer_id (varchar)
- stripe_subscription_id (varchar)
- status (varchar): trial, active, expired, cancelled
- tier (varchar): free, pro, business
- machine_ids (text[]): Array of device hashes
- max_devices (integer)
- valid_until (timestamp): For trials
- last_validated (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### validation_attempts table
```sql
- id (serial)
- email (varchar)
- ip_address (varchar)
- machine_id (varchar)
- success (boolean)
- attempted_at (timestamp)
```

## License Tiers

### Free (Trial)
- Duration: 14 days
- Devices: 2
- All features included

### Pro (€9/month)
- Unlimited duration
- Devices: 2
- All features included

### Business (€19/month)
- Unlimited duration
- Devices: 5
- All features included
- Priority support

## User Flow

1. **First Launch**
   - User downloads and installs Gigzilla
   - Activation screen appears
   - User enters email to start free trial
   - License key generated and stored locally

2. **During Trial**
   - App works fully featured for 14 days
   - License validated on each startup
   - Grace period allows 7 days offline usage

3. **Trial Expiration**
   - "Trial Expired" screen appears
   - User can click "Subscribe" (opens Stripe)
   - After payment, license auto-activates
   - User clicks "Refresh" to continue

4. **Active Subscription**
   - App validates license on startup
   - Works offline for 7 days (grace period)
   - Subscription managed via Stripe portal

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. Deploy backend to Railway/Render
2. Set up Neon PostgreSQL database
3. Configure Stripe webhooks
4. Build desktop app with production API URL
5. Distribute installer to users

## Testing

### Test Trial Flow
```bash
# Start backend
cd backend && npm run dev

# In another terminal, test API
curl -X POST http://localhost:3000/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Launch desktop app
cd gigzilla-desktop && npm start
```

### Test Stripe Webhooks Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhook/stripe

# Test checkout completion
stripe trigger checkout.session.completed
```

## Security Considerations

✅ **License Keys**: UUIDs, non-reversible
✅ **Machine IDs**: Hashed hardware identifiers
✅ **Grace Period**: Prevents abuse from constant offline usage
✅ **Device Limits**: Prevents account sharing
✅ **Validation Logging**: Track suspicious activity
✅ **HTTPS Only**: All API communication encrypted

## Monitoring

Track these metrics:
- Trial sign-ups per day
- Trial → Paid conversion rate
- Churn rate
- Device limit hits
- Validation success rate
- Average devices per license

## Support

For deployment help:
- Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- Check backend logs
- Verify Stripe webhook delivery
- Test API endpoints manually

## License

Proprietary - All rights reserved

## Contributing

This is a closed-source project. For issues or feature requests, contact the development team.

---

Built with ❤️ using Electron, Express, PostgreSQL, and Stripe
