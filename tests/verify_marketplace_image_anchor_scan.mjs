import assert from "node:assert";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN ESCANEO ANCLADO POR IMÁGENES EN FACEBOOK");
console.log("=================================================");

class MockElement {
  constructor(tagName, text = "", attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.innerText = text;
    this.children = [];
    this.parentElement = null;
    this.attrs = attrs;
    this.offsetWidth = attrs.width || 80;
    this.offsetHeight = attrs.height || 80;
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
        if (selector === "img" && ch.tagName === "IMG") match = true;
        else if (selector.includes('role="button"') && ch.getAttribute("role") === "button") match = true;
        else if (selector.includes('role="dialog"') && ch.getAttribute("role") === "dialog") match = true;
        else if (selector.includes("button") && (ch.tagName === "BUTTON" || ch.getAttribute("role") === "button")) match = true;
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
  { id: "fb_1198273641889021", title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo en Caja)", facebookListingId: "1198273641889021", priceNio: 800 },
  { id: "fb_1198273641889022", title: "Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en Caja)", facebookListingId: "1198273641889022", priceNio: 1350 },
  { id: "fb_1198273641889023", title: "Grip / Power Bank Gaming Anker PowerCore Play 6K", facebookListingId: "1198273641889023", priceNio: 650 },
  { id: "fb_1198273641889024", title: "Repetidor TP-LINK RE315 AC1200", facebookListingId: "1198273641889024", priceNio: 850 },
  { id: "fb_1198273641889025", title: "Mando Windchaser PLUS Youth Edition", facebookListingId: "1198273641889025", priceNio: 750 },
  { id: "fb_1198273641889026", title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7", facebookListingId: "1198273641889026", priceNio: 1100 }
];

function createRealFacebookDom(isAllFilter = false) {
  const doc = new MockDocument();

  // Avatar de usuario en esquina superior (no es producto)
  const topNav = doc.body.appendChild(new MockElement("div", "Facebook"));
  topNav.appendChild(new MockElement("img", "", { src: "https://avatar.jpg", width: 36, height: 36 }));

  // Barra lateral
  const sidebar = doc.body.appendChild(new MockElement("div", "Marketplace\nVenta\nPanel para vendedores\nTus publicaciones"));
  sidebar.appendChild(new MockElement("a", "Tus publicaciones", { href: "/marketplace/you/selling" }));

  // Main
  const main = doc.body.appendChild(new MockElement("div", ""));
  main.appendChild(new MockElement("h1", "Tus publicaciones"));
  const table = main.appendChild(new MockElement("div", "", { class: "marketplace-table" }));

  const availableItems = [
    {
      title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo en Caja)",
      price: "C$800 C$1.100",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 54 clics en la publicación",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Control Gamer GameSir X5 Lite Type C | Para Android (Nuevo en Caja)",
      price: "C$1.350 C$1.650",
      status: "Activo · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 152 clics en la publicación",
      action: "✔ Marcar como vendido"
    },
    {
      title: "Grip / Power Bank Gaming Anker PowerCore Play 6K",
      price: "C$650 C$950",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 60 clics en la publicación",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Repetidor TP-LINK RE315 AC1200",
      price: "C$850 C$1.000",
      status: "Disponible · Publicado el 29/9\nPublicado en Marketplace y al menos 1 grupo · 41 clics en la publicación",
      action: "✔ Marcar como agotado"
    },
    {
      title: "Mando Windchaser PLUS Youth Edition",
      price: "C$750 C$900",
      status: "Disponible · Publicado el 22/9\nPublicado en Marketplace y al menos 1 grupo · 156 clics en la publicación",
      action: "✔ Marcar como agotado"
    },
    {
      title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7 ⚡",
      suggestion: "💡 Sugerencia: ¿Renovar la publicación?",
      price: "C$1.100 C$1.250",
      status: "Disponible · Publicado el 29/7\nPublicado en Marketplace y al menos 1 grupo · 19 clics en la publicación",
      action: "✔ Marcar como agotado"
    }
  ];

  const soldItems = isAllFilter ? [
    {
      title: "Mini Soplador Turbo Jet 150,000 RPM | Negro",
      price: "C$35",
      status: "Vendido · Publicado el 12/8\n210 clics en la publicación",
      action: "Marcar como disponible"
    },
    {
      title: "Batería Portátil Magnética Memory Angle 10000mAh",
      price: "C$15",
      status: "Vendido · Publicado el 05/8\n98 clics en la publicación",
      action: "Marcar como disponible"
    }
  ] : [];

  const items = [...availableItems, ...soldItems];

  items.forEach(p => {
    // Fila real de Facebook con dos columnas separadas:
    // Columna 1: Imagen
    // Columna 2: Textos y botones
    const row = table.appendChild(new MockElement("div", "", { class: "user-selling-item-row" }));

    // Columna 1: Imagen
    const colLeft = row.appendChild(new MockElement("div", "", { class: "thumb-col" }));
    colLeft.appendChild(new MockElement("img", "", { src: "https://fbcdn.net/product.jpg", width: 100, height: 100 }));

    // Columna 2: Textos y acciones
    const colRight = row.appendChild(new MockElement("div", "", { class: "content-col" }));
    const textLines = `${p.suggestion ? p.suggestion + "\n" : ""}${p.title}\n${p.price}\n${p.status}`;
    colRight.appendChild(new MockElement("div", textLines));

    const btnGroup = colRight.appendChild(new MockElement("div", "", { class: "buttons-col" }));
    const b1 = btnGroup.appendChild(new MockElement("div", "", { role: "button" }));
    b1.appendChild(new MockElement("span", p.action));

    const b2 = btnGroup.appendChild(new MockElement("div", "", { role: "button" }));
    b2.appendChild(new MockElement("span", "Promocionar"));

    const b3 = btnGroup.appendChild(new MockElement("div", "", { role: "button" }));
    b3.appendChild(new MockElement("span", "Compartir"));

    // El innerText del row completo incluye todo
    row.innerText = `${textLines}\n${p.action}\nPromocionar\nCompartir`;
  });

  return doc;
}

// Algoritmo de Doble Anclaje (Híbrido: Botones + Imágenes)
function getScannableListingsDual(doc) {
  const listings = [];
  const seenTitles = new Set();
  const seenIds = new Set();
  const processedCards = new Set();

  function extractListingDataFromElement(container, defaultId = null) {
    if (!container) return null;
    const textContent = container.innerText || "";
    if (textContent.length < 15 || textContent.length > 3000) return null;

    const rawLines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    // Filtrar publicaciones vendidas o agotadas
    if (!isListingAvailable(textContent, rawLines)) {
      return null;
    }

    const rawPriceLine = rawLines.find(l => l.includes("$") || l.includes("C$") || l.includes("NIO") || /^\d{2,}\.?\d{0,3}$/.test(l)) || "";
    const priceLine = extractCleanPrice(rawPriceLine);

    // Título limpio
    const titleCandidates = rawLines.filter(l => !isNoiseLine(l));
    let fbTitle = titleCandidates[0] || "";
    if (!fbTitle || fbTitle.length < 4) return null;

    const normKey = normalizeTitle(fbTitle);
    if (seenTitles.has(normKey)) return null;

    // Buscar ID en enlace legítimo
    let fbListingId = defaultId;
    if (!fbListingId) {
      const allLinks = Array.from(container.querySelectorAll("a[href]"));
      for (const a of allLinks) {
        const href = a.getAttribute("href") || "";
        const m = href.match(/(?:listing_id=|marketplace\/item\/|\/item\/|\/items\/|item_id=)(\d{10,})/i);
        if (m && m[1]) {
          fbListingId = m[1];
          break;
        }
      }
    }

    // Resolver con Firestore
    if (!fbListingId && Array.isArray(cachedWebProducts)) {
      const match = cachedWebProducts.find(p => 
        computeTitleSimilarity(p.title, fbTitle) >= 0.50 ||
        (p.title && fbTitle.toLowerCase().includes(p.title.toLowerCase().slice(0, 12))) ||
        (fbTitle && p.title.toLowerCase().includes(fbTitle.toLowerCase().slice(0, 12)))
      );
      if (match && match.facebookListingId) {
        fbListingId = String(match.facebookListingId);
      }
    }

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

  // ESTRATEGIA 1: Anclaje por Imágenes de Producto (Infalible ante cualquier layout flexbox/columnas)
  const allImages = Array.from(doc.querySelectorAll("img")).filter(img => {
    // Descartar avatares miniatura o iconos de navegación
    const w = img.offsetWidth || 80;
    const h = img.offsetHeight || 80;
    return w >= 40 && h >= 40;
  });

  for (const img of allImages) {
    let curr = img;
    while (curr && curr !== doc.body) {
      curr = curr.parentElement;
      if (!curr) break;

      const txt = curr.innerText || "";
      const hasPrice = txt.includes("$") || txt.includes("C$") || txt.includes("NIO");
      const hasMeta = txt.includes("publicado") || txt.includes("clics") || txt.includes("marcar como") || txt.includes("promocionar");

      // En el momento en que el contenedor ancestral de la imagen abarca el precio y metadatos de venta:
      if (hasPrice && hasMeta && txt.length >= 30 && txt.length < 1500) {
        if (!processedCards.has(curr)) {
          processedCards.add(curr);
          const data = extractListingDataFromElement(curr);
          if (data) listings.push(data);
        }
        break; // Detener ascenso en la tarjeta individual, no subir a la tabla
      }
    }
  }

  // ESTRATEGIA 2: Fallback por Botones de Acción (por si alguna imagen estuviese en div con background-image)
  const actionButtons = Array.from(doc.querySelectorAll('div[role="button"], button')).filter(el => {
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return txt.includes("marcar como") || txt.includes("mark as") || txt.includes("promocionar");
  });

  for (const btn of actionButtons) {
    let curr = btn;
    while (curr && curr !== doc.body) {
      curr = curr.parentElement;
      if (!curr) break;

      const txt = curr.innerText || "";
      const hasPrice = txt.includes("$") || txt.includes("C$") || txt.includes("NIO");
      const hasImg = Boolean(curr.querySelector("img"));

      if (hasPrice && hasImg && txt.length >= 30 && txt.length < 1500) {
        if (!processedCards.has(curr)) {
          processedCards.add(curr);
          const data = extractListingDataFromElement(curr);
          if (data) listings.push(data);
        }
        break;
      }
    }
  }

  return listings;
}

// EJECUTAR PRUEBAS
console.log("\n--- TEST: Vista de Facebook Marketplace 'Disponibles y en stock' ---");
const docInStock = createRealFacebookDom(false);
const results = getScannableListingsDual(docInStock);

console.log(`Detectadas ${results.length} publicaciones disponibles:`);
results.forEach((r, idx) => {
  console.log(`  [${idx + 1}] "${r.fbTitle}" | ${r.priceLine} | Gemelo: ${r.fbListingId}`);
});

assert.strictEqual(results.length, 6, "Debe detectar las 6 publicaciones disponibles completas");
assert(results.some(r => r.fbTitle.includes("Mini Jet Fan")), "Debe incluir Mini Jet Fan");
assert(results.some(r => r.fbTitle.includes("GameSir X5")), "Debe incluir GameSir X5");
assert(results.some(r => r.fbTitle.includes("Anker PowerCore")), "Debe incluir Anker PowerCore");
assert(results.some(r => r.fbTitle.includes("TP-LINK RE315")), "Debe incluir TP-Link");
assert(results.some(r => r.fbTitle.includes("Windchaser")), "Debe incluir Mando Windchaser");
assert(results.some(r => r.fbTitle.includes("Acer Predator")), "Debe incluir Acer Predator");

console.log("\n--- TEST: Vista con productos vendidos/agotados (Filtro 'Todo') ---");
const docAll = createRealFacebookDom(true);
const resultsAll = getScannableListingsDual(docAll);
console.log(`Detectadas ${resultsAll.length} publicaciones disponibles para relist (de 8 totales en pantalla):`);
assert.strictEqual(resultsAll.length, 6, "Debe filtrar las 2 publicaciones vendidas y retornar exactamente las 6 disponibles");
assert(!resultsAll.some(r => r.fbTitle.includes("Mini Soplador Turbo Jet 150,000")), "NO debe incluir producto vendido");
assert(!resultsAll.some(r => r.fbTitle.includes("Batería Portátil Magnética")), "NO debe incluir producto vendido");

console.log("\n=================================================");
console.log("TODAS LAS PRUEBAS DE ANCLAJE DUAL PASARON AL 100%");
console.log("=================================================");
