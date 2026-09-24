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
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error("Por favor ingresa un número de teléfono o WhatsApp válido.");
    }
    const uid = "CLIENT-" + cleanPhone.replace("+", "");
    const u = await FirestoreService.getUser(uid);

    if (!u) {
      throw new Error("No existe una cuenta registrada con este número. Selecciona la pestaña 'Nuevo Socio' para registrarte.");
    }

    if (pin && u.pin && u.pin !== pin.trim()) {
      throw new Error("El PIN de seguridad ingresado es incorrecto.");
    }

    this.currentUser = new UserModel(u);
    localStorage.setItem("melty_client_uid", uid);
    await this.refreshUserData();
    this.notify();
    return this.currentUser;
  }

  async register(displayName, phone, pin) {
    const name = displayName.trim();
    if (!name) throw new Error("Por favor ingresa tu nombre completo.");
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error("Ingresa un número de WhatsApp válido.");
    }
    const securityPin = pin ? pin.trim() : "1234";
    const uid = "CLIENT-" + cleanPhone.replace("+", "");

    const existing = await FirestoreService.getUser(uid);
    if (existing) {
      throw new Error("Este número ya está registrado. Ingresa desde la pestaña 'Ya Soy Socio'.");
    }

    const newUser = new UserModel({
      uid,
      displayName: name,
      phone: cleanPhone,
      pin: securityPin,
      wiredPoints: 0,
      lifetimePoints: 0
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

  async redeemReward(rewardId) {
    if (!this.currentUser) {
      throw new Error("Debes iniciar sesión para canjear recompensas.");
    }

    const reward = this.catalog.find(r => r.id === rewardId);
    if (!reward) throw new Error("Recompensa no encontrada.");
    if (!reward.isAvailable()) throw new Error("Producto temporalmente agotado.");

    if (!this.currentUser.hasEnoughPoints(reward.pointsCost)) {
      throw new Error("Puntos insuficientes. Requieres " + reward.pointsCost + " WP.");
    }

    // Descontar puntos y stock
    this.currentUser.deductPoints(reward.pointsCost);
    reward.decrementStock();

    const voucher = new VoucherModel({
      userUid: this.currentUser.uid,
      userName: this.currentUser.displayName,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsCost
    });

    await FirestoreService.saveUser(this.currentUser.toJSON());
    await FirestoreService.saveReward(reward.toJSON());
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Ledger
    const entry = {
      id: "TX-" + Date.now(),
      type: "DEBIT_REWARD",
      delta: -reward.pointsCost,
      balance_after: this.currentUser.wiredPoints,
      ref_id: voucher.voucherCode,
      note: "Canje de " + reward.title,
      created_at: new Date().toISOString()
    };
    FirestoreService.addLedgerEntry(this.currentUser.uid, entry);

    await this.refreshUserData();
    await this.refreshCatalog();

    return voucher;
  }
}
