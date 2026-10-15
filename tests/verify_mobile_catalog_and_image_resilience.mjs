import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RewardModel } from "../js/models/RewardModel.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: RESILIENCIA IMÁGENES & GESTIÓN CATÁLOGO MÓVIL v2.9.93 ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Resiliencia de imágenes en RewardModel
console.log("=== SEC 1: INVARIANTE DE PRIORIDAD DE IMÁGENES LOCALES EN REWARDMODEL ===");
const expiredFb = "https://scontent.fmga11-2.fna.fbcdn.net/v/t45.5328-4/825726775_1135894848771831_n.jpg?oe=6AC326BE";
const localUpload = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
const secondaryFb = "https://scontent.fmga11-2.fna.fbcdn.net/v/t45.5328-4/825331538_1379223907315711_n.jpg";

const product = new RewardModel({
  id: "PROD-TEST-1",
  title: "Repetidor TP-Link Dual Band",
  priceUsd: 25.0,
  stock: 2,
  images: [expiredFb, secondaryFb, localUpload]
});

assert.strictEqual(
  product.images[0],
  localUpload,
  "La imagen local subida debe ascender al índice 0 para proteger contra 403 Forbidden"
);
assert.strictEqual(
  product.imageUrl,
  localUpload,
  "imageUrl debe apuntar a la imagen local y no al CDN efímero de Facebook"
);
console.log("  ✓ RewardModel prioriza fotos locales sobre CDN de Facebook.");

// 2. Verificación de lógica en admin-app.js
console.log("\n=== SEC 2: RESILIENCIA Y MODAL EN ADMIN-APP.JS ===");
const adminAppCode = fs.readFileSync("js/admin-app.js", "utf-8");

assert.ok(adminAppCode.includes("export function getBestProductCover"), "Debe exportar getBestProductCover");
assert.ok(adminAppCode.includes("export function handleAdminCatalogImgError"), "Debe exportar handleAdminCatalogImgError");
assert.ok(adminAppCode.includes("export function openProductActionsModal"), "Debe exportar openProductActionsModal");
assert.ok(adminAppCode.includes("export function closeProductActionsModal"), "Debe exportar closeProductActionsModal");
assert.ok(adminAppCode.includes("window.openProductActionsModal = openProductActionsModal"), "Debe enlazar a window");
assert.ok(adminAppCode.includes("catalog-mobile-options-btn"), "Debe renderizar botón de opciones móviles en cada fila");
assert.ok(adminAppCode.includes("handleAdminCatalogImgError(this, '${p.id}')"), "Img debe tener onerror controlado");
console.log("  ✓ admin-app.js contiene lógica de resiliencia y modal táctil.");

// 3. Verificación de HTML de admin.html
console.log("\n=== SEC 3: ESTRUCTURA HTML MODAL DE ACCIONES Y TABLA RESPONSIVE ===");
const adminHtml = fs.readFileSync("admin.html", "utf-8");

assert.ok(adminHtml.includes('id="modal-catalog-item-actions"'), "Debe existir modal-catalog-item-actions en admin.html");
assert.ok(adminHtml.includes('id="catalog-modal-product-summary"'), "Debe existir catalog-modal-product-summary");
assert.ok(adminHtml.includes('id="catalog-modal-actions-list"'), "Debe existir catalog-modal-actions-list");
assert.ok(adminHtml.includes("catalog-table-responsive"), "Debe tener clase catalog-table-responsive");
assert.ok(adminHtml.includes("catalog-admin-table"), "Debe tener clase catalog-admin-table");
assert.ok(adminHtml.includes("admin-app.js?v=2.9.93"), "Debe cache-bustear con versión v=2.9.93");
console.log("  ✓ admin.html contiene el modal de acciones táctiles y clases de tabla.");

// 4. Verificación de CSS en responsive.css y admin.css
console.log("\n=== SEC 4: REGLAS CSS MÓVIL Y BOTONES TÁCTILES ===");
const respCss = fs.readFileSync("css/responsive.css", "utf-8");

assert.ok(respCss.includes(".catalog-table-responsive"), "responsive.css debe incluir .catalog-table-responsive");
assert.ok(respCss.includes("overflow-x: hidden !important;"), "Debe eliminar el scroll horizontal en mobile");
assert.ok(respCss.includes(".catalog-admin-table tr"), "Debe formatear tr en bloque/tarjeta");
assert.ok(respCss.includes(".catalog-mobile-options-btn"), "Debe incluir estilos para el botón [⚡ Opciones]");

const adminCss = fs.readFileSync("css/admin.css", "utf-8");
assert.ok(adminCss.includes(".btn-modal-action"), "admin.css debe incluir .btn-modal-action");
assert.ok(adminCss.includes(".catalog-mobile-row-info"), "admin.css debe declarar .catalog-mobile-row-info");
console.log("  ✓ Reglas CSS de compactación móvil y tarjetas táctiles verificadas.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE CATÁLOGO MÓVIL PASARON (100% PASS)");
console.log("======================================================");
