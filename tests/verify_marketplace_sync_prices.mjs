import assert from "node:assert";
import { parseMarketplacePrice, normalizePriceByThreshold, roundToCleanNio } from "../js/utils/PriceNormalizer.js";

console.log("🚀 Iniciando suite de pruebas: Sincronización Canónica de Precios Facebook <-> Web...");

// ==========================================
// 1. Verificación de Extracción y Parsing de Precios
// ==========================================
const priceCases = [
  { raw: "C$800 C$1.100", expected: 800 },
  { raw: "C$1.350 C$1.650", expected: 1350 },
  { raw: "C$650 C$950", expected: 650 },
  { raw: "C$850 C$1.000", expected: 850 },
  { raw: "C$750 C$900", expected: 750 },
  { raw: "C$1.100 C$1.250", expected: 1100 },
  { raw: "C$ 1,350", expected: 1350 },
  { raw: "C$ 850", expected: 850 },
  { raw: "$25.50", expected: 25.5 },
  { raw: "US$ 1,100", expected: 1100 },
  { raw: "$1100", expected: 1100 },
  { raw: "$8.64", expected: 8.64 },
  { raw: "1350", expected: 1350 },
  { raw: "850", expected: 850 },
  { raw: "C$ 40,700 C$ 45.000", expected: 40700 },
  { raw: "C$ 40.700", expected: 40700 },
  { raw: "C$1.000", expected: 1000 },
  { raw: "C$ 999", expected: 999 }
];

priceCases.forEach(({ raw, expected }) => {
  const parsed = parseMarketplacePrice(raw);
  assert.strictEqual(parsed, expected, `Fallo en parseMarketplacePrice("${raw}"): esperado ${expected}, obtenido ${parsed}`);
});
console.log("✓ Test 1 superado: Parsing exacto de precios latinos y descuento con tachado.");

// ==========================================
// 2. Normalización Bimoneda Canónica
// ==========================================
// Caso A: Repetidor TP-LINK RE315 (C$ 850 -> $22.97 USD)
const tplink = normalizePriceByThreshold("C$850 C$1.000", "NIO", "Repetidor TP-LINK RE315 AC1200");
assert.strictEqual(tplink.priceNio, 850);
assert.strictEqual(tplink.priceUsd, 22.97);

// Caso B: Control Gamer GameSir X5 (C$ 1.350 -> $36.49 USD)
const gamesir = normalizePriceByThreshold("C$1.350 C$1.650", "NIO", "Control Gamer GameSir X5 Lite Type-C");
assert.strictEqual(gamesir.priceNio, 1350);
assert.strictEqual(gamesir.priceUsd, 36.49);

// Caso C: Anker Power Bank Grip (C$ 650 -> $17.57 USD)
const anker = normalizePriceByThreshold("C$650 C$950", "NIO", "Grip / Power Bank Gaming Anker PowerCore Play 6K");
assert.strictEqual(anker.priceNio, 650);
assert.strictEqual(anker.priceUsd, 17.57);

// Caso D: Mando Windchaser (C$ 750 -> $20.27 USD)
const mando = normalizePriceByThreshold("C$750 C$900", "NIO", "Mando Windchaser PLUS Youth Edition");
assert.strictEqual(mando.priceNio, 750);
assert.strictEqual(mando.priceUsd, 20.27);

// Caso E: Mini Jet Fan (C$ 800 -> $21.62 USD)
const fan = normalizePriceByThreshold("C$800 C$1.100", "NIO", "Mini Jet Fan 2 en 1");
assert.strictEqual(fan.priceNio, 800);
assert.strictEqual(fan.priceUsd, 21.62);

// Caso F: Acer Predator Helios (Hardware alto valor: 1100 -> $1,100 USD / C$ 40,700 NIO)
const predator = normalizePriceByThreshold("C$1.100 C$1.250", "", "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070");
assert.strictEqual(predator.priceUsd, 1100);
assert.strictEqual(predator.priceNio, 40700);

console.log("✓ Test 2 superado: Normalización bimoneda de accesorios (NIO/37) y hardware alto valor (USD).");

