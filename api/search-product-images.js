/* Vercel Serverless Function: Búsqueda de Fotos de Estudio en la Web y Proxy Seguro */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

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

    // MODO 2: Búsqueda de Fotos de Estudio en la Web (Bing + DuckDuckGo)
    const rawQuery = body.query || queryParams.q || "";
    if (!rawQuery.trim()) {
      return res.status(400).json({ error: "Parámetro 'query' o 'q' requerido" });
    }

    // Limpieza de términos de ruido preservando caracteres en español
    const cleanQuery = rawQuery
      .replace(/C\$\s*\d+([.,]\d+)?/gi, "")
      .replace(/\$\s*\d+([.,]\d+)?/gi, "")
      .replace(/\b(Juigalpa|Chontales|Managua|Metrocentro|Galerias|Esteli|Matagalpa|Leon|Masaya)\b/gi, "")
      .replace(/\b(nuevo en caja|en caja|sellado|ganga|oferta|inbox|negociable|whatsapp|contacto)\b/gi, "")
      .replace(/[^\w\s\-\.\+áéíóúÁÉÍÓÚñÑ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const searchQuery = `${cleanQuery} product`;
    let formatted = [];

    // 1. MOTOR PRIMARIO: Bing Image Search (Directo, sin tokens ni bloqueo en servidor en la nube)
    try {
      const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC2&first=1`;
      const bingRes = await fetch(bingUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        }
      });

      if (bingRes.ok) {
        const html = await bingRes.text();
        const regex = /murl&quot;:&quot;(https?:[^&]+)&quot;[^>]*?turl&quot;:&quot;(https?:[^&]+)&quot;[^>]*?t&quot;:&quot;([^&]*)&quot;/g;
        let m;
        while ((m = regex.exec(html)) !== null && formatted.length < 12) {
          let domain = "web";
          try { domain = new URL(m[1]).hostname.replace(/^www\./, ""); } catch {}
          formatted.push({
            title: m[3] ? m[3].replace(/&#\d+;/g, "").trim() : cleanQuery,
            imageUrl: m[1],
            thumbnail: m[2] || m[1],
            width: 800,
            height: 800,
            source: domain
          });
        }

        if (formatted.length === 0) {
          const simpleRegex = /murl&quot;:&quot;(https?:[^&]+)&quot;/g;
          while ((m = simpleRegex.exec(html)) !== null && formatted.length < 12) {
            let domain = "web";
            try { domain = new URL(m[1]).hostname.replace(/^www\./, ""); } catch {}
            formatted.push({
              title: cleanQuery,
              imageUrl: m[1],
              thumbnail: m[1],
              width: 800,
              height: 800,
              source: domain
            });
          }
        }
      }
    } catch (bErr) {
      console.warn("Aviso búsqueda Bing:", bErr.message);
    }

    // 2. MOTOR DE RESPALDO: DuckDuckGo si Bing devuelve menos de 3 resultados
    if (formatted.length < 3) {
      try {
        const ddgSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&t=h_&iar=images&iax=images&ia=images`;
        const tokenRes = await fetch(ddgSearchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        const ddgHtml = await tokenRes.text();
        const vqdMatch = ddgHtml.match(/vqd=([0-9-]+)/) || ddgHtml.match(/vqd=["']([0-9-]+)["']/) || ddgHtml.match(/vqd=([^&"']+)/);
        const vqd = vqdMatch ? vqdMatch[1] : null;

        if (vqd) {
          const imagesUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,type:photo,&p=1`;
          const imgRes = await fetch(imagesUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://duckduckgo.com/"
            }
          });

          if (imgRes.ok) {
            const data = await imgRes.json();
            const rawResults = Array.isArray(data.results) ? data.results : [];
            const ddgFormatted = rawResults
              .filter(r => r && r.image && r.image.startsWith("http"))
              .slice(0, 12 - formatted.length)
              .map(r => {
                let domain = "";
                try { domain = new URL(r.image).hostname.replace(/^www\./, ""); } catch { domain = r.domain || "web"; }
                return {
                  title: r.title || cleanQuery,
                  imageUrl: r.image,
                  thumbnail: r.thumbnail || r.image,
                  width: r.width || 800,
                  height: r.height || 800,
                  source: domain
                };
              });
            formatted = formatted.concat(ddgFormatted);
          }
        }
      } catch (ddgErr) {
        console.warn("Aviso búsqueda DuckDuckGo:", ddgErr.message);
      }
    }

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
