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
            model: "llama-3.3-70b-versatile",
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

  // MODO 3: Combinación de descripciones para Combos
  if (action === "combine-combo-descriptions") {
    const fallbackCombined = `Este paquete especial incluye varios productos seleccionados por su calidad y compatibilidad.
• Versatilidad: Conjunto optimizado para ofrecer el mejor rendimiento.
• Valor: Ahorro exclusivo al adquirir el combo completo.
• Respaldo: Cada artículo cuenta con su propia garantía MeltyDeays.`;

    if (GROQ_KEYS.length === 0) {
      return res.status(200).json({ combinedDescription: fallbackCombined });
    }

    const combineSystemPrompt = `Eres el redactor experto de "MeltyDeays · The Wired Club". 
Tu tarea es crear una descripción combinada, persuasiva y profesional para un COMBO DE PRODUCTOS.
Recibirás las descripciones individuales de los artículos que integran el paquete.

REGLAS DE ORO:
1. Crea una introducción breve (máximo 2 líneas) que explique por qué este combo es excelente.
2. Agrupa las características más importantes de TODOS los productos en una lista de viñetas limpia.
3. Usa emojis variados y temáticos al inicio de cada viñeta.
4. Mantén un tono profesional y tecnológico.
5. Responde ÚNICAMENTE el texto de la descripción final (intro + viñetas), sin saludos.`;

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
            temperature: 0.5,
            messages: [
              { role: "system", content: combineSystemPrompt },
              { role: "user", content: `Título del Combo: ${title}\n\nDetalles de los productos integrantes:\n${description}` }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 50) {
            return res.status(200).json({ combinedDescription: content });
          }
        }
      } catch (err) {
        console.warn("Rotación de clave en combine-combo-descriptions:", err.message);
      }
    }

    return res.status(200).json({ combinedDescription: fallbackCombined });
  }

  // MODO 2: Ficha comercial persuasiva y estética para publicar en Marketplace (Web -> Facebook)
  function getContextualEmojiForFeature(text) {
    const t = text.toLowerCase();
    if (/viento|soplador|turbo|flujo|aspirador|aire|enfriad|disipad|ventilad|fan/.test(t)) return "🌪️";
    if (/motor|brushless|rpm|potencia|velocidad|fuerza|watts/.test(t)) return "⚡";
    if (/bater[ií]a|mah|recargable|autonom[ií]a|carga|duraci[oó]n/.test(t)) return "🔋";
    if (/boquilla|magn[eé]tica|filtro|lavable|dep[oó]sito|accesorio|cepillo/.test(t)) return "🧲";
    if (/inal[aá]mbrico|bluetooth|wifi|conexi[oó]n|type-c|usb|puerto|cable/.test(t)) return "🔌";
    if (/laptop|pc|computador|teclado|consola|celular|auto|compatible|mantenimiento/.test(t)) return "💻";
    if (/linterna|luz|led|ilumina|alumbra|rgb/.test(t)) return "💡";
    if (/silencio|silencioso|ruido|db|sonido/.test(t)) return "🔇";
    if (/ergon[oó]mico|agarre|diseño|aluminio|port[aá]til|bolsillo|peso/.test(t)) return "🖐️";
    if (/2 en 1|multifunci[oó]n|funci[oó]n/.test(t)) return "🔄";
    if (/caja|nuevo|sellado|original|accesorios/.test(t)) return "📦";
    return "⚡";
  }

  function buildFallbackMarketplaceCopy(prodTitle, prodDesc) {
    const cleanLines = (prodDesc || "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => {
        if (!l) return false;
        const low = l.toLowerCase();
        if (low.includes("precio") || low.includes("$") || low.includes("c$")) return false;
        if (low.includes("whatsapp") || low.includes("contacto:") || low.includes("5843")) return false;
        if (low.includes("entrega gratis") || low.includes("cargotrans") || low.includes("envíos a todo")) return false;
        if (low.includes("30 días de garantía") || low.includes("garantía:") || low.includes("garantía directa")) return false;
        if (low.includes("características principales") || low.includes("lo que incluye y")) return false;
        return true;
      });

    const featureBullets = cleanLines.length > 0
      ? cleanLines.map(line => {
          let clean = line.replace(/^[•\-\*]\s*(?:🚀\s*)?/g, "").trim();
          // Si la línea ya tiene un emoji inicial válido, preservarlo
          const hasInitialEmoji = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(clean);
          if (hasInitialEmoji) {
            return `• ${clean}`;
          }
          const emoji = getContextualEmojiForFeature(clean);
          return `• ${emoji} ${clean}`;
        }).join("\n")
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
• WhatsApp / Teléfono: 5843-8412
• 📍 Entregas personales en Juigalpa y envíos seguros a toda Nicaragua`;
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
   - En "⚡ CARACTERÍSTICAS PRINCIPALES:", CADA viñeta DEBE tener su propio emoji temático adecuado a lo que describe exactamente (ej: 🌪️/💨 para ventilación o sopladores, ⚡ para potencia o motor, 🔋 para batería, 🧲 para boquillas o imanes, 💻 para compatibilidad con PC/laptops, 💡 para linterna, 🔇 para nivel de ruido, 🖐️ para ergonomía, 📦 para empaque).
   - PROHIBIDO terminantemente repetir el mismo emoji (como 🚀) en todas las líneas. Debe haber variedad y lógica semántica.
   - ESTRUCTURA OBLIGATORIA:
     • Apertura llamativa del producto con icono contextual (ej: 🔥 [Nombre del producto]).
     • ⚡ CARACTERÍSTICAS PRINCIPALES: Viñetas concisas con especificaciones técnicas reales y sus respectivos emojis temáticos al inicio.
     • 🛡️ GARANTÍA & RESPALDO: Cobertura oficial MeltyDeays con revisión técnica física en tienda.
     • 🎁 THE WIRED CLUB (OFERTAS EXCLUSIVAS EN NUESTRA WEB): Invitar a visitar nuestra plataforma web donde tenemos ofertas especiales con descuentos de socios y destacar que al registrarse por primera vez en su dispositivo reciben un Bono de Bienvenida de $5 USD en puntos (250 WP) para canjear en descuentos en artículos seleccionados de nuestro catálogo.
     • 📲 CONTACTO Y PEDIDOS DIRECTOS: WhatsApp / Teléfono 58438412 (5843-8412) con entrega en Juigalpa y envíos nacionales.
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
