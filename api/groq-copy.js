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

  // MODO 2: Ficha comercial persuasiva para publicar en Marketplace (Web -> Facebook)
  if (GROQ_KEYS.length === 0) {
    return res.status(200).json({
      marketTitle: title.slice(0, 80),
      marketDescription: `${title}\n\n${description}\n\n💵 Precio: $${priceUsd} (C$ ${priceNio})\n📦 Entrega inmediata disponible.`,
      categorySuggestion: "Varios"
    });
  }

  const systemPrompt = `Eres un experto en ventas de comercio electrónico y Facebook Marketplace en Nicaragua/Centroamérica.
Tu objetivo es transformar los datos de un producto en una publicación de alta conversión para Facebook Marketplace.

Reglas estrictas de formato:
1. "marketTitle": Máximo 80 caracteres. Directo, incluye palabras clave y estado (Nuevo/Garantía). Sin emojis en el título.
2. "marketDescription": Formato persuasivo, viñetas cortas, especificaciones técnicas claras, llamada a la acción ("Escríbenos al inbox o WhatsApp para entrega"). Incluir precio en USD ($) y Córdobas (C$).
3. "categorySuggestion": Categoría recomendada de Facebook Marketplace.

Responde ÚNICAMENTE un objeto JSON válido con los campos: "marketTitle", "marketDescription", "categorySuggestion".`;

  const userPrompt = `Producto: ${title}
Descripción técnica actual: ${description}
Precio USD: $${priceUsd}
Precio NIO: C$${priceNio}`;

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
          return res.status(200).json(JSON.parse(content));
        }
      }
    } catch (err) {
      console.warn("Rotación de clave Groq en groq-copy:", err.message);
    }
  }

  return res.status(200).json({
    marketTitle: title.slice(0, 80),
    marketDescription: `${title}\n\n${description}\n\n💵 Precio: $${priceUsd} (C$ ${priceNio})\n📦 Entrega inmediata disponible.`,
    categorySuggestion: "Varios"
  });
};
