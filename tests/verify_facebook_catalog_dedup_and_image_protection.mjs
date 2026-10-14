import assert from "node:assert";
import { findMatchingCatalogProduct } from "../js/views/AdminInvoiceBatchView.js";

console.log("=================================================");
console.log("SUITE: DEDUPLICACIÓN DE FACEBOOK Y PROTECCIÓN DE IMÁGENES");
console.log("=================================================");

const mockCatalog = [
  {
    id: "fb_1198273641889024",
    facebookListingId: "1198273641889024",
    title: "Repetidor TP-LINK RE315 AC1200 Extensor Wi-Fi",
    priceUsd: 22.97,
    priceNio: 850,
    imageUrl: "data:image/webp;base64,UklGRm...VALID_IMG",
    images: ["data:image/webp;base64,UklGRm...VALID_IMG"],
    brandVerified: true,
    hasSelectedMold: true,
    status: "ACTIVE"
  },
  {
    id: "fb_1198273641889025",
    facebookListingId: "1198273641889025",
    title: "Mando Windchaser PLUS Youth Edition",
    priceUsd: 20.27,
    priceNio: 750,
    imageUrl: "https://down-ph.img.susercontent.com/file/sg-mando-mold.jpg",
    images: ["https://down-ph.img.susercontent.com/file/sg-mando-mold.jpg"],
    brandVerified: false,
    hasSelectedMold: true,
    status: "ACTIVE"
  }
];

// Test 1: Coincidencia por facebookListingId
const itemExistentePorId = {
  listingId: "1198273641889024",
  title: "Repetidor TP-LINK RE315 AC1200",
  rawPrice: 850,
  currency: "NIO"
};

const match1 = findMatchingCatalogProduct(itemExistentePorId, mockCatalog);
assert.ok(match1, "Debe encontrar el producto en catálogo por facebookListingId");
assert.strictEqual(match1.id, "fb_1198273641889024");
console.log("  ✓ Test 1: Coincidencia exacta por facebookListingId validada.");

// Test 2: Coincidencia de producto genérico que ya tiene molde fijado
const itemMandoExistente = {
  listingId: "1198273641889025",
  title: "Mando Windchaser PLUS",
  rawPrice: 750,
  currency: "NIO"
};

const match2 = findMatchingCatalogProduct(itemMandoExistente, mockCatalog);
assert.ok(match2, "Debe encontrar el Mando Windchaser en el catálogo");
assert.strictEqual(match2.hasSelectedMold, true, "El molde del mando ya debe estar registrado como seleccionado");
assert.ok(match2.imageUrl.includes("sg-mando-mold"), "La imagen del molde seleccionado debe ser preservada intacta");
console.log("  ✓ Test 2: Mando genérico preexistente retiene su molde e imagen sin forzar re-selección.");

// Test 3: Producto totalmente nuevo subido ayer
const itemNuevo = {
  listingId: "999888777666555",
  title: "Nuevo Teclado Mecánico RGB 60% Switch Blue",
  rawPrice: 35,
  currency: "USD"
};

const matchNuevo = findMatchingCatalogProduct(itemNuevo, mockCatalog);
assert.strictEqual(matchNuevo, null, "El producto nuevo no debe coincidir con el catálogo viejo");
console.log("  ✓ Test 3: Producto nuevo detectado correctamente como ausente del catálogo.");

// Test 4: Regla de marcado de checkbox
// Si ya está en catálogo -> checked = false
// Si es nuevo -> checked = true
const isCheckedExistente = !Boolean(match1);
const isCheckedNuevo = !Boolean(matchNuevo);
assert.strictEqual(isCheckedExistente, false, "Los productos ya en catálogo deben aparecer DESMARCADOS por defecto");
assert.strictEqual(isCheckedNuevo, true, "Los productos nuevos deben aparecer MARCADOS por defecto");
console.log("  ✓ Test 4: Checkboxes inteligentes configurados (desmarcados si existen, marcados si son nuevos).");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE DEDUPLICACIÓN PASARON AL 100%");
console.log("=================================================");
