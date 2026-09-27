/* Model: Vale de Canje Anti-Fraude */
export class VoucherModel {
  constructor(data = {}) {
    this.voucherCode = data.voucherCode || data.voucher_code || "CANJE-" + Math.floor(1000 + Math.random() * 9000);
    this.userUid = data.userUid || data.user_uid || data.userId || data.user_id || "";
    this.userId = this.userUid;
    this.userName = data.userName || data.user_name || data.userDisplayName || data.user_display_name || "";
    this.userDisplayName = this.userName;
    this.rewardId = data.rewardId || data.reward_id || "";
    this.rewardTitle = data.rewardTitle || data.reward_title || "";
    this.rewardType = data.rewardType || data.reward_type || "FREE_REWARD";
    this.pointsSpent = Number(data.pointsSpent || data.points_spent || data.pointsCost || data.points_cost || 0);
    this.pointsCost = this.pointsSpent;
    this.priceUsd = Number(data.priceUsd || data.price_usd || 0);
    this.discountUsd = Number(data.discountUsd || data.discount_usd || 0);
    this.cashToPayUsd = Number(data.cashToPayUsd || data.cash_to_pay_usd || 0);
    this.status = data.status || "PENDING_DELIVERY"; // PENDING_DELIVERY | DELIVERED | CANCELLED | EXPIRED
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();

    // 3 días de límite (72 horas) para compras comerciales o con descuento; sin límite para recompensas 100% gratis
    const isCommercial = this.rewardType === "PARTIAL_DISCOUNT" || this.cashToPayUsd > 0;
    if (data.expiresAt !== undefined || data.expires_at !== undefined) {
      this.expiresAt = data.expiresAt || data.expires_at || null;
    } else {
      this.expiresAt = isCommercial
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    }

    this.deliveredAt = data.deliveredAt || data.delivered_at || null;
    this.deliveredBy = data.deliveredBy || data.delivered_by || null;
    this.cancelledAt = data.cancelledAt || data.cancelled_at || null;
    this.cancelledBy = data.cancelledBy || data.cancelled_by || null;
  }

  isDelivered() {
    return this.status === "DELIVERED" || Boolean(this.deliveredAt);
  }

  isCancelled() {
    return this.status === "CANCELLED" || Boolean(this.cancelledAt);
  }

  isPartialDiscount() {
    return this.rewardType === "PARTIAL_DISCOUNT";
  }

  isExpired() {
    if (this.isDelivered() || this.isCancelled()) return false;
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  canBeCancelled() {
    return !this.isDelivered() && !this.isCancelled();
  }

  markDelivered(cashierUid = "admin_melty") {
    this.status = "DELIVERED";
    this.deliveredAt = new Date().toISOString();
    this.deliveredBy = cashierUid;
  }

  markCancelled(byUid = "client") {
    this.status = "CANCELLED";
    this.cancelledAt = new Date().toISOString();
    this.cancelledBy = byUid;
  }

  toJSON() {
    return {
      voucher_code: this.voucherCode,
      user_uid: this.userUid,
      user_name: this.userName,
      reward_id: this.rewardId,
      reward_title: this.rewardTitle,
      reward_type: this.rewardType,
      points_spent: this.pointsSpent,
      points_cost: this.pointsSpent,
      price_usd: this.priceUsd,
      discount_usd: this.discountUsd,
      cash_to_pay_usd: this.cashToPayUsd,
      status: this.status,
      created_at: this.createdAt,
      expires_at: this.expiresAt,
      delivered_at: this.deliveredAt,
      delivered_by: this.deliveredBy,
      cancelled_at: this.cancelledAt,
      cancelled_by: this.cancelledBy
    };
  }
}
