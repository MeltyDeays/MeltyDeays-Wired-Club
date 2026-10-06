/**
 * Integración real de CustomerViewModel.reservePreOrder (sin oráculo).
 * Cubre: validación algorítmica de cédula en VM, invariante 0 WP,
 * cálculo de descuento directo, persistencia y unicidad de códigos RES-.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const VALID_CEDULA = '001-010190-0001N';
const customer = (over = {}) => ({
  cedula: VALID_CEDULA,
  fullName: 'Bryan Bermudez',
  phone: '5843-8412',
  email: 'bryan@example.com',
  ...over
});

export async function runPreorderVmIntegrationTests() {
  setupTestEnvironment('index.html');
  const { CustomerViewModel } = await load('js/viewmodels/CustomerViewModel.js');
  const { FirestoreService } = await load('js/services/FirestoreService.js');
  const { RewardModel } = await load('js/models/RewardModel.js');
  const { UserModel } = await load('js/models/UserModel.js');

  const ctx = new TestContext('Preorder VM Integration');
  const future = new Date(Date.now() + 5 * 864e5).toISOString();
  const past = new Date(Date.now() - 864e5).toISOString();

  const makeVm = async (rewardData) => {
    const vm = new CustomerViewModel();
    vm.catalog = [new RewardModel(rewardData)];
    return vm;
  };
  const incoming = {
    id: 'REW-PRE-1', title: 'Teclado Haibane', status: 'INCOMING', isIncoming: true,
    estimatedArrival: future, priceUsd: 80, presaleDiscountType: 'PERCENTAGE',
    presaleDiscountValue: 15, pointsCost: 0, stock: 3
  };

  await ctx.test('VM rechaza cédula con letra verificadora incorrecta', async () => {
    const vm = await makeVm(incoming);
    let err = null;
    try { await vm.reservePreOrder('REW-PRE-1', customer({ cedula: '001-010190-0001A' })); } catch (e) { err = e; }
    expect(!!err).toBe(true, 'Debe lanzar error');
    expect(/C[eé]dula inv[aá]lida/.test(err.message)).toBe(true, err && err.message);
  });

  await ctx.test('VM rechaza cédula con fecha imposible', async () => {
    const vm = await makeVm(incoming);
    let err = null;
    try { await vm.reservePreOrder('REW-PRE-1', customer({ cedula: '001-300290-0001A' })); } catch (e) { err = e; }
    expect(!!err).toBe(true, 'Debe lanzar error');
  });

  await ctx.test('Reserva válida: descuento directo 15% y 0 WP con usuario de 500 WP', async () => {
    const vm = await makeVm(incoming);
    const saved = await FirestoreService.saveUser({ uid: 'CLIENT-58438412', displayName: 'Bryan', phone: '58438412', wiredPoints: 500 });
    vm.currentUser = new UserModel(saved);
    const v = await vm.reservePreOrder('REW-PRE-1', customer({ cedula: '0010101900001n' }));
    expect(v.voucherCode.startsWith('RES-')).toBe(true);
    expect(v.discountUsd).toBe(12);
    expect(v.cashToPayUsd).toBe(68);
    expect(v.pointsSpent).toBe(0);
    expect(v.customerInfo.cedula).toBe(VALID_CEDULA);
    expect(vm.currentUser.wiredPoints).toBe(500);
    const persisted = await FirestoreService.getVoucher(v.voucherCode);
    expect(!!persisted).toBe(true, 'Voucher debe persistir');
  });

  await ctx.test('Rechaza reserva cuando la preventa ya expiró', async () => {
    const vm = await makeVm({ ...incoming, id: 'REW-PRE-2', estimatedArrival: past });
    let err = null;
    try { await vm.reservePreOrder('REW-PRE-2', customer()); } catch (e) { err = e; }
    expect(!!err).toBe(true, 'Debe rechazar preventa expirada');
  });

  await ctx.test('60 reservas consecutivas generan códigos RES- únicos sin sobrescritura', async () => {
    const vm = await makeVm(incoming);
    const codes = new Set();
    for (let i = 0; i < 60; i++) {
      const v = await vm.reservePreOrder('REW-PRE-1', customer({ phone: String(80000000 + i) }));
      codes.add(v.voucherCode);
    }
    expect(codes.size).toBe(60, `Códigos únicos: ${codes.size}/60`);
  });

  return ctx.summary ? ctx.summary() : ctx;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runPreorderVmIntegrationTests().then((res) => {
    const failed = res && typeof res.failed === 'number' ? res.failed : (res && res.results ? res.results.filter(r => !r.passed).length : 0);
    process.exit(failed ? 1 : 0);
  }).catch((e) => { console.error(e); process.exit(1); });
}
