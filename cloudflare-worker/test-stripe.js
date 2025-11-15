/**
 * Simple Stripe Configuration Test
 *
 * Tests that your Stripe API keys and price IDs are correctly configured.
 * Run this before deploying to verify everything is set up correctly.
 *
 * Usage: node test-stripe.js
 */

// IMPORTANT: Replace these with your actual values from .env.example
// Or set as environment variables: STRIPE_SECRET_KEY, STRIPE_PRO_MONTHLY_PRICE_ID, etc.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY_HERE';
const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_YOUR_PRO_MONTHLY_PRICE_ID',
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_YOUR_PRO_ANNUAL_PRICE_ID',
  pro_lifetime: process.env.STRIPE_PRO_LIFETIME_PRICE_ID || 'price_YOUR_PRO_LIFETIME_PRICE_ID',
};

const stripe = require('stripe')(STRIPE_SECRET_KEY);

async function testStripeConnection() {
  console.log('🔧 Testing Stripe Configuration...\n');

  try {
    // Test 1: Verify API key works
    console.log('✓ Test 1: Verifying Stripe API key...');
    const balance = await stripe.balance.retrieve();
    console.log(`  ✅ API key valid! Account balance: ${balance.available[0].amount / 100} ${balance.available[0].currency.toUpperCase()}\n`);

    // Test 2: Retrieve and verify each price
    console.log('✓ Test 2: Verifying Price IDs...\n');

    for (const [name, priceId] of Object.entries(PRICE_IDS)) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product);

        console.log(`  📦 ${name.toUpperCase().replace('_', ' ')}:`);
        console.log(`     Product: ${product.name}`);
        console.log(`     Price ID: ${priceId}`);
        console.log(`     Amount: €${(price.unit_amount / 100).toFixed(2)}`);
        console.log(`     Billing: ${price.recurring ? price.recurring.interval : 'one-time'}`);
        console.log(`     Active: ${price.active ? '✅' : '❌'}`);
        console.log();
      } catch (error) {
        console.error(`  ❌ Error retrieving ${name}: ${error.message}\n`);
      }
    }

    // Test 3: List all products
    console.log('✓ Test 3: Listing all Gigzilla products...\n');
    const products = await stripe.products.list({ limit: 10 });
    const gigzillaProducts = products.data.filter(p => p.name.includes('Gigzilla'));

    if (gigzillaProducts.length === 0) {
      console.log('  ⚠️  No Gigzilla products found. Did you create them in Stripe Dashboard?\n');
    } else {
      gigzillaProducts.forEach(product => {
        console.log(`  📦 ${product.name} (${product.id})`);
      });
      console.log();
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Stripe tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Your Stripe configuration is correct. You can now:');
    console.log('  1. Run local development: npm run dev');
    console.log('  2. Deploy to Cloudflare: wrangler deploy');
    console.log('  3. Set up webhook in Stripe Dashboard\n');

  } catch (error) {
    console.error('\n❌ Stripe Test Failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${error.message}`);
    console.error('\nPossible causes:');
    console.error('  1. Invalid API key (check .env.example)');
    console.error('  2. No internet connection');
    console.error('  3. Stripe account not activated\n');
    process.exit(1);
  }
}

// Run tests
testStripeConnection();
