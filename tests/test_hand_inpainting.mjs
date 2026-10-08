import assert from "node:assert/strict";
import { isSkinPixel, inpaintHandOcclusionsOnCanvas } from "../js/utils/ImageProcessor.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   TEST SUITE: DETECCIÓN DE MANOS E INPAINTING DE CHASIS IA         ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// 1. Verificación de clasificación cromática de piel
console.log("=== SEC 1: CLASIFICACIÓN CROMÁTICA DE PIEL VS MATERIALES ===");

// Tonos de piel humana (clara, media, morena)
assert.equal(isSkinPixel(220, 165, 130), true, "Piel clara debe detectarse como true");
assert.equal(isSkinPixel(185, 135, 105), true, "Piel intermedia debe detectarse como true");
assert.equal(isSkinPixel(130, 85, 55), true, "Piel morena debe detectarse como true");
console.log("  ✓ Piel humana clara, media y morena correctamente clasificadas.");

// Materiales de mandos y electrónica (negro, blanco, rojo, azul, verde, gris)
assert.equal(isSkinPixel(25, 25, 28), false, "Plástico negro de mando debe ser false");
assert.equal(isSkinPixel(245, 245, 248), false, "Plástico blanco de mando debe ser false");
assert.equal(isSkinPixel(30, 110, 220), false, "Botón azul debe ser false");
assert.equal(isSkinPixel(210, 25, 30), false, "Botón rojo debe ser false");
assert.equal(isSkinPixel(120, 120, 125), false, "Gris titanio/metálico debe ser false");
console.log("  ✓ Plásticos gaming y componentes de mandos no generan falsos positivos.");

// 2. Verificación de Canvas Mock e Inpainting
console.log("\n=== SEC 2: INPAINTING DE BORDE ESTRUCTURAL EN CANVAS ===");

function createMockCanvas(w, h, fillFn) {
  const total = w * h * 4;
  const buffer = new Uint8ClampedArray(total);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const [r, g, b, a] = fillFn(x, y);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  return {
    width: w,
    height: h,
    getContext: (type) => ({
      getImageData: () => ({ data: buffer }),
      putImageData: (imgData) => {
        for (let i = 0; i < total; i++) {
          buffer[i] = imgData.data[i];
        }
      }
    }),
    _buffer: buffer
  };
}

// Escenario: Un mando negro (20x20) con un dedo sosteniendo el borde derecho
const w = 24;
const h = 24;
const mockCanvas = createMockCanvas(w, h, (x, y) => {
  // Cuerpo del mando: x entre 2 y 16, y entre 4 y 20 (Plástico negro 30, 30, 30)
  const isController = (x >= 2 && x <= 16 && y >= 4 && y <= 20);
  
  // Dedo sosteniendo el borde: x entre 14 y 22, y entre 10 y 14 (Piel 210, 150, 120)
  // Nota: x de 14 a 16 se superpone con el mando (contacto), x de 17 a 22 sobresale hacia afuera
  const isFinger = (x >= 14 && x <= 22 && y >= 10 && y <= 14);

  if (isFinger) {
    return [210, 150, 120, 255];
  }
  if (isController) {
    return [30, 30, 30, 255];
  }
  return [0, 0, 0, 0]; // Fondo transparente
});

const repaired = inpaintHandOcclusionsOnCanvas(mockCanvas);
assert.equal(repaired, true, "Debe detectar la presencia de mano y aplicar reparación");

// Verificar que el dedo saliente (x = 20, y = 12) fue suprimido (alpha = 0)
const outsideFingerIdx = (12 * w + 20) * 4;
assert.equal(mockCanvas._buffer[outsideFingerIdx + 3], 0, "El dedo exterior debe volverse transparente (alpha = 0)");
console.log("  ✓ Dedo exterior saliente eliminado a transparente al 100%.");

// Verificar que la zona de contacto con el mando (x = 15, y = 12) fue inpaintada con el color del mando (~30, 30, 30)
const contactIdx = (12 * w + 15) * 4;
assert.equal(mockCanvas._buffer[contactIdx + 3], 255, "La zona de contacto debe mantenerse visible");
assert.ok(mockCanvas._buffer[contactIdx] <= 50, `El color reconstruido R (${mockCanvas._buffer[contactIdx]}) debe aproximar el plástico del mando`);
console.log(`  ✓ Superficie de contacto reconstruida con textura de carcasa: RGB(${mockCanvas._buffer[contactIdx]}, ${mockCanvas._buffer[contactIdx+1]}, ${mockCanvas._buffer[contactIdx+2]}).`);

// 3. Verificación con producto limpio sin manos
const cleanCanvas = createMockCanvas(w, h, (x, y) => {
  if (x >= 4 && x <= 18 && y >= 4 && y <= 18) {
    return [40, 40, 45, 255]; // Mando limpio
  }
  return [0, 0, 0, 0];
});

const cleanRepaired = inpaintHandOcclusionsOnCanvas(cleanCanvas);
assert.equal(cleanRepaired, false, "En producto sin manos no debe modificar nada");
console.log("  ✓ Imagen limpia sin manos preservada intacta sin alteraciones.");

console.log("\n======================================================");
console.log("TODAS LAS PRUEBAS DE INPAINTING Y REMOCIÓN DE MANOS PASARON (100% PASS)");
console.log("======================================================");
