export function parseProductDescription(rawText) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return {
      intro: "Artículo oficial verificado de la tienda MeltyDeays.",
      specs: [
        "Entrega física y prueba técnica en mostrador",
        "Garantía oficial MeltyDeays por 30 días",
        "Soporte directo para miembros Wired Club"
      ],
      hasSpecs: true,
      fullText: ""
    };
  }

  const trimmed = rawText.trim();

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
      let intro = parts[0];
      let specs = parts.slice(1).map(l => l.replace(/^[•\-\*▸✓✔]\s*/, ""));
      return {
        intro,
        specs,
        hasSpecs: specs.length > 0,
        fullText: trimmed
      };
    }
  }

  // 3. Extracción de cláusulas por signos de puntuación, comas o conectores ("con", "y")
  const subClauses = trimmed
    .split(/(?:[;\n\r]|,\s*|\.\s+|\s+con\s+|\s+y\s+)/i)
    .map(c => c.trim().replace(/^[•\-\*▸✓✔]\s*/, ""))
    .filter(c => c.length > 3);

  if (subClauses.length > 1) {
    return {
      intro: subClauses[0],
      specs: subClauses.slice(1).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      hasSpecs: true,
      fullText: trimmed
    };
  }

  return {
    intro: trimmed,
    specs: [
      trimmed,
      "Garantía oficial y soporte técnico directo en mostrador MeltyDeays (30 días)",
      "Retiro inmediato con verificación presencial de funcionamiento"
    ],
    hasSpecs: true,
    fullText: trimmed
  };
}

