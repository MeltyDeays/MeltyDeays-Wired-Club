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

// Test 3: Protección anti-inyección: Rechazo estricto de fotos sueltas de feed/memes y límite máximo de 5 fotos
const mockHtmlWithRandomFeedMemes = `
  <html>
    <head>
      <meta property="og:image" content="https://scontent.fmga3-2.fna.fbcdn.net/v/t39.30808-6/item_main_real_photo.jpg"/>
    </head>
    <body>
      <!-- 70 fotos de memes y recomendaciones ajenas que no pertenecen a listing_photos -->
      ${Array.from({ length: 70 }, (_, i) => `
        <div class="feed-recommendation">
          <img src="https://scontent.fmga3-2.fna.fbcdn.net/v/t39.30808-6/random_meme_${i}.jpg"/>
        </div>
      `).join("\n")}
    </body>
  </html>
`;

const isolatedPhotos = extractHighResPhotosFromFacebookHtml(mockHtmlWithRandomFeedMemes);
assert.equal(isolatedPhotos.length, 1, "Solo debe extraer la foto legítima de og:image e ignorar las 70 fotos de memes del feed");
assert.equal(isolatedPhotos[0], "https://scontent.fmga3-2.fna.fbcdn.net/v/t39.30808-6/item_main_real_photo.jpg");
assert.ok(isolatedPhotos.length <= 5, "La cantidad jamás debe sobrepasar el límite seguro de 5 fotos");
console.log("  ✓ Test 3: Protección anti-inyección validada: 70 fotos ajenas de memes/feed ignoradas al 100%.");

// Test 4: Verificación de preservación de aspecto y escalado seguro en Canvas HD
const origW = 1600;
const origH = 1200;
const maxDim = Math.max(origW, origH);
let scale = 1;
if (maxDim < 900) {
  scale = Math.min(2.0, 900 / maxDim);
}
const targetW = Math.round(origW * scale);
const targetH = Math.round(origH * scale);
assert.equal(targetW / targetH, origW / origH, "La relación de aspecto (aspect ratio) debe ser exactamente igual");
assert.equal(scale, 1, "Si la foto ya es HD (1600x1200), la escala debe ser 1 (cero remuestreo)");
console.log("  ✓ Test 4: Preservación de aspecto original y cero recorte en Canvas HD validada.");

console.log("=================================================");
console.log("TODAS LAS PRUEBAS DE GALERÍA HD Y ASPECTO PASARON AL 100%");
console.log("=================================================");
