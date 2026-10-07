import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('====================================================');
console.log(' VERIFYING MODAL SCROLL LOCK & USER MODAL REDESIGN ');
console.log('====================================================');

const projectRoot = process.cwd();
const adminHtmlPath = path.join(projectRoot, 'admin.html');
const baseCssPath = path.join(projectRoot, 'css', 'modals', 'base.css');
const coreCssPath = path.join(projectRoot, 'css', 'core.css');
const adminCssPath = path.join(projectRoot, 'css', 'admin.css');
const responsiveCssPath = path.join(projectRoot, 'css', 'responsive.css');
const adminAppJsPath = path.join(projectRoot, 'js', 'admin-app.js');
const adminUsersViewJsPath = path.join(projectRoot, 'js', 'views', 'AdminUsersView.js');

const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
const baseCss = fs.readFileSync(baseCssPath, 'utf8');
const coreCss = fs.readFileSync(coreCssPath, 'utf8');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');
const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf8');
const adminAppJs = fs.readFileSync(adminAppJsPath, 'utf8');
const adminUsersViewJs = fs.readFileSync(adminUsersViewJsPath, 'utf8');

let passedChecks = 0;

function check(desc, condition) {
  assert.ok(condition, desc);
  console.log(`  ✓ ${desc}`);
  passedChecks++;
}

console.log('\n--- 1. Verificación de Bloqueo de Scroll (Zero Body Scroll Chaining) ---');
check('base.css tiene overscroll-behavior: contain en .modal-overlay',
  baseCss.includes('overscroll-behavior: contain !important;'));
check('base.css tiene overscroll-behavior-y: contain en .modal-overlay',
  baseCss.includes('overscroll-behavior-y: contain !important;'));
check('base.css tiene touch-action: pan-y en .modal-overlay',
  baseCss.includes('touch-action: pan-y !important;'));
check('base.css tiene overscroll-behavior: contain en .modal-content',
  baseCss.includes('.modal-content') && baseCss.includes('overscroll-behavior: contain !important;'));

check('core.css bloquea scroll con html.modal-open y body.modal-open',
  coreCss.includes('html.modal-open,\nbody.modal-open') || coreCss.includes('html.modal-open,') && coreCss.includes('body.modal-open'));
check('core.css tiene overflow: hidden !important en modal-open',
  coreCss.includes('overflow: hidden !important;'));
check('core.css tiene height: 100% !important en modal-open',
  coreCss.includes('height: 100% !important;'));
check('core.css tiene overscroll-behavior: contain !important en modal-open',
  coreCss.includes('overscroll-behavior: contain !important;'));

console.log('\n--- 2. Verificación de Sincronización JS de Scroll Lock ---');
check('admin-app.js define y exporta syncModalScrollLock',
  adminAppJs.includes('export function syncModalScrollLock()'));
check('admin-app.js expone window.syncModalScrollLock',
  adminAppJs.includes('window.syncModalScrollLock = syncModalScrollLock;'));
check('admin-app.js ejecuta syncModalScrollLock dentro de closeModal',
  adminAppJs.replace(/\r\n/g, '\n').includes('export function closeModal(id) {\n  const modal = document.getElementById(id);\n  if (modal) modal.style.display = "none";\n  syncModalScrollLock();'));
check('admin-app.js tiene MutationObserver para .modal-overlay',
  adminAppJs.includes('modalScrollObserver') && adminAppJs.includes('.modal-overlay'));
check('admin-app.js sincroniza scroll al presionar Escape',
  adminAppJs.includes('if (e.key === "Escape")') && adminAppJs.includes('syncModalScrollLock();'));
check('AdminUsersView.js sincroniza scroll al abrir modal de nuevo socio',
  adminUsersViewJs.includes('syncModalScrollLock'));

console.log('\n--- 3. Verificación de Rediseño de Modal Nuevo Socio (#modal-new-user) ---');
check('admin.html contiene modal-new-user con clase modal-new-user-card',
  adminHtml.includes('id="modal-new-user"') && adminHtml.includes('modal-new-user-card'));
check('admin.html preserva input #new-user-name',
  adminHtml.includes('id="new-user-name"'));
check('admin.html preserva input #new-user-phone',
  adminHtml.includes('id="new-user-phone"'));
check('admin.html preserva input #new-user-pin',
  adminHtml.includes('id="new-user-pin"'));
