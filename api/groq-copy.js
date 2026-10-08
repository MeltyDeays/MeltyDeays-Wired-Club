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

  const { title = "", description = "", priceUsd = 0, priceNio = 0 } = req.body || {};
  const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

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
          model: "llama-3.3-70b-versatile",
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
}
