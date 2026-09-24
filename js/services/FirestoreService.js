/* Servicio de Persistencia y Transacciones Atómicas (Cloud Firestore + Local Mirror) */
import { db } from "../config/firebase.js";

const LOCAL_STORAGE_KEY = "wired_club_mvvm_db_v1";

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
      const blankDb = {
        users: {},
        rewards: {},
        vouchers: {},
        tokens: {},
        batches: [],
        ledger: {}
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(blankDb));
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

  // Vales de Canje
  static async getVoucher(voucherCode) {
    if (db) {
      try {
        const doc = await db.collection("redemptions").doc(voucherCode).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.warn("Firestore getVoucher fallback:", e.message);
      }
    }
    const snap = engine.getSnapshot();
    return snap.vouchers[voucherCode] || null;
  }

  static async saveVoucher(voucher) {
    const snap = engine.getSnapshot();
    snap.vouchers[voucher.voucher_code] = voucher;
    engine.saveSnapshot(snap);

    if (db) {
      try {
        await db.collection("redemptions").doc(voucher.voucher_code).set(voucher, { merge: true });
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
}
