/**
 * scripts/lint_codebase.mjs
 * LINTER ESTÁTICO DE CÓDIGO Y SEGURIDAD ZERO-WASTE (< 100ms)
 * Audita integridad de imports ES, fugas de secretos y patrones riesgosos sin dependencias pesadas.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   LINTER ESTÁTICO DE CALIDAD Y SEGURIDAD ZERO-WASTE        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let totalChecked = 0;
let errors = 0;
const issues = [];

function getFiles(dir, exts = ['.js', '.mjs']) {
  let list = [];
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list = list.concat(getFiles(full, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      list.push(full);
    }
  }
  return list;
}

const jsFiles = [
  ...getFiles(path.join(ROOT_DIR, 'js')),
  ...getFiles(path.join(ROOT_DIR, 'api')),
  ...getFiles(path.join(ROOT_DIR, 'scripts'))
];

// 1. Verificación de imports relativos rotos
console.log('--- 1. VERIFICACIÓN DE ENLACES E IMPORTS ES MODULES ---');
const importRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"](\.[^'"]+)['"]/g;

for (const filePath of jsFiles) {
  const relPath = path.relative(ROOT_DIR, filePath);
  // Omitir el propio linter de las comprobaciones de patrones autorreferenciales
  if (relPath.includes('lint_codebase.mjs')) continue;

  totalChecked++;
  const content = fs.readFileSync(filePath, 'utf8');

  // BOM check
  if (content.charCodeAt(0) === 0xFEFF) {
    errors++;
    issues.push({ file: relPath, rule: 'no-bom', message: 'Archivo contiene Byte Order Mark (BOM) UTF-8' });
  }

  // Debugger check
  if (/\bdebugger\s*;/.test(content)) {
    errors++;
    issues.push({ file: relPath, rule: 'no-debugger', message: 'Sentencia "debugger;" detectada en código productivo' });
  }

  // Secret leak check en código cliente
  if (relPath.startsWith('js' + path.sep)) {
    if (/(?:AKIA[0-9A-Z]{16})|(?:AIzaSy[A-Za-z0-9_-]{33})/.test(content)) {
      if (/AKIA[0-9A-Z]{16}/.test(content) || /sk-[a-zA-Z0-9]{20,}/.test(content)) {
        errors++;
        issues.push({ file: relPath, rule: 'no-secret-leak', message: 'Posible API key privada hardcodeada en cliente' });
      }
    }
  }

  // Import target check (ignora query strings como ?v=...)
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawImportSpecifier = match[1];
    const cleanSpecifier = rawImportSpecifier.split('?')[0];
    const dir = path.dirname(filePath);
    let resolved = path.resolve(dir, cleanSpecifier);

    // Si no tiene extensión, probar con .js/.mjs o /index.js
    let exists = fs.existsSync(resolved);
    if (!exists) {
      if (fs.existsSync(`${resolved}.js`)) exists = true;
      else if (fs.existsSync(`${resolved}.mjs`)) exists = true;
      else if (fs.existsSync(path.join(resolved, 'index.js'))) exists = true;
    }

    if (!exists) {
      errors++;
      issues.push({
        file: relPath,
        rule: 'valid-import-path',
        message: `Import roto: "${rawImportSpecifier}" no apunta a ningún archivo existente`
      });
    }
  }
}

console.log(`✓ Auditados ${totalChecked} módulos JS/MJS.`);

console.log('\n======================================================');
console.log(`RESULTADOS DE LINTER: ${errors === 0 ? 'LIMPIO (0 ERRORES)' : `${errors} PROBLEMAS`}`);
console.log('======================================================');

if (errors > 0) {
  for (const err of issues) {
    console.error(`- [${err.rule}] ${err.file}: ${err.message}`);
  }
  process.exit(1);
} else {
  console.log('>>> CÓDIGO 100% LIMPIO, IMPORTS ÍNTEGROS Y CERO FUGAS <<<\n');
  process.exit(0);
}
