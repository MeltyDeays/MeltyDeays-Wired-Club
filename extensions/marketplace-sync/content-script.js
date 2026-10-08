/* Content Script inyectado en Facebook Marketplace */
console.log("✦ Haibane Marketplace Sync activo en la pestaña.");

let cachedWebProducts = [];

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
    border: 1.5px solid #d97706;
    border-radius: 8px;
    padding: 10px 14px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 260px;
  `;

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px;">
      <span style="font-weight: 800; color: #fbbf24; display: flex; align-items: center; gap: 5px;">
        ✦ Haibane Sync
      </span>
      <span id="haibane-sync-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;" title="Conectado a Firestore"></span>
    </div>
    <div id="haibane-sync-info" style="font-size: 11px; color: #94a3b8;">
      Conectado a Wired Club.
    </div>
    <div style="display: flex; gap: 6px;">
      <button id="haibane-btn-scan-now" style="flex: 1; background: #d97706; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 700; cursor: pointer; font-size: 10.5px;">
        🔄 Auditar Precios
      </button>
      <button id="haibane-btn-export-web" style="flex: 1; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 700; cursor: pointer; font-size: 10.5px;" title="Exporta las publicaciones de esta pantalla hacia el catálogo web con recorte IA y fichas">
        ⚡ Exportar
      </button>
      <button id="haibane-btn-minimize" style="background: #334155; color: #cbd5e1; border: none; border-radius: 4px; padding: 5px 6px; cursor: pointer; font-size: 11px;">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(widget);

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

/**
 * Consulta la lista de productos del catálogo web
 */
function loadCatalogProducts() {
  chrome.runtime.sendMessage({ action: "GET_CATALOG_PRODUCTS" }, (response) => {
    if (response && response.success) {
      cachedWebProducts = response.products || [];
      const info = document.getElementById("haibane-sync-info");
      if (info) {
        info.textContent = `${cachedWebProducts.length} productos web en catálogo.`;
      }
      console.log(`✦ ${cachedWebProducts.length} productos sincronizados desde Firestore.`);
      // Ejecutar auditoría inicial si estamos en la sección de ventas
      if (window.location.href.includes("/marketplace/you/selling")) {
        auditMarketplaceListings();
      }
    }
  });
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
    .trim();
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
 * Audita las publicaciones visibles en la pantalla de Marketplace.
 * Detecta si se cambiaron precios desde el teléfono y actualiza Firestore.
 */
function auditMarketplaceListings() {
  const info = document.getElementById("haibane-sync-info");
  if (info) info.textContent = "Escaneando publicaciones en pantalla...";

  // Buscar elementos que representen tarjetas o filas de publicaciones en Facebook
  const listingLinks = Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]'));
  let updatedCount = 0;

  listingLinks.forEach(link => {
    const parent = link.closest('div[role="article"]') || link.parentElement;
    if (!parent) return;

    const textContent = parent.innerText || "";
    const lines = textContent.split("\n").map(l => l.trim()).filter(Boolean);

    // En Facebook Marketplace las tarjetas suelen tener: Título, Precio, Estado
    const href = link.getAttribute("href") || "";
    const idMatch = href.match(/\/marketplace\/item\/(\d+)/);
    const fbListingId = idMatch ? idMatch[1] : null;

    // Buscar coincidencia en productos del catálogo
    for (const prod of cachedWebProducts) {
      const normProdTitle = normalizeTitle(prod.title);
      const isMatch = lines.some(line => {
        const normLine = normalizeTitle(line);
        return normLine.includes(normProdTitle) || (normProdTitle.length > 5 && normLine.includes(normProdTitle.slice(0, 15)));
      });

      if (isMatch) {
        // Verificar si la publicación está marcada como VENDIDO / AGOTADO
        const isSoldOnFb = lines.some(l => {
          const lower = l.toLowerCase();
          return lower.includes("vendid") || lower.includes("agotad") || lower.includes("sold") || lower.includes("marcar como disponible");
        });

        if (isSoldOnFb && prod.status !== "SOLD_OUT") {
          console.log(`✦ Publicación "${prod.title}" marcada como VENDIDA en Facebook. Sincronizando...`);
          chrome.runtime.sendMessage({
            action: "MARK_SOLD_IN_FIRESTORE",
            productId: prod.id
          }, (res) => {
            if (res && res.success) {
              prod.status = "SOLD_OUT";
              updatedCount++;
              if (info) info.textContent = `✓ "${prod.title}" marcado como AGOTADO (regla 12h iniciada)`;
            }
          });
        } else {
          // Encontrar línea con precio
          const priceLine = lines.find(l => l.includes("$") || l.includes("C$") || /^\d+(\.\d+)?$/.test(l));
          const rawPrice = parsePriceFromText(priceLine);

          if (rawPrice !== null && prod.priceUsd !== undefined) {
            // Regla de moneda: 0-200 USD, 201+ NIO (tasa 37.0)
            let normalizedFbUsd = rawPrice;
            if (rawPrice > 200) {
              normalizedFbUsd = Number((rawPrice / 37.0).toFixed(2));
            }

            const diff = Math.abs(normalizedFbUsd - prod.priceUsd);
            // Si hay diferencia significativa (> 0.50 USD), se actualizó en Facebook (por ejemplo desde el celular)
            if (diff >= 0.5) {
              console.log(`✦ Diferencia detectada para "${prod.title}": Web=$${prod.priceUsd} vs FB=$${normalizedFbUsd} (leído: ${rawPrice}). Sincronizando...`);
              chrome.runtime.sendMessage({
                action: "SYNC_PRICE_TO_FIRESTORE",
                productId: prod.id,
                newPrice: normalizedFbUsd,
                fbListingId: fbListingId
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
        ? `✓ ${updatedCount} precio(s) sincronizado(s) a Web.` 
        : `Todo sincronizado (${cachedWebProducts.length} productos).`;
    }
  }, 1200);
}

/**
 * Extrae las publicaciones visibles en la pestaña y las envía hacia la API web
 * para procesarlas con fondo blanco IA y crear o sincronizar en el catálogo.
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
    const imgEl = parent.querySelector("img");
    const imageUrl = imgEl ? imgEl.src : "";

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
      imageUrl: imageUrl,
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

// Escuchar peticiones del background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "AUDIT_LISTINGS") {
    auditMarketplaceListings();
  }
});

// Inicialización
setTimeout(() => {
  injectHaibaneFloatingWidget();
  loadCatalogProducts();
}, 1500);
