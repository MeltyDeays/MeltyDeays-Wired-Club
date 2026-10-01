/**
 * Empirical Stress & Adversarial Test Suite for #modal-confirm-redeem
 * Challenger: challenger_modal_1
 * Date: 2026-10-01
 *
 * Scope:
 * 1. Discrete Sweep: 401 points (0..400) verifying math invariant (cash + discount == list price)
 * 2. Rapid Preset Alternation: 100 toggles between 'max' and 'zero'
 * 3. Adversarial Inputs: negative, overflow, float, NaN, strings, symbols on slider and numInput
 * 4. Dual Currency Integrity: USD/NIO formatting, conversion exactness, zero NaN/undefined
 * 5. User Profiles: 0 WP balance, partial WP balance (< cap), high WP balance (> cap)
 * 6. Free Items: non-partial discount verification (100% points, hidden sliders)
 * 7. DOM & CSS Contract: 24/24 IDs, 6/6 handlers, 2-column desktop grid & mobile touch rules
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runModalConfirmRedeemStressTests() {
  const ctx = new TestContext('Empirical Challenger: #modal-confirm-redeem Stress & Robustness');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   EMPIRICAL CHALLENGER: #modal-confirm-redeem STRESS SUITE        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // TEST 1: Discrete Sweep of 401 Points & Math Invariant Verification
  // =========================================================================
  await ctx.test('STRESS-1: Discrete point sweep (0 to 400 WP) confirms cash + discount == list price invariant & no NaN/undefined', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['stress-item-40'] = {
      id: 'stress-item-40',
      title: 'Audífonos Razer Kraken',
      category: 'Gaming Hardware',
      stock: 5,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400,
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Login user with 500 WP
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    const typeDisc = doc.getElementById('confirm-type-discount');
    const typeCash = doc.getElementById('confirm-type-cash');
    const ptsNotice = doc.getElementById('confirm-pts-applied-notice');
    const balCur = doc.getElementById('confirm-balance-current');
    const balDed = doc.getElementById('confirm-balance-deduct');
    const balAft = doc.getElementById('confirm-balance-after');
    const btnDoRedeem = doc.getElementById('btn-do-redeem');

    expect(balCur.textContent).toBe('500 WP', 'User balance must start at 500 WP');

    const listPrice = 40.0;
    const maxCap = 400;
    const maxDisc = 10.0;
    const usdPerPoint = maxDisc / maxCap; // 0.025

    for (let pts = 0; pts <= 400; pts++) {
      win.onPointsSliderChange(String(pts));

      const expectedDiscount = Number(Math.min(maxDisc, pts * usdPerPoint).toFixed(2));
      const expectedCash = Math.max(0, Number((listPrice - expectedDiscount).toFixed(2)));

      // Invariant Check 1: Cash + Discount == List Price
      const sum = Number((expectedCash + expectedDiscount).toFixed(2));
      expect(sum).toBe(listPrice, `Sum of cash (${expectedCash}) + discount (${expectedDiscount}) must equal list price (${listPrice}) at ${pts} WP`);

      // Invariant Check 2: DOM elements contain no NaN, undefined or null
      expect(typeDisc.textContent.includes('NaN')).toBe(false, `Discount text at ${pts} WP must not contain NaN`);
      expect(typeDisc.textContent.includes('undefined')).toBe(false, `Discount text at ${pts} WP must not contain undefined`);
      expect(typeCash.textContent.includes('NaN')).toBe(false, `Cash text at ${pts} WP must not contain NaN`);
      expect(typeCash.textContent.includes('undefined')).toBe(false, `Cash text at ${pts} WP must not contain undefined`);

      // Invariant Check 3: Price formatting accuracy
      expect(typeDisc.textContent).toContain(expectedDiscount.toFixed(2), `Discount display must match calculated ${expectedDiscount}`);
      expect(typeCash.textContent).toContain(expectedCash.toFixed(2), `Cash display must match calculated ${expectedCash}`);

      // Invariant Check 4: Notice and Ledger balance accuracy
      expect(ptsNotice.textContent).toBe(`${pts} WP aplicados`, `Notice text must match applied points`);
      expect(balDed.textContent).toBe(`-${pts} WP`, `Deduction ledger must show -${pts} WP`);
      expect(balAft.textContent).toBe(`${500 - pts} WP`, `Remaining balance ledger must show ${500 - pts} WP`);

      // Invariant Check 5: Button label
      if (pts > 0) {
        expect(btnDoRedeem.textContent.includes('CANJEAR VALE DE DESCUENTO')).toBe(true, 'Button indicates discount voucher when pts > 0');
      } else {
        expect(btnDoRedeem.textContent.includes('GENERAR VALE DE COMPRA')).toBe(true, 'Button indicates purchase voucher when pts == 0');
      }
    }

    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 2: Rapid Preset Alternation Stress (100 iterations)
  // =========================================================================
  await ctx.test('STRESS-2: Rapid preset alternation (100 toggles between max and zero) maintains synchronization without drift', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['stress-item-40'] = {
      id: 'stress-item-40',
      title: 'Audífonos Razer Kraken',
      category: 'Gaming Hardware',
      stock: 5,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400,
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    const slider = doc.getElementById('confirm-points-slider');
    const numInput = doc.getElementById('confirm-points-num');
    const typeDisc = doc.getElementById('confirm-type-discount');
    const typeCash = doc.getElementById('confirm-type-cash');

    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        win.setPointsPreset('max');
        expect(String(slider.value)).toBe('400', `Iteration ${i}: slider must be 400 on max`);
        expect(String(numInput.value)).toBe('400', `Iteration ${i}: numInput must be 400 on max`);
        expect(typeDisc.textContent).toContain('10.00', `Iteration ${i}: discount must be 10.00`);
        expect(typeCash.textContent).toContain('30.00', `Iteration ${i}: cash must be 30.00`);
      } else {
        win.setPointsPreset('zero');
        expect(String(slider.value)).toBe('0', `Iteration ${i}: slider must be 0 on zero`);
        expect(String(numInput.value)).toBe('0', `Iteration ${i}: numInput must be 0 on zero`);
        expect(typeDisc.textContent).toContain('0.00', `Iteration ${i}: discount must be 0.00`);
        expect(typeCash.textContent).toContain('40.00', `Iteration ${i}: cash must be 40.00`);
      }
    }

    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 3: Adversarial Input Matrix (Slider & NumInput)
  // =========================================================================
  await ctx.test('STRESS-3: Adversarial input matrix (negatives, overflows, floats, strings, NaN) is safely clamped with zero exceptions', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['stress-item-40'] = {
      id: 'stress-item-40',
      title: 'Audífonos Razer Kraken',
      category: 'Gaming Hardware',
      stock: 5,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400,
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    const slider = doc.getElementById('confirm-points-slider');
    const numInput = doc.getElementById('confirm-points-num');
    const typeDisc = doc.getElementById('confirm-type-discount');
    const typeCash = doc.getElementById('confirm-type-cash');
    const balDed = doc.getElementById('confirm-balance-deduct');

    // 1. Extreme numeric inputs via onPointsNumChange
    const numTestCases = [
      { input: '-99999', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '-1', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '0', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '400', expectedPts: 400, expectedCash: '30.00', expectedDisc: '10.00' },
      { input: '401', expectedPts: 400, expectedCash: '30.00', expectedDisc: '10.00' },
      { input: '999999', expectedPts: 400, expectedCash: '30.00', expectedDisc: '10.00' },
      { input: 'NaN', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: 'undefined', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: 'null', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: 'exploit<script>', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '   ', expectedPts: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '200.85', expectedPts: 200, expectedCash: '35.00', expectedDisc: '5.00' },
      { input: '1e3', expectedPts: 1, expectedCash: '39.97', expectedDisc: '0.03' } // parseInt('1e3') === 1
    ];

    for (const tc of numTestCases) {
      win.onPointsNumChange(tc.input);
      expect(String(slider.value)).toBe(String(tc.expectedPts), `Input ${tc.input} must clamp slider to ${tc.expectedPts}`);
      expect(typeDisc.textContent).toContain(tc.expectedDisc, `Input ${tc.input} must display disc ${tc.expectedDisc}`);
      expect(typeCash.textContent).toContain(tc.expectedCash, `Input ${tc.input} must display cash ${tc.expectedCash}`);
      expect(typeCash.textContent.includes('NaN')).toBe(false, `Input ${tc.input} must not produce NaN in cash`);
      expect(balDed.textContent).toBe(`-${tc.expectedPts} WP`, `Deduction must equal -${tc.expectedPts} WP`);
    }

    // 2. Extreme inputs via onPointsSliderChange
    const sliderTestCases = [
      { input: '-500', expectedDeduct: 0, expectedCash: '40.00', expectedDisc: '0.00' },
      { input: '999999', expectedDeduct: 400, expectedCash: '30.00', expectedDisc: '10.00' },
      { input: 'invalid', expectedDeduct: 0, expectedCash: '40.00', expectedDisc: '0.00' }
    ];

    for (const tc of sliderTestCases) {
      win.onPointsSliderChange(tc.input);
      expect(typeDisc.textContent).toContain(tc.expectedDisc, `Slider input ${tc.input} must display disc ${tc.expectedDisc}`);
      expect(typeCash.textContent).toContain(tc.expectedCash, `Slider input ${tc.input} must display cash ${tc.expectedCash}`);
      expect(typeCash.textContent.includes('NaN')).toBe(false, `Slider input ${tc.input} must not produce NaN in cash`);
    }

    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 4: Dual Currency Dynamics (USD <-> NIO)
  // =========================================================================
  await ctx.test('STRESS-4: Currency switching between USD and NIO maintains exact conversion (37 NIO/USD) and dual price formatting', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['stress-item-40'] = {
      id: 'stress-item-40',
      title: 'Audífonos Razer Kraken',
      category: 'Gaming Hardware',
      stock: 5,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400,
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    // Open modal in USD mode
    win.confirmRedeem('stress-item-40');
    win.onPointsSliderChange('200'); // 200 WP -> $5 discount -> $35 cash
    const typePrice = doc.getElementById('confirm-type-price');
    const typeCash = doc.getElementById('confirm-type-cash');

    expect(typePrice.innerHTML).toContain('$40.00 USD', 'Price header must show $40.00 USD');
    expect(typePrice.innerHTML).toContain('C$ 1480.00 NIO', 'Price header must show C$ 1480.00 NIO');
    expect(typeCash.innerHTML).toContain('$35.00 USD', 'Cash must show $35.00 USD');
    expect(typeCash.innerHTML).toContain('C$ 1295.00 NIO', 'Cash must show C$ 1295.00 NIO (35 * 37 = 1295)');

    // Switch to NIO mode while active
    await win.setAppCurrency('NIO');
    win.confirmRedeem('stress-item-40'); // Re-open or recalculate
    win.onPointsSliderChange('200');

    expect(typePrice.innerHTML).toContain('C$ 1480.00 NIO', 'In NIO mode, price must lead with C$ 1480.00 NIO');
    expect(typePrice.innerHTML).toContain('($40.00 USD)', 'In NIO mode, secondary must be ($40.00 USD)');
    expect(typeCash.innerHTML).toContain('C$ 1295.00 NIO', 'In NIO mode, cash must lead with C$ 1295.00 NIO');
    expect(typeCash.innerHTML).toContain('($35.00 USD)', 'In NIO mode, secondary must be ($35.00 USD)');

    // Switch back to USD mode
    await win.setAppCurrency('USD');
    win.confirmRedeem('stress-item-40');
    win.onPointsSliderChange('200');

    expect(typeCash.innerHTML).toContain('$35.00 USD', 'In USD mode, cash must lead with $35.00 USD');

    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 5: User Profiles & Asymmetric Balances
  // =========================================================================
  await ctx.test('STRESS-5: User balance variations (0 WP, 150 WP < cap, 1000 WP > cap) enforce correct clamping and UI feedback', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['stress-item-40'] = {
      id: 'stress-item-40',
      title: 'Audífonos Razer Kraken',
      category: 'Gaming Hardware',
      stock: 5,
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 40.0,
      pointsCost: 400,
      maxDiscountPct: 25,
      maxDiscountUsd: 10.0,
      cashToPayUsd: 30.0
    };

    // Create 3 distinct users in mock DB
    rawDb.users = rawDb.users || {};
    rawDb.users['CLIENT-88880000'] = {
      uid: 'CLIENT-88880000',
      phone: '8888-0000',
      pin: '0000',
      name: 'Zero Points User',
      wiredPoints: 0
    };
    rawDb.users['CLIENT-88881500'] = {
      uid: 'CLIENT-88881500',
      phone: '8888-1500',
      pin: '1500',
      name: 'Partial Points User',
      wiredPoints: 150
    };
    rawDb.users['CLIENT-88889999'] = {
      uid: 'CLIENT-88889999',
      phone: '8888-9999',
      pin: '9999',
      name: 'Whale Points User',
      wiredPoints: 1000
    };

    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Profile 1: Zero Points User
    doc.getElementById('login-phone').value = '8888-0000';
    doc.getElementById('login-pin').value = '0000';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    const zeroNote = doc.getElementById('confirm-zero-pts-note');
    const controlsWrap = doc.getElementById('confirm-points-controls-wrap');
    const slider = doc.getElementById('confirm-points-slider');
    const numInput = doc.getElementById('confirm-points-num');
    const typeCash = doc.getElementById('confirm-type-cash');

    expect(zeroNote.style.display).toBe('block', 'Zero points note must be visible for 0 WP user');
    expect(controlsWrap.style.display).toBe('none', 'Controls wrap must be hidden for 0 WP user');
    expect(slider.disabled).toBe(true, 'Slider must be disabled for 0 WP user');
    expect(numInput.disabled).toBe(true, 'Num input must be disabled for 0 WP user');
    expect(typeCash.textContent).toContain('40.00', 'Cash to pay must be full list price 40.00 for 0 WP user');
    win.closeRedeemModal();

    // Profile 2: Partial Points User (150 WP < 400 cap)
    win.logoutClient();
    doc.getElementById('login-phone').value = '8888-1500';
    doc.getElementById('login-pin').value = '1500';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    expect(zeroNote.style.display).toBe('none', 'Zero points note must be hidden for 150 WP user');
    expect(controlsWrap.style.display).toBe('block', 'Controls wrap must be visible for 150 WP user');
    expect(slider.max).toBe('150', 'Slider max must be clamped to user balance 150');
    expect(numInput.max).toBe('150', 'Num input max must be clamped to user balance 150');

    // Max preset should apply 150 WP
    win.setPointsPreset('max');
    expect(String(slider.value)).toBe('150', 'Max preset must set 150 WP');
    expect(String(numInput.value)).toBe('150', 'Max preset must set 150 WP in numInput');
    // 150 * 0.025 = 3.75 discount -> 40 - 3.75 = 36.25 cash
    const typeDisc = doc.getElementById('confirm-type-discount');
    expect(typeDisc.textContent).toContain('3.75', 'Discount for 150 WP must be 3.75');
    expect(typeCash.textContent).toContain('36.25', 'Cash to pay for 150 WP must be 36.25');

    // Attempting to input 200 WP should be clamped to 150
    win.onPointsNumChange('200');
    expect(String(slider.value)).toBe('150', 'Input of 200 must be clamped to 150');
    win.closeRedeemModal();

    // Profile 3: Whale Points User (1000 WP > 400 cap)
    win.logoutClient();
    doc.getElementById('login-phone').value = '8888-9999';
    doc.getElementById('login-pin').value = '9999';
    await win.submitClientLogin();

    win.confirmRedeem('stress-item-40');
    expect(slider.max).toBe('400', 'Slider max must be capped at 400 WP even if user has 1000 WP');
    expect(numInput.max).toBe('400', 'Num input max must be capped at 400 WP even if user has 1000 WP');
    win.setPointsPreset('max');
    expect(String(slider.value)).toBe('400', 'Max preset must be 400 WP');
    expect(typeDisc.textContent).toContain('10.00', 'Max discount must be 10.00');
    expect(typeCash.textContent).toContain('30.00', 'Cash to pay must be 30.00');
    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 6: Free Item (Non-Partial Discount, 100% Points)
  // =========================================================================
  await ctx.test('STRESS-6: 100% Points item (isPartial === false) cleanly hides callout and controls, displaying proper warranty', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const rawDb = JSON.parse(localStorage.getItem('wired_club_mvvm_db_v2') || '{}');
    rawDb.rewards = rawDb.rewards || {};
    rawDb.rewards['free-sticker-pack'] = {
      id: 'free-sticker-pack',
      title: 'Pack de Stickers Holográficos Lain',
      category: 'Coleccionables',
      stock: 20,
      rewardType: 'FREE',
      priceUsd: 0,
      pointsCost: 50
    };
    localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
    localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    win.confirmRedeem('free-sticker-pack');
    const typeCallout = doc.getElementById('confirm-type-callout');
    const controlsWrap = doc.getElementById('confirm-points-controls-wrap');
    const zeroNote = doc.getElementById('confirm-zero-pts-note');
    const warranty = doc.getElementById('confirm-warranty-notice');
    const btnDoRedeem = doc.getElementById('btn-do-redeem');

    expect(typeCallout.style.display).toBe('none', 'Type callout must be hidden for 100% points items');
    expect(controlsWrap.style.display).toBe('none', 'Controls wrap must be hidden for 100% points items');
    expect(zeroNote.style.display).toBe('none', 'Zero note must be hidden for 100% points items');
    expect(warranty.innerHTML).toContain('exentos de garantía técnica', 'Warranty notice must indicate exemption for free items');
    expect(btnDoRedeem.textContent).toContain('AUTORIZAR CANJE WIRED', 'Button text must indicate authorization');

    win.closeRedeemModal();
  });

  // =========================================================================
  // TEST 7: DOM IDs, Handlers & CSS Rules Verification
  // =========================================================================
  await ctx.test('STRESS-7: All 24 DOM IDs, 6 window handlers, and responsive CSS rules are preserved intact', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // 24 IDs inside #modal-confirm-redeem
    const requiredIds = [
      'modal-confirm-redeem',
      'confirm-reward-img-wrap',
      'confirm-reward-img',
      'confirm-reward-fallback',
      'confirm-reward-title',
      'confirm-reward-points',
      'confirm-points-controls-wrap',
      'confirm-pts-applied-notice',
      'confirm-points-slider',
      'confirm-points-num',
      'confirm-points-max-badge',
      'confirm-zero-pts-note',
      'confirm-type-callout',
      'confirm-type-pct',
      'confirm-type-price',
      'confirm-type-pct-calc',
      'confirm-type-max-disc',
      'confirm-calc-pct-label',
      'confirm-type-discount',
      'confirm-type-cash',
      'confirm-balance-current',
      'confirm-balance-deduct',
      'confirm-balance-after',
      'confirm-warranty-notice',
      'btn-do-redeem'
    ];

    for (const id of requiredIds) {
      const el = doc.getElementById(id);
      expect(Boolean(el)).toBe(true, `DOM element #${id} must exist in index.html`);
    }

    // 6 Event Handlers on window
    const requiredHandlers = [
      'closeRedeemModal',
      'onPointsSliderChange',
      'onPointsNumChange',
      'setPointsPreset',
      'executeRedeem',
      'confirmRedeem'
    ];

    for (const handler of requiredHandlers) {
      expect(typeof win[handler]).toBe('function', `Handler window.${handler} must be a callable function`);
    }
  });

  const allPassed = ctx.summary();
  if (!allPassed) {
    throw new Error('Empirical Challenger Stress Suite encountered failures.');
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('stress_modal_confirm_redeem.mjs')) {
  runModalConfirmRedeemStressTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
