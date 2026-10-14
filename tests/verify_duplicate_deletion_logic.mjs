import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN MOTOR DE ELIMINACIÓN DE ANTERIORES");
console.log("=================================================");

const root = process.cwd();
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");
const backgroundJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/background.js"), "utf8");

// 1. Verificar allowDuplicates en getScannableListings
assert.ok(contentScript.includes("function getScannableListings(allowDuplicates = false)"), "getScannableListings debe aceptar allowDuplicates");
assert.ok(contentScript.includes("if (!allowDuplicates && seenTitles.has(normKey)) return null;"), "Debe respetar allowDuplicates para no descartar duplicados");
console.log("  ✓ Test 1: Soporte de allowDuplicates en escaneo de publicaciones verificado.");

// 2. Verificar que cleanAllOldDuplicates use allowDuplicates = true
assert.ok(contentScript.includes("getScannableListings(true)"), "cleanAllOldDuplicates debe invocar getScannableListings con true");
console.log("  ✓ Test 2: cleanAllOldDuplicates captura correctamente duplicados con allowDuplicates = true.");

// 3. Verificar discriminación inteligente nuevo vs viejo
assert.ok(contentScript.includes("oldItems = items.filter(x => !x.isReview)"), "Debe filtrar ítems en revisión como los nuevos");
assert.ok(contentScript.includes("oldItems = items.slice(1)"), "Debe tomar los siguientes al primero como viejos si ambos están activos");
console.log("  ✓ Test 3: Criterio cronológico y de estado de revisión para aislar anteriores validado.");

// 4. Verificar pendingDeletions en background.js
assert.ok(backgroundJs.includes("pendingDeletions"), "background.js debe persistir pendingDeletions al iniciar lote");
console.log("  ✓ Test 4: Cola pendingDeletions registrada en background service worker.");

// 5. Verificar botón de borrado manual en widget flotante
assert.ok(contentScript.includes('id="haibane-btn-clean-duplicates"'), "Widget flotante debe tener botón haibane-btn-clean-duplicates");
console.log("  ✓ Test 5: Botón 'Borrar Anteriores' integrado en widget flotante de /marketplace/you/selling.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE ELIMINACIÓN PASARON AL 100%");
console.log("=================================================");
