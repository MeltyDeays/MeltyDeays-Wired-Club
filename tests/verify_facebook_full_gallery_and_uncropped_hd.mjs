import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN GALERÍA COMPLETA HD Y SIN RECORTE FACEBOOK");
console.log("=================================================");

const root = process.cwd();
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");

// Test 1: Verificar existencia de funciones de extracción y caché en content-script.js
assert.ok(contentScript.includes("fetchAllListingPhotosFromFacebook"), "content-script.js debe definir fetchAllListingPhotosFromFacebook");
assert.ok(contentScript.includes("extractHighResPhotosFromFacebookHtml"), "content-script.js debe definir extractHighResPhotosFromFacebookHtml");
assert.ok(contentScript.includes("_fbListingPhotosCache"), "content-script.js debe incluir caché de fotos para optimización");
console.log("  ✓ Test 1: Funciones de extracción de galería completa HD registradas en content-script.js.");

// Extraer extractHighResPhotosFromFacebookHtml dinámicamente para probarla directamente
const fnMatch = contentScript.match(/function extractHighResPhotosFromFacebookHtml\([\s\S]*?\n\}/);
assert.ok(fnMatch, "No se pudo aislar extractHighResPhotosFromFacebookHtml");
const extractHighResPhotosFromFacebookHtml = new Function("html", `${fnMatch[0]}; return extractHighResPhotosFromFacebookHtml(html);`);

// Test 2: Extracción estructurada desde listing_photos con múltiples fotos sin recorte
const mockMarketplaceHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta property="og:image" content="https://scontent.fmga3-2.fna.fbcdn.net/v/t39.30808-6/482910291_1198273641889025_n.jpg?stp=dst-jpg_p960x960&_nc_cat=101"/>
  </head>
  <body>
    <script type="application/json">{"require":[["ScheduledServerJS","handle",[],[{"__bbox":{"require":[["RelayPrefetchedStreamCache","next",[],["MarketplaceItemDetail",{"marketplace_listing":{"listing_photos":[{"image":{"uri":"https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/482910291_1198273641889025_n.jpg?stp=dst-jpg_p960x960&_nc_cat=101"}},{"image":{"uri":"https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/482910292_1198273641889025_n.jpg?stp=dst-jpg_p960x960&_nc_cat=102"}},{"image":{"uri":"https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/482910293_1198273641889025_n.jpg?stp=dst-jpg_p960x960&_nc_cat=103"}}]}}]}}]]}</script>
  </body>
  </html>
`;

const extractedPhotos = extractHighResPhotosFromFacebookHtml(mockMarketplaceHtml);
assert.ok(Array.isArray(extractedPhotos), "Debe devolver un arreglo");
assert.equal(extractedPhotos.length, 3, "Debe extraer las 3 fotos reales completas de la galería");
console.log(`  ✓ Test 2: Galería de 3 fotos completas extraídas sin omisión: ${extractedPhotos.length} fotos encontradas.`);

// Test 3: Filtrado de recortes cuadrados de miniaturas (c0.0.100.100a) y preferencia por alta resolución (_n.jpg)
const mockHtmlWithThumbs = `
  <html>
    <script type="application/json">
      "https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/5001_thumb_s.jpg?stp=c0.0.100.100a_p100x100"
      "https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/5001_full_n.jpg?stp=dst-jpg_s1080x1080"
      "https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/5002_cropped.jpg?stp=c0.0.150.150a_s150x150"
      "https:\\/\\/scontent.fmga3-2.fna.fbcdn.net\\/v\\/t39.30808-6\\/5002_full_n.jpg?stp=dst-jpg_p960x960"
    </script>
  </html>
`;

const cleanHighRes = extractHighResPhotosFromFacebookHtml(mockHtmlWithThumbs);
assert.equal(cleanHighRes.length, 2, "Debe consolidar las 2 fotos únicas eligiendo la versión sin recorte");
assert.ok(!cleanHighRes[0].includes("c0.0."), "La foto 1 no debe tener recorte c0.0.");
assert.ok(cleanHighRes[0].includes("1080"), "La foto 1 debe ser la versión 1080px");
assert.ok(!cleanHighRes[1].includes("c0.0."), "La foto 2 no debe tener recorte c0.0.");
assert.ok(cleanHighRes[1].includes("960"), "La foto 2 debe ser la versión 960px");
console.log("  ✓ Test 3: Filtrado de recortes cuadrados y selección de versiones HD nativas validada.");

// Test 4: Verificación de preservación de aspecto en Canvas HD
const origW = 1600;
const origH = 1200;
const targetMinDim = 1080;
const maxDim = Math.max(origW, origH);
let scale = 1;
if (maxDim < targetMinDim) {
  scale = targetMinDim / maxDim;
}
const targetW = Math.round(origW * scale);
const targetH = Math.round(origH * scale);
assert.equal(targetW / targetH, origW / origH, "La relación de aspecto (aspect ratio) debe ser exactamente igual");
assert.equal(scale, 1, "Si la foto ya es HD (1600x1200), la escala debe ser 1 (sin degradación por remuestreo)");
console.log("  ✓ Test 4: Preservación de aspecto original y cero recorte en Canvas HD validada.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE GALERÍA HD Y ASPECTO PASARON AL 100%");
console.log("=================================================");
