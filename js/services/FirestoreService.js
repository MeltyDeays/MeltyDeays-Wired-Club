/* Servicio de Persistencia y Transacciones Atómicas (Cloud Firestore + Local Mirror) */
import { db } from "../config/firebase.js";
import { getCollectionName, getStorageKey, isProduction, getEnvironmentInfo } from "../config/env.js";
import { INITIAL_TOKENS } from "../data/initialTokens.js";

const LOCAL_STORAGE_KEY = getStorageKey("wired_club_mvvm_db_v2");

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    // Purgar agresivamente cualquier residuo de versiones anteriores para que NUNCA queden datos fantasma
    try {
      const keysToPurge = [];
      const isProd = isProduction();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (isProd) {
          if (!k.startsWith("dev_") && (k.startsWith("wired_club_mvvm_db_") || k.startsWith("wired_club_catalog_")) && k !== LOCAL_STORAGE_KEY) {
            keysToPurge.push(k);
          }
        } else {
          if (k.startsWith("dev_wired_club_mvvm_db_") && k !== LOCAL_STORAGE_KEY) {
            keysToPurge.push(k);
          }
        }
      }
      keysToPurge.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.getBlank()));
    } else {
      try {
        const snap = JSON.parse(raw);
        if (!snap.tokens) snap.tokens = {};
        if (!snap.users) snap.users = {};
        if (!snap.rewards) snap.rewards = {};
        if (!snap.vouchers) snap.vouchers = {};
        if (!snap.batches) snap.batches = [];
        if (!snap.ledger) snap.ledger = {};
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snap));
      } catch (e) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.getBlank()));
      }
    }
  }

  getSnapshot() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || this.getBlank();
    } catch (e) {
      return this.getBlank();
    }
  }

  getBlank() {
    return { users: {}, rewards: {}, vouchers: {}, tokens: {}, batches: [], ledger: {} };
  }

  saveSnapshot(data) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
}

const engine = new StorageEngine();

export class FirestoreService {
  // Sincronización en tiempo real del Catálogo (Cloud Firestore)
  static subscribeRewards(callback) {
    if (!db || typeof callback !== "function") return () => {};
    try {
      return db.collection(getCollectionName("rewards_catalog")).onSnapshot(snap => {
        const local = engine.getSnapshot();
        local.rewards = {};
        if (snap && !snap.empty) {
          snap.forEach(doc => {
            local.rewards[doc.id] = doc.data();
          });
        }
        engine.saveSnapshot(local);
        callback(Object.values(local.rewards));
      }, err => {
        console.warn("Firestore subscribeRewards error:", err.message);
      });
    } catch (e) {
      console.warn("Firestore subscribeRewards exception:", e.message);
      return () => {};
    }
  }

