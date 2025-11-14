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
        const subscriptionId = session.subscription;

        // Get subscription to determine tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Map price ID to tier (you'll set these in Stripe)
        let tier = 'pro';
        if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          tier = 'business';
        }

        await activateLicense(customerEmail, customerId, subscriptionId, tier);
        console.log(`License activated for ${customerEmail}`);
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
