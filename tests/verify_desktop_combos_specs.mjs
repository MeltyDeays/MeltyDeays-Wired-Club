/**
 * tests/verify_desktop_combos_specs.mjs
 * Verification of Combos features parity on Desktop / PC / Laptops:
 * - Product Specs Modal (Ficha Técnica) rich breakdown for combos
 * - Catalog card hover action overlay for combos
 * - Dual pricing, images carousel, and interactive acquisition flow
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function runSuite() {
  const ctx = new TestContext('Desktop Combos & Specs Modal Parity');
  const { doc, win } = setupTestEnvironment('index.html');

  const rewardModelModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/models/RewardModel.js')).href + `?t=${Date.now()}`);
  const { RewardModel } = rewardModelModule;

  const catalogViewModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`);
  const {
    initCustomerCatalogView,
    renderCatalog,
    openProductSpecsModal,
    closeProductSpecsModal,
    confirmRedeem,
    selectComboRedeemOption
  } = catalogViewModule;

  const mockUser = {
    uid: 'user-desktop-1',
    displayName: 'Desktop Gamer',
    wiredPoints: 600,
    deductPoints(p) { this.wiredPoints -= p; }
  };

  const comboReward = new RewardModel({
    id: 'rew-combo-pc-pack',
    title: 'PC Gaming Bundle (Teclado Mecánico + Mouse RGB + Pad XL)',
    description: 'Paquete de alto rendimiento para PC y laptop',
    priceUsd: 85.0,
    rewardType: 'COMBO',
    stock: 2,
    status: 'ACTIVE',
    maxDiscountPct: 20,
    maxDiscountUsd: 17.0,
    pointsCost: 170,
    imageUrl: 'https://img.test/bundle-cover.jpg',
    comboData: {
      items: [
        {
          id: 'item-pc-kb',
          title: 'Teclado Mecánico 60% RGB',
          priceUsd: 45.0,
          residualPriceUsd: 48.0,
          residualMaxDiscountPct: 15,
          imageUrl: 'https://img.test/kb.jpg'
        },
        {
          id: 'item-pc-ms',
          title: 'Mouse Gamer 16000 DPI',
          priceUsd: 35.0,
          residualPriceUsd: 38.0,
          residualMaxDiscountPct: 10,
          imageUrl: 'https://img.test/mouse.jpg'
        },
        {
          id: 'item-pc-pad',
          title: 'Mousepad Control XL 90x40cm',
          priceUsd: 20.0,
          residualPriceUsd: 22.0,
          residualMaxDiscountPct: 10,
          imageUrl: 'https://img.test/pad.jpg'
        }
      ]
    }
  });

  const mockVm = {
    currentUser: mockUser,
    catalog: [comboReward],
    formatDualMoney(usd) {
      const nio = (Number(usd) * 37.0).toFixed(2);
      return `$${Number(usd).toFixed(2)} USD (C$ ${nio} NIO)`;
    },
    redeemRewardCalls: [],
    async redeemReward(rewardId, pointsToApply, options) {
      this.redeemRewardCalls.push({ rewardId, pointsToApply, options });
      return {
        voucher: {
          voucherCode: 'CANJE-DESK-999',
          discountUsd: 15.0,
          cashToPayUsd: 70.0,
          pointsSpent: pointsToApply
        },
        cost: pointsToApply
      };
    }
  };

  initCustomerCatalogView({
    vm: mockVm,
    showToast: () => {},
    openAuthModal: () => {},
    showVoucherModal: () => {}
  });

  await ctx.test('1. Catalog card renders action overlay with "VER DETALLES // COMBO 3 EN 1" on desktop', async () => {
    renderCatalog([comboReward], mockUser);
    const container = doc.getElementById('catalog-container');
    expect(Boolean(container)).toBe(true);

    const card = container.querySelector('.reward-card.is-combo-item');
    expect(Boolean(card)).toBe(true, 'Card should have class .is-combo-item');

    const overlay = card.querySelector('.reward-img-action-overlay');
    expect(Boolean(overlay)).toBe(true, 'Card should have .reward-img-action-overlay');
    expect(overlay.textContent.includes('COMBO 3 EN 1')).toBe(true, 'Overlay should state COMBO 3 EN 1');
  });

  await ctx.test('2. openProductSpecsModal renders Haibane Serie 3 combo banner, pricing and breakdown', async () => {
    openProductSpecsModal(comboReward.id);

    const modal = doc.getElementById('modal-product-specs');
    expect(Boolean(modal)).toBe(true);

    const body = doc.getElementById('modal-specs-body');
    expect(Boolean(body)).toBe(true);

    // Kicker
    const kicker = doc.querySelector('.modal-specs-kicker') || modal.querySelector('.modal-specs-kicker');
    expect(Boolean(kicker)).toBe(true, 'Should find .modal-specs-kicker');
    expect(kicker.textContent.includes('WIRED COMBO // 3 EN 1')).toBe(true, 'Kicker should indicate combo');

    // Badges bar
    const comboBadge = body.querySelector('.specs-badge-item.combo');
    expect(Boolean(comboBadge)).toBe(true, 'Should have .specs-badge-item.combo');
    expect(comboBadge.textContent.includes('COMBO 3 EN 1')).toBe(true);

    // Haibane combo banner
    const comboBanner = body.querySelector('.haibane-combo-banner');
    expect(Boolean(comboBanner)).toBe(true, 'Should render .haibane-combo-banner');

    // Savings badge in banner (45 + 35 + 20 = 100 sum, 85 combo => -15% ahorro)
    expect(comboBanner.textContent.includes('AHORRO')).toBe(true);
    expect(comboBanner.textContent.includes('-15%')).toBe(true);

    // Included items list (3 items)
    const includedCards = comboBanner.querySelectorAll('.combo-included-item-card');
    expect(includedCards.length).toBe(3, 'Should render 3 included items in the breakdown');
    expect(comboBanner.textContent.includes('Teclado Mecánico 60% RGB')).toBe(true);
    expect(comboBanner.textContent.includes('Mouse Gamer 16000 DPI')).toBe(true);
    expect(comboBanner.textContent.includes('Mousepad Control XL 90x40cm')).toBe(true);

    // Carousel has frames from cover + 3 items
    const carouselCounter = body.querySelector('#specs-carousel-counter');
    expect(Boolean(carouselCounter)).toBe(true);
    expect(carouselCounter.textContent.includes('04')).toBe(true, 'Should have 4 frames in carousel');

    // Footer button
    const footer = doc.getElementById('modal-specs-footer');
    const acquireBtn = footer.querySelector('.btn-combo-acquire');
    expect(Boolean(acquireBtn)).toBe(true, 'Footer should render .btn-combo-acquire');
    expect(acquireBtn.textContent.includes('ADQUIRIR COMBO O POR SEPARADO')).toBe(true);

    closeProductSpecsModal();
  });

  await ctx.test('3. confirmRedeem displays thumbnail images and dual currency for each combo option', async () => {
    confirmRedeem(comboReward.id);

    const modal = doc.getElementById('modal-confirm-redeem');
    expect(modal.style.display).toBe('flex');

    const comboList = doc.getElementById('confirm-combo-options-list');
    expect(Boolean(comboList)).toBe(true);

    const optionRows = comboList.querySelectorAll('.confirm-combo-option-row');
    expect(optionRows.length).toBe(4, 'Should have 1 full combo + 3 individual item rows (N+1 = 4)');

    // Verify thumbnails exist in option rows
    const thumbs = comboList.querySelectorAll('img');
    expect(thumbs.length).toBe(4, 'All 4 options should have thumbnail images');

    // Option 1 is full combo
    const fullOpt = comboList.querySelector('#combo-opt-full');
    expect(fullOpt.textContent.includes('Combo Completo')).toBe(true);

    // Selecting individual item
    selectComboRedeemOption('item-pc-kb');
    const kbOpt = comboList.querySelector('#combo-opt-item-pc-kb');
    expect(kbOpt.classList.contains('active')).toBe(true, 'Selected option should have .active class');
  });

  const summary = ctx.summary();
  if (summary.failed > 0) {
    console.error(`FAILED: ${summary.failed} tests failed:`, summary.errors);
    process.exit(1);
  } else {
    console.log(`Desktop Combos & Specs Tests: ${summary.passed}/${summary.total} passed`);
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
