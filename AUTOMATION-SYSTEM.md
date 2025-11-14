# Gigzilla Automation System - "Set It & Forget It"

## 🎯 Core Philosophy

**Freelancers should create, not administrate.**

The app should:
- ✅ Auto-invoice when work is done
- ✅ Auto-remind clients about payment
- ✅ Auto-detect when payment arrives
- ✅ Auto-stop reminders when paid
- ✅ Auto-escalate if payment is very late
- ✅ Allow manual override anytime

**You set the rules once. The app handles the rest.**

---

## 🤖 Auto-Invoice System

### Setup (One-Time Configuration)

```
Settings → Automation

┌────────────────────────────────────────────────┐
│ 🤖 Auto-Invoice Settings                      │
├────────────────────────────────────────────────┤
│                                                │
│ When should we send invoices automatically?    │
│                                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ When I mark project as "Done"       │   │
│ │    Send invoice: [Immediately ▼]       │   │
│ │    Options: Immediately, After 1 day,  │   │
│ │             After 3 days, Never (manual)│   │
│ └────────────────────────────────────────┘   │
│                                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ When project reaches deadline        │   │
│ │    (Even if not marked "Done")          │   │
│ │    Send invoice: [On deadline ▼]       │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Smart scheduling:                              │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Only send during business hours      │   │
│ │    Mon-Fri, 9am-5pm (your timezone)    │   │
│ │    (If outside hours, queue for next   │   │
│ │     business day)                       │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Default payment terms:                         │
│ ┌────────────────────────────────────────┐   │
│ │ Due in: [14 days ▼] after invoice sent│   │
│ └────────────────────────────────────────┘   │
│                                                │
│ [Save Settings]                                │
│                                                │
└────────────────────────────────────────────────┘
```

### How It Works

**Scenario 1: Mark Project as Done**

```
You finish logo design → Click "Mark as Done"
    ↓
┌────────────────────────────────────────┐
│ Project marked as done! 🎉             │
│                                        │
│ 📧 Invoice will be sent to:           │
│    john@acme.com                       │
│                                        │
│ When: Tomorrow at 9:00 AM              │
│ Amount: €1,500                         │
│ Due: 14 days (Feb 15)                 │
│                                        │
│ [Send Now Instead] [Cancel Auto-Send] │
└────────────────────────────────────────┘
    ↓
You can override or let it auto-send
    ↓
Next day 9:00 AM:
✓ Invoice #042 sent to john@acme.com
✓ Payment tracking activated
✓ Reminder schedule set
```

**Scenario 2: Project Deadline Reached**

```
Jan 31 - Project deadline arrives
    ↓
System checks: Is project marked "Done"?
    ↓
No? → Send you notification:
┌────────────────────────────────────────┐
│ ⏰ Project deadline reached            │
│                                        │
│ "Website for TechCorp" is due today   │
│                                        │
│ Status: Still in "Working"            │
│                                        │
│ Should we:                             │
│ • [Mark as Done & Send Invoice]       │
│ • [Extend Deadline by 3 days]         │
│ • [Client Delayed - Don't Invoice]    │
│                                        │
└────────────────────────────────────────┘
    ↓
You choose or ignore (auto-action in 24h)
```

---

## 📧 Auto-Reminder System

### Smart Escalation Strategy

**The app follows this timeline automatically:**