/* Model: Recompensa / Producto del Catálogo */
export class RewardModel {
  constructor(data = {}) {
    this.id = data.id || data.reward_id || "";
    this.title = data.title || "";
    const rawType = data.rewardType || data.reward_type;
    const isIncomingData = Boolean(data.isIncoming || data.is_incoming || data.status === "INCOMING" || rawType === "INCOMING");

    const parseNum = (val, fallback = 0) => {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    if (isIncomingData) {
      this.rewardType = "INCOMING";
      this.priceUsd = parseNum(data.priceUsd !== undefined ? data.priceUsd : data.price_usd, 0);
      this.maxDiscountPct = 0;
      this.maxDiscountUsd = 0;
      this.cashToPayUsd = 0;
    } else if (rawType === "COMBO") {
      this.rewardType = "COMBO";
      this.priceUsd = parseNum(data.priceUsd !== undefined ? data.priceUsd : data.price_usd, 0);
      this.maxDiscountPct = parseNum(data.maxDiscountPct !== undefined ? data.maxDiscountPct : data.max_discount_pct, 0);
      this.maxDiscountUsd = parseNum(data.maxDiscountUsd !== undefined ? data.maxDiscountUsd : data.max_discount_usd, 0);
      this.cashToPayUsd = parseNum(data.cashToPayUsd !== undefined ? data.cashToPayUsd : data.cash_to_pay_usd, 0);
    } else if (rawType === "PARTIAL_DISCOUNT") {
      this.rewardType = "PARTIAL_DISCOUNT";
      this.priceUsd = parseNum(data.priceUsd !== undefined ? data.priceUsd : data.price_usd, 0);
      this.maxDiscountPct = parseNum(data.maxDiscountPct !== undefined ? data.maxDiscountPct : data.max_discount_pct, 0);
      this.maxDiscountUsd = parseNum(data.maxDiscountUsd !== undefined ? data.maxDiscountUsd : data.max_discount_usd, 0);
      this.cashToPayUsd = parseNum(data.cashToPayUsd !== undefined ? data.cashToPayUsd : data.cash_to_pay_usd, 0);
    } else {
      this.rewardType = "FREE_REWARD";
      this.priceUsd = 0;
      this.maxDiscountPct = 0;
      this.maxDiscountUsd = 0;
      this.cashToPayUsd = 0;
    }

    this.pointsCost = Number(data.pointsCost !== undefined ? data.pointsCost : (data.points_cost !== undefined ? data.points_cost : 0));
    this.stock = Number(data.stock != null ? data.stock : 0);
    this.initialStock = Number(data.initialStock || data.initial_stock || this.stock || 1);
    this.isUnique = Boolean(data.isUnique || data.is_unique || (this.initialStock === 1));

    // Invariante de auto-reparación aritmética para hardware de alto valor y descuentos
    const HIGH_END_HARDWARE_REGEX = /(laptop|computadora|notebook|predator|helios|rtx\s*\d+|gtx\s*\d+|radeon|intel\s*(core\s*)?ultra|core\s*i[79]|ryzen\s*[79]|macbook|torre\s*gamer|pc\s*gamer)/i;
    const fullText = `${this.title} ${data.description || data.rawDescription || data.raw_description || ""}`;
    const isHighEnd = HIGH_END_HARDWARE_REGEX.test(fullText);

    // Caso 1: Hardware de alto valor con precio < 250 debido a división errónea de moneda
    if (isHighEnd && this.priceUsd > 0 && this.priceUsd < 250) {
      const rawNio = Number(data.priceNio || data.price_nio || 0);
      if (rawNio >= 250) {
        this.priceUsd = rawNio >= 5000 ? Math.round(rawNio / 37.0) : rawNio;
      } else if (Math.round(this.priceUsd * 37.0) >= 250) {
        this.priceUsd = Math.round(this.priceUsd * 37.0);
      }
    }

    // Caso 2: En PARTIAL_DISCOUNT, la suma de cashToPayUsd + maxDiscountUsd no puede superar priceUsd
    if (this.rewardType === "PARTIAL_DISCOUNT") {
      const sumBreakdown = Number(((this.cashToPayUsd || 0) + (this.maxDiscountUsd || 0)).toFixed(2));
      if (sumBreakdown > this.priceUsd && sumBreakdown > 0) {
        this.priceUsd = sumBreakdown;
      }
      if (this.priceUsd > 0) {
        if (!this.maxDiscountPct || this.maxDiscountPct <= 0) {
          this.maxDiscountPct = 15;
        }
        if (!this.maxDiscountUsd || this.maxDiscountUsd <= 0 || Math.abs((this.maxDiscountUsd + this.cashToPayUsd) - this.priceUsd) > 0.05) {
          this.maxDiscountUsd = Number((this.priceUsd * (this.maxDiscountPct / 100)).toFixed(2));
          this.cashToPayUsd = Number((this.priceUsd - this.maxDiscountUsd).toFixed(2));
        }
        // Invariante oficial MeltyDeays The Wired Club: 1 USD de descuento = 50 WP (1 WP = $0.02 USD = C$ 0.74 NIO)
        const expectedCapPts = Math.max(10, Math.round(this.maxDiscountUsd * 50));
        if (this.pointsCost <= 0 || this.pointsCost < Math.round(this.maxDiscountUsd * 40) || this.pointsCost > Math.round(this.maxDiscountUsd * 60)) {
          this.pointsCost = expectedCapPts;
        }
      }
    }

    this.priceNio = Number(data.priceNio || data.price_nio || Math.round(this.priceUsd * 37.0));

    this.comboData = data.comboData || data.combo_data || null;
    if (this.comboData && !Array.isArray(this.comboData.items)) {
      if (this.comboData.itemA && this.comboData.itemB) {
        this.comboData.items = [this.comboData.itemA, this.comboData.itemB];
      }
    }
    this.dissolvedFromCombo = data.dissolvedFromCombo || data.dissolved_from_combo || null;

    this.isIncomingFlag = isIncomingData;
    this.estimatedArrival = data.estimatedArrival || data.estimated_arrival || null;
    this.presaleDiscountType = data.presaleDiscountType || data.presale_discount_type || "PERCENTAGE";
    this.presaleDiscountValue = Number(data.presaleDiscountValue ?? data.presale_discount_value ?? 0);

    let calcDiscUsd = 0;
    if (this.presaleDiscountType === "PERCENTAGE") {
      calcDiscUsd = Number((this.priceUsd * (this.presaleDiscountValue / 100)).toFixed(2));
    } else {
      calcDiscUsd = Math.min(this.priceUsd, Number(this.presaleDiscountValue.toFixed(2)));
    }
    this.presaleDiscountUsd = Number(data.presaleDiscountUsd ?? data.presale_discount_usd ?? calcDiscUsd);
    const calcPresalePrice = Math.max(0, Number((this.priceUsd - this.presaleDiscountUsd).toFixed(2)));
    this.presalePriceUsd = Number(data.presalePriceUsd ?? data.presale_price_usd ?? calcPresalePrice);

    if (isIncomingData && data.status !== "SOLD_OUT") {
      this.status = "INCOMING";
    } else {
      this.status = data.status || (this.stock > 0 ? "ACTIVE" : "SOLD_OUT");
      if (this.status === "SOLD_OUT" && this.stock > 0) this.status = "ACTIVE";
    }
    this.soldOutAt = (this.status === "ACTIVE" || this.status === "INCOMING") ? null : (data.soldOutAt || data.sold_out_at || (this.stock === 0 ? new Date().toISOString() : null));
    this.soldOutReason = data.soldOutReason || data.sold_out_reason || "";

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
    this.rawDescription = data.rawDescription || data.raw_description || data.description || "";
    this.category = data.category || "Gaming Hardware";
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  getImages() {
    if (Array.isArray(this.images) && this.images.length > 0) {
      return this.images;
    }
    if (this.isCombo()) {
      const comboImgs = this.getComboItems().map(it => it.imageUrl).filter(Boolean);
      if (comboImgs.length > 0) return comboImgs;
    }
    if (this.imageUrl) {
      return [this.imageUrl];
    }
    return [];
  }

  isCombo() {
    return this.rewardType === "COMBO" && this.getComboItems().length >= 2;
  }

  getComboItems() {
    if (this.rewardType !== "COMBO" || !this.comboData) return [];
    if (Array.isArray(this.comboData.items) && this.comboData.items.length > 0) {
      return this.comboData.items;
    }
    if (this.comboData.itemA && this.comboData.itemB) {
      return [this.comboData.itemA, this.comboData.itemB];
    }
    return [];
  }

  getComboSavings() {
    const items = this.getComboItems();
    if (items.length < 2) return { sumUsd: 0, savingsUsd: 0, savingsPct: 0 };
    const sumUsd = Number(items.reduce((acc, it) => {
      const p = Number(it?.priceUsd);
      return acc + (Number.isFinite(p) ? p : 0);
    }, 0).toFixed(2));
    const rawComboPrice = Number(this.priceUsd);
    const comboPrice = Number.isFinite(rawComboPrice) ? rawComboPrice : 0;
    const savingsUsd = Math.max(0, Number((sumUsd - comboPrice).toFixed(2)));
    const savingsPct = sumUsd > 0 ? Math.round((savingsUsd / sumUsd) * 100) : 0;
    return { sumUsd, savingsUsd, savingsPct };
  }

  getParsedDescription() {
    return parseProductDescription(this.description);
  }

  isIncoming() {
    if (this.status !== "INCOMING" && !this.isIncomingFlag) return false;
    return !this.isIncomingExpired();
  }

  isIncomingExpired() {
    if (!this.estimatedArrival) return false;
    return new Date() >= new Date(this.estimatedArrival);
  }

  getRemainingArrivalMs() {
    if (!this.estimatedArrival) return 0;
    return Math.max(0, new Date(this.estimatedArrival).getTime() - Date.now());
  }

  checkIncomingTransition() {
    if ((this.status === "INCOMING" || this.isIncomingFlag) && this.isIncomingExpired()) {
      this.status = "ACTIVE";
      this.isIncomingFlag = false;
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  isAvailable() {
    if (this.status === "INCOMING" || this.isIncoming()) return false;
    return this.stock > 0 && this.status !== "SOLD_OUT";
  }

  isSoldOut() {
    if (this.status === "INCOMING" || this.isIncoming()) return false;
    return this.stock <= 0 || this.status === "SOLD_OUT";
  }

  // Comprueba si debe ser visible en el catálogo de clientes:
  // Si es preventa en camino, siempre es visible.
  // Si está en espera de aprobación o imagen real, no se muestra a clientes
  isVisibleToCustomer() {
    if (this.status === "PENDING_APPROVAL" || this.status === "PENDING_IMAGE") {
      return false;
    }
    if (this.isIncoming()) {
      return true;
    }
    if (this.stock > 0 && this.status !== "SOLD_OUT") {
      return true;
    }
    if (!this.soldOutAt) {
      return true;
    }
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(this.soldOutAt).getTime();
    return elapsed < TWELVE_HOURS_MS;
  }

  isPartialDiscount() {
    return this.rewardType === "PARTIAL_DISCOUNT";
  }

  decrementStock(qty = 1) {
    if (this.stock <= 0) throw new Error("Producto sin stock disponible");
    const dec = Number(qty) || 1;
    this.stock = Math.max(0, this.stock - dec);
    if (this.stock === 0) {
      this.status = "SOLD_OUT";
      if (!this.soldOutAt) {
        this.soldOutAt = new Date().toISOString();
      }
    }
    this.updatedAt = new Date().toISOString();
  }

  markAsSoldOut(reason = "VENTA_EXTERNA") {
    this.stock = 0;
    this.status = "SOLD_OUT";
    this.soldOutAt = new Date().toISOString();
    this.soldOutReason = reason;
    this.updatedAt = new Date().toISOString();
  }

  restock(qty = 1) {
    const add = Number(qty) || 1;
    this.stock = Math.max(0, this.stock + add);
    if (this.stock > 0) {
      this.status = "ACTIVE";
      this.soldOutAt = null;
      this.soldOutReason = "";
    }
    this.updatedAt = new Date().toISOString();
  }

  incrementStock(qty = 1) {
    this.restock(qty);
  }

  toJSON() {
    return {
      id: this.id,
      reward_id: this.id,
      title: this.title,
      reward_type: this.rewardType,
      rewardType: this.rewardType,
      price_usd: this.priceUsd,
      priceUsd: this.priceUsd,
      price_nio: this.priceNio,
      priceNio: this.priceNio,
      max_discount_pct: this.maxDiscountPct,
      maxDiscountPct: this.maxDiscountPct,
      max_discount_usd: this.maxDiscountUsd,
      maxDiscountUsd: this.maxDiscountUsd,
      cash_to_pay_usd: this.cashToPayUsd,
      cashToPayUsd: this.cashToPayUsd,
      points_cost: this.pointsCost,
      pointsCost: this.pointsCost,
      stock: this.stock,
      initial_stock: this.initialStock,
      initialStock: this.initialStock,
      is_unique: this.isUnique,
      isUnique: this.isUnique,
      status: this.status,
      is_incoming: this.isIncoming(),
      isIncoming: this.isIncoming(),
      estimated_arrival: this.estimatedArrival,
      estimatedArrival: this.estimatedArrival,
      presale_discount_type: this.presaleDiscountType,
      presaleDiscountType: this.presaleDiscountType,
      presale_discount_value: this.presaleDiscountValue,
      presaleDiscountValue: this.presaleDiscountValue,
      presale_discount_usd: this.presaleDiscountUsd,
      presaleDiscountUsd: this.presaleDiscountUsd,
      presale_price_usd: this.presalePriceUsd,
      presalePriceUsd: this.presalePriceUsd,
      sold_out_at: this.soldOutAt,
      soldOutAt: this.soldOutAt,
      sold_out_reason: this.soldOutReason,
      image_url: this.imageUrl,
      imageUrl: this.imageUrl,
      images: this.images,
      combo_data: this.comboData,
      comboData: this.comboData,
      dissolved_from_combo: this.dissolvedFromCombo,
      dissolvedFromCombo: this.dissolvedFromCombo,
      description: this.description,
      raw_description: this.rawDescription,
      rawDescription: this.rawDescription,
      category: this.category,
      updated_at: this.updatedAt,
      updatedAt: this.updatedAt
    };
  }
}
