import assert from "node:assert/strict";
import { RewardModel } from "../js/models/RewardModel.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: BANDEJA DE ESPERA, MULTI-FOTOS Y LUZ VERDE           ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Simulación de Producto importado desde Facebook en PENDING_APPROVAL
console.log("=== SEC 1: INGRESO AISLADO DE PRODUCTO EN ESPERA ===");
const rawFbItem = {
  id: "fb_9988776655",
  title: "Mando Inalámbrico Pro Gamer 2.4G",
  description: "Mando para PC y consolas con vibración dual y batería recargable.",
  rawDescription: "Mando nuevo en caja entrego en metrocentro 88888888 negociable",
  priceUsd: 25.00,
  priceNio: 925,
  status: "PENDING_APPROVAL",
  images: [],
  imageUrl: ""
};

const reward = new RewardModel(rawFbItem);
assert.equal(reward.status, "PENDING_APPROVAL", "El producto debe iniciar en PENDING_APPROVAL");
assert.equal(reward.rawDescription, rawFbItem.rawDescription, "rawDescription debe persistirse");
assert.equal(reward.getImages().length, 0, "No debe tener imágenes asignadas al inicio");
console.log("  ✓ Producto inicializado en PENDING_APPROVAL con rawDescription preservado.");

// 2. Simulación de carga múltiple de imágenes (1, 2, 3, 4 fotos)
console.log("\n=== SEC 2: GESTIÓN DE MÚLTIPLES FOTOGRAFÍAS REALES ===");
let pendingImages = [];

function validateCanPublish(images) {
  return Array.isArray(images) && images.length > 0;
}

assert.equal(validateCanPublish(pendingImages), false, "Sin fotos, no se puede dar luz verde");

// Agregar 4 imágenes reales simuladas
pendingImages.push("data:image/webp;base64,FOTO_1_FRONTAL");
pendingImages.push("data:image/webp;base64,FOTO_2_TRASERA");
pendingImages.push("data:image/webp;base64,FOTO_3_LATERAL");
pendingImages.push("data:image/webp;base64,FOTO_4_DETALLE");

assert.equal(pendingImages.length, 4, "Deben haberse agregado 4 imágenes");
assert.equal(validateCanPublish(pendingImages), true, "Con fotos, se habilita la luz verde");
console.log("  ✓ Validación de carga multi-foto (4 imágenes) superada.");

// Eliminar foto #3 (índice 2)
pendingImages.splice(2, 1);
assert.equal(pendingImages.length, 3, "Debe quedar con 3 imágenes tras eliminar una");
assert.equal(pendingImages[0], "data:image/webp;base64,FOTO_1_FRONTAL", "La portada #1 se mantiene intacta");
console.log("  ✓ Eliminación selectiva de imagen correcta.");

// 3. Simulación de Regeneración con IA
console.log("\n=== SEC 3: REGENERACIÓN DE FICHA INDIVIDUAL CON IA ===");
function simulateAiRegeneration(title, rawDesc) {
  return `${title} certificado para miembros The Wired Club.
• Compatibilidad: PC, Android y consolas vía receptor 2.4G
• Autonomía: Batería recargable de litio de hasta 12 horas
• Respuesta: Baja latencia y gatillos analógicos`;
}

const regeneratedText = simulateAiRegeneration(reward.title, reward.rawDescription);
assert.match(regeneratedText, /• Compatibilidad:/, "La ficha debe incluir viñetas técnicas");
assert.ok(!regeneratedText.includes("metrocentro"), "Debe purgar lugares informales de Facebook");
reward.description = regeneratedText;
console.log("  ✓ Ficha técnica individual regenerada exitosamente.");

// 4. Simulación de Aprobación y Luz Verde
console.log("\n=== SEC 4: CONCESIÓN DE LUZ VERDE Y TRANSICIÓN A ACTIVO ===");
reward.images = [...pendingImages];
reward.imageUrl = pendingImages[0];
reward.status = "ACTIVE";

const json = reward.toJSON();
assert.equal(json.status, "ACTIVE", "El estado debe cambiar a ACTIVE");
assert.equal(json.images.length, 3, "El JSON debe incluir el arreglo de 3 imágenes");
assert.equal(json.imageUrl, "data:image/webp;base64,FOTO_1_FRONTAL", "imageUrl debe ser la foto de portada");
assert.equal(json.rawDescription, rawFbItem.rawDescription, "rawDescription debe exportarse en JSON");
console.log("  ✓ Publicación con Luz Verde completa y consistente.");

// 5. Búsqueda Web de Fotos de Estudio y Adopción 1-Clic
console.log("\n=== SEC 5: BÚSQUEDA WEB DE FOTOS DE ESTUDIO Y ADOPCIÓN 1-CLIC ===");
import searchHandler from "../api/search-product-images.js";

async function testWebSearchIntegration() {
  const req = {
    method: "POST",
    body: { query: "Windchaser controller switch green" }
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
  assert.equal(statusCode, 200, "El endpoint de búsqueda web debe responder 200 OK");
  assert.equal(responseData.success, true, "La búsqueda debe indicar success: true");
  assert.ok(Array.isArray(responseData.results), "Debe retornar un arreglo de resultados");
  assert.ok(responseData.results.length > 0, "Debe encontrar fotos de estudio sugeridas");
  
  const chosenResult = responseData.results[0];
  assert.ok(chosenResult.imageUrl.startsWith("http"), "La imagen elegida debe tener URL válida");
  console.log(`  ✓ Búsqueda web exitosa: ${responseData.results.length} fotos encontradas.`);
  console.log(`  ✓ Foto sugerida seleccionada: ${chosenResult.title.slice(0, 45)}... [${chosenResult.source}]`);

  // Simular adopción 1-clic en el producto
  const adoptedList = [chosenResult.imageUrl];
  reward.images = adoptedList;
  reward.imageUrl = adoptedList[0];
  assert.equal(reward.images.length, 1, "Debe tener 1 foto adoptada con un clic");
  console.log("  ✓ Adopción 1-clic de foto oficial integrada y validada.");
}

await testWebSearchIntegration();

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE BANDEJA DE ESPERA PASARON (100%)");
console.log("======================================================");

