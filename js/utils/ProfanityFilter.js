/**
 * FILTRO PROFESIONAL DE MODERACIÓN Y LENGUAJE OFENSIVO (PROFANITY FILTER)
 * The Wired Club - MeltyDeays Community & Support Guard
 * 
 * Filtra malas palabras, insultos, leetspeak y caracteres ofuscados en español e inglés.
 */

// Lista exhaustiva de raíces y patrones de palabras ofensivas/malsonantes
const PROFANITY_PATTERNS = [
  // Raíces y patrones flexibles con tolerancia a ofuscación (*, puntos, espacios)
  /m+[\W_]*[i1!]+[\W_]*[e3]+[\W_]*r+[\W_]*d+[asoy]*/i,
  /p+[\W_]*[e3]+[\W_]*n+[\W_]*d+[\W_]*[e3]+[\W_]*j+[oasx]+/i,
  /p+[\W_]*[e3]+[\W_]*n+[\W_]*d+[\W_]*[e3]+[\W_]*j+a+d+[as]+/i,
  /h(?:ij[oa]s?\s*de?\s*)?p+[\W_]*[u\*o]+[\W_]*t+[as]+/i,
  /h+[\W_]*[i1!]+[\W_]*j+[\W_]*u+[\W_]*[e3]+[\W_]*p+[\W_]*[u\*o]+[\W_]*t+[as]+/i,
  /p+[\W_]*[u\*o]+[\W_]*t+[oas]+/i,
  /m+[\W_]*a+[\W_]*l+[\W_]*p+[\W_]*a+[\W_]*r+[\W_]*[i1!]+[\W_]*d+[oas]+/i,
  /\bh[\W_]*d[\W_]*p\b/i,
  /v+[\W_]*[e3\*]+[\W_]*r+[\W_]*g+[asoyz]+/i,
  /c+[\W_]*a+[\W_]*r+[\W_]*[e3]+[\W_]*v+[\W_]*[e3]+[\W_]*r+[\W_]*g+[as]+/i,
  /c+[\W_]*[e3]+[\W_]*r+[\W_]*[o0]+[\W_]*t+[es]+/i,
  /c+[\W_]*a+[\W_]*b+[\W_]*r+[\W_]*[o0]+[\W_]*n+[as]?/i,
  /c+[\W_]*a+[\W_]*b+[\W_]*r+[\W_]*[o0]+[\W_]*n+a+d+[as]+/i,
  /c+[\W_]*u+[\W_]*l+[\W_]*[e3]+[\W_]*r+[oas]+/i,
  /c+[\W_]*u+[\W_]*l+[oas]+/i,
  /m+[\W_]*a+[\W_]*r+[\W_]*[i1!]+[\W_]*c+[oó0]+n+[es]?/i,
  /m+[\W_]*a+[\W_]*r+[\W_]*[i1!]+[\W_]*c+a+[s]?/i,
  /j+[\W_]*[o0]+[\W_]*t+[os]/i,
  /z+[\W_]*[o0]+[\W_]*r+[\W_]*r+[as]+/i,
  /c+[\W_]*[o0]+[\W_]*[ñn]+[os]+/i,
  /c+[\W_]*[o0]+[\W_]*n+[\W_]*c+[\W_]*h+[as]+(?:\s*de\s*(?:tu|su)\s*madre)?/i,
  /c+[\W_]*[o0]+[\W_]*n+[\W_]*c+[\W_]*h+[e3]+[\W_]*t+[\W_]*u+[\W_]*m+[\W_]*a+[\W_]*d+[\W_]*r+[\W_]*[e3]/i,
  /\bctm\b/i,
  /p+[\W_]*[i1!]+[\W_]*j+[asoz]+/i,
  /d+[\W_]*[e3]+[\W_]*s+[\W_]*p+[\W_]*[i1!]+[\W_]*j+[es]+/i,
  /[e3]+[\W_]*s+[\W_]*t+[\W_]*[uú]+[\W_]*p+[\W_]*[i1!]+[\W_]*d+[oas]+/i,
  /[i1!]+[\W_]*m+[\W_]*b+[\W_]*[eé3]+[\W_]*c+[\W_]*[i1!]+[\W_]*l+[es]?/i,
  /[i1!]+[\W_]*d+[\W_]*[i1!]+[\W_]*[o0]+[\W_]*t+[as]+/i,
  /t+[\W_]*a+[\W_]*r+[\W_]*a+[\W_]*d+[oas]+/i,
  /b+[\W_]*a+[\W_]*b+[\W_]*[o0]+[\W_]*s+[oas]+/i,
  /b+[\W_]*a+[\W_]*s+[\W_]*t+[\W_]*a+[\W_]*r+[\W_]*d+[oas]+/i,
  /m+[\W_]*a+[\W_]*l+[\W_]*d+[\W_]*[i1!]+[\W_]*t+[oas]+/i,
  /c+[\W_]*h+[\W_]*u+[\W_]*c+[\W_]*h+a+d+[as]+/i,
  /c+[\W_]*h+[\W_]*u+[\W_]*c+[\W_]*h+a+s?/i,
  /p+[\W_]*[e3]+[\W_]*r+[\W_]*r+[as]+(?:\s*de\s*mierda)?/i,
  /c+[\W_]*h+[\W_]*u+[\W_]*p+[\W_]*[ae]+[\W_]*v+[\W_]*[e3]+[\W_]*r+[\W_]*g+[as]+/i,
  /m+[\W_]*a+[\W_]*m+[\W_]*a+[\W_]*g+[\W_]*[uü]+[\W_]*[e3]+[\W_]*v+[os]+/i,
  /m+[\W_]*a+[\W_]*m+[\W_]*a+[\W_]*h+[\W_]*u+[\W_]*[e3]+[\W_]*v+[os]+/i,

  // Raíces en inglés
  /\bf+[\W_]*[u\*]+[\W_]*c+[\W_]*k+(?:ing|er|ed)?\b/i,
  /\bs+[\W_]*h+[\W_]*[i1!]+[\W_]*t+(?:ty)?\b/i,
  /\bb+[\W_]*[i1!]+[\W_]*t+[\W_]*c+[\W_]*h+(?:es)?\b/i,
  /\ba+[\W_]*s+[\W_]*s+[\W_]*h+[\W_]*[o0]+[\W_]*l+[\W_]*[e3]+[s]?\b/i,
  /\bc+[\W_]*u+[\W_]*n+[\W_]*t+[s]?\b/i,
  /\bm+[\W_]*[o0]+[\W_]*t+[\W_]*h+[\W_]*[e3]+[\W_]*r+[\W_]*f+[\W_]*u+[\W_]*c+[\W_]*k+[e3]+[\W_]*r+[s]?\b/i,
  /\bd+[\W_]*[i1!]+[\W_]*c+[\W_]*k+(?:head)?[s]?\b/i,
  /\br+[\W_]*[e3]+[\W_]*t+[\W_]*a+[\W_]*r+[\W_]*d+(?:ed)?[s]?\b/i,
  /\bstfu\b/i,
  /\bwtf\b/i
];

