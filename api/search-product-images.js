/* Vercel Serverless Function: Búsqueda de Fotos de Estudio en la Web y Proxy Seguro */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const isPost = req.method === "POST";
    const body = isPost ? (req.body || {}) : {};
    const queryParams = req.query || {};

    const action = body.action || queryParams.action || "search";
    const proxyUrl = body.url || queryParams.url || queryParams.proxyUrl;

    // MODO 1: Proxy de Imagen a DataURL (Evita bloqueo CORS y Tainted Canvas en el navegador)
    if (action === "proxy-base64" || proxyUrl) {
      const targetUrl = proxyUrl || body.url;
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({ error: "URL inválida para proxy" });
      }

      const imgRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.google.com/"
        }
      });

      if (!imgRes.ok) {
        return res.status(imgRes.status).json({ error: "No se pudo descargar la imagen remota" });
      }

      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;

      return res.status(200).json({ success: true, dataUrl });
    }

    // MODO 2: Búsqueda de Fotos de Estudio en la Web
    const rawQuery = body.query || queryParams.q || "";
    if (!rawQuery.trim()) {
      return res.status(400).json({ error: "Parámetro 'query' o 'q' requerido" });
    }

    // Limpieza de términos de ruido de Facebook Marketplace (moneda, departamentos de Nicaragua, chat)
    const cleanQuery = rawQuery
      .replace(/C\$\s*\d+([.,]\d+)?/gi, "")
      .replace(/\$\s*\d+([.,]\d+)?/gi, "")
      .replace(/\b(Juigalpa|Chontales|Managua|Metrocentro|Galerias|Esteli|Matagalpa|Leon|Masaya)\b/gi, "")
      .replace(/\b(nuevo en caja|en caja|sellado|ganga|oferta|inbox|negociable|whatsapp|contacto)\b/gi, "")
      .replace(/[^\w\s\-\.\+]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const searchQuery = `${cleanQuery} product studio`;

    // 1. Obtener token VQD de DuckDuckGo
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&t=h_&iar=images&iax=images&ia=images`;
    const tokenRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([0-9-]+)["']/) || html.match(/vqd=([^&"']+)/);
    const vqd = vqdMatch ? vqdMatch[1] : null;

    if (!vqd) {
      return res.status(200).json({ success: true, results: [], message: "No se pudo obtener token de búsqueda" });
    }

    // 2. Consultar endpoint de imágenes DuckDuckGo
    const imagesUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,type:photo,&p=1`;
    const imgRes = await fetch(imagesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://duckduckgo.com/"
      }
    });

    if (!imgRes.ok) {
      return res.status(200).json({ success: true, results: [] });
    }

    const data = await imgRes.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];

    // 3. Filtrar y formatear resultados (priorizar fuentes de e-commerce y dimensiones nítidas)
    const formatted = rawResults
      .filter(r => r && r.image && r.image.startsWith("http"))
      .slice(0, 12)
      .map(r => {
        let domain = "";
        try {
          domain = new URL(r.image).hostname.replace(/^www\./, "");
        } catch {
          domain = r.domain || r.source || "web";
        }

        return {
          title: r.title || cleanQuery,
          imageUrl: r.image,
          thumbnail: r.thumbnail || r.image,
          width: r.width || 800,
          height: r.height || 800,
          source: domain
        };
      });

    return res.status(200).json({
      success: true,
      query: cleanQuery,
      total: formatted.length,
      results: formatted
    });

  } catch (err) {
    console.error("Error en api/search-product-images:", err);
    return res.status(500).json({ error: err.message });
  }
};
