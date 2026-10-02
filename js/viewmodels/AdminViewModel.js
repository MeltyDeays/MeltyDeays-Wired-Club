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
    // Deduplicación inteligente por invoiceFolio: conservar el token con invoiceData o activo/reclamado
    const tokenMap = new Map();
    for (const raw of rawTokens) {
      const t = new TokenModel(raw);
      const fol = t.invoiceFolio ? String(t.invoiceFolio).padStart(4, "0") : null;
      if (!fol) {
        tokenMap.set(t.tokenCode, t);
        continue;
      }
      if (!tokenMap.has(fol)) {
        tokenMap.set(fol, t);
      } else {
        const prev = tokenMap.get(fol);
        const prevHasInv = !!(prev.invoiceData && prev.invoiceData.items && prev.invoiceData.items.length > 0);
        const currHasInv = !!(t.invoiceData && t.invoiceData.items && t.invoiceData.items.length > 0);
        if (!prevHasInv && currHasInv) {
          tokenMap.set(fol, t);
        } else if (prev.isPendingAssignment() && !t.isPendingAssignment()) {
          tokenMap.set(fol, t);
        } else if (t.isClaimed() && !prev.isClaimed()) {
          tokenMap.set(fol, t);
        }
      }
    }
    this.tokens = Array.from(tokenMap.values());
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
    
    // Normalización canónica anti-burlas: elimina prefijos (+505, 505, 00505)
    const cleanPhone = FirestoreService.normalizePhone(userData.phone || "");
    if (!cleanPhone || cleanPhone.length !== 8) {
      throw new Error("Ingresa un número telefónico de 8 dígitos (ej: 5843-8412). El prefijo +505 es automático.");
    }
    const pin = (userData.pin || "1234").trim();
    if (pin.length < 4 || pin.length > 8) {
      throw new Error("El PIN debe tener entre 4 y 8 dígitos.");
    }
    const initialPts = Number(userData.initialPoints) || 0;

    const uid = "CLIENT-" + cleanPhone;
    const existingUid = await FirestoreService.getUser(uid);
    const existingLegacy = await FirestoreService.getUser("CLIENT-505" + cleanPhone);
    const existingPhone = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    
    if (existingUid || existingLegacy || existingPhone) {
      const fmt = FirestoreService.formatPhoneDisplay(cleanPhone);
      const existingName = (existingPhone && existingPhone.displayName) || (existingUid && existingUid.displayName) || "Socio Existente";
      throw new Error(`⚠️ Ya existe un socio registrado con el número [+505 ${fmt}] (${existingName}). No se permiten cuentas duplicadas ni variantes con prefijo.`);
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

    let imgs = [];
    if (Array.isArray(productData.images)) {
      imgs = productData.images.filter(x => typeof x === "string" && x.trim());
    } else if (productData.imageUrl) {
      imgs = [String(productData.imageUrl).trim()];
    }

    const isPartial = productData.rewardType === "PARTIAL_DISCOUNT";
    const reward = new RewardModel({
      id: productData.id || ("REW-" + Math.random().toString(36).substring(2, 8).toUpperCase()),
      title,
      rewardType: isPartial ? "PARTIAL_DISCOUNT" : "FREE_REWARD",
      priceUsd: isPartial ? (Number(productData.priceUsd) || 0) : 0,
      maxDiscountPct: isPartial ? (Number(productData.maxDiscountPct) || 0) : 0,
      maxDiscountUsd: isPartial ? (Number(productData.maxDiscountUsd) || 0) : 0,
      cashToPayUsd: isPartial ? (Number(productData.cashToPayUsd) || 0) : 0,
      pointsCost: cost,
      stock,
      imageUrl: imgs[0] || (productData.imageUrl || "").trim(),
      images: imgs,
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

  async markRewardSoldOut(rewardId, reason = "VENTA_EXTERNA") {
    const raw = await FirestoreService.getReward(rewardId);
    const reward = raw ? new RewardModel(raw) : (this.catalog || []).find(r => r.id === rewardId);
    if (!reward) throw new Error("Producto no encontrado.");
    reward.markAsSoldOut(reason);
    await FirestoreService.saveReward(reward.toJSON());
    await this.refreshData();
    this.notify();
    return reward;
  }

  async decrementRewardStock(rewardId, qty = 1) {
    const raw = await FirestoreService.getReward(rewardId);
    const reward = raw ? new RewardModel(raw) : (this.catalog || []).find(r => r.id === rewardId);
    if (!reward) throw new Error("Producto no encontrado.");
    reward.decrementStock(qty);
    await FirestoreService.saveReward(reward.toJSON());
    await this.refreshData();
    this.notify();
    return reward;
  }

  async restockReward(rewardId, qty = 1) {
    const raw = await FirestoreService.getReward(rewardId);
    const reward = raw ? new RewardModel(raw) : (this.catalog || []).find(r => r.id === rewardId);
    if (!reward) throw new Error("Producto no encontrado.");
    reward.restock(qty);
    await FirestoreService.saveReward(reward.toJSON());
    await this.refreshData();
    this.notify();
    return reward;
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

  async markVoucherPaid(voucherCode, cashierUid = "admin_melty") {
    const clean = (voucherCode || "").trim().toUpperCase();
    let voucher = await this.verifyVoucher(clean);
    if (!voucher) {
      voucher = (this.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    }
    if (!voucher) throw new Error("El vale [" + voucherCode + "] no existe en la base de datos.");
    if (voucher.isCancelled && voucher.isCancelled()) {
      throw new Error("Este vale fue cancelado y no puede ser marcado como pagado.");
    }
    if (voucher.isExpired && voucher.isExpired()) {
      throw new Error("Este vale caducó tras superar el plazo de 3 días para su pago.");
    }
    if (voucher.isPaidVoucher && voucher.isPaidVoucher()) {
      throw new Error("Este vale ya fue registrado como pagado previamente.");
    }

    voucher.markPaid(cashierUid);
    await FirestoreService.saveVoucher(voucher.toJSON());

    const idx = (this.vouchers || []).findIndex(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    if (idx !== -1) {
      this.vouchers[idx] = voucher;
    } else {
      this.vouchers.unshift(voucher);
    }

    await this.refreshData();
    return voucher;
  }

  async deliverVoucher(voucherCode, cashierUid = "admin_melty") {
    const clean = (voucherCode || "").trim().toUpperCase();
    let voucher = await this.verifyVoucher(clean);
    if (!voucher) {
      voucher = (this.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === clean);
    }
    if (!voucher) throw new Error("El vale [" + voucherCode + "] no existe en la base de datos.");
    if (voucher.isCancelled && voucher.isCancelled()) {
      throw new Error("Este vale fue cancelado por el cliente y sus puntos devueltos. No puede entregarse.");
    }
    if (voucher.isExpired && voucher.isExpired()) {
      throw new Error("Este vale ha caducado por falta de pago (plazo de 3 días superado).");
    }
    if (voucher.isDelivered()) {
      const deliveredDateStr = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleString() : "";
      throw new Error("Este vale ya fue despachado previamente" + (deliveredDateStr ? " el " + deliveredDateStr : "") + ".");
    }

    // Bloqueo estricto: Si es compra comercial o con descuento, DEBE estar pagado antes de poder entregarse
    const isCommercial = typeof voucher.isCommercial === "function" ? voucher.isCommercial() : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
    const isPaid = typeof voucher.isPaidVoucher === "function" ? voucher.isPaidVoucher() : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);
    if (isCommercial && !isPaid) {
      throw new Error(`El vale [${clean}] tiene un cobro pendiente de $${(voucher.cashToPayUsd || 0).toFixed(2)} USD. Debe registrarse como PAGADO antes de autorizar la entrega física.`);
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

  async claimInvoiceForCustomer(tokenCode, userUid, pointsOverride = null, reason = "Asignación administrativa de factura física") {
    const token = await this.verifyToken(tokenCode);
    if (!token) throw new Error("El código de factura [" + tokenCode + "] no existe.");
    if (token.isClaimed()) {
      throw new Error("Esta factura ya fue reclamada el " + new Date(token.claimedAt).toLocaleString());
    }

    let pts = pointsOverride !== null && pointsOverride !== undefined && !isNaN(pointsOverride)
      ? Number(pointsOverride)
      : token.pointsValue;

    if (isNaN(pts) || pts <= 0) {
      throw new Error("Debes indicar una cantidad de puntos válida mayor a 0.");
    }

    if (token.pointsValue !== pts || token.isPendingAssignment()) {
      token.assignPoints(pts, "admin_melty");
    }

    const rawUser = await FirestoreService.getUser(userUid);
    if (!rawUser) throw new Error("El cliente seleccionado no existe.");
    const user = new UserModel(rawUser);

    token.claim(user.uid);
    await FirestoreService.saveToken(token.toJSON());

    user.addPoints(pts);
    await FirestoreService.saveUser(user.toJSON());

    const entry = {
      id: "TX-" + Date.now(),
      type: "CREDIT_INVOICE",
      delta: pts,
      balance_after: user.wiredPoints,
      ref_id: token.tokenCode,
      note: `${reason} (Factura #MD-2026-${token.invoiceFolio || "0000"})`,
      created_at: new Date().toISOString()
    };
    FirestoreService.addLedgerEntry(user.uid, entry);

    await this.refreshData();
    return { success: true, token, user, pointsAdded: pts, newBalance: user.wiredPoints };
  }

  getNextAvailableFolio() {
    if (!this.tokens || this.tokens.length === 0) return 1;
    const existing = new Set(
      this.tokens
        .map(t => parseInt(t.invoiceFolio, 10))
        .filter(n => !isNaN(n) && n > 0)
    );
    let candidate = 1;
    while (existing.has(candidate)) {
      candidate++;
    }
    return candidate;
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

  async generateSingleDigitalInvoice(data = {}) {
    let sFolio = Number(data.folio);
    const folioStr = (sFolio && !isNaN(sFolio) && sFolio > 0)
      ? String(sFolio).padStart(4, "0")
      : String(this.getNextAvailableFolio()).padStart(4, "0");
    const points = Number(data.pointsValue) || 0;

    // Buscar si ya existe el token para actualizarlo en vez de duplicarlo
    let existingToken = null;
    if (data.targetTokenCode) {
      existingToken = (this.tokens || []).find(t => t.tokenCode === data.targetTokenCode);
    }
    if (!existingToken && data.folio) {
      existingToken = (this.tokens || []).find(t => t.invoiceFolio === folioStr);
    }

    let token;
    let code;
    let pin;

    if (existingToken) {
      token = existingToken;
      code = token.tokenCode;
      pin = data.securityPin || token.securityPin || Math.floor(1000 + Math.random() * 9000).toString();
      token.invoiceFolio = folioStr;
      token.pointsValue = points;
      token.securityPin = pin;
      if (points > 0 && token.isPendingAssignment()) {
        token.status = "ACTIVE";
      }
    } else {
      const hash = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase() +
                   Date.now().toString(36).substring(4, 7).toUpperCase();
      code = "WP-2026-F" + folioStr + "-" + hash;
      pin = data.securityPin || Math.floor(1000 + Math.random() * 9000).toString();

      token = new TokenModel({
        tokenCode: code,
        batchId: "SINGLE-INV-" + Date.now(),
        invoiceFolio: folioStr,
        pointsValue: points,
        securityPin: pin,
        status: points > 0 ? "ACTIVE" : "PENDING_ASSIGNMENT"
      });
    }

    const invoicePayload = {
      ...data,
      folio: folioStr,
      pointsValue: points,
      tokenCode: code,
      securityPin: pin
    };

    token.invoiceData = invoicePayload;

    await FirestoreService.saveToken(token.toJSON());
    await this.refreshData();

    return { token, invoicePayload, isUpdate: !!existingToken };
  }

  async purgeAllInvoiceTokens() {
    const res = await FirestoreService.purgeAllTokens();
    this.tokens = [];
    this.batches = [];
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeEntireDatabase() {
    const res = await FirestoreService.purgeEntireDatabase();
    await this.refreshData();
    this.notify();
    return res;
  }

  async findCustomer(query) {
    const raw = await FirestoreService.findUserByCodeOrPhone(query);
    if (!raw) return null;
    return new UserModel(raw);
  }

  async deleteToken(tokenCode) {
    const res = await FirestoreService.deleteToken(tokenCode);
    await this.refreshData();
    this.notify();
    return res;
  }

  async deleteVoucher(voucherCode) {
    const res = await FirestoreService.deleteVoucher(voucherCode);
    await this.refreshData();
    this.notify();
    return res;
  }

  async deleteUser(uid) {
    const res = await FirestoreService.deleteUser(uid);
    await this.refreshData();
    this.notify();
    return res;
  }

  async deleteReward(rewardId) {
    const res = await FirestoreService.deleteReward(rewardId);
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeUsers() {
    const res = await FirestoreService.purgeUsers();
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeCirculatingPoints() {
    const res = await FirestoreService.purgeCirculatingPoints();
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeVouchers(filter = "ALL") {
    const res = await FirestoreService.purgeVouchers(filter);
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeRewards() {
    const res = await FirestoreService.purgeRewards();
    await this.refreshData();
    this.notify();
    return res;
  }

  async purgeLedger() {
    const res = await FirestoreService.purgeLedger();
    await this.refreshData();
    this.notify();
    return res;
  }

  async seedDevData() {
    const res = await FirestoreService.seedDevData();
    await this.refreshData();
    this.notify();
    return res;
  }
}
