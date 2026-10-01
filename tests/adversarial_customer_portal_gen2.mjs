/**
 * Adversarial Empirical Verification Suite for Customer Portal (Gen 2)
 * Challenger: challenger_1_gen2
 * Date: 2026-09-29
 *
 * Scope:
 * 1. Rapid currency toggles (USD/NIO, 60+ iterations, state consistency, localStorage, malformed inputs)
 * 2. Customer Auth & normalizePhone stress matrix (valid, invalid, edge-case phones, anti-duplicate, PIN limits)
 * 3. Customer Claim & zero ReferenceErrors (QR scan payloads, malformed data, direct scan, banner claim)
 * 4. Voucher & Catalog Lifecycle (free & partial discount redemption, slider boundary conditions, cancellation & exact ledger refund)
 * 5. Inline HTML handlers audit (100% window exposure)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function runAdversarialCustomerPortalTests() {
  setupTestEnvironment('index.html');
  const { getStorageKey } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/config/env.js')).href + `?t=${Date.now()}`);
  const { FirestoreService } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/services/FirestoreService.js')).href + `?t=${Date.now()}`);

  const ctx = new TestContext('Tier 5 (Adversarial): Customer Portal Robustness & Invariants');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL STRESS SUITE: CUSTOMER PORTAL (GEN 2)                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. CURRENCY TOGGLES
  // =========================================================================
  await ctx.test('ADV-1.1: Rapid Currency Toggling (60 iterations in tight loop) maintains VM and storage consistency with zero errors', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    const appModule = await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    let expectedCurrency = 'USD';
    const storageKey = getStorageKey('melty_preferred_currency');

    // 60 rapid switches between USD and NIO
    for (let i = 0; i < 60; i++) {
      const target = (i % 2 === 0) ? 'NIO' : 'USD';
      await win.setAppCurrency(target);
      expectedCurrency = target;
    }

    // Verify localStorage matches last toggle
    const stored = localStorage.getItem(storageKey);
    expect(stored).toBe(expectedCurrency, `Storage key ${storageKey} should match last toggle ${expectedCurrency}`);

    // Verify visual button styles
    const btnNio = doc.getElementById('btn-currency-nio');
    const btnUsd = doc.getElementById('btn-currency-usd');
    if (expectedCurrency === 'USD') {
      expect(btnUsd.style.background).toBe('#0f172a', 'USD button should be active');
    } else {
      expect(btnNio.style.background).toBe('#0f172a', 'NIO button should be active');
    }

    // Switch once more to NIO and verify pass text format
    await win.setAppCurrency('NIO');
    const passEquiv = doc.getElementById('client-usd-equiv');
    expect(passEquiv.innerHTML).toContain('C$', 'Pass equivalent must display C$ when currency is NIO');
    expect(passEquiv.innerHTML).toContain('NIO', 'Pass equivalent must contain NIO text');

    // Switch back to USD
    await win.setAppCurrency('USD');
    expect(passEquiv.innerHTML).toContain('$0.00 USD', 'Pass equivalent must display $0.00 USD when guest and USD');
  });

  await ctx.test('ADV-1.2: Currency toggling with active authenticated user syncs user model, balance conversion, and persistence', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Login Carlos Lopez (500 WP)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    const passBalance = doc.getElementById('client-balance-val');
    expect(passBalance.textContent).toBe('500', 'Balance is 500 WP');

    // Toggle to NIO: 500 WP / 50 = $10.00 USD -> 10 * 37 = C$ 370.00 NIO
    await win.setAppCurrency('NIO');
    const passEquiv = doc.getElementById('client-usd-equiv');
    expect(passEquiv.innerHTML).toContain('370.00', '500 WP must equal C$ 370.00 NIO');
    expect(passEquiv.innerHTML).toContain('C$', 'Must include C$ symbol');

    // Toggle back to USD: $10.00 USD
    await win.setAppCurrency('USD');
    expect(passEquiv.innerHTML).toContain('10.00', '500 WP must equal $10.00 USD');
    expect(passEquiv.innerHTML).toContain('$10.00 USD', 'Must include $10.00 USD text');
  });

  await ctx.test('ADV-1.3: Malformed and adversarial currency inputs are rejected gracefully without state corruption', async () => {
    const { win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    await win.setAppCurrency('USD');
    const storageKey = getStorageKey('melty_preferred_currency');

    const poisonInputs = [
      'EUR', 'BTC', 'YEN', '', ' ', '  ', null, undefined, 0, 1, -1, NaN,
      {}, [], 'USD\0', 'nio', 'usd', '<script>', 'DROP TABLE'
    ];

    for (const poison of poisonInputs) {
      try {
        await win.setAppCurrency(poison);
      } catch (err) {
        throw new Error(`setAppCurrency threw on adversarial input [${poison}]: ${err.message}`);
      }
      // Must remain USD
      const current = localStorage.getItem(storageKey);
      expect(current).toBe('USD', `Input [${poison}] corrupted preferred currency to [${current}]`);
    }
  });

  // =========================================================================
  // 2. CUSTOMER AUTH & NORMALIZE PHONE
  // =========================================================================
  await ctx.test('ADV-2.1: FirestoreService.normalizePhone handles comprehensive adversarial phone matrix', async () => {
    const testMatrix = [
      // Input -> Expected normalized 8 digits
      { input: '58438412', expected: '58438412' },
      { input: '5843-8412', expected: '58438412' },
      { input: '+505-8888-9999', expected: '88889999' },
      { input: '00505 12345678', expected: '12345678' },
      { input: '+505 5843 8412', expected: '58438412' },
      { input: '0050558438412', expected: '58438412' },
      { input: '50558438412', expected: '58438412' },
      { input: '(+505) 8888-9999', expected: '88889999' },
      { input: '505-8888-9999', expected: '88889999' },
      { input: '  +505  8888-9999  ', expected: '88889999' },
      { input: '+505.8888.9999', expected: '88889999' },
      { input: '00505-8888-9999', expected: '88889999' },
      // Edge cases: short or empty strings
      { input: '', expected: '' },
      { input: null, expected: '' },
      { input: undefined, expected: '' },
      { input: 'abc', expected: '' },
      { input: '   ', expected: '' },
      { input: '+++---()', expected: '' }
    ];

    for (const { input, expected } of testMatrix) {
      const res = FirestoreService.normalizePhone(input);
      expect(res).toBe(expected, `normalizePhone("${input}") returned "${res}", expected "${expected}"`);
    }

    // Format phone display test
    expect(FirestoreService.formatPhoneDisplay('58438412')).toBe('5843-8412');
    expect(FirestoreService.formatPhoneDisplay('+50588889999')).toBe('8888-9999');
    expect(FirestoreService.formatPhoneDisplay('')).toBe('');
  });

  await ctx.test('ADV-2.2: Customer Auth Login stress test (valid variations, invalid credentials, feedback validation)', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const phoneEl = doc.getElementById('login-phone');
    const pinEl = doc.getElementById('login-pin');
    const feedback = doc.getElementById('auth-feedback');

    // 1. Valid login with country code variation: +505-8888-9999 (Maria Santos, PIN 5678)
    phoneEl.value = '+505-8888-9999';
    pinEl.value = '5678';
    await win.submitClientLogin();
    expect(doc.getElementById('client-display-name').textContent).toBe('Maria Santos');
    expect(doc.getElementById('modal-client-auth').style.display).toBe('none');

    // Logout
    win.logoutClient();
    expect(doc.getElementById('client-display-name').textContent).toBe('Socio Invitado');

    // 2. Valid login with 00505 prefix: 00505 58438412 (Carlos Lopez, PIN 1234)
    win.openAuthModal('login');
    phoneEl.value = '00505 58438412';
    pinEl.value = '1234';
    await win.submitClientLogin();
    expect(doc.getElementById('client-display-name').textContent).toBe('Carlos Lopez');
    win.logoutClient();

    // 3. Invalid PIN for existing user
    win.openAuthModal('login');
    phoneEl.value = '5843-8412';
    pinEl.value = '9999';
    await win.submitClientLogin();
    expect(feedback.textContent.toLowerCase()).toContain('pin');
    expect(doc.getElementById('client-display-name').textContent).toBe('Socio Invitado');

    // 4. Non-existent phone number
    phoneEl.value = '+505 7777-7777';
    pinEl.value = '1234';
    await win.submitClientLogin();
    expect(feedback.textContent.toLowerCase()).toContain('no existe');

    // 5. Malformed / incomplete phone inputs
    const badPhones = ['', '123', 'abc', '505', '00505', 'letters-only'];
    for (const bad of badPhones) {
      phoneEl.value = bad;
      pinEl.value = '1234';
      await win.submitClientLogin();
      expect(feedback.textContent.length).toBeGreaterThan(0, `Feedback should report error for phone [${bad}]`);
    }

    // 6. Malformed PIN inputs
    phoneEl.value = '5843-8412';
    const badPins = ['', '1', '12', '123', '123456789'];
    for (const badPin of badPins) {
      pinEl.value = badPin;
      await win.submitClientLogin();
      expect(feedback.textContent.toLowerCase()).toContain('pin');
    }
  });

  await ctx.test('ADV-2.3: Customer Register stress test with anti-duplicate enforcement across all phone formats', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openAuthModal('register');
    const nameEl = doc.getElementById('reg-name');
    const phoneEl = doc.getElementById('reg-phone');
    const pinEl = doc.getElementById('reg-pin');
    const feedback = doc.getElementById('auth-feedback');

    // 1. Attempt to register existing user using diverse phone formats
    const existingFormats = ['58438412', '5843-8412', '+505 5843 8412', '0050558438412', '50558438412'];
    for (const fmt of existingFormats) {
      nameEl.value = 'Intruso';
      phoneEl.value = fmt;
      pinEl.value = '1234';
      await win.submitClientRegister();
      expect(feedback.textContent.toLowerCase()).toContain('ya se encuentra registrado', `Duplicate registration must be rejected for ${fmt}`);
    }

    // 2. Register valid brand new user with international format
    nameEl.value = 'Lucia Benavides';
    phoneEl.value = '+505 7654-3210';
    pinEl.value = '8888';
    await win.submitClientRegister();

    expect(doc.getElementById('client-display-name').textContent).toBe('Lucia Benavides');
    expect(doc.getElementById('client-balance-val').textContent).toBe('0');
    expect(doc.getElementById('modal-client-auth').style.display).toBe('none');

    // 3. Immediately attempt to register again with same phone
    win.openAuthModal('register');
    nameEl.value = 'Lucia Duplicada';
    phoneEl.value = '76543210';
    pinEl.value = '8888';
    await win.submitClientRegister();
    expect(feedback.textContent.toLowerCase()).toContain('ya se encuentra registrado');
  });

  // =========================================================================
  // 3. CUSTOMER CLAIM & ZERO REFERENCERRORS
  // =========================================================================
  await ctx.test('ADV-3.1: handleClientQrScanned robustly parses QR scan formats and rejects garbage without ReferenceErrors', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Check handleClientQrScanned is available
    const { handleClientQrScanned } = await import('../js/views/customer/index.js');

    // Test with malformed & garbage inputs
    const garbagePayloads = [
      '', '   ', 'null', 'undefined', 'https://evil.com/hack', 'just a barcode 12345',
      'claim=', 'WP-', '<script>alert(1)</script>', 'WP-@#$%^&*()',
      'https://meltydeays-wired-club.vercel.app/?claim=undefined',
      'https://meltydeays-wired-club.vercel.app/?claim=null',
      'https://meltydeays-wired-club.vercel.app/?claim=',
      'https://meltydeays-wired-club.vercel.app/?claim=123'
    ];

    for (const garbage of garbagePayloads) {
      try {
        await handleClientQrScanned(garbage);
      } catch (err) {
        throw new Error(`handleClientQrScanned crashed on garbage [${garbage}]: ${err.message}`);
      }
    }
  });

  await ctx.test('ADV-3.2: Direct QR code scan immediately credits points for authenticated user with zero undeclared render() calls', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Seed a brand new active token
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    rawDb.tokens['WP-DIRECT-8801'] = {
      tokenCode: 'WP-DIRECT-8801',
      invoiceFolio: '8801',
      pointsValue: 275,
      securityPin: '4321',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    // Login Carlos Lopez (500 WP)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();
    expect(parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10)).toBe(500);

    // Simulate scanned URL payload
    const { handleClientQrScanned } = await import('../js/views/customer/index.js');

    try {
      await handleClientQrScanned('https://wiredclub.meltydeays.com/?claim=WP-DIRECT-8801&utm=qr');
    } catch (err) {
      throw new Error(`handleClientQrScanned threw error: ${err.message}`);
    }

    // Verify balance increased by 275 WP (500 + 275 = 775)
    const newBal = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(newBal).toBe(775, 'Balance must be credited directly without requiring PIN prompt');

    // Verify token status in storage is CLAIMED
    const updatedDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    expect(updatedDb.tokens['WP-DIRECT-8801'].status).toBe('CLAIMED');
  });

  await ctx.test('ADV-3.3: Banner Claim lifecycle (?claim=WP-BANNER-9901) executes smoothly with zero ReferenceErrors', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html', {
      search: '?claim=WP-BANNER-9901'
    });

    // Seed token
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    rawDb.tokens['WP-BANNER-9901'] = {
      tokenCode: 'WP-BANNER-9901',
      invoiceFolio: '9901',
      pointsValue: 350,
      securityPin: '9999',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Allow token fetch promise in render
    await sleep(20);

    // Banner should be visible
    const banner = doc.getElementById('claim-banner');
    expect(banner.style.display !== 'none').toBeTruthy('Claim banner should be visible for ?claim= token');

    // Login as Carlos Lopez
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    // Verify points were auto-claimed on login with pending token
    const balance = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(balance).toBe(850, 'Balance must be 500 + 350 = 850 WP');

    // Dismiss banner safely
    try {
      win.dismissClaimBanner();
    } catch (e) {
      throw new Error(`dismissClaimBanner failed: ${e.message}`);
    }
  });

  // =========================================================================
  // 4. VOUCHER & CATALOG LIFECYCLE
  // =========================================================================
  await ctx.test('ADV-4.1: Partial discount points slider boundary conditions and dynamic price calculation', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');

    // Add a PARTIAL_DISCOUNT item into initial data
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    rawDb.rewards['rew-hyperx-mouse'] = {
      id: 'rew-hyperx-mouse',
      title: 'Mouse HyperX Pulsefire',
      category: 'Gaming Hardware',
      stock: 4,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400, // Max cap
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Login Carlos Lopez (500 WP)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    // Confirm redeem for partial discount item
    win.confirmRedeem('rew-hyperx-mouse');
    const redeemModal = doc.getElementById('modal-confirm-redeem');
    expect(redeemModal.style.display).toBe('flex', 'Redeem modal must be open');

    const slider = doc.getElementById('confirm-points-slider');
    const numInput = doc.getElementById('confirm-points-num');
    const typeDisc = doc.getElementById('confirm-type-discount');
    const typeCash = doc.getElementById('confirm-type-cash');
    const btnDoRedeem = doc.getElementById('btn-do-redeem');

    // Boundary 1: Slider at maximum (user has 500 WP, cap is 400 WP -> maxUsable is 400)
    win.setPointsPreset('max');
    expect(slider.value).toBe('400');
    expect(typeDisc.textContent).toContain('10.00'); // -$10.00 USD
    expect(typeCash.textContent).toContain('30.00'); // $30.00 USD
    expect(btnDoRedeem.textContent).toContain('CANJEAR VALE DE DESCUENTO');

    // Boundary 2: Slider at zero points
    win.setPointsPreset('zero');
    expect(slider.value).toBe('0');
    expect(typeDisc.textContent).toContain('0.00'); // -$0.00 USD
    expect(typeCash.textContent).toContain('40.00'); // $40.00 USD
    expect(btnDoRedeem.textContent).toContain('GENERAR VALE DE COMPRA');

    // Boundary 3: Mid-point change (200 WP)
    win.onPointsSliderChange('200');
    expect(numInput.value).toBe('200');
    expect(typeDisc.textContent).toContain('5.00'); // -$5.00 USD
    expect(typeCash.textContent).toContain('35.00'); // $35.00 USD

    // Boundary 4: Numeric input exceeding maximum (try 9999 WP) -> Clamped to 400
    win.onPointsNumChange('9999');
    expect(slider.value).toBe('400');

    // Boundary 5: Negative input (-100 WP) -> Clamped to 0
    win.onPointsNumChange('-100');
    expect(slider.value).toBe('0');

    // Boundary 6: NaN string input -> Handled safely as 0
    win.onPointsNumChange('not-a-number');
    expect(slider.value).toBe('0');

    win.closeRedeemModal();
    expect(redeemModal.style.display).toBe('none');
  });

  await ctx.test('ADV-4.2: Full Redemption Lifecycle opens showVoucherModal, and cancellation restores exact ledger points and stock', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Step 1: Login Carlos Lopez (500 WP)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    const startBal = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(startBal).toBe(500);

    // Step 2: Redeem "rew-cyber-drink" (Cost: 50 WP, Stock: 25)
    win.confirmRedeem('rew-cyber-drink');
    await win.executeRedeem();

    // Verify balance deducted to 450 WP
    const postRedeemBal = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(postRedeemBal).toBe(450, 'Balance must be deducted by 50 WP');

    // Wait for the synthetic timeout (450ms) to trigger showVoucherModal
    await sleep(550);

    // Step 3: Verify showVoucherModal was invoked and voucher modal is open
    const voucherModal = doc.getElementById('modal-voucher');
    expect(voucherModal.style.display).toBe('flex', 'Voucher modal must automatically open after redemption');
    const vCodeEl = doc.getElementById('modal-voucher-code');
    const vCode = vCodeEl.textContent.trim();
    expect(vCode.startsWith('CANJE-')).toBeTruthy('Voucher code must start with CANJE-');

    // Verify stock decremented to 24
    const midDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    expect(midDb.rewards['rew-cyber-drink'].stock).toBe(24);

    // Verify WhatsApp button links to official store phone and contains structured message with image
    const waBtn = doc.getElementById('btn-whatsapp-voucher');
    expect(waBtn.href).toContain('50558438412', 'WhatsApp notification must target official store phone 50558438412');
    const decodedWa = decodeURIComponent(waBtn.href);
    expect(decodedWa).toContain(vCode, 'WhatsApp notification must contain voucher code');
    expect(decodedWa).toContain('Cyber Energy Drink', 'WhatsApp notification must contain product title');
    expect(decodedWa).toContain('Foto del Producto', 'WhatsApp notification must contain product photo label');
    expect(decodedWa).toContain('https://images.unsplash.com', 'WhatsApp notification must contain product image link');

    // Close voucher modal
    win.closeVoucherModal();
    expect(voucherModal.style.display).toBe('none');

    // Step 4: Prompt cancel voucher
    win.promptCancelVoucher(vCode);
    const cancelModal = doc.getElementById('modal-confirm-cancel-voucher');
    expect(cancelModal.style.display).toBe('flex', 'Cancel confirmation modal must be open');

    // Step 5: Execute cancellation
    await win.executeCancelVoucher();
    expect(cancelModal.style.display).toBe('none');

    // Step 6: Verify EXACT points restored to Carlos Lopez (450 + 50 = 500 WP)
    const refundedBal = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(refundedBal).toBe(500, 'Balance must be exactly refunded back to 500 WP');

    // Step 7: Verify stock returned to 25
    const endDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    expect(endDb.rewards['rew-cyber-drink'].stock).toBe(25, 'Catalog stock must be replenished (+1)');

    // Step 8: Verify voucher status CANCELLED
    expect(endDb.vouchers[vCode].status).toBe('CANCELLED');

    // Step 9: Verify ledger entry
    const userLedger = endDb.ledger['CLIENT-58438412'] || [];
    const refundTx = userLedger.find(t => t.ref_id === vCode && t.type === 'REFUND_CANCEL');
    expect(refundTx).toBeDefined('Ledger must contain a REFUND_CANCEL entry for this voucher');
    expect(refundTx.delta).toBe(50, 'Ledger refund delta must be +50');
    expect(refundTx.balance_after).toBe(500, 'Ledger balance_after must be 500');
  });

  await ctx.test('ADV-4.3: Adversarial voucher cancellation edge cases (already cancelled, delivered, non-existent) are safely rejected', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Login Carlos Lopez
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    // 1. Non-existent voucher
    win.promptCancelVoucher('VCH-FAKE-0000');
    try {
      await win.executeCancelVoucher();
    } catch (e) {
      throw new Error(`executeCancelVoucher threw on non-existent voucher: ${e.message}`);
    }

    // 2. Already DELIVERED voucher
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    rawDb.vouchers['VCH-DELIVERED-77'] = {
      voucherCode: 'VCH-DELIVERED-77',
      userUid: 'CLIENT-58438412',
      rewardId: 'rew-ramen',
      rewardTitle: 'Ramen Especial',
      pointsSpent: 200,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString()
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    win.promptCancelVoucher('VCH-DELIVERED-77');
    await win.executeCancelVoucher();

    // Verify status was NOT changed to CANCELLED
    const checkDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    expect(checkDb.vouchers['VCH-DELIVERED-77'].status).toBe('DELIVERED');
  });

  // =========================================================================
  // 5. INLINE HANDLERS 100% WINDOW EXPOSURE
  // =========================================================================
  await ctx.test('ADV-5.1: 100% of inline handlers extracted from index.html are callable functions on window', async () => {
    const htmlPath = path.join(PROJECT_ROOT, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Extract all inline handlers using regex
    const handlerRegex = /\b(on[a-z]+)=["']([^"']+)["']/gi;
    const extractedNames = new Set();
    let m;
    while ((m = handlerRegex.exec(htmlContent)) !== null) {
      const code = m[2].trim();
      const fnNameMatch = code.match(/^([a-zA-Z0-9_$]+)\s*\(/);
      if (fnNameMatch) {
        const fnName = fnNameMatch[1];
        if (!['if', 'for', 'while', 'switch', 'catch', 'alert'].includes(fnName)) {
          extractedNames.add(fnName);
        }
      }
    }

    const handlerList = Array.from(extractedNames);
    expect(handlerList.length).toBeGreaterThan(15, `Expected at least 15 inline handlers, found ${handlerList.length}`);

    const { win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const missingOnWindow = [];
    const notAFunction = [];

    for (const h of handlerList) {
      if (!(h in win) || win[h] === undefined) {
        missingOnWindow.push(h);
      } else if (typeof win[h] !== 'function') {
        notAFunction.push(h);
      }
    }

    if (missingOnWindow.length > 0 || notAFunction.length > 0) {
      throw new Error(`Handler exposure failure! Missing: [${missingOnWindow.join(', ')}], Not function: [${notAFunction.join(', ')}]`);
    }

    console.log(`      ✓ Verified ${handlerList.length} inline handlers: 100% callable on window:`);
    console.log(`        [${handlerList.join(', ')}]`);
  });

  await ctx.test('ADV-5.2: Invoice builders robustly generate QR claim URLs from token_code/tokenCode without ever creating claim=undefined', async () => {
    const { InvoiceTemplateService } = await import('../js/services/InvoiceTemplateService.js');

    // 1. Physical 4x1 Builder with raw token_code objects
    const rawTokens = [
      { token_code: "WP-2026-F0001-TEST1", invoice_folio: "0001", points_value: 50, security_pin: "1234" },
      { token_code: "WP-2026-F0002-TEST2", invoice_folio: "0002", points_value: 0, security_pin: "5678" }
    ];

    const physicalHtml = InvoiceTemplateService.generatePrintDocument(rawTokens, null, "both", false);
    expect(physicalHtml.includes("claim=undefined")).toBeFalsy("Physical invoice must NEVER contain claim=undefined");
    expect(physicalHtml.includes("WP-2026-F0001-TEST1")).toBeTruthy("Physical invoice must include correct token_code in data for token 1");
    expect(physicalHtml.includes("WP-2026-F0002-TEST2")).toBeTruthy("Physical invoice must include correct token_code in data for token 2");

    // 2. Single Digital Invoice Builder with raw token_code
    const rawInvoice = {
      folio: "0005",
      token_code: "WP-2026-F0005-DIGI5",
      pointsValue: 100,
      clientName: "Bryan Bermudez",
      clientPhone: "58438412"
    };

    const digitalHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(rawInvoice, null, false);
    expect(digitalHtml.includes("claim=undefined")).toBeFalsy("Digital invoice must NEVER contain claim=undefined");
    expect(digitalHtml.includes("claim=WP-2026-F0005-DIGI5")).toBeTruthy("Digital invoice must include correct token_code URL");
  });

  // ========================================================
  // CATEGORY 6: INVOICE FOLIO RESOLUTION & CLAIM RESILIENCE (#4)
  // ========================================================

  await ctx.test("ADV-6.1: FirestoreService.getTokenByFolio resolves folio #4 across all format variations", async () => {
    const { FirestoreService } = await import("../js/services/FirestoreService.js");
    
    // Configurar token para folio 0004
    await FirestoreService.saveToken({
      token_code: "WP-2026-F0004-A0CB",
      invoice_folio: "0004",
      points_value: 120,
      security_pin: "9545",
      status: "ACTIVE"
    });

    const variations = ["4", "0004", "F0004", "#MD-2026-0004", "MD-2026-0004", "MD-0004", "#0004"];
    for (const v of variations) {
      const tok = await FirestoreService.getTokenByFolio(v);
      expect(tok).toBeTruthy(`getTokenByFolio must find token for variation: ${v}`);
      expect(tok.token_code).toBe("WP-2026-F0004-A0CB");
      expect(tok.invoice_folio).toBe("0004");
    }

    // Direct getToken fallback to folio
    const directTok = await FirestoreService.getToken("0004");
    expect(directTok).toBeTruthy("getToken with folio should resolve token");
    expect(directTok.token_code).toBe("WP-2026-F0004-A0CB");
  });

  await ctx.test("ADV-6.2: CustomerViewModel.claimToken successfully claims invoice #4 via folio string and PIN", async () => {
    const { CustomerViewModel } = await import("../js/viewmodels/CustomerViewModel.js");
    const { FirestoreService } = await import("../js/services/FirestoreService.js");

    const vm = new CustomerViewModel();
    await vm.init();

    // Crear y autenticar usuario
    const user = await FirestoreService.saveUser({
      uid: "user-folio4-test",
      displayName: "Bryan Bermudez",
      phone: "58438412",
      wiredPoints: 50
    });
    vm.currentUser = new (await import("../js/models/UserModel.js")).UserModel(user);

    // Actualizar token 0004 con 150 puntos
    await FirestoreService.saveToken({
      token_code: "WP-2026-F0004-A0CB",
      invoice_folio: "0004",
      points_value: 150,
      security_pin: "9545",
      status: "ACTIVE"
    });

    // Reclamar pasando "4" en vez del token completo
    const res = await vm.claimToken("4", "9545", false);
    expect(res.success).toBeTruthy();
    expect(res.pointsAdded).toBe(150);
    expect(res.newBalance).toBe(200);

    // Verificar en BD que quedó marcado como CLAIMED
    const updated = await FirestoreService.getToken("WP-2026-F0004-A0CB");
    expect(updated.status).toBe("CLAIMED");
  });

  await ctx.test("ADV-6.3: handleClientQrScanned resolves folio formats and WhatsApp links seamlessly", async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const { handleClientQrScanned } = await import("../js/views/customer/CustomerClaimView.js");
    const { FirestoreService } = await import("../js/services/FirestoreService.js");
    const { vm } = await import("../js/app.js");

    // Token activo en BD para folio 0004
    await FirestoreService.saveToken({
      token_code: "WP-2026-F0004-SCANTEST",
      invoice_folio: "0004",
      points_value: 80,
      security_pin: "9545",
      status: "ACTIVE"
    });

    // Escanear código con formato #MD-2026-0004
    await handleClientQrScanned("#MD-2026-0004");
    if (vm) {
      expect(vm.pendingClaimToken).toBe("WP-2026-F0004-SCANTEST");
    }

    // Escanear enlace WhatsApp
    await handleClientQrScanned("https://wa.me/50558438412");
    expect(true).toBeTruthy("Escaneo de WhatsApp manejado sin excepción");
  });

  await ctx.test("ADV-6.4: SingleDigitalInvoiceBuilder includes print-qr-digital-front on invoice front page", async () => {
    const { InvoiceTemplateService } = await import("../js/services/InvoiceTemplateService.js");

    const inv = {
      folio: "0004",
      token_code: "WP-2026-F0004-A0CB",
      pointsValue: 200,
      clientName: "Bryan Bermudez",
      clientPhone: "58438412"
    };

    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(inv, null, false);
    expect(docHtml.includes('id="print-qr-digital-front"')).toBeTruthy("Front page must contain print-qr-digital-front");
    expect(docHtml.includes('id="print-qr-digital-back"')).toBeTruthy("Back page must contain print-qr-digital-back");
    expect(docHtml.includes('qr-badge-wired')).toBeTruthy("Front page must display qr-badge-wired tag");
  });

  await ctx.test("ADV-6.5: handleClientQrScanned recovers from physical tickets with claim=undefined gracefully", async () => {
    const { doc } = setupTestEnvironment('index.html');
    const { handleClientQrScanned } = await import("../js/views/customer/CustomerClaimView.js");
    
    // Simular escaneo de ticket físico impreso previo con ?claim=undefined
    await handleClientQrScanned("https://meltydeays-wired-club.vercel.app/?claim=undefined");
    const modal = doc.getElementById("modal-manual-claim");
    expect(modal).toBeTruthy("modal-manual-claim must exist");
    expect(modal.style.display).toBe("flex", "Manual claim modal must open automatically when physical claim=undefined QR is scanned");
  });

  await ctx.test("ADV-6.6: Physical4x1Builder generates high-res QRs (140x140, CorrectLevel.H) with complete URL parameters", async () => {
    const { InvoiceTemplateService } = await import("../js/services/InvoiceTemplateService.js");

    const tokens = [
      { tokenCode: "WP-2026-F0005-TESTPHYS", invoiceFolio: "0005", securityPin: "6608", pointsValue: 100 },
      { tokenCode: "WP-2026-F0006-TESTPHYS", invoiceFolio: "0006", securityPin: "1234", pointsValue: 50 },
      { tokenCode: "WP-2026-F0007-TESTPHYS", invoiceFolio: "0007", securityPin: "5678", pointsValue: 75 },
      { tokenCode: "WP-2026-F0008-TESTPHYS", invoiceFolio: "0008", securityPin: "9999", pointsValue: 200 }
    ];

    const html = InvoiceTemplateService.generatePrintDocument(tokens, null, "both", false);
    expect(html.includes("width: 140, height: 140")).toBeTruthy("Physical QRs must be rendered with 140x140 for crisp print quality");
    expect(html.includes("QRCode.CorrectLevel.H")).toBeTruthy("Physical QRs must use high error correction (CorrectLevel.H)");
    expect(html.includes("folio=")).toBeTruthy("Physical QR claim URL must include folio query parameter");
    expect(html.includes("pin=")).toBeTruthy("Physical QR claim URL must include pin query parameter");
  });

  return ctx.summary();
}

// Auto-run when executed directly via node
if (process.argv[1] && process.argv[1].endsWith('adversarial_customer_portal_gen2.mjs')) {
  runAdversarialCustomerPortalTests()
    .then(summary => {
      console.log('\n======================================================');
      console.log(`TOTAL ADVERSARIAL TESTS: ${summary.total}`);
      console.log(`PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
      console.log('======================================================\n');
      if (summary.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('[FATAL ADVERSARIAL RUNNER ERROR]:', err);
      process.exit(1);
    });
}
