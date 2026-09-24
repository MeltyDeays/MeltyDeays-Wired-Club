/* Model: Socio / Cliente de The Wired Club */
export class UserModel {
  constructor(data = {}) {
    this.uid = data.uid || "";
    this.displayName = data.displayName || "Nuevo Socio";
    this.phone = data.phone || "";
    this.pin = data.pin || "1234";
    this.memberCode = data.memberCode || "MC-2026-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    this.wiredPoints = Number(data.wiredPoints || data.wired_points || 0);
    this.lifetimePoints = Number(data.lifetimePoints || data.lifetime_points || 0);
    this.tier = data.tier || this.calculateTier();
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
  }

  calculateTier() {
    if (this.lifetimePoints >= 5000) return "DEUS_EX_WIRED";
    if (this.lifetimePoints >= 2000) return "CYBER_ELITE";
    if (this.lifetimePoints >= 500) return "TECH_RUNNER";
    return "NAVI_USER";
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
      phone: this.phone,
      pin: this.pin,
      member_code: this.memberCode,
      wired_points: this.wiredPoints,
      lifetime_points: this.lifetimePoints,
      tier: this.tier,
      created_at: this.createdAt
    };
  }
}
