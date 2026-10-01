/**
 * EMPIRICAL CHALLENGER TEST SUITE: MODAL CONFIRM REDEEM (#modal-confirm-redeem)
 * Adversarial Verification of CSS Dimensional Rules, Media Queries,
 * DOM Column Balance, Anti-Truncation, Touch Ergonometrics, and Currency Formats.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    failedChecks++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  }
}

async function runEmpiricalSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   CHALLENGER EMPIRICAL VERIFICATION: MODAL CONFIRM REDEEM          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. STATIC CSS ANALYSIS: confirm-redeem.css
  // =========================================================================
  console.log('--- 1. STATIC CSS & MEDIA QUERY DIMENSIONALITY ---');
  const cssPath = path.join(PROJECT_ROOT, 'css/modals/confirm-redeem.css');
  assert(fs.existsSync(cssPath), 'css/modals/confirm-redeem.css exists');

  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Desktop Media Query (>= 780px)
  assert(/@media\s*\(\s*min-width:\s*780px\s*\)/i.test(cssContent),
    'Contains @media (min-width: 780px) declaration');

  const desktopBlockMatch = cssContent.match(/@media\s*\(\s*min-width:\s*780px\s*\)\s*\{([\s\S]*?)\n\}/);
  assert(desktopBlockMatch !== null, 'Found desktop @media block');
  const desktopCss = desktopBlockMatch[1];

  assert(/max-width:\s*880px\s*!important/i.test(desktopCss),
    'Desktop: .confirm-redeem-modal-container enforces max-width: 880px !important');
  assert(/width:\s*880px\s*!important/i.test(desktopCss),
    'Desktop: .confirm-redeem-modal-container enforces width: 880px !important');
  assert(/display:\s*grid\s*!important/i.test(desktopCss),
    'Desktop: .confirm-redeem-body-grid enforces display: grid !important');
  assert(/grid-template-columns:\s*1\.08fr\s+0\.92fr\s*!important/i.test(desktopCss),
    'Desktop: grid-template-columns is 1.08fr 0.92fr !important (2 balanced columns)');
  assert(/gap:\s*1\.6rem\s*!important/i.test(desktopCss),
    'Desktop: grid gap is 1.6rem !important');
  assert(/flex-direction:\s*row\s*!important/i.test(desktopCss),
    'Desktop: .confirm-redeem-actions has flex-direction: row !important');
  assert(/justify-content:\s*flex-end\s*!important/i.test(desktopCss),
    'Desktop: .confirm-redeem-actions has justify-content: flex-end !important');

  // Mobile Media Query (< 780px)
  assert(/@media\s*\(\s*max-width:\s*779\.98px\s*\)/i.test(cssContent),
    'Contains @media (max-width: 779.98px) declaration covering mobile < 780px');

  const mobileBlockMatch = cssContent.match(/@media\s*\(\s*max-width:\s*779\.98px\s*\)\s*\{([\s\S]*?)\n\}/);
  assert(mobileBlockMatch !== null, 'Found mobile @media block');
  const mobileCss = mobileBlockMatch[1];

  assert(/width:\s*95vw\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-modal-container enforces width: 95vw !important');
  assert(/max-width:\s*95vw\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-modal-container enforces max-width: 95vw !important');
  assert(/max-height:\s*92vh\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-modal-container enforces max-height: 92vh !important');
  assert(/overflow-y:\s*auto\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-modal-container enforces overflow-y: auto !important');
  assert(/-webkit-overflow-scrolling:\s*touch\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-modal-container has -webkit-overflow-scrolling: touch !important');
  assert(/flex-direction:\s*column\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-body-grid enforces flex-direction: column !important');
  assert(/flex-direction:\s*column-reverse\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-actions enforces flex-direction: column-reverse !important (Confirm top, Cancel bottom)');
  assert(/min-height:\s*44px\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-actions button enforces min-height: 44px !important (Touch ergonomics standard)');
  assert(/width:\s*100%\s*!important/i.test(mobileCss),
    'Mobile: .confirm-redeem-actions button enforces width: 100% !important');

  // Anti-Truncation and Dual-Currency Stacking Protection
  assert(/#confirm-type-price[\s\S]*?white-space:\s*nowrap\s*!important/i.test(cssContent),
    'Anti-Truncation: #confirm-type-price has white-space: nowrap !important');
  assert(/#confirm-type-cash[\s\S]*?white-space:\s*nowrap\s*!important/i.test(cssContent),
    'Anti-Truncation: #confirm-type-cash has white-space: nowrap !important');
  assert(/#confirm-type-cash\s*span[\s\S]*?white-space:\s*nowrap\s*!important/i.test(cssContent),
    'Anti-Truncation: #confirm-type-cash span has white-space: nowrap !important');
  assert(/#confirm-type-price\s*span[\s\S]*?white-space:\s*nowrap\s*!important/i.test(cssContent),
    'Anti-Truncation: #confirm-type-price span has white-space: nowrap !important');
  assert(/display:\s*inline-flex\s*!important/i.test(cssContent),
    'Anti-Truncation: #confirm-type-cash has display: inline-flex !important for baseline alignment');

  // =========================================================================
  // 2. MODULAR CSS IMPORTS & CACHE BUSTING INTEGRITY
  // =========================================================================
  console.log('\n--- 2. CSS MODULAR IMPORTS & CACHE BUSTER AUDIT ---');
  const modalsIndexPath = path.join(PROJECT_ROOT, 'css/modals/index.css');
  const modalsIndexContent = fs.readFileSync(modalsIndexPath, 'utf8');
  assert(modalsIndexContent.includes('./confirm-redeem.css'),
    'css/modals/index.css imports ./confirm-redeem.css');

  const responsiveCssPath = path.join(PROJECT_ROOT, 'css/responsive.css');
  const responsiveCssContent = fs.readFileSync(responsiveCssPath, 'utf8');
  assert(responsiveCssContent.includes('.confirm-redeem-actions button'),
    'css/responsive.css includes .confirm-redeem-actions button touch rules');
  assert(/min-height:\s*44px\s*!important/i.test(responsiveCssContent),
    'css/responsive.css reinforces min-height: 44px !important on tactile buttons');

  const stylesCssPath = path.join(PROJECT_ROOT, 'styles.css');
  const stylesCssContent = fs.readFileSync(stylesCssPath, 'utf8');
  assert(/css\/modals\/index\.css\?v=2\.9\.8/i.test(stylesCssContent),
    'styles.css imports css/modals/index.css?v=2.9.8 with synchronized cache buster');
  assert(/css\/responsive\.css\?v=2\.9\.8/i.test(stylesCssContent),
    'styles.css imports css/responsive.css?v=2.9.8 with synchronized cache buster');

  // =========================================================================
  // 3. DOM STRUCTURE & COLUMN BALANCE IN index.html
  // =========================================================================
  console.log('\n--- 3. DOM STRUCTURE & 2-COLUMN BALANCE IN index.html ---');
  const indexHtmlPath = path.join(PROJECT_ROOT, 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  assert(indexHtml.includes('id="modal-confirm-redeem"'),
    'index.html contains #modal-confirm-redeem overlay');
  assert(indexHtml.includes('confirm-redeem-modal-container'),
    'Modal contains .confirm-redeem-modal-container');
  assert(indexHtml.includes('confirm-redeem-body-grid'),
    'Modal contains .confirm-redeem-body-grid');
  assert(indexHtml.includes('confirm-redeem-col-product'),
    'Modal contains .confirm-redeem-col-product (Left Column)');
  assert(indexHtml.includes('confirm-redeem-col-summary'),
    'Modal contains .confirm-redeem-col-summary (Right Column)');

  // Verify elements partitioned into LEFT COLUMN
  const colProductRegex = /<div class="confirm-redeem-col-product">([\s\S]*?)<\/div>\s*<!-- COLUMNA DERECHA/i;
  const colProductMatch = indexHtml.match(colProductRegex);
  assert(colProductMatch !== null, 'Left column boundary parsed cleanly');
  const leftHtml = colProductMatch[1];

  const leftRequiredIds = [
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
    'confirm-zero-pts-note'
  ];

  for (const id of leftRequiredIds) {
    assert(leftHtml.includes(`id="${id}"`), `Left column contains #${id}`);
  }
  assert(leftHtml.includes("setPointsPreset('max')"), "Left column contains preset 'max' button");
  assert(leftHtml.includes("setPointsPreset('zero')"), "Left column contains preset 'zero' button");
  assert(leftHtml.includes('onPointsSliderChange(this.value)'), "Left column binds onPointsSliderChange");
  assert(leftHtml.includes('onPointsNumChange(this.value)'), "Left column binds onPointsNumChange");

  // Verify elements partitioned into RIGHT COLUMN
  const colSummaryRegex = /<div class="confirm-redeem-col-summary">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i;
  const colSummaryMatch = indexHtml.match(colSummaryRegex);
  assert(colSummaryMatch !== null, 'Right column boundary parsed cleanly');
  const rightHtml = colSummaryMatch[1];

  const rightRequiredIds = [
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

  for (const id of rightRequiredIds) {
    assert(rightHtml.includes(`id="${id}"`), `Right column contains #${id}`);
  }
  assert(rightHtml.includes('closeRedeemModal()'), 'Right column contains Cancel button with closeRedeemModal()');
  assert(rightHtml.includes('executeRedeem()'), 'Right column contains Confirm button with executeRedeem()');
  assert(rightHtml.includes('ledger-preview-box'), 'Right column contains .ledger-preview-box balance audit');

  // Verify no misplaced elements (e.g. callout must NOT be in left column)
  assert(!leftHtml.includes('id="confirm-type-callout"'),
    'Balance guard: #confirm-type-callout is NOT inside left column (properly moved to right column)');
  assert(!leftHtml.includes('id="btn-do-redeem"'),
    'Balance guard: #btn-do-redeem is NOT inside left column');
  assert(!rightHtml.includes('id="confirm-points-slider"'),
    'Balance guard: #confirm-points-slider is NOT inside right column (properly located in left column)');

  // =========================================================================
  // 4. RUNTIME WORKFLOW, CURRENCY DUAL-PRICING & ADVERSARIAL STRESS
  // =========================================================================
  console.log('\n--- 4. RUNTIME LOGIC & DUAL-CURRENCY RENDERING STRESS ---');
  const { doc, win, localStorage } = setupTestEnvironment('index.html');

  // Seed sample database with both PARTIAL_DISCOUNT and FULL_POINTS rewards
  const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
  rawDb.rewards['rew-adv-laptop'] = {
    id: 'rew-adv-laptop',
    title: 'Laptop Gaming CyberLain Core-i9 Extreme Edition 64GB',
    category: 'Hardware',
    stock: 2,
    rewardType: 'PARTIAL_DISCOUNT',
    priceUsd: 1299.99,
    pointsCost: 5000,
    maxDiscountPct: 20,
    maxDiscountUsd: 259.99,
    cashToPayUsd: 1040.00
  };
  rawDb.rewards['rew-adv-sticker'] = {
    id: 'rew-adv-sticker',
    title: 'Sticker Holográfico Copland OS',
    category: 'Merch',
    stock: 50,
    rewardType: 'FULL_POINTS',
    priceUsd: 0,
    pointsCost: 150,
    maxDiscountPct: 100,
    maxDiscountUsd: 0,
    cashToPayUsd: 0
  };
  localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(rawDb));
  localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(rawDb));

  const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
  await import(appUrl);
  win.document.dispatchEvent({ type: 'DOMContentLoaded' });

  // Login Carlos Lopez (500 WP)
  doc.getElementById('login-phone').value = '5843-8412';
  doc.getElementById('login-pin').value = '1234';
  await win.submitClientLogin();
  assert(doc.getElementById('client-balance-val').textContent === '500', 'User logged in with 500 WP balance');

  // --- Scenario A: Partial Discount Reward in USD mode ---
  win.confirmRedeem('rew-adv-laptop');
  const modal = doc.getElementById('modal-confirm-redeem');
  assert(modal.style.display === 'flex', 'Modal opens for partial discount reward');

  const callout = doc.getElementById('confirm-type-callout');
  const controlsWrap = doc.getElementById('confirm-points-controls-wrap');
  const priceEl = doc.getElementById('confirm-type-price');
  const cashEl = doc.getElementById('confirm-type-cash');
  const slider = doc.getElementById('confirm-points-slider');
  const numInput = doc.getElementById('confirm-points-num');
  const btnDo = doc.getElementById('btn-do-redeem');
  const warranty = doc.getElementById('confirm-warranty-notice');

  assert(callout.style.display === 'block', 'Partial discount: Callout is displayed');
  assert(controlsWrap.style.display === 'block', 'Partial discount: Points controls wrap is displayed');
  assert(priceEl.innerHTML.includes('$1299.99 USD'), 'Price shows $1299.99 USD in USD mode');
  assert(priceEl.innerHTML.includes('C$'), 'Price includes dual NIO equivalent in USD mode');
  assert(cashEl.innerHTML.includes('$'), 'Cash to pay shows dual currency');
  assert(warranty.innerHTML.includes('GARANTÍA COMERCIAL (30 DÍAS)'),
    'Warranty notice correctly identifies commercial 30-day warranty');

  // Verify slider state and boundaries: user has 500 WP, cap is 5000 WP -> maxUsable is 500
  assert(slider.max === '500', 'Slider max clamped to user balance (500 WP)');
  assert(slider.value === '500', 'Slider defaults to max usable points (500 WP)');

  // Preset Zero
  win.setPointsPreset('zero');
  assert(slider.value === '0', 'setPointsPreset("zero") resets slider to 0');
  assert(numInput.value === '0', 'setPointsPreset("zero") resets input to 0');
  assert(btnDo.textContent.includes('GENERAR VALE DE COMPRA'), 'Button text changes to GENERAR VALE DE COMPRA');

  // Preset Max
  win.setPointsPreset('max');
  assert(slider.value === '500', 'setPointsPreset("max") sets slider to 500');
  assert(numInput.value === '500', 'setPointsPreset("max") sets input to 500');
  assert(btnDo.textContent.includes('CANJEAR VALE DE DESCUENTO'), 'Button text changes to CANJEAR VALE DE DESCUENTO');

  // --- Scenario B: Currency Toggling to NIO ---
  await win.setAppCurrency('NIO');
  win.confirmRedeem('rew-adv-laptop');
  assert(priceEl.innerHTML.includes('NIO</strong>'), 'Price prioritizes NIO primary format when currency is NIO');
  assert(priceEl.innerHTML.includes('($1299.99 USD)'), 'Price displays secondary USD badge when currency is NIO');
  assert(cashEl.innerHTML.includes('NIO</strong>'), 'Cash to pay prioritizes NIO format when currency is NIO');

  // Revert currency to USD
  await win.setAppCurrency('USD');

  // --- Scenario C: 100% Points Reward (isPartial === false) ---
  win.confirmRedeem('rew-adv-sticker');
  assert(callout.style.display === 'none', '100% points item: Callout is hidden (style.display = "none")');
  assert(controlsWrap.style.display === 'none', '100% points item: Points controls wrap is hidden');
  assert(btnDo.textContent.includes('AUTORIZAR CANJE WIRED'), 'Button text is AUTORIZAR CANJE WIRED');
  assert(warranty.innerHTML.includes('estrictamente exentos de garantía técnica'),
    'Warranty notice correctly identifies technical warranty exemption');

  const curBal = doc.getElementById('confirm-balance-current').textContent;
  const dedBal = doc.getElementById('confirm-balance-deduct').textContent;
  const aftBal = doc.getElementById('confirm-balance-after').textContent;
  assert(curBal === '500 WP', 'Audit balance current is 500 WP');
  assert(dedBal === '-150 WP', 'Audit balance deduction is -150 WP');
  assert(aftBal === '350 WP', 'Audit balance resulting is 350 WP');

  win.closeRedeemModal();
  assert(modal.style.display === 'none', 'closeRedeemModal() hides modal');

  // =========================================================================
  // 5. SUMMARY VERDICT
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('======================================================');

  if (failedChecks > 0) {
    console.error(`\n>>> EMPIRICAL CHALLENGER VERDICT: REQUEST_CHANGES (${failedChecks} failures) <<<`);
    process.exit(1);
  } else {
    console.log('\n>>> EMPIRICAL CHALLENGER VERDICT: APPROVE (100% verified) <<<');
  }
}

runEmpiricalSuite().catch(err => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
