import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   WIRED CLUB - CI / PRE-PUBLISH VALIDATION SUITE           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

// 1. Verificación Estática de Sintaxis (js/ y api/)
console.log('--- 1. VERIFICACIÓN DE SINTAXIS JAVASCRIPT ---');

function getJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (item.isDirectory()) {
      results = results.concat(getJsFiles(fullPath));
    } else if (item.name.endsWith('.js') || item.name.endsWith('.mjs')) {
      results.push(path.join(dir, item.name));
    }
  }
  return results;
}

const jsFiles = [];
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanDir(fullPath);
    } else if (item.name.endsWith('.js') || item.name.endsWith('.mjs')) {
      jsFiles.push(fullPath);
    }
  }
}
scanDir(path.join(ROOT_DIR, 'js'));
scanDir(path.join(ROOT_DIR, 'api'));

let syntaxErrors = 0;
for (const file of jsFiles) {
  totalChecks++;
  const rel = path.relative(ROOT_DIR, file);
  const res = spawnSync(process.execPath, ['--check', file], { cwd: ROOT_DIR });
  if (res.status === 0) {
    passedChecks++;
  } else {
    failedChecks++;
    syntaxErrors++;
    failures.push({ name: `Syntax: ${rel}`, error: res.stderr.toString() });
  }
}

if (syntaxErrors === 0) {
  console.log(`✓ Sintaxis válida en ${jsFiles.length} módulos JS/MJS.\n`);
} else {
  console.error(`✕ ${syntaxErrors} archivos con error de sintaxis.\n`);
}

// 1.5. Linter Estático de Integridad y Seguridad
console.log('--- 1.5. LINTER ESTÁTICO ZERO-WASTE (< 100ms) ---');
totalChecks++;
const lintRes = spawnSync(process.execPath, ['scripts/lint_codebase.mjs'], { cwd: ROOT_DIR, stdio: 'pipe' });
if (lintRes.status === 0) {
  passedChecks++;
  console.log('✓ Linter: Cero fugas de secretos y enlaces ES íntegros.\n');
} else {
  failedChecks++;
  failures.push({ name: 'Linter', error: lintRes.stdout.toString() + '\n' + lintRes.stderr.toString() });
  console.error('✕ Fallo en linter estático.\n');
}

// 2. Suites de Pruebas Automatizadas
console.log('--- 2. EJECUCIÓN DE SUITES DE PRUEBAS ---');

const testSuites = [
  'tests/combo_products.test.mjs',
  'tests/verify_combo_mobile_layout.mjs',
  'tests/verify_visual_responsive_invariants.mjs',
  'tests/verify_pwa_installability.mjs',
  'tests/verify_mobile_catalog_and_image_resilience.mjs',
  'tests/verify_bimoneda_admin_and_clean_nio.mjs',
  'tests/specs_modal_locked_button.test.mjs',
  'tests/cancel_exploit_and_stock_fix.test.mjs',
  'tests/verify_mobile_zero_freeze_upload.mjs'
];

for (const suite of testSuites) {
  totalChecks++;
  const fullPath = path.join(ROOT_DIR, suite);
  if (!fs.existsSync(fullPath)) {
    failedChecks++;
    failures.push({ name: suite, error: 'Archivo no encontrado' });
    console.error(`✕ [NO ENCONTRADO] ${suite}`);
    continue;
  }

  process.stdout.write(`• Ejecutando ${suite}... `);
  const res = spawnSync(process.execPath, [suite], { cwd: ROOT_DIR, stdio: 'pipe' });
  if (res.status === 0) {
    passedChecks++;
    console.log('OK (PASS)');
  } else {
    failedChecks++;
    console.log('FAIL');
    const out = (res.stdout.toString() + '\n' + res.stderr.toString()).trim();
    failures.push({ name: suite, error: out.slice(0, 500) });
  }
}

console.log('\n======================================================');
console.log('RESUMEN DE PRUEBAS PRE-PUBLICACIÓN');
console.log('======================================================');
console.log(`Total verificaciones: ${totalChecks}`);
console.log(`Aprobadas: ${passedChecks}`);
console.log(`Fallidas:  ${failedChecks}`);

if (failedChecks > 0) {
  console.error('\nDetalle de fallos:');
  for (const f of failures) {
    console.error(`- ${f.name}:`);
    console.error(`  ${f.error.replace(/\n/g, '\n  ')}`);
  }
  console.error('\n[BLOQUEO] Pruebas fallidas. No se puede publicar.');
  process.exit(1);
} else {
  console.log('\n[ÉXITO] Todas las pruebas pasaron. Listo para publicar.\n');
  process.exit(0);
}
