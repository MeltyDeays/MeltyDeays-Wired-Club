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

/**
 * Inyecta fotografías de alta resolución en el formulario nativo de Marketplace evitando duplicados
 */
async function injectProductPhotosToForm(photoUrls, productId = "") {
  if (photosInjectedForProduct && photosInjectedForProduct === productId) {
    console.log("Fotos ya inyectadas para este producto, omitiendo duplicados.");
    return true;
  }
  if (!photoUrls || photoUrls.length === 0) return false;
  const fileInput = document.querySelector('input[type="file"][accept*="image"]');
  if (!fileInput) {
    console.warn("No se encontró el input file de fotos en Facebook");
    return false;
  }

  // Deduplicación estricta de URLs
  const uniqueUrls = Array.from(new Set(photoUrls.filter(Boolean)));
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
        const file = new File([blob], `haibane_hd_${Date.now()}_${i}.jpg`, { type: blob.type || "image/jpeg" });
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

function triggerAutoFillPipeline(product) {
  let attempts = 0;
  const maxAttempts = 30; // 30 intentos x 350ms = ~10.5 segundos
  const interval = setInterval(async () => {
    attempts++;
    const { titleInput, priceInput, fileInput } = findFacebookMarketplaceInputs();

    if (titleInput || priceInput || fileInput) {
      clearInterval(interval);
      const statusEl = document.getElementById("haibane-autofill-status");
      if (statusEl) statusEl.textContent = "⏳ Paso 1/5: Inyectando fotos HD...";

      const priceNio = product.priceNio || Math.round((product.priceUsd || 0) * 37.0);
      const images = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : (product.imageUrl ? [product.imageUrl] : []);

      // 1. Fotos HD deduplicadas
      if (images.length > 0 && fileInput) {
        await injectProductPhotosToForm(images, product.id);
        await new Promise(r => setTimeout(r, 600));
      }

      // 2. Título
      if (statusEl) statusEl.textContent = "⏳ Paso 2/5: Inyectando título...";
      if (titleInput) {
        const cleanTitle = (product.title || "").replace(/(\$|c\$|\busd\b)\s*\d+/gi, "").trim();
        setNativeInputValue(titleInput, cleanTitle.slice(0, 75));
      }

      // 3. Precio
      if (priceInput) {
        setNativeInputValue(priceInput, String(priceNio));
      }

      await new Promise(r => setTimeout(r, 500));

      // 4. Categoría (Secuencial)
      if (statusEl) statusEl.textContent = "⏳ Paso 3/5: Seleccionando categoría óptima...";
      await autoSelectCategory(product);
      await new Promise(r => setTimeout(r, 700));

      // 5. Estado "Nuevo" (Secuencial tras cierre de categoría)
      if (statusEl) statusEl.textContent = "⏳ Paso 4/5: Estableciendo estado 'Nuevo'...";
      await autoSelectCondition("Nuevo");
      await new Promise(r => setTimeout(r, 600));

      // 6. Descripción
      if (statusEl) statusEl.textContent = "⏳ Paso 5/5: Desplegando y rellenando descripción...";
      await expandAndFillDescription(product);

      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:800;">✓ Formulario 100% completado (Fotos, Título, Categoría, Estado y Ficha).</span> Revisa la vista previa y haz clic en 'Siguiente'.`;
      }
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      const statusEl = document.getElementById("haibane-autofill-status");
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#f59e0b;">Pulsa '⚡ Inyectar' cuando el formulario cargue.</span>`;
      }
    }
  }, 350);
}

/**
 * Asistente de Creación Automática Web ➔ Facebook Marketplace (/marketplace/create/item)
 */
function initAutoPublishAssistant() {
  const urlParams = new URLSearchParams(window.location.search);
  const haibaneId = urlParams.get("haibane_id");
  if (!haibaneId) return;

  function onProductLoaded(prod) {
    if (!prod) {
      console.warn("No se pudo obtener el producto para auto-publicar:", haibaneId);
      return;
    }
    injectPublishAssistantBanner(prod);
    triggerAutoFillPipeline(prod);
  }

  let loaded = false;
  try {
    chrome.runtime?.sendMessage({ action: "GET_PRODUCT_BY_ID", productId: haibaneId }, (response) => {
      if (response && response.success && response.product) {
        loaded = true;
        onProductLoaded(response.product);
      } else {
        fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
      }
    });
  } catch {
    fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
  }

  // Fallback de contingencia si el mensaje no responde en 800ms
  setTimeout(() => {
    if (!loaded && !document.getElementById("haibane-publish-banner")) {
      fetchProductDirectFromFirestore(haibaneId).then(onProductLoaded);
    }
  }, 800);
}

