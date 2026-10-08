/**
 * ============================================================================
 * WIRED CLUB - E2E SPECIFICATION TEST SUITE: MOBILE LAYOUT & COMBO ERGONOMICS
 * ============================================================================
 * File: tests/verify_combo_mobile_layout.mjs
 * Track: Milestone E2E_TRACK / M2-M4 Mobile Verification
 * Architecture: Opaque-Box DOM & CSS Verification, Touch Ergonometrics, Zero-Overflow
 * Target Specifications:
 *   - PROJECT.md (§ Architecture, § Feature Inventory R1, R2, R5)
 *   - ORIGINAL_REQUEST.md (§ 2026-10-07T22:48:40Z: R1, R2, R5)
 *   - TEST_INFRA.md (§ Feature 7: Mobile Responsiveness 320px - 480px)
 * Author: teamwork_preview_test_writer_combos_1
 * Date: 2026-10-07
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const readFile = (rel) => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');

export async function runComboMobileLayoutTestSuite() {
  const summaries = [];
  const startAll = performance.now();

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   SUITE DE VERIFICACIÓN: LAYOUT MÓVIL Y ERGONOMÍA DE COMBOS        ║');
  console.log('║   Touch Targets >= 44px/38px | Tabs Scroll | Zero Overflow (320px) ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Load target source files
  const adminHtml = readFile('admin.html');
  const indexHtml = readFile('index.html');
  const adminCss = readFile('css/admin.css');
  const clientCss = readFile('css/client.css');
  const responsiveCss = readFile('css/responsive.css');
  const confirmRedeemCss = readFile('css/modals/confirm-redeem.css');
  const catalogViewJs = readFile('js/views/customer/CustomerCatalogView.js');

  // Setup DOM harness
  const { doc, win } = setupTestEnvironment('index.html');

  // =========================================================================
  // SECTION 1: ADMIN PRODUCT MODAL DOM & INVARIANTS (#modal-new-product)
  // =========================================================================
  const s1Ctx = new TestContext('Sec 1: Admin Product Modal DOM & Invariants (#modal-new-product)');
  console.log('======================================================');
  console.log(' RUNNING SEC 1: ADMIN PRODUCT MODAL DOM & INVARIANTS');
  console.log('======================================================');

  await s1Ctx.test('S1.1: admin.html preserves core modal container #modal-new-product', async () => {
    expect(adminHtml.includes('id="modal-new-product"')).toBe(true, 'admin.html must contain id="modal-new-product"');
  });

  await s1Ctx.test('S1.2: admin.html preserves all 10 baseline invariants from previous redesign', async () => {
    const requiredInvariants = [
      'id="prod-edit-id"',
      'id="modal-product-title"',
      'id="btn-prod-mode-free"',
      'id="btn-prod-mode-discount"',
      'id="btn-prod-mode-incoming"',
      'id="calc-prod-price-usd"',
      'id="calc-prod-weight-lbs"',
      'id="calc-freight-rate"',
      'id="prod-cost"',
      'id="prod-stock"'
    ];

    for (const inv of requiredInvariants) {
      expect(adminHtml.includes(inv)).toBe(true, `admin.html must preserve invariant ${inv}`);
    }
  });

  await s1Ctx.test('S1.3: admin.html contains selector for "Combo Flexible" mode', async () => {
    const hasComboModeBtn = adminHtml.includes('btn-prod-mode-combo') ||
      adminHtml.includes('setProductPublicationMode(\'COMBO\')') ||
      adminHtml.includes('setProductPublicationMode("COMBO")') ||
      adminHtml.includes('COMBO FLEXIBLE');
    expect(hasComboModeBtn).toBe(true, 'admin.html must include [✨ Combo Flexible] mode trigger');
  });

  await s1Ctx.test('S1.4: Dynamic tabs container for combo items exists in admin layout', async () => {
    const hasTabsContainer = adminHtml.includes('combo-items-tabs') ||
      adminHtml.includes('combo-items-tab-bar') ||
      adminHtml.includes('combo-tab-bar') ||
      adminCss.includes('combo-items-tabs') ||
      adminCss.includes('combo-tabs-bar');
    expect(hasTabsContainer).toBe(true, 'Dynamic items tab bar container must exist for combos');
  });

  await s1Ctx.test('S1.5: Sticky summary panel for live calculation (sum, combo price, savings $, % OFF) exists', async () => {
    const hasStickySummary = adminHtml.includes('combo-summary-panel') ||
      adminHtml.includes('combo-calc-summary') ||
      adminCss.includes('combo-summary-panel') ||
      adminCss.includes('combo-calc-sticky');
    expect(hasStickySummary).toBe(true, 'Sticky summary calculation panel must be defined');
  });

  summaries.push(s1Ctx.summary());

  // =========================================================================
  // SECTION 2: ACQUISITION MODAL INVARIANTS & 24 DOM IDs (#modal-confirm-redeem)
  // =========================================================================
  const s2Ctx = new TestContext('Sec 2: Acquisition Modal Invariants & 24 DOM IDs (#modal-confirm-redeem)');
  console.log('======================================================');
  console.log(' RUNNING SEC 2: ACQUISITION MODAL INVARIANTS & 24 DOM IDs');
  console.log('======================================================');

  await s2Ctx.test('S2.1: Exactly all 24 required DOM IDs inside #modal-confirm-redeem are preserved without modification', async () => {
    const required24Ids = [
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
      'confirm-warranty-notice'
    ];

    for (const id of required24Ids) {
      const el = doc.getElementById(id);
      expect(Boolean(el)).toBe(true, `Mandatory DOM ID #${id} must be present in index.html`);
    }

    // Action button
    const btnDoRedeem = doc.getElementById('btn-do-redeem');
    expect(Boolean(btnDoRedeem)).toBe(true, 'Mandatory button #btn-do-redeem must be present');
  });

  await s2Ctx.test('S2.2: Additive combo selector sub-block #confirm-combo-selector-wrap is integrated or provided', async () => {
    const hasComboWrap = indexHtml.includes('id="confirm-combo-selector-wrap"') ||
      indexHtml.includes('confirm-combo-options') ||
      catalogViewJs.includes('confirm-combo-selector-wrap');
    expect(hasComboWrap).toBe(true, 'Sub-block #confirm-combo-selector-wrap must be present for N+1 selection');
  });

  await s2Ctx.test('S2.3: All 6 primary window handlers for #modal-confirm-redeem are exposed on window', async () => {
    const appModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const requiredHandlers = [
      'closeRedeemModal',
      'onPointsSliderChange',
      'onPointsNumChange',
      'setPointsPreset',
      'executeRedeem',
      'confirmRedeem'
    ];

    for (const handler of requiredHandlers) {
      expect(typeof win[handler]).toBe('function', `window.${handler} must be a callable function`);
    }
  });

  summaries.push(s2Ctx.summary());

  // =========================================================================
  // SECTION 3: CATALOG SPLIT CARD & HAIBANE AESTHETICS (CustomerCatalogView)
  // =========================================================================
  const s3Ctx = new TestContext('Sec 3: Catalog Split Card & Haibane Aesthetics (CustomerCatalogView)');
  console.log('======================================================');
  console.log(' RUNNING SEC 3: CATALOG SPLIT CARD & HAIBANE AESTHETICS');
  console.log('======================================================');

  await s3Ctx.test('S3.1: CSS or Catalog View defines symmetric split image container (50/50 and 3-grid)', async () => {
    const hasSplitContainers = clientCss.includes('.combo-split-container') ||
      clientCss.includes('.combo-images-split') ||
      responsiveCss.includes('.combo-split-container') ||
      catalogViewJs.includes('combo-split-container') ||
      catalogViewJs.includes('combo-images-split');
    expect(hasSplitContainers).toBe(true, 'Split image container for combos must be defined');
  });

  await s3Ctx.test('S3.2: Haibane Series 3 aesthetics (gold accent #d97706, sacred glyph ✦, combo badge) are declared', async () => {
    const hasGoldAccent = clientCss.includes('#d97706') ||
      responsiveCss.includes('#d97706') ||
      catalogViewJs.includes('#d97706');
    const hasGlyphOrBadge = catalogViewJs.includes('✦') ||
      clientCss.includes('combo-badge') ||
      catalogViewJs.includes('COMBO') ||
      catalogViewJs.includes('✦ COMBO');

    expect(hasGoldAccent).toBe(true, 'Gold accent #d97706 must be present in combo aesthetics');
    expect(hasGlyphOrBadge).toBe(true, 'Sacred glyph ✦ and combo badge must be present');
  });

  await s3Ctx.test('S3.3: Action button "⚡ ADQUIRIR COMBO O POR SEPARADO" is rendered with touch-friendly class', async () => {
    const hasActionBtnText = catalogViewJs.includes('ADQUIRIR COMBO O POR SEPARADO') ||
      catalogViewJs.includes('ADQUIRIR COMBO') ||
      clientCss.includes('.btn-combo-acquire');
    expect(hasActionBtnText).toBe(true, 'Action button text "ADQUIRIR COMBO O POR SEPARADO" must be present');
  });

  summaries.push(s3Ctx.summary());

  // =========================================================================
  // SECTION 4: MOBILE TOUCH TARGETS & HORIZONTAL SCROLLING (<600px, <768px)
  // =========================================================================
  const s4Ctx = new TestContext('Sec 4: Mobile Touch Targets & Horizontal Scrolling (<600px, <768px)');
  console.log('======================================================');
  console.log(' RUNNING SEC 4: MOBILE TOUCH TARGETS & HORIZONTAL SCROLLING');
  console.log('======================================================');

  await s4Ctx.test('S4.1: Modal action buttons in confirm-redeem.css maintain touch height >= 44px on mobile (<768px)', async () => {
    const has44pxButtons = confirmRedeemCss.includes('min-height: 44px') ||
      confirmRedeemCss.includes('min-height: 48px');
    expect(has44pxButtons).toBe(true, 'confirm-redeem.css must enforce min-height >= 44px for action buttons on mobile');
  });

  await s4Ctx.test('S4.2: Dynamic tabs on mobile (<600px) maintain touch height >= 38px', async () => {
    const has38pxTabs = adminCss.includes('min-height: 38px') ||
      adminCss.includes('height: 38px') ||
      responsiveCss.includes('min-height: 38px') ||
      responsiveCss.includes('height: 38px') ||
      adminCss.includes('min-height: 40px') ||
      adminCss.includes('min-height: 44px');
    expect(has38pxTabs).toBe(true, 'Tabs on mobile must maintain touch target >= 38px');
  });

  await s4Ctx.test('S4.3: Dynamic item tabs bar container declares smooth horizontal scroll (overflow-x: auto, white-space: nowrap)', async () => {
    const hasHorizontalTabsScroll = (adminCss.includes('overflow-x: auto') && adminCss.includes('white-space: nowrap')) ||
      (responsiveCss.includes('overflow-x: auto') && (responsiveCss.includes('white-space: nowrap') || responsiveCss.includes('touch-action: pan-x'))) ||
      adminCss.includes('combo-tabs-scroll') ||
      responsiveCss.includes('combo-tabs-bar');
    expect(hasHorizontalTabsScroll).toBe(true, 'Dynamic tabs container must support horizontal scroll on mobile');
  });

  summaries.push(s4Ctx.summary());

  // =========================================================================
  // SECTION 5: VIEWPORT CONSTRAINTS & ZERO OVERFLOW (320px, 375px, 414px)
  // =========================================================================
  const s5Ctx = new TestContext('Sec 5: Viewport Constraints & Zero Overflow (320px, 375px, 414px)');
  console.log('======================================================');
  console.log(' RUNNING SEC 5: VIEWPORT CONSTRAINTS & ZERO OVERFLOW');
  console.log('======================================================');

  await s5Ctx.test('S5.1: confirm-redeem.css modal container enforces fluid width (width: 95vw, max-width: 95vw / 480px) and overflow-x: hidden', async () => {
    expect(confirmRedeemCss.includes('width: 95vw')).toBe(true, 'Modal must use 95vw fluid width on mobile');
    expect(confirmRedeemCss.includes('overflow-x: hidden')).toBe(true, 'Modal must enforce overflow-x: hidden');
    expect(confirmRedeemCss.includes('box-sizing: border-box')).toBe(true, 'Modal must use box-sizing: border-box');
  });

  await s5Ctx.test('S5.2: Dual price numbers use font-variant-numeric: tabular-nums to prevent character jitter and truncation', async () => {
    const hasTabularNums = confirmRedeemCss.includes('font-variant-numeric: tabular-nums') ||
      confirmRedeemCss.includes('tabular-nums');
    expect(hasTabularNums).toBe(true, 'Price numbers must use tabular-nums');
  });

  await s5Ctx.test('S5.3: Price callout rows declare flex-wrap: wrap to prevent text overflow in Nicaraguan Córdobas (C$ NIO)', async () => {
    const hasFlexWrap = confirmRedeemCss.includes('flex-wrap: wrap');
    expect(hasFlexWrap).toBe(true, 'Callout rows must declare flex-wrap: wrap');
  });

  await s5Ctx.test('S5.4: Zero hardcoded min-width > 320px in mobile modal and card styles', async () => {
    // Check for harmful fixed min-widths in mobile query blocks
    const mobileRules = confirmRedeemCss.split('@media (max-width: 779.98px)')[1] || '';
    const harmfulMinWidth = /min-width:\s*(?:3[3-9]\d|[4-9]\d\d|\d{4,})px/i.test(mobileRules);
    expect(harmfulMinWidth).toBe(false, 'Mobile rules must not define fixed min-width > 320px');
  });

  summaries.push(s5Ctx.summary());

  // =========================================================================
  // FINAL REPORT & SUMMARY
  // =========================================================================
  const totalDuration = Math.round(performance.now() - startAll);
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors = [];

  console.log('\n======================================================');
  console.log('                 FINAL TEST SUMMARY                   ');
  console.log('======================================================');

  for (const s of summaries) {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;
    if (s.errors && s.errors.length > 0) {
      allErrors.push(...s.errors);
    }
    const mark = s.failed === 0 ? '✓ PASS' : '✕ FAIL';
    console.log(`[${mark}] ${s.name}: ${s.passed}/${s.total} passed (${s.failed} failed)`);
  }

  console.log('------------------------------------------------------');
  console.log(`TOTAL: ${totalTests} tests | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log(`Total Execution Time: ${totalDuration}ms`);
  console.log('======================================================\n');

  if (allErrors.length > 0) {
    console.error(`Suite finished with ${totalFailed} failure(s):`);
    for (const e of allErrors) {
      console.error(`  - ${e.description}: ${e.error ? e.error.message : e}`);
    }
  }

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    errors: allErrors,
    durationMs: totalDuration
  };
}

// Auto-run when invoked via node
if (process.argv[1] && process.argv[1].endsWith('verify_combo_mobile_layout.mjs')) {
  runComboMobileLayoutTestSuite()
    .then(summary => {
      if (summary.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(fatal => {
      console.error('[FATAL RUNNER EXCEPTION]:', fatal);
      process.exit(1);
    });
}
