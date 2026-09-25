/* Model: Recompensa / Producto del Catálogo */
export class RewardModel {
  constructor(data = {}) {
    this.id = data.id || data.reward_id || "";
    this.title = data.title || "";
    this.rewardType = data.rewardType || data.reward_type || "FREE_REWARD"; // "FREE_REWARD" | "PARTIAL_DISCOUNT"
    this.priceUsd = Number(data.priceUsd || data.price_usd || 0);
    this.maxDiscountPct = Number(data.maxDiscountPct || data.max_discount_pct || 0);
    this.maxDiscountUsd = Number(data.maxDiscountUsd || data.max_discount_usd || 0);
    this.cashToPayUsd = Number(data.cashToPayUsd || data.cash_to_pay_usd || 0);
    this.pointsCost = Number(data.pointsCost || data.points_cost || 0);
    this.stock = Number(data.stock || 0);
    this.imageUrl = data.imageUrl || data.image_url || "";
    this.description = data.description || "";
    this.category = data.category || "Gaming Hardware";
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  isAvailable() {
    return this.stock > 0;
  }

  isPartialDiscount() {
    return this.rewardType === "PARTIAL_DISCOUNT";
  }

  decrementStock() {
    if (this.stock <= 0) throw new Error("Producto sin stock");
    this.stock -= 1;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      reward_id: this.id,
      title: this.title,
      reward_type: this.rewardType,
      price_usd: this.priceUsd,
      max_discount_pct: this.maxDiscountPct,
      max_discount_usd: this.maxDiscountUsd,
      cash_to_pay_usd: this.cashToPayUsd,
      points_cost: this.pointsCost,
      stock: this.stock,
      image_url: this.imageUrl,
      description: this.description,
      category: this.category,
      updated_at: this.updatedAt
    };
  }
}