/**
 * Formatea la ficha comercial para Facebook Marketplace con iconos y secciones requeridas
 * (Sin precios en el texto, con garantia MeltyDeays, bienvenida de 250 WP/$5 en la web, y WhatsApp 5843-8412)
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
• Visita nuestra página web oficial para explorar promociones y ofertas especiales de socios.
• 💎 Bono de Bienvenida: Recibe $5 USD en puntos (250 WP) al registrarte por primera vez desde tu dispositivo, canjeables por descuentos en artículos seleccionados de nuestro catálogo.

📲 PEDIDOS Y ATENCIÓN DIRECTA:
• WhatsApp / Teléfono: 5843-8412`;
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
    triggerAutoFillPipeline(product);
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

/**
 * =======================================================================
 * MOTOR DE AUTO-COMPARTIR EN GRUPOS DE FACEBOOK MARKETPLACE (12 GRUPOS)
 * =======================================================================
 */

/**
 * Selecciona automáticamente N grupos en el diálogo de Facebook y los publica
 * Prioriza los grupos favoritos guardados de por vida por el usuario.
 * @param {number} targetCount Cantidad de grupos a marcar (default: 12)
 * @param {string[]} keywords Filtro opcional de palabras clave
 * @param {string[]} selectedNames Lista de nombres exactos de grupos favoritos guardados
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
async function autoSelectAndShareGroups(targetCount = 12, keywords = [], selectedNames = []) {
  const dialog = document.querySelector('div[role="dialog"]');
  if (!dialog) {
    console.warn("Haibane: No se detectó ningún diálogo de grupos en pantalla.");
    return { success: false, error: "Diálogo de grupos no detectado en el DOM" };
  }

  // Si no se pasaron grupos seleccionados explícitamente, intentar leer del storage local
  if ((!selectedNames || selectedNames.length === 0) && chrome.storage?.local) {
    try {
      const stored = await new Promise(r => chrome.storage.local.get(["selectedGroupNames"], r));
      if (Array.isArray(stored?.selectedGroupNames) && stored.selectedGroupNames.length > 0) {
        selectedNames = stored.selectedGroupNames;
      }
    } catch (e) {}
  }

  // 1. Localizar casillas de verificación de grupos en el diálogo
  const checkboxes = Array.from(
    dialog.querySelectorAll('div[role="checkbox"], div[aria-checked], input[type="checkbox"]')
  );

  if (checkboxes.length === 0) {
    console.warn("Haibane: No se detectaron casillas de grupos.");
    return { success: false, error: "No se encontraron casillas de grupos" };
  }

  let selectedCount = 0;
  for (const box of checkboxes) {
    if (selectedCount >= targetCount) break;

    const isChecked = box.getAttribute("aria-checked") === "true" || box.checked === true;
    if (isChecked) {
      selectedCount++;
      continue;
    }

    const containerRow = box.closest('div[role="listitem"]') || box.parentElement?.parentElement || box.parentElement;
    const rowText = (containerRow?.innerText || "").trim().toLowerCase();

    // Prioridad 1: Coincidencia con lista fija de grupos guardados por el usuario
    if (selectedNames && selectedNames.length > 0) {
      const matchesFavorite = selectedNames.some(name => rowText.includes(name.trim().toLowerCase()));
      if (!matchesFavorite) continue;
    } else if (keywords && keywords.length > 0) {
      // Prioridad 2: Filtro por palabras clave
      const matches = keywords.some(k => rowText.includes(k.trim().toLowerCase()));
      if (!matches) continue;
    }

    // Disparar clic para activar el checkbox de forma compatible con React
    box.click();
    box.dispatchEvent(new Event("change", { bubbles: true }));
    selectedCount++;
    await new Promise(r => setTimeout(r, 120)); // Delay para permitir render de React
  }

  // 2. Localizar y presionar el botón de publicar/compartir
  const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
  const submitBtn = buttons.find(b => {
    const txt = (b.innerText || b.getAttribute("aria-label") || "").trim().toLowerCase();
    return (
      (txt === "publicar" || txt === "compartir" || txt === "listo" || txt === "guardar" || txt === "share" || txt === "done") &&
      !b.disabled &&
      b.offsetParent !== null
    );
  });

  if (submitBtn) {
    await new Promise(r => setTimeout(r, 250));
    submitBtn.click();
    console.log(`✓ Publicación enviada con éxito a ${selectedCount} grupos de Facebook.`);
    return { success: true, count: selectedCount };
  }

  return { success: true, count: selectedCount, note: "Grupos marcados. Esperando confirmación manual." };
}

/**
 * Inyecta un banner de control visual dentro del modal de compartir en grupos de Facebook
 */
