import { setupTestEnvironment } from "./e2e/harness.mjs";
import { RewardModel } from "../js/models/RewardModel.js";
import { CustomerViewModel } from "../js/viewmodels/CustomerViewModel.js";
import { UserModel } from "../js/models/UserModel.js";

async function runTests() {
  await setupTestEnvironment();
  console.log("=================================================");
  console.log("SUITE: VERIFICACIÓN VALORACIÓN WP Y PISO DE PAGO");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log("  ✓ " + msg);
      passed++;
    } else {
      console.error("  ❌ FAIL: " + msg);
      failed++;
    }
  }

  // 1. Invariante de cálculo oficial en RewardModel: 1 USD desc = 50 WP
  const fan = new RewardModel({
    id: "fb_1198273641889021",
    title: "Mini Jet Fan 2 en 1",
    rewardType: "PARTIAL_DISCOUNT",
    priceUsd: 21.62,
    maxDiscountPct: 15,
    maxDiscountUsd: 3.24,
    cashToPayUsd: 18.38,
    stock: 1
  });

  assert(fan.pointsCost === 162, `Mini Jet Fan pointsCost debe ser 162 WP (obtenido: ${fan.pointsCost})`);
  assert(fan.cashToPayUsd === 18.38, `Mini Jet Fan cashToPayUsd debe ser 18.38 (obtenido: ${fan.cashToPayUsd})`);

  const laptop = new RewardModel({
    id: "fb_1198273641889026",
    title: "¡BESTIA GAMER! Acer Predator Helios Neo 16 RTX 4070",
    rewardType: "PARTIAL_DISCOUNT",
    priceUsd: 1100,
    maxDiscountPct: 15,
    maxDiscountUsd: 165,
    cashToPayUsd: 935,
    stock: 1
  });

  assert(laptop.pointsCost === 8250, `Acer Predator pointsCost debe ser 8250 WP (obtenido: ${laptop.pointsCost})`);
  assert(laptop.cashToPayUsd === 935, `Acer Predator cashToPayUsd debe ser 935 USD (obtenido: ${laptop.cashToPayUsd})`);

  // 2. Simulación de usuario con 1200 WP canjeando Mini Jet Fan
  // El usuario tiene más puntos que el tope del producto (1200 > 162)
  // El sistema NUNCA debe permitir gastar más de 162 WP ni reducir el pago a 0
  const user = new UserModel({
    uid: "test_user_valeria",
    displayName: "Valeria",
    wiredPoints: 1200
  });

  const vm = new CustomerViewModel();
  vm.currentUser = user;
  vm.catalog = [fan, laptop];
  vm.refreshCatalog = async () => {
    vm.catalog = [fan, laptop];
    return vm.catalog;
  };

  // Intento de canjear con 1200 WP en producto con tope 162 WP
  const voucherFan = await vm.redeemReward(fan.id, 1200);
  assert(voucherFan.pointsSpent === 162, `Puntos gastados en fan deben toparse a 162 WP (gastó: ${voucherFan.pointsSpent})`);
  assert(voucherFan.cashToPayUsd === 18.38, `Efectivo a pagar en fan debe ser $18.38 USD, NUNCA 0.0000 (pagó: ${voucherFan.cashToPayUsd})`);
  assert(user.wiredPoints === (1200 - 162), `Saldo restante de usuario debe ser 1038 WP (tiene: ${user.wiredPoints})`);

  // 3. Simulación de usuario aplicando 1200 WP en Acer Predator ($1100 USD)
  // 1200 WP a 50 WP/$1 = $24.00 USD de descuento
  // Precio final = $1100 - $24 = $1076.00 USD
  const user2 = new UserModel({
    uid: "test_user_gamer",
    displayName: "Gamer",
    wiredPoints: 1200
  });
  vm.currentUser = user2;

  const voucherLaptop = await vm.redeemReward(laptop.id, 1200);
  assert(voucherLaptop.pointsSpent === 1200, `Puntos gastados en laptop deben ser 1200 WP (gastó: ${voucherLaptop.pointsSpent})`);
  assert(voucherLaptop.discountUsd === 24.00, `Descuento en laptop debe ser $24.00 USD (obtenido: ${voucherLaptop.discountUsd})`);
  assert(voucherLaptop.cashToPayUsd === 1076.00, `Efectivo a pagar en laptop debe ser $1076.00 USD (obtenido: ${voucherLaptop.cashToPayUsd})`);
  assert(user2.wiredPoints === 0, `Saldo restante debe ser 0 WP (tiene: ${user2.wiredPoints})`);

  // 4. Invariante contra intento de descuento 100% en producto parcial (adversarial)
  laptop.stock = 5;
  laptop.status = "ACTIVE";
  const user3 = new UserModel({
    uid: "test_user_rich",
    displayName: "Whale",
    wiredPoints: 999999
  });
  vm.currentUser = user3;

  const voucherAdversarial = await vm.redeemReward(laptop.id, 999999);
  assert(voucherAdversarial.pointsSpent === 8250, `Tope máximo en laptop es 8250 WP aunque tenga 999k WP (gastó: ${voucherAdversarial.pointsSpent})`);
  assert(voucherAdversarial.cashToPayUsd === 935.00, `Efectivo a pagar NUNCA puede ser menor a cashToPayUsd ($935) (obtenido: ${voucherAdversarial.cashToPayUsd})`);
  assert(voucherAdversarial.cashToPayUsd > 0, `Efectivo a pagar en PARTIAL_DISCOUNT es estrictamente > 0`);

  console.log("-------------------------------------------------");
  console.log(`TOTAL: ${passed + failed} | APROBADOS: ${passed} | FALLIDOS: ${failed}`);
  console.log("=================================================");
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
