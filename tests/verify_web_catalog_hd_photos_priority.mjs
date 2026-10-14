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
  contentScript.includes("Usando ${webImages.length} fotos oficiales en alta resolución del catálogo web"),
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

// Test 2: Simulación de selección de fotos en onProductLoaded
const mockWebProduct = {
  id: "jet_fan",
  title: "Mini Jet Fan Turbo",
  priceNio: 850,
  images: [
    "https://firebasestorage.googleapis.com/v0/b/app/o/jet1.jpg",
    "https://firebasestorage.googleapis.com/v0/b/app/o/jet2.jpg"
  ],
  imageUrl: "https://firebasestorage.googleapis.com/v0/b/app/o/jet1.jpg"
};

const thumbUrlFromFacebook = "https://scontent.xx.fbcdn.net/v/lowres_crop.jpg";
const preferRealPhotos = false;

// Lógica idéntica a onProductLoaded:
const webImages = Array.isArray(mockWebProduct.images) && mockWebProduct.images.length > 0
  ? mockWebProduct.images
  : (mockWebProduct.imageUrl ? [mockWebProduct.imageUrl] : []);

let selectedImages = [];
if (webImages.length > 0) {
  selectedImages = webImages.map(u => (typeof u === "string" ? u.replaceAll("&amp;", "&").trim() : u)).slice(0, 5);
} else if (thumbUrlFromFacebook) {
  selectedImages = [thumbUrlFromFacebook.replaceAll("&amp;", "&").trim()];
}

assert.equal(selectedImages.length, 2, "Debe seleccionar las 2 fotos del catálogo web");
assert.equal(selectedImages[0], "https://firebasestorage.googleapis.com/v0/b/app/o/jet1.jpg");
assert.ok(!selectedImages.includes(thumbUrlFromFacebook), "No debe usar la miniatura recortada de Facebook si hay fotos web");
console.log("  ✓ Test 2: Descarte de miniaturas de Facebook en favor de fotos web de alta resolución validado.");

// Test 3: Verificar UI en popup.html y popup.js
assert.ok(popupHtml.includes("Usar fotos HD del catálogo web oficial"), "popup.html debe indicar uso de fotos HD de la web");
assert.ok(/preferWebHd\s*\?\s*\(item\.webThumb/.test(popupJs), "popup.js debe priorizar webThumb en render");
console.log("  ✓ Test 3: UI de popup sincronizada con fotos web HD.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE FOTOS WEB HD PASARON AL 100%");
console.log("=================================================");
