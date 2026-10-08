/* Servicio de Generación de Copy y Fichas para Facebook Marketplace */

/**
 * Genera título optimizado y descripción para Facebook Marketplace usando Groq LLM vía Serverless Proxy o Fallback.
 * @param {Object} productData Datos del producto (title, description, priceUsd, priceNio)
 * @returns {Promise<{marketTitle: string, marketDescription: string, categorySuggestion: string}>}
 */
export async function generateMarketplaceListing(productData) {
  const { title = "", description = "", priceUsd = 0, priceNio = 0 } = productData || {};

  try {
    const response = await fetch("/api/groq-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.marketTitle) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Llamada a /api/groq-copy no disponible o falló:", err.message);
  }

  // Fallback si no hay conexión o no está configurada la API
  return {
    marketTitle: title.slice(0, 80),
    marketDescription: `${title}\n\n${description}\n\n💵 Precio: $${priceUsd} (C$ ${priceNio})\n📦 Entrega inmediata disponible.`,
    categorySuggestion: "Varios"
  };
}
