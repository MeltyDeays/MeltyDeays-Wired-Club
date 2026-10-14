/* Service Worker en segundo plano (Manifest V3) */
import { getWebProducts, getProductById, linkProductToFacebook, updateProductPriceFromFacebook, markProductSoldFromFacebook } from "./firebase-api.js";

const SYNC_ALARM_NAME = "HAIBANE_MARKETPLACE_SYNC_ALARM";

// Inicializar alarma periódica (cada 5 minutos)
chrome.runtime.onInstalled.addListener(() => {
  console.log("Haibane Marketplace Sync instalada.");
  chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: 5
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    console.log("⏰ Ejecutando ciclo de verificación periódica de sincronización...");
    // Notificar a las pestañas activas de Facebook para auditar cambios
    try {
      const tabs = await chrome.tabs.query({ url: "https://www.facebook.com/marketplace/*" });
      const storage = await chrome.storage?.local?.get(["relistAuto", "relistDays"]);
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: "AUDIT_LISTINGS" }).catch(() => {});
        if (storage?.relistAuto) {
          chrome.tabs.sendMessage(tab.id, { action: "RUN_AUTO_RELIST", maxDays: storage.relistDays || 7 }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Aviso en alarma de sincronización:", e);
    }
  }
});

function openBatchItemCreation(batch) {
  if (!batch || !Array.isArray(batch.queue)) return;
  const item = batch.queue[batch.currentIndex];
  if (!item) return;

  const priceParam = (item.overridePrice && !isNaN(Number(item.overridePrice))) ? `&override_price=${encodeURIComponent(item.overridePrice)}` : "";
  const preferParam = item.preferRealPhotos ? `&prefer_real_photos=true` : "";
  const thumbParam = item.thumb ? `&thumb_url=${encodeURIComponent(item.thumb)}` : "";
  const titleParam = item.title ? `&title=${encodeURIComponent(item.title)}` : "";
  const url = `https://www.facebook.com/marketplace/create/item?haibane_id=${encodeURIComponent(item.productId)}&auto_relist=true&old_listing_id=${encodeURIComponent(item.oldListingId || "")}&batch_active=true&batch_index=${batch.currentIndex}&batch_total=${batch.queue.length}${priceParam}${preferParam}${thumbParam}${titleParam}`;

  if (batch.tabId) {
    chrome.tabs.get(batch.tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        chrome.tabs.create({ url }, (newTab) => {
          batch.tabId = newTab.id;
          chrome.storage?.local?.set({ activeRelistBatch: batch });
        });
      } else {
        chrome.tabs.update(batch.tabId, { url, active: true });
      }
    });
  } else {
    chrome.tabs.create({ url }, (newTab) => {
      batch.tabId = newTab.id;
      chrome.storage?.local?.set({ activeRelistBatch: batch });
    });
  }
}