check('admin.html preserva input #new-user-points',
  adminHtml.includes('id="new-user-points"'));
check('admin.html organiza teléfono y pin en new-user-phone-pin-row de 2 columnas',
  adminHtml.includes('class="new-user-phone-pin-row"'));
check('admin.html preserva botones de visibilidad y dado aleatorio de PIN',
  adminHtml.includes('toggleNewUserPinVisibility()') && adminHtml.includes('generateNewUserRandomPin()'));
check('admin.html preserva chips de puntos rápidos (0, 50, 100, 250, 500)',
  adminHtml.includes('setNewUserQuickPoints(0)') &&
  adminHtml.includes('setNewUserQuickPoints(50)') &&
  adminHtml.includes('setNewUserQuickPoints(100)') &&
  adminHtml.includes('setNewUserQuickPoints(250)') &&
  adminHtml.includes('setNewUserQuickPoints(500)'));
check('admin.html preserva elementos de preview reactivo CyberPass',
  adminHtml.includes('id="preview-new-user-name"') &&
  adminHtml.includes('id="preview-new-user-phone"') &&
  adminHtml.includes('id="preview-new-user-pin"') &&
  adminHtml.includes('id="preview-new-user-uid"') &&
  adminHtml.includes('id="preview-new-user-points"'));
check('admin.html no tiene autofocus agresivo en input nombre',
  !adminHtml.includes('id="new-user-name" class="form-input" placeholder="Ej: Kenji Sato o Carlos Mendoza" autofocus'));

console.log('\n--- 4. Verificación de Estilos CSS Copland OS y Mobile Responsiveness ---');
check('admin.css define foco índigo (#4f46e5) sin borde rojo para #modal-new-user',
  adminCss.includes('#modal-new-user .form-input:focus') && adminCss.includes('#4f46e5'));
check('admin.css define .new-user-prefix y .new-user-pin-control',
  adminCss.includes('.new-user-prefix') && adminCss.includes('.new-user-pin-control'));
check('responsive.css define reglas móviles para .modal-new-user-card',
  responsiveCss.includes('.modal-new-user-card'));
check('responsive.css define reglas móviles para .new-user-phone-pin-row',
  responsiveCss.includes('.new-user-phone-pin-row'));
check('responsive.css define acciones móviles de dos columnas para .new-user-modal-actions',
  responsiveCss.includes('.new-user-modal-actions'));

console.log('\n--- 5. Verificación de Ocultación de Dock Móvil y Blindaje Anti-Deslizamiento ---');
check('base.css tiene z-index: 10000 !important en .modal-overlay',
  baseCss.includes('z-index: 10000 !important;'));
check('responsive.css asigna z-index 950 al dock para no sobrepasar a los modales',
  responsiveCss.includes('z-index: 950 !important;'));
check('responsive.css oculta .admin-bottom-dock con display: none en body.modal-open',
  responsiveCss.includes('body.modal-open .admin-bottom-dock') && responsiveCss.includes('display: none !important;'));
check('core.css oculta .admin-bottom-dock con display: none en body.modal-open',
  coreCss.includes('body.modal-open .admin-bottom-dock') && coreCss.includes('display: none !important;'));
check('admin-app.js oculta dinámicamente admin-bottom-dock en syncModalScrollLock',
  adminAppJs.includes('bottomDock.style.display = "none"'));
check('admin-app.js congela el body con position: fixed al abrir modales',
  adminAppJs.includes('document.body.style.position = "fixed"'));
check('admin-app.js tiene listener de wheel con passive: false para blindar contra scroll residual',
  adminAppJs.includes('document.addEventListener("wheel"') && adminAppJs.includes('{ passive: false }'));
check('AdminInvoiceModalView.js sincroniza syncModalScrollLock al abrir factura digital',
  fs.readFileSync(path.join(projectRoot, 'js', 'views', 'AdminInvoiceModalView.js'), 'utf8').includes('syncModalScrollLock'));
check('AdminSalePointsCalculatorView.js sincroniza syncModalScrollLock al abrir calculadora de puntos',
  fs.readFileSync(path.join(projectRoot, 'js', 'views', 'AdminSalePointsCalculatorView.js'), 'utf8').includes('syncModalScrollLock'));

console.log('====================================================');
console.log(` RESULT: ALL ${passedChecks}/${passedChecks} CHECKS PASSED (0 failures) `);
console.log('====================================================');
