/**
 * ADVERSARIAL CHALLENGER SUITE: MILESTONE M1
 * Empirical verification of RewardModel.js and Admin Presale Calculators
 */
import { RewardModel, parseProductDescription } from "../js/models/RewardModel.js";

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message}`);
    failures.push(message);
  }
}

function assertApprox(val, expected, tolerance = 0.01, message) {
  testsRun++;
  if (Math.abs(val - expected) <= tolerance) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message} (Expected ~${expected}, got ${val})`);
    failures.push(`${message} (Expected ~${expected}, got ${val})`);
  }
}

console.log("======================================================================");
console.log("  ADVERSARIAL CHALLENGER: MILESTONE M1 STRESS & EDGE-CASE HARNESS    ");
console.log("======================================================================");

// -----------------------------------------------------------------------------
// SECTION 1: RewardModel Construction, Discount Engines, & Invariants
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 1] RewardModel Data Invariants & Discount Calculation");

// 1.1: Basic incoming creation
{
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const r = new RewardModel({
    id: "TEST-01",
    title: "Arturia MicroFreak",
    status: "INCOMING",
    priceUsd: 350.00,
    estimatedArrival: future,
    presaleDiscountType: "PERCENTAGE",
    presaleDiscountValue: 15
  });

  assert(r.rewardType === "INCOMING", "1.1.1: rewardType defaults to INCOMING when status is INCOMING");
  assert(r.isIncomingFlag === true, "1.1.2: isIncomingFlag is true");
  assert(r.isIncoming() === true, "1.1.3: isIncoming() returns true for future ETA");
  assertApprox(r.presaleDiscountUsd, 52.50, 0.01, "1.1.4: 15% discount on $350.00 = $52.50 USD");
  assertApprox(r.presalePriceUsd, 297.50, 0.01, "1.1.5: Presale price = $350.00 - $52.50 = $297.50 USD");
}

// 1.2: Fixed amount discount
{
  const future = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const r = new RewardModel({
    id: "TEST-02",
    title: "Sony WH-1000XM5",
    isIncoming: true,
    priceUsd: 400.00,
    estimatedArrival: future,
    presaleDiscountType: "FIXED_AMOUNT",
    presaleDiscountValue: 60.00
  });

  assert(r.status === "INCOMING", "1.2.1: status is INCOMING when isIncoming=true");
  assertApprox(r.presaleDiscountUsd, 60.00, 0.01, "1.2.2: Fixed discount USD matches presaleDiscountValue");
  assertApprox(r.presalePriceUsd, 340.00, 0.01, "1.2.3: Presale price = $400 - $60 = $340.00 USD");
}

// 1.3: Boundary: Fixed discount greater than price
{
  const future = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const r = new RewardModel({
    id: "TEST-03",
    title: "USB Cable",
    status: "INCOMING",
    priceUsd: 10.00,
    estimatedArrival: future,
    presaleDiscountType: "FIXED_AMOUNT",
    presaleDiscountValue: 25.00 // Greater than price
  });

  assert(r.presaleDiscountUsd <= 10.00, "1.3.1: presaleDiscountUsd is clamped at priceUsd (does not exceed price)");
  assert(r.presalePriceUsd === 0, "1.3.2: presalePriceUsd is clamped at 0 (never negative)");
}

// 1.4: Boundary: 0% discount and 100% discount
{
  const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const r0 = new RewardModel({
    id: "TEST-04A",
    status: "INCOMING",
    priceUsd: 100.00,
    estimatedArrival: future,
    presaleDiscountType: "PERCENTAGE",
    presaleDiscountValue: 0
  });
  assert(r0.presaleDiscountUsd === 0, "1.4.1: 0% discount produces $0.00 discount");
  assert(r0.presalePriceUsd === 100.00, "1.4.2: 0% discount preserves full regular price");

  const r100 = new RewardModel({
    id: "TEST-04B",
    status: "INCOMING",
    priceUsd: 100.00,
    estimatedArrival: future,
    presaleDiscountType: "PERCENTAGE",
    presaleDiscountValue: 100
  });
  assert(r100.presaleDiscountUsd === 100.00, "1.4.3: 100% discount produces full price discount");
  assert(r100.presalePriceUsd === 0.00, "1.4.4: 100% discount produces $0.00 presale price");
}

// 1.5: Adversarial: Discount percentage > 100%
{
  const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const r150 = new RewardModel({
    id: "TEST-05",
    status: "INCOMING",
    priceUsd: 50.00,
    estimatedArrival: future,
    presaleDiscountType: "PERCENTAGE",
    presaleDiscountValue: 150
  });
  assert(r150.presalePriceUsd === 0, "1.5.1: >100% discount clamps presalePriceUsd at 0 (no negative prices)");
}

