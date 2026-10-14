/**
 * Test de Verificación: Filtrado y Métricas de Vales en Panel Admin
 * Asegura que los vales cancelados o expirados no sumen a "VALES PENDIENTES"
 * y no aparezcan bajo el filtro "PENDIENTES" en la tabla de canjes.
 */
import assert from "assert";
import { VoucherModel } from "../js/models/VoucherModel.js";
import { renderVouchersTable, filterVouchersTable } from "../js/views/AdminVouchersView.js";

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║     TEST: FILTRADO Y MÉTRICAS DE ESTADO DE VALES (ADMIN)           ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

// --- MOCK DOM SETUP ---
class MockElement {
  constructor(id) {
    this.id = id;
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
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

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// 1. Pruebas de VoucherModel.isPending()
test("VoucherModel.isPending() retorna true para un vale nuevo pendiente", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-0001",
    status: "PENDING_DELIVERY",
    pointsSpent: 100
  });
  assert.strictEqual(v.isPending(), true);
  assert.strictEqual(v.isDelivered(), false);
  assert.strictEqual(v.isCancelled(), false);
  assert.strictEqual(v.isExpired(), false);
});

test("VoucherModel.isPending() retorna false para un vale CANCELLED", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-2686",
    status: "CANCELLED",
    cancelledAt: "2026-10-14T00:00:00.000Z",
    pointsSpent: 350
  });
  assert.strictEqual(v.isCancelled(), true);
  assert.strictEqual(v.isPending(), false);
});

test("VoucherModel.isPending() retorna false para un vale DELIVERED", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-0002",
    status: "DELIVERED",
    deliveredAt: "2026-10-14T01:00:00.000Z"
  });
  assert.strictEqual(v.isDelivered(), true);
  assert.strictEqual(v.isPending(), false);
});

test("VoucherModel.isPending() retorna false para un vale EXPIRED", () => {
  const v = new VoucherModel({
    voucherCode: "CANJE-0003",
    status: "EXPIRED"
  });
  assert.strictEqual(v.isExpired(), true);
  assert.strictEqual(v.isPending(), false);
});

// 2. Pruebas de Cómputo de Métrica "VALES PENDIENTES"
test("Cálculo de pendingVouchers excluye cancelados, entregados y expirados", () => {
  const isPendingVoucher = (v) => {
    if (typeof v.isPending === "function") return v.isPending();
    const delivered = typeof v.isDelivered === "function" ? v.isDelivered() : (v.status === "DELIVERED" || Boolean(v.deliveredAt));
    const cancelled = typeof v.isCancelled === "function" ? v.isCancelled() : (v.status === "CANCELLED" || Boolean(v.cancelledAt));
    const expired = typeof v.isExpired === "function" ? v.isExpired() : (v.status === "EXPIRED");
    return !delivered && !cancelled && !expired;
  };

  const vouchers = [
    new VoucherModel({ voucherCode: "CANJE-1", status: "PENDING_DELIVERY" }),
    new VoucherModel({ voucherCode: "CANJE-2", status: "CANCELLED", cancelledAt: "2026-10-14" }), // CANJE-2686 caso usuario
    new VoucherModel({ voucherCode: "CANJE-3", status: "DELIVERED", deliveredAt: "2026-10-14" }),
    new VoucherModel({ voucherCode: "CANJE-4", status: "EXPIRED" }),
    new VoucherModel({ voucherCode: "RES-5", status: "RESERVED_UPCOMING", rewardType: "PREORDER_RESERVATION" })
  ];

  const pendingCount = vouchers.filter(isPendingVoucher).length;
  // Solo CANJE-1 y RES-5 están pendientes de entrega. CANJE-2, 3, 4 NO deben contarse.
  assert.strictEqual(pendingCount, 2, `Se esperaban 2 vales pendientes, pero se contaron ${pendingCount}`);
});

// 3. Pruebas de Renderizado y Filtrado en AdminVouchersView
test("Filtro PENDING en AdminVouchersView NO incluye vales cancelados", () => {
  const vPending = new VoucherModel({ voucherCode: "CANJE-101", status: "PENDING_DELIVERY" });
  const vCancelled = new VoucherModel({ voucherCode: "CANJE-2686", status: "CANCELLED", cancelledAt: "2026-10-14" });
  const vDelivered = new VoucherModel({ voucherCode: "CANJE-103", status: "DELIVERED", deliveredAt: "2026-10-14" });

  const vouchers = [vPending, vCancelled, vDelivered];

  // Filtro PENDING
  filterVouchersTable("PENDING");
  renderVouchersTable(vouchers);
  const tbody = getOrCreateElem("vouchers-table-body");
  
  assert.ok(tbody.innerHTML.includes("CANJE-101"), "Debe incluir el vale pendiente");
  assert.ok(!tbody.innerHTML.includes("CANJE-2686"), "NO debe incluir el vale cancelado");
  assert.ok(!tbody.innerHTML.includes("CANJE-103"), "NO debe incluir el vale despachado");

  // Filtro CANCELLED
  filterVouchersTable("CANCELLED");
  renderVouchersTable(vouchers);
  assert.ok(tbody.innerHTML.includes("CANJE-2686"), "Filtro CANCELLED debe incluir el cancelado");
  assert.ok(!tbody.innerHTML.includes("CANJE-101"), "Filtro CANCELLED no debe incluir el pendiente");

  // Filtro ALL
  filterVouchersTable("ALL");
  renderVouchersTable(vouchers);
  assert.ok(tbody.innerHTML.includes("CANJE-101"), "Filtro ALL debe incluir pendiente");
  assert.ok(tbody.innerHTML.includes("CANJE-2686"), "Filtro ALL debe incluir cancelado");
  assert.ok(tbody.innerHTML.includes("CANJE-103"), "Filtro ALL debe incluir despachado");
});

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) process.exit(1);
