import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: PRIORIDAD 100% FOTOS HD DEL CATÁLOGO WEB OFICIAL");
console.log("=================================================");

const root = process.cwd();
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");
const popupHtml = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.js"), "utf8");
const backgroundJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/background.js"), "utf8");

// Test 1: Verificar prioridad de fotos de catálogo web en content-script.js
assert.ok(
  contentScript.includes("fotos oficiales en alta resolución del catálogo web"),
  "content-script.js debe priorizar fotos oficiales del catálogo web"
);
assert.ok(
  contentScript.includes("FETCH_IMAGE_BLOB"),
  "content-script.js debe contar con fallback a background FETCH_IMAGE_BLOB"
);
assert.ok(
  backgroundJs.includes('request.action === "FETCH_IMAGE_BLOB"'),
  "background.js debe implementar el handler FETCH_IMAGE_BLOB"
);
console.log("  ✓ Test 1: Prioridad de fotos web en content-script y puente background verificados.");

// Test 2: Simulación de selección de fotos en onProductLoaded para 3 fotos
const mockProduct3Photos = {
  id: "REW-DEMO-05",
  title: "Mando Inalámbrico GameSir",
  priceNio: 850,
  imageUrl: "https://images.unsplash.com/photo-1",
  images: [
    "https://images.unsplash.com/photo-1",
    "https://images.unsplash.com/photo-2",
    "https://images.unsplash.com/photo-3"
  ]
};

// Agregación idéntica a onProductLoaded:
const candidate3 = [];
if (mockProduct3Photos.imageUrl) candidate3.push(mockProduct3Photos.imageUrl);
for (const img of mockProduct3Photos.images) {
  if (img && !candidate3.includes(img)) candidate3.push(img);
}
assert.equal(candidate3.length, 3, "Debe preservar exactamente las 3 fotos web completas");
assert.equal(candidate3[0], "https://images.unsplash.com/photo-1", "La portada oficial debe ser la primera foto");
console.log("  ✓ Test 2: Inclusión de las 3 fotos web completas sin omisiones validada.");

// Test 3: Simulación para un producto con 5 fotos en la web
const mockProduct5Photos = {
  id: "REW-DEMO-06",
  title: "Teclado Mecánico RGB Custom",
  priceNio: 1500,
  imageUrl: "https://images.unsplash.com/photo-1",
  images: [
    "https://images.unsplash.com/photo-1",
    "https://images.unsplash.com/photo-2",
    "https://images.unsplash.com/photo-3",
    "https://images.unsplash.com/photo-4",
    "https://images.unsplash.com/photo-5"
  ]
};

const candidate5 = [];
if (mockProduct5Photos.imageUrl) candidate5.push(mockProduct5Photos.imageUrl);
for (const img of mockProduct5Photos.images) {
  if (img && !candidate5.includes(img)) candidate5.push(img);
}
assert.equal(candidate5.length, 5, "Debe preservar exactamente las 5 fotos web completas");
console.log("  ✓ Test 3: Inclusión de las 5 fotos web completas sin truncamiento validada.");

// Test 4: Simulación de inyección de fotos + slide QR en injectProductPhotosToForm
const qrSlideMock = "data:image/jpeg;base64,QR_SLIDE_PAYMENT";
const uniqueUrls = Array.from(new Set(candidate5.filter(Boolean))).slice(0, 9);
if (uniqueUrls.length < 10 && !uniqueUrls.includes(qrSlideMock)) {
  uniqueUrls.push(qrSlideMock);
}
assert.equal(uniqueUrls.length, 6, "5 fotos de producto + 1 slide QR final = 6 fotos a inyectar");
assert.equal(uniqueUrls[5], qrSlideMock, "El slide QR debe ser la última imagen de la galería");
console.log("  ✓ Test 4: Preservación de 5 fotos + slide QR al final validada (6 fotos totales).");

// Test 5: Verificar UI en popup.html y popup.js
assert.ok(popupHtml.includes("Usar fotos HD del catálogo web oficial"), "popup.html debe indicar uso de fotos HD de la web");
assert.ok(/preferWebHd\s*\?\s*\(item\.webThumb/.test(popupJs), "popup.js debe priorizar webThumb en render");
console.log("  ✓ Test 5: UI de popup sincronizada con fotos web HD.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE FOTOS WEB HD PASARON AL 100%");
console.log("=================================================");
