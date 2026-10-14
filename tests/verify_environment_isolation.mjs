import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================");
console.log("SUITE: VERIFICACIÓN AISLAMIENTO ESTRICTO DE ENTORNOS");
console.log("=================================================");

const root = process.cwd();
const fbApi = fs.readFileSync(path.join(root, "extensions/marketplace-sync/firebase-api.js"), "utf8");
const background = fs.readFileSync(path.join(root, "extensions/marketplace-sync/background.js"), "utf8");
const contentScript = fs.readFileSync(path.join(root, "extensions/marketplace-sync/content-script.js"), "utf8");
const popupHtml = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(root, "extensions/marketplace-sync/popup.js"), "utf8");
const envJs = fs.readFileSync(path.join(root, "js/config/env.js"), "utf8");
const apiSync = fs.readFileSync(path.join(root, "api/sync-facebook.js"), "utf8");

// Test 1: firebase-api.js getWebProducts default = "rewards_catalog"
assert.ok(fbApi.includes('export async function getWebProducts(targetCollection = "rewards_catalog")'), "getWebProducts debe tener default 'rewards_catalog'");
assert.ok(!fbApi.includes('["dev_rewards_catalog", "rewards_catalog"'), "getWebProducts NO debe tener fallback cruzado con dev_rewards_catalog");
console.log("  ✓ Test 1: getWebProducts anclado a 'rewards_catalog' sin fallback cruzado.");

// Test 2: firebase-api.js getProductById default = "rewards_catalog"
assert.ok(fbApi.includes('export async function getProductById(productId, targetCollection = "rewards_catalog")'), "getProductById debe tener default 'rewards_catalog'");
console.log("  ✓ Test 2: getProductById anclado a 'rewards_catalog'.");

// Test 3: firebase-api.js linkProductToFacebook default = "rewards_catalog" sin reintentos cruzados
assert.ok(fbApi.includes('export async function linkProductToFacebook(productId, fbListingId, fbUrl = null, collection = "rewards_catalog")'), "linkProductToFacebook debe usar 'rewards_catalog'");
assert.ok(!fbApi.includes('if (collection !== "rewards_catalog") {\n        return await linkProductToFacebook'), "linkProductToFacebook NO debe reintentar en otra colección");
console.log("  ✓ Test 3: linkProductToFacebook blindado a colección activa sin cruces.");

// Test 4: firebase-api.js updateProductPriceFromFacebook y markProductSoldFromFacebook
assert.ok(fbApi.includes('export async function updateProductPriceFromFacebook(productId, newPriceUsd, fbListingId = null, collection = "rewards_catalog")'), "updateProductPriceFromFacebook debe usar 'rewards_catalog'");
assert.ok(fbApi.includes('export async function markProductSoldFromFacebook(productId, collection = "rewards_catalog")'), "markProductSoldFromFacebook debe usar 'rewards_catalog'");
console.log("  ✓ Test 4: Mutaciones de precio y venta dirigidas a 'rewards_catalog'.");

// Test 5: background.js almacena y responde con "rewards_catalog" y "PROD" por defecto
assert.ok(background.includes('request.action === "GET_SYNC_ENV"'), "background.js debe soportar GET_SYNC_ENV");
assert.ok(background.includes('request.action === "SET_SYNC_ENV"'), "background.js debe soportar SET_SYNC_ENV");
assert.ok(background.includes('col = request.collection || stored?.targetCollection || "rewards_catalog"'), "background.js debe resolver 'rewards_catalog' por defecto");
console.log("  ✓ Test 5: Service worker gestiona entorno conmutado y default 'PROD'/'rewards_catalog'.");

// Test 6: content-script.js muestra badge de entorno y sincroniza sin fallback dev
assert.ok(contentScript.includes('id="haibane-env-badge"'), "content-script.js debe incluir badge visual haibane-env-badge");
assert.ok(contentScript.includes('msg.action === "ENV_CHANGED"'), "content-script.js debe responder a evento ENV_CHANGED");
assert.ok(!contentScript.includes('const collections = ["dev_rewards_catalog", "rewards_catalog"'), "content-script.js NO debe contener búsqueda cruzada entre dev y prod");
console.log("  ✓ Test 6: Content script señaliza entorno activo y elimina lecturas cruzadas.");

// Test 7: popup.html y popup.js conmutan entre PROD y DEV
assert.ok(popupHtml.includes('id="btn-env-prod"') && popupHtml.includes('id="btn-env-dev"'), "popup.html debe tener botones de conmutación PROD / DEV");
assert.ok(popupJs.includes('action: "SET_SYNC_ENV", env: "PROD"') && popupJs.includes('action: "SET_SYNC_ENV", env: "DEV"'), "popup.js debe conmutar entornos");
console.log("  ✓ Test 7: Interfaz de popup expone selector de entorno explícito.");

// Test 8: api/sync-facebook.js default = "rewards_catalog"
assert.ok(apiSync.includes('const collection = req.query.collection || "rewards_catalog";'), "api/sync-facebook.js debe usar 'rewards_catalog' por defecto");
console.log("  ✓ Test 8: Endpoint Vercel /api/sync-facebook sincroniza 'rewards_catalog' por defecto.");

// Test 9: env.js en cliente web aísla producción a meltydeays-wired-club.vercel.app
assert.ok(envJs.includes('"meltydeays-wired-club.vercel.app"'), "env.js debe incluir meltydeays-wired-club.vercel.app en PROD_HOSTNAMES");
assert.ok(envJs.includes('return isProduction() ? baseName : `dev_${baseName}`;'), "env.js debe aplicar prefijo dev_ en desarrollo y nada en prod");
console.log("  ✓ Test 9: Web client aísla estrictamente hostname productivo de entornos dev.");

console.log("=================================================");
console.log("TODAS LAS VERIFICACIONES DE AISLAMIENTO: 100% OK");
console.log("=================================================");
