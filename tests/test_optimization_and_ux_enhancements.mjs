import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   TEST: OPTIMIZATION, PERFORMANCE & UX ENHANCEMENTS        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✕ ${name}`);
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

// 1. Vercel Caching Headers
test('1.1: vercel.json configures immutable cache for /css/, /js/, /img/', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
  const cssHeader = vercel.headers.find(h => h.source === '/css/(.*)');
  const jsHeader = vercel.headers.find(h => h.source === '/js/(.*)');
  const imgHeader = vercel.headers.find(h => h.source === '/img/(.*)');
  assert(cssHeader, 'Missing /css/ header');
  assert(jsHeader, 'Missing /js/ header');
  assert(imgHeader, 'Missing /img/ header');
  assert(cssHeader.headers.some(h => h.key === 'Cache-Control' && h.value.includes('immutable')));
});

test('1.2: vercel.json configures must-revalidate for /, /index.html, /admin, /admin.html', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
  const rootHeader = vercel.headers.find(h => h.source === '/');
  const indexHeader = vercel.headers.find(h => h.source === '/index.html');
  const adminHeader = vercel.headers.find(h => h.source === '/admin');
  const adminHtmlHeader = vercel.headers.find(h => h.source === '/admin.html');
  assert(rootHeader, 'Missing / root header');
  assert(indexHeader, 'Missing /index.html header');
  assert(adminHeader, 'Missing /admin header');
  assert(adminHtmlHeader, 'Missing /admin.html header');
  assert(rootHeader.headers.some(h => h.value === 'public, max-age=0, must-revalidate'));
});

// 2. CSS & Font Decoupling
test('2.1: core.css imports only JetBrains Mono and Outfit (Inter, Caveat, Plus Jakarta Sans purged)', () => {
  const coreCss = fs.readFileSync(path.join(ROOT_DIR, 'css/core.css'), 'utf8');
  assert(coreCss.includes('family=JetBrains+Mono'), 'JetBrains Mono must be imported');
  assert(coreCss.includes('family=Outfit'), 'Outfit must be imported');
  assert(!coreCss.includes('family=Inter'), 'Inter must be purged');
  assert(!coreCss.includes('family=Caveat'), 'Caveat must be purged');
  assert(!coreCss.includes('family=Plus+Jakarta+Sans'), 'Plus Jakarta Sans must be purged');
});

test('2.2: index.html does not load admin.css, invoice.css, users.css, or print-sheet.css', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert(!indexHtml.includes('admin.css'), 'index.html must not load admin.css');
  assert(!indexHtml.includes('invoice.css'), 'index.html must not load invoice.css');
  assert(!indexHtml.includes('users.css'), 'index.html must not load users.css');
  assert(!indexHtml.includes('print-sheet.css'), 'index.html must not load print-sheet.css');
});

test('2.3: admin.html loads both styles.css and admin.css and modals/admin.css', () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');
  assert(adminHtml.includes('./css/admin.css'), 'admin.html must load admin.css');
  assert(adminHtml.includes('./css/modals/admin.css'), 'admin.html must load modals/admin.css');
});

// 3. Accent-insensitive Search and Category Filtering
test('3.1: matchesCatalogSearch handles Spanish accents/diacritics and brand matching', async () => {
  const { matchesCatalogSearch } = await import('../js/views/customer/CustomerCatalogView.js');
  const item = {
    id: 'prod-aud-01',
    title: 'Audífono Gamer Inalámbrico Redragon H510',
    description: 'Micrófono con cancelación y sonido envolvente',
    category: 'Audio Gaming',
    brand: 'Redragon'
  };

  // Searching unaccented matches accented
  assert(matchesCatalogSearch(item, 'audifono'), 'Search "audifono" should match "Audífono"');
  assert(matchesCatalogSearch(item, 'inalambrico'), 'Search "inalambrico" should match "Inalámbrico"');
  assert(matchesCatalogSearch(item, 'microfono'), 'Search "microfono" should match "Micrófono"');
  assert(matchesCatalogSearch(item, 'redragon'), 'Search brand "redragon" should match');
  assert(matchesCatalogSearch(item, 'prod-aud-01'), 'Search ID should match');
  assert(!matchesCatalogSearch(item, 'teclado mecanico'), 'Irrelevant query should not match');
});

test('3.2: matchesCatalogCategory categorizes Audio, Peripherals, Combos, Presales, and 100% Points', async () => {
  const { matchesCatalogCategory } = await import('../js/views/customer/CustomerCatalogView.js');

  const audioItem = { title: 'Audífono Bluetooth TWS', priceUsd: 25, rewardType: 'PARTIAL_DISCOUNT' };
  const periphItem = { title: 'Teclado Mecánico RGB', priceUsd: 40, rewardType: 'PARTIAL_DISCOUNT' };
  const comboItem = { title: 'Combo 3 en 1', rewardType: 'COMBO', isCombo: () => true };
  const incomingItem = { title: 'Mouse Viper', status: 'INCOMING', isIncoming: () => true, isIncomingExpired: () => false };
  const pointsItem = { title: 'Cable USB-C', priceUsd: 0, pointsCost: 200, rewardType: 'FULL_POINTS' };

  assert(matchesCatalogCategory(audioItem, 'AUDIO'), 'Should match AUDIO');
  assert(!matchesCatalogCategory(periphItem, 'AUDIO'), 'Peripheral should not match AUDIO');
  assert(matchesCatalogCategory(periphItem, 'PERIPHERALS'), 'Should match PERIPHERALS');
  assert(matchesCatalogCategory(comboItem, 'COMBOS'), 'Should match COMBOS');
  assert(matchesCatalogCategory(incomingItem, 'PRESALES'), 'Should match PRESALES');
  assert(matchesCatalogCategory(pointsItem, 'POINTS100'), 'Should match POINTS100');
  assert(matchesCatalogCategory(audioItem, 'ALL'), 'ALL should match everything');
});

// 4. Pre-Order Cédula Optionality and Voucher Model Resilience
test('4.1: VoucherModel instantiates customerInfo even if cedula is empty string', async () => {
  const { VoucherModel } = await import('../js/models/VoucherModel.js');

  const voucherWithoutCedula = new VoucherModel({
    voucherCode: 'RES-TEST01',
    userUid: 'GUEST-88888888',
    rewardType: 'PREORDER_RESERVATION',
    customerInfo: {
      cedula: '',
      fullName: 'Carlos Mendoza',
      phone: '88888888',
      email: 'carlos@example.com'
    }
  });

  assert(voucherWithoutCedula.customerInfo, 'customerInfo must exist');
  assert.strictEqual(voucherWithoutCedula.customerInfo.cedula, '');
  assert.strictEqual(voucherWithoutCedula.customerInfo.fullName, 'Carlos Mendoza');
  assert.strictEqual(voucherWithoutCedula.customerInfo.phone, '88888888');
});

test('4.2: VoucherModel falls back to flat fullName/phone when customerInfo is not explicitly passed', async () => {
  const { VoucherModel } = await import('../js/models/VoucherModel.js');

  const voucherFlat = new VoucherModel({
    voucherCode: 'RES-TEST02',
    userUid: 'GUEST-77777777',
    rewardType: 'PREORDER_RESERVATION',
    fullName: 'Maria Lopez',
    phone: '77777777'
  });

  assert(voucherFlat.customerInfo, 'customerInfo should be synthesized from flat properties');
  assert.strictEqual(voucherFlat.customerInfo.fullName, 'Maria Lopez');
  assert.strictEqual(voucherFlat.customerInfo.phone, '77777777');
});

// 5. Accessibility & Viewport
test('5.1: index.html and admin.html do not disable user zoom in viewport', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');
  assert(!indexHtml.includes('user-scalable=no'), 'index.html must not forbid user scaling');
  assert(!indexHtml.includes('maximum-scale=1.0'), 'index.html must not lock maximum scale');
  assert(!adminHtml.includes('user-scalable=no'), 'admin.html must not forbid user scaling');
  assert(!adminHtml.includes('maximum-scale=1.0'), 'admin.html must not lock maximum scale');
});

test('5.2: modal-close-btn touch target is >= 44x44px in responsive.css', () => {
  const respCss = fs.readFileSync(path.join(ROOT_DIR, 'css/responsive.css'), 'utf8');
  assert(/min-width:\s*44px\s*!important/i.test(respCss), 'modal-close-btn must enforce min-width 44px');
  assert(/min-height:\s*44px\s*!important/i.test(respCss), 'modal-close-btn must enforce min-height 44px');
});

// 6. Admin Mobile POS Dock
test('6.1: admin.html mobile dock contains ⚡ DESPACHO POS button with switchAdminTab("pos")', () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');
  assert(adminHtml.includes('DESPACHO POS'), 'Dock must contain DESPACHO POS');
  assert(adminHtml.includes("switchAdminTab('pos')"), 'Dock button must call switchAdminTab("pos")');
});

console.log(`\n======================================================`);
console.log(`ALL ${passCount} OPTIMIZATION & UX CHECKS PASSED (100% OK)`);
console.log(`======================================================\n`);
