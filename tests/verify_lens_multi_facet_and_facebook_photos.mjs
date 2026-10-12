import assert from "node:assert/strict";
import searchHandler from "../api/search-product-images.js";
import { RewardModel } from "../js/models/RewardModel.js";
import { FB_USER_DEFAULT_LISTINGS } from "../js/views/AdminInvoiceBatchView.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: GOOGLE LENS FACETAS Y MULTI-FOTOS DE FACEBOOK        ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Probar que el buscador devuelva variedad de facetas estilo Google Lens
console.log("=== SEC 1: DIVERSIDAD DE FACETAS TIPO GOOGLE LENS ===");
async function testMultiFacetSearch() {
  const req = {
    method: "POST",
    body: {
      query: "Mini Jet Fan 2 en 1 Soplador Turbo",
      description: "Soplador turbo comprimido con boquillas y cargador tipo C",
      sampleImages: ["data:image/webp;base64,FOTO_CAJA_FACEBOOK"],
      limit: 8
    }
  };

  let statusCode = 0;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; },
        end: () => {}
      };
    }
  };

  await searchHandler(req, res);
  assert.equal(statusCode, 200, "El endpoint debe responder 200 OK");
  assert.equal(responseData.success, true, "La respuesta debe indicar éxito");
  assert.ok(Array.isArray(responseData.results), "Debe devolver lista de resultados");
  assert.ok(responseData.results.length >= 4, "Debe devolver al menos 4 resultados");

  const facetLabels = responseData.results.map(r => r.facetLabel);
  console.log("  Facetas devueltas por el algoritmo:");
  responseData.results.slice(0, 6).forEach((r, idx) => {
    console.log(`    #${idx + 1} [${r.facetLabel || "Web"}] ${r.title.slice(0, 40)}... (${r.source})`);
  });

  const hasBoxOrKitOrVariant = facetLabels.some(l => 
    l && (l.includes("Caja") || l.includes("Kit") || l.includes("Variante") || l.includes("Molde"))
  );
  assert.ok(hasBoxOrKitOrVariant, "El resultado debe incluir facetas variadas (Caja, Kit, Molde o Variante)");
  console.log("  ✓ Diversidad de facetas confirmada (evita monótono producto único).");
}

await testMultiFacetSearch();

// 2. Probar que los productos por defecto de FB_USER_DEFAULT_LISTINGS posean fbPhotos
console.log("\n=== SEC 2: LISTADOS DE FACEBOOK CON MÚLTIPLES FOTOS (CAJA + ACCESORIOS) ===");
const jetFan = FB_USER_DEFAULT_LISTINGS.find(item => item.title.includes("Mini Jet Fan"));
assert.ok(jetFan, "Debe existir Mini Jet Fan en los listados");
assert.ok(Array.isArray(jetFan.fbPhotos), "Mini Jet Fan debe tener arreglo fbPhotos");
assert.ok(jetFan.fbPhotos.length >= 2, "Mini Jet Fan debe contener al menos 2 fotos de Facebook");
assert.equal(jetFan.imageUrl, "", "Mini Jet Fan debe iniciar con imageUrl vacía hasta que se elija molde");
console.log(`  ✓ Mini Jet Fan tiene ${jetFan.fbPhotos.length} fotos reales de Facebook preservadas.`);

const windchaser = FB_USER_DEFAULT_LISTINGS.find(item => item.title.includes("Windchaser"));
assert.ok(windchaser, "Debe existir Windchaser en los listados");
assert.ok(Array.isArray(windchaser.fbPhotos), "Windchaser debe tener arreglo fbPhotos");
assert.ok(windchaser.fbPhotos.length >= 2, "Windchaser debe contener al menos 2 fotos de Facebook");
console.log(`  ✓ Mando Windchaser tiene ${windchaser.fbPhotos.length} fotos reales de Facebook preservadas.`);

// 3. Simular adopción de molde web como portada con fotos de Facebook anexadas
console.log("\n=== SEC 3: ADOPCIÓN DE MOLDE WEB COMO PORTADA + FOTOS FB EN COLA ===");
const chosenWebMoldUrl = "https://images.example.com/studio_isolated_jet_fan.webp";
const existingFbPhotos = [...jetFan.fbPhotos];

// Lógica de adopción idéntica a selectMoldCandidate()
const finalImageList = [chosenWebMoldUrl, ...existingFbPhotos.filter(u => u !== chosenWebMoldUrl)];

const approvedModel = new RewardModel({
  ...jetFan,
  hasSelectedMold: true,
  imageUrl: finalImageList[0],
  images: finalImageList,
  status: "ACTIVE"
});

assert.equal(approvedModel.status, "ACTIVE", "El estado debe ser ACTIVE");
assert.equal(approvedModel.imageUrl, chosenWebMoldUrl, "La portada oficial debe ser el molde web seleccionado");
assert.equal(approvedModel.images.length, existingFbPhotos.length + 1, "Debe contener el molde + las fotos de FB");
assert.equal(approvedModel.images[1], existingFbPhotos[0], "La primera foto de Facebook (ej. caja) se mantiene como foto secundaria");
console.log(`  ✓ Portada oficial fijada en molde web de estudio.`);
console.log(`  ✓ Galería del producto retiene ${approvedModel.images.length} imágenes (Molde + Caja/Accesorios reales).`);

console.log("\n========================================================");
console.log("TODAS LAS PRUEBAS DE GOOGLE LENS Y MULTI-FOTOS PASARON");
console.log("========================================================\n");
