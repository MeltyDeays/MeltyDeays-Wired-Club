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

  async reconcileLedgerAndBalance(userUid) {
    if (!userUid) return;
    const snap = FirestoreService.getSnapshot();
    const ledger = (snap.ledger && snap.ledger[userUid]) ? snap.ledger[userUid] : [];
    if (!ledger.length) return;

    // Detectar si hay múltiples REFUND_CANCEL para el mismo código de vale (exploit / retry desfasado)
    const seenVoucherRefunds = new Set();
    let excessRefundPoints = 0;
    const cleanedLedger = [];

    // Recorremos cronológicamente (de más antiguo a más reciente)
    const chronological = [...ledger].reverse();
    for (const entry of chronological) {
      if (entry.type === "REFUND_CANCEL" && entry.ref_id) {
        const cleanRef = String(entry.ref_id).trim().toUpperCase();
        if (seenVoucherRefunds.has(cleanRef)) {
          // Reembolso duplicado ilícito detectado: descontar puntos del excedente
          excessRefundPoints += Number(entry.delta || 0);
          continue;
        }
        seenVoucherRefunds.add(cleanRef);
      }
      cleanedLedger.push(entry);
    }

    if (excessRefundPoints > 0) {
      cleanedLedger.reverse(); // Restaurar orden cronológico inverso
      snap.ledger[userUid] = cleanedLedger;
      const user = snap.users && snap.users[userUid];
      if (user) {
        const curPts = Number(user.wiredPoints !== undefined ? user.wiredPoints : (user.wired_points || 0));
        const corrected = Math.max(0, curPts - excessRefundPoints);
        user.wiredPoints = corrected;
        user.wired_points = corrected;
        if (this.currentUser && this.currentUser.uid === userUid) {
          this.currentUser.wiredPoints = corrected;
        }
      }
      FirestoreService.saveSnapshot(snap);
      if (user) {
        await FirestoreService.saveUser(user);
      }
    }
  }

  async refreshUserData() {
    if (!this.currentUser) return;
    await this.reconcileLedgerAndBalance(this.currentUser.uid);
    const u = await FirestoreService.getUser(this.currentUser.uid);
    if (u) this.currentUser = new UserModel(u);
    await FirestoreService.fetchVouchers();
    this.vouchers = FirestoreService.getUserVouchers(this.currentUser.uid).map(v => new VoucherModel(v));
    await this.processExpiredVouchers();
    this.ledger = FirestoreService.getLedger(this.currentUser.uid);
    this.notify();
  }

  async processExpiredVouchers() {
    if (!this.currentUser) return 0;
    // Sincronizar vales del usuario desde Firestore si no están cargados o para capturar actualizaciones
    const userVouchers = FirestoreService.getUserVouchers(this.currentUser.uid).map(v => new VoucherModel(v));
    if (userVouchers.length > 0) {
      this.vouchers = userVouchers;
    }
    if (!this.vouchers || this.vouchers.length === 0) return 0;
    let userModified = false;
    let catalogModified = false;
    let expiredCount = 0;

    for (const voucher of this.vouchers) {
      if (voucher.isCommercial() && !voucher.isPaidVoucher() && !voucher.isDelivered() && !voucher.isCancelled()) {
        if (voucher.isExpired() && voucher.status !== "EXPIRED") {
          expiredCount++;
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

          // Restaurar stock o reconstituir combo en catálogo (+1 o reconstitución)
          await this.restoreVoucherInventory(voucher);
          catalogModified = true;

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
    return expiredCount;
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

  async redeemReward(rewardId, pointsToApply = null, options = {}) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión para canjear recompensas.");
    }

    let reward = (this.catalog || []).find(r => r.id === rewardId);
    if (!reward && rewardId) {
      const raw = await FirestoreService.getReward(rewardId);
      if (raw) reward = new RewardModel(raw);
    }
    if (!reward) throw new Error("Recompensa no encontrada.");
    if (!reward.isAvailable()) throw new Error("Producto temporalmente agotado.");

    // Detectar si es Combo Flexible
    if (reward.isCombo && reward.isCombo()) {
      const comboItems = reward.getComboItems();
      const selectionMode = options.selectionMode || (options.selectedItemId ? "SINGLE_ITEM" : "FULL_COMBO");
      const selectedItemId = options.selectedItemId || null;

      // ========================================================
      // ESCENARIO A: Compra de Combo Completo (Full Combo)
      // ========================================================
      if (selectionMode === "FULL_COMBO" || !selectedItemId) {
        const userPoints = Math.max(0, this.currentUser.wiredPoints || 0);
        const maxCapPoints = reward.pointsCost || 0;
        const maxUsable = Math.min(userPoints, maxCapPoints);

        let pointsSpent = 0;
        if (pointsToApply !== null && pointsToApply !== undefined) {
          const rawPts = Number(pointsToApply);
          pointsSpent = Number.isFinite(rawPts) ? Math.max(0, Math.min(rawPts, maxUsable)) : 0;
        } else {
          pointsSpent = maxUsable;
        }

        const usdPerPoint = (maxCapPoints > 0 && reward.maxDiscountUsd > 0)
          ? (reward.maxDiscountUsd / maxCapPoints)
          : 0;
        const discountUsd = Number(Math.min(reward.maxDiscountUsd || 0, pointsSpent * usdPerPoint).toFixed(2));
        const cashToPayUsd = Math.max(0, Number(((reward.priceUsd || 0) - discountUsd).toFixed(2)));

        if (pointsSpent > 0) {
          this.currentUser.deductPoints(pointsSpent);
        }

        // Agotar combo por completo (stock = 0, status = SOLD_OUT)
        reward.stock = 0;
        reward.status = "SOLD_OUT";
        reward.soldOutAt = new Date().toISOString();
        reward.soldOutReason = "COMBO_FULL_REDEEMED";
        reward.updatedAt = new Date().toISOString();

        const itemsSnapshot = comboItems.map(it => ({ ...it }));
        const comboOrigin = {
          comboId: reward.id,
          originalTitle: reward.title,
          originalPriceUsd: reward.priceUsd,
          originalPointsCost: reward.pointsCost,
          originalMaxDiscountPct: reward.maxDiscountPct,
          itemCount: comboItems.length,
          itemsSnapshot: itemsSnapshot,
          originalItems: itemsSnapshot,
          splitLevel: "FULL_COMBO",
          timestamp: new Date().toISOString()
        };

        const voucher = new VoucherModel({
          userUid: this.currentUser.uid,
          userName: this.currentUser.displayName,
          rewardId: reward.id,
          rewardTitle: reward.title,
          rewardType: "COMBO",
          imageUrl: reward.imageUrl || (comboItems[0]?.imageUrl || ""),
          pointsSpent: pointsSpent,
          priceUsd: reward.priceUsd || 0,
          discountUsd: discountUsd,
          cashToPayUsd: cashToPayUsd,
          comboItems: itemsSnapshot,
          comboOrigin: comboOrigin,
          expiresAt: (cashToPayUsd > 0)
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : null
        });

        await FirestoreService.saveUser(this.currentUser.toJSON());
        await FirestoreService.saveReward(reward.toJSON());
        await FirestoreService.saveVoucher(voucher.toJSON());

        // Ledger
        if (pointsSpent > 0) {
          const noteText = `Vale Combo (-$${discountUsd.toFixed(2)} USD usando ${pointsSpent} WP) en ${reward.title} [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`;
          FirestoreService.addLedgerEntry(this.currentUser.uid, {
            id: "TX-" + Date.now(),
            type: "DEBIT_REWARD",
            delta: -pointsSpent,
            balance_after: this.currentUser.wiredPoints,
            ref_id: voucher.voucherCode,
            note: noteText,
            created_at: new Date().toISOString()
          });
        } else {
          FirestoreService.addLedgerEntry(this.currentUser.uid, {
            id: "TX-" + Date.now(),
            type: "PURCHASE_VOUCHER",
            delta: 0,
            balance_after: this.currentUser.wiredPoints,
            ref_id: voucher.voucherCode,
            note: `Vale de Compra Mostrador (Combo Completo) en ${reward.title} [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`,
            created_at: new Date().toISOString()
          });
        }

        await this.refreshUserData();
        await this.refreshCatalog();

        voucher.voucher = voucher;
        voucher.success = true;
        voucher.newBalance = this.currentUser.wiredPoints;
        voucher.cost = pointsSpent;
        return voucher;
      }

      // ========================================================
      // COMPRA INDIVIDUAL DE UN ÍTEM DEL COMBO (B o C)
      // ========================================================
      const selectedItem = comboItems.find(it => String(it.id) === String(selectedItemId));
      if (!selectedItem) {
        throw new Error("Artículo [" + selectedItemId + "] no encontrado en el combo.");
      }

      const itemPrice = Number(selectedItem.residualPriceUsd !== undefined ? selectedItem.residualPriceUsd : (selectedItem.priceUsd || 0));
      const itemMaxDiscPct = Number(selectedItem.residualMaxDiscountPct || 0);
      const itemMaxDiscUsd = Number((itemPrice * (itemMaxDiscPct / 100)).toFixed(2));
      const itemPointsCap = Math.round(itemMaxDiscUsd * 10);
      const userPoints = Math.max(0, this.currentUser.wiredPoints || 0);
      const maxUsable = Math.min(userPoints, itemPointsCap);

      let pointsSpent = 0;
      if (pointsToApply !== null && pointsToApply !== undefined) {
        const rawPts = Number(pointsToApply);
        pointsSpent = Number.isFinite(rawPts) ? Math.max(0, Math.min(rawPts, maxUsable)) : 0;
      } else {
        pointsSpent = maxUsable;
      }

      const usdPerPoint = (itemPointsCap > 0 && itemMaxDiscUsd > 0)
        ? (itemMaxDiscUsd / itemPointsCap)
        : 0;
      const discountUsd = Number(Math.min(itemMaxDiscUsd, pointsSpent * usdPerPoint).toFixed(2));
      const cashToPayUsd = Math.max(0, Number((itemPrice - discountUsd).toFixed(2)));

      if (pointsSpent > 0) {
        this.currentUser.deductPoints(pointsSpent);
      }

      const remainingItems = comboItems.filter(it => String(it.id) !== String(selectedItemId));
      const originalItemsSnapshot = comboItems.map(it => ({ ...it }));

      let voucher = null;

      if (comboItems.length > 2) {
        // ========================================================
        // ESCENARIO B: Cascada N > 2 -> N - 1
        // ========================================================
        const comboOrigin = {
          comboId: reward.id,
          originalTitle: reward.title,
          originalPriceUsd: reward.priceUsd,
          originalPointsCost: reward.pointsCost,
          originalMaxDiscountPct: reward.maxDiscountPct,
          itemCount: comboItems.length,
          itemsSnapshot: originalItemsSnapshot,
          originalItems: originalItemsSnapshot,
          splitLevel: "N_TO_N_MINUS_1",
          purchasedItemId: selectedItem.id,
          remainingItems: remainingItems.map(it => ({ ...it })),
          timestamp: new Date().toISOString()
        };

        voucher = new VoucherModel({
          userUid: this.currentUser.uid,
          userName: this.currentUser.displayName,
          rewardId: reward.id,
          rewardTitle: `${selectedItem.title} (de Combo: ${reward.title})`,
          rewardType: "PARTIAL_DISCOUNT",
          imageUrl: selectedItem.imageUrl || reward.imageUrl || "",
          pointsSpent: pointsSpent,
          priceUsd: itemPrice,
          discountUsd: discountUsd,
          cashToPayUsd: cashToPayUsd,
          comboOrigin: comboOrigin,
          purchasedItem: { ...selectedItem },
          expiresAt: (cashToPayUsd > 0)
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : null
        });

        // Extraer ítem del combo y recalcular precio
        reward.comboData = {
          ...(reward.comboData || {}),
          items: remainingItems
        };
        const originalSavings = reward.getComboSavings ? reward.getComboSavings() : { savingsPct: 20 };
        const savingsPct = originalSavings.savingsPct > 0 ? originalSavings.savingsPct : 20;
        const remSumUsd = Number(remainingItems.reduce((acc, it) => acc + Number(it.priceUsd || 0), 0).toFixed(2));
        const newComboPrice = Number((remSumUsd * (1 - savingsPct / 100)).toFixed(2));

        reward.priceUsd = newComboPrice;
        reward.maxDiscountPct = reward.maxDiscountPct || savingsPct;
        reward.maxDiscountUsd = Number((reward.priceUsd * (reward.maxDiscountPct / 100)).toFixed(2));
        reward.pointsCost = Math.round(reward.maxDiscountUsd * 10);
        reward.stock = 1;
        reward.status = "ACTIVE";
        reward.updatedAt = new Date().toISOString();

        await FirestoreService.saveReward(reward.toJSON());
      } else {
        // ========================================================
        // ESCENARIO C: Cascada N = 2 -> 1 Standalone
        // ========================================================
        const companionItem = remainingItems[0];
        const standaloneRewardId = "REW-STANDALONE-" + companionItem.id + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

        const comboOrigin = {
          comboId: reward.id,
          originalTitle: reward.title,
          originalPriceUsd: reward.priceUsd,
          originalPointsCost: reward.pointsCost,
          originalMaxDiscountPct: reward.maxDiscountPct,
          itemCount: 2,
          itemsSnapshot: originalItemsSnapshot,
          originalItems: originalItemsSnapshot,
          splitLevel: "N_EQUALS_2_TO_STANDALONE",
          purchasedItemId: selectedItem.id,
          companionItemId: companionItem.id,
          companionRewardIds: [standaloneRewardId],
          standaloneRewardId: standaloneRewardId,
          remainingItems: [{ ...companionItem }],
          timestamp: new Date().toISOString()
        };

        voucher = new VoucherModel({
          userUid: this.currentUser.uid,
          userName: this.currentUser.displayName,
          rewardId: reward.id,
          rewardTitle: `${selectedItem.title} (de Combo: ${reward.title})`,
          rewardType: "PARTIAL_DISCOUNT",
          imageUrl: selectedItem.imageUrl || reward.imageUrl || "",
          pointsSpent: pointsSpent,
          priceUsd: itemPrice,
          discountUsd: discountUsd,
          cashToPayUsd: cashToPayUsd,
          comboOrigin: comboOrigin,
          purchasedItem: { ...selectedItem },
          expiresAt: (cashToPayUsd > 0)
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : null
        });

        // 1. Desactivar / Agotar combo original
        reward.stock = 0;
        reward.status = "SOLD_OUT";
        reward.soldOutAt = new Date().toISOString();
        reward.soldOutReason = "DISSOLVED_TO_STANDALONE";
        reward.updatedAt = new Date().toISOString();
        await FirestoreService.saveReward(reward.toJSON());

        // 2. Publicar artículo remanente como producto regular standalone
        const compPriceUsd = Number(companionItem.residualPriceUsd !== undefined ? companionItem.residualPriceUsd : (companionItem.priceUsd || 0));
        const compMaxDiscPct = Number(companionItem.residualMaxDiscountPct || 10);
        const compMaxDiscUsd = Number((compPriceUsd * (compMaxDiscPct / 100)).toFixed(2));
        const compPointsCost = Math.round(compMaxDiscUsd * 10);
        const compCashToPayUsd = Number((compPriceUsd - compMaxDiscUsd).toFixed(2));

        const standaloneReward = new RewardModel({
          id: standaloneRewardId,
          rewardId: standaloneRewardId,
          title: companionItem.title,
          rewardType: "PARTIAL_DISCOUNT",
          priceUsd: compPriceUsd,
          maxDiscountPct: compMaxDiscPct,
          maxDiscountUsd: compMaxDiscUsd,
          pointsCost: compPointsCost,
          cashToPayUsd: compCashToPayUsd,
          stock: 1,
          initialStock: 1,
          isUnique: true,
          status: "ACTIVE",
          imageUrl: companionItem.imageUrl || "",
          images: companionItem.imageUrl ? [companionItem.imageUrl] : [],
          description: companionItem.description || `Artículo individual remanente de combo ${reward.title}.`,
          category: reward.category || "Gaming Hardware",
          dissolvedFromCombo: {
            comboId: reward.id,
            dissolvedAt: new Date().toISOString(),
            purchasedVoucherCode: voucher.voucherCode,
            originalComboTitle: reward.title
          }
        });
        await FirestoreService.saveReward(standaloneReward.toJSON());
      }

      await FirestoreService.saveUser(this.currentUser.toJSON());
      await FirestoreService.saveVoucher(voucher.toJSON());

      // Ledger
      if (pointsSpent > 0) {
        const noteText = `Vale Descuento (-$${discountUsd.toFixed(2)} USD usando ${pointsSpent} WP) en ${selectedItem.title} (Combo: ${reward.title}) [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`;
        FirestoreService.addLedgerEntry(this.currentUser.uid, {
          id: "TX-" + Date.now(),
          type: "DEBIT_REWARD",
          delta: -pointsSpent,
          balance_after: this.currentUser.wiredPoints,
          ref_id: voucher.voucherCode,
          note: noteText,
          created_at: new Date().toISOString()
        });
      } else {
        FirestoreService.addLedgerEntry(this.currentUser.uid, {
          id: "TX-" + Date.now(),
          type: "PURCHASE_VOUCHER",
          delta: 0,
          balance_after: this.currentUser.wiredPoints,
          ref_id: voucher.voucherCode,
          note: `Vale de Compra Mostrador en ${selectedItem.title} (Combo: ${reward.title}) [Paga $${cashToPayUsd.toFixed(2)} USD en mostrador]`,
          created_at: new Date().toISOString()
        });
      }

      await this.refreshUserData();
      await this.refreshCatalog();

      voucher.voucher = voucher;
      voucher.success = true;
      voucher.newBalance = this.currentUser.wiredPoints;
      voucher.cost = pointsSpent;
      return voucher;
    }

    // ========================================================
    // FLUJO REGULAR (Productos Estándar: PARTIAL_DISCOUNT o FREE_REWARD)
    // ========================================================
    const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount());

    let pointsSpent = 0;
    let discountUsd = 0;
    let cashToPayUsd = reward.priceUsd || 0;

    if (isPartial) {
      const userPoints = Math.max(0, this.currentUser.wiredPoints || 0);
      const maxCapPoints = reward.pointsCost || 0;
      const maxUsable = Math.min(userPoints, maxCapPoints);

      if (pointsToApply !== null && pointsToApply !== undefined) {
        const rawPts = Number(pointsToApply);
        pointsSpent = Number.isFinite(rawPts) ? Math.max(0, Math.min(rawPts, maxUsable)) : 0;
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
      expiresAt: (cashToPayUsd > 0)
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

  async restoreVoucherInventory(voucher) {
    if (!voucher) return { reconstitutedCombo: false, createdStandalone: false };

    // Caso 1: Vale con snapshot comboOrigin (compra individual desglosada)
    if (typeof voucher.isSplitComboItemVoucher === "function" && voucher.isSplitComboItemVoucher()) {
      const origin = voucher.comboOrigin;
      if (!origin) return { reconstitutedCombo: false, createdStandalone: false };

      // Subcaso A: Split N = 2 -> 1 Standalone
      if (origin.splitLevel === "N_EQUALS_2_TO_STANDALONE" || origin.standaloneRewardId) {
        const standaloneId = origin.standaloneRewardId;
        const catalogComp = (this.catalog || []).find(r =>
          r.id === standaloneId ||
          (origin.companionItemId && r.id.includes(origin.companionItemId)) ||
          (r.dissolvedFromCombo && r.dissolvedFromCombo.comboId === origin.comboId)
        );
        const rawComp = standaloneId ? await FirestoreService.getReward(standaloneId) : null;

        // Si el compañero en catálogo o en Firestore está agotado o vendido
        const isCompInCatalogAvailable = catalogComp
          ? (typeof catalogComp.isAvailable === "function" ? catalogComp.isAvailable() : (catalogComp.stock > 0 && catalogComp.status === "ACTIVE"))
          : true;
        const isCompInDbAvailable = rawComp
          ? (rawComp.stock > 0 && rawComp.status === "ACTIVE")
          : true;

        const isCompAvailable = Boolean(catalogComp || rawComp) && isCompInCatalogAvailable && isCompInDbAvailable;

        if (isCompAvailable) {
          // 1. Eliminar producto standalone del catálogo
          await FirestoreService.deleteReward(standaloneId);
          this.catalog = (this.catalog || []).filter(r => r.id !== standaloneId);

          // 2. Restaurar combo original
          const rawCombo = origin.comboId ? await FirestoreService.getReward(origin.comboId) : null;
          let combo = rawCombo ? new RewardModel(rawCombo) : null;
          if (combo) {
            combo.stock = 1;
            combo.status = "ACTIVE";
            combo.soldOutAt = null;
            combo.soldOutReason = "";
            combo.comboData = {
              ...(combo.comboData || {}),
              items: origin.originalItems || origin.itemsSnapshot || combo.comboData?.items || []
            };
            if (origin.originalPriceUsd !== undefined) combo.priceUsd = origin.originalPriceUsd;
            if (origin.originalPointsCost !== undefined) combo.pointsCost = origin.originalPointsCost;
            if (origin.originalMaxDiscountPct !== undefined) combo.maxDiscountPct = origin.originalMaxDiscountPct;
            combo.updatedAt = new Date().toISOString();
            await FirestoreService.saveReward(combo.toJSON());
            return { reconstitutedCombo: true, createdStandalone: false };
          }
        }

        // Si el compañero ya fue vendido en memoria, persistir su estado de agotado
        if (catalogComp && (catalogComp.stock === 0 || catalogComp.status === "SOLD_OUT")) {
          await FirestoreService.saveReward(catalogComp.toJSON ? catalogComp.toJSON() : catalogComp);
        }

        // Si el compañero ya fue vendido: asegurar que el combo permanece SOLD_OUT y publicar devuelto como standalone
        const rawCombo = origin.comboId ? await FirestoreService.getReward(origin.comboId) : null;
        let combo = rawCombo ? new RewardModel(rawCombo) : null;
        if (combo) {
          combo.stock = 0;
          combo.status = "SOLD_OUT";
          combo.soldOutReason = "DISSOLVED_COMPANION_SOLD";
          await FirestoreService.saveReward(combo.toJSON());
        }

        const returnedItem = voucher.purchasedItem || (origin.originalItems || []).find(it => it.id === origin.purchasedItemId);
        const itemTitle = returnedItem?.title || voucher.rewardTitle;
        const itemPrice = Number(returnedItem?.residualPriceUsd !== undefined ? returnedItem.residualPriceUsd : (voucher.priceUsd || 0));
        const itemMaxDiscPct = Number(returnedItem?.residualMaxDiscountPct || 10);
        const itemMaxDiscUsd = Number((itemPrice * (itemMaxDiscPct / 100)).toFixed(2));
        const itemPointsCost = Math.round(itemMaxDiscUsd * 10);
        const newStandaloneId = "REW-STANDALONE-" + (returnedItem?.id || origin.purchasedItemId || "ITEM") + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

        const newReward = new RewardModel({
          id: newStandaloneId,
          rewardId: newStandaloneId,
          title: itemTitle,
          rewardType: "PARTIAL_DISCOUNT",
          priceUsd: itemPrice,
          maxDiscountPct: itemMaxDiscPct,
          maxDiscountUsd: itemMaxDiscUsd,
          pointsCost: itemPointsCost,
          cashToPayUsd: Number((itemPrice - itemMaxDiscUsd).toFixed(2)),
          stock: 1,
          initialStock: 1,
          isUnique: true,
          status: "ACTIVE",
          imageUrl: returnedItem?.imageUrl || voucher.imageUrl || "",
          images: (returnedItem?.imageUrl || voucher.imageUrl) ? [returnedItem?.imageUrl || voucher.imageUrl] : [],
          description: returnedItem?.description || `Artículo devuelto de combo [${origin.originalTitle || origin.comboId}].`,
          category: "Gaming Hardware",
          dissolvedFromCombo: {
            comboId: origin.comboId,
            reconstitutedAt: new Date().toISOString(),
            voucherCode: voucher.voucherCode
          }
        });
        await FirestoreService.saveReward(newReward.toJSON());
        return { reconstitutedCombo: false, createdStandalone: true };
      }

      // Subcaso B: Split N > 2 -> N - 1
      if (origin.splitLevel === "N_TO_N_MINUS_1") {
        const rawCombo = origin.comboId ? await FirestoreService.getReward(origin.comboId) : null;
        let combo = rawCombo ? new RewardModel(rawCombo) : null;

        // Si el combo sigue activo
        if (combo && combo.status === "ACTIVE") {
          const currentItems = combo.getComboItems ? combo.getComboItems() : (combo.comboData?.items || []);
          const returnedItem = voucher.purchasedItem || (origin.originalItems || []).find(it => it.id === origin.purchasedItemId);
          if (returnedItem && !currentItems.some(it => String(it.id) === String(returnedItem.id))) {
            const updatedItems = [...currentItems, returnedItem];
            combo.comboData = { ...(combo.comboData || {}), items: updatedItems };
            // Recalcular precio combo
            const savings = combo.getComboSavings ? combo.getComboSavings() : { savingsPct: 20 };
            const sumUsd = updatedItems.reduce((acc, it) => acc + Number(it.priceUsd || 0), 0);
            const savingsPct = savings.savingsPct > 0 ? savings.savingsPct : 20;
            combo.priceUsd = Number((sumUsd * (1 - savingsPct / 100)).toFixed(2));
            combo.maxDiscountUsd = Number((combo.priceUsd * ((combo.maxDiscountPct || 20) / 100)).toFixed(2));
            combo.pointsCost = Math.round(combo.maxDiscountUsd * 10);
            combo.stock = 1;
            combo.status = "ACTIVE";
            combo.updatedAt = new Date().toISOString();
            await FirestoreService.saveReward(combo.toJSON());
            return { reconstitutedCombo: true, createdStandalone: false };
          }
        }

        // Si el combo fue vendido o disuelto, publicar como standalone
        const returnedItem = voucher.purchasedItem || (origin.originalItems || []).find(it => it.id === origin.purchasedItemId);
        const itemPrice = Number(returnedItem?.residualPriceUsd !== undefined ? returnedItem.residualPriceUsd : (voucher.priceUsd || 0));
        const itemMaxDiscPct = Number(returnedItem?.residualMaxDiscountPct || 10);
        const itemMaxDiscUsd = Number((itemPrice * (itemMaxDiscPct / 100)).toFixed(2));
        const newStandaloneId = "REW-STANDALONE-" + (returnedItem?.id || "ITEM") + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newReward = new RewardModel({
          id: newStandaloneId,
          rewardId: newStandaloneId,
          title: returnedItem?.title || voucher.rewardTitle,
          rewardType: "PARTIAL_DISCOUNT",
          priceUsd: itemPrice,
          maxDiscountPct: itemMaxDiscPct,
          maxDiscountUsd: itemMaxDiscUsd,
          pointsCost: Math.round(itemMaxDiscUsd * 10),
          cashToPayUsd: Number((itemPrice - itemMaxDiscUsd).toFixed(2)),
          stock: 1,
          initialStock: 1,
          isUnique: true,
          status: "ACTIVE",
          imageUrl: returnedItem?.imageUrl || voucher.imageUrl || "",
          images: (returnedItem?.imageUrl || voucher.imageUrl) ? [returnedItem?.imageUrl || voucher.imageUrl] : [],
          description: returnedItem?.description || `Artículo devuelto de combo.`,
          category: "Gaming Hardware"
        });
        await FirestoreService.saveReward(newReward.toJSON());
        return { reconstitutedCombo: false, createdStandalone: true };
      }
    }

    // Caso 2: Vale de combo completo (isFullComboVoucher())
    if (typeof voucher.isFullComboVoucher === "function" && voucher.isFullComboVoucher()) {
      let combo = (this.catalog || []).find(r => r.id === voucher.rewardId || (voucher.rewardTitle && r.title === voucher.rewardTitle));
      if (!combo && voucher.rewardId) {
        const rawCombo = await FirestoreService.getReward(voucher.rewardId);
        if (rawCombo) combo = new RewardModel(rawCombo);
      }
      if (combo) {
        combo.stock = Math.max(1, (combo.stock || 0) + 1);
        combo.status = "ACTIVE";
        combo.soldOutAt = null;
        combo.soldOutReason = "";
        combo.updatedAt = new Date().toISOString();
        await FirestoreService.saveReward(combo.toJSON());
        const catIdx = (this.catalog || []).findIndex(r => r.id === combo.id);
        if (catIdx !== -1) {
          this.catalog[catIdx] = combo;
        } else {
          this.catalog.push(combo);
        }
        return { reconstitutedCombo: true, createdStandalone: false };
      }
    }

    // Caso 3: Recompensa estándar normal (incrementStock)
    let reward = (this.catalog || []).find(r => r.id === voucher.rewardId || (voucher.rewardTitle && r.title === voucher.rewardTitle));
    if (!reward && voucher.rewardId) {
      const rawReward = await FirestoreService.getReward(voucher.rewardId);
      if (rawReward) reward = new RewardModel(rawReward);
    }
    if (!reward) {
      const allRewards = typeof FirestoreService.getAllRewards === "function" ? FirestoreService.getAllRewards() : [];
      const match = allRewards.find(r => r.id === voucher.rewardId || (voucher.rewardTitle && r.title === voucher.rewardTitle));
      if (match) reward = new RewardModel(match);
    }
    if (reward) {
      if (typeof reward.incrementStock === "function") {
        reward.incrementStock();
      } else {
        reward.stock = (reward.stock || 0) + 1;
        if (reward.stock > 0) {
          reward.status = "ACTIVE";
          reward.soldOutAt = null;
          reward.soldOutReason = "";
        }
      }
      reward.updatedAt = new Date().toISOString();
      await FirestoreService.saveReward(reward.toJSON());
      const catIdx = (this.catalog || []).findIndex(r => r.id === reward.id);
      if (catIdx !== -1) {
        this.catalog[catIdx] = reward;
      } else {
        this.catalog.push(reward);
      }
    }
    return { reconstitutedCombo: false, createdStandalone: false };
  }

  async cancelVoucher(voucherCode) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión para gestionar tus vales.");
    }

    const cleanCode = (voucherCode || "").trim().toUpperCase();
    if (!cleanCode) {
      throw new Error("Código de vale inválido o no proporcionado.");
    }
    if (!this._cancellingVouchers) {
      this._cancellingVouchers = new Set();
    }
    if (this._cancellingVouchers.has(cleanCode)) {
      throw new Error("La cancelación de este vale ya está en proceso.");
    }
    this._cancellingVouchers.add(cleanCode);

    try {
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

      // Verificación de integridad contable anti-burlas:
      const existingLedger = FirestoreService.getLedger(this.currentUser.uid);
      const isAlreadyRefundedInLedger = (existingLedger || []).some(entry =>
        (entry.type === "REFUND_CANCEL" || entry.type === "CANCEL_PURCHASE") &&
        (entry.ref_id === cleanCode || (entry.note && entry.note.includes(cleanCode)))
      );
      if (isAlreadyRefundedInLedger) {
        voucher.markCancelled(this.currentUser.uid);
        await FirestoreService.saveVoucher(voucher.toJSON());
        throw new Error("Este vale ya fue cancelado y su reembolso ya fue procesado.");
      }

      // Marcar sincrónicamente en memoria antes de cualquier await para bloquear llamadas concurrentes
      voucher.markCancelled(this.currentUser.uid);

      // Sincronizar inmediatamente en this.vouchers y en el snapshot local
      (this.vouchers || []).forEach(v => {
        if ((v.voucherCode || "").trim().toUpperCase() === cleanCode) {
          v.markCancelled(this.currentUser.uid);
        }
      });
      const snap = FirestoreService.getSnapshot();
      if (snap && snap.vouchers) {
        if (snap.vouchers[cleanCode]) {
          snap.vouchers[cleanCode].status = "CANCELLED";
          snap.vouchers[cleanCode].cancelledAt = new Date().toISOString();
          snap.vouchers[cleanCode].cancelledBy = this.currentUser.uid;
        }
        for (const [k, v] of Object.entries(snap.vouchers)) {
          if ((v.voucherCode || v.voucher_code || "").trim().toUpperCase() === cleanCode) {
            snap.vouchers[k].status = "CANCELLED";
            snap.vouchers[k].cancelledAt = new Date().toISOString();
            snap.vouchers[k].cancelledBy = this.currentUser.uid;
          }
        }
        FirestoreService.saveSnapshot(snap);
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

      // 2. Restaurar stock o reconstituir combo en catálogo
      await this.restoreVoucherInventory(voucher);

      // 3. Persistir vale cancelado
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
    } finally {
      this._cancellingVouchers.delete(cleanCode);
    }
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
