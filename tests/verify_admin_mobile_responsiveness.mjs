import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log(' RUNNING VERIFICATION: ADMIN MOBILE RESPONSIVENESS ');
console.log('====================================================\n');

// 1. Check admin.html DOM & Structure
console.log('--- Checking admin.html ---');
const adminHtml = fs.readFileSync(path.join(rootDir, 'admin.html'), 'utf-8');

// Check Lain series filter group
assert(adminHtml.includes('class="lain-series-filter-group"'), 'admin.html contains .lain-series-filter-group');
assert(adminHtml.includes('id="btn-filter-all"'), 'admin.html contains #btn-filter-all');
assert(adminHtml.includes('id="btn-filter-s1"'), 'admin.html contains #btn-filter-s1');
assert(adminHtml.includes('id="btn-filter-s2"'), 'admin.html contains #btn-filter-s2');
assert(adminHtml.includes('id="btn-filter-s3"'), 'admin.html contains #btn-filter-s3');
assert(/lain-series-filter-group[^>]*flex-wrap:\s*wrap/.test(adminHtml), 'lain-series-filter-group has inline flex-wrap: wrap');

// Check Sort Selects exist
assert(adminHtml.includes('id="sort-tokens-select"'), 'admin.html contains #sort-tokens-select');
assert(adminHtml.includes('id="sort-catalog-select"'), 'admin.html contains #sort-catalog-select');
assert(adminHtml.includes('id="sort-vouchers-select"'), 'admin.html contains #sort-vouchers-select');
assert(adminHtml.includes('id="sort-users-select"'), 'admin.html contains #sort-users-select');

// Check filter groups in admin.html
assert(adminHtml.includes('class="admin-filter-search-wrap"'), 'admin.html contains .admin-filter-search-wrap');
assert(adminHtml.includes('class="admin-filter-controls"'), 'admin.html contains .admin-filter-controls');
assert(adminHtml.includes('class="admin-filter-group"'), 'admin.html contains .admin-filter-group');
assert(adminHtml.includes('class="admin-sort-group"'), 'admin.html contains .admin-sort-group');

// 1.1 Check js/views/AdminSandboxDbView.js DOM & Structure
console.log('\n--- Checking js/views/AdminSandboxDbView.js ---');
const sandboxDbJs = fs.readFileSync(path.join(rootDir, 'js/views/AdminSandboxDbView.js'), 'utf-8');
assert(sandboxDbJs.includes('class="admin-filter-search-wrap"'), 'AdminSandboxDbView.js contains .admin-filter-search-wrap');
assert(sandboxDbJs.includes('class="admin-filter-controls"'), 'AdminSandboxDbView.js contains .admin-filter-controls');
assert(sandboxDbJs.includes('class="admin-filter-group"'), 'AdminSandboxDbView.js contains .admin-filter-group');
assert(sandboxDbJs.includes('class="admin-sort-group"'), 'AdminSandboxDbView.js contains .admin-sort-group');
assert(sandboxDbJs.includes('id="sandbox-catalog-sort"'), 'AdminSandboxDbView.js contains #sandbox-catalog-sort');

// 2. Check css/admin.css
console.log('\n--- Checking css/admin.css ---');
const adminCss = fs.readFileSync(path.join(rootDir, 'css/admin.css'), 'utf-8');

// R1: Focus & Hover normalization
assert(adminCss.includes('#sort-tokens-select:focus'), 'admin.css styles #sort-tokens-select:focus');
assert(adminCss.includes('#sort-catalog-select:focus'), 'admin.css styles #sort-catalog-select:focus');
assert(adminCss.includes('#sort-vouchers-select:focus'), 'admin.css styles #sort-vouchers-select:focus');
assert(adminCss.includes('#sort-users-select:focus'), 'admin.css styles #sort-users-select:focus');
assert(adminCss.includes('#sandbox-catalog-sort:focus'), 'admin.css styles #sandbox-catalog-sort:focus');
assert(adminCss.includes('#lot-paper-size:focus'), 'admin.css styles #lot-paper-size:focus');

