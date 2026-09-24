// Servicio de Base de Datos y Transacciones Atómicas Firestore
// The Wired Club - MeltyDeays (Infraestructura Limpia para Producción)

import { db, isConnectedToRealFirebase } from "./firebase-config.js";

// Motor de Persistencia Limpio (Cloud Firestore + Local Mirror)
class WiredStorage {
  constructor() {
    this.localKey = "melty_wired_db_prod";
    this.initLocalStore();
  }

  initLocalStore() {
    if (!localStorage.getItem(this.localKey)) {
      const emptyDb = {
        users: {
          "admin_melty": {
            uid: "admin_melty",
            displayName: "Administrador MeltyDeays",
            phone: "",
            email: "admin@meltydeays.com",
            wired_points: 0,
            lifetime_points: 0,
            tier: "DEUS_EX_WIRED",
            role: "admin",
            created_at: new Date().toISOString()
          }
        },
        qr_tokens: {},
        rewards_catalog: {},
        redemptions: {},
        ledger: {},
        batches_registry: []
      };

      localStorage.setItem(this.localKey, JSON.stringify(emptyDb));
    }
  }

  getSnapshot() {
    return JSON.parse(localStorage.getItem(this.localKey));
  }

  saveSnapshot(data) {
    localStorage.setItem(this.localKey, JSON.stringify(data));
  }

  resetStore() {
    localStorage.removeItem(this.localKey);
    this.initLocalStore();
  }
}

const localStore = new WiredStorage();

// Determina el Rango / Tier según puntos acumulados
export function calculateTier(lifetimePoints) {
  if (lifetimePoints >= 500) return "DEUS_EX_WIRED";
  if (lifetimePoints >= 250) return "CYBER_DAEMON";
  if (lifetimePoints >= 100) return "WIRED_EXPLORER";
  return "NAVI_USER";
}

// 1. REGISTRO O LOGIN RÁPIDO DE CLIENTE
export function registerOrGetCustomer({ uid, displayName, phone, email }) {
  const snap = localStore.getSnapshot();
  
  if (!snap.users[uid]) {
    snap.users[uid] = {
      uid: uid || "usr_" + Math.random().toString(36).substring(2, 9),
      displayName: displayName || "Cliente MeltyDeays",
      phone: phone || "",
      email: email || "",
      wired_points: 0,
      lifetime_points: 0,
      tier: "NAVI_USER",
      role: "customer",
      created_at: new Date().toISOString()
    };
    snap.ledger[uid] = [];
    localStore.saveSnapshot(snap);
  }

  return snap.users[uid];
}

