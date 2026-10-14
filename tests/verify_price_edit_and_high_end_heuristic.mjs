import assert from "node:assert";
import { RewardModel } from "../js/models/RewardModel.js";
import { normalizePriceByThreshold } from "../js/utils/PriceNormalizer.js";

console.log("\n=================================================");
console.log("SUITE: VERIFICACIÓN DE PRECIOS Y HEURÍSTICA DE HARDWARE / ACCESORIOS");
console.log("=================================================");

// 1. Probar que accesorios de audio/periféricos NO se inflan con la heurística de alta gama por tener 'computadora' en descripción
const auriculares = new RewardModel({
  id: "REW-M631AS",
  title: "Auriculares in-ear QKZ AK6 Negros",
  description: "Auriculares de alta fidelidad compatibles con computadora, laptop, PC gamer y teléfonos.",
  priceUsd: 8.64,
  rewardType: "PARTIAL_DISCOUNT",
  maxDiscountPct: 10
});

assert.strictEqual(auriculares.priceUsd, 8.64, "Auriculares debe mantener $8.64 USD y NO inflarse a $320.00 USD");
assert.strictEqual(auriculares.maxDiscountPct, 10, "Tope de descuento debe ser 10%");
assert.strictEqual(auriculares.maxDiscountUsd, 0.86, "Descuento máximo en USD debe ser $0.86");
assert.strictEqual(auriculares.cashToPayUsd, 7.78, "Efectivo a pagar debe ser $7.78 USD");
assert.strictEqual(auriculares.pointsCost, 43, "Puntos requeridos deben ser 43 WP (aprox 50 WP por dólar de descuento)");
console.log("  ✓ Auriculares in-ear QKZ AK6 preservan $8.64 USD ($7.78 a cobrar, 43 WP).");

// 2. Probar Mini Jet Fan
const jetFan = new RewardModel({
  id: "REW-893UMK",
  title: "Mini Jet Fan 2 en 1 | Soplador Turbo",
  description: "Soplador potente para limpiar teclado, computadora, laptop y componentes gamer.",
  priceUsd: 21.62,
  rewardType: "PARTIAL_DISCOUNT",
  maxDiscountPct: 10
});

assert.strictEqual(jetFan.priceUsd, 21.62, "Mini Jet Fan debe mantener $21.62 USD y NO inflarse a $800.00 USD");
assert.strictEqual(jetFan.maxDiscountPct, 10, "Tope de descuento debe ser 10%");
assert.strictEqual(jetFan.maxDiscountUsd, 2.16, "Descuento máximo debe ser $2.16 USD");
assert.strictEqual(jetFan.cashToPayUsd, 19.46, "Efectivo a pagar debe ser $19.46 USD");
console.log("  ✓ Mini Jet Fan 2 en 1 preserva $21.62 USD ($19.46 a cobrar).");

// 3. Probar Audífonos TWS
const audifonosTws = new RewardModel({
  id: "REW-AGHRP8",
  title: "Audífonos Inalámbricos Bluetooth TWS",
  description: "Audífonos bluetooth gamer para celular, computadora y consola.",
  priceUsd: 9.46,
  rewardType: "PARTIAL_DISCOUNT",
  maxDiscountPct: 10
});

assert.strictEqual(audifonosTws.priceUsd, 9.46, "Audífonos TWS debe mantener $9.46 USD y NO inflarse a $350.00 USD");
assert.strictEqual(audifonosTws.cashToPayUsd, 8.51, "Efectivo a pagar debe ser $8.51 USD");
console.log("  ✓ Audífonos Bluetooth TWS preservan $9.46 USD ($8.51 a cobrar).");

// 4. Probar normalización de precios de Facebook para accesorios con Córdobas
const normAuriculares = normalizePriceByThreshold(320, "", "Auriculares in-ear QKZ AK6 Negros", "Para computadora y laptop");
assert.strictEqual(normAuriculares.currency, "NIO", "320 sin moneda para auriculares debe inferirse como NIO");
assert.strictEqual(normAuriculares.priceUsd, 8.65, "320 NIO / 37 debe ser $8.65 USD");
assert.strictEqual(normAuriculares.priceNio, 320, "priceNio debe ser 320");
console.log("  ✓ Normalización Facebook: 320 córdobas en auriculares -> $8.65 USD.");

const normJetFan = normalizePriceByThreshold(800, "", "Mini Jet Fan 2 en 1", "Soplador para laptop");
assert.strictEqual(normJetFan.currency, "NIO", "800 sin moneda para jet fan debe inferirse como NIO");
assert.strictEqual(normJetFan.priceUsd, 21.62, "800 NIO / 37 debe ser $21.62 USD");
console.log("  ✓ Normalización Facebook: 800 córdobas en Jet Fan -> $21.62 USD.");

const normAudifonos = normalizePriceByThreshold(350, "", "Audífonos Inalámbricos Bluetooth TWS", "Para computadora");
assert.strictEqual(normAudifonos.currency, "NIO", "350 sin moneda para audífonos debe inferirse como NIO");
assert.strictEqual(normAudifonos.priceUsd, 9.46, "350 NIO / 37 debe ser $9.46 USD");
console.log("  ✓ Normalización Facebook: 350 córdobas en audífonos -> $9.46 USD.");

// 5. Probar que Hardware Real de Alta Gama sigue clasificándose como USD
const predator = new RewardModel({
  id: "REW-HELIOS",
  title: "Laptop Acer Predator Helios Neo 14",
  description: "Laptop gamer RTX 4060 con Intel Core Ultra 7",
  priceUsd: 1100,
  rewardType: "PARTIAL_DISCOUNT",
  maxDiscountPct: 10
});

assert.strictEqual(predator.priceUsd, 1100, "Laptop Predator debe conservar $1100 USD");
assert.strictEqual(predator.cashToPayUsd, 990, "Efectivo a pagar debe ser $990 USD");
assert.strictEqual(predator.pointsCost, 5500, "Puntos requeridos deben ser 5500 WP");
console.log("  ✓ Laptop Acer Predator Helios preserva $1100 USD ($990 a cobrar, 5500 WP).");

const normHelios = normalizePriceByThreshold(1100, "", "Acer Predator Helios Neo 14", "Laptop Gamer");
assert.strictEqual(normHelios.currency, "USD", "1100 para Laptop Predator Helios debe inferirse como USD");
assert.strictEqual(normHelios.priceUsd, 1100, "priceUsd debe ser 1100");
console.log("  ✓ Normalización Facebook: Laptop Acer Predator Helios se clasifica en USD ($1,100).");

console.log("\n=================================================");
console.log("TODAS LAS PRUEBAS DE PRECIOS Y HEURÍSTICA PASARON (100%)");
console.log("=================================================\n");
