import { setupTestEnvironment } from './e2e/harness.mjs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const loadModule = (relativePath) => {
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, relativePath)).href;
  return import(`${fileUrl}?t=${Date.now()}`);
};

async function runDeepInvariants() {
  console.log('=== EMPIRICAL CHALLENGER DEEP INVARIANTS ASSAULT ===');
  setupTestEnvironment('index.html');

  const { RewardModel } = await loadModule('js/models/RewardModel.js');
  const { VoucherModel } = await loadModule('js/models/VoucherModel.js');
  const { CustomerViewModel } = await loadModule('js/viewmodels/CustomerViewModel.js');
  const { FirestoreService } = await loadModule('js/services/FirestoreService.js');
  const { UserModel } = await loadModule('js/models/UserModel.js');

  let passed = 0;
  let failed = 0;

  function assert(cond, name) {
    if (cond) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. pointsToApply Hostile Inputs (Negative, Infinity, String, Object)
  console.log('\n[ASSAULT 1] Hostile pointsToApply inputs');
  const hostileInputs = [-100, -0.001, '-50', 'Infinity', Infinity, -Infinity, NaN, 'NaN', 'undefined', {}, [100]];
  for (const input of hostileInputs) {
    const vm = new CustomerViewModel();
    const user = new UserModel({ uid: `HUSER-${String(input)}`, wiredPoints: 500 });
    vm.currentUser = user;
    await FirestoreService.saveUser(user.toJSON());

    const combo = new RewardModel({
      id: `C-HOSTILE-${String(input)}`,
      rewardType: 'COMBO',
      priceUsd: 100,
      pointsCost: 200,
      maxDiscountPct: 20,
      maxDiscountUsd: 20,
      stock: 1,
      status: 'ACTIVE',
      comboData: {
        items: [
          { id: 'i1', priceUsd: 60 },
          { id: 'i2', priceUsd: 40 }
        ]
      }
    });
    vm.catalog = [combo];
    await FirestoreService.saveReward(combo.toJSON());

    const voucher = await vm.redeemReward(combo.id, input, { selectionMode: 'FULL_COMBO' });
    
    // Invariants:
    // voucher.cashToPayUsd must be >= 80 (since max discount is 20 USD, cash cannot drop below 80)
    // voucher.cashToPayUsd must NOT be 0
    // voucher.pointsSpent must be between 0 and 200
    // user balance must NOT increase
    assert(voucher.cashToPayUsd >= 80, `Input [${String(input)}] cashToPayUsd >= 80 (got ${voucher.cashToPayUsd})`);
    assert(voucher.pointsSpent >= 0 && voucher.pointsSpent <= 200, `Input [${String(input)}] pointsSpent in [0, 200] (got ${voucher.pointsSpent})`);
    assert(user.wiredPoints <= 500, `Input [${String(input)}] user balance did not increase (got ${user.wiredPoints})`);
  }

  // 2. High concurrency cancellation stress (10 concurrent calls)
  console.log('\n[ASSAULT 2] 10 Concurrent cancelVoucher calls');
  {
    const vm = new CustomerViewModel();
    const raceUser = new UserModel({ uid: 'RACE-10-USER', wiredPoints: 1000 });
    vm.currentUser = raceUser;
    await FirestoreService.saveUser(raceUser.toJSON());

    const item = new RewardModel({
      id: 'REW-RACE-10',
      rewardType: 'PARTIAL_DISCOUNT',
      priceUsd: 100,
      pointsCost: 100,
      maxDiscountPct: 20,
      maxDiscountUsd: 20,
      stock: 5,
      status: 'ACTIVE'
    });
    vm.catalog = [item];
    await FirestoreService.saveReward(item.toJSON());

    const voucher = await vm.redeemReward('REW-RACE-10', 100);
    assert(vm.currentUser.wiredPoints === 900, 'Balance is 900 after redeem 100 WP');

    // 10 concurrent cancel calls
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => vm.cancelVoucher(voucher.voucherCode)));
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert(fulfilled.length === 1, `Exactly 1 cancel succeeded (got ${fulfilled.length})`);
    assert(rejected.length === 9, `Exactly 9 cancels rejected (got ${rejected.length})`);
    assert(vm.currentUser.wiredPoints === 1000, `Final points strictly 1000 without duplication (got ${vm.currentUser.wiredPoints})`);
  }

  // 3. Expiration invariants on Free vs Paid vouchers
  console.log('\n[ASSAULT 3] Free vs Paid voucher 72h expiration invariants');
  {
    const vFree = new VoucherModel({
      voucherCode: 'V-FREE-1',
      rewardType: 'COMBO',
      priceUsd: 50,
      cashToPayUsd: 0,
      pointsSpent: 50,
      isPaid: false
    });
    assert(vFree.expiresAt === null, 'Free combo voucher expiresAt is strictly null');
    assert(vFree.isCommercial() === false, 'Free combo voucher isCommercial is false');
    assert(vFree.isExpired() === false, 'Free combo voucher isExpired is false');

    const vPaid = new VoucherModel({
      voucherCode: 'V-PAID-1',
      rewardType: 'COMBO',
      priceUsd: 50,
      cashToPayUsd: 40,
      pointsSpent: 10,
      isPaid: false
    });
    assert(vPaid.expiresAt !== null, 'Paid combo voucher with cashToPayUsd > 0 has expiresAt');
    assert(vPaid.isCommercial() === true, 'Paid combo voucher with cashToPayUsd > 0 isCommercial is true');
    assert(vPaid.isExpired() === false, 'Fresh commercial voucher isExpired is false');

    // Mark paid
    vPaid.markPaid('admin');
    assert(vPaid.expiresAt === null, 'After markPaid, expiresAt is reset to null');
    assert(vPaid.isExpired() === false, 'Paid voucher isExpired is false');
  }

  // 4. getComboSavings NaN and precision bounds
  console.log('\n[ASSAULT 4] getComboSavings resilience');
  {
    const r = new RewardModel({
      id: 'C-RES',
      rewardType: 'COMBO',
      priceUsd: 'NaN',
      comboData: {
        items: [
          { id: 'i1', priceUsd: undefined },
          { id: 'i2', priceUsd: null },
          { id: 'i3', priceUsd: 'invalid' }
        ]
      }
    });
    const sav = r.getComboSavings();
    assert(sav.sumUsd === 0, `sumUsd is 0 (got ${sav.sumUsd})`);
    assert(sav.savingsUsd === 0, `savingsUsd is 0 (got ${sav.savingsUsd})`);
    assert(sav.savingsPct === 0, `savingsPct is 0 (got ${sav.savingsPct})`);
    assert(!isNaN(sav.sumUsd) && !isNaN(sav.savingsUsd) && !isNaN(sav.savingsPct), 'Zero NaN values');
  }

  console.log(`\nTOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) process.exit(1);
}

runDeepInvariants().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
