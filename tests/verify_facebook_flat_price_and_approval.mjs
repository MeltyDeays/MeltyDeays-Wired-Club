import assert from "node:assert";
import { RewardModel } from "../js/models/RewardModel.js";
import { FB_USER_DEFAULT_LISTINGS, isBrandVerifiable } from "../js/views/AdminInvoiceBatchView.js";

console.log("\n=================================================");
console.log("SUITE: VERIFICACIÓN PRODUCTOS PLANOS DE FACEBOOK Y APROBACIÓN");
console.log("=================================================");

// 1. Probar clasificador isBrandVerifiable
assert.strictEqual(isBrandVerifiable("Acer Predator Helios Neo 14"), true, "Acer debe ser marca verificable");
assert.strictEqual(isBrandVerifiable("Control Gamer GameSir X5 Lite"), true, "GameSir debe ser marca verificable");
assert.strictEqual(isBrandVerifiable("Anker PowerCore Play 6K"), true, "Anker debe ser marca verificable");
assert.strictEqual(isBrandVerifiable("Repetidor TP-LINK RE315"), true, "TP-Link debe ser marca verificable");
assert.strictEqual(isBrandVerifiable("Mini Jet Fan 2 en 1 Soplador Turbo"), false, "Jet Fan es genérico chino");
assert.strictEqual(isBrandVerifiable("Mando Windchaser PLUS Youth Edition"), false, "Windchaser es genérico chino");
console.log("  ✓ Clasificador isBrandVerifiable validado con precisión (marcas vs genéricos).");

// 2. Verificar listados por defecto de Facebook
assert.strictEqual(FB_USER_DEFAULT_LISTINGS.length, 6, "Debe haber 6 listados por defecto");

FB_USER_DEFAULT_LISTINGS.forEach(item => {
  assert.strictEqual(item.status, "PENDING_APPROVAL", `El producto ${item.title} debe estar en PENDING_APPROVAL`);
  assert.strictEqual(item.maxDiscountPct, 0, `El producto ${item.title} debe iniciar con 0% de descuento`);
  assert.strictEqual(item.pointsCost, 0, `El producto ${item.title} debe iniciar con 0 WP de costo de puntos`);
  assert.strictEqual(item.cashToPayUsd, item.priceUsd, `cashToPayUsd debe ser igual a priceUsd ($${item.priceUsd})`);

  if (item.brandVerified) {
    assert(item.imageUrl.startsWith("data:image/webp;base64,"), `Producto verificado ${item.title} debe tener foto oficial en base64`);
    console.log(`  ✓ [MARCA VERIFICADA] ${item.title.slice(0, 30)}... -> FOTO OFICIAL LISTA | $${item.priceUsd} USD`);
  } else {
    assert.strictEqual(item.imageUrl, "", `Producto genérico ${item.title} debe iniciar sin foto final fijada`);
    assert(Array.isArray(item.moldCandidates) && item.moldCandidates.length === 6, `Producto genérico debe incluir 6 opciones de moldes`);
    console.log(`  ✓ [GENÉRICO CHINO]   ${item.title.slice(0, 30)}... -> 6 MOLDES CANDIDATOS | $${item.priceUsd} USD`);
  }
});

// 2. Probar modelo RewardModel con descuento 0%
const flatProd = new RewardModel({
  id: "fb_test_flat_1",
  title: "Producto Plano Facebook",
  priceUsd: 100,
  priceNio: 3700,
  maxDiscountPct: 0,
  pointsCost: 0,
  rewardType: "PARTIAL_DISCOUNT",
  status: "PENDING_APPROVAL"
});

assert.strictEqual(flatProd.maxDiscountPct, 0, "maxDiscountPct debe ser 0%");
assert.strictEqual(flatProd.maxDiscountUsd, 0, "maxDiscountUsd debe ser 0");
assert.strictEqual(flatProd.cashToPayUsd, 100, "cashToPayUsd debe ser $100");
assert.strictEqual(flatProd.pointsCost, 0, "pointsCost debe ser 0 WP");
console.log("  ✓ RewardModel preserva precio plano ($100 USD, 0% desc, 0 WP)");

// 3. Probar modelo RewardModel cuando el admin asigna 10% de descuento explícitamente
const discountedProd = new RewardModel({
  id: "fb_test_disc_1",
  title: "Producto con Descuento Asignado por Admin",
  priceUsd: 100,
  priceNio: 3700,
  maxDiscountPct: 10,
  rewardType: "PARTIAL_DISCOUNT",
  status: "ACTIVE"
});

assert.strictEqual(discountedProd.maxDiscountPct, 10, "maxDiscountPct debe ser 10%");
assert.strictEqual(discountedProd.maxDiscountUsd, 10, "maxDiscountUsd debe ser $10.00");
assert.strictEqual(discountedProd.cashToPayUsd, 90, "cashToPayUsd debe ser $90.00");
assert.strictEqual(discountedProd.pointsCost, 500, "pointsCost debe ser 500 WP (10 USD * 50 WP/USD)");
console.log("  ✓ RewardModel calcula correctamente cuando el admin asigna 10% ($10 USD desc = 500 WP)");

console.log("\n=================================================");
console.log("TODAS LAS PRUEBAS DE PRECIO PLANO PASARON (100%)");
console.log("=================================================\n");
