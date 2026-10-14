/* Content Script inyectado en Facebook Marketplace (Haibane Sync Engine) */
console.log("✦ Haibane Marketplace Sync activo en la pestaña.");

function isExtensionValid() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
}

function safeSendMessage(message, callback) {
  if (!isExtensionValid()) return;
  try {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return;
      if (typeof callback === "function") callback(response);
    });
  } catch (e) {
    // Contexto de extensión invalidado por recarga
  }
}

let cachedWebProducts = [];

// Helper para React Controlled Inputs
function setNativeInputValue(element, value) {
  if (!element) return;
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Normaliza cadenas de texto para comparar títulos de productos
 */
function normalizeTitle(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula similitud léxica entre dos títulos (0.0 a 1.0)
 */
function computeTitleSimilarity(strA, strB) {
  const normA = normalizeTitle(strA);
  const normB = normalizeTitle(strB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  const wordsA = new Set(normA.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? (intersection / union) : 0;
}

/**
 * Extrae valor numérico de un texto de precio (ej: "$25", "US$ 25.00", "C$ 950")
 */
function parsePriceFromText(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Consulta la lista de productos del catálogo web desde Firestore
 */
function loadCatalogProducts(callback) {
  safeSendMessage({ action: "GET_CATALOG_PRODUCTS" }, (response) => {
    if (response && response.success) {
      cachedWebProducts = response.products || [];
      const info = document.getElementById("haibane-sync-info");
      if (info) {
        const linkedCount = cachedWebProducts.filter(p => p.facebookListingId).length;
        info.textContent = `${cachedWebProducts.length} prod. web (${linkedCount} gemelos enlazados).`;
      }
      console.log(`✦ ${cachedWebProducts.length} productos sincronizados desde Firestore.`);
      if (typeof callback === "function") callback(cachedWebProducts);
    }
  });
}

/**
 * Extrae de forma exhaustiva las publicaciones visibles en /marketplace/you/selling o feeds de Marketplace.
 * Soporta tanto enlaces nativos (/marketplace/item/) como tarjetas visuales de React.
 */
/**
 * Extrae de forma exhaustiva las publicaciones visibles en /marketplace/you/selling o feeds de Marketplace.
 * Soporta tanto la vista de lista completa (todas las publicaciones) como el modal individual.
 */
/**
 * Extrae y normaliza el precio activo de una publicación descartando precios anteriores/tachados.
 */
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

  // 1. Si el botón dice "marcar como disponible", la publicación actualmente ESTÁ VENDIDA / AGOTADA
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

function getScannableListings() {
  const listings = [];
  const seenTitles = new Set();
  const seenIds = new Set();

  function extractListingDataFromElement(container, defaultId = null) {
    if (!container) return null;
    const textContent = container.innerText || "";
    if (textContent.length < 15 || textContent.length > 3000) return null;

    const rawLines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    // FILTRO VITAL: Solo procesar publicaciones disponibles en stock (descartar vendidas y agotadas)
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

    // Buscar ID de publicación exclusivo de Marketplace
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

    // Resolver con gemelos web en Firestore
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

  const processedCards = new Set();

  // ESTRATEGIA 1 (INFALIBLE): Anclaje por Fotos de Producto (img)
  // Cada fila de producto en /marketplace/you/selling contiene su miniatura
  const allImages = Array.from(document.querySelectorAll("img")).filter(img => {
    const w = img.offsetWidth || img.naturalWidth || 80;
    const h = img.offsetHeight || img.naturalHeight || 80;
    const src = img.src || "";
    // Descartar avatares de perfil diminutos e iconos de navegación
    if (src.includes("emoji") || src.includes("static.xx") || (w < 40 && h < 40)) return false;
    return true;
  });

  for (const img of allImages) {
    let curr = img;
    while (curr && curr !== document.body) {
      curr = curr.parentElement;
      if (!curr) break;

      const txt = curr.innerText || "";
      const hasPrice = txt.includes("$") || txt.includes("C$") || txt.includes("NIO");
      const hasMeta = txt.includes("publicado") || txt.includes("clics") || txt.includes("marcar como") || txt.includes("promocionar") || txt.includes("disponible") || txt.includes("activo");

      if (hasPrice && hasMeta && txt.length >= 30 && txt.length < 1500) {
        if (!processedCards.has(curr)) {
          processedCards.add(curr);
          const data = extractListingDataFromElement(curr);
          if (data) listings.push(data);
        }
        break; // Detener ascenso en la tarjeta de fila individual
      }
    }
  }

  // ESTRATEGIA 2: Fallback por Botones de Acción de Fila
  const actionButtons = Array.from(document.querySelectorAll('div[role="button"], button')).filter(el => {
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return txt.includes("marcar como") || txt.includes("mark as") || txt.includes("promocionar") || txt.includes("boost");
  });

  for (const btn of actionButtons) {
    let curr = btn;
    while (curr && curr !== document.body) {
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

  // ESTRATEGIA 3: Si hay un modal abierto (div[role="dialog"])
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

  // ESTRATEGIA 4: Enlaces individuales directos (/marketplace/item/)
  const links = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"], a[href*="/item/"], a[href*="listing_id="]'));
  for (const a of links) {
    const href = a.getAttribute("href") || "";
    const idMatch = href.match(/(?:listing_id=|item\/|\/items\/|item_id=)(\d{10,})/i);
    const fbListingId = idMatch ? idMatch[1] : null;

    const parent = a.closest('div[role="article"]') || a.closest('div[role="row"]') || a.closest('div[role="listitem"]') || a.parentElement?.parentElement || a.parentElement;
    if (parent && !processedCards.has(parent)) {
      processedCards.add(parent);
      const data = extractListingDataFromElement(parent, fbListingId);
      if (data) listings.push(data);
    }
  }

  return listings;
}

/**
 * Localiza y elimina una publicación de Facebook Marketplace en /marketplace/you/selling
 * usando el menú contextual (...) de la tarjeta de producto y confirmando el modal.
 * @param {string} targetId ID numérico o fb_ID de la publicación
 * @param {string} targetTitle Título del producto
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteListingFromSellingPage(targetId, targetTitle) {
  console.log(`🗑️ Haibane: Iniciando eliminación de publicación: "${targetTitle}" (ID: ${targetId || "N/A"})...`);

  const allImages = Array.from(document.querySelectorAll("img")).filter(img => {
    const w = img.offsetWidth || img.naturalWidth || 80;
    const h = img.offsetHeight || img.naturalHeight || 80;
    const src = img.src || "";
    return !src.includes("emoji") && !src.includes("static.xx") && (w >= 40 || h >= 40);
  });

  const matchedCards = [];
  const processed = new Set();
  const normTarget = normalizeTitle(targetTitle || "");

  for (const img of allImages) {
    let curr = img;
    while (curr && curr !== document.body) {
      curr = curr.parentElement;
      if (!curr) break;
      const txt = curr.innerText || "";
      const hasPrice = txt.includes("$") || txt.includes("C$") || txt.includes("NIO");
      const hasMeta = txt.includes("publicado") || txt.includes("clics") || txt.includes("marcar como") || txt.includes("promocionar") || txt.includes("disponible") || txt.includes("revisando");

      if (hasPrice && hasMeta && txt.length >= 30 && txt.length < 1500) {
        if (!processed.has(curr)) {
          processed.add(curr);
          const lines = txt.split("\n").map(l => l.trim()).filter(Boolean);
          const titleLine = lines.find(l => !isNoiseLine(l)) || "";
          const normTitle = normalizeTitle(titleLine);

          let hasIdMatch = false;
          if (targetId) {
            const cleanId = String(targetId).replace(/^fb_/, "");
            if (curr.innerHTML.includes(cleanId)) hasIdMatch = true;
          }

          const hasTitleMatch = normTarget && normTitle && (
            normTitle.includes(normTarget) ||
            normTarget.includes(normTitle) ||
            computeTitleSimilarity(normTitle, normTarget) >= 0.45
          );

          if (hasIdMatch || hasTitleMatch) {
            const isReview = /revisando|revisi[oó]n|under review/i.test(txt);
            matchedCards.push({ element: curr, text: txt, isReview, title: titleLine });
          }
        }
        break;
      }
    }
  }

  if (matchedCards.length === 0) {
    console.warn(`Haibane: No se encontró tarjeta para eliminar: "${targetTitle}".`);
    return { success: false, error: "Tarjeta no encontrada en pantalla" };
  }

  // Priorizar la tarjeta ANTIGUA (la que NO está en revisión ni recién creada)
  let targetCard = matchedCards.find(c => !c.isReview) || matchedCards[0];
  const cardEl = targetCard.element;

  cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
  await new Promise(r => setTimeout(r, 450));

  // Localizar botón de 3 puntos (...)
  const buttons = Array.from(cardEl.querySelectorAll('div[role="button"], button'));
  let menuBtn = buttons.find(b => {
    const label = (b.getAttribute("aria-label") || "").toLowerCase();
    const hasPopup = b.getAttribute("aria-haspopup") === "menu" || b.getAttribute("aria-haspopup") === "true";
    return hasPopup || /m[aá]s|opciones|acciones|administrar|more|actions/i.test(label);
  });

  if (!menuBtn) {
    // Descartar botones de acción conocidos
    menuBtn = buttons.find(b => {
      const txt = (b.innerText || "").toLowerCase().trim();
      if (txt.includes("agotado") || txt.includes("vendido") || txt.includes("promocionar") || txt.includes("boost") || txt.includes("disponible") || txt.includes("compartir") || txt.includes("share")) return false;
      return Boolean(b.querySelector("svg") || b.querySelector("i") || txt === "..." || txt === "");
    });
  }

  if (!menuBtn && buttons.length > 0) {
    menuBtn = buttons[buttons.length - 1];
  }

  if (!menuBtn) {
    return { success: false, error: "Botón de menú (...) no localizado en la tarjeta" };
  }

  menuBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  menuBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  menuBtn.click();
  await new Promise(r => setTimeout(r, 700));

  // Buscar 'Eliminar publicación' en menú emergente
  const menuItems = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="menu"] div[role="button"], div[role="menu"] span, div[role="menu"] div, div[role="dialog"] div[role="button"], div[role="dialog"] span')).filter(el => {
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return (txt.includes("eliminar publicación") || txt.includes("eliminar articulo") || txt.includes("eliminar artículo") || txt.includes("delete listing") || txt === "eliminar publicación") && !txt.includes("cancelar");
  });

  if (menuItems.length === 0) {
    document.body.click();
    return { success: false, error: "Opción 'Eliminar publicación' no visible en menú" };
  }

  menuItems[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
  menuItems[0].click();
  await new Promise(r => setTimeout(r, 850));

  // Confirmar en el modal dialog
  const dialog = document.querySelector('div[role="dialog"]');
  if (dialog) {
    const radios = Array.from(dialog.querySelectorAll('input[type="radio"], div[role="radio"], div[role="button"], span')).filter(r => {
      const txt = (r.innerText || r.getAttribute("aria-label") || r.parentElement?.innerText || "").toLowerCase();
      return txt.includes("no, no") || txt.includes("no lo he") || txt.includes("otro") || txt.includes("prefer");
    });
    if (radios.length > 0) {
      radios[0].click();
      await new Promise(r => setTimeout(r, 400));
    }

    const actionBtns = Array.from(dialog.querySelectorAll('div[role="button"], button')).filter(b => {
      const txt = (b.innerText || b.getAttribute("aria-label") || "").trim().toLowerCase();
      return (txt === "eliminar" || txt === "delete" || txt === "siguiente" || txt === "next" || txt.includes("eliminar definitivamente")) && !txt.includes("cancelar");
    });
    if (actionBtns.length > 0) {
      actionBtns[0].click();
      await new Promise(r => setTimeout(r, 700));

      const finalBtn = Array.from(document.querySelectorAll('div[role="dialog"] div[role="button"], div[role="dialog"] button')).find(b => {
        const txt = (b.innerText || b.getAttribute("aria-label") || "").trim().toLowerCase();
        return (txt === "eliminar" || txt === "delete" || txt.includes("eliminar definitivamente")) && !txt.includes("cancelar");
      });
      if (finalBtn) finalBtn.click();
    }
  }

  showHaibaneToast(`🗑️ Publicación anterior eliminada: "${targetTitle}"`);
  console.log(`✓ Publicación anterior eliminada con éxito: "${targetTitle}"`);
  return { success: true };
}

let isBatchSellingCheckActive = false;

/**
 * Revisa si hay un lote de renovación activo al ingresar a /marketplace/you/selling
 * y elimina la publicación antigua del ítem recién renovado antes de avanzar al siguiente.
 */
async function checkActiveBatchOnSellingPage() {
  if (!window.location.href.includes("/marketplace/you/selling")) return;
  if (isBatchSellingCheckActive) return;
  isBatchSellingCheckActive = true;

  try {
    const data = await chrome.storage?.local?.get(["activeRelistBatch"]);
    const batch = data?.activeRelistBatch;
    if (!batch || batch.status !== "PROCESSING" || !Array.isArray(batch.queue)) {
      isBatchSellingCheckActive = false;
      return;
    }

    const currentItem = batch.queue[batch.currentIndex];
    if (!currentItem) {
      isBatchSellingCheckActive = false;
      return;
    }

    showHaibaneToast(`🗑️ Lote [${batch.currentIndex + 1}/${batch.queue.length}]: Eliminando publicación anterior de "${currentItem.title}"...`);

    // Esperar 2.5s a que el feed de Facebook cargue las tarjetas
    await new Promise(r => setTimeout(r, 2500));

    // Ejecutar eliminación de la tarjeta antigua de forma segura
    try {
      const delRes = await deleteListingFromSellingPage(currentItem.oldListingId, currentItem.title);
      console.log("Haibane: Resultado de eliminación de listing antiguo:", delRes);
    } catch (delErr) {
      console.warn("Haibane: Aviso en eliminación de publicación previa:", delErr);
    }

    await new Promise(r => setTimeout(r, 1200));

    // Avanzar cola SIEMPRE para que el lote no se detenga jamás a la mitad
    const nextIdx = batch.currentIndex + 1;
    if (nextIdx < batch.queue.length) {
      batch.currentIndex = nextIdx;
      batch.step = "CREATING";
      await chrome.storage.local.set({ activeRelistBatch: batch });
      showHaibaneToast(`🚀 Avanzando a publicación [${nextIdx + 1}/${batch.queue.length}]: "${batch.queue[nextIdx].title}"...`);
      await new Promise(r => setTimeout(r, 1000));
      chrome.runtime.sendMessage({ action: "PROCESS_NEXT_BATCH_ITEM" });
    } else {
      batch.status = "COMPLETED";
      await chrome.storage.local.set({ activeRelistBatch: null });
      showHaibaneToast(`🎉 ¡Lote de renovación completado! Se renovaron las ${batch.queue.length} publicaciones con éxito.`);
    }
  } catch (err) {
    console.warn("Haibane: Error en ciclo de lote en selling page:", err);
  } finally {
    isBatchSellingCheckActive = false;
  }
}

/**
 * Detecta y elimina automáticamente todas las publicaciones antiguas que ya tienen
 * una versión renovada en estado "Se está revisando la publicación".
 */
async function cleanAllOldDuplicates() {
  showHaibaneToast("🔍 Buscando publicaciones antiguas duplicadas...");
  const listings = getScannableListings();

  const groups = new Map();
  for (const item of listings) {
    const key = normalizeTitle(item.fbTitle);
    if (!groups.has(key)) groups.set(key, []);
    const isReview = /revisando|revisi[oó]n|under review/i.test(item.textContent);
    groups.get(key).push({ ...item, isReview });
  }

  let removedCount = 0;
  for (const [key, items] of groups.entries()) {
    if (items.length > 1) {
      const oldItems = items.filter(x => !x.isReview);
      for (const old of oldItems) {
        showHaibaneToast(`🗑️ Eliminando duplicado viejo: "${old.fbTitle}"...`);
        try {
          const res = await deleteListingFromSellingPage(old.fbListingId, old.fbTitle);
          if (res && res.success) removedCount++;
        } catch (e) {
          console.warn("Error eliminando duplicado:", e);
        }
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  showHaibaneToast(removedCount > 0 
    ? `✓ Limpieza completa: ${removedCount} publicaciones viejas eliminadas.`
    : "✓ No se detectaron duplicados antiguos en pantalla.");
  return { success: true, count: removedCount };
}

/**
 * FASE 1: Enlace Preventivo y Anti-Duplicados
 * Escanea las publicaciones en pantalla y las empareja con el catálogo web sin duplicar.
 */
function linkExistingMarketplaceTwins() {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = "Escaneando publicaciones para enlazar gemelos...";

  const isSellingPage = window.location.href.includes("/marketplace/you/selling");
  const listings = getScannableListings();

  if (listings.length === 0) {
    if (info) {
      info.textContent = isSellingPage 
        ? "No se encontraron publicaciones en pantalla." 
        : "💡 Abre 'Tus publicaciones' (/marketplace/you/selling) para enlazar todo.";
    }
    return;
  }

  let newlyLinked = 0;
  let alreadyLinked = 0;

  listings.forEach(({ element, fbListingId, fbTitle, lines, priceLine }) => {
    const rawPrice = parsePriceFromText(priceLine);

    // 1. Verificar si ya está enlazado directamente
    const existingTwin = cachedWebProducts.find(p => fbListingId && String(p.facebookListingId) === String(fbListingId));
    if (existingTwin) {
      alreadyLinked++;
      return;
    }

    // 2. Matching difuso preventivo (evitar duplicaciones)
    let bestMatch = null;
    let highestSim = 0;

    for (const prod of cachedWebProducts) {
      // Si ya tiene otro ID de Facebook distinto, no asociar
      if (prod.facebookListingId && fbListingId && String(prod.facebookListingId) !== String(fbListingId)) continue;

      const sim = computeTitleSimilarity(prod.title, fbTitle);
      if (sim > highestSim && sim >= 0.70) {
        // Verificar compatibilidad de precio si existe
        if (rawPrice !== null && prod.priceUsd) {
          const normFbUsd = rawPrice > 200 ? Number((rawPrice / 37.0).toFixed(2)) : rawPrice;
          const diffPct = Math.abs(normFbUsd - prod.priceUsd) / prod.priceUsd;
          if (diffPct <= 0.35) { // Tolerancia del 35% por redondeos o promociones
            highestSim = sim;
            bestMatch = prod;
          }
        } else {
          highestSim = sim;
          bestMatch = prod;
        }
      }
    }

    if (bestMatch && fbListingId) {
      console.log(`🔗 Emparejamiento Gemelo Detectado: Web "${bestMatch.title}" <==> FB "${fbTitle}" (#${fbListingId})`);
      safeSendMessage({
        action: "LINK_PRODUCT_TO_FB",
        productId: bestMatch.id,
        fbListingId: fbListingId,
        fbUrl: `https://www.facebook.com/marketplace/item/${fbListingId}/`,
        collection: bestMatch._collection || "dev_rewards_catalog"
      }, (res) => {
        if (res && res.success) {
          bestMatch.facebookListingId = fbListingId;
          newlyLinked++;
          if (info) info.textContent = `✓ Enlazado: "${bestMatch.title}" con FB #${fbListingId}`;
        }
      });
    }
  });

  setTimeout(() => {
    if (info) {
      if (newlyLinked > 0) {
        info.textContent = `✓ ${newlyLinked} nuevo(s) gemelo(s) enlazado(s). (${alreadyLinked} ya estaban al día).`;
      } else {
        info.textContent = alreadyLinked > 0 
          ? `✓ ${alreadyLinked} gemelos confirmados (${listings.length} detectados en pantalla).` 
          : `✓ ${listings.length} publicaciones activas detectadas en Facebook.`;
      }
    }
  }, 1000);
}

/**
 * FASE 2: Detecta productos en la Web que no están en Facebook y ofrece publicarlos
 */
function checkOrphanWebProducts() {
  const orphans = cachedWebProducts.filter(p => !p.facebookListingId && p.status === "ACTIVE");
  const info = document.getElementById("haibane-sync-info");
  if (orphans.length === 0) {
    if (info) info.textContent = "Todos los productos activos ya están en Facebook.";
    return;
  }
  const target = orphans[0];
  if (confirm(`Tienes ${orphans.length} producto(s) en la web sin publicar en Facebook.\n\n¿Deseas abrir el creador asistido para "${target.title}"?`)) {
    safeSendMessage({
      action: "OPEN_FB_CREATE_TAB",
      productId: target.id
    });
  }
}

/**
 * Audita las publicaciones visibles en la pantalla de Marketplace.
 * Detecta si se cambiaron precios desde el teléfono y actualiza Firestore.
 */
function auditMarketplaceListings() {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = "Escaneando precios y estado en pantalla...";

  const listings = getScannableListings();
  let updatedCount = 0;

  if (listings.length === 0) {
    if (info) info.textContent = "No hay publicaciones visibles para auditar.";
    return;
  }

  listings.forEach(({ fbListingId, lines, priceLine }) => {
    const rawPrice = parsePriceFromText(priceLine);

    for (const prod of cachedWebProducts) {
      const isDirectTwin = fbListingId && String(prod.facebookListingId) === String(fbListingId);
      const isMatch = isDirectTwin || lines.some(line => {
        const normLine = normalizeTitle(line);
        const normProdTitle = normalizeTitle(prod.title);
        return normLine.includes(normProdTitle) || (normProdTitle.length > 5 && normLine.includes(normProdTitle.slice(0, 15)));
      });

      if (isMatch) {
        const isSoldOnFb = lines.some(l => {
          const lower = l.toLowerCase();
          return lower.includes("vendid") || lower.includes("agotad") || lower.includes("sold") || lower.includes("marcar como disponible");
        });

        if (isSoldOnFb && prod.status !== "SOLD_OUT") {
          console.log(`✦ "${prod.title}" marcada como VENDIDA en Facebook. Sincronizando...`);
          safeSendMessage({
            action: "MARK_SOLD_IN_FIRESTORE",
            productId: prod.id,
            collection: prod._collection
          }, (res) => {
            if (res && res.success) {
              prod.status = "SOLD_OUT";
              updatedCount++;
              if (info) info.textContent = `✓ "${prod.title}" marcado como AGOTADO (regla 12h)`;
            }
          });
        } else if (rawPrice !== null && prod.priceUsd !== undefined) {
          let normalizedFbUsd = rawPrice;
          if (rawPrice > 200) {
            normalizedFbUsd = Number((rawPrice / 37.0).toFixed(2));
          }

          const diff = Math.abs(normalizedFbUsd - prod.priceUsd);
          if (diff >= 0.5) {
            console.log(`✦ Precio actualizado en FB para "${prod.title}": Web=$${prod.priceUsd} vs FB=$${normalizedFbUsd}`);
            safeSendMessage({
              action: "SYNC_PRICE_TO_FIRESTORE",
              productId: prod.id,
              newPrice: normalizedFbUsd,
              fbListingId: fbListingId,
              collection: prod._collection
            }, (res) => {
              if (res && res.success) {
                prod.priceUsd = normalizedFbUsd;
                updatedCount++;
                if (info) info.textContent = `✓ Actualizado "${prod.title}" a $${normalizedFbUsd}`;
              }
            });
          }
        }
        break;
      }
    }
  });

  setTimeout(() => {
    if (info) {
      info.textContent = updatedCount > 0 
        ? `✓ ${updatedCount} precio(s)/estado(s) sincronizado(s).` 
        : `Todo sincronizado (${listings.length} publicaciones en pantalla).`;
    }
  }, 1200);
}

/**
 * Extrae las publicaciones visibles en la pestaña y las envía hacia la API web
 */
function exportMarketplaceListingsToWeb() {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = "Extrayendo publicaciones en pantalla...";

  const listingLinks = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
  const foundListings = [];
  const seenIds = new Set();

  listingLinks.forEach(link => {
    const parent = link.closest('div[role="article"]') || link.parentElement;
    if (!parent) return;

    const href = link.getAttribute("href") || "";
    const idMatch = href.match(/\/marketplace\/item\/(\d+)/);
    const fbListingId = idMatch ? idMatch[1] : null;
    if (!fbListingId || seenIds.has(fbListingId)) return;
    seenIds.add(fbListingId);

    const textContent = parent.innerText || "";
    const lines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    const allImgs = Array.from(parent.querySelectorAll("img"));
    const fbPhotos = [];
    allImgs.forEach(img => {
      const src = img.src || img.getAttribute("data-src") || "";
      if (!src || !src.startsWith("http")) return;
      if (src.includes("rsrc.php") || src.includes("/emoji.php") || src.includes("data:image/svg")) return;
      if (img.naturalWidth > 0 && img.naturalWidth < 45) return;
      if (!fbPhotos.includes(src)) fbPhotos.push(src);
    });

    const priceLine = lines.find(l => l.includes("$") || l.includes("C$") || /^\d+(\.\d+)?$/.test(l));
    const rawPrice = parsePriceFromText(priceLine) || 0;
    const isUsd = (priceLine || "").includes("$") && !(priceLine || "").includes("C$");

    const titleCandidates = lines.filter(l => l !== priceLine && !l.toLowerCase().includes("vendid") && !l.toLowerCase().includes("agotad") && l.length > 3);
    const title = titleCandidates[0] || "Producto de Facebook Marketplace";

    foundListings.push({
      listingId: fbListingId,
      title: title,
      rawPrice: rawPrice,
      currency: isUsd ? "USD" : (rawPrice <= 200 ? "USD" : "NIO"),
      imageUrl: fbPhotos[0] || "",
      images: fbPhotos,
      fbPhotos: fbPhotos,
      description: textContent
    });
  });

  if (foundListings.length === 0) {
    if (info) info.textContent = "No se detectaron publicaciones en esta vista.";
    return;
  }

  if (info) info.textContent = `Enviando ${foundListings.length} a la web con IA...`;

  safeSendMessage({
    action: "EXPORT_LISTINGS_TO_WEB",
    listings: foundListings
  }, (res) => {
    if (res && res.success) {
      if (info) info.textContent = `✓ ${foundListings.length} exportados con éxito a la web.`;
    } else {
      if (info) info.textContent = `Aviso: ${res?.error || "Revisa la consola"}`;
    }
  });
}

function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  try {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

let photosInjectedForProduct = null;
let photosInjectedLock = false;

/**
 * Genera un slide HD 800x800 con código QR oficial para el catálogo web
 */
async function generateQrCardDataUrl() {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");

      // Fondo oscuro cyberpunk
      const grad = ctx.createLinearGradient(0, 0, 800, 800);
      grad.addColorStop(0, "#090d16");
      grad.addColorStop(1, "#1e1035");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Marco neón
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 760, 760);

      // Encabezado
      ctx.fillStyle = "#c084fc";
      ctx.font = "bold 24px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✦ THE WIRED CLUB // MELTYDEAYS ✦", 400, 75);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 34px -apple-system, sans-serif";
      ctx.fillText("TIENDA WEB OFICIAL", 400, 125);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 20px -apple-system, sans-serif";
      ctx.fillText("Escanea con tu celular para explorar el catálogo completo", 400, 160);

      // Marco blanco del QR
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(190, 195, 420, 420, 16);
      } else {
        ctx.rect(190, 195, 420, 420);
      }
      ctx.fill();

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 210, 215, 380, 380);

        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 24px -apple-system, sans-serif";
        ctx.fillText("🎁 BONO DE BIENVENIDA: $5 USD (250 WP)", 400, 665);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 20px monospace";
        ctx.fillText("https://meltydeays-wired-club.vercel.app", 400, 705);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "18px -apple-system, sans-serif";
        ctx.fillText("📲 WhatsApp: 5843-8412 · Entregas y envíos nacionales", 400, 745);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      qrImg.onerror = () => {
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 20px monospace";
        ctx.fillText("meltydeays-wired-club.vercel.app", 400, 410);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=https%3A%2F%2Fmeltydeays-wired-club.vercel.app&margin=10";
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Remasteriza y mejora la resolución/nitidez de una imagen usando Canvas HD.
 * 1. Escala con interpolación bicúbica de alta calidad a un mínimo de 1080px.
 * 2. Aplica filtro Unsharp Mask de micro-contraste para compensar la compresión previa de Meta.
 * 3. Exporta a JPEG con calidad 0.95.
 */
async function enhanceImageWithCanvasHD(blob) {
  if (!blob || !blob.type || !blob.type.includes("image")) return blob;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;
          if (origW < 10 || origH < 10) return resolve(blob);

          const targetMinDim = 1080;
          const maxDim = Math.max(origW, origH);
          let scale = 1;
          if (maxDim < targetMinDim) {
            scale = targetMinDim / maxDim;
          }

          const targetW = Math.round(origW * scale);
          const targetH = Math.round(origH * scale);

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(blob);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetW, targetH);

          try {
            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            const data = imgData.data;
            const copy = new Uint8ClampedArray(data);
            const w = targetW;
            const h = targetH;
            const weight = 0.20; // Enfoque de bordes y micro-contraste

            for (let y = 1; y < h - 1; y++) {
              const row = y * w * 4;
              const rowAbove = (y - 1) * w * 4;
              const rowBelow = (y + 1) * w * 4;
              for (let x = 1; x < w - 1; x++) {
                const idx = row + (x * 4);
                for (let c = 0; c < 3; c++) {
                  const val = copy[idx + c];
                  const up = copy[rowAbove + (x * 4) + c];
                  const down = copy[rowBelow + (x * 4) + c];
                  const left = copy[row + ((x - 1) * 4) + c];
                  const right = copy[row + ((x + 1) * 4) + c];
                  const laplacian = (4 * val) - (up + down + left + right);
                  data[idx + c] = Math.min(255, Math.max(0, val + (weight * laplacian)));
                }
              }
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (filterErr) {
            console.warn("Haibane: Filtro unsharp mask omitido:", filterErr);
          }

          canvas.toBlob((enhancedBlob) => {
            if (enhancedBlob && enhancedBlob.size > 1000) {
              resolve(enhancedBlob);
            } else {
              resolve(blob);
            }
          }, "image/jpeg", 0.95);
        } catch (err) {
          console.warn("Haibane: Fallo en remasterización Canvas HD:", err);
          resolve(blob);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob);
      };
      img.src = url;
    } catch {
      resolve(blob);
    }
  });
}

/**
 * Inyecta fotografías de alta resolución en el formulario nativo de Marketplace evitando duplicados
 */
async function injectProductPhotosToForm(photoUrls, productId = "") {
  if (photosInjectedLock || (photosInjectedForProduct && photosInjectedForProduct === productId)) {
    console.log("Haibane: Fotos ya inyectadas para este producto, omitiendo duplicados.");
    return true;
  }

  // Comprobar si Facebook ya tiene miniaturas de fotos añadidas en pantalla
  const existingPreviews = document.querySelectorAll(
    'div[role="button"][aria-label*="Eliminar" i], ' +
    'div[aria-label*="Eliminar foto" i]'
  );
  if (existingPreviews.length >= 2) {
    console.log("Haibane: El formulario ya contiene fotos cargadas en el DOM, omitiendo duplicados.");
    photosInjectedLock = true;
    photosInjectedForProduct = productId;
    return true;
  }

  // Candado síncrono inmediato para bloquear ejecuciones concurrentes
  photosInjectedLock = true;

  if (!photoUrls || photoUrls.length === 0) return false;
  const fileInput = document.querySelector('input[type="file"][accept*="image"]');
  if (!fileInput) {
    console.warn("No se encontró el input file de fotos en Facebook");
    photosInjectedLock = false;
    return false;
  }

  // Deduplicación estricta de URLs
  const uniqueUrls = Array.from(new Set(photoUrls.filter(Boolean)));

  // Generar y agregar slide con código QR oficial al final de la galería (solo 1 vez)
  try {
    const qrSlide = await generateQrCardDataUrl();
    if (qrSlide && !uniqueUrls.includes(qrSlide)) {
      uniqueUrls.push(qrSlide);
    }
  } catch (err) {
    console.warn("Aviso: No se pudo generar slide QR:", err);
  }

  const dt = new DataTransfer();
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    if (!url) continue;
    try {
      let blob = null;
      if (url.startsWith("data:")) {
        blob = dataUrlToBlob(url);
      } else {
        const res = await fetch(url);
        blob = await res.blob();
      }
      if (blob) {
        if (!url.startsWith("data:")) {
          try {
            blob = await enhanceImageWithCanvasHD(blob);
          } catch (enhErr) {
            console.warn("Aviso: Remasterización omitida para foto:", enhErr);
          }
        }
        const file = new File([blob], `haibane_hd_${productId || 'item'}_${i}.jpg`, { type: blob.type || "image/jpeg" });
        dt.items.add(file);
      }
    } catch (e) {
      console.warn(`Error al preparar foto ${url}:`, e);
    }
  }

  if (dt.files.length > 0) {
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    photosInjectedForProduct = productId;
    return true;
  }
  return false;
}

function parseFirestoreValue(valObj) {
  if (!valObj) return null;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
  if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
  if ("booleanValue" in valObj) return valObj.booleanValue;
  if ("timestampValue" in valObj) return valObj.timestampValue;
  if ("nullValue" in valObj) return null;
  if ("arrayValue" in valObj) {
    const values = valObj.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  if ("mapValue" in valObj) {
    const fields = valObj.mapValue.fields || {};
    const res = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

async function fetchProductDirectFromFirestore(productId) {
  const apiKey = "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig";
  const collections = ["dev_rewards_catalog", "rewards_catalog", "rewards"];
  for (const col of collections) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/lain-wired-club/databases/(default)/documents/${col}/${productId}?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const doc = await res.json();
      const docId = doc.name.split("/").pop();
      const fields = doc.fields || {};
      const parsed = { id: docId, _collection: col };
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = parseFirestoreValue(v);
      }
      return parsed;
    } catch (e) {}
  }
  return null;
}

function findFacebookMarketplaceInputs() {
  let titleInput = document.querySelector('input[aria-label*="Título" i], input[aria-label*="Title" i], input[name*="title" i], input[placeholder*="Título" i]');
  if (!titleInput) {
    const textInputs = Array.from(document.querySelectorAll('input[type="text"]:not([aria-hidden="true"]), input:not([type]):not([aria-hidden="true"])'));
    titleInput = textInputs.find(i => {
      const label = (i.closest('label')?.innerText || i.getAttribute('aria-label') || '').toLowerCase();
      return label.includes("título") || label.includes("title");
    });
  }

  let priceInput = document.querySelector('input[aria-label*="Precio" i], input[aria-label*="Price" i], input[name*="price" i], input[placeholder*="Precio" i]');
  if (!priceInput) {
    const allInputs = Array.from(document.querySelectorAll('input:not([aria-hidden="true"])'));
    priceInput = allInputs.find(i => {
      const label = (i.closest('label')?.innerText || i.getAttribute('aria-label') || '').toLowerCase();
      return label.includes("precio") || label.includes("price");
    });
  }

  let descInput = document.querySelector('textarea[aria-label*="Descripción" i], textarea[aria-label*="Description" i], div[aria-label*="Descripción" i][role="textbox"], div[aria-label*="Description" i][role="textbox"]');
  if (!descInput) {
    const allTextareas = Array.from(document.querySelectorAll('textarea, div[role="textbox"]'));
    descInput = allTextareas.find(t => {
      const label = (t.closest('label')?.innerText || t.getAttribute('aria-label') || '').toLowerCase();
      return label.includes("descrip");
    }) || allTextareas[0];
  }

  const fileInput = document.querySelector('input[type="file"][accept*="image"]');

  return { titleInput, priceInput, descInput, fileInput };
}

function scrollFormContainer(distance = 450) {
  const scrollables = Array.from(document.querySelectorAll('div, form, main')).filter(el => {
    const style = window.getComputedStyle(el);
    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
  });
  scrollables.forEach(s => {
    s.scrollTop += distance;
  });
  window.scrollBy(0, distance);
}

async function autoSelectCategory(product) {
  const title = (product.title || "").toLowerCase();
  
  // Palabras clave prioritarias según el producto
  let targetKeywords = [];
  if (title.includes("mando") || title.includes("control") || title.includes("gamepad") || title.includes("switch") || title.includes("consola")) {
    targetKeywords = [
      "videojuegos y consolas", "videojuegos", "consolas", "electrónica y computadoras", "electrónica"
    ];
  } else if (title.includes("teclado") || title.includes("mouse") || title.includes("pantalla") || title.includes("laptop") || title.includes("monitor") || title.includes("computador") || title.includes("pc")) {
    targetKeywords = [
      "electrónica y computadoras", "computadoras", "electrónica", "accesorios de computadora", "videojuegos y consolas", "videojuegos"
    ];
  } else {
    targetKeywords = [
      "electrónica y computadoras", "computadoras", "electrónica", "videojuegos", "artículos de oficina"
    ];
  }

  // 1. Localizar el botón disparador de "Categoría"
  const allTriggers = Array.from(document.querySelectorAll('label, div[role="combobox"], div[aria-haspopup="listbox"], div[role="button"]'));
  const catTrigger = allTriggers.find(el => {
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const txt = (el.innerText || "").toLowerCase();
    return (aria.includes("categoría") || aria.includes("categoria") || txt.includes("categoría") || txt.includes("categoria")) &&
           !txt.includes("publicar") && !txt.includes("siguiente") && !txt.includes("guardar");
  });

  if (!catTrigger) {
    console.warn("Haibane: No se encontró el selector de Categoría en el DOM.");
    return false;
  }

  catTrigger.scrollIntoView({ block: "center" });
  catTrigger.click();
  catTrigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  catTrigger.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  await new Promise(r => setTimeout(r, 650));

  // 2. Buscar opciones interactivas en el menú emergente
  const popoverOptions = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], div[role="option"], div[tabindex="0"], div[role="listitem"]'))
    .filter(el => {
      const txt = (el.innerText || "").trim().toLowerCase();
      return txt && txt.length < 50 && el.querySelectorAll('div[role="button"], div[role="option"]').length === 0;
    });

  let matchedOption = null;
  for (const kw of targetKeywords) {
    matchedOption = popoverOptions.find(opt => {
      const t = (opt.innerText || "").trim().toLowerCase();
      return t === kw || t.startsWith(kw) || t.includes(kw);
    });
    if (matchedOption) break;
  }

  if (matchedOption) {
    console.log("✓ Categoría seleccionada:", matchedOption.innerText);
    matchedOption.scrollIntoView({ block: "center" });
    matchedOption.click();
    matchedOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    matchedOption.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));

    // Si abrió un submenú de subcategorías, buscar y pulsar coincidencia
    const subOptions = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], div[role="option"], div[tabindex="0"]'))
      .filter(el => {
        const txt = (el.innerText || "").trim().toLowerCase();
        return txt && txt.length < 50 && el.querySelectorAll('div[role="button"]').length === 0;
      });

    const matchedSub = subOptions.find(opt => {
      const t = (opt.innerText || "").trim().toLowerCase();
      return targetKeywords.some(kw => t.includes(kw) || kw.includes(t));
    });

    if (matchedSub && matchedSub !== matchedOption) {
      console.log("✓ Subcategoría seleccionada:", matchedSub.innerText);
      matchedSub.scrollIntoView({ block: "center" });
      matchedSub.click();
      matchedSub.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      matchedSub.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
    }

    return true;
  }

  return false;
}

async function autoSelectCondition(preferred = "Nuevo") {
  scrollFormContainer(250);
  await new Promise(r => setTimeout(r, 300));

  const allTriggers = Array.from(document.querySelectorAll('label, div[role="combobox"], div[aria-haspopup="listbox"], div[role="button"]'));
  const conditionTrigger = allTriggers.find(el => {
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const txt = (el.innerText || "").toLowerCase();
    return (aria.includes("estado") || txt.includes("estado") || aria.includes("condition") || txt.includes("condition")) &&
           !txt.includes("publicar") && !txt.includes("siguiente") && !txt.includes("guardar");
  });

  if (!conditionTrigger) {
    console.warn("Haibane: No se encontró el selector de Estado.");
    return false;
  }

  conditionTrigger.scrollIntoView({ block: "center" });
  conditionTrigger.click();
  conditionTrigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  conditionTrigger.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  await new Promise(r => setTimeout(r, 600));

  const optionElements = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], div[role="option"], div[tabindex="0"], div[role="listitem"]'))
    .filter(el => {
      const txt = (el.innerText || "").trim().toLowerCase();
      return txt && txt.length < 35 && el.querySelectorAll('div[role="button"]').length === 0;
    });

  const newOption = optionElements.find(el => {
    const t = (el.innerText || "").trim().toLowerCase();
    return t === "nuevo" || t.startsWith("nuevo") || t === "new";
  });

  if (newOption) {
    console.log("✓ Estado 'Nuevo' seleccionado con éxito.");
    newOption.scrollIntoView({ block: "center" });
    newOption.click();
    newOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    newOption.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    return true;
  }

  return false;
}

