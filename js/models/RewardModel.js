export function parseProductDescription(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { intro: "", specs: [], hasSpecs: false, fullText: "" };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return { intro: "", specs: [], hasSpecs: false, fullText: "" };
  }

  // 1. Si contiene saltos de línea explícitos
  if (trimmed.includes("\n")) {
    const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      let intro = lines[0];
      let specs = lines.slice(1);
      if (intro.length <= 4 && specs.length > 0) {
        intro = intro + " " + specs[0];
        specs = specs.slice(1);
      }
      specs = specs.map(l => l.replace(/^[•\-\*▸✓✔]\s*/, ""));
      return {
        intro,
        specs,
        hasSpecs: specs.length > 0,
        fullText: trimmed
      };
    }
  }

  // 2. Si es texto continuo con viñetas o emojis de especificación
  const bulletPattern = /(?:^|\s)(?=[•▸✓✔]|\p{Extended_Pictographic}(?:\uFE0F)?|-(?=\s))/u;
  const rawParts = trimmed.split(bulletPattern).map(p => p.trim()).filter(Boolean);

  if (rawParts.length > 1) {
    const parts = [];
    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i];
      if (part.length <= 3 && parts.length > 0) {
        parts[parts.length - 1] += " " + part;
      } else {
        parts.push(part);
      }
    }

    if (parts.length > 1) {
      const firstIsBullet = /^(?:[•▸✓✔-]|\p{Extended_Pictographic})/u.test(parts[0]);
      let intro = "";
      let specs = [];
      if (!firstIsBullet) {
        intro = parts[0];
        specs = parts.slice(1);
      } else {
        intro = parts[0];
        specs = parts.slice(1);
      }
      return {
        intro,
        specs,
        hasSpecs: specs.length > 0,
        fullText: trimmed
      };
    }
  }

  // 3. Párrafo largo continuo (>120 caracteres) sin viñetas
  if (trimmed.length > 120) {
    const firstPeriodIdx = trimmed.indexOf(". ");
    if (firstPeriodIdx > 30 && firstPeriodIdx < 160) {
      const intro = trimmed.slice(0, firstPeriodIdx + 1);
      const remaining = trimmed.slice(firstPeriodIdx + 2).trim();
      if (remaining) {
        return {
          intro,
          specs: [remaining],
          hasSpecs: true,
          fullText: trimmed
        };
      }
    }
    return {
      intro: trimmed.slice(0, 110) + "...",
      specs: [trimmed],
      hasSpecs: true,
      fullText: trimmed
    };
  }

  return {
    intro: trimmed,
    specs: [],
    hasSpecs: false,
    fullText: trimmed
  };
}

/* Model: Recompensa / Producto del Catálogo */
export class RewardModel {
  constructor(data = {}) {
    this.id = data.id || data.reward_id || "";
    this.title = data.title || "";
    this.rewardType = data.rewardType || data.reward_type || "FREE_REWARD"; // "FREE_REWARD" | "PARTIAL_DISCOUNT"
    if (this.rewardType !== "PARTIAL_DISCOUNT") {
      this.rewardType = "FREE_REWARD";
      this.priceUsd = 0;
      this.maxDiscountPct = 0;
      this.maxDiscountUsd = 0;
      this.cashToPayUsd = 0;
    } else {
      this.priceUsd = Number(data.priceUsd || data.price_usd || 0);
      this.maxDiscountPct = Number(data.maxDiscountPct || data.max_discount_pct || 0);
      this.maxDiscountUsd = Number(data.maxDiscountUsd || data.max_discount_usd || 0);
      this.cashToPayUsd = Number(data.cashToPayUsd || data.cash_to_pay_usd || 0);
    }
    this.pointsCost = Number(data.pointsCost || data.points_cost || 0);
    this.stock = Number(data.stock || 0);

    // Soporte multi-imagen con retrocompatibilidad
    let imgs = [];
    if (Array.isArray(data.images)) {
      imgs = data.images.filter(x => typeof x === "string" && x.trim());
    } else if (Array.isArray(data.image_urls)) {
      imgs = data.image_urls.filter(x => typeof x === "string" && x.trim());
    } else if (typeof data.images === "string" && data.images.trim()) {
      imgs = [data.images.trim()];
    }
    const singleUrl = (data.imageUrl || data.image_url || "").trim();
    if (imgs.length === 0 && singleUrl) {
      imgs = [singleUrl];
    }
    this.images = imgs;
    this.imageUrl = imgs[0] || singleUrl || "";

    this.description = data.description || "";
    this.category = data.category || "Gaming Hardware";
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  getImages() {
    if (Array.isArray(this.images) && this.images.length > 0) {
      return this.images;
    }
    if (this.imageUrl) {
      return [this.imageUrl];
    }
    return [];
  }

  getParsedDescription() {
    return parseProductDescription(this.description);
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

  incrementStock() {
    this.stock += 1;
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
      imageUrl: this.imageUrl,
      images: this.images,
      description: this.description,
      category: this.category,
      updated_at: this.updatedAt
    };
  }
}
