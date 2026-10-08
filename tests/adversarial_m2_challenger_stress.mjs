/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: MILESTONE M2
 * ============================================================================
 * Target: Admin Terminal Dynamic Product Tabs & Combo Builder
 * Files: admin.html, css/admin.css, js/views/AdminInvoiceBatchView.js, js/admin-app.js
 *
 * Empirical Verification Track:
 *   1. Boundary N = 2 Enforcement & Malicious Deletion / Selection Input Stress
 *   2. Strict Validation Matrix on saveProductAdmin (empty title, whitespace, negative/0 prices)
 *   3. Bi-directional Uncommitted Form Auto-sync on Tab Switch, Add & Save
 *   4. Financial Math Engine Stress (Zero sum, promo price > sum, floating point precision)
 *   5. Product Edit Mode Lifecycle & Type Switching Integrity (COMBO <-> STANDARD)
 *   6. Mobile Ergonomics (<600px touch targets, scrollable tabs, sticky summary panel)
 *   7. Chaos Stress Test: 50 Rapid Random Mutations (Add, Delete, Edit, Select, Summarize)
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const loadAdminApp = async (win) => {
  const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
  await import(adminAppUrl);
  win.document.dispatchEvent({ type: 'DOMContentLoaded' });
};

export async function runAdversarialM2StressSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL CHALLENGER: MILESTONE M2 EMPIRICAL STRESS HARNESS    ║');
  console.log('║   Admin Terminal Dynamic Product Tabs & Combo Builder              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const findings = [];
  let testCount = 0;

  function logFinding(severity, id, title, description, evidence) {
    findings.push({ severity, id, title, description, evidence });
    console.log(`\n🚨 [CONFIRMED BUG: ${severity}] ${id} - ${title}`);
    console.log(`   Description: ${description}`);
    console.log(`   Evidence: ${evidence}\n`);
  }

  // =========================================================================
  // SECTION 1: BOUNDARY N = 2 ENFORCEMENT & MALICIOUS INPUT STRESS
  // =========================================================================
  console.log('[SECTION 1] Testing Boundary N = 2 & Malicious Deletion/Selection Inputs...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    if (!tabsBar) {
      logFinding('HIGH', 'BUG-M2-01', 'Tabs bar element missing', 'combo-items-tabs-bar element not found in DOM', '');
    }

    // Try deleting when N = 2
    win.removeComboItemTab(0);
    win.removeComboItemTab(1);
    let tabs = tabsBar.querySelectorAll('.combo-tab-item');
    if (tabs.length !== 2) {
      logFinding('CRITICAL', 'BUG-M2-02', 'Under-boundary deletion violation', `Tabs reduced to ${tabs.length} items (expected minimum 2)`, `tabs.length = ${tabs.length}`);
    }

    // Malicious index deletions
    const maliciousIndices = [-1, 999, 'invalid', NaN, null, undefined, {}];
    for (const badIdx of maliciousIndices) {
      try {
        win.removeComboItemTab(badIdx);
        tabs = tabsBar.querySelectorAll('.combo-tab-item');
        if (tabs.length !== 2) {
          logFinding('HIGH', 'BUG-M2-03', 'Malformed delete index altered state', `Bad index ${badIdx} altered tab count to ${tabs.length}`, `Index: ${badIdx}`);
        }
      } catch (err) {
        logFinding('HIGH', 'BUG-M2-04', 'Unhandled exception on bad delete index', err.message, `Index: ${badIdx}`);
      }
    }

    // Malicious select tab calls
    for (const badIdx of maliciousIndices) {
      try {
        win.selectComboItemTab(badIdx);
      } catch (err) {
        logFinding('HIGH', 'BUG-M2-05', 'Unhandled exception on bad select tab index', err.message, `Index: ${badIdx}`);
      }
    }

    // Add up to 10 items and delete middle items
    for (let i = 0; i < 8; i++) {
      win.addComboItemTab();
    }
    tabs = tabsBar.querySelectorAll('.combo-tab-item');
    if (tabs.length !== 10) {
      logFinding('HIGH', 'BUG-M2-06', 'Failed to expand tabs to N=10', `Expected 10 tabs, got ${tabs.length}`, `N=10 expansion`);
    }

    // Delete active tab when active is last tab (index 9)
    win.selectComboItemTab(9);
    win.removeComboItemTab(9);
    tabs = tabsBar.querySelectorAll('.combo-tab-item');
    if (tabs.length !== 9) {
      logFinding('MEDIUM', 'BUG-M2-07', 'Delete tab failed on last index', `Expected 9 tabs, got ${tabs.length}`, `removeComboItemTab(9)`);
    }
  }

  // =========================================================================
  // SECTION 2: STRICT VALIDATION MATRIX ON saveProductAdmin
  // =========================================================================
  console.log('[SECTION 2] Testing Strict Validation Matrix on saveProductAdmin...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const modal = doc.getElementById('modal-new-product');

    // Attack 2.1: Empty title on Item 1
    win.selectComboItemTab(0);
    doc.getElementById('combo-item-title').value = '';
    win.onActiveComboItemChange('title', '');
    doc.getElementById('combo-item-price').value = '25.00';
    win.onActiveComboItemChange('priceUsd', '25.00');

    await win.saveProductAdmin();
    if (modal.style.display === 'none') {
      logFinding('CRITICAL', 'BUG-M2-08', 'Validation bypass on empty item title', 'Modal closed and saved despite item 1 missing title', 'item 1 title = empty');
    }

    // Attack 2.2: Whitespace-only title on Item 1
    doc.getElementById('combo-item-title').value = '     ';
    win.onActiveComboItemChange('title', '     ');
    await win.saveProductAdmin();
    if (modal.style.display === 'none') {
      logFinding('CRITICAL', 'BUG-M2-09', 'Validation bypass on whitespace-only item title', 'Modal closed and saved with whitespace title', 'item 1 title = spaces');
    }

    // Fix item 1 title, test Attack 2.3: Zero price on Item 2
    doc.getElementById('combo-item-title').value = 'Teclado Gamer';
    win.onActiveComboItemChange('title', 'Teclado Gamer');

    win.selectComboItemTab(1);
    doc.getElementById('combo-item-title').value = 'Mouse Gamer';
    win.onActiveComboItemChange('title', 'Mouse Gamer');
    doc.getElementById('combo-item-price').value = '0';
    win.onActiveComboItemChange('priceUsd', '0');

    await win.saveProductAdmin();
    if (modal.style.display === 'none') {
      logFinding('HIGH', 'BUG-M2-10', 'Validation bypass on zero price item', 'Modal saved item with $0 regular price in combo', 'item 2 price = 0');
    }

    // Attack 2.4: Negative price on Item 2
    doc.getElementById('combo-item-price').value = '-15.00';
    win.onActiveComboItemChange('priceUsd', '-15.00');
    await win.saveProductAdmin();
    if (modal.style.display === 'none') {
      logFinding('HIGH', 'BUG-M2-11', 'Validation bypass on negative price item', 'Modal saved item with negative regular price', 'item 2 price = -15.00');
    }
  }

  // =========================================================================
  // SECTION 3: BI-DIRECTIONAL UNCOMMITTED FORM AUTO-SYNC
  // =========================================================================
  console.log('[SECTION 3] Testing Bi-directional Uncommitted Form Auto-sync...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    // User types directly into DOM inputs without onActiveComboItemChange event
    const titleInput = doc.getElementById('combo-item-title');
    const priceInput = doc.getElementById('combo-item-price');
    const resPriceInput = doc.getElementById('combo-item-residual-price');
    const resDiscInput = doc.getElementById('combo-item-residual-discount-pct');
    const imgInput = doc.getElementById('combo-item-image');
    const descInput = doc.getElementById('combo-item-desc');

    titleInput.value = 'Auriculares HyperX';
    priceInput.value = '55.50';
    resPriceInput.value = '60.00';
    resDiscInput.value = '25';
    imgInput.value = 'https://example.com/hyperx.png';
    descInput.value = 'Sonido envolvente 7.1';

    // Now switch to tab 1: tab 0 inputs MUST be automatically synced!
    win.selectComboItemTab(1);

    // Switch back to tab 0
    win.selectComboItemTab(0);

    if (titleInput.value !== 'Auriculares HyperX') {
      logFinding('HIGH', 'BUG-M2-12', 'Uncommitted title lost on tab switch', `Expected 'Auriculares HyperX', got '${titleInput.value}'`, titleInput.value);
    }
    if (parseFloat(priceInput.value) !== 55.50) {
      logFinding('HIGH', 'BUG-M2-13', 'Uncommitted price lost on tab switch', `Expected 55.50, got ${priceInput.value}`, priceInput.value);
    }
    if (parseFloat(resPriceInput.value) !== 60.00) {
      logFinding('HIGH', 'BUG-M2-14', 'Uncommitted residual price lost on tab switch', `Expected 60.00, got ${resPriceInput.value}`, resPriceInput.value);
    }
    if (imgInput.value !== 'https://example.com/hyperx.png') {
      logFinding('HIGH', 'BUG-M2-15', 'Uncommitted image URL lost on tab switch', `Expected image URL, got '${imgInput.value}'`, imgInput.value);
    }

    // Now test auto-sync on addComboItemTab()
    titleInput.value = 'Auriculares HyperX Modificados';
    win.addComboItemTab(); // Adds tab 2 and switches to it
    win.selectComboItemTab(0); // Check tab 0 again
    if (titleInput.value !== 'Auriculares HyperX Modificados') {
      logFinding('HIGH', 'BUG-M2-16', 'Uncommitted input lost on addComboItemTab', `Expected modified title, got '${titleInput.value}'`, titleInput.value);
    }
  }

  // =========================================================================
  // SECTION 4: FINANCIAL MATH ENGINE STRESS (ZERO SUM, HIGHER PROMO, FLOATS)
  // =========================================================================
  console.log('[SECTION 4] Testing Financial Math Engine Stress...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const sumEl = doc.getElementById('combo-sum-usd');
    const promoInput = doc.getElementById('combo-promo-price-usd');
    const savingsEl = doc.getElementById('combo-savings-usd');
    const badgeEl = doc.getElementById('combo-savings-badge');

    // Case 4.1: Sum = $0.00
    win.selectComboItemTab(0);
    win.onActiveComboItemChange('priceUsd', 0);
    win.selectComboItemTab(1);
    win.onActiveComboItemChange('priceUsd', 0);
    promoInput.value = '0';
    win.updateComboLiveSummary();

    if (savingsEl.textContent.includes('NaN') || badgeEl.textContent.includes('NaN')) {
      logFinding('CRITICAL', 'BUG-M2-17', 'NaN in savings calculation with $0 sum', savingsEl.textContent, 'sum = 0, promo = 0');
    }

    // Case 4.2: Promo price > sum (Unfavorable combo: sum=$30, promo=$40)
    win.selectComboItemTab(0);
    win.onActiveComboItemChange('priceUsd', 15);
    win.selectComboItemTab(1);
    win.onActiveComboItemChange('priceUsd', 15);
    promoInput.value = '40';
    win.updateComboLiveSummary();

    if (savingsEl.textContent.includes('-') || badgeEl.textContent.includes('-')) {
      logFinding('MEDIUM', 'BUG-M2-18', 'Negative savings displayed in UI', savingsEl.textContent, 'sum = 30, promo = 40');
    }

    // Case 4.3: Floating point precision check ($19.99 + $10.01 = $30.00 exactly)
    win.selectComboItemTab(0);
    const p0 = doc.getElementById('combo-item-price');
    p0.value = '19.99';
    win.onActiveComboItemChange('priceUsd', 19.99);

    win.selectComboItemTab(1);
    const p1 = doc.getElementById('combo-item-price');
    p1.value = '10.01';
    win.onActiveComboItemChange('priceUsd', 10.01);
    win.updateComboLiveSummary();

    if (!sumEl.textContent.includes('$30.00 USD')) {
      logFinding('MEDIUM', 'BUG-M2-19', 'Floating point precision leak in sum', sumEl.textContent, '19.99 + 10.01');
    }

    // Case 4.4: Clamping max discount percentage
    const maxDiscInput = doc.getElementById('combo-max-discount-pct');
    maxDiscInput.value = '150'; // Out of bounds
    win.updateComboLiveSummary();
    const prodMaxPctHidden = doc.getElementById('prod-max-discount-pct');
    if (parseFloat(prodMaxPctHidden.value) > 100) {
      logFinding('HIGH', 'BUG-M2-20', 'Max discount percentage unclamped > 100%', prodMaxPctHidden.value, '150%');
    }
  }

  // =========================================================================
  // SECTION 5: EDIT MODE LIFECYCLE & TYPE SWITCHING INTEGRITY
  // =========================================================================
  console.log('[SECTION 5] Testing Product Edit Mode Lifecycle & Type Switching...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    // Mock an existing COMBO product in vm.catalog
    const { RewardModel } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/models/RewardModel.js')).href);
    const existingCombo = new RewardModel({
      id: 'reward-combo-99',
      title: 'Pack Haibane Renmei Artbook + CD',
      rewardType: 'COMBO',
      priceUsd: 45.00,
      stock: 1,
      comboData: {
        items: [
          { id: 'item-1', title: 'Artbook Original', priceUsd: 30.00, residualPriceUsd: 32.00, residualMaxDiscountPct: 15, imageUrl: 'https://ex.com/art.jpg', description: 'Libro de arte' },
          { id: 'item-2', title: 'OST CD Soundtrack', priceUsd: 25.00, residualPriceUsd: 28.00, residualMaxDiscountPct: 20, imageUrl: 'https://ex.com/cd.jpg', description: 'Banda sonora' }
        ]
      }
    });

    const batchViewUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/AdminInvoiceBatchView.js')).href;
    const batchView = await import(batchViewUrl);
    batchView.initAdminInvoiceBatchView({
      vm: { catalog: [existingCombo] }
    });

    // Open edit modal
    win.openEditProductModal('reward-combo-99');

    const editIdEl = doc.getElementById('prod-edit-id');
    const secCombo = doc.getElementById('sec-product-combo-builder');
    const tabsBar = doc.getElementById('combo-items-tabs-bar');

    if (editIdEl.value !== 'reward-combo-99') {
      logFinding('CRITICAL', 'BUG-M2-21', 'Edit ID not populated on openEditProductModal', editIdEl.value, 'reward-combo-99');
    }
    if (secCombo.style.display !== 'block') {
      logFinding('CRITICAL', 'BUG-M2-22', 'Combo section not displayed on edit COMBO product', secCombo.style.display, 'block');
    }

    const tabs = tabsBar.querySelectorAll('.combo-tab-item');
    if (tabs.length !== 2) {
      logFinding('HIGH', 'BUG-M2-23', 'Existing combo items not rendered in tabs', `Expected 2 tabs, got ${tabs.length}`, 'reward-combo-99');
    }

    // Now switch from COMBO to STANDARD in the modal
    win.setProductMainType('STANDARD');
    if (secCombo.style.display !== 'none') {
      logFinding('HIGH', 'BUG-M2-24', 'Combo section remains visible after switching to STANDARD', secCombo.style.display, 'none');
    }

    // Switch back to COMBO
    win.setProductMainType('COMBO');
    if (secCombo.style.display !== 'block') {
      logFinding('HIGH', 'BUG-M2-25', 'Combo section failed to restore on switching back to COMBO', secCombo.style.display, 'block');
    }
  }

  // =========================================================================
  // SECTION 6: MOBILE ERGONOMICS, CSS INVARIANTS & WINDOW EXPOSURE
  // =========================================================================
  console.log('[SECTION 6] Testing Mobile Ergonomics, CSS Invariants & Window Exposure...');
  {
    testCount++;
    const { win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    // Verify all required window bindings for Milestone 2
    const requiredHandlers = [
      'addComboItemTab',
      'removeComboItemTab',
      'selectComboItemTab',
      'onActiveComboItemChange',
      'updateComboLiveSummary',
      'setProductMainType',
      'activateComboBuilder',
      'deactivateComboBuilder',
      'saveProductAdmin',
      'openNewProductModal',
      'openEditProductModal'
    ];

    for (const h of requiredHandlers) {
      if (typeof win[h] !== 'function') {
        logFinding('CRITICAL', 'BUG-M2-26', `Handler window.${h} is missing or not a function`, typeof win[h], `window.${h}`);
      }
    }

    // Verify admin.css rules
    const adminCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/admin.css'), 'utf-8');
    if (!adminCss.includes('overflow-x: auto')) {
      logFinding('HIGH', 'BUG-M2-27', 'admin.css missing overflow-x: auto for tabs bar', 'Tabs bar will not scroll horizontally on small screens', 'overflow-x: auto');
    }
    if (!adminCss.includes('touch-action: pan-x')) {
      logFinding('HIGH', 'BUG-M2-28', 'admin.css missing touch-action: pan-x for mobile touch swipe', 'Mobile swipe gesture will not scroll smoothly', 'touch-action: pan-x');
    }
    if (!adminCss.includes('min-height: 38px')) {
      logFinding('MEDIUM', 'BUG-M2-29', 'admin.css missing min-height: 38px touch target for tabs', 'Tabs violate minimum tactile ergonomics', 'min-height: 38px');
    }
    if (!adminCss.includes('position: sticky')) {
      logFinding('HIGH', 'BUG-M2-30', 'admin.css missing position: sticky for summary panel', 'Financial summary panel will scroll away on long forms', 'position: sticky');
    }
  }

  // =========================================================================
  // SECTION 7: CHAOS STRESS TEST (50 RAPID RANDOM MUTATIONS)
  // =========================================================================
  console.log('[SECTION 7] Running Chaos Stress Test (50 Rapid Random Operations)...');
  {
    testCount++;
    const { doc, win } = setupTestEnvironment('admin.html');
    await loadAdminApp(win);

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    let chaosErrors = 0;

    for (let step = 0; step < 50; step++) {
      const op = Math.floor(Math.random() * 5);
      try {
        if (op === 0) {
          // Add tab
          win.addComboItemTab();
        } else if (op === 1) {
          // Delete random tab
          const tabs = tabsBar.querySelectorAll('.combo-tab-item');
          const randomIdx = Math.floor(Math.random() * tabs.length);
          win.removeComboItemTab(randomIdx);
        } else if (op === 2) {
          // Select random tab
          const tabs = tabsBar.querySelectorAll('.combo-tab-item');
          const randomIdx = Math.floor(Math.random() * tabs.length);
          win.selectComboItemTab(randomIdx);
        } else if (op === 3) {
          // Edit active tab prices & title
          const randomPrice = Number((Math.random() * 100).toFixed(2));
          win.onActiveComboItemChange('priceUsd', randomPrice);
          win.onActiveComboItemChange('title', `Chaos Item ${step}`);
        } else if (op === 4) {
          // Update promo price
          const promoInput = doc.getElementById('combo-promo-price-usd');
          if (promoInput) {
            promoInput.value = String(Number((Math.random() * 150).toFixed(2)));
          }
          win.updateComboLiveSummary();
        }

        // Verify fundamental invariants after every chaos mutation
        const tabs = tabsBar.querySelectorAll('.combo-tab-item');
        if (tabs.length < 2) {
          chaosErrors++;
          logFinding('CRITICAL', 'BUG-M2-31', 'Invariant breached during chaos: tabs < 2', `Tabs count fell to ${tabs.length}`, `Step ${step}`);
          break;
        }

        const sumText = doc.getElementById('combo-sum-usd')?.textContent || '';
        if (sumText.includes('NaN')) {
          chaosErrors++;
          logFinding('CRITICAL', 'BUG-M2-32', 'Invariant breached during chaos: sum is NaN', sumText, `Step ${step}`);
          break;
        }
      } catch (err) {
        chaosErrors++;
        logFinding('HIGH', 'BUG-M2-33', `Exception during chaos step ${step}`, err.message, err.stack);
        break;
      }
    }
  }

  // =========================================================================
  // SUMMARY OF FINDINGS
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL AUDIT CHECKS RUN: ${testCount}`);
  console.log(`CONFIRMED BUGS FOUND: ${findings.length}`);
  console.log('======================================================\n');

  if (findings.length > 0) {
    console.log('LIST OF DETECTED DEFECTS:');
    findings.forEach(f => {
      console.log(` - [${f.severity}] ${f.id}: ${f.title}`);
    });
    return { passed: false, findings };
  } else {
    console.log('🏆 ALL ADVERSARIAL STRESS CHALLENGES PASSED WITH ZERO DEFECTS.');
    return { passed: true, findings: [] };
  }
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runAdversarialM2StressSuite().then(res => {
    if (!res.passed) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('Fatal crash in adversarial harness:', err);
    process.exit(1);
  });
}
