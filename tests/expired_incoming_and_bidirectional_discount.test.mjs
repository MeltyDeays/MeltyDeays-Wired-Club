import assert from "node:assert";
import { RewardModel } from "../js/models/RewardModel.js";

console.log("======================================================================");
console.log("  TEST SUITE: TRANSICIÓN PREVENTA VENCIDA & CALCULADORA BIDIRECCIONAL ");
console.log("======================================================================");

// 1. Producto en camino cuya fecha expiró debe convertirse en PARTIAL_DISCOUNT activo
{
  const pastArrival = new Date(Date.now() - 3600000).toISOString();
  const reward = new RewardModel({
    id: "REW-TEST-EXP",
    title: "Hub USB-C 8 en 1",
    status: "INCOMING",
    rewardType: "INCOMING",
    isIncoming: true,
    priceUsd: 12.16,
    priceNio: 450,
    estimatedArrival: pastArrival,
    pointsCost: 0
  });

  assert.strictEqual(reward.status, "INCOMING", "Inicialmente status es INCOMING antes de transición");
  assert.strictEqual(reward.isIncomingExpired(), true, "isIncomingExpired() detecta fecha vencida");
  assert.strictEqual(reward.isIncoming(), false, "isIncoming() devuelve false al estar vencida");
  assert.strictEqual(reward.isPartialDiscount(), true, "isPartialDiscount() devuelve true porque tiene priceUsd > 0 y ya no está en camino");

  // Al llamar checkIncomingTransition()
  const transitioned = reward.checkIncomingTransition();
  assert.strictEqual(transitioned, true, "checkIncomingTransition() devuelve true");
  assert.strictEqual(reward.status, "ACTIVE", "status muta a ACTIVE");
  assert.strictEqual(reward.rewardType, "PARTIAL_DISCOUNT", "rewardType muta a PARTIAL_DISCOUNT");
  assert.strictEqual(reward.cashToPayUsd, 12.16, "cashToPayUsd se iguala a priceUsd");
  assert.strictEqual(reward.maxDiscountPct, 0, "maxDiscountPct es 0");
  assert.strictEqual(reward.pointsCost, 0, "pointsCost es 0");
  assert.strictEqual(reward.isIncomingFlag, false, "isIncomingFlag es false");

  const json = reward.toJSON();
  assert.strictEqual(json.status, "ACTIVE", "toJSON() serializa status ACTIVE");
  assert.strictEqual(json.rewardType, "PARTIAL_DISCOUNT", "toJSON() serializa PARTIAL_DISCOUNT");
  assert.strictEqual(json.pointsCost, 0, "toJSON() serializa 0 puntos");
  assert.strictEqual(json.cashToPayUsd, 12.16, "toJSON() serializa cobrar precio completo");
  console.log("✓ Test 1: Transición automática de preventa vencida a venta oficial completa.");
}

// 2. Producto cargado desde base de datos con status ACTIVE pero que tenía rawType INCOMING
{
  const reward = new RewardModel({
    id: "REW-TEST-MIGRATED",
    title: "Smartwatch Deportivo",
    status: "ACTIVE",
    rewardType: "INCOMING",
    priceUsd: 13.51,
    priceNio: 500,
    pointsCost: 0
  });

  assert.strictEqual(reward.status, "ACTIVE", "Mantiene status ACTIVE");
  assert.strictEqual(reward.isIncoming(), false, "No es incoming");
  assert.strictEqual(reward.isPartialDiscount(), true, "Es partial discount");
  console.log("✓ Test 2: Producto activo preserva categoría comercial PARTIAL_DISCOUNT.");
}

// 3. Cálculo de porcentaje exacto a partir del precio final a pagar en NIO
{
  const salePriceNio = 800; // C$ 800
  const cashDueNio = 720;   // C$ 720
  const discountNio = salePriceNio - cashDueNio; // 80
  const discountPct = Number(((discountNio / salePriceNio) * 100).toFixed(1)); // 10%
  const salePriceUsd = 21.62;
  const maxDiscountUsd = Number((salePriceUsd * (discountPct / 100)).toFixed(2)); // 2.16
  const WP_PER_USD = 50;
  let requiredPoints = Math.round(maxDiscountUsd * WP_PER_USD);
  if (requiredPoints % 10 !== 0) requiredPoints = Math.round(requiredPoints / 10) * 10;

  assert.strictEqual(discountPct, 10, "De C$ 800 a C$ 720 deduce exactamente 10% de descuento");
  assert.strictEqual(requiredPoints, 110, "10% de descuento en 21.62 USD requiere 110 WP");
  console.log("✓ Test 3: Deducción matemática bidireccional desde precio en córdobas a porcentaje y WP.");
}

console.log("======================================================================");
console.log("  TODAS LAS PRUEBAS UNITARIAS PASARON SATISFACTORIAMENTE (3/3)");
console.log("======================================================================");
