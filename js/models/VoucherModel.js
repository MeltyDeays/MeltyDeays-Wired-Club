/* Model: Vale de Canje Anti-Fraude */
export class VoucherModel {
  constructor(data = {}) {
    this.voucherCode = data.voucherCode || data.voucher_code || "CANJE-" + Math.floor(1000 + Math.random() * 9000);
    this.userUid = data.userUid || data.user_uid || "";
    this.userName = data.userName || data.user_name || "";
    this.rewardId = data.rewardId || data.reward_id || "";
    this.rewardTitle = data.rewardTitle || data.reward_title || "";
    this.pointsSpent = Number(data.pointsSpent || data.points_spent || 0);
    this.status = data.status || "PENDING_DELIVERY"; // PENDING_DELIVERY | DELIVERED
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.expiresAt = data.expiresAt || data.expires_at || new Date(Date.now() + 7 * 86400000).toISOString();
    this.deliveredAt = data.deliveredAt || data.delivered_at || null;
    this.deliveredBy = data.deliveredBy || data.delivered_by || null;
  }

  isDelivered() {
    return this.status === "DELIVERED";
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  markDelivered(cashierUid = "admin_melty") {
    this.status = "DELIVERED";
    this.deliveredAt = new Date().toISOString();
    this.deliveredBy = cashierUid;
  }

  toJSON() {
    return {
      voucher_code: this.voucherCode,
      user_uid: this.userUid,
      user_name: this.userName,
      reward_id: this.rewardId,
      reward_title: this.rewardTitle,
      points_spent: this.pointsSpent,
      status: this.status,
      created_at: this.createdAt,
      expires_at: this.expiresAt,
      delivered_at: this.deliveredAt,
      delivered_by: this.deliveredBy
    };
  }
}
