/**
 * Upgrade Flow
 * Handles Stripe Checkout integration for Gigzilla Pro subscription
 */

class UpgradeFlow {
  constructor() {
    this.API_URL = process.env.API_URL || 'http://localhost:3000';
    this.selectedPeriod = 'monthly';
    this.isProcessing = false;
  }

  /**
   * Render upgrade pricing UI
   */
  render() {
    const monthlyPrice = 9;
    const annualPrice = 90;
    const monthlySavings = Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100);

    return `
      <div class="upgrade-container">
        <div class="upgrade-header">
          <h1 class="upgrade-title">Upgrade to Gigzilla Pro</h1>
          <p class="upgrade-subtitle">Unlock unlimited projects, clients, and premium features</p>
        </div>

        <!-- Billing Toggle -->
        <div class="billing-toggle">
          <button class="billing-btn ${this.selectedPeriod === 'monthly' ? 'active' : ''}"
                  onclick="upgradeFlow.selectPeriod('monthly')">
            Monthly
          </button>
          <button class="billing-btn ${this.selectedPeriod === 'annual' ? 'active' : ''}"
                  onclick="upgradeFlow.selectPeriod('annual')">
            Annual
            <span class="save-badge">Save ${monthlySavings}%</span>
          </button>
        </div>

        <!-- Single Pricing Card -->
        <div class="pricing-grid-single">
          <div class="pricing-card pricing-card-featured">
            <div class="popular-badge">BEST VALUE</div>
            <div class="plan-header">
              <h3 class="plan-name">Gigzilla Pro</h3>
              <div class="plan-price">
                €${this.selectedPeriod === 'monthly' ? monthlyPrice : Math.round(annualPrice / 12)}
                <span class="price-period">/mo</span>
              </div>
              ${this.selectedPeriod === 'annual' ? `<div class="billing-note">Billed €${annualPrice}/year</div>` : ''}
              ${this.selectedPeriod === 'monthly' ? `<div class="billing-note">Billed monthly</div>` : ''}
            </div>
            <div class="plan-features">
              <div class="feature">✓ Unlimited projects</div>
              <div class="feature">✓ Unlimited clients</div>
              <div class="feature">✓ Invoice management</div>
              <div class="feature">✓ Payment tracking</div>
              <div class="feature">✓ Revenue analytics</div>
              <div class="feature">✓ Email support</div>
              <div class="feature">✓ Up to 3 devices</div>
              <div class="feature">✓ All future updates</div>
            </div>
            <button class="btn btn-primary btn-lg"
                    onclick="upgradeFlow.startCheckout('${this.selectedPeriod}')"
                    style="margin-top: 24px; width: 100%; padding: 16px; font-size: 16px; font-weight: 600;">
              ${this.selectedPeriod === 'monthly' ? `Subscribe for €${monthlyPrice}/mo →` : `Subscribe for €${annualPrice}/year →`}
            </button>
            ${this.selectedPeriod === 'annual' ? `
              <div style="text-align: center; margin-top: 12px; font-size: 13px; color: var(--gray-500);">
                That's just €${Math.round(annualPrice / 12)}/month, save €${monthlyPrice * 12 - annualPrice}/year
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Features Comparison -->
        <div class="features-comparison">
          <h3 style="text-align: center; margin-bottom: 24px;">Why upgrade?</h3>
          <div class="comparison-grid">
            <div class="comparison-item">
              <div class="comparison-icon">📊</div>
              <div class="comparison-title">Unlimited Everything</div>
              <div class="comparison-desc">No limits on projects, clients, or invoices</div>
            </div>
            <div class="comparison-item">
              <div class="comparison-icon">💳</div>
              <div class="comparison-title">Payment Tracking</div>
              <div class="comparison-desc">Track invoices, payments, and revenue</div>
            </div>
            <div class="comparison-item">
              <div class="comparison-icon">📱</div>
              <div class="comparison-title">Multi-Device Sync</div>
              <div class="comparison-desc">Use Gigzilla on multiple computers</div>
            </div>
            <div class="comparison-item">
              <div class="comparison-icon">🔒</div>
              <div class="comparison-title">Secure & Private</div>
              <div class="comparison-desc">All your data stays on your machine</div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        ${this.isProcessing ? `
          <div class="checkout-loading">
            <div class="spinner"></div>
            <div>Opening Stripe Checkout...</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Select billing period (monthly/annual)
   */
  selectPeriod(period) {
    this.selectedPeriod = period;
    this.refreshUI();
  }

  /**
   * Start Stripe Checkout flow
   */
  async startCheckout(billingPeriod) {
    try {
      this.isProcessing = true;
      this.refreshUI();

      // Get user email
      const userEmail = await window.electronAPI.storeGet('user_email');
      const pendingEmail = await window.electronAPI.storeGet('pending_email');
      const email = userEmail || pendingEmail;

      if (!email) {
        throw new Error('No email found. Please start a trial first.');
      }

      console.log('[UPGRADE] Creating checkout session for:', email, billingPeriod);

      // Call backend to create Stripe Checkout session
      const response = await fetch(`${this.API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          billing_period: billingPeriod
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('[UPGRADE] Checkout session created:', data.session_id);
      console.log('[UPGRADE] Opening checkout URL:', data.checkout_url);

      // Store checkout info for success detection
      await window.electronAPI.storeSet('pending_checkout_session', data.session_id);
      await window.electronAPI.storeSet('pending_billing_period', billingPeriod);

      // Open Stripe Checkout in system browser
      await window.electronAPI.openExternal(data.checkout_url);

      // Show success message
      this.showCheckoutOpened(billingPeriod);

      // Start polling for checkout success
      this.startCheckoutPolling(email);

    } catch (error) {
      console.error('[UPGRADE] Error:', error);
      this.isProcessing = false;
      this.showError(error.message);
      this.refreshUI();
    }
  }

