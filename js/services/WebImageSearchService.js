/**
 * Servicio de Búsqueda Web de Imágenes Reales (Estilo Google Lens / E-Commerce)
 * Consulta el endpoint serverless unificado /api/search-product-images (Bing + DuckDuckGo)
 * Totalmente compatible con cualquier entorno Vercel (Producción, Previews y Local).
 */

/**
 * Limpia títulos largos de Marketplace para extraer los términos clave de producto
 */
export function cleanSearchQuery(rawQuery = "") {
  return rawQuery
    .replace(/C\$\s*\d+([.,]\d+)?/gi, "")
    .replace(/\$\s*\d+([.,]\d+)?/gi, "")
    .replace(/\b(Juigalpa|Chontales|Managua|Metrocentro|Galerias|Esteli|Matagalpa|Leon|Masaya)\b/gi, "")
    .replace(/\b(nuevo en caja|en caja|sellado|ganga|oferta|inbox|negociable|whatsapp|contacto|para android|para pc)\b/gi, "")
    .replace(/[^\w\s\-\.\+áéíóúÁÉÍÓÚñÑ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca imágenes en vivo en la web devolviendo array de resultados con formato:
 * [{ title, imageUrl, thumbnail, source, width, height, facet, facetLabel }]
 */
export async function searchProductImagesFromWeb(query, limit = 6, options = {}) {
  const clean = cleanSearchQuery(query);
  if (!clean) return [];

  const postPayload = {
    query: clean,
    limit,
    description: options.description || "",
    sampleImages: options.sampleImages || []
  };

  // Intento 1: POST al endpoint serverless relativo (mismo origen, 100% libre de CORS)
  try {
    const res = await fetch("/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.slice(0, limit);
      }
    }
  } catch (err) {
    console.warn("[WebSearch] Intento POST /api/search-product-images falló:", err.message);
  }

  // Intento 2: GET fallback al endpoint serverless relativo
  try {
    const res = await fetch(`/api/search-product-images?q=${encodeURIComponent(clean)}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.slice(0, limit);
      }
    }
  } catch (err) {
    console.warn("[WebSearch] Intento GET /api/search-product-images falló:", err.message);
  }

  return [];
}

/**
 * Descarga una imagen remota y la convierte en DataURL Base64 para evitar Tainted Canvas.
 * Si la URL primaria falla o es un placeholder remoto, utiliza fallbackUrl (thumbnail / CDN) automáticamente.
 */
export async function fetchImageAsDataUrl(imageUrl, fallbackUrl = null) {
  if (!imageUrl || !imageUrl.startsWith("http")) return imageUrl;

  // Intento 1: Proxy serverless con soporte de URL primaria + fallback
  try {
    const res = await fetch("/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "proxy-base64",
        url: imageUrl,
        fallbackUrl: fallbackUrl || null
      })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && d.dataUrl) return d.dataUrl;
    }
  } catch (err) {
    console.warn("[WebSearch] Proxy DataURL falló:", err.message);
  }

  // Intento 2: Si falló el proxy combinado y se proveyó un fallback diferente, intentar proxy directo con fallbackUrl
  if (fallbackUrl && fallbackUrl !== imageUrl && fallbackUrl.startsWith("http")) {
    try {
      const resFallback = await fetch("/api/search-product-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "proxy-base64", url: fallbackUrl })
      });
      if (resFallback.ok) {
        const d = await resFallback.json();
        if (d && d.success && d.dataUrl) return d.dataUrl;
      }
    } catch (err) {
      console.warn("[WebSearch] Proxy fallback directo falló:", err.message);
    }
  }

  return imageUrl;
}
