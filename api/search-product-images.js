/* Vercel Serverless Function: Búsqueda de Fotos de Estudio en la Web y Proxy Seguro */

const PLACEHOLDER_IMG_REGEX = /(brak[-_]?zdj|no[-_]?image|placeholder|sin[-_]?foto|image[-_]?not[-_]?found|default[-_]?image|not[-_]?available|sin[-_]?imagen|missing[-_]?image|preview[-_]?unavailable|no[-_]?photo|brakfoto)/i;

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

    // MODO 1: Proxy de Imagen a DataURL (Evita bloqueo CORS, Tainted Canvas y rescata placeholders muertos)
    if (action === "proxy-base64" || proxyUrl) {
      const targetUrl = proxyUrl || body.url;
      const fallbackUrl = body.fallbackUrl || queryParams.fallbackUrl;

      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({ error: "URL inválida para proxy" });
      }

      async function fetchBufferWithValidation(url) {
        if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.google.com/",
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
          });
          clearTimeout(timeout);
          if (!res.ok) return null;

          const cType = res.headers.get("content-type") || "image/jpeg";
          if (cType.includes("text/html") || cType.includes("application/json")) return null;

          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 200) return null;

          // Detectar placeholder de ecsmedia.pl (7273 bytes GIF 'brak zdjęcia') y similares
          if (buf.length === 7273 && cType.includes("gif")) return null;
          if (url.includes("ecsmedia.pl") && cType.includes("gif") && !url.toLowerCase().endsWith(".gif")) return null;

          return { buffer: buf, contentType: cType };
        } catch {
          return null;
        }
      }

      // 1. Intento primario con targetUrl
      let imgData = await fetchBufferWithValidation(targetUrl);

      // 2. Si falló o resultó ser un placeholder, recurrir a fallbackUrl en alta resolución
      if (!imgData && fallbackUrl && fallbackUrl.startsWith("http") && fallbackUrl !== targetUrl) {
        let optFallback = fallbackUrl;
        if (fallbackUrl.includes("bing.net/th")) {
          try {
            const u = new URL(fallbackUrl);
            u.searchParams.set("w", "800");
            u.searchParams.set("h", "800");
            u.searchParams.set("c", "7");
            u.searchParams.set("rs", "1");
            optFallback = u.toString();
          } catch {}
        }
        imgData = await fetchBufferWithValidation(optFallback);
        if (!imgData && optFallback !== fallbackUrl) {
          imgData = await fetchBufferWithValidation(fallbackUrl);
        }
      }

      if (!imgData) {
        return res.status(422).json({ error: "No se pudo descargar una imagen válida ni desde la URL ni desde su respaldo" });
      }

      const base64 = imgData.buffer.toString("base64");
      const dataUrl = `data:${imgData.contentType};base64,${base64}`;

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

    const limit = Math.min(24, Math.max(6, parseInt(body.limit || queryParams.limit || 12, 10)));
    const description = (body.description || queryParams.description || "").trim();

    // 1. Identificación de categoría y construcción de facetas visuales especializadas
    const qLower = cleanQuery.toLowerCase();
    const isBlower = /soplador|fan|turb|ventilador|jet|violent/i.test(qLower);
    const isGamepad = /mando|control|gamesir|gamepad|joystick/i.test(qLower);

    const facets = [];
    if (isBlower) {
      facets.push(
        { key: "mold", label: "Molde / Dispositivo 2 en 1", q: "Violent Fan Mini Jet Fan 2 in 1 blower vacuum" },
        { key: "box", label: "Caja / Empaque", q: "Violent Fan Mini Jet Fan packaging box" },
        { key: "kit", label: "Kit con Accesorios", q: "Violent Fan handheld air blower accessories kit" },
        { key: "variant", label: "Variante Comercial", q: "Violent Fan turbo jet fan 130000 RPM" }
      );
    } else if (isGamepad) {
      facets.push(
        { key: "mold", label: "Dispositivo / Molde", q: `${cleanQuery} wireless controller gamepad` },
        { key: "box", label: "Caja / Empaque", q: `${cleanQuery} packaging box retail` },
        { key: "kit", label: "Kit con Accesorios", q: `${cleanQuery} accesorios cable soporte` },
        { key: "variant", label: "Variante Comercial", q: `${cleanQuery} official model version` }
      );
    } else {
      facets.push(
        { key: "mold", label: "Dispositivo / Molde", q: `${cleanQuery} product studio` },
        { key: "box", label: "Caja / Empaque", q: `${cleanQuery} packaging retail box` },
        { key: "kit", label: "Kit con Accesorios", q: `${cleanQuery} kit accesorios` },
        { key: "variant", label: "Variante Comercial", q: `${cleanQuery} official model version` }
      );
    }

    // 2. Extractor Primario DuckDuckGo (Alta precisión e-commerce, evita contaminación de autos Mini Cooper)
    async function fetchDuckDuckGoFacet(queryStr, facetKey, facetLabel) {
      try {
        const ddgSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(queryStr)}&t=h_&iar=images&iax=images&ia=images`;
        const tokenRes = await fetch(ddgSearchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        const ddgHtml = await tokenRes.text();
        const vqdMatch = ddgHtml.match(/vqd=([0-9-]+)/) || ddgHtml.match(/vqd=["']([0-9-]+)["']/) || ddgHtml.match(/vqd=([^&"']+)/);
        const vqd = vqdMatch ? vqdMatch[1] : null;
        if (!vqd) return [];

        const imagesUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(queryStr)}&vqd=${vqd}&f=,,,type:photo,&p=1`;
        const imgRes = await fetch(imagesUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://duckduckgo.com/"
          }
        });
        if (!imgRes.ok) return [];
        const data = await imgRes.json();
        return (data.results || [])
          .filter(r => r && r.image && r.image.startsWith("http") && !PLACEHOLDER_IMG_REGEX.test(r.image) && !PLACEHOLDER_IMG_REGEX.test(r.title || ""))
          .slice(0, 6)
          .map(r => {
            let domain = "web";
            try { domain = new URL(r.image).hostname.replace(/^www\./, ""); } catch { domain = r.domain || "web"; }
            return {
              title: r.title || cleanQuery,
              imageUrl: r.image,
              thumbnail: r.thumbnail || r.image,
              width: r.width || 800,
              height: r.height || 800,
              source: domain,
              facet: facetKey,
              facetLabel: facetLabel
            };
          });
      } catch (err) {
        return [];
      }
    }

    // 3. Extractor Secundario Bing con filtros de exclusión (descarta autos, wallpapers y turismo)
    async function fetchBingFacet(facetObj) {
      try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(facetObj.q)}&form=HDRSC2&first=1`;
        const bRes = await fetch(bingUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
          }
        });
        if (!bRes.ok) return [];
        const html = await bRes.text();
        const regex = /class="iusc"[^>]+m="([^"]+)"/g;
        let match;
        const items = [];
        const excludedDomains = /paultan|motor1|theautopian|cargurus|caranddriver|autoblog|wallpaper|gettyimages|discoverwalks|tripadvisor|wikipedia/i;

        while ((match = regex.exec(html)) !== null && items.length < 8) {
          try {
            const parsed = JSON.parse(match[1].replace(/&quot;/g, '"'));
            if (!parsed.murl || !parsed.murl.startsWith("http") || PLACEHOLDER_IMG_REGEX.test(parsed.murl)) continue;
            let domain = "web";
            try { domain = new URL(parsed.murl).hostname.replace(/^www\./, ""); } catch {}
            if (excludedDomains.test(domain)) continue;

            const titleClean = (parsed.t || parsed.desc || "").replace(/[\uE000-\uF8FF]/g, "").replace(/&#\d+;/g, "").trim();
            if (/cooper|bmw|yamaha|honda|paris|tour/i.test(titleClean) || PLACEHOLDER_IMG_REGEX.test(titleClean)) continue;

            items.push({
              title: titleClean || cleanQuery,
              imageUrl: parsed.murl,
              thumbnail: parsed.turl || parsed.murl,
              width: parsed.ow || 800,
              height: parsed.oh || 800,
              source: domain,
              facet: facetObj.key,
              facetLabel: facetObj.label
            });
          } catch (e) {}
        }
        return items;
      } catch (err) {
        return [];
      }
    }

    // Ejecutar facetas en paralelo: DuckDuckGo primario para precisión e-commerce
    const ddgPromises = facets.map(f => fetchDuckDuckGoFacet(f.q, f.key, f.label));
    const bingPromises = facets.map(f => fetchBingFacet(f));
    const [ddgSettled, bingSettled] = await Promise.all([
      Promise.allSettled(ddgPromises),
      Promise.allSettled(bingPromises)
    ]);

    const facetResults = [];
    for (let i = 0; i < facets.length; i++) {
      const ddgItems = ddgSettled[i].status === "fulfilled" ? ddgSettled[i].value : [];
      const bingItems = bingSettled[i].status === "fulfilled" ? bingSettled[i].value : [];
      // DuckDuckGo primero por precisión de producto, complementado con Bing filtrado
      facetResults.push([...ddgItems, ...bingItems]);
    }

    // 4. Algoritmo de Fusión Google Lens: Round-Robin Interleaving + Diversidad de Dominio
    const formatted = [];
    const seenUrls = new Set();
    const domainCounts = {};
    const maxPerDomain = 2;

    let maxLen = 0;
    for (const list of facetResults) {
      if (list.length > maxLen) maxLen = list.length;
    }

    // Ronda 1: Intercalar garantizando 1 de cada faceta (dispositivo, caja, kit, variante)
    for (let round = 0; round < maxLen; round++) {
      for (const list of facetResults) {
        if (round < list.length) {
          const item = list[round];
          const normUrl = item.imageUrl.toLowerCase().split('?')[0];
          if (seenUrls.has(normUrl)) continue;

          const dCount = domainCounts[item.source] || 0;
          if (dCount >= maxPerDomain && formatted.length < limit) {
            continue;
          }

          seenUrls.add(normUrl);
          domainCounts[item.source] = dCount + 1;
          formatted.push(item);
          if (formatted.length >= limit) break;
        }
      }
      if (formatted.length >= limit) break;
    }

    // Ronda 2: Si aún falta para el límite, admitir los restantes no duplicados
    if (formatted.length < limit) {
      for (const list of facetResults) {
        for (const item of list) {
          const normUrl = item.imageUrl.toLowerCase().split('?')[0];
          if (!seenUrls.has(normUrl)) {
            seenUrls.add(normUrl);
            formatted.push(item);
            if (formatted.length >= limit) break;
          }
        }
        if (formatted.length >= limit) break;
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
