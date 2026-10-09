/* Vercel Serverless Function: Sincronizador 24/7 Facebook Marketplace <-> Web con IA (Groq) */

const FB_PROFILE_ID = "100071051942718";
const FB_PROFILE_URL = `https://www.facebook.com/marketplace/profile/${FB_PROFILE_ID}/`;
const FIRESTORE_PROJECT_ID = "lain-wired-club";
const FIRESTORE_API_KEY = "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig";
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

const EXCHANGE_RATE_NIO = 37.0;
const HF_TOKEN = process.env.HF_TOKEN || "";

const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
  .split(",")
  .map(k => k.trim())
  .filter(Boolean);

function getRandomGroqKey() {
  if (!GROQ_KEYS.length) return "";
  return GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];
}

function isBrandVerifiable(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  const KNOWN_BRANDS = [
    "acer", "predator", "helios", "gamesir", "anker", "powercore",
    "tp-link", "tplink", "asus", "lenovo", "dell", "hp", "apple",
    "sony", "nintendo", "xbox", "logitech", "razer", "samsung", "xiaomi"
  ];
  return KNOWN_BRANDS.some(b => new RegExp(`\\b${b}\\b`, "i").test(text));
}

const HIGH_END_HARDWARE_REGEX = /(laptop|computadora|notebook|predator|helios|rtx\s*\d+|gtx\s*\d+|radeon|intel\s*(core\s*)?ultra|core\s*i[79]|ryzen\s*[79]|macbook|torre\s*gamer|pc\s*gamer)/i;

/**
 * Normaliza precios con detección inteligente de moneda (USD / NIO):
 * - Moneda explícita: Si 'currency' es "USD" o contiene "$" (sin "C$").
 * - Inferencia por categoría técnica: Laptops, GPUs RTX, Intel Core Ultra y hardware de alto valor
 *   con montos >= 250 se reconocen automáticamente en DÓLARES (USD), no en córdobas.
 * - Periféricos estándar:
 *   [0, 200] => USD
 *   >= 201 => Córdobas (NIO)
 */
function normalizePriceByThreshold(rawValue, currency = "", title = "", description = "") {
  if (typeof rawValue === "string") {
    if (rawValue.includes("C$") && !currency) {
      currency = "NIO";
    }
    rawValue = rawValue.replace(/[^0-9.]/g, "");
  }
  const val = parseFloat(rawValue) || 0;
  if (val <= 0) return { priceUsd: 0, priceNio: 0, currency: "USD", raw: 0 };

  const cleanCurr = String(currency || "").toUpperCase().trim();
  const fullText = `${title || ""} ${description || ""}`;
  const isHighEndHardware = HIGH_END_HARDWARE_REGEX.test(fullText);

  // 1. Detección explícita de Córdobas si el monto es grande (>= 5000) o viene marcado C$/NIO
  if ((cleanCurr === "NIO" || cleanCurr.includes("C$")) && (val >= 5000 || !isHighEndHardware)) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return { priceUsd: usd, priceNio: nio, currency: "NIO", raw: val };
  }

  // 2. Hardware de alto valor con monto grande (>= 5000) son córdobas (ej. 40700 NIO -> $1100 USD)
  if (isHighEndHardware && val >= 5000) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return { priceUsd: usd, priceNio: nio, currency: "NIO", raw: val };
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
      return { priceUsd: usd, priceNio: nio, currency: "USD", raw: val };
    }
    if (val > 0 && val < 250 && (val * EXCHANGE_RATE_NIO >= 250)) {
      const restoredUsd = Math.round(val * EXCHANGE_RATE_NIO);
      const nio = Math.round(restoredUsd * EXCHANGE_RATE_NIO);
      return { priceUsd: restoredUsd, priceNio: nio, currency: "USD", raw: restoredUsd };
    }
  }

  if (isExplicitUsd) {
    const usd = Number(val.toFixed(2));
    const nio = Math.round(usd * EXCHANGE_RATE_NIO);
    return { priceUsd: usd, priceNio: nio, currency: "USD", raw: val };
  }

  // 5. Si se especificó explícitamente Córdobas
  if (cleanCurr === "NIO" || cleanCurr.includes("C$")) {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return { priceUsd: usd, priceNio: nio, currency: "NIO", raw: val };
  }

  // 6. Umbral estándar para periféricos
  if (val <= 200) {
    const usd = Number(val.toFixed(2));
    const nio = Math.round(usd * EXCHANGE_RATE_NIO);
    return { priceUsd: usd, priceNio: nio, currency: "USD", raw: val };
  } else {
    const nio = Math.round(val);
    const usd = Number((nio / EXCHANGE_RATE_NIO).toFixed(2));
    return { priceUsd: usd, priceNio: nio, currency: "NIO", raw: val };
  }
}

