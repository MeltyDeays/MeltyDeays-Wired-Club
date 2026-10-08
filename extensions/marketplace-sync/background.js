/* Service Worker en segundo plano (Manifest V3) */
import { getWebProducts, updateProductPriceFromFacebook, markProductSoldFromFacebook } from "./firebase-api.js";

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
    getWebProducts()
      .then(products => sendResponse({ success: true, products }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Respuesta asíncrona
  }

  if (request.action === "SYNC_PRICE_TO_FIRESTORE") {
    const { productId, newPrice, fbListingId } = request;
    updateProductPriceFromFacebook(productId, newPrice, fbListingId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "MARK_SOLD_IN_FIRESTORE") {
    const { productId } = request;
    markProductSoldFromFacebook(productId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
