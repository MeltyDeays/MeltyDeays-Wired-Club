/**
 * DeviceFingerprint.js
 * Generador de huella digital de hardware y motor anti-abuso de registro (The Wired Club)
 * Protege contra multi-cuentas y farming de bonos de bienvenida incluso si el usuario usa VPN.
 */
import { db } from "../config/firebase.js";
import { getCollectionName } from "../config/env.js";

const LOCAL_STORAGE_DEVICE_SEED = "wired_device_persistent_seed";
const LOCAL_STORAGE_CLAIMED_KEY = "wired_device_welcome_claimed";
const INDEXED_DB_NAME = "WiredSecurityVault";
const INDEXED_DB_STORE = "device_identity";

/**
 * Genera un hash criptográfico SHA-256 o fallback FNV-1a para cadenas de texto
 */
async function digestString(str) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {}
  }
  // Fallback FNV-1a (32-bit hex)
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return "fnv_" + (h1 >>> 0).toString(16).padStart(8, "0");
}

/**
 * Extrae o inicializa un seed persistente en IndexedDB y LocalStorage
 */
async function getPersistentDeviceSeed() {
  if (typeof window === "undefined") return "node_env_seed";

  let seed = null;
  try {
    seed = localStorage.getItem(LOCAL_STORAGE_DEVICE_SEED);
  } catch (e) {}

  if (!seed && typeof indexedDB !== "undefined") {
    try {
      seed = await new Promise((resolve) => {
        const req = indexedDB.open(INDEXED_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
            db.createObjectStore(INDEXED_DB_STORE);
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(INDEXED_DB_STORE, "readonly");
          const getReq = tx.objectStore(INDEXED_DB_STORE).get("seed");
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {}
  }

  if (!seed) {
    seed = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
    try {
      localStorage.setItem(LOCAL_STORAGE_DEVICE_SEED, seed);
    } catch (e) {}
    if (typeof indexedDB !== "undefined") {
      try {
        const req = indexedDB.open(INDEXED_DB_NAME, 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(INDEXED_DB_STORE, "readwrite");
          tx.objectStore(INDEXED_DB_STORE).put(seed, "seed");
        };
      } catch (e) {}
    }
  }

  return seed;
}

/**
 * Obtiene señales inmutables de renderizado Canvas 2D
 */
function getCanvasFingerprint() {
  if (typeof document === "undefined") return "no_dom_canvas";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "canvas_unsupported";

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = "14px 'Arial', 'Segoe UI', sans-serif";
    ctx.fillText("MeltyDeays#WiredClub", 2, 18);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("MeltyDeays#WiredClub", 4, 20);

    return canvas.toDataURL();
  } catch (e) {
    return "canvas_error";
  }
}

/**
 * Obtiene el vendor y renderer de GPU vía WebGL
 */
function getWebGLFingerprint() {
  if (typeof document === "undefined") return "no_dom_webgl";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no_webgl";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "no_debug_info";

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
    return `${vendor}~${renderer}`;
  } catch (e) {
    return "webgl_error";
  }
}

export class DeviceFingerprint {
  /**
   * Genera la huella digital hardware del dispositivo (persistente ante VPN)
   * @returns {Promise<string>} Identificador alfanumérico único del dispositivo
   */
  static async getDeviceFingerprint() {
    if (typeof window === "undefined") {
      return "NODE_SERVER_ENVIRONMENT";
    }

    const seed = await getPersistentDeviceSeed();
    const canvas = getCanvasFingerprint();
    const webgl = getWebGLFingerprint();

    const screenRes = typeof screen !== "undefined"
      ? `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio || 1}`
      : "0x0";

    const hardware = [
      navigator.hardwareConcurrency || 4,
      navigator.deviceMemory || 4,
      navigator.platform || "unknown",
      navigator.language || "es",
      new Date().getTimezoneOffset()
    ].join("|");

    const rawSignature = `SEED:${seed}#CANVAS:${canvas}#WEBGL:${webgl}#RES:${screenRes}#HW:${hardware}`;
    const hash = await digestString(rawSignature);
    return `WD-${hash.substring(0, 24)}`;
  }

  /**
   * Verifica si este dispositivo ya ha reclamado el bono de bienvenida
   * @param {string} fingerprint Huella digital del dispositivo
   * @returns {Promise<{alreadyClaimed: boolean, claimData: Object|null}>}
   */
  static async checkDeviceClaim(fingerprint) {
    if (!fingerprint) return { alreadyClaimed: false, claimData: null };

    // 1. Verificación en almacenamiento local persistente (Instantáneo)
    try {
      if (typeof localStorage !== "undefined") {
        const localClaim = localStorage.getItem(LOCAL_STORAGE_CLAIMED_KEY);
        if (localClaim) {
          return { alreadyClaimed: true, claimData: { source: "local_cache", fingerprint } };
        }
      }
    } catch (e) {}

    // 2. Verificación en Firestore Cloud Database
    if (db) {
      try {
        const collection = getCollectionName("device_claims");
        const docRef = await db.collection(collection).doc(fingerprint).get();
        if (docRef.exists) {
          const data = docRef.data();
          // Asegurar caché local si se encontró en la nube
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(LOCAL_STORAGE_CLAIMED_KEY, JSON.stringify(data));
            }
          } catch (e) {}
          return { alreadyClaimed: true, claimData: data };
        }
      } catch (e) {
        console.warn("Aviso: Consulta Firestore de device_claims falló o en modo offline:", e.message);
      }
    }

    return { alreadyClaimed: false, claimData: null };
  }

  /**
   * Registra el bono de bienvenida reclamado para este dispositivo
   * @param {string} fingerprint Huella digital del dispositivo
   * @param {Object} metadata Datos del usuario ({ uid, phone })
   */
  static async recordDeviceClaim(fingerprint, metadata = {}) {
    if (!fingerprint) return;

    const payload = {
      fingerprint,
      uid: metadata.uid || "",
      phone: metadata.phone || "",
      claimedAt: new Date().toISOString(),
      bonusPoints: 250,
      bonusUsdValue: 5.0
    };

    // 1. Guardar en almacenamiento local
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_CLAIMED_KEY, JSON.stringify(payload));
      }
    } catch (e) {}

    // 2. Persistir en Firestore Cloud Database
    if (db) {
      try {
        const collection = getCollectionName("device_claims");
        await db.collection(collection).doc(fingerprint).set(payload, { merge: true });
      } catch (e) {
        console.warn("Aviso: No se pudo persistir registro en device_claims Firestore:", e.message);
      }
    }
  }
}