/**
 * Remoción de fondo en la nube con IA (RMBG-1.4 de Hugging Face)
 */
async function removeBackgroundViaHf(imageUrl) {
  if (!HF_TOKEN || !imageUrl || !imageUrl.startsWith("http")) return imageUrl;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return imageUrl;
    const arrayBuffer = await imgRes.arrayBuffer();

    const response = await fetch("https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: arrayBuffer
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:image/png;base64,${base64}`;
    }
  } catch (err) {
    console.warn("Aviso procesando imagen en HF RMBG:", err.message);
  }
  return imageUrl;
}

// Convertidor de primitivos Firestore REST
function parseFirestoreValue(valObj) {
  if (!valObj) return null;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
  if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
  if ("booleanValue" in valObj) return valObj.booleanValue;
  if ("timestampValue" in valObj) return valObj.timestampValue;
  if ("nullValue" in valObj) return null;
  if ("arrayValue" in valObj) {
    const values = valObj.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  if ("mapValue" in valObj) {
    const fields = valObj.mapValue.fields || {};
    const res = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

// Obtener productos actuales de Firestore
async function fetchCurrentWebProducts(collectionName = "rewards") {
  const url = `${BASE_FIRESTORE_URL}/${collectionName}?key=${FIRESTORE_API_KEY}&pageSize=100`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map(doc => {
      const docId = doc.name.split("/").pop();
      const fields = doc.fields || {};
      const parsed = { id: docId };
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = parseFirestoreValue(v);
      }
      return parsed;
    });
  } catch (err) {
    console.error("Error al consultar Firestore en Vercel:", err);
    return [];
  }
}

// Extraer publicaciones del perfil público de Marketplace
async function scrapeFacebookProfileListings() {
  try {
    const res = await fetch(FB_PROFILE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate"
      }
    });

    if (!res.ok) {
      console.warn(`Respuesta Facebook profile HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const listings = [];

    // Estrategia 1: Extraer objetos JSON embebidos de Relay/GraphQL en los script tags
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const scriptTag of scriptMatches) {
      if (scriptTag.includes("marketplace_listing_title") || scriptTag.includes("formatted_price") || scriptTag.includes("listing_price")) {
        try {
          // Extraer patrones de ítems
          const itemRegex = /"listing_id":"(\d+)"[^}]+?"marketplace_listing_title":"([^"]+)"[^}]+?"formatted_price":"([^"]+)"/g;
          let match;
          while ((match = itemRegex.exec(scriptTag)) !== null) {
            const rawVal = parseFloat(match[3].replace(/[^0-9.]/g, "")) || 0;
            const norm = normalizePriceByThreshold(rawVal, match[3], match[2]);
            const lowerPrice = (match[3] || "").toLowerCase();
            const isSold = lowerPrice.includes("vendid") || lowerPrice.includes("agotad") || lowerPrice.includes("sold") || scriptTag.includes(`"listing_id":"${match[1]}","is_sold":true`) || scriptTag.includes(`"is_sold":true`);
            listings.push({
              listingId: match[1],
              title: match[2],
              rawPrice: rawVal,
              priceUsd: norm.priceUsd,
              priceNio: norm.priceNio,
              currency: norm.currency,
              isSold: isSold,
              imageUrl: null
            });
          }
        } catch (e) {
          // Ignorar fragmentos no parseables
        }
      }
    }

    // Estrategia 2: Regex fallback sobre enlaces a marketplace items
    if (listings.length === 0) {
      const linkRegex = /href="\/marketplace\/item\/(\d+)\/"/g;
      let m;
      const seenIds = new Set();
      while ((m = linkRegex.exec(html)) !== null) {
        if (!seenIds.has(m[1])) {
          seenIds.add(m[1]);
          listings.push({
            listingId: m[1],
            title: `Publicación FB #${m[1]}`,
            rawPrice: 0,
            priceUsd: 0,
            priceNio: 0,
            currency: "USD",
            isSold: false,
            imageUrl: null
          });
        }
      }
    }

    return listings;
  } catch (err) {
    console.error("Error al consultar perfil de Facebook en Vercel:", err);
    return [];
  }
}

