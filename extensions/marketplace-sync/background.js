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
  if (request.action === "GET_CATALOG_PRODUCTS") {
    getWebProducts(request.collection)
      .then(products => sendResponse({ success: true, products }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Respuesta asíncrona
  }

  if (request.action === "GET_PRODUCT_BY_ID") {
    const { productId } = request;
    getProductById(productId)
      .then(product => sendResponse({ success: true, product }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "LINK_PRODUCT_TO_FB") {
    const { productId, fbListingId, fbUrl, collection } = request;
    linkProductToFacebook(productId, fbListingId, fbUrl, collection)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "SYNC_PRICE_TO_FIRESTORE") {
    const { productId, newPrice, fbListingId, collection } = request;
    updateProductPriceFromFacebook(productId, newPrice, fbListingId, collection)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "MARK_SOLD_IN_FIRESTORE") {
    const { productId, collection } = request;
    markProductSoldFromFacebook(productId, collection)
      .then(result => sendResponse({ success: true, result }))
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
    const { productId, oldListingId, overridePrice } = request;
    const priceParam = (overridePrice && !isNaN(Number(overridePrice))) ? `&override_price=${encodeURIComponent(overridePrice)}` : "";
    chrome.tabs.create({
      url: `https://www.facebook.com/marketplace/create/item?haibane_id=${encodeURIComponent(productId)}&auto_relist=true&old_listing_id=${encodeURIComponent(oldListingId || "")}${priceParam}`
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
    chrome.storage?.local?.set({ activeRelistBatch: batch }, () => {
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
});
