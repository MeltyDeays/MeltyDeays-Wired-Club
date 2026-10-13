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
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: "AUDIT_LISTINGS" }).catch(() => {});
      }
    } catch (e) {
      console.warn("Aviso en alarma de sincronización:", e);
    }
  }
});

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
