import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export async function runTier2Tests() {
  const ctx = new TestContext('Tier 2: Boundary & Corner Cases');

  console.log('\n========================================');
  console.log(' RUNNING TIER 2: BOUNDARY & CORNER CASES');
  console.log('========================================');

  // Test 1: Invalid PIN "000000", "1234", empty string, spaces
  await ctx.test('T2.1: Invalid PIN submissions ("000000", "9999", empty) keep terminal locked with error feedback', async () => {
    const { doc, win } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const pinInput = doc.getElementById('input-admin-pin');
    const lockScreen = doc.getElementById('admin-auth-lock');
    const mainPanel = doc.getElementById('admin-main-panel');
    const feedback = doc.getElementById('lock-feedback');

    const invalidPins = ['000000', '1234', '', '   ', 'XYZ999', '11080', '1108059'];

    for (const badPin of invalidPins) {
      pinInput.value = badPin;
      await win.submitAdminPin();

      expect(win.sessionStorage.getItem('melty_admin_auth')).toBeFalsy(`PIN "${badPin}" should not set auth token`);
      expect(lockScreen.style.display !== 'none').toBeTruthy(`Lock screen should remain visible for PIN "${badPin}"`);
      expect(mainPanel.style.display).toBe('none', `Main panel should remain hidden for PIN "${badPin}"`);
      expect(feedback.textContent).toContain('PIN', `Feedback banner should display error for PIN "${badPin}"`);
    }
  });

  // Test 2: Extreme / Unsupported Currency Toggles
  await ctx.test('T2.2: Extreme and unsupported currency toggles ("EUR", "BTC", empty) are safely ignored', async () => {
    const { win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    const appModule = await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Set initial valid currency
    await appModule.setAppCurrency('USD');
    expect(win.localStorage.getItem('melty_preferred_currency') || 'USD').toBe('USD');

    // Attempt invalid currencies
    const invalidCurrencies = ['EUR', 'BTC', 'JPY', '', null, undefined, 'usd', 'nio', 123];
    for (const badCurr of invalidCurrencies) {
      try {
        await appModule.setAppCurrency(badCurr);
      } catch (err) {
        throw new Error(`setAppCurrency threw unexpected error on ${badCurr}: ${err.message}`);
      }
      // Must remain USD
      const stored = win.localStorage.getItem('melty_preferred_currency') || 'USD';
      expect(stored).toBe('USD', `Invalid currency ${badCurr} should not alter preferred currency`);
    }
  });

  // Test 3: Invalid and Edge-Case Voucher Codes
  await ctx.test('T2.3: Non-existent or invalid voucher codes are handled gracefully without runtime crash', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const invalidCodes = ['', 'VCH-NON-EXISTENT', 'null', 'undefined', '123456789'];
    for (const code of invalidCodes) {
      try {
        win.showVoucherModal(code);
      } catch (err) {
        throw new Error(`showVoucherModal crashed on invalid code "${code}": ${err.message}`);
      }
    }
  });

  // Test 4: Empty / Incomplete Input Form Submissions
  await ctx.test('T2.4: Empty form submissions trigger validation without unhandled exceptions', async () => {
    const { doc, win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // 1. Submit empty customer login
    doc.getElementById('login-phone').value = '';
    doc.getElementById('login-pin').value = '';
    try {
      await win.submitClientLogin();
      const feedback = doc.getElementById('auth-feedback');
      expect(feedback.textContent.length).toBeGreaterThan(0, 'Empty login should trigger validation feedback');
    } catch (e) {
      throw new Error(`submitClientLogin crashed on empty input: ${e.message}`);
    }

    // 2. Submit empty customer register
    doc.getElementById('reg-name').value = '';
    doc.getElementById('reg-phone').value = '';
    doc.getElementById('reg-pin').value = '';
    try {
      await win.submitClientRegister();
      const feedback = doc.getElementById('auth-feedback');
      expect(feedback.textContent.length).toBeGreaterThan(0, 'Empty registration should trigger validation feedback');
    } catch (e) {
      throw new Error(`submitClientRegister crashed on empty input: ${e.message}`);
    }

    // 3. Submit empty manual claim
    doc.getElementById('manual-input-token').value = '';
    doc.getElementById('manual-input-pin').value = '';
    try {
      await win.submitManualClaim();
      // Should not throw and toast container should receive notice
      const toastContainer = doc.getElementById('toast-container');
      expect(toastContainer).toBeTruthy('Toast container should exist');
    } catch (e) {
      throw new Error(`submitManualClaim crashed on empty token: ${e.message}`);
    }
  });

  // Test 5: High-Frequency Rapid Currency Switching
  await ctx.test('T2.5: Rapid toggling between USD and NIO preserves formatting integrity', async () => {
    const { win } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    const appModule = await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    for (let i = 0; i < 50; i++) {
      const target = i % 2 === 0 ? 'NIO' : 'USD';
      await appModule.setAppCurrency(target);
      const formatted = appModule.formatPrice(20);
      if (target === 'NIO') {
        expect(formatted).toContain('740.00', '20 USD * 37 = 740 NIO');
      } else {
        expect(formatted).toContain('20.00', '20 USD = $20.00 USD');
      }
    }
  });

  // Test 6: Purge Isolation between Sandbox and Production
  await ctx.test('T2.6: Sandbox purge operations strictly target dev_* collections and preserve production data', async () => {
    const { win } = setupTestEnvironment('admin.html');
    win.location.hostname = 'localhost';

    // Probar que una clave de producción existente jamás es alterada por purgas de sandbox
    win.localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify({ productionSafe: true, tokens: { 'PROD-1': {} } }));

    const fsServiceUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/services/FirestoreService.js')).href + `?t=${Date.now()}`;
    const { FirestoreService } = await import(fsServiceUrl);

    // 1. Purga de facturas en sandbox
    const purgeTokensRes = await FirestoreService.purgeAllTokens();
    expect(purgeTokensRes.success).toBe(true, 'purgeAllTokens debe ser exitoso');
    expect(purgeTokensRes.environment).toBe('PRUEBAS (SANDBOX)', 'Debe ejecutarse en entorno sandbox');
    for (const col of purgeTokensRes.collections) {
      expect(col.startsWith('dev_')).toBe(true, `Colección ${col} debe iniciar con prefijo dev_`);
    }

    // 2. Purga total de base de datos en sandbox
    const purgeDbRes = await FirestoreService.purgeEntireDatabase();
    expect(purgeDbRes.success).toBe(true, 'purgeEntireDatabase debe ser exitoso');
    expect(purgeDbRes.environment).toBe('PRUEBAS (SANDBOX)', 'Debe ejecutarse en entorno sandbox');
    for (const col of purgeDbRes.collections) {
      expect(col.startsWith('dev_')).toBe(true, `Colección ${col} debe iniciar con prefijo dev_`);
    }

    // 3. Verificar que el almacenamiento de producción permaneció 100% intacto
    const prodStorageRaw = win.localStorage.getItem('wired_club_mvvm_db_v2');
    expect(prodStorageRaw).toBeTruthy('Clave de almacenamiento de producción debe existir tras purgas de sandbox');
    const prodStorage = JSON.parse(prodStorageRaw);
    expect(prodStorage.productionSafe).toBe(true, 'Datos de producción deben permanecer intactos');
  });

  return ctx.summary();
}
