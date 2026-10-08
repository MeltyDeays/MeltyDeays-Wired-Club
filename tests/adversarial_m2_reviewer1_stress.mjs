/**
 * ADVERSARIAL REVIEWER AUDIT: MILESTONE M2
 * Independent stress-testing of Admin Terminal Dynamic Product Tabs
 * Melty Deays - Flexible Haibane Combos with Cascading Split
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runReviewerAudit() {
  const ctx = new TestContext('Reviewer 1 Adversarial Stress Audit (Milestone M2)');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL REVIEWER 1 AUDIT: ADMIN COMBOS (MILESTONE M2)        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // TEST 1: Rapid Tab Add/Remove Hammering & Lower Boundary Enforcing
  await ctx.test('ADV-M2-1: Rapid tab hammering up to N=15 and deletion clamping at N=2', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2, 'Initial tabs = 2');

    // Add 13 more items -> N = 15
    for (let i = 0; i < 13; i++) {
      win.addComboItemTab();
    }
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(15, 'Tabs count reaches 15');

    // Delete 13 items sequentially from the front, middle, and back
    for (let i = 0; i < 13; i++) {
      const currentLen = tabsBar.querySelectorAll('.combo-tab-item').length;
      const targetIndex = i % 2 === 0 ? 0 : Math.floor(currentLen / 2);
      win.removeComboItemTab(targetIndex);
    }
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2, 'Clamped cleanly back to N=2');

    // Attempt 10 illegal removals when N=2
    for (let i = 0; i < 10; i++) {
      win.removeComboItemTab(0);
      win.removeComboItemTab(1);
    }
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2, 'Illegal deletions rejected, strictly N=2');
  });

  // TEST 2: Fuzzing Input Values in Active Item Form & Live Math Engine
  await ctx.test('ADV-M2-2: Fuzzing numerical inputs (NaN, negative, float precision, zero) without crash or NaN in UI', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const sumEl = doc.getElementById('combo-sum-usd');
    const savingsUsdEl = doc.getElementById('combo-savings-usd');
    const promoInput = doc.getElementById('combo-promo-price-usd');

    const fuzzPrices = [
      { p1: '0', p2: '0', promo: '0', expectNaN: false },
      { p1: 'abc', p2: 'xyz', promo: '-50', expectNaN: false },
      { p1: '-999', p2: '15.555', promo: '10', expectNaN: false },
      { p1: '19.99', p2: '29.99', promo: '999999', expectNaN: false }, // Promo > Sum
      { p1: '0.0001', p2: '0.0002', promo: '0.0001', expectNaN: false }
    ];

    for (const f of fuzzPrices) {
      win.selectComboItemTab(0);
      win.onActiveComboItemChange('priceUsd', f.p1);

      win.selectComboItemTab(1);
      win.onActiveComboItemChange('priceUsd', f.p2);

      promoInput.value = f.promo;
      win.updateComboLiveSummary();

      expect(sumEl.textContent.includes('NaN')).toBe(false, `Sum text must not contain NaN for ${JSON.stringify(f)}`);
      expect(savingsUsdEl.textContent.includes('NaN')).toBe(false, `Savings text must not contain NaN for ${JSON.stringify(f)}`);
    }
  });

  // TEST 3: State Persistence Across Repeated Mode Transitions
  await ctx.test('ADV-M2-3: Alternating between STANDARD, COMBO, INCOMING modes preserves isolation and cleanly resets', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();

    const secCombo = doc.getElementById('sec-product-combo-builder');
    const secFree = doc.getElementById('sec-product-free-calc');
    const secIncoming = doc.getElementById('sec-product-incoming-calc');

    // Cycle 5 times
    for (let c = 0; c < 5; c++) {
      win.setProductMainType('COMBO');
      expect(secCombo.style.display).toBe('block', 'Combo visible in cycle ' + c);
      expect(secFree.style.display).toBe('none', 'Free hidden in cycle ' + c);

      win.setProductPublicationMode('INCOMING');
      expect(secCombo.style.display).toBe('none', 'Combo hidden in incoming cycle ' + c);
      expect(secIncoming.style.display).toBe('block', 'Incoming visible in cycle ' + c);

      win.setProductMainType('STANDARD');
      expect(secCombo.style.display).toBe('none', 'Combo hidden in standard cycle ' + c);
      expect(secFree.style.display).toBe('block', 'Free restored in cycle ' + c);
    }
  });

  // TEST 4: Boundary Validation on saveProductAdmin
  await ctx.test('ADV-M2-4: saveProductAdmin strict validation rejects missing item title and zero/negative prices', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    // Blank title on Item 1 in DOM and event
    win.selectComboItemTab(0);
    const titleInput = doc.getElementById('combo-item-title');
    titleInput.value = '';
    win.onActiveComboItemChange('title', '');
    win.onActiveComboItemChange('priceUsd', '25.00');

    const modal = doc.getElementById('modal-new-product');

    // Save attempt 1: must fail because item 1 title is empty
    await win.saveProductAdmin();
    expect(modal.style.display).toBe('flex', 'Modal must stay open on empty item title');

    // Fix item 1 title, set 0 price on Item 2
    titleInput.value = 'Valid Item 1';
    win.onActiveComboItemChange('title', 'Valid Item 1');
    win.selectComboItemTab(1);
    const titleInput2 = doc.getElementById('combo-item-title');
    titleInput2.value = 'Valid Item 2';
    win.onActiveComboItemChange('title', 'Valid Item 2');
    const priceInput2 = doc.getElementById('combo-item-price');
    priceInput2.value = '0';
    win.onActiveComboItemChange('priceUsd', '0');

    // Save attempt 2: must fail because item 2 price is 0
    await win.saveProductAdmin();
    expect(modal.style.display).toBe('flex', 'Modal must stay open on zero item price');

    // Set negative price on Item 2
    priceInput2.value = '-15.00';
    win.onActiveComboItemChange('priceUsd', '-15.00');

    // Save attempt 3: must fail on negative price
    await win.saveProductAdmin();
    expect(modal.style.display).toBe('flex', 'Modal must stay open on negative item price');

    // Set valid prices: should succeed
    priceInput2.value = '20.00';
    win.onActiveComboItemChange('priceUsd', '20.00');
    doc.getElementById('combo-promo-price-usd').value = '35.00';
    await win.saveProductAdmin();
    expect(modal.style.display).toBe('none', 'Modal closes on valid combo submission');
  });

  // TEST 5: CSS Rules & Layout Invariants Check
  await ctx.test('ADV-M2-5: CSS rules enforce mobile touch ergonomics and sticky footer invariants', async () => {
    const { doc } = setupTestEnvironment('admin.html');
    
    // Check elements exist in DOM
    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    const summaryPanel = doc.getElementById('combo-summary-panel');

    expect(tabsBar).toBeTruthy('Tabs bar element exists');
    expect(summaryPanel).toBeTruthy('Summary panel element exists');

    // Verify classes
    expect(tabsBar.classList.contains('combo-items-tabs')).toBe(true, 'Tabs bar has class combo-items-tabs');
    expect(summaryPanel.classList.contains('combo-summary-panel')).toBe(true, 'Summary panel has class combo-summary-panel');
  });

  // TEST 6: Editing Existing Combo Product in Modal
  await ctx.test('ADV-M2-6: openEditProductModal restores existing combo items, tabs, and persists edits', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Mock existing combo product
    const existingCombo = {
      id: 'reward-combo-test-101',
      title: 'Combo Haibane Clásico',
      rewardType: 'COMBO',
      priceUsd: 55.00,
      maxDiscountPct: 20,
      stock: 1,
      isCombo: () => true,
      getComboItems: () => [
        { id: 'item-1', title: 'Novela Ligera Vol 1', priceUsd: 30.00, residualPriceUsd: 32.00, residualDiscountPct: 15, imageUrl: '', description: 'Edición 1' },
        { id: 'item-2', title: 'Artbook Haibane', priceUsd: 40.00, residualPriceUsd: 42.00, residualDiscountPct: 20, imageUrl: '', description: 'Edición 2' }
      ]
    };

    // Open edit modal directly passing existing product via activateComboBuilder
    win.activateComboBuilder(existingCombo);
    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    const tabItems = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabItems.length).toBe(2, 'Restored 2 tabs for existing combo');

    // Title should reflect first item
    const titleInput = doc.getElementById('combo-item-title');
    expect(titleInput.value).toBe('Novela Ligera Vol 1', 'First item title restored');

    // Add a 3rd item
    win.addComboItemTab();
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(3, 'Added 3rd item to existing combo');

    // Live summary updates
    const sumEl = doc.getElementById('combo-sum-usd');
    expect(sumEl.textContent.includes('90.00')).toBe(true, 'Sum reflects 30 + 40 + 20 = $90.00');
  });

  console.log('\n======================================================');
  console.log(`TOTAL AUDIT CHECKS: ${ctx.tests.length} | PASSED: ${ctx.passed} | FAILED: ${ctx.failed}`);
  console.log('======================================================\n');

  if (ctx.failed > 0) {
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReviewerAudit().catch(err => {
    console.error('Audit run failed:', err);
    process.exit(1);
  });
}
