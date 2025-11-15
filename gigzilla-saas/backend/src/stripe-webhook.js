import Stripe from 'stripe';
import { activateLicense, deactivateLicense } from './license-validation.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email;
        const customerId = session.customer;
        const mode = session.mode;

        // Handle lifetime (one-time payment) vs subscription
        if (mode === 'payment') {
          // Lifetime purchase - one-time payment
          const billingPeriod = session.metadata?.billing_period || 'lifetime';
          const tier = session.metadata?.tier || 'pro';

          console.log(`[WEBHOOK] Lifetime purchase detected for ${customerEmail}`);

          // Activate license with lifetime access (null expiration or very long date)
          await activateLicense(customerEmail, customerId, `lifetime_${customerId}`, tier, billingPeriod);
          console.log(`Lifetime license activated for ${customerEmail}`);
        } else {
          // Subscription purchase (monthly/annual)
          const subscriptionId = session.subscription;

          // Get subscription to determine tier
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;

          // Default to 'pro' tier for all subscriptions
          const tier = 'pro';

          await activateLicense(customerEmail, customerId, subscriptionId, tier);
          console.log(`Subscription license activated for ${customerEmail}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email;

        if (subscription.status === 'active') {
          const priceId = subscription.items.data[0].price.id;
          let tier = 'pro';
          if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
            tier = 'business';
          }
          await activateLicense(email, customerId, subscription.id, tier);
        } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
          await deactivateLicense(subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await deactivateLicense(subscription.id);
        console.log(`License deactivated for subscription ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
