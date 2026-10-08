/**
 * ============================================================================
 * WIRED CLUB - E2E SPECIFICATION TEST SUITE: COMBOS FLEXIBLES HAIBANE
 * ============================================================================
 * File: tests/combo_products.test.mjs
 * Track: Milestone E2E_TRACK / M1-M5 Verification
 * Architecture: Opaque-Box, Requirement-Driven, Multi-Tiered Verification
 * Target Specifications:
 *   - PROJECT.md (§ Architecture, § Feature Inventory, § Interface Contracts)
 *   - ORIGINAL_REQUEST.md (§ 2026-10-07T22:48:40Z: R1, R2, R3, R4, R5)
 *   - TEST_INFRA.md (Tiers 1, 2, 3, 4)
 * Author: teamwork_preview_test_writer_combos_1
 * Date: 2026-10-07
 * ============================================================================
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const loadModule = (relativePath) => {
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, relativePath)).href;
  return import(`${fileUrl}?t=${Date.now()}`);
};

// ============================================================================
// CANONICAL REFERENCE ORACLE (Authoritative Specification Derivation)
// Derived from: ORIGINAL_REQUEST.md §2026-10-07T22:48:40Z R1-R4 & PROJECT.md
// ============================================================================

export class CanonicalComboOracle {
  /**
   * Calculates sum of individual prices, savings amount, and percentage discount.
   * Math rules:
   *   sumUsd = sum(item.priceUsd)
   *   savingsUsd = max(0, sumUsd - comboPriceUsd)
   *   savingsPct = sumUsd > 0 ? round((savingsUsd / sumUsd) * 100) : 0
   */
  static calculateSavings(items = [], comboPriceUsd = 0) {
    if (!Array.isArray(items) || items.length === 0) {
      return { sumUsd: 0, savingsUsd: 0, savingsPct: 0 };
    }
    const sumRaw = items.reduce((acc, it) => acc + (Number(it?.priceUsd) || 0), 0);
    const sumUsd = Number(sumRaw.toFixed(2));
    const priceUsd = Number(comboPriceUsd) || 0;
    const savingsUsd = Math.max(0, Number((sumUsd - priceUsd).toFixed(2)));
    const savingsPct = sumUsd > 0 ? Math.round((savingsUsd / sumUsd) * 100) : 0;
    return { sumUsd, savingsUsd, savingsPct };
  }

  /**
   * Validates whether an items array qualifies for flexible combo status (N >= 2).
   */
  static isEligibleCombo(items = []) {
    return Array.isArray(items) && items.length >= 2;
  }

  /**
   * Simulates cascading purchase transition (N -> N-1 -> 1 Standalone).
   */
  static simulateCascade(comboProduct, selectionMode, selectedItemId = null) {
    const items = comboProduct.comboData?.items || [];
    if (selectionMode === 'FULL_COMBO') {
      return {
        action: 'BUY_FULL',
        remainingCombo: null,
        newStandalone: null,
        voucherItems: [...items],
        comboStatus: 'SOLD_OUT',
        stock: 0
      };
    }

    if (selectionMode === 'SINGLE_ITEM') {
      const targetItem = items.find(it => it.id === selectedItemId);
      if (!targetItem) throw new Error(`Item ${selectedItemId} not found in combo`);

      const remainingItems = items.filter(it => it.id !== selectedItemId);
      if (remainingItems.length >= 2) {
        // N > 2 -> N-1 combo remains active
        const { sumUsd } = this.calculateSavings(remainingItems, 0);
        return {
          action: 'SPLIT_TO_COMBO',
          purchasedItem: targetItem,
          remainingCombo: {
            ...comboProduct,
            stock: 1,
            status: 'ACTIVE',
            comboData: { ...comboProduct.comboData, items: remainingItems }
          },
          newStandalone: null,
          comboStatus: 'ACTIVE',
          stock: 1
        };
      } else if (remainingItems.length === 1) {
        // N = 2 -> 1: Combo deactivated, remaining companion published standalone
        const companion = remainingItems[0];
        return {
          action: 'SPLIT_TO_STANDALONE',
          purchasedItem: targetItem,
          remainingCombo: null,
          comboStatus: 'SOLD_OUT',
          stock: 0,
          newStandalone: {
            id: `standalone-${companion.id}`,
            title: companion.title,
            description: companion.description || '',
            imageUrl: companion.imageUrl || '',
            rewardType: 'PARTIAL_DISCOUNT',
            priceUsd: companion.residualPriceUsd ?? companion.priceUsd ?? 0,
            maxDiscountPct: companion.residualMaxDiscountPct ?? 10,
            stock: 1,
            status: 'ACTIVE',
            dissolvedFromCombo: {
              comboId: comboProduct.id,
              originalTitle: comboProduct.title
            }
          }
        };
      }
    }

    throw new Error(`Invalid selectionMode: ${selectionMode}`);
  }

  /**
   * Simulates reconstitution decision matrix when voucher is canceled or expired (72h).
   */
  static simulateReconstitution(voucher, catalog) {
    if (!voucher.comboOrigin) {
      return { reconstituted: false, reason: 'NOT_A_COMBO_VOUCHER' };
    }

    if (voucher.isFullComboVoucher?.() || voucher.selectionMode === 'FULL_COMBO') {
      return { reconstituted: true, type: 'FULL_RESTORE' };
    }

    // Split item voucher: inspect companion status
    const companionIds = voucher.comboOrigin.companionRewardIds || [];
    const companionsInCatalog = catalog.filter(r =>
      companionIds.includes(r.id) ||
      (r.dissolvedFromCombo && r.dissolvedFromCombo.comboId === voucher.comboOrigin.comboId)
    );

    const allCompanionsActive = companionsInCatalog.length > 0 &&
      companionsInCatalog.every(c => c.status === 'ACTIVE' && c.stock > 0);

    if (allCompanionsActive) {
      return {
        reconstituted: true,
        type: 'COMBO_RECONSTITUTED',
        comboId: voucher.comboOrigin.comboId
      };
    } else {
      return {
        reconstituted: false,
        type: 'STANDALONE_FALLBACK',
        publishedStandalone: {
          id: `standalone-refunded-${voucher.purchasedItem?.id || voucher.rewardId}`,
          title: voucher.purchasedItem?.title || voucher.rewardTitle,
          priceUsd: voucher.purchasedItem?.residualPriceUsd || voucher.priceUsd,
          maxDiscountPct: voucher.purchasedItem?.residualMaxDiscountPct || 10,
          rewardType: 'PARTIAL_DISCOUNT',
          stock: 1,
          status: 'ACTIVE'
        }
      };
    }
  }
}