async function expandAndFillDescription(product) {
  scrollFormContainer(600);
  await new Promise(r => setTimeout(r, 400));

  // 1. Desplegar acordeón de "Más detalles" si existe
  const clickables = Array.from(document.querySelectorAll('div[role="button"], span, div, label'));
  const moreDetailsBtn = clickables.find(el => {
    const txt = (el.innerText || "").trim().toLowerCase();
    return (txt === "más detalles" || txt.includes("más detalles") || txt.includes("incluye otros detalles") || txt.includes("more details")) &&
           el.children.length <= 4 && !txt.includes("publicar") && !txt.includes("siguiente");
  });

  if (moreDetailsBtn) {
    console.log("Desplegando 'Más detalles'...");
    moreDetailsBtn.scrollIntoView({ block: "center" });
    moreDetailsBtn.click();
    await new Promise(r => setTimeout(r, 500));
    scrollFormContainer(400);
  }

  // 2. Localizar campo de descripción
  let descInput = document.querySelector('textarea[aria-label*="Descripción" i], textarea[aria-label*="Description" i], textarea[placeholder*="Descripción" i], textarea[placeholder*="Description" i]');
  if (!descInput) {
    descInput = document.querySelector('div[role="textbox"][aria-label*="Descripción" i], div[role="textbox"][aria-label*="Description" i]');
  }
  if (!descInput) {
    const allTextareas = Array.from(document.querySelectorAll('textarea'));
    descInput = allTextareas[0];
  }
  if (!descInput) {
    const contentEditables = Array.from(document.querySelectorAll('div[contenteditable="true"]'));
    descInput = contentEditables.find(c => {
      const parentTxt = (c.closest('label')?.innerText || c.parentElement?.innerText || "").toLowerCase();
      return parentTxt.includes("descrip");
    }) || contentEditables[0];
  }

  if (descInput) {
    console.log("✓ Campo de descripción localizado:", descInput.tagName);
    descInput.scrollIntoView({ block: "center" });
    const formattedDesc = formatAiMarketplaceCopy(product);

    if (descInput.tagName.toLowerCase() === 'textarea') {
      setNativeInputValue(descInput, formattedDesc);
      descInput.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, formattedDesc);
      descInput.dispatchEvent(new Event('input', { bubbles: true }));
      descInput.dispatchEvent(new Event('change', { bubbles: true }));
      descInput.dispatchEvent(new Event('blur', { bubbles: true }));
    } else {
      descInput.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, formattedDesc);
      descInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
      descInput.dispatchEvent(new Event('change', { bubbles: true }));
      descInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    return true;
  }

  console.warn("Haibane: No se localizó campo de descripción tras scroll.");
  return false;
}

