/* ViewModel: Lógica y Estado de Cliente (The Wired Club) */
import { FirestoreService } from "../services/FirestoreService.js";
import { UserModel } from "../models/UserModel.js";
import { RewardModel } from "../models/RewardModel.js";
import { VoucherModel } from "../models/VoucherModel.js";
import { TokenModel } from "../models/TokenModel.js";
import { getStorageKey } from "../config/env.js";
import { NicaraguanCedulaValidator } from "../utils/NicaraguanCedulaValidator.js";

export class CustomerViewModel {
  constructor() {
    this.currentUser = null;
    this.catalog = [];
    this.vouchers = [];
    this.ledger = [];
    this.activeTab = "catalog"; // catalog | vouchers | ledger
    this.pendingClaimToken = null;
    this.preferredCurrency = localStorage.getItem(getStorageKey("melty_preferred_currency")) || "USD";
    this.usdToNioRate = 37.0;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  async setCurrency(newCurrency) {
    const clean = (newCurrency || "").toUpperCase() === "NIO" ? "NIO" : "USD";
    this.preferredCurrency = clean;
    localStorage.setItem(getStorageKey("melty_preferred_currency"), clean);
    if (this.currentUser) {
      this.currentUser.setCurrency(clean);
      await FirestoreService.saveUser(this.currentUser.toJSON());
    }
    this.notify();
    return this.preferredCurrency;
  }

  async setPreferredCurrency(curr) {
    return this.setCurrency(curr);
  }

  formatMoney(amountUsd) {
    const num = Number(amountUsd) || 0;
    if (this.preferredCurrency === "NIO") {
      const nio = num * this.usdToNioRate;
      return `C$ ${nio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO`;
    }
    return `$${num.toFixed(2)} USD`;
  }

  formatDualMoney(amountUsd) {
    const num = Number(amountUsd) || 0;
    const nioVal = num * this.usdToNioRate;
    const nioStr = `C$ ${nioVal.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO`;
    const usdStr = `$${num.toFixed(2)} USD`;

    if (this.preferredCurrency === "NIO") {
      return `${nioStr} <span style="font-size:0.85em; opacity:0.8;">(${usdStr})</span>`;
    }
    return `${usdStr} <span style="font-size:0.85em; opacity:0.8;">(${nioStr})</span>`;
  }

  async init() {
    // 1. Cargar catálogo desde Firestore/Cache y activar sync en tiempo real
    await this.refreshCatalog();
    FirestoreService.subscribeRewards(rawRewards => {
      this.catalog = (rawRewards || []).map(r => new RewardModel(r));
      this.notify();
    });

    // 2. Cargar sesión de usuario si existe
    const savedUid = localStorage.getItem(getStorageKey("melty_client_uid"));
    if (savedUid) {
      const u = await FirestoreService.getUser(savedUid);
      if (u) {
        this.currentUser = new UserModel(u);
        if (this.currentUser.currency) {
          this.preferredCurrency = this.currentUser.currency;
          localStorage.setItem(getStorageKey("melty_preferred_currency"), this.preferredCurrency);
        }
        await this.refreshUserData();
      }
    }

    // 3. Revisar si hay un token de reclamo en la URL (?claim=WP-XXXX, ?folio=4, &pin=6608)
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get("pin");
    let claimCode = urlParams.get("claim");
    let folioCode = urlParams.get("folio");

    if (claimCode && (claimCode.trim().toUpperCase() === "UNDEFINED" || claimCode.trim().toUpperCase() === "NULL")) {
      claimCode = null;
    }

    const effectiveClaim = claimCode || folioCode;
    if (effectiveClaim) {
      let cleanClaim = effectiveClaim.trim().toUpperCase();

      if (cleanClaim && !cleanClaim.startsWith("WP-")) {
        const match = (window.location.search || window.location.href).match(/WP-[A-Z0-9-]+/i);
        if (match) {
          cleanClaim = match[0].toUpperCase();
        } else {
          const tok = await FirestoreService.getTokenByFolio(cleanClaim);
          if (tok) cleanClaim = (tok.token_code || tok.tokenCode || "").toUpperCase();
          else cleanClaim = null;
        }
      }

      if (cleanClaim && cleanClaim.length >= 5 && cleanClaim.startsWith("WP-")) {
        try {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {}

        let alreadyProcessed = false;
        try {
          const processed = JSON.parse(sessionStorage.getItem("melty_processed_tokens") || "[]");
          if (processed.includes(cleanClaim)) alreadyProcessed = true;
        } catch (e) {}

        if (!alreadyProcessed) {
          this.pendingClaimToken = cleanClaim;
          if (pinParam) this.pendingClaimPin = pinParam.trim();
        }
      }
    } else if (urlParams.has("claim") && urlParams.get("claim") === "undefined") {
      // Cliente abrió link de factura física previa con claim=undefined
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const modal = document.getElementById("modal-manual-claim");
          if (modal) modal.style.display = "flex";
          if (pinParam) {
            const pInput = document.getElementById("manual-input-pin");
            if (pInput) pInput.value = pinParam.trim();
          }
        }, 400);
      }
    }

