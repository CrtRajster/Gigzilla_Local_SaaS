# Gigzilla - Complete Overview & Architecture

## Table of Contents
1. [What is Gigzilla](#what-is-gigzilla)
2. [Core Philosophy](#core-philosophy)
3. [Business Model](#business-model)
4. [Architecture Overview](#architecture-overview)
5. [Privacy & Data Flow](#privacy--data-flow)
6. [Technology Stack](#technology-stack)

---

## What is Gigzilla

### The Problem
Freelancers (digital artists, designers, developers, writers) struggle with:
- Managing multiple client projects
- Tracking payments and invoices
- Remembering to send payment reminders
- Manual administrative work that takes time away from creative work
- Complex tools designed for agencies, not solo freelancers
- Data privacy concerns with cloud-based tools

### The Solution
**Gigzilla** is a desktop application that helps freelancers manage their entire business workflow:
- **Project management:** Track projects from initial contact to payment
- **Client management:** Maintain client database with relationship history
- **Invoice automation:** Auto-generate and send invoices
- **Payment tracking:** Automatically detect payments via PayPal/Stripe APIs
- **Smart reminders:** Escalating reminder system that stops when paid
- **Local-first:** All user data stays on their computer (privacy-first)

### Target User
**Primary:** Solo freelancers with low-to-intermediate technical knowledge
- Digital artists
- Graphic designers
- Web developers
- Content writers
- Photographers
- Videographers

**Key characteristics:**
- 1-20 active clients
- 5-50 projects per year
- Values simplicity over features
- Wants automation ("set it and forget it")
- Prefers visual, workflow-based UI
- Concerned about data privacy

---

## Core Philosophy

### 1. Local-First Architecture
**All user business data stays on their computer:**
- Client information
- Project details
- Invoice history
- Payment records
- Files and attachments
- Notes and comments

**Why this matters:**
- Complete privacy (no one can see their client data)
- Works offline (no internet required for core functionality)
- Fast performance (no network latency)
- User owns their data (can export anytime)
- No data breach risk (nothing to hack on server)

### 2. Server Only for Licensing
**The server stores ONLY:**
- User email
- License key (UUID)
- Subscription status (trial/active/expired)
- Stripe customer ID
- Device IDs (for device limit enforcement)
- Validation timestamps

**The server NEVER stores:**
- Client names/emails
- Project details
- Invoice amounts
- Payment history
- Any business data

### 3. Automation Over Features
**Design principle:** Remove steps, don't add features

**Good automation:**
- ✅ Auto-invoice when project marked "Done"
- ✅ Auto-send reminders on schedule
- ✅ Auto-detect payments via API
- ✅ Auto-stop reminders when paid

**Bad feature bloat:**
- ❌ Complex time tracking
- ❌ Full CRM features
- ❌ Team collaboration
- ❌ Social media integration

### 4. Workflow-First UX
**Think like a freelancer, not a database:**
- Pipeline (visual project stages) instead of "Projects table"
- Money (financial overview) instead of "Invoices list"
- Clients (relationship view) instead of "Contacts database"

**One-click actions:**
- Mark project as done → Auto-invoice option
- Create project → Inline client creation
- Payment received → Auto-update project status

### 5. Invisible Excellence
**Users don't notice good infrastructure, but hate when it's missing:**
- Global search (always works)
- Inline editing (click to edit any field)
- Undo functionality (Cmd+Z everywhere)
- Loading states (skeleton screens, not spinners)
- Error handling (user-friendly messages)
- Keyboard shortcuts (power user friendly)

---

## Business Model

### Subscription Tiers

#### Free Tier (Trial)
- **Duration:** 14 days
- **Features:** Full access to all features
- **Limits:** None during trial
- **Goal:** Let users experience full value before paying

#### Pro Tier - €9/month
**Target:** Most freelancers

**Features:**
- Unlimited clients
- Unlimited projects
- Unlimited invoices
- Auto-invoicing
- Smart reminders
- Payment tracking (PayPal/Stripe)
- Multi-channel notifications
- 2 device licenses
- Email support

#### Business Tier - €19/month
**Target:** Established freelancers with higher volume

**Features:**
- Everything in Pro
- Unlimited devices
- Recurring projects automation
- Advanced expense tracking
- Priority support
- Custom branding on invoices
- Voice message templates
- Advanced reporting

### Revenue Model

**How you get paid (the developer):**

1. **User signs up** → Stripe checkout session created
2. **User pays** → Stripe stores their payment method
3. **Monthly billing** → Stripe automatically charges €9/month
4. **You get paid** → Stripe transfers money to your bank account

**Your setup (one-time):**
1. Create Stripe account
2. Connect your bank account to Stripe
3. Stripe handles everything else:
   - Payment processing
   - Recurring billing
   - Failed payment retries
   - Customer emails
   - Tax calculations (if needed)
   - Fraud prevention

**Stripe fees:**
- 2.9% + €0.30 per transaction
- Example: €9 subscription → You receive ~€8.45
- No monthly fees, only pay per transaction

**Payout schedule:**
- Default: Weekly automatic payouts to your bank
- Can change to daily or monthly
- 2-day delay (industry standard for fraud prevention)

### Payment Methods Supported

**Via Stripe (all handled automatically):**
- Credit/debit cards (Visa, Mastercard, Amex)
- PayPal (one line of code to enable)
- Bank transfers (SEPA in EU)
- Apple Pay / Google Pay
- Local payment methods by region

**User perspective:**
- Clicks "Subscribe" button
- Redirected to Stripe checkout page
- Chooses payment method
- Enters details
- Subscribes
- App activates immediately

**You don't handle:**
- Card numbers (PCI compliance nightmare)
- Bank details (security risk)
- Payment processing (complex)
- Failed payment logic (Stripe retries automatically)
- Receipts (Stripe sends automatically)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S COMPUTER                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Gigzilla Desktop App (Electron)             │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   UI Layer  │  │ Business     │  │  Local     │  │  │
│  │  │  (Renderer) │──│ Logic        │──│  Storage   │  │  │
│  │  │             │  │              │  │ (electron- │  │  │
│  │  └─────────────┘  └──────────────┘  │  store)    │  │  │
│  │         │                            └────────────┘  │  │
│  │         │                                            │  │
│  │         │ License validation only                    │  │
│  │         ↓                                            │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │      License Manager (machine ID, API)      │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (license check only)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    YOUR SERVER (Cloud)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         License Validation Server (Express.js)        │  │
│  │                                                       │  │
│  │  Routes:                                              │  │
│  │  • POST /api/validate      (check license)            │  │
│  │  • POST /api/start-trial   (create trial)             │  │
│  │  • GET  /api/license-info  (get status)               │  │
│  │  • POST /webhook/stripe    (subscription events)      │  │
│  │                                                       │  │
│  └─────────────┬─────────────────────┬───────────────────┘  │
│                │                     │                       │
│                ↓                     ↓                       │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  PostgreSQL Database │  │   Stripe API         │        │
│  │  (License data only) │  │  (Payments)          │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: User Perspective

**Setup & Trial:**
```
1. User downloads Gigzilla.exe
2. Opens app → Activation screen shown
3. Enters email → API call to server
4. Server creates trial license (14 days)
5. App validates license → Success
6. User enters app → Starts using features
7. All their data (clients/projects) saved locally in electron-store
```

**Subscription:**
```
1. Trial expires → "Upgrade" screen shown
2. User clicks "Subscribe to Pro (€9/month)"
3. App opens Stripe checkout page in browser
4. User enters payment details on Stripe
5. Stripe webhook → Server activates license
6. App validates license → Success
7. User continues using app (data unchanged)
```

**Monthly billing:**
```
1. Stripe automatically charges €9/month
2. If payment succeeds → License stays active
3. If payment fails → Stripe retries 3 times
4. If all retries fail → Webhook updates license to "expired"
5. App validates next time → Shows "Payment failed" screen
6. User updates payment method → Reactivates
```

**Offline usage:**
```
1. User opens app → No internet
2. App checks local license cache
3. If validated within 7 days → Allow access (grace period)
4. If > 7 days → "Please connect to internet to validate"
5. User connects → Validates → Cache updated
```

### Device Management

**Machine ID Generation:**
```javascript
// Creates unique ID from hardware
const identifier = [
  os.hostname(),      // Computer name
  os.platform(),      // Windows/Mac/Linux
  os.arch(),          // x64/arm64
  os.cpus()[0].model  // CPU model
].join('|');

const machineId = crypto
  .createHash('sha256')
  .update(identifier)
  .digest('hex')
  .substring(0, 32);

// Example: "a3f5c9e1b2d4f6e8a9b7c5d3e1f9a7b5"
```

**Device Limit Enforcement:**
```
Pro Tier: 2 devices max
Business Tier: Unlimited devices

When user activates on 3rd device (Pro tier):
→ "Device limit reached (2/2 active)"
→ "Deactivate a device or upgrade to Business tier"
→ Shows list of active devices:
   • MacBook Pro (last used 2 hours ago) [Deactivate]
   • Windows Desktop (last used 3 days ago) [Deactivate]
```

---

## Privacy & Data Flow

### What Data Goes Where

#### Local Storage (User's Computer)
**File:** `~/.gigzilla/data.json` (encrypted with machine-specific key)

**Contains:**
```json
{
  "clients": [
    {
      "id": "uuid-1",
      "name": "Acme Corp",
      "email": "john@acme.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "notes": "Prefers minimal design",
      "created": "2025-01-10T10:00:00Z"
    }
  ],
  "projects": [
    {
      "id": "uuid-2",
      "clientId": "uuid-1",
      "name": "Logo design",
      "amount": 1500,
      "currency": "EUR",
      "status": "working",
      "deadline": "2025-02-15",
      "created": "2025-01-10T10:30:00Z"
    }
  ],
  "invoices": [
    {
      "id": "uuid-3",
      "projectId": "uuid-2",
      "number": "INV-2025-042",
      "amount": 1500,
      "status": "sent",
      "sentDate": "2025-01-15T09:00:00Z",
      "dueDate": "2025-01-29T00:00:00Z"
    }
  ],
  "payments": [
    {
      "id": "uuid-4",
      "invoiceId": "uuid-3",
      "amount": 1500,
      "method": "paypal",
      "transactionId": "PAYPAL-TXN-123",
      "receivedDate": "2025-01-16T14:30:00Z"
    }
  ],
  "profile": {
    "name": "Alex Designer",
    "businessName": "Alex Design Studio",
    "email": "alex@designstudio.com",
    "phone": "+1234567890",
    "paypalEmail": "alex@designstudio.com",
    "bankDetails": "IBAN: US12 3456 7890 1234",
    "logo": "base64-encoded-image"
  },
  "settings": {
    "currency": "EUR",
    "invoiceNumberFormat": "INV-YYYY-###",
    "autoInvoiceDelay": 0,
    "reminderSchedule": [3, 0, -3, -7],
    "notificationChannels": {
      "paymentReceived": ["desktop", "whatsapp"],
      "invoiceSent": ["email"]
    }
  }
}
```

#### Server Storage (Your Cloud Server)
**Database:** PostgreSQL

**Contains:**
```sql
-- licenses table
id: 1
email: "user@example.com"
license_key: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
stripe_customer_id: "cus_ABC123"
stripe_subscription_id: "sub_XYZ789"
status: "active"
tier: "pro"
machine_ids: ["a3f5c9e1b2d4f6e8", "b7c5d3e1f9a7b5c9"]
max_devices: 2
valid_until: "2025-02-15T00:00:00Z"
last_validated: "2025-01-15T10:30:00Z"
created_at: "2025-01-01T12:00:00Z"
```

**Never contains:**
- Client names or emails
- Project details or amounts
- Invoice information
- Payment history
- User files or attachments
- Any business data

### Privacy Guarantees

**For users:**
1. **No data leaves their computer** (except license validation)
2. **Server never sees business data** (only email + subscription status)
3. **No analytics tracking** (no Google Analytics, Mixpanel, etc.)
4. **No telemetry** (no usage data collected)
5. **Encrypted local storage** (AES-256 encryption)
6. **Export anytime** (one-click export to JSON)
7. **Delete anytime** (uninstall = all data gone)

**For you (developer):**
1. **No GDPR liability** (you don't store personal business data)
2. **No data breach risk** (nothing valuable to steal)
3. **No backup requirements** (users handle their own backups)
4. **No database scaling issues** (only license data, minimal growth)
5. **Lower server costs** (tiny database, simple API)

### Compliance

**GDPR Compliance:**
- ✅ Users are data controllers (they own their data)
- ✅ You don't process business data (only licensing)
- ✅ Right to access: Users export their own data
- ✅ Right to deletion: Uninstall removes all data
- ✅ Data portability: JSON export
- ✅ Minimal data collection: Only email + subscription

**Terms of Service (simple):**
```
We store:
- Your email address
- Your subscription status
- Device IDs for license validation

We never store:
- Your clients' information
- Your projects or invoices
- Your business data

Your data stays on your computer. We only validate your license.
```

---

## Technology Stack

### Desktop App (Frontend)

**Framework:** Electron
- Cross-platform (Windows, macOS, Linux)
- Native OS integration
- Offline-capable
- File system access

**UI Layer:**
- Vanilla JavaScript (no framework bloat)
- Modern CSS (Grid, Flexbox, CSS Variables)
- HTML5
- No jQuery (use native DOM APIs)

**Data Storage:**
- electron-store (JSON-based local storage)
- AES-256 encryption for sensitive data
- Automatic backups to local directory

**Why Electron:**
- ✅ Write once, run on Windows/Mac/Linux
- ✅ Full file system access (for attachments, exports)
- ✅ Native notifications
- ✅ Auto-updater built-in
- ✅ Large community and resources
- ⚠️ Larger app size (~150 MB) - acceptable trade-off

**Alternatives considered:**
- ❌ Web app: Requires server storage (privacy concern)
- ❌ Native (Swift/C#): Separate codebase per platform
- ❌ Tauri: Smaller size but less mature ecosystem

### Backend (Licensing Server)

**Framework:** Express.js (Node.js)
- Simple, fast, well-documented
- Easy to deploy (Vercel, Railway, AWS)
- Low cost at scale

**Database:** PostgreSQL
- Reliable, mature, well-supported
- JSON support (for machine_ids array)
- Free tier available (Neon, Supabase)

**Hosting options:**
1. **Railway** (recommended for beginners)
   - One-click deploy
   - Free PostgreSQL included
   - €5/month for hobby projects
   - Auto-scaling

2. **Vercel** (frontend) + **Neon** (database)
   - Serverless functions
   - Free tier generous
   - Global CDN

3. **AWS** (advanced)
   - Elastic Beanstalk for Express
   - RDS for PostgreSQL
   - More complex, more control

**Why Express + PostgreSQL:**
- ✅ Simple for this use case
- ✅ Cheap to run (< €10/month)
- ✅ Scales to 10,000+ users easily
- ✅ Well-documented
- ✅ Easy to maintain

### Payment Processing

**Stripe:**
- Industry standard
- Handles all payment methods
- Automatic retry logic
- Built-in fraud prevention
- Customer portal included
- Webhooks for automation

**Integration:**
- Stripe Checkout (hosted payment page)
- Stripe Billing (subscription management)
- Stripe Webhooks (event notifications)

**No alternatives needed:**
- Stripe handles cards, PayPal, bank transfers
- One integration, all payment methods
- No need for separate PayPal integration

### External APIs (for automation features)

**PayPal API:**
- Purpose: Detect incoming payments
- Integration: OAuth 2.0
- Endpoint: `/v2/payments/captures`
- Polling: Every 15 minutes

**Stripe API:**
- Purpose: Detect incoming payments (if user accepts Stripe)
- Integration: Webhooks
- Event: `payment_intent.succeeded`

**Twilio (SMS):**
- Purpose: Send SMS reminders
- Cost: ~€0.075 per SMS
- Alternative: Users pay their own Twilio account

**WhatsApp Business API:**
- Purpose: Send WhatsApp reminders
- Integration: Official API (requires business verification)
- Alternative: Use unofficial API with user's own WhatsApp

**SendGrid (Email):**
- Purpose: Send invoice emails and reminders
- Cost: Free for 100 emails/day
- Alternative: User's own email via SMTP

### Development Tools

**Version Control:**
- Git + GitHub
- Branch strategy: main (production), develop (staging)

**Code Editor:**
- VS Code (recommended)
- Extensions: ESLint, Prettier, Electron snippets

**Testing:**
- Manual testing (primary method)
- Real user testing (beta group)

**Build & Distribution:**
- electron-builder (creates installers)
- GitHub Releases (distribution)
- Auto-updater (built into Electron)

---

## Security Considerations

### Desktop App Security

**Local data encryption:**
```javascript
// Encrypt user data with machine-specific key
const crypto = require('crypto');
const key = crypto.scryptSync(machineId, 'salt', 32);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
// Encrypt sensitive profile data
```

**API communication:**
- HTTPS only (TLS 1.3)
- No sensitive data in URLs (POST body only)
- License key never logged

**Auto-updates:**
- Code signing (prevents malware injection)
- Signature verification before install

### Server Security

**API protection:**
- Rate limiting (100 requests/hour per IP)
- CORS restricted to app domain
- Input validation on all endpoints
- SQL injection protection (parameterized queries)

**Stripe webhook security:**
- Signature verification (prevents fake webhooks)
- Replay attack protection (timestamp check)
- Raw body verification (required by Stripe)

**Database security:**
- Environment variables for credentials (no hardcoding)
- SSL required for connections
- Minimal permissions (read/write only to licenses table)
- Regular backups (daily automated)

### License Validation Security

**Prevent piracy attempts:**
1. **Server-side validation** (can't fake without server access)
2. **Machine ID binding** (can't share license easily)
3. **Device limits** (max 2 devices on Pro tier)
4. **Regular validation** (checks every app start + daily)
5. **Grace period** (7 days offline max)

**Not foolproof, but good enough:**
- Determined hackers can always crack software
- Goal: Make piracy harder than paying €9/month
- Focus on value, not DRM

---

## Deployment Architecture

### Production Setup

```
User downloads from:
https://gigzilla.app/download
└─> GitHub Releases (Gigzilla-Setup-1.0.0.exe)

App connects to:
https://api.gigzilla.app
├─> License validation endpoints
└─> Stripe webhooks

Database:
PostgreSQL on Neon/Railway
├─> Automated backups (daily)
└─> SSL connections only

Payments:
Stripe Dashboard
├─> Webhook endpoint: https://api.gigzilla.app/webhook/stripe
└─> Payouts to your bank account
```

### Update Flow

```
1. You release new version (1.1.0)
2. Upload to GitHub Releases
3. Update version in app code
4. Users open app → Auto-updater checks GitHub
5. "Update available" notification shown
6. User clicks "Update" → Downloads and installs
7. App restarts with new version
8. User data preserved (local storage unchanged)
```

---

## Cost Breakdown (Monthly)

**Server hosting:** €5-10/month (Railway/Vercel)
**Database:** Free tier → €10/month at scale (Neon/Supabase)
**Stripe fees:** 2.9% + €0.30 per transaction
**Domain:** €10/year (gigzilla.app)
**SSL certificate:** Free (Let's Encrypt)

**Total:** ~€10-20/month

**Break-even:** 2-3 paid subscribers (€9/month each)

**At 100 subscribers:**
- Revenue: €900/month
- Costs: ~€30/month (server + fees)
- Profit: ~€870/month

**At 1,000 subscribers:**
- Revenue: €9,000/month
- Costs: ~€100/month (server + fees)
- Profit: ~€8,900/month

---

## Success Criteria

**For users:**
- Gets paid 30% faster (due to automated reminders)
- Spends 2 hours less per week on admin
- Never forgets to invoice a client
- Feels their data is private and secure

**For you (developer):**
- Passive income from subscriptions
- Low maintenance (server rarely needs attention)
- Happy users (high retention rate)
- Scalable (can grow to 1,000s of users)

---

**Next:** See `GIGZILLA-FEATURES-AND-UX.md` for complete feature specifications and user experience design.
