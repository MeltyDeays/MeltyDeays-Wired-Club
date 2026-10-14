/* Cliente REST de Firestore para Extensión de Chrome (Cero dependencias) */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig",
  projectId: "lain-wired-club"
};

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

/**
 * Convierte un valor de Firestore REST a un valor primitivo JS.
 */
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

/**
 * Obtiene todos los productos del catálogo web consultando la colección activa.
 * Entorno Producción: 'rewards_catalog'
 * Entorno Pruebas/Sandbox: 'dev_rewards_catalog'
 */
export async function getWebProducts(targetCollection = "rewards_catalog") {
  const col = targetCollection || "rewards_catalog";
  const url = `${BASE_URL}/${col}?key=${FIREBASE_CONFIG.apiKey}&pageSize=100`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Haibane Sync] Colección ${col} respondió con estado ${res.status}`);
      return [];
    }
    const data = await res.json();
    const documents = data.documents || [];
    return documents.map(doc => {
      const docId = doc.name.split("/").pop();
      const fields = doc.fields || {};
      const parsed = { id: docId, _collection: col };
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = parseFirestoreValue(v);
      }
      return parsed;
    });
  } catch (err) {
    console.warn(`[Haibane Sync] Error consultando colección ${col}:`, err);
    return [];
  }
}

/**
 * Obtiene un producto individual por ID buscando en la colección activa.
 */
export async function getProductById(productId, targetCollection = "rewards_catalog") {
  const col = targetCollection || "rewards_catalog";
  const url = `${BASE_URL}/${col}/${productId}?key=${FIREBASE_CONFIG.apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    const docId = doc.name.split("/").pop();
    const fields = doc.fields || {};
    const parsed = { id: docId, _collection: col };
    for (const [k, v] of Object.entries(fields)) {
      parsed[k] = parseFirestoreValue(v);
    }
    return parsed;
  } catch (err) {
    console.warn(`[Haibane Sync] Error buscando producto ${productId} en ${col}:`, err);
    return null;
  }
}

/**
 * Enlaza un producto web existente con su publicación gemela en Facebook.
 */
export async function linkProductToFacebook(productId, fbListingId, fbUrl = null, collection = "rewards_catalog") {
  const targetCol = collection || "rewards_catalog";
  const maskParams = [
    "updateMask.fieldPaths=facebookListingId",
    "updateMask.fieldPaths=fbUrl",
    "updateMask.fieldPaths=syncStatus",
    "updateMask.fieldPaths=syncSource",
    "updateMask.fieldPaths=lastSyncedAt",
    "updateMask.fieldPaths=lastRelistedAt"
  ];
  const url = `${BASE_URL}/${targetCol}/${productId}?${maskParams.join("&")}&key=${FIREBASE_CONFIG.apiKey}`;
  const now = new Date().toISOString();
  const fields = {
    facebookListingId: { stringValue: String(fbListingId) },
    fbUrl: { stringValue: fbUrl || `https://www.facebook.com/marketplace/item/${fbListingId}/` },
    syncStatus: { stringValue: "SYNCED_TWIN" },
    syncSource: { stringValue: "twin_matcher" },
    lastSyncedAt: { timestampValue: now },
    lastRelistedAt: { timestampValue: now }
  };

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status} en [${targetCol}]: ${errText}`);
    }
    console.log(`✓ Enlace Gemelo exitoso en [${targetCol}]: Producto ${productId} vinculado a FB #${fbListingId}`);
    return await res.json();
  } catch (err) {
    console.error(`[Haibane Sync] Error al enlazar producto en ${targetCol}:`, err);
    throw err;
  }
}


/**
 * Actualiza el precio y estado de sincronización de un producto en Firestore.
 * @param {string} productId ID del documento en Firestore
 * @param {number} newPriceUsd Nuevo precio en USD
 * @param {string} fbListingId ID de la publicación en Facebook
 * @param {string} collection Nombre de la colección ('rewards' o 'dev_rewards')
 */
export async function updateProductPriceFromFacebook(productId, newPriceUsd, fbListingId = null, collection = "rewards_catalog") {
  const targetCol = collection || "rewards_catalog";
  const maskParams = [
    "updateMask.fieldPaths=priceUsd",
    "updateMask.fieldPaths=syncSource",
    "updateMask.fieldPaths=lastSyncedAt"
  ];
  if (fbListingId) {
    maskParams.push("updateMask.fieldPaths=facebookListingId");
  }

  const url = `${BASE_URL}/${targetCol}/${productId}?${maskParams.join("&")}&key=${FIREBASE_CONFIG.apiKey}`;

  const fields = {
    priceUsd: { doubleValue: Number(newPriceUsd) },
    syncSource: { stringValue: "facebook" },
    lastSyncedAt: { timestampValue: new Date().toISOString() }
  };
  if (fbListingId) {
    fields.facebookListingId = { stringValue: String(fbListingId) };
  }

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status} en [${targetCol}]: ${errText}`);
    }
    const updated = await res.json();
    console.log(`✓ Firestore actualizado desde Facebook [${targetCol}]: Producto ${productId} -> $${newPriceUsd}`);
    return updated;
  } catch (err) {
    console.error(`Fallo actualizando producto en [${targetCol}]:`, err);
    throw err;
  }
}

/**
 * Marca un producto como SOLD_OUT en Firestore (activa caducidad visual a 12h)
 */
export async function markProductSoldFromFacebook(productId, collection = "rewards_catalog") {
  const targetCol = collection || "rewards_catalog";
  const maskParams = [
    "updateMask.fieldPaths=status",
    "updateMask.fieldPaths=stock",
    "updateMask.fieldPaths=soldOutAt",
    "updateMask.fieldPaths=sold_out_at",
    "updateMask.fieldPaths=soldOutReason",
    "updateMask.fieldPaths=syncSource",
    "updateMask.fieldPaths=lastSyncedAt"
  ];
  const url = `${BASE_URL}/${targetCol}/${productId}?${maskParams.join("&")}&key=${FIREBASE_CONFIG.apiKey}`;
  const now = new Date().toISOString();
  const fields = {
    status: { stringValue: "SOLD_OUT" },
    stock: { integerValue: 0 },
    soldOutAt: { timestampValue: now },
    sold_out_at: { timestampValue: now },
    soldOutReason: { stringValue: "Vendido en Facebook Marketplace" },
    syncSource: { stringValue: "facebook_extension_sold" },
    lastSyncedAt: { timestampValue: now }
  };

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    console.log(`✓ Producto ${productId} marcado como SOLD_OUT (regla 12h iniciada).`);
    return res.ok;
  } catch (err) {
    console.error("Fallo marcando producto como vendido:", err);
    throw err;
  }
}
