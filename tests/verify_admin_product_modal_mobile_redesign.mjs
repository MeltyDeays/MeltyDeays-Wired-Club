import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log(' VERIFYING PRODUCT MODAL MOBILE & DESKTOP REDESIGN ');
console.log('====================================================');

const adminHtmlPath = path.resolve('admin.html');
const adminCssPath = path.resolve('css/admin.css');
const responsiveCssPath = path.resolve('css/responsive.css');

const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');
const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Invariantes del DOM en admin.html
assert(adminHtml.includes('id="modal-new-product"'), 'admin.html contiene id="modal-new-product"');
assert(adminHtml.includes('id="prod-edit-id"'), 'admin.html preserva input hidden #prod-edit-id');
assert(adminHtml.includes('id="btn-prod-mode-free"'), 'admin.html preserva #btn-prod-mode-free');
assert(adminHtml.includes('id="btn-prod-mode-discount"'), 'admin.html preserva #btn-prod-mode-discount');
assert(adminHtml.includes('id="btn-prod-mode-incoming"'), 'admin.html preserva #btn-prod-mode-incoming');
assert(adminHtml.includes('class="prod-mode-icon"'), 'admin.html tiene clase .prod-mode-icon');
assert(adminHtml.includes('class="prod-mode-label"'), 'admin.html tiene clase .prod-mode-label');
assert(adminHtml.includes('class="prod-mode-sub"'), 'admin.html tiene clase .prod-mode-sub');

// 2. Calculadora de Flete & Rentabilidad
assert(adminHtml.includes('id="calc-prod-price-usd"'), 'admin.html preserva #calc-prod-price-usd');
assert(adminHtml.includes('id="calc-prod-weight-lbs"'), 'admin.html preserva #calc-prod-weight-lbs');
assert(adminHtml.includes('id="calc-freight-rate"'), 'admin.html preserva #calc-freight-rate');
assert(adminHtml.includes('class="prod-calc-3col"'), 'admin.html preserva clase .prod-calc-3col');
assert(adminHtml.includes('class="calc-freq-grid"'), 'admin.html contiene clase .calc-freq-grid');

// 3. Agrupación dual de Costo WP y Stock
assert(adminHtml.includes('class="prod-cost-stock-grid"'), 'admin.html agrupa costo y stock en .prod-cost-stock-grid');
assert(adminHtml.includes('id="prod-cost"'), 'admin.html preserva #prod-cost');
assert(adminHtml.includes('id="prod-stock"'), 'admin.html preserva #prod-stock');

// 4. Estilos de foco sin borde rojo en admin.css
assert(adminCss.includes('#modal-new-product .form-input:focus'), 'admin.css define foco limpio para #modal-new-product');
assert(adminCss.includes('border-color: #4f46e5 !important'), 'admin.css aplica azul índigo #4f46e5 en foco');
assert(adminCss.includes('.prod-cost-stock-grid'), 'admin.css define clase base .prod-cost-stock-grid');

// 5. Reglas responsive en responsive.css
assert(responsiveCss.includes('.prod-mode-grid {') && responsiveCss.includes('grid-template-columns: repeat(3, 1fr) !important'), 'responsive.css define .prod-mode-grid con 3 columnas en móvil');
assert(responsiveCss.includes('.prod-mode-sub {') && responsiveCss.includes('display: none !important'), 'responsive.css oculta subtítulos largos en móvil para evitar scroll');
assert(responsiveCss.includes('.prod-calc-3col {') && responsiveCss.includes('grid-template-columns: repeat(3, 1fr) !important'), 'responsive.css mantiene .prod-calc-3col en 3 columnas compactas');
assert(responsiveCss.includes('.prod-cost-stock-grid {') && responsiveCss.includes('grid-template-columns: 1fr 1fr !important'), 'responsive.css mantiene .prod-cost-stock-grid en 2 columnas');
assert(responsiveCss.includes('#modal-new-product .modal-actions-responsive'), 'responsive.css optimiza botones de acción del footer en modal de producto');

console.log('====================================================');
console.log(` RESULT: ALL ${passed}/${passed + failed} CHECKS PASSED (${failed} failures) `);
console.log('====================================================');

if (failed > 0) process.exit(1);
