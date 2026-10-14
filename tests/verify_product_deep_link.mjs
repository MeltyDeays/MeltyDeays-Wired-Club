/**
 * tests/verify_product_deep_link.mjs
 * Test Suite: Verificación de Deep-Linking de Productos Compartidos (#product-[id])
 * MeltyDeays The Wired Club
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'assert';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function runSuite() {
  const ctx = new TestContext('Product Deep-Linking & Shared URLs Suite');
  const { doc, win } = setupTestEnvironment('index.html');

  const rewardModelModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/models/RewardModel.js')).href + `?t=${Date.now()}`);
  const { RewardModel } = rewardModelModule;

  const catalogViewModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`);
  const {
    initCustomerCatalogView,
    renderCatalog,
    openProductSpecsModal,
    closeProductSpecsModal,
    extractDeepLinkProductId,
    findProductInCatalog,
    shareProduct
  } = catalogViewModule;

  // 1. Producto Mando Windchaser de prueba
  const testProduct = new RewardModel({
    id: 'fb_1198273641889025',
    facebookListingId: '1198273641889025',
    title: 'Mando Inalámbrico Windchaser RGB',
    description: 'Control ergonómico inalámbrico con vibración dual y luces RGB.\n- Compatible con PC, Android y Nintendo Switch\n- Batería recargable de 600mAh\n- Garantía de 30 días',
    priceUsd: 25.0,
    priceNio: 925,
    rewardType: 'PARTIAL_DISCOUNT',
    stock: 5,
    status: 'ACTIVE',
    maxDiscountPct: 20,
    maxDiscountUsd: 5.0,
    pointsCost: 250,
    imageUrl: 'https://images.test/windchaser-controller.jpg'
  });

  const mockVm = {
    currentUser: {
      uid: 'user-deep-link-1',
      displayName: 'Cliente Invitado',
      wiredPoints: 500
    },
    catalog: [],
    formatDualMoney(usd) {
      const nio = Math.round(Number(usd) * 37.0);
      return `$${Number(usd).toFixed(2)} USD (C$ ${nio} NIO)`;
    }
  };

  initCustomerCatalogView({
    vm: mockVm,
    showToast: () => {},
    openAuthModal: () => {},
    showVoucherModal: () => {},
    formatPrice: (usd) => `$${Number(usd).toFixed(2)} USD`,
    formatDualPrice: (usd) => `$${Number(usd).toFixed(2)} USD`
  });

  // TEST 1: Parsing robusto de extractDeepLinkProductId
  await ctx.test('1. extractDeepLinkProductId extrae el ID desde múltiples formatos de hash y query params', async () => {
    // Hash con prefijo product-
    win.location.hash = '#product-fb_1198273641889025';
    expect(extractDeepLinkProductId()).toBe('fb_1198273641889025');

    // Hash sin fb_
    win.location.hash = '#product-1198273641889025';
    expect(extractDeepLinkProductId()).toBe('1198273641889025');

    // Hash con prefijo corto p-
    win.location.hash = '#p-fb_1198273641889025';
    expect(extractDeepLinkProductId()).toBe('fb_1198273641889025');

    // Hash con ID crudo #fb_...
    win.location.hash = '#fb_1198273641889025';
    expect(extractDeepLinkProductId()).toBe('fb_1198273641889025');

    // Query param ?openReward=...
    win.location.hash = '';
    win.location.search = '?openReward=fb_1198273641889025';
    expect(extractDeepLinkProductId()).toBe('fb_1198273641889025');

    // Query param ?product=...
    win.location.search = '?product=1198273641889025';
    expect(extractDeepLinkProductId()).toBe('1198273641889025');

    // Limpieza
    win.location.search = '';
    win.location.hash = '';
  });

  // TEST 2: Matching polimórfico en findProductInCatalog
  await ctx.test('2. findProductInCatalog localiza productos con/sin prefijo fb_ o por facebookListingId', async () => {
    const catalogList = [testProduct];

    // Búsqueda con 'fb_1198273641889025'
    const match1 = findProductInCatalog('fb_1198273641889025', catalogList);
    expect(Boolean(match1)).toBe(true, 'Debe encontrar por ID exacto con prefijo fb_');
    expect(match1.title).toBe(testProduct.title);

    // Búsqueda con '1198273641889025' (sin prefijo)
    const match2 = findProductInCatalog('1198273641889025', catalogList);
    expect(Boolean(match2)).toBe(true, 'Debe encontrar cotejando con facebookListingId o id normalizado');

    // Búsqueda con '#product-fb_1198273641889025' con hash incluido
    const match3 = findProductInCatalog('#product-fb_1198273641889025', catalogList);
    expect(Boolean(match3)).toBe(true, 'Debe sanitizar el hash si se le pasa directo');

    // Producto huérfano con docId arbitrario pero facebookListingId emparejado
    const orphanProduct = new RewardModel({
      id: 'custom_doc_id_999',
      facebookListingId: '7788990011',
      title: 'Mousepad Gamer Speed'
    });
    const match4 = findProductInCatalog('7788990011', [orphanProduct]);
    expect(Boolean(match4)).toBe(true, 'Debe encontrar por facebookListingId aunque docId sea custom');
    const match5 = findProductInCatalog('fb_7788990011', [orphanProduct]);
    expect(Boolean(match5)).toBe(true, 'Debe encontrar con fb_ sobre facebookListingId');
  });

  // TEST 3: Resolución reactiva cuando el usuario entra con URL compartida antes de cargar Firestore
  await ctx.test('3. Apertura reactiva: si el catálogo aún está vacío, encola pendiente y abre al llegar los datos', async () => {
    win.location.hash = '#product-fb_1198273641889025';
    mockVm.catalog = []; // Catálogo en 0 simulando latencia de red

    // Intentar abrir specs de inmediato como haría la carga inicial de página
    openProductSpecsModal('fb_1198273641889025');

    // El modal aún no debe estar abierto porque no hay datos
    const modal = doc.getElementById('modal-product-specs');
    expect(win._pendingSpecsModalProductId).toBe('fb_1198273641889025', 'Debe registrarse como pendiente');

    // Ahora simular que Firestore responde con el catálogo
    mockVm.catalog = [testProduct];
    renderCatalog([testProduct], mockVm.currentUser);

    // Esperar tick de renderizado reactivo
    await new Promise(r => setTimeout(r, 80));

    expect(modal.style.display).toBe('flex', 'El modal debe haberse abierto automáticamente');
    const body = doc.getElementById('modal-specs-body');
    expect(body.textContent.includes('Mando Inalámbrico Windchaser RGB')).toBe(true, 'Debe renderizar el título del producto');
    expect(win._pendingSpecsModalProductId).toBe(null, 'El pendiente debe haberse limpiado tras abrir');
    expect(win.location.hash).toBe('#product-fb_1198273641889025', 'El hash de URL debe permanecer sincronizado');
  });

  // TEST 4: Cierre del modal y limpieza suave de la URL
  await ctx.test('4. closeProductSpecsModal oculta el modal y limpia el hash de producto de la URL', async () => {
    const modal = doc.getElementById('modal-product-specs');
    expect(modal.style.display).toBe('flex');

    closeProductSpecsModal();

    expect(modal.style.display).toBe('none', 'El modal debe quedar cerrado');
    expect(win.location.hash.includes('product-')).toBe(false, 'El hash #product-... debe haberse removido de la URL');
    expect(win._pendingSpecsModalProductId).toBe(null);
  });

  // TEST 5: Generación de enlace canónico con shareProduct
  await ctx.test('5. shareProduct genera el vínculo con ID canónico', async () => {
    let clipboardUrl = '';
    win.navigator.clipboard = {
      writeText: async (text) => {
        clipboardUrl = text;
      }
    };

    await shareProduct('1198273641889025');
    expect(clipboardUrl.includes('#product-fb_1198273641889025')).toBe(true, 'Debe generar enlace con ID canónico');
  });

  console.log(`\n=================================================`);
  console.log(`TODAS LAS PRUEBAS DE DEEP LINKING PASARON AL 100%`);
  console.log(`=================================================\n`);
}

runSuite().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
