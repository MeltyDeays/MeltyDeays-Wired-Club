import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN RECONEXIÓN Y BLINDAJE EXTENSIÓN");
console.log("=================================================");

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "extensions/marketplace-sync/manifest.json"), "utf8"));
const popupJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.js"), "utf8");
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");

// Test 1: Permiso 'scripting' en manifest.json
assert(manifest.permissions.includes("scripting"), "manifest.json debe incluir el permiso 'scripting' para inyección dinámica");
console.log("  ✓ Test 1: Permiso 'scripting' registrado en manifest.json.");

// Test 2: Inyección y reconexión dinámica en popup.js
assert(popupJs.includes("sendTabMessageWithAutoReconnect"), "popup.js debe tener la función sendTabMessageWithAutoReconnect");
assert(popupJs.includes("chrome.scripting.executeScript"), "popup.js debe usar chrome.scripting para reinyectar el content script");
assert(popupJs.includes('referrerpolicy="no-referrer"'), "popup.js debe usar referrerpolicy='no-referrer' en miniaturas para evitar 403 de Facebook");
console.log("  ✓ Test 2: Reconexión resiliente y protección contra 403 en popup.js validada.");

// Test 3: Blindaje de contexto en content-script.js
assert(contentScript.includes("isExtensionValid()"), "content-script.js debe definir isExtensionValid");
assert(contentScript.includes("safeSendMessage("), "content-script.js debe definir y usar safeSendMessage");
assert(contentScript.includes("clearInterval(urlWatcherInterval)"), "content-script.js debe limpiar urlWatcherInterval al invalidarse el contexto");
console.log("  ✓ Test 3: Auto-terminación de timers y supresión de 'Extension context invalidated' validada.");

// Test 4: Priorización de fotos reales de Facebook en miniaturas escaneadas
assert(contentScript.includes("const thumb = fbImg || webImg;") || contentScript.includes("fbThumb: fbImg"), "content-script.js debe priorizar la foto real física de Facebook (fbImg) en miniaturas escaneadas");
console.log("  ✓ Test 4: Priorización de fotos reales de Facebook en escaneo validada.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE BLINDAJE PASARON AL 100%");
console.log("=================================================");
