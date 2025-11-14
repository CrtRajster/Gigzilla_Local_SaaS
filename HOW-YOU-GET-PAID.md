# How You Get Paid - Stripe Payment Flow

## 🎯 TL;DR

**You DON'T store any payment info.** Stripe handles everything:
- Stores customer credit cards (encrypted, PCI compliant)
- Charges €9/month automatically
- Sends money to YOUR bank account
- Handles refunds, disputes, taxes
- Sends you notifications

**You just connect your bank account to Stripe once, then money flows in automatically.**

---

## 💰 Complete Payment Flow

### Step 1: You Set Up Your Stripe Account (One Time)

```
1. Go to https://stripe.com
2. Create account
3. Verify your identity (business verification)
4. Connect your bank account
   ↓
   Bank account details stored by Stripe:
   - Bank name
   - Account number
   - Routing number
   ↓
   ✅ Done! Money will flow to this account
```

**You enter your bank info in Stripe dashboard:**
- Settings → Business settings → Bank accounts
- Add your bank account (IBAN or account number)
- Stripe verifies it (micro-deposits or instant verification)

---

## 💳 What Happens When User Subscribes

### User's Perspective:

```
User clicks "Subscribe" in your app
    ↓
Opens Stripe Checkout page
    ↓
User enters:
- Email: user@example.com
- Card: 4242 4242 4242 4242
- Expiry: 12/26
- CVC: 123
    ↓
Clicks "Subscribe"
    ↓
Stripe charges €9.00
    ↓
Stripe sends webhook to your server:
"Hey, user@example.com just paid!"
    ↓
Your server activates license
    ↓
User can use the app ✓
```

### Where Card Info Is Stored:

```
❌ NOT in your database
❌ NOT in your server
❌ NOT anywhere you control
✅ ONLY in Stripe's secure vault (PCI Level 1 compliant)
```

---

## 🔄 Monthly Billing (Automatic)

This is the beautiful part - **Stripe handles everything automatically:**

### Month 1 (Initial Payment):
```
Jan 1, 2025:
User subscribes → Stripe charges €9.00
                → Stripe webhook: subscription.created
                → Your server: Activate license
                → User's card: Charged €9.00
                → Your balance: +€9.00 (minus Stripe fees)
```

### Month 2 (Automatic Renewal):
```
Feb 1, 2025:
Stripe AUTOMATICALLY charges the same card €9.00
    ↓
No action needed from you!
    ↓
Stripe webhook: subscription.updated (status: active)
    ↓
Your server: Keep license active (already active)
    ↓
User's card: Charged €9.00
    ↓
Your balance: +€9.00 (minus fees)
```

### Month 3, 4, 5... (Same Process):
```
Every month on the same day:
- Stripe automatically charges the card
- Stripe sends webhook (confirmation)
- Money added to your Stripe balance
- You do nothing!
```

---

## 💸 How Money Reaches Your Bank Account

### Stripe Balance → Your Bank

Stripe doesn't pay you per transaction. Instead:

```
Daily (or weekly):
    ↓
Stripe calculates your balance:
- All successful charges
- Minus refunds
- Minus Stripe fees
    ↓
Stripe transfers money to YOUR bank account
    ↓
Money appears in your bank in 2-5 business days
```

**Example:**

```
Week 1:
- 10 users subscribe at €9/month = €90
- Stripe fee (2.9% + €0.30 per transaction) ≈ €6
- Your net: €84

Friday:
Stripe transfers €84 to your bank account
    ↓
Monday-Tuesday:
Money appears in your bank ✓
```

---

## 🏦 Stripe Payout Schedule

You configure this in Stripe Dashboard:

**Options:**
1. **Daily automatic** (default after initial period)
   - Transfer every day
   - Arrives 2 business days later

2. **Weekly automatic**
   - Transfer every Friday
   - Arrives following Tuesday

3. **Monthly automatic**
   - Transfer on 1st of month
   - Arrives ~3 days later

4. **Manual**
   - You click "Payout" when you want
   - Good for testing

**Example Timeline:**

```
Monday: User pays €9
Tuesday: User pays €9
Wednesday: User pays €9
---
Your Stripe balance: €27
---
Thursday (payout day):
Stripe initiates transfer of €27 to your bank
---
Saturday (2 days later):
€27 appears in your bank account ✓
```

---

## 💰 Stripe Fees (What You Actually Get)

Stripe charges per transaction:

**European Cards:**
- 1.5% + €0.25 per transaction

**Non-European Cards:**
- 2.9% + €0.25 per transaction

