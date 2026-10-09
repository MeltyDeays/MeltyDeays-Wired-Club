/**
 * Servicio de Búsqueda Web de Imágenes Reales (Estilo Google Lens / E-Commerce)
 * Permite buscar 6 u 8 fotografías oficiales en vivo desde DuckDuckGo/Google/eBay/Amazon.
 * Cuenta con resiliencia multi-entorno (Localhost, Live Server, Vercel y CORS Proxy).
 */

const VERCEL_PRODUCTION_URL = "https://meltydeays-wired-club.vercel.app";

/**
 * Limpia títulos largos de Marketplace para extraer los términos clave de producto
 */
export function cleanSearchQuery(rawQuery = "") {
  return rawQuery
    .replace(/C\$\s*\d+([.,]\d+)?/gi, "")
    .replace(/\$\s*\d+([.,]\d+)?/gi, "")
    .replace(/\b(Juigalpa|Chontales|Managua|Metrocentro|Galerias|Esteli|Matagalpa|Leon|Masaya)\b/gi, "")
    .replace(/\b(nuevo en caja|en caja|sellado|ganga|oferta|inbox|negociable|whatsapp|contacto|para android|para pc)\b/gi, "")
    .replace(/[^\w\s\-\.\+]/gi, " ")
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

  // 1. Intento 1: Endpoint relativo local (/api/search-product-images)
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
    console.warn("[WebSearch] Intento local /api no disponible, probando fallback...");
  }

  // 1.1 Intento servidor local Node (puerto 3000 si está corriendo en segundo plano)
  try {
    const localRes = await fetch("http://localhost:3000/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean })
    });
    if (localRes.ok) {
      const data = await localRes.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.slice(0, limit);
      }
    }
  } catch {}

  // 2. Intento 2: Endpoint de producción Vercel
  try {
    const res = await fetch(`${VERCEL_PRODUCTION_URL}/api/search-product-images`, {
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
    console.warn("[WebSearch] Intento Vercel directo no disponible, probando proxy directo...");
  }

  // 3. Intento 3: Consulta directa a DuckDuckGo vía CORS Proxy
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(clean + " product")}&t=h_&iar=images&iax=images&ia=images`;
    const proxyUrl1 = `https://corsproxy.io/?url=${encodeURIComponent(searchUrl)}`;
    
    let html = "";
    try {
      const pRes = await fetch(proxyUrl1);
      if (pRes.ok) html = await pRes.text();
    } catch {
      const pRes2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`);
      if (pRes2.ok) html = await pRes2.text();
    }

    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([0-9-]+)["']/) || html.match(/vqd=([^&"']+)/);
    if (vqdMatch) {
      const vqd = vqdMatch[1];
      const imagesUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(clean + " product")}&vqd=${vqd}&f=,,,type:photo,&p=1`;
      const imgProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(imagesUrl)}`;
      const imgRes = await fetch(imgProxyUrl);
      if (imgRes.ok) {
        const d = await imgRes.json();
        const rawResults = Array.isArray(d.results) ? d.results : [];
        const formatted = rawResults
          .filter(r => r && r.image && r.image.startsWith("http"))
          .slice(0, limit)
          .map(r => {
            let domain = "web";
            try {
              domain = new URL(r.image).hostname.replace(/^www\./, "");
            } catch {}
            return {
              title: r.title || clean,
              imageUrl: r.image,
              thumbnail: r.thumbnail || r.image,
              source: domain
            };
          });
        if (formatted.length > 0) return formatted;
      }
    }
  } catch (err) {
    console.warn("[WebSearch] Intento CORS Proxy DuckDuckGo finalizó con error:", err);
  }

  return [];
}

/**
 * Descarga una imagen remota y la convierte en DataURL Base64 para evitar Tainted Canvas
 */
export async function fetchImageAsDataUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("http")) return imageUrl;

  // 1. Intento 1: API local
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
  } catch {}

  // 1.1 Intento servidor local Node en puerto 3000
  try {
    const localRes = await fetch("http://localhost:3000/api/search-product-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "proxy-base64", url: imageUrl })
    });
    if (localRes.ok) {
      const d = await localRes.json();
      if (d && d.success && d.dataUrl) return d.dataUrl;
    }
  } catch {}

  // 2. Intento 2: Vercel Production
  try {
    const res = await fetch(`${VERCEL_PRODUCTION_URL}/api/search-product-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "proxy-base64", url: imageUrl })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && d.dataUrl) return d.dataUrl;
    }
  } catch {}

  // 3. Intento 3: Descarga directa vía CORS Proxy
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(imageUrl)}`;
    const imgRes = await fetch(proxyUrl);
    if (imgRes.ok) {
      const blob = await imgRes.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  // Retornar URL original si los proxies fallan
  return imageUrl;
}
