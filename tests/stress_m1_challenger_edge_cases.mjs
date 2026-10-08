/**
 * ============================================================================
 * ADVERSARIAL CHALLENGER SUITE: MILESTONE M1
 * Empirically Stress-Testing Combos Flexibles Haibane Edge Cases
 * ============================================================================
 * Author: teamwork_preview_challenger_m1_2
 * Track: Milestone M1 Adversarial Verification
 * Scenarios:
 *   1. 0% savings & Inverted price floor (comboPrice > sumRegularPrices)
 *   2. Cascading transitions & Ghost/Single-item combos prevention
 *   3. Reconstitution lifecycle (Companion SOLD vs UNSOLD on Cancel & 72h Expiry)
 *   4. Round-trip serialization (RewardModel & VoucherModel)
 *   5. Robustness against malformed/adversarial inputs & Idempotency
 * ============================================================================
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const loadModule = (relativePath) => {
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, relativePath)).href;
  return import(`${fileUrl}?t=${Date.now()}`);
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`    ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`    ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failureDetails.push({ testName, details });
  }
}

function assertApprox(actual, expected, tolerance = 0.01, testName) {
  const diff = Math.abs(Number(actual) - Number(expected));
  assert(diff <= tolerance, testName, `Expected ~${expected}, got ${actual} (diff: ${diff})`);
}

function createMockItem(id, title, priceUsd, residualPriceUsd = null, residualMaxDiscountPct = 20) {
  return {
    id,
    title,
    description: `Descripción para ${title}`,
    imageUrl: `https://images.unsplash.com/mock-${id}.jpg`,
    priceUsd: Number(priceUsd),
    residualPriceUsd: residualPriceUsd !== null ? Number(residualPriceUsd) : Number(priceUsd),
    residualMaxDiscountPct: Number(residualMaxDiscountPct)
  };
}

async function runAdversarialSuite() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADVERSARIAL CHALLENGER: MILESTONE M1 EMPIRICAL VERIFICATION HARNESS    ║');
  console.log('║   Empirical verification of models, cascade, reconstitution & edge cases ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  setupTestEnvironment('index.html');

  const { RewardModel } = await loadModule('js/models/RewardModel.js');
  const { VoucherModel } = await loadModule('js/models/VoucherModel.js');
  const { UserModel } = await loadModule('js/models/UserModel.js');
  const { CustomerViewModel } = await loadModule('js/viewmodels/CustomerViewModel.js');
  const { FirestoreService } = await loadModule('js/services/FirestoreService.js');

  // ==========================================================================
  // GROUP 1: 0% SAVINGS & INVERTED PRICE FLOOR (comboPrice >= sumUsd)
  // ==========================================================================
  console.log('======================================================');
  console.log(' GROUP 1: 0% SAVINGS & INVERTED PRICE FLOOR');
  console.log('======================================================');

  // 1.1 Exact match: comboPrice === sumUsd (0% savings)
  {
    const items = [
      createMockItem('zero-1', 'Item A', 25.00),
      createMockItem('zero-2', 'Item B', 15.00)
    ]; // sum = 40.00
    const combo = new RewardModel({
      id: 'combo-zero-sav',
      rewardType: 'COMBO',
      priceUsd: 40.00,
      comboData: { items }
    });
    const s = combo.getComboSavings();
    assert(s.sumUsd === 40.00, '1.1.1: sumUsd matches exact sum ($40.00)');
    assert(s.savingsUsd === 0.00, '1.1.2: savingsUsd is strictly 0.00 when comboPrice === sumUsd');
    assert(s.savingsPct === 0, '1.1.3: savingsPct is strictly 0% when comboPrice === sumUsd');
  }

  // 1.2 Inverted price: comboPrice > sumUsd (Hostile bundle / price gouging)
  {
    const items = [
      createMockItem('inv-1', 'Item A', 10.00),
      createMockItem('inv-2', 'Item B', 10.00)
    ]; // sum = 20.00, comboPrice = 30.00
    const combo = new RewardModel({
      id: 'combo-inverted-price',
      rewardType: 'COMBO',
      priceUsd: 30.00,
      comboData: { items }
    });
    const s = combo.getComboSavings();
    assert(s.sumUsd === 20.00, '1.2.1: sumUsd is $20.00');
    assert(s.savingsUsd === 0.00, '1.2.2: savingsUsd clamped at 0 (never negative)');
    assert(s.savingsPct === 0, '1.2.3: savingsPct clamped at 0 (never negative)');
  }

  // 1.3 Extreme inverted price: comboPrice = 999999.00 vs sum = $15.00
  {
    const items = [
      createMockItem('ext-1', 'Item 1', 5.00),
      createMockItem('ext-2', 'Item 2', 10.00)
    ];
    const combo = new RewardModel({
      id: 'combo-extreme-inv',
      rewardType: 'COMBO',
      priceUsd: 999999.00,
      comboData: { items }
    });
    const s = combo.getComboSavings();
    assert(s.savingsUsd === 0.00, '1.3.1: Extreme inverted price savingsUsd is 0');
    assert(s.savingsPct === 0, '1.3.2: Extreme inverted price savingsPct is 0');
  }

  // 1.4 Zero total sum: all items are $0.00 (Free combo items)
  {
    const items = [
      createMockItem('free-1', 'Free Gift 1', 0.00),
      createMockItem('free-2', 'Free Gift 2', 0.00)
    ];
    const combo = new RewardModel({
      id: 'combo-zero-sum',
      rewardType: 'COMBO',
      priceUsd: 0.00,
      comboData: { items }
    });
    const s = combo.getComboSavings();
    assert(s.sumUsd === 0.00, '1.4.1: sumUsd is 0.00');
    assert(s.savingsUsd === 0.00, '1.4.2: savingsUsd is 0.00');
    assert(s.savingsPct === 0, '1.4.3: savingsPct is 0 without NaN or division by zero');
    assert(!Number.isNaN(s.savingsPct), '1.4.4: savingsPct is not NaN');
  }

  // 1.5 Decimal float precision: 3 items (0.10 + 0.20 + 0.30 = 0.60, combo 0.50)
  {
    const items = [
      createMockItem('dec-1', 'D1', 0.10),
      createMockItem('dec-2', 'D2', 0.20),
      createMockItem('dec-3', 'D3', 0.30)
    ];
    const combo = new RewardModel({
      id: 'combo-float-prec',
      rewardType: 'COMBO',
      priceUsd: 0.50,
      comboData: { items }
    });
    const s = combo.getComboSavings();
    assertApprox(s.sumUsd, 0.60, 0.001, '1.5.1: sumUsd handles IEEE float addition (0.60)');
    assertApprox(s.savingsUsd, 0.10, 0.001, '1.5.2: savingsUsd handles float subtraction (0.10)');
    assert(s.savingsPct === 17, '1.5.3: savingsPct is 17% (0.10 / 0.60 = 16.666% -> 17%)');
  }

  // ==========================================================================
  // GROUP 2: CASCADING TRANSITIONS & GHOST/SINGLE-ITEM COMBOS PREVENTION
  // ==========================================================================
  console.log('\n======================================================');
  console.log(' GROUP 2: CASCADING TRANSITIONS & GHOST COMBO PREVENTION');
  console.log('======================================================');

  // 2.1 Single-item array passed to RewardModel: isCombo must be FALSE
  {
    const rSingle = new RewardModel({
      id: 'fake-combo-1',
      rewardType: 'COMBO',
      priceUsd: 15.00,
      comboData: { items: [createMockItem('one', 'Solo Item', 15.00)] }
    });
    assert(rSingle.isCombo() === false, '2.1.1: Combo with 1 item returns isCombo() === false');
    assert(rSingle.getComboSavings().sumUsd === 0, '2.1.2: Combo with 1 item returns 0 savings');
  }

  // 2.2 Empty items array: isCombo must be FALSE
  {
    const rEmpty = new RewardModel({
      id: 'fake-combo-0',
      rewardType: 'COMBO',
      priceUsd: 15.00,
      comboData: { items: [] }
    });
    assert(rEmpty.isCombo() === false, '2.2.1: Combo with 0 items returns isCombo() === false');
    assert(rEmpty.getComboItems().length === 0, '2.2.2: getComboItems() returns empty array');
  }

  // 2.3 Non-array or malformed comboData
  {
    const rCorrupt = new RewardModel({
      id: 'fake-combo-corrupt',
      rewardType: 'COMBO',
      priceUsd: 15.00,
      comboData: { items: 'corrupted-string' }
    });
    assert(rCorrupt.isCombo() === false, '2.3.1: Malformed comboData items string returns isCombo() === false');
  }

  // 2.4 End-to-end Cascade: 3 -> 2 -> 1 Standalone, asserting NO ghost combo at any phase
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({
      uid: 'CLIENT-CASCADE-TEST',
      displayName: 'Cascade Tester',
      wiredPoints: 1000
    });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const item1 = createMockItem('cas-1', 'Teclado Mecanico', 50.00, 55.00, 20);
    const item2 = createMockItem('cas-2', 'Mouse Optico', 30.00, 35.00, 15);
    const item3 = createMockItem('cas-3', 'Mousepad XXL', 20.00, 22.00, 10);
    // Total sum = 100.00, combo price = 80.00 (20% OFF)

    const combo = new RewardModel({
      id: 'combo-trio-cascade',
      title: 'Trío Gamer Haibane',
      rewardType: 'COMBO',
      priceUsd: 80.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [item1, item2, item3] }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    // Step 1: Buy item 1 (from 3 items -> leaves 2 items)
    const voucher1 = await vm.redeemReward('combo-trio-cascade', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'cas-1'
    });
    assert(Boolean(voucher1), '2.4.1: Voucher 1 issued for item 1');
    assert(voucher1.rewardType === 'PARTIAL_DISCOUNT', '2.4.2: Voucher 1 is PARTIAL_DISCOUNT');
    assert(voucher1.purchasedItem.id === 'cas-1', '2.4.3: Voucher 1 purchasedItem is cas-1');

    // Verify catalog state: combo still exists with N = 2 items
    const remainingCombo = vm.catalog.find(r => r.id === 'combo-trio-cascade');
    assert(Boolean(remainingCombo), '2.4.4: Combo still present in catalog');
    assert(remainingCombo.status === 'ACTIVE', '2.4.5: Remaining combo is ACTIVE');
    assert(remainingCombo.stock === 1, '2.4.6: Remaining combo stock is 1');
    assert(remainingCombo.getComboItems().length === 2, '2.4.7: Remaining combo has exactly 2 items');
    assert(remainingCombo.isCombo() === true, '2.4.8: Remaining combo has isCombo() === true');

    // Step 2: Buy item 2 (from 2 items -> cascade to Standalone!)
    const voucher2 = await vm.redeemReward('combo-trio-cascade', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'cas-2'
    });
    assert(Boolean(voucher2), '2.4.9: Voucher 2 issued for item 2');

    // Verify catalog state: combo MUST BE SOLD_OUT (Dissolved)
    const dissolvedCombo = vm.catalog.find(r => r.id === 'combo-trio-cascade');
    assert(dissolvedCombo.status === 'SOLD_OUT', '2.4.10: Combo is SOLD_OUT after dropping below 2 items');
    assert(dissolvedCombo.stock === 0, '2.4.11: Combo stock is 0');

    // Verify companion item 3 is published standalone
    const standaloneItem3 = vm.catalog.find(r =>
      r.id.includes('cas-3') ||
      (r.dissolvedFromCombo && r.dissolvedFromCombo.comboId === 'combo-trio-cascade')
    );
    assert(Boolean(standaloneItem3), '2.4.12: Item 3 is published standalone in catalog');
    assert(standaloneItem3.status === 'ACTIVE', '2.4.13: Standalone item 3 is ACTIVE');
    assert(standaloneItem3.rewardType === 'PARTIAL_DISCOUNT', '2.4.14: Standalone item 3 is PARTIAL_DISCOUNT');
    assert(standaloneItem3.isCombo() === false, '2.4.15: Standalone item 3 has isCombo() === false (NO GHOST COMBO)');
    assert(standaloneItem3.priceUsd === 22.00, '2.4.16: Standalone item 3 price matches residualPriceUsd ($22.00)');

    // Invariant check: There are ZERO active combos with items.length < 2
    const ghostCombos = vm.catalog.filter(r => r.rewardType === 'COMBO' && r.status === 'ACTIVE' && r.getComboItems().length < 2);
    assert(ghostCombos.length === 0, '2.4.17: INVARIANT: Zero ghost or 1-item active combos in catalog');
  }

  // 2.5 Error handling: Request non-existent item in combo
  {
    const vm = new CustomerViewModel();
    vm.currentUser = new UserModel({ uid: 'U-ERR', wiredPoints: 100 });
    const combo = new RewardModel({
      id: 'combo-err-test',
      rewardType: 'COMBO',
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [createMockItem('e1', 'E1', 10), createMockItem('e2', 'E2', 20)] }
    });
    vm.catalog = [combo];

    let threw = false;
    try {
      await vm.redeemReward('combo-err-test', 0, {
        selectionMode: 'SINGLE_ITEM',
        selectedItemId: 'non-existent-item-999'
      });
    } catch (e) {
      threw = true;
      assert(e.message.includes('no encontrado en el combo'), '2.5.1: Error message is descriptive');
    }
    assert(threw, '2.5.2: Attempting to redeem non-existent item throws error cleanly');
    assert(combo.status === 'ACTIVE', '2.5.3: Combo status unmodified on failed redemption');
  }

  // ==========================================================================
  // GROUP 3: RECONSTITUTION MATRIX (Companion Sold vs Unsold, Cancel & 72h)
  // ==========================================================================
  console.log('\n======================================================');
  console.log(' GROUP 3: RECONSTITUTION MATRIX (COMPANION SOLD VS UNSOLD)');
  console.log('======================================================');

  // 3.1 Scenario: Companion UNSOLD on Cancellation -> Combo Reconstituted
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-REC-UNSOLD-CANCEL', displayName: 'Unsold Cancel', wiredPoints: 300 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockItem('u-canc-a', 'Item Alfa', 30.00, 32.00, 20); // cap = 32 * 0.20 = 6.40 USD -> 64 WP
    const itemB = createMockItem('u-canc-b', 'Item Beta', 40.00, 45.00, 20);
    const combo = new RewardModel({
      id: 'combo-rec-unsold-cancel',
      title: 'Combo Unsold Cancel Test',
      rewardType: 'COMBO',
      priceUsd: 60.00,
      pointsCost: 100,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    // Buy item A
    const voucher = await vm.redeemReward('combo-rec-unsold-cancel', 20, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'u-canc-a'
    });
    assert(vm.currentUser.wiredPoints === 280, '3.1.1: 20 WP debited on purchase');

    // Cancel voucher
    const cancelRes = await vm.cancelVoucher(voucher.voucherCode);
    assert(cancelRes.success === true, '3.1.2: cancelVoucher succeeded');
    assert(vm.currentUser.wiredPoints === 300, '3.1.3: 20 WP refunded to user balance');

    // Check catalog: Standalone item B must be DELETED
    const standaloneB = vm.catalog.find(r => r.id.includes('u-canc-b'));
    assert(!standaloneB, '3.1.4: Standalone item B deleted from catalog');

    // Check catalog: Original combo must be RESTORED to ACTIVE and stock = 1
    const restoredCombo = vm.catalog.find(r => r.id === 'combo-rec-unsold-cancel');
    assert(Boolean(restoredCombo), '3.1.5: Original combo exists in catalog');
    assert(restoredCombo.status === 'ACTIVE', '3.1.6: Restored combo is ACTIVE');
    assert(restoredCombo.stock === 1, '3.1.7: Restored combo stock is 1');
    assert(restoredCombo.getComboItems().length === 2, '3.1.8: Restored combo has both items');
  }

  // 3.2 Scenario: Companion SOLD on Cancellation -> Combo remains SOLD_OUT, canceled item published Standalone
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-REC-SOLD-CANCEL', displayName: 'Sold Cancel', wiredPoints: 300 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockItem('s-canc-a', 'Item Gamma', 25.00, 28.00, 10);
    const itemB = createMockItem('s-canc-b', 'Item Delta', 35.00, 40.00, 15);
    const combo = new RewardModel({
      id: 'combo-rec-sold-cancel',
      title: 'Combo Sold Cancel Test',
      rewardType: 'COMBO',
      priceUsd: 50.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    // Buy item A -> item B becomes standalone
    const voucher = await vm.redeemReward('combo-rec-sold-cancel', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 's-canc-a'
    });

    // Simulate companion item B being SOLD to another customer
    const standaloneB = vm.catalog.find(r => r.id.includes('s-canc-b') || r.title.includes('Item Delta'));
    assert(Boolean(standaloneB), '3.2.1: Standalone B was published');
    standaloneB.stock = 0;
    standaloneB.status = 'SOLD_OUT';
    await FirestoreService.saveReward(standaloneB.toJSON());

    // Now cancel voucher for item A
    await vm.cancelVoucher(voucher.voucherCode);

    // Combo MUST NOT be restored because companion B is SOLD OUT!
    const origCombo = vm.catalog.find(r => r.id === 'combo-rec-sold-cancel');
    assert(origCombo.status === 'SOLD_OUT', '3.2.2: Combo MUST remain SOLD_OUT when companion is sold');
    assert(origCombo.stock === 0, '3.2.3: Combo stock is 0');

    // Item A MUST be published as a NEW standalone product
    const standaloneA = vm.catalog.find(r =>
      (r.id.includes('s-canc-a') || r.title.includes('Item Gamma')) &&
      r.status === 'ACTIVE'
    );
    assert(Boolean(standaloneA), '3.2.4: Item A published as standalone product');
    assert(standaloneA.status === 'ACTIVE', '3.2.5: Published standalone A is ACTIVE');
    assert(standaloneA.stock === 1, '3.2.6: Published standalone A stock is 1');
    assert(standaloneA.priceUsd === 28.00, '3.2.7: Published standalone A price matches residualPriceUsd ($28.00)');
  }

  // 3.3 Scenario: Companion UNSOLD on 72h Expiry -> Combo Reconstituted
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-EXP-UNSOLD', displayName: 'Unsold 72h', wiredPoints: 500 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    // residualPriceUsd: 22.00, residualMaxDiscountPct: 20 -> max discount = 4.40 USD -> cap = 44 WP
    const itemA = createMockItem('u-exp-a', 'Item Omega', 20.00, 22.00, 20);
    const itemB = createMockItem('u-exp-b', 'Item Sigma', 20.00, 22.00, 20);
    const combo = new RewardModel({
      id: 'combo-exp-unsold',
      title: 'Combo Expire Unsold Test',
      rewardType: 'COMBO',
      priceUsd: 35.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    // Buy item A with 30 WP discount (within 44 WP cap)
    const voucher = await vm.redeemReward('combo-exp-unsold', 30, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'u-exp-a'
    });
    assert(vm.currentUser.wiredPoints === 470, '3.3.1: 30 WP debited on purchase');

    // Artificially age voucher past 72h (e.g. created 4 days ago, expired 1 day ago)
    voucher.createdAt = new Date(Date.now() - 4 * 864e5).toISOString();
    voucher.expiresAt = new Date(Date.now() - 1 * 864e5).toISOString();
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Run processExpiredVouchers
    const expCount = await vm.processExpiredVouchers();
    assert(expCount === 1, '3.3.2: 1 expired voucher processed');

    // Penalty check: spent 30 WP, penalty = 10 WP, refund = 20 WP
    // user had 470 -> should now have 470 + 20 = 490 WP
    assert(vm.currentUser.wiredPoints === 490, '3.3.3: User penalized 10 WP and refunded remaining 20 WP');

    // Combo must be restored to ACTIVE
    const restoredCombo = vm.catalog.find(r => r.id === 'combo-exp-unsold');
    assert(restoredCombo.status === 'ACTIVE', '3.3.4: Combo reconstituted to ACTIVE on 72h expiration');
    assert(restoredCombo.stock === 1, '3.3.5: Reconstituted combo stock is 1');
  }

  // 3.4 Scenario: Companion SOLD on 72h Expiry -> Combo remains SOLD_OUT, expired item published Standalone
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-EXP-SOLD', displayName: 'Sold 72h', wiredPoints: 500 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const itemA = createMockItem('s-exp-a', 'Item Theta', 15.00, 18.00, 10);
    const itemB = createMockItem('s-exp-b', 'Item Zeta', 25.00, 30.00, 10);
    const combo = new RewardModel({
      id: 'combo-exp-sold',
      title: 'Combo Expire Sold Test',
      rewardType: 'COMBO',
      priceUsd: 36.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: { items: [itemA, itemB] }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    // Buy item A
    const voucher = await vm.redeemReward('combo-exp-sold', 0, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 's-exp-a'
    });

    // Companion item B was bought by someone else
    const standaloneB = vm.catalog.find(r => r.id.includes('s-exp-b') || r.title.includes('Item Zeta'));
    standaloneB.stock = 0;
    standaloneB.status = 'SOLD_OUT';
    await FirestoreService.saveReward(standaloneB.toJSON());

    // Age voucher past 72h
    voucher.createdAt = new Date(Date.now() - 4 * 864e5).toISOString();
    voucher.expiresAt = new Date(Date.now() - 1 * 864e5).toISOString();
    await FirestoreService.saveVoucher(voucher.toJSON());

    // Run expiration sweep
    const expCount = await vm.processExpiredVouchers();
    assert(expCount === 1, '3.4.1: Voucher processed as expired');

    // Combo must remain SOLD_OUT
    const origCombo = vm.catalog.find(r => r.id === 'combo-exp-sold');
    assert(origCombo.status === 'SOLD_OUT', '3.4.2: Combo remains SOLD_OUT because companion was sold');

    // Item A must be published standalone
    const standaloneA = vm.catalog.find(r =>
      (r.id.includes('s-exp-a') || r.title.includes('Item Theta')) &&
      r.status === 'ACTIVE'
    );
    assert(Boolean(standaloneA), '3.4.3: Item A published as standalone product upon expiration');
    assert(standaloneA.priceUsd === 18.00, '3.4.4: Standalone A price is $18.00 (residualPriceUsd)');
  }

  // ==========================================================================
  // GROUP 4: ROUND-TRIP SERIALIZATION (RewardModel & VoucherModel)
  // ==========================================================================
  console.log('\n======================================================');
  console.log(' GROUP 4: ROUND-TRIP SERIALIZATION & WIRE INTEGRITY');
  console.log('======================================================');

  // 4.1 RewardModel Combo full serialization round-trip
  {
    const items = [
      createMockItem('rt-1', 'RT Item 1', 25.50, 30.00, 20),
      createMockItem('rt-2', 'RT Item 2', 40.00, 45.00, 25),
      createMockItem('rt-3', 'RT Item 3', 15.00, 18.00, 10)
    ];
    const originalReward = new RewardModel({
      id: 'rew-roundtrip-combo',
      title: 'Combo Round-Trip Pro',
      rewardType: 'COMBO',
      priceUsd: 65.00,
      pointsCost: 150,
      maxDiscountPct: 20,
      maxDiscountUsd: 13.00,
      stock: 1,
      status: 'ACTIVE',
      images: ['https://example.com/c1.jpg', 'https://example.com/c2.jpg'],
      comboData: { items }
    });

    // 1st Round: Model -> JSON object -> JSON string -> parsed object -> Model
    const json1 = originalReward.toJSON();
    const wireStr1 = JSON.stringify(json1);
    const parsed1 = JSON.parse(wireStr1);
    const deserialized1 = new RewardModel(parsed1);

    assert(deserialized1.id === originalReward.id, '4.1.1: id preserved across serialization');
    assert(deserialized1.rewardType === 'COMBO', '4.1.2: rewardType preserved as COMBO');
    assert(deserialized1.isCombo() === true, '4.1.3: isCombo() === true on deserialized instance');
    assert(deserialized1.getComboItems().length === 3, '4.1.4: All 3 combo items preserved');
    assert(deserialized1.priceUsd === 65.00, '4.1.5: priceUsd preserved (65.00)');

    const savingsOrig = originalReward.getComboSavings();
    const savingsDeser = deserialized1.getComboSavings();
    assert(savingsDeser.sumUsd === savingsOrig.sumUsd, '4.1.6: sumUsd identical after round-trip');
    assert(savingsDeser.savingsUsd === savingsOrig.savingsUsd, '4.1.7: savingsUsd identical after round-trip');
    assert(savingsDeser.savingsPct === savingsOrig.savingsPct, '4.1.8: savingsPct identical after round-trip');

    // 2nd Round: Model -> Wire -> Model (Idempotency)
    const json2 = deserialized1.toJSON();
    const deserialized2 = new RewardModel(JSON.parse(JSON.stringify(json2)));
    assert(deserialized2.isCombo() === true, '4.1.9: Second round-trip retains isCombo() === true');
    assert(deserialized2.getComboItems().length === 3, '4.1.10: Second round-trip retains items count');
  }

  // 4.2 Legacy backwards compatibility: comboData with itemA / itemB round-trip
  {
    const legacyData = {
      id: 'rew-legacy-combo',
      title: 'Legacy Duo',
      rewardType: 'COMBO',
      priceUsd: 30.00,
      comboData: {
        itemA: createMockItem('leg-a', 'Legacy A', 20.00),
        itemB: createMockItem('leg-b', 'Legacy B', 20.00)
      }
    };
    const legacyModel = new RewardModel(legacyData);
    assert(legacyModel.isCombo() === true, '4.2.1: Legacy model parses itemA and itemB as combo');
    assert(legacyModel.getComboItems().length === 2, '4.2.2: getComboItems returns 2 items');

    // Round-trip wire serialization
    const wireStr = JSON.stringify(legacyModel.toJSON());
    const restored = new RewardModel(JSON.parse(wireStr));
    assert(restored.isCombo() === true, '4.2.3: Restored legacy model has isCombo() === true');
    assert(restored.getComboItems().length === 2, '4.2.4: Restored legacy model items count is 2');
  }

  // 4.3 Standalone reward with dissolvedFromCombo metadata round-trip
  {
    const standaloneData = {
      id: 'rew-standalone-dissolved',
      title: 'Dissolved Companion',
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 45.00,
      dissolvedFromCombo: {
        comboId: 'combo-parent-123',
        dissolvedAt: '2026-10-07T12:00:00.000Z',
        purchasedVoucherCode: 'CANJE-ABC-123',
        originalComboTitle: 'Combo Parent'
      }
    };
    const reward = new RewardModel(standaloneData);
    const wireStr = JSON.stringify(reward.toJSON());
    const restored = new RewardModel(JSON.parse(wireStr));

    assert(Boolean(restored.dissolvedFromCombo), '4.3.1: dissolvedFromCombo metadata preserved');
    assert(restored.dissolvedFromCombo.comboId === 'combo-parent-123', '4.3.2: comboId preserved');
    assert(restored.dissolvedFromCombo.purchasedVoucherCode === 'CANJE-ABC-123', '4.3.3: purchasedVoucherCode preserved');
  }

  // 4.4 VoucherModel round-trip serialization with comboOrigin and purchasedItem
  {
    const createdAtIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const voucherData = {
      voucherCode: 'CANJE-TEST-RT',
      userUid: 'U-RT-VOUCHER',
      userName: 'Wire Tester',
      rewardId: 'combo-parent-123',
      rewardTitle: 'Item Comprado (de Combo: Combo Parent)',
      rewardType: 'PARTIAL_DISCOUNT',
      pointsSpent: 50,
      priceUsd: 30.00,
      discountUsd: 5.00,
      cashToPayUsd: 25.00,
      createdAt: createdAtIso,
      expiresAt: expiresAtIso,
      comboOrigin: {
        comboId: 'combo-parent-123',
        originalTitle: 'Combo Parent',
        originalPriceUsd: 50.00,
        itemCount: 2,
        splitLevel: 'N_EQUALS_2_TO_STANDALONE',
        purchasedItemId: 'it-a',
        companionItemId: 'it-b'
      },
      purchasedItem: createMockItem('it-a', 'Item Alfa', 30.00, 35.00, 20)
    };

    const voucher = new VoucherModel(voucherData);
    assert(voucher.isComboVoucher() === true, '4.4.1: isComboVoucher() is true');
    assert(voucher.isSplitComboItemVoucher() === true, '4.4.2: isSplitComboItemVoucher() is true');
    assert(voucher.isFullComboVoucher() === false, '4.4.3: isFullComboVoucher() is false for split voucher');

    // Serialization round-trip
    const wireJson = JSON.stringify(voucher.toJSON());
    const restoredVoucher = new VoucherModel(JSON.parse(wireJson));

    assert(restoredVoucher.voucherCode === 'CANJE-TEST-RT', '4.4.4: voucherCode preserved');
    assert(restoredVoucher.isComboVoucher() === true, '4.4.5: isComboVoucher() preserved after wire');
    assert(restoredVoucher.isSplitComboItemVoucher() === true, '4.4.6: isSplitComboItemVoucher() preserved after wire');
    assert(restoredVoucher.comboOrigin.comboId === 'combo-parent-123', '4.4.7: comboOrigin.comboId preserved');
    assert(restoredVoucher.purchasedItem.id === 'it-a', '4.4.8: purchasedItem.id preserved');
    assert(restoredVoucher.expiresAt === expiresAtIso, '4.4.9: expiresAt preserved exactly without drift');
  }

  // ==========================================================================
  // GROUP 5: ADVERSARIAL STRESS ASSAULTS & IDEMPOTENCY
  // ==========================================================================
  console.log('\n======================================================');
  console.log(' GROUP 5: ADVERSARIAL STRESS ASSAULTS & IDEMPOTENCY');
  console.log('======================================================');

  // 5.1 Double cancellation rejection
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-DBL-CANCEL', wiredPoints: 200 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const combo = new RewardModel({
      id: 'combo-dbl-cancel',
      rewardType: 'COMBO',
      priceUsd: 40.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: {
        items: [createMockItem('d1', 'D1', 20, 20, 20), createMockItem('d2', 'D2', 20, 20, 20)]
      }
    });
    vm.catalog = [combo];

    const voucher = await vm.redeemReward('combo-dbl-cancel', 10, {
      selectionMode: 'SINGLE_ITEM',
      selectedItemId: 'd1'
    });
    assert(vm.currentUser.wiredPoints === 190, '5.1.1: 10 WP debited');

    // 1st cancel
    await vm.cancelVoucher(voucher.voucherCode);
    assert(vm.currentUser.wiredPoints === 200, '5.1.2: 10 WP refunded');

    // 2nd cancel attempt MUST THROW
    let threw = false;
    try {
      await vm.cancelVoucher(voucher.voucherCode);
    } catch (e) {
      threw = true;
      assert(e.message.includes('ya fue cancelado previamente'), '5.1.3: Error explains voucher already cancelled');
    }
    assert(threw, '5.1.4: Double cancel correctly rejected');
    assert(vm.currentUser.wiredPoints === 200, '5.1.5: Points NOT refunded twice');
  }

  // 5.2 Cancel already delivered voucher MUST THROW
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-DELIV-CANCEL', wiredPoints: 200 });
    vm.currentUser = user;
    const v = new VoucherModel({
      voucherCode: 'V-DELIV-1',
      userUid: user.uid,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString()
    });
    vm.vouchers = [v];

    let threw = false;
    try {
      await vm.cancelVoucher('V-DELIV-1');
    } catch (e) {
      threw = true;
      assert(e.message.includes('ya fue despachado y entregado'), '5.2.1: Rejection message accurate');
    }
    assert(threw, '5.2.2: Cannot cancel delivered voucher');
  }

  // 5.3 Cancel already paid voucher MUST THROW
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'U-PAID-CANCEL', wiredPoints: 200 });
    vm.currentUser = user;
    const v = new VoucherModel({
      voucherCode: 'V-PAID-1',
      userUid: user.uid,
      status: 'PAID',
      isPaid: true,
      cashToPayUsd: 50.00,
      paidAt: new Date().toISOString()
    });
    vm.vouchers = [v];

    let threw = false;
    try {
      await vm.cancelVoucher('V-PAID-1');
    } catch (e) {
      threw = true;
      assert(e.message.includes('ya fue pagado en efectivo'), '5.3.1: Rejection message accurate');
    }
    assert(threw, '5.3.2: Cannot cancel paid commercial voucher');
  }

  // 5.4 72h Commercial Expiration strict rule:
  // Paid vouchers and $0 cash vouchers NEVER expire, even if createdAt is 30 days ago
  {
    const freeVoucher = new VoucherModel({
      voucherCode: 'V-FREE-OLD',
      rewardType: 'FREE_REWARD',
      cashToPayUsd: 0,
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString()
    });
    assert(freeVoucher.expiresAt === null, '5.4.1: Free reward expiresAt is null');
    assert(freeVoucher.isExpired() === false, '5.4.2: Free reward isExpired() is false after 30 days');

    const paidVoucher = new VoucherModel({
      voucherCode: 'V-PAID-OLD',
      rewardType: 'COMBO',
      cashToPayUsd: 50.00,
      isPaid: true,
      status: 'PAID',
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString()
    });
    assert(paidVoucher.expiresAt === null, '5.4.3: Paid combo voucher expiresAt is null');
    assert(paidVoucher.isExpired() === false, '5.4.4: Paid combo voucher isExpired() is false after 30 days');
  }

  // 5.5 High-volume items combo (N = 25 items stress)
  {
    const bigItems = [];
    for (let i = 1; i <= 25; i++) {
      bigItems.push(createMockItem(`big-${i}`, `Item ${i}`, 10.00, 12.00, 15));
    }
    const bigCombo = new RewardModel({
      id: 'combo-big-25',
      rewardType: 'COMBO',
      priceUsd: 200.00, // sum is 250.00, 50.00 savings (20%)
      comboData: { items: bigItems }
    });
    assert(bigCombo.isCombo() === true, '5.5.1: 25-item combo isCombo() === true');
    assert(bigCombo.getComboItems().length === 25, '5.5.2: 25 items returned');
    const sav = bigCombo.getComboSavings();
    assert(sav.sumUsd === 250.00, '5.5.3: sumUsd is 250.00');
    assert(sav.savingsUsd === 50.00, '5.5.4: savingsUsd is 50.00');
    assert(sav.savingsPct === 20, '5.5.5: savingsPct is 20%');
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n======================================================');
  console.log('                 ADVERSARIAL SUITE SUMMARY            ');
  console.log('======================================================');
  console.log(`TOTAL ADVERSARIAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests} | FAILED: ${failedTests}`);

  if (failedTests > 0) {
    console.error('\nFAILURES DETECTED:');
    failureDetails.forEach(f => console.error(` - [FAIL] ${f.testName}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('\n>>> ALL ADVERSARIAL STRESS ASSERTIONS PASSED CLEANLY (100% EMPIRICAL CONFIRMATION) <<<');
    process.exit(0);
  }
}

runAdversarialSuite().catch(err => {
  console.error('CRITICAL UNCAUGHT ERROR IN HARNESS:', err);
  process.exit(1);
});