**Example Calculation:**

```
User pays: €9.00
Stripe fee: €9.00 × 1.5% = €0.135
           + €0.25
           = €0.385
───────────────────
You receive: €8.615
```

**For 100 subscribers:**
```
100 users × €9/month = €900
Stripe fees ≈ €38.50
───────────────────────
You receive: €861.50/month
```

---

## 📊 Stripe Dashboard (What You See)

When you log into https://dashboard.stripe.com:

### Home Screen:
```
┌─────────────────────────────────────┐
│ Stripe Dashboard                    │
├─────────────────────────────────────┤
│                                     │
│ Balance:        €127.50             │
│ (Available for payout)              │
│                                     │
│ Pending:        €45.00              │
│ (Processing, arrives in 2 days)     │
│                                     │
│ This Month:     €1,350.00           │
│                                     │
│ Active Subscriptions: 150           │
│                                     │
└─────────────────────────────────────┘

Recent Payments:
• user1@mail.com paid €9.00 - 2 hours ago
• user2@mail.com paid €9.00 - 3 hours ago
• user3@mail.com paid €19.00 - 5 hours ago
```

### Payments Page:
Shows every transaction:
- Who paid
- How much
- When
- Status (succeeded/failed)
- Card type (Visa/Mastercard)
- Last 4 digits of card

### Customers Page:
Lists all your customers:
- Email
- Subscription status
- Lifetime value
- Next billing date

**Important:** You see metadata, but NOT full card numbers!

---

## 🔐 Security & Compliance

### What Stripe Handles (So You Don't Have To):

✅ **PCI DSS Compliance**
- Level 1 certified (highest level)
- Stores cards in encrypted vault
- You never touch card data

✅ **3D Secure / SCA**
- Strong Customer Authentication (EU requirement)
- Handles authentication challenges
- Reduces fraud & disputes

✅ **Fraud Detection**
- Machine learning fraud prevention
- Blocks suspicious transactions
- Saves you from chargebacks

✅ **Disputes & Chargebacks**
- Handles the process
- Notifies you via email/webhook
- You can respond through dashboard

✅ **Taxes (Optional)**
- Can calculate VAT automatically
- Handles reverse charge
- Provides tax reports

---

## 🚨 What Happens If Payment Fails?

Stripe handles this automatically:

### Failed Payment Flow:

```
Month 2: User's card expires
    ↓
Stripe tries to charge: DECLINED
    ↓
Stripe sends email to user:
"Your payment failed. Please update your card."
    ↓
Stripe webhook: subscription.past_due
    ↓
Your server: Keep license active (grace period)
    ↓
3 days later: Stripe retries
    ↓
Still fails → Stripe retries again
    ↓
7 days later: Still fails
    ↓
Stripe webhook: subscription.canceled
    ↓
Your server: Deactivate license
    ↓
User can't use app (trial expired screen)
```

**Smart Retries:**
Stripe automatically retries failed payments:
- Day 3 after failure
- Day 5 after failure
- Day 7 after failure
- Then cancels subscription

You don't do anything - it's automatic!

---

## 📧 Notifications You Receive

Stripe emails you automatically:

**Daily Summary:**
```
Subject: Your daily Stripe report
- 5 successful payments (€45)
- 1 failed payment
- 0 disputes
- Balance: €127.50
```

**Important Events:**
```
Subject: Payment failed for subscription sub_xxx
Customer: user@example.com
Amount: €9.00
Reason: Card expired
Action: Stripe will retry automatically
```

**Disputes:**
```
Subject: Dispute created for payment
Amount: €9.00
Reason: "Never received service"
Action required: Respond with evidence
```

---

## 📱 Stripe Mobile App

You can monitor everything on your phone:

Download "Stripe Dashboard" app:
- iOS: App Store
- Android: Google Play

See in real-time:
- New payments
- Failed payments
- Daily revenue
- Payout schedule
- Disputes

---

## 🎯 Setup Checklist (One-Time)

To start receiving payments:

### 1. Create Stripe Account
- [ ] Go to stripe.com
- [ ] Sign up with email
- [ ] Verify email address

### 2. Business Verification
- [ ] Enter business details
- [ ] Provide tax ID (if applicable)
- [ ] Upload identity document (passport/license)
- [ ] Wait for approval (usually 1-2 days)

### 3. Connect Bank Account
- [ ] Go to Settings → Payouts
- [ ] Click "Add bank account"
- [ ] Enter IBAN or account number
- [ ] Verify (Stripe deposits 2 small amounts, you confirm them)
- [ ] Set payout schedule (daily/weekly/monthly)