// Matching inteligente con Groq IA (Llama 3.3)
async function matchListingWithWebProducts(fbListing, webProducts) {
  // 1. Verificación directa por ID previo
  const directMatch = webProducts.find(p => p.facebookListingId === fbListing.listingId);
  if (directMatch) {
    return { matched: true, productId: directMatch.id, isNew: false, confidence: 1.0 };
  }

  // 2. Consulta semántica a Groq LLM con regla de precios explícita
  const productsSummary = webProducts.map(p => `- ID: "${p.id}", Título: "${p.title}", Precio: $${p.priceUsd} USD (C$ ${p.priceNio || Math.round(p.priceUsd * EXCHANGE_RATE_NIO)} NIO)`).join("\n");
  const prompt = `Tienes una publicación de Facebook Marketplace y una lista de productos en nuestro catálogo web.
Determina si la publicación de Facebook corresponde a algún producto de la lista, o si se trata de un PRODUCTO NUEVO subido desde el teléfono.

REGLAS CRÍTICAS DE MONEDA:
- Cualquier precio en Facebook de 0 a 200 son DÓLARES (USD).
- Cualquier precio en Facebook de 201 en adelante son CÓRDOBAS (NIO, tasa de cambio 1 USD = 37 NIO).
Por ejemplo: Si Facebook muestra '1480', son 1480 Córdobas ($40 USD). Si en la web cuesta $40 USD, los precios COINCIDEN.

Publicación Facebook:
- Título: "${fbListing.title}"
- Valor leído en FB: ${fbListing.rawPrice || fbListing.priceUsd} (${fbListing.currency || 'USD'})
- Equivalente normalizado: $${fbListing.priceUsd} USD / C$ ${fbListing.priceNio} NIO

Productos en Catálogo Web:
${productsSummary}

Responde ÚNICAMENTE en JSON con la estructura:
{
  "matched": true | false,
  "productId": "id_del_producto_si_coincide" | null,
  "confidence": 0.0 a 1.0,
  "isNewProduct": true | false
}`;

  const groqKey = getRandomGroqKey();
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.warn("Fallo en inferencia Groq para matching:", err.message);
  }
}

  // Fallback simple por similitud de texto
  const normFb = fbListing.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const textMatch = webProducts.find(p => {
    const normWeb = (p.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return normFb.includes(normWeb) || normWeb.includes(normFb);
  });

  if (textMatch) {
    return { matched: true, productId: textMatch.id, isNew: false, confidence: 0.75 };
  }

  return { matched: false, productId: null, isNew: true, isNewProduct: true, confidence: 0.8 };
}

/**
 * Limpia y estructura la descripción para el catálogo web usando Groq IA.
 * Genera una intro atractiva y extrae viñetas técnicas con formato '• Categoría: Detalle'.
 * Elimina datos informales de Facebook (teléfonos, lugares de entrega, chat).
 */