```
Day 0: Invoice sent
    ↓
Day 11: "Friendly reminder" (3 days before due)
┌────────────────────────────────────────┐
│ 📧 Email sent automatically:           │
│                                        │
│ Hi John,                               │
│                                        │
│ Just a friendly reminder that invoice │
│ #042 for €1,500 is due in 3 days.    │
│                                        │
│ Let me know if you have any questions!│
│                                        │
│ Best,                                  │
│ Alex                                   │
└────────────────────────────────────────┘
    ↓
Day 14: "Payment due today" (due date)
┌────────────────────────────────────────┐
│ 📧 Email sent automatically:           │
│                                        │
│ Hi John,                               │
│                                        │
│ Invoice #042 for €1,500 is due today. │
│                                        │
│ [View Invoice] [Pay Now]              │
│                                        │
│ Thanks!                                │
│ Alex                                   │
└────────────────────────────────────────┘
    ↓
Day 17: "Payment overdue" (3 days late)
┌────────────────────────────────────────┐
│ 📧 Email sent automatically:           │
│                                        │
│ Hi John,                               │
│                                        │
│ Invoice #042 for €1,500 is now        │
│ 3 days overdue.                        │
│                                        │
│ Could you please process payment      │
│ at your earliest convenience?         │
│                                        │
│ [View Invoice] [Pay Now]              │
│                                        │
│ Thanks,                                │
│ Alex                                   │
└────────────────────────────────────────┘
    ↓
Day 21: "Urgent - payment required" (7 days late)
┌────────────────────────────────────────┐
│ 📧 Email sent automatically:           │
│                                        │
│ Hi John,                               │
│                                        │
│ Invoice #042 for €1,500 is now        │
│ 7 days overdue.                        │
│                                        │
│ Please arrange payment within 3 days  │
│ to avoid late fees.                    │
│                                        │
│ [View Invoice] [Pay Now]              │
│                                        │
│ Alex                                   │
└────────────────────────────────────────┘
    ↓
Day 24: YOU get notified (10 days late)
┌────────────────────────────────────────┐
│ ⚠️ Action Required                    │
│                                        │
│ Invoice #042 is 10 days overdue       │
│ Client: Acme Corp (john@acme.com)     │
│ Amount: €1,500                         │
│                                        │
│ Auto-reminders sent: 4 times           │
│ No payment detected yet                │
│                                        │
│ Suggested actions:                     │
│ • [📞 Call Client]                    │
│ • [📧 Send Final Notice]              │
│ • [💰 Write Off] [🔄 Extend Terms]    │
│                                        │
└────────────────────────────────────────┘
    ↓
System stops auto-reminders
Waits for your decision
```

### Customizable Reminder Schedule

```
Settings → Automation → Reminders

┌────────────────────────────────────────────────┐
│ 📧 Auto-Reminder Schedule                     │
├────────────────────────────────────────────────┤
│                                                │
│ Before due date:                               │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ 3 days before   [Friendly tone]     │   │
│ │ ✅ 1 day before    [Gentle reminder]   │   │
│ │ ⬜ 7 days before   [Optional]          │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ On due date:                                   │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Send reminder on due date           │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ After due date:                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ 3 days overdue  [Polite but firm]   │   │
│ │ ✅ 7 days overdue  [Urgent tone]       │   │
│ │ ✅ 14 days overdue [Final notice]      │   │
│ │ ⬜ 30 days overdue [Legal action]      │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Stop reminders when:                           │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Payment detected via PayPal/Stripe  │   │
│ │ ✅ I manually mark as paid             │   │
│ │ ✅ 30 days overdue (notify me)         │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ [Save Settings]                                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 💰 Auto-Payment Detection

### PayPal Integration

**Setup (One-Time):**

```
Settings → Integrations → PayPal

┌────────────────────────────────────────────────┐
│ 🅿️ PayPal Integration                         │
├────────────────────────────────────────────────┤
│                                                │
│ Connect your PayPal account to automatically   │
│ detect incoming payments.                      │
│                                                │
│ When payment is detected:                      │
│ • Invoice marked as paid ✓                     │
│ • Reminders stopped automatically              │
│ • Project moved to "Paid" column               │
│ • You get notification                         │
│                                                │
│ [Connect PayPal Account]                       │
│                                                │
│ Privacy: We only read payment notifications.   │
│ We never have access to withdraw or send money.│
│                                                │
└────────────────────────────────────────────────┘
```

**How It Works:**

```
Client sends €1,500 via PayPal
    ↓
PayPal API notifies Gigzilla:
"Payment received from john@acme.com - €1,500"
    ↓
Gigzilla matches to invoice #042:
• Email matches: john@acme.com ✓
• Amount matches: €1,500 ✓
• Invoice unpaid: Yes ✓
    ↓
Auto-actions triggered:
✅ Invoice #042 marked as PAID
✅ All scheduled reminders cancelled
✅ Project moved to "Paid" column
✅ You get notification:

┌────────────────────────────────────────┐
│ 💰 Payment Received!                   │
│                                        │
│ Invoice #042 - €1,500                 │
│ From: Acme Corp                        │
│ Via: PayPal                            │
│                                        │
│ All reminders stopped.                 │
│ Project marked as paid.                │
│                                        │
│ [View Transaction] [Dismiss]           │
└────────────────────────────────────────┘
    ↓
You don't lift a finger! ✨
```

### Stripe Integration (Same Concept)

```
Client pays via Stripe checkout
    ↓
