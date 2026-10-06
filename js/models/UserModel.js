/* Model: Socio / Cliente de The Wired Club */
export class UserModel {
  constructor(data = {}) {
    this.uid = data.uid || "";
    this.displayName = data.displayName || data.display_name || data.name || "Nuevo Socio";
    this.phone = data.phone || "";
    this.pin = data.pin || "1234";
    this.memberCode = data.memberCode || data.member_code || ("MC-2026-" + Math.random().toString(36).substring(2, 6).toUpperCase());
    this.wiredPoints = Number(data.wiredPoints !== undefined ? data.wiredPoints : (data.wired_points || 0));
    this.lifetimePoints = Number(data.lifetimePoints !== undefined ? data.lifetimePoints : (data.lifetime_points || 0));
    this.tier = data.tier || this.calculateTier();
    this.status = data.status || "ACTIVE";
    this.currency = (data.currency || data.preferredCurrency || data.preferred_currency || "USD").toUpperCase() === "NIO" ? "NIO" : "USD";
    this.avatarUrl = data.avatarUrl || data.avatar_url || data.photoUrl || "";
    this.bannerUrl = data.bannerUrl || data.banner_url || data.coverUrl || "";
    this.notifications = Array.isArray(data.notifications) ? data.notifications : [];
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
  }

  calculateTier() {
    if (this.lifetimePoints >= 5000) return "DEUS_EX_WIRED";
    if (this.lifetimePoints >= 2000) return "CYBER_ELITE";
    if (this.lifetimePoints >= 500) return "TECH_RUNNER";
    return "NAVI_USER";
  }

  get pointsBalance() {
    return this.wiredPoints;
  }

  set pointsBalance(val) {
    this.wiredPoints = Number(val) || 0;
  }

  isBanned() {
    return this.status === "BANNED";
  }

  setCurrency(curr) {
    this.currency = (curr || "").toUpperCase() === "NIO" ? "NIO" : "USD";
  }

  addPoints(points) {
    const p = Number(points);
    this.wiredPoints += p;
    this.lifetimePoints += p;
    this.tier = this.calculateTier();
  }

  hasEnoughPoints(cost) {
    return this.wiredPoints >= Number(cost);
  }

  deductPoints(cost) {
    const c = Number(cost);
    if (!this.hasEnoughPoints(c)) throw new Error("Puntos insuficientes");
    this.wiredPoints -= c;
  }

  toJSON() {
    return {
      uid: this.uid,
      displayName: this.displayName,
      display_name: this.displayName,
      phone: this.phone,
      pin: this.pin,
      memberCode: this.memberCode,
      member_code: this.memberCode,
      wiredPoints: this.wiredPoints,
      wired_points: this.wiredPoints,
      lifetimePoints: this.lifetimePoints,
      lifetime_points: this.lifetimePoints,
      tier: this.tier,
      status: this.status,
      currency: this.currency,
      preferred_currency: this.currency,
      avatarUrl: this.avatarUrl,
      avatar_url: this.avatarUrl,
      bannerUrl: this.bannerUrl,
      banner_url: this.bannerUrl,
      notifications: this.notifications,
      createdAt: this.createdAt,
      created_at: this.createdAt
    };
  }
}
