/* Utilidad de Normalización de Moneda (USD / NIO) para The Wired Club / Haibane */

export const EXCHANGE_RATE_NIO = 37.0;

const HIGH_END_HARDWARE_REGEX = /(laptop|computadora|notebook|predator|helios|rtx\s*\d+|gtx\s*\d+|radeon|intel\s*(core\s*)?ultra|core\s*i[79]|ryzen\s*[79]|macbook|torre\s*gamer|pc\s*gamer)/i;

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
  if (typeof rawValue === "string") {
    // Si viene texto con símbolo de córdobas 'C$'
    if (rawValue.includes("C$") && !currency) {
      currency = "NIO";
    }
    rawValue = rawValue.replace(/[^0-9.]/g, "");
  }
  const val = parseFloat(rawValue) || 0;

  if (val <= 0) {
    return { priceUsd: 0, priceNio: 0, currency: "USD", raw: 0 };
  }

  const cleanCurr = String(currency || "").toUpperCase().trim();
  const fullText = `${title || ""} ${description || ""}`;
  const isHighEndHardware = HIGH_END_HARDWARE_REGEX.test(fullText);

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

  // 5. Si se especificó explícitamente Córdobas
  if (cleanCurr === "NIO" || cleanCurr.includes("C$")) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "NIO",
      raw: val
    };
  }

  // 6. Umbral estándar para periféricos y accesorios
  if (val <= 200) {
    const usd = Number(val.toFixed(2));
    const nio = Math.round(usd * EXCHANGE_RATE_NIO);
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "USD",
      raw: val
    };
  } else {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "NIO",
      raw: val
    };
  }
}

