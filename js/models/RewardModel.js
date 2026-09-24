/* Model: Recompensa / Producto del Catálogo */
export class RewardModel {
  constructor(data = {}) {
    this.id = data.id || data.reward_id || "";
    this.title = data.title || "";
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
      points_cost: this.pointsCost,
      stock: this.stock,
      image_url: this.imageUrl,
      description: this.description,
      category: this.category,
      updated_at: this.updatedAt
    };
  }
}
