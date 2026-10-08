import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   TEST SUITE: DOM PASSWORD FORMS & FORCED REFLOW OPTIMIZATION      ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// 1. Verificación de Formulario Semántico en CustomerProfileDrawer.js
console.log('--- 1. SEMÁNTICA HTML & DOM EN CustomerProfileDrawer.js ---');
const drawerPath = path.join(PROJECT_ROOT, 'js/views/customer/CustomerProfileDrawer.js');
const drawerContent = fs.readFileSync(drawerPath, 'utf8');

assert(
  drawerContent.includes('<form id="profile-pin-form-body"') && drawerContent.includes('</form>'),
  '#profile-pin-form-body está implementado como elemento <form> semántico'
);

assert(
  drawerContent.includes('onsubmit="event.preventDefault(); executeProfilePinUpdate();"'),
  '<form> intercepta onsubmit con preventDefault y llama a executeProfilePinUpdate()'
);

assert(
  drawerContent.includes('autocomplete="username"') && drawerContent.includes('name="username"'),
  '<form> incluye campo username para compatibilidad con gestores de contraseñas y accesibilidad'
);

assert(
  drawerContent.includes('id="input-pin-current"') &&
  drawerContent.includes('name="current_pin"') &&
  drawerContent.includes('autocomplete="current-password"'),
  '#input-pin-current cuenta con name="current_pin" y autocomplete="current-password"'
);

assert(
  drawerContent.includes('id="input-pin-new"') &&
  drawerContent.includes('name="new_pin"') &&
  drawerContent.includes('autocomplete="new-password"'),
  '#input-pin-new cuenta con name="new_pin" y autocomplete="new-password"'
);

assert(
  drawerContent.includes('id="input-pin-confirm"') &&
  drawerContent.includes('name="confirm_pin"') &&
  drawerContent.includes('autocomplete="new-password"'),
  '#input-pin-confirm cuenta con name="confirm_pin" y autocomplete="new-password"'
);

assert(
  drawerContent.includes('<button type="submit" class="btn-save-pin">'),
  'Botón de actualización configurado como type="submit" dentro del formulario'
);

// 2. Erradicación de Forced Reflow en CustomerVouchersView.js
console.log('\n--- 2. ERRADICACIÓN DE FORCED REFLOW EN CustomerVouchersView.js ---');
const vouchersPath = path.join(PROJECT_ROOT, 'js/views/customer/CustomerVouchersView.js');
const vouchersContent = fs.readFileSync(vouchersPath, 'utf8');

assert(
  !vouchersContent.includes('void el.offsetWidth;'),
  'triggerBadgePop no contiene lecturas síncronas bloqueantes (void el.offsetWidth eliminado)'
);

assert(
  vouchersContent.includes('requestAnimationFrame(() => el.classList.add("badge-pop"))'),
  'triggerBadgePop reinicia animaciones CSS mediante requestAnimationFrame desacoplado'
);

// 3. Optimización de Animación y Fuentes en CustomerCatalogView.js
console.log('\n--- 3. OPTIMIZACIÓN DE FRAME EN CustomerCatalogView.js ---');
const catalogPath = path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js');
const catalogContent = fs.readFileSync(catalogPath, 'utf8').replace(/\r\n/g, '\n');

assert(
  !catalogContent.includes('function renderFrame() {\n    ctx.clearRect(0, 0, canvas.width, canvas.height);\n    let alive = false;\n    ctx.font ='),
  'renderFrame en triggerCyberGlitchCelebration no recalcula ctx.font en cada frame'
);

assert(
  catalogContent.includes("ctx.font = \"900 14px 'JetBrains Mono', monospace\";\n  function renderFrame()"),
  'ctx.font se define una única vez antes del bucle de animación'
);

assert(
  catalogContent.includes('const cw = canvas.width;\n  const ch = canvas.height;'),
  'Dimensiones de canvas cacheadas en cw y ch para evitar accesos repetitivos a propiedades DOM'
);

// 4. Memoización de QR en CustomerAuthView.js
console.log('\n--- 4. MEMOIZACIÓN DE QR EN CustomerAuthView.js ---');
const authPath = path.join(PROJECT_ROOT, 'js/views/customer/CustomerAuthView.js');
const authContent = fs.readFileSync(authPath, 'utf8');

assert(
  authContent.includes('el.dataset.renderedQr === String(text)'),
  'renderUserQr verifica dataset.renderedQr para no destruir ni regenerar el canvas QR si el código es idéntico'
);

// 5. Renderizado Unificado por Frame en app.js
console.log('\n--- 5. BATCHED RENDER POR FRAME EN app.js ---');
const appPath = path.join(PROJECT_ROOT, 'js/app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

assert(
  appContent.includes('function batchedRender(model)'),
  'batchedRender implementado para consolidar múltiples actualizaciones de estado en un único ciclo de frame'
);

assert(
  appContent.includes('vm.subscribe(batchedRender);'),
  'ViewModel suscrito a batchedRender con requestAnimationFrame'
);

// 6. Cache Busters v2.9.33
console.log('\n--- 6. CACHE BUSTERS SINCRONIZADOS EN v2.9.33 ---');
const indexPath = path.join(PROJECT_ROOT, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const stylesPath = path.join(PROJECT_ROOT, 'styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert(indexContent.includes('styles.css?v=2.9.33'), 'index.html referencia styles.css?v=2.9.33');
assert(indexContent.includes('preorder.css?v=2.9.33'), 'index.html referencia preorder.css?v=2.9.33');
assert(indexContent.includes('app.js?v=2.9.33'), 'index.html referencia app.js?v=2.9.33');
assert(stylesContent.includes('core.css?v=2.9.33'), 'styles.css importa core.css?v=2.9.33');
assert(stylesContent.includes('client.css?v=2.9.33'), 'styles.css importa client.css?v=2.9.33');

console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks} | FAILED: ${totalChecks - passedChecks}`);
console.log('======================================================');

if (totalChecks === passedChecks) {
  console.log('>>> SUITE DE FORMS Y REFLOWS COMPLETADA (100% OK) <<<\n');
  process.exit(0);
} else {
  console.error('>>> ERRORES DETECTADOS EN LA SUITE <<<\n');
  process.exit(1);
}
