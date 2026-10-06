/* Model: Vale de Canje Anti-Fraude */
export class VoucherModel {
  constructor(data = {}) {
    const isPreOrder = data.rewardType === "PREORDER_RESERVATION" ||
      data.reward_type === "PREORDER_RESERVATION" ||
      data.status === "RESERVED_UPCOMING" ||
      (typeof data.voucherCode === "string" && data.voucherCode.startsWith("RES-")) ||
      (typeof data.voucher_code === "string" && data.voucher_code.startsWith("RES-"));

    const defaultCode = (isPreOrder ? "RES-" : "CANJE-") + Math.floor(1000 + Math.random() * 9000);
    this.voucherCode = data.voucherCode || data.voucher_code || defaultCode;
    this.userUid = data.userUid || data.user_uid || data.userId || data.user_id || "";
    this.userId = this.userUid;
    this.userName = data.userName || data.user_name || data.userDisplayName || data.user_display_name || "";
    this.userDisplayName = this.userName;
    this.rewardId = data.rewardId || data.reward_id || "";
    this.rewardTitle = data.rewardTitle || data.reward_title || "";
    this.rewardType = data.rewardType || data.reward_type || (isPreOrder ? "PREORDER_RESERVATION" : "FREE_REWARD");
    this.imageUrl = data.imageUrl || data.image_url || data.rewardImageUrl || data.reward_image_url || "";
    this.pointsSpent = isPreOrder ? 0 : Number(data.pointsSpent || data.points_spent || data.pointsCost || data.points_cost || 0);
    this.pointsCost = this.pointsSpent;
    this.priceUsd = Number(data.priceUsd || data.price_usd || 0);
    this.discountUsd = Number(data.discountUsd || data.discount_usd || 0);
    this.cashToPayUsd = Number(data.cashToPayUsd || data.cash_to_pay_usd || 0);
    this.status = data.status || (isPreOrder ? "RESERVED_UPCOMING" : "PENDING_DELIVERY");
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();

    // Información del titular para reservas de preventa
    this.customerInfo = data.customerInfo || data.customer_info || (data.cedula ? {
      cedula: data.cedula,
      fullName: data.fullName || data.userName || "",
      phone: data.phone || "",
      email: data.email || ""
    } : null);

    this.estimatedArrival = data.estimatedArrival || data.estimated_arrival || null;

    // Estado de pago en efectivo para compras comerciales
    this.isPaid = Boolean(data.isPaid || data.is_paid || this.status === "PAID" || data.paidAt || data.paid_at);
    this.paidAt = data.paidAt || data.paid_at || null;
    this.paidBy = data.paidBy || data.paid_by || null;
    this.penaltyPoints = Number(data.penaltyPoints || data.penalty_points || 0);

    // Lógica estricta de expiración:
    // 1. Recompensas 100% gratis (cashToPayUsd === 0 y no es descuento): NUNCA expiran (expiresAt = null siempre)
    // 2. Compras comerciales ya pagadas (isPaid === true): NUNCA expiran (expiresAt = null)
    // 3. Reservas de preventa (PREORDER_RESERVATION / RESERVED_UPCOMING): NUNCA expiran antes del arribo (expiresAt = null)
    // 4. Compras comerciales pendientes de pago (cashToPayUsd > 0 o PARTIAL_DISCOUNT, y !isPaid y !isPreOrder):
    //    Plazo máximo e inamovible de 3 días (72 horas) desde la fecha de creación (createdAt).
    const isCommercial = !isPreOrder && (this.rewardType === "PARTIAL_DISCOUNT" || this.cashToPayUsd > 0);
    if (!isCommercial || this.isPaid || isPreOrder) {
      this.expiresAt = null;
    } else {
      const createdMs = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();
      const maxAllowedExpiryMs = createdMs + (3 * 24 * 60 * 60 * 1000); // 72 horas exactas
      const rawExp = data.expiresAt || data.expires_at;
      if (rawExp) {
        const rawMs = new Date(rawExp).getTime();
        // Si la fecha guardada previamente supera los 3 días desde la creación (ej. registros con 7 días), se recorta estrictamente a 3 días
        this.expiresAt = new Date(Math.min(rawMs, maxAllowedExpiryMs)).toISOString();
      } else {
        this.expiresAt = new Date(maxAllowedExpiryMs).toISOString();
      }
    }

    this.deliveredAt = data.deliveredAt || data.delivered_at || null;
    this.deliveredBy = data.deliveredBy || data.delivered_by || null;
    this.cancelledAt = data.cancelledAt || data.cancelled_at || null;
    this.cancelledBy = data.cancelledBy || data.cancelled_by || null;
  }