### 4. Create Products
- [ ] Go to Products → Add product
- [ ] Create "Gigzilla Pro" - €9/month
- [ ] Create "Gigzilla Business" - €19/month
- [ ] Copy Price IDs

### 5. Set Up Webhooks
- [ ] Go to Developers → Webhooks
- [ ] Add endpoint: `https://your-api.com/webhook/stripe`
- [ ] Select events
- [ ] Copy webhook secret

### 6. Update Your Backend
- [ ] Add Stripe secret key to .env
- [ ] Add webhook secret to .env
- [ ] Add price IDs to .env
- [ ] Deploy

✅ **Done! You're ready to receive payments.**

---

## 💡 Real-World Example

Let's say you launch with 100 users:

### Month 1:
```
Jan 2025:
- 80 users subscribe to Pro (€9/month)
- 20 users subscribe to Business (€19/month)

Revenue:
80 × €9 = €720
20 × €19 = €380
Total: €1,100

Stripe fees (≈2%):
€1,100 × 0.02 = €22

Your net:
€1,100 - €22 = €1,078

Payout to your bank:
Every Friday, Stripe transfers your balance
Week 1: €250
Week 2: €275
Week 3: €280
Week 4: €273
Total: €1,078 ✓
```

### Month 2 (Automatic):
```
Feb 1-28:
Stripe automatically charges all 100 users
- 2 payments fail (cards expired)
- Stripe retries for 7 days
- 1 succeeds, 1 cancels
- Net: 99 active subscriptions

Revenue: €1,082
Stripe fees: €21
Your net: €1,061
Payouts: Weekly to your bank ✓
```

---

## 🔍 Tracking Your Money

### In Stripe Dashboard:

**Balance:**
```
Available now: €234.50
(Can payout immediately)

Pending: €89.00
(Will be available in 2 days)
```

**Reports:**
- Download CSV of all transactions
- Filter by date range
- Export for accounting
- Tax reports (if using Stripe Tax)

### In Your Bank:

```
Bank Statement:
Jan 15: Stripe transfer +€250.00
Jan 22: Stripe transfer +€275.00
Jan 29: Stripe transfer +€280.00
Feb 5:  Stripe transfer +€273.00
```

Each transfer labeled: "STRIPE TRANSFER"

---

## ❓ Common Questions

### Q: When do I get paid?
A: Automatically! Stripe transfers money to your bank daily/weekly based on your payout schedule. First payout may take 7-14 days (fraud prevention), then it's regular.

### Q: What if user requests refund?
A: You issue refund through Stripe Dashboard → Payments → Click payment → "Refund". Money returns to user, deducted from your next payout.

### Q: Do I need a business bank account?
A: Not required, but recommended for tax purposes. Personal account works too.

### Q: What about taxes?
A: You're responsible for reporting income to tax authorities. Stripe provides reports, but doesn't file taxes for you. (Stripe Tax can help calculate VAT)

### Q: Can users update their card?
A: Yes! Stripe Customer Portal lets users:
- Update payment method
- Change subscription plan
- Cancel subscription
- View invoices

### Q: What happens if my bank account changes?
A: Update it in Stripe Dashboard → Settings → Payouts → Change bank account. New payouts go to new account.

---

## 🎉 Summary

**You NEVER handle card numbers or bank details:**

1. **User subscribes** → Stripe stores their card (encrypted)
2. **Every month** → Stripe charges automatically
3. **Every week** → Stripe transfers money to YOUR bank
4. **You do nothing** → It's all automatic!

**You only:**
- See revenue in Stripe Dashboard
- Receive money in your bank account
- Get email notifications
- Issue refunds if needed (through dashboard)

**Stripe handles:**
- Card storage
- Monthly billing
- Failed payments
- Retries
- Fraud prevention
- Compliance (PCI DSS)
- Payouts to you
- Customer emails
- Invoice generation

---

## 📚 More Resources

**Stripe Documentation:**
- Payments: https://stripe.com/docs/payments
- Subscriptions: https://stripe.com/docs/billing/subscriptions
- Payouts: https://stripe.com/docs/payouts

**Stripe Dashboard:**
- Live: https://dashboard.stripe.com
- Test: https://dashboard.stripe.com/test

**Support:**
- Email: support@stripe.com
- Chat: Available in dashboard
- Phone: Available for verified accounts

---

**The bottom line:** You connect your bank account once, and Stripe deposits money regularly. You never see or store any payment information. It's all handled securely by Stripe! 💰✨