/**
 * Redondea inteligentemente el precio en Córdobas (NIO) al valor comercial más atractivo y amigable
 */
function getSmartRoundedPrice(rawNio) {
  if (!rawNio || rawNio <= 0) return 0;
  const num = Math.round(rawNio);
  if (num < 150) {
    return Math.round(num / 10) * 10;
  } else if (num < 500) {
    return Math.round(num / 25) * 25;
  } else {
    // Para montos >= 500 (ej: 1776 -> 1800, 925 -> 950, 555 -> 550, 370 -> 375/400)
    return Math.round(num / 50) * 50;
  }
}

/**
 * Genera hasta 20 etiquetas SEO estratégicas basadas en el nicho del producto
 */
function generateProductSeoTags(product) {
  const title = (product.title || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const fullText = `${title} ${desc}`;

  const tags = new Set();

  // 1. Tags directas por nicho
  if (/mando|control|gamepad|switch|gamer|gaming|rgb|teclado|mouse/.test(fullText)) {
    tags.add("gamer");
    tags.add("gaming");
    tags.add("videojuegos");
    tags.add("accesorios gamer");
    tags.add("setup gamer");
  }

  if (/teclado/.test(fullText)) {
    tags.add("teclado gamer");
    tags.add("teclado mecanico");
    tags.add("teclado rgb");
    tags.add("hotswap");
    tags.add("perifericos pc");
  }

  if (/mando|control|gamepad/.test(fullText)) {
    tags.add("mando gamer");
    tags.add("control inalambrico");
    tags.add("gamepad pc");
    tags.add("consolas");
    tags.add("control bluetooth");
  }

  if (/pc|computador|laptop|hardware/.test(fullText)) {
    tags.add("computadoras");
    tags.add("laptops");
    tags.add("pc gaming");
    tags.add("tecnologia");
  }

  // 2. Tags de confianza y localidad
  tags.add("juigalpa");
  tags.add("managua");
  tags.add("nicaragua");
  tags.add("tienda gamer");
  tags.add("meltydeays");
  tags.add("ofertas");
  tags.add("electronica");

  // 3. Palabras clave del título
  const words = title
    .replace(/[^\w\sáéíóúñ]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !["con", "para", "por", "las", "los", "del", "una", "uno", "este"].includes(w));
  
  words.forEach(w => {
    if (tags.size < 20) tags.add(w);
  });

  return Array.from(tags).slice(0, 20);
}

let isAutofillPipelineActive = false;
let isAutofillPipelineCompleted = false;
let assistantInitializedForUrl = null;

function isBrandInputElement(el) {
  if (!el) return false;
  const aria = (el.getAttribute('aria-label') || '').toLowerCase().trim();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase().trim();
  const name = (el.getAttribute('name') || '').toLowerCase().trim();
  const labelTxt = (el.closest('label')?.innerText || el.parentElement?.innerText || '').toLowerCase().trim();
  return aria === 'marca' || aria.startsWith('marca') ||
         placeholder === 'marca' || placeholder.startsWith('marca') ||
         name === 'brand' || name === 'marca' ||
         labelTxt.startsWith('marca') || labelTxt === 'marca';
}

function findBrandInput() {
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"])'));
  return inputs.find(i => isBrandInputElement(i)) || null;
}

/**
 * Detecta si el producto cuenta con una marca formal configurada o mencionada en su título/descripción.
 * Limpia menciones de compatibilidad ("para Nintendo", "compatible con Xbox", "funda para...")
 * para no confundir compatibilidad con la marca del fabricante.
 * Si es genérico, chino o no menciona marca, devuelve "".
 */
function detectProductBrand(product) {
  if (!product) return "";

  // 1. Marca explícita en los campos del catálogo
  if (product.brand && typeof product.brand === "string" && product.brand.trim()) {
    return product.brand.trim();
  }
  if (product.marca && typeof product.marca === "string" && product.marca.trim()) {
    return product.marca.trim();
  }
  if (product.brandVerified && product.brandName && typeof product.brandName === "string" && product.brandName.trim()) {
    return product.brandName.trim();
  }

  // 2. Extracción inteligente desde el título y descripción descartando compatibilidades
  const rawTitle = String(product.title || "");
  const rawDesc = String(product.description || product.rawDescription || "");

  // Limpiar compatibilidades del título para evitar falsos positivos
  const cleanTitle = rawTitle
    .replace(/\b(para|for|compatible(\s+con)?|diseñado\s+para|soporte\s+para|funda\s+para|estuche\s+para)\s+[a-z0-9\-\s]+/gi, "")
    .trim();

  // Catálogo de marcas oficiales con capitalización de fábrica
  const BRAND_MAP = [
    { regex: /\b(tp-?link)\b/i, name: "TP-Link" },
    { regex: /\b(gamesir)\b/i, name: "GameSir" },
    { regex: /\b(acer|predator|helios)\b/i, name: "Acer" },
    { regex: /\b(anker|soundcore|powercore)\b/i, name: "Anker" },
    { regex: /\b(logitech|logi)\b/i, name: "Logitech" },
    { regex: /\b(razer)\b/i, name: "Razer" },
    { regex: /\b(redragon)\b/i, name: "Redragon" },
    { regex: /\b(asus|rog|strix)\b/i, name: "Asus" },
    { regex: /\b(lenovo|legion)\b/i, name: "Lenovo" },
    { regex: /\b(dell|alienware)\b/i, name: "Dell" },
    { regex: /\b(hp|omen|victus)\b/i, name: "HP" },
    { regex: /\b(hyperx)\b/i, name: "HyperX" },
    { regex: /\b(corsair)\b/i, name: "Corsair" },
    { regex: /\b(steelseries)\b/i, name: "SteelSeries" },
    { regex: /\b(sony|dualsense|playstation)\b/i, name: "Sony" },
    { regex: /\b(microsoft|xbox)\b/i, name: "Microsoft" },
    { regex: /\b(nintendo|switch)\b/i, name: "Nintendo" },
    { regex: /\b(samsung|galaxy)\b/i, name: "Samsung" },
    { regex: /\b(apple|ipad|macbook|iphone)\b/i, name: "Apple" },
    { regex: /\b(xiaomi|redmi|poco)\b/i, name: "Xiaomi" },
    { regex: /\b(jbl)\b/i, name: "JBL" },
    { regex: /\b(ugreen)\b/i, name: "UGREEN" },
    { regex: /\b(baseus)\b/i, name: "Baseus" },
    { regex: /\b(fantech)\b/i, name: "Fantech" },
    { regex: /\b(machkeike)\b/i, name: "Machkeike" },
    { regex: /\b(glorious)\b/i, name: "Glorious" },
    { regex: /\b(epomaker)\b/i, name: "Epomaker" },
    { regex: /\b(keychron)\b/i, name: "Keychron" },
    { regex: /\b(8bitdo)\b/i, name: "8BitDo" },
    { regex: /\b(dareu)\b/i, name: "Dareu" },
    { regex: /\b(thunderobot)\b/i, name: "Thunderobot" },
    { regex: /\b(ajazz)\b/i, name: "Ajazz" },
    { regex: /\b(attack shark)\b/i, name: "Attack Shark" },
    { regex: /\b(flydigi)\b/i, name: "Flydigi" }
  ];

  // Primero buscar en el título limpio (máxima certeza)
  for (const b of BRAND_MAP) {
    if (b.regex.test(cleanTitle)) {
      return b.name;
    }
  }

  // Si no se encontró en el título, verificar si la descripción hace mención explícita a la marca
  for (const b of BRAND_MAP) {
    if (b.regex.test(rawDesc)) {
      return b.name;
    }
  }

  // 3. Si no hay marca legítima (es genérico, chino o no especificada)
  return "";
}

/**
 * Inyecta la marca legítima del producto si fue configurada o mencionada en la publicación.
 * Si es marca china sin mención o producto sin marca, deja el campo completamente vacío.
 */
async function injectProductBrand(product) {
  const brandInput = findBrandInput();
  if (!brandInput) {
    console.log("Haibane: No se detectó campo de Marca en Facebook.");
    return false;
  }

  const legitimateBrand = detectProductBrand(product);

  if (legitimateBrand) {
    console.log(`✓ Haibane: Inyectando marca legítima del producto: "${legitimateBrand}"`);
    brandInput.scrollIntoView({ block: "center", behavior: "instant" });
    brandInput.focus();
    setNativeInputValue(brandInput, legitimateBrand);
    brandInput.dispatchEvent(new Event('input', { bubbles: true }));
    brandInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return true;
  } else {
    // Si no tiene marca o no se hace mención, garantizar que el campo quede completamente vacío
    if (brandInput.value && brandInput.value !== "") {
      setNativeInputValue(brandInput, "");
      brandInput.dispatchEvent(new Event('input', { bubbles: true }));
      brandInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    console.log("✓ Haibane: Campo Marca dejado vacío (artículo genérico o sin mención de marca).");
    return true;
  }
}

function findProductTagsInput() {
  // 1. Selector directo por aria-label o placeholder excluyendo explícitamente el campo Marca
  const directCandidates = Array.from(document.querySelectorAll(
    'input[aria-label*="etiquetas de productos" i], ' +
    'input[aria-label*="etiquetas" i], ' +
    'input[placeholder*="etiquetas de productos" i], ' +
    'input[placeholder*="etiquetas" i], ' +
    'textarea[aria-label*="etiquetas de productos" i], ' +
    'textarea[aria-label*="etiquetas" i]'
  )).filter(i => !isBrandInputElement(i));
  if (directCandidates.length > 0) return directCandidates[0];

  // 2. Buscar por label específico de texto "Etiquetas de productos"
  const tagLabels = Array.from(document.querySelectorAll('label, div, span, p')).filter(el => {
    const txt = (el.innerText || '').trim().toLowerCase();
    return (txt === 'etiquetas de productos' || txt === 'product tags' || txt.startsWith('etiquetas de productos')) && el.children.length <= 2;
  });

  for (const tagLabel of tagLabels) {
    const parentContainer = tagLabel.closest('label') || tagLabel.closest('div[role="none"]') || tagLabel.parentElement;
    const input = parentContainer?.querySelector('input:not([type="hidden"]):not([type="file"]), textarea');
    if (input && !isBrandInputElement(input)) return input;
  }

  // 3. Buscar por el texto descriptivo "Opcional. Límite: 20"
  const limitGuide = Array.from(document.querySelectorAll('span, div')).find(el => {
    const txt = (el.innerText || '').trim().toLowerCase();
    return (txt.includes('límite: 20') || txt.includes('limite: 20')) && el.children.length === 0;
  });
  if (limitGuide) {
    const parent = limitGuide.parentElement;
    if (parent) {
      const prevBox = limitGuide.previousElementSibling || parent.querySelector('label') || parent.previousElementSibling;
      const input = prevBox?.querySelector('input:not([type="hidden"]):not([type="file"]), textarea');
      if (input && !isBrandInputElement(input)) return input;
    }
  }

  return null;
}

/**
 * Inyecta hasta 20 etiquetas SEO en el campo nativo de Marketplace
 */
async function injectProductTags(tags) {
  if (!tags || tags.length === 0) return false;

  scrollFormContainer(650);
  await new Promise(r => setTimeout(r, 450));

  let tagInput = findProductTagsInput();
  if (!tagInput) {
    // Si aún no está en foco, buscar el contenedor de texto y hacer clic para montar el input
    const tagLabel = Array.from(document.querySelectorAll('label, div, span')).find(el => {
      const txt = (el.innerText || '').trim().toLowerCase();
      return (txt === 'etiquetas de productos' || txt.startsWith('etiquetas de productos')) && el.children.length <= 2;
    });
    if (tagLabel) {
      tagLabel.scrollIntoView({ block: "center", behavior: "instant" });
      tagLabel.click();
      await new Promise(r => setTimeout(r, 200));
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') && !isBrandInputElement(document.activeElement)) {
        tagInput = document.activeElement;
      }
    }
  }

  if (!tagInput) {
    tagInput = findProductTagsInput();
  }

  if (!tagInput) {
    console.warn("Haibane: No se encontró el campo exclusivo de Etiquetas de productos tras scroll.");
    return false;
  }

  tagInput.scrollIntoView({ block: "center", behavior: "instant" });
  await new Promise(r => setTimeout(r, 200));

  let insertedCount = 0;
  for (const tag of tags) {
    if (!tag) continue;
    try {
      tagInput.focus();
      tagInput.click();

      setNativeInputValue(tagInput, tag);
      tagInput.dispatchEvent(new Event('input', { bubbles: true }));
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, tag);
      tagInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));

      const enterEvtInit = {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        charCode: 13,
        bubbles: true,
        cancelable: true,
        composed: true
      };
      tagInput.dispatchEvent(new KeyboardEvent('keydown', enterEvtInit));
      tagInput.dispatchEvent(new KeyboardEvent('keypress', enterEvtInit));
      tagInput.dispatchEvent(new KeyboardEvent('keyup', enterEvtInit));

      const commaEvtInit = {
        key: ',',
        code: 'Comma',
        keyCode: 188,
        which: 188,
        bubbles: true,
        cancelable: true,
        composed: true
      };
      tagInput.dispatchEvent(new KeyboardEvent('keydown', commaEvtInit));
      tagInput.dispatchEvent(new KeyboardEvent('keyup', commaEvtInit));

      insertedCount++;
      await new Promise(r => setTimeout(r, 130));
    } catch (e) {
      console.warn(`Error al inyectar etiqueta '${tag}':`, e);
    }
  }

  console.log(`✓ Haibane: ${insertedCount} etiquetas inyectadas con éxito en Etiquetas de productos.`);
  return true;
}

