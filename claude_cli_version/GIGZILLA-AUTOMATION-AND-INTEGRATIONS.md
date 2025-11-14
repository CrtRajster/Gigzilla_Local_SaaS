# Gigzilla - Automation & Integrations

## Table of Contents
1. [Automation Philosophy](#automation-philosophy)
2. [Auto-Invoicing System](#auto-invoicing-system)
3. [Payment Detection](#payment-detection)
4. [Smart Reminder System](#smart-reminder-system)
5. [Multi-Channel Notifications](#multi-channel-notifications)
6. [Profile System](#profile-system)
7. [Template System](#template-system)
8. [Recurring Projects](#recurring-projects)
9. [API Integrations](#api-integrations)

---

## Automation Philosophy

### Core Principle: Set It and Forget It

**User's ideal workflow:**
1. Add project
2. Mark as done when finished
3. Get paid

**Everything else should be automatic:**
- Invoice generation
- Invoice sending
- Payment reminders
- Payment detection
- Status updates
- Notifications

### What to Automate vs What to Keep Manual

**Automate (high value, repetitive):**
- ✅ Invoice sending when project done
- ✅ Payment reminders on schedule
- ✅ Payment detection via APIs
- ✅ Status updates (sent → paid)
- ✅ Reminder cancellation when paid
- ✅ Recurring project creation

**Keep manual (requires judgment):**
- 👤 Project creation (each unique)
- 👤 Client communication (personal touch)
- 👤 Dispute resolution (requires context)
- 👤 Amount negotiation (varies)
- 👤 Custom payment terms (situational)

### Automation Configuration

**Default settings (works for most):**
```
Auto-invoice: Enabled
Invoice delay: 0 days (send immediately when marked "Done")
Invoice template: "Friendly Invoice"
Due date: 14 days from invoice date

Reminders: Enabled
Reminder schedule: [3, 0, -3, -7] days relative to due date
Reminder template: Escalating (gentle → firm)

Payment detection: Enabled
Check frequency: Every 15 minutes
Auto-match: By amount + client email

Notifications: Enabled
Desktop: All events
Email: Payment received only
```

**Customizable per client:**
```
Acme Corp (trusted client):
→ Auto-invoice: Enabled
→ Reminders: Gentle only (7 days, 0, -7)
→ Payment grace: 14 days before escalation

Beta Inc (slow payer):
→ Auto-invoice: Enabled
→ Reminders: Aggressive (1, 0, -1, -3, -7, -14)
→ Payment grace: 0 days
```

---

## Auto-Invoicing System

### Trigger: Project Marked "Done"

**User action:**
```
Pipeline view → Drag "Logo design" from "Working" to "Done"
```

**System response:**
```
┌─────────────────────────────────────────────────┐
│ 🎉 Project completed!                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Logo design for Acme Corp                       │
│ Amount: €1,500                                  │
│                                                 │
│ Send invoice?                                   │
│                                                 │
│ ● Yes, send now                                 │
│   → Uses template: "Friendly Invoice"           │
│   → Due date: 14 days from today                │
│   → Sends to: john@acme.com                     │
│                                                 │
│ ○ Send later                                    │
│   → Saves as draft, I'll send manually          │
│                                                 │
│ ○ Already invoiced                              │
│   → No invoice needed                           │
│                                                 │
│ [Preview] [Cancel] [Confirm]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**If user selects "Yes, send now":**

**Step 1: Generate invoice**
```javascript
const invoice = {
  id: generateUUID(),
  number: getNextInvoiceNumber(), // "INV-2025-042"
  projectId: project.id,
  clientId: project.clientId,
  amount: project.amount,
  currency: project.currency,
  status: "draft",
  createdDate: new Date(),
  dueDate: addDays(new Date(), 14), // 14 days from now
  templateId: settings.defaultInvoiceTemplate,
  sentDate: null,
  paidDate: null
};
```

**Step 2: Generate email from template**
```javascript
const template = templates.find(t => t.id === invoice.templateId);
const client = clients.find(c => c.id === invoice.clientId);
const project = projects.find(p => p.id === invoice.projectId);

const emailContent = template.content
  .replace('{client_name}', client.name)
  .replace('{project_name}', project.name)
  .replace('{amount}', formatCurrency(invoice.amount, invoice.currency))
  .replace('{due_date}', formatDate(invoice.dueDate))
  .replace('{invoice_number}', invoice.number)
  .replace('{your_name}', profile.name)
  .replace('{paypal_link}', profile.paypalEmail)
  .replace('{bank_details}', profile.bankDetails);

// Result:
// "Hi Acme Corp,
//  Thanks for working with me on Logo design!
//  Here's your invoice for €1,500.
//  Payment is due by Jan 29, 2025.
//  ..."
```

**Step 3: Send email**
```javascript
// Using SendGrid API (or user's own SMTP)
await sendEmail({
  to: client.email,
  from: profile.email,
  subject: `Invoice ${invoice.number} - ${project.name}`,
  body: emailContent,
  attachments: [
    generateInvoicePDF(invoice) // PDF attachment
  ]
});

// Update invoice status
invoice.status = "sent";
invoice.sentDate = new Date();
saveInvoice(invoice);
```

**Step 4: Schedule reminders**
```javascript
const reminderSchedule = settings.reminderSchedule; // [3, 0, -3, -7]
const reminders = [];

reminderSchedule.forEach(daysOffset => {
  const reminderDate = addDays(invoice.dueDate, -daysOffset);

  reminders.push({
    id: generateUUID(),
    invoiceId: invoice.id,
    scheduledDate: reminderDate,
    status: "scheduled",
    templateType: getTemplateForOffset(daysOffset)
    // daysOffset: 3 → "gentle"
    // daysOffset: 0 → "due today"
    // daysOffset: -3 → "overdue"
    // daysOffset: -7 → "final notice"
  });
});

saveReminders(reminders);
```

**Step 5: Show confirmation**
```
┌─────────────────────────────────────────────────┐
│ ✅ Invoice sent!                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ Invoice INV-2025-042 sent to john@acme.com     │
│                                                 │
│ • Amount: €1,500                                │
│ • Due: Jan 29, 2025                             │
│ • Reminders scheduled: 4                        │
│                                                 │
│ [View Invoice] [Undo Send]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Invoice Number Generation

**Auto-increment system:**

```javascript
// Settings
const format = "INV-{YYYY}-{###}"; // Customizable
const startNumber = 1;
const resetYearly = true;

// Current state
const currentYear = new Date().getFullYear();
const lastInvoice = getLastInvoice();

let nextNumber;
if (resetYearly && lastInvoice.year < currentYear) {
  nextNumber = startNumber; // Reset to 001 for new year
} else {
  nextNumber = lastInvoice.number + 1;
}

// Generate
const invoiceNumber = format
  .replace('{YYYY}', currentYear)
  .replace('{###}', String(nextNumber).padStart(3, '0'));

// Result: "INV-2025-042"
```

**Alternative formats:**
```
INV-{YYYY}-{###}        → INV-2025-042
INV-{YYYY}{MM}-{###}    → INV-202501-042
INV-{CLIENT}-{###}      → INV-ACME-042
{YYYY}/{###}            → 2025/042
```

### PDF Invoice Generation

**Using library:** `pdfkit` or `jspdf`

```javascript
async function generateInvoicePDF(invoice) {
  const doc = new PDFDocument();
  const client = getClient(invoice.clientId);
  const project = getProject(invoice.projectId);

  // Header
  doc.fontSize(32).text('INVOICE', { align: 'center' });
  doc.moveDown();

  // From (user's profile)
  doc.fontSize(12).text(profile.businessName);
  doc.text(profile.email);
  doc.text(profile.phone);
  doc.moveDown();

  // Invoice details
  doc.text(`Invoice #: ${invoice.number}`);
  doc.text(`Date: ${formatDate(invoice.createdDate)}`);
  doc.text(`Due: ${formatDate(invoice.dueDate)}`);
  doc.moveDown();

  // Bill to
  doc.text('Bill To:');
  doc.text(client.name);
  doc.text(client.email);
  doc.moveDown();

  // Line items table
  doc.text('Description                 Qty    Rate     Amount');
  doc.text('─'.repeat(50));
  doc.text(`${project.name}              1    €${invoice.amount}  €${invoice.amount}`);
  doc.text('─'.repeat(50));
  doc.moveDown();

  // Total
  doc.fontSize(14).text(`Total: €${invoice.amount}`, { align: 'right' });
  doc.moveDown();

  // Payment methods
  doc.fontSize(12).text('Payment Methods:');
  doc.text(`• PayPal: ${profile.paypalEmail}`);
  doc.text(`• Bank: ${profile.bankDetails}`);
  doc.moveDown();

  // Footer
  doc.text('Thank you for your business!', { align: 'center' });

  return doc; // Returns PDF buffer
}
```

---

## Payment Detection

### Automatic Detection via APIs

**PayPal Integration:**

```javascript
// Background job runs every 15 minutes
async function checkPayPalPayments() {
  const pendingInvoices = getInvoices({ status: "sent" });

  // Get PayPal transactions from last 24 hours
  const transactions = await paypal.getTransactions({
    start_date: subDays(new Date(), 1),
    end_date: new Date()
  });

  // Match transactions to invoices
  for (const transaction of transactions) {
    const match = findMatchingInvoice(transaction, pendingInvoices);

    if (match) {
      logPayment({
        invoiceId: match.id,
        amount: transaction.amount.value,
        currency: transaction.amount.currency,
        transactionId: transaction.id,
        method: "paypal",
        receivedDate: transaction.create_time,
        autoDetected: true
      });

      // Trigger payment received workflow
      handlePaymentReceived(match.id);
    }
  }
}

function findMatchingInvoice(transaction, invoices) {
  // Match by amount
  let candidates = invoices.filter(inv =>
    Math.abs(inv.amount - transaction.amount.value) < 0.01 &&
    inv.currency === transaction.amount.currency
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple matches - try to match by client email
  const payerEmail = transaction.payer.email_address;
  const emailMatch = candidates.find(inv => {
    const client = getClient(inv.clientId);
    return client.email.toLowerCase() === payerEmail.toLowerCase();
  });

  if (emailMatch) return emailMatch;

  // Still ambiguous - notify user to manually confirm
  notifyAmbiguousPayment(transaction, candidates);
  return null;
}
```

**Stripe Integration:**

```javascript
// Webhook handler (receives events in real-time)
app.post('/webhook/stripe-payments', async (req, res) => {
  const event = req.body;

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    // Extract metadata (should include invoice ID if user paid via Stripe link)
    const invoiceId = paymentIntent.metadata.invoice_id;

    if (invoiceId) {
      // Direct match via metadata
      logPayment({
        invoiceId: invoiceId,
        amount: paymentIntent.amount / 100, // Stripe uses cents
        currency: paymentIntent.currency.toUpperCase(),
        transactionId: paymentIntent.id,
        method: "stripe",
        receivedDate: new Date(),
        autoDetected: true
      });

      handlePaymentReceived(invoiceId);
    } else {
      // Try to match by amount and customer email
      const customer = await stripe.customers.retrieve(paymentIntent.customer);
      const match = findMatchingInvoice({
        amount: { value: paymentIntent.amount / 100, currency: paymentIntent.currency },
        payer: { email_address: customer.email }
      }, getInvoices({ status: "sent" }));

      if (match) {
        logPayment({...});
        handlePaymentReceived(match.id);
      }
    }
  }

  res.json({ received: true });
});
```

**Bank Transfer (Manual with Pattern Recognition):**

```javascript
// User imports bank statement CSV
async function importBankStatement(csvFile) {
  const transactions = parseCSV(csvFile);
  const pendingInvoices = getInvoices({ status: "sent" });

  const suggestions = [];

  for (const transaction of transactions) {
    // Only incoming payments
    if (transaction.amount <= 0) continue;

    // Try to match by amount
    const amountMatch = pendingInvoices.filter(inv =>
      Math.abs(inv.amount - transaction.amount) < 0.01
    );

    if (amountMatch.length === 1) {
      suggestions.push({
        transaction: transaction,
        invoice: amountMatch[0],
        confidence: "high"
      });
    } else if (amountMatch.length > 1) {
      // Check reference field for invoice number
      const refMatch = amountMatch.find(inv =>
        transaction.reference.includes(inv.number)
      );

      if (refMatch) {
        suggestions.push({
          transaction: transaction,
          invoice: refMatch,
          confidence: "high"
        });
      } else {
        suggestions.push({
          transaction: transaction,
          invoices: amountMatch,
          confidence: "medium"
        });
      }
    }
  }

  // Show suggestions to user for confirmation
  showPaymentSuggestions(suggestions);
}
```

### Payment Received Workflow

**Automatic actions when payment detected:**

```javascript
async function handlePaymentReceived(invoiceId) {
  const invoice = getInvoice(invoiceId);
  const project = getProject(invoice.projectId);
  const client = getClient(invoice.clientId);

  // 1. Update invoice status
  invoice.status = "paid";
  invoice.paidDate = new Date();
  saveInvoice(invoice);

  // 2. Update project status
  if (project.status === "done") {
    project.status = "paid";
    saveProject(project);
  }

  // 3. Cancel scheduled reminders
  const reminders = getReminders({
    invoiceId: invoiceId,
    status: "scheduled"
  });

  reminders.forEach(reminder => {
    reminder.status = "cancelled";
    reminder.cancelReason = "Payment received";
    saveReminder(reminder);
  });

  // 4. Send notification to user
  notify({
    type: "payment_received",
    title: "Payment received!",
    message: `€${invoice.amount} from ${client.name}`,
    channels: settings.notifications.paymentReceived,
    // channels might be: ["desktop", "whatsapp", "email"]
  });

  // 5. Log in activity feed
  logActivity({
    type: "payment_received",
    invoiceId: invoiceId,
    projectId: project.id,
    clientId: client.id,
    amount: invoice.amount,
    timestamp: new Date()
  });

  // 6. Update client payment history
  updateClientPaymentHistory(client.id, {
    invoiceId: invoiceId,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidDate,
    daysLate: calculateDaysLate(invoice.dueDate, invoice.paidDate)
  });
}
```

### Partial Payment Handling

```javascript
function logPayment(payment) {
  const invoice = getInvoice(payment.invoiceId);
  const existingPayments = getPayments({ invoiceId: invoice.id });

  // Calculate total paid
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;

  // Save payment
  savePayment(payment);

  // Update invoice
  if (totalPaid >= invoice.amount) {
    // Fully paid
    invoice.status = "paid";
    invoice.paidDate = new Date();
    handlePaymentReceived(invoice.id); // Trigger full workflow
  } else {
    // Partially paid
    invoice.status = "partial";
    invoice.partialAmount = totalPaid;
    invoice.remainingAmount = invoice.amount - totalPaid;

    // Update reminders to reflect partial payment
    updateReminderAmounts(invoice.id, invoice.remainingAmount);

    // Notify user
    notify({
      type: "partial_payment_received",
      message: `Partial payment: €${payment.amount} from ${client.name}. Remaining: €${invoice.remainingAmount}`
    });
  }

  saveInvoice(invoice);
}
```

---

## Smart Reminder System

### Reminder Scheduling

**Default schedule (relative to due date):**
```
Due date: Jan 15, 2025

Reminders:
• Jan 12 (3 days before) - "Gentle Reminder"
• Jan 15 (due date) - "Friendly Notice"
• Jan 18 (3 days after) - "Overdue Notice"
• Jan 22 (7 days after) - "Final Notice"
```

**Configuration:**
```javascript
const reminderSchedule = {
  standard: [3, 0, -3, -7], // Most clients
  gentle: [7, 0, -7], // Trusted clients
  aggressive: [1, 0, -1, -3, -7, -14], // Problematic payers
  minimal: [0], // Due date only
  none: [] // No reminders
};

// Per-client override
clients[clientId].reminderSchedule = "gentle";
```

### Reminder Execution

**Background job (runs every hour):**

```javascript
async function processReminders() {
  const now = new Date();
  const dueReminders = getReminders({
    status: "scheduled",
    scheduledDate: { $lte: now }
  });

  for (const reminder of dueReminders) {
    await sendReminder(reminder);
  }
}

async function sendReminder(reminder) {
  const invoice = getInvoice(reminder.invoiceId);

  // Double-check invoice not already paid
  if (invoice.status === "paid") {
    reminder.status = "cancelled";
    reminder.cancelReason = "Invoice paid before reminder sent";
    saveReminder(reminder);
    return;
  }

  const project = getProject(invoice.projectId);
  const client = getClient(invoice.clientId);
  const template = getReminderTemplate(reminder.templateType);

  // Generate message from template
  const message = template.content
    .replace('{client_name}', client.name)
    .replace('{invoice_number}', invoice.number)
    .replace('{amount}', formatCurrency(invoice.amount, invoice.currency))
    .replace('{due_date}', formatDate(invoice.dueDate))
    .replace('{days_overdue}', calculateDaysOverdue(invoice.dueDate))
    .replace('{payment_link}', generatePaymentLink(invoice))
    .replace('{your_name}', profile.name);

  // Send via configured channels
  const channels = settings.notifications.paymentReminder || ["email"];

  for (const channel of channels) {
    await sendNotification({
      channel: channel,
      to: getClientContact(client, channel),
      subject: `Payment reminder - Invoice ${invoice.number}`,
      message: message
    });
  }

  // Update reminder status
  reminder.status = "sent";
  reminder.sentDate = new Date();
  saveReminder(reminder);

  // Log activity
  logActivity({
    type: "reminder_sent",
    invoiceId: invoice.id,
    reminderType: reminder.templateType,
    channel: channels.join(", "),
    timestamp: new Date()
  });
}
```

### Client Payment History Tracking

**Track reliability for smart reminder adjustment:**

```javascript
function updateClientPaymentHistory(clientId, paymentRecord) {
  const client = getClient(clientId);

  if (!client.paymentHistory) {
    client.paymentHistory = [];
  }

  client.paymentHistory.push(paymentRecord);

  // Calculate metrics
  const totalInvoices = client.paymentHistory.length;
  const paidOnTime = client.paymentHistory.filter(p => p.daysLate <= 0).length;
  const avgDaysLate = average(client.paymentHistory.map(p => p.daysLate));

  client.paymentMetrics = {
    totalInvoices: totalInvoices,
    paidOnTime: paidOnTime,
    onTimeRate: (paidOnTime / totalInvoices) * 100,
    avgDaysLate: avgDaysLate
  };

  // Auto-adjust reminder schedule based on history
  if (client.paymentMetrics.onTimeRate >= 80) {
    // Trusted client
    client.reminderSchedule = "gentle";
  } else if (client.paymentMetrics.onTimeRate <= 50) {
    // Problematic payer
    client.reminderSchedule = "aggressive";
  } else {
    // Standard
    client.reminderSchedule = "standard";
  }

  saveClient(client);
}
```

### Reminder Templates

**Template structure:**

```javascript
const reminderTemplates = {
  gentle: {
    id: "gentle",
    name: "Gentle Reminder",
    whenToUse: "3 days before due date",
    subject: "Friendly reminder - Invoice due in 3 days",
    content: `Hi {client_name},

Just a friendly reminder that invoice #{invoice_number} for {project_name} is due in 3 days ({due_date}).

Amount: {amount}

If you've already sent payment, please disregard this message!

Thanks,
{your_name}`
  },

  dueToday: {
    id: "dueToday",
    name: "Due Today Notice",
    whenToUse: "On due date",
    subject: "Invoice due today - #{invoice_number}",
    content: `Hi {client_name},

Invoice #{invoice_number} for {amount} is due today.

Payment link: {payment_link}

Let me know if you have any questions!

Thanks,
{your_name}`
  },

  overdue: {
    id: "overdue",
    name: "Overdue Notice",
    whenToUse: "3 days after due date",
    subject: "Payment overdue - Invoice #{invoice_number}",
    content: `Hi {client_name},

Invoice #{invoice_number} for {amount} was due on {due_date} and is now {days_overdue} days overdue.

Could you please arrange payment at your earliest convenience?

If there's an issue with payment, please let me know.

Payment link: {payment_link}

Thanks,
{your_name}`
  },

  finalNotice: {
    id: "finalNotice",
    name: "Final Notice",
    whenToUse: "7+ days after due date",
    subject: "FINAL NOTICE - Invoice #{invoice_number}",
    content: `Hi {client_name},

Invoice #{invoice_number} for {amount} is now {days_overdue} days overdue.

Please arrange payment immediately or contact me to discuss payment arrangements.

This is my final reminder. If payment is not received within 3 business days, I may need to pause our working relationship.

Payment link: {payment_link}

{your_name}`
  }
};
```

---

## Multi-Channel Notifications

### Notification System Architecture

**Channels:**
1. Desktop (native OS notifications)
2. Email (SendGrid or SMTP)
3. SMS (Twilio)
4. WhatsApp (WhatsApp Business API)

**Event types:**
```javascript
const notificationEvents = {
  payment_received: {
    defaultChannels: ["desktop", "whatsapp"],
    priority: "high",
    customizable: true
  },
  invoice_sent: {
    defaultChannels: ["desktop"],
    priority: "low",
    customizable: true
  },
  payment_overdue: {
    defaultChannels: ["desktop", "email"],
    priority: "medium",
    customizable: true
  },
  project_deadline: {
    defaultChannels: ["desktop"],
    priority: "medium",
    customizable: true
  },
  reminder_sent: {
    defaultChannels: [], // No self-notification by default
    priority: "low",
    customizable: true
  }
};
```

### Desktop Notifications

```javascript
// Using Electron's built-in notification system
function sendDesktopNotification(notification) {
  const { Notification } = require('electron');

  new Notification({
    title: notification.title,
    body: notification.message,
    icon: path.join(__dirname, 'assets/icon.png'),
    sound: 'default', // OS notification sound
    urgency: notification.priority === "high" ? "critical" : "normal"
  }).show();
}

// Example
sendDesktopNotification({
  title: "Payment received!",
  message: "€1,500 from Acme Corp",
  priority: "high"
});

// OS shows:
// ┌───────────────────────────────────┐
// │ 💰 Gigzilla                       │
// │ Payment received!                 │
// │ €1,500 from Acme Corp             │
// └───────────────────────────────────┘
```

### Email Notifications

**Using SendGrid:**

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmailNotification(notification, recipient) {
  await sgMail.send({
    to: recipient,
    from: 'notifications@gigzilla.app',
    subject: notification.title,
    text: notification.message,
    html: formatEmailHTML(notification)
  });
}

function formatEmailHTML(notification) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${notification.title}</h2>
      <p>${notification.message}</p>
      ${notification.actionUrl ? `
        <a href="${notification.actionUrl}"
           style="display: inline-block; padding: 12px 24px;
                  background: #3B82F6; color: white;
                  text-decoration: none; border-radius: 6px;">
          ${notification.actionText || 'View Details'}
        </a>
      ` : ''}
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">
        Sent by Gigzilla - Your freelance business manager
      </p>
    </div>
  `;
}
```

### SMS Notifications

**Using Twilio:**

```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMSNotification(notification, phoneNumber) {
  await client.messages.create({
    body: `${notification.title}\n\n${notification.message}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
}

// Example
sendSMSNotification({
  title: "Payment received!",
  message: "€1,500 from Acme Corp for Invoice INV-042"
}, "+1234567890");

// User receives SMS:
// "Payment received!
//
//  €1,500 from Acme Corp for Invoice INV-042"
```

### WhatsApp Notifications

**Using WhatsApp Business API:**

```javascript
async function sendWhatsAppNotification(notification, phoneNumber) {
  // Requires WhatsApp Business API access
  const response = await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: {
        body: `*${notification.title}*\n\n${notification.message}`
      }
    })
  });

  return response.json();
}

// For voice messages (advanced)
async function sendWhatsAppVoiceReminder(voiceFile, phoneNumber) {
  const mediaId = await uploadVoiceMessage(voiceFile);

  await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "audio",
      audio: {
        id: mediaId
      }
    })
  });
}
```

### Notification Settings UI

```
Settings → Notifications

┌─────────────────────────────────────────────────────────────┐
│ 🔔 Notification Settings                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Channels:                                                   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ✅ Desktop notifications                             │   │
│ │ ✅ Email: alex@designstudio.com           [Edit]    │   │
│ │ ✅ SMS: +1 (555) 123-4567                [Edit]    │   │
│ │ ✅ WhatsApp: +1 (555) 123-4567           [Edit]    │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Notification preferences:                                   │
│                                                             │
│ Payment received                                            │
│ ☑️ Desktop  ☑️ WhatsApp  ☐ Email  ☐ SMS                    │
│                                                             │
│ Invoice sent                                                │
│ ☑️ Desktop  ☐ WhatsApp  ☐ Email  ☐ SMS                    │
│                                                             │
│ Payment overdue                                             │
│ ☑️ Desktop  ☐ WhatsApp  ☑️ Email  ☐ SMS                    │
│                                                             │
│ Project deadline approaching                                │
│ ☑️ Desktop  ☑️ WhatsApp  ☐ Email  ☐ SMS                    │
│                                                             │
│ Reminder sent to client                                     │
│ ☐ Desktop  ☐ WhatsApp  ☐ Email  ☐ SMS                    │
│ (Usually you don't need to know when reminders are sent)   │
│                                                             │
│ Quiet hours:                                                │
│ ☑️ Don't send notifications between [10:00 PM] and [8:00 AM]│
│                                                             │
│ [Save Settings]                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Profile System

### Profile as Central Configuration

**Settings → Profile:**

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 Profile                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │     [Upload Photo]                                   │   │
│ │         🧑                                           │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Personal Information                                        │
│ ─────────────────────────────────────────────────────────  │
│ Full name                                                   │
│ [Alex Designer_______________________________]             │
│                                                             │
│ Business name (optional)                                    │
│ [Alex Design Studio______________________]                │
│                                                             │
│ Email                                                       │
│ [alex@designstudio.com_____________________]               │
│                                                             │
│ Phone                                                       │
│ [+1 (555) 123-4567_________________________]               │
│                                                             │
│ Website (optional)                                          │
│ [https://alexdesign.studio__________________]              │
│                                                             │
│ Payment Methods                                             │
│ ─────────────────────────────────────────────────────────  │
│ PayPal email                                                │
│ [alex@designstudio.com_____________________]               │
│ [Connect PayPal] ✅ Connected                              │
│                                                             │
│ Bank details (for invoices)                                 │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Bank: Chase                                           │ │
│ │ IBAN: US12 3456 7890 1234 5678 90                    │ │
│ │ SWIFT: CHASUS33                                       │ │
│ └───────────────────────────────────────────────────────┘ │
│ [Edit]                                                      │
│                                                             │
│ Stripe (for accepting payments)                             │
│ [Connect Stripe] ⚠️ Not connected                          │
│                                                             │
│ Invoice Branding                                            │
│ ─────────────────────────────────────────────────────────  │
│ Logo                                                        │
│ [Upload Logo] Current: logo.png (200x60)                   │
│                                                             │
│ Primary color                                               │
│ [#3B82F6] 🎨                                               │
│                                                             │
│ Invoice footer text                                         │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Thank you for your business!                          │ │
│ │ For questions, email alex@designstudio.com            │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ Signature                                                   │
│ ─────────────────────────────────────────────────────────  │
│ Email signature                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Best regards,                                         │ │
│ │ Alex Designer                                         │ │
│ │ Alex Design Studio                                    │ │
│ │ alex@designstudio.com                                 │ │
│ │ https://alexdesign.studio                             │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ [Save Profile]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
1. **Variable auto-population:** Profile data fills templates automatically
2. **Centralized config:** Change once, applies everywhere
3. **Professional branding:** Logo and colors on all invoices
4. **Easy connections:** OAuth buttons for services
5. **Secure storage:** AES-256 encryption for sensitive data

---

## Template System

### Template Types

**1. Invoice message templates**
**2. Reminder templates** (escalating)
**3. Voice message templates**

See `ESSENTIAL-MISSING-FEATURES.md` for complete template UIs.

### Variable Substitution System

```javascript
const availableVariables = {
  // Client variables
  '{client_name}': () => client.name,
  '{client_email}': () => client.email,
  '{client_phone}': () => client.phone,

  // Project variables
  '{project_name}': () => project.name,
  '{project_deadline}': () => formatDate(project.deadline),

  // Invoice variables
  '{invoice_number}': () => invoice.number,
  '{amount}': () => formatCurrency(invoice.amount, invoice.currency),
  '{due_date}': () => formatDate(invoice.dueDate),
  '{days_overdue}': () => calculateDaysOverdue(invoice.dueDate),

  // User (profile) variables
  '{your_name}': () => profile.name,
  '{your_business}': () => profile.businessName,
  '{your_email}': () => profile.email,
  '{your_phone}': () => profile.phone,
  '{paypal_link}': () => `https://paypal.me/${profile.paypalEmail}`,
  '{bank_details}': () => profile.bankDetails,

  // Utility variables
  '{payment_link}': () => generatePaymentLink(invoice),
  '{today}': () => formatDate(new Date()),
  '{invoice_pdf}': () => generateInvoicePDF(invoice)
};

function replaceVariables(template, context) {
  let result = template;

  for (const [variable, getValue] of Object.entries(availableVariables)) {
    if (result.includes(variable)) {
      const value = getValue(context);
      result = result.replace(new RegExp(variable, 'g'), value);
    }
  }

  return result;
}
```

---

## Recurring Projects

### Setup Recurring Project Template

```
Settings → Automation → Recurring Projects → [+ New]

┌─────────────────────────────────────────────────┐
│ 🔄 New Recurring Project                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Project template name                           │
│ [Monthly social media pack________________]    │
│                                                 │
│ Client                                          │
│ [Zeta Digital ▼]                               │
│                                                 │
│ Amount                                          │
│ [€] [800___]                                   │
│                                                 │
│ Frequency                                       │
│ ● Monthly  ○ Weekly  ○ Quarterly  ○ Custom    │
│                                                 │
│ Start date                                      │
│ [1st of every month ▼]                         │
│                                                 │
│ Auto-invoice                                    │
│ ☑️ Send invoice automatically                  │
│ On: [5th of every month ▼]                     │
│ Template: [Friendly Invoice ▼]                 │
│                                                 │
│ Auto-reminders                                  │
│ ☑️ Send reminders if unpaid                    │
│ Schedule: [Standard ▼]                         │
│                                                 │
│ Notify me                                       │
│ ☑️ When project created                        │
│ ☑️ When invoice sent                           │
│ ☑️ When payment received                       │
│                                                 │
│ Notes (optional)                                │
│ ┌───────────────────────────────────────────┐ │
│ │ Instagram: 12 posts                       │ │
│ │ Facebook: 8 posts                         │ │
│ │ Stories: 4 per week                       │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [Create Recurring Template]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Automatic Execution

```javascript
// Background job runs daily at midnight
async function processRecurringProjects() {
  const templates = getRecurringProjectTemplates({ status: "active" });
  const today = new Date();

  for (const template of templates) {
    if (shouldCreateProject(template, today)) {
      await createProjectFromTemplate(template, today);
    }
  }
}

function shouldCreateProject(template, date) {
  const lastCreated = template.lastProjectCreated;

  if (template.frequency === "monthly") {
    return date.getDate() === template.dayOfMonth &&
           (!lastCreated || lastCreated.getMonth() !== date.getMonth());
  }

  if (template.frequency === "weekly") {
    return date.getDay() === template.dayOfWeek &&
           (!lastCreated || daysBetween(lastCreated, date) >= 7);
  }

  // Similar logic for quarterly, custom
}

async function createProjectFromTemplate(template, date) {
  const project = {
    id: generateUUID(),
    name: `${template.projectName} - ${formatDate(date, 'MMMM YYYY')}`,
    clientId: template.clientId,
    amount: template.amount,
    currency: template.currency,
    status: "working", // Or "to start"
    createdDate: date,
    recurring: true,
    recurringTemplateId: template.id,
    notes: template.notes
  };

  saveProject(project);

  // Update template
  template.lastProjectCreated = date;
  template.totalProjectsCreated = (template.totalProjectsCreated || 0) + 1;
  saveRecurringTemplate(template);

  // Notify user if requested
  if (template.notifyOnCreate) {
    notify({
      type: "recurring_project_created",
      message: `Recurring project created: ${project.name} for ${getClient(template.clientId).name}`
    });
  }

  // Schedule auto-invoice if configured
  if (template.autoInvoice) {
    scheduleAutoInvoice(project.id, template.autoInvoiceDate);
  }
}
```

---

## API Integrations

### PayPal API Integration

**OAuth Setup:**
```javascript
// User clicks "Connect PayPal" in Settings
function initiatePayPalOAuth() {
  const authUrl = `https://www.paypal.com/connect?` +
    `response_type=code&` +
    `client_id=${PAYPAL_CLIENT_ID}&` +
    `scope=openid profile email https://uri.paypal.com/services/invoicing https://uri.paypal.com/services/reporting/search/read&` +
    `redirect_uri=${REDIRECT_URI}`;

  shell.openExternal(authUrl);
}

// Callback handler
async function handlePayPalCallback(code) {
  // Exchange code for access token
  const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64Encode(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=authorization_code&code=${code}`
  });

  const { access_token, refresh_token } = await response.json();

  // Store tokens securely
  saveConnection({
    type: 'paypal',
    accessToken: encrypt(access_token),
    refreshToken: encrypt(refresh_token),
    connectedAt: new Date()
  });
}
```

**Transaction Fetching:**
```javascript
async function getPayPalTransactions(startDate, endDate) {
  const connection = getConnection('paypal');
  const accessToken = decrypt(connection.accessToken);

  const response = await fetch(
    `https://api.paypal.com/v1/reporting/transactions?` +
    `start_date=${startDate.toISOString()}&` +
    `end_date=${endDate.toISOString()}&` +
    `fields=all`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.transaction_details;
}
```

### Stripe API Integration

**Similar OAuth flow as PayPal**

**Webhook setup:**
```javascript
// Server endpoint (same server as license validation)
app.post('/webhook/stripe-payments/:userId', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = getUserWebhookSecret(req.params.userId);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Forward event to user's desktop app via webhook callback URL
  // (User's app registers a local webhook endpoint when online)
  const userCallbackUrl = getUserCallbackUrl(req.params.userId);

  if (userCallbackUrl) {
    await fetch(userCallbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } else {
    // Queue for later delivery when user's app comes online
    queueEvent(req.params.userId, event);
  }

  res.json({ received: true });
});
```

### Twilio API (SMS)

```javascript
async function sendSMS(to, message) {
  const connection = getConnection('twilio');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${connection.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Encode(connection.accountSid + ':' + connection.authToken)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: connection.phoneNumber,
        Body: message
      })
    }
  );

  return response.json();
}
```

### WhatsApp Business API

**Requires Facebook Business verification**

```javascript
async function sendWhatsAppMessage(to, message) {
  const connection = getConnection('whatsapp');

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${connection.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      })
    }
  );

  return response.json();
}
```

---

**Next:** See `GIGZILLA-TECHNICAL-SPEC.md` for complete implementation details including code structure, database schema, API endpoints, and deployment configuration.