Stripe webhook fires → Gigzilla receives notification
    ↓
Matches payment to invoice (via metadata)
    ↓
Auto-marks as paid
    ↓
Stops all reminders
    ↓
You get notified
```

### Bank Transfer Detection (Advanced)

```
Settings → Integrations → Bank Account

┌────────────────────────────────────────────────┐
│ 🏦 Bank Account Integration                   │
├────────────────────────────────────────────────┤
│                                                │
│ Connect via: [Plaid] [TrueLayer] [Tink]       │
│                                                │
│ We'll monitor incoming transfers and match     │
│ them to your invoices automatically.           │
│                                                │
│ Matching criteria:                             │
│ • Amount matches invoice (±€5 tolerance)       │
│ • Reference contains invoice # or client name  │
│ • Received within 30 days of invoice           │
│                                                │
│ [Connect Bank Account]                         │
│                                                │
└────────────────────────────────────────────────┘
```

**Smart Matching:**

```
Bank transfer received: €1,495
Reference: "INV042 Logo payment"
    ↓
Gigzilla analyzes:
• "INV042" matches Invoice #042 ✓
• Amount: €1,495 (close to €1,500, €5 difference) ✓
• From: ACME CORP LTD ✓
    ↓
Confidence: 95% match
    ↓
You get notification:

┌────────────────────────────────────────┐
│ 🤔 Possible Payment Detected           │
│                                        │
│ Bank transfer: €1,495                 │
│ Reference: "INV042 Logo payment"       │
│ From: ACME CORP LTD                    │
│                                        │
│ Matches invoice #042 (€1,500)         │
│ Difference: €5 (fee/exchange rate?)   │
│                                        │
│ Is this payment for Invoice #042?     │
│                                        │
│ [Yes - Mark as Paid] [No - Ignore]    │
└────────────────────────────────────────┘
    ↓
You confirm with one click
```

---

## 🧠 Smart Automation Rules

### Project-Level Automation

**When creating a project:**

```
New Project Form

┌────────────────────────────────────────────────┐
│ ✨ New Project                                 │
├────────────────────────────────────────────────┤
│                                                │
│ Project: Website redesign                      │
│ Client: TechCorp                               │
│ Amount: €5,000                                 │
│                                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                │
│ 🤖 Automation Settings                        │
│                                                │
│ Deadline:                                      │
│ ┌────────────────────────────────────────┐   │
│ │ Feb 28, 2025              📅           │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Auto-invoice:                                  │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ When I mark as "Done"               │   │
│ │ ✅ On deadline if not done             │   │
│ │ ⬜ Don't auto-invoice (manual)         │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Payment terms:                                 │
│ ┌────────────────────────────────────────┐   │
│ │ Due: [14 days ▼] after invoice        │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Auto-reminders:                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Use default reminder schedule       │   │
│ │ ⬜ Custom schedule for this project    │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ [Create Project]                               │
│                                                │
└────────────────────────────────────────────────┘
```

**Per-project override = Ultimate flexibility!**

---

## 🎯 Client-Level Automation

### Smart Client Profiles

```
Client Details: Acme Corp

┌────────────────────────────────────────────────┐
│ 👤 Acme Corp                                   │
├────────────────────────────────────────────────┤
│                                                │
│ Contact: john@acme.com                         │
│ Phone: +1234567890                             │
│                                                │
│ 💰 Payment History:                           │
│ • Total paid: €12,450 (8 projects)            │
│ • Average payment time: 8 days                 │
│ • Payment reliability: 🟢 Excellent           │
│   (Always pays within terms)                   │
│                                                │
│ 🤖 Auto-settings for this client:             │
│ ┌────────────────────────────────────────┐   │
│ │ Payment terms: [10 days ▼]             │   │
│ │ (Faster than default - good payer!)    │   │
│ │                                        │   │
│ │ Reminder frequency: [Less aggressive ▼]│   │
│ │ (They always pay on time)              │   │
│ │                                        │   │
│ │ Auto-invoice: [Immediately ▼]          │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ 📊 Smart insights:                            │
│ • This client prefers PayPal                   │
│ • Best time to send: Weekday mornings          │
│ • Usually approves within 2 days               │
│                                                │
│ [Save Settings]                                │
│                                                │
└────────────────────────────────────────────────┘
```

**vs. Slow-paying client:**

```
Client Details: SlowPay Corp

