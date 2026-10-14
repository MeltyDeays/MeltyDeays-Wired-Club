import fs from "fs";
import path from "path";
import assert from "assert";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: ZERO-FREEZE MOBILE UPLOAD & BACKGROUND WORKER IA     ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// SEC 1: Verificar Web Worker (bg-worker.js)
console.log("=== SEC 1: VERIFICACIÓN DEL WEB WORKER DE IA (BG-WORKER.JS) ===");
assert(fs.existsSync("js/workers/bg-worker.js"), "Debe existir js/workers/bg-worker.js");
const workerCode = fs.readFileSync("js/workers/bg-worker.js", "utf8");

assert(workerCode.includes("loadEngine"), "Debe incluir loadEngine para carga diferida");
assert(workerCode.includes("isSkinPixel"), "Debe incluir detector de piel humana");
assert(workerCode.includes("inpaintHandOcclusions"), "Debe incluir inpainting estructural de chasis y supresión de manos");
assert(workerCode.includes("composeSquareWhite"), "Debe incluir composición 1:1 sobre blanco puro");
assert(workerCode.includes("model: \"small\""), "Debe usar modelo quantizado isnet_quint8 (small)");
assert(workerCode.includes("device: \"gpu\""), "Debe habilitar aceleración WebGPU");
assert(workerCode.includes("OffscreenCanvas"), "Debe procesar sobre OffscreenCanvas en background thread");
assert(workerCode.includes("self.onmessage"), "Debe implementar listener onmessage");
console.log("  ✓ Web Worker configurado con segmentación IA, supresión de manos e inpainting.");

// SEC 2: Verificar ImageProcessor.js
console.log("\n=== SEC 2: VERIFICACIÓN DE CONEXIÓN CON WORKER EN IMAGEPROCESSOR.JS ===");
const imgProcessorCode = fs.readFileSync("js/utils/ImageProcessor.js", "utf8");

assert(imgProcessorCode.includes("export function getBgWorker"), "Debe exportar getBgWorker");
assert(imgProcessorCode.includes("new Worker("), "Debe instanciar el Worker con import.meta.url");
assert(imgProcessorCode.includes("downscaleImageForProcessing(imageSource, maxDim)"), "Debe pre-escalar a 640px/768px");
assert(imgProcessorCode.includes("worker.postMessage"), "Debe enviar trabajo al worker");
assert(imgProcessorCode.includes("composeSquareWhiteFromSource"), "Debe exportar composeSquareWhiteFromSource para fallbacks seguros");
console.log("  ✓ ImageProcessor enlazado al Web Worker con pre-escalado y zero-freeze en UI.");

// SEC 3: Verificar renderizado progresivo en AdminInvoiceBatchView.js
console.log("\n=== SEC 3: VERIFICACIÓN RENDERIZADO PROGRESIVO EN ADMININVOICEBATCHVIEW.JS ===");
const batchViewCode = fs.readFileSync("js/views/AdminInvoiceBatchView.js", "utf8");

assert(batchViewCode.includes("composeSquareWhiteFromSource"), "Debe importar composeSquareWhiteFromSource");
const loopIndex = batchViewCode.indexOf("for (let i = 0; i < files.length; i++)");
assert(loopIndex !== -1, "Debe tener bucle for para procesar fotos");
const loopBody = batchViewCode.slice(loopIndex, loopIndex + 2200);

assert(loopBody.includes("renderProductImagesPreview();"), "Debe renderizar progresivamente dentro del bucle");
assert(loopBody.includes("currentProductImages.push("), "Debe agregar la foto al array dentro del bucle");
assert(loopBody.includes("setTimeout(r, 30)"), "Debe ceder el hilo al navegador para repintado fluido");
console.log("  ✓ Renderizado progresivo por cada foto y respiro de hilo de renderizado validados.");

// SEC 4: Verificar toggle y etiquetas en admin.html
console.log("\n=== SEC 4: VERIFICACIÓN DE INTERFAZ EN ADMIN.HTML ===");
const adminHtml = fs.readFileSync("admin.html", "utf8");

assert(adminHtml.includes("id=\"toggle-ai-white-bg\""), "Debe existir el toggle de Fondo Blanco 1:1");
assert(adminHtml.includes("✨ Fondo Blanco 1:1 (IA)"), "Etiqueta con indicación IA");
console.log("  ✓ Interfaz de admin.html actualizada correctamente.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE PIPELINE IA PASARON (100% PASS)");
console.log("======================================================");
