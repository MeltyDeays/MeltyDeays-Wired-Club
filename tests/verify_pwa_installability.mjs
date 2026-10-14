import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: INSTALABILIDAD PWA STANDALONE MELTYDEAYS (100%)       ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Auditoría del Web App Manifest
console.log("=== SEC 1: AUDITORÍA DE MANIFIESTO WEB ===");
assert.ok(fs.existsSync("manifest.webmanifest"), "manifest.webmanifest debe existir en la raíz");
assert.ok(fs.existsSync("manifest.json"), "manifest.json debe existir en la raíz");

const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf-8"));
assert.equal(manifest.display, "standalone", "Display debe ser standalone para app nativa");
assert.ok(manifest.name.includes("MeltyDeays"), "Name debe incluir MeltyDeays");
assert.ok(manifest.short_name, "Debe tener short_name");
assert.ok(manifest.start_url, "Debe tener start_url");
assert.ok(manifest.theme_color, "Debe tener theme_color");
assert.ok(manifest.background_color, "Debe tener background_color");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Debe declarar al menos 2 iconos");

const has192 = manifest.icons.some(i => i.sizes === "192x192" && i.purpose.includes("maskable"));
const has512 = manifest.icons.some(i => i.sizes === "512x512" && i.purpose.includes("maskable"));
assert.ok(has192, "Debe incluir icono 192x192 con propósito maskable");
assert.ok(has512, "Debe incluir icono 512x512 con propósito maskable");
console.log("  ✓ Web App Manifest canónico cumple 100% de criterios Chromium.");

// 2. Existencia y Validación Binaria de Iconos
console.log("\n=== SEC 2: AUDITORÍA DE ARCHIVOS DE ICONOS ===");
for (const icon of manifest.icons) {
  const iconPath = icon.src.replace("./", "");
  assert.ok(fs.existsSync(iconPath), `El icono ${iconPath} debe existir físicamente`);
  const stat = fs.statSync(iconPath);
  assert.ok(stat.size > 500, `El icono ${iconPath} no debe estar vacío (${stat.size} bytes)`);
}
assert.ok(fs.existsSync("assets/icons/apple-touch-icon.png"), "apple-touch-icon.png debe existir");
assert.ok(fs.existsSync("favicon.svg"), "favicon.svg debe existir");
console.log("  ✓ Todos los iconos PNG y SVG verificados y con tamaño binario óptimo.");

// 3. Auditoría del Service Worker (sw.js)
console.log("\n=== SEC 3: AUDITORÍA DEL SERVICE WORKER ===");
assert.ok(fs.existsSync("sw.js"), "sw.js debe existir");
const swContent = fs.readFileSync("sw.js", "utf-8");
assert.ok(swContent.includes("addEventListener('fetch'"), "sw.js debe tener listener fetch para PWA");
assert.ok(swContent.includes("addEventListener('install'"), "sw.js debe tener listener install");
assert.ok(swContent.includes("addEventListener('activate'"), "sw.js debe tener listener activate");
assert.ok(swContent.includes("caches.open"), "sw.js debe interactuar con CacheStorage");
assert.ok(swContent.includes("addEventListener('push'"), "sw.js debe preservar Web Push notifications");
console.log("  ✓ Service Worker adaptado para PWA y offline caching manteniendo Web Push.");

// 4. Auditoría de HTML Shells (index.html y admin.html)
console.log("\n=== SEC 4: AUDITORÍA DE INTEGRACIÓN EN HTML ===");
const indexHtml = fs.readFileSync("index.html", "utf-8");
const adminHtml = fs.readFileSync("admin.html", "utf-8");

for (const [name, content] of [["index.html", indexHtml], ["admin.html", adminHtml]]) {
  assert.ok(content.includes('rel="manifest"'), `${name} debe enlazar manifest`);
  assert.ok(content.includes('name="theme-color"'), `${name} debe declarar theme-color`);
  assert.ok(content.includes('name="apple-mobile-web-app-capable"'), `${name} debe habilitar apple-mobile-web-app-capable`);
  assert.ok(content.includes("navigator.serviceWorker.register"), `${name} debe auto-registrar service worker`);
}
console.log("  ✓ Ambas vistas (Cliente y Admin) enlazadas y auto-registradas.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE PWA INSTALABLE PASARON (100% PASS)");
console.log("======================================================");