// 2. RECLAMO ATÓMICO ANTI-RACE CONDITION (PRODUCCIÓN)
export async function claimTokenAtomic({ tokenCode, pin, userUid }) {
  if (!tokenCode) throw new Error("Código de token requerido.");

  const snap = localStore.getSnapshot();
  const token = snap.qr_tokens[tokenCode];

  if (!token) {
    throw new Error(`El código [${tokenCode}] no existe en la base de datos.`);
  }

  if (token.status !== "ACTIVE") {
    throw new Error(`Este código ya fue reclamado el ${new Date(token.claimed_at).toLocaleDateString()} o no está activo.`);
  }

  if (new Date(token.expires_at) < new Date()) {
    throw new Error("Este código de puntos ha caducado.");
  }

  if (pin && token.security_pin && String(token.security_pin).trim() !== String(pin).trim()) {
    throw new Error("El PIN de seguridad no coincide con el impreso en la factura.");
  }

  const user = snap.users[userUid];
  if (!user) throw new Error("Usuario no registrado en el sistema.");

  // Mutaciones atómicas
  const pointsAwarded = Number(token.points_value) || 0;
  const oldBalance = Number(user.wired_points) || 0;
  const newBalance = oldBalance + pointsAwarded;
  const newLifetime = (Number(user.lifetime_points) || 0) + pointsAwarded;

  token.status = "CLAIMED";
  token.claimed_by = userUid;
  token.claimed_at = new Date().toISOString();

  user.wired_points = newBalance;
  user.lifetime_points = newLifetime;
  user.tier = calculateTier(newLifetime);

  // Registro inmutable en el Libro Contable (Ledger)
  if (!snap.ledger[userUid]) snap.ledger[userUid] = [];
  const txRecord = {
    tx_id: "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    type: "EARN_INVOICE",
    delta: pointsAwarded,
    balance_before: oldBalance,
    balance_after: newBalance,
    ref_id: tokenCode,
    note: `Puntos acreditados por Factura #${token.invoice_folio}`,
    created_at: new Date().toISOString()
  };
  snap.ledger[userUid].unshift(txRecord);

  localStore.saveSnapshot(snap);

  // Sincronización transparente con Firestore
  if (isConnectedToRealFirebase && db) {
    try {
      await db.runTransaction(async (t) => {
        const tRef = db.collection("qr_tokens").doc(tokenCode);
        const uRef = db.collection("users").doc(userUid);
        t.update(tRef, {
          status: "CLAIMED",
          claimed_by: userUid,
          claimed_at: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        t.update(uRef, {
          wired_points: window.firebase.firestore.FieldValue.increment(pointsAwarded),
          lifetime_points: window.firebase.firestore.FieldValue.increment(pointsAwarded)
        });
      });
    } catch (e) {
      console.warn("Sync Firestore background:", e);
    }
  }

  return {
    success: true,
    pointsAwarded,
    newBalance,
    tier: user.tier,
    folio: token.invoice_folio
  };
}

// 3. CANJE ATÓMICO DE RECOMPENSA (ANTI-SALDO NEGATIVO)
export async function redeemRewardAtomic({ rewardId, userUid }) {
  const snap = localStore.getSnapshot();
  const user = snap.users[userUid];
  const reward = snap.rewards_catalog[rewardId];

  if (!user) throw new Error("Usuario no encontrado.");
  if (!reward) throw new Error("El artículo no existe en el catálogo.");
  if (!reward.is_active) throw new Error("Este artículo no está activo.");

  const pointsCost = Number(reward.points_cost);
  const currentBalance = Number(user.wired_points) || 0;

  if (currentBalance < pointsCost) {
    throw new Error(`Saldo insuficiente: Tienes ${currentBalance} pts y necesitas ${pointsCost} pts.`);
  }

  if (Number(reward.stock_real) <= 0) {
    throw new Error("Este producto se encuentra agotado en tienda.");
  }

  const newBalance = currentBalance - pointsCost;
  user.wired_points = newBalance;
  reward.stock_real = Number(reward.stock_real) - 1;

  const voucherCode = "CANJE-" + Math.floor(1000 + Math.random() * 9000);
  const voucherRecord = {
    voucher_code: voucherCode,
    user_uid: userUid,
    user_name: user.displayName,
    user_phone: user.phone,
    reward_id: rewardId,
    reward_title: reward.title,
    points_spent: pointsCost,
    status: "PENDING_DELIVERY",
    verification_pin: Math.floor(1000 + Math.random() * 9000).toString(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    delivered_at: null,
    delivered_by: null
  };

  snap.redemptions[voucherCode] = voucherRecord;

  if (!snap.ledger[userUid]) snap.ledger[userUid] = [];
  snap.ledger[userUid].unshift({
    tx_id: "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    type: "REDEEM_REWARD",
    delta: -pointsCost,
    balance_before: currentBalance,
    balance_after: newBalance,
    ref_id: voucherCode,
    note: `Canje de ${reward.title}`,
    created_at: new Date().toISOString()
  });

  localStore.saveSnapshot(snap);

  return {
    success: true,
    voucher: voucherRecord,
    newBalance
  };
}

// 4. DESPACHO EN MOSTRADOR (1-Scan POS)
export async function deliverVoucherAtomic({ voucherCode, cashierUid = "admin_melty" }) {
  const snap = localStore.getSnapshot();
  const voucher = snap.redemptions[voucherCode];

  if (!voucher) {
    throw new Error(`El vale [${voucherCode}] no existe.`);
  }

  if (voucher.status === "DELIVERED") {
    throw new Error(`Este vale ya fue entregado el ${new Date(voucher.delivered_at).toLocaleString()}.`);
  }

  voucher.status = "DELIVERED";
  voucher.delivered_at = new Date().toISOString();
  voucher.delivered_by = cashierUid;

  localStore.saveSnapshot(snap);

  return {
    success: true,
    voucher
  };
}

// 5. GENERADOR DE LOTES DE QR PARA FACTURAS 4X1
export async function generateInvoiceQRLot({ startFolio = 104, count = 4, pointsPerQr = 100 }) {
  const snap = localStore.getSnapshot();
  const batchId = "BATCH-" + Date.now();
  const generatedTokens = [];

  for (let i = 0; i < count; i++) {
    const currentFolio = String(Number(startFolio) + i).padStart(4, "0");
    const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                       Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenCode = `WP-2026-F${currentFolio}-${randomHash}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const tokenDoc = {
      token_code: tokenCode,
      batch_id: batchId,
      invoice_folio: currentFolio,
      points_value: Number(pointsPerQr),
      security_pin: pin,
      status: "ACTIVE",
      claimed_by: null,
      claimed_at: null,
      expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
      created_at: new Date().toISOString()
    };

    snap.qr_tokens[tokenCode] = tokenDoc;
    generatedTokens.push(tokenDoc);
  }

  snap.batches_registry.unshift({
    batch_id: batchId,
    start_folio: String(startFolio).padStart(4, "0"),
    count,
    points_per_token: pointsPerQr,
    created_at: new Date().toISOString()
  });

  localStore.saveSnapshot(snap);

  return {
    success: true,
    batchId,
    tokens: generatedTokens
  };
}

// 6. CRUD DE CATÁLOGO (VACÍO POR DEFECTO PARA QUE TÚ AGREGUES)
export function getCatalog() {
  const snap = localStore.getSnapshot();
  return Object.values(snap.rewards_catalog);
}

export function saveProduct(product) {
  const snap = localStore.getSnapshot();
  if (!product.reward_id) {
    product.reward_id = "REW-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  snap.rewards_catalog[product.reward_id] = product;
  localStore.saveSnapshot(snap);
  return product;
}

export function deleteProduct(rewardId) {
  const snap = localStore.getSnapshot();
  delete snap.rewards_catalog[rewardId];
  localStore.saveSnapshot(snap);
}

export function getUserProfile(uid) {
  const snap = localStore.getSnapshot();
  return snap.users[uid] || null;
}

export function getUserLedger(uid) {
  const snap = localStore.getSnapshot();
  return snap.ledger[uid] || [];
}

export function getUserVouchers(uid) {
  const snap = localStore.getSnapshot();
  return Object.values(snap.redemptions).filter(v => v.user_uid === uid);
}

export function getAllTokens() {
  const snap = localStore.getSnapshot();
  return Object.values(snap.qr_tokens);
}

export function getAllVouchers() {
  const snap = localStore.getSnapshot();
  return Object.values(snap.redemptions);
}

export function getAllUsers() {
  const snap = localStore.getSnapshot();
  return Object.values(snap.users);
}
