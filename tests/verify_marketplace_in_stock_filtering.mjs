import assert from "node:assert";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN FILTRADO DE EN STOCK Y DISPONIBLES EN FACEBOOK");
console.log("=================================================");

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
        else if (selector.includes("span") && ch.tagName === "SPAN") match = true;
        else if (selector.includes("div") && ch.tagName === "DIV") match = true;

        if (match) results.push(ch);
        walk(ch);
      }
    };
    walk(this);
    return results;
  }

  contains(other) {
    let p = other;
    while (p) {
      if (p === this) return true;
      p = p.parentElement;
    }
    return false;
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

// Helper de normalización y precios
function extractCleanPrice(rawText) {
  if (!rawText) return "";
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

/**
 * Determina con precisión si una publicación de Facebook Marketplace está DISPONIBLE/EN STOCK
 * o si ya fue VENDIDA / AGOTADA.
 */
function isListingAvailable(textContent, lines) {
  if (!textContent) return false;
  const lower = textContent.toLowerCase();

  // 1. Si el botón dice "Marcar como disponible", significa que actualmente ESTÁ VENDIDA / AGOTADA
  if (lower.includes("marcar como disponible") || lower.includes("mark as available")) {
    return false;
  }

  // 2. Si alguna línea de estado indica vendido o agotado
  for (const line of lines) {
    const l = line.toLowerCase().trim();
    // Líneas como "Vendido · Publicado...", "Agotado · Publicado...", o palabras aisladas "Vendido", "Agotado"
    if (/^(vendido|agotado|sold|out of stock)(\s*·|\s*$)/i.test(l)) {
      return false;
    }
    if (l === "vendido fuera de facebook" || l === "vendido en facebook") {
      return false;
    }
  }

  // 3. Confirmar que tenga indicador de disponible/activo o que tenga botón para marcarlo como vendido/agotado
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

const cachedWebProducts = [
  { id: "fb_1198273641889021", title: "Mini Jet Fan 2 en 1 | Soplador Turbo", facebookListingId: "1198273641889021", priceNio: 800 },
  { id: "fb_1198273641889022", title: "Control Gamer GameSir X5 Lite Type-C", facebookListingId: "1198273641889022", priceNio: 1350 },
  { id: "fb_1198273641889023", title: "Grip / Power Bank Gaming Anker PowerCore Play 6K", facebookListingId: "1198273641889023", priceNio: 650 },
  { id: "fb_1198273641889024", title: "Repetidor TP-LINK RE315 AC1200", facebookListingId: "1198273641889024", priceNio: 850 },
  { id: "fb_1198273641889025", title: "Mando Windchaser PLUS Youth Edition", facebookListingId: "1198273641889025", priceNio: 750 },
  { id: "fb_1198273641889026", title: "¡BESTIA GAMER! Acer Predator Helios Neo 14", facebookListingId: "1198273641889026", priceNio: 1100 }
];

function createMockDom(options = { isAllFilter: false }) {
  const doc = new MockDocument();

  // Barra lateral
  const sidebar = doc.body.appendChild(new MockElement("div", "Marketplace\nVenta\nPanel para vendedores\nTus publicaciones"));
  sidebar.appendChild(new MockElement("a", "Tus publicaciones", { href: "/marketplace/you/selling" }));

  // Main
  const main = doc.body.appendChild(new MockElement("div", ""));
  main.appendChild(new MockElement("h1", "Tus publicaciones"));
  const table = main.appendChild(new MockElement("div", "", { class: "marketplace-table" }));

  // 6 Productos disponibles (exactos a la captura 5 de Facebook con icono ✔ en los botones)
  const availableItems = [
    {
      title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo)",
      price: "C$800 C$1.100",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 54 clics",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en caja)",
      price: "C$1.350 C$1.650",
      status: "Activo · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 151 clics",
      action: "✔ Marcar como vendido"
    },
    {
      title: "Grip / Power Bank Gaming Anker PowerCore Play 6K ⚡",
      price: "C$650 C$950",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 60 clics",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Repetidor TP-LINK RE315 AC1200",
      price: "C$850 C$1.000",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 41 clics",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Mando Windchaser PLUS Youth Edition",
      price: "C$750 C$900",
      status: "Disponible · Publicado el 22/9\nPublicado en Marketplace y al menos 1 grupo · 156 clics",
      action: "✔ Marcar como agotado",
      hasPromo: true,
      hasShare: true
    },
    {
      title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7 ⚡",
      suggestion: "💡 Sugerencia: ¿Renovar la publicación?",
      price: "C$1.100 C$1.250",
      status: "Disponible · Publicado el 29/7\nPublicado en Marketplace y al menos 1 grupo · 19 clics",
      action: "✔ Marcar como agotado",
      hasPromo: true,
      hasShare: true
    }
  ];

  // Si está en filtro "Todo", añadimos además 5 productos que ya están VENDIDOS o AGOTADOS
  const soldItems = options.isAllFilter ? [
    {
      title: "Mini Soplador Turbo Jet 150,000 RPM | Negro",
      price: "C$35",
      status: "Vendido · Publicado el 12/8\nPublicado en Marketplace · 210 clics",
      action: "Marcar como disponible"
    },
    {
      title: "Batería Portátil Magnética Memory Angle 10000mAh",
      price: "C$15",
      status: "Vendido · Publicado el 05/8\nPublicado en Marketplace · 98 clics",
      action: "Marcar como disponible"
    },
    {
      title: "Linterna de Emergencia Portátil con Panel Solar",
      price: "C$10",
      status: "Agotado · Publicado el 01/8\nPublicado en Marketplace · 45 clics",
      action: "Marcar como disponible"
    },
    {
      title: "Cable Carga Rápida 100W Baseus",
      price: "C$8",
      status: "Vendido fuera de Facebook · Publicado el 20/7\n120 clics",
      action: "Marcar como disponible"
    },
    {
      title: "Funda Silicona Antigolpes iPhone 13",
      price: "C$5",
      status: "Agotado · Publicado el 10/7\n80 clics",
      action: "Marcar como disponible"
    }
  ] : [];

  const allItems = [...availableItems, ...soldItems];

  allItems.forEach(p => {
    const card = table.appendChild(new MockElement("div", "", { class: "user-listing-row" }));
    card.appendChild(new MockElement("img", "", { src: "https://fbcdn.net/thumb.jpg" }));

    const textContent = `${p.suggestion ? p.suggestion + "\n" : ""}${p.title}\n${p.price}\n${p.status}\n${p.action}${p.hasPromo ? "\nPromocionar" : ""}${p.hasShare ? "\nCompartir" : ""}`;
    card.innerText = textContent;

    const btnCol = card.appendChild(new MockElement("div", "", { class: "actions-column" }));
    
    // Botón principal (puede tener icono ✔ al inicio como en la captura)
    const btnMain = btnCol.appendChild(new MockElement("div", "", { role: "button" }));
    btnMain.appendChild(new MockElement("span", p.action));

    if (p.hasPromo) {
      const btnPromo = btnCol.appendChild(new MockElement("div", "", { role: "button" }));
      btnPromo.appendChild(new MockElement("span", "Promocionar"));
    }
    if (p.hasShare) {
      const btnShare = btnCol.appendChild(new MockElement("div", "", { role: "button" }));
      btnShare.appendChild(new MockElement("span", "Compartir"));
    }
  });

  return doc;
}

// ALGORITMO ROBUSTO V2.9.58:
// 1. Detección insensible a iconos en botones (regex con .includes y match global de 'marcar como' / 'promocionar')
// 2. Descarte 100% automático de publicaciones vendidas o agotadas (isListingAvailable)
function executeScan(doc) {
  const listings = [];
  const seenTitles = new Set();
  const seenIds = new Set();

  function extractListingDataFromElement(container, defaultId = null) {
    if (!container) return null;
    const textContent = container.innerText || "";
    if (textContent.length < 15 || textContent.length > 3000) return null;

    const rawLines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    // FILTRO VITAL: Solo procesar publicaciones disponibles en stock (descartar vendidas/agotadas)
    if (!isListingAvailable(textContent, rawLines)) {
      return null;
    }

    const rawPriceLine = rawLines.find(l => l.includes("$") || l.includes("C$") || l.includes("NIO") || /^\d{2,}\.?\d{0,3}$/.test(l)) || "";
    const priceLine = extractCleanPrice(rawPriceLine);

    // Extraer candidatos a título descartando ruido
    const titleCandidates = rawLines.filter(l => !isNoiseLine(l));
    let fbTitle = titleCandidates[0] || "";
    if (!fbTitle || fbTitle.length < 4) return null;

    const normKey = normalizeTitle(fbTitle);
    if (seenTitles.has(normKey)) return null;

    // Buscar ID de publicación
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

    // Resolver con gemelos web en Firestore
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

  // 1. Detección por botones de acción (insensible a iconos unicode ✔, espacios o badges)
  const actionButtons = Array.from(doc.querySelectorAll('div[role="button"], button, span, div')).filter(el => {
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    // Búsqueda flexible que tolera '✔ Marcar como agotado', 'Marcar como vendido', 'Promocionar'
    return txt.includes("marcar como") || txt.includes("mark as") || txt.includes("promocionar") || txt.includes("boost");
  });

  const processedCards = new Set();

  for (const btn of actionButtons) {
    let curr = btn;
    let bestCard = null;

    while (curr && curr !== doc.body) {
      curr = curr.parentElement;
      if (!curr) break;

      const txt = curr.innerText || "";
      const promoMatches = (txt.match(/promocionar|boost/gi) || []).length;
      const markMatches = (txt.match(/marcar como|mark as/gi) || []).length;

      // DETENCIÓN ESTRICTA: Si este contenedor contiene más de 1 acción de fila, ya es la tabla completa
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

  return listings;
}

// TEST 1: Con filtro "Disponibles y en stock" (6 productos disponibles en pantalla)
console.log("\n--- TEST 1: Filtro 'Disponibles y en stock' (Captura 5) ---");
const docInStock = createMockDom({ isAllFilter: false });
const resultsInStock = executeScan(docInStock);
console.log(`Detectadas ${resultsInStock.length} publicaciones disponibles:`);
resultsInStock.forEach((r, idx) => {
  console.log(`  [${idx + 1}] "${r.fbTitle}" | ${r.priceLine} | ID: ${r.fbListingId}`);
});

assert.strictEqual(resultsInStock.length, 6, "Debe detectar las 6 publicaciones disponibles (no solo 1)");
assert(resultsInStock.some(r => r.fbTitle.includes("Mini Jet Fan")), "Debe incluir Mini Jet Fan");
assert(resultsInStock.some(r => r.fbTitle.includes("GameSir X5")), "Debe incluir GameSir X5");
assert(resultsInStock.some(r => r.fbTitle.includes("Anker PowerCore")), "Debe incluir Anker PowerCore");
assert(resultsInStock.some(r => r.fbTitle.includes("TP-LINK RE315")), "Debe incluir TP-Link");
assert(resultsInStock.some(r => r.fbTitle.includes("Windchaser")), "Debe incluir Mando Windchaser");
assert(resultsInStock.some(r => r.fbTitle.includes("Acer Predator")), "Debe incluir Acer Predator");
console.log("  ✓ Test 1 PASÓ: Las 6 publicaciones en stock fueron detectadas con éxito.");

// TEST 2: Con filtro "Todo" (6 disponibles + 5 vendidas/agotadas en pantalla)
console.log("\n--- TEST 2: Filtro 'Todo' (Captura 2 con 11 productos) ---");
const docAll = createMockDom({ isAllFilter: true });
const resultsAll = executeScan(docAll);
console.log(`Detectadas ${resultsAll.length} publicaciones para renovar (de 11 en pantalla):`);
resultsAll.forEach((r, idx) => {
  console.log(`  [${idx + 1}] "${r.fbTitle}" | ${r.priceLine}`);
});

assert.strictEqual(resultsAll.length, 6, "Aun con filtro 'Todo' en Facebook, SOLO debe listar las 6 disponibles y DESCARTAR las 5 vendidas/agotadas");
assert(!resultsAll.some(r => r.fbTitle.includes("Mini Soplador Turbo Jet 150,000")), "NO debe incluir producto vendido");
assert(!resultsAll.some(r => r.fbTitle.includes("Linterna de Emergencia")), "NO debe incluir producto agotado");
assert(!resultsAll.some(r => r.fbTitle.includes("Batería Portátil Magnética")), "NO debe incluir producto vendido");
console.log("  ✓ Test 2 PASÓ: Los productos vendidos y agotados fueron 100% filtrados y descartados.");

console.log("\n=================================================");
console.log("TODAS LAS PRUEBAS DE EN STOCK / DISPONIBLES PASARON AL 100%");
console.log("=================================================");