// Manejador de mensajes internos
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SYNC_ENV") {
    chrome.storage?.local?.get(["haibaneSyncEnv", "targetCollection"], (d) => {
      sendResponse({
        success: true,
        env: d?.haibaneSyncEnv || "PROD",
        collection: d?.targetCollection || "rewards_catalog"
      });
    });
    return true;
  }

  if (request.action === "SET_SYNC_ENV") {
    const isProd = request.env === "PROD";
    const newCol = isProd ? "rewards_catalog" : "dev_rewards_catalog";
    const newEnv = isProd ? "PROD" : "DEV";
    chrome.storage?.local?.set({ haibaneSyncEnv: newEnv, targetCollection: newCol }, () => {
      console.log(`[Haibane Sync] Entorno conmutado a ${newEnv} (${newCol})`);
      chrome.tabs.query({ url: "https://www.facebook.com/marketplace/*" }).then(tabs => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { action: "ENV_CHANGED", env: newEnv, collection: newCol }).catch(() => {});
        }
      }).catch(() => {});
      sendResponse({ success: true, env: newEnv, collection: newCol });
    });
    return true;
  }

  if (request.action === "GET_CATALOG_PRODUCTS") {
    chrome.storage?.local?.get(["targetCollection", "haibaneSyncEnv"], (stored) => {
      const col = request.collection || stored?.targetCollection || "rewards_catalog";
      const env = stored?.haibaneSyncEnv || (col.startsWith("dev_") ? "DEV" : "PROD");
      getWebProducts(col)
        .then(products => sendResponse({ success: true, products, collection: col, env }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true; // Respuesta asíncrona
  }

  if (request.action === "GET_PRODUCT_BY_ID") {
    const { productId, collection } = request;
    chrome.storage?.local?.get(["targetCollection"], (stored) => {
      const col = collection || stored?.targetCollection || "rewards_catalog";
      getProductById(productId, col)
        .then(product => sendResponse({ success: true, product }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }

  if (request.action === "LINK_PRODUCT_TO_FB") {
    const { productId, fbListingId, fbUrl, collection } = request;
    chrome.storage?.local?.get(["targetCollection"], (stored) => {
      const col = collection || stored?.targetCollection || "rewards_catalog";
      linkProductToFacebook(productId, fbListingId, fbUrl, col)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }

  if (request.action === "SYNC_PRICE_TO_FIRESTORE") {
    const { productId, newPrice, newPriceUsd, newPriceNio, fbListingId, maxDiscountPct, collection } = request;
    const finalUsd = newPriceUsd !== undefined ? newPriceUsd : newPrice;
    const finalNio = newPriceNio !== undefined ? newPriceNio : Math.round(Number(finalUsd) * 37.0);
    const finalPct = maxDiscountPct !== undefined ? maxDiscountPct : 10;
    chrome.storage?.local?.get(["targetCollection"], (stored) => {
      const col = collection || stored?.targetCollection || "rewards_catalog";
      updateProductPriceFromFacebook(productId, finalUsd, finalNio, fbListingId, finalPct, col)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }

  if (request.action === "MARK_SOLD_IN_FIRESTORE") {
    const { productId, collection } = request;
    chrome.storage?.local?.get(["targetCollection"], (stored) => {
      const col = collection || stored?.targetCollection || "rewards_catalog";
      markProductSoldFromFacebook(productId, col)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }

  if (request.action === "FETCH_IMAGE_BLOB") {
    fetch(request.url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(async blob => {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const dataUrl = `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
        sendResponse({ success: true, dataUrl });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "OPEN_FB_CREATE_TAB") {
    const { productId } = request;
    chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/create/item?haibane_id=${encodeURIComponent(productId)}`
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "RELIST_EXPIRED_PRODUCT") {
    const { productId, oldListingId, overridePrice, preferRealPhotos, thumb, title } = request;
    const priceParam = (overridePrice && !isNaN(Number(overridePrice))) ? `&override_price=${encodeURIComponent(overridePrice)}` : "";
    const preferParam = preferRealPhotos ? `&prefer_real_photos=true` : "";
    const thumbParam = thumb ? `&thumb_url=${encodeURIComponent(thumb)}` : "";
    const titleParam = title ? `&title=${encodeURIComponent(title)}` : "";
    chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/create/item?haibane_id=${encodeURIComponent(productId)}&auto_relist=true&old_listing_id=${encodeURIComponent(oldListingId || "")}${priceParam}${preferParam}${thumbParam}${titleParam}`
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "START_BATCH_RELIST") {
    const { queue } = request;
    if (!Array.isArray(queue) || queue.length === 0) {
      sendResponse({ success: false, error: "Cola vacía" });
      return true;
    }
    const batch = {
      queue,
      currentIndex: 0,
      status: "PROCESSING",
      step: "CREATING",
      tabId: null,
      startedAt: Date.now()
    };

    chrome.storage?.local?.set({ activeRelistBatch: batch, pendingDeletions: [] }, () => {
      openBatchItemCreation(batch);
      sendResponse({ success: true, count: queue.length });
    });
    return true;
  }

  if (request.action === "PROCESS_NEXT_BATCH_ITEM") {
    chrome.storage?.local?.get(["activeRelistBatch"], (d) => {
      const b = d?.activeRelistBatch;
      if (b && b.status === "PROCESSING") {
        openBatchItemCreation(b);
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "FORCE_NEXT_BATCH_ITEM") {
    chrome.storage?.local?.get(["activeRelistBatch"], (d) => {
      const b = d?.activeRelistBatch;
      if (b && b.status === "PROCESSING") {
        const nextIdx = (b.currentIndex || 0) + 1;
        if (nextIdx < b.queue.length) {
          b.currentIndex = nextIdx;
          b.step = "CREATING";
          chrome.storage?.local?.set({ activeRelistBatch: b }, () => {
            openBatchItemCreation(b);
          });
        } else {
          chrome.storage?.local?.set({ activeRelistBatch: null });
        }
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "CANCEL_BATCH_RELIST") {
    chrome.storage?.local?.set({ activeRelistBatch: null }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "CHECK_AUTORELIST_NOW") {
    chrome.tabs.query({ url: "https://www.facebook.com/marketplace/*" })
      .then(tabs => {
        if (tabs.length === 0) {
          chrome.tabs.create({ url: "https://www.facebook.com/marketplace/you/selling" }, (newTab) => {
            setTimeout(() => {
              chrome.tabs.sendMessage(newTab.id, { action: "RUN_AUTO_RELIST", maxDays: request.maxDays || 7 }).catch(() => {});
            }, 4000);
          });
          sendResponse({ success: true, message: "Abriendo Marketplace para auditar publicaciones caducadas..." });
        } else {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: "RUN_AUTO_RELIST", maxDays: request.maxDays || 7 }).catch(() => {});
          }
          sendResponse({ success: true, message: "Ciclo de re-publicación enviado a pestaña activa." });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "EXPORT_LISTINGS_TO_WEB") {
    const { listings } = request;
    fetch("https://meltydeays-wired-club.vercel.app/api/sync-facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings })
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: data.success, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "EXECUTE_CONFIRM_DELETE_IN_MAIN_WORLD") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: "No sender tab id" });
      return true;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], [role="dialog"], [aria-modal="true"]'));
        const dialog = dialogs.slice().reverse().find(d => {
          const txt = (d.innerText || d.textContent || "").toLowerCase();
          return (txt.includes("eliminar") || txt.includes("delete")) && !txt.includes("haibane-floating-widget");
        }) || dialogs[dialogs.length - 1];
        if (!dialog) return { success: false, reason: "No dialog found" };

        const allBtns = Array.from(dialog.querySelectorAll('div[role="button"], button, [role="button"], a'));

        // 1. Coincidencia exacta de texto: "eliminar" o "delete"
        let btn = allBtns.find(b => {
          const inner = (b.innerText || b.textContent || "").trim().toLowerCase();
          const aria = (b.getAttribute("aria-label") || "").trim().toLowerCase();
          if (inner.includes("cancelar") || aria.includes("cancelar") || inner.includes("cerrar") || aria.includes("cerrar")) return false;
          return inner === "eliminar" || aria === "eliminar" || inner === "delete" || aria === "delete";
        });

        // 2. Si no es exacto, buscar que termine en "eliminar" o "eliminar definitivamente"
        if (!btn) {
          btn = allBtns.find(b => {
            const inner = (b.innerText || b.textContent || "").trim().toLowerCase();
            const aria = (b.getAttribute("aria-label") || "").trim().toLowerCase();
            if (inner.includes("cancelar") || aria.includes("cancelar") || inner.includes("cerrar") || aria.includes("cerrar") || inner.includes("publicaci")) return false;
            return inner.endsWith("eliminar") || inner.includes("eliminar definitivamente");
          });
        }

        // 3. Fallback: El último botón del diálogo que no sea Cancelar ni Cerrar
        if (!btn) {
          const candidates = allBtns.filter(b => {
            const inner = (b.innerText || b.textContent || "").trim().toLowerCase();
            const aria = (b.getAttribute("aria-label") || "").trim().toLowerCase();
            return !inner.includes("cancelar") && !aria.includes("cancelar") && !inner.includes("cerrar") && !aria.includes("cerrar") && !inner.includes("publicaci") && (inner.length > 0 || aria.length > 0);
          });
          if (candidates.length > 0) btn = candidates[candidates.length - 1];
        }

        if (!btn) return { success: false, reason: "Confirm button not found" };

        const rect = btn.getBoundingClientRect();
        const cx = Math.floor(rect.left + rect.width / 2);
        const cy = Math.floor(rect.top + rect.height / 2);

        // 2. Disparador vía React Props y React Fiber
        let reactTriggered = false;
        try {
          const candidateNodes = [btn, ...Array.from(btn.querySelectorAll('*')), btn.parentElement, btn.parentElement?.parentElement].filter(Boolean);
          for (const node of candidateNodes) {
            if (reactTriggered) break;
            const propsKey = Object.keys(node).find(k => k.startsWith('__reactProps$'));
            if (propsKey && node[propsKey]) {
              const p = node[propsKey];
              const syntheticEvt = {
                bubbles: true,
                cancelable: true,
                defaultPrevented: false,
                preventDefault: () => {},
                stopPropagation: () => {},
                target: node,
                currentTarget: node,
                nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy })
              };
              if (typeof p.onClick === 'function') {
                p.onClick(syntheticEvt);
                reactTriggered = true;
                break;
              }
              if (typeof p.onPress === 'function') {
                p.onPress(syntheticEvt);
                reactTriggered = true;
                break;
              }
            }

            const fiberKey = Object.keys(node).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey && node[fiberKey]) {
              let cur = node[fiberKey];
              let depth = 0;
              while (cur && depth < 15 && !reactTriggered) {
                const mp = cur.memoizedProps;
                if (mp) {
                  const syntheticEvt = {
                    bubbles: true,
                    cancelable: true,
                    defaultPrevented: false,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    target: node,
                    currentTarget: node,
                    nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy })
                  };
                  if (typeof mp.onPress === 'function') {
                    mp.onPress(syntheticEvt);
                    reactTriggered = true;
                    break;
                  }
                  if (typeof mp.onClick === 'function') {
                    mp.onClick(syntheticEvt);
                    reactTriggered = true;
                    break;
                  }
                }
                cur = cur.return;
                depth++;
              }
            }
          }
        } catch (rErr) {
          console.warn("Haibane: Error en react trigger:", rErr);
        }

        // 3. Disparador por coordenadas hit-test (document.elementFromPoint) con PointerEvent y MouseEvent
        try {
          if (rect.width > 0 && rect.height > 0) {
            const hitEl = (cx > 0 && cy > 0) ? (document.elementFromPoint(cx, cy) || btn) : btn;

            const pointerOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse', isPrimary: true };
            const mouseOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };

            hitEl.dispatchEvent(new PointerEvent('pointerover', pointerOpts));
            hitEl.dispatchEvent(new PointerEvent('pointerdown', { ...pointerOpts, buttons: 1 }));
            hitEl.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
            hitEl.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, buttons: 1 }));
            hitEl.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
            hitEl.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
            hitEl.dispatchEvent(new MouseEvent('click', { ...mouseOpts, buttons: 0 }));
            if (typeof hitEl.click === 'function') hitEl.click();
            if (hitEl !== btn && typeof btn.click === 'function') btn.click();
          }
        } catch (_) {}

        // 4. Click nativo en el botón y sus hijos
        try {
          btn.click();
          btn.querySelector("span")?.click();
        } catch (_) {}

        return { success: true, reactTriggered, label: btn.innerText || btn.getAttribute("aria-label") };
      }
    }).then(results => {
      sendResponse({ success: true, result: results?.[0]?.result });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});
