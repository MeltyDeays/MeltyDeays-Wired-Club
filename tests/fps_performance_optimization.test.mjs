/**
 * TEST SUITE: OPTIMIZACIÓN DE RENDIMIENTO Y 60/120 FPS (HAIBANE EN CAMINO & CATÁLOGO)
 * Valida técnicamente las optimizaciones de aceleración gráfica por hardware (GPU),
 * desacoplamiento de reflows, descarte de filtros continuos y eliminación de bloqueos de scroll.
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
  console.log('║   TEST SUITE: OPTIMIZACIÓN TÉCNICA DE FPS Y RENDERIZADO GPU        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. VERIFICACIÓN DE CSS CONTAINMENT Y ACELERACIÓN GPU EN css/client.css
  // =========================================================================
  console.log('--- 1. CSS CONTAINMENT Y HARDWARE ACCELERATION EN client.css ---');
  const clientCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/client.css'), 'utf8');

  check(clientCss.includes('content-visibility: auto'),
    '.reward-card declara content-visibility: auto para renderizado diferido de tarjetas fuera de pantalla');
  check(clientCss.includes('contain-intrinsic-size: 0 420px'),
    '.reward-card declara contain-intrinsic-size para preservar altura de scroll sin reflow');
  check(clientCss.includes('contain: layout paint'),
    '.reward-incoming-stamp-container declara contain: layout paint para aislar animaciones');
  check(clientCss.includes('will-change: transform, opacity'),
    '.godray-beam y .haibane-sparkle cuentan con will-change para capas dedicadas en GPU');

  // Comprobar que no hay animación de left en shimmer
  const shimmerMatch = clientCss.match(/@keyframes haibaneShimmerSweep\s*\{([\s\S]*?)\}/);
  check(shimmerMatch !== null, 'Keyframe haibaneShimmerSweep encontrado');
  check(shimmerMatch[1].includes('transform: translateX'),
    'haibaneShimmerSweep anima transform: translateX (compositor GPU) en vez de left (reflow CPU)');
  check(!shimmerMatch[1].includes('left:'),
    'haibaneShimmerSweep no contiene propiedades de posicionamiento left');

  // Comprobar que los destellos no animan filter: drop-shadow
  const sparkleMatch = clientCss.match(/@keyframes haibaneSparkle\s*\{([\s\S]*?)\}/);
  check(sparkleMatch !== null, 'Keyframe haibaneSparkle encontrado');
  check(!sparkleMatch[1].includes('drop-shadow'),
    'haibaneSparkle no recalcula filter: drop-shadow en su bucle infinito');

  // Comprobar que el relicario de cuenta regresiva no fuerza backdrop-filter en 98% opacidad
  const relicMatch = clientCss.match(/\.haibane-relic-countdown\s*\{([\s\S]*?)\}/);
  check(relicMatch !== null, 'Regla .haibane-relic-countdown encontrada');
  check(!relicMatch[1].includes('backdrop-filter: blur'),
    '.haibane-relic-countdown no usa backdrop-filter: blur innecesario en caja casi opaca');

  // Comprobar que los rayos celestiales no usan blur en fragment shaders
  const godrayMatch = clientCss.match(/\.godray-beam-1\s*\{([\s\S]*?)\}/);
  check(godrayMatch !== null && !godrayMatch[1].includes('filter: blur'),
    '.godray-beam no utiliza filter: blur pesado; usa gradientes suaves de alto rendimiento');

  // Comprobar que haibaneFloat levita puramente en Y sin rotaciones que fuercen re-rasterización de sombras
  const floatMatch = clientCss.match(/@keyframes haibaneFloat\s*\{([\s\S]*?)\}/);
  check(floatMatch !== null, 'Keyframe haibaneFloat encontrado');
  check(floatMatch[1].includes('translateY') && !floatMatch[1].includes('rotate'),
    'haibaneFloat levita puramente en translateY (Quad 2D en GPU) sin rotación que fuerce re-rasterización');

  // =========================================================================
  // 2. ELIMINACIÓN DE BLOQUEO DE SCROLL EN js/app.js
  // =========================================================================
  console.log('\n--- 2. HILO COMPOSITOR Y EVENTOS TÁCTILES EN js/app.js ---');
  const appJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/app.js'), 'utf8');

  check(!appJs.includes('document.addEventListener("touchmove"'),
    'No existe listener touchmove bloqueante no-pasivo en el objeto document');
  check(appJs.includes('document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: true })'),
    'Los gestos multitáctiles están marcados con { passive: true } garantizando 60/120 FPS');

  // =========================================================================
  // 3. OPTIMIZACIÓN DE REFLOWS E IMÁGENES EN CustomerCatalogView.js
  // =========================================================================
  console.log('\n--- 3. REFLOWS Y DECODIFICACIÓN ASÍNCRONA EN CustomerCatalogView.js ---');
  const catalogJs = fs.readFileSync(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js'), 'utf8');

  check(catalogJs.includes('loading="lazy"') && catalogJs.includes('decoding="async"'),
    'Las imágenes del catálogo cuentan con loading="lazy" y decoding="async"');
  check(!catalogJs.includes('firstChild.scrollIntoView'),
    'openProductSpecsModal no ejecuta scrollIntoView ni genera reflows en cascada');
  check(!catalogJs.includes('setTimeout(resetSpecsScroll, 120)'),
    'openProductSpecsModal no usa timers redundantes que congelen el hilo UI');

  // =========================================================================
  // 4. NAVBAR STICKY Y CACHE BUSTERS
  // =========================================================================
  console.log('\n--- 4. NAVBAR STICKY Y CACHE BUSTERS SINCRONIZADOS ---');
  const coreCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css/core.css'), 'utf8');
  const navbarMatch = coreCss.match(/\.navbar\s*\{([\s\S]*?)\}/);
  check(navbarMatch !== null, 'Regla .navbar encontrada en core.css');
  check(!navbarMatch[1].includes('backdrop-filter: blur'),
    '.navbar no ejecuta backdrop-filter durante el scroll continuo');
  check(navbarMatch[1].includes('transform: translateZ(0)'),
    '.navbar cuenta con capa acelerada por hardware (transform: translateZ(0))');

  const stylesCss = fs.readFileSync(path.join(PROJECT_ROOT, 'styles.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  check(stylesCss.includes('v=2.9.33') || stylesCss.includes('v=2.9.32'), 'styles.css sincronizado en v>=2.9.32');
  check(indexHtml.includes('styles.css?v=2.9.33') || indexHtml.includes('styles.css?v=2.9.32'), 'index.html sincronizado en v>=2.9.32');

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('======================================================');
  console.log('>>> SUITE DE RENDIMIENTO Y FPS COMPLETADA (100% OK) <<<\n');
}

runTestSuite().catch(err => {
  console.error('Suite execution error:', err);
  process.exit(1);
});
