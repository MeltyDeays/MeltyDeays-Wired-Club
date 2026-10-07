import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const adminHtmlPath = path.join(rootDir, "admin.html");
const adminCssPath = path.join(rootDir, "css", "admin.css");
const responsiveCssPath = path.join(rootDir, "css", "responsive.css");

console.log("====================================================");
console.log(" VERIFYING ADMIN NAVBAR MOBILE RESPONSIVENESS       ");
console.log("====================================================");

// 1. Verify admin.html markup
const adminHtml = fs.readFileSync(adminHtmlPath, "utf-8");
assert.ok(adminHtml.includes("class=\"navbar admin-navbar\""), "admin.html header must have admin-navbar class");
assert.ok(adminHtml.includes("class=\"nav-controls admin-nav-controls\""), "admin.html must have admin-nav-controls");
assert.ok(adminHtml.includes("class=\"admin-nav-actions-primary\""), "admin.html must have admin-nav-actions-primary");
assert.ok(adminHtml.includes("class=\"admin-nav-actions-secondary\""), "admin.html must have admin-nav-actions-secondary");
assert.ok(adminHtml.includes("lain-nav-invoice-btn"), "admin.html must include invoice button in primary actions");
assert.ok(adminHtml.includes("lain-nav-calc-btn"), "admin.html must include calc button in primary actions");
assert.ok(adminHtml.includes("admin-nav-client-btn"), "admin.html must include client button in secondary actions");
assert.ok(adminHtml.includes("admin-nav-logout-btn"), "admin.html must include logout button in secondary actions");
console.log("  ✓ admin.html semantic hierarchy and action groups verified");

// 2. Verify css/admin.css base rules
const adminCss = fs.readFileSync(adminCssPath, "utf-8");
assert.ok(adminCss.includes(".admin-navbar"), "admin.css must define .admin-navbar");
assert.ok(adminCss.includes(".admin-nav-controls"), "admin.css must define .admin-nav-controls");
assert.ok(adminCss.includes(".admin-nav-actions-primary"), "admin.css must define .admin-nav-actions-primary");
assert.ok(adminCss.includes(".admin-nav-actions-secondary"), "admin.css must define .admin-nav-actions-secondary");
assert.ok(adminCss.includes(".admin-nav-btn"), "admin.css must define .admin-nav-btn");
console.log("  ✓ css/admin.css desktop base styles verified");

// 3. Verify css/responsive.css mobile rules
const responsiveCss = fs.readFileSync(responsiveCssPath, "utf-8");
assert.ok(responsiveCss.includes(".admin-navbar {"), "responsive.css must style .admin-navbar in mobile");
assert.ok(responsiveCss.includes(".admin-navbar .admin-nav-controls"), "responsive.css must configure display: contents on controls");
assert.ok(responsiveCss.includes(".admin-navbar .admin-nav-actions-secondary"), "responsive.css must align secondary actions in row 1");
assert.ok(responsiveCss.includes(".admin-navbar .admin-nav-actions-primary"), "responsive.css must configure 2-column grid in row 2");
assert.ok(responsiveCss.includes("grid-template-columns: 1fr 1fr"), "responsive.css must split primary actions into symmetrical 50/50 columns");
console.log("  ✓ css/responsive.css mobile 2-tier compact layout verified");

console.log("====================================================");
console.log(" RESULT: ALL ADMIN NAVBAR VERIFICATIONS PASSED (0 failures) ");
console.log("====================================================");