async function cleanAndFormatDescriptionWithGroq(title, rawDescription) {
  const groqKey = getRandomGroqKey();
  if (groqKey) {
    try {
      const systemPrompt = `Eres el catalogador técnico oficial de "MeltyDeays · The Wired Club" (tienda especializada en periféricos, mandos y hardware gaming).
Tu tarea es convertir títulos y publicaciones informales de Facebook Marketplace en descripciones técnicas formales, limpias y atractivas para el catálogo de la tienda web.

ESTRUCTURA EXACTA OBLIGATORIA:
1. Primera línea: Un resumen breve, profesional y atractivo del producto (ej: "Controlador bluetooth multiplataforma de grado competitivo con joysticks electromagnéticos anti-drift.").
2. Siguientes líneas: Viñetas técnicas con especificaciones deducidas y limpias, con el formato exacto "• Categoría: Detalle técnico".

REGLAS ESTRICTAS DE LIMPIEZA:
- ELIMINAR completamente: números de teléfono, enlaces de WhatsApp, lugares de entrega ("metrocentro", "galerías", etc.), "inbox", "precio negociable", frases de chat informal o emojis.
- Responde ÚNICAMENTE el texto formateado final, sin saludos ni introducciones.`;

      const userPrompt = `Título: ${title}\nTexto o detalles de Facebook: ${rawDescription || title}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 20) {
          return content;
        }
      }
    } catch (err) {
      console.warn("Aviso: Falló estructuración de descripción con Groq:", err.message);
    }
  }

  // Fallback estructurado acorde a los estándares de The Wired Club
  return `${title} verificado para miembros The Wired Club.
• Estado: Artículo original verificado físicamente en tienda
• Garantía: Cobertura oficial MeltyDeays por 30 días
• Entrega: Entrega física y prueba técnica en mostrador`;
}

// Crear producto nuevo en Firestore cuando se detecta subida desde celular
async function createNewProductInFirestore(fbListing, collectionName = "rewards") {
  const norm = normalizePriceByThreshold(fbListing.rawPrice || fbListing.priceUsd, fbListing.currency, fbListing.title, fbListing.description);
  const priceUsd = norm.priceUsd;
  const priceNio = norm.priceNio;
  const docId = `fb_${fbListing.listingId || Date.now()}`;

  // Procesar imagen con IA (Hugging Face RMBG-1.4) para fondo blanco puro
  let finalImage = fbListing.imageUrl || "";
  if (finalImage && finalImage.startsWith("http")) {
    finalImage = await removeBackgroundViaHf(finalImage);
  }
  if (finalImage && finalImage.includes("unsplash.com")) {
    finalImage = "";
  }

  // Todo producto nuevo o sincronizado desde Facebook Marketplace ingresa a la Bandeja de Espera
  // (PENDING_APPROVAL) para revisión de ficha técnica, búsqueda de fotos similares y Luz Verde.
  const productStatus = fbListing.status || "PENDING_APPROVAL";

  // Limpiar y estructurar descripción con IA (Intro breve + viñetas técnicas)
  const structuredDescription = await cleanAndFormatDescriptionWithGroq(fbListing.title, fbListing.description || "");

  // Por defecto, los productos de Facebook ingresan a precio plano oficial (0% descuento inicial en puntos)
  // El administrador decide posteriormente en la web si activa o modifica el porcentaje de descuento en puntos.
  const maxDiscountPct = Number(fbListing.maxDiscountPct || 0);
  const maxDiscountUsd = maxDiscountPct > 0 ? (Math.round(priceUsd * (maxDiscountPct / 100) * 100) / 100) : 0;
  const cashToPayUsd = maxDiscountPct > 0 ? (Math.round((priceUsd - maxDiscountUsd) * 100) / 100) : priceUsd;
  const calculatedPoints = maxDiscountPct > 0 ? Math.max(10, Math.round(maxDiscountUsd * 50)) : 0;

  const isBrand = fbListing.brandVerified !== undefined ? Boolean(fbListing.brandVerified) : isBrandVerifiable(fbListing.title, fbListing.description);
  const hasSelectedMold = isBrand || Boolean(fbListing.hasSelectedMold || (finalImage && !finalImage.includes("unsplash.com")));

  const fields = {
    id: { stringValue: docId },
    reward_id: { stringValue: docId },
    title: { stringValue: fbListing.title },
    description: { stringValue: structuredDescription },
    rawDescription: { stringValue: String(fbListing.description || fbListing.title || "") },
    priceUsd: { doubleValue: priceUsd },
    priceNio: { integerValue: priceNio },
    pointsCost: { integerValue: calculatedPoints },
    points_cost: { integerValue: calculatedPoints },
    imageUrl: { stringValue: finalImage },
    images: { arrayValue: { values: finalImage ? [{ stringValue: finalImage }] : [] } },
    stock: { integerValue: 1 },
    rewardType: { stringValue: "PARTIAL_DISCOUNT" },
    publicationMode: { stringValue: "PARTIAL_DISCOUNT" },
    maxDiscountPct: { integerValue: maxDiscountPct },
    maxDiscountUsd: { doubleValue: maxDiscountUsd },
    cashToPayUsd: { doubleValue: cashToPayUsd },
    status: { stringValue: productStatus },
    brandVerified: { booleanValue: isBrand },
    hasSelectedMold: { booleanValue: hasSelectedMold },
    facebookListingId: { stringValue: String(fbListing.listingId) },
    syncSource: { stringValue: "facebook_mobile_auto_import" },
    lastSyncedAt: { timestampValue: new Date().toISOString() },
    createdAt: { timestampValue: new Date().toISOString() }
  };

  const url = `${BASE_FIRESTORE_URL}/${collectionName}?documentId=${docId}&key=${FIRESTORE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error creando producto en Firestore: ${errText}`);
  }

  return { id: docId, title: fbListing.title, priceUsd };
}

// Actualizar precio e imagen de producto existente
async function updateProductInFirestore(productId, newPriceUsd, fbListingId, collectionName = "rewards_catalog", newImageUrl = null, existingProduct = null) {
  const maskPaths = [
    "updateMask.fieldPaths=priceUsd",
    "updateMask.fieldPaths=facebookListingId",
    "updateMask.fieldPaths=syncSource",
    "updateMask.fieldPaths=lastSyncedAt"
  ];

  const priceUsdNum = Number(newPriceUsd);
  const fields = {
    priceUsd: { doubleValue: priceUsdNum },
    facebookListingId: { stringValue: String(fbListingId) },
    syncSource: { stringValue: "facebook_phone_sync" },
    lastSyncedAt: { timestampValue: new Date().toISOString() }
  };

  if (priceUsdNum > 0) {
    const priceNio = Math.round(priceUsdNum * EXCHANGE_RATE_NIO);
    const maxDiscountPct = (existingProduct && existingProduct.maxDiscountPct !== undefined) ? Number(existingProduct.maxDiscountPct) : 0;
    const maxDiscountUsd = maxDiscountPct > 0 ? (Math.round(priceUsdNum * (maxDiscountPct / 100) * 100) / 100) : 0;
    const cashToPayUsd = maxDiscountPct > 0 ? (Math.round((priceUsdNum - maxDiscountUsd) * 100) / 100) : priceUsdNum;
    const calculatedPoints = maxDiscountPct > 0 ? Math.max(10, Math.round(maxDiscountUsd * 50)) : 0;

    maskPaths.push("updateMask.fieldPaths=priceNio");
    maskPaths.push("updateMask.fieldPaths=maxDiscountPct");
    maskPaths.push("updateMask.fieldPaths=maxDiscountUsd");
    maskPaths.push("updateMask.fieldPaths=cashToPayUsd");
    maskPaths.push("updateMask.fieldPaths=pointsCost");
    maskPaths.push("updateMask.fieldPaths=points_cost");

    fields.priceNio = { integerValue: priceNio };
    fields.maxDiscountPct = { integerValue: maxDiscountPct };
    fields.maxDiscountUsd = { doubleValue: maxDiscountUsd };
    fields.cashToPayUsd = { doubleValue: cashToPayUsd };
    fields.pointsCost = { integerValue: calculatedPoints };
    fields.points_cost = { integerValue: calculatedPoints };
  }

  if (newImageUrl && typeof newImageUrl === "string" && !newImageUrl.includes("unsplash.com")) {
    maskPaths.push("updateMask.fieldPaths=imageUrl");
    maskPaths.push("updateMask.fieldPaths=images");
    fields.imageUrl = { stringValue: newImageUrl };
    fields.images = { arrayValue: { values: [{ stringValue: newImageUrl }] } };
  }

  const mask = maskPaths.join("&");
  const url = `${BASE_FIRESTORE_URL}/${collectionName}/${productId}?${mask}&key=${FIRESTORE_API_KEY}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });

  return res.ok;
}

// Marcar producto como VENDIDO / AGOTADO (activa regla nativa de 12 horas en el catálogo web)
async function markProductSoldInFirestore(productId, collectionName = "rewards_catalog") {
  const mask = [
    "updateMask.fieldPaths=status",
    "updateMask.fieldPaths=stock",
    "updateMask.fieldPaths=soldOutAt",
    "updateMask.fieldPaths=sold_out_at",
    "updateMask.fieldPaths=soldOutReason",
    "updateMask.fieldPaths=syncSource",
    "updateMask.fieldPaths=lastSyncedAt"
  ].join("&");

  const now = new Date().toISOString();
  const url = `${BASE_FIRESTORE_URL}/${collectionName}/${productId}?${mask}&key=${FIRESTORE_API_KEY}`;
  const fields = {
    status: { stringValue: "SOLD_OUT" },
    stock: { integerValue: 0 },
    soldOutAt: { timestampValue: now },
    sold_out_at: { timestampValue: now },
    soldOutReason: { stringValue: "Vendido en Facebook Marketplace" },
    syncSource: { stringValue: "facebook_phone_sold" },
    lastSyncedAt: { timestampValue: now }
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });

  return res.ok;
}

