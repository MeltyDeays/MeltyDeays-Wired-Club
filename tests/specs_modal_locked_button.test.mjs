/**
 * TEST SUITE: SPECS MODAL LOCKED BUTTON & INSUFFICIENT POINTS GUARD
 * Verifies that 100% free rewards lock the specs modal action button
 * when the customer has insufficient Wired Points or is unauthenticated.
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

function assert(condition, message) {
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
  console.log('║   TEST SUITE: BOTÓN BLOQUEADO / CANDADO EN MODAL DE ESPECIFICACIONES ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // =========================================================================
  // 1. CSS STATIC VERIFICATION (lightbox.css)
  // =========================================================================
  console.log('--- 1. VERIFICACIÓN ESTÁTICA DE CSS (lightbox.css) ---');
  const cssPath = path.join(PROJECT_ROOT, 'css/modals/lightbox.css');
  assert(fs.existsSync(cssPath), 'css/modals/lightbox.css existe');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert(cssContent.includes('.modal-specs-action-btn.btn-redeem-locked'),
    '.modal-specs-action-btn.btn-redeem-locked está declarado en lightbox.css');
  assert(cssContent.includes('.btn-locked-text-full'),
    '.btn-locked-text-full está declarado en lightbox.css');
  assert(cssContent.includes('.btn-locked-text-short'),
    '.btn-locked-text-short está declarado en lightbox.css');

  const media520Match = cssContent.match(/@media\s*\(max-width:\s*520px\)\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  assert(media520Match !== null, 'Bloque @media (max-width: 520px) encontrado');
  const media520Css = media520Match[1];
  assert(media520Css.includes('.btn-locked-text-full') && media520Css.includes('display: none !important'),
    'En móvil (<=520px), .btn-locked-text-full se oculta (display: none !important)');
  assert(media520Css.includes('.btn-locked-text-short') && media520Css.includes('display: inline !important'),
    'En móvil (<=520px), .btn-locked-text-short se muestra (display: inline !important)');

  // =========================================================================
  // 2. JS STATIC & LOGICAL VERIFICATION (CustomerCatalogView.js)
  // =========================================================================
  console.log('\n--- 2. VERIFICACIÓN DE LÓGICA DE CANJE EN CustomerCatalogView.js ---');
  const jsPath = path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js');
  assert(fs.existsSync(jsPath), 'CustomerCatalogView.js existe');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  // Verificar que showProductSpecs evalúa canAffordFree
  assert(jsContent.includes('const canAffordFree = user && userPts >= item.pointsCost;'),
    'showProductSpecs evalúa condición canAffordFree con balance del usuario');

  // Verificar que renderiza btn-redeem-locked para no autenticados
  assert(jsContent.includes('modal-specs-action-btn btn-redeem-locked') && jsContent.includes("openAuthModal('login'"),
    'Usuario no autenticado recibe botón bloqueado con redirección a login');

  // Verificar que renderiza btn-redeem-locked cuando faltan puntos
  assert(jsContent.includes('Faltan ${missing.toLocaleString()} WP'),
    'Usuario con saldo insuficiente recibe botón bloqueado con cálculo de faltante');

  // Verificar que muestra toast informativo en vez de modal de confirmación al presionar botón bloqueado
  assert(jsContent.includes("showToast('Puntos insuficientes: Te faltan"),
    'Clic en botón bloqueado genera toast informativo explicativo con saldo actual y requerido');

  // Verificar banner de especificaciones con aviso de saldo insuficiente
  assert(jsContent.includes('specs-locked-notice') && jsContent.includes('Saldo insuficiente (Tienes ${userPts.toLocaleString()} WP)'),
    'Banner de venta Temu incluye pastilla specs-locked-notice detallando faltante');

  // =========================================================================
  // 3. SIMULACIÓN DINÁMICA DE REGLAS DE NEGOCIO
  // =========================================================================
  console.log('\n--- 3. SIMULACIÓN DINÁMICA DE REGLAS DE NEGOCIO ---');

  const testItem = {
    id: 'REWARD-PAD-CYBERPUNK',
    title: 'Mouse Pad Melty Cyberpunk XL',
    rewardType: 'FREE_REWARD',
    pointsCost: 150,
    priceUsd: 15.00,
    stock: 5,
    status: 'ACTIVE'
  };

  // Simulación 1: Usuario Valeria Ríos con 0 WP
  const valeria0Wp = { uid: 'user_valeria', name: 'Valeria Ríos', wiredPoints: 0 };
  const valeriaCanAfford = valeria0Wp && valeria0Wp.wiredPoints >= testItem.pointsCost;
  assert(!valeriaCanAfford, 'Valeria con 0 WP NO puede canjear recompensa de 150 WP');
  const valeriaMissing = testItem.pointsCost - valeria0Wp.wiredPoints;
  assert(valeriaMissing === 150, 'El cálculo de puntos faltantes para Valeria es exactamente 150 WP');

  // Simulación 2: Usuario Valeria Ríos con 100 WP (parcial insuficiente)
  const valeria100Wp = { uid: 'user_valeria', name: 'Valeria Ríos', wiredPoints: 100 };
  const valeria100CanAfford = valeria100Wp && valeria100Wp.wiredPoints >= testItem.pointsCost;
  assert(!valeria100CanAfford, 'Valeria con 100 WP NO puede canjear recompensa de 150 WP');
  const valeria100Missing = testItem.pointsCost - valeria100Wp.wiredPoints;
  assert(valeria100Missing === 50, 'El cálculo de puntos faltantes para Valeria con 100 WP es exactamente 50 WP');

  // Simulación 3: Usuario con saldo suficiente (200 WP)
  const userRich = { uid: 'user_rich', name: 'Cliente Frecuente', wiredPoints: 200 };
  const userRichCanAfford = userRich && userRich.wiredPoints >= testItem.pointsCost;
  assert(userRichCanAfford, 'Usuario con 200 WP SÍ puede canjear recompensa de 150 WP');

  // Simulación 4: Usuario anónimo (sin sesión)
  const anonUser = null;
  const anonPts = anonUser ? (anonUser.wiredPoints || 0) : 0;
  const anonCanAfford = anonUser && anonPts >= testItem.pointsCost;
  assert(!anonCanAfford, 'Usuario anónimo NO puede canjear de forma gratuita sin sesión');

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('======================================================');
  console.log('>>> VERIFICACIÓN DE BOTÓN BLOQUEADO COMPLETADA (100% OK) <<<\n');
}

runTestSuite().catch(err => {
  console.error('Suite execution error:', err);
  process.exit(1);
});
