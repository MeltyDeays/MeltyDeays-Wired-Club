/* ViewModel: Lógica y Estado de Cliente (The Wired Club) */
import { FirestoreService } from "../services/FirestoreService.js";
import { UserModel } from "../models/UserModel.js";
import { RewardModel } from "../models/RewardModel.js";
import { VoucherModel } from "../models/VoucherModel.js";
import { TokenModel } from "../models/TokenModel.js";

export class CustomerViewModel {
  constructor() {
    this.currentUser = null;
    this.catalog = [];
    this.vouchers = [];
    this.ledger = [];
    this.activeTab = "catalog"; // catalog | vouchers | ledger
    this.pendingClaimToken = null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  async init() {
    // 1. Cargar catálogo desde Firestore/Cache
    await this.refreshCatalog();

    // 2. Cargar sesión de usuario si existe
    const savedUid = localStorage.getItem("melty_client_uid");
    if (savedUid) {
      const u = await FirestoreService.getUser(savedUid);
      if (u) {
        this.currentUser = new UserModel(u);
        await this.refreshUserData();
      }
    }

    // 3. Revisar si hay un token de reclamo en la URL (?claim=WP-XXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const claimCode = urlParams.get("claim");
    if (claimCode) {
      this.pendingClaimToken = claimCode.toUpperCase();
    }

    this.notify();
  }

  async refreshCatalog() {
    const rawRewards = await FirestoreService.fetchRewards();
    this.catalog = rawRewards.map(r => new RewardModel(r));
    this.notify();
  }

  async refreshUserData() {
    if (!this.currentUser) return;
    const u = await FirestoreService.getUser(this.currentUser.uid);
    if (u) this.currentUser = new UserModel(u);
    this.vouchers = FirestoreService.getUserVouchers(this.currentUser.uid).map(v => new VoucherModel(v));
    this.ledger = FirestoreService.getLedger(this.currentUser.uid);
    this.notify();
  }

  async login(phone, pin) {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error("Ingresa un número telefónico o WhatsApp válido (mínimo 8 dígitos).");
    }
    const uid = "CLIENT-" + cleanPhone;
    let u = await FirestoreService.getUser(uid);
    if (!u) {
      // Búsqueda alternativa por teléfono
      u = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    }

    if (!u) {
      throw new Error("No existe una cuenta registrada con el número " + cleanPhone + ". Selecciona la pestaña 'Nuevo Socio' para registrarte.");
    }

    if (u.status === "BANNED") {
      throw new Error("⚠️ Esta cuenta de socio se encuentra suspendida temporalmente por administración.");
    }

    if (pin && u.pin && u.pin !== pin.trim()) {
      throw new Error("El PIN de seguridad ingresado es incorrecto.");
    }

    this.currentUser = new UserModel(u);
    localStorage.setItem("melty_client_uid", u.uid || uid);
    await this.refreshUserData();
    this.notify();
    return this.currentUser;
  }

  async register(displayName, phone, pin) {
    const name = displayName.trim();
    if (!name) throw new Error("Por favor ingresa tu nombre completo.");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error("Ingresa un número de WhatsApp válido (mínimo 8 dígitos).");
    }
    const securityPin = pin ? pin.trim() : "1234";
    const uid = "CLIENT-" + cleanPhone;

    // Validación estricta de unicidad: ningún otro usuario puede tener el mismo número
    const existingUid = await FirestoreService.getUser(uid);
    const existingPhone = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    if (existingUid || existingPhone) {
      throw new Error("El número [" + cleanPhone + "] ya está registrado. Ingresa desde la pestaña 'Ya Soy Socio'.");
    }

    const newUser = new UserModel({
      uid,
      displayName: name,
      phone: cleanPhone,
      pin: securityPin,
      wiredPoints: 0,
      lifetimePoints: 0,
      status: "ACTIVE"
    });

