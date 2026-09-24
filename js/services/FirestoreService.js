/* Servicio de Persistencia y Transacciones Atómicas (Cloud Firestore + Local Mirror) */
import { db } from "../config/firebase.js";
import { INITIAL_TOKENS } from "../data/initialTokens.js";

const LOCAL_STORAGE_KEY = "wired_club_mvvm_db_v1";

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const blankDb = {
        users: {},
        rewards: {},
        vouchers: {},
        tokens: {},
        batches: [],
        ledger: {}
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(blankDb));
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
      } catch (e) {}
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }
}

const engine = new StorageEngine();

export class FirestoreService {
  // Sincronización de Catálogo desde Firestore
  static async fetchRewards() {
    if (db) {
      try {
        const snap = await db.collection("rewards_catalog").get();
        const local = engine.getSnapshot();
        snap.forEach(doc => {
          local.rewards[doc.id] = doc.data();
        });
        engine.saveSnapshot(local);
        return Object.values(local.rewards);
      } catch (e) {
        console.warn("Firestore fetchRewards fallback a local:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return Object.values(snap.rewards);
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
        await db.collection("rewards_catalog").doc(reward.id).set(reward, { merge: true });
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
        await db.collection("rewards_catalog").doc(rewardId).delete();
      } catch (e) {
        console.warn("Firestore deleteReward error:", e.message);
      }
    }
  }

  // Usuarios / Socios
  static async getUser(uid) {
    if (db) {
      try {
        const doc = await db.collection("users").doc(uid).get();
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
        const snap = await db.collection("users").get();
        const local = engine.getSnapshot();
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
    const snap = engine.getSnapshot();
    snap.users[user.uid] = user;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection("users").doc(user.uid).set(user, { merge: true });
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
        await db.collection("users").doc(uid).delete();
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
        const doc = await db.collection("qr_tokens").doc(tokenCode).get();
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
        const snap = await db.collection("qr_tokens").get();
        const local = engine.getSnapshot();
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
        await db.collection("qr_tokens").doc(token.token_code).set(token, { merge: true });
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
          const docRef = db.collection("qr_tokens").doc(tok.token_code);
          batch.set(docRef, tok, { merge: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Firestore saveTokensBatch error:", e.message);
      }
    }
    return tokens;
  }

  // Vales de Canje
  static async fetchVouchers() {
    if (db) {
      try {
        const snap = await db.collection("redemptions").get();
        const local = engine.getSnapshot();
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
        const doc = await db.collection("redemptions").doc(clean).get();
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
        await db.collection("redemptions").doc(code).set(voucher, { merge: true });
      } catch (e) {
        console.warn("Firestore saveVoucher error:", e.message);
      }
    }
    return voucher;
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
        db.collection("users").doc(userUid).collection("ledger").doc(entry.id).set(entry).catch(e => {});
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
    return Object.values(snap.vouchers).filter(v => v.user_uid === userUid);
  }

  // Purga integral de facturas/tokens de prueba y reinicio limpio
  static async purgeAllTokens() {
    const snap = engine.getSnapshot();
    const count = Object.keys(snap.tokens || {}).length;
    snap.tokens = {};
    snap.batches = [];
    engine.saveSnapshot(snap);

    if (db) {
      try {
        const tokenDocs = await db.collection("qr_tokens").get();
        if (!tokenDocs.empty) {
          const batch = db.batch();
          tokenDocs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
        const batchDocs = await db.collection("point_batches").get().catch(() => ({ empty: true }));
        if (batchDocs && !batchDocs.empty) {
          const bBatch = db.batch();
          batchDocs.forEach(doc => bBatch.delete(doc.ref));
          await bBatch.commit();
        }
      } catch (e) {
        console.warn("Firestore purgeAllTokens error:", e.message);
      }
    }
    return { success: true, count };
  }

  // Búsqueda inteligente de socio por Member Code (MC-2026-XXXX), Teléfono o UID
  static async findUserByCodeOrPhone(query) {
    if (!query) return null;
    const q = query.trim().toUpperCase();
    const cleanPhone = query.replace(/\D/g, "");

    const localUsers = this.getAllUsers();
    let found = localUsers.find(u => {
      const mCode = (u.memberCode || u.member_code || "").toUpperCase();
      const phone = (u.phone || "").replace(/\D/g, "");
      const uid = (u.uid || "").toUpperCase();
      return mCode === q || (cleanPhone && phone === cleanPhone) || uid === q;
    });

    if (found) return found;

    if (db) {
      try {
        let snap = await db.collection("users").where("member_code", "==", q).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();

        snap = await db.collection("users").where("memberCode", "==", q).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();

        if (cleanPhone) {
          snap = await db.collection("users").where("phone", "==", cleanPhone).limit(1).get();
          if (!snap.empty) return snap.docs[0].data();
        }
      } catch (e) {
        console.warn("Error buscando usuario en Firestore:", e.message);
      }
    }
    return null;
  }
}
