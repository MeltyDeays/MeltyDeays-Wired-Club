/* Content Script inyectado en Facebook Marketplace (Haibane Sync Engine) */
console.log("✦ Haibane Marketplace Sync activo en la pestaña.");

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
  chrome.runtime.sendMessage({ action: "GET_CATALOG_PRODUCTS" }, (response) => {
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
 * FASE 1: Enlace Preventivo y Anti-Duplicados
 * Escanea las publicaciones en pantalla y las empareja con el catálogo web sin duplicar.
 */
function linkExistingMarketplaceTwins() {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = "Escaneando publicaciones para enlazar gemelos...";

  const isSellingPage = window.location.href.includes("/marketplace/you/selling");
  const listingLinks = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));

  if (listingLinks.length === 0) {
    if (info) {
      info.textContent = isSellingPage 
        ? "No se encontraron publicaciones en pantalla." 
        : "💡 Abre 'Tus publicaciones' (/marketplace/you/selling) para enlazar todo.";
    }
    return;
  }

  let newlyLinked = 0;
  let alreadyLinked = 0;
  const seenListingIds = new Set();

  listingLinks.forEach(link => {
    const parent = link.closest('div[role="article"]') || link.parentElement;
    if (!parent) return;

    const href = link.getAttribute("href") || "";
    const idMatch = href.match(/\/marketplace\/item\/(\d+)/);
    const fbListingId = idMatch ? idMatch[1] : null;
    if (!fbListingId || seenListingIds.has(fbListingId)) return;
    seenListingIds.add(fbListingId);

    const textContent = parent.innerText || "";
    const lines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    const priceLine = lines.find(l => l.includes("$") || l.includes("C$") || /^\d+(\.\d+)?$/.test(l));
    const rawPrice = parsePriceFromText(priceLine);
    const titleCandidates = lines.filter(l => l !== priceLine && !l.toLowerCase().includes("vendid") && !l.toLowerCase().includes("agotad") && l.length > 3);
    const fbTitle = titleCandidates[0] || "";

    // 1. Verificar si ya está enlazado directamente
    const existingTwin = cachedWebProducts.find(p => String(p.facebookListingId) === String(fbListingId));
    if (existingTwin) {
      alreadyLinked++;
      return;
    }

    // 2. Matching difuso preventivo (evitar duplicaciones)
    let bestMatch = null;
    let highestSim = 0;

    for (const prod of cachedWebProducts) {
      // Si ya tiene otro ID de Facebook distinto, no asociar
      if (prod.facebookListingId && String(prod.facebookListingId) !== String(fbListingId)) continue;

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

    if (bestMatch) {
      console.log(`🔗 Emparejamiento Gemelo Detectado: Web "${bestMatch.title}" <==> FB "${fbTitle}" (#${fbListingId})`);
      chrome.runtime.sendMessage({
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
          ? `✓ ${alreadyLinked} gemelos confirmados. Cero duplicados.` 
          : `Escaneo listo. No hubo nuevas coincidencias.`;
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
    chrome.runtime.sendMessage({
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

  const listingLinks = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
  let updatedCount = 0;

  listingLinks.forEach(link => {
    const parent = link.closest('div[role="article"]') || link.parentElement;
    if (!parent) return;

    const textContent = parent.innerText || "";
    const lines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    const href = link.getAttribute("href") || "";
    const idMatch = href.match(/\/marketplace\/item\/(\d+)/);
    const fbListingId = idMatch ? idMatch[1] : null;

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
          chrome.runtime.sendMessage({
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
        } else {
          const priceLine = lines.find(l => l.includes("$") || l.includes("C$") || /^\d+(\.\d+)?$/.test(l));
          const rawPrice = parsePriceFromText(priceLine);

          if (rawPrice !== null && prod.priceUsd !== undefined) {
            let normalizedFbUsd = rawPrice;
            if (rawPrice > 200) {
              normalizedFbUsd = Number((rawPrice / 37.0).toFixed(2));
            }

            const diff = Math.abs(normalizedFbUsd - prod.priceUsd);
            if (diff >= 0.5) {
              console.log(`✦ Precio actualizado en FB para "${prod.title}": Web=$${prod.priceUsd} vs FB=$${normalizedFbUsd}`);
              chrome.runtime.sendMessage({
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
        }
        break;
      }
    }
  });

  setTimeout(() => {
    if (info) {
      info.textContent = updatedCount > 0 
        ? `✓ ${updatedCount} precio(s)/estado(s) sincronizado(s).` 
        : `Todo sincronizado (${cachedWebProducts.length} productos).`;
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

  chrome.runtime.sendMessage({
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

/**
 * Inyecta fotografías de alta resolución en el formulario nativo de Marketplace
 */
async function injectProductPhotosToForm(photoUrls) {
  if (!photoUrls || photoUrls.length === 0) return false;
  const fileInput = document.querySelector('input[type="file"][accept*="image"]');
  if (!fileInput) {
    console.warn("No se encontró el input file de fotos en Facebook");
    return false;
  }

  const dt = new DataTransfer();
  for (let i = 0; i < photoUrls.length; i++) {
    const url = photoUrls[i];
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `hd_product_${Date.now()}_${i}.jpg`, { type: blob.type || "image/jpeg" });
      dt.items.add(file);
    } catch (e) {
      console.warn(`Error al descargar foto HD ${url}:`, e);
    }
  }

  if (dt.files.length > 0) {
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  return false;
}

/**
 * Asistente de Creación Automática Web ➔ Facebook Marketplace (/marketplace/create/item)
 */
function initAutoPublishAssistant() {
  const urlParams = new URLSearchParams(window.location.search);
  const haibaneId = urlParams.get("haibane_id");
  if (!haibaneId) return;

  chrome.runtime.sendMessage({ action: "GET_PRODUCT_BY_ID", productId: haibaneId }, (response) => {
    if (!response || !response.success || !response.product) {
      console.warn("No se pudo obtener el producto para auto-publicar:", haibaneId);
      return;
    }

    const prod = response.product;
    injectPublishAssistantBanner(prod);
  });
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
        Precio: $${product.priceUsd} USD (C$ ${priceNio.toLocaleString()} NIO)
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

  document.getElementById("haibane-btn-do-autofill")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("haibane-autofill-status");
    if (statusEl) statusEl.textContent = "⏳ Inyectando fotos y campos...";

    // 1. Inyectar Fotos HD
    if (images.length > 0) {
      await injectProductPhotosToForm(images);
    }

    // 2. Rellenar Título
    const titleInput = document.querySelector('input[aria-label*="Título" i], input[name*="title" i]') || document.querySelectorAll('form input[type="text"]')[0];
    if (titleInput) {
      setNativeInputValue(titleInput, product.title);
    }

    // 3. Rellenar Precio (Córdobas o USD)
    const priceInput = document.querySelector('input[aria-label*="Precio" i], input[name*="price" i]');
    if (priceInput) {
      setNativeInputValue(priceInput, String(priceNio));
    }

    // 4. Rellenar Descripción
    const descInput = document.querySelector('textarea[aria-label*="Descripción" i], div[aria-label*="Descripción" i][role="textbox"]');
    if (descInput) {
      const cleanDesc = product.rawDescription || product.description || product.title;
      if (descInput.tagName.toLowerCase() === 'textarea') {
        setNativeInputValue(descInput, cleanDesc);
      } else {
        descInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, cleanDesc);
      }
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ Datos y fotos inyectados.</span> Haz clic en 'Publicar' y el ID gemelo se vinculará automáticamente.`;
    }

    // Escuchar redirección tras publicar para guardar el ID en Firestore
    watchForPublishCompletion(product.id, product._collection);
  });
}

function watchForPublishCompletion(productId, collection) {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const href = window.location.href;
    const match = href.match(/\/marketplace\/item\/(\d+)/);
    if (match && match[1]) {
      clearInterval(interval);
      const newListingId = match[1];
      console.log(`✓ Detectada publicación creada: ID #${newListingId}. Vinculando Gemelo...`);
      chrome.runtime.sendMessage({
        action: "LINK_PRODUCT_TO_FB",
        productId: productId,
        fbListingId: newListingId,
        fbUrl: href,
        collection: collection || "dev_rewards_catalog"
      }, () => {
        alert(`✓ ¡Publicación gemela sellada!\n\nProducto: ${productId}\nFacebook Listing: #${newListingId}\n\nLos cambios futuros se sincronizarán en ambos lados.`);
      });
    }
    if (attempts > 60) clearInterval(interval); // Dejar de buscar a los 2 minutos
  }, 2000);
}

// Crear widget flotante de control Haibane
function injectHaibaneFloatingWidget() {
  if (document.getElementById("haibane-sync-widget")) return;

  const widget = document.createElement("div");
  widget.id = "haibane-sync-widget";
  widget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: #0f172a;
    border: 1.5px solid #a855f7;
    border-radius: 8px;
    padding: 10px 14px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 270px;
  `;

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px;">
      <span style="font-weight: 800; color: #c084fc; display: flex; align-items: center; gap: 5px;">
        ✦ Haibane Sync
      </span>
      <span id="haibane-sync-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;" title="Conectado a Firestore"></span>
    </div>
    <div id="haibane-sync-info" style="font-size: 11px; color: #94a3b8;">
      Conectado a Wired Club.
    </div>
    <div style="display: flex; flex-direction: column; gap: 5px;">
      <div style="display: flex; gap: 5px;">
        <button id="haibane-btn-link-twins" style="flex: 1; background: #7e22ce; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 800; cursor: pointer; font-size: 10px;" title="Enlaza publicaciones existentes de Facebook con el catálogo web sin duplicar">
          🔗 Enlazar Gemelos
        </button>
        <button id="haibane-btn-check-orphans" style="flex: 1; background: #2563eb; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 800; cursor: pointer; font-size: 10px;" title="Detecta qué productos web aún no están en Facebook para crearlos">
          📢 Publicar Huérfanos
        </button>
      </div>
      <div style="display: flex; gap: 5px;">
        <button id="haibane-btn-scan-now" style="flex: 1; background: #334155; color: #f1f5f9; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 700; cursor: pointer; font-size: 10px;">
          🔄 Auditar Precios
        </button>
        <button id="haibane-btn-export-web" style="flex: 1; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 700; cursor: pointer; font-size: 10px;">
          ⚡ Exportar a Web
        </button>
        <button id="haibane-btn-minimize" style="background: #1e293b; color: #94a3b8; border: none; border-radius: 4px; padding: 5px 7px; cursor: pointer; font-size: 10px;">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  document.getElementById("haibane-btn-link-twins")?.addEventListener("click", () => {
    linkExistingMarketplaceTwins();
  });

  document.getElementById("haibane-btn-check-orphans")?.addEventListener("click", () => {
    checkOrphanWebProducts();
  });

  document.getElementById("haibane-btn-scan-now")?.addEventListener("click", () => {
    auditMarketplaceListings();
  });

  document.getElementById("haibane-btn-export-web")?.addEventListener("click", () => {
    exportMarketplaceListingsToWeb();
  });

  document.getElementById("haibane-btn-minimize")?.addEventListener("click", () => {
    widget.style.display = "none";
  });
}

// Escuchar peticiones del background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "AUDIT_LISTINGS") {
    auditMarketplaceListings();
  }
  if (msg.action === "LINK_TWINS") {
    linkExistingMarketplaceTwins();
  }
});

// Inicialización
setTimeout(() => {
  if (window.location.href.includes("/marketplace/create/item")) {
    initAutoPublishAssistant();
  } else {
    injectHaibaneFloatingWidget();
    loadCatalogProducts();
  }
}, 1200);