/**
 * Marca automáticamente las preferencias de entrega: Encuentro en lugar público, Retiro en la puerta y Entrega en la puerta
 */
async function autoSelectDeliveryPreferences() {
  scrollFormContainer(650);
  await new Promise(r => setTimeout(r, 450));

  const preferences = [
    { name: "Encuentro en un lugar público", keywords: ["encuentro en un lugar público", "lugar público", "lugar publico"] },
    { name: "Retiro en la puerta", keywords: ["retiro en la puerta", "retira el artículo en tu puerta", "retira el articulo en tu puerta"] },
    { name: "Entrega en la puerta", keywords: ["entrega en la puerta", "entrega en la puerta del comprador"] }
  ];

  for (const pref of preferences) {
    try {
      // 1. Buscar elementos de texto hoja
      const textNodes = Array.from(document.querySelectorAll('div, span, label, p')).filter(el => {
        const txt = (el.innerText || "").trim().toLowerCase();
        return pref.keywords.some(k => txt.includes(k)) && txt.length < 100 && el.children.length <= 3;
      });

      if (textNodes.length === 0) {
        console.warn(`Haibane: No se encontró texto para preferencia '${pref.name}'`);
        continue;
      }

      textNodes.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
      const textEl = textNodes[0];

      // 2. Localizar el contenedor de la fila
      const row = textEl.closest('div[role="listitem"]') || 
                  textEl.closest('label') || 
                  textEl.closest('div[role="button"]') ||
                  textEl.parentElement?.parentElement || 
                  textEl.parentElement;

      if (!row) continue;

      // 3. Localizar el checkbox dentro de la fila o en el propio row
      const box = row.querySelector('div[role="checkbox"], input[type="checkbox"], div[aria-checked]') || row;

      const isChecked = (
        box.checked === true ||
        box.getAttribute('aria-checked') === 'true' ||
        box.getAttribute('aria-pressed') === 'true' ||
        row.getAttribute('aria-checked') === 'true'
      );

      if (!isChecked) {
        box.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise(r => setTimeout(r, 80));

        const targetToClick = box !== row ? box : (row.querySelector('label') || row);
        targetToClick.click();
        targetToClick.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        targetToClick.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        targetToClick.dispatchEvent(new Event("change", { bubbles: true }));

        console.log(`✓ Haibane: Preferencia activada -> ${pref.name}`);
        await new Promise(r => setTimeout(r, 200));

        // Respaldo secundario si aún no cambió el estado
        const stillChecked = (
          box.checked === true ||
          box.getAttribute('aria-checked') === 'true' ||
          row.getAttribute('aria-checked') === 'true'
        );
        if (!stillChecked && row !== targetToClick) {
          row.click();
          row.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise(r => setTimeout(r, 150));
        }
      } else {
        console.log(`Haibane: Preferencia ya estaba activa -> ${pref.name}`);
      }
    } catch (err) {
      console.warn(`Haibane: Error al marcar preferencia '${pref.name}':`, err);
    }
  }
}

