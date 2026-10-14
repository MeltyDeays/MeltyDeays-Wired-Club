import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN FORMATO DE TÍTULOS CON EMOJIS");
console.log("=================================================");

const root = process.cwd();
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");

// Extraer la función formatCatchyMarketplaceTitle
const fnMatch = contentScript.match(/function formatCatchyMarketplaceTitle\(rawTitle = "", category = "", description = ""\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction triggerAutoFillPipeline/);
assert(fnMatch, "formatCatchyMarketplaceTitle debe estar definida en content-script.js");

const formatCatchyMarketplaceTitle = new Function("rawTitle", "category", "description", fnMatch[1]);

// Test 1: Mando Gamer (🎮 ... 🕹️✨)
const t1 = formatCatchyMarketplaceTitle("Mando Windchaser PLUS Youth Edition", "Videojuegos", "");
assert.strictEqual(t1, "🎮 Mando Windchaser PLUS Youth Edition 🕹️✨", "Mando debe formatearse con 🎮 y 🕹️✨");
console.log("  ✓ Test 1: Mando Gamer formateado correctamente:", t1);

// Test 2: Mini Jet Fan / Turbina (🔥 ... 🌪️✨)
const t2 = formatCatchyMarketplaceTitle("Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil", "Electrónica", "");
assert.strictEqual(t2, "🔥 Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil 🌪️✨", "Jet Fan debe formatearse con 🔥 y 🌪️✨");
console.log("  ✓ Test 2: Mini Jet Fan / Turbina formateado correctamente:", t2);

// Test 3: Power Bank / Batería (🔋 ... ⚡)
const t3 = formatCatchyMarketplaceTitle("Grip / Power Bank Gaming Anker PowerCore Play 6K", "Accesorios", "");
assert.strictEqual(t3, "🔋 Grip / Power Bank Gaming Anker PowerCore Play 6K ⚡", "Power Bank debe formatearse con 🔋 y ⚡");
console.log("  ✓ Test 3: Power Bank / Batería formateado correctamente:", t3);

// Test 4: Repetidor Wi-Fi (📶 ... 🌐⚡)
const t4 = formatCatchyMarketplaceTitle("Repetidor TP-LINK RE315 AC1200", "Redes", "Extensor Wi-Fi");
assert.strictEqual(t4, "📶 Repetidor TP-LINK RE315 AC1200 🌐⚡", "Repetidor debe formatearse con 📶 y 🌐⚡");
console.log("  ✓ Test 4: Repetidor Wi-Fi formateado correctamente:", t4);

// Test 5: Laptop Gamer Bestia (⚡ ... ⚡)
const t5 = formatCatchyMarketplaceTitle("¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070", "Laptops", "");
assert.strictEqual(t5, "⚡ ¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 ⚡", "Laptop gamer debe formatearse con ⚡");
console.log("  ✓ Test 5: Laptop Gamer formateada correctamente:", t5);

// Test 6: Título que ya tiene emojis (no duplicar)
const t6 = formatCatchyMarketplaceTitle("🔥 Mini Jet Fan 2 en 1 🌪️✨", "Electrónica", "");
assert.strictEqual(t6, "🔥 Mini Jet Fan 2 en 1 🌪️✨", "No debe duplicar emojis si ya tiene");
console.log("  ✓ Test 6: Preservación de emojis existentes sin duplicación validada:", t6);

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE TÍTULOS CON EMOJIS PASARON AL 100%");
console.log("=================================================");