function attachGroupSharerToDialog(dialog) {
  if (dialog.querySelector("#haibane-group-auto-banner")) return;

  // Extraer grupos visibles en el modal y guardarlos en storage para el selector
  const foundGroups = [];
  const allBoxes = Array.from(dialog.querySelectorAll('div[role="checkbox"], div[aria-checked], input[type="checkbox"]'));
  allBoxes.forEach(box => {
    const containerRow = box.closest('div[role="listitem"]') || box.parentElement?.parentElement || box.parentElement;
    const rowTitle = (containerRow?.innerText || "").split("\n")[0]?.trim();
    if (rowTitle && rowTitle.length > 2 && !foundGroups.includes(rowTitle)) {
      foundGroups.push(rowTitle);
    }
  });

  if (foundGroups.length > 0) {
    chrome.storage?.local?.set({ scannedFacebookGroups: foundGroups });
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
      Cargando tus 12 grupos favoritos fijos...
    </div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button id="haibane-btn-share-12-groups" style="flex: 2; background: #7e22ce; color: #ffffff; border: none; border-radius: 4px; padding: 6px 10px; font-weight: 800; cursor: pointer; font-size: 11px;">
        🚀 Enviar a Mis 12 Grupos Fijos
      </button>
      <button id="haibane-btn-save-as-fixed" style="flex: 1; background: #059669; color: #ffffff; border: none; border-radius: 4px; padding: 6px 8px; font-weight: 700; cursor: pointer; font-size: 10.5px;" title="Memoriza los grupos que tengas marcados actualmente como tu lista fija de por vida">
        💾 Fijar Selección
      </button>
      <button id="haibane-btn-select-all-groups" style="background: #334155; color: #f1f5f9; border: none; border-radius: 4px; padding: 6px 8px; font-weight: 700; cursor: pointer; font-size: 10.5px;">
        ✓ Todos
      </button>
    </div>
    <div id="haibane-group-share-status" style="font-size: 10.5px; color: #38bdf8;"></div>
  `;

  // Insertar en la cabecera del diálogo
  const header = dialog.querySelector('h2, [role="heading"]') || dialog.firstChild;
  if (header && header.parentElement) {
    header.parentElement.insertBefore(banner, header.nextSibling);
  } else {
    dialog.prepend(banner);
  }

  // Leer configuración desde almacenamiento
  chrome.storage?.local?.get(["groupShareCount", "groupShareAuto", "groupKeywords", "selectedGroupNames"], (config) => {
    const selectedNames = Array.isArray(config?.selectedGroupNames) ? config.selectedGroupNames : [];
    const targetCount = selectedNames.length > 0 ? selectedNames.length : (config?.groupShareCount || 12);
    const isAuto = config?.groupShareAuto !== false; // true por defecto
    const keywords = (config?.groupKeywords || "").split(",").map(k => k.trim()).filter(Boolean);

    const descEl = document.getElementById("haibane-group-banner-desc");
    if (descEl) {
      descEl.textContent = selectedNames.length > 0
        ? `Tienes ${selectedNames.length} grupos favoritos configurados. Se marcarán exactamente esos.`
        : `Sin lista fija configurada. Se seleccionarán los primeros ${targetCount} grupos disponibles.`;
    }

    const btn12 = document.getElementById("haibane-btn-share-12-groups");
    if (btn12) btn12.textContent = `🚀 Enviar a Mis ${targetCount} Grupos Fijos`;

    const statusEl = document.getElementById("haibane-group-share-status");

    // Botón para fijar la selección actual
    document.getElementById("haibane-btn-save-as-fixed")?.addEventListener("click", () => {
      const userSelected = [];
      allBoxes.forEach(box => {
        const isChecked = box.getAttribute("aria-checked") === "true" || box.checked === true;
        if (isChecked) {
          const containerRow = box.closest('div[role="listitem"]') || box.parentElement?.parentElement || box.parentElement;
          const rowTitle = (containerRow?.innerText || "").split("\n")[0]?.trim();
          if (rowTitle) userSelected.push(rowTitle);
        }
      });
      if (userSelected.length > 0) {
        chrome.storage?.local?.set({ selectedGroupNames: userSelected, groupShareCount: userSelected.length }, () => {
          if (statusEl) statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${userSelected.length} grupos memorizados de por vida.</span>`;
          if (descEl) descEl.textContent = `${userSelected.length} grupos guardados como tu lista fija.`;
        });
      } else {
        if (statusEl) statusEl.textContent = "Marca primero las casillas de los grupos que deseas memorizar.";
      }
    });

    btn12?.addEventListener("click", async () => {
      if (statusEl) statusEl.textContent = `⏳ Seleccionando ${targetCount} grupos favoritos...`;
      const res = await autoSelectAndShareGroups(targetCount, keywords, selectedNames);
      if (res.success) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos seleccionados y compartidos.</span>`;
      } else {
        if (statusEl) statusEl.textContent = `Aviso: ${res.error}`;
      }
    });

    document.getElementById("haibane-btn-select-all-groups")?.addEventListener("click", async () => {
      if (statusEl) statusEl.textContent = "⏳ Seleccionando todos los grupos disponibles (máx 20)...";
      const res = await autoSelectAndShareGroups(20, [], []);
      if (res.success && statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ ${res.count} grupos seleccionados.</span>`;
      }
    });

    // Auto-ejecución si está habilitado con countdown
    if (isAuto) {
      let countdown = 2;
      if (statusEl) statusEl.innerHTML = `⏳ Auto-compartiendo en ${targetCount} grupos en <strong>${countdown}s</strong>...`;
      const timer = setInterval(async () => {
        countdown--;
        if (countdown > 0) {
          if (statusEl) statusEl.innerHTML = `⏳ Auto-compartiendo en ${targetCount} grupos en <strong>${countdown}s</strong>...`;
        } else {
          clearInterval(timer);
          if (statusEl) statusEl.textContent = `⏳ Marcando ${targetCount} grupos y publicando...`;
          const res = await autoSelectAndShareGroups(targetCount, keywords, selectedNames);
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
    chrome.runtime.sendMessage({
      action: "RELIST_EXPIRED_PRODUCT",
      productId: target.id,
      oldListingId: target.facebookListingId
    }, (res) => {
      console.log(`✓ Iniciando re-publicación limpia para ${target.title}`);
    });
  });
}

/**
 * Observa mutaciones en el DOM para detectar el diálogo de compartir en grupos de Facebook
 */
function setupGroupSharingObserver() {
  const checkDialogs = () => {
    const dialogs = document.querySelectorAll('div[role="dialog"]');
    dialogs.forEach(dialog => {
      const text = (dialog.innerText || "").toLowerCase();
      if (
        text.includes("publicar en más lugares") ||
        text.includes("compartir en grupos") ||
        text.includes("publicar en grupos") ||
        text.includes("tus grupos de compra") ||
        text.includes("list in more places") ||
        text.includes("share to groups")
      ) {
        attachGroupSharerToDialog(dialog);
      }
    });
  };

  const observer = new MutationObserver(() => {
    checkDialogs();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  checkDialogs();
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
        <button id="haibane-btn-share-groups-wgt" style="flex: 1; background: #059669; color: #ffffff; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 800; cursor: pointer; font-size: 10px;" title="Compartir automáticamente en 12 grupos de Facebook">
          📢 Compartir en Grupos
        </button>
        <button id="haibane-btn-scan-now" style="flex: 1; background: #334155; color: #f1f5f9; border: none; border-radius: 4px; padding: 5px 6px; font-weight: 700; cursor: pointer; font-size: 10px;">
          🔄 Auditar Precios
        </button>
      </div>
      <div style="display: flex; gap: 5px;">
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

  document.getElementById("haibane-btn-share-groups-wgt")?.addEventListener("click", () => {
    chrome.storage?.local?.get(["groupShareCount", "groupKeywords"], (config) => {
      const targetCount = config?.groupShareCount || 12;
      const keywords = (config?.groupKeywords || "").split(",").map(k => k.trim()).filter(Boolean);
      autoSelectAndShareGroups(targetCount, keywords);
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
  });
}

// Escuchar peticiones del background service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "AUDIT_LISTINGS") {
    auditMarketplaceListings();
  }
  if (msg.action === "LINK_TWINS") {
    linkExistingMarketplaceTwins();
  }
  if (msg.action === "AUTO_SHARE_GROUPS") {
    autoSelectAndShareGroups(msg.targetCount || 12, msg.keywords || [], msg.selectedNames || []);
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
    runAutoRelistCycle(msg.maxDays || 7);
    sendResponse({ success: true });
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
  if (window.location.href.includes("/marketplace/create/item")) {
    initAutoPublishAssistant();
  } else {
    injectHaibaneFloatingWidget();
    loadCatalogProducts();
  }
  if (window.location.href.includes("/groups")) {
    setTimeout(autoSyncGroupsFromPage, 1500);
    setTimeout(autoSyncGroupsFromPage, 3500);
  }
}

setupGroupSharingObserver();
checkPageAndInit();
setTimeout(checkPageAndInit, 800);
setTimeout(checkPageAndInit, 2000);

let lastKnownUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
    checkPageAndInit();
  }
}, 800);

