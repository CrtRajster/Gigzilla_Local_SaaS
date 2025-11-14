# Gigzilla SaaS - Privacy & Data Flow

## 🔒 Core Principle: Your Data Never Leaves Your Computer

Gigzilla is a **local-first** application. All your business data stays on YOUR computer. The server only validates your subscription - it never sees your clients, projects, or invoices.

---

## 📊 What's Stored Where

### 💻 On Your Computer (electron-store)
```javascript
✅ clients[]           // All client information
✅ projects[]          // All project details
✅ invoices[]          // All invoice data
✅ integrations{}      // Your integration settings
✅ license_email       // Your email (for validation)
✅ license_key         // Your license UUID (for validation)
✅ last_validated      // Last successful check timestamp
```

### ☁️ On Server (PostgreSQL)
```javascript
✅ email               // Your email address
✅ license_key         // Random UUID
✅ status              // trial/active/expired
✅ tier                // free/pro/business
✅ machine_ids[]       // Hashed device identifiers
✅ stripe_customer_id  // For subscription management
❌ NO client names
❌ NO project details
❌ NO invoice amounts
❌ NO business data
```

---

## 🔄 Complete Data Flow Diagram

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃         USER'S COMPUTER (100% Private)           ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────┐    ┃
┃  │       Gigzilla Desktop App               │    ┃
┃  │                                          │    ┃
┃  │  📁 Local Storage (electron-store)      │    ┃
┃  │  ═══════════════════════════════════    │    ┃
┃  │  • Acme Corp (client)                   │    ┃
┃  │    - Email: john@acme.com               │    ┃
┃  │    - Phone: +1234567890                 │    ┃
┃  │                                          │    ┃
┃  │  • Website Redesign (project)           │    ┃
┃  │    - Amount: €5,000                     │    ┃
┃  │    - Status: In Progress                │    ┃
┃  │                                          │    ┃
┃  │  • Invoice #001                         │    ┃
┃  │    - Amount: €2,500                     │    ┃
┃  │    - Due: 2025-02-01                    │    ┃
┃  │                                          │    ┃
┃  │  ALL DATA STAYS HERE! ✓                 │    ┃
┃  └─────────────────────────────────────────┘    ┃
┃                      │                           ┃
┃                      │ On startup only:          ┃
┃                      │ "Is license valid?"       ┃
┃                      ▼                           ┃
┗━━━━━━━━━━━━━━━━━━━━┃━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                       │
                       │ HTTPS Request
                       │ (Only license validation)
                       │
                       ▼
          ┏━━━━━━━━━━━━━━━━━━━━━━━━┓
          ┃   License Server        ┃
          ┃   (Minimal Data)        ┃
          ┃                         ┃
          ┃  Request:               ┃
          ┃  {                      ┃
          ┃    email: "you@mail.com"┃
          ┃    license_key: "uuid"  ┃
          ┃    machine_id: "hash123"┃
          ┃  }                      ┃
          ┃                         ┃
          ┃  Response:              ┃
          ┃  {                      ┃
          ┃    valid: true          ┃
          ┃    tier: "pro"          ┃
          ┃    devices_used: 1      ┃
          ┃  }                      ┃
          ┃                         ┃
          ┃  ❌ Never receives:     ┃
          ┃  • Client names         ┃
          ┃  • Project details      ┃
          ┃  • Invoice amounts      ┃
          ┃  • Any business data    ┃
          ┗━━━━━━━━━━━━━━━━━━━━━━━━┛
                       │
                       │
                       ▼
          ┏━━━━━━━━━━━━━━━━━━━━━━━━┓
          ┃   Stripe               ┃
          ┃   (Payment Processing)  ┃
          ┃                         ┃
          ┃  Only knows:            ┃
          ┃  • Email address        ┃
          ┃  • Payment method       ┃
          ┃  • Subscription tier    ┃
          ┃                         ┃
          ┃  ❌ Never receives:     ┃
          ┃  • Your business data   ┃
          ┗━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 🎬 User Journey (Step by Step)

### 1. Download & Install
```
Download Gigzilla.exe → Install on computer → Launch app
                                                    │
                                                    ▼
                                        No license found locally
                                                    │
                                                    ▼
                                        Activation screen appears
```

### 2. Start Free Trial
```
Enter email: user@example.com → Click "Start Trial"
                                        │
                                        ▼
                            Server creates license record:
                            ═══════════════════════════
                            email: user@example.com
                            license_key: abc-123-def
                            status: trial
                            valid_until: +14 days
                            ═══════════════════════════
                                        │
                                        ▼
                            License key stored LOCALLY
                                        │
                                        ▼
                                App loads ✓
```

### 3. Use the App (All Local)
```
Add client "Acme Corp" → Saved to LOCAL electron-store
                                        │
                                        ▼
Create project "Website" → Saved to LOCAL electron-store
                                        │
                                        ▼
Add invoice €5,000 → Saved to LOCAL electron-store
                                        │
                                        ▼
                    ALL DATA STAYS ON YOUR COMPUTER
                    Server never sees any of this!
```

### 4. Next Launch (License Validation)
```
Open app → Check license valid?
              │
              ▼
          Request to server:
          ═══════════════════
          POST /api/validate
          {
            email: "user@example.com",
            license_key: "abc-123-def",
            machine_id: "hashed-hw-id"
          }
          ═══════════════════
              │
              ▼
          Server responds:
          ═══════════════════
          {
            valid: true,
            status: "trial",
            days_remaining: 12
          }
          ═══════════════════
              │
              ▼
          License valid ✓
              │
              ▼
      Load ALL data from LOCAL storage
              │
              ▼
          App works normally
```