function triggerAutoFillPipeline(product) {
  if (isAutofillPipelineActive || isAutofillPipelineCompleted) {
    console.log("Haibane: Pipeline de auto-rellenado ya en curso o finalizado, omitiendo ejecución redundante.");
    return;
  }
  isAutofillPipelineActive = true;

  let attempts = 0;
  const maxAttempts = 30; // 30 intentos x 350ms = ~10.5 segundos
  const interval = setInterval(async () => {
    attempts++;
    const { titleInput, priceInput, fileInput } = findFacebookMarketplaceInputs();

    if (titleInput || priceInput || fileInput) {
      clearInterval(interval);
      const statusEl = document.getElementById("haibane-autofill-status");
      if (statusEl) statusEl.textContent = "⏳ Paso 1/7: Inyectando fotos HD y slide QR...";

      const rawPriceNio = product.priceNio || Math.round((product.priceUsd || 0) * 37.0);
      const roundedPrice = getSmartRoundedPrice(rawPriceNio);
      const images = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : (product.imageUrl ? [product.imageUrl] : []);

      // 1. Fotos HD deduplicadas + Slide con Código QR oficial (solo 1 vez con lock)
      if (images.length > 0 && fileInput) {
        try {
          await injectProductPhotosToForm(images, product.id);
          await new Promise(r => setTimeout(r, 600));
        } catch (e) {
          console.warn("Error en fotos:", e);
        }
      }

      // 2. Título
      if (statusEl) statusEl.textContent = "⏳ Paso 2/7: Inyectando título...";
      if (titleInput) {
        const cleanTitle = (product.title || "").replace(/(\$|c\$|\busd\b)\s*\d+/gi, "").trim();
        setNativeInputValue(titleInput, cleanTitle.slice(0, 75));
      }

      // 3. Precio Redondo Inteligente
      if (priceInput) {
        setNativeInputValue(priceInput, String(roundedPrice));
      }

      await new Promise(r => setTimeout(r, 500));

      // 4. Categoría (Secuencial)
      if (statusEl) statusEl.textContent = "⏳ Paso 3/7: Seleccionando categoría óptima...";
      try {
        await autoSelectCategory(product);
        await new Promise(r => setTimeout(r, 700));
      } catch (e) {
        console.warn("Error en categoría:", e);
      }

      // 5. Estado "Nuevo" (Secuencial tras cierre de categoría)
      if (statusEl) statusEl.textContent = "⏳ Paso 4/8: Estableciendo estado 'Nuevo'...";
      try {
        await autoSelectCondition("Nuevo");
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.warn("Error en estado:", e);
      }

      // 6. Marca de Producto (solo si está en catálogo web, si no se deja limpia/vacía)
      if (statusEl) statusEl.textContent = "⏳ Paso 5/8: Configurando campo Marca...";
      try {
        await injectProductBrand(product);
        await new Promise(r => setTimeout(r, 400));
      } catch (e) {
        console.warn("Error en marca:", e);
      }

      // 7. Descripción con enlace oficial y mención del QR
      if (statusEl) statusEl.textContent = "⏳ Paso 6/8: Rellenando ficha técnica con link web y QR...";
      try {
        await expandAndFillDescription(product);
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn("Error en descripción:", e);
      }

      // 8. Etiquetas de Producto (hasta 20 tags SEO exclusivas en su campo)
      if (statusEl) statusEl.textContent = "⏳ Paso 7/8: Inyectando 20 etiquetas SEO en Etiquetas de productos...";
      try {
        const tags = generateProductSeoTags(product);
        await injectProductTags(tags);
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn("Error en etiquetas:", e);
      }

      // 9. Preferencias de Entrega (Encuentro público, Retiro en puerta, Entrega en puerta)
      if (statusEl) statusEl.textContent = "⏳ Paso 8/8: Marcando preferencias de entrega y retiro...";
      try {
        await autoSelectDeliveryPreferences();
      } catch (e) {
        console.warn("Error en preferencias:", e);
      }

      isAutofillPipelineCompleted = true;
      isAutofillPipelineActive = false;

      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:800;">✓ ¡Publicación completada al 100%! (Fotos + QR, Precio C$ ${roundedPrice.toLocaleString()}, Categoría, Estado, Ficha, 20 Etiquetas y Entrega).</span> Pulsa 'Siguiente' para publicar.`;
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      isAutofillPipelineActive = false;
      const statusEl = document.getElementById("haibane-autofill-status");
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#f59e0b;">Pulsa '⚡ Inyectar' cuando el formulario cargue.</span>`;
      }
    }
  }, 350);
}

function injectBatchHud(batchIndex, batchTotal, itemTitle, oldListingId) {
  if (document.getElementById("haibane-batch-hud")) return;
  const hud = document.createElement("div");
  hud.id = "haibane-batch-hud";
  hud.style.cssText = `
    position: fixed;
    top: 14px;
    right: 18px;
    background: #090d16;
    border: 1.5px solid #0284c7;
    border-radius: 8px;
    padding: 10px 14px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    z-index: 9999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.65);
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 330px;
  `;
  hud.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">
      <strong style="color: #38bdf8; font-size: 11.5px;">⚡ LOTE DE RENOVACIÓN IA</strong>
      <span style="font-size: 9.5px; background: #0369a1; color: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${batchIndex + 1} de ${batchTotal}</span>
    </div>
    <div style="color: #f1f5f9; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px;" title="${itemTitle || ''}">
      ${itemTitle || "Publicación"}
    </div>
    <div id="haibane-batch-hud-status" style="color: #94a3b8; font-size: 10px; line-height: 1.3;">
      Inyectando fotos HD, ficha y 12 grupos...
    </div>
    <div style="display: flex; gap: 6px; margin-top: 3px;">
      <button id="haibane-hud-btn-next" style="flex: 1; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; padding: 5px 8px; font-weight: 700; cursor: pointer; font-size: 10px;" title="Avanzar de inmediato a la siguiente publicación">
        ⏭ Siguiente
      </button>
      <button id="haibane-hud-btn-cancel" style="background: #334155; color: #cbd5e1; border: none; border-radius: 4px; padding: 5px 8px; font-size: 10px; cursor: pointer;" title="Detener el lote de renovación">
        ✕ Detener
      </button>
    </div>
  `;
  document.body.appendChild(hud);

  document.getElementById("haibane-hud-btn-next")?.addEventListener("click", () => {
    chrome.runtime?.sendMessage({ action: "FORCE_NEXT_BATCH_ITEM" });
  });

  document.getElementById("haibane-hud-btn-cancel")?.addEventListener("click", () => {
    chrome.runtime?.sendMessage({ action: "CANCEL_BATCH_RELIST" });
    hud.remove();
  });
}

/**
 * Asistente de Creación Automática Web ➔ Facebook Marketplace (/marketplace/create/item)
 */
function initAutoPublishAssistant() {
  const urlParams = new URLSearchParams(window.location.search);
  const haibaneId = urlParams.get("haibane_id");
  const overridePrice = urlParams.get("override_price");
  const isBatch = urlParams.get("batch_active") === "true";
  const batchIndex = parseInt(urlParams.get("batch_index") || "0", 10);
  const batchTotal = parseInt(urlParams.get("batch_total") || "1", 10);
  const oldListingId = urlParams.get("old_listing_id") || "";
  const preferRealPhotos = urlParams.get("prefer_real_photos") === "true";
  const thumbUrl = urlParams.get("thumb_url");
  if (!haibaneId) return;

  const currentSignature = `${window.location.pathname}?haibane_id=${haibaneId}`;
  if (assistantInitializedForUrl === currentSignature) {
    return; // Ya inicializado para esta URL exacta
  }
  assistantInitializedForUrl = currentSignature;

  let loaded = false;
  function onProductLoaded(prod) {
    if (loaded) return;
    loaded = true;
    if (!prod) {
      console.warn("No se pudo obtener el producto para auto-publicar:", haibaneId);
      return;
    }
    if (overridePrice && !isNaN(Number(overridePrice)) && Number(overridePrice) > 0) {
      prod.priceNio = Number(overridePrice);
    }
    if (preferRealPhotos && thumbUrl) {
      prod.images = [thumbUrl];
    }
    injectPublishAssistantBanner(prod);
    if (isBatch) {
      injectBatchHud(batchIndex, batchTotal, prod.title, oldListingId);
    }
    triggerAutoFillPipeline(prod);
    watchForPublishCompletion(prod.id, prod._collection);
  }

  try {
    chrome.runtime?.sendMessage({ action: "GET_PRODUCT_BY_ID", productId: haibaneId }, (response) => {
      if (response && response.success && response.product) {
        onProductLoaded(response.product);
      } else {
        fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
      }
    });
  } catch {
    fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
  }

  // Fallback de contingencia solo si aún no cargó
  setTimeout(() => {
    if (!loaded) {
      fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
    }
  }, 1200);
}

/**
 * Formatea la ficha comercial para Facebook Marketplace con iconos, link web, garantía y WhatsApp
 */
function formatAiMarketplaceCopy(product) {
  const raw = product.description || product.rawDescription || "";
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().includes("precio") && !l.includes("$") && !l.toLowerCase().includes("c$"));

  const featureBullets = lines.length > 0
    ? lines.map(l => l.startsWith("•") ? l : `• 🚀 ${l}`).join("\n")
    : `• 🕹️ Condición: Artículo original verificado y garantizado físicamente\n• ⚡ Rendimiento: Alto desempeño y compatibilidad garantizada\n• 📦 Entrega: Disponible para retiro o entrega inmediata`;

  const cleanHeaderTitle = (product.title || "").replace(/(\$|c\$|\busd\b)\s*\d+/gi, "").trim();

  return `✨ ${cleanHeaderTitle}

⚡ CARACTERÍSTICAS PRINCIPALES:
${featureBullets}

🛡️ GARANTÍA & RESPALDO:
• Cobertura y garantía oficial MeltyDeays con revisión técnica presencial en tienda física.

🎁 THE WIRED CLUB (OFERTAS EXCLUSIVAS EN NUESTRA WEB):
• 🌐 Visita nuestra tienda web oficial: https://meltydeays-wired-club.vercel.app
• 💎 Bono de Bienvenida: Recibe $5 USD en puntos (250 WP) al registrarte por primera vez desde tu celular, canjeables por descuentos en nuestro catálogo.
• 📱 Código QR: Escanea el código QR en la última fotografía de esta publicación con la cámara de tu celular para ingresar directo a la tienda web.

📲 PEDIDOS Y ATENCIÓN DIRECTA:
• WhatsApp / Teléfono: 5843-8412
• 📍 Entregas personales en Juigalpa y envíos seguros a toda Nicaragua`;
}

function injectPublishAssistantBanner(product) {
  if (document.getElementById("haibane-publish-banner")) return;

  const banner = document.createElement("div");
  banner.id = "haibane-publish-banner";
  banner.style.cssText = `
    position: fixed;
    top: 70px;
    right: 25px;
    z-index: 9999999;
    background: #0f172a;
    border: 2px solid #a855f7;
    border-radius: 8px;
    padding: 14px 16px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  const priceNio = product.priceNio || Math.round((product.priceUsd || 0) * 37.0);
  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : (product.imageUrl ? [product.imageUrl] : []);

  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px;">
      <strong style="color: #c084fc; font-size: 12.5px;">⚡ Haibane Auto-Publish</strong>
      <span style="font-size: 10px; background: #581c87; color: #f3e8ff; padding: 1px 6px; border-radius: 4px;">GEMELO</span>
    </div>
    <div style="font-size: 11.5px; line-height: 1.4;">
      <div style="font-weight: 800; color: #ffffff;">${product.title}</div>
      <div style="color: #38bdf8; font-weight: 700; margin-top: 2px;">
        Precio: C$ ${priceNio.toLocaleString()} NIO ($${product.priceUsd} USD)
      </div>
      <div style="color: #94a3b8; font-size: 10.5px;">
        ${images.length} foto(s) HD disponibles para inyectar.
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="haibane-btn-do-autofill" style="flex: 1; background: #7e22ce; color: #ffffff; border: none; border-radius: 4px; padding: 7px 10px; font-weight: 800; cursor: pointer; font-size: 11px;">
        ⚡ Inyectar Formulario & Fotos HD
      </button>
      <button id="haibane-btn-close-banner" style="background: #334155; color: #cbd5e1; border: none; border-radius: 4px; padding: 7px; cursor: pointer;">✕</button>
    </div>
    <div id="haibane-autofill-status" style="font-size: 10.5px; color: #a855f7;"></div>
  `;

  document.body.appendChild(banner);

  document.getElementById("haibane-btn-close-banner")?.addEventListener("click", () => {
    banner.remove();
  });

  document.getElementById("haibane-btn-do-autofill")?.addEventListener("click", () => {
    isAutofillPipelineActive = false;
    isAutofillPipelineCompleted = false;
    triggerAutoFillPipeline(product);
    watchForPublishCompletion(product.id, product._collection);
  });
}

function watchForPublishCompletion(productId, collection) {
  let attempts = 0;
  const interval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(interval);
      return;
    }
    attempts++;
    const href = window.location.href;
    const match = href.match(/\/marketplace\/item\/(\d+)/);
    if (match && match[1]) {
      clearInterval(interval);
      const newListingId = match[1];
      console.log(`✓ Detectada publicación creada: ID #${newListingId}. Vinculando Gemelo...`);
      safeSendMessage({
        action: "LINK_PRODUCT_TO_FB",
        productId: productId,
        fbListingId: newListingId,
        fbUrl: href,
        collection: collection || "dev_rewards_catalog"
      }, () => {
        showHaibaneToast(`✓ Publicación gemela sellada (#${newListingId}). Sincronizado con la web.`);
      });
    } else if (href.includes("/marketplace/you/selling") && attempts > 1) {
      clearInterval(interval);
      console.log(`✓ Detectado retorno a Tus Publicaciones tras creación.`);
    }
    if (attempts > 60) clearInterval(interval); // Dejar de buscar a los 2 minutos
  }, 2000);
}