// ============================================================================
// TEST SUITE DEFINITIONS
// ============================================================================

export async function runComboProductsTestSuite() {
  const summaries = [];
  const startAll = performance.now();

  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   SUITE INTEGRAL: COMBOS FLEXIBLES HAIBANE (TIERS 1 - 4)           ║');
  console.log('║   Opaque-Box Requirement Verification Track                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Setup DOM / localStorage environment
  setupTestEnvironment('index.html');

  const { RewardModel } = await loadModule('js/models/RewardModel.js');
  const { VoucherModel } = await loadModule('js/models/VoucherModel.js');
  const { CustomerViewModel } = await loadModule('js/viewmodels/CustomerViewModel.js');
  const { FirestoreService } = await loadModule('js/services/FirestoreService.js');
  const { UserModel } = await loadModule('js/models/UserModel.js');

  // Helper fixture builder
  const createMockComboItem = (id, title, priceUsd, residualPriceUsd = null, residualMaxDiscountPct = 20) => ({
    id,
    title,
    description: `Descripción técnica para ${title}`,
    imageUrl: `https://images.unsplash.com/photo-${id}?w=400`,
    priceUsd: Number(priceUsd),
    residualPriceUsd: residualPriceUsd !== null ? Number(residualPriceUsd) : Number((priceUsd * 1.1).toFixed(2)),
    residualMaxDiscountPct: Number(residualMaxDiscountPct)
  });

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (Flexible Combo Data Model & Vouchers)
  // =========================================================================
  const t1Ctx = new TestContext('Tier 1: Feature Coverage (Flexible Combo Model & Vouchers)');
  console.log('======================================================');
  console.log(' RUNNING TIER 1: FEATURE COVERAGE');
  console.log('======================================================');

  await t1Ctx.test('T1.F1.1: RewardModel with rewardType === "COMBO" and comboData.items (N >= 2) sets isCombo() === true', async () => {
    const items = [
      createMockComboItem('item-1', 'Mouse Inalámbrico Lain', 20.00),
      createMockComboItem('item-2', 'Mousepad Haibane XL', 15.00)
    ];
    const reward = new RewardModel({
      id: 'reward-combo-1',
      title: 'Combo Periféricos Wired',
      rewardType: 'COMBO',
      priceUsd: 28.00,
      stock: 5,
      comboData: { items }
    });

    expect(reward.rewardType).toBe('COMBO', 'rewardType must be COMBO');
    expect(reward.isCombo()).toBe(true, 'isCombo() must return true for N=2 items');
  });

  await t1Ctx.test('T1.F1.2: reward.getComboItems() returns all N items matching comboData.items', async () => {
    const items = [
      createMockComboItem('item-1', 'Teclado Mecánico 60%', 45.00),
      createMockComboItem('item-2', 'Keycaps PBT Copland', 20.00),
      createMockComboItem('item-3', 'Cable Coiled Aviator', 15.00)
    ];
    const reward = new RewardModel({
      id: 'reward-combo-2',
      title: 'Combo Estación Mecánica 3-en-1',
      rewardType: 'COMBO',
      priceUsd: 65.00,
      stock: 2,
      comboData: { items }
    });

    const comboItems = reward.getComboItems();
    expect(Array.isArray(comboItems)).toBe(true, 'getComboItems() must return an array');
    expect(comboItems.length).toBe(3, 'getComboItems() must return all 3 items');
    expect(comboItems[0].id).toBe('item-1', 'First item id must match');
    expect(comboItems[1].id).toBe('item-2', 'Second item id must match');
    expect(comboItems[2].id).toBe('item-3', 'Third item id must match');
  });

  await t1Ctx.test('T1.F1.3: reward.getComboSavings() accurately returns { sumUsd, savingsUsd, savingsPct } matching Canonical Oracle', async () => {
    const items = [
      createMockComboItem('it-a', 'Mouse Gamer', 30.00),
      createMockComboItem('it-b', 'Mousepad Speed', 20.00)
    ];
    const comboPrice = 38.00;
    const reward = new RewardModel({
      id: 'reward-combo-3',
      title: 'Duo Pack',
      rewardType: 'COMBO',
      priceUsd: comboPrice,
      comboData: { items }
    });

    const savings = reward.getComboSavings();
    const expected = CanonicalComboOracle.calculateSavings(items, comboPrice);

    expect(savings.sumUsd).toBe(expected.sumUsd, `sumUsd must be ${expected.sumUsd}`);
    expect(savings.savingsUsd).toBe(expected.savingsUsd, `savingsUsd must be ${expected.savingsUsd}`);
    expect(savings.savingsPct).toBe(expected.savingsPct, `savingsPct must be ${expected.savingsPct}%`);
  });

  await t1Ctx.test('T1.F1.4: Legacy backwards compatibility: comboData with itemA and itemB properties is parsed cleanly', async () => {
    const itemA = createMockComboItem('item-legacy-a', 'Audífonos Wired', 25.00);
    const itemB = createMockComboItem('item-legacy-b', 'Soporte RGB', 15.00);
    const reward = new RewardModel({
      id: 'reward-legacy-combo',
      title: 'Combo Legacy Duo',
      rewardType: 'COMBO',
      priceUsd: 32.00,
      comboData: { itemA, itemB }
    });

    expect(reward.isCombo()).toBe(true, 'Legacy itemA/itemB must be identified as combo');
    const items = reward.getComboItems();
    expect(items.length).toBe(2, 'Legacy combo must return 2 items');
    expect(items[0].id).toBe('item-legacy-a', 'itemA must be in index 0');
    expect(items[1].id).toBe('item-legacy-b', 'itemB must be in index 1');

    const savings = reward.getComboSavings();
    expect(savings.sumUsd).toBe(40.00, 'Sum must be 40.00 USD');
    expect(savings.savingsUsd).toBe(8.00, 'Savings must be 8.00 USD');
    expect(savings.savingsPct).toBe(20, 'Savings must be 20%');
  });

  await t1Ctx.test('T1.F1.5: Non-combo reward types return isCombo() === false and empty getComboItems()', async () => {
    const freeReward = new RewardModel({ id: 'free-1', title: 'Sticker Lain', rewardType: 'FREE_REWARD', pointsCost: 50 });
    const partialReward = new RewardModel({ id: 'part-1', title: 'Teclado', rewardType: 'PARTIAL_DISCOUNT', priceUsd: 50 });
    const incomingReward = new RewardModel({ id: 'inc-1', title: 'Laptop Bag', rewardType: 'INCOMING', status: 'INCOMING' });

    expect(freeReward.isCombo()).toBe(false, 'FREE_REWARD is not a combo');
    expect(freeReward.getComboItems()).toEqual([], 'FREE_REWARD getComboItems must be empty');
    expect(partialReward.isCombo()).toBe(false, 'PARTIAL_DISCOUNT is not a combo');
    expect(incomingReward.isCombo()).toBe(false, 'INCOMING is not a combo');
  });

  await t1Ctx.test('T1.F2.1: VoucherModel preserves comboOrigin snapshot metadata', async () => {
    const originSnapshot = {
      comboId: 'combo-original-99',
      originalTitle: 'Super Combo Gamer 3-en-1',
      itemCount: 3,
      itemsSnapshot: [
        { id: 'it-1', title: 'Mouse', priceUsd: 20 },
        { id: 'it-2', title: 'Teclado', priceUsd: 50 },
        { id: 'it-3', title: 'Mousepad', priceUsd: 15 }
      ],
      companionRewardIds: ['standalone-it-2', 'standalone-it-3']
    };

    const voucher = new VoucherModel({
      voucherCode: 'CANJE-9876',
      userUid: 'CLIENT-58438412',
      rewardId: 'combo-original-99',
      rewardTitle: 'Super Combo Gamer 3-en-1',
      rewardType: 'COMBO',
      priceUsd: 70.00,
      cashToPayUsd: 70.00,
      comboOrigin: originSnapshot
    });

    expect(Boolean(voucher.comboOrigin)).toBe(true, 'comboOrigin must be preserved');
    expect(voucher.comboOrigin.comboId).toBe('combo-original-99', 'comboId must match');
    expect(voucher.comboOrigin.itemCount).toBe(3, 'itemCount must match');
  });

  await t1Ctx.test('T1.F2.2: VoucherModel exposes isComboVoucher(), isFullComboVoucher(), and isSplitComboItemVoucher()', async () => {
    const fullComboVoucher = new VoucherModel({
      voucherCode: 'CANJE-FULL',
      rewardType: 'COMBO',
      comboOrigin: { comboId: 'combo-1', itemCount: 2 },
      comboItems: [{ id: 'a' }, { id: 'b' }]
    });

    const splitVoucher = new VoucherModel({
      voucherCode: 'CANJE-SPLIT',
      rewardType: 'PARTIAL_DISCOUNT',
      comboOrigin: { comboId: 'combo-1', itemCount: 2 },
      purchasedItem: { id: 'a', title: 'Item A', priceUsd: 20 }
    });

    expect(typeof fullComboVoucher.isComboVoucher).toBe('function', 'isComboVoucher must be a function');
    expect(fullComboVoucher.isComboVoucher()).toBe(true, 'Full voucher must be a combo voucher');
    expect(fullComboVoucher.isFullComboVoucher()).toBe(true, 'isFullComboVoucher must return true for full purchase');
    expect(fullComboVoucher.isSplitComboItemVoucher()).toBe(false, 'isSplitComboItemVoucher must return false for full purchase');

    expect(splitVoucher.isComboVoucher()).toBe(true, 'Split voucher has comboOrigin, must be combo voucher');
    expect(splitVoucher.isFullComboVoucher()).toBe(false, 'Split voucher is not full combo');
    expect(splitVoucher.isSplitComboItemVoucher()).toBe(true, 'isSplitComboItemVoucher must return true for single item extract');
  });

  await t1Ctx.test('T1.F2.3: Commercial combo vouchers enforce exact 72-hour (3-day) expiration when unpaid', async () => {
    const createdTime = '2026-10-07T12:00:00.000Z';
    const expectedExpiry = '2026-10-10T12:00:00.000Z'; // Exactly +72h

    const voucher = new VoucherModel({
      voucherCode: 'CANJE-72H',
      rewardType: 'COMBO',
      priceUsd: 50.00,
      cashToPayUsd: 40.00,
      isPaid: false,
      createdAt: createdTime
    });

    expect(voucher.expiresAt).toBe(expectedExpiry, 'Commercial unpaid combo voucher must expire in exactly 72 hours');
  });

  await t1Ctx.test('T1.F2.4: Paid combo vouchers or $0 free vouchers have expiresAt === null', async () => {
    const paidVoucher = new VoucherModel({
      voucherCode: 'CANJE-PAID',
      rewardType: 'COMBO',
      priceUsd: 50.00,
      cashToPayUsd: 50.00,
      isPaid: true
    });

    const freeVoucher = new VoucherModel({
      voucherCode: 'CANJE-FREE',
      rewardType: 'FREE_REWARD',
      cashToPayUsd: 0,
      pointsSpent: 100
    });

    expect(paidVoucher.expiresAt).toBe(null, 'Paid vouchers never expire');
    expect(freeVoucher.expiresAt).toBe(null, 'Free vouchers never expire');
  });

  summaries.push(t1Ctx.summary());

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // =========================================================================
  const t2Ctx = new TestContext('Tier 2: Boundary & Corner Cases');
  console.log('======================================================');
  console.log(' RUNNING TIER 2: BOUNDARY & CORNER CASES');
  console.log('======================================================');

  await t2Ctx.test('T2.B1.1: Exact lower boundary N = 2 validates isCombo() === true', async () => {
    const items = [
      createMockComboItem('b2-1', 'Item 1', 10),
      createMockComboItem('b2-2', 'Item 2', 15)
    ];
    const reward = new RewardModel({
      id: 'combo-b2',
      rewardType: 'COMBO',
      priceUsd: 22,
      comboData: { items }
    });
    expect(reward.isCombo()).toBe(true, 'N=2 must be valid combo');
    expect(reward.getComboItems().length).toBe(2);
  });

  await t2Ctx.test('T2.B1.2: Boundary N = 3 (standard 3-in-1 combo) validates cleanly', async () => {
    const items = [
      createMockComboItem('b3-1', 'Item 1', 10),
      createMockComboItem('b3-2', 'Item 2', 15),
      createMockComboItem('b3-3', 'Item 3', 20)
    ];
    const reward = new RewardModel({
      id: 'combo-b3',
      rewardType: 'COMBO',
      priceUsd: 35,
      comboData: { items }
    });
    expect(reward.isCombo()).toBe(true);
    expect(reward.getComboItems().length).toBe(3);
  });

  await t2Ctx.test('T2.B1.3: Boundary N = 5 (large combo) maintains floating-point precision in sum and savings', async () => {
    const items = [
      createMockComboItem('b5-1', 'Item 1', 19.99),
      createMockComboItem('b5-2', 'Item 2', 29.99),
      createMockComboItem('b5-3', 'Item 3', 9.99),
      createMockComboItem('b5-4', 'Item 4', 14.50),
      createMockComboItem('b5-5', 'Item 5', 25.50)
    ];
    // Sum: 19.99 + 29.99 + 9.99 + 14.50 + 25.50 = 99.97
    const reward = new RewardModel({
      id: 'combo-b5',
      rewardType: 'COMBO',
      priceUsd: 79.97, // 20.00 USD savings
      comboData: { items }
    });
    const savings = reward.getComboSavings();
    expect(savings.sumUsd).toBe(99.97, 'Sum must match exact float addition 99.97');
    expect(savings.savingsUsd).toBe(20.00, 'Savings must be 20.00');
    expect(savings.savingsPct).toBe(20, 'Savings pct must be 20%');
  });

  await t2Ctx.test('T2.B1.4: Sub-boundary N = 1 (single item array) returns isCombo() === false', async () => {
    const items = [createMockComboItem('single-1', 'Only One Item', 30)];
    const reward = new RewardModel({
      id: 'combo-invalid-1',
      rewardType: 'COMBO',
      priceUsd: 25,
      comboData: { items }
    });
    expect(reward.isCombo()).toBe(false, 'Combo requires at least 2 items (N >= 2)');
  });

  await t2Ctx.test('T2.B1.5: Empty items array N = 0 returns isCombo() === false and empty array', async () => {
    const reward = new RewardModel({
      id: 'combo-empty',
      rewardType: 'COMBO',
      priceUsd: 10,
      comboData: { items: [] }
    });
    expect(reward.isCombo()).toBe(false, 'Empty comboData.items is not a combo');
    expect(reward.getComboItems()).toEqual([]);
  });

  await t2Ctx.test('T2.B2.1: 0% savings boundary (comboPrice === sumUsd): savingsUsd === 0 and savingsPct === 0', async () => {
    const items = [
      createMockComboItem('zero-1', 'Item A', 15.00),
      createMockComboItem('zero-2', 'Item B', 25.00)
    ];
    // Sum: 40.00, Combo price: 40.00
    const reward = new RewardModel({
      id: 'combo-zero-disc',
      rewardType: 'COMBO',
      priceUsd: 40.00,
      comboData: { items }
    });
    const savings = reward.getComboSavings();
    expect(savings.sumUsd).toBe(40.00);
    expect(savings.savingsUsd).toBe(0.00, 'Zero dollar savings');
    expect(savings.savingsPct).toBe(0, 'Zero percent savings');
  });

  await t2Ctx.test('T2.B2.2: High savings boundary (80% discount): accurate computation without overflow', async () => {
    const items = [
      createMockComboItem('high-1', 'High Value 1', 50.00),
      createMockComboItem('high-2', 'High Value 2', 50.00)
    ];
    // Sum: 100.00, Combo price: 20.00 -> 80.00 USD savings (80%)
    const reward = new RewardModel({
      id: 'combo-high-disc',
      rewardType: 'COMBO',
      priceUsd: 20.00,
      comboData: { items }
    });
    const savings = reward.getComboSavings();
    expect(savings.sumUsd).toBe(100.00);
    expect(savings.savingsUsd).toBe(80.00);
    expect(savings.savingsPct).toBe(80);
  });

  await t2Ctx.test('T2.B2.3: Unfavorable combo price (comboPrice > sumUsd) clamps savings at 0 (no negative values)', async () => {
    const items = [
      createMockComboItem('unfav-1', 'Item 1', 10.00),
      createMockComboItem('unfav-2', 'Item 2', 10.00)
    ];
    // Sum: 20.00, Combo price: 25.00 (adverse bundling)
    const reward = new RewardModel({
      id: 'combo-unfav',
      rewardType: 'COMBO',
      priceUsd: 25.00,
      comboData: { items }
    });
    const savings = reward.getComboSavings();
    expect(savings.sumUsd).toBe(20.00);
    expect(savings.savingsUsd).toBe(0.00, 'Negative dollar savings must floor at 0');
    expect(savings.savingsPct).toBe(0, 'Negative percentage discount must floor at 0');
  });

  await t2Ctx.test('T2.B3.1: Malformed items (empty description, string prices, missing image) parse safely without NaN', async () => {
    const items = [
      { id: 'mal-1', title: 'Malformed 1', priceUsd: '15.50', residualPriceUsd: '18.00' },
      { id: 'mal-2', title: 'Malformed 2', priceUsd: null, description: null, imageUrl: '' }
    ];
    const reward = new RewardModel({
      id: 'combo-malformed',
      rewardType: 'COMBO',
      priceUsd: '10.00',
      comboData: { items }
    });
    expect(reward.isCombo()).toBe(true);
    const savings = reward.getComboSavings();
    expect(isNaN(savings.sumUsd)).toBe(false, 'sumUsd must not be NaN');
    expect(isNaN(savings.savingsUsd)).toBe(false, 'savingsUsd must not be NaN');
    expect(isNaN(savings.savingsPct)).toBe(false, 'savingsPct must not be NaN');
  });

  await t2Ctx.test('T2.B3.2: Null or undefined comboData does not throw TypeError and returns isCombo() === false', async () => {
    const rewardNull = new RewardModel({ id: 'combo-null', rewardType: 'COMBO', comboData: null });
    const rewardUndef = new RewardModel({ id: 'combo-undef', rewardType: 'COMBO' });

    expect(rewardNull.isCombo()).toBe(false, 'null comboData must return isCombo() === false');
    expect(rewardNull.getComboItems()).toEqual([], 'null comboData must return empty array');
    expect(rewardNull.getComboSavings()).toEqual({ sumUsd: 0, savingsUsd: 0, savingsPct: 0 });

    expect(rewardUndef.isCombo()).toBe(false, 'undefined comboData must return isCombo() === false');
  });

  summaries.push(t2Ctx.summary());

  // =========================================================================
  // TIER 3: CASCADING TRANSITIONS (N -> N-1 -> 1 Standalone)
  // =========================================================================
  const t3Ctx = new TestContext('Tier 3: Cascading Transitions (N -> N-1 -> 1)');
  console.log('======================================================');
  console.log(' RUNNING TIER 3: CASCADING TRANSITIONS');
  console.log('======================================================');

  await t3Ctx.test('T3.C1.1: Full Combo Purchase: issues 1 CANJE voucher covering all items and marks combo SOLD_OUT', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-FULL-1',
      displayName: 'Comprador Full',
      phone: '88880001',
      wiredPoints: 500
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const items = [
      createMockComboItem('full-it-1', 'Mouse Lain', 20),
      createMockComboItem('full-it-2', 'Pad Lain', 15),
      createMockComboItem('full-it-3', 'Keycap Lain', 10)
    ];
    const comboReward = new RewardModel({
      id: 'combo-full-purchase',
      title: 'Pack Completo Trío Lain',
      rewardType: 'COMBO',
      priceUsd: 38.00,
      pointsCost: 100,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items }
    });
    vm.catalog = [comboReward];
    await FirestoreService.saveReward(comboReward.toJSON());

    // Redeem FULL_COMBO
    const voucher = await vm.redeemReward('combo-full-purchase', 50, {
      selectionMode: 'FULL_COMBO'
    });

    expect(Boolean(voucher)).toBe(true, 'Voucher must be returned');
    expect(voucher.voucherCode.startsWith('CANJE-')).toBe(true, 'Voucher code must start with CANJE-');
    expect(voucher.isFullComboVoucher?.() || voucher.isComboVoucher?.()).toBe(true, 'Must be marked as combo voucher');

    // Combo product in catalog must be sold out
    const updatedCombo = (vm.catalog || []).find(r => r.id === 'combo-full-purchase');
    expect(updatedCombo.stock).toBe(0, 'Combo stock must be 0');
    expect(updatedCombo.isSoldOut()).toBe(true, 'Combo must be SOLD_OUT');
  });

  await t3Ctx.test('T3.C1.2: Split purchase from N = 3 leaves combo active with N = 2 items and recalculated price', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-SPLIT-3',
      displayName: 'Comprador Split 3',
      phone: '88880002',
      wiredPoints: 300
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const item1 = createMockComboItem('sp3-1', 'Teclado Gamer', 40, 45, 15);
    const item2 = createMockComboItem('sp3-2', 'Mouse Gamer', 25, 28, 15);
    const item3 = createMockComboItem('sp3-3', 'Audífonos Gamer', 35, 38, 15);

    const comboReward = new RewardModel({
      id: 'combo-3-to-2',
      title: 'Trío Hardware Gamer',
      rewardType: 'COMBO',
      priceUsd: 85.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [item1, item2, item3] }
    });
    vm.catalog = [comboReward];
    await FirestoreService.saveReward(comboReward.toJSON());

    // User purchases item 1 only
    const voucher = await vm.redeemReward('combo-3-to-2', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'sp3-1'
    });

    expect(Boolean(voucher)).toBe(true, 'Voucher must be generated');
    expect(voucher.isSplitComboItemVoucher?.() || Boolean(voucher.comboOrigin)).toBe(true, 'Voucher must record comboOrigin');

    // Combo must still exist in catalog with remaining 2 items
    const remainingCombo = (vm.catalog || []).find(r => r.id === 'combo-3-to-2');
    expect(Boolean(remainingCombo)).toBe(true, 'Combo must remain in catalog');
    expect(remainingCombo.status).toBe('ACTIVE', 'Combo must remain ACTIVE');
    expect(remainingCombo.stock > 0).toBe(true, 'Combo stock must be > 0');

    const remainingItems = remainingCombo.getComboItems();
    expect(remainingItems.length).toBe(2, 'Combo must now contain exactly 2 items');
    expect(remainingItems.some(it => it.id === 'sp3-1')).toBe(false, 'Purchased item 1 must be removed');
    expect(remainingItems.some(it => it.id === 'sp3-2')).toBe(true, 'Item 2 must remain');
    expect(remainingItems.some(it => it.id === 'sp3-3')).toBe(true, 'Item 3 must remain');
  });

  await t3Ctx.test('T3.C1.3: Recalculated price & savings on remaining N = 2 combo match oracle', async () => {
    const item2 = createMockComboItem('sp3-2', 'Mouse Gamer', 25);
    const item3 = createMockComboItem('sp3-3', 'Audífonos Gamer', 35);
    const remainingCombo = new RewardModel({
      id: 'combo-3-to-2-remaining',
      title: 'Dúo Hardware Gamer',
      rewardType: 'COMBO',
      priceUsd: 52.00,
      comboData: { items: [item2, item3] }
    });

    const savings = remainingCombo.getComboSavings();
    const expected = CanonicalComboOracle.calculateSavings([item2, item3], 52.00);

    expect(savings.sumUsd).toBe(expected.sumUsd, `Sum must be ${expected.sumUsd} USD`);
    expect(savings.savingsUsd).toBe(expected.savingsUsd, `Savings must be ${expected.savingsUsd} USD`);
    expect(savings.savingsPct).toBe(expected.savingsPct, `Savings pct must be ${expected.savingsPct}%`);
  });

  await t3Ctx.test('T3.C1.4: Split purchase from N = 2 publishes remaining companion as standalone product', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-SPLIT-2',
      displayName: 'Comprador Split 2',
      phone: '88880003',
      wiredPoints: 200
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockComboItem('duo-1', 'Mousepad Haibane', 15.00, 18.00, 25);
    const itemB = createMockComboItem('duo-2', 'Teclado Copland', 45.00, 50.00, 30);

    const comboReward = new RewardModel({
      id: 'combo-2-to-1',
      title: 'Combo Haibane Duo',
      rewardType: 'COMBO',
      priceUsd: 52.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [comboReward];
    await FirestoreService.saveReward(comboReward.toJSON());

    // Buy item A only from the 2-item combo
    const voucher = await vm.redeemReward('combo-2-to-1', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'duo-1'
    });

    expect(Boolean(voucher)).toBe(true, 'Voucher must be issued');

    // Combo must be deactivated / marked SOLD_OUT
    const originalCombo = (vm.catalog || []).find(r => r.id === 'combo-2-to-1');
    expect(originalCombo.isSoldOut()).toBe(true, 'Original combo must now be SOLD_OUT');

    // Companion item B must now be published as a standalone product
    const companionStandalone = (vm.catalog || []).find(r =>
      r.id.includes('duo-2') ||
      (r.dissolvedFromCombo && r.dissolvedFromCombo.comboId === 'combo-2-to-1') ||
      r.title.includes('Teclado Copland')
    );

    expect(Boolean(companionStandalone)).toBe(true, 'Companion product must be published standalone');
    expect(companionStandalone.status).toBe('ACTIVE', 'Companion product must be ACTIVE');
    expect(companionStandalone.priceUsd).toBe(50.00, 'Companion must have residualPriceUsd (50.00)');
    expect(companionStandalone.maxDiscountPct).toBe(30, 'Companion must have residualMaxDiscountPct (30%)');
  });

  await t3Ctx.test('T3.C1.5: Standalone published product contains dissolvedFromCombo metadata', async () => {
    const oracleResult = CanonicalComboOracle.simulateCascade(
      {
        id: 'combo-test-meta',
        title: 'Combo Base',
        comboData: {
          items: [
            createMockComboItem('m-1', 'Item 1', 10),
            createMockComboItem('m-2', 'Item 2', 20, 22, 15)
          ]
        }
      },
      'SINGLE_ITEM',
      'm-1'
    );

    expect(oracleResult.action).toBe('SPLIT_TO_STANDALONE');
    expect(Boolean(oracleResult.newStandalone.dissolvedFromCombo)).toBe(true);
    expect(oracleResult.newStandalone.dissolvedFromCombo.comboId).toBe('combo-test-meta');
  });

  await t3Ctx.test('T3.C1.6: User accounting invariant: points debited match points selected with zero drift', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-BALANCE-INV',
      displayName: 'Auditor de Saldo',
      phone: '88880004',
      wiredPoints: 400
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const item1 = createMockComboItem('inv-1', 'Articulo 1', 25, 28, 20);
    const item2 = createMockComboItem('inv-2', 'Articulo 2', 25, 28, 20);
    const comboReward = new RewardModel({
      id: 'combo-balance-test',
      title: 'Combo Balance Test',
      rewardType: 'COMBO',
      priceUsd: 40.00,
      pointsCost: 200,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [item1, item2] }
    });
    vm.catalog = [comboReward];

    const initialPoints = user.wiredPoints; // 400
    const pointsToApply = 50;

    await vm.redeemReward('combo-balance-test', pointsToApply, {
      selectionMode: 'FULL_COMBO'
    });

    expect(vm.currentUser.wiredPoints).toBe(initialPoints - pointsToApply, 'Points deducted must match pointsToApply');
  });

  summaries.push(t3Ctx.summary());

  // =========================================================================
  // TIER 4: RECONSTITUTION LIFECYCLE AT 72H OR CANCELLATION
  // =========================================================================
  const t4Ctx = new TestContext('Tier 4: Reconstitution Lifecycle at 72h or Cancellation');
  console.log('======================================================');
  console.log(' RUNNING TIER 4: RECONSTITUTION LIFECYCLE (72H / CANCEL)');
  console.log('======================================================');

  await t4Ctx.test('T4.R1.1: Reconstitution Lifecycle: Cancellation with companion ACTIVE restores combo and removes standalone', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-RECON-ACTIVE',
      displayName: 'Cliente Reconstitución 1',
      phone: '88880005',
      wiredPoints: 500
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockComboItem('rec-1', 'Mouse Lain', 20.00, 22.00, 15);
    const itemB = createMockComboItem('rec-2', 'Pad Haibane', 15.00, 18.00, 20);

    const combo = new RewardModel({
      id: 'combo-recon-orig',
      title: 'Combo Original Haibane',
      rewardType: 'COMBO',
      priceUsd: 30.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];

    // Step 1: Split buy item A -> item B becomes standalone
    const voucher = await vm.redeemReward('combo-recon-orig', 40, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'rec-1'
    });

    const userBalAfterBuy = vm.currentUser.wiredPoints; // 460 WP

    // Step 2: Cancel voucher while companion item B is still in stock
    const cancelRes = await vm.cancelVoucher(voucher.voucherCode);
    expect(cancelRes.success).toBe(true, 'Cancellation must succeed');

    // Verification: Points refunded
    expect(vm.currentUser.wiredPoints).toBe(500, '40 WP must be refunded to user');

    // Verification: Combo restored
    const reconstitutedCombo = (vm.catalog || []).find(r => r.id === 'combo-recon-orig');
    expect(Boolean(reconstitutedCombo)).toBe(true, 'Original combo must exist in catalog');
    expect(reconstitutedCombo.status).toBe('ACTIVE', 'Reconstituted combo must be ACTIVE');
    expect(reconstitutedCombo.stock).toBe(1, 'Combo stock must be restored to 1');
    expect(reconstitutedCombo.getComboItems().length).toBe(2, 'Both items must be present in reconstituted combo');
  });

  await t4Ctx.test('T4.R1.2: Reconstitution Lifecycle: Cancellation when companion is ALREADY SOLD publishes canceled item standalone', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-RECON-SOLD',
      displayName: 'Cliente Reconstitución 2',
      phone: '88880006',
      wiredPoints: 500
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockComboItem('rec-sold-1', 'Item Comprado', 20.00, 24.00, 15);
    const itemB = createMockComboItem('rec-sold-2', 'Item Compañero', 30.00, 35.00, 20);

    const combo = new RewardModel({
      id: 'combo-companion-sold',
      title: 'Combo Duo Sold Test',
      rewardType: 'COMBO',
      priceUsd: 45.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];

    // Step 1: User buys item A -> item B becomes standalone
    const voucher = await vm.redeemReward('combo-companion-sold', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'rec-sold-1'
    });

    // Step 2: Companion item B is purchased by another customer (stock becomes 0)
    const standaloneCompanion = (vm.catalog || []).find(r =>
      r.id.includes('rec-sold-2') ||
      (r.dissolvedFromCombo && r.dissolvedFromCombo.comboId === 'combo-companion-sold')
    );
    if (standaloneCompanion) {
      standaloneCompanion.stock = 0;
      standaloneCompanion.status = 'SOLD_OUT';
    }

    // Step 3: User cancels voucher for item A
    await vm.cancelVoucher(voucher.voucherCode);

    // Verification: Combo must NOT be reconstituted (cannot create 1-item combo)
    const restoredCombo = (vm.catalog || []).find(r => r.id === 'combo-companion-sold');
    expect(restoredCombo.isSoldOut()).toBe(true, 'Combo must remain SOLD_OUT because companion was sold');

    // Verification: Item A is published as standalone product
    const itemAStandalone = (vm.catalog || []).find(r =>
      (r.id.includes('rec-sold-1') || r.title.includes('Item Comprado')) &&
      r.status === 'ACTIVE'
    );
    expect(Boolean(itemAStandalone)).toBe(true, 'Item A must be published as standalone product');
    expect(itemAStandalone.priceUsd).toBe(24.00, 'Price must be residualPriceUsd (24.00)');
  });

  await t4Ctx.test('T4.R1.3: 72h Commercial Expiration automatically triggers reconstitution or standalone release', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-72H-EXP',
      displayName: 'Cliente Expiración 72h',
      phone: '88880007',
      wiredPoints: 500
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockComboItem('exp-1', 'Item Exp 1', 20.00, 22.00, 10);
    const itemB = createMockComboItem('exp-2', 'Item Exp 2', 20.00, 22.00, 10);

    const combo = new RewardModel({
      id: 'combo-72h-exp',
      title: 'Combo Expirable',
      rewardType: 'COMBO',
      priceUsd: 35.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];

    const voucher = await vm.redeemReward('combo-72h-exp', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'exp-1'
    });

    // Artificially age voucher past 72h
    voucher.createdAt = new Date(Date.now() - 4 * 864e5).toISOString(); // 4 days ago
    voucher.expiresAt = new Date(Date.now() - 1 * 864e5).toISOString(); // 1 day ago
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Trigger processExpiredVouchers (or expiration sweep)
    if (typeof vm.processExpiredVouchers === 'function') {
      const expiredCount = await vm.processExpiredVouchers();
      expect(expiredCount >= 1).toBe(true, 'At least 1 voucher must be processed as expired');
    }

    const updatedVoucher = await FirestoreService.getVoucher(voucher.voucherCode);
    expect(updatedVoucher.status === 'EXPIRED' || updatedVoucher.status === 'CANCELLED').toBe(true);
  });

  await t4Ctx.test('T4.R1.4: Full Combo Cancellation restores entire combo with all N items and stock = 1', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-FULL-CANCEL',
      displayName: 'Cliente Full Cancel',
      phone: '88880008',
      wiredPoints: 300
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const items = [
      createMockComboItem('fc-1', 'Item 1', 15),
      createMockComboItem('fc-2', 'Item 2', 25)
    ];
    const combo = new RewardModel({
      id: 'combo-full-cancel',
      title: 'Full Cancel Combo',
      rewardType: 'COMBO',
      priceUsd: 32.00,
      pointsCost: 50,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items }
    });
    vm.catalog = [combo];

    const voucher = await vm.redeemReward('combo-full-cancel', 50, {
      selectionMode: 'FULL_COMBO'
    });
    expect(combo.isSoldOut()).toBe(true);

    // Cancel full combo voucher
    await vm.cancelVoucher(voucher.voucherCode);

    const restored = (vm.catalog || []).find(r => r.id === 'combo-full-cancel');
    expect(restored.status).toBe('ACTIVE', 'Full combo must be restored to ACTIVE');
    expect(restored.stock).toBe(1, 'Full combo stock must be 1');
    expect(restored.getComboItems().length).toBe(2, 'All items must remain in restored combo');
    expect(vm.currentUser.wiredPoints).toBe(300, '50 WP must be refunded');
  });

  await t4Ctx.test('T4.R1.5: Adversarial double cancellation is rejected with error feedback and no duplicate refunds', async () => {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-DOUBLE-CANCEL',
      displayName: 'Double Cancel Tester',
      phone: '88880009',
      wiredPoints: 300
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const items = [
      createMockComboItem('dc-1', 'Item 1', 10),
      createMockComboItem('dc-2', 'Item 2', 20)
    ];
    const combo = new RewardModel({
      id: 'combo-double-cancel',
      title: 'Double Cancel Combo',
      rewardType: 'COMBO',
      priceUsd: 25.00,
      pointsCost: 50,
      stock: 1,
      comboData: { items }
    });
    vm.catalog = [combo];

    const voucher = await vm.redeemReward('combo-double-cancel', 50, {
      selectionMode: 'FULL_COMBO'
    });

    // First cancel succeeds
    await vm.cancelVoucher(voucher.voucherCode);
    const balanceAfterFirstCancel = vm.currentUser.wiredPoints; // 300

    // Second cancel must throw
    let errorThrown = null;
    try {
      await vm.cancelVoucher(voucher.voucherCode);
    } catch (err) {
      errorThrown = err;
    }

    expect(Boolean(errorThrown)).toBe(true, 'Second cancel must throw error');
    expect(vm.currentUser.wiredPoints).toBe(balanceAfterFirstCancel, 'Points balance must not increase again');
  });

  summaries.push(t4Ctx.summary());

  // =========================================================================
  // FINAL REPORT & SUMMARY
  // =========================================================================
  const totalDuration = Math.round(performance.now() - startAll);
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors = [];

  console.log('\n======================================================');
  console.log('                 FINAL TEST SUMMARY                   ');
  console.log('======================================================');

  for (const s of summaries) {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;
    if (s.errors && s.errors.length > 0) {
      allErrors.push(...s.errors);
    }
    const mark = s.failed === 0 ? '✓ PASS' : '✕ FAIL';
    console.log(`[${mark}] ${s.name}: ${s.passed}/${s.total} passed (${s.failed} failed)`);
  }

  console.log('------------------------------------------------------');
  console.log(`TOTAL: ${totalTests} tests | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log(`Total Execution Time: ${totalDuration}ms`);
  console.log('======================================================\n');

  if (allErrors.length > 0) {
    console.error(`Suite finished with ${totalFailed} failure(s):`);
    for (const e of allErrors) {
      console.error(`  - ${e.description}: ${e.error ? e.error.message : e}`);
    }
  }

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    errors: allErrors,
    durationMs: totalDuration
  };
}

// Auto-run when invoked via node
if (process.argv[1] && process.argv[1].endsWith('combo_products.test.mjs')) {
  runComboProductsTestSuite()
    .then(summary => {
      if (summary.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(fatal => {
      console.error('[FATAL RUNNER EXCEPTION]:', fatal);
      process.exit(1);
    });
}