  // Sincronización de Catálogo desde Firestore
  static async fetchRewards() {
    if (db) {
      try {
        const snap = await db.collection(getCollectionName("rewards_catalog")).get();
        const local = engine.getSnapshot();
        // Reemplazar COMPLETAMENTE el catálogo local — evita productos "fantasma"
        local.rewards = {};
        if (snap && !snap.empty) {
          snap.forEach(doc => {
            local.rewards[doc.id] = doc.data();
          });
        }
        engine.saveSnapshot(local);
        return Object.values(local.rewards);
      } catch (e) {
        console.warn("Firestore fetchRewards fallback a local:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return Object.values(snap.rewards || {});
  }

  static async getReward(rewardId) {
    if (!rewardId) return null;
    if (db) {
      try {
        const doc = await db.collection(getCollectionName("rewards_catalog")).doc(rewardId).get();
        if (doc.exists) {
          const r = doc.data();
          const snap = engine.getSnapshot();
          if (!snap.rewards) snap.rewards = {};
          snap.rewards[rewardId] = r;
          engine.saveSnapshot(snap);
          return r;
        } else {
          // Si ya no existe en Firestore, purgarlo del snapshot local
          const snap = engine.getSnapshot();
          if (snap.rewards && snap.rewards[rewardId]) {
            delete snap.rewards[rewardId];
            engine.saveSnapshot(snap);
          }
          return null;
        }
      } catch (e) {
        console.warn("Firestore getReward fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return (snap.rewards && snap.rewards[rewardId]) ? snap.rewards[rewardId] : null;
  }

  static async saveReward(reward) {
    const snap = engine.getSnapshot();
    if (!reward.id) {
      reward.id = "REW-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    reward.updated_at = new Date().toISOString();
    snap.rewards[reward.id] = reward;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("rewards_catalog")).doc(reward.id).set(reward, { merge: true });
      } catch (e) {
        console.warn("Firestore saveReward error:", e.message);
      }
    }
    return reward;
  }

  static async deleteReward(rewardId) {
    const snap = engine.getSnapshot();
    delete snap.rewards[rewardId];
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("rewards_catalog")).doc(rewardId).delete();
      } catch (e) {
        console.warn("Firestore deleteReward error:", e.message);
      }
    }
  }

  // Usuarios / Socios
  static async getUser(uid) {
    if (db) {
      try {
        const doc = await db.collection(getCollectionName("users")).doc(uid).get();
        if (doc.exists) {
          const u = doc.data();
          const snap = engine.getSnapshot();
          snap.users[uid] = u;
          engine.saveSnapshot(snap);
          return u;
        }
      } catch (e) {
        console.warn("Firestore getUser fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return snap.users[uid] || null;
  }

  static async fetchUsers() {
    if (db) {
      try {
        const snap = await db.collection(getCollectionName("users")).get();
        const local = engine.getSnapshot();
        // Overwrite completo — elimina usuarios fantasma que ya no existen en Firestore
        local.users = {};
        snap.forEach(doc => {
          local.users[doc.id] = doc.data();
        });
        engine.saveSnapshot(local);
        return Object.values(local.users);
      } catch (e) {
        console.warn("Firestore fetchUsers fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return Object.values(snap.users);
  }

  static getAllUsers() {
    const snap = engine.getSnapshot();
    return Object.values(snap.users);
  }

  static async adjustUserPoints(uid, deltaPoints, reason = "Ajuste Administrativo") {
    let user = await this.getUser(uid);
    if (!user) throw new Error("Socio no encontrado");
    const delta = Number(deltaPoints);
    if (isNaN(delta) || delta === 0) throw new Error("Indica una cantidad de puntos válida");
    
    const currentPoints = Number(user.wiredPoints !== undefined ? user.wiredPoints : (user.wired_points || 0));
    const newBalance = Math.max(0, currentPoints + delta);
    user.wiredPoints = newBalance;
    user.wired_points = newBalance;
    if (delta > 0) {
      const lifetime = Number(user.lifetimePoints !== undefined ? user.lifetimePoints : (user.lifetime_points || 0));
      user.lifetimePoints = lifetime + delta;
      user.lifetime_points = lifetime + delta;
    }
    user.updated_at = new Date().toISOString();
    await this.saveUser(user);

    const ledgerEntry = {
      id: "TX-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      type: delta > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
      amount: Math.abs(delta),
      reason,
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance
    };
    this.addLedgerEntry(uid, ledgerEntry);
    return { user, ledgerEntry };
  }

  static async saveUser(user) {
    if (user && user.phone) {
      user.phone = this.normalizePhone(user.phone) || user.phone;
    }
    const snap = engine.getSnapshot();
    snap.users[user.uid] = user;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("users")).doc(user.uid).set(user, { merge: true });
      } catch (e) {
        console.warn("Firestore saveUser error:", e.message);
      }
    }
    return user;
  }

  static async deleteUser(uid) {
    const snap = engine.getSnapshot();
    delete snap.users[uid];
    if (snap.ledger) delete snap.ledger[uid];
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("users")).doc(uid).delete();
      } catch (e) {
        console.warn("Firestore deleteUser error:", e.message);
      }
    }
    return true;
  }

  // Tokens de Factura
  static async getToken(tokenCode) {
    if (db) {
      try {
        const doc = await db.collection(getCollectionName("qr_tokens")).doc(tokenCode).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.warn("Firestore getToken fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return snap.tokens[tokenCode] || null;
  }

  static async fetchTokens() {
    if (db) {
      try {
        const snap = await db.collection(getCollectionName("qr_tokens")).get();
        const local = engine.getSnapshot();
        // Overwrite completo — elimina tokens fantasma
        local.tokens = {};
        snap.forEach(doc => {
          local.tokens[doc.id] = doc.data();
        });
        engine.saveSnapshot(local);
        return Object.values(local.tokens);
      } catch (e) {
        console.warn("Firestore fetchTokens fallback a local:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return Object.values(snap.tokens);
  }

  static async saveToken(token) {
    const snap = engine.getSnapshot();
    snap.tokens[token.token_code] = token;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("qr_tokens")).doc(token.token_code).set(token, { merge: true });
      } catch (e) {
        console.warn("Firestore saveToken error:", e.message);
      }
    }
    return token;
  }

  static async saveTokensBatch(tokens) {
    if (!tokens || tokens.length === 0) return [];
    const snap = engine.getSnapshot();
    tokens.forEach(tok => {
      snap.tokens[tok.token_code] = tok;
    });
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const batch = db.batch();
        tokens.forEach(tok => {
          const docRef = db.collection(getCollectionName("qr_tokens")).doc(tok.token_code);
          batch.set(docRef, tok, { merge: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Firestore saveTokensBatch error:", e.message);
      }
    }
    return tokens;
  }

  static async deleteToken(tokenCode) {
    const isProd = isProduction();
    const colName = getCollectionName("qr_tokens");
    if (!isProd && !colName.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en pruebas.");
    }
    const snap = engine.getSnapshot();
    if (snap.tokens && snap.tokens[tokenCode]) {
      delete snap.tokens[tokenCode];
      engine.saveSnapshot(snap);
    }
    if (db) {
      try {
        await db.collection(colName).doc(tokenCode).delete();
      } catch (e) {
        console.warn("Firestore deleteToken error:", e.message);
      }
    }
    return true;
  }

  // Vales de Canje
  static async fetchVouchers() {
    if (db) {
      try {
        const snap = await db.collection(getCollectionName("redemptions")).get();
        const local = engine.getSnapshot();
        // Overwrite completo — elimina vales fantasma
        local.vouchers = {};
        snap.forEach(doc => {
          local.vouchers[doc.id] = doc.data();
        });
        engine.saveSnapshot(local);
        return Object.values(local.vouchers);
      } catch (e) {
        console.warn("Firestore fetchVouchers fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return Object.values(snap.vouchers);
  }

  static async getVoucher(voucherCode) {
    const clean = (voucherCode || "").trim().toUpperCase();
    if (!clean) return null;
    if (db) {
      try {
        const doc = await db.collection(getCollectionName("redemptions")).doc(clean).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.warn("Firestore getVoucher fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    if (snap.vouchers && snap.vouchers[clean]) return snap.vouchers[clean];
    const found = Object.values(snap.vouchers || {}).find(v => {
      const c = (v.voucher_code || v.voucherCode || "").trim().toUpperCase();
      return c === clean;
    });
    return found || null;
  }

  static async saveVoucher(voucher) {
    const code = (voucher.voucher_code || voucher.voucherCode || "").trim().toUpperCase();
    if (!code) {
      console.error("Firestore saveVoucher: código ausente", voucher);
      return voucher;
    }
    const snap = engine.getSnapshot();
    if (!snap.vouchers) snap.vouchers = {};
    snap.vouchers[code] = voucher;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection(getCollectionName("redemptions")).doc(code).set(voucher, { merge: true });
      } catch (e) {
        console.warn("Firestore saveVoucher error:", e.message);
      }
    }
    return voucher;
  }

  static async deleteVoucher(voucherCode) {
    const isProd = isProduction();
    const colName = getCollectionName("redemptions");
    if (!isProd && !colName.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en pruebas.");
    }
    const clean = (voucherCode || "").trim().toUpperCase();
    const snap = engine.getSnapshot();
    if (snap.vouchers) {
      delete snap.vouchers[clean];
      for (const [k, v] of Object.entries(snap.vouchers)) {
        if ((v.voucher_code || v.voucherCode || "").trim().toUpperCase() === clean) {
          delete snap.vouchers[k];
        }
      }
      engine.saveSnapshot(snap);
    }
    if (db) {
      try {
        await db.collection(colName).doc(clean).delete();
      } catch (e) {
        console.warn("Firestore deleteVoucher error:", e.message);
      }
    }
    return true;
  }

  // Ledger / Historial de transacciones
  static getLedger(userUid) {
    const snap = engine.getSnapshot();
    return snap.ledger[userUid] || [];
  }

  static addLedgerEntry(userUid, entry) {
    const snap = engine.getSnapshot();
    if (!snap.ledger[userUid]) snap.ledger[userUid] = [];
    snap.ledger[userUid].unshift(entry);
    engine.saveSnapshot(snap);

    if (db) {
      try {
        db.collection(getCollectionName("users")).doc(userUid).collection("ledger").doc(entry.id).set(entry).catch(e => {});
      } catch (e) {}
    }
  }

  static getAllTokens() {
    const snap = engine.getSnapshot();
    return Object.values(snap.tokens);
  }

  static getAllVouchers() {
    const snap = engine.getSnapshot();
    return Object.values(snap.vouchers);
  }

  static getUserVouchers(userUid) {
    const snap = engine.getSnapshot();
    return Object.values(snap.vouchers).filter(v => (
      v.user_uid === userUid ||
      v.userUid === userUid ||
      v.userId === userUid ||
      v.user_id === userUid
    ));
  }

  // Purga integral de facturas/tokens de prueba y reinicio limpio
  static async purgeAllTokens() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const tokensCol = getCollectionName("qr_tokens");
    const batchesCol = getCollectionName("point_batches");

    // Blindaje de seguridad: si estamos en entorno de pruebas, exigir prefijo dev_
    if (!isProd) {
      if (!tokensCol.startsWith("dev_") || !batchesCol.startsWith("dev_")) {
        throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Se intentó purgar una colección no aislada en entorno de pruebas.");
      }
    }

    const snap = engine.getSnapshot();
    const count = Object.keys(snap.tokens || {}).length;
    snap.tokens = {};
    snap.batches = [];
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const tokenDocs = await db.collection(tokensCol).get();
        if (!tokenDocs.empty) {
          const batch = db.batch();
          tokenDocs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
        const batchDocs = await db.collection(batchesCol).get().catch(() => ({ empty: true }));
        if (batchDocs && !batchDocs.empty) {
          const bBatch = db.batch();
          batchDocs.forEach(doc => bBatch.delete(doc.ref));
          await bBatch.commit();
        }
      } catch (e) {
        console.warn("Firestore purgeAllTokens error:", e.message);
      }
    }
    return { success: true, count, environment: envInfo.name, collections: [tokensCol, batchesCol] };
  }

  // Purga integral de toda la base de datos (Socios, Vales, Facturas, Ledger, Catálogo)
  static async purgeEntireDatabase() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const collections = ["redemptions", "vouchers", "rewards_catalog", "qr_tokens", "point_batches", "point_ledger"].map(getCollectionName);
    const usersCol = getCollectionName("users");

    // Blindaje de seguridad estricto en pruebas: exigir prefijo dev_ en cada colección
    if (!isProd) {
      for (const col of collections) {
        if (!col.startsWith("dev_")) {
          throw new Error(`ALERTA DE SEGURIDAD: Colección ${col} no lleva prefijo dev_ en entorno de pruebas.`);
        }
      }
      if (!usersCol.startsWith("dev_")) {
        throw new Error(`ALERTA DE SEGURIDAD: Colección ${usersCol} no lleva prefijo dev_ en entorno de pruebas.`);
      }
    }

    const adminUser = {
      uid: "CLIENT-58438412",
      memberCode: "MC-2026-ADMIN",
      name: "Evertz Lopez (Admin)",
      phone: "58438412",
      pin: "110805",
      tier: "DEUS",
      pointsBalance: 0,
      lifetimePoints: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    };

    const blankDb = {
      users: { "CLIENT-58438412": adminUser },
      rewards: {},
      vouchers: {},
      tokens: {},
      batches: [],
      ledger: {}
    };
    engine.saveSnapshot(blankDb);

    if (db) {
      try {
        for (const col of collections) {
          const snap = await db.collection(col).get().catch(() => ({ empty: true }));
          if (snap && !snap.empty) {
            const docs = snap.docs || [];
            for (let i = 0; i < docs.length; i += 400) {
              const batch = db.batch();
              docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        }

        // Purgar socios dejando únicamente el perfil del administrador (PIN 110805)
        const userSnap = await db.collection(usersCol).get().catch(() => ({ empty: true }));
        if (userSnap && !userSnap.empty) {
          const uDocs = userSnap.docs || [];
          for (let i = 0; i < uDocs.length; i += 400) {
            const batch = db.batch();
            uDocs.slice(i, i + 400).forEach(d => {
              if (d.id !== adminUser.uid && d.data()?.phone !== "58438412") {
                batch.delete(d.ref);
              }
            });
            await batch.commit();
          }
        }
        await db.collection(usersCol).doc(adminUser.uid).set(adminUser);
      } catch (e) {
        console.warn("Firestore purgeEntireDatabase error:", e.message);
      }
    }
    return { success: true, environment: envInfo.name, collections: [...collections, usersCol] };
  }

  // Purga granular de socios de prueba (preservando perfil de administrador)
  static async purgeUsers() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const usersCol = getCollectionName("users");

    if (!isProd && !usersCol.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en entorno de pruebas.");
    }

    const adminUser = {
      uid: "CLIENT-58438412",
      memberCode: "MC-2026-ADMIN",
      name: "Evertz Lopez (Admin)",
      phone: "58438412",
      pin: "110805",
      tier: "DEUS",
      pointsBalance: 0,
      lifetimePoints: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    };

    const snap = engine.getSnapshot();
    const count = Math.max(0, Object.keys(snap.users || {}).length - 1);
    snap.users = { "CLIENT-58438412": adminUser };
    const adminLedger = (snap.ledger && snap.ledger["CLIENT-58438412"]) || [];
    snap.ledger = { "CLIENT-58438412": adminLedger };
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const userSnap = await db.collection(usersCol).get().catch(() => ({ empty: true }));
        if (userSnap && !userSnap.empty) {
          const uDocs = userSnap.docs || [];
          for (let i = 0; i < uDocs.length; i += 400) {
            const batch = db.batch();
            uDocs.slice(i, i + 400).forEach(d => {
              if (d.id !== adminUser.uid && d.data()?.phone !== "58438412") {
                batch.delete(d.ref);
              }
            });
            await batch.commit();
          }
        }
        await db.collection(usersCol).doc(adminUser.uid).set(adminUser, { merge: true });
      } catch (e) {
        console.warn("Firestore purgeUsers error:", e.message);
      }
    }
    return { success: true, count, environment: envInfo.name, collection: usersCol };
  }

  // Purga granular de puntos en circulación (resetea balance de todos los usuarios a 0 y vacía ledger)
  static async purgeCirculatingPoints() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const usersCol = getCollectionName("users");
    const ledgerCol = getCollectionName("point_ledger");

    if (!isProd) {
      if (!usersCol.startsWith("dev_") || !ledgerCol.startsWith("dev_")) {
        throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en entorno de pruebas.");
      }
    }

    const snap = engine.getSnapshot();
    let totalReset = 0;
    if (snap.users) {
      Object.values(snap.users).forEach(u => {
        totalReset += (u.pointsBalance || u.wiredPoints || 0);
        u.pointsBalance = 0;
        u.wiredPoints = 0;
        u.lifetimePoints = 0;
      });
    }
    snap.ledger = {};
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const userSnap = await db.collection(usersCol).get().catch(() => ({ empty: true }));
        if (userSnap && !userSnap.empty) {
          const uDocs = userSnap.docs || [];
          for (let i = 0; i < uDocs.length; i += 400) {
            const batch = db.batch();
            uDocs.slice(i, i + 400).forEach(d => {
              batch.set(d.ref, { pointsBalance: 0, wiredPoints: 0, lifetimePoints: 0 }, { merge: true });
            });
            await batch.commit();
          }
        }
        const ledgerSnap = await db.collection(ledgerCol).get().catch(() => ({ empty: true }));
        if (ledgerSnap && !ledgerSnap.empty) {
          const lDocs = ledgerSnap.docs || [];
          for (let i = 0; i < lDocs.length; i += 400) {
            const batch = db.batch();
            lDocs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn("Firestore purgeCirculatingPoints error:", e.message);
      }
    }
    return { success: true, totalReset, environment: envInfo.name };
  }

  // Purga granular de vales (filtrado por ALL, PENDING o DELIVERED)
  static async purgeVouchers(filter = "ALL") {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const colName = getCollectionName("redemptions");

    if (!isProd && !colName.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en entorno de pruebas.");
    }

    const isPending = (v) => {
      const s = (v.status || "").toUpperCase();
      return s === "PENDING" || s === "ISSUED" || (!v.redeemed && s !== "DELIVERED" && s !== "REDEEMED");
    };
    const isDelivered = (v) => {
      const s = (v.status || "").toUpperCase();
      return s === "DELIVERED" || s === "REDEEMED" || v.redeemed === true;
    };

    const snap = engine.getSnapshot();
    let count = 0;
    const remaining = {};
    const toDeleteIds = [];

    Object.entries(snap.vouchers || {}).forEach(([code, v]) => {
      let matches = false;
      if (filter === "ALL") matches = true;
      else if (filter === "PENDING") matches = isPending(v);
      else if (filter === "DELIVERED") matches = isDelivered(v);

      if (matches) {
        count++;
        toDeleteIds.push(code);
      } else {
        remaining[code] = v;
      }
    });

    snap.vouchers = remaining;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        if (filter === "ALL") {
          const rSnap = await db.collection(colName).get().catch(() => ({ empty: true }));
          if (rSnap && !rSnap.empty) {
            const docs = rSnap.docs || [];
            for (let i = 0; i < docs.length; i += 400) {
              const batch = db.batch();
              docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        } else {
          for (let i = 0; i < toDeleteIds.length; i += 400) {
            const batch = db.batch();
            toDeleteIds.slice(i, i + 400).forEach(id => {
              batch.delete(db.collection(colName).doc(id));
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn("Firestore purgeVouchers error:", e.message);
      }
    }
    return { success: true, count, filter, environment: envInfo.name };
  }

  // Purga granular de productos del catálogo de premios
  static async purgeRewards() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const colName = getCollectionName("rewards_catalog");

    if (!isProd && !colName.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en entorno de pruebas.");
    }

    const snap = engine.getSnapshot();
    const count = Object.keys(snap.rewards || {}).length;
    snap.rewards = {};
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const rSnap = await db.collection(colName).get().catch(() => ({ empty: true }));
        if (rSnap && !rSnap.empty) {
          const docs = rSnap.docs || [];
          for (let i = 0; i < docs.length; i += 400) {
            const batch = db.batch();
            docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn("Firestore purgeRewards error:", e.message);
      }
    }
    return { success: true, count, environment: envInfo.name, collection: colName };
  }

  // Purga granular de ledger contable
  static async purgeLedger() {
    const isProd = isProduction();
    const envInfo = getEnvironmentInfo();
    const ledgerCol = getCollectionName("point_ledger");

    if (!isProd && !ledgerCol.startsWith("dev_")) {
      throw new Error("ALERTA DE SEGURIDAD: Operación cancelada. Colección no aislada en entorno de pruebas.");
    }

    const snap = engine.getSnapshot();
    snap.ledger = {};
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const lSnap = await db.collection(ledgerCol).get().catch(() => ({ empty: true }));
        if (lSnap && !lSnap.empty) {
          const docs = lSnap.docs || [];
          for (let i = 0; i < docs.length; i += 400) {
            const batch = db.batch();
            docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn("Firestore purgeLedger error:", e.message);
      }
    }
    return { success: true, environment: envInfo.name };
  }

  // Normalización canónica anti-burlas para números de Nicaragua:
  // Remueve +505, 505, 00505, espacios, guiones, símbolos.
  // Siempre devuelve estrictamente los 8 dígitos locales (ej: "58438412")
  static normalizePhone(raw) {
    if (!raw) return "";
    let digits = String(raw).replace(/\D/g, "");
    if (digits.startsWith("00505") && digits.length >= 13) {
      digits = digits.slice(5);
    } else if (digits.startsWith("505") && digits.length >= 11) {
      digits = digits.slice(3);
    } else if (digits.length > 8 && digits.startsWith("505")) {
      digits = digits.slice(3);
    }
    if (digits.length > 8) {
      digits = digits.slice(-8);
    }
    return digits;
  }

  // Formato visual estandarizado: 5843-8412
  static formatPhoneDisplay(raw) {
    const norm = this.normalizePhone(raw);
    if (!norm) return "";
    if (norm.length <= 4) return norm;
    return norm.slice(0, 4) + "-" + norm.slice(4);
  }

  // Búsqueda inteligente y exhaustiva de socio por Member Code, Teléfono o UID (con protección anti-burlas +505)
  static async findUserByCodeOrPhone(query) {
    if (!query) return null;
    const q = String(query).trim().toUpperCase();
    const normPhone = this.normalizePhone(query);
    const cleanDigits = String(query).replace(/\D/g, "");

    const localUsers = this.getAllUsers();
    let found = localUsers.find(u => {
      const mCode = (u.memberCode || u.member_code || "").toUpperCase();
      const uid = (u.uid || "").toUpperCase();
      const uPhoneNorm = this.normalizePhone(u.phone);
      const uPhoneClean = (u.phone || "").replace(/\D/g, "");
      
      if (mCode === q || uid === q) return true;
      if (normPhone && normPhone.length === 8 && uPhoneNorm === normPhone) return true;
      if (normPhone && (uid === "CLIENT-" + normPhone || uid === "CLIENT-505" + normPhone)) return true;
      if (cleanDigits && (uPhoneClean === cleanDigits || uid === "CLIENT-" + cleanDigits)) return true;
      return false;
    });

    if (found) return found;

    if (db) {
      try {
        // 1. Búsqueda por Member Code
        let snap = await db.collection(getCollectionName("users")).where("member_code", "==", q).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();

        snap = await db.collection(getCollectionName("users")).where("memberCode", "==", q).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();

        // 2. Búsqueda directa por Doc ID (UID Canónico y Legacy)
        if (normPhone && normPhone.length === 8) {
          const docRef1 = await db.collection(getCollectionName("users")).doc("CLIENT-" + normPhone).get();
          if (docRef1.exists) return docRef1.data();

          const docRef2 = await db.collection(getCollectionName("users")).doc("CLIENT-505" + normPhone).get();
          if (docRef2.exists) return docRef2.data();
        }

        // 3. Búsqueda multi-variante por campo 'phone'
        const phoneVariants = new Set();
        if (normPhone) {
          phoneVariants.add(normPhone);
          phoneVariants.add("505" + normPhone);
          phoneVariants.add("+505" + normPhone);
          phoneVariants.add("+505 " + normPhone);
          phoneVariants.add(this.formatPhoneDisplay(normPhone));
          phoneVariants.add("+505 " + this.formatPhoneDisplay(normPhone));
        }
        if (cleanDigits) {
          phoneVariants.add(cleanDigits);
        }

        for (const variant of phoneVariants) {
          snap = await db.collection(getCollectionName("users")).where("phone", "==", variant).limit(1).get();
          if (!snap.empty) return snap.docs[0].data();
        }
      } catch (e) {
        console.warn("Error buscando usuario en Firestore:", e.message);
      }
    }
    return null;
  }

  // Sembrador seguro de datos ficticios para pruebas (bloqueado en Producción)
  static async seedDevData() {
    if (isProduction()) {
      throw new Error("Acción bloqueada: No se permite sembrar datos ficticios en el entorno de Producción.");
    }

    const demoUsers = [
      {
        uid: "CLIENT-88881111",
        memberCode: "MC-DEMO-01",
        displayName: "Carlos Mendoza (Demo)",
        phone: "88881111",
        pin: "1234",
        tier: "NAVI_PRO",
        wiredPoints: 450,
        lifetimePoints: 600,
        currency: "USD",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      },
      {
        uid: "CLIENT-88882222",
        memberCode: "MC-DEMO-02",
        displayName: "Valeria Ríos (Demo)",
        phone: "88882222",
        pin: "4321",
        tier: "ELITE",
        wiredPoints: 1200,
        lifetimePoints: 1500,
        currency: "NIO",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      },
      {
        uid: "CLIENT-88883333",
        memberCode: "MC-DEMO-03",
        displayName: "Mateo Silva (Demo)",
        phone: "88883333",
        pin: "1111",
        tier: "NAVI_USER",
        wiredPoints: 80,
        lifetimePoints: 100,
        currency: "USD",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      }
    ];

    const demoRewards = [
      {
        id: "REW-DEMO-01",
        title: "Mouse Pad Melty Cyberpunk XL",
        description: "Superficie de microfibra de alta precisión con costuras reforzadas y base de goma antideslizante (Demo).",
        pointsCost: 150,
        stock: 5,
        rewardType: "FREE_REWARD",
        status: "ACTIVE"
      },
      {
        id: "REW-DEMO-02",
        title: "Keycaps Artesanales Serial Experiments Lain",
        description: "Set de 4 teclas artesanales PBT sublimadas con estética retro tech (Demo).",
        pointsCost: 300,
        stock: 3,
        rewardType: "FREE_REWARD",
        status: "ACTIVE"
      },
      {
        id: "REW-DEMO-03",
        title: "Mouse Gamer Óptico RGB 12000 DPI",
        description: "Sensor óptico de alta precisión, switches mecánicos Omron y cable paracord ultraligero (Demo).",
        pointsCost: 200,
        priceUsd: 35.0,
        cashToPayUsd: 15.0,
        maxDiscountUsd: 20.0,
        maxDiscountPct: 57,
        stock: 2,
        rewardType: "PARTIAL_DISCOUNT",
        status: "ACTIVE"
      }
    ];

    for (const u of demoUsers) {
      await this.saveUser(u);
    }
    for (const r of demoRewards) {
      await this.saveReward(r);
    }

    return {
      usersSeeded: demoUsers.length,
      rewardsSeeded: demoRewards.length
    };
  }
}

