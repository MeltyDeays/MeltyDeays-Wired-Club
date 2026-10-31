/**
 * TEST SUITE: MODAL DE ESPECIFICACIONES PRECIO PLANO, MODAL MARCAR VENDIDO Y FILTRO DE PROFANIDAD
 */
import { hasProfanity, cleanProfanity, validateCommunityText } from "../js/utils/ProfanityFilter.js";
import { RewardModel } from "../js/models/RewardModel.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${message}`);
  }
}

console.log("======================================================================");
console.log("  SUITE: MODAL PRECIO PLANO, VENTA EXTERNA Y FILTRO DE PROFANIDAD     ");
console.log("======================================================================");

// -----------------------------------------------------------------------------
// SECCIÓN 1: Filtro de Moderación y Palabras Ofensivas
// -----------------------------------------------------------------------------
console.log("\n[GRUPO 1] Filtro de Moderación y Lenguaje Ofensivo");

// Casos limpios permitidos
assert(hasProfanity("¿Tienen stock disponible de este reloj para entrega inmediata?") === false, "Consulta normal no es detectada como profanidad");
assert(hasProfanity("Buenas tardes, ¿qué garantía tiene este producto?") === false, "Pregunta educada pasa el filtro");
assert(hasProfanity("Excelente producto, lo recomiendo mucho a la comunidad") === false, "Comentario positivo pasa el filtro");

// Casos con malas palabras directas
assert(hasProfanity("este producto es una mierda") === true, "Detecta 'mierda'");
assert(hasProfanity("vendedor hijo de puta") === true, "Detecta 'hijo de puta'");
assert(hasProfanity("que pendejo el que compre esto") === true, "Detecta 'pendejo'");
assert(hasProfanity("vaya a la verga") === true, "Detecta 'verga'");
assert(hasProfanity("cerote") === true, "Detecta 'cerote'");
assert(hasProfanity("this shit is broken fuck you") === true, "Detecta profanidades en inglés");

// Casos con leetspeak y ofuscación
assert(hasProfanity("m1erd4") === true, "Detecta leetspeak 'm1erd4'");
assert(hasProfanity("p.u.t.a") === true, "Detecta 'p.u.t.a' con puntos intermedios");
assert(hasProfanity("p*t@") === true, "Detecta 'p*t@' con arroba y asterisco");
assert(hasProfanity("puuuuutaaaaa") === true, "Detecta repetición de letras 'puuuuutaaaaa'");
assert(hasProfanity("v3rg4") === true, "Detecta 'v3rg4'");

// Validación formal
const validRes = validateCommunityText("¿Viene con cargador incluido?", "pregunta");
assert(validRes.valid === true, "validateCommunityText aprueba consulta limpia");

const invalidRes = validateCommunityText("eres un estúpido idiota", "pregunta");
assert(invalidRes.valid === false, "validateCommunityText rechaza insultos con mensaje amigable");

// Censura limpia
const censored = cleanProfanity("vaya a la verga");
assert(censored.includes("****") || censored.includes("v***"), "cleanProfanity reemplaza con asteriscos");

// -----------------------------------------------------------------------------
// SECCIÓN 2: Invariantes de Producto con Precio Plano Oficial
// -----------------------------------------------------------------------------
console.log("\n[GRUPO 2] Invariantes de Producto con Precio Plano Oficial (0 WP)");

const flatProd = new RewardModel({
  id: "REW-VTFEP8",
  title: "Mouse Gamer Inalámbrico Attack Shark X3 (Tri-Mode)",
  priceUsd: 50.00,
  priceNio: 1850,
  maxDiscountPct: 0,
  pointsCost: 0,
  status: "ACTIVE",
  rewardType: "PARTIAL_DISCOUNT"
});

assert(flatProd.isPartialDiscount() === true, "Producto comercial es reconocido como PARTIAL_DISCOUNT");
assert(flatProd.priceUsd === 50.00, "Precio regular en USD se preserva en $50.00");
assert(flatProd.cashToPayUsd === 50.00, "Efectivo a pagar coincide con precio regular");
assert(flatProd.maxDiscountPct === 0, "Tope de descuento es exactamente 0%");
assert(flatProd.pointsCost === 0, "Costo en puntos es exactamente 0 WP");

// Simulación de lógica de cálculo en modal de especificaciones para precio plano
const userPts = 500;
const rawMaxPct = flatProd.maxDiscountPct;
const maxPct = Number(rawMaxPct || 0);
const isCombo = flatProd.rewardType === "COMBO";
const isPartial = flatProd.isPartialDiscount();
const isFlatPrice = isPartial && !isCombo && (maxPct === 0 || flatProd.pointsCost === 0);

assert(isFlatPrice === true, "isFlatPrice se evalúa correctamente como true para precio plano");

const maxCapPts = isFlatPrice ? 0 : (flatProd.pointsCost > 0 ? flatProd.pointsCost : 10);
const maxUsable = isFlatPrice ? 0 : Math.min(userPts, maxCapPts);

assert(maxCapPts === 0, "maxCapPts para producto plano es exactamente 0 (neutraliza slider)");
assert(maxUsable === 0, "maxUsable para producto plano es exactamente 0 (no permite aplicar WP)");

console.log("======================================================================");
console.log(`TOTAL PRUEBAS: ${passed + failed} | APROBADAS: ${passed} | FALLIDAS: ${failed}`);
console.log("======================================================================");

if (failed > 0) process.exit(1);
