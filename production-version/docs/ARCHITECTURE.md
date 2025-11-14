# Gigzilla Production Architecture

## 🎯 Architecture Philosophy

**"Store NOTHING. Build EVERYTHING the user needs."**

This architecture combines:
- **Code Version Infrastructure:** Zero-storage, Cloudflare Worker, €0 costs
- **CLI Version Features:** Natural language, automation, smart UX

Result: **95%+ margins + Delightful UX**

---

## 🏗️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gigzilla Desktop App (Electron)               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 1: Authentication (Code Version)                  │   │
│  │  - Email-based auth (unlimited devices)                  │   │
│  │  - JWT tokens (7-day offline mode)                       │   │
│  │  - Activation screens                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Smart UX (CLI Version)                        │   │
│  │  - Natural language input: "Logo Acme €1500 2 weeks"    │   │
│  │  - Context-aware dashboard (shows what matters NOW)      │   │
│  │  - Pipeline view (not database tabs)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Core Features (CLI Version)                   │   │
│  │  - Client management                                      │   │
│  │  - Project tracking                                       │   │
│  │  - Invoice generation                                     │   │
│  │  - All data stored locally (user's computer)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 4: Automation (CLI Version)                      │   │
│  │  - Auto-invoice when project done                        │   │
│  │  - Auto-remind (3, 7, 14 days overdue)                  │   │
│  │  - Integration system (Stripe, Gmail, Upwork)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ (Only for subscription verification)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│          Cloudflare Worker (Code Version)                        │
│          https://gigzilla-api.workers.dev                        │
│                                                                   │
│  Endpoints:                                                       │
│  ├─ POST /verify - Check subscription status                    │
│  ├─ POST /referral-stats - Get user's referral data            │
│  └─ POST /webhook/stripe - Process Stripe events               │
│                                                                   │
│  Features:                                                        │
│  ├─ Stateless (no database)                                     │
│  ├─ JWT generation (7-day validity)                             │
│  ├─ Referral processing                                         │
│  └─ €0 cost (100k requests/day free)                           │
│                                                                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ (Source of truth)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Stripe (Only Database)                      │
│                                                                   │
│  Stores:                                                          │
│  ├─ Customer emails                                              │
│  ├─ Subscription status (active, trial, canceled)               │
│  ├─ Payment history                                              │
│  ├─ Subscription metadata:                                       │
│  │  ├─ plan: 'monthly' | 'annual' | 'lifetime'                 │
│  │  ├─ referred_by_email: referrer's email                     │
│  │  ├─ total_referrals: count of successful referrals          │
│  │  └─ referral_bonus_granted: 'true' | 'false'               │
│  └─ Invoice items (credits for referral bonuses)               │
│                                                                   │
│  GDPR Compliance: Stripe is the data controller                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. First-Time User Flow

```
1. User downloads Gigzilla
     ↓
2. Opens app → Activation screen
     ↓
3. Enters email: user@example.com
     ↓
4. Clicks "Start Free Trial"
     ↓
5. Browser opens → Stripe Checkout
   mode: 'subscription'
   trial_period_days: 14
   metadata: { referred_by_email: (if has referral code) }
     ↓
6. User enters card details in Stripe
     ↓
7. Stripe creates:
   - Customer: user@example.com
   - Subscription: status 'trialing'
     ↓
8. Redirects to: gigzilla://success
     ↓
9. App calls API: POST /verify { email }
     ↓
10. Worker queries Stripe:
    "Does user@example.com have subscription?"
     ↓
11. Stripe responds: Yes (trialing)
     ↓
12. Worker generates JWT token (expires in 7 days)
     ↓
13. App receives token + subscription status
     ↓
14. App stores locally:
    - JWT token
    - Token expiry date
    - User email
     ↓
15. App unlocks! ✅
    User sees smart dashboard
```

### 2. Subsequent App Launches

```
1. User opens app
     ↓
2. App checks local storage for JWT token
     ↓
3. Token exists?
   ├─ YES → Is it expired (> 7 days old)?
   │   ├─ NO → Unlock app (offline mode) ✅
   │   └─ YES → Call /verify to get fresh token
   │
   └─ NO → Show activation screen
     ↓
4. If online + token expired:
   Call /verify { email }
     ↓
5. Worker checks Stripe subscription status
     ↓
6. If active → New JWT token → Unlock ✅
   If expired → Show upgrade screen
```

### 3. Referral System Flow

```
User A (Referrer):
1. Opens app → Goes to Account/Referrals
     ↓
2. App shows referral code: "DXNLCJBKEG"
   (Generated from email via base64)
     ↓
3. Shares link: gigzilla.site?ref=DXNLCJBKEG
     ↓

User B (Referred Friend):
4. Clicks link → Landing page
     ↓
5. JavaScript stores: localStorage.setItem('gigzilla_referral', 'DXNLCJBKEG')
     ↓
6. Banner: "You've been invited! Get 1 month free"
     ↓
7. Clicks "Start Free Trial"
     ↓
8. Stripe Checkout created with:
   subscription_data: {
     trial_period_days: 14,
     metadata: {
       referral_code: 'DXNLCJBKEG',
       referred_by_email: 'userA@example.com'  // Decoded from code
     }
   }
     ↓
9. User B completes signup (trial starts)
     ↓
10. After 14 days, trial ends → First payment
     ↓
11. Stripe webhook: customer.subscription.updated (status: active)
     ↓
12. Worker processes referral:
    a. Find User A in Stripe by email
    b. Create invoice credit for User A: -€9
    c. Create invoice credit for User B: -€9
    d. Update User A's total_referrals: +1
    e. Mark referral_bonus_granted: 'true'
     ↓
13. Both users get €9 off next invoice! 🎉
```

### 4. Natural Language Project Creation (Desktop App)

```
User types: "Logo for Acme Corp, €1,500, 2 weeks"
     ↓
Natural language parser:
- Extracts: project = "Logo", client = "Acme Corp", amount = 1500, deadline = "+2 weeks"
     ↓
App logic:
1. Check if "Acme Corp" exists in clients
   ├─ NO → Create new client: { name: "Acme Corp" }
   └─ YES → Use existing client
     ↓
2. Create project:
   {
     title: "Logo",
     client: "Acme Corp",
     amount: 1500,
     currency: "EUR",
     deadline: Date.now() + (14 * 86400000),  // 2 weeks
     status: "in_progress"
   }
     ↓
3. Save to local storage
     ↓
4. Show confirmation:
   "✓ Created: Logo for Acme Corp
    €1,500 • Due Feb 15
    [Edit Details] [Looks Good]"
     ↓
5. Update pipeline view
     ↓
Result: 6-click form → 1 line of text ✅
```

### 5. Auto-Invoice System (Desktop App)

```
Scenario: User marks project as "Done"
     ↓
1. User clicks "Mark as Done" on project
     ↓
2. App checks automation settings:
   auto_invoice_on_complete: true
   send_delay: "next_business_day"
     ↓
3. App shows confirmation:
   "Project marked as done! 🎉
    Invoice will be sent to: john@acme.com
    When: Tomorrow at 9:00 AM
    Amount: €1,500
    [Send Now Instead] [Cancel Auto-Send]"
     ↓
4. User clicks "Looks Good" (or waits)
     ↓
5. Next day at 9:00 AM:
   a. Generate invoice PDF
   b. Send via Gmail integration
   c. Update project status: "invoiced"
   d. Set payment reminder schedule:
      - Reminder 1: Due date (14 days)
      - Reminder 2: +3 days overdue
      - Reminder 3: +7 days overdue
     ↓
6. Notifications: "✓ Invoice #042 sent to john@acme.com"
     ↓
Result: Zero admin work ✅
```

---

## 🔐 Security Architecture

### Authentication Flow:

```
Email-Based Auth (No Passwords):
1. User enters email
2. Stripe Checkout handles payment + verification
3. Worker verifies subscription in Stripe
4. JWT token generated (server-side)
5. Token stored locally (client-side)

Security Benefits:
✅ No passwords to manage
✅ No password resets
✅ No password breaches
✅ Stripe handles all sensitive data
✅ JWT only stores: email, subscription ID, expiry
```

### JWT Token Structure:

```json
{
  "email": "user@example.com",
  "customerId": "cus_xxxxx",
  "subscriptionId": "sub_xxxxx",
  "status": "active",
  "exp": 1738281600  // 7 days from issue
}
```

**Signed with:** HMAC-SHA256
**Secret:** 256-bit random key (stored in Cloudflare)
**Offline grace period:** 7 days

### Data Privacy:

| Data Type | Stored Where | GDPR Owner |
|-----------|--------------|------------|
| User email | Stripe | Stripe |
| Payment info | Stripe | Stripe |
| Subscription | Stripe | Stripe |
| Clients/Projects | User's computer | User |
| Invoices | User's computer | User |
| JWT token | User's computer | User |
| **Our servers** | **NOTHING** | **N/A** |

**Result:** Zero GDPR liability ✅

---

## 💰 Cost Structure

### Infrastructure Costs:

```
Cloudflare Worker:
├─ Free tier: 100,000 requests/day
├─ That's: 3,000,000 requests/month
├─ Enough for: 10,000+ active users
└─ Cost: €0

Cloudflare Pages (landing page):
├─ Free tier: Unlimited sites
└─ Cost: €0

Domain:
├─ gigzilla.site
└─ Cost: €12/year

Total monthly infrastructure: €1/month (domain only)
```

### Transaction Costs:

```
Stripe Fees (EU):
- 1.5% + €0.25 per transaction

Examples:
€9/month subscription:
├─ Stripe fee: €0.39
├─ Net to you: €8.61
└─ Margin: 95.7%

€90/year subscription:
├─ Stripe fee: €1.60
├─ Net to you: €88.40
└─ Margin: 98.2%

€360 lifetime (AppSumo):
├─ AppSumo cut: €252 (70%)
├─ Stripe fee: €3.00
├─ Net to you: €105
└─ Margin: 29.2% (but it's marketing!)
```

### Revenue Model at Scale:

```
1,500 Subscribers:
├─ 1,000 monthly @ €9 = €9,000/mo
├─ 500 annual @ €90 = €45,000/yr = €3,750/mo
└─ Total MRR: €12,750/mo

Costs:
├─ Infrastructure: €1/mo
├─ Stripe fees: ~€585/mo
└─ Total costs: €586/mo

Net profit: €12,164/mo (95.4% margin)
Annual: €145,968/year
```

**Comparison with traditional SaaS:**

| Item | Traditional | Gigzilla | Savings |
|------|-------------|----------|---------|
| Database | €30/mo | €0 | €30/mo |
| Backend hosting | €50/mo | €0 | €50/mo |
| Maintenance | 5 hrs/mo | 0 hrs | 5 hrs |
| GDPR compliance | $1000/yr | €0 | €1000/yr |

**Total savings:** €80/mo + 5 hours + €1000/yr = **~€2000/year + time**

---

## 🔄 Scalability

### Performance Limits:

```
Cloudflare Worker Free Tier:
├─ 100,000 requests/day
├─ 10ms CPU time per request
└─ Enough for: 10,000+ daily active users

Scenarios:
1 user opens app 10x/day = 10 requests/day
10,000 users = 100,000 requests/day = Free tier limit

To exceed free tier:
Need: 10,000+ daily active users
Cost at that scale: €5-10/month (still nothing!)
```

### Stripe Limits:

```
Stripe Standard:
├─ No request limits
├─ Unlimited customers
├─ Unlimited subscriptions
└─ Can handle millions of users
```

**Result:** Infrastructure scales to millions of users with minimal cost increase

---

## 🎯 Feature Priorities

### Phase 1: MVP (Weeks 1-2)
1. ✅ Cloudflare Worker (subscription verification)
2. ✅ Email-based authentication
3. ✅ Activation screens
4. [ ] Basic project tracking (add/edit/delete)
5. [ ] Simple client management
6. [ ] Manual invoice creation

### Phase 2: Smart UX (Weeks 3-4)
7. [ ] Natural language input parser
8. [ ] Smart context-aware dashboard
9. [ ] Pipeline view (replace tabs)
10. [ ] Referral system UI

### Phase 3: Automation (Weeks 5-6)
11. [ ] Auto-invoice on project complete
12. [ ] Auto-reminder system (3, 7, 14 days)
13. [ ] Stripe payment detection

### Phase 4: Integrations (Weeks 7-8)
14. [ ] Gmail integration (send invoices)
15. [ ] Upwork integration (import projects)
16. [ ] SMS reminders (optional)

---

## 🚀 Deployment Architecture

### Backend (Cloudflare):

```
gigzilla-api.workers.dev
├─ Production environment
├─ Secrets:
│  ├─ STRIPE_SECRET_KEY (sk_live_xxx)
│  ├─ STRIPE_WEBHOOK_SECRET (whsec_xxx)
│  └─ JWT_SECRET (256-bit random)
└─ Auto-deployed via: wrangler deploy
```

### Landing Page (Cloudflare Pages):

```
gigzilla.site
├─ Static HTML/CSS/JS
├─ Stripe Checkout integration
├─ Referral link support (?ref=XXXXX)
└─ Auto-deployed via: git push
```

### Desktop App Distribution:

```
Electron App:
├─ Windows: .exe installer
├─ macOS: .dmg installer
├─ Linux: .AppImage
├─ Auto-update: electron-updater
└─ Code signing: Required for macOS/Windows
```

### Monitoring:

```
Cloudflare Dashboard:
├─ Request count
├─ Error rate
├─ Response time
└─ Free built-in analytics

Stripe Dashboard:
├─ MRR (Monthly Recurring Revenue)
├─ Active subscriptions
├─ Trial conversion rate
├─ Churn rate
└─ No additional analytics needed!
```

---

## ✅ Success Criteria

### Technical:
- ✅ Zero database costs
- ✅ 99.9% uptime (Cloudflare SLA)
- ✅ < 100ms API response time
- ✅ Zero GDPR violations possible

### Business:
- ✅ 95%+ profit margins
- ✅ < 1 hour/week maintenance
- ✅ Passive income verified
- ✅ Viral growth via referrals

### UX:
- ✅ < 5 minutes to first value
- ✅ Natural language input works
- ✅ Auto-invoice saves 80% time
- ✅ Smart dashboard shows what matters

---

## 🎉 Result

This architecture achieves:

✅ **€0 infrastructure costs** - Cloudflare free tier
✅ **95%+ profit margins** - Only Stripe fees
✅ **Zero GDPR liability** - No personal data stored
✅ **Infinite scalability** - Serverless architecture
✅ **Delightful UX** - Natural language, automation, smart features
✅ **Viral growth** - Built-in referral system
✅ **True passive income** - Minimal maintenance required

**This is the dream SaaS architecture!** 🚀