// ==========================================
// 3. Similitud Semántica de Productos (Anti-Mismatch)
// ==========================================
const STOPWORDS = new Set([
  "para", "con", "del", "las", "los", "una", "uno", "por", "que", "nuevo", "nueva",
  "caja", "en", "de", "el", "la", "y", "o", "un", "edicion", "edition", "original",
  "oficial", "garantia", "retirar", "tienda", "gaming", "gamer", "bestia"
]);

function normalizeTitle(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDistinctiveTokens(title) {
  const norm = normalizeTitle(title);
  return norm.split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

function computeProductMatchScore(titleA, titleB) {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.95;

  const tokensA = getDistinctiveTokens(titleA);
  const tokensB = getDistinctiveTokens(titleB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  let common = 0;
  for (const t of tokensA) {
    if (setB.has(t)) common++;
  }

  const minLen = Math.min(tokensA.length, tokensB.length);
  const overlap = minLen > 0 ? (common / minLen) : 0;
  const unionLen = new Set([...tokensA, ...tokensB]).size;
  const jaccard = unionLen > 0 ? (common / unionLen) : 0;

  const strongTokensA = tokensA.filter(t => /\d/.test(t) || t.length >= 5);
  const strongCommon = strongTokensA.filter(t => setB.has(t)).length;
  const hasStrongMatch = strongCommon >= 2 || (strongTokensA.length > 0 && strongCommon === strongTokensA.length);

  return Math.max(overlap, jaccard, hasStrongMatch ? 0.85 : 0);
}

// Comprobaciones de emparejamiento entre Facebook y Firestore
const matchPairs = [
  { fb: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portatil (Nuevo en Caja)", web: "🔥 Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo en Caja) 🌪️✨", shouldMatch: true },
  { fb: "Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en Caja)", web: "🔥 Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en Caja) 🎮✨", shouldMatch: true },
  { fb: "Grip / Power Bank Gaming Anker PowerCore Play 6K", web: "🎮 Grip / Power Bank Gaming Anker PowerCore Play 6K 🔋📦", shouldMatch: true },
  { fb: "Repetidor TP-LINK RE315 AC1200", web: "Repetidor TP-LINK RE315 AC1200", shouldMatch: true },
  { fb: "Mando Windchaser PLUS Youth Edition", web: "Mando Windchaser PLUS YE Hall Effect Verde", shouldMatch: true },
  { fb: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7", web: "Laptop Gamer Acer Predator Helios Neo 14", shouldMatch: true },
  { fb: "Repetidor TP-LINK RE315 AC1200", web: "Control Gamer GameSir X5 Lite", shouldMatch: false },
  { fb: "Mini Jet Fan 2 en 1", web: "Auriculares in-ear QKZ AK6", shouldMatch: false }
];

matchPairs.forEach(({ fb, web, shouldMatch }) => {
  const score = computeProductMatchScore(fb, web);
  const isMatch = score >= 0.70;
  assert.strictEqual(isMatch, shouldMatch, `Emparejamiento incorrecto para "${fb}" <-> "${web}": score=${score}, esperado=${shouldMatch}`);
});

console.log("✓ Test 3 superado: Emparejamiento semántico de gemelos preciso (sin falsos positivos).");

// ==========================================
// 4. Verificación de Invariante de Descuento Parcial
// ==========================================
function calcPartialDiscount(priceUsd, discountPct = 10) {
  const maxDiscUsd = Number((priceUsd * (discountPct / 100)).toFixed(2));
  const cashDueUsd = Number((priceUsd - maxDiscUsd).toFixed(2));
  const pointsCost = Math.max(10, Math.round(maxDiscUsd * 50));
  return { maxDiscUsd, cashDueUsd, pointsCost };
}

const discTest = calcPartialDiscount(22.97, 10);
assert.strictEqual(discTest.maxDiscUsd, 2.30);
assert.strictEqual(discTest.cashDueUsd, 20.67);
assert.strictEqual(discTest.pointsCost, 115); // 2.30 * 50 = 115 WP

console.log("✓ Test 4 superado: Invariante de descuento 1 USD = 50 WP verificado.");

console.log("\n🎉 TODAS LAS PRUEBAS DE SINCRONIZACIÓN DE PRECIOS PASARON EXITOSAMENTE.");
