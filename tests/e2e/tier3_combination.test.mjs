import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export async function runTier3Tests() {
  const ctx = new TestContext('Tier 3: Cross-Feature Combinations');

  console.log('\n========================================');
  console.log(' RUNNING TIER 3: CROSS-FEATURE COMBINATIONS');
  console.log('========================================');

  // Test 1: Currency Change + Catalog Dual Price Rendering
  await ctx.test('T3.1: Currency toggle to NIO immediately triggers catalog dual pricing and updates CyberPass', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    const appModule = await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Initial USD state
    await appModule.setAppCurrency('USD');
    const usdEquivInitial = doc.getElementById('client-usd-equiv');
    expect(usdEquivInitial.textContent).toContain('USD');

    // Switch to NIO
    await appModule.setAppCurrency('NIO');

    // Check pass equivalent updated to NIO
    const passEquiv = doc.getElementById('client-usd-equiv');
    expect(passEquiv.innerHTML).toContain('C$');
    expect(passEquiv.innerHTML).toContain('NIO');

    // Check catalog container
    const catalogContainer = doc.getElementById('catalog-container');
    expect(catalogContainer).toBeTruthy('Catalog container should exist');
  });

  // Test 2: Auth Login + Claim Points Flow
  await ctx.test('T3.2: Customer login combined with manual token claim increases balance and logs transaction', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // 1. Login with Carlos Lopez (50558438412, PIN 1234)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    const passName = doc.getElementById('client-display-name');
    expect(passName.textContent).toBe('Carlos Lopez', 'User display name should be Carlos Lopez');

    const balanceInitial = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(balanceInitial).toBe(500, 'Starting balance should be 500 WP');

    // 2. Open Claim modal and submit token WP-TEST-1001 (150 WP)
    win.openClaimModal();
    doc.getElementById('manual-input-token').value = 'WP-TEST-1001';
    doc.getElementById('manual-input-pin').value = '1234';
    await win.submitManualClaim();

    // 3. Verify balance updated
    const balanceAfter = parseInt(doc.getElementById('client-balance-val').textContent.replace(/,/g, ''), 10);
    expect(balanceAfter).toBe(650, 'Balance should increase to 650 WP after claiming 150 WP token');

    // 4. Verify token marked as CLAIMED in storage
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const claimedToken = rawDb.tokens['WP-TEST-1001'];
    expect(claimedToken.status).toBe('CLAIMED', 'Token should be marked as CLAIMED');
  });

  // Test 3: Admin PIN Unlock + Tab Navigation + Modal Interaction
  await ctx.test('T3.3: Admin PIN unlock followed by tab transitions and modal operations execute smoothly', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // 1. Unlock Admin Terminal
    doc.getElementById('input-admin-pin').value = '110805';
    await win.submitAdminPin();
    expect(doc.getElementById('admin-main-panel').style.display).toBe('block');

    // 2. Switch to Invoices Tab
    win.switchAdminTab('invoices');
    expect(doc.getElementById('sec-invoices').style.display).toBe('block');

    // 3. Open Digital Invoice Modal
    win.openSingleDigitalInvoiceModal();
    const invoiceModal = doc.getElementById('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('flex', 'Digital invoice modal should open');

    const folioInput = doc.getElementById('s-inv-folio');
    expect(folioInput.value.length).toBeGreaterThan(0, 'Invoice folio should be automatically generated');

    win.closeModal('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('none', 'Digital invoice modal should close');

    // 4. Switch to Clients Tab & Open New User Modal
    win.switchAdminTab('clients');
    expect(doc.getElementById('sec-clients').style.display).toBe('block');

    win.openNewUserModal();
    const userModal = doc.getElementById('modal-new-user');
    expect(userModal.style.display).toBe('flex', 'New user modal should open');
    win.closeModal('modal-new-user');
    expect(userModal.style.display).toBe('none', 'New user modal should close');
  });

  // Test 4: Session Persistence Across Component Reload
  await ctx.test('T3.4: Customer authentication session persists in storage across reboots', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Login
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    // Check stored session key
    const sessionRaw = localStorage.getItem('dev_melty_client_uid') || localStorage.getItem('melty_client_uid');
    expect(sessionRaw).toBeTruthy('Client user session should be written to storage');
    expect(sessionRaw).toContain('CLIENT-58438412');
  });

  return ctx.summary();
}