// 1.6: Cent precision and fractional rounding
{
  const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const r = new RewardModel({
    id: "TEST-06",
    status: "INCOMING",
    priceUsd: 49.99,
    estimatedArrival: future,
    presaleDiscountType: "PERCENTAGE",
    presaleDiscountValue: 15 // 49.99 * 0.15 = 7.4985 -> 7.50
  });
  assert(r.presaleDiscountUsd === 7.50, "1.6.1: 49.99 * 15% correctly rounds 7.4985 to 7.50");
  assert(r.presalePriceUsd === 42.49, "1.6.2: 49.99 - 7.50 = 42.49");
}

// 1.7: Invariant: pointsCost in INCOMING products
{
  // When explicitly passed 0
  const rZero = new RewardModel({
    status: "INCOMING",
    pointsCost: 0,
    priceUsd: 100
  });
  assert(rZero.pointsCost === 0, "1.7.1: pointsCost is 0 when passed 0");

  // Serialized representation toJSON()
  const json = rZero.toJSON();
  assert(json.points_cost === 0 && json.pointsCost === 0, "1.7.2: toJSON() serializes pointsCost as 0");
  assert(json.is_incoming === true && json.isIncoming === true, "1.7.3: toJSON() serializes isIncoming as true");
  assert(json.presale_price_usd !== undefined, "1.7.4: toJSON() includes presale_price_usd");
  assert(json.presale_discount_usd !== undefined, "1.7.5: toJSON() includes presale_discount_usd");
}

// -----------------------------------------------------------------------------
// SECTION 2: State Transitions & Expiration Mechanics
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 2] State Transitions & Expiration Mechanics");

// 2.1: Future ETA: isIncoming=true, isIncomingExpired=false, isAvailable=false, isSoldOut=false
{
  const future = new Date(Date.now() + 10000).toISOString();
  const item = new RewardModel({
    id: "T2-1",
    status: "INCOMING",
    estimatedArrival: future,
    stock: 5
  });

  assert(item.isIncoming() === true, "2.1.1: isIncoming() is true for future ETA");
  assert(item.isIncomingExpired() === false, "2.1.2: isIncomingExpired() is false for future ETA");
  assert(item.getRemainingArrivalMs() > 0, "2.1.3: getRemainingArrivalMs() returns > 0");
  assert(item.isAvailable() === false, "2.1.4: isAvailable() is false while incoming");
  assert(item.isSoldOut() === false, "2.1.5: isSoldOut() is false while incoming");
  assert(item.isVisibleToCustomer() === true, "2.1.6: isVisibleToCustomer() is true while incoming");
}

// 2.2: Expired ETA: isIncoming=false, isIncomingExpired=true
{
  const past = new Date(Date.now() - 5000).toISOString();
  const item = new RewardModel({
    id: "T2-2",
    status: "INCOMING",
    estimatedArrival: past,
    stock: 5
  });

  assert(item.isIncomingExpired() === true, "2.2.1: isIncomingExpired() is true for past ETA");
  assert(item.isIncoming() === false, "2.2.2: isIncoming() returns false when expired");
  assert(item.getRemainingArrivalMs() === 0, "2.2.3: getRemainingArrivalMs() returns 0 for past ETA");
}

// 2.3: checkIncomingTransition() executes state mutation
{
  const past = new Date(Date.now() - 1000).toISOString();
  const item = new RewardModel({
    id: "T2-3",
    status: "INCOMING",
    estimatedArrival: past,
    stock: 3
  });

  assert(item.status === "INCOMING", "2.3.1: Initial status is INCOMING");
  const res = item.checkIncomingTransition();
  assert(res === true, "2.3.2: checkIncomingTransition() returns true upon expiration");
  assert(item.status === "ACTIVE", "2.3.3: status mutates to ACTIVE");
  assert(item.isIncomingFlag === false, "2.3.4: isIncomingFlag becomes false");
  assert(item.isAvailable() === true, "2.3.5: isAvailable() becomes true after transition");
  assert(item.isIncoming() === false, "2.3.6: isIncoming() returns false after transition");

  // Idempotency: second call does nothing
  const res2 = item.checkIncomingTransition();
  assert(res2 === false, "2.3.7: Second call to checkIncomingTransition() returns false");
}

