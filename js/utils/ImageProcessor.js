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
 * Detecta si un píxel pertenece al espacio cromático de tonos de piel humana (YCbCr + Regla Empírica RGB).
 */
export function isSkinPixel(r, g, b) {
  // Regla empírica RGB (Kovacs / Peer et al.)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const r_g = Math.abs(r - g);
  const isRgbSkin = (r > 90) && (g > 35) && (b > 15) && ((max - min) > 15) && (r_g > 12) && (r > g) && (r > b);

  // Espacio YCbCr (rango de dispersión cromática de piel)
  const cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
  const cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;
  const isYcbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

  return isRgbSkin || isYcbcrSkin;
}

/**
 * Detecta y suprime manos/dedos que sostienen el producto, y reconstruye
 * inteligentemente las áreas de contacto (inpainting de borde estructural)
 * para evitar huecos, mordiscos en el contorno o alucinaciones visuales.
 * 
 * @param {HTMLCanvasElement} canvas Canvas con el objeto segmentado transparente
 * @returns {boolean} true si se detectó y reparó alguna oclusión por mano
 */
export function inpaintHandOcclusionsOnCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const totalPixels = w * h;
  const skinMask = new Uint8Array(totalPixels);
  let skinCount = 0;

  // 1. Identificar píxeles de piel humana dentro del sujeto visible
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a > 30) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (isSkinPixel(r, g, b)) {
        skinMask[i] = 1;
        skinCount++;
      }
    }
  }

  // Si menos del 0.05% de la imagen es piel, no hay manos sujetando
  if (skinCount < Math.max(20, Math.round(totalPixels * 0.0005))) {
    return false;
  }

  // 2. Clasificación: ¿Píxel de mano externa vs píxel de contacto/muesca en el chasis?
  const inpaintQueue = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (skinMask[i] === 1) {
        let productNeighbors = 0;
        // Ventana 5x5 para verificar vecindad con el producto real
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const ni = ny * w + nx;
              if (skinMask[ni] === 0 && data[ni * 4 + 3] > 100) {
                productNeighbors++;
              }
            }
          }
        }

        if (productNeighbors >= 3) {
          // Zona de contacto con el chasis del producto: Inpainting estructural
          inpaintQueue.push(i);
        } else {
          // Dedo saliente hacia el exterior: Borrar completamente a transparente
          data[i * 4 + 3] = 0;
          skinMask[i] = 0;
        }
      }
    }
  }

  // 3. Inpainting de difusión por parches vecinos para los píxeles de contacto
  // Propaga suavemente el color y textura real de la carcasa sin inventar componentes
  const passes = 4;
  for (let pass = 0; pass < passes; pass++) {
    for (let k = 0; k < inpaintQueue.length; k++) {
      const i = inpaintQueue[k];
      if (skinMask[i] === 1) {
        const y = Math.floor(i / w);
        const x = i % w;
        let sumR = 0, sumG = 0, sumB = 0, validCount = 0;

        const neighbors = [
          (y - 1) * w + x,
          (y + 1) * w + x,
          y * w + (x - 1),
          y * w + (x + 1),
          (y - 1) * w + (x - 1),
          (y - 1) * w + (x + 1),
          (y + 1) * w + (x - 1),
          (y + 1) * w + (x + 1)
        ];

        for (const n of neighbors) {
          if (n >= 0 && n < totalPixels && skinMask[n] === 0 && data[n * 4 + 3] > 100) {
            sumR += data[n * 4];
            sumG += data[n * 4 + 1];
            sumB += data[n * 4 + 2];
            validCount++;
          }
        }

        if (validCount > 0) {
          const idx = i * 4;
          data[idx] = Math.round(sumR / validCount);
          data[idx + 1] = Math.round(sumG / validCount);
          data[idx + 2] = Math.round(sumB / validCount);
          data[idx + 3] = 255;
          skinMask[i] = 0; // Reconstruido con el material circundante
        }
      }
    }
  }

  // Guardar resultado reconstruido en el canvas
  ctx.putImageData(imgData, 0, 0);
  return true;
}

/**
 * Centra y monta una imagen en un lienzo cuadrado 1:1 con fondo blanco puro (#FFFFFF).
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} imgElement 
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
 * Redimensiona preventivamente imágenes de alta resolución (ej. fotos de cámara de móvil de 12-50 MP)
 * a un tamaño de trabajo óptimo (máx 1024px) antes de la segmentación Wasm/Canvas.
 * Reduce el consumo de RAM en un 95% y acelera la inferencia IA de minutos a 1-3 segundos en teléfonos.
 * 
 * @param {Blob|File|string|HTMLImageElement} source 
 * @param {number} maxDim Dimensión máxima (default: 1024)
 * @returns {Promise<Blob|string>} Blob optimizado o fallback al origen
 */
