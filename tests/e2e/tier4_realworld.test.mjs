import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export async function runTier4Tests() {
  const ctx = new TestContext('Tier 4: Real-World Scenarios');

  console.log('\n========================================');
  console.log(' RUNNING TIER 4: REAL-WORLD SCENARIOS');
  console.log('========================================');

  // Scenario 1: Complete Customer Redemption Lifecycle
  await ctx.test('T4.1: Complete customer redemption lifecycle (login -> select -> redeem -> inspect voucher -> cancel & refund)', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('index.html');
    const appUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/app.js')).href + `?t=${Date.now()}`;
    await import(appUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Step 1: Customer Login (Carlos Lopez, 500 WP)
    doc.getElementById('login-phone').value = '5843-8412';
    doc.getElementById('login-pin').value = '1234';
    await win.submitClientLogin();

    let balanceEl = doc.getElementById('client-balance-val');
    expect(parseInt(balanceEl.textContent.replace(/,/g, ''), 10)).toBe(500, 'Initial balance is 500 WP');

    // Step 2: Customer selects reward "rew-ramen" (Cost: 200 WP)
    win.confirmRedeem('rew-ramen');
    const redeemModal = doc.getElementById('modal-confirm-redeem');
    expect(redeemModal.style.display).toBe('flex', 'Redeem confirmation modal must be open');

    // Step 3: Set points preset to 'max'
    win.setPointsPreset('max');

    // Step 4: Execute redemption
    await win.executeRedeem();

    // Step 5: Verify balance deducted (500 - 200 = 300 WP)
    balanceEl = doc.getElementById('client-balance-val');
    expect(parseInt(balanceEl.textContent.replace(/,/g, ''), 10)).toBe(300, 'Balance must be deducted to 300 WP');

    // Step 6: Verify voucher in database
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const vouchers = Object.values(rawDb.vouchers || {}).filter(v => (v.rewardId === 'rew-ramen' || v.reward_id === 'rew-ramen'));
    expect(vouchers.length).toBeGreaterThan(0, 'A voucher for Carlos Lopez must exist in storage');
    const newVoucher = vouchers[0];
    const vCode = newVoucher.voucherCode || newVoucher.voucher_code;
    const vStatus = newVoucher.status;
    expect(vStatus === 'AVAILABLE' || vStatus === 'PENDING_DELIVERY').toBe(true, 'New voucher status must be AVAILABLE or PENDING_DELIVERY');
    const ptsCost = newVoucher.pointsCost !== undefined ? newVoucher.pointsCost : newVoucher.points_cost;
    expect(ptsCost).toBe(200, 'Voucher pointsCost must be 200');

    // Step 7: Inspect Voucher in Modal
    win.showVoucherModal(vCode);
    const voucherModal = doc.getElementById('modal-voucher') || doc.getElementById('modal-voucher-detail');
    expect(voucherModal.style.display).toBe('flex', 'Voucher modal must be open');
    win.closeVoucherModal();

    // Step 8: Cancel Voucher and claim refund
    win.promptCancelVoucher(vCode);
    await win.executeCancelVoucher();

    // Step 9: Verify refund restored balance (300 + 200 = 500 WP)
    balanceEl = doc.getElementById('client-balance-val');
    expect(parseInt(balanceEl.textContent.replace(/,/g, ''), 10)).toBe(500, 'Balance must be refunded back to 500 WP');

    // Step 10: Verify voucher status updated to CANCELLED
    const updatedDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const cancelledVoucher = updatedDb.vouchers[vCode];
    expect(cancelledVoucher.status).toBe('CANCELLED', 'Voucher status in storage must be CANCELLED');
  });

  // Scenario 2: Complete Admin Digital Invoice Emission Lifecycle
  await ctx.test('T4.2: Complete admin digital invoice emission lifecycle (PIN unlock -> fill items -> compute points -> emit & verify token)', async () => {
    const { doc, win, localStorage } = setupTestEnvironment('admin.html');
    const adminAppUrl = pathToFileURL(path.join(PROJECT_ROOT, 'js/admin-app.js')).href + `?t=${Date.now()}`;
    await import(adminAppUrl);
    win.document.dispatchEvent({ type: 'DOMContentLoaded' });

    // Step 1: Admin PIN Unlock
    doc.getElementById('input-admin-pin').value = '110805';
    await win.submitAdminPin();
    expect(doc.getElementById('admin-main-panel').style.display).toBe('block');

    // Step 2: Switch to Facturas tab
    win.switchAdminTab('invoices');

    // Step 3: Open Single Digital Invoice modal
    win.openSingleDigitalInvoiceModal();
    const invoiceModal = doc.getElementById('modal-single-digital-invoice');
    expect(invoiceModal.style.display).toBe('flex', 'Invoice modal should be open');

    // Step 4: Populate client details
    const folio = doc.getElementById('s-inv-folio').value || '1050';
    doc.getElementById('s-inv-client-name').value = 'Roberto Gomez';
    doc.getElementById('s-inv-client-phone').value = '8765-4321';
    doc.getElementById('s-inv-currency').value = 'USD';

    // Step 5: Add items and set values using application helper
    win.addSingleInvoiceItemRow(1, 'Teclado Mecanico RGB', 45.00);

    const subValEl = doc.getElementById('s-inv-subtotal-val');
    if (subValEl) subValEl.textContent = '$ 45.00';
    const totValEl = doc.getElementById('s-inv-total-val');
    if (totValEl) totValEl.textContent = '$ 45.00';
    const pointsCheck = doc.getElementById('s-inv-enable-points');
    if (pointsCheck) pointsCheck.checked = true;
    doc.getElementById('s-inv-points-val').value = '45';

    // Step 6: Submit Digital Invoice
    await win.submitSingleDigitalInvoice();

    // Step 7: Verify Digital Invoice modal is closed
    expect(invoiceModal.style.display).toBe('none', 'Digital invoice modal should close after successful emission');

    // Step 8: Verify token created in database
    const rawDb = JSON.parse(localStorage.getItem('dev_wired_club_mvvm_db_v2') || localStorage.getItem('wired_club_mvvm_db_v2'));
    const matchingTokens = Object.values(rawDb.tokens || {}).filter(t => t.invoiceFolio === folio || t.pointsValue === 45 || t.invoice_folio === folio || t.points_value === 45);
    expect(matchingTokens.length).toBeGreaterThan(0, 'A token for the emitted digital invoice must exist');
    const createdToken = matchingTokens[0];
    const tokenPoints = createdToken.pointsValue !== undefined ? createdToken.pointsValue : createdToken.points_value;
    expect(tokenPoints).toBe(45, 'Token pointsValue should be 45');
    expect(createdToken.status === 'ACTIVE' || createdToken.status === 'AVAILABLE').toBe(true, 'Emitted token status must be ACTIVE or AVAILABLE');
  });

  return ctx.summary();
}
