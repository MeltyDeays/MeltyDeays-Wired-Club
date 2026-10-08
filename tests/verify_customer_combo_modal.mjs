/**
 * tests/verify_customer_combo_modal.mjs
 * Verification of Customer Catalog split cards and N+1 interactive acquisition modal
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function runSuite() {
  const ctx = new TestContext('Customer Catalog & Acquisition Modal Combos');
  const { doc, win } = setupTestEnvironment('index.html');

  const rewardModelModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/models/RewardModel.js')).href + `?t=${Date.now()}`);
  const { RewardModel } = rewardModelModule;

  const catalogViewModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'js/views/customer/CustomerCatalogView.js')).href + `?t=${Date.now()}`);
  const {
    initCustomerCatalogView,
    renderCatalog,
    confirmRedeem,
    selectComboRedeemOption,
    updateConfirmCalculation,
    executeRedeem,
    closeRedeemModal
  } = catalogViewModule;

  // Create Mock User
  const mockUser = {
    uid: 'user-c1',
    displayName: 'Wired Explorer',
    wiredPoints: 500,
    deductPoints(p) { this.wiredPoints -= p; }
  };

  const comboReward = new RewardModel({
    id: 'rew-combo-bundle',
    title: 'Setup Gamer Haibane (Teclado + Mouse)',
    description: 'Combo exclusivo Serie 3',
    priceUsd: 65.0,
    rewardType: 'COMBO',
    stock: 1,
    status: 'ACTIVE',
    maxDiscountPct: 20,
    maxDiscountUsd: 13.0,
    pointsCost: 130,
    comboData: {
      items: [
        {
          id: 'item-kb',
          title: 'Teclado Mecánico RGB',
          priceUsd: 45.0,
          residualPriceUsd: 48.0,
          residualMaxDiscountPct: 15,
          imageUrl: 'https://img.test/kb.jpg'
        },
        {
          id: 'item-ms',
          title: 'Mouse Óptico Pro',
          priceUsd: 30.0,
          residualPriceUsd: 32.0,
          residualMaxDiscountPct: 10,
          imageUrl: 'https://img.test/mouse.jpg'
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
          voucherCode: 'CANJE-TEST-1234',
          discountUsd: 10.0,
          cashToPayUsd: 55.0,
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

  await ctx.test('1. renderCatalog renders split image container, badge, and action button for combos', async () => {
    renderCatalog([comboReward], mockUser);
    const container = doc.getElementById('catalog-container');
    expect(Boolean(container)).toBe(true);

    const splitContainer = container.querySelector('.combo-split-container');
    expect(Boolean(splitContainer)).toBe(true, 'Should render .combo-split-container');

    const splitItems = container.querySelectorAll('.combo-split-item');
    expect(splitItems.length).toBe(2, 'Should render 2 split items');

    const badge = container.querySelector('.combo-badge');
    expect(Boolean(badge)).toBe(true, 'Should render .combo-badge');
    expect(badge.textContent.includes('COMBO 2 EN 1')).toBe(true);

    const acquireBtn = container.querySelector('.btn-combo-acquire');
    expect(Boolean(acquireBtn)).toBe(true, 'Should render .btn-combo-acquire');
    expect(acquireBtn.textContent.includes('ADQUIRIR COMBO O POR SEPARADO')).toBe(true);
  });

  await ctx.test('2. confirmRedeem opens modal with N+1 options for combo', async () => {
    confirmRedeem(comboReward.id);

    const modal = doc.getElementById('modal-confirm-redeem');
    expect(modal.style.display).toBe('flex');

    const comboWrap = doc.getElementById('confirm-combo-selector-wrap');
    expect(comboWrap.style.display).toBe('block');

    const comboList = doc.getElementById('confirm-combo-options-list');
    const optionRows = comboList.querySelectorAll('.confirm-combo-option-row');
    expect(optionRows.length).toBe(3, 'Should have 3 options: 1 Full Combo + 2 items');

    const fullOpt = doc.getElementById('combo-opt-full');
    expect(Boolean(fullOpt)).toBe(true);
    expect(fullOpt.classList.contains('active')).toBe(true);

    const titleEl = doc.getElementById('confirm-reward-title');
    expect(titleEl.textContent).toBe(comboReward.title);
  });

  await ctx.test('3. selectComboRedeemOption switches to single item and updates pricing and slider', async () => {
    selectComboRedeemOption('item-kb');

    const optKb = doc.getElementById('combo-opt-item-kb');
    expect(optKb.classList.contains('active')).toBe(true);

    const titleEl = doc.getElementById('confirm-reward-title');
    expect(titleEl.textContent.includes('Teclado Mecánico RGB')).toBe(true);

    const priceEl = doc.getElementById('confirm-type-price');
    expect(priceEl.innerHTML.includes('48.00')).toBe(true, 'Should reflect residual price 48.00');

    const pctEl = doc.getElementById('confirm-type-pct');
    expect(pctEl.textContent.includes('15% OFF')).toBe(true, 'Should reflect residual discount 15%');
  });

  await ctx.test('4. executeRedeem forwards single item selection options to ViewModel', async () => {
    await executeRedeem();

    expect(mockVm.redeemRewardCalls.length).toBe(1);
    const call = mockVm.redeemRewardCalls[0];
    expect(call.rewardId).toBe('rew-combo-bundle');
    expect(call.options.selectionMode).toBe('SINGLE_ITEM');
    expect(call.options.selectedItemId).toBe('item-kb');
  });

  await ctx.test('5. Full Combo selection forwards FULL_COMBO option to ViewModel', async () => {
    mockVm.redeemRewardCalls = [];
    confirmRedeem(comboReward.id);
    selectComboRedeemOption('FULL_COMBO');

    await executeRedeem();

    expect(mockVm.redeemRewardCalls.length).toBe(1);
    const call = mockVm.redeemRewardCalls[0];
    expect(call.options.selectionMode).toBe('FULL_COMBO');
  });

  const summary = ctx.summary();
  console.log(`\nCustomer Combo Modal Tests: ${summary.passed}/${summary.total} passed`);
  if (summary.failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
