import fs from "fs";
import path from "path";
import assert from "assert";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: ZERO-FREEZE MOBILE UPLOAD & PROGRESSIVE GALLERY      ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// SEC 1: Verificar ImageProcessor.js
console.log("=== SEC 1: VERIFICACIÓN ZERO-FREEZE EN IMAGEPROCESSOR.JS ===");
const imgProcessorCode = fs.readFileSync("js/utils/ImageProcessor.js", "utf8");

assert(imgProcessorCode.includes("export function isMobileDevice"), "Debe exportar isMobileDevice");
assert(imgProcessorCode.includes("export function composeSquareWhiteFromSource"), "Debe exportar composeSquareWhiteFromSource");
assert(imgProcessorCode.includes("isMobileDevice() && !forceAi"), "Debe omitir descarga Wasm pesada en móviles automáticamente");
assert(imgProcessorCode.includes("model: \"small\""), "Debe usar modelo quantizado isnet_quint8 (small)");
assert(imgProcessorCode.includes("device: \"gpu\""), "Debe usar aceleración WebGPU");
assert(imgProcessorCode.includes("maxInpaintDim = 600"), "Debe usar dimensión óptima para inpainting veloz");
console.log("  ✓ ImageProcessor configurado con zero-freeze móvil y modelo ligero.");

// SEC 2: Verificar renderizado progresivo en AdminInvoiceBatchView.js
console.log("\n=== SEC 2: VERIFICACIÓN RENDERIZADO PROGRESIVO EN ADMININVOICEBATCHVIEW.JS ===");
const batchViewCode = fs.readFileSync("js/views/AdminInvoiceBatchView.js", "utf8");

assert(batchViewCode.includes("composeSquareWhiteFromSource"), "Debe importar composeSquareWhiteFromSource");

// Verificar que renderProductImagesPreview() está DENTRO del bucle for
const loopIndex = batchViewCode.indexOf("for (let i = 0; i < files.length; i++)");
assert(loopIndex !== -1, "Debe tener bucle for para procesar fotos");
const loopBody = batchViewCode.slice(loopIndex, loopIndex + 2200);

assert(loopBody.includes("renderProductImagesPreview();"), "Debe renderizar progresivamente dentro del bucle");
assert(loopBody.includes("currentProductImages.push("), "Debe agregar la foto al array dentro del bucle");
assert(loopBody.includes("setTimeout(r, 30)"), "Debe ceder el hilo al navegador para repintado fluido");
console.log("  ✓ Renderizado progresivo por cada foto y respiro de hilo de renderizado validados.");

// SEC 3: Verificar toggle y etiquetas en admin.html
console.log("\n=== SEC 3: VERIFICACIÓN DE INTERFAZ EN ADMIN.HTML ===");
const adminHtml = fs.readFileSync("admin.html", "utf8");

assert(adminHtml.includes("id=\"toggle-ai-white-bg\""), "Debe existir el toggle de Fondo Blanco 1:1");
assert(adminHtml.includes("✨ Fondo Blanco 1:1"), "Etiqueta limpia de Fondo Blanco 1:1");
console.log("  ✓ Interfaz de admin.html actualizada correctamente.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS ZERO-FREEZE PASARON (100% PASS)");
console.log("======================================================");