  isPreOrder() {
    return this.rewardType === "PREORDER_RESERVATION" || this.status === "RESERVED_UPCOMING";
  }

  isDelivered() {
    return this.status === "DELIVERED" || Boolean(this.deliveredAt);
  }

  isCancelled() {
    return this.status === "CANCELLED" || Boolean(this.cancelledAt);
  }

  isPaidVoucher() {
    return Boolean(this.isPaid || this.status === "PAID" || this.paidAt);
  }

  isCommercial() {
    if (this.isPreOrder()) return false;
    return this.rewardType === "PARTIAL_DISCOUNT" || this.cashToPayUsd > 0;
  }

  isPartialDiscount() {
    return this.rewardType === "PARTIAL_DISCOUNT";
  }

  isExpired() {
    if (this.status === "EXPIRED") return true;
    if (this.isDelivered() || this.isCancelled()) return false;
    if (this.isPreOrder()) return false; // Reservas de preventa NUNCA caducan antes del arribo
    if (!this.isCommercial()) return false; // Los canjes 100% gratis NUNCA caducan
    if (this.isPaidVoucher()) return false; // Una vez pagado en efectivo, NUNCA caduca
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  canBeCancelled() {
    if (this.isDelivered() || this.isCancelled() || this.isExpired()) return false;
    if (this.status === "EXPIRED") return false;
    // Si es comercial y ya fue pagado, no puede cancelarse automáticamente
    if (this.isCommercial() && this.isPaidVoucher()) return false;
    return true;
  }

  markPaid(adminUid = "admin_melty") {
    this.status = "PAID";
    this.isPaid = true;
    this.paidAt = new Date().toISOString();
    this.paidBy = adminUid;
    this.expiresAt = null; // Eliminación definitiva de cuenta regresiva al pagar
  }

  markDelivered(cashierUid = "admin_melty") {
    this.status = "DELIVERED";
    this.deliveredAt = new Date().toISOString();
    this.deliveredBy = cashierUid;
    if (this.isCommercial() && !this.isPaid) {
      this.isPaid = true;
      this.paidAt = this.deliveredAt;
      this.paidBy = cashierUid;
    }
  }

  markCancelled(byUid = "client") {
    this.status = "CANCELLED";
    this.cancelledAt = new Date().toISOString();
    this.cancelledBy = byUid;
  }

  markExpired(penalty = 0) {
    this.status = "EXPIRED";
    this.penaltyPoints = penalty;
  }

  toJSON() {
    return {
      voucher_code: this.voucherCode,
      voucherCode: this.voucherCode,
      user_uid: this.userUid,
      userUid: this.userUid,
      user_name: this.userName,
      userName: this.userName,
      userDisplayName: this.userName,
      customer_info: this.customerInfo,
      customerInfo: this.customerInfo,
      reward_id: this.rewardId,
      rewardId: this.rewardId,
      reward_title: this.rewardTitle,
      rewardTitle: this.rewardTitle,
      reward_type: this.rewardType,
      rewardType: this.rewardType,
      image_url: this.imageUrl,
      imageUrl: this.imageUrl,
      points_spent: this.pointsSpent,
      pointsSpent: this.pointsSpent,
      points_cost: this.pointsSpent,
      pointsCost: this.pointsSpent,
      price_usd: this.priceUsd,
      priceUsd: this.priceUsd,
      discount_usd: this.discountUsd,
      discountUsd: this.discountUsd,
      cash_to_pay_usd: this.cashToPayUsd,
      cashToPayUsd: this.cashToPayUsd,
      status: this.status,
      is_paid: this.isPaid,
      isPaid: this.isPaid,
      paid_at: this.paidAt,
      paid_by: this.paidBy,
      penalty_points: this.penaltyPoints,
      estimated_arrival: this.estimatedArrival,
      estimatedArrival: this.estimatedArrival,
      created_at: this.createdAt,
      createdAt: this.createdAt,
      expires_at: this.expiresAt,
      expiresAt: this.expiresAt,
      delivered_at: this.deliveredAt,
      delivered_by: this.deliveredBy,
      cancelled_at: this.cancelledAt,
      cancelled_by: this.cancelledBy
    };
  }
}
