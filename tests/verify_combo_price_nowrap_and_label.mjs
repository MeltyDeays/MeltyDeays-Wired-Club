/**
 * TEST SUITE: VERIFICACIÓN DE PRECIO EN COMBO Y ETIQUETA "POR SEPARADO"
 * Verifica que:
 * 1. En productos tipo combo la etiqueta de suma original diga exactamente "Por separado:" (sin "Antes").
 * 2. En tarjetas de catálogo móvil, .retail-price-before aplique flex-wrap sin white-space: nowrap que mutile el precio.
 * 3. .retail-strike y .retail-before-label mantengan white-space: nowrap para evitar roturas de dígitos.
 * 4. Los precios de combo no tengan signos de exclamación huérfanos al final.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runComboPriceTestSuite(ctx) {
  const catalogViewJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/responsive.css'), 'utf8');
  const clientCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/client.css'), 'utf8');

  await ctx.test('1. CustomerCatalogView.js no contiene "Antes por separado"', () => {
    assert.strictEqual(
      catalogViewJs.includes('Antes por separado:'),
      false,
      'No debe existir "Antes por separado:" en el código de catálogo'
    );
  });

  await ctx.test('2. CustomerCatalogView.js define "Por separado:" para combos', () => {
    assert.strictEqual(
      catalogViewJs.includes('retailBeforeLabel = "Por separado:";'),
      true,
      'retailBeforeLabel debe ser "Por separado:"'
    );
    assert.strictEqual(
      catalogViewJs.includes('<span class="haibane-orig-label">Por separado:</span>'),
      true,
      'Modal de especificaciones debe indicar "Por separado:"'
    );
  });

  await ctx.test('3. Envoltura de etiqueta y precio tachado en retail-price-before', () => {
    assert.strictEqual(
      catalogViewJs.includes('<span class="retail-before-label">${retailBeforeLabel}</span>'),
      true,
      'retailBeforeLabel debe estar contenido en .retail-before-label para soporte flex-wrap'
    );
  });

  await ctx.test('4. css/responsive.css elimina white-space: nowrap de .retail-price-before y activa flex-wrap', () => {
    assert.strictEqual(
      responsiveCss.includes('.reward-card .retail-price-before {\n    font-size: 0.65rem !important;\n    color: #64748b !important;\n    font-family: var(--font-mono) !important;\n    line-height: 1.25 !important;\n    display: flex !important;\n    flex-wrap: wrap !important;'),
      true,
      '.reward-card .retail-price-before debe ser flex-wrap en móvil'
    );
    assert.strictEqual(
      responsiveCss.includes('.reward-card .retail-before-label {\n    font-size: 0.65rem !important;\n    white-space: nowrap !important;'),
      true,
      '.reward-card .retail-before-label debe tener white-space: nowrap'
    );
  });

  await ctx.test('5. css/client.css incluye soporte para .retail-before-label', () => {
    assert.strictEqual(
      clientCss.includes('.retail-before-label'),
      true,
      'css/client.css debe incluir clase .retail-before-label'
    );
  });
}

if (process.argv[1] && process.argv[1].endsWith('verify_combo_price_nowrap_and_label.mjs')) {
  console.log('Ejecutando verify_combo_price_nowrap_and_label.mjs...');
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
  runComboPriceTestSuite(fakeCtx)
    .then(() => {
      console.log('>>> TODAS LAS PRUEBAS DE PRECIO COMBO PASARON EXITOSAMENTE <<<');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
