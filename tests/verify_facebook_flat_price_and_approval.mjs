import assert from "node:assert";
import { RewardModel } from "../js/models/RewardModel.js";
import { FB_USER_DEFAULT_LISTINGS } from "../js/views/AdminInvoiceBatchView.js";

console.log("\n=================================================");
console.log("SUITE: VERIFICACIÓN PRODUCTOS PLANOS DE FACEBOOK Y APROBACIÓN");
console.log("=================================================");

// 1. Verificar listados por defecto de Facebook
assert.strictEqual(FB_USER_DEFAULT_LISTINGS.length, 6, "Debe haber 6 listados por defecto");

FB_USER_DEFAULT_LISTINGS.forEach(item => {
  assert.strictEqual(item.status, "PENDING_APPROVAL", `El producto ${item.title} debe estar en PENDING_APPROVAL`);
  assert.strictEqual(item.maxDiscountPct, 0, `El producto ${item.title} debe iniciar con 0% de descuento`);
  assert.strictEqual(item.pointsCost, 0, `El producto ${item.title} debe iniciar con 0 WP de costo de puntos`);
  assert.strictEqual(item.cashToPayUsd, item.priceUsd, `cashToPayUsd debe ser igual a priceUsd ($${item.priceUsd})`);
  assert(item.imageUrl.startsWith("data:image/webp;base64,"), `imageUrl debe contener la foto real en base64`);
  console.log(`  ✓ ${item.title.slice(0, 35)}... -> PENDING_APPROVAL | $${item.priceUsd} USD (0% descuento)`);
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