// Check that focus rule has indigo/blue (#4f46e5) and not var(--accent)
const focusSectionMatch = adminCss.match(/#sort-tokens-select:focus[\s\S]*?\{([\s\S]*?)\}/);
assert(focusSectionMatch && focusSectionMatch[1].includes('#4f46e5'), 'admin.css applies #4f46e5 border-color on select focus');
assert(focusSectionMatch && focusSectionMatch[1].includes('rgba(79, 70, 229,'), 'admin.css applies indigo focus ring box-shadow');
assert(!focusSectionMatch || !focusSectionMatch[1].includes('var(--accent)'), 'admin.css focus rule does NOT use var(--accent)');

// R2: Lain series filter group base styles
assert(adminCss.includes('.lain-series-filter-group'), 'admin.css defines .lain-series-filter-group');
const lainGroupBase = adminCss.match(/\.lain-series-filter-group\s*\{([\s\S]*?)\}/);
assert(lainGroupBase && lainGroupBase[1].includes('flex-wrap: wrap'), 'admin.css .lain-series-filter-group has flex-wrap: wrap');

assert(adminCss.includes('.admin-sort-group select:focus'), 'admin.css styles .admin-sort-group select:focus');
assert(adminCss.includes('.paper-setup-grid'), 'admin.css defines .paper-setup-grid');

// 3. Check css/responsive.css
console.log('\n--- Checking css/responsive.css ---');
const responsiveCss = fs.readFileSync(path.join(rootDir, 'css/responsive.css'), 'utf-8');

// R3: table-responsive containment
assert(responsiveCss.includes('.table-responsive'), 'responsive.css defines .table-responsive');
const tableRespMatch = responsiveCss.match(/\.table-responsive\s*\{([\s\S]*?)\}/);
assert(tableRespMatch && tableRespMatch[1].includes('overflow-x: auto'), 'table-responsive has overflow-x: auto');
assert(tableRespMatch && tableRespMatch[1].includes('max-width: 100%'), 'table-responsive has max-width: 100%');
assert(tableRespMatch && tableRespMatch[1].includes('overscroll-behavior-x: contain'), 'table-responsive has overscroll-behavior-x: contain');

// R3: admin-filter-bar mobile rules (< 640px and < 480px)
assert(responsiveCss.includes('.admin-filter-bar'), 'responsive.css defines .admin-filter-bar');
assert(responsiveCss.includes('.admin-filter-search-wrap'), 'responsive.css defines .admin-filter-search-wrap');
assert(responsiveCss.includes('.admin-filter-controls'), 'responsive.css defines .admin-filter-controls');
assert(responsiveCss.includes('.admin-filter-group'), 'responsive.css defines .admin-filter-group');
assert(responsiveCss.includes('.admin-sort-group'), 'responsive.css defines .admin-sort-group');
assert(responsiveCss.includes('#sandbox-catalog-sort'), 'responsive.css includes #sandbox-catalog-sort');

// R2: Lain series mobile adaptability (< 640px, < 480px, < 420px, < 320px)
assert(responsiveCss.includes('.lain-series-filter-group'), 'responsive.css defines .lain-series-filter-group');
assert(responsiveCss.includes('.lain-series-filter-group .copland-bar-btn'), 'responsive.css styles .lain-series-filter-group .copland-bar-btn');
assert(responsiveCss.includes('.lain-template-btn-group > .copland-bar-btn'), 'responsive.css targets direct children for nav buttons');
assert(responsiveCss.includes('@media (max-width: 480px)'), 'responsive.css defines @media (max-width: 480px)');
assert(responsiveCss.includes('@media (max-width: 320px)'), 'responsive.css defines @media (max-width: 320px)');
assert(responsiveCss.includes('.sandbox-purge-grid'), 'responsive.css defines .sandbox-purge-grid');
assert(responsiveCss.includes('.generator-action-bar'), 'responsive.css defines .generator-action-bar');

console.log('\n====================================================');
console.log(` RESULT: ${passedTests}/${totalTests} checks passed (${failedTests} failures)`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
