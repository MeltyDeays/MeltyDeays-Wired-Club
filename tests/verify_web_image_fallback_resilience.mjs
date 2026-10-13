import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/search-product-images.js");

async function runTests() {
  console.log("=== TEST: RESCATE INTELIGENTE DE IMÁGENES WEB CON FALLBACK Y PLACEHOLDERS ===");

  // Escenario: El usuario selecciona el mando verde de ecsmedia.pl
  // La URL remota original de ecsmedia.pl devuelve el placeholder 7273 bytes GIF ('brak zdjęcia')
  // El endpoint debe detectar el placeholder y rescatar la imagen real desde fallbackUrl (Bing CDN 800x800)
  const req = {
    method: "POST",
    body: {
      action: "proxy-base64",
      url: "https://ecsmedia.pl/c/bezprzewodowy-kontroler-pad-do-gier-windchaser-plus-green-android-ios-steam-b-iext184076936.jpg",
      fallbackUrl: "https://tse2.mm.bing.net/th/id/OIP.uhoLwjtyeSz_wg3Xp2h6pQHaHa?r=0&pid=Api"
    }
  };

  let responseStatus = 0;
  let responseData = null;

  const res = {
    setHeader: () => {},
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseData = data;
        },
        end: () => {}
      };
    }
  };

  await handler(req, res);

  assert.equal(responseStatus, 200, "El código de respuesta debe ser 200");
  assert.equal(responseData.success, true, "La respuesta debe indicar éxito");
  assert.ok(responseData.dataUrl, "Debe existir dataUrl");
  assert.ok(responseData.dataUrl.startsWith("data:image/jpeg;base64,"), "Debe ser imagen JPEG rescatada en base64");
  assert.ok(responseData.dataUrl.length > 5000, "La imagen debe contener datos visuales completos");

  console.log("✓ Caso Mando Verde Windchaser rescatado exitosamente:", {
    status: responseStatus,
    dataUrlPrefix: responseData.dataUrl.slice(0, 35),
    length: responseData.dataUrl.length
  });

  console.log("========================================================");
  console.log("TODAS LAS VERIFICACIONES DE RESCATE VISUAL PASARON");
  console.log("========================================================");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
