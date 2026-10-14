import assert from "node:assert/strict";
import fs from "node:fs";
import { setupTestEnvironment } from "./e2e/harness.mjs";
import { downscaleImageForProcessing, processImageWithAiWhiteBg } from "../js/utils/ImageProcessor.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: OPTIMIZACIÓN SUBIDA MÓVIL Y SISTEMA TOAST COMPACTO   ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Verificación de Exportación de downscaleImageForProcessing
console.log("=== SEC 1: VERIFICACIÓN MOTOR DE REDIMENSIONAMIENTO MÓVIL ===");
assert.equal(typeof downscaleImageForProcessing, "function", "downscaleImageForProcessing debe ser una función");
assert.equal(typeof processImageWithAiWhiteBg, "function", "processImageWithAiWhiteBg debe ser una función");
console.log("  ✓ Funciones de pre-procesamiento IA exportadas correctamente.");

// 2. Verificación de CSS Responsive para Toasts
console.log("\n=== SEC 2: AUDITORÍA CSS DE TOASTS EN MÓVIL ===");
const coreCss = fs.readFileSync("css/core.css", "utf-8");
assert.ok(coreCss.includes(".toast-container"), "core.css debe incluir .toast-container");
assert.ok(coreCss.includes("@media (max-width: 768px)"), "core.css debe incluir breakpoint móvil 768px");
assert.ok(coreCss.includes("top: max(12px"), "core.css debe reubicar toast-container arriba en móvil");
assert.ok(coreCss.includes("padding: 0.45rem 0.85rem"), "core.css debe reducir padding a formato compacto en móvil");
console.log("  ✓ Estilos compactos y reposicionamiento superior en móvil verificados.");

// 3. Verificación de Toasts con entorno Admin
console.log("\n=== SEC 3: TEST TOASTS ADMIN (LÍMITE MÁXIMO, ID Y TAP TO DISMISS) ===");
const { win: adminWin, doc: adminDoc } = setupTestEnvironment("admin.html");
const { showToast: showAdminToast } = await import("../js/admin-app.js");

const adminContainer = adminDoc.getElementById("toast-container");
assert.ok(adminContainer, "Contenedor de toast debe existir en admin");

// Test A: Admin Toast con ID dinámico (evitar 50 toasts en progreso)
showAdminToast("Foto 1/5: 25%", "info", { id: "upload-progress" });
assert.equal(adminContainer.children.length, 1, "Debe haber 1 toast inicial");

showAdminToast("Foto 1/5: 50%", "info", { id: "upload-progress" });
assert.equal(adminContainer.children.length, 1, "Al actualizar con mismo ID no debe añadir otro toast");
assert.ok(adminContainer.children[0].innerHTML.includes("Foto 1/5: 50%"), "El texto debe haberse actualizado");

showAdminToast("Foto 1/5: 100%", "info", { id: "upload-progress" });
assert.equal(adminContainer.children.length, 1, "Sigue habiendo exactamente 1 toast");

// Test B: Límite estricto de máximo 2 toasts simultáneos
showAdminToast("Notificación 2", "info");
assert.equal(adminContainer.children.length, 2, "Debe haber 2 toasts");

showAdminToast("Notificación 3", "info");
assert.equal(adminContainer.children.length, 2, "No debe exceder el límite de 2 toasts simultáneos");

// Test C: Tap to dismiss
const toastToDismiss = adminContainer.children[0];
assert.equal(typeof toastToDismiss.onclick, "function", "Toast debe tener handler onclick para descartar");
toastToDismiss.onclick();
assert.equal(adminContainer.children.length, 1, "Al pulsar onclick, el toast debe removerse de inmediato");

console.log("  ✓ Límite de 2 toasts simultáneos respetado en Admin.");
console.log("  ✓ Actualización in-place por ID funcionando (0 spam en subida de fotos).");
console.log("  ✓ Descarte táctil al instante validado.");

// 4. Verificación de Toasts con entorno Cliente
console.log("\n=== SEC 4: TEST TOASTS CLIENTE (LÍMITE MÁXIMO, ID Y TAP TO DISMISS) ===");
const { win: clientWin, doc: clientDoc } = setupTestEnvironment("index.html");
const { showToast: showClientToast } = await import("../js/app.js");

const clientContainer = clientDoc.getElementById("toast-container");
assert.ok(clientContainer, "Contenedor de toast debe existir en cliente");

showClientToast("Reserva 1", "success", { id: "preorder-toast" });
assert.equal(clientContainer.children.length, 1, "Debe haber 1 toast inicial de cliente");

showClientToast("Reserva actualizada", "success", { id: "preorder-toast" });
assert.equal(clientContainer.children.length, 1, "Debe reutilizar el toast con mismo ID");

showClientToast("Aviso 2", "info");
assert.equal(clientContainer.children.length, 2, "2 toasts en cliente");

showClientToast("Aviso 3", "info");
assert.equal(clientContainer.children.length, 2, "Máximo 2 toasts en cliente");

console.log("  ✓ Toasts en vista cliente optimizados y limitados a 2.");

// 5. Verificación de HTML de admin
console.log("\n=== SEC 5: AUDITORÍA DE BOTÓN EN ADMIN.HTML ===");
const adminHtml = fs.readFileSync("admin.html", "utf-8");
assert.ok(adminHtml.includes('id="btn-upload-product-images"'), "admin.html debe tener el botón con id btn-upload-product-images");
assert.ok(!adminHtml.includes("📁 + Subir Fotos (PC)"), "No debe decir (PC) para evitar confusión en móvil");
assert.ok(adminHtml.includes("📁 + Subir Fotos"), "Debe tener texto universal '📁 + Subir Fotos'");
console.log("  ✓ Botón de subida verificado en admin.html.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE OPTIMIZACIÓN PASARON (100% PASS)");
console.log("======================================================");
