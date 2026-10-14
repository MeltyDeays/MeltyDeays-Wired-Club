import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN EXTRACCIÓN Y LIMPIEZA DE MARCA");
console.log("=================================================");

const root = process.cwd();
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");

// Extraer la función detectProductBrand del script usando una envoltura
const fnMatch = contentScript.match(/function detectProductBrand\(product\) \{([\s\S]*?)\n\}\n\n\/\*\*/);
assert(fnMatch, "detectProductBrand debe estar definida en content-script.js");

const detectProductBrand = new Function("product", fnMatch[1]);

// Test 1: Marca explícita en el objeto
const p1 = { brand: "GameSir", title: "Control GameSir X5 Lite" };
assert.strictEqual(detectProductBrand(p1), "GameSir", "Debe retornar marca explícita");
console.log("  ✓ Test 1: Marca explícita en product.brand validada.");

// Test 2: Mención en el título (TP-Link)
const p2 = { title: "Repetidor TP-LINK RE315 AC1200 Extensor Wi-Fi" };
assert.strictEqual(detectProductBrand(p2), "TP-Link", "Debe extraer TP-Link del título");
console.log("  ✓ Test 2: Extracción de TP-Link desde el título validada.");

// Test 3: Mención en el título (Acer Predator)
const p3 = { title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070" };
assert.strictEqual(detectProductBrand(p3), "Acer", "Debe extraer Acer del título");
console.log("  ✓ Test 3: Extracción de Acer/Predator desde el título validada.");

// Test 4: Mención en el título (Anker)
const p4 = { title: "Grip / Power Bank Gaming Anker PowerCore 10000" };
assert.strictEqual(detectProductBrand(p4), "Anker", "Debe extraer Anker del título");
console.log("  ✓ Test 4: Extracción de Anker desde el título validada.");

// Test 5: Mando Windchaser -> DEBE SER "Windchaser"
const p5 = { title: "Mando Windchaser PLUS Youth Edition", description: "Control inalámbrico multiplataforma" };
assert.strictEqual(detectProductBrand(p5), "Windchaser", "Mando Windchaser debe devolver 'Windchaser'");
console.log("  ✓ Test 5: Mando Windchaser asigna correctamente marca 'Windchaser'.");

// Test 5b: Mando Windchaser con descripción compatible con Nintendo Switch -> DEBE SER "Windchaser" (NO Nintendo)
const p5b = { title: "Mando Windchaser PLUS Youth Edition", description: "Compatible con Nintendo Switch, PC, iOS y Android." };
assert.strictEqual(detectProductBrand(p5b), "Windchaser", "Mando Windchaser debe devolver 'Windchaser' y no confundirse con Nintendo Switch");
console.log("  ✓ Test 5b: Mando Windchaser no se confunde con 'Nintendo' pese a compatibilidad en descripción.");

// Test 6: Genérico sin marca (Mini Jet Fan) -> DEBE SER VACÍO ""
const p6 = { title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil", description: "Mini turbina portátil 2 en 1" };
assert.strictEqual(detectProductBrand(p6), "", "Genérico Mini Jet Fan debe devolver vacío ''");
console.log("  ✓ Test 6: Genérico Mini Jet Fan devuelve campo vacío ('').");

// Test 7: Compatibilidad ("para Nintendo Switch") -> NO debe asignar Nintendo a un accesorio genérico
const p7 = { title: "Funda de silicón rígida para Nintendo Switch OLED", description: "Protector contra caídas compatible con Nintendo Switch" };
assert.strictEqual(detectProductBrand(p7), "", "Funda para Nintendo Switch debe limpiar compatibilidad y devolver vacío");
console.log("  ✓ Test 7: Limpiador de compatibilidad descarta marca falsa ('para Nintendo').");

// Test 8: Consola genuina ("Nintendo Switch OLED") -> DEBE asignar Nintendo
const p8 = { title: "Consola Nintendo Switch OLED 64GB Edición White", description: "Consola de videojuegos portátil" };
assert.strictEqual(detectProductBrand(p8), "Nintendo", "Consola genuina debe extraer Nintendo");
console.log("  ✓ Test 8: Consola genuina asigna marca oficial 'Nintendo'.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE MARCA PASARON AL 100%");
console.log("=================================================");