export async function downscaleImageForProcessing(source, maxDim = 1024) {
  if (typeof document === "undefined") return source;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    let objectUrl = null;
    const cleanup = () => {
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      }
    };

    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (!w || !h || (w <= maxDim && h <= maxDim)) {
        cleanup();
        resolve(source);
        return;
      }

      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        resolve(source);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      cleanup();

      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => {
          resolve(blob || source);
        }, "image/jpeg", 0.88);
      } else {
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(source);
    };

    try {
      if (typeof source === "string") {
        img.src = source;
      } else if (source instanceof Blob || (typeof File !== "undefined" && source instanceof File)) {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } else if (source && (source.src || source.width)) {
        img.src = source.src || "";
      } else {
        resolve(source);
      }
    } catch (err) {
      cleanup();
      resolve(source);
    }
  });
}

/**
 * Procesa una imagen: remueve el fondo con IA, detecta y suprime manos/dedos,
 * reconstruye el chasis mediante inpainting estructural y monta en 1:1 blanco puro.
 * @param {Blob|File|string} imageSource Imagen origen (File, Blob o DataURL)
 * @param {Object} options Opciones de configuración
 * @returns {Promise<string>} DataURL resultante listo para catálogo y Marketplace
 */
export async function processImageWithAiWhiteBg(imageSource, options = {}) {
  const { onProgress = null, targetSize = 800 } = options;

  if (onProgress) onProgress("Optimizando foto para el dispositivo...");
  const optimizedSource = await downscaleImageForProcessing(imageSource, 1024);

  const engine = await loadBgRemovalEngine();

  if (engine && typeof engine.removeBackground === "function") {
    try {
      if (onProgress) onProgress("Iniciando segmentación con IA...");

      let lastReportedPct = -1;
      let lastReportedTime = 0;

      // Inferencia con timeout de 25 segundos para evitar cuelgues o bloqueos indefinidos en móviles
      const removeBgPromise = engine.removeBackground(optimizedSource, {
        progress: (key, current, total) => {
          if (!onProgress || !total) return;
          const pct = Math.round((current / total) * 100);
          const now = Date.now();
          if (pct === 100 || (Math.abs(pct - lastReportedPct) >= 15 && now - lastReportedTime > 300)) {
            lastReportedPct = pct;
            lastReportedTime = now;
            const keyStr = String(key || "").toLowerCase();
            if (keyStr.includes("fetch")) {
              onProgress(`Descargando IA: ${pct}%`);
            } else {
              onProgress(`Segmentando fondo: ${pct}%`);
            }
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout en segmentación Wasm")), 25000);
      });

      const transparentBlob = await Promise.race([removeBgPromise, timeoutPromise]);

      // Crear canvas temporal para inspección de oclusión y supresión de manos
      const img = new Image();
      const objectUrl = URL.createObjectURL(transparentBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      let cvW = img.naturalWidth || img.width;
      let cvH = img.naturalHeight || img.height;
      const maxInpaintDim = 1000;
      if (cvW > maxInpaintDim || cvH > maxInpaintDim) {
        if (cvW > cvH) {
          cvH = Math.round((cvH * maxInpaintDim) / cvW);
          cvW = maxInpaintDim;
        } else {
          cvW = Math.round((cvW * maxInpaintDim) / cvH);
          cvH = maxInpaintDim;
        }
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = cvW;
      tempCanvas.height = cvH;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      tempCtx.drawImage(img, 0, 0, cvW, cvH);

      // Erradicación de manos/dedos y reconstrucción de la superficie ocluida
      if (onProgress) onProgress("Detectando manos y reconstruyendo...");
      const handRepaired = inpaintHandOcclusionsOnCanvas(tempCanvas);
      if (handRepaired && onProgress) {
        onProgress("✓ Manos eliminadas y carcasa reconstruida.");
      }

      const finalDataUrl = composeSquareWhiteBackground(tempCanvas, targetSize);
      URL.revokeObjectURL(objectUrl);
      return finalDataUrl;
    } catch (err) {
      console.warn("Fallo o timeout durante inferencia Wasm, aplicando fallback local 1:1:", err);
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
    if (typeof optimizedSource === "string") {
      img.src = optimizedSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(optimizedSource);
    }
  });
}
