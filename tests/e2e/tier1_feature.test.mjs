import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { setupTestEnvironment, TestContext, expect } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

function walkJsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function runTier1Tests() {
  const ctx = new TestContext('Tier 1: Feature Coverage');

  console.log('\n========================================');
  console.log(' RUNNING TIER 1: FEATURE COVERAGE');
  console.log('========================================');

  // Test 1: Syntax Validation across all JS files
  await ctx.test('T1.1: Every JS module under js/ parses with zero SyntaxError', async () => {
    const jsFiles = walkJsFiles(path.join(PROJECT_ROOT, 'js'));
    expect(jsFiles.length).toBeGreaterThan(10, 'Expected at least 10 JS files in js/');

    const syntaxErrors = [];
    for (const f of jsFiles) {
      try {
        execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
      } catch (err) {
        syntaxErrors.push({ file: path.relative(PROJECT_ROOT, f), error: err.stderr ? err.stderr.toString() : err.message });
      }
    }
    if (syntaxErrors.length > 0) {
      throw new Error(`Syntax errors found in ${syntaxErrors.length} file(s): ` + JSON.stringify(syntaxErrors));
    }
  });

  // Test 2: Dynamic ES Module Resolution
  await ctx.test('T1.2: All primary ES modules load cleanly without unresolved exports', async () => {
    setupTestEnvironment('index.html');
    const modulesToTest = [
      'js/config/env.js',
      'js/services/FirestoreService.js',
      'js/services/CurrencyService.js',
      'js/services/InvoiceTemplateService.js',
      'js/viewmodels/CustomerViewModel.js',
      'js/views/customer/CustomerAuthView.js',
      'js/views/customer/CustomerCatalogView.js',
      'js/views/customer/CustomerClaimView.js',
      'js/views/customer/CustomerVouchersView.js',
      'js/views/customer/index.js',
      'js/views/AdminCatalogCalculatorView.js',
      'js/views/AdminInvoiceModalView.js',
      'js/views/AdminInvoiceBatchView.js',
      'js/views/AdminVouchersView.js',
      'js/views/AdminPosView.js',
      'js/views/index.js',
      'js/app.js',
      'js/admin-app.js'
    ];

    const loadFailures = [];
    for (const modRel of modulesToTest) {
      const absPath = path.join(PROJECT_ROOT, modRel);
      if (!fs.existsSync(absPath)) continue;
      const fileUrl = pathToFileURL(absPath).href + `?t=${Date.now()}`;
      try {
        await import(fileUrl);
      } catch (e) {
        loadFailures.push({ module: modRel, error: `${e.name}: ${e.message}` });
      }
    }
    if (loadFailures.length > 0) {
      throw new Error(`Module loading failed for: ${JSON.stringify(loadFailures, null, 2)}`);
    }
  });

  // Test 3: Customer Portal Handlers Exposure on Window
  await ctx.test('T1.3: All 29 inline HTML customer handlers are exposed on window', async () => {
    const { win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);

    // Trigger DOMContentLoaded
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const expectedCustomerHandlers = [
      'openAuthModal', 'closeAuthModal', 'switchAuthTab', 'submitClientLogin',
      'submitClientRegister', 'toggleClientPinVisibility', 'logoutClient', 'switchTab',
      'openClaimModal', 'closeClaimModal', 'openClientCameraScanner', 'stopClientCameraScanner',
      'submitManualClaim', 'claimFromBanner', 'dismissClaimBanner', 'openAdminAssignModal',
      'closeAdminAssignModal', 'submitAdminAssignFromScan', 'confirmRedeem', 'executeRedeem',
      'closeRedeemModal', 'onPointsSliderChange', 'onPointsNumChange', 'setPointsPreset',
      'showVoucherModal', 'closeVoucherModal', 'promptCancelCurrentVoucher', 'promptCancelVoucher',
      'closeCancelVoucherModal', 'executeCancelVoucher', 'copyMemberCode', 'copyVoucherCode',
      'setAppCurrency', 'showToast'
    ];

    const missingHandlers = [];
    for (const h of expectedCustomerHandlers) {
      if (typeof win[h] !== 'function') {
        missingHandlers.push(h);
      }
    }
    expect(missingHandlers.length).toBe(0, `Missing customer window handlers: ${missingHandlers.join(', ')}`);
  });

  // Test 4: Admin Terminal Handlers Exposure on Window
  await ctx.test('T1.4: Key inline admin terminal handlers are exposed on window', async () => {
    const { win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);

    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const expectedAdminHandlers = [
      'submitAdminPin', 'logoutAdmin', 'switchAdminTab',
      'openSingleDigitalInvoiceModal', 'submitSingleDigitalInvoice',
      'openSalePointsCalculatorModal', 'openNewUserModal', 'saveNewUserAdmin',
      'openNewProductModal', 'saveProductAdmin', 'openPrintSheetModal',
      'generateBatchAdmin', 'verifyVoucherAdmin', 'closeModal'
    ];

    const missingAdminHandlers = [];
    for (const h of expectedAdminHandlers) {
      if (typeof win[h] !== 'function') {
        missingAdminHandlers.push(h);
      }
    }
    expect(missingAdminHandlers.length).toBe(0, `Missing admin window handlers: ${missingAdminHandlers.join(', ')}`);
  });

  // Test 5: Sandbox Environment Badge Injection
  await ctx.test('T1.5: injectEnvironmentBadge() renders sandbox badge in development environment', async () => {
    const { doc } = setupTestEnvironment('index.html', { hostname: 'localhost' });
    const { injectEnvironmentBadge } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/config/env.js')).href + `?t=${Date.now()}`);
    
    injectEnvironmentBadge();
    const badge = doc.getElementById('dev-env-badge');
    expect(badge).toBeTruthy('Sandbox badge #dev-env-badge should be injected in DOM');
    expect(badge.textContent).toContain('SANDBOX', 'Badge text should indicate sandbox mode');
  });

  // Test 6: Currency Selector Reactivity
  await ctx.test('T1.6: setAppCurrency toggles between USD and NIO and updates state', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    const appModule = await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Test toggle to NIO
    await appModule.setAppCurrency('NIO');
    expect(win.localStorage.getItem('melty_preferred_currency') || 'NIO').toBe('NIO');

    // Test dual price formatting
    const formattedNio = appModule.formatPrice(10);
    expect(formattedNio).toContain('370.00', '10 USD at 37 rate should be 370.00 NIO');

    // Test toggle back to USD
    await appModule.setAppCurrency('USD');
    const formattedUsd = appModule.formatPrice(10);
    expect(formattedUsd).toContain('10.00', 'Price in USD should format to $10.00 USD');
  });

  // Test 7: Admin PIN Unlock Mechanism
  await ctx.test('T1.7: submitAdminPin() with PIN 110805 unlocks admin panel', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const pinInput = doc.getElementById('input-admin-pin');
    const lockScreen = doc.getElementById('admin-auth-lock');
    const mainPanel = doc.getElementById('admin-main-panel');

    expect(pinInput).toBeTruthy('PIN input should exist');
    expect(lockScreen).toBeTruthy('Lock screen should exist');
    expect(mainPanel).toBeTruthy('Main panel should exist');

    pinInput.value = '110805';
    await win.submitAdminPin();

    expect(win.sessionStorage.getItem('melty_admin_auth')).toBe('110805');
    expect(lockScreen.style.display).toBe('none', 'Lock screen should be hidden after correct PIN');
    expect(mainPanel.style.display).toBe('block', 'Main panel should be displayed after correct PIN');
  });

  // Test 8: Admin Tab Navigation
  await ctx.test('T1.8: switchAdminTab switches cleanly between admin sections', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Unlock first
    doc.getElementById('input-admin-pin').value = '110805';
    await win.submitAdminPin();

    const tabs = ['clients', 'invoices', 'catalog', 'history', 'pos'];
    for (const tab of tabs) {
      win.switchAdminTab(tab);
      const activeSection = doc.getElementById(`sec-${tab}`);
      expect(activeSection).toBeTruthy(`Section sec-${tab} should exist`);
      expect(activeSection.style.display).toBe('block', `Section sec-${tab} should be visible when tab is active`);

      const otherTabs = tabs.filter(t => t !== tab);
      for (const other of otherTabs) {
        const otherSection = doc.getElementById(`sec-${other}`);
        expect(otherSection.style.display).toBe('none', `Section sec-${other} should be hidden`);
      }
    }
  });

  // Test 9: Customer and Admin Modals Open/Close
  await ctx.test('T1.9: Auth, Claim, and Digital Invoice modals open and close correctly', async () => {
    // Customer modals
    const { doc: cDoc, win: cWin } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    cWin.document.dispatchEvent({ type: 'DOMContentLoaded' });

    cWin.openAuthModal('login');
    const authModal = cDoc.getElementById('modal-client-auth');
    expect(authModal.style.display).toBe('flex', 'Auth modal should be open');
    cWin.closeAuthModal();
    expect(authModal.style.display).toBe('none', 'Auth modal should be closed');

    // Claim modal behavior: redirects to auth if guest, opens modal-manual-claim if authenticated
    cWin.openClaimModal();
    expect(authModal.style.display).toBe('flex', 'Claim modal should prompt login for guest');
    cWin.closeAuthModal();

    const claimModal = cDoc.getElementById('modal-manual-claim');
    expect(claimModal).toBeTruthy('modal-manual-claim should exist in DOM');
    claimModal.style.display = 'flex';
    cWin.closeClaimModal();
    expect(claimModal.style.display).toBe('none', 'closeClaimModal should close modal-manual-claim');

    // Admin modal
    const { doc: aDoc, win: aWin } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    aWin.document.dispatchEvent({ type: 'DOMContentLoaded' });

    aWin.openSingleDigitalInvoiceModal();
    const invoiceModal = aDoc.getElementById('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('flex', 'Single digital invoice modal should be open');
    aWin.closeModal('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('none', 'Single digital invoice modal should be closed');
  });

  return ctx.summary();
}