┌────────────────────────────────────────────────┐
│ 👤 SlowPay Corp                                │
├────────────────────────────────────────────────┤
│                                                │
│ 💰 Payment History:                           │
│ • Total paid: €5,200 (3 projects)             │
│ • Average payment time: 28 days 🔴            │
│ • Payment reliability: 🟡 Fair                │
│   (Often pays late, but eventually pays)       │
│                                                │
│ 🤖 Auto-settings for this client:             │
│ ┌────────────────────────────────────────┐   │
│ │ Payment terms: [7 days ▼]              │   │
│ │ (Shorter than default - they're slow)  │   │
│ │                                        │   │
│ │ Reminder frequency: [More frequent ▼]  │   │
│ │ (Start reminding earlier)              │   │
│ │                                        │   │
│ │ ⚠️ Suggested: Request 50% upfront     │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ 💡 Tip: Consider requiring deposit before     │
│    starting work with this client.             │
│                                                │
└────────────────────────────────────────────────┘
```

**System learns from history! 🧠**

---

## 📱 Notification Preferences

### What Gets Automated, What Needs Your Approval

```
Settings → Automation → Notifications

┌────────────────────────────────────────────────┐
│ 🔔 Automation Notifications                   │
├────────────────────────────────────────────────┤
│                                                │
│ Auto-actions (no confirmation needed):         │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Send invoice when project done       │   │
│ │ ✅ Send payment reminders               │   │
│ │ ✅ Mark as paid when payment detected   │   │
│ │ ✅ Stop reminders when paid             │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Ask me first (confirmation required):          │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Send final notice (30 days overdue)  │   │
│ │ ✅ Write off unpaid invoice             │   │
│ │ ✅ Add late fees                        │   │
│ │ ⬜ Send invoice on deadline (if not done)│   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Notify me when:                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ Payment received                     │   │
│ │ ✅ Invoice 10+ days overdue             │   │
│ │ ✅ Client hasn't responded to reminders │   │
│ │ ⬜ Every reminder sent (too noisy)      │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ Notification method:                           │
│ ┌────────────────────────────────────────┐   │
│ │ ✅ In-app notification                  │   │
│ │ ✅ Email digest (daily)                 │   │
│ │ ⬜ Push notification (mobile)           │   │
│ │ ⬜ SMS (urgent only)                    │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ [Save Preferences]                             │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🎨 User Experience Examples

### Example 1: Perfect Automation Flow

```
Monday, Jan 15:
You finish logo design
Click "Mark as Done"
    ↓
┌────────────────────────────────────────┐
│ ✓ Project marked as done!              │
│ 📧 Invoice will be sent tomorrow 9am   │
└────────────────────────────────────────┘
You close laptop, go do more creative work ✨

Tuesday, Jan 16, 9:00 AM:
System auto-sends invoice
    ↓
You get quiet notification:
┌────────────────────────────────────────┐
│ ✓ Invoice #042 sent to john@acme.com  │
│   Due: Jan 30 (14 days)                │
└────────────────────────────────────────┘

You're already working on next project.

Sunday, Jan 27:
System auto-sends reminder (3 days before due)
    ↓
You don't even notice. System handles it.

Tuesday, Jan 29, 2:15 PM:
Client pays via PayPal
    ↓
System detects payment
    ↓
You get notification:
┌────────────────────────────────────────┐
│ 💰 PAID! €1,500 from Acme Corp        │
│    Invoice #042 marked as paid         │
│    All reminders stopped               │
└────────────────────────────────────────┘

You smile. You did nothing. It all worked! 🎉
```

### Example 2: Late Payment (System Escalates)

```
Project done → Invoice sent (Day 0)
    ↓
System sends 3 reminders (Days 11, 14, 17)
    ↓
You're still focused on creative work
    ↓
Day 21: Client still hasn't paid
    ↓
System escalates to you:
┌────────────────────────────────────────┐
│ ⚠️ Action Required                    │
│                                        │
│ Invoice #042 is 7 days overdue        │
│ Auto-reminders sent: 4 times           │
│ Client: Acme Corp                      │
│ Amount: €1,500                         │
│                                        │
│ Suggested actions:                     │
│ • [📞 Call client]                    │
│ • [Send final notice]                  │
│ • [Extend payment terms]               │
│ • [Write off as bad debt]             │
│                                        │
└────────────────────────────────────────┘

NOW you intervene (only when needed!)
```

### Example 3: Manual Override

```
You finish project but want to wait before invoicing
(Client asked for extra revisions)

Mark as "Done"
    ↓
┌────────────────────────────────────────┐
│ ✓ Project marked as done!              │
│ 📧 Invoice will be sent tomorrow       │
│                                        │
│ [Send Now] [Cancel Auto-Send] [Delay] │
└────────────────────────────────────────┘
    ↓
Click "Cancel Auto-Send"
    ↓
┌────────────────────────────────────────┐
│ ✓ Auto-invoice cancelled               │
│ You can send manually anytime.         │
└────────────────────────────────────────┘

You have full control when you need it! ✓
```

---

## 💡 Advanced Automation Features

### 1. **Partial Payment Detection**

```
Invoice: €5,000
Client pays: €2,500 (50% deposit)
    ↓
System detects partial payment
    ↓
You get notification:
┌────────────────────────────────────────┐
│ 💰 Partial payment received            │
│                                        │
│ Invoice #045: €5,000                  │
│ Paid: €2,500 (50%)                    │
│ Remaining: €2,500                     │
│                                        │
│ What would you like to do?             │
│ • [Split invoice] (create 2nd invoice)│
│ • [Mark as partially paid]             │
│ • [This was full payment] (adjust amt)│
│                                        │
└────────────────────────────────────────┘

Smart detection + your decision = Perfect!
```

### 2. **Multi-Currency Support**

```
You invoice: €1,500
Client pays: $1,620 USD
    ↓
System converts: $1,620 ÷ 1.08 = €1,500 ✓
    ↓
Auto-marks as paid (exchange rate matched!)
```

### 3. **Recurring Projects**

```
Monthly retainer: $2,000/month for MegaCorp
    ↓
Set as "Recurring project"
    ↓
System automatically:
• Creates new project each month
• Sends invoice on 1st of month
• Sets due date to 15th
• Sends reminders if unpaid
• Detects payment
• Repeats next month

You do nothing! ✨
```

### 4. **Smart Project Templates**

```
You do lots of "Logo Design - €1,500" projects
    ↓
Create template:
┌────────────────────────────────────────┐
│ Template: Logo Design Package          │
│                                        │
│ Amount: €1,500                         │
│ Timeline: 7 days                       │
│ Payment terms: 50% upfront, 50% on done│
│ Auto-invoice: On completion            │
│ Auto-reminders: Yes                    │
│                                        │
│ [Save Template]                        │
└────────────────────────────────────────┘
    ↓
Next logo project:
Click "Use Template" → All settings pre-filled!
```

### 5. **Invoice Bundling**

```
You complete 3 small projects for same client:
• Logo: €500
• Business card: €300
• Letterhead: €200
    ↓
System suggests:
┌────────────────────────────────────────┐
│ 💡 Bundle these into one invoice?     │
│                                        │
│ Projects for Acme Corp:                │
│ • Logo design (€500)                  │
│ • Business cards (€300)               │
│ • Letterhead (€200)                   │
│                                        │
│ Total: €1,000                         │
│                                        │
│ [Send as one invoice] [Send separate] │
└────────────────────────────────────────┘

Fewer invoices = easier for client to pay!
```

---

## 🛡️ Safety Features

### 1. **Undo/Pause Automation**

```
Emergency "Pause All Automation" button

Settings → Automation

┌────────────────────────────────────────────────┐
│ 🤖 Automation Status: [Active ✓]              │
│                                                │
│ [⏸️ Pause All Automation]                     │
│                                                │
│ Paused automation will:                        │
│ • Stop sending new invoices                    │
│ • Stop sending reminders                       │
│ • Keep detecting payments                      │
│ • Queue actions for when you resume            │
│                                                │
│ Use this when:                                 │
│ • You're on vacation                           │
│ • Client dispute in progress                   │
│ • Need to review invoices manually             │
│                                                │
└────────────────────────────────────────────────┘
```

### 2. **Review Before Send (Optional)**

```
Settings → Automation → Safety

┌────────────────────────────────────────────────┐
│ 🛡️ Safety Settings                            │
│                                                │
│ ✅ Preview invoices before auto-sending        │
│    (You have 2 hours to cancel)                │
│                                                │
│ ✅ Notify me before sending final notices      │
│    (10+ days overdue)                          │
│                                                │
│ ✅ Ask before applying late fees               │
│                                                │
│ ⬜ Disable all automation (manual only)        │
│                                                │
└────────────────────────────────────────────────┘
```

### 3. **Activity Log**

```
Settings → Automation → Activity Log

┌────────────────────────────────────────────────┐
│ 📜 Automation Activity Log                    │
├────────────────────────────────────────────────┤
│                                                │
│ Jan 29, 2:15 PM                                │
│ ✅ Payment detected: €1,500 from Acme Corp    │
│    Auto-action: Invoice #042 marked as paid   │
│                                                │
│ Jan 27, 9:00 AM                                │
│ 📧 Reminder sent: Invoice #042 (3 days before)│
│    To: john@acme.com                           │
│                                                │
│ Jan 16, 9:00 AM                                │
│ 📧 Invoice #042 sent                          │
│    To: john@acme.com                           │
│    Amount: €1,500                              │
│    Due: Jan 30                                 │
│                                                │
│ Jan 15, 3:45 PM                                │
│ ⏰ Auto-invoice scheduled                      │
│    Project: Logo for Acme Corp (marked done)  │
│    Send: Tomorrow 9am                          │
│                                                │
│ [Export Log] [Clear Log]                       │
│                                                │
└────────────────────────────────────────────────┘

Full transparency! ✨
```

---

## 🎯 Implementation Summary

### Backend Changes Needed:

```javascript
// New database tables

CREATE TABLE automation_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  auto_invoice_on_done BOOLEAN DEFAULT true,
  auto_invoice_delay_hours INTEGER DEFAULT 24,
  auto_invoice_on_deadline BOOLEAN DEFAULT true,
  payment_terms_days INTEGER DEFAULT 14,
  reminder_schedule JSONB DEFAULT '[
    {"days_before": 3, "tone": "friendly"},
    {"days_after": 0, "tone": "due"},
    {"days_after": 3, "tone": "overdue"},
    {"days_after": 7, "tone": "urgent"}
  ]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scheduled_actions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action_type VARCHAR(50), -- 'send_invoice', 'send_reminder', etc.
  entity_id INTEGER, -- project_id or invoice_id
  scheduled_for TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, cancelled
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_detections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  invoice_id INTEGER,
  payment_source VARCHAR(50), -- 'paypal', 'stripe', 'bank'
  amount DECIMAL(10,2),
  detected_at TIMESTAMP DEFAULT NOW(),
  confidence_score INTEGER, -- 0-100
  auto_matched BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE automation_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action_type VARCHAR(100),
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Cron Jobs Needed:

```javascript
// backend/src/automation/scheduler.js

// Run every 5 minutes
async function processScheduledActions() {
  const actions = await getScheduledActions(Date.now());

  for (const action of actions) {
    switch (action.type) {
      case 'send_invoice':
        await sendInvoice(action.entity_id);
        await logAutomation('invoice_sent', action);
        break;

      case 'send_reminder':
        await sendReminder(action.entity_id);
        await logAutomation('reminder_sent', action);
        break;

      // ... more action types
    }
  }
}

// Run every hour
async function checkPaymentStatus() {
  // Check PayPal API
  const paypalPayments = await checkPayPalPayments();
  await matchPaymentsToInvoices(paypalPayments);

  // Check Stripe API
  const stripePayments = await checkStripePayments();
  await matchPaymentsToInvoices(stripePayments);
}

// Run daily
async function generateAutomationSummary() {
  // Send user daily digest
  const actions = await getAutomationLogForToday();
  await sendDailyDigest(actions);
}
```

---

## 🎉 The Result

**Before (Manual):**
```
Freelancer's week:
Monday: Finish 3 projects
Tuesday: Remember to invoice? (forgot)
Wednesday: Send invoices (1 hour work)
Next Monday: Client hasn't paid... send reminder? (forgot)
Week 2: Follow up on payments (30 min)
Week 3: Chase late payments (1 hour, stressful)

Time spent on admin: ~3 hours/week
Stress level: High 😰
```

**After (Automated):**
```
Freelancer's week:
Monday: Finish 3 projects → Mark as "Done" → Done!
System handles:
  • Invoices sent Tuesday 9am
  • Reminders sent automatically
  • Payments detected automatically
  • Projects marked as paid

You get notifications:
  • "Invoice sent ✓"
  • "Payment received! 💰"

Time spent on admin: ~5 minutes/week
Stress level: Zero! 😌
```

---

**Bottom line:**
Set it up once. The system runs itself. You focus on creating amazing work. The app handles getting you paid! 🚀💰✨