    await FirestoreService.saveUser(newUser.toJSON());
    this.currentUser = newUser;
    localStorage.setItem("melty_client_uid", uid);
    await this.refreshUserData();
    this.notify();
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.vouchers = [];
    this.ledger = [];
    localStorage.removeItem("melty_client_uid");
    this.notify();
  }

  async claimToken(tokenCode, pin) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión con tu WhatsApp para acreditar puntos.");
    }

    const rawToken = await FirestoreService.getToken(tokenCode);
    if (!rawToken) {
      throw new Error("El código [" + tokenCode + "] no existe en el sistema.");
    }

    const token = new TokenModel(rawToken);
    if (token.isClaimed()) {
      throw new Error("Este código de puntos ya fue utilizado.");
    }

    if (token.isPendingAssignment() || token.pointsValue <= 0) {
      throw new Error("Esta factura aún no ha sido activada en caja. Solicita en mostrador la asignación de tus puntos.");
    }

    if (token.securityPin && pin && token.securityPin !== pin.trim()) {
      throw new Error("El PIN de seguridad impreso en la factura es incorrecto.");
    }

    // Acreditar
    token.claim(this.currentUser.uid);
    await FirestoreService.saveToken(token.toJSON());

    this.currentUser.addPoints(token.pointsValue);
    await FirestoreService.saveUser(this.currentUser.toJSON());

    // Ledger
    const entry = {
      id: "TX-" + Date.now(),
      type: "CREDIT_INVOICE",
      delta: token.pointsValue,
      balance_after: this.currentUser.wiredPoints,
      ref_id: token.tokenCode,
      note: "Acreditación por compra (Factura F" + (token.invoiceFolio || "0000") + ")",
      created_at: new Date().toISOString()
    };
    FirestoreService.addLedgerEntry(this.currentUser.uid, entry);

    this.pendingClaimToken = null;
    await this.refreshUserData();
    return { success: true, pointsAdded: token.pointsValue, newBalance: this.currentUser.wiredPoints };
  }

  async redeemReward(rewardId, pointsToApply = null) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión para canjear recompensas.");
    }

    const reward = this.catalog.find(r => r.id === rewardId);
    if (!reward) throw new Error("Recompensa no encontrada.");
    if (!reward.isAvailable()) throw new Error("Producto temporalmente agotado.");

    const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount());

    let pointsSpent = 0;
    let discountUsd = 0;
    let cashToPayUsd = reward.priceUsd || 0;

    if (isPartial) {
      const userPoints = Math.max(0, this.currentUser.wiredPoints || 0);
      const maxCapPoints = reward.pointsCost || 0;
      const maxUsable = Math.min(userPoints, maxCapPoints);

      if (pointsToApply !== null && pointsToApply !== undefined) {
        pointsSpent = Math.max(0, Math.min(Number(pointsToApply), maxUsable));
      } else {
        pointsSpent = maxUsable;
      }

      const usdPerPoint = (maxCapPoints > 0 && reward.maxDiscountUsd > 0)
        ? (reward.maxDiscountUsd / maxCapPoints)
        : 0;

      discountUsd = Number(Math.min(reward.maxDiscountUsd || 0, pointsSpent * usdPerPoint).toFixed(2));
      cashToPayUsd = Math.max(0, Number(((reward.priceUsd || 0) - discountUsd).toFixed(2)));
    } else {
      if (!this.currentUser.hasEnoughPoints(reward.pointsCost)) {
        throw new Error("Puntos insuficientes. Requieres " + reward.pointsCost + " WP.");
      }
      pointsSpent = reward.pointsCost;
      discountUsd = reward.priceUsd || 0;
      cashToPayUsd = 0;
    }

    // Descontar puntos únicamente si se gastaron
    if (pointsSpent > 0) {
      this.currentUser.deductPoints(pointsSpent);
    }
    reward.decrementStock();

    const voucher = new VoucherModel({
      userUid: this.currentUser.uid,
      userName: this.currentUser.displayName,
      rewardId: reward.id,
      rewardTitle: reward.title,
      rewardType: reward.rewardType || (isPartial ? "PARTIAL_DISCOUNT" : "FREE_REWARD"),
      pointsSpent: pointsSpent,
      priceUsd: reward.priceUsd || 0,
      discountUsd: discountUsd,
      cashToPayUsd: cashToPayUsd,
      expiresAt: (isPartial || cashToPayUsd > 0)
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null
    });

    await FirestoreService.saveUser(this.currentUser.toJSON());
    await FirestoreService.saveReward(reward.toJSON());
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Ledger
    if (pointsSpent > 0) {
      const noteText = isPartial
        ? `Vale Descuento (-$${discountUsd.toFixed(2)} USD usando ${pointsSpent} WP) en ${reward.title} [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`
        : `Canje 100% Gratis de ${reward.title}`;

      const entry = {
        id: "TX-" + Date.now(),
        type: "DEBIT_REWARD",
        delta: -pointsSpent,
        balance_after: this.currentUser.wiredPoints,
        ref_id: voucher.voucherCode,
        note: noteText,
        created_at: new Date().toISOString()
      };
      FirestoreService.addLedgerEntry(this.currentUser.uid, entry);
    } else {
      const entry = {
        id: "TX-" + Date.now(),
        type: "PURCHASE_VOUCHER",
        delta: 0,
        balance_after: this.currentUser.wiredPoints,
        ref_id: voucher.voucherCode,
        note: `Vale de Compra Mostrador (Sin descuento en puntos) en ${reward.title} [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`,
        created_at: new Date().toISOString()
      };
      FirestoreService.addLedgerEntry(this.currentUser.uid, entry);
    }

    await this.refreshUserData();
    await this.refreshCatalog();

    // Compatibilidad dual absoluta: retorna voucher decorado con propiedades auxiliares
    voucher.voucher = voucher;
    voucher.success = true;
    voucher.newBalance = this.currentUser.wiredPoints;
    voucher.cost = pointsSpent;

    return voucher;
  }

  async cancelVoucher(voucherCode) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión para gestionar tus vales.");
    }

    const cleanCode = (voucherCode || "").trim().toUpperCase();
    let voucher = (this.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === cleanCode);
    if (!voucher) {
      const raw = await FirestoreService.getVoucher(cleanCode);
      if (raw) voucher = new VoucherModel(raw);
    }

    if (!voucher) {
      throw new Error("El vale [" + cleanCode + "] no fue encontrado.");
    }

    const voucherUserUid = voucher.userUid || voucher.userId;
    if (voucherUserUid && voucherUserUid !== this.currentUser.uid) {
      throw new Error("No tienes autorización para cancelar este vale.");
    }

    if (voucher.isDelivered()) {
      throw new Error("Este vale ya fue despachado y entregado en mostrador. No puede ser cancelado.");
    }

    if (voucher.isCancelled()) {
      throw new Error("Este vale ya fue cancelado previamente.");
    }

    const pointsToRefund = voucher.pointsSpent || 0;

    // 1. Reintegro de puntos si aplicó saldo
    if (pointsToRefund > 0) {
      this.currentUser.addPoints(pointsToRefund);
      const refundEntry = {
        id: "TX-" + Date.now(),
        type: "REFUND_CANCEL",
        delta: pointsToRefund,
        balance_after: this.currentUser.wiredPoints,
        ref_id: voucher.voucherCode,
        note: `Reembolso por Cancelación de Vale [${voucher.voucherCode}]: +${pointsToRefund} WP devueltos por ${voucher.rewardTitle}`,
        created_at: new Date().toISOString()
      };
      FirestoreService.addLedgerEntry(this.currentUser.uid, refundEntry);
    } else {
      const cancelEntry = {
        id: "TX-" + Date.now(),
        type: "CANCEL_PURCHASE",
        delta: 0,
        balance_after: this.currentUser.wiredPoints,
        ref_id: voucher.voucherCode,
        note: `Cancelación de Reserva de Compra [${voucher.voucherCode}] para ${voucher.rewardTitle}`,
        created_at: new Date().toISOString()
      };
      FirestoreService.addLedgerEntry(this.currentUser.uid, cancelEntry);
    }

    // 2. Restaurar stock del artículo en catálogo
    let reward = (this.catalog || []).find(r => r.id === voucher.rewardId);
    if (!reward && voucher.rewardId) {
      const rawReward = await FirestoreService.getReward(voucher.rewardId);
      if (rawReward) reward = new RewardModel(rawReward);
    }
    if (reward) {
      if (typeof reward.incrementStock === "function") {
        reward.incrementStock();
      } else {
        reward.stock = (reward.stock || 0) + 1;
      }
      await FirestoreService.saveReward(reward.toJSON());
    }

    // 3. Marcar vale como cancelado
    voucher.markCancelled(this.currentUser.uid);
    await FirestoreService.saveVoucher(voucher.toJSON());

    // 4. Guardar usuario actualizado y refrescar datos
    await FirestoreService.saveUser(this.currentUser.toJSON());
    await this.refreshUserData();
    await this.refreshCatalog();

    return {
      success: true,
      voucherCode: voucher.voucherCode,
      rewardTitle: voucher.rewardTitle,
      pointsRefunded: pointsToRefund,
      newBalance: this.currentUser.wiredPoints
    };
  }
}