/**
 * =======================================================================
 * MOTOR DE AUTO-COMPARTIR EN GRUPOS DE FACEBOOK MARKETPLACE (12 GRUPOS)
 * =======================================================================
 */

/**
 * Puntuación de afinidad IA para grupos de Facebook con priorización territorial
 * 1. Juigalpa y Chontales ventas/tech/negocios (96-99 pts)
 * 2. Juigalpa local (90 pts)
 * 3. Lugares cercanos a Juigalpa (Acoyapa, Santo Tomás, Villa Sandino, Lovago, La Libertad, etc.) (78-88 pts)
 * 4. Tech / Gaming nacional (62-68 pts)
 * 5. Ventas nacional / Managua (52 pts)
 * 6. Baja afinidad / descarte (10 pts)
 */
function scoreGroupRelevance(groupName) {
  const norm = (groupName || "").toLowerCase().trim();

  // 1. Detección de grupos opuestos / baja afinidad
  const isOpposite = /ropa|calzado|zapatos|vestidos|moda|belleza|cosm[eé]ticos|bienes ra[ií]ces|casas|terrenos|alquiler|autos|carros|motos|veh[ií]culos|animales|mascotas/.test(norm);
  if (isOpposite) {
    return { score: 10, badge: "⚪ Baja Afinidad" };
  }

  // 2. Detección geográfica: Juigalpa y Chontales
  const isJuigalpa = /juigalpa|chontales/.test(norm);

  // 3. Detección geográfica: Lugares cercanos a la ciudad de Juigalpa
  const isNearby = /acoyapa|santo tom[aá]s|villa sandino|san pedro de l[oó]vago|la libertad|comalapa|cuapa|el coral|boaco|camoapa|teustepe|san lorenzo|el rama|nueva guinea|r[ií]o san juan|san carlos/.test(norm);

  // 4. Detección comercial (vender / compras / negocios / clasificados)
  const isCommerce = /ventas?|compras?|negocios?|comercio|bazar|gangas?|clasificados?|tienda|mercado|feria|cambalache|baratillo/.test(norm);

  // 5. Detección tecnológica / gaming
  const isTechGaming = /gamer|gaming|videojuegos?|consolas?|playstation|xbox|nintendo|pc gamer|setup|geek|computador|laptop|pc|hardware|inform[aá]tica|tecnolog[ií]a|electr[oó]nica|celular|smartphone|gadgets?/.test(norm);

  // CATEGORÍA 1: JUIGALPA (Máxima Prioridad)
  if (isJuigalpa) {
    if (isCommerce && isTechGaming) return { score: 99, badge: "🔥 Juigalpa Tech" };
    if (isCommerce) return { score: 96, badge: "📍 Juigalpa Ventas" };
    if (isTechGaming) return { score: 94, badge: "⚡ Juigalpa Tech" };
    return { score: 90, badge: "📍 Juigalpa Local" };
  }

  // CATEGORÍA 2: LUGARES CERCANOS A JUIGALPA (Segunda Prioridad)
  if (isNearby) {
    if (isCommerce && isTechGaming) return { score: 88, badge: "🏘️ Cercano Tech" };
    if (isCommerce) return { score: 85, badge: "🏘️ Cercano Ventas" };
    if (isTechGaming) return { score: 82, badge: "🏘️ Cercano Tech" };
    return { score: 78, badge: "🏘️ Zona Cercana" };
  }

  // CATEGORÍA 3: GAMING Y TECH GENERAL (Nacional)
  if (isTechGaming) {
    if (isCommerce) return { score: 68, badge: "⚡ Tech Ventas Nal" };
    return { score: 62, badge: "⚡ Gaming/PC Nal" };
  }

  // CATEGORÍA 4: VENTAS GENERALES (Nacional / Managua)
  if (isCommerce) {
    return { score: 52, badge: "🏷️ Ventas Nal" };
  }

  return { score: 40, badge: "🏷️ General" };
}

/**
 * Localiza el contenedor de grupos en Facebook Marketplace:
 * - Soporta tanto diálogos modales (role="dialog")
 * - Como la pantalla de Paso 2 de publicación (/marketplace/create/item?step=audience)
 * - Garantiza CERO efectos secundarios sobre el visor nativo de publicaciones.
 */
function findGroupSharingContainer() {
  // 1. Modales abiertos con opciones de grupos específicas
  const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
  for (const d of dialogs) {
    const txt = (d.innerText || "").toLowerCase();
    // Omitir si es visor de detalles de la publicación ("Tu publicación" o "Esta publicación está en revisión")
    if (txt.includes("esta publicación está en revisión") || (txt.includes("tu publicación") && !txt.includes("en tus grupos"))) {
      continue;
    }
    // Verificar que sea un diálogo con casillas de grupos reales
    const hasBoxes = d.querySelectorAll('div[role="checkbox"], input[type="checkbox"]').length > 0;
    if (
      hasBoxes &&
      (txt.includes("en tus grupos") || txt.includes("tus grupos de compra") || txt.includes("publicar en hasta 20 grupos") || txt.includes("share to groups"))
    ) {
      return { container: d, type: "dialog" };
    }
  }

  // 2. Pantalla de Creación de Publicación Paso 2 (ÚNICAMENTE si la URL es de creación de item)
  const isCreateUrl = window.location.href.includes("/marketplace/create");
  const isAudienceUrl = window.location.href.includes("step=audience");

  if (isCreateUrl || isAudienceUrl) {
    const audienceHeadings = Array.from(document.querySelectorAll('h1, h2, h3, span, div')).filter(el => {
      const txt = (el.innerText || "").trim().toLowerCase();
      return (txt === "publicar en más lugares" || txt === "en tus grupos" || txt === "list in more places") && el.children.length === 0;
    });

    if (isAudienceUrl || audienceHeadings.length > 0) {
      let root = null;
      if (audienceHeadings.length > 0) {
        root = audienceHeadings[0].closest('div[role="main"]') ||
               audienceHeadings[0].closest('form') ||
               audienceHeadings[0].closest('div[style*="max-width"]') ||
               audienceHeadings[0].parentElement?.parentElement?.parentElement;
      }
      if (!root) {
        root = document.querySelector('div[role="main"]') || document.querySelector('form');
      }
      if (root) {
        return { container: root, type: "audience_page" };
      }
    }
  }

  return null;
}

/**
 * Extrae casillas de grupos descartando la opción de Marketplace público
 */
function getValidGroupItems(rootContainer) {
  if (!rootContainer) return [];

  const allBoxes = Array.from(
    rootContainer.querySelectorAll('div[role="checkbox"], div[aria-checked], input[type="checkbox"]')
  );

  const groupItems = [];

  for (const box of allBoxes) {
    const row = box.closest('div[role="listitem"]') || 
                box.closest('div[role="button"]') || 
                box.closest('label') ||
                box.parentElement?.parentElement || 
                box.parentElement;
    const rowText = (row?.innerText || "").trim();
    const rowTextLower = rowText.toLowerCase();

    // Descartar si es la opción de Marketplace público
    if (
      rowTextLower.includes("los artículos de marketplace son públicos") ||
      rowTextLower.includes("marketplace son públicos") ||
      rowTextLower.includes("públicamente\nmarketplace") ||
      (rowTextLower.includes("marketplace") && !rowTextLower.includes("miembros") && !rowTextLower.includes("members"))
    ) {
      continue;
    }

    const lines = rowText.split("\n").map(l => l.trim()).filter(Boolean);
    let groupName = lines[0] || "";
    if (groupName.length <= 2 && lines.length > 1) {
      groupName = lines[1];
    }

    groupItems.push({
      box,
      row,
      name: groupName,
      fullText: rowText,
      isChecked: box.getAttribute("aria-checked") === "true" || box.checked === true
    });
  }

  return groupItems;
}

/**
 * Simula clic robusto en una casilla de grupo compatible con React de Facebook
 */
async function toggleGroupCheckbox(groupItem) {
  if (groupItem.isChecked) return true;

  const { box, row } = groupItem;
  box.scrollIntoView({ block: "nearest", behavior: "instant" });
  await new Promise(r => setTimeout(r, 40));

  const evtDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window });
  const evtUp = new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window });

  box.dispatchEvent(evtDown);
  box.dispatchEvent(evtUp);
  box.click();
  box.dispatchEvent(new Event("change", { bubbles: true }));

  await new Promise(r => setTimeout(r, 60));

  const stillUnchecked = box.getAttribute("aria-checked") === "false" || box.checked === false;
  if (stillUnchecked && row && row !== box) {
    row.dispatchEvent(evtDown);
    row.dispatchEvent(evtUp);
    row.click();
    await new Promise(r => setTimeout(r, 60));
  }

  groupItem.isChecked = box.getAttribute("aria-checked") === "true" || box.checked === true;
  return groupItem.isChecked;
}

/**
 * Localiza el botón de publicar / compartir ÚNICAMENTE dentro del contenedor de grupos
 */
function findPublishButton(rootContainer) {
  if (!rootContainer) return null;
  const candidates = Array.from(
    rootContainer.querySelectorAll('div[role="button"], button')
  );
  return candidates.find(b => {
    const txt = (b.innerText || b.getAttribute("aria-label") || "").trim().toLowerCase();
    return (
      (txt === "publicar" || txt === "publish" || txt === "listo" || txt === "done") &&
      !b.disabled &&
      b.getAttribute("aria-disabled") !== "true" &&
      b.offsetParent !== null
    );
  });
}

