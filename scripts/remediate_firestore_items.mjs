import { FB_IMG_GAMESIR_X5 } from "../js/data/FbRealImages.js";

const FIRESTORE_API_KEY = "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig";
const BASE_URL = "https://firestore.googleapis.com/v1/projects/lain-wired-club/databases/(default)/documents";

async function remediate() {
  console.log("Remediando documentos en dev_rewards_catalog...");

  // 1. Remediación fb_1198273641889025 (Mando Windchaser -> genérico, esperando selección de molde)
  const patchWindchaserUrl = `${BASE_URL}/dev_rewards_catalog/fb_1198273641889025?updateMask.fieldPaths=status&updateMask.fieldPaths=brandVerified&updateMask.fieldPaths=hasSelectedMold&updateMask.fieldPaths=imageUrl&key=${FIRESTORE_API_KEY}`;
  const res1 = await fetch(patchWindchaserUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        status: { stringValue: "PENDING_APPROVAL" },
        brandVerified: { booleanValue: false },
        hasSelectedMold: { booleanValue: false },
        imageUrl: { stringValue: "" }
      }
    })
  });
  console.log("fb_1198273641889025 (Windchaser) PATCH status:", res1.status);

  // 2. Remediación fb_1198273641889022 (GameSir X5 Lite -> sustituir placeholder por foto oficial de estudio)
  const patchGameSirUrl = `${BASE_URL}/dev_rewards_catalog/fb_1198273641889022?updateMask.fieldPaths=imageUrl&updateMask.fieldPaths=images&key=${FIRESTORE_API_KEY}`;
  const res2 = await fetch(patchGameSirUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        imageUrl: { stringValue: FB_IMG_GAMESIR_X5 },
        images: {
          arrayValue: {
            values: [{ stringValue: FB_IMG_GAMESIR_X5 }]
          }
        }
      }
    })
  });
  console.log("fb_1198273641889022 (GameSir X5 Lite) PATCH status:", res2.status);

  // 3. Verificar estado actualizado
  const verify1 = await (await fetch(`${BASE_URL}/dev_rewards_catalog/fb_1198273641889025?key=${FIRESTORE_API_KEY}`)).json();
  const verify2 = await (await fetch(`${BASE_URL}/dev_rewards_catalog/fb_1198273641889022?key=${FIRESTORE_API_KEY}`)).json();

  console.log("\nVerificación Windchaser:");
  console.log("  Status:", verify1.fields?.status?.stringValue);
  console.log("  BrandVerified:", verify1.fields?.brandVerified?.booleanValue);
  console.log("  HasSelectedMold:", verify1.fields?.hasSelectedMold?.booleanValue);
  console.log("  ImageUrl:", verify1.fields?.imageUrl?.stringValue);

  console.log("\nVerificación GameSir X5 Lite:");
  console.log("  Status:", verify2.fields?.status?.stringValue);
  console.log("  BrandVerified:", verify2.fields?.brandVerified?.booleanValue);
  console.log("  ImageUrl startsWith data:image?:", verify2.fields?.imageUrl?.stringValue?.startsWith("data:image"));
}

remediate();
