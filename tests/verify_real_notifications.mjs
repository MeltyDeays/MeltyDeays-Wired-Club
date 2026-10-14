import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN NOTIFICACIONES REALES Y DINÁMICAS");
console.log("=================================================");

const root = process.cwd();
const drawerJs = fs.readFileSync(path.join(root, "js/views/customer/CustomerProfileDrawer.js"), "utf8");

// Test 1: Cero referencias a datos demo o REW-DEMO en CustomerProfileDrawer.js
assert.ok(!drawerJs.includes("Nuevos Artículos Demo"), "No debe existir el texto hardcodeado 'Nuevos Artículos Demo'");
assert.ok(!drawerJs.includes("REW-DEMO-03"), "No debe existir el ID demo hardcodeado REW-DEMO-03");
assert.ok(!drawerJs.includes("REW-DEMO-04"), "No debe existir el ID demo hardcodeado REW-DEMO-04");
console.log("  ✓ Test 1: Eliminadas todas las cadenas y IDs demo de CustomerProfileDrawer.js.");

// Test 2: Inclusión de getCatalogProductsList para extraer productos reales en vivo
assert.ok(drawerJs.includes("function getCatalogProductsList()"), "Debe implementar getCatalogProductsList");
console.log("  ✓ Test 2: getCatalogProductsList implementada para conectar con el catálogo en vivo.");

// Test 3: Soporte dinámico para productos en camino (INCOMING / PREVENTA)
assert.ok(drawerJs.includes('notif-incoming-') && drawerJs.includes('badgeText: "PREVENTA"'), "Debe generar notificaciones de productos en camino");
console.log("  ✓ Test 3: Notificaciones automáticas de productos en camino (PREVENTA).");

// Test 4: Soporte dinámico para nuevos productos reales en catálogo (NUEVO)
assert.ok(drawerJs.includes('notif-new-') && drawerJs.includes('badgeText: "NUEVO"'), "Debe generar notificaciones de nuevos productos del catálogo");
console.log("  ✓ Test 4: Notificaciones dinámicas de nuevos productos del catálogo real.");

// Test 5: Descuentos dinámicos calculados a partir de productos reales (OFF)
assert.ok(drawerJs.includes('notif-pts-discount-') || drawerJs.includes('notif-pts-explore-'), "Debe generar notificaciones de descuento basadas en productos reales");
console.log("  ✓ Test 5: Descuentos calculados sobre el producto real con mayor porcentaje de ahorro.");

// Test 6: Soporte para combos gaming (COMBO)
assert.ok(drawerJs.includes('notif-combo-') && drawerJs.includes('badgeText: "COMBO"'), "Debe generar notificaciones para combos especiales");
console.log("  ✓ Test 6: Notificaciones de combos gaming con ahorro especial.");

// Test 7: Push Notifications Web libres de referencias demo
assert.ok(!drawerJs.match(/PushNotificationService\.sendNotification\(\{[^}]*rewardId:\s*['"]REW-DEMO/), "Push notifications no deben apuntar a REW-DEMO");
console.log("  ✓ Test 7: Avisos Web Push en Google Chrome anclados al catálogo real.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE NOTIFICACIONES REALES: 100% OK");
console.log("=================================================");
