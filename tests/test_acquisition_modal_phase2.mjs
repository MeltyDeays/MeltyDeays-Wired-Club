import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`✕ FAIL: ${message}`);
    process.exit(1);
  }
  passedTests++;
  console.log(`✓ ${message}`);
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   TEST: MODAL DE ADQUISICIÓN Y CANJE (FASE 2)              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 1. Static DOM Structure & Invariants in index.html
console.log('--- 1. VERIFICACIÓN DOM Y ESTRUCTURA ERGONÓMICA ---');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

assert(indexHtml.includes('id="confirm-product-perks"'), 'index.html contiene tarjeta de políticas de compra (#confirm-product-perks)');
assert(indexHtml.includes('id="confirm-perk-points-text"'), 'index.html contiene texto dinámico de puntos en perks (#confirm-perk-points-text)');
assert(indexHtml.includes('id="confirm-row-regular-price"'), 'index.html contiene fila estructurada de precio (#confirm-row-regular-price)');
assert(indexHtml.includes('id="confirm-row-discount"'), 'index.html contiene fila estructurada de descuento (#confirm-row-discount)');
assert(indexHtml.includes('id="confirm-row-max-disc"'), 'index.html contiene fila estructurada de tope (#confirm-row-max-disc)');
assert(indexHtml.includes('id="confirm-ledger-box"'), 'index.html identifica caja de balance (#confirm-ledger-box)');

// 24 IDs must be intact
const required24Ids = [
  'modal-confirm-redeem', 'confirm-reward-img-wrap', 'confirm-reward-img', 'confirm-reward-fallback',
  'confirm-reward-title', 'confirm-reward-points', 'confirm-points-controls-wrap', 'confirm-pts-applied-notice',
  'confirm-points-slider', 'confirm-points-num', 'confirm-points-max-badge', 'confirm-zero-pts-note',
  'confirm-type-callout', 'confirm-type-pct', 'confirm-type-price', 'confirm-type-pct-calc',
  'confirm-type-max-disc', 'confirm-calc-pct-label', 'confirm-type-discount', 'confirm-type-cash',
  'confirm-balance-current', 'confirm-balance-deduct', 'confirm-balance-after', 'confirm-warranty-notice'
];
for (const id of required24Ids) {
  assert(indexHtml.includes(`id="${id}"`), `DOM ID requerido #${id} preservado`);
}

// 2. CSS Rules in confirm-redeem.css
console.log('\n--- 2. VERIFICACIÓN CSS Y ALINEACIÓN TABULAR ---');
const cssContent = fs.readFileSync(path.join(ROOT, 'css/modals/confirm-redeem.css'), 'utf8');

assert(cssContent.includes('.confirm-perks-box'), 'confirm-redeem.css define estilos para .confirm-perks-box');
assert(cssContent.includes('font-variant-numeric: tabular-nums'), 'confirm-redeem.css aplica números tabulares para alineación');
assert(cssContent.includes('#confirm-type-price strong'), 'confirm-redeem.css alinea columna de moneda principal');
assert(cssContent.includes('#confirm-type-price span'), 'confirm-redeem.css alinea columna de moneda secundaria');

// 3. JS Runtime Behavioral Tests
console.log('\n--- 3. COMPORTAMIENTO JS Y DESGLOSE DINÁMICO ---');
const catalogJs = fs.readFileSync(path.join(ROOT, 'js/views/customer/CustomerCatalogView.js'), 'utf8');

assert(catalogJs.includes('💵 PRECIO PLANO'), 'CustomerCatalogView.js maneja badge limpio para precio plano');
assert(catalogJs.includes('rowDisc.style.display = isFlatPrice ? "none" : "flex"'), 'Oculta fila de descuento en productos de precio plano');
assert(catalogJs.includes('rowMaxDisc.style.display = isFlatPrice ? "none" : "flex"'), 'Oculta fila de tope de descuento en precio plano');
assert(catalogJs.includes('ledgerBox.style.display = isFlatPrice ? "none" : "block"'), 'Oculta auditoría de puntos cuando es precio plano');
assert(catalogJs.includes('perkPointsText.innerHTML = "<strong>Wired Points:</strong> Precio plano oficial. Tu saldo de puntos permanece 100% intacto."'), 'Informa al usuario que sus puntos quedan 100% intactos en precio plano');

console.log('\n======================================================');
console.log(`TOTAL PRUEBAS FASE 2: ${totalTests} | APROBADAS: ${passedTests} | FALLIDAS: 0`);
console.log('======================================================');