/**
 * Normaliza una cadena de texto para detectar intentos de ofuscación o leetspeak
 */
function normalizeVariants(str) {
  if (!str || typeof str !== "string") return [];

  // 1. Minúsculas y quitar diacríticos
  let base = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 2. Mapeo leetspeak común (@ -> a, 4 -> a, 3 -> e, 1/! -> i, 0 -> o, $ -> s, etc.)
  const leetMap = {
    "@": "a",
    "4": "a",
    "3": "e",
    "1": "i",
    "!": "i",
    "|": "i",
    "0": "o",
    "$": "s",
    "5": "s",
    "7": "t"
  };

  const leetTransformed = base.split("").map(ch => leetMap[ch] || ch).join("");

  // 3. Compactar caracteres duplicados adyacentes (ej. "puuuutaaa" -> "puta")
  const singleCollapsed = leetTransformed.replace(/(.)\1+/g, "$1");

  // 4. Variante sin símbolos intermedios
  const strippedSymbols = leetTransformed.replace(/[^a-z0-9]/g, "");
  const strippedSingle = singleCollapsed.replace(/[^a-z0-9]/g, "");

  return [base, leetTransformed, singleCollapsed, strippedSymbols, strippedSingle];
}

/**
 * Determina si el texto contiene palabras ofensivas o prohibidas.
 * @param {string} text - Contenido a evaluar
 * @returns {boolean} true si se detecta profanidad
 */
export function hasProfanity(text) {
  if (!text || typeof text !== "string") return false;

  const variants = normalizeVariants(text);

  for (const regex of PROFANITY_PATTERNS) {
    for (const v of variants) {
      if (regex.test(v)) return true;
    }
  }

  // Tokens individuales
  const tokens = text.toLowerCase().split(/[\s,.;:_\-+*/\\()!?¡¿"'`~#%^&]+/);
  for (const token of tokens) {
    if (token.length >= 3) {
      const tokenVariants = normalizeVariants(token);
      for (const regex of PROFANITY_PATTERNS) {
        for (const tv of tokenVariants) {
          if (regex.test(tv)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Reemplaza cualquier palabra censurada por asteriscos.
 * @param {string} text - Contenido a limpiar
 * @returns {string} Texto con palabras ofensivas censuradas
 */
export function cleanProfanity(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;
  for (const regex of PROFANITY_PATTERNS) {
    cleaned = cleaned.replace(new RegExp(regex.source, "gi"), (match) => {
      return match[0] + "*".repeat(Math.max(1, match.length - 1));
    });
  }
  return cleaned;
}

/**
 * Validador formal para formularios de comunidad, preguntas y respuestas.
 * @param {string} text - Texto ingresado por el usuario
 * @param {string} fieldLabel - Nombre legible del campo
 * @returns {{ valid: boolean, error?: string, sanitizedText: string }}
 */
export function validateCommunityText(text, fieldLabel = "comentario") {
  const clean = String(text || "").trim();
  if (!clean) {
    return {
      valid: false,
      error: `Por favor ingresa tu ${fieldLabel}.`,
      sanitizedText: ""
    };
  }

  if (clean.length < 3) {
    return {
      valid: false,
      error: `El ${fieldLabel} debe tener al menos 3 caracteres.`,
      sanitizedText: clean
    };
  }

  if (hasProfanity(clean)) {
    return {
      valid: false,
      error: `⚠️ Tu ${fieldLabel} contiene palabras ofensivas o no permitidas. Por favor mantén un lenguaje respetuoso en la comunidad de The Wired Club.`,
      sanitizedText: cleanProfanity(clean)
    };
  }

  return {
    valid: true,
    sanitizedText: clean
  };
}
