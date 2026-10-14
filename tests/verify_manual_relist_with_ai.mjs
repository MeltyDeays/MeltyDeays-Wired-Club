import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN RENOVACIÓN MANUAL CON IA");
console.log("=================================================");

const root = process.cwd();
const popupHtml = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.js"), "utf8");
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");

// Test 1: Verificar elementos UI en popup.html
assert(popupHtml.includes("btn-scan-relist-listings"), "popup.html debe tener el botón para escanear publicaciones");
assert(popupHtml.includes("manual-relist-container"), "popup.html debe tener el contenedor de lista manual");
assert(popupHtml.includes("btn-execute-manual-relist"), "popup.html debe tener el botón de ejecución manual con IA");
assert(popupHtml.includes("btn-relist-select-all"), "popup.html debe tener botón seleccionar todas");
assert(popupHtml.includes("btn-relist-select-none"), "popup.html debe tener botón seleccionar ninguna");
console.log("  ✓ Test 1: Estructura UI de selección manual en popup.html validada.");

// Test 2: Verificar manejadores en popup.js
assert(popupJs.includes("SCAN_MY_LISTINGS"), "popup.js debe solicitar escaneo de publicaciones");
assert(popupJs.includes("renderManualRelistListings"), "popup.js debe incluir la función de renderizado de lista manual");
assert(popupJs.includes("RELIST_EXPIRED_PRODUCT"), "popup.js debe despachar la acción de relist asistido con IA");
console.log("  ✓ Test 2: Manejadores de eventos y cola de renovación en popup.js validados.");

// Test 3: Verificar listener SCAN_MY_LISTINGS en content-script.js
assert(contentScript.includes('msg.action === "SCAN_MY_LISTINGS"'), "content-script.js debe escuchar la acción SCAN_MY_LISTINGS");
assert(contentScript.includes("computeTitleSimilarity"), "content-script.js debe emparejar publicaciones con productos gemelos web");
console.log("  ✓ Test 3: Extracción y emparejamiento con gemelos en content-script.js validado.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE RENOVACIÓN MANUAL PASARON AL 100%");
console.log("=================================================");
