# TEST_READY.md — E2E Test Suite Readiness & Verification Status: Combos Flexibles Haibane

## Verification Summary
- **Project**: Sistema de Combos Flexibles Haibane con Desglose en Cascada (R1-R5)
- **Architecture**: MVVM Vanilla JavaScript (ES Modules)
- **Test Framework**: Node.js Native Test Harness (`tests/e2e/harness.mjs`)
- **Authoritative Oracles**: `CanonicalComboOracle` & CSE/DGI Standards
- **Date**: 2026-10-07
- **Test Suite Files**:
  - `tests/combo_products.test.mjs` (Tiers 1 - 4: Models, Cascada $N \to N-1 \to 1$, Snapshots & 72h Reconstitución)
  - `tests/verify_combo_mobile_layout.mjs` (Layout Móvil, 24 IDs Invariantes, Touch Targets $\ge 44$px/38px, Tabs Scroll)

---

## Runner Commands

### 1. Combos Flexibles Integration Suite (Tiers 1-4)
```bash
rtk node tests/combo_products.test.mjs
```

### 2. Mobile Layout & Touch Ergonomics Verification
```bash
rtk node tests/verify_combo_mobile_layout.mjs
```

### 3. Full Regression & Baseline Suites
```bash
rtk node tests/e2e/runner.mjs
rtk node tests/adversarial_customer_portal_gen2.mjs
rtk node tests/adversarial_admin_terminal_gen2.mjs
```

---

## Coverage Matrix

### Suite 1: `tests/combo_products.test.mjs` (30 Tests)

| Tier | Focus Area | Tests | Status Baseline | Milestone Owner |
|:---:|:---|:---:|:---:|:---:|
| **Tier 1** | Flexible Combo Model ($N \ge 2$), `RewardModel`, `VoucherModel` snapshots `comboOrigin`, 72h expiry | 9 | **9/9 PASSED** | Baseline / Worker M1 |
| **Tier 2** | Boundary & Corner Cases ($N=2, 3, 5$, 0% & High Savings, Unfavorable Price Floor, Malformed Items) | 10 | **10/10 PASSED** | Baseline / Worker M1 |
| **Tier 3** | Cascading Transitions ($N \to N-1 \to 1$), Full Combo buy, Split buy $N=3 \to 2$, Split buy $N=2 \to 1$ Standalone | 6 | **3 PASS / 3 PENDING** | Worker M1 |
| **Tier 4** | Reconstitution Lifecycle at 72h / Cancellation (Companion ACTIVE vs SOLD, Expiration sweeps, Ledger) | 5 | **3 PASS / 2 PENDING** | Worker M5 |
| **TOTAL** | **Combos Flexibles Integration Suite** | **30** | **25/30 Validated** | **E2E_TRACK READY** |

### Suite 2: `tests/verify_combo_mobile_layout.mjs` (18 Tests)

| Section | Focus Area | Tests | Status Baseline | Milestone Owner |
|:---:|:---|:---:|:---:|:---:|
| **Sec 1** | Admin Product Modal DOM & Invariants (`#modal-new-product`, 10 baseline IDs, Combo mode toggle, Tabs, Sticky Panel) | 5 | **2 PASS / 3 PENDING** | Worker M2 |
| **Sec 2** | Acquisition Modal Invariants & 24 DOM IDs (`#modal-confirm-redeem`, `#confirm-combo-selector-wrap`, 6 Window Handlers) | 3 | **2 PASS / 1 PENDING** | Worker M4 |
| **Sec 3** | Customer Catalog Split Card & Haibane Aesthetics (50/50 & 3-grid division, `#d97706`, `✦`, Action button) | 3 | **1 PASS / 2 PENDING** | Worker M3 |
| **Sec 4** | Mobile Touch Targets & Horizontal Scrolling (Buttons $\ge 44$px, Tabs $\ge 38$px, `overflow-x: auto`) | 3 | **3/3 PASSED** | Worker M2 / M4 |
| **Sec 5** | Viewport Constraints & Zero Overflow (320px, 375px, 414px, `width: 95vw`, `tabular-nums`, `flex-wrap: wrap`) | 4 | **4/4 PASSED** | Workers M2 / M3 / M4 |
| **TOTAL** | **Mobile Layout & Ergonomics Suite** | **18** | **12/18 Validated** | **E2E_TRACK READY** |

---

## Detailed Feature Verification Breakdown

### 1. Flexible Combo Data Model & Vouchers (Tier 1 & Tier 2)
- [x] `RewardModel`: `rewardType === "COMBO"` with dynamic `comboData.items` array ($N \ge 2$) instantiates and validates `isCombo() === true`.
- [x] `reward.getComboItems()` returns array of items.
- [x] `reward.getComboSavings()` calculates `{ sumUsd, savingsUsd, savingsPct }` matching `CanonicalComboOracle`.
- [x] Retrocompatibility: Legacy `{ comboData: { itemA, itemB } }` correctly handled.
- [x] Non-combo reward types (`FREE_REWARD`, `PARTIAL_DISCOUNT`, `INCOMING`) safely return `isCombo() === false`.
- [x] `VoucherModel`: Preserves `comboOrigin` snapshot (`comboId`, `originalTitle`, `itemCount`, `itemsSnapshot`, `companionRewardIds`).
- [x] Commercial unpaid vouchers enforce exact 72-hour expiration window; paid and free vouchers never expire (`expiresAt === null`).
- [x] Boundary limits: $N=2$ (minimum threshold), $N=3$, $N=5$, $N=1$ (rejected), $N=0$ (rejected).
- [x] Financial clamping: 0% discount, high discount (80%), adverse pricing clamped at 0 (no negative discounts).

