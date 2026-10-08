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
      body: JSON.stringify({
        action: "marketplace-listing",
        title,
        description,
        priceUsd,
        priceNio
      })
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

/**
 * Limpia y estructura una publicación informal de Facebook para el Catálogo Web (Intro breve + viñetas técnicas).
 * @param {string} title Título del producto
 * @param {string} rawDescription Descripción original de Facebook
 * @returns {Promise<string>}
 */
export async function cleanCatalogDescription(title, rawDescription = "") {
  try {
    const response = await fetch("/api/groq-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "clean-catalog-description",
        title,
        description: rawDescription
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.catalogDescription) {
        return data.catalogDescription;
      }
    }
  } catch (err) {
    console.warn("Llamada a /api/groq-copy (clean) no disponible:", err.message);
  }

  return `${title} verificado para miembros The Wired Club.
• Estado: Artículo original verificado físicamente en tienda
• Garantía: Cobertura oficial MeltyDeays por 30 días
• Entrega: Entrega física y prueba técnica en mostrador`;
}
