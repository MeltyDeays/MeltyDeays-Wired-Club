import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, expect } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

async function runReviewer2Audit() {
  console.log('=====================================================');
  console.log('  REVIEWER_2 (GEN 2): AUDIT & INTEGRITY VERIFICATION ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. Audit css/modals/base.css braces & keyframes
  // -----------------------------------------------------------------
  console.log('\n[1] CSS Audit: css/modals/base.css');
  const cssContent = fs.readFileSync(path.join(PROJECT_ROOT, 'css/modals/base.css'), 'utf8');
  const openBraces = (cssContent.match(/\{/g) || []).length;
  const closeBraces = (cssContent.match(/\}/g) || []).length;
  assert(openBraces === 15, `Opening braces count is 15 (got ${openBraces})`);
  assert(closeBraces === 15, `Closing braces count is 15 (got ${closeBraces})`);
  assert(openBraces === closeBraces, `Braces perfectly balanced (${openBraces} == ${closeBraces})`);
  assert(cssContent.includes('.lain-toggle-group {'), '.lain-toggle-group rule exists');
  assert(cssContent.includes('@keyframes modalHoloSweep {'), '@keyframes modalHoloSweep exists');
  assert(cssContent.includes('0% {') && cssContent.includes('50% {'), 'modalHoloSweep keyframe steps intact');

  // Setup environment first so globals (window, document, localStorage) exist
  const { doc, win } = setupTestEnvironment('admin.html');

  // -----------------------------------------------------------------
  // 2. Audit js/views/AdminInvoiceBatchView.js & js/views/index.js
  // -----------------------------------------------------------------
  console.log('\n[2] Module Audit: AdminInvoiceBatchView.js & views/index.js');
  const batchViewPath = path.join(PROJECT_ROOT, 'js/views/AdminInvoiceBatchView.js');
  const batchViewUrl = pathToFileURL(batchViewPath).href;
  const batchModule = await import(batchViewUrl);

  assert(typeof batchModule.saveProductAdmin === 'function', 'saveProductAdmin is exported as function');
  assert(typeof batchModule.saveNewProduct === 'function', 'saveNewProduct is exported as alias');
  assert(batchModule.saveProductAdmin === batchModule.saveNewProduct, 'saveProductAdmin === saveNewProduct');

  const viewsIndexPath = path.join(PROJECT_ROOT, 'js/views/index.js');
  const viewsIndexUrl = pathToFileURL(viewsIndexPath).href;
  const viewsIndexModule = await import(viewsIndexUrl);

  assert(typeof viewsIndexModule.saveProductAdmin === 'function', 'views/index.js re-exports saveProductAdmin');
  assert(typeof viewsIndexModule.setProductPublicationMode === 'function', 'views/index.js exports setProductPublicationMode');
  assert(typeof viewsIndexModule.recalculateProductDiscount === 'function', 'views/index.js exports recalculateProductDiscount');

  // Check imports in AdminInvoiceBatchView.js
  const batchSource = fs.readFileSync(batchViewPath, 'utf8');
  assert(
    batchSource.includes('import { setProductPublicationMode, recalculateProductDiscount } from "./AdminCatalogCalculatorView.js";'),
    'AdminInvoiceBatchView imports calculator utilities'
  );
  assert(
    batchSource.includes('const activeProductMode = document.getElementById("prod-reward-type")?.value || "FREE_REWARD";'),
    'activeProductMode is properly resolved from prod-reward-type with fallback'
  );

  // -----------------------------------------------------------------
  // 3. Audit js/admin-app.js
  // -----------------------------------------------------------------
  console.log('\n[3] Controller Audit: js/admin-app.js');
  const adminAppSource = fs.readFileSync(path.join(PROJECT_ROOT, 'js/admin-app.js'), 'utf8');
  assert(
    adminAppSource.includes('import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js";'),
    'InvoiceTemplateService imported without query string'
  );
  assert(
    !adminAppSource.includes('InvoiceTemplateService.js?'),
    'No query strings on InvoiceTemplateService import'
  );

  // Verify all handlers in admin.html are bound to window in admin-app.js or declared in HTML
  const adminHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'admin.html'), 'utf8');
  const DOM_METHODS = new Set(['preventDefault', 'stopPropagation', 'getElementById', 'querySelector', 'querySelectorAll', 'click', 'focus', 'blur', 'reset']);
  const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'let', 'const', 'var', 'event']);
  const attrRegex = /on(?:click|change|submit|input|keyup|keydown)="([^"]+)"/g;
  let m;
  const extractedFns = new Set();
  while ((m = attrRegex.exec(adminHtml)) !== null) {
    const raw = m[1].trim();
    // Match function calls not preceded by a dot (e.g. not event.preventDefault() or el.click())
    const fnMatches = raw.matchAll(/(?:^|[^a-zA-Z0-9_$.])([a-zA-Z0-9_$]+)\s*\(/g);
    for (const match of fnMatches) {
      const fnName = match[1];
      if (!JS_KEYWORDS.has(fnName) && !DOM_METHODS.has(fnName)) {
        extractedFns.add(fnName);
      }
    }
  }

  // Load admin-app.js
  const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
  await import(adminAppUrl);
  win.document.dispatchEvent({ type: 'DOMContentLoaded' });

  let missingWindowHandlers = [];
  for (const fn of extractedFns) {
    if (typeof win[fn] !== 'function') {
      missingWindowHandlers.push(fn);
    }
  }
  assert(
    missingWindowHandlers.length === 0,
    `All ${extractedFns.size} inline admin handlers are exposed on window (missing: ${missingWindowHandlers.join(', ') || 'none'})`
  );

  // -----------------------------------------------------------------
  // 4. Audit js/views/AdminInvoiceModalView.js
  // -----------------------------------------------------------------
  console.log('\n[4] Modal View Audit: AdminInvoiceModalView.js');
  const invoiceModalSource = fs.readFileSync(path.join(PROJECT_ROOT, 'js/views/AdminInvoiceModalView.js'), 'utf8');
  assert(
    invoiceModalSource.includes('let closeModal = (modalId) => { const el = document.getElementById(modalId); if (el) el.style.display = "none"; };'),
    'closeModal fallback defined at module scope in AdminInvoiceModalView.js'
  );
  assert(
    invoiceModalSource.includes('if (deps.closeModal) closeModal = deps.closeModal;'),
    'closeModal injected from deps in initAdminInvoiceModalView'
  );
  assert(
    invoiceModalSource.includes('closeModal("modal-single-digital-invoice");'),
    'closeModal called after single digital invoice generation'
  );

  // -----------------------------------------------------------------
  // 5. Runtime Integrity: admin.html PIN flow, Tab switching, Utilities
  // -----------------------------------------------------------------
  console.log('\n[5] Runtime Integrity: Admin Terminal');

  // Test PIN unlock with 110805
  const pinInput = doc.getElementById('input-admin-pin');
  const lockEl = doc.getElementById('admin-auth-lock');
  const mainEl = doc.getElementById('admin-main-panel');
  assert(lockEl.style.display !== 'none', 'Terminal is locked by default');

  pinInput.value = '110805';
  await win.submitAdminPin();
  assert(win.sessionStorage.getItem('melty_admin_auth') === '110805', 'Admin auth token set in sessionStorage');
  assert(lockEl.style.display === 'none', 'Lock overlay hidden on successful PIN');
  assert(mainEl.style.display === 'block', 'Admin main panel displayed on successful PIN');

  // Test Tab Switching across all 5 sections
  const tabs = ['pos', 'clients', 'invoices', 'catalog', 'history'];
  for (const tab of tabs) {
    win.switchAdminTab(tab);
    const sec = doc.getElementById('sec-' + tab);
    const btn = doc.getElementById('tab-btn-' + tab);
    assert(sec && sec.style.display === 'block', `Tab "${tab}" section is visible (display: block)`);
    assert(btn && btn.classList.contains('active'), `Tab "${tab}" button has active class`);

    // Verify other tabs are hidden
    const others = tabs.filter(t => t !== tab);
    let allOthersHidden = true;
    for (const ot of others) {
      const oSec = doc.getElementById('sec-' + ot);
      if (oSec && oSec.style.display !== 'none') allOthersHidden = false;
    }
    assert(allOthersHidden, `All other tabs hidden when tab "${tab}" is active`);
  }

  // Test Navbar utilities:
  // 1. Calc WP
  win.openSalePointsCalculatorModal('navbar');
  const calcModal = doc.getElementById('modal-sale-calculator');
  assert(calcModal && calcModal.style.display === 'flex', 'Calc WP navbar button opens modal-sale-calculator');
  win.closeModal('modal-sale-calculator');
  assert(calcModal.style.display === 'none', 'closeModal closes modal-sale-calculator');

  // 2. Digital Invoice 1-Page
  win.openSingleDigitalInvoiceModal();
  const invModal = doc.getElementById('modal-single-digital-invoice');
  assert(invModal && invModal.style.display === 'flex', 'Digital Invoice navbar button opens modal-single-digital-invoice');
  win.closeModal('modal-single-digital-invoice');
  assert(invModal.style.display === 'none', 'closeModal closes modal-single-digital-invoice');

  // -----------------------------------------------------------------
  // 6. Test saveProductAdmin flow in Admin Terminal
  // -----------------------------------------------------------------
  console.log('\n[6] Product Catalog Save Flow: saveProductAdmin');
  win.openNewProductModal();
  const prodModal = doc.getElementById('modal-new-product');
  assert(prodModal && prodModal.style.display === 'flex', 'openNewProductModal opens modal-new-product');

  // Fill in new product details
  doc.getElementById('prod-title').value = 'Teclado Mecánico Custom Gateron Pro';
  doc.getElementById('prod-cost').value = '450';
  doc.getElementById('prod-stock').value = '5';
  doc.getElementById('prod-reward-type').value = 'FREE_REWARD';
  doc.getElementById('prod-desc').value = 'Teclado 65% wireless';

  await win.saveProductAdmin();
  assert(prodModal.style.display === 'none', 'saveProductAdmin closes modal-new-product on success');

  // Check that product was added to FirestoreService catalog
  const catalogList = await win.FirestoreService.fetchRewards();
  const addedProd = catalogList.find(p => p.title === 'Teclado Mecánico Custom Gateron Pro');
  assert(Boolean(addedProd), 'Product was successfully added to catalog');
  const prodCost = addedProd ? (addedProd.pointsCost || addedProd.points_cost) : 0;
  assert(prodCost === 450, `Added product pointsCost is 450 (got ${prodCost})`);
  assert(addedProd && addedProd.stock === 5, 'Added product stock is 5');

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n=====================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runReviewer2Audit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
