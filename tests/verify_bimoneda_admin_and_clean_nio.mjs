import assert from "node:assert/strict";
import { roundToCleanNio, normalizePriceByThreshold } from "../js/utils/PriceNormalizer.js";
import { RewardModel } from "../js/models/RewardModel.js";

console.log("▶ Iniciando pruebas de bimoneda y redondeo estético limpio de Córdobas (NIO)...");

// 1. Redondeo estético NIO
assert.equal(roundToCleanNio(999), 1000, "999 NIO debe redondearse limpiamente a 1000 NIO");
assert.equal(roundToCleanNio(747.4), 750, "747.4 NIO debe redondearse a 750 NIO");
assert.equal(roundToCleanNio(319.7), 320, "319.7 NIO debe redondearse a 320 NIO");
assert.equal(roundToCleanNio(348), 350, "348 NIO debe redondearse a 350 NIO");
assert.equal(roundToCleanNio(800), 800, "800 NIO debe mantenerse en 800 NIO");
assert.equal(roundToCleanNio(1480), 1480, "1480 NIO debe mantenerse en 1480 NIO");
console.log("✓ roundToCleanNio aprobado.");

// 2. Normalización de precios de Facebook Marketplace Nicaragua
const repResult = normalizePriceByThreshold(1000, "", "Repetidor TP-LINK RE315 AC1200");
assert.equal(repResult.currency, "NIO");
assert.equal(repResult.priceNio, 1000);
assert.equal(repResult.priceUsd, 27.03);

const ankerResult = normalizePriceByThreshold(750, "", "Grip / Power Bank Gaming Anker PowerCore Play 6K");
assert.equal(ankerResult.currency, "NIO");
assert.equal(ankerResult.priceNio, 750);
assert.equal(ankerResult.priceUsd, 20.27);

const fanResult = normalizePriceByThreshold(800, "", "Mini Jet Fan 2 en 1");
assert.equal(fanResult.currency, "NIO");
assert.equal(fanResult.priceNio, 800);
assert.equal(fanResult.priceUsd, 21.62);

// Hardware de alto valor
const laptopResult = normalizePriceByThreshold(1100, "", "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070");
assert.equal(laptopResult.currency, "USD");
assert.equal(laptopResult.priceUsd, 1100);
assert.equal(laptopResult.priceNio, 40700);
console.log("✓ normalizePriceByThreshold aprobado.");

// 3. RewardModel con priceNio explícito y fallback estético
const m1 = new RewardModel({
  title: "Repetidor TP-Link",
  priceUsd: 27.03,
  priceNio: 1000
});
assert.equal(m1.priceNio, 1000);
assert.equal(m1.priceUsd, 27.03);

const m2 = new RewardModel({
  title: "Repetidor TP-Link sin NIO explícito",
  priceUsd: 27.00
});
assert.equal(m2.priceNio, 1000, "27.00 * 37 = 999 debe auto-redondearse estéticamente a 1000 NIO");

const m3 = new RewardModel({
  title: "Power Bank Anker sin NIO explícito",
  priceUsd: 20.20
});
assert.equal(m3.priceNio, 750, "20.20 * 37 = 747.4 debe auto-redondearse estéticamente a 750 NIO");
console.log("✓ RewardModel con persistencia bimoneda aprobado.");

// 4. Simulación DOM para AdminCatalogCalculatorView
globalThis.document = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id,
        value: "",
        textContent: "",
        innerHTML: "",
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          toggle(c, force) {
            if (force) this.classes.add(c);
            else this.classes.delete(c);
          },
          contains(c) { return this.classes.has(c); }
        },
        focus() {}
      };
    }
    return this.elements[id];
  }
};

const calcView = await import("../js/views/AdminCatalogCalculatorView.js");

// Probar cálculo en Córdobas
const inputUsd = document.getElementById("calc-sale-prod-price-usd");
const inputNio = document.getElementById("calc-sale-prod-price-nio");
const inputPct = document.getElementById("calc-sale-prod-discount-pct");
const hiddenNio = document.getElementById("prod-price-nio");
const discMaxNio = document.getElementById("calc-disc-max-nio");
const cashDueNio = document.getElementById("calc-disc-cash-nio");

inputNio.value = "800";
inputPct.value = "10";
calcView.onAdminPriceNioInput();

assert.equal(inputUsd.value, "21.62", "800 NIO / 37.0 debe calcular 21.62 USD");
assert.equal(hiddenNio.value, 800, "prod-price-nio hidden debe reflejar 800 NIO");
assert.ok(discMaxNio.textContent.includes("80 NIO"), "Descuento en NIO debe reflejar 80 NIO");
assert.ok(cashDueNio.textContent.includes("720 NIO"), "Efectivo en mostrador NIO debe ser 720 NIO");

// Probar cálculo en Dólares
inputUsd.value = "40.00";
inputPct.value = "5";
calcView.onAdminPriceUsdInput();

assert.equal(inputNio.value, 1480, "$40 USD * 37 debe ser 1480 NIO");
assert.equal(hiddenNio.value, 1480, "prod-price-nio hidden debe ser 1480 NIO");

// Probar modo de entrada
calcView.setAdminPriceInputMode("NIO");
assert.ok(document.getElementById("btn-admin-price-mode-nio").classList.contains("active"));
assert.ok(!document.getElementById("btn-admin-price-mode-usd").classList.contains("active"));

console.log("✓ Simulador DOM de AdminCatalogCalculatorView bimoneda aprobado.");
console.log("🎉 Todas las pruebas de bimoneda pasaron satisfactoriamente.");
