/**
 * Forensic Auditor Adversarial Stress Suite for Milestone M2
 * Independent stress-testing of Admin Terminal Dynamic Tabs & Live Financials
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function runAuditorM2AdversarialSuite() {
  const ctx = new TestContext('Forensic Auditor Adversarial Stress M2');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   FORENSIC AUDITOR ADVERSARIAL SUITE: MILESTONE M2                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Test 1: Rapid Tab Add / Remove Stress & Index Re-targeting
  await ctx.test('AUDIT-M2-1: Rapid addition to N=12 and arbitrary-order deletion maintains bounds and N>=2 guard', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2);

    // Expand to 12 items
    for (let i = 0; i < 10; i++) {
      win.addComboItemTab();
    }
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(12);

    // Remove from middle (e.g. index 5)
    win.removeComboItemTab(5);
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(11);

    // Remove from head (index 0)
    win.removeComboItemTab(0);
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(10);

    // Remove from tail (index 9)
    win.removeComboItemTab(9);
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(9);

    // Hammer removal down to 2
    for (let i = 0; i < 20; i++) {
      win.removeComboItemTab(0);
    }
    // Should never go below 2
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2);
    // Delete buttons should be disabled
    const delBtns = tabsBar.querySelectorAll('.combo-tab-del');
    expect(delBtns[0].disabled || delBtns[0].hasAttribute('disabled')).toBe(true);
    expect(delBtns[1].disabled || delBtns[1].hasAttribute('disabled')).toBe(true);
  });

  // Test 2: Extreme Floating Point & Dirty Inputs in Financial Engine
  await ctx.test('AUDIT-M2-2: Dirty values (NaN, negative, float precision) in live financial summary', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const inputPrice = doc.getElementById('combo-item-price');

    // Float precision test
    win.selectComboItemTab(0);
    inputPrice.value = '19.99';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    win.selectComboItemTab(1);
    inputPrice.value = '10.01';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    const sumEl = doc.getElementById('combo-sum-usd');
    expect(sumEl.textContent.trim()).toBe('$30.00 USD');

    // Dirty string injection
    win.selectComboItemTab(0);
    inputPrice.value = 'abc!@#';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);
    win.updateComboLiveSummary();
    expect(sumEl.textContent.trim()).toBe('$10.01 USD');

    // Unfavorable combo price (price > sum) -> savings clamped to 0
    const promoInput = doc.getElementById('combo-promo-price-usd');
    promoInput.value = '50.00';
    win.updateComboLiveSummary();
    const savingsEl = doc.getElementById('combo-savings-usd');
    const savingsBadge = doc.getElementById('combo-savings-badge');
    expect(savingsEl.textContent.includes('$0.00 USD (0% OFF)')).toBe(true);
    expect(savingsBadge.textContent.includes('0% AHORRO')).toBe(true);
  });

  // Test 3: Validation Boundary Enforcement on saveProductAdmin
  await ctx.test('AUDIT-M2-3: saveProductAdmin rejects invalid combo items (empty title, 0 price)', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const modal = doc.getElementById('modal-new-product');

    // Case A: Item 1 has empty title
    win.selectComboItemTab(0);
    doc.getElementById('combo-item-title').value = '';
    win.onActiveComboItemChange('title', '');
    await win.saveProductAdmin();
    // Modal must NOT close because save was rejected
    expect(modal.style.display).toBe('flex');

    // Restore Item 1 title, but give Item 2 price 0
    win.selectComboItemTab(0);
    doc.getElementById('combo-item-title').value = 'Item 1 Valid';
    win.onActiveComboItemChange('title', 'Item 1 Valid');

    win.selectComboItemTab(1);
    doc.getElementById('combo-item-price').value = '0';
    win.onActiveComboItemChange('priceUsd', '0');
    await win.saveProductAdmin();
    // Modal must NOT close because save was rejected
    expect(modal.style.display).toBe('flex');
  });

  // Test 4: Reconstitution of existing COMBO product in openEditProductModal
  await ctx.test('AUDIT-M2-4: openEditProductModal restores existing combo product items and live summary', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Mock an existing COMBO product in AdminInvoiceBatchView's vm
    const mockComboProduct = {
      id: 'prod-combo-test-99',
      title: 'Trilogía Especial Haibane',
      rewardType: 'COMBO',
      priceUsd: 85.00,
      maxDiscountPct: 20,
      stock: 3,
      comboData: {
        items: [
          { id: 'it-1', title: 'Novela Vol 1', priceUsd: 30.00, residualPriceUsd: 32.00, residualDiscountPct: 15, imageUrl: 'img1.png', description: 'Desc 1' },
          { id: 'it-2', title: 'Novela Vol 2', priceUsd: 35.00, residualPriceUsd: 37.00, residualDiscountPct: 15, imageUrl: 'img2.png', description: 'Desc 2' },
          { id: 'it-3', title: 'Artbook Sagrado', priceUsd: 45.00, residualPriceUsd: 48.00, residualDiscountPct: 20, imageUrl: 'img3.png', description: 'Desc 3' }
        ]
      },
      getComboItems: function() { return this.comboData.items; }
    };

    const batchViewUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/AdminInvoiceBatchView.js')).href;
    const batchView = await import(batchViewUrl);
    batchView.initAdminInvoiceBatchView({
      vm: { catalog: [mockComboProduct] }
    });

    win.openEditProductModal('prod-combo-test-99');

    const modal = doc.getElementById('modal-new-product');
    expect(modal.style.display).toBe('flex');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    const tabs = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabs.length).toBe(3);

    // Sum should be 30 + 35 + 45 = 110.00
    const sumEl = doc.getElementById('combo-sum-usd');
    expect(sumEl.textContent.trim()).toBe('$110.00 USD');

    // Promo price was 85.00, savings 25.00 (23% OFF)
    const savingsEl = doc.getElementById('combo-savings-usd');
    expect(savingsEl.textContent.includes('$25.00 USD')).toBe(true);
    expect(savingsEl.textContent.includes('23% OFF')).toBe(true);

    // Check tab 0 fields
    const titleInput = doc.getElementById('combo-item-title');
    expect(titleInput.value).toBe('Novela Vol 1');
  });

  // Test 5: Verify ADV-6.1 compliance (all inline handlers exist on window)
  await ctx.test('AUDIT-M2-5: All combo inline handlers in admin.html are exposed on window', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const requiredComboHandlers = [
      'addComboItemTab',
      'removeComboItemTab',
      'selectComboItemTab',
      'onActiveComboItemChange',
      'updateComboLiveSummary',
      'setProductMainType',
      'activateComboBuilder',
      'deactivateComboBuilder',
      'setProductPublicationMode'
    ];

    for (const h of requiredComboHandlers) {
      expect(typeof win[h]).toBe('function', `Handler window.${h} must be a callable function`);
    }
  });

  console.log('\n======================================================');
  console.log(`TOTAL AUDITOR STRESS TESTS: ${ctx.tests.length} | PASSED: ${ctx.passed} | FAILED: ${ctx.failed}`);
  console.log('======================================================\n');

  if (ctx.failed > 0) {
    process.exit(1);
  }
}

runAuditorM2AdversarialSuite().catch(err => {
  console.error('Auditor stress test failed:', err);
  process.exit(1);
});