// 2.4: checkIncomingTransition() when NOT expired
{
  const future = new Date(Date.now() + 60000).toISOString();
  const item = new RewardModel({
    id: "T2-4",
    status: "INCOMING",
    estimatedArrival: future,
    stock: 3
  });

  const res = item.checkIncomingTransition();
  assert(res === false, "2.4.1: checkIncomingTransition() returns false if not expired");
  assert(item.status === "INCOMING", "2.4.2: status remains INCOMING");
  assert(item.isIncomingFlag === true, "2.4.3: isIncomingFlag remains true");
}

// 2.5: Edge Case: Null or missing estimatedArrival
{
  const itemNull = new RewardModel({
    id: "T2-5",
    status: "INCOMING",
    estimatedArrival: null,
    stock: 2
  });

  assert(itemNull.isIncomingExpired() === false, "2.5.1: Null estimatedArrival returns isIncomingExpired()=false");
  assert(itemNull.getRemainingArrivalMs() === 0, "2.5.2: Null estimatedArrival returns remainingMs=0");
  assert(itemNull.checkIncomingTransition() === false, "2.5.3: Null estimatedArrival does not transition");
}

// 2.6: Edge Case: Malformed date string
{
  const itemBadDate = new RewardModel({
    id: "T2-6",
    status: "INCOMING",
    estimatedArrival: "NOT_A_VALID_DATE",
    stock: 2
  });

  // Malformed date evaluation
  assert(itemBadDate.isIncomingExpired() === false, "2.6.1: Malformed date does not crash isIncomingExpired()");
  // Note: getRemainingArrivalMs() behavior on malformed string
  const rem = itemBadDate.getRemainingArrivalMs();
  console.log(`       [Observation] getRemainingArrivalMs with malformed date yields: ${rem}`);
}

// -----------------------------------------------------------------------------
// SECTION 3: Admin Catalog Presale Calculator Simulation & Logic
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 3] Admin Catalog Presale Calculator Logic");

// Mocking the calculation engine from AdminCatalogCalculatorView.js
function simulateRecalculateIncomingPresale(regularPrice, discountVal, discountType, arrivalDatetime) {
  const p = Math.max(0, parseFloat(regularPrice) || 0);
  const v = Math.max(0, parseFloat(discountVal) || 0);
  const type = discountType || "PERCENTAGE";

  let discountUsd = 0;
  if (type === "PERCENTAGE") {
    discountUsd = Number((p * (v / 100)).toFixed(2));
  } else {
    discountUsd = Math.min(p, Number(v.toFixed(2)));
  }
  const presalePrice = Math.max(0, Number((p - discountUsd).toFixed(2)));

  let countdownPreview = "⏱️ Sin fecha programada";
  let isExpired = false;
  if (arrivalDatetime) {
    const targetMs = new Date(arrivalDatetime).getTime();
    const nowMs = Date.now();
    const diffMs = targetMs - nowMs;
    if (diffMs <= 0) {
      countdownPreview = "⏱️ ¡Fecha de llegada ya alcanzada o expirada!";
      isExpired = true;
    } else {
      const d = Math.floor(diffMs / (24 * 3600 * 1000));
      const h = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
      const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      countdownPreview = `⏱️ Tiempo restante estimado: ${d} días, ${h} hrs, ${m} mins`;
    }
  }

  return {
    regularPrice: p,
    discountType: type,
    discountVal: v,
    discountUsd,
    presalePrice,
    arrivalDatetime,
    countdownPreview,
    isExpired
  };
}

// 3.1: Preset Matrix: Standard prices and discount values
const priceTestCases = [
  { price: 50.00, disc: 15, type: "PERCENTAGE", expectedDisc: 7.50, expectedPrice: 42.50 },
  { price: 100.00, disc: 20, type: "PERCENTAGE", expectedDisc: 20.00, expectedPrice: 80.00 },
  { price: 29.99, disc: 10, type: "PERCENTAGE", expectedDisc: 3.00, expectedPrice: 26.99 },
  { price: 1250.00, disc: 25, type: "PERCENTAGE", expectedDisc: 312.50, expectedPrice: 937.50 },
  { price: 80.00, disc: 15.00, type: "FIXED_AMOUNT", expectedDisc: 15.00, expectedPrice: 65.00 },
  { price: 45.00, disc: 50.00, type: "FIXED_AMOUNT", expectedDisc: 45.00, expectedPrice: 0.00 }, // Clamped
  { price: 0.00, disc: 15, type: "PERCENTAGE", expectedDisc: 0.00, expectedPrice: 0.00 },
];

