/* Utilidad de Normalización de Moneda (USD / NIO) para The Wired Club / Haibane */

export const EXCHANGE_RATE_NIO = 37.0;

/**
 * Regla de negocio para determinar moneda según el rango numérico:
 * - Rango [0, 200]: DÓLARES (USD)
 * - Rango >= 201: CÓRDOBAS (NIO)
 * 
 * @param {number|string} rawValue Valor extraído de Facebook o input
 * @returns {{ priceUsd: number, priceNio: number, currency: 'USD' | 'NIO' }}
 */
export function normalizePriceByThreshold(rawValue) {
  if (typeof rawValue === "string") {
    // Limpiar símbolos de moneda y espacios
    rawValue = rawValue.replace(/[^0-9.]/g, "");
  }
  const val = parseFloat(rawValue) || 0;

  if (val <= 0) {
    return { priceUsd: 0, priceNio: 0, currency: "USD" };
  }

  if (val <= 200) {
    // 0 a 200 son Dólares (USD)
    const usd = Number(val.toFixed(2));
    const nio = Math.round(usd * EXCHANGE_RATE_NIO);
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "USD"
    };
  } else {
    // 201 en adelante son Córdobas (NIO)
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return {
      priceUsd: usd,
      priceNio: nio,
      currency: "NIO"
    };
  }
}
