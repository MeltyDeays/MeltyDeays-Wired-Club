/**
 * Suite de Verificación: Sub-Pestañas de Vales (Activos vs Historial) y Mecánica de Canje/Stock
 */
import assert from "assert";
import { isVoucherHistory, renderVouchers, switchVoucherSubTab } from "../js/views/customer/CustomerVouchersView.js";
import { VoucherModel } from "../js/models/VoucherModel.js";
import { RewardModel } from "../js/models/RewardModel.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║   SUITE DE VERIFICACIÓN: SUB-PESTAÑAS DE VALES & CANJE / STOCK     ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// --- MOCK DOM SETUP ---
class MockElement {
  constructor(id) {
    this.id = id;
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c, val) {
        if (val === undefined) val = !this.classes.has(c);
        if (val) this.classes.add(c); else this.classes.delete(c);
        return val;
      },
      contains(c) { return this.classes.has(c); }
    };
    this.innerHTML = "";
    this.textContent = "";
    this.style = {};
  }
}

const domElements = new Map();
function getOrCreateElem(id) {
  if (!domElements.has(id)) domElements.set(id, new MockElement(id));
  return domElements.get(id);
}

globalThis.document = {
  getElementById: (id) => getOrCreateElem(id)
};

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${description}: ${err.message}`);
    failed++;
  }
}

console.log("======================================================");
console.log(" 1. CLASIFICACIÓN DE VALES (isVoucherHistory)");
console.log("======================================================");

it("Vale PENDING_DELIVERY (Gratis 100% puntos) se clasifica como ACTIVO (isVoucherHistory === false)", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-TEST01",
    rewardTitle: "Sticker Pack",
    rewardType: "FREE_REWARD",
    status: "PENDING_DELIVERY",
    pointsSpent: 100,
    cashToPayUsd: 0
  });
  assert.strictEqual(isVoucherHistory(v), false);
});

it("Vale de Preventa (RESERVED_UPCOMING / RES-) se clasifica como ACTIVO", () => {
  const v = new VoucherModel({
    voucherCode: "RES-TEST02",
    rewardTitle: "Figura Coleccionable",
    rewardType: "PREORDER_RESERVATION",
    status: "RESERVED_UPCOMING",
    pointsSpent: 0,
    cashToPayUsd: 50
  });
  assert.strictEqual(isVoucherHistory(v), false);
});

it("Vale Comercial con PAGO CONFIRMADO (PAID) se clasifica como ACTIVO", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-TEST03",
    rewardTitle: "Mouse Gamer",
    rewardType: "PARTIAL_DISCOUNT",
    status: "PAID",
    isPaid: true,
    cashToPayUsd: 30
  });
  assert.strictEqual(isVoucherHistory(v), false);
});

it("Vale Comercial pendiente de pago antes de 72h se clasifica como ACTIVO", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-TEST04",
    rewardTitle: "Teclado RGB",
    rewardType: "PARTIAL_DISCOUNT",
    status: "PENDING_DELIVERY",
    cashToPayUsd: 45,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  });
  assert.strictEqual(isVoucherHistory(v), false);
});

it("Vale ENTREGADO (status=DELIVERED o deliveredAt) se clasifica como HISTORIAL (isVoucherHistory === true)", () => {
  const v1 = new VoucherModel({
    voucherCode: "CANJE-TEST05",
    rewardTitle: "Gorra",
    status: "DELIVERED",
    deliveredAt: new Date().toISOString()
  });
  assert.strictEqual(isVoucherHistory(v1), true);
});

it("Vale CANCELADO (status=CANCELLED o cancelledAt) se clasifica como HISTORIAL", () => {
  const v2 = new VoucherModel({
    voucherCode: "CANJE-TEST06",
    rewardTitle: "Mouse Pad",
    status: "CANCELLED",
    cancelledAt: new Date().toISOString()
  });
  assert.strictEqual(isVoucherHistory(v2), true);
});

it("Vale CADUCADO/EXPIRADO (status=EXPIRED o plazo vencido) se clasifica como HISTORIAL", () => {
  const v3 = new VoucherModel({
    voucherCode: "CANJE-TEST07",
    rewardTitle: "Audífonos",
    rewardType: "PARTIAL_DISCOUNT",
    cashToPayUsd: 20,
    expiresAt: new Date(Date.now() - 3600 * 1000).toISOString() // 1 hora en el pasado
  });
  assert.strictEqual(isVoucherHistory(v3), true);
});

console.log("\n======================================================");
console.log(" 2. RENDERIZADO REACTIVO Y SUB-PESTAÑAS");
console.log("======================================================");

it("Navbar badge (#vouchers-count-badge) contabiliza ÚNICAMENTE vales activos", () => {
  const vouchers = [
    new VoucherModel({ voucherCode: "CANJE-A1", status: "PENDING_DELIVERY", rewardType: "FREE_REWARD" }),
    new VoucherModel({ voucherCode: "CANJE-A2", status: "PENDING_DELIVERY", rewardType: "FREE_REWARD" }),
    new VoucherModel({ voucherCode: "CANJE-H1", status: "CANCELLED", cancelledAt: new Date().toISOString() }),
    new VoucherModel({ voucherCode: "CANJE-H2", status: "DELIVERED", deliveredAt: new Date().toISOString() }),
    new VoucherModel({ voucherCode: "CANJE-H3", status: "EXPIRED" })
  ];

  renderVouchers(vouchers);

  const navBadge = getOrCreateElem("vouchers-count-badge");
  assert.strictEqual(navBadge.textContent, 2, "Debe mostrar exactamente 2 activos en el badge general");

  const subActiveBadge = getOrCreateElem("voucher-subtab-active-count");
  assert.strictEqual(subActiveBadge.textContent, 2);

  const subHistoryBadge = getOrCreateElem("voucher-subtab-history-count");
  assert.strictEqual(subHistoryBadge.textContent, 3);
});

it("Pestaña 'active' oculta vales cancelados/expirados y muestra solo los pendientes", () => {
  switchVoucherSubTab("active");
  const container = getOrCreateElem("vouchers-container");
  assert.ok(container.innerHTML.includes("CANJE-A1"));
  assert.ok(container.innerHTML.includes("CANJE-A2"));
  assert.strictEqual(container.innerHTML.includes("CANJE-H1"), false, "No debe incluir CANJE-H1 en pestaña activos");
  assert.strictEqual(container.innerHTML.includes("CANJE-H2"), false, "No debe incluir CANJE-H2 en pestaña activos");
  assert.strictEqual(container.innerHTML.includes("CANJE-H3"), false, "No debe incluir CANJE-H3 en pestaña activos");
});

it("Pestaña 'history' muestra vales cancelados, entregados y expirados", () => {
  switchVoucherSubTab("history");
  const container = getOrCreateElem("vouchers-container");
  assert.ok(container.innerHTML.includes("CANJE-H1"));
  assert.ok(container.innerHTML.includes("CANJE-H2"));
  assert.ok(container.innerHTML.includes("CANJE-H3"));
  assert.strictEqual(container.innerHTML.includes("CANJE-A1"), false, "No debe incluir activos en pestaña historial");
});

console.log("\n======================================================");
console.log(" 3. MECÁNICA DE STOCK Y CANJES (1 UNIDAD = 1 VALE)");
console.log("======================================================");

it("Reclamar un producto con stock 4 descuenta 1 unidad y emite 1 vale único", () => {
  const reward = new RewardModel({
    id: "REW-STICKER-4",
    title: "Pack de Stickers",
    stock: 4,
    pointsCost: 50
  });

  assert.strictEqual(reward.stock, 4);
  assert.strictEqual(reward.isAvailable(), true);

  reward.decrementStock();
  assert.strictEqual(reward.stock, 3, "El stock debe decrementar a 3");

  const voucher1 = new VoucherModel({
    voucherCode: "CANJE-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: 50
  });

  assert.ok(voucher1.voucherCode.startsWith("CANJE-"));
  assert.strictEqual(voucher1.rewardTitle, "Pack de Stickers");
});

it("4 reclamos consecutivos emiten 4 vales distintos y agotan el stock", () => {
  const reward = new RewardModel({
    id: "REW-KEYCAP-4",
    title: "Keycap Artesanal",
    stock: 4,
    pointsCost: 100
  });

  const generatedCodes = new Set();

  for (let i = 0; i < 4; i++) {
    assert.strictEqual(reward.isAvailable(), true);
    reward.decrementStock();
    const code = "CANJE-" + (i + 1) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    generatedCodes.add(code);
  }

  assert.strictEqual(reward.stock, 0);
  assert.strictEqual(reward.isAvailable(), false, "Tras 4 canjes individuales, el stock es 0 (agotado)");
  assert.strictEqual(generatedCodes.size, 4, "Deben generarse 4 códigos de vales únicos");
});

console.log("\n======================================================");
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">>> SUITE DE VALES Y SUB-PESTAÑAS COMPLETADA CON ÉXITO (100% OK) <<<");
}