/**
 * Selecciona automáticamente N grupos en Facebook (Paso 2 o Diálogo modal) y publica.
 * Prioriza Juigalpa y zonas cercanas con IA o la lista de grupos fijos guardados.
 * @param {number} targetCount Cantidad de grupos a marcar (default: 12)
 * @param {string[]} keywords Filtro opcional de palabras clave
 * @param {string[]} selectedNames Lista de nombres exactos de grupos favoritos guardados
 * @param {string} mode Modo de selección ('ai' | 'custom')
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
async function autoSelectAndShareGroups(targetCount = 12, keywords = [], selectedNames = [], mode = "ai") {
  let containerInfo = findGroupSharingContainer();

  // Si no se detecta de inmediato, reintentar durante hasta 2 segundos
  if (!containerInfo) {
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400));
      containerInfo = findGroupSharingContainer();
      if (containerInfo) break;
    }
  }

  if (!containerInfo || !containerInfo.container) {
    console.warn("Haibane: No se detectó ningún contenedor de grupos ni paso de audiencia en pantalla.");
    return { success: false, error: "Contenedor de grupos no detectado en el DOM" };
  }

  // Si no se pasaron grupos explícitamente, intentar leer del storage local
  if ((!selectedNames || selectedNames.length === 0 || !mode) && chrome.storage?.local) {
    try {
      const stored = await new Promise(r => chrome.storage.local.get(["selectedGroupNames", "groupSelectionMode"], r));
      if (Array.isArray(stored?.selectedGroupNames) && stored.selectedGroupNames.length > 0) {
        selectedNames = stored.selectedGroupNames;
      }
      if (stored?.groupSelectionMode) {
        mode = stored.groupSelectionMode;
      }
    } catch (e) {}
  }

  let groupItems = getValidGroupItems(containerInfo.container);

  if (groupItems.length === 0) {
    console.warn("Haibane: No se detectaron casillas de grupos en el contenedor.");
    return { success: false, error: "No se encontraron casillas de grupos" };
  }

  let groupsToSelect = [];

  if (mode === "custom" && selectedNames && selectedNames.length > 0) {
    // Modo Mis Fijos: Prioridad a favoritos exactos del usuario
    for (const item of groupItems) {
      const matches = selectedNames.some(name => item.fullText.toLowerCase().includes(name.trim().toLowerCase()));
      if (matches) {
        groupsToSelect.push(item);
        if (groupsToSelect.length >= targetCount) break;
      }
    }
    // Si faltan grupos para completar targetCount, rellenar con los mejor puntuados por IA
    if (groupsToSelect.length < targetCount) {
      const remaining = groupItems.filter(item => !groupsToSelect.includes(item));
      const scored = remaining.map(item => ({ item, ai: scoreGroupRelevance(item.name) }))
                              .sort((a, b) => b.ai.score - a.ai.score);
      for (const { item } of scored) {
        groupsToSelect.push(item);
        if (groupsToSelect.length >= targetCount) break;
      }
    }
  } else {
    // Modo IA: Clasificación estricta (1. Juigalpa Ventas -> 2. Zonas cercanas -> 3. General)
    const scored = groupItems.map(item => ({
      item,
      ai: scoreGroupRelevance(item.name)
    })).sort((a, b) => b.ai.score - a.ai.score);

    groupsToSelect = scored.slice(0, targetCount).map(s => s.item);
  }

  let selectedCount = 0;
  for (const item of groupsToSelect) {
    const ok = await toggleGroupCheckbox(item);
    if (ok) selectedCount++;
    await new Promise(r => setTimeout(r, 100)); // Delay escalonado compatible con React
  }

  // 2. Localizar y presionar el botón de publicar ÚNICAMENTE dentro del contenedor
  const submitBtn = findPublishButton(containerInfo.container);
  if (submitBtn) {
    await new Promise(r => setTimeout(r, 350));
    submitBtn.click();
    console.log(`✓ Publicación enviada con éxito a ${selectedCount} grupos de Facebook.`);

    const urlParams = new URLSearchParams(window.location.search);
    const isBatch = urlParams.get("batch_active") === "true";
    if (isBatch) {
      chrome.storage?.local?.get(["activeRelistBatch"], (d) => {
        const b = d?.activeRelistBatch;
        if (b && b.status === "PROCESSING") {
          b.step = "AWAITING_DELETE_OLD";
          chrome.storage?.local?.set({ activeRelistBatch: b });
        }
      });
      const hudStatus = document.getElementById("haibane-batch-hud-status");
      if (hudStatus) hudStatus.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ Publicado. Transfiriendo para eliminar versión antigua...</span>`;
      setTimeout(() => {
        if (!window.location.href.includes("/marketplace/you/selling")) {
          window.location.href = "https://www.facebook.com/marketplace/you/selling";
        }
      }, 3200);
    }

    return { success: true, count: selectedCount };
  }

  return { success: true, count: selectedCount, note: "Grupos marcados. Esperando confirmación manual." };
}

/**
 * Inyecta un banner de control visual dentro del diálogo o pantalla de audiencia de Facebook
 */
function attachGroupSharerToDialog(dialogOrContainer) {
  if (document.getElementById("haibane-group-auto-banner")) return;
  const target = dialogOrContainer || document.body;

  // Extraer grupos visibles y sincronizarlos con storage
  const groupItems = getValidGroupItems(target);
  const foundGroups = groupItems.map(g => g.name).filter(n => n && n.length > 2);

  if (foundGroups.length > 0) {
    chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
      const existing = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
      const merged = Array.from(new Set([...existing, ...foundGroups]));
      chrome.storage?.local?.set({ scannedFacebookGroups: merged });
    });
  }

  const banner = document.createElement("div");
  banner.id = "haibane-group-auto-banner";
  banner.style.cssText = `
    background: #0f172a;
    border: 1.5px solid #a855f7;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 8px 12px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    z-index: 999999;
  `;

  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <strong style="color: #c084fc; font-size: 12px;">⚡ Haibane Group Auto-Sharer</strong>
      <span style="font-size: 10px; background: #581c87; color: #f3e8ff; padding: 1px 6px; border-radius: 4px;">AUTOMÁTICO</span>
    </div>
    <div id="haibane-group-banner-desc" style="color: #94a3b8; font-size: 11px; line-height: 1.35;">
      Cargando configuración de grupos de Facebook...
    </div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button id="haibane-btn-share-12-groups" style="flex: 2; background: #7e22ce; color: #ffffff; border: none; border-radius: 4px; padding: 6px 10px; font-weight: 800; cursor: pointer; font-size: 11px;">
        🚀 Enviar a Mis 12 Grupos Fijos
      </button>
      <button id="haibane-btn-share-ai-groups" style="flex: 2; background: #2563eb; color: #ffffff; border: none; border-radius: 4px; padding: 6px 10px; font-weight: 800; cursor: pointer; font-size: 11px;" title="Prioriza grupos de venta y negocios en Juigalpa y zonas cercanas">
        🎯 12 Grupos IA (Juigalpa)
      </button>
      <button id="haibane-btn-save-as-fixed" style="flex: 1; background: #059669; color: #ffffff; border: none; border-radius: 4px; padding: 6px 8px; font-weight: 700; cursor: pointer; font-size: 10.5px;" title="Memoriza los grupos marcados actualmente como tu lista fija de por vida">
        💾 Fijar
      </button>
      <button id="haibane-btn-select-all-groups" style="background: #334155; color: #f1f5f9; border: none; border-radius: 4px; padding: 6px 8px; font-weight: 700; cursor: pointer; font-size: 10.5px;">
        ✓ Todos
      </button>
    </div>
    <div id="haibane-group-share-status" style="font-size: 10.5px; color: #38bdf8;"></div>
  `;

  // Insertar estratégicamente en la cabecera del diálogo o panel lateral de audiencia
  const header = target.querySelector('h1, h2, [role="heading"]') || target.firstChild;
  if (header && header.parentElement) {
    header.parentElement.insertBefore(banner, header.nextSibling);
  } else {
    target.prepend(banner);
  }

  // Leer configuración desde almacenamiento
  chrome.storage?.local?.get(["groupShareCount", "groupShareAuto", "groupKeywords", "selectedGroupNames", "groupSelectionMode"], (config) => {
    const selectedNames = Array.isArray(config?.selectedGroupNames) ? config.selectedGroupNames : [];
    const targetCount = selectedNames.length > 0 ? selectedNames.length : (config?.groupShareCount || 12);
    const isAuto = config?.groupShareAuto !== false;
    const mode = config?.groupSelectionMode || "ai";
    const keywords = (config?.groupKeywords || "").split(",").map(k => k.trim()).filter(Boolean);

    const descEl = document.getElementById("haibane-group-banner-desc");
    if (descEl) {
      if (mode === "custom" && selectedNames.length > 0) {
        descEl.textContent = `Tienes ${selectedNames.length} grupos fijos memorizados. Se marcarán exactamente esos.`;
      } else {
        descEl.textContent = `Modo IA activo: Priorizando grupos de ventas en Juigalpa y zonas cercanas (hasta ${targetCount}).`;
      }
    }

    const btn12 = document.getElementById("haibane-btn-share-12-groups");
    if (btn12 && selectedNames.length > 0) {
      btn12.textContent = `🚀 Enviar a Mis ${selectedNames.length} Grupos Fijos`;
    }

    const statusEl = document.getElementById("haibane-group-share-status");

    // Botón para fijar la selección actual
    document.getElementById("haibane-btn-save-as-fixed")?.addEventListener("click", () => {
      const currentItems = getValidGroupItems(target);
      const userSelected = currentItems.filter(i => i.isChecked).map(i => i.name).filter(Boolean);
      if (userSelected.length > 0) {
        chrome.storage?.local?.set({ selectedGroupNames: userSelected, groupShareCount: userSelected.length, groupSelectionMode: "custom" }, () => {
          if (statusEl) statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${userSelected.length} grupos memorizados de por vida.</span>`;
          if (descEl) descEl.textContent = `${userSelected.length} grupos guardados como tu lista fija.`;
        });
      } else {
        if (statusEl) statusEl.textContent = "Marca primero las casillas de los grupos que deseas memorizar.";
      }
    });

    btn12?.addEventListener("click", async () => {
      if (statusEl) statusEl.textContent = `⏳ Seleccionando ${targetCount} grupos favoritos...`;
      const res = await autoSelectAndShareGroups(targetCount, keywords, selectedNames, "custom");
      if (res.success && statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos seleccionados y compartidos.</span>`;
      } else if (statusEl) {
        statusEl.textContent = `Aviso: ${res.error}`;
      }
    });

    document.getElementById("haibane-btn-share-ai-groups")?.addEventListener("click", async () => {
      if (statusEl) statusEl.textContent = `🎯 Seleccionando 12 grupos con IA territorial (Juigalpa)...`;
      const res = await autoSelectAndShareGroups(12, [], [], "ai");
      if (res.success && statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos de Juigalpa y zonas cercanas seleccionados.</span>`;
      }
    });

    document.getElementById("haibane-btn-select-all-groups")?.addEventListener("click", async () => {
      if (statusEl) statusEl.textContent = "⏳ Seleccionando todos los grupos disponibles (máx 20)...";
      const res = await autoSelectAndShareGroups(20, [], [], "ai");
      if (res.success && statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos seleccionados.</span>`;
      }
    });

    // Auto-ejecución si está habilitado con countdown (solo en flujo de creación paso 2 o diálogo con casillas)
    const isCreateOrAudience = window.location.href.includes("/marketplace/create") || window.location.href.includes("step=audience");
    if (isAuto && isCreateOrAudience) {
      let countdown = 2;
      if (statusEl) statusEl.innerHTML = `⏳ Auto-compartiendo en ${targetCount} grupos en <strong>${countdown}s</strong>...`;
      const timer = setInterval(async () => {
        countdown--;
        if (countdown > 0) {
          if (statusEl) statusEl.innerHTML = `⏳ Auto-compartiendo en ${targetCount} grupos en <strong>${countdown}s</strong>...`;
        } else {
          clearInterval(timer);
          if (statusEl) statusEl.textContent = `⏳ Marcando ${targetCount} grupos y publicando...`;
          const res = await autoSelectAndShareGroups(targetCount, keywords, selectedNames, mode);
          if (res.success && statusEl) {
            statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos compartidos automáticamente.</span>`;
          }
        }
      }, 1000);
    }
  });
}


/**
 * =======================================================================
 * MOTOR DE AUTO-RELIST SEMANAL (BORRADO + RE-PUBLICACIÓN CON IA)
 * =======================================================================
 */

/**
 * Revisa el catálogo y re-publica publicaciones activas que tengan más de maxDays sin venderse
 * @param {number} maxDays Días de antigüedad para caducidad (default: 7)
 */
async function runAutoRelistCycle(maxDays = 7) {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = `Comprobando publicaciones de más de ${maxDays} días para re-publicar...`;

  loadCatalogProducts(async (products) => {
    const now = Date.now();
    const thresholdMs = maxDays * 24 * 60 * 60 * 1000;

    const expiredListings = products.filter(p => {
      if (!p.facebookListingId || p.status !== "ACTIVE") return false;
      const pubDate = new Date(p.lastRelistedAt || p.createdAt || 0).getTime();
      return (now - pubDate) >= thresholdMs;
    });

    if (expiredListings.length === 0) {
      if (info) info.textContent = `✓ Todas las publicaciones están al día (< ${maxDays} días).`;
      return;
    }

    const target = expiredListings[0];
    if (info) info.textContent = `🔄 Re-publicando: "${target.title}" (> ${maxDays}d sin ventas)...`;

    // 1. Desvincular/Eliminar publicación antigua en Marketplace
    safeSendMessage({
      action: "RELIST_EXPIRED_PRODUCT",
      productId: target.id,
      oldListingId: target.facebookListingId
    }, (res) => {
      console.log(`✓ Iniciando re-publicación limpia para ${target.title}`);
    });
  });
}

let activeGroupSharingObserver = null;

/**
 * Observa mutaciones en el DOM para detectar el diálogo de compartir en grupos de Facebook
 * Activación EXCLUSIVA en flujos de creación (/marketplace/create o step=audience) con desconexión total en el dashboard
 */
function setupGroupSharingObserver() {
  const isCreateFlow = window.location.href.includes("/marketplace/create") || window.location.href.includes("step=audience");

  // Si no es flujo de creación, desconectar observer para no interferir con modales de visualización
  if (!isCreateFlow) {
    if (activeGroupSharingObserver) {
      activeGroupSharingObserver.disconnect();
      activeGroupSharingObserver = null;
    }
    return;
  }

  if (activeGroupSharingObserver) return; // Ya está activo

  const checkDialogs = () => {
    const containerInfo = findGroupSharingContainer();
    if (containerInfo && containerInfo.container) {
      attachGroupSharerToDialog(containerInfo.container);
      return;
    }

    const dialogs = document.querySelectorAll('div[role="dialog"]');
    dialogs.forEach(dialog => {
      const text = (dialog.innerText || "").toLowerCase();
      if (text.includes("esta publicación está en revisión") || (text.includes("tu publicación") && !text.includes("en tus grupos"))) {
        return;
      }
      if (
        (text.includes("publicar en más lugares") ||
        text.includes("compartir en grupos") ||
        text.includes("publicar en grupos") ||
        text.includes("tus grupos de compra") ||
        text.includes("list in more places") ||
        text.includes("share to groups")) &&
        dialog.querySelectorAll('div[role="checkbox"], input[type="checkbox"]').length > 0
      ) {
        attachGroupSharerToDialog(dialog);
      }
    });
  };

  let debounceTimer = null;
  activeGroupSharingObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkDialogs();
    }, 350);
  });

  activeGroupSharingObserver.observe(document.body, { childList: true, subtree: true });
  checkDialogs();
}

