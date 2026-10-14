import assert from "node:assert";

function isListingAvailable(textContent, lines) {
  if (!textContent) return false;
  const lower = textContent.toLowerCase();

  if (lower.includes("marcar como disponible") || lower.includes("mark as available")) {
    return false;
  }

  for (const line of lines) {
    const l = line.toLowerCase().trim();
    if (/^(vendido|agotado|sold|out of stock)(\s*·|\s*$)/i.test(l)) {
      return false;
    }
    if (l === "vendido fuera de facebook" || l === "vendido en facebook") {
      return false;
    }
  }

  const hasAvailableIndicator = lines.some(line => {
    const l = line.toLowerCase().trim();
    return /^(disponible|activo|en stock|in stock|active|available)(\s*·|\s*$)/i.test(l) ||
           l.includes("marcar como agotado") ||
           l.includes("marcar como vendido") ||
           l.includes("mark as sold") ||
           l.includes("mark as out of stock");
  });

  return hasAvailableIndicator;
}

function isListingSold(textContent, lines) {
  if (!textContent) return false;
  const lower = textContent.toLowerCase();

  if (
    lower.includes("marcar como vendido") ||
    lower.includes("marcar como agotado") ||
    lower.includes("mark as sold") ||
    lower.includes("mark as out of stock") ||
    lower.includes("marcar como pendiente") ||
    lower.includes("mark as pending")
  ) {
    return false;
  }

  if (lower.includes("marcar como disponible") || lower.includes("mark as available")) {
    return true;
  }

  for (const line of lines) {
    const l = line.toLowerCase().trim();
    if (/^(vendido|agotado|sold|out of stock)(\s*·|\s*$)/i.test(l) && !l.includes("marcar como")) {
      return true;
    }
    if (l === "vendido fuera de facebook" || l === "vendido en facebook" || l === "marcado como vendido" || l === "marcado como agotado") {
      return true;
    }
  }

  return false;
}

console.log("Iniciando pruebas de detección de vendidos y disponibles en Marketplace...");

// Caso 1: Publicación activa típica en español con botón "Marcar como vendido"
const activeListingText1 = `🔥 Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil\nC$ 850\nPublicado el 29 de septiembre de 2026\nMarcar como vendido\nCompartir`;
const activeLines1 = activeListingText1.split("\n");
assert.strictEqual(isListingAvailable(activeListingText1, activeLines1), true, "Debe ser disponible");
assert.strictEqual(isListingSold(activeListingText1, activeLines1), false, "NO debe considerarse vendida");

// Caso 2: Publicación activa con botón "Marcar como agotado"
const activeListingText2 = `Repetidor TP-LINK RE315 AC1200\nC$ 850\nActivo\nMarcar como agotado`;
const activeLines2 = activeListingText2.split("\n");
assert.strictEqual(isListingAvailable(activeListingText2, activeLines2), true, "Debe ser disponible");
assert.strictEqual(isListingSold(activeListingText2, activeLines2), false, "NO debe considerarse vendida");

// Caso 3: Publicación realmente vendida con botón "Marcar como disponible"
const soldListingText1 = `Mando Windchaser PLUS\nC$ 650\nVendido · Hace 3 días\nMarcar como disponible`;
const soldLines1 = soldListingText1.split("\n");
assert.strictEqual(isListingAvailable(soldListingText1, soldLines1), false, "NO debe ser disponible");
assert.strictEqual(isListingSold(soldListingText1, soldLines1), true, "Debe considerarse vendida");

// Caso 4: Publicación con estado "Vendido fuera de Facebook"
const soldListingText2 = `Grip Power Bank Gaming Anker\nC$ 750\nVendido fuera de Facebook`;
const soldLines2 = soldListingText2.split("\n");
assert.strictEqual(isListingAvailable(soldListingText2, soldLines2), false, "NO debe ser disponible");
assert.strictEqual(isListingSold(soldListingText2, soldLines2), true, "Debe considerarse vendida");

console.log("✓ Todos los casos de detección de disponibilidad y vendidos pasaron exitosamente.");
