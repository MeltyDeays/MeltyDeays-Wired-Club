/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER 2: DEEP STRESS & FUZZING HARNESS (M1)
 * ============================================================================
 * Independent verification harness probing hostile inputs, race conditions,
 * accounting leaks, and lifecycle reconstitution invariants.
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

export async function runDeepAdversarialSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   CHALLENGER 2: DEEP ADVERSARIAL FUZZING & RACE CONDITION SUITE    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  setupTestEnvironment('index.html');

  const { RewardModel } = await loadModule('js/models/RewardModel.js');
  const { VoucherModel } = await loadModule('js/models/VoucherModel.js');
  const { CustomerViewModel } = await loadModule('js/viewmodels/CustomerViewModel.js');
  const { FirestoreService } = await loadModule('js/services/FirestoreService.js');
  const { UserModel } = await loadModule('js/models/UserModel.js');

  let testCount = 0;
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  function assert(condition, testName, details = '') {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failCount++;
      failures.push({ testName, details });
      console.log(`  ✗ [FAIL] ${testName} - ${details}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 1: FUZZING POINTS TO APPLY (ADVERSARIAL INPUT INJECTIONS)
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 1] Fuzzing pointsToApply across all redemption modes...');
  {
    const fuzzInputs = [
      NaN,
      Infinity,
      -Infinity,
      -100,
      -0.0001,
      'NaN',
      'Infinity',
      '-50',
      'DROP TABLE rewards',
      '<script>alert(1)</script>',
      '0x10',
      '1e5',
      {},
      [],
      [50],
      null,
      undefined
    ];

    for (const input of fuzzInputs) {
      const vm = new CustomerViewModel();
      const user = new UserModel({ uid: `FUZZ-${String(input)}`, displayName: 'Fuzzer', wiredPoints: 500 });
      vm.currentUser = user;
      await FirestoreService.saveUser(user.toJSON());

      const combo = new RewardModel({
        id: `COMBO-FUZZ-${String(input).slice(0, 8)}`,
        title: 'Fuzz Combo',
        rewardType: 'COMBO',
        priceUsd: 100.00,
        pointsCost: 200,
        maxDiscountPct: 20,
        maxDiscountUsd: 20.00,
        stock: 5,
        status: 'ACTIVE',
        comboData: {
          items: [
            { id: 'f-1', title: 'Item 1', priceUsd: 60.00, residualPriceUsd: 60.00, residualMaxDiscountPct: 20 },
            { id: 'f-2', title: 'Item 2', priceUsd: 50.00, residualPriceUsd: 50.00, residualMaxDiscountPct: 20 }
          ]
        }
      });
      vm.catalog = [combo];
      await FirestoreService.saveReward(combo.toJSON());

      // Attempt full combo redemption with fuzz input
      try {
        const voucher = await vm.redeemReward(combo.id, input, { selectionMode: 'FULL_COMBO' });
        const validCash = Number.isFinite(voucher.cashToPayUsd) && voucher.cashToPayUsd >= 80.00;
        const validPoints = Number.isFinite(voucher.pointsSpent) && voucher.pointsSpent >= 0 && voucher.pointsSpent <= 200;
        const validUserBalance = Number.isFinite(vm.currentUser.wiredPoints) && vm.currentUser.wiredPoints >= 300 && vm.currentUser.wiredPoints <= 500;

        assert(validCash && validPoints && validUserBalance,
          `Fuzz pointsToApply with [${String(input)}] (Full Combo)`,
          `cashToPayUsd: ${voucher.cashToPayUsd}, pointsSpent: ${voucher.pointsSpent}, userBalance: ${vm.currentUser.wiredPoints}`);
      } catch (err) {
        // Rejecting bad input cleanly with an error is also safe
        assert(true, `Fuzz pointsToApply [${String(input)}] safely rejected: ${err.message}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: MASSIVE CONCURRENT CANCELLATION STRESS (20 PARALLEL CALLS)
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Massive concurrent cancellation attack (20 parallel requests)...');
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'RACE-STRESS-USER', displayName: 'Race Target', wiredPoints: 1000 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const item = new RewardModel({
      id: 'RACE-STRESS-ITEM',
      title: 'Stress Item',
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 100.00,
      pointsCost: 200,
      maxDiscountPct: 20,
      maxDiscountUsd: 20.00,
      stock: 5,
      status: 'ACTIVE'
    });
    vm.catalog = [item];
    await FirestoreService.saveReward(item.toJSON());

    const voucher = await vm.redeemReward(item.id, 200);
    assert(vm.currentUser.wiredPoints === 800, 'User points deducted to 800 after redeem');

    // Launch 20 simultaneous cancellations
    const promises = Array.from({ length: 20 }, () => vm.cancelVoucher(voucher.voucherCode));
    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert(fulfilled.length === 1, `Exactly 1 cancellation succeeds (got ${fulfilled.length}/20)`);
    assert(rejected.length === 19, `Remaining 19 cancellations rejected (got ${rejected.length}/20)`);
    assert(vm.currentUser.wiredPoints === 1000, `Final points balance restored to exactly 1000 with 0 leaks (got ${vm.currentUser.wiredPoints})`);

    const persistedVoucher = await FirestoreService.getVoucher(voucher.voucherCode);
    assert(persistedVoucher.status === 'CANCELLED', 'Persisted voucher has status CANCELLED');
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: INVARIANT VERIFICATION: $0 CASH VS COMMERCIAL 72H EXPIRY
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] 72-Hour Expiration & Penalty Invariants ($0 vs Cash Owed)...');
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'INVARIANT-USER', displayName: 'Invariant User', wiredPoints: 500 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

    // Case A: 100% Free Voucher ($0 cash owed) created 5 days ago
    const vFree = new VoucherModel({
      voucherCode: 'INVARIANT-FREE-1',
      userUid: user.uid,
      rewardTitle: 'Free Combo',
      rewardType: 'COMBO',
      cashToPayUsd: 0,
      priceUsd: 25.00,
      discountUsd: 25.00,
      pointsSpent: 100,
      isPaid: false,
      createdAt: fiveDaysAgo
    });
    assert(vFree.expiresAt === null, 'Free voucher ($0 cash) has expiresAt === null upon creation');
    assert(vFree.isCommercial() === false, 'Free voucher ($0 cash) isCommercial() === false');

    // Case B: Commercial Voucher ($10 cash owed) created 5 days ago
    const vCommercial = new VoucherModel({
      voucherCode: 'INVARIANT-COMMERCIAL-1',
      userUid: user.uid,
      rewardTitle: 'Commercial Combo',
      rewardType: 'COMBO',
      cashToPayUsd: 10.00,
      priceUsd: 25.00,
      discountUsd: 15.00,
      pointsSpent: 50,
      isPaid: false,
      createdAt: fiveDaysAgo
    });
    assert(vCommercial.expiresAt !== null, 'Commercial voucher ($10 cash owed) has valid expiresAt');
    assert(vCommercial.isCommercial() === true, 'Commercial voucher ($10 cash owed) isCommercial() === true');

    // Run expiration process
    vm.vouchers = [vFree, vCommercial];
    await FirestoreService.saveVoucher(vFree.toJSON());
    await FirestoreService.saveVoucher(vCommercial.toJSON());

    const expiredCount = await vm.processExpiredVouchers();

    assert(expiredCount === 1, `Exactly 1 voucher expired (commercial only, got ${expiredCount})`);
    
    // Free voucher must remain untouched
    const freshFree = await FirestoreService.getVoucher(vFree.voucherCode);
    assert(freshFree.status !== 'EXPIRED', 'Free voucher was NOT marked EXPIRED');

    // Commercial voucher must be marked EXPIRED with 10 WP penalty
    const freshCommercial = await FirestoreService.getVoucher(vCommercial.voucherCode);
    const freshCommercialModel = new VoucherModel(freshCommercial);
    assert(freshCommercial.status === 'EXPIRED', 'Commercial voucher WAS marked EXPIRED');
    assert(freshCommercialModel.penaltyPoints === 10, 'Commercial voucher recorded 10 penalty points');

    // Check user points: initial 500. Spent 50 on commercial. Refund 50 - 10 penalty = 40. New balance = 540.
    assert(vm.currentUser.wiredPoints === 540, `User balance reflects 10 WP penalty and 40 WP refund (expected 540, got ${vm.currentUser.wiredPoints})`);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 4: DOUBLE REDEEM & STOCK BOUNDARY INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Stock boundary and single-stock double redeem prevention...');
  {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: 'STOCK-USER', displayName: 'Stock Tester', wiredPoints: 1000 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const uniqueCombo = new RewardModel({
      id: 'UNIQUE-STOCK-COMBO',
      title: 'Rare 1-of-1 Combo',
      rewardType: 'COMBO',
      priceUsd: 50.00,
      stock: 1,
      status: 'ACTIVE',
      comboData: {
        items: [
          { id: 'u-1', title: 'Part A', priceUsd: 30.00 },
          { id: 'u-2', title: 'Part B', priceUsd: 25.00 }
        ]
      }
    });
    vm.catalog = [uniqueCombo];
    await FirestoreService.saveReward(uniqueCombo.toJSON());

    // First redemption succeeds
    const v1 = await vm.redeemReward(uniqueCombo.id, 0, { selectionMode: 'FULL_COMBO' });
    assert(v1 !== null, 'First redemption succeeds');
    assert(uniqueCombo.stock === 0, 'Combo stock decrements to 0');
    assert(uniqueCombo.status === 'SOLD_OUT', 'Combo marked SOLD_OUT');

    // Second redemption must fail due to zero stock
    let secondRedeemFailed = false;
    try {
      await vm.redeemReward(uniqueCombo.id, 0, { selectionMode: 'FULL_COMBO' });
    } catch (e) {
      secondRedeemFailed = true;
    }
    assert(secondRedeemFailed, 'Second redemption on 0-stock combo throws Error');
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL DEEP STRESS TESTS: ${testCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('======================================================\n');

  if (failures.length > 0) {
    console.log('FAILED DETAILS:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.testName}: ${f.details}`));
  }

  return { testCount, passCount, failCount, failures };
}

if (process.argv[1] && process.argv[1].endsWith('adversarial_challenger_2_m1_deep.mjs')) {
  runDeepAdversarialSuite()
    .then(res => {
      process.exit(res.failCount === 0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal deep test error:', err);
      process.exit(1);
    });
}
