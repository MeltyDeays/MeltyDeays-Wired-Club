import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Iniciando verificación de enlace gemelo y autopublicación HD de Facebook...');

const root = process.cwd();

// 1. Verificar AdminInvoiceBatchView.js
const invoiceBatchViewPath = path.join(root, 'js', 'views', 'AdminInvoiceBatchView.js');
const invoiceBatchViewCode = fs.readFileSync(invoiceBatchViewPath, 'utf8');
assert(
  invoiceBatchViewCode.includes('export function handlePublishProductToFacebook'),
  'AdminInvoiceBatchView.js debe exportar handlePublishProductToFacebook'
);
assert(
  invoiceBatchViewCode.includes('facebook.com/marketplace/create/item?haibane_id='),
  'handlePublishProductToFacebook debe abrir marketplace/create/item con haibane_id'
);
console.log('✅ 1. AdminInvoiceBatchView.js verificado correctamente.');

// 2. Verificar js/admin-app.js
const adminAppPath = path.join(root, 'js', 'admin-app.js');
const adminAppCode = fs.readFileSync(adminAppPath, 'utf8');
assert(
  adminAppCode.includes('handlePublishProductToFacebook'),
  'admin-app.js debe importar y exponer handlePublishProductToFacebook'
);
assert(
  adminAppCode.includes('fbTwinBadge'),
  'admin-app.js debe calcular e inyectar fbTwinBadge en renderCatalogAdminTable'
);
assert(
  adminAppCode.includes('Publicar en FB'),
  'admin-app.js debe incluir el botón de Publicar en FB para huérfanos'
);
console.log('✅ 2. admin-app.js verificado correctamente.');

// 3. Verificar extensions/marketplace-sync/manifest.json
const manifestPath = path.join(root, 'extensions', 'marketplace-sync', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.permissions.includes('tabs'), 'manifest.json debe incluir permiso "tabs"');
assert(
  manifest.host_permissions.some(h => h.includes('vercel.app')),
  'manifest.json debe incluir host_permission para vercel.app'
);
console.log('✅ 3. extensions/marketplace-sync/manifest.json verificado.');

// 4. Verificar extensions/marketplace-sync/firebase-api.js
const fbApiPath = path.join(root, 'extensions', 'marketplace-sync', 'firebase-api.js');
const fbApiCode = fs.readFileSync(fbApiPath, 'utf8');
assert(
  fbApiCode.includes('async function linkProductToFacebook'),
  'firebase-api.js debe contener linkProductToFacebook'
);
assert(
  fbApiCode.includes('async function getProductById'),
  'firebase-api.js debe contener getProductById'
);
assert(
  fbApiCode.includes('SYNCED_TWIN'),
  'linkProductToFacebook debe guardar estado SYNCED_TWIN'
);
console.log('✅ 4. extensions/marketplace-sync/firebase-api.js verificado.');

// 5. Verificar extensions/marketplace-sync/background.js
const bgPath = path.join(root, 'extensions', 'marketplace-sync', 'background.js');
const bgCode = fs.readFileSync(bgPath, 'utf8');
assert(
  bgCode.includes('LINK_PRODUCT_TO_FB'),
  'background.js debe manejar acción LINK_PRODUCT_TO_FB'
);
assert(
  bgCode.includes('GET_PRODUCT_BY_ID'),
  'background.js debe manejar acción GET_PRODUCT_BY_ID'
);
assert(
  bgCode.includes('OPEN_FB_CREATE_TAB'),
  'background.js debe manejar acción OPEN_FB_CREATE_TAB'
);
console.log('✅ 5. extensions/marketplace-sync/background.js verificado.');

// 6. Verificar extensions/marketplace-sync/content-script.js
const csPath = path.join(root, 'extensions', 'marketplace-sync', 'content-script.js');
const csCode = fs.readFileSync(csPath, 'utf8');
assert(
  csCode.includes('function linkExistingMarketplaceTwins'),
  'content-script.js debe implementar linkExistingMarketplaceTwins'
);
assert(
  csCode.includes('async function injectProductPhotosToForm'),
  'content-script.js debe implementar injectProductPhotosToForm'
);
assert(
  csCode.includes('DataTransfer'),
  'injectProductPhotosToForm debe usar DataTransfer para inyectar archivos HD'
);
assert(
  csCode.includes('setNativeInputValue'),
  'content-script.js debe implementar setNativeInputValue para inputs controlados por React'
);
assert(
  csCode.includes('haibane_id'),
  'content-script.js debe detectar el query param haibane_id'
);
console.log('✅ 6. extensions/marketplace-sync/content-script.js verificado.');

// 7. Verificar api/sync-facebook.js
const syncFbPath = path.join(root, 'api', 'sync-facebook.js');
const syncFbCode = fs.readFileSync(syncFbPath, 'utf8');
assert(
  syncFbCode.includes('needsIdLink'),
  'api/sync-facebook.js debe manejar condición needsIdLink para enlace sin variación de precio'
);
console.log('✅ 7. api/sync-facebook.js verificado.');

// 8. Verificar cache busters en admin.html e index.html
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(adminHtml.includes('v=2.9.39'), 'admin.html debe tener cache buster v=2.9.39');
assert(indexHtml.includes('v=2.9.39'), 'index.html debe tener cache buster v=2.9.39');
console.log('✅ 8. Cache-busters en admin.html e index.html v=2.9.39 verificados.');

console.log('\n🎉 TODAS LAS PRUEBAS DE VERIFICACIÓN PASARON EXITOSAMENTE (8/8).');
