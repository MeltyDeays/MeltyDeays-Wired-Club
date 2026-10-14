import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN ESCANEO DE LISTA COMPLETA EN FACEBOOK");
console.log("=================================================");

// Mock de DOM Elements
class MockElement {
  constructor(tagName, text = "", attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.innerText = text;
    this.children = [];
    this.parentElement = null;
    this.attrs = attrs;
  }

  getAttribute(name) {
    return this.attrs[name] || null;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const ch of node.children) {
        let match = false;
        if (selector === "img" && ch.tagName === "IMG") match = true;
        else if (selector === "a" && ch.tagName === "A") match = true;
        else if (selector === "a[href]" && ch.tagName === "A" && ch.getAttribute("href")) match = true;
        else if (selector.includes('role="button"') && ch.getAttribute("role") === "button") match = true;
        else if (selector.includes('role="dialog"') && ch.getAttribute("role") === "dialog") match = true;
        else if (selector.includes("button") && (ch.tagName === "BUTTON" || ch.getAttribute("role") === "button")) match = true;

        if (match) results.push(ch);
        walk(ch);
      }
    };
    walk(this);
    return results;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement("body");
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const ch of node.children) {
        let match = false;
        if (selector.includes('role="button"') && ch.getAttribute("role") === "button") match = true;
        else if (selector.includes('role="dialog"') && ch.getAttribute("role") === "dialog") match = true;
        else if (selector.includes("button") && (ch.tagName === "BUTTON" || ch.getAttribute("role") === "button")) match = true;
        else if (selector.includes("span") && ch.tagName === "SPAN") match = true;
        else if (selector.includes("div") && ch.tagName === "DIV") match = true;
        else if (selector.includes("a[href") && ch.tagName === "A" && ch.getAttribute("href")) match = true;

        if (match) results.push(ch);
        walk(ch);
      }
    };
    walk(this.body);
    return results;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }
}

// Construir el árbol emulando la captura exacta del usuario (con barra lateral de Facebook)
const doc = new MockDocument();

// 1. Barra lateral izquierda de navegación en Facebook
const sidebar = doc.body.appendChild(new MockElement("div", "Marketplace\nVenta\nPanel para vendedores\nTus publicaciones\nAvisos"));
sidebar.appendChild(new MockElement("a", "Tus publicaciones", { href: "/marketplace/you/selling?state=LIVE" }));

// 2. Contenedor principal con encabezado y tabla de productos
const main = doc.body.appendChild(new MockElement("div", ""));
main.appendChild(new MockElement("h1", "Tus publicaciones"));

const table = main.appendChild(new MockElement("div", "", { class: "marketplace-table" }));

const productsData = [
  {
    title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo)",
    price: "C$800 C$1.100",
    status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 54 clics",
    action: "Marcar como agotado"
  },
  {
    title: "🔥 Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en caja)",
    price: "C$1.350 C$1.650",
    status: "Activo · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 151 clics",
    action: "Marcar como vendido"
  },
  {
    title: "👾 Grip / Power Bank Gaming Anker PowerCore Play 6K ⚡",
    price: "C$650 C$950",
    status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 60 clics",
    action: "Marcar como agotado"
  },
  {
    title: "Repetidor TP-LINK RE315 AC1200",
    price: "C$850 C$1.000",
    status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 41 clics",
    action: "Marcar como agotado"
  },
  {
    title: "Mando Windchaser PLUS Youth Edition",
    price: "C$750 C$900",
    status: "Disponible · Publicado el 22/9\nPublicado en Marketplace y al menos 1 grupo · 156 clics",
    action: "Marcar como agotado"
  },
  {
    title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7 ⚡",
    suggestion: "💡 Sugerencia: ¿Renovar la publicación?",
    price: "C$1.100 C$1.250",
    status: "Disponible · Publicado el 29/7\nPublicado en Marketplace y al menos 1 grupo · 19 clics",
    action: "Marcar como agotado"
  }
];

productsData.forEach(p => {
  const card = table.appendChild(new MockElement("div", ""));
  card.appendChild(new MockElement("img", "", { src: "https://fbcdn.net/thumb.jpg" }));
  
  const textContent = `${p.suggestion ? p.suggestion + "\n" : ""}${p.title}\n${p.price}\n${p.status}\n${p.action}\nPromocionar\nCompartir`;
  card.innerText = textContent;

  const btnCol = card.appendChild(new MockElement("div", ""));
  btnCol.appendChild(new MockElement("div", p.action, { role: "button" }));
  btnCol.appendChild(new MockElement("div", "Promocionar", { role: "button" }));
  btnCol.appendChild(new MockElement("div", "Compartir", { role: "button" }));
});

// Mock environment
global.window = { location: { href: "https://www.facebook.com/marketplace/you/selling?state=LIVE" } };
global.document = doc;
global.chrome = { runtime: { id: "test-id" } };

