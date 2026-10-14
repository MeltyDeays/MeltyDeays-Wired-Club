import {
  FB_IMG_JET_FAN,
  FB_IMG_GAMESIR_X5,
  FB_IMG_ANKER_POWERBANK,
  FB_IMG_TPLINK_RE315,
  FB_IMG_WINDCHASER_MANDO,
  FB_IMG_WINDCHASER_BODY,
  FB_IMG_ACER_PREDATOR
} from "../js/data/FbRealImages.js";

const FIRESTORE_API_KEY = "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig";
const BASE_URL = "https://firestore.googleapis.com/v1/projects/lain-wired-club/databases/(default)/documents";

async function patchItem(collection, id, title, imageBase64, extraImages = []) {
  const patchUrl = `${BASE_URL}/${collection}/${id}?updateMask.fieldPaths=imageUrl&updateMask.fieldPaths=images&updateMask.fieldPaths=fbPhotos&key=${FIRESTORE_API_KEY}`;
  const allImgs = [imageBase64, ...extraImages].filter(Boolean);
  const res = await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        imageUrl: { stringValue: imageBase64 },
        images: {
          arrayValue: {
            values: allImgs.map(img => ({ stringValue: img }))
          }
        },
        fbPhotos: {
          arrayValue: {
            values: allImgs.map(img => ({ stringValue: img }))
          }
        }
      }
    })
  });
  console.log(`[${collection}] ${id} (${title}) PATCH status:`, res.status);
}

async function remediateAll() {
  console.log("Remediando imágenes oficiales de Facebook en dev_rewards_catalog...");

  const itemsToPatch = [
    {
      id: "fb_1198273641889024",
      title: "Repetidor TP-LINK RE315 AC1200",
      img: FB_IMG_TPLINK_RE315
    },
    {
      id: "fb_1198273641889023",
      title: "Grip / Power Bank Gaming Anker PowerCore Play 6K",
      img: FB_IMG_ANKER_POWERBANK
    },
    {
      id: "fb_1198273641889022",
      title: "Control Gamer GameSir X5 Lite Type-C",
      img: FB_IMG_GAMESIR_X5
    },
    {
      id: "fb_1198273641889026",
      title: "Acer Predator Helios Neo 14",
      img: FB_IMG_ACER_PREDATOR
    }
  ];

  for (const item of itemsToPatch) {
    await patchItem("dev_rewards_catalog", item.id, item.title, item.img);
  }

  console.log("\nVerificando dev_rewards_catalog...");
  for (const item of itemsToPatch) {
    const doc = await (await fetch(`${BASE_URL}/dev_rewards_catalog/${item.id}?key=${FIRESTORE_API_KEY}`)).json();
    const imgUrl = doc.fields?.imageUrl?.stringValue || "";
    console.log(`✓ ${item.id}: len=${imgUrl.length}, startsWithDataImage=${imgUrl.startsWith("data:image")}`);
  }
}

remediateAll().catch(e => console.error(e));
