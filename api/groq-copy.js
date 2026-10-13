/* Vercel Serverless Function: Generación de Copy y Fichas Facebook Marketplace con Groq LLM */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action = "marketplace-listing", title = "", description = "", priceUsd = 0, priceNio = 0 } = req.body || {};
  const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  // MODO 1: Limpieza y estructuración técnica para Catálogo Web (Facebook -> Web)
  if (action === "clean-catalog-description") {
    const fallbackDesc = `${title} verificado para miembros The Wired Club.
• Estado: Artículo original verificado físicamente en tienda
• Garantía: Cobertura oficial MeltyDeays por 30 días
• Entrega: Entrega física y prueba técnica en mostrador`;

    if (GROQ_KEYS.length === 0) {
      return res.status(200).json({ catalogDescription: fallbackDesc });
    }

    const cleanSystemPrompt = `Eres el catalogador técnico oficial de "MeltyDeays · The Wired Club" (tienda especializada en periféricos, mandos y hardware gaming).
Tu tarea es convertir títulos y publicaciones informales de Facebook Marketplace en descripciones técnicas formales, limpias y atractivas para el catálogo de la tienda web.

ESTRUCTURA EXACTA OBLIGATORIA:
1. Primera línea: Un resumen breve, profesional y atractivo del producto (ej: "Controlador bluetooth multiplataforma de grado competitivo con joysticks electromagnéticos anti-drift.").
2. Siguientes líneas: Viñetas técnicas con especificaciones deducidas y limpias, con el formato exacto "• Categoría: Detalle técnico".

REGLAS ESTRICTAS DE LIMPIEZA:
- ELIMINAR completamente: números de teléfono, enlaces de WhatsApp, lugares de entrega ("metrocentro", "galerías", etc.), "inbox", "precio negociable", frases de chat informal o emojis.
- Responde ÚNICAMENTE el texto formateado final, sin saludos ni introducciones.`;

    for (const apiKey of GROQ_KEYS) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            temperature: 0.2,
            messages: [
              { role: "system", content: cleanSystemPrompt },
              { role: "user", content: `Título: ${title}\nTexto o detalles de Facebook: ${description || title}` }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 20) {
            return res.status(200).json({ catalogDescription: content });
          }
        }
      } catch (err) {
        console.warn("Rotación de clave en clean-catalog-description:", err.message);
      }
    }

    return res.status(200).json({ catalogDescription: fallbackDesc });
  }

  // MODO 2: Ficha comercial persuasiva y estética para publicar en Marketplace (Web -> Facebook)
  function buildFallbackMarketplaceCopy(prodTitle, prodDesc) {
    const cleanLines = (prodDesc || "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.toLowerCase().includes("precio") && !l.includes("$") && !l.toLowerCase().includes("c$"));

    const featureBullets = cleanLines.length > 0
      ? cleanLines.map(l => l.startsWith("•") ? l : `• 🚀 ${l}`).join("\n")
      : `• 🕹️ Condición: Artículo original verificado y garantizado físicamente\n• ⚡ Rendimiento: Alto desempeño y compatibilidad garantizada\n• 📦 Entrega: Disponible para retiro o entrega inmediata`;

    return `✨ ${prodTitle}

⚡ CARACTERÍSTICAS PRINCIPALES:
${featureBullets}

🛡️ GARANTÍA & RESPALDO:
• Cobertura y garantía oficial MeltyDeays con revisión técnica presencial en tienda física.

🎁 THE WIRED CLUB (OFERTAS EXCLUSIVAS EN NUESTRA WEB):
• Visita nuestra página web oficial para explorar promociones y ofertas especiales de socios.
• 💎 Bono de Bienvenida: Recibe $5 USD en puntos (250 WP) al registrarte por primera vez desde tu dispositivo, canjeables por descuentos en artículos seleccionados de nuestro catálogo.

📲 PEDIDOS Y ATENCIÓN DIRECTA:
• WhatsApp / Teléfono: 5843-8412`;
  }

  if (GROQ_KEYS.length === 0) {
    return res.status(200).json({
      marketTitle: title.slice(0, 75),
      marketDescription: buildFallbackMarketplaceCopy(title, description),
      categorySuggestion: "Videojuegos y Consolas"
    });
  }

  const systemPrompt = `Eres un copywriter experto en ventas para Facebook Marketplace en Nicaragua (MeltyDeays · The Wired Club).
Tu objetivo es redactar publicaciones de alta conversión, sumamente atractivas, estéticas y profesionales.

REGLAS ESTRICTAS DE FORMATO Y CONTENIDO:
1. "marketTitle": Máximo 75 caracteres. Atractivo, incluye palabras clave y estado (Nuevo/Garantía). PROHIBIDO incluir precios en el título.
2. "marketDescription":
   - PROHIBIDO TERMINANTEMENTE mencionar precios o montos de dinero en el texto de la descripción (el precio se ingresa exclusivamente en la casilla nativa de precio de Marketplace).
   - Cada apartado y característica DEBE tener un ícono llamativo y temático (⚡, 🎮, 🛡️, 💎, 🎁, 📲, 🚀, 📦). Cero texto plano sin formato.
   - ESTRUCTURA OBLIGATORIA:
     • Apertura llamativa del producto con icono (ej: ✨ [Nombre del producto]).
     • ⚡ CARACTERÍSTICAS PRINCIPALES: Viñetas breves con especificaciones técnicas e iconos temáticos al inicio de cada línea.
     • 🛡️ GARANTÍA & RESPALDO: Cobertura oficial MeltyDeays con revisión técnica física en tienda.
     • 🎁 THE WIRED CLUB (OFERTAS EXCLUSIVAS EN NUESTRA WEB): Invitar a visitar nuestra plataforma web donde tenemos ofertas especiales con descuentos de socios y destacar que al registrarse por primera vez en su dispositivo reciben un Bono de Bienvenida de $5 USD en puntos (250 WP) para canjear en descuentos en artículos seleccionados de nuestro catálogo.
     • 📲 CONTACTO Y PEDIDOS DIRECTOS: WhatsApp / Teléfono 58438412 (5843-8412).
3. "categorySuggestion": Categoría recomendada de Facebook Marketplace.

Responde ÚNICAMENTE un objeto JSON válido con las claves: "marketTitle", "marketDescription", "categorySuggestion".`;

  const userPrompt = `Producto: ${title}
Detalles técnicos o descripción web: ${description}
(Nota: NUNCA incluyas menciones de precio en el texto de la descripción)`;

  for (const apiKey of GROQ_KEYS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && parsed.marketDescription) {
            return res.status(200).json(parsed);
          }
        }
      }
    } catch (err) {
      console.warn("Rotación de clave Groq en groq-copy:", err.message);
    }
  }

  return res.status(200).json({
    marketTitle: title.slice(0, 75),
    marketDescription: buildFallbackMarketplaceCopy(title, description),
    categorySuggestion: "Videojuegos y Consolas"
  });
};