    this.notify();
  }

  async refreshCatalog() {
    const rawRewards = await FirestoreService.fetchRewards();
    this.catalog = (rawRewards || []).map(r => new RewardModel(r));
    this.notify();
  }

  async refreshUserData() {
    if (!this.currentUser) return;
    const u = await FirestoreService.getUser(this.currentUser.uid);
    if (u) this.currentUser = new UserModel(u);
    await FirestoreService.fetchVouchers();
    this.vouchers = FirestoreService.getUserVouchers(this.currentUser.uid).map(v => new VoucherModel(v));
    await this.processExpiredVouchers();
    this.ledger = FirestoreService.getLedger(this.currentUser.uid);
    this.notify();
  }

  async processExpiredVouchers() {
    if (!this.currentUser || !this.vouchers || this.vouchers.length === 0) return;
    let userModified = false;
    let catalogModified = false;

    for (const voucher of this.vouchers) {
      if (voucher.isCommercial() && !voucher.isPaidVoucher() && !voucher.isDelivered() && !voucher.isCancelled()) {
        if (voucher.isExpired() && voucher.status !== "EXPIRED") {
          // Ha vencido el plazo estricto de 3 días para concretar el pago
          const pointsSpent = Number(voucher.pointsSpent || 0);
          let penalty = 10;
          let refund = 0;

          if (pointsSpent > 0) {
            // Caso con descuento: El socio aplicó puntos para obtener rebaja.
            // Por irresponsabilidad (falta de pago en 3 días), se le restan 10 WP de penalización.
            // Si aplicó más de 10 WP al reservar, se le devuelve la diferencia.
            penalty = 10;
            refund = Math.max(0, pointsSpent - penalty);
            if (refund > 0) {
              this.currentUser.addPoints(refund);
              userModified = true;
            }
            FirestoreService.addLedgerEntry(this.currentUser.uid, {
              id: "TX-EXP-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
              type: "EXPIRED_PENALTY",
              delta: refund,
              balance_after: this.currentUser.wiredPoints,
              ref_id: voucher.voucherCode,
              note: `⚠️ Vale Expirado (3 días sin pago): -10 WP por irresponsabilidad${refund > 0 ? ` (+${refund} WP devueltos de ${pointsSpent} WP)` : ''} en [${voucher.voucherCode}] ${voucher.rewardTitle}`,
              created_at: new Date().toISOString()
            });
          } else {
            // Caso compra a precio completo (0 puntos aplicados):
            // El cliente apartó a precio de lista sin usar puntos.
            // Si no paga en 3 días, la reserva caduca y el stock regresa al catálogo, sin penalización de puntos.
            penalty = 0;
            FirestoreService.addLedgerEntry(this.currentUser.uid, {
              id: "TX-EXP-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
              type: "EXPIRED_RESERVATION",
              delta: 0,
              balance_after: this.currentUser.wiredPoints,
              ref_id: voucher.voucherCode,
              note: `⚠️ Reserva expirada (3 días sin pago): Stock retornado al catálogo en [${voucher.voucherCode}] ${voucher.rewardTitle}`,
              created_at: new Date().toISOString()
            });
          }

          // Restaurar stock del producto en catálogo (+1)
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
            catalogModified = true;
          }

          // Marcar vale como EXPIRED
          voucher.markExpired(penalty);
          await FirestoreService.saveVoucher(voucher.toJSON());
        }
      }
    }

    if (userModified) {
      await FirestoreService.saveUser(this.currentUser.toJSON());
    }
    if (catalogModified) {
      await this.refreshCatalog();
    }
  }

  async login(phone, pin) {
    const cleanPhone = FirestoreService.normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length !== 8) {
      throw new Error("Ingresa tu número de teléfono de 8 dígitos (ej: 5843-8412). El prefijo +505 ya está incluido.");
    }
    const uid = "CLIENT-" + cleanPhone;
    let u = await FirestoreService.getUser(uid);
    if (!u) {
      // Búsqueda inteligente multi-variante (soporta legacy y con prefijo)
      u = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    }

    if (!u) {
      const fmt = FirestoreService.formatPhoneDisplay(cleanPhone);
      throw new Error("No existe una cuenta registrada con el número +505 " + fmt + ". Selecciona la pestaña 'Nuevo Socio' para registrarte.");
    }

    if (u.status === "BANNED") {
      throw new Error("⚠️ Esta cuenta de socio se encuentra suspendida temporalmente por administración.");
    }

    if (pin && u.pin && u.pin !== pin.trim()) {
      throw new Error("El PIN de seguridad ingresado es incorrecto.");
    }

    this.currentUser = new UserModel(u);
    if (this.currentUser.currency) {
      this.preferredCurrency = this.currentUser.currency;
      localStorage.setItem(getStorageKey("melty_preferred_currency"), this.preferredCurrency);
    }
    localStorage.setItem(getStorageKey("melty_client_uid"), u.uid || uid);
    await this.refreshCatalog();
    await this.refreshUserData();
    this.notify();
    return this.currentUser;
  }

  async register(displayName, phone, pin) {
    const name = displayName.trim();
    if (!name) throw new Error("Por favor ingresa tu nombre completo.");
    
    // Normalización canónica anti-burlas: elimina prefijos (+505, 505, 00505) y espacios
    const cleanPhone = FirestoreService.normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length !== 8) {
      throw new Error("Ingresa un número telefónico válido de 8 dígitos (ej: 5843-8412). El prefijo +505 ya viene por defecto.");
    }
    const securityPin = pin ? pin.trim() : "1234";
    if (securityPin.length < 4 || securityPin.length > 8) {
      throw new Error("El PIN de seguridad debe contener entre 4 y 8 dígitos.");
    }
    const uid = "CLIENT-" + cleanPhone;

    // Validación estricta anti-duplicados:
    // Bloquea cualquier intento de duplicar la cuenta (con o sin +505, guiones o variantes)
    const existingUid = await FirestoreService.getUser(uid);
    const existingLegacy = await FirestoreService.getUser("CLIENT-505" + cleanPhone);
    const existingPhone = await FirestoreService.findUserByCodeOrPhone(cleanPhone);
    
    if (existingUid || existingLegacy || existingPhone) {
      const fmt = FirestoreService.formatPhoneDisplay(cleanPhone);
      const existingName = (existingPhone && existingPhone.displayName) || (existingUid && existingUid.displayName) || "";
      throw new Error(`⚠️ El número [+505 ${fmt}] ya se encuentra registrado${existingName ? ' a nombre de ' + existingName : ''}. Ingresa desde la pestaña 'Ya Soy Socio' con tu PIN.`);
    }

    const newUser = new UserModel({
      uid,
      displayName: name,
      phone: cleanPhone, // Guardamos estrictamente los 8 dígitos canónicos
      pin: securityPin,
      wiredPoints: 0,
      lifetimePoints: 0,
      currency: this.preferredCurrency || "USD",
      status: "ACTIVE"
    });

    await FirestoreService.saveUser(newUser.toJSON());
    this.currentUser = newUser;
    localStorage.setItem(getStorageKey("melty_client_uid"), uid);
    await this.refreshUserData();
    this.notify();
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.vouchers = [];
    this.ledger = [];
    localStorage.removeItem(getStorageKey("melty_client_uid"));
    this.notify();
  }

  async claimPendingToken() {
    if (!this.pendingClaimToken || this.pendingClaimToken === "UNDEFINED" || this.pendingClaimToken === "NULL") {
      this.pendingClaimToken = null;
      this.pendingClaimPin = null;
      throw new Error("No hay ninguna factura pendiente para acreditar.");
    }
    const tokenToClaim = this.pendingClaimToken;
    const pinToClaim = this.pendingClaimPin || null;
    const res = await this.claimToken(tokenToClaim, pinToClaim, !pinToClaim);
    this.pendingClaimToken = null;
    this.pendingClaimPin = null;
    return res;
  }

  async claimToken(tokenCode, pin = null, isDirectScan = false) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión con tu WhatsApp para acreditar puntos.");
    }

    const cleanInput = (tokenCode || "").trim().toUpperCase();
    if (!cleanInput || cleanInput === "UNDEFINED" || cleanInput === "NULL") {
      throw new Error("El código o número de factura es inválido.");
    }

    let rawToken = null;
    let cleanToken = cleanInput;

    if (cleanInput.startsWith("WP-")) {
      rawToken = await FirestoreService.getToken(cleanInput);
    } else {
      rawToken = await FirestoreService.getTokenByFolio(cleanInput);
      if (rawToken) {
        cleanToken = (rawToken.token_code || rawToken.tokenCode || "").trim().toUpperCase();
      }
    }

    if (!rawToken) {
      throw new Error("La factura [" + cleanInput + "] no existe en el sistema.");
    }

    const token = new TokenModel(rawToken);
    if (token.isClaimed()) {
      throw new Error("Este código de puntos ya fue utilizado.");
    }

    if (token.isPendingAssignment() || token.pointsValue <= 0) {
      throw new Error("Esta factura aún no ha sido activada en caja. Solicita en mostrador la asignación de tus puntos.");
    }

    // Si NO proviene de escaneo directo (ingreso manual con teclado), se exige validación estricta de PIN
    if (!isDirectScan && token.securityPin && token.securityPin !== "----" && token.securityPin !== "••••") {
      if (!pin || token.securityPin !== pin.trim()) {
        throw new Error("El PIN de seguridad impreso en la factura es incorrecto.");
      }
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
      imageUrl: reward.imageUrl || reward.image_url || "",
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
      throw new Error("Este vale ya fue despachado y entregado. No puede ser cancelado.");
    }

    if (voucher.isPaidVoucher()) {
      throw new Error("Este vale ya fue pagado en efectivo. Para coordinar reembolsos o cambios comunícate directamente con MeltyDeays.");
    }

    if (voucher.isCancelled()) {
      throw new Error("Este vale ya fue cancelado previamente.");
    }

    if (voucher.isExpired()) {
      throw new Error("Este vale ya caducó al superar el plazo de 3 días para concretar el pago.");
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

  async reservePreOrder(rewardId, customerData = {}) {
    // 1. Buscar producto en catálogo local o Firestore
    let reward = (this.catalog || []).find(r => r.id === rewardId);
    if (!reward && rewardId) {
      const raw = await FirestoreService.getReward(rewardId);
      if (raw) reward = new RewardModel(raw);
    }
    if (!reward) {
      throw new Error("Producto no encontrado en el catálogo.");
    }

    // 2. Validar estado de preventa
    const isIncoming = reward.status === "INCOMING" || (typeof reward.isIncoming === "function" && reward.isIncoming());
    if (!isIncoming) {
      throw new Error("Este producto no se encuentra disponible en modalidad preventa.");
    }

    if (typeof reward.isIncomingExpired === "function" && reward.isIncomingExpired()) {
      throw new Error("El periodo de preventa para este producto ha finalizado.");
    }

    // 3. Validar datos requeridos del cliente
    const cedulaInput = (customerData.cedula || "").trim().toUpperCase();
    const fullName = (customerData.fullName || customerData.name || "").trim();
    const phone = (customerData.phone || "").trim();
    const email = (customerData.email || "").trim();

    if (!cedulaInput) throw new Error("La cédula de identidad es obligatoria.");
    const cedulaCheck = NicaraguanCedulaValidator.validate(cedulaInput);
    if (!cedulaCheck.isValid) {
      throw new Error(`Cédula inválida: ${cedulaCheck.reason}`);
    }
    const cedula = cedulaCheck.formatted;
    if (!fullName || fullName.split(/\s+/).length < 2) {
      throw new Error("Por favor ingresa tu nombre y apellido completos.");
    }
    const cleanPhoneDigits = phone.replace(/\D/g, "");
    if (cleanPhoneDigits.length !== 8 && !(cleanPhoneDigits.startsWith("505") && cleanPhoneDigits.length === 11)) {
      throw new Error("Ingresa un número telefónico válido de 8 dígitos.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Por favor ingresa un correo electrónico válido.");
    }

    // 4. Cálculo del Descuento Directo de Preventa (Independiente de Puntos Wired)
    const regularPrice = Math.max(0, Number(reward.priceUsd) || 0);
    const discType = reward.presaleDiscountType || reward.preOrderDiscountType || "PERCENTAGE";
    const discVal = Number(reward.presaleDiscountValue ?? reward.preOrderDiscountVal ?? reward.presaleDiscountUsd ?? 0);
    let discountUsd = 0;

    if (discType === "PERCENTAGE") {
      const clampedPct = Math.max(0, Math.min(100, discVal));
      discountUsd = Math.round((regularPrice * (clampedPct / 100)) * 100) / 100;
    } else {
      const clampedFixed = Math.max(0, discVal);
      discountUsd = Math.min(regularPrice, Math.round(clampedFixed * 100) / 100);
    }
    const cashToPayUsd = Math.max(0, Math.round((regularPrice - discountUsd) * 100) / 100);

    // 5. INVARIANTE ESTRICTO DE PUNTOS WIRED: 0 WP DEDUCIDOS
    // El balance de puntos del usuario permanece 100% inalterado
    const pointsSpent = 0;

    // 6. Generación de Voucher de Preventa RES-XXXX
    let voucherCode = null;
    for (let attempt = 0; attempt < 12 && !voucherCode; attempt++) {
      const candidate = "RES-" + Math.floor(1000 + Math.random() * 9000);
      const existing = await FirestoreService.getVoucher(candidate).catch(() => null);
      if (!existing) voucherCode = candidate;
    }
    if (!voucherCode) {
      voucherCode = "RES-" + Date.now().toString(36).toUpperCase().slice(-6);
    }
    const cleanPhone8 = (cleanPhoneDigits.startsWith("505") && cleanPhoneDigits.length === 11) ? cleanPhoneDigits.slice(3) : cleanPhoneDigits;
    const userUid = this.currentUser ? this.currentUser.uid : ("GUEST-" + cleanPhone8);

    const voucher = new VoucherModel({
      voucherCode,
      userUid,
      userName: fullName,
      userDisplayName: fullName,
      customerInfo: {
        cedula,
        fullName,
        phone: cleanPhone8,
        email
      },
      rewardId: reward.id,
      rewardTitle: reward.title,
      rewardType: "PREORDER_RESERVATION",
      imageUrl: reward.imageUrl || (Array.isArray(reward.images) && reward.images[0]) || "",
      pointsSpent: 0,
      pointsCost: 0,
      priceUsd: regularPrice,
      discountUsd,
      cashToPayUsd,
      status: "RESERVED_UPCOMING",
      isPaid: false,
      estimatedArrival: reward.estimatedArrival || null,
      createdAt: new Date().toISOString(),
      expiresAt: null
    });

    // 7. Persistir en Firestore / LocalStorage
    await FirestoreService.saveVoucher(voucher.toJSON());

    // 8. Registro en Ledger Contable si hay sesión de usuario activa (0 puntos delta)
    if (this.currentUser) {
      const entry = {
        id: "TX-" + Date.now(),
        type: "PREORDER_RESERVATION",
        delta: 0,
        balance_after: this.currentUser.wiredPoints,
        ref_id: voucher.voucherCode,
        note: `🔮 Reserva Preventa de ${reward.title}: Descuento -$${discountUsd.toFixed(2)} USD aplicado (0 WP gastados). Saldo a liquidar al llegar: $${cashToPayUsd.toFixed(2)} USD`,
        created_at: new Date().toISOString()
      };
      FirestoreService.addLedgerEntry(this.currentUser.uid, entry);
      await this.refreshUserData();
    }

    this.notify();

    // 9. Compatibilidad y retorno
    voucher.voucher = voucher;
    voucher.success = true;
    voucher.newBalance = this.currentUser ? this.currentUser.wiredPoints : 0;
    voucher.cost = 0;

    return voucher;
  }
}
