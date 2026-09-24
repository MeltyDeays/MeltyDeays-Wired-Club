/* ViewModel: Lógica y Estado de Administración / Mostrador (The Wired Club) */
import { FirestoreService } from "../services/FirestoreService.js";
import { RewardModel } from "../models/RewardModel.js";
import { VoucherModel } from "../models/VoucherModel.js";
import { TokenModel } from "../models/TokenModel.js";
import { UserModel } from "../models/UserModel.js";

const MASTER_PIN = "110805";

export class AdminViewModel {
  constructor() {
    this.isAuthenticated = false;
    this.catalog = [];
    this.tokens = [];
    this.vouchers = [];
    this.users = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  init() {
    // Verificación estricta del PIN configurado
    const savedToken = sessionStorage.getItem("melty_admin_auth");
    if (savedToken === MASTER_PIN) {
      this.isAuthenticated = true;
      this.refreshData();
    } else {
      this.isAuthenticated = false;
      this.notify();
    }
  }

  unlock(pin) {
    const entered = (pin || "").trim();

    if (entered === MASTER_PIN) {
      this.isAuthenticated = true;
      sessionStorage.setItem("melty_admin_auth", MASTER_PIN);
      this.refreshData();
      return true;
    }
    return false;
  }

  lock() {
    this.isAuthenticated = false;
    sessionStorage.removeItem("melty_admin_auth");
    this.notify();
  }

  async refreshData() {
    const rawRewards = await FirestoreService.fetchRewards();
    this.catalog = rawRewards.map(r => new RewardModel(r));
    const rawTokens = await FirestoreService.fetchTokens();
    this.tokens = rawTokens.map(t => new TokenModel(t));
    const rawVouchers = await FirestoreService.fetchVouchers();
    this.vouchers = rawVouchers.map(v => new VoucherModel(v));
    const rawUsers = await FirestoreService.fetchUsers();
    this.users = rawUsers.map(u => new UserModel(u));
    this.notify();
  }

  async registerUserFromAdmin(userData) {
    const name = (userData.displayName || "").trim();
    if (!name) throw new Error("El nombre del socio es obligatorio.");
    const cleanPhone = (userData.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 8) throw new Error("Ingresa un número telefónico válido (mínimo 8 dígitos).");
    const pin = (userData.pin || "1234").trim();
    const initialPts = Number(userData.initialPoints) || 0;

    const uid = "USR-" + cleanPhone;
    const existing = await FirestoreService.getUser(uid);
    if (existing) throw new Error("Ya existe un socio registrado con este número telefónico.");

    const newUser = new UserModel({
      uid,
      displayName: name,
      phone: cleanPhone,
      pin,
      wiredPoints: initialPts,
      lifetimePoints: initialPts
    });

    await FirestoreService.saveUser(newUser.toJSON());
    if (initialPts > 0) {
      FirestoreService.addLedgerEntry(uid, {
        id: "TX-INIT-" + Date.now(),
        type: "ADMIN_CREDIT",
        amount: initialPts,
        reason: "Bono Inicial / Acreditación en Mostrador",
        timestamp: new Date().toISOString(),
        balanceAfter: initialPts
      });
    }

    await this.refreshData();
    return newUser;
  }

  async adjustUserPoints(uid, deltaPoints, reason = "Ajuste Administrativo") {
    const res = await FirestoreService.adjustUserPoints(uid, deltaPoints, reason);
    await this.refreshData();
    return res;
  }

  getUserLedger(uid) {
    return FirestoreService.getLedger(uid);
  }

  async addReward(productData) {
    const title = (productData.title || "").trim();
    if (!title) throw new Error("El título del producto es obligatorio.");
    const cost = Number(productData.pointsCost);
    if (isNaN(cost) || cost <= 0) throw new Error("El costo en puntos debe ser mayor a 0.");
    const stock = Number(productData.stock);
    if (isNaN(stock) || stock < 0) throw new Error("El stock no puede ser negativo.");

    const reward = new RewardModel({
      id: productData.id || ("REW-" + Math.random().toString(36).substring(2, 8).toUpperCase()),
      title,
      pointsCost: cost,
      stock,
      imageUrl: (productData.imageUrl || "").trim(),
      description: (productData.description || "").trim()
    });

    await FirestoreService.saveReward(reward.toJSON());
    await this.refreshData();
    return reward;
  }

  async deleteReward(rewardId) {
    await FirestoreService.deleteReward(rewardId);
    await this.refreshData();
  }

  async verifyVoucher(voucherCode) {
    const clean = (voucherCode || "").trim().toUpperCase();
    const raw = await FirestoreService.getVoucher(clean);
    if (!raw) return null;
    return new VoucherModel(raw);
  }

  async deliverVoucher(voucherCode, cashierUid = "admin_melty") {
    const voucher = await this.verifyVoucher(voucherCode);
    if (!voucher) throw new Error("El vale [" + voucherCode + "] no existe.");
    if (voucher.isDelivered()) {
      throw new Error("Este vale ya fue despachado previamente.");
    }
    voucher.markDelivered(cashierUid);
    await FirestoreService.saveVoucher(voucher.toJSON());
    await this.refreshData();
    return voucher;
  }

  async verifyToken(tokenCode) {
    let clean = (tokenCode || "").trim().toUpperCase();
    if (clean.includes("CLAIM=")) {
      clean = clean.split("CLAIM=")[1].split("&")[0].trim().toUpperCase();
    }
    const raw = await FirestoreService.getToken(clean);
    if (!raw) return null;
    return new TokenModel(raw);
  }

  async assignTokenPoints(tokenCode, points, cashierUid = "admin_melty") {
    const token = await this.verifyToken(tokenCode);
    if (!token) throw new Error("El código de factura [" + tokenCode + "] no existe.");
    if (token.isClaimed()) {
      throw new Error("Esta factura ya fue reclamada el " + new Date(token.claimedAt).toLocaleString());
    }
    token.assignPoints(points, cashierUid);
    await FirestoreService.saveToken(token.toJSON());
    await this.refreshData();
    return token;
  }

  getNextAvailableFolio() {
    if (!this.tokens || this.tokens.length === 0) return 1;
    let maxFolio = 0;
    for (const t of this.tokens) {
      const num = parseInt(t.invoiceFolio, 10);
      if (!isNaN(num) && num > maxFolio) {
        maxFolio = num;
      }
    }
    return maxFolio + 1;
  }

  async generateLot(startFolio, count, pointsPerQr = 0) {
    let sFolio = Number(startFolio);
    if (!sFolio || isNaN(sFolio) || sFolio <= 0) {
      sFolio = this.getNextAvailableFolio();
    }
    let nTokens = Number(count) || 4;
    if (nTokens < 4) nTokens = 4;
    if (nTokens % 4 !== 0) nTokens = Math.ceil(nTokens / 4) * 4;
    const points = Number(pointsPerQr) || 0;

    // Prevención de duplicados: si el rango solicitado se solapa con folios existentes, avanzar automáticamente
    const existingFolios = new Set(this.tokens.map(t => parseInt(t.invoiceFolio, 10)).filter(n => !isNaN(n)));
    let hasOverlap = false;
    for (let i = 0; i < nTokens; i++) {
      if (existingFolios.has(sFolio + i)) {
        hasOverlap = true;
        break;
      }
    }
    if (hasOverlap) {
      sFolio = this.getNextAvailableFolio();
    }

    const batchId = "BATCH-" + Date.now();
    const created = [];

    for (let i = 0; i < nTokens; i++) {
      const folio = String(sFolio + i).padStart(4, "0");
      const hash = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase() +
                   Date.now().toString(36).substring(4, 7).toUpperCase();
      const code = "WP-2026-F" + folio + "-" + hash;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const token = new TokenModel({
        tokenCode: code,
        batchId,
        invoiceFolio: folio,
        pointsValue: points,
        securityPin: pin,
        status: points > 0 ? "ACTIVE" : "PENDING_ASSIGNMENT"
      });

      created.push(token);
    }

    await FirestoreService.saveTokensBatch(created.map(t => t.toJSON()));
    await this.refreshData();
    return { batchId, tokens: created, startFolio: sFolio };
  }
}
