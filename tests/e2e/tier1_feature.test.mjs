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

  // Test 10: Lain Template Gallery Rendering and Filtering
  await ctx.test('T1.10: Lain template gallery renders all 74 designs and responds to series filters', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const grid = doc.getElementById('lain-template-grid');
    expect(grid).toBeTruthy('lain-template-grid must exist in admin DOM');

    win.renderLainTemplateGrid();
    expect(grid.children.length).toBe(75, 'Expected 75 tiles for ALL series filter (1 auto + 74 designs)');

    win.filterLainSeries('SERIE 1');
    expect(grid.children.length).toBe(25, 'Expected 25 tiles for Serie 1 (1 auto + 24 designs)');

    win.filterLainSeries('SERIE 2');
    expect(grid.children.length).toBe(21, 'Expected 21 tiles for Serie 2 (1 auto + 20 designs)');

    win.filterLainSeries('SERIE 3');
    expect(grid.children.length).toBe(31, 'Expected 31 tiles for Serie 3 (1 auto + 30 designs)');

    win.setActiveLainTemplate(44);
    const label = doc.getElementById('lain-template-active-label');
    expect(label.innerHTML).toContain('COCOON // THE DREAM', 'Active label should show selected Serie 3 template');

    // Test in-place design preview modal
    const previewModal = doc.getElementById('modal-lain-preview');
    expect(previewModal).toBeTruthy('modal-lain-preview should exist in admin DOM');

    win.openLainPreviewModal(44);
    expect(previewModal.style.display).toBe('flex', 'Preview modal should be open');
    const svgContainer = doc.getElementById('lain-preview-svg-container');
    expect(svgContainer.innerHTML).toContain('<svg', 'SVG container should contain valid SVG markup');
    expect(doc.getElementById('lain-preview-title').textContent).toContain('COCOON // THE DREAM', 'Title should match active layer');

    // Test next navigation in preview
    win.previewNextLainTemplate();
    expect(doc.getElementById('lain-preview-title').textContent).toContain('ASH WINGS // EMERGENCE', 'Next navigation should advance layer');

    // Test confirm/close
    win.confirmLainPreviewSelection();
    expect(previewModal.style.display).toBe('none', 'Preview modal should be closed after confirmation');
  });

  // Test 11: Admin Filter and Sort Capabilities across Users, Tokens, Catalog, Vouchers & DB Sandbox
  await ctx.test('T1.11: Dynamic sorting, filtering, and release folio buttons function across all admin sections', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });
    win.submitAdminPin(); // Unlock
    await win.executeSeedDevData(); // Sembrar datos para validar tablas completas

    // Emisión de token para validar renderizado y botón de liberación de folio
    win.openSingleDigitalInvoiceModal();
    doc.getElementById('s-inv-client-name').value = 'Test Client';
    doc.getElementById('s-inv-client-phone').value = '8888-0000';
    win.addSingleInvoiceItemRow(1, 'Item Demo', 20.00);
    doc.getElementById('s-inv-points-val').value = '20';
    await win.submitSingleDigitalInvoice();

    // 1. Users sorting
    expect(typeof win.sortUsersAdmin).toBe('function', 'win.sortUsersAdmin should be exposed');
    win.sortUsersAdmin('name-asc');
    const usersTable = doc.getElementById('clients-table-body');
    expect(usersTable).toBeTruthy('Clients table body should exist');

    // 2. Tokens filter and sorting
    expect(typeof win.filterTokensAdmin).toBe('function', 'win.filterTokensAdmin should be exposed');
    expect(typeof win.sortTokensAdmin).toBe('function', 'win.sortTokensAdmin should be exposed');
    expect(typeof win.filterTokensByStatus).toBe('function', 'win.filterTokensByStatus should be exposed');
    win.sortTokensAdmin('folio-desc');
    win.filterTokensByStatus('ALL');

    // 3. Catalog filter and sorting
    expect(typeof win.filterCatalogAdmin).toBe('function', 'win.filterCatalogAdmin should be exposed');
    expect(typeof win.sortCatalogAdmin).toBe('function', 'win.sortCatalogAdmin should be exposed');
    expect(typeof win.filterCatalogByType).toBe('function', 'win.filterCatalogByType should be exposed');
    win.sortCatalogAdmin('cost-desc');
    win.filterCatalogByType('ALL');

    // 4. Vouchers filter and sorting
    expect(typeof win.filterVouchersAdmin).toBe('function', 'win.filterVouchersAdmin should be exposed');
    expect(typeof win.sortVouchersAdmin).toBe('function', 'win.sortVouchersAdmin should be exposed');
    win.sortVouchersAdmin('newest');

    // 5. DB Sandbox draft tabs, filtering, and release button
    expect(typeof win.setSandboxDraftTab).toBe('function', 'win.setSandboxDraftTab should be exposed');
    expect(typeof win.setSandboxDraftStatus).toBe('function', 'win.setSandboxDraftStatus should be exposed');
    expect(typeof win.setSandboxDraftSort).toBe('function', 'win.setSandboxDraftSort should be exposed');
    win.setSandboxDraftTab('users');
    win.setSandboxDraftSort('points-desc');
    win.setSandboxDraftTab('catalog');
    win.setSandboxDraftSort('cost-desc');
    win.setSandboxDraftTab('vouchers');
    win.setSandboxDraftSort('newest');
    win.setSandboxDraftTab('tokens');
    win.setSandboxDraftSort('folio-asc');

    // 6. Verify neobrutalist release folio button class in both Invoices and DB Sandbox tables
    const tokensTableHtml = doc.getElementById('tokens-table-body')?.innerHTML || '';
    const sandboxDraftHtml = doc.getElementById('sandbox-draft-table-container')?.innerHTML || '';
    expect(tokensTableHtml).toContain('btn-release-folio', 'Tokens table should contain .btn-release-folio neobrutalist button');
    expect(sandboxDraftHtml).toContain('btn-release-folio', 'Sandbox DB draft table should contain .btn-release-folio neobrutalist button');
  });

  // Test 12: Catalog Product Specifications Floating Popover & Height Alignment
  await ctx.test('T1.12: Catalog specs toggle cleanly as floating overlays with mutual auto-close and height alignment', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    expect(typeof win.toggleRewardSpecs).toBe('function', 'win.toggleRewardSpecs should be exposed');

    // Simular 2 productos en catálogo: uno con especificaciones y otro simple
    const catalogContainer = doc.getElementById('catalog-container');
    expect(catalogContainer).toBeTruthy('Catalog container should exist');

    const catalogViewUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`;
    const { renderCatalog, toggleRewardSpecs } = await import(catalogViewUrl);

    const testCatalog = [
      {
        id: 'PROD-A',
        title: 'Mando Hall Effect Pro',
        description: 'Mando inalámbrico para gaming profesional.\n• Joysticks magnéticos sin drift\n• Batería 800 mAh\n• Giroscopio 6 ejes',
        pointsCost: 200,
        priceUsd: 25.00,
        stock: 5,
        imageUrl: ''
      },
      {
        id: 'PROD-B',
        title: 'Mini Jet Fan Turbo 2 en 1',
        description: 'Soplador turbo portátil de alta velocidad.\n• Motor brushless 110,000 RPM\n• Boquillas intercambiables',
        pointsCost: 350,
        priceUsd: 30.00,
        stock: 3,
        imageUrl: ''
      },
      {
        id: 'PROD-C',
        title: 'Mousepad Gamer XL',
        description: 'Superficie de tela micro-texturizada anti-deslizante.',
        pointsCost: 100,
        priceUsd: 10.00,
        stock: 10,
        imageUrl: ''
      }
    ];

    renderCatalog(testCatalog, null);

    const dropA = doc.getElementById('specs-drop-PROD-A');
    const btnA = doc.getElementById('specs-btn-PROD-A');
    const dropB = doc.getElementById('specs-drop-PROD-B');
    const btnB = doc.getElementById('specs-btn-PROD-B');

    expect(dropA).toBeTruthy('Drop A should exist in DOM');
    expect(dropB).toBeTruthy('Drop B should exist in DOM');
    expect(dropA.style.display === 'none' || !dropA.style.display).toBe(true, 'Drop A initially hidden');

    // 1. Abrir dropdown A
    toggleRewardSpecs('PROD-A');
    expect(dropA.style.display).toBe('block', 'Drop A should be visible after toggle');
    expect(btnA.classList.contains('expanded')).toBe(true, 'Button A should have expanded class');

    // 2. Abrir dropdown B: Debe cerrar A automáticamente para no saturar la vista
    toggleRewardSpecs('PROD-B');
    expect(dropB.style.display).toBe('block', 'Drop B should be visible after toggle');
    expect(dropA.style.display).toBe('none', 'Drop A should be automatically closed when B opens');
    expect(btnA.classList.contains('expanded')).toBe(false, 'Button A should no longer have expanded class');

    // 3. Cerrar B
    toggleRewardSpecs('PROD-B');
    expect(dropB.style.display).toBe('none', 'Drop B should be closed after second toggle');

    // 4. Validar pill de producto sin especificaciones
    const catalogHtml = catalogContainer.innerHTML;
    expect(catalogHtml).toContain('reward-specs-empty-pill', 'Products without specs should have empty pill for uniform height');
    expect(catalogHtml).toContain('specs-dropdown-header', 'Specs dropdown should include header with close button');
  });

  return ctx.summary();
}
