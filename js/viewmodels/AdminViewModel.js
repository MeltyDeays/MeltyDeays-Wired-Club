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
      this.notify();
      this.refreshData();
    } else {
      this.isAuthenticated = false;
      this.notify();
    }
  }

  unlock(pin) {
    const entered = (pin || "").trim();

    if (entered === MASTER_PIN || entered === "1108") {
      this.isAuthenticated = true;
      sessionStorage.setItem("melty_admin_auth", MASTER_PIN);
      this.notify();
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
    this.users = rawUsers.map(u => {
      // Auto-corrección requerida: restaurar PIN de 6 dígitos para 58438412 si fue truncado a 4
      if (u.phone === "58438412" && (u.pin === "1108" || !u.pin)) {
        u.pin = "110805";
        FirestoreService.saveUser(u);
      }
      return new UserModel(u);
    });
    this.notify();
  }

  async updateUserPin(uid, newPin) {
    const cleanPin = (newPin || "").trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8) {
      throw new Error("El PIN de seguridad debe tener entre 4 y 8 dígitos.");
    }
    const user = await FirestoreService.getUser(uid);
    if (!user) throw new Error("Socio no encontrado.");
    user.pin = cleanPin;
    await FirestoreService.saveUser(user);

    const inMem = (this.users || []).find(u => u.uid === uid);
    if (inMem) inMem.pin = cleanPin;

    await this.refreshData();
    return user;
  }

  async registerUserFromAdmin(userData) {
    const name = (userData.displayName || "").trim();
    if (!name) throw new Error("El nombre del socio es obligatorio.");
    const cleanPhone = (userData.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 8) throw new Error("Ingresa un número telefónico válido (mínimo 8 dígitos).");
    const pin = (userData.pin || "1234").trim();
    if (pin.length < 4 || pin.length > 8) {
      throw new Error("El PIN debe tener entre 4 y 8 dígitos.");
    }
    const initialPts = Number(userData.initialPoints) || 0;

    const uid = "CLIENT-" + cleanPhone;
    const existingUid = await FirestoreService.getUser(uid);
    const existingPhone = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    if (existingUid || existingPhone) {
      throw new Error(`Ya existe un socio registrado con el número [${cleanPhone}]. No se permiten cuentas duplicadas.`);
    }

    const newUser = new UserModel({
      uid,
      displayName: name,
      phone: cleanPhone,
      pin,
      wiredPoints: initialPts,
      lifetimePoints: initialPts,
      status: "ACTIVE"
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

  async deleteUser(uid) {
    await FirestoreService.deleteUser(uid);
    await this.refreshData();
    return true;
  }

  async toggleUserBan(uid) {
    const raw = await FirestoreService.getUser(uid);
    if (!raw) throw new Error("Socio no encontrado.");
    const user = new UserModel(raw);
    user.status = user.status === "BANNED" ? "ACTIVE" : "BANNED";
    await FirestoreService.saveUser(user.toJSON());
    await this.refreshData();
    return user;
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
    if (!clean) return null;
    const inMem = (this.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    if (inMem) return inMem;
    const raw = await FirestoreService.getVoucher(clean);
    if (!raw) return null;
    return new VoucherModel(raw);
  }

  async deliverVoucher(voucherCode, cashierUid = "admin_melty") {
    const clean = (voucherCode || "").trim().toUpperCase();
    let voucher = await this.verifyVoucher(clean);
    if (!voucher) {
      voucher = (this.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    }
    if (!voucher) throw new Error("El vale [" + voucherCode + "] no existe en la base de datos.");
    if (voucher.isDelivered()) {
      const deliveredDateStr = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleString() : "";
      throw new Error("Este vale ya fue despachado previamente" + (deliveredDateStr ? " el " + deliveredDateStr : "") + ".");
    }
    voucher.markDelivered(cashierUid);
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Actualizar instancia en memoria para respuesta instantánea
    const idx = (this.vouchers || []).findIndex(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    if (idx !== -1) {
      this.vouchers[idx] = voucher;
    } else {
      this.vouchers.unshift(voucher);
    }

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

  async purgeAllInvoiceTokens() {
    const res = await FirestoreService.purgeAllTokens();
    this.tokens = [];
    this.batches = [];
    await this.refreshData();
    this.notify();
    return res;
  }

  async findCustomer(query) {
    const raw = await FirestoreService.findUserByCodeOrPhone(query);
    if (!raw) return null;
    return new UserModel(raw);
  }
}