// Crear widget flotante de control Haibane
function injectHaibaneFloatingWidget() {
  if (document.getElementById("haibane-sync-widget")) return;

  // 1. Píldora de reapertura minimizada
  let pill = document.getElementById("haibane-sync-pill");
  if (!pill) {
    pill = document.createElement("button");
    pill.id = "haibane-sync-pill";
    pill.title = "Haz clic para abrir el panel de control Haibane Sync";
    pill.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #090d16;
      border: 1.5px solid #a855f7;
      border-radius: 9999px;
      padding: 6px 12px;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      cursor: pointer;
      display: none;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    `;
    pill.innerHTML = `
      <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; display: inline-block;"></span>
      <span style="color: #c084fc;">✦ Haibane Sync</span>
    `;
    document.body.appendChild(pill);
  }

  // 2. Widget desplegado
  const widget = document.createElement("div");
  widget.id = "haibane-sync-widget";
  widget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: #090d16;
    border: 1.5px solid #a855f7;
    border-radius: 10px;
    padding: 10px 12px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    gap: 7px;
    max-width: 280px;
    box-sizing: border-box;
    user-select: none;
  `;

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 5px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 5px #10b981; display: inline-block;"></span>
        <span style="font-weight: 800; color: #c084fc; font-size: 11px;">✦ Haibane Sync</span>
      </div>
      <button id="haibane-btn-minimize" style="background: transparent; color: #64748b; border: none; cursor: pointer; font-size: 13px; padding: 0 4px; line-height: 1;" title="Minimizar panel">✕</button>
    </div>
    <div id="haibane-sync-info" style="font-size: 10px; color: #94a3b8; line-height: 1.3;">
      Panel de control rápido para Marketplace y catálogo web.
    </div>
    <div style="display: flex; flex-direction: column; gap: 5px;">
      <div style="display: flex; gap: 4px;">
        <button id="haibane-btn-link-twins" style="flex: 1; background: #6b21a8; color: #ffffff; border: 1px solid #9333ea; border-radius: 4px; padding: 6px 4px; font-weight: 800; cursor: pointer; font-size: 9.5px;" title="Conecta productos existentes con la web para no duplicar">
          🔗 Enlazar Gemelos
        </button>
        <button id="haibane-btn-check-orphans" style="flex: 1; background: #1d4ed8; color: #ffffff; border: 1px solid #2563eb; border-radius: 4px; padding: 6px 4px; font-weight: 800; cursor: pointer; font-size: 9.5px;" title="Detecta qué productos web aún no están en Facebook para subirlos">
          📢 Publicar Huérfanos
        </button>
      </div>
      <div style="display: flex; gap: 4px;">
        <button id="haibane-btn-share-groups-wgt" style="flex: 1; background: #047857; color: #ffffff; border: 1px solid #059669; border-radius: 4px; padding: 6px 4px; font-weight: 800; cursor: pointer; font-size: 9.5px;" title="Marca y comparte automáticamente en 12 grupos de Facebook">
          📢 Compartir en Grupos
        </button>
        <button id="haibane-btn-scan-now" style="flex: 1; background: #1e293b; color: #f1f5f9; border: 1px solid #334155; border-radius: 4px; padding: 6px 4px; font-weight: 700; cursor: pointer; font-size: 9.5px;" title="Comprueba si editaste precios o vendiste productos">
          🔄 Auditar Precios
        </button>
      </div>
      <div style="display: flex; gap: 4px;">
        <button id="haibane-btn-export-web" style="flex: 1; background: #0284c7; color: #ffffff; border: 1px solid #0369a1; border-radius: 4px; padding: 5px 4px; font-weight: 700; cursor: pointer; font-size: 9.5px;" title="Exporta tus publicaciones hacia el catálogo online">
          ⚡ Exportar a Web
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  pill.addEventListener("click", () => {
    pill.style.display = "none";
    widget.style.display = "flex";
  });

  document.getElementById("haibane-btn-link-twins")?.addEventListener("click", () => {
    linkExistingMarketplaceTwins();
  });

  document.getElementById("haibane-btn-check-orphans")?.addEventListener("click", () => {
    checkOrphanWebProducts();
  });

  document.getElementById("haibane-btn-share-groups-wgt")?.addEventListener("click", () => {
    chrome.storage?.local?.get(["groupShareCount", "groupKeywords", "selectedGroupNames", "groupSelectionMode"], (config) => {
      const targetCount = config?.groupShareCount || 12;
      const keywords = (config?.groupKeywords || "").split(",").map(k => k.trim()).filter(Boolean);
      const selectedNames = Array.isArray(config?.selectedGroupNames) ? config.selectedGroupNames : [];
      const mode = config?.groupSelectionMode || "ai";
      autoSelectAndShareGroups(targetCount, keywords, selectedNames, mode);
    });
  });

  document.getElementById("haibane-btn-scan-now")?.addEventListener("click", () => {
    auditMarketplaceListings();
  });

  document.getElementById("haibane-btn-export-web")?.addEventListener("click", () => {
    exportMarketplaceListingsToWeb();
  });

  document.getElementById("haibane-btn-minimize")?.addEventListener("click", () => {
    widget.style.display = "none";
    pill.style.display = "flex";
  });
}

// Escuchar peticiones del background service worker o popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "AUDIT_LISTINGS") {
    (async () => {
      try {
        await auditMarketplaceListings();
        sendResponse({ success: true, message: "Auditoría completada." });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Mantener canal abierto para respuesta asíncrona
  }

  if (msg.action === "LINK_TWINS") {
    (async () => {
      try {
        await linkExistingMarketplaceTwins();
        sendResponse({ success: true, message: "Enlace de gemelos completado." });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "AUTO_SHARE_GROUPS") {
    (async () => {
      try {
        const res = await autoSelectAndShareGroups(
          msg.targetCount || 12,
          msg.keywords || [],
          msg.selectedNames || [],
          msg.mode || "ai"
        );
        sendResponse(res || { success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "SCAN_MY_GROUPS") {
    const scanned = scanGroupsFromCurrentPage();
    if (scanned.length > 0) {
      chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
        const existing = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
        const merged = Array.from(new Set([...existing, ...scanned]));
        chrome.storage?.local?.set({ scannedFacebookGroups: merged }, () => {
          sendResponse({ success: true, groups: merged });
        });
      });
    } else {
      chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
        sendResponse({ success: true, groups: d?.scannedFacebookGroups || [] });
      });
    }
    return true;
  }

  if (msg.action === "RUN_AUTO_RELIST") {
    (async () => {
      try {
        await runAutoRelistCycle(msg.maxDays || 7);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "SCAN_MY_LISTINGS") {
    (async () => {
      try {
        const isSellingPage = window.location.href.includes("/marketplace/you/selling");

        const processListings = (prods) => {
          const listings = getScannableListings();
          console.log(`✦ Haibane Scan: ${listings.length} publicaciones activas detectadas en pantalla.`);
          const items = listings.map(l => {
            const twin = prods.find(p => 
              (p.facebookListingId && l.fbListingId && String(p.facebookListingId) === String(l.fbListingId)) ||
              computeTitleSimilarity(p.title, l.fbTitle) >= 0.60 ||
              (p.title && l.fbTitle && (l.fbTitle.toLowerCase().includes(p.title.toLowerCase().slice(0, 15)) || p.title.toLowerCase().includes(l.fbTitle.toLowerCase().slice(0, 15))))
            );

            const imgEl = l.imgEl || l.element?.querySelector("img");
            let fbImg = "";
            if (imgEl) {
              if (imgEl.srcset) {
                const candidates = imgEl.srcset.split(",").map(s => s.trim().split(" ")[0]).filter(Boolean);
                fbImg = candidates[candidates.length - 1] || imgEl.currentSrc || imgEl.src || "";
              } else {
                fbImg = imgEl.currentSrc || imgEl.src || imgEl.getAttribute("data-src") || "";
              }
            }
            const webImg = (twin && twin.imageUrl) ? twin.imageUrl : "";
            const thumb = webImg || fbImg;
            const canonicalFbId = l.fbListingId || (twin?.facebookListingId ? String(twin.facebookListingId) : null);

            return {
              fbListingId: canonicalFbId,
              fbTitle: l.fbTitle,
              priceLine: l.priceLine || (twin ? `C$ ${twin.priceNio || Math.round((twin.priceUsd || 0) * 37)}` : ""),
              thumb: thumb,
              fbThumb: fbImg,
              webThumb: webImg,
              twinId: twin ? twin.id : null,
              twinTitle: twin ? twin.title : null,
              twinPriceUsd: twin ? twin.priceUsd : null,
              twinPriceNio: twin ? (twin.priceNio || Math.round((twin.priceUsd || 0) * 37)) : null,
              isTwinLinked: Boolean(twin)
            };
          });

          sendResponse({
            success: true,
            isSellingPage,
            listings: items,
            count: items.length
          });
        };

        if (Array.isArray(cachedWebProducts) && cachedWebProducts.length > 0) {
          processListings(cachedWebProducts);
        } else {
          loadCatalogProducts((products) => {
            const prods = (Array.isArray(products) && products.length > 0) ? products : cachedWebProducts;
            processListings(prods);
          });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message, listings: [] });
      }
    })();
    return true;
  }

  if (msg.action === "DELETE_LISTING_BY_ID_OR_TITLE") {
    (async () => {
      try {
        const res = await deleteListingFromSellingPage(msg.targetId, msg.targetTitle);
        sendResponse(res || { success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "CLEAN_OLD_DUPLICATES") {
    (async () => {
      try {
        const res = await cleanAllOldDuplicates();
        sendResponse(res || { success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

/**
 * Extrae inteligentemente nombres de grupos visibles en la página actual de Facebook
 * (modales de diálogo, página /groups/joins, feed y barra de accesos directos)
 */
function scanGroupsFromCurrentPage() {
  const scanned = [];
  const seen = new Set();

  // 1. Si hay un diálogo modal de grupos abierto
  const dialog = document.querySelector('div[role="dialog"]');
  if (dialog) {
    const allBoxes = Array.from(dialog.querySelectorAll('div[role="checkbox"], div[aria-checked], input[type="checkbox"]'));
    allBoxes.forEach(box => {
      const containerRow = box.closest('div[role="listitem"]') || box.parentElement?.parentElement || box.parentElement;
      const rowTitle = (containerRow?.innerText || "").split("\n")[0]?.trim();
      if (rowTitle && rowTitle.length > 2 && !seen.has(rowTitle.toLowerCase())) {
        seen.add(rowTitle.toLowerCase());
        scanned.push(rowTitle);
      }
    });
  }

  // 2. Extraer enlaces a grupos de Facebook
  const links = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
  const ignoreSubstrings = [
    '/groups/feed', '/groups/discover', '/groups/create', '/groups/joins',
    '/groups/search', '/groups/chats', '/groups/notifications', '/groups/categories',
    '/groups/membership_questions'
  ];

  links.forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (ignoreSubstrings.some(sub => href.includes(sub))) return;

    const match = href.match(/\/groups\/([a-zA-Z0-9._-]+)/);
    if (!match || !match[1]) return;
    const groupSlug = match[1];
    if (['feed', 'discover', 'create', 'joins', 'search', 'chats', 'notifications'].includes(groupSlug)) return;

    const rawText = (a.innerText || a.getAttribute('aria-label') || '').trim();
    if (!rawText) return;

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const candidateName = lines[0];

    const invalidKeywords = [
      'grupos', 'tus grupos', 'grupos a los que te has unido', 'ver más', 'ver todos',
      'crear nuevo grupo', 'descubrir', 'tu feed', 'configuración', 'invitar',
      'notificaciones', 'mensajes', 'administrar', 'unirte', 'grupo público', 'grupo privado'
    ];

    if (
      candidateName &&
      candidateName.length >= 3 &&
      candidateName.length <= 100 &&
      !invalidKeywords.includes(candidateName.toLowerCase()) &&
      !candidateName.toLowerCase().startsWith('última actividad') &&
      !candidateName.toLowerCase().startsWith('miembro') &&
      !seen.has(candidateName.toLowerCase())
    ) {
      seen.add(candidateName.toLowerCase());
      scanned.push(candidateName);
    }
  });

  return scanned;
}

function showHaibaneToast(msg) {
  const existing = document.getElementById("haibane-floating-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "haibane-floating-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 25px;
    left: 25px;
    z-index: 9999999;
    background: #0f172a;
    border: 1.5px solid #a855f7;
    color: #f8fafc;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: opacity 0.3s;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

function autoSyncGroupsFromPage() {
  if (window.location.href.includes("/groups")) {
    const found = scanGroupsFromCurrentPage();
    if (found.length > 0) {
      chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
        const existing = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
        const merged = Array.from(new Set([...existing, ...found]));
        if (merged.length > existing.length) {
          chrome.storage.local.set({ scannedFacebookGroups: merged }, () => {
            console.log(`✓ Haibane: ${found.length} grupos sincronizados desde Facebook.`);
            showHaibaneToast(`✓ Haibane: ${found.length} grupos sincronizados con la extensión.`);
          });
        }
      });
    }
  }
}

// Inicialización robusta para SPA (Facebook React Navigation)
function checkPageAndInit() {
  if (!isExtensionValid()) return;
  if (window.location.href.includes("/marketplace/create/item") || window.location.href.includes("step=audience")) {
    initAutoPublishAssistant();
    setupGroupSharingObserver();
  } else {
    if (activeGroupSharingObserver) {
      activeGroupSharingObserver.disconnect();
      activeGroupSharingObserver = null;
    }
    injectHaibaneFloatingWidget();
    loadCatalogProducts();
    if (window.location.href.includes("/marketplace/you/selling")) {
      checkActiveBatchOnSellingPage();
    }
  }
  if (window.location.href.includes("/groups")) {
    setTimeout(autoSyncGroupsFromPage, 1500);
    setTimeout(autoSyncGroupsFromPage, 3500);
  }
}

checkPageAndInit();
setTimeout(checkPageAndInit, 800);
setTimeout(checkPageAndInit, 2000);

let lastKnownUrl = window.location.href;
const urlWatcherInterval = setInterval(() => {
  if (!isExtensionValid()) {
    clearInterval(urlWatcherInterval);
    return;
  }
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
    checkPageAndInit();
  }
}, 800);

