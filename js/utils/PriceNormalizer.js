/* Utilidad de Normalización de Moneda (USD / NIO) para The Wired Club / Haibane */

export const EXCHANGE_RATE_NIO = 37.0;

export const ACCESSORY_TITLE_REGEX = /(auricular|audifono|audífono|headset|earphone|headphone|earbuds|mouse|raton|ratón|teclado|keyboard|pad|alfombrilla|fan|soplador|aspiradora|turbina|cable|adaptador|cargador|charger|funda|case|stand|soporte|mando|control|gamepad|grip|powerbank|power\s*bank|bateria|batería|repetidor|extender|hub|dock|limpiador|protector|mica|vidrio)/i;
const HIGH_END_HARDWARE_REGEX = /(laptop|computadora|notebook|predator|helios|rtx\s*\d+|gtx\s*\d+|radeon|intel\s*(core\s*)?ultra|core\s*i[79]|ryzen\s*[79]|macbook|torre\s*gamer|pc\s*gamer)/i;

/**
 * Extrae valor numérico real descartando precios tachados y resolviendo miles latinos.
 * Soporta "C$850 C$1.000" -> 850, "C$1.350" -> 1350, "$25.50" -> 25.5, "$1100" -> 1100
 *
 * @param {string|number} text
 * @returns {number|null}
 */
export function parseMarketplacePrice(text) {
  if (text === null || text === undefined) return null;
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  const trimmed = String(text).trim();
  if (!trimmed) return null;

  const match = trimmed.match(/(?:C\$|\$|US\$|NIO)?\s*(\d+(?:[.,]\d+)*)/i);
  if (!match || !match[1]) return null;

  const rawNumStr = match[1].trim();
  const isNio = /C\$/i.test(trimmed) || /NIO/i.test(trimmed);

  if (!/[.,]/.test(rawNumStr)) {
    const n = parseInt(rawNumStr, 10);
    return isNaN(n) ? null : n;
  }

  const parts = rawNumStr.split(/[.,]/);
  if (parts.length === 2 && parts[1].length === 3) {
    const val = parseInt(parts[0] + parts[1], 10);
    return isNaN(val) ? null : val;
  }

  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 3) {
      return parseInt(parts.join(""), 10);
    }
    if (lastPart.length <= 2) {
      const intPart = parts.slice(0, -1).join("");
      return parseFloat(`${intPart}.${lastPart}`);
    }
  }

  if (isNio) {
    const val = parseInt(parts.join(""), 10);
    return isNaN(val) ? null : val;
  }

  if (parts.length === 2 && parts[1].length <= 2) {
    return parseFloat(`${parts[0]}.${parts[1]}`);
  }

  const clean = rawNumStr.replace(/,/g, "");
  const res = parseFloat(clean);
  return isNaN(res) ? null : res;
}

/**
 * Normaliza precios con detección inteligente de moneda (USD / NIO):
 * - Moneda explícita: Si 'currency' es "USD" o contiene "$" (sin "C$").
 * - Inferencia por categoría técnica: Laptops, GPUs RTX, Intel Core Ultra y hardware de alto valor
 *   con montos >= 250 se reconocen automáticamente en DÓLARES (USD), no en córdobas.
 * - Periféricos estándar:
 *   [0, 200] => USD
 *   >= 201 => Córdobas (NIO)
 * 
 * @param {number|string} rawValue Valor extraído de Facebook o input
 * @param {string} [currency=""] Moneda sugerida o texto de precio
 * @param {string} [title=""] Título del producto para análisis semántico
 * @param {string} [description=""] Descripción del producto
 * @returns {{ priceUsd: number, priceNio: number, currency: 'USD' | 'NIO', raw: number }}
 */
export function normalizePriceByThreshold(rawValue, currency = "", title = "", description = "") {
  let val = 0;
  if (typeof rawValue === "number") {
    val = Number.isFinite(rawValue) ? rawValue : 0;
  } else {
    if (String(rawValue).includes("C$") && !currency) {
      currency = "NIO";
    }
    val = parseMarketplacePrice(rawValue) || 0;
  }

  if (val <= 0) {
    return { priceUsd: 0, priceNio: 0, currency: "USD", raw: 0 };
  }

  const cleanCurr = String(currency || "").toUpperCase().trim();
  const isAccessory = ACCESSORY_TITLE_REGEX.test(title || "");
  const isHighEndHardware = !isAccessory && HIGH_END_HARDWARE_REGEX.test(title || "");

  // 1. Detección explícita de Córdobas si el monto es grande (>= 5000) o viene marcado C$/NIO
  if ((cleanCurr === "NIO" || cleanCurr.includes("C$")) && (val >= 5000 || !isHighEndHardware)) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "NIO",
      raw: val
    };
  }

  // 2. Hardware de alto valor con monto grande (>= 5000) son córdobas (ej. 40700 NIO -> $1100 USD)
  if (isHighEndHardware && val >= 5000) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "NIO",
      raw: val
    };
  }

  // 3. Detección explícita de Dólares
  const isExplicitUsd = cleanCurr === "USD" || (cleanCurr.includes("$") && !cleanCurr.includes("C$"));

  // 4. Hardware de alto valor (laptops RTX, PCs gamers, etc.):
  // - Entre 250 y 4999: Siempre es USD (ej: 1100 = $1,100 USD)
  // - Menor a 250 pero que al multiplicarse por 37 dé >= 250: Restaurar división errónea (ej: 29.73 -> $1,100 USD)
  if (isHighEndHardware) {
    if (val >= 250 && val < 5000) {
      const usd = Number(val.toFixed(2));
      const nio = Math.round(usd * EXCHANGE_RATE_NIO);
      return {
        priceUsd: usd,
        priceNio: nio,
        currency: "USD",
        raw: val
      };
    }
    if (val > 0 && val < 250 && (val * EXCHANGE_RATE_NIO >= 250)) {
      const restoredUsd = Math.round(val * EXCHANGE_RATE_NIO);
      const nio = Math.round(restoredUsd * EXCHANGE_RATE_NIO);
      return {
        priceUsd: restoredUsd,
        priceNio: nio,
        currency: "USD",
        raw: restoredUsd
      };
    }
  }

  if (isExplicitUsd) {
    const usd = Number(val.toFixed(2));
    const nio = Math.round(usd * EXCHANGE_RATE_NIO);
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "USD",
      raw: val
    };
  }

  // 5. En Facebook Marketplace Nicaragua, los productos se publican por defecto en Córdobas (NIO)
  // Se transforman dividiendo entre 37.0 para obtener el precio oficial en USD
  const nio = Math.round(val);
  const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
  return {
    priceUsd: usd,
    priceNio: nio,
    currency: "NIO",
    raw: val
  };
}

/**
 * Redondeo estético de precios base en Córdobas (Nicaragua):
 * Convierte montos con desfase residual a números limpios (ej: 999 -> 1000; 747.4 -> 750; 319.7 -> 320).
 *
 * @param {number|string} num Monto en Córdobas
 * @returns {number}
 */
export function roundToCleanNio(num) {
  const n = Number(num) || 0;
  if (n <= 0) return 0;
  const round10 = Math.round(n / 10) * 10;
  if (Math.abs(n - round10) <= 3.2) return round10;
  const round5 = Math.round(n / 5) * 5;
  if (Math.abs(n - round5) <= 2.2) return round5;
  return Math.round(n);
}

