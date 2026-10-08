/**
 * Test Suite: Paridad de Perfil en Desktop / Laptops y Corrección de Moneda W
 * Tests:
 * 1. renderWiredCoinSvg generates SVG with width=14 and height=14, and CSS enforces 14px !important
 * 2. responsive.css does NOT hide drawer or hamburger button on desktop
 * 3. client.css provides universal off-canvas drawer and desktop hamburger styles
 * 4. index.html nav-user-pill opens profile drawer and [Salir] stops propagation
 * 5. CustomerProfileDrawer opens, renders full profile modules, responds to Escape, and closes cleanly
 * 6. Window exports both openMobileProfileDrawer and openClientProfileDrawer
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const ctx = new TestContext();

async function runTests() {
  const { win, doc } = await setupTestEnvironment('index.html');

  // Load app & view modules
  const catalogViewUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`;
  const catalogViewModule = await import(catalogViewUrl);
  const { renderWiredCoinSvg } = catalogViewModule;

  const drawerModuleUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerProfileDrawer.js')).href + `?t=${Date.now()}`;
  const drawerModule = await import(drawerModuleUrl);
  const {
    initCustomerProfileDrawer,
    openMobileProfileDrawer,
    closeMobileProfileDrawer,
    openClientProfileDrawer,
    closeClientProfileDrawer,
    renderProfileDrawer
  } = drawerModule;

  const appModuleUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
  await import(appModuleUrl);
  win.document.dispatchEvent({ type: 'DOMContentLoaded' });

  // TEST 1: Bug de la Moneda W - Dimensiones 14px x 14px
  await ctx.test('1. renderWiredCoinSvg defines width=14, height=14 and CSS enforces 14px !important', async () => {
    const svgHtml = renderWiredCoinSvg();
    expect(svgHtml.includes('width="14"'), 'SVG must declare native width="14"');
    expect(svgHtml.includes('height="14"'), 'SVG must declare native height="14"');
    expect(svgHtml.includes('class="reward-temu-coin-icon"'), 'SVG must have class reward-temu-coin-icon');

    const clientCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/client.css'), 'utf-8');
    expect(clientCss.includes('.reward-temu-coin-icon'), 'client.css must define .reward-temu-coin-icon');
    expect(clientCss.includes('width: 14px !important;'), 'client.css must set width: 14px !important');
    expect(clientCss.includes('height: 14px !important;'), 'client.css must set height: 14px !important');
  });

  // TEST 2: responsive.css no bloquea el drawer ni el botón de menú en desktop
  await ctx.test('2. responsive.css allows drawer and menu button on desktop (>640px)', async () => {
    const responsiveCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/responsive.css'), 'utf-8');
    // Ensure .drawer-mobile-profile, .drawer-profile-overlay, and .btn-mobile-hamburger are NOT in the display: none !important block
    const topBlock = responsiveCss.slice(0, 500);
    expect(!topBlock.includes('.drawer-mobile-profile,'), 'drawer-mobile-profile must NOT be hidden by default on desktop');
    expect(!topBlock.includes('.drawer-profile-overlay,'), 'drawer-profile-overlay must NOT be hidden by default on desktop');
    expect(!topBlock.includes('.btn-mobile-hamburger,'), 'btn-mobile-hamburger must NOT be hidden by default on desktop');
  });

  // TEST 3: client.css define el drawer off-canvas universalmente
  await ctx.test('3. client.css defines universal off-canvas drawer and desktop hamburger styles', async () => {
    const clientCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/client.css'), 'utf-8');
    expect(clientCss.includes('.drawer-mobile-profile'), 'client.css must declare .drawer-mobile-profile');
    expect(clientCss.includes('width: 400px;'), 'client.css must declare ergonomic desktop width (400px)');
    expect(clientCss.includes('.drawer-profile-overlay'), 'client.css must declare .drawer-profile-overlay');
    expect(clientCss.includes('backdrop-filter: blur(5px);'), 'overlay must declare blur backdrop');
    expect(clientCss.includes('.btn-mobile-hamburger'), 'client.css must declare .btn-mobile-hamburger');
  });

  // TEST 4: index.html nav-user-pill abre el drawer y [Salir] detiene la propagación
  await ctx.test('4. index.html nav-user-pill opens drawer on click and separates [Salir]', async () => {
    const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf-8');
    expect(indexHtml.includes('id="nav-user-pill"'), 'index.html must contain #nav-user-pill');
    expect(indexHtml.includes('onclick="openMobileProfileDrawer()"'), '#nav-user-pill must call openMobileProfileDrawer()');
    expect(indexHtml.includes('event.stopPropagation(); logoutClient();'), '[Salir] must call stopPropagation before logout');
  });

  // TEST 5: Ciclo de apertura, módulos interactivos y cierre del Drawer
  await ctx.test('5. CustomerProfileDrawer opens, renders full profile, and handles Escape key', async () => {
    const mockUser = {
      uid: 'user-p7',
      displayName: 'Valeria Ríos (Demo)',
      tier: 'ELITE',
      memberCode: 'MC-DEMO-02',
      wiredPoints: 1200,
      currency: 'USD',
      avatarUrl: 'https://img.test/avatar.jpg',
      bannerUrl: 'https://img.test/banner.jpg',
      notifications: [
        { id: 'n1', title: 'Descuentos Disponibles', desc: 'Hasta 57% OFF', read: false }
      ]
    };

    const mockVm = {
      currentUser: mockUser,
      preferredCurrency: 'USD',
      saveProfileSettings: async () => {},
      updateUserCurrency: async (curr) => { mockVm.preferredCurrency = curr; }
    };

    initCustomerProfileDrawer({
      vm: mockVm,
      showToast: () => {},
      openAuthModal: () => {},
      setAppCurrency: () => {},
      openClientCameraScanner: () => {},
      openClaimModal: () => {}
    });

    const drawer = doc.getElementById('drawer-mobile-profile');
    const overlay = doc.getElementById('drawer-profile-overlay');
    expect(Boolean(drawer), '#drawer-mobile-profile must exist in DOM');
    expect(Boolean(overlay), '#drawer-profile-overlay must exist in DOM');

    // Open drawer
    openMobileProfileDrawer();
    expect(drawer.classList.contains('open'), 'drawer must have class open');
    expect(overlay.classList.contains('open'), 'overlay must have class open');

    // Check rendered body content
    const drawerBody = doc.getElementById('drawer-profile-body');
    expect(Boolean(drawerBody), '#drawer-profile-body must exist');
    expect(drawerBody.innerHTML.includes('Valeria Ríos (Demo)'), 'Drawer must display user name');
    expect(drawerBody.innerHTML.includes('Cambiar Fondo'), 'Drawer must contain Cambiar Fondo button');
    expect(drawerBody.innerHTML.includes('MONEDA PREFERIDA'), 'Drawer must contain currency section');
    expect(drawerBody.innerHTML.includes('NOTIFICACIONES'), 'Drawer must contain notifications section');
    expect(drawerBody.innerHTML.includes('SEGURIDAD Y PIN') || drawerBody.innerHTML.includes('Cambiar PIN'), 'Drawer must contain PIN security section');

    // Test Escape key closes drawer
    doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
    expect(!drawer.classList.contains('open'), 'Escape key must close drawer');
    expect(!overlay.classList.contains('open'), 'Escape key must remove open class from overlay');

    // Test alias openClientProfileDrawer
    openClientProfileDrawer();
    expect(drawer.classList.contains('open'), 'openClientProfileDrawer must open drawer');
    closeClientProfileDrawer();
    expect(!drawer.classList.contains('open'), 'closeClientProfileDrawer must close drawer');
  });

  // TEST 6: Window exports
  await ctx.test('6. Window exports openMobileProfileDrawer and openClientProfileDrawer', async () => {
    expect(typeof win.openMobileProfileDrawer === 'function', 'window.openMobileProfileDrawer must be function');
    expect(typeof win.openClientProfileDrawer === 'function', 'window.openClientProfileDrawer must be function');
    expect(typeof win.closeMobileProfileDrawer === 'function', 'window.closeMobileProfileDrawer must be function');
    expect(typeof win.closeClientProfileDrawer === 'function', 'window.closeClientProfileDrawer must be function');
  });

  console.log(`\nDesktop Profile Drawer & Coin Tests: ${ctx.passed}/${ctx.tests.length} passed\n`);
  if (ctx.failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
