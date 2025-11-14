/**
 * Gigzilla Desktop App - Authentication Manager
 *
 * Zero-storage authentication using Stripe + JWT tokens
 * All user data stays local on their machine
 */

const https = require('https');
const { shell } = require('electron');

const API_URL = 'https://gigzilla-api.YOUR-USERNAME.workers.dev'; // CHANGE THIS!
const STRIPE_CHECKOUT_URL = 'https://gigzilla.site/subscribe'; // Your landing page

/**
 * Check if user has valid subscription
 * Returns: { isValid: boolean, status: string, token: string|null }
 */
async function checkSubscription(email) {
  try {
    // First, check for cached token
    const cachedToken = await electronAPI.storeGet('auth_token');
    const tokenExpiry = await electronAPI.storeGet('token_expiry');

    if (cachedToken && tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      const now = new Date();

      // Token still valid (within 7-day grace period)
      if (expiryDate > now) {
        console.log('Using cached token (offline mode)');
        return {
          isValid: true,
          status: 'active',
          token: cachedToken,
          offline: true
        };
      }
    }

    // Token expired or doesn't exist - verify with API
    console.log('Verifying subscription online for:', email);

    const response = await fetch(`${API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.hasSubscription) {
      // Store token and expiry locally
      await electronAPI.storeSet('auth_token', data.token);
      await electronAPI.storeSet('token_expiry', data.validUntil);
      await electronAPI.storeSet('user_email', email);
      await electronAPI.storeSet('subscription_status', data.status);

      return {
        isValid: true,
        status: data.status,
        plan: data.plan,
        token: data.token,
        offline: false
      };
    } else {
      // No valid subscription
      return {
        isValid: false,
        status: 'none',
        reason: data.reason,
        message: data.message,
        token: null
      };
    }

  } catch (error) {
    console.error('Subscription check error:', error);

    // If offline and we have a cached token, use it
    const cachedToken = await electronAPI.storeGet('auth_token');
    const tokenExpiry = await electronAPI.storeGet('token_expiry');

    if (cachedToken && tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      const now = new Date();

      if (expiryDate > now) {
        return {
          isValid: true,
          status: 'active',
          token: cachedToken,
          offline: true,
          error: 'Using cached token (no internet connection)'
        };
      }
    }

    throw error;
  }
}

/**
 * Start free trial (opens Stripe Checkout in browser)
 */
async function startTrial(email) {
  try {
    // Store email for later verification
    await electronAPI.storeSet('pending_email', email);

    // Generate referral code from email
    const referralCode = generateReferralCode(email);

    // Open Stripe Checkout page in browser
    const checkoutUrl = `${STRIPE_CHECKOUT_URL}?email=${encodeURIComponent(email)}&plan=monthly`;
    await shell.openExternal(checkoutUrl);

    return {
      success: true,
      message: 'Opening subscription page in your browser...'
    };

  } catch (error) {
    console.error('Start trial error:', error);
    throw error;
  }
}

/**
 * Subscribe (opens Stripe Checkout)
 */
async function subscribe(email, plan = 'monthly') {
  try {
    const checkoutUrl = `${STRIPE_CHECKOUT_URL}?email=${encodeURIComponent(email)}&plan=${plan}`;
    await shell.openExternal(checkoutUrl);

    return {
      success: true,
      message: 'Opening subscription page...'
    };

  } catch (error) {
    console.error('Subscribe error:', error);
    throw error;
  }
}

/**
 * Refresh subscription status (after user subscribes)
 */
async function refreshSubscription() {
  try {
    const email = await electronAPI.storeGet('pending_email') ||
                  await electronAPI.storeGet('user_email');

    if (!email) {
      throw new Error('No email found. Please enter your email.');
    }

    const result = await checkSubscription(email);

    if (result.isValid) {
      // Clear pending email
      await electronAPI.storeDelete('pending_email');

      return {
        success: true,
        status: result.status,
        message: 'Subscription activated! 🎉'
      };
    } else {
      return {
        success: false,
        message: result.message || 'No active subscription found.'
      };
    }

  } catch (error) {
    console.error('Refresh error:', error);
    throw error;
  }
}

/**
 * Get referral statistics
 */
async function getReferralStats(email) {
  try {
    const response = await fetch(`${API_URL}/referral-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    return {
      totalReferrals: data.total_referrals || 0,
      referralCode: data.referral_code,
      creditsEarned: data.credits_earned || 0,
      referralLink: `https://gigzilla.site?ref=${data.referral_code}`
    };

  } catch (error) {
    console.error('Get referral stats error:', error);
    return {
      totalReferrals: 0,
      referralCode: generateReferralCode(email),
      creditsEarned: 0,
      referralLink: `https://gigzilla.site?ref=${generateReferralCode(email)}`
    };
  }
}

/**
 * Generate referral code from email (matches backend logic)
 */
function generateReferralCode(email) {
  try {
    const encoded = Buffer.from(email.toLowerCase().trim()).toString('base64');
    return encoded.substring(0, 10).toUpperCase();
  } catch (e) {
    return email.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}

/**
 * Log out (clear local data)
 */
async function logout() {
  await electronAPI.storeDelete('auth_token');
  await electronAPI.storeDelete('token_expiry');
  await electronAPI.storeDelete('user_email');
  await electronAPI.storeDelete('subscription_status');
  await electronAPI.storeDelete('pending_email');

  return { success: true };
}

/**
 * Get current user info (from local storage)
 */
async function getCurrentUser() {
  const email = await electronAPI.storeGet('user_email');
  const status = await electronAPI.storeGet('subscription_status');
  const tokenExpiry = await electronAPI.storeGet('token_expiry');

  if (!email) {
    return null;
  }

  return {
    email,
    status,
    tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null
  };
}

// Export functions
module.exports = {
  checkSubscription,
  startTrial,
  subscribe,
  refreshSubscription,
  getReferralStats,
  logout,
  getCurrentUser,
  generateReferralCode
};
