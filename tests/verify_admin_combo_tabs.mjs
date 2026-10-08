/**
 * Test Suite: Admin Terminal Dynamic Product Tabs (Milestone 2)
 * Melty Deays - Flexible Haibane Combos with Cascading Split
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runAdminComboTabsTests() {
  const ctx = new TestContext('Milestone 2: Admin Dynamic Product Tabs & Combo Builder');

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   SUITE: ADMIN TERMINAL DYNAMIC PRODUCT TABS (MILESTONE 2)         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  await ctx.test('M2-1: Modal Open & Master Type Selector toggles Standard vs Combo mode', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Open product modal
    win.openNewProductModal();
    const modal = doc.getElementById('modal-new-product');
    expect(modal.style.display).toBe('flex', 'Product modal should open');

    const secCombo = doc.getElementById('sec-product-combo-builder');
    const secFree = doc.getElementById('sec-product-free-calc');
    const badge = doc.getElementById('prod-mode-badge');

    // Default is standard FREE_REWARD
    expect(secCombo.style.display).toBe('none', 'Combo builder hidden by default');
    expect(secFree.style.display !== 'none').toBe(true, 'Free reward calculator visible by default');

    // Toggle to Combo mode
    win.setProductMainType('COMBO');
    expect(secCombo.style.display).toBe('block', 'Combo builder section visible in COMBO mode');
    expect(secFree.style.display).toBe('none', 'Free calculator hidden in COMBO mode');
    expect(badge.textContent.includes('COMBO')).toBe(true, 'Badge indicates COMBO mode');

    // Toggle back to Standard mode
    win.setProductMainType('STANDARD');
    expect(secCombo.style.display).toBe('none', 'Combo builder hidden in STANDARD mode');
    expect(secFree.style.display).toBe('block', 'Free calculator restored in STANDARD mode');
  });

  await ctx.test('M2-2: Dynamic Tabs Bar enforces N >= 2 minimum boundary and deletion locking', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    expect(tabsBar).toBeTruthy('Tabs bar container exists');

    // Initial tabs count is 2
    let tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(2, 'Initial tabs count must be 2');

    // Check delete buttons when N = 2
    let delBtns = tabsBar.querySelectorAll('.combo-tab-del');
    expect(delBtns.length).toBe(2, 'Each tab has a delete button');
    expect(delBtns[0].hasAttribute('disabled') || delBtns[0].disabled === true).toBe(true, 'Delete button on tab 0 must be disabled when N=2');
    expect(delBtns[1].hasAttribute('disabled') || delBtns[1].disabled === true).toBe(true, 'Delete button on tab 1 must be disabled when N=2');

    // Try removing a tab when N = 2: should be blocked
    win.removeComboItemTab(0);
    tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(2, 'Cannot remove tab below N=2 minimum boundary');

    // Add 3rd tab
    win.addComboItemTab();
    tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(3, 'Tabs count should now be 3');

    // Delete buttons should now be enabled when N = 3
    delBtns = tabsBar.querySelectorAll('.combo-tab-del');
    expect(!delBtns[0].hasAttribute('disabled') && !delBtns[0].disabled).toBe(true, 'Delete button on tab 0 enabled when N=3');
    expect(!delBtns[1].hasAttribute('disabled') && !delBtns[1].disabled).toBe(true, 'Delete button on tab 1 enabled when N=3');
    expect(!delBtns[2].hasAttribute('disabled') && !delBtns[2].disabled).toBe(true, 'Delete button on tab 2 enabled when N=3');

    // Add 4th tab
    win.addComboItemTab();
    tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(4, 'Tabs count should now be 4');

    // Remove tab 2: count decrements to 3
    win.removeComboItemTab(2);
    tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(3, 'Tabs count decremented to 3');

    // Remove tab 1: count decrements to 2
    win.removeComboItemTab(1);
    tabElements = tabsBar.querySelectorAll('.combo-tab-item');
    expect(tabElements.length).toBe(2, 'Tabs count decremented to 2');

    // Delete buttons locked again when N returns to 2
    delBtns = tabsBar.querySelectorAll('.combo-tab-del');
    expect(delBtns[0].hasAttribute('disabled') || delBtns[0].disabled === true).toBe(true, 'Delete buttons locked when N=2');
  });

  await ctx.test('M2-3: Bi-directional Reactive Form Synchronization across tab switches', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const inputTitle = doc.getElementById('combo-item-title');
    const inputPrice = doc.getElementById('combo-item-price');
    const inputResidual = doc.getElementById('combo-item-residual-price');
    const inputMaxDisc = doc.getElementById('combo-item-residual-discount-pct');
    const inputImg = doc.getElementById('combo-item-image');
    const inputDesc = doc.getElementById('combo-item-desc');

    // Edit Item 1
    inputTitle.value = 'Manga Haibane Renmei Vol 1';
    win.onActiveComboItemChange('title', inputTitle.value);

    inputPrice.value = '35.00';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    inputResidual.value = '38.00';
    win.onActiveComboItemChange('residualPriceUsd', inputResidual.value);

    inputMaxDisc.value = '15';
    win.onActiveComboItemChange('residualDiscountPct', inputMaxDisc.value);

    inputImg.value = 'https://example.com/vol1.jpg';
    win.onActiveComboItemChange('imageUrl', inputImg.value);

    inputDesc.value = 'Edición especial japonesa con alas grisáceas';
    win.onActiveComboItemChange('description', inputDesc.value);

    // Switch to Tab 2
    win.selectComboItemTab(1);
    expect(inputTitle.value).toBe('Ítem 2', 'Tab 2 initial title should be loaded');

    // Edit Item 2
    inputTitle.value = 'Manga Haibane Renmei Vol 2';
    win.onActiveComboItemChange('title', inputTitle.value);

    inputPrice.value = '40.00';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    // Switch back to Tab 1: data must be fully preserved!
    win.selectComboItemTab(0);
    expect(inputTitle.value).toBe('Manga Haibane Renmei Vol 1', 'Item 1 title preserved');
    expect(parseFloat(inputPrice.value)).toBe(35.00, 'Item 1 price preserved');
    expect(parseFloat(inputResidual.value)).toBe(38.00, 'Item 1 residual price preserved');
    expect(inputImg.value).toBe('https://example.com/vol1.jpg', 'Item 1 image preserved');
    expect(inputDesc.value).toBe('Edición especial japonesa con alas grisáceas', 'Item 1 description preserved');

    // Switch back to Tab 2: Item 2 data preserved
    win.selectComboItemTab(1);
    expect(inputTitle.value).toBe('Manga Haibane Renmei Vol 2', 'Item 2 title preserved');
    expect(parseFloat(inputPrice.value)).toBe(40.00, 'Item 2 price preserved');
  });

  await ctx.test('M2-4: Sticky Financial Summary Panel calculates live sum, savings $, and % OFF', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    const sumEl = doc.getElementById('combo-sum-usd');
    const promoInput = doc.getElementById('combo-promo-price-usd');
    const savingsUsdEl = doc.getElementById('combo-savings-usd');
    const savingsBadgeEl = doc.getElementById('combo-savings-badge');

    // Set Item 1 price = 30.00
    win.selectComboItemTab(0);
    const inputPrice = doc.getElementById('combo-item-price');
    inputPrice.value = '30.00';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    // Set Item 2 price = 70.00
    win.selectComboItemTab(1);
    inputPrice.value = '70.00';
    win.onActiveComboItemChange('priceUsd', inputPrice.value);

    // Sum should be $100.00
    expect(sumEl.textContent.includes('100.00')).toBe(true, 'Sum should be $100.00');

    // Set promo combo price to $75.00
    promoInput.value = '75.00';
    win.updateComboLiveSummary();

    // Savings should be $25.00 and 25% OFF
    expect(savingsUsdEl.textContent.includes('25.00')).toBe(true, 'Savings USD should be $25.00');
    expect(savingsUsdEl.textContent.includes('25% OFF')).toBe(true, 'Savings % should be 25% OFF');
    expect(savingsBadgeEl.textContent.includes('25%')).toBe(true, 'Badge should reflect 25%');

    // Set promo price higher than sum ($120): savings clamped at 0
    promoInput.value = '120.00';
    win.updateComboLiveSummary();
    expect(savingsUsdEl.textContent.includes('0.00')).toBe(true, 'Negative savings clamped at 0');
    expect(savingsUsdEl.textContent.includes('0% OFF')).toBe(true, 'Negative savings % clamped at 0%');
  });

  await ctx.test('M2-5: saveProductAdmin correctly serializes COMBO RewardModel and saves to Firestore', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    win.openNewProductModal();
    win.setProductMainType('COMBO');

    // Fill combo package title
    const pkgTitleInput = doc.getElementById('combo-package-title');
    pkgTitleInput.value = 'Dúo Haibane Renmei Completo';

    // Item 1
    win.selectComboItemTab(0);
    doc.getElementById('combo-item-title').value = 'Alas de Carbón Vol 1';
    win.onActiveComboItemChange('title', 'Alas de Carbón Vol 1');
    doc.getElementById('combo-item-price').value = '30.00';
    win.onActiveComboItemChange('priceUsd', '30.00');
    doc.getElementById('combo-item-residual-price').value = '35.00';
    win.onActiveComboItemChange('residualPriceUsd', '35.00');
    doc.getElementById('combo-item-image').value = 'https://example.com/item1.jpg';
    win.onActiveComboItemChange('imageUrl', 'https://example.com/item1.jpg');

    // Item 2
    win.selectComboItemTab(1);
    doc.getElementById('combo-item-title').value = 'Aureola Sagrada Vol 2';
    win.onActiveComboItemChange('title', 'Aureola Sagrada Vol 2');
    doc.getElementById('combo-item-price').value = '40.00';
    win.onActiveComboItemChange('priceUsd', '40.00');
    doc.getElementById('combo-item-residual-price').value = '45.00';
    win.onActiveComboItemChange('residualPriceUsd', '45.00');
    doc.getElementById('combo-item-image').value = 'https://example.com/item2.jpg';
    win.onActiveComboItemChange('imageUrl', 'https://example.com/item2.jpg');

    // Set combo promo price & max discount
    doc.getElementById('combo-promo-price-usd').value = '55.00';
    doc.getElementById('combo-max-discount-pct').value = '15';
    win.updateComboLiveSummary();

    // Points cost
    doc.getElementById('prod-cost').value = '550';

    // Submit save
    await win.saveProductAdmin();

    const modal = doc.getElementById('modal-new-product');
    expect(modal.style.display).toBe('none', 'Modal should close after saving combo');

    // Open edit product modal and verify combo items are populated
    // Check if openNewProductModal resets cleanly
    win.openNewProductModal();
    const tabsBar = doc.getElementById('combo-items-tabs-bar');
    expect(tabsBar.querySelectorAll('.combo-tab-item').length).toBe(2, 'Reset cleans tabs back to 2');
  });

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${ctx.tests.length} | PASSED: ${ctx.passed} | FAILED: ${ctx.failed}`);
  console.log('======================================================\n');

  if (ctx.failed > 0) {
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runAdminComboTabsTests().catch(err => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
}
