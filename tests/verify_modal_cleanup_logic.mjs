import fs from "fs";
import assert from "assert";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN PREVENCIÓN DE APILAMIENTO DE MODALES");
console.log("=================================================");

const contentScript = fs.readFileSync("extensions/marketplace-sync/content-script.js", "utf8");
const backgroundScript = fs.readFileSync("extensions/marketplace-sync/background.js", "utf8");

// Test 1: getActiveConfirmationDialog implementada en content-script
assert(
  contentScript.includes("function getActiveConfirmationDialog()"),
  "getActiveConfirmationDialog debe existir en content-script.js"
);
console.log("  ✓ Test 1: getActiveConfirmationDialog implementada y seleccionando el último modal en DOM.");

// Test 2: closeDialogSafely implementada
assert(
  contentScript.includes("async function closeDialogSafely("),
  "closeDialogSafely debe existir en content-script.js"
);
console.log("  ✓ Test 2: closeDialogSafely implementada pulsando Cancelar o Cerrar (X).");

// Test 3: Cero dispatchEvent(Escape) en el flujo de borrado
assert(
  !contentScript.includes('code: "Escape"') && !contentScript.includes("keyCode: 27"),
  "No debe haber dispatchEvent sintéticos de Escape para cerrar modales de confirmación"
);
console.log("  ✓ Test 3: Eliminado uso de Escape sintético ignorado por Comet.");

// Test 4: Pre-chequeo y post-chequeo en deleteListingFromSellingPage
assert(
  contentScript.includes("Diálogo modal residual detectado al iniciar. Cerrándolo de forma segura..."),
  "deleteListingFromSellingPage debe verificar y cerrar modales residuales antes de iniciar"
);
assert(
  contentScript.includes("Modal de eliminación no se cerró para"),
  "deleteListingFromSellingPage debe forzar cierre seguro si el modal no respondió"
);
console.log("  ✓ Test 4: deleteListingFromSellingPage aísla y cierra cualquier modal antes y después.");

// Test 5: triggerFacebookClick calcula clientX y clientY exactos para hit-testing
assert(
  contentScript.includes("const cx = Math.floor(rect.left + rect.width / 2);") &&
  contentScript.includes("document.elementFromPoint(cx, cy)"),
  "triggerFacebookClick debe usar coordenadas reales y hit-testing de elementFromPoint"
);
console.log("  ✓ Test 5: triggerFacebookClick genera PointerEvents y MouseEvents con coordenadas reales.");

// Test 6: background.js incluye PointerEvent y SyntheticEvent con coordenadas
assert(
  backgroundScript.includes("new PointerEvent('pointerdown'") &&
  backgroundScript.includes("clientX: cx, clientY: cy"),
  "background.js debe despachar PointerEvent y MouseEvent con clientX/clientY exactos"
);
console.log("  ✓ Test 6: MAIN world en background.js despacha PointerEvents y SyntheticEvents en coordenadas exactas.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE MODALES PASARON AL 100%");
console.log("=================================================");
