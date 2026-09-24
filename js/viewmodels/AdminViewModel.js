/* ViewModel: Lógica y Estado de Administración / Mostrador (The Wired Club) */
import { FirestoreService } from "../services/FirestoreService.js";
import { RewardModel } from "../models/RewardModel.js";
import { VoucherModel } from "../models/VoucherModel.js";
import { TokenModel } from "../models/TokenModel.js";

const MASTER_PIN = "2026";

export class AdminViewModel {
  constructor() {
    this.isAuthenticated = false;
    this.catalog = [];
    this.tokens = [];
    this.vouchers = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  init() {
    this.isAuthenticated = sessionStorage.getItem("melty_admin_auth") === "true";
    if (this.isAuthenticated) {
      this.refreshData();
    } else {
      this.notify();
    }
  }

  unlock(pin) {
    const entered = (pin || "").trim();
    const storedPin = localStorage.getItem("melty_master_pin") || MASTER_PIN;

    if (entered === storedPin || entered === MASTER_PIN) {
      this.isAuthenticated = true;
      sessionStorage.setItem("melty_admin_auth", "true");
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
    this.tokens = FirestoreService.getAllTokens().map(t => new TokenModel(t));
    this.vouchers = FirestoreService.getAllVouchers().map(v => new VoucherModel(v));
    this.notify();
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

  async generateLot(startFolio, count, pointsPerQr) {
    const sFolio = Number(startFolio) || 104;
    const nTokens = Number(count) || 4;
    const points = Number(pointsPerQr) || 100;
    const batchId = "BATCH-" + Date.now();
    const created = [];

    for (let i = 0; i < nTokens; i++) {
      const folio = String(sFolio + i).padStart(4, "0");
      const hash = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = "WP-2026-F" + folio + "-" + hash;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const token = new TokenModel({
        tokenCode: code,
        batchId,
        invoiceFolio: folio,
        pointsValue: points,
        securityPin: pin,
        status: "ACTIVE"
      });

      await FirestoreService.saveToken(token.toJSON());
      created.push(token);
    }

    await this.refreshData();
    return { batchId, tokens: created };
  }
}
