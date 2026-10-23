/**
 * tests/verify_visual_responsive_invariants.mjs
 * SUITE DE VERIFICACIÓN DE INVARIANTES VISUALES, RESPONSIVE Y ERGONOMÍA
 * Evalúa reglas de diseño, prevención de desbordes, touch-targets y auto-expansión.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   SUITE: INVARIANTES VISUALES, RESPONSIVE Y ERGONOMÍA      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function check(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    failedChecks++;
    failures.push(message);
    console.error(`  ✕ FALLO: ${message}`);
  }
}

// 1. Lectura de hojas de estilo y vistas
const clientCss = fs.readFileSync(path.join(ROOT_DIR, 'css/client.css'), 'utf8');
const responsiveCss = fs.readFileSync(path.join(ROOT_DIR, 'css/responsive.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(ROOT_DIR, 'css/admin.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');
const catalogViewJs = fs.readFileSync(path.join(ROOT_DIR, 'js/views/customer/CustomerCatalogView.js'), 'utf8');

// --- SECCIÓN 1: ERGONOMÍA DE TEXTAREAS Y AUTO-EXPANSIÓN ---
console.log('--- 1. ERGONOMÍA DE TEXTAREAS EN PANEL ADMIN ---');
check(adminHtml.includes('id="prod-desc"') && adminHtml.includes('autoExpandAdminTextarea(this)'),
  'Textarea #prod-desc tiene listener reactivo autoExpandAdminTextarea');
check(adminHtml.includes('handleDescKeydown(event, this)'),
  'Textarea #prod-desc cuenta con controlador de viñetas automáticas (Enter)');
check(adminHtml.includes('id="combo-item-desc"') && adminHtml.includes('autoExpandAdminTextarea'),
  'Textarea #combo-item-desc sincroniza auto-expansión reactiva');
check(!responsiveCss.includes('#modal-new-product textarea#prod-desc {\r\n    min-height: 65px !important;\r\n    height: 75px !important;') &&
      !responsiveCss.includes('height: 75px !important;'),
  'responsive.css no bloquea con height fijo (!important) el textarea #prod-desc en móviles');
check(responsiveCss.includes('resize: vertical !important;') && responsiveCss.includes('overflow-y: auto !important;'),
  'responsive.css garantiza resize vertical y scroll autónomo en móvil');

// --- SECCIÓN 2: TOUCH TARGETS Y ACCESIBILIDAD MÓVIL ---
console.log('\n--- 2. TOUCH TARGETS Y ACCESIBILIDAD MÓVIL (>= 38px/40px) ---');
check(responsiveCss.includes('#modal-new-product .modal-actions-responsive button') &&
      responsiveCss.includes('min-height: 40px !important;'),
  'Botones de acción del modal de producto mantienen min-height >= 40px en móvil');
check(responsiveCss.includes('.prod-img-upload-row button') &&
      responsiveCss.includes('height: 32px !important;'),
  'Botones auxiliares de subida de fotos declaran altura uniforme en móvil');
check(clientCss.includes('.btn-combo-acquire') || catalogViewJs.includes('btn-combo-acquire'),
  'Botón principal de adquisición de combos implementa clase accesible');

// --- SECCIÓN 3: PREVENCIÓN DE DESBORDES Y MONEDAS DUALES ---
console.log('\n--- 3. ANTI-DESBORDE Y FORMATEO DE MONEDA DUAL ---');
check(clientCss.includes('font-variant-numeric: tabular-nums;') || catalogViewJs.includes('tabular-nums'),
  'Precios duales aplican tabular-nums para evitar temblor de dígitos');
check(clientCss.includes('.combo-item-price-tag') || catalogViewJs.includes('combo-item-price-tag'),
  'Fichas técnicas de ítems en combo implementan contenedor de precio diferenciado');
check(catalogViewJs.includes('⚡ En combo:') && catalogViewJs.includes('🏷️ Por separado:'),
  'Desglose en modal de cliente exhibe ambos precios sin ambigüedad');

// --- SECCIÓN 4: ESTUDIO FOTOGRÁFICO Y CONTENEDOR 50/50 ---
console.log('\n--- 4. ESTÁNDAR FOTOGRÁFICO DE COMBOS (ESTUDIO BLANCO) ---');
check(clientCss.includes('.combo-split-container'),
  '.combo-split-container declarado en css/client.css');
check(clientCss.includes('object-fit: contain;') || clientCss.includes('object-fit: contain !important;'),
  'Imágenes de combo aplican object-fit: contain para evitar recortes accidentales');
check(clientCss.includes('background: #ffffff;') || clientCss.includes('background-color: #ffffff;'),
  'Fondo de contenedor de fotos garantiza lienzo blanco de estudio (#ffffff)');

console.log('\n======================================================');
console.log(`TOTAL INVARIANTES: ${totalChecks}`);
console.log(`PASADAS: ${passedChecks} | FALLIDAS: ${failedChecks}`);
console.log('======================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('>>> TODAS LAS INVARIANTES VISUALES VALIDADAS (100% OK) <<<\n');
  process.exit(0);
}
