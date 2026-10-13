import { strict as assert } from "node:assert";
import fs from "node:fs";

console.log("=================================================");
console.log("TEST SUITE: MODAL DESEMBARCAR PRODUCTO EN TIENDA");
console.log("=================================================");

// 1. Verificación en admin.html
const adminHtml = fs.readFileSync("admin.html", "utf8");

assert(adminHtml.includes('id="modal-release-incoming"'), "admin.html debe contener el modal #modal-release-incoming");
assert(adminHtml.includes('id="release-incoming-target-id"'), "Debe contener campo oculto para ID de producto");
assert(adminHtml.includes('id="release-incoming-product-title"'), "Debe contener título del producto");
assert(adminHtml.includes('id="release-incoming-product-img"'), "Debe contener miniatura del producto");
assert(adminHtml.includes('id="release-incoming-presale-price"'), "Debe contener desglose de precio preventa anterior");
assert(adminHtml.includes('id="release-incoming-regular-price"'), "Debe contener desglose de precio oficial en tienda");
assert(adminHtml.includes('id="release-incoming-stock-input"'), "Debe contener input para stock físico recibido");
assert(adminHtml.includes('id="release-incoming-price-input"'), "Debe contener input para precio de venta general");
assert(adminHtml.includes('id="release-incoming-price-nio-hint"'), "Debe contener indicador reactivo de precio en Córdobas");
assert(adminHtml.includes('id="btn-confirm-release-incoming"'), "Debe contener botón principal de confirmación");
assert(adminHtml.includes('onclick="adjustReleaseIncomingStock(-1)"'), "Debe tener botón de decremento rápido de stock");
assert(adminHtml.includes('onclick="adjustReleaseIncomingStock(1)"'), "Debe tener botón de incremento rápido de stock");
assert(adminHtml.includes('onclick="executeConfirmReleaseIncoming()"'), "Debe invocar executeConfirmReleaseIncoming al confirmar");
console.log("  ✓ Estructura de modal y componentes en admin.html verificados.");

// 2. Verificación en AdminInvoiceBatchView.js
const batchViewJs = fs.readFileSync("js/views/AdminInvoiceBatchView.js", "utf8");

assert(batchViewJs.includes("export function openReleaseIncomingModal"), "Debe exportar openReleaseIncomingModal");
assert(batchViewJs.includes("export function adjustReleaseIncomingStock"), "Debe exportar adjustReleaseIncomingStock");
assert(batchViewJs.includes("export function updateReleaseIncomingNioHint"), "Debe exportar updateReleaseIncomingNioHint");
assert(batchViewJs.includes("export async function executeConfirmReleaseIncoming"), "Debe exportar executeConfirmReleaseIncoming");
assert(batchViewJs.includes("export function handleAdminReleaseIncoming"), "Debe exportar handleAdminReleaseIncoming");
console.log("  ✓ Funciones controladoras exportadas en AdminInvoiceBatchView.js.");

// 3. Verificación en admin-app.js
const adminAppJs = fs.readFileSync("js/admin-app.js", "utf8");

assert(adminAppJs.includes("openReleaseIncomingModal,"), "admin-app.js debe importar openReleaseIncomingModal");
assert(adminAppJs.includes("window.openReleaseIncomingModal = openReleaseIncomingModal;"), "admin-app.js debe exponer openReleaseIncomingModal en window");
assert(adminAppJs.includes("window.adjustReleaseIncomingStock = adjustReleaseIncomingStock;"), "admin-app.js debe exponer adjustReleaseIncomingStock en window");
assert(adminAppJs.includes("window.updateReleaseIncomingNioHint = updateReleaseIncomingNioHint;"), "admin-app.js debe exponer updateReleaseIncomingNioHint en window");
assert(adminAppJs.includes("window.executeConfirmReleaseIncoming = executeConfirmReleaseIncoming;"), "admin-app.js debe exponer executeConfirmReleaseIncoming en window");
console.log("  ✓ Vinculación global a window y ciclo de vida en admin-app.js verificados.");

// 4. Prueba Lógica de Transición con RewardModel
const { RewardModel } = await import("../js/models/RewardModel.js");

const incomingProduct = new RewardModel({
  id: "REW-TEST-MIC",
  title: "Micrófono Condensador USB-C Broadcast con Brazo Articulado",
  status: "INCOMING",
  isIncoming: true,
  estimatedArrival: "2026-10-27T00:00:00Z",
  priceUsd: 75.0,
  presaleDiscountType: "FIXED_USD",
  presaleDiscountValue: 15.0,
  stock: 5
});

assert.equal(incomingProduct.status, "INCOMING", "Inicialmente debe ser INCOMING");
assert.equal(incomingProduct.isIncoming(), true, "isIncoming() debe ser true");
assert.equal(incomingProduct.isAvailable(), false, "isAvailable() debe ser false durante preventa");

// Simulación de Desembarque en tienda
incomingProduct.status = "ACTIVE";
incomingProduct.isIncomingFlag = false;
incomingProduct.stock = 6; // Llegaron 6 unidades
incomingProduct.priceUsd = 75.0;
incomingProduct.priceNio = Math.round(75.0 * 37.0);
incomingProduct.cashToPayUsd = 75.0;
incomingProduct.maxDiscountPct = 0;
incomingProduct.maxDiscountUsd = 0;
incomingProduct.pointsCost = 0;
incomingProduct.rewardType = "PARTIAL_DISCOUNT";
incomingProduct.estimatedArrival = null;

assert.equal(incomingProduct.status, "ACTIVE", "Post-desembarque debe ser ACTIVE");
assert.equal(incomingProduct.isIncoming(), false, "isIncoming() debe ser false");
assert.equal(incomingProduct.isAvailable(), true, "isAvailable() debe ser true para venta activa");
assert.equal(incomingProduct.stock, 6, "Stock actualizado debe ser 6");
assert.equal(incomingProduct.priceNio, 2775, "Precio NIO debe ser 2,775");

const json = incomingProduct.toJSON();
assert.equal(json.status, "ACTIVE", "toJSON() status debe ser ACTIVE");
assert.equal(json.isIncoming, false, "toJSON() isIncoming debe ser false");
assert.equal(json.is_incoming, false, "toJSON() is_incoming debe ser false");
assert.equal(json.stock, 6, "toJSON() stock debe ser 6");
console.log("  ✓ Modelo RewardModel muta coherentemente de INCOMING a ACTIVE sin residuos.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DEL MODAL DE DESEMBARCAR PASARON (100%)");
console.log("=================================================");
