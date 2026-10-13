import assert from "node:assert/strict";

console.log("🧪 Iniciando verificación del motor de Grupos y Auto-Relist Semanal...");

// 1. Validar formateador de Copy con IA (formatAiMarketplaceCopy)
function formatAiMarketplaceCopy(product) {
  const raw = product.description || product.rawDescription || "";
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.toLowerCase().includes("precio") && !l.includes("$") && !l.toLowerCase().includes("c$"));

  const featureBullets = lines.length > 0
    ? lines.map(l => l.startsWith("•") ? l : `• 🚀 ${l}`).join("\n")
    : `• 🕹️ Condición: Artículo original verificado y garantizado físicamente\n• ⚡ Rendimiento: Alto desempeño y compatibilidad garantizada\n• 📦 Entrega: Disponible para retiro o entrega inmediata`;

  const cleanHeaderTitle = (product.title || "").replace(/(\$|c\$|\busd\b)\s*\d+/gi, "").trim();

  return `✨ ${cleanHeaderTitle}

⚡ CARACTERÍSTICAS PRINCIPALES:
${featureBullets}

🛡️ GARANTÍA & RESPALDO:
• Cobertura y garantía oficial MeltyDeays con revisión técnica presencial en tienda física.

🎁 THE WIRED CLUB (OFERTAS EXCLUSIVAS EN NUESTRA WEB):
• Visita nuestra página web oficial para explorar promociones y ofertas especiales de socios.
• 💎 Bono de Bienvenida: Recibe $5 USD en puntos (250 WP) al registrarte por primera vez desde tu dispositivo, canjeables por descuentos en artículos seleccionados de nuestro catálogo.

📲 PEDIDOS Y ATENCIÓN DIRECTA:
• WhatsApp / Teléfono: 5843-8412`;
}

const mockProduct = {
  id: "prod-123",
  title: "Gundam RG 1/144 Hi-Nu $45",
  priceUsd: 45,
  priceNio: 1665,
  description: "Precio: $45 USD\nArticulación premium con armadura multicapa\nCalcomanías al agua de alta precisión\nC$ 1665 córdobas en caja sellada"
};

const cleanTitle = (mockProduct.title || "").replace(/(\$|c\$|\busd\b)\s*\d+/gi, "").trim();
const copyResult = formatAiMarketplaceCopy(mockProduct);

// Verificaciones de Copy
assert.strictEqual(cleanTitle, "Gundam RG 1/144 Hi-Nu", "El título debe eliminar menciones de precios");
assert.ok(!copyResult.includes("Precio:"), "La descripción no debe incluir el encabezado de precio");
assert.ok(!copyResult.includes("$45"), "La descripción no debe incluir el precio del producto");
assert.ok(!copyResult.includes("C$ 1665"), "La descripción no debe incluir el precio en córdobas");
assert.ok(copyResult.includes("MeltyDeays"), "Debe mencionar la garantía oficial MeltyDeays");
assert.ok(copyResult.includes("250 WP"), "Debe mencionar el bono de 250 WP");
assert.ok(copyResult.includes("$5 USD en puntos"), "Debe mencionar $5 USD en puntos de bienvenida");
assert.ok(copyResult.includes("5843-8412"), "Debe incluir el teléfono/WhatsApp de contacto 5843-8412");
console.log("✓ Test 1: Generador de Copy y Ficha Comercial validado al 100%");

// 2. Validar Lógica de Priorización de Grupos Favoritos
function selectGroupsToShare(availableGroups, savedFavorites = [], maxCount = 12) {
  const selected = [];
  
  if (savedFavorites.length > 0) {
    for (const fav of savedFavorites) {
      if (availableGroups.includes(fav) && !selected.includes(fav)) {
        selected.push(fav);
        if (selected.length >= maxCount) break;
      }
    }
  }

  if (selected.length < maxCount) {
    for (const grp of availableGroups) {
      if (!selected.includes(grp)) {
        selected.push(grp);
        if (selected.length >= maxCount) break;
      }
    }
  }

  return selected.slice(0, 20); // Cap máximo de Facebook
}

