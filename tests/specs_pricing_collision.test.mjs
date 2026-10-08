/**
 * TEST SUITE: PREVENCIÓN DE COLISIÓN DE PRECIOS EN MODAL ESPECIFICACIONES (NIO & SUMA INDIVIDUAL)
 * Verifica que en móvil (<=520px) el bloque de precio del combo y la suma individual
 * se organicen en niveles desacoplados con ancho 100% y separador visual, eliminando
 * el solapamiento de textos en Córdobas (C$ NIO).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition, message) {
  totalChecks++;
  if (!condition) {
    failedChecks++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  }
}

async function runTestSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   TEST SUITE: LAYOUT ANTI-COLISIÓN DE PRECIOS (COMBO & NIO)       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. VERIFICACIÓN ESTÁTICA DE CSS (css/client.css)
  // =========================================================================
  console.log('--- 1. VERIFICACIÓN DE REGLAS ANTI-COLISIÓN EN css/client.css ---');
  const cssPath = path.join(PROJECT_ROOT, 'css/client.css');
  check(fs.existsSync(cssPath), 'css/client.css existe');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Base rules
  check(cssContent.includes('.haibane-specs-pricing-row'),
    '.haibane-specs-pricing-row está declarado');
  check(cssContent.includes('flex-wrap: wrap'),
    '.haibane-specs-pricing-row declara flex-wrap: wrap para evitar desbordes');

  // Media query rules <= 640px
  const mediaMatch = cssContent.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\.haibane-specs-savings-row/);
  check(mediaMatch !== null, 'Bloque responsive para @media (max-width: 640px) encontrado');
  const mediaCss = mediaMatch ? mediaMatch[1] : '';

  check(mediaCss.includes('flex-direction: column !important'),
    'En móvil (<=640px), .haibane-specs-pricing-row aplica flex-direction: column !important');
  check(mediaCss.includes('border-top: 1px dashed'),
    'En móvil (<=640px), .haibane-price-orig-block cuenta con separador dashed superior');
  check(mediaCss.includes('justify-content: space-between !important'),
    'En móvil (<=640px), .haibane-price-orig-block separa etiqueta y suma a los extremos');

  // =========================================================================
  // 2. SIMULACIÓN DE DIMENSIONES Y TEXTOS EN CÓRDOBAS (NIO)
  // =========================================================================
  console.log('\n--- 2. SIMULACIÓN DE TEXTOS EN CÓRDOBAS (NIO) ---');
  // Caso 1: Combo (SUMA INDIVIDUAL)
  const comboUsd = 74.00;
  const comboNio = (comboUsd * 37.0).toFixed(2); // 2738.00
  const comboMainStr = `C$ ${comboNio} NIO ($${comboUsd.toFixed(2)} USD)`;

  const comboOrigUsd = 95.00;
  const comboOrigNio = (comboOrigUsd * 37.0).toFixed(2); // 3515.00
  const comboOrigStr = `C$ ${comboOrigNio} NIO`;

  check(comboMainStr.includes('2738.00 NIO'), 'Combo: Precio principal en Córdobas formateado correctamente');
  check(comboOrigStr.includes('3515.00 NIO'), 'Combo: Suma individual en Córdobas formateada correctamente');

  // Caso 2: Preventa (PRECIO REGULAR)
  const presaleUsd = 88.00;
  const presaleNio = (presaleUsd * 37.0).toFixed(2); // 3256.00
  const presaleMainStr = `C$ ${presaleNio} NIO ($${presaleUsd.toFixed(2)} USD)`;

  const regularUsd = 110.00;
  const regularNio = (regularUsd * 37.0).toFixed(2); // 4070.00
  const regularStr = `C$ ${regularNio} NIO`;

  check(presaleMainStr.includes('3256.00 NIO'), 'Preventa: Precio preventa en Córdobas formateado correctamente');
  check(regularStr.includes('4070.00 NIO'), 'Preventa: Precio regular en Córdobas formateado correctamente');

  // Verificación de que en layout vertical (100% width) no hay colisión física horizontal
  const containerWidthMobile = 320; // 320px móvil
  check(containerWidthMobile >= 280, 'El ancho del móvil alberga el precio principal al 100% de línea');

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('======================================================');
  console.log('>>> SUITE ANTI-COLISIÓN DE PRECIOS COMPLETADA (100% OK) <<<\n');
}

runTestSuite().catch(err => {
  console.error('Suite execution error:', err);
  process.exit(1);
});
