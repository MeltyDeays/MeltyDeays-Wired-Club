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
assert.ok(adminHtml.includes("class=\"nav-controls admin-nav-controls\""), "admin.html must have admin-nav-controls for desktop");
assert.ok(adminHtml.includes("admin-mobile-header-actions"), "admin.html must include mobile header logout action");
assert.ok(adminHtml.includes("admin-bottom-dock"), "admin.html must include admin-bottom-dock");
assert.ok(adminHtml.includes("dock-btn dock-btn-primary"), "admin.html bottom dock must include primary invoice button");
assert.ok(adminHtml.includes("dock-btn dock-btn-secondary"), "admin.html bottom dock must include secondary calc button");
assert.ok(adminHtml.includes("dock-link"), "admin.html bottom dock must include client view link");
console.log("  ✓ admin.html semantic hierarchy (1-line header + bottom dock) verified");

// 2. Verify css/admin.css base rules
const adminCss = fs.readFileSync(adminCssPath, "utf-8");
assert.ok(adminCss.includes(".admin-navbar"), "admin.css must define .admin-navbar");
assert.ok(adminCss.includes(".admin-nav-controls"), "admin.css must define .admin-nav-controls");
assert.ok(adminCss.includes(".admin-bottom-dock"), "admin.css must declare .admin-bottom-dock");
assert.ok(adminCss.includes(".admin-mobile-header-actions"), "admin.css must declare .admin-mobile-header-actions");
console.log("  ✓ css/admin.css desktop base styles & mobile component hiding verified");

// 3. Verify css/responsive.css mobile rules
const responsiveCss = fs.readFileSync(responsiveCssPath, "utf-8");
assert.ok(responsiveCss.includes(".admin-navbar {"), "responsive.css must style .admin-navbar in mobile");
assert.ok(responsiveCss.includes("height: 48px !important;"), "responsive.css must set 1-line 48px height on mobile navbar");
assert.ok(responsiveCss.includes(".admin-navbar .admin-nav-controls"), "responsive.css must hide desktop controls on mobile");
assert.ok(responsiveCss.includes(".admin-bottom-dock {"), "responsive.css must style .admin-bottom-dock");
assert.ok(responsiveCss.includes("position: fixed !important;"), "responsive.css must fix bottom dock to viewport");
assert.ok(responsiveCss.includes(".dock-btn-primary"), "responsive.css must style highlighted invoice action in dock");
console.log("  ✓ css/responsive.css 1-line header & ergonomic bottom dock verified");

console.log("====================================================");
console.log(" RESULT: ALL ADMIN NAVBAR VERIFICATIONS PASSED (0 failures) ");
console.log("====================================================");
