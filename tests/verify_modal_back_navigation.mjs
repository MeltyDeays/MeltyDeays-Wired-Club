/**
 * tests/verify_modal_back_navigation.mjs
 * Test Suite: Soporte nativo para botón Atrás y gestos swipe en móviles para modales
 * MeltyDeays The Wired Club
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'assert';
import { setupTestEnvironment, TestContext } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function runSuite() {
  const ctx = new TestContext('Modal Native Back Navigation & Popstate Suite');
  const { doc, win } = setupTestEnvironment('index.html');

  const modalHistoryModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/utils/ModalHistoryManager.js')).href + `?t=${Date.now()}`);
  const {
    pushModalHistory,
    popModalHistory,
    closeTopmostOpenModal,
    isAnyModalOpen,
    initModalHistoryListener
  } = modalHistoryModule;

  const catalogViewModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`);
  const {
    initCustomerCatalogView,
    openProductSpecsModal,
    closeProductSpecsModal,
    confirmRedeem,
    closeRedeemModal
  } = catalogViewModule;

  const rewardModelModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/models/RewardModel.js')).href + `?t=${Date.now()}`);
  const { RewardModel } = rewardModelModule;

  const testProduct = new RewardModel({
    id: 'test-mando-windchaser',
    title: 'Mando Windchaser Plus Hall Effect',
    priceUsd: 25.0,
    priceNio: 925,
    rewardType: 'PARTIAL_DISCOUNT',
    stock: 5,
    status: 'ACTIVE',
    maxDiscountPct: 10,
    maxDiscountUsd: 2.5,
    pointsCost: 125,
    imageUrl: 'https://images.test/mando.jpg'
  });

  const mockVm = {
    currentUser: {
      uid: 'user-test-1',
      displayName: 'Evertz Lopez',
      wiredPoints: 300
    },
    catalog: [testProduct],
    formatDualMoney(usd) {
      return `$${usd} USD`;
    }
  };

  initCustomerCatalogView({
    vm: mockVm,
    formatPrice: (u) => `$${u} USD`,
    formatDualPrice: (u) => `$${u} USD`,
    formatDualPricePlain: (u) => `$${u} USD`,
    formatUsd: (u) => String(u),
    formatNio: (n) => String(n),
    USD_TO_NIO_RATE: 37
  });

  initModalHistoryListener();

  const specsModal = doc.getElementById('modal-product-specs');
  assert.ok(specsModal, 'El elemento modal-product-specs debe existir en el DOM');

  await ctx.test('1. Apertura de modal de producto registra estado e indica isAnyModalOpen() === true', async () => {
    openProductSpecsModal('test-mando-windchaser');
    assert.ok(specsModal.style.display !== 'none' && specsModal.style.display !== '', 'Modal visible');
    assert.strictEqual(isAnyModalOpen(), true, 'isAnyModalOpen() debe ser true');
  });

  await ctx.test('2. Pulsación de botón Atrás (popstate) cierra el modal de producto y retorna al catálogo', async () => {
    const handled = closeTopmostOpenModal();
    assert.strictEqual(handled, true, 'closeTopmostOpenModal() debe retornar true');
    assert.strictEqual(specsModal.style.display, 'none', 'El modal debe quedar cerrado');
    assert.strictEqual(isAnyModalOpen(), false, 'isAnyModalOpen() debe ser false');
  });

  await ctx.test('3. Cuando no hay modales abiertos, closeTopmostOpenModal() retorna false para permitir salir', async () => {
    const handledSecondTime = closeTopmostOpenModal();
    assert.strictEqual(handledSecondTime, false, 'No intercepta si no hay modales');
  });

  await ctx.test('4. Jerarquía multi-nivel (Producto -> Confirmar compra): Atrás escalonado', async () => {
    openProductSpecsModal('test-mando-windchaser');
    const confirmModal = doc.getElementById('modal-confirm-redeem');
    confirmRedeem('test-mando-windchaser');
    assert.ok(confirmModal.style.display !== 'none', 'Modal confirmar compra abierto');

    // Primer atrás: cierra confirmar compra
    const closedFirst = closeTopmostOpenModal();
    assert.strictEqual(closedFirst, true);
    assert.strictEqual(confirmModal.style.display, 'none', 'Modal compra cerrado');
    assert.ok(specsModal.style.display !== 'none', 'Modal producto sigue abierto');

    // Segundo atrás: cierra modal de producto
    const closedSecond = closeTopmostOpenModal();
    assert.strictEqual(closedSecond, true);
    assert.strictEqual(specsModal.style.display, 'none', 'Modal producto cerrado');
    assert.strictEqual(isAnyModalOpen(), false, 'Catálogo principal restaurado');
  });

  ctx.summary();
}

runSuite().catch(err => {
  console.error('[FAIL] Error ejecutando verify_modal_back_navigation:', err);
  process.exit(1);
});
