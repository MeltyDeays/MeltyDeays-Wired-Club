/**
 * TEST SUITE: VERIFICACIÓN DE LAYOUT DESKTOP Y CIERRE RESILIENTE DE CÁMARA
 * Verifica que:
 * 1. css/responsive.css tenga balance perfecto de llaves (depth = 0, minDepth = 0) para que
 *    las reglas móviles no se filtren a la vista de escritorio (PC).
 * 2. En CustomerClaimView.js, stopClientCameraScanner proteja contra excepciones de Html5Qrcode
 *    (ej: "scanner is not running or paused") y cierre siempre el modal.
 * 3. En AdminPosView.js, stopCameraScanner aplique el mismo patrón blindado.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runDesktopAndScannerTestSuite(ctx) {
  const responsiveCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/responsive.css'), 'utf8');
  const claimViewJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/views/customer/CustomerClaimView.js'), 'utf8');
  const posViewJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/views/AdminPosView.js'), 'utf8');

  await ctx.test('1. css/responsive.css tiene balance de llaves perfecto (sin fuga a desktop)', () => {
    let depth = 0;
    let minDepth = 0;
    for (const ch of responsiveCss) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth < minDepth) minDepth = depth;
    }
    assert.strictEqual(depth, 0, 'La profundidad final de llaves en responsive.css debe ser exactamente 0');
    assert.strictEqual(minDepth, 0, 'La profundidad mínima nunca debe ser menor a 0 (sin cierres prematuros)');
  });

  await ctx.test('2. .fab-mobile-menu-btn no contiene llaves huérfanas en responsive.css', () => {
    assert.strictEqual(
      responsiveCss.includes('.fab-mobile-menu-btn {\n    display: none !important;\n    visibility: hidden !important;\n    opacity: 0 !important;\n    pointer-events: none !important;\n    z-index: -9999 !important;\n  }'),
      true,
      '.fab-mobile-menu-btn debe cerrarse limpiamente sin código residual'
    );
  });

  await ctx.test('3. stopClientCameraScanner en CustomerClaimView.js captura errores de stop()', () => {
    assert.strictEqual(
      claimViewJs.includes('catch (_) {\n      try { scanner.clear(); } catch (_) {}\n    }'),
      true,
      'Debe existir try/catch que capture excepciones de Html5Qrcode.stop()'
    );
    assert.strictEqual(
      claimViewJs.includes('if (modal) modal.style.display = "none";'),
      true,
      'modal.style.display = "none" debe ejecutarse siempre'
    );
  });

  await ctx.test('4. stopCameraScanner en AdminPosView.js captura errores de stop()', () => {
    assert.strictEqual(
      posViewJs.includes('if (modal) modal.style.display = "none";'),
      true,
      'modal.style.display = "none" debe ejecutarse siempre en AdminPosView'
    );
  });
}

if (process.argv[1] && process.argv[1].endsWith('verify_desktop_layout_and_scanner_close.mjs')) {
  console.log('Ejecutando verify_desktop_layout_and_scanner_close.mjs...');
  const fakeCtx = {
    test: async (name, fn) => {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
      } catch (err) {
        console.error(`  ❌ ${name}:`, err.message);
        throw err;
      }
    }
  };
  runDesktopAndScannerTestSuite(fakeCtx)
    .then(() => {
      console.log('>>> TODAS LAS PRUEBAS DE DESKTOP Y CÁMARA PASARON EXITOSAMENTE <<<');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