// Algoritmo refinado
function normalizeTitle(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function computeTitleSimilarity(strA, strB) {
  const normA = normalizeTitle(strA);
  const normB = normalizeTitle(strB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  const wordsA = new Set(normA.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let inter = 0;
  for (const w of wordsA) if (wordsB.has(w)) inter++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? (inter / union) : 0;
}

function extractCleanPrice(rawText) {
  if (!rawText) return "";
  // Buscar formatos de precio único: "C$ 800", "C$800", "$25", "US$ 25", "800 NIO", "1.350"
  const m = rawText.match(/(?:C\$|\$|US\$)\s*\d{1,3}(?:[.,]\d{3})*(?:\.\d{1,2})?|\b\d{1,3}(?:[.,]\d{3})*(?:\.\d{1,2})?\s*(?:NIO|USD)\b/i);
  if (m) {
    return m[0].trim();
  }
  const fallback = rawText.match(/\b\d{2,}(?:[.,]\d{3})*\b/);
  if (fallback) {
    if (rawText.includes("C$")) return `C$ ${fallback[0]}`;
    if (rawText.includes("$")) return `$ ${fallback[0]}`;
    return fallback[0];
  }
  return rawText.trim();
}

function isNoiseLine(line) {
  if (!line) return true;
  const l = line.toLowerCase().trim();
  if (l.length < 3) return true;
  if (l.includes("$") || l.includes("c$") || l.includes("nio")) return true;
  if (/^\d+(\.\d+)?$/.test(l)) return true;
  return (
    l.includes("marcar como") ||
    l.includes("mark as") ||
    l.includes("promocionar") ||
    l.includes("boost") ||
    l.includes("compartir") ||
    l.includes("share") ||
    l.includes("publicado") ||
    l.includes("publicada") ||
    l.includes("publicaciones") ||
    l.includes("publicacion") ||
    l.includes("clics en") ||
    l.includes("activo") ||
    l.includes("disponible") ||
    l.includes("agotado") ||
    l.includes("vendido") ||
    l.includes("revisando") ||
    l.includes("sugerencia") ||
    l.includes("renovar") ||
    l.includes("mensajes") ||
    l.includes("comentarios") ||
    l.includes("estadísticas") ||
    l.includes("estadisticas") ||
    l.includes("editar") ||
    l.includes("eliminar") ||
    l.includes("más información") ||
    l.includes("mas informacion") ||
    l.includes("vendedores") ||
    l.includes("mantén") ||
    l.includes("manten") ||
    l.includes("buscar en")
  );
}

const cachedWebProducts = [
  { id: "jet_fan", title: "Mini Jet Fan 2 en 1", facebookListingId: "1198273641889021", priceNio: 800, imageUrl: "data:image/webp;base64,JETFAN" },
  { id: "gamesir_x5", title: "GameSir X5 Lite", facebookListingId: "1198273641889022", priceNio: 1350, imageUrl: "data:image/webp;base64,GAMESIR" },
  { id: "anker_play", title: "Anker PowerCore Play 6K", facebookListingId: "1198273641889023", priceNio: 650, imageUrl: "data:image/webp;base64,ANKER" },
  { id: "tplink_re315", title: "Repetidor TP-LINK RE315", facebookListingId: "1198273641889024", priceNio: 850, imageUrl: "data:image/webp;base64,TPLINK" },
  { id: "windchaser_mando", title: "Mando Windchaser PLUS", facebookListingId: "1198273641889025", priceNio: 750, imageUrl: "data:image/webp;base64,WINDCHASER" },
  { id: "acer_predator", title: "Acer Predator Helios Neo 14", facebookListingId: "1198273641889026", priceNio: 1100, imageUrl: "data:image/webp;base64,PREDATOR" }
];

function getScannableListings() {
  const listings = [];
  const seenTitles = new Set();
  const seenIds = new Set();

  function extractListingDataFromElement(container, defaultId = null) {
    if (!container) return null;
    const textContent = container.innerText || "";
    if (textContent.length < 15 || textContent.length > 3000) return null;

    const rawLines = textContent.split("\n").map(l => l.trim()).filter(Boolean);
    const rawPriceLine = rawLines.find(l => l.includes("$") || l.includes("C$") || l.includes("NIO") || /^\d{2,}\.?\d{0,3}$/.test(l)) || "";
    const priceLine = extractCleanPrice(rawPriceLine);

    // Extraer candidatos a título descartando ruido
    const titleCandidates = rawLines.filter(l => !isNoiseLine(l));
    let fbTitle = titleCandidates[0] || "";
    if (!fbTitle || fbTitle.length < 4) return null;

    const normKey = normalizeTitle(fbTitle);
    if (seenTitles.has(normKey)) return null;

    let fbListingId = defaultId;
    if (!fbListingId) {
      const allLinks = Array.from(container.querySelectorAll("a[href]"));
      for (const a of allLinks) {
        const href = a.getAttribute("href") || "";
        const m = href.match(/(?:listing_id=|item\/|\/items\/|item_id=)(\d{10,})/i) || href.match(/(\d{10,})/);
        if (m && m[1]) {
          fbListingId = m[1];
          break;
        }
      }
    }

    if (!fbListingId && Array.isArray(cachedWebProducts)) {
      const match = cachedWebProducts.find(p => 
        computeTitleSimilarity(p.title, fbTitle) >= 0.55 ||
        (p.title && fbTitle.toLowerCase().includes(p.title.toLowerCase().slice(0, 12)))
      );
      if (match && match.facebookListingId) {
        fbListingId = String(match.facebookListingId);
      }
    }

    if (fbListingId && seenIds.has(fbListingId)) return null;

    seenTitles.add(normKey);
    if (fbListingId) seenIds.add(fbListingId);

    const imgEl = container.querySelector("img");

    return {
      element: container,
      link: container.querySelector("a"),
      fbListingId,
      fbTitle,
      textContent,
      lines: rawLines,
      priceLine,
      imgEl
    };
  }

  // 1. Detección precisa por botones de acción de fila (aislando cada tarjeta sin englobar la tabla)
  const actionButtons = Array.from(document.querySelectorAll('div[role="button"], button, span, div')).filter(el => {
    if (el.children.length > 2) return false;
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return txt === "promocionar" || txt.startsWith("marcar como") || txt === "boost listing" || txt.startsWith("mark as");
  });

  const processedCards = new Set();

  for (const btn of actionButtons) {
    let curr = btn;
    let bestCard = null;

    while (curr && curr !== document.body) {
      curr = curr.parentElement;
      if (!curr) break;

      const txt = curr.innerText || "";
      const promoMatches = (txt.match(/promocionar|boost/gi) || []).length;
      const markMatches = (txt.match(/marcar como|mark as/gi) || []).length;

      // DETENCIÓN ESTRICTA: Si este contenedor tiene más de 1 acción de fila, significa que ya es la tabla completa!
      if (promoMatches > 1 || markMatches > 1) {
        break;
      }

      const hasPrice = txt.includes("$") || txt.includes("C$") || txt.includes("NIO");
      const hasImg = Boolean(curr.querySelector("img"));

      if (hasPrice && hasImg && txt.length < 2500) {
        bestCard = curr;
      }
    }

    if (bestCard && !processedCards.has(bestCard)) {
      processedCards.add(bestCard);
      const data = extractListingDataFromElement(bestCard);
      if (data) listings.push(data);
    }
  }

  // 2. Si hay modal abierto
  const dialog = document.querySelector('div[role="dialog"]');
  if (dialog) {
    const dialogTxt = dialog.innerText || "";
    if (dialogTxt.includes("Tu publicación") || dialogTxt.includes("Editar publicación") || dialogTxt.includes("Eliminar publicación")) {
      const data = extractListingDataFromElement(dialog);
      if (data && !seenTitles.has(normalizeTitle(data.fbTitle))) {
        listings.push(data);
      }
    }
  }

  return listings;
}

const results = getScannableListings();

console.log(`Detectadas ${results.length} publicaciones de la pantalla:`);
results.forEach((r, idx) => {
  console.log(`  [${idx + 1}] "${r.fbTitle}" | Precio limpio: "${r.priceLine}" | ID: ${r.fbListingId}`);
});

// Aserciones
assert.strictEqual(results.length, 6, "Debe detectar exactamente las 6 publicaciones presentes en la pantalla");
assert(!results.some(r => r.fbTitle.toLowerCase().includes("tus publicaciones")), "NUNCA debe incluir 'Tus publicaciones' como producto");

const jetFan = results.find(r => r.fbTitle.includes("Mini Jet Fan"));
assert(jetFan, "Debe incluir Mini Jet Fan");
assert.strictEqual(jetFan.priceLine, "C$800", "Debe limpiar el precio de Jet Fan a 'C$800' descartando el precio tachado C$1.100");

const gameSir = results.find(r => r.fbTitle.includes("GameSir X5"));
assert(gameSir, "Debe incluir GameSir X5");
assert.strictEqual(gameSir.priceLine, "C$1.350", "Debe limpiar el precio de GameSir a 'C$1.350' descartando C$1.650 tachado");

console.log("  ✓ Test 1: Las 6 publicaciones fueron detectadas individualmente sin colisión.");
console.log("  ✓ Test 2: 'Tus publicaciones' (sidebar y header) fue 100% ignorado.");
console.log("  ✓ Test 3: Precios con descuento fueron normalizados al precio activo real de Facebook.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE ESCANEO DE LISTA PASARON AL 100%");
console.log("=================================================");