const userAvailableGroups = [
  "Anime Managua Ventas",
  "Gamers Nicaragua Compra Venta",
  "Figuras de Colección Nic",
  "Mercado Libre Managua",
  "Otakus y Geeks Nicaragua",
  "Tecnología y Gadgets Managua",
  "Venta de Celulares y Accesorios",
  "Bazar Friki Nicaragua",
  "Gundam y Mecha Coleccionistas",
  "Compras y Ventas Metrocentro",
  "Videojuegos Usados Managua",
  "Marketplace Chinandega Express",
  "Subastas Managua Todo Barato",
  "Geek Store Nicaragua"
];

const saved12Favorites = [
  "Gundam y Mecha Coleccionistas",
  "Bazar Friki Nicaragua",
  "Otakus y Geeks Nicaragua",
  "Anime Managua Ventas",
  "Figuras de Colección Nic"
];

const selectedGroups = selectGroupsToShare(userAvailableGroups, saved12Favorites, 5);
assert.deepStrictEqual(selectedGroups, saved12Favorites, "Debe seleccionar prioritariamente los favoritos guardados");

const default12 = selectGroupsToShare(userAvailableGroups, [], 12);
assert.strictEqual(default12.length, 12, "Debe tomar 12 grupos por defecto si no hay favoritos fijos");
console.log("✓ Test 2: Motor de selección de 12 grupos favoritos validado al 100%");

// 3. Validar Auditoría de Auto-Relist Semanal (> 7 días)
function detectExpiredListings(products, maxDays = 7, now = Date.now()) {
  const thresholdMs = maxDays * 24 * 60 * 60 * 1000;
  return products.filter(p => {
    if (!p.facebookListingId || p.status !== "ACTIVE") return false;
    const pubDate = new Date(p.lastRelistedAt || p.createdAt || 0).getTime();
    return (now - pubDate) >= thresholdMs;
  });
}

const mockNow = new Date("2026-10-13T12:00:00Z").getTime();
const dayMs = 24 * 60 * 60 * 1000;

const mockCatalog = [
  {
    id: "item-1",
    title: "Gundam PG Exia",
    status: "ACTIVE",
    facebookListingId: "fb-1001",
    lastRelistedAt: new Date(mockNow - 8 * dayMs).toISOString() // 8 días: CADUCADO
  },
  {
    id: "item-2",
    title: "Figura Asuka Langley",
    status: "ACTIVE",
    facebookListingId: "fb-1002",
    lastRelistedAt: new Date(mockNow - 3 * dayMs).toISOString() // 3 días: VIGENTE
  },
  {
    id: "item-3",
    title: "Lain Iwakura Nendoroid",
    status: "SOLD", // Vendido: IGNORAR
    facebookListingId: "fb-1003",
    lastRelistedAt: new Date(mockNow - 15 * dayMs).toISOString()
  },
  {
    id: "item-4",
    title: "Mousepad Cyberpunk",
    status: "ACTIVE",
    facebookListingId: null, // Huérfano en web: IGNORAR de relist
    lastRelistedAt: new Date(mockNow - 10 * dayMs).toISOString()
  }
];

const expired = detectExpiredListings(mockCatalog, 7, mockNow);
assert.strictEqual(expired.length, 1, "Solo debe haber 1 producto caducado para relist");
assert.strictEqual(expired[0].id, "item-1", "El item caducado debe ser item-1 (> 7 días)");
console.log("✓ Test 3: Filtro de caducidad semanal (> 7d) para Auto-Relist validado al 100%");

console.log("🎉 TODOS LOS TESTS DE GRUPOS Y AUTO-RELIST HAN PASADO EXITOSAMENTE.");
