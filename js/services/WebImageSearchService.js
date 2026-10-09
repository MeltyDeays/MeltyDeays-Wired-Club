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
 * [{ title, imageUrl, thumbnail, source, width, height }]
 */
export async function searchProductImagesFromWeb(query, limit = 6) {
  const clean = cleanSearchQuery(query);
  if (!clean) return [];

  // Intento 1: POST al endpoint serverless relativo (mismo origen, 100% libre de CORS)
  try {
    const res = await fetch("/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean })
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
    const res = await fetch(`/api/search-product-images?q=${encodeURIComponent(clean)}`);
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
 * Descarga una imagen remota y la convierte en DataURL Base64 para evitar Tainted Canvas
 */
export async function fetchImageAsDataUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("http")) return imageUrl;

  // Endpoint serverless relativo para proxy
  try {
    const res = await fetch("/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "proxy-base64", url: imageUrl })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && d.dataUrl) return d.dataUrl;
    }
  } catch (err) {
    console.warn("[WebSearch] Proxy DataURL falló:", err.message);
  }

  return imageUrl;
}