  /**
   * Show message that checkout was opened in browser
   */
  showCheckoutOpened(billingPeriod) {
    const periodName = billingPeriod === 'monthly' ? 'Monthly' : 'Annual';
    const amount = billingPeriod === 'monthly' ? '€9/month' : '€90/year';

    window.gigzillaApp?.showModal('Checkout Opened', `
      <div style="text-align: center; padding: 24px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
          Stripe Checkout opened in your browser
        </div>
        <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 24px;">
          Complete your ${periodName} subscription checkout (${amount})
        </div>
        <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; font-size: 13px; color: var(--gray-700);">
          💡 After completing payment, return to Gigzilla and we'll automatically activate your subscription
        </div>
      </div>
    `, [
      {
        label: 'I completed the checkout',
        class: 'btn-primary',
        onclick: () => {
          window.gigzillaApp?.closeModal();
          this.checkCheckoutSuccess();
        }
      },
      {
        label: 'Cancel',
        class: 'btn-ghost',
        onclick: () => {
          window.gigzillaApp?.closeModal();
          this.cancelCheckout();
        }
      }
    ]);
  }

  /**
   * Start polling for checkout success
   */
  startCheckoutPolling(email) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (5s intervals)

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        // Check license status
        const result = await window.electronAPI.invoke('auth:validateLicense', email);

        if (result.valid && result.license.status === 'active') {
          clearInterval(pollInterval);
          this.handleCheckoutSuccess(result.license);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.log('[UPGRADE] Polling timeout after 5 minutes');
        }

      } catch (error) {
        console.error('[UPGRADE] Polling error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Manually check checkout success
   */
  async checkCheckoutSuccess() {
    try {
      const email = await window.electronAPI.storeGet('user_email');

      if (!email) {
        throw new Error('No email found');
      }

      // Validate license
      const result = await window.electronAPI.invoke('auth:validateLicense', email);

      if (result.valid && result.license.status === 'active') {
        this.handleCheckoutSuccess(result.license);
      } else {
        window.gigzillaApp?.showModal('Payment Processing', `
          <div style="text-align: center; padding: 24px 0;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 16px; margin-bottom: 8px;">
              Payment is still processing
            </div>
            <div style="font-size: 14px; color: var(--gray-600);">
              Please wait a few moments and try again
            </div>
          </div>
        `, [
          {
            label: 'Check Again',
            class: 'btn-primary',
            onclick: () => {
              window.gigzillaApp?.closeModal();
              this.checkCheckoutSuccess();
            }
          },
          {
            label: 'Close',
            class: 'btn-ghost',
            onclick: () => window.gigzillaApp?.closeModal()
          }
        ]);
      }

    } catch (error) {
      console.error('[UPGRADE] Check success error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Handle successful checkout
   */
  async handleCheckoutSuccess(license) {
    console.log('[UPGRADE] Checkout successful!', license);

    // Clear pending checkout data
    await window.electronAPI.storeDelete('pending_checkout_session');
    await window.electronAPI.storeDelete('pending_billing_period');

    this.isProcessing = false;

    // Show success message
    window.gigzillaApp?.showModal('Upgrade Successful! 🎉', `
      <div style="text-align: center; padding: 24px 0;">
        <div style="font-size: 64px; margin-bottom: 24px;">✨</div>
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Welcome to Gigzilla Pro!
        </div>
        <div style="font-size: 14px; color: var(--gray-600); margin-bottom: 24px;">
          Your subscription is now active
        </div>
        <div style="background: var(--green-50); border: 1px solid var(--green-200); padding: 16px; border-radius: 8px;">
          <div style="font-size: 13px; color: var(--green-800);">
            ✓ Unlimited projects and clients<br>
            ✓ Invoice management and tracking<br>
            ✓ Revenue analytics<br>
            ✓ Multi-device support (${license.max_devices || 3} devices)
          </div>
        </div>
      </div>
    `, [
      {
        label: 'Start Using Gigzilla',
        class: 'btn-primary',
        onclick: () => {
          window.gigzillaApp?.closeModal();
          window.gigzillaApp?.navigateTo('dashboard');
        }
      }
    ]);
  }

  /**
   * Cancel checkout
   */
  async cancelCheckout() {
    await window.electronAPI.storeDelete('pending_checkout_session');
    await window.electronAPI.storeDelete('pending_billing_period');
    this.isProcessing = false;
    this.refreshUI();
  }

  /**
   * Show error message
   */
  showError(message) {
    window.gigzillaApp?.showModal('Upgrade Error', `
      <div style="text-align: center; padding: 24px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-size: 16px; margin-bottom: 8px; color: var(--red-600);">
          ${message}
        </div>
        <div style="font-size: 14px; color: var(--gray-600);">
          Please try again or contact support
        </div>
      </div>
    `, [
      {
        label: 'Close',
        class: 'btn-primary',
        onclick: () => window.gigzillaApp?.closeModal()
      }
    ]);
  }

  /**
   * Refresh UI
   */
  refreshUI() {
    if (window.gigzillaApp) {
      window.gigzillaApp.refreshCurrentView();
    }
  }
}

window.UpgradeFlow = UpgradeFlow;
window.upgradeFlow = new UpgradeFlow();
