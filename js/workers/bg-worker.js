/* Web Worker: Pipeline de Segmentación IA, Supresión de Manos y Normalización 1:1 (Background Thread) */

let bgRemovalLib = null;

async function loadEngine() {
  if (bgRemovalLib) return bgRemovalLib;
  try {
    bgRemovalLib = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm");
  } catch (err) {
    bgRemovalLib = await import("https://unpkg.com/@imgly/background-removal@1.5.7/dist/index.mjs");
  }
  return bgRemovalLib;
}

function isSkinPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const r_g = Math.abs(r - g);
  const isRgbSkin = (r > 90) && (g > 35) && (b > 15) && ((max - min) > 15) && (r_g > 12) && (r > g) && (r > b);

  const cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
  const cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;
  const isYcbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

  return isRgbSkin || isYcbcrSkin;
}

function inpaintHandOcclusions(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const totalPixels = w * h;
  const skinMask = new Uint8Array(totalPixels);
  let skinCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a > 30) {
      if (isSkinPixel(data[idx], data[idx + 1], data[idx + 2])) {
        skinMask[i] = 1;
        skinCount++;
      }
    }
  }

  if (skinCount < Math.max(20, Math.round(totalPixels * 0.0005))) {
    return false;
  }

  const inpaintQueue = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (skinMask[i] === 1) {
        let productNeighbors = 0;
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
          inpaintQueue.push(i);
        } else {
          data[i * 4 + 3] = 0;
          skinMask[i] = 0;
        }
      }
    }
  }

  const passes = 4;
  for (let pass = 0; pass < passes; pass++) {
    for (let k = 0; k < inpaintQueue.length; k++) {
      const i = inpaintQueue[k];
      if (skinMask[i] === 1) {
        const y = Math.floor(i / w);
        const x = i % w;
        let sumR = 0, sumG = 0, sumB = 0, validCount = 0;

        const neighbors = [
          (y - 1) * w + x, (y + 1) * w + x, y * w + (x - 1), y * w + (x + 1),
          (y - 1) * w + (x - 1), (y - 1) * w + (x + 1), (y + 1) * w + (x - 1), (y + 1) * w + (x + 1)
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
          skinMask[i] = 0;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}

function composeSquareWhite(canvasSource, size = 800, paddingRatio = 0.08) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  const maxDim = size * (1 - paddingRatio * 2);
  let srcW = canvasSource.width;
  let srcH = canvasSource.height;

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

  ctx.drawImage(canvasSource, posX, posY, destW, destH);
  return canvas;
}

self.onmessage = async (e) => {
  const { id, imageBlob, targetSize = 800 } = e.data || {};
  if (!imageBlob) {
    self.postMessage({ type: "error", id, error: "No imageBlob provided" });
    return;
  }

  try {
    self.postMessage({ type: "progress", id, message: "Iniciando segmentación con IA..." });
    const engine = await loadEngine();
    if (!engine || typeof engine.removeBackground !== "function") {
      throw new Error("Motor de segmentación no disponible");
    }

    let lastReportedPct = -1;
    let lastReportedTime = 0;

    const transparentBlob = await engine.removeBackground(imageBlob, {
      model: "small", // isnet_quint8 cuantizado: ~42MB y 3x más veloz que fp16
      device: "gpu",  // Intenta aceleración WebGPU
      rescale: true,
      progress: (key, current, total) => {
        if (!total) return;
        const pct = Math.round((current / total) * 100);
        const now = Date.now();
        if (pct === 100 || (Math.abs(pct - lastReportedPct) >= 15 && now - lastReportedTime > 300)) {
          lastReportedPct = pct;
          lastReportedTime = now;
          self.postMessage({ type: "progress", id, message: `Segmentando fondo: ${pct}%` });
        }
      }
    });

    // Inpainting de manos sobre OffscreenCanvas
    const bitmap = await createImageBitmap(transparentBlob);
    let cvW = bitmap.width;
    let cvH = bitmap.height;
    const maxInpaintDim = 640;
    if (cvW > maxInpaintDim || cvH > maxInpaintDim) {
      if (cvW > cvH) {
        cvH = Math.round((cvH * maxInpaintDim) / cvW);
        cvW = maxInpaintDim;
      } else {
        cvW = Math.round((cvW * maxInpaintDim) / cvH);
        cvH = maxInpaintDim;
      }
    }

    const tempCanvas = new OffscreenCanvas(cvW, cvH);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tempCtx.drawImage(bitmap, 0, 0, cvW, cvH);

    self.postMessage({ type: "progress", id, message: "Detectando manos y reconstruyendo..." });
    const handRepaired = inpaintHandOcclusions(tempCanvas);
    if (handRepaired) {
      self.postMessage({ type: "progress", id, message: "✓ Manos eliminadas y carcasa reconstruida." });
    }

    // Componer sobre lienzo blanco 1:1
    const finalCanvas = composeSquareWhite(tempCanvas, targetSize);
    const finalBlob = await finalCanvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });

    self.postMessage({ type: "done", id, blob: finalBlob });
  } catch (err) {
    self.postMessage({ type: "error", id, error: err.message || String(err) });
  }
};
