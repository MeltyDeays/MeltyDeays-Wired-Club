/* Pipeline de Procesamiento Visual e IA: Normalización 1:1 y Remoción de Fondo (Wasm/Canvas) */

let bgRemovalLib = null;
let isLibraryLoading = false;

/**
 * Carga diferida de la librería de segmentación @imgly/background-removal desde CDN
 */
async function loadBgRemovalEngine() {
  if (bgRemovalLib) return bgRemovalLib;
  if (isLibraryLoading) {
    while (isLibraryLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return bgRemovalLib;
  }

  isLibraryLoading = true;
  try {
    bgRemovalLib = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm");
    console.log("✓ Motor de segmentación visual Wasm cargado correctamente.");
  } catch (err) {
    console.warn("⚠️ No se pudo cargar @imgly/background-removal (fallback a normalización 1:1 con fondo blanco):", err.message);
    bgRemovalLib = null;
  } finally {
    isLibraryLoading = false;
  }
  return bgRemovalLib;
}

/**
 * Centra y monta una imagen en un lienzo cuadrado 1:1 con fondo blanco puro (#FFFFFF).
 * @param {HTMLImageElement|ImageBitmap} imgElement 
 * @param {number} size Tamaño en px del lienzo cuadrado (default: 800)
 * @param {number} paddingRatio Margen de seguridad relativo (default: 0.10)
 * @returns {string} DataURL en formato JPEG/WebP
 */
export function composeSquareWhiteBackground(imgElement, size = 800, paddingRatio = 0.10) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // 1. Relleno con fondo blanco puro #FFFFFF
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // 2. Cálculo de dimensiones proporcionales con margen
  const maxDim = size * (1 - paddingRatio * 2);
  let srcW = imgElement.width || imgElement.naturalWidth;
  let srcH = imgElement.height || imgElement.naturalHeight;

  let destW = srcW;
  let destH = srcH;

  if (destW > maxDim || destH > maxDim) {
    if (destW > destH) {
      destH = Math.round((destH * maxDim) / destW);
      destW = maxDim;
    } else {
      destW = Math.round((destW * maxDim) / destH);
      destH = maxDim;
    }
  } else if (destW < maxDim && destH < maxDim) {
    const scale = maxDim / Math.max(destW, destH);
    destW = Math.round(destW * scale);
    destH = Math.round(destH * scale);
  }

  const posX = Math.round((size - destW) / 2);
  const posY = Math.round((size - destH) / 2);

  // 3. Dibujar sujeto centrado
  ctx.drawImage(imgElement, posX, posY, destW, destH);

  return canvas.toDataURL("image/jpeg", 0.86);
}

/**
 * Procesa una imagen: remueve el fondo con IA (si está disponible) y compone sobre lienzo blanco 1:1.
 * @param {Blob|File|string} imageSource Imagen origen (File, Blob o DataURL)
 * @param {Object} options Opciones de configuración
 * @returns {Promise<string>} DataURL resultante listo para catálogo y Marketplace
 */
export async function processImageWithAiWhiteBg(imageSource, options = {}) {
  const { onProgress = null, targetSize = 800 } = options;
  const engine = await loadBgRemovalEngine();

  if (engine && typeof engine.removeBackground === "function") {
    try {
      if (onProgress) onProgress("Iniciando segmentación de fondo con IA...");
      const transparentBlob = await engine.removeBackground(imageSource, {
        progress: (key, current, total) => {
          if (onProgress && total > 0) {
            const pct = Math.round((current / total) * 100);
            onProgress(`Segmentando fondo: ${pct}%`);
          }
        }
      });

      // Crear objeto Image para dibujar en canvas blanco
      const img = new Image();
      const objectUrl = URL.createObjectURL(transparentBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const finalDataUrl = composeSquareWhiteBackground(img, targetSize);
      URL.revokeObjectURL(objectUrl);
      return finalDataUrl;
    } catch (err) {
      console.warn("Fallo durante inferencia Wasm, aplicando fallback local:", err);
    }
  }

  // Fallback: Si no hay soporte Wasm o falla el modelo, normalizar 1:1 centrado con fondo blanco
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve(composeSquareWhiteBackground(img, targetSize));
    };
    img.onerror = reject;
    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    }
  });
}