// Handler principal Vercel Serverless Function
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const startTime = Date.now();
  console.log(`[Vercel Sync] Iniciando ciclo de sincronización para perfil ${FB_PROFILE_ID}...`);

  try {
    const collection = req.query.collection || "rewards_catalog";
    const webProducts = await fetchCurrentWebProducts(collection);
    
    // Si la petición trae listings en el body (push directo de webhook o extensión), usarlos; sino scrape
    let fbListings = [];
    if (req.body && Array.isArray(req.body.listings)) {
      fbListings = req.body.listings;
    } else {
      fbListings = await scrapeFacebookProfileListings();
    }

    const report = {
      timestamp: new Date().toISOString(),
      profileId: FB_PROFILE_ID,
      totalWebProducts: webProducts.length,
      totalFacebookFound: fbListings.length,
      updatedProducts: [],
      markedSoldProducts: [],
      newProductsCreated: []
    };

    for (const fbItem of fbListings) {
      if (!fbItem.listingId) continue;

      const norm = normalizePriceByThreshold(
        fbItem.rawPrice !== undefined ? fbItem.rawPrice : (fbItem.priceUsd || fbItem.priceNio || 0),
        fbItem.currency || "",
        fbItem.title || "",
        fbItem.description || ""
      );
      fbItem.priceUsd = norm.priceUsd;
      fbItem.priceNio = norm.priceNio;
      fbItem.currency = norm.currency;

      const decision = await matchListingWithWebProducts(fbItem, webProducts);

      if (decision.matched && decision.productId) {
        const webProd = webProducts.find(p => p.id === decision.productId);
        if (webProd) {
          // Si fue marcado como vendido/agotado en Facebook desde el celular
          if (fbItem.isSold && webProd.status !== "SOLD_OUT") {
            await markProductSoldInFirestore(webProd.id, collection);
            report.markedSoldProducts.push({
              productId: webProd.id,
              title: webProd.title,
              reason: "Vendido en Facebook (activada caducidad visual de 12 horas)"
            });
          } 
          // Si sigue activo: verificar cambio de precio o imagen real
          else if (!fbItem.isSold) {
            const priceChanged = fbItem.priceUsd > 0 && Math.abs(webProd.priceUsd - fbItem.priceUsd) >= 0.5;
            const hasNewRealImage = fbItem.imageUrl && fbItem.imageUrl !== webProd.imageUrl && !fbItem.imageUrl.includes("unsplash.com");
            if (priceChanged || hasNewRealImage) {
              await updateProductInFirestore(webProd.id, fbItem.priceUsd || webProd.priceUsd, fbItem.listingId, collection, hasNewRealImage ? fbItem.imageUrl : null, webProd);
              report.updatedProducts.push({
                productId: webProd.id,
                title: webProd.title,
                oldPrice: webProd.priceUsd,
                newPrice: fbItem.priceUsd || webProd.priceUsd,
                imageUpdated: Boolean(hasNewRealImage),
                source: "facebook_mobile"
              });
            }
          }
        }
      } else if ((decision.isNewProduct || decision.isNew) && fbItem.priceUsd > 0 && !fbItem.isSold) {
        // Producto nuevo subido desde el celular a Facebook: crearlo en la web
        const created = await createNewProductInFirestore(fbItem, collection);
        report.newProductsCreated.push(created);
      }
    }

    report.executionTimeMs = Date.now() - startTime;
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("[Vercel Sync] Error crítico:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