### 5. Trial Expires
```
Open app → License check
              │
              ▼
          Server responds:
          {
            valid: false,
            reason: "EXPIRED"
          }
              │
              ▼
      Show "Trial Expired" screen
              │
              ├─ "Subscribe Now" → Opens Stripe (browser)
              │                       │
              │                       ▼
              │                   Complete payment
              │                       │
              │                       ▼
              │               Stripe webhook to server
              │                       │
              │                       ▼
              │           Server updates license: status="active"
              │                       │
              └─ "Refresh" ←──────────┘
                    │
                    ▼
              License now valid
                    │
                    ▼
      Load ALL data from LOCAL storage
      (Your data was never deleted!)
```

---

## 🔒 Privacy Guarantees

### ✅ What We DO
- Validate your subscription status
- Track device count (for license limits)
- Process payments via Stripe
- Store your email for license lookup

### ❌ What We DON'T Do
- See your client information
- Access your project details
- View your invoice amounts
- Track your usage patterns
- Store any business data
- Analyze your data
- Share data with third parties
- Require internet after validation

---

## 🌐 Network Requests (Complete List)

The app makes these (and ONLY these) network requests:

### 1. License Validation (on startup)
```javascript
POST https://api.gigzilla.site/api/validate
Body: {
  email: "your@email.com",
  license_key: "uuid-here",
  machine_id: "hashed-hardware-id"
}
```

### 2. Start Trial (first time)
```javascript
POST https://api.gigzilla.site/api/start-trial
Body: {
  email: "your@email.com"
}
```

### 3. Stripe Checkout (when subscribing)
```javascript
Opens in browser: https://checkout.stripe.com/...
```

**That's it!** No analytics, no tracking, no data uploads.

---

## 💾 Data Backup & Export

Since all data is local, YOU control backups:

### Built-in Export
```
Settings → Export Data → Saves to gigzilla-backup.json
```

### Manual Backup
Your data is stored at:
- Windows: `C:\Users\[YourName]\AppData\Roaming\gigzilla\config.json`
- macOS: `~/Library/Application Support/gigzilla/config.json`
- Linux: `~/.config/gigzilla/config.json`

Simply copy this file to back up ALL your data!

---

## 🔐 Security Features

### Local Data
- Stored in encrypted electron-store
- Protected by OS-level file permissions
- Never transmitted over network

### License Validation
- HTTPS only (encrypted)
- Machine ID is SHA-256 hashed (irreversible)
- Grace period allows offline work (7 days)

### What Server Stores (licenses table)
```sql
email                VARCHAR(255)    -- Your email
license_key          UUID            -- Random UUID (not your data)
status               VARCHAR(50)     -- trial/active/expired
tier                 VARCHAR(50)     -- free/pro/business
machine_ids          TEXT[]          -- Hashed device IDs
stripe_customer_id   VARCHAR(255)    -- For Stripe only
```

**No columns for**: clients, projects, invoices, or any business data.

---

## 🚫 What If Server Goes Down?

### Grace Period Protection
- Last validated timestamp stored locally
- App works offline for 7 days
- No interruption to your work
- Data always accessible (it's local!)

```javascript
// In license-manager.js
async checkGracePeriod() {
  const lastValidated = await localStore.get('last_validated');
  const daysSince = (Date.now() - lastValidated) / (1000 * 60 * 60 * 24);

  if (daysSince < 7) {
    return { valid: true, offline: true }; // ✓ Still works!
  }
}
```

---

## 📱 Multi-Device Usage

You can use Gigzilla on multiple devices (2-5 depending on tier).

### What Syncs
- ❌ Nothing syncs automatically
- Your license is validated on each device
- Each device has its OWN local data

### To Move Data Between Devices
1. Device A: Settings → Export Data
2. Copy `gigzilla-backup.json` to Device B
3. Device B: Settings → Import Data

This is intentional - you control your data movement!

---

## 🎯 Summary

**Local (Your Computer):**
- ✅ ALL clients
- ✅ ALL projects
- ✅ ALL invoices
- ✅ ALL integrations
- ✅ 100% of your business data

**Server (Minimal):**
- ✅ Email address
- ✅ License status
- ✅ Subscription tier
- ✅ Device count
- ❌ 0% of your business data

**Network (Only when needed):**
- ✅ Validate license on startup
- ✅ Start trial (one time)
- ✅ Stripe checkout (when subscribing)
- ❌ No ongoing data transmission
- ❌ No analytics or tracking

---

## ✨ The Bottom Line

**Gigzilla works like this:**
1. You download the app to your computer
2. All your data lives on YOUR computer
3. The server just checks "Does this person have a valid subscription?"
4. If yes → App works
5. If no → Show subscribe screen

**Your clients, projects, and invoices NEVER leave your computer.**

This is the best of both worlds:
- 🔒 Privacy of local storage
- 💳 Convenience of subscription billing
- 🌐 Works offline (grace period)
- 💾 You control all backups

---

**Questions about privacy? Check what the server actually stores:**
- Look at `backend/schema.sql` - only license info
- Look at `backend/src/license-validation.js` - only validates licenses
- Look at `desktop/src/renderer.js` - all data uses `storeGet/storeSet` (local)

**Your data is yours. Always.**