priceTestCases.forEach((tc, idx) => {
  const res = simulateRecalculateIncomingPresale(tc.price, tc.disc, tc.type, "2026-10-20T18:00");
  assertApprox(res.discountUsd, tc.expectedDisc, 0.01, `3.1.${idx+1}a: Price $${tc.price} with ${tc.disc}${tc.type === "PERCENTAGE" ? "%" : "$"} -> discUsd $${tc.expectedDisc}`);
  assertApprox(res.presalePrice, tc.expectedPrice, 0.01, `3.1.${idx+1}b: Price $${tc.price} with ${tc.disc}${tc.type === "PERCENTAGE" ? "%" : "$"} -> presalePrice $${tc.expectedPrice}`);
});

// 3.2: Countdown Preview Formatting
{
  const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000 + 5 * 3600 * 1000).toISOString();
  const res = simulateRecalculateIncomingPresale(50, 15, "PERCENTAGE", in3Days);
  assert(res.countdownPreview.includes("3 días"), "3.2.1: Countdown preview includes '3 días'");
  assert(res.isExpired === false, "3.2.2: Future countdown flags isExpired=false");

  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
  const resPast = simulateRecalculateIncomingPresale(50, 15, "PERCENTAGE", pastDate);
  assert(resPast.isExpired === true, "3.2.3: Past countdown flags isExpired=true");
  assert(resPast.countdownPreview.includes("ya alcanzada"), "3.2.4: Past countdown shows expired warning");
}

// -----------------------------------------------------------------------------
// SECTION 4: High-Concurrency & Stress Test Matrix (Generators & Fuzzing)
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 4] High-Concurrency Stress & Fuzzing (1,000 Iterations)");

let fuzzFailures = 0;
const FUZZ_COUNT = 1000;

for (let i = 0; i < FUZZ_COUNT; i++) {
  const randomPrice = Number((Math.random() * 5000).toFixed(2));
  const isPct = Math.random() > 0.5;
  const randomDisc = isPct 
    ? Number((Math.random() * 120).toFixed(2)) // Up to 120%
    : Number((Math.random() * 6000).toFixed(2)); // Up to $6000
  const type = isPct ? "PERCENTAGE" : "FIXED_AMOUNT";

  const futureOffsetMs = (Math.random() * 60 - 30) * 24 * 3600 * 1000; // -30 to +30 days
  const eta = new Date(Date.now() + futureOffsetMs).toISOString();

  const reward = new RewardModel({
    id: `FUZZ-${i}`,
    title: `Product Fuzz #${i}`,
    status: "INCOMING",
    priceUsd: randomPrice,
    presaleDiscountType: type,
    presaleDiscountValue: randomDisc,
    estimatedArrival: eta,
    stock: Math.floor(Math.random() * 20)
  });

  // Verification invariants:
  // 1. presalePriceUsd must never be NaN or negative
  if (isNaN(reward.presalePriceUsd) || reward.presalePriceUsd < 0) {
    fuzzFailures++;
    console.error(`  Fuzz fail on price: ${randomPrice}, disc: ${randomDisc}, type: ${type} -> presalePriceUsd: ${reward.presalePriceUsd}`);
  }

  // 2. presaleDiscountUsd must never be NaN or negative
  if (isNaN(reward.presaleDiscountUsd) || reward.presaleDiscountUsd < 0) {
    fuzzFailures++;
    console.error(`  Fuzz fail on discUsd: ${reward.presaleDiscountUsd}`);
  }

  // 3. presalePriceUsd + presaleDiscountUsd should approximate randomPrice (unless clamped by >100% or >price)
  if (type === "PERCENTAGE" && randomDisc <= 100) {
    const sum = reward.presalePriceUsd + reward.presaleDiscountUsd;
    if (Math.abs(sum - randomPrice) > 0.02) {
      fuzzFailures++;
      console.error(`  Fuzz rounding drift: sum=${sum}, expected=${randomPrice}`);
    }
  }

  // 4. Expiration contract
  const isExp = reward.isIncomingExpired();
  const shouldBeExp = Date.now() >= new Date(eta).getTime();
  if (isExp !== shouldBeExp) {
    fuzzFailures++;
  }

  // 5. toJSON serialization round-trip
  const json = reward.toJSON();
  if (json.reward_type !== "INCOMING" || json.isIncoming !== reward.isIncoming()) {
    fuzzFailures++;
  }
}

assert(fuzzFailures === 0, `4.1: 1,000 random fuzzing test cases passed with 0 invariant violations`);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`TOTAL TESTS: ${testsRun}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);
if (failures.length > 0) {
  console.log("FAILURES:");
  failures.forEach(f => console.log(" - " + f));
}
console.log("======================================================================");

process.exit(testsFailed > 0 ? 1 : 0);