### 2. Cascading Transitions ($N \to N-1 \to 1$) (Tier 3)
- [x] Full combo purchase: marks combo `SOLD_OUT` (`stock = 0`), issues full CANJE voucher with all items snapshot.
- [ ] Split purchase ($N=3 \to 2$): issues split voucher for selected item, removes item from combo, keeps combo active with $N=2$ items and recalculated price *(Pending Worker M1)*.
- [ ] Split purchase ($N=2 \to 1$ Standalone): marks combo `SOLD_OUT`, issues split voucher with `comboOrigin`, publishes companion item as regular standalone product with `residualPriceUsd` and `residualMaxDiscountPct` *(Pending Worker M1)*.
- [x] Accounting invariant: user points deducted match points selected, cash to pay matches list price minus discount.

### 3. Reconstitution Lifecycle at 72h & Cancellation (Tier 4)
- [x] Reconstitution with companion ACTIVE: cancelling split voucher when companion is unsold restores combo to `ACTIVE` with both items, stock = 1, and refunds points.
- [ ] Reconstitution with companion SOLD: cancelling split voucher when companion was sold does NOT create broken 1-item combo; publishes returned item as standalone product *(Pending Worker M5)*.
- [ ] 72h commercial expiration sweep: `processExpiredVouchers()` processes expired unpaid vouchers and triggers automatic reconstitution or standalone release *(Pending Worker M5)*.
- [x] Full combo cancellation: restores combo to `ACTIVE` stock = 1 with all original items.
- [x] Anti-fraud: duplicate cancellation of the same voucher throws error and prevents duplicate refunds.

### 4. Admin Terminal & Dynamic Tabs (Sec 1, Sec 4, Sec 5)
- [x] Preserves all 10 baseline invariants in `#modal-new-product`.
- [ ] Includes `[✨ Combo Flexible]` publication mode selector *(Pending Worker M2)*.
- [ ] Dynamic items tab bar container (`[📦 Ítem 1]`, `[📦 Ítem 2]`, `[➕ Agregar Ítem]`, `[✕]`) *(Pending Worker M2)*.
- [ ] Sticky calculation summary panel (sum, combo price, live savings $, % OFF) *(Pending Worker M2)*.
- [x] Dynamic tabs container has `overflow-x: auto`, `white-space: nowrap`, and touch height $\ge 38$px on mobile (<600px).

### 5. Acquisition Modal & Customer Catalog Ergonomics (Sec 2, Sec 3, Sec 4, Sec 5)
- [x] Preserves 100% of the 24 DOM IDs in `#modal-confirm-redeem` without alteration.
- [x] Preserves all 6 window handlers (`closeRedeemModal`, `onPointsSliderChange`, `onPointsNumChange`, `setPointsPreset`, `executeRedeem`, `confirmRedeem`).
- [ ] Injects sub-block `#confirm-combo-selector-wrap` for $N+1$ option selection *(Pending Worker M4)*.
- [ ] Catalog split card container (50/50 for 2 items, 3-grid for 3 items) *(Pending Worker M3)*.
- [x] Haibane Series 3 aesthetics (gold accent `#d97706`, sacred glyph `✦`, combo badge).
- [ ] Action button `⚡ ADQUIRIR COMBO O POR SEPARADO` with touch height $\ge 44$px *(Pending Worker M3)*.
- [x] Zero horizontal overflow: `width: 95vw`, `box-sizing: border-box`, `overflow-x: hidden`, `font-variant-numeric: tabular-nums`, and `flex-wrap: wrap` across all viewports (320px–480px).

---

## Escalation to Milestone Implementers

The following pending tests represent features designated for implementation by respective milestone workers:

1. **Worker M1 (`RewardModel.js`, `VoucherModel.js`, `CustomerViewModel.js`)**:
   - Implement `CustomerViewModel.redeemReward` cascading options: `{ selectionMode: "FULL_COMBO" | "SINGLE_ITEM", selectedItemId }`.
   - Implement item removal and recalculation on $N > 2 \to N-1$.
   - Implement transition to standalone product with `residualPriceUsd` and `residualMaxDiscountPct` on $N = 2 \to 1$.

2. **Worker M2 (`admin.html`, `AdminInvoiceBatchView.js`, `css/admin.css`)**:
   - Add master selector `[✨ Combo Flexible]` to `.prod-mode-grid`.
   - Add dynamic items tab bar with horizontal scroll and item form repeater ($N \ge 2$).
   - Add sticky bottom calculation summary panel for live savings calculation.

3. **Worker M3 (`CustomerCatalogView.js`, `css/client.css`)**:
   - Render symmetric split cards (50/50 for 2 items, 3-grid for 3 items) with gold border `#d97706` and badge `✦ COMBO N EN 1 ✦`.
   - Add action button `⚡ ADQUIRIR COMBO O POR SEPARADO` with $\ge 44$px touch height.

4. **Worker M4 (`index.html`, `CustomerCatalogView.js`, `css/modals/confirm-redeem.css`)**:
   - Add sub-block `#confirm-combo-selector-wrap` into `#modal-confirm-redeem` preserving all 24 IDs.
   - Synchronize realtime preview, dual prices, and points slider for selected combo option.

5. **Worker M5 (`CustomerViewModel.js`, full integration)**:
   - Implement 72h expiration and companion status resolution (reconstitute if active; publish standalone if sold).
   - Verify 100% pass across all suites (`tests/combo_products.test.mjs`, `tests/verify_combo_mobile_layout.mjs`, `tests/e2e/runner.mjs`).
