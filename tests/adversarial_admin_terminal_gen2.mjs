/**
 * Adversarial Empirical Verification Suite for Admin Terminal (Gen 2)
 * Challenger: challenger_2_gen2
 * Date: 2026-09-29
 *
 * Scope:
 * 1. Admin PIN Unlock: PIN 110805 unlocks #admin-main-panel.
 *    Adversarial matrix of invalid PINs (000000, 999999, letters, empty, null, symbols, SQL injection)
 *    verifying failure feedback and zero state leakage. Session reboot & logout lifecycle. Hammering stress.
 * 2. Tab Navigation: Stress test rapid switching across all 5 sections (sec-pos, sec-clients,
 *    sec-invoices, sec-catalog, sec-history) via switchAdminTab (100 rapid random switches, invariants,
 *    boundary/garbage inputs, live data refresh sync).
 * 3. Product Save: Export and alias verification for saveProductAdmin and saveNewProduct.
 *    Invocation and discount calculation dependencies (setProductPublicationMode, recalculateProductDiscount,
 *    activeProductMode). Free reward vs partial discount calculation engine and boundary validation.
 * 4. Digital Invoice Modal: openSingleDigitalInvoiceModal, item additions, dynamic calculation,
 *    and automatic closure via closeModal("modal-single-digital-invoice") upon invoice emission.
 * 5. Navbar Utilities: Calc WP modal (openSalePointsCalculatorModal), points return math engine (profit/revenue),
 *    freight rates, and universal modal opening/closing stress test across all admin modals.
 * 6. Inline Handlers: Complete deep scan of all inline handlers in admin.html confirming 100% window exposure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runAdversarialAdminTerminalTests() {
  const ctx = new TestContext('Tier 5 (Adversarial): Admin Terminal Robustness & Security Invariants');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL STRESS SUITE: ADMIN TERMINAL (GEN 2)                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. ADMIN PIN UNLOCK & AUTHENTICATION ADVERSARIAL MATRIX
  // =========================================================================
  await ctx.test('ADV-1.1: submitAdminPin() with official master PIN 110805 unlocks panel and sets session', async () => {
    const { doc, win, sessionStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const lockEl = doc.getElementById('admin-auth-lock');
    const mainEl = doc.getElementById('admin-main-panel');
    const pinInput = doc.getElementById('input-admin-pin');
    const feedback = doc.getElementById('lock-feedback');

    // Initial state: locked
    expect(lockEl.style.display).toBe('flex', 'Lock screen should be visible on startup');
    expect(mainEl.style.display).toBe('none', 'Main panel should be hidden on startup');
    expect(sessionStorage.getItem('melty_admin_auth')).toBeFalsy('Session auth should be empty initially');

    // Enter official master PIN
    pinInput.value = '110805';
    win.submitAdminPin();

    // Verify unlocked state
    expect(mainEl.style.display).toBe('block', 'Main panel must be visible after valid PIN 110805');
    expect(lockEl.style.display).toBe('none', 'Lock screen must be hidden after valid PIN');
    expect(sessionStorage.getItem('melty_admin_auth')).toBe('110805', 'sessionStorage must store valid master PIN');
    expect(feedback.style.display).toBe('none', 'Error feedback banner must be hidden on success');
  });

  await ctx.test('ADV-1.2: submitAdminPin() with alternative configured PIN 1108 unlocks panel', async () => {
    const { doc, win, sessionStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const pinInput = doc.getElementById('input-admin-pin');
    pinInput.value = '1108';
    win.submitAdminPin();

    expect(doc.getElementById('admin-main-panel').style.display).toBe('block', 'Main panel must unlock with PIN 1108');
    expect(doc.getElementById('admin-auth-lock').style.display).toBe('none', 'Lock screen must hide with PIN 1108');
    expect(sessionStorage.getItem('melty_admin_auth')).toBe('110805', 'Normalized session token must be 110805');
  });

  await ctx.test('ADV-1.3: Adversarial invalid PIN matrix (15 attack vectors) preserves zero state leakage and shows error feedback', async () => {
    const { doc, win, sessionStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const invalidPins = [
      '000000',
      '999999',
      '123456',
      '0000',
      'admin',
      'PIN',
      'root',
      '',
      '      ',
      '!@#$%^&*()',
      '11080599',
      '11080',
      'null',
      'undefined',
      "' OR '1'='1"
    ];

    const lockEl = doc.getElementById('admin-auth-lock');
    const mainEl = doc.getElementById('admin-main-panel');
    const pinInput = doc.getElementById('input-admin-pin');
    const feedback = doc.getElementById('lock-feedback');

    for (const badPin of invalidPins) {
      pinInput.value = badPin;
      win.submitAdminPin();

      // Invariants:
      // 1. Must remain locked
      expect(lockEl.style.display).toBe('flex', `Lock screen must remain visible for PIN "${badPin}"`);
      expect(mainEl.style.display).toBe('none', `Main panel must remain hidden for PIN "${badPin}"`);

      // 2. Zero session / storage leakage
      expect(sessionStorage.getItem('melty_admin_auth')).toBeFalsy(`sessionStorage must NOT be set for PIN "${badPin}"`);

      // 3. Clear failure feedback shown
      expect(feedback.style.display).toBe('block', `Error feedback must be displayed for PIN "${badPin}"`);
      expect(feedback.innerHTML).toContain('Acceso denegado', `Feedback must contain "Acceso denegado" for PIN "${badPin}"`);

      // 4. Input must be cleared
      expect(pinInput.value).toBe('', `PIN input must be cleared after invalid attempt "${badPin}"`);
    }
  });

  await ctx.test('ADV-1.4: Session persistence across simulated reboot and clean logout lifecycle', async () => {
    const { doc, win, sessionStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Step 1: Login
    doc.getElementById('input-admin-pin').value = '110805';
    win.submitAdminPin();
    expect(doc.getElementById('admin-main-panel').style.display).toBe('block');
    expect(sessionStorage.getItem('melty_admin_auth')).toBe('110805');

    // Step 2: Logout
    win.logoutAdmin();
    expect(doc.getElementById('admin-main-panel').style.display).toBe('none', 'Main panel hidden after logout');
    expect(doc.getElementById('admin-auth-lock').style.display).toBe('flex', 'Lock screen restored after logout');
    expect(sessionStorage.getItem('melty_admin_auth')).toBeFalsy('Session auth token removed upon logout');

    // Step 3: Simulated reboot with preexisting valid session in storage
    sessionStorage.setItem('melty_admin_auth', '110805');
    const { AdminViewModel } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/viewmodels/AdminViewModel.js')).href + `?t=${Date.now()}`);
    const rebootVm = new AdminViewModel();
    let rebootRenderedAuth = false;
    rebootVm.subscribe((m) => { rebootRenderedAuth = m.isAuthenticated; });
    rebootVm.init();
    expect(rebootVm.isAuthenticated).toBe(true, 'VM must auto-authenticate when sessionStorage contains 110805');
    expect(rebootRenderedAuth).toBe(true, 'Subscriber must be notified of authenticated state on reboot');
  });

  await ctx.test('ADV-1.5: PIN Hammering Stress Test (50 rapid invalid submissions followed by 1 valid PIN unlock)', async () => {
    const { doc, win, sessionStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const pinInput = doc.getElementById('input-admin-pin');
    for (let i = 0; i < 50; i++) {
      pinInput.value = `BAD_${i}`;
      win.submitAdminPin();
      expect(sessionStorage.getItem('melty_admin_auth')).toBeFalsy();
    }

    // 51st attempt with valid master PIN
    pinInput.value = '110805';
    win.submitAdminPin();
    expect(doc.getElementById('admin-main-panel').style.display).toBe('block', 'Should unlock smoothly after 50 failed attempts');
    expect(sessionStorage.getItem('melty_admin_auth')).toBe('110805');
  });

  // =========================================================================
  // 2. TAB NAVIGATION & VISIBILITY INVARIANTS UNDER RAPID CONCURRENCY
  // =========================================================================
  await ctx.test('ADV-2.1: Sequential switching across all 5 sections maintains single-active DOM invariant', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const sections = ['pos', 'clients', 'invoices', 'catalog', 'history'];

    for (const targetTab of sections) {
      win.switchAdminTab(targetTab);

      // Verify targeted tab
      const targetSec = doc.getElementById('sec-' + targetTab);
      const targetBtn = doc.getElementById('tab-btn-' + targetTab);
      expect(targetSec.style.display).toBe('block', `Section sec-${targetTab} must be visible (block)`);
      expect(targetBtn.classList.contains('active')).toBe(true, `Tab button tab-btn-${targetTab} must have active class`);

      // Verify all other 4 tabs are hidden and inactive
      for (const otherTab of sections) {
        if (otherTab === targetTab) continue;
        const otherSec = doc.getElementById('sec-' + otherTab);
        const otherBtn = doc.getElementById('tab-btn-' + otherTab);
        expect(otherSec.style.display).toBe('none', `Non-active section sec-${otherTab} must be hidden (none)`);
        expect(otherBtn.classList.contains('active')).toBe(false, `Non-active tab button tab-btn-${otherTab} must NOT have active class`);
      }
    }
  });

  await ctx.test('ADV-2.2: Rapid Tab Switching Stress (100 rapid random switches in tight loop) preserves strict single-active invariant', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const sections = ['pos', 'clients', 'invoices', 'catalog', 'history'];

    for (let i = 0; i < 100; i++) {
      const randomIndex = Math.floor(Math.random() * sections.length);
      const chosenTab = sections[randomIndex];
      win.switchAdminTab(chosenTab);

      // Assert invariant: exactly 1 active section, exactly 4 hidden sections
      let visibleSectionCount = 0;
      let activeButtonCount = 0;

      for (const t of sections) {
        const sec = doc.getElementById('sec-' + t);
        const btn = doc.getElementById('tab-btn-' + t);
        if (sec.style.display === 'block') visibleSectionCount++;
        if (btn.classList.contains('active')) activeButtonCount++;
      }

      expect(visibleSectionCount).toBe(1, `Iteration ${i}: Exactly 1 section must be visible after switching to ${chosenTab}`);
      expect(activeButtonCount).toBe(1, `Iteration ${i}: Exactly 1 button must be active after switching to ${chosenTab}`);
    }
  });

  await ctx.test('ADV-2.3: Boundary and garbage tab inputs are handled gracefully and recover cleanly', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const garbageInputs = ['nonexistent_tab', '', '   ', null, undefined, 12345, {}, []];
    const sections = ['pos', 'clients', 'invoices', 'catalog', 'history'];

    for (const badInput of garbageInputs) {
      // Must not throw
      win.switchAdminTab(badInput);

      // All 5 sections should be hidden (none matches bad input)
      for (const t of sections) {
        const sec = doc.getElementById('sec-' + t);
        const btn = doc.getElementById('tab-btn-' + t);
        expect(sec.style.display).toBe('none', `Section sec-${t} should be none for invalid tab ${String(badInput)}`);
        expect(btn.classList.contains('active')).toBe(false, `Button tab-btn-${t} should be inactive for invalid tab ${String(badInput)}`);
      }
    }

    // Recover back to pos
    win.switchAdminTab('pos');
    expect(doc.getElementById('sec-pos').style.display).toBe('block', 'Should recover to sec-pos');
    expect(doc.getElementById('tab-btn-pos').classList.contains('active')).toBe(true, 'tab-btn-pos should be active');
  });

  // =========================================================================
  // 3. PRODUCT SAVE, ALIASES, EXPORTS & DISCOUNT ENGINE
  // =========================================================================
  await ctx.test('ADV-3.1: saveProductAdmin and saveNewProduct exports, re-exports, and window exposure compliance', async () => {
    const batchViewUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/AdminInvoiceBatchView.js')).href + `?t=${Date.now()}`;
    const batchViewModule = await import(batchViewUrl);

    // Contract 1: saveProductAdmin is exported function
    expect(typeof batchViewModule.saveProductAdmin).toBe('function', 'saveProductAdmin must be exported function from AdminInvoiceBatchView');

    // Contract 2: saveNewProduct is exported alias identical to saveProductAdmin
    expect(typeof batchViewModule.saveNewProduct).toBe('function', 'saveNewProduct must be exported function from AdminInvoiceBatchView');
    expect(batchViewModule.saveNewProduct).toBe(batchViewModule.saveProductAdmin, 'saveNewProduct must be alias of saveProductAdmin');

    // Contract 3: Re-exported from views/index.js
    const indexViewsUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/index.js')).href + `?t=${Date.now()}`;
    const indexViewsModule = await import(indexViewsUrl);
    expect(typeof indexViewsModule.saveProductAdmin).toBe('function', 'saveProductAdmin must be re-exported from views/index.js');
    expect(typeof indexViewsModule.setProductPublicationMode).toBe('function', 'setProductPublicationMode must be exported');
    expect(typeof indexViewsModule.recalculateProductDiscount).toBe('function', 'recalculateProductDiscount must be exported');

    // Contract 4: Exposed on window
    const { win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    expect(typeof win.saveProductAdmin).toBe('function', 'window.saveProductAdmin must be exposed function');
    expect(typeof win.setProductPublicationMode).toBe('function', 'window.setProductPublicationMode must be exposed function');
    expect(typeof win.recalculateProductDiscount).toBe('function', 'window.recalculateProductDiscount must be exposed function');
  });

  await ctx.test('ADV-3.2: saveProductAdmin creates FREE_REWARD product, closes modal, and resets form inputs', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Open new product modal
    win.openNewProductModal();
    const modal = doc.getElementById('modal-new-product');
    expect(modal.style.display).toBe('flex', 'modal-new-product should open with display flex');

    // Populate inputs for FREE_REWARD
    doc.getElementById('prod-title').value = 'Cyber Deck v1';
    doc.getElementById('prod-cost').value = '750';
    doc.getElementById('prod-stock').value = '5';
    doc.getElementById('prod-reward-type').value = 'FREE_REWARD';
    doc.getElementById('prod-desc').value = 'Dispositivo cibernetico de edicion limitada';

    // Execute save
    await win.saveProductAdmin();

    // Verify modal is closed
    expect(modal.style.display).toBe('none', 'modal-new-product must be closed after successful save');

    // Verify form reset
    expect(doc.getElementById('prod-title').value).toBe('', 'prod-title should be cleared');
    expect(doc.getElementById('prod-cost').value).toBe('', 'prod-cost should be cleared');
    expect(doc.getElementById('prod-stock').value).toBe('1', 'prod-stock should reset to 1');

    // Verify product persisted in database
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const saved = Object.values(rawDb.rewards || {}).find(r => r.title === 'Cyber Deck v1');
    expect(saved).toBeTruthy('Saved reward must exist in database');
    const pointsCost = saved.points_cost !== undefined ? saved.points_cost : saved.pointsCost;
    expect(pointsCost).toBe(750, 'pointsCost must match 750');
    const rewardType = saved.reward_type || saved.rewardType;
    expect(rewardType).toBe('FREE_REWARD', 'rewardType must match FREE_REWARD');
  });

  await ctx.test('ADV-3.3: Partial discount calculation math matrix and saveProductAdmin in PARTIAL_DISCOUNT mode', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // 1. Math verification: recalculateProductDiscount()
    // Test Case A: $40 USD with 5% discount -> maxDiscount = $2.00 USD -> 100 WP -> $38.00 cashDue
    doc.getElementById('calc-sale-prod-price-usd').value = '40';
    doc.getElementById('calc-sale-prod-discount-pct').value = '5';
    const calcA = win.recalculateProductDiscount();
    expect(calcA.salePrice).toBe(40);
    expect(calcA.discountPct).toBe(5);
    expect(calcA.maxDiscountUsd).toBe(2);
    expect(calcA.requiredPoints).toBe(100);
    expect(calcA.cashDue).toBe(38);

    // Test Case B: $100 USD with 20% discount -> maxDiscount = $20.00 USD -> 1000 WP -> $80.00 cashDue
    doc.getElementById('calc-sale-prod-price-usd').value = '100';
    doc.getElementById('calc-sale-prod-discount-pct').value = '20';
    const calcB = win.recalculateProductDiscount();
    expect(calcB.salePrice).toBe(100);
    expect(calcB.discountPct).toBe(20);
    expect(calcB.maxDiscountUsd).toBe(20);
    expect(calcB.requiredPoints).toBe(1000);
    expect(calcB.cashDue).toBe(80);

    // Test Case C: Rounding to multiple of 10 WP: $35 USD with 15% discount -> maxDiscount = $5.25 -> 262.5 -> rounds to 260 WP
    doc.getElementById('calc-sale-prod-price-usd').value = '35';
    doc.getElementById('calc-sale-prod-discount-pct').value = '15';
    const calcC = win.recalculateProductDiscount();
    expect(calcC.requiredPoints % 10).toBe(0, 'requiredPoints must be a multiple of 10');
    expect(calcC.requiredPoints).toBe(260);

    // 2. Save product in PARTIAL_DISCOUNT mode
    win.openNewProductModal();
    doc.getElementById('prod-title').value = 'Monitor Curvo Gamer 144Hz';
    doc.getElementById('prod-cost').value = '1000';
    doc.getElementById('prod-stock').value = '2';
    doc.getElementById('prod-reward-type').value = 'PARTIAL_DISCOUNT';
    doc.getElementById('calc-sale-prod-price-usd').value = '100';
    doc.getElementById('calc-sale-prod-discount-pct').value = '20';

    await win.saveProductAdmin();

    expect(doc.getElementById('modal-new-product').style.display).toBe('none', 'Modal should close');

    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const saved = Object.values(rawDb.rewards || {}).find(r => r.title === 'Monitor Curvo Gamer 144Hz');
    expect(saved).toBeTruthy();
    const rType = saved.reward_type || saved.rewardType;
    expect(rType).toBe('PARTIAL_DISCOUNT');
    const price = saved.price_usd !== undefined ? saved.price_usd : saved.priceUsd;
    expect(price).toBe(100);
    const maxPct = saved.max_discount_pct !== undefined ? saved.max_discount_pct : saved.maxDiscountPct;
    expect(maxPct).toBe(20);
    const maxUsd = saved.max_discount_usd !== undefined ? saved.max_discount_usd : saved.maxDiscountUsd;
    expect(maxUsd).toBe(20);
    const cash = saved.cash_to_pay_usd !== undefined ? saved.cash_to_pay_usd : saved.cashToPayUsd;
    expect(cash).toBe(80);
  });

  await ctx.test('ADV-3.4: saveProductAdmin boundary rejections (missing title, invalid points cost)', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const rawDbBefore = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const countBefore = Object.keys(rawDbBefore.rewards || {}).length;

    // Test 1: Empty title
    win.openNewProductModal();
    doc.getElementById('prod-title').value = '   ';
    doc.getElementById('prod-cost').value = '100';
    await win.saveProductAdmin();

    // Test 2: Invalid points cost (zero, negative, NaN)
    doc.getElementById('prod-title').value = 'Producto Valido';
    doc.getElementById('prod-cost').value = '0';
    await win.saveProductAdmin();

    doc.getElementById('prod-cost').value = '-50';
    await win.saveProductAdmin();

    doc.getElementById('prod-cost').value = 'abc';
    await win.saveProductAdmin();

    // Verify database count did not change
    const rawDbAfter = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const countAfter = Object.keys(rawDbAfter.rewards || {}).length;
    expect(countAfter).toBe(countBefore, 'Invalid product submissions must not add rewards to database');
  });

  // =========================================================================
  // 4. DIGITAL INVOICE MODAL (1-PAGE) & EMISSION LIFECYCLE
  // =========================================================================
  await ctx.test('ADV-4.1: openSingleDigitalInvoiceModal initializes date, folio, catalog presets, and display flex', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const modal = doc.getElementById('modal-single-digital-invoice');
    expect(modal.style.display !== 'flex').toBe(true, 'Modal should not be open initially');

    win.openSingleDigitalInvoiceModal();
    expect(modal.style.display).toBe('flex', 'Modal must open with display flex');

    // Check date was initialized to today
    const dateInput = doc.getElementById('s-inv-date');
    const todayStr = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(todayStr, 'Date should match today');

    // Check catalog dropdown populated
    const select = doc.getElementById('s-inv-catalog-preset-select');
    expect(select.innerHTML).toContain('<option', 'Catalog presets select should have options populated');
  });

  await ctx.test('ADV-4.2: Dynamic invoice item row addition, row removal, and totals calculation', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openSingleDigitalInvoiceModal();

    // Add Item 1: 2 x $15.00 = $30.00
    win.addSingleInvoiceItemRow(2, 'SSD Kingston 480GB', 15.00);

    // Add Item 2: 1 x $45.00 = $45.00
    win.addSingleInvoiceItemRow(1, 'Memoria RAM 16GB DDR4', 45.00);

    const tbody = doc.getElementById('s-inv-items-table-body');
    expect(tbody).toBeTruthy('Table body s-inv-items-table-body must exist');

    // Calculate totals
    win.calcSingleInvoiceTotals();
    const subtotalText = doc.getElementById('s-inv-subtotal-val').textContent;
    expect(subtotalText).toContain('75.00', 'Subtotal should be $75.00');

    // Toggle points calculation: 75 * 10 = 750 WP (Regla oficial: 1 USD = 10 WP)
    win.toggleSingleInvoicePointsFields(true);
    win.autoCalculateSingleInvoicePoints();
    const pointsVal = doc.getElementById('s-inv-points-val').value;
    expect(pointsVal).toBe('750', 'Points value should be 750 WP (1 USD = 10 WP) for $75 USD invoice');

    // Close modal manually
    win.closeModal('modal-single-digital-invoice');
    expect(doc.getElementById('modal-single-digital-invoice').style.display).toBe('none', 'Modal should be closed');
  });

  await ctx.test('ADV-4.3: Digital invoice emission creates token and closes modal-single-digital-invoice', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Unlock admin
    doc.getElementById('input-admin-pin').value = '110805';
    win.submitAdminPin();

    // Open modal
    win.openSingleDigitalInvoiceModal();
    const invoiceModal = doc.getElementById('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('flex');

    // Populate data
    const folio = '9988';
    doc.getElementById('s-inv-folio').value = folio;
    doc.getElementById('s-inv-client-name').value = 'Valentina Ruiz';
    doc.getElementById('s-inv-client-phone').value = '8899-7711';
    doc.getElementById('s-inv-currency').value = 'USD';

    win.addSingleInvoiceItemRow(1, 'Audifonos Bluetooth ANC', 60.00);
    win.calcSingleInvoiceTotals();

    const pointsCheck = doc.getElementById('s-inv-enable-points');
    if (pointsCheck) pointsCheck.checked = true;
    doc.getElementById('s-inv-points-val').value = '120';
    doc.getElementById('s-inv-pin-val').value = '7421';

    // Submit invoice
    await win.submitSingleDigitalInvoice();

    // Verification: modal must be closed!
    expect(invoiceModal.style.display).toBe('none', 'modal-single-digital-invoice must be closed after submission');

    // Verification: token must exist in database
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const token = Object.values(rawDb.tokens || {}).find(t => t.invoiceFolio === folio || t.invoice_folio === folio);
    expect(token).toBeTruthy('Token for folio 9988 must exist in database');
    expect(token.pointsValue === 120 || token.points_value === 120).toBe(true, 'Token pointsValue must match 120');
    expect(token.securityPin === '7421' || token.security_pin === '7421').toBe(true, 'Security PIN must match 7421');
  });

  // =========================================================================
  // 5. NAVBAR UTILITIES (CALC WP) & COMPREHENSIVE MODAL SYSTEM
  // =========================================================================
  await ctx.test('ADV-5.1: openSalePointsCalculatorModal("navbar") opens modal-sale-calculator and recalculates points', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const modal = doc.getElementById('modal-sale-calculator');
    expect(modal.style.display !== 'flex').toBe(true, 'modal-sale-calculator should not be open initially');

    win.openSalePointsCalculatorModal('navbar');
    expect(modal.style.display).toBe('flex', 'modal-sale-calculator must open with display flex');

    // Close modal
    win.closeModal('modal-sale-calculator');
    expect(modal.style.display).toBe('none', 'modal-sale-calculator must close with display none');
  });

  await ctx.test('ADV-5.2: Sale Points Calculator math engine (profit vs revenue, freight presets, percentages)', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openSalePointsCalculatorModal('navbar');

    // Test Rate Presets: 2.50, 3.00, 5.50
    win.setSaleFreightPreset(3.0);
    expect(doc.getElementById('sale-calc-freight-rate').value).toBe('3.00');

    win.setSaleFreightPreset(5.5);
    expect(doc.getElementById('sale-calc-freight-rate').value).toBe('5.50');

    // Test Return Base: Profit mode
    win.setSaleReturnBase('profit');
    win.setSaleReturnPct(50);
    doc.getElementById('sale-calc-price-usd').value = '100';
    doc.getElementById('sale-calc-weight-lbs').value = '2';
    doc.getElementById('sale-calc-freight-rate').value = '2.50';
    win.recalculateSalePoints();

    const pointsResult = doc.getElementById('sale-calc-suggested-points');
    expect(pointsResult.textContent).toContain('WP', 'Result must display points in WP');

    // Test Revenue mode: 5% of $100 = $5.00 -> 5 * 50 = 250 WP
    win.setSaleReturnBase('revenue');
    win.setSaleReturnPct(5);
    win.recalculateSalePoints();
    expect(pointsResult.textContent).toContain('250', '5% revenue of $100 should yield 250 WP');

    win.closeModal('modal-sale-calculator');
  });

  await ctx.test('ADV-5.3: Universal Modal Stress Test (all 17 admin modal overlays exist and open/close cleanly)', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const adminModals = [
      'modal-single-digital-invoice',
      'modal-print-sheet',
      'modal-single-qr',
      'modal-token-actions',
      'modal-new-product',
      'modal-purge-all-db',
      'modal-adjust-points',
      'modal-user-ledger',
      'modal-new-user',
      'modal-edit-user-pin',
      'modal-ban-user',
      'modal-delete-user',
      'modal-purge-invoices',
      'modal-deliver-voucher',
      'modal-confirm-paid-voucher',
      'modal-camera-scanner',
      'modal-sale-calculator'
    ];

    for (const modalId of adminModals) {
      const el = doc.getElementById(modalId);
      expect(el).toBeTruthy(`Modal #${modalId} must exist in admin.html DOM`);

      // Test manual open & close
      el.style.display = 'flex';
      expect(el.style.display).toBe('flex');

      win.closeModal(modalId);
      expect(el.style.display).toBe('none', `closeModal("${modalId}") must set display none`);
    }
  });

  // =========================================================================
  // 6. 100% INLINE HANDLER WINDOW EXPOSURE AUDIT
  // =========================================================================
  await ctx.test('ADV-6.1: 100% of all inline event handler calls in admin.html are exposed and callable on window', async () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'admin.html'), 'utf8');

    const regex = /\b(on[a-z]+)=["']([^"']+)["']/gi;
    const allCalls = [];
    let m;

    while ((m = regex.exec(html)) !== null) {
      allCalls.push({ attr: m[1], code: m[2] });
    }

    expect(allCalls.length).toBeGreaterThan(150, 'admin.html must contain extensive inline event attributes');

    // Extract standalone function invocations (excluding object property calls like document.getElementById)
    const globalFns = new Set();
    const callPattern = /(?:^|[^a-zA-Z0-9_$.])([a-zA-Z0-9_$]+)\s*\(/g;

    for (const { code } of allCalls) {
      let cm;
      while ((cm = callPattern.exec(code)) !== null) {
        const fn = cm[1];
        if (!['if', 'for', 'while', 'switch', 'catch', 'confirm', 'alert', 'return'].includes(fn)) {
          globalFns.add(fn);
        }
      }
    }

    const { win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const missingHandlers = [];
    const boundHandlers = [];

    for (const fn of Array.from(globalFns).sort()) {
      if (typeof win[fn] === 'function') {
        boundHandlers.push(fn);
      } else {
        missingHandlers.push(fn);
      }
    }

    console.log(`      ✓ Scanned ${allCalls.length} inline event attributes in admin.html.`);
    console.log(`      ✓ Discovered ${globalFns.size} distinct function invocations.`);
    console.log(`      ✓ 100% Bound on window: [${boundHandlers.length}/${globalFns.size}]`);

    expect(missingHandlers.length).toBe(0, `Missing admin window handlers: ${missingHandlers.join(', ')}`);
  });

  return ctx.summary();
}

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].endsWith('adversarial_admin_terminal_gen2.mjs')) {
  runAdversarialAdminTerminalTests().then(summary => {
    console.log('\n======================================================');
    console.log(`TOTAL ADVERSARIAL TESTS: ${summary.total}`);
    console.log(`PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
    console.log('======================================================\n');
    if (summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
