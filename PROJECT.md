# Project: Sales & Loyalty Platform Refactoring Remediation & Audit

## Architecture
- Client Application (`index.html`): MVVM pattern with CustomerViewModel (`js/viewmodels/CustomerViewModel.js`), modular views (`js/views/customer/*.js`), templates (`js/templates/customer-templates.js`), services (`js/services/FirestoreService.js`, `CurrencyService.js`). Entry script is `js/app.js` (`type="module"`).
- Admin NOC Terminal (`admin.html`): MVVM pattern with AdminViewModel (`js/viewmodels/AdminViewModel.js`), admin views (`js/views/Admin*.js`), services (`InvoiceTemplateService.js`, `FirestoreService.js`). Entry script is `js/admin-app.js` (`type="module"`).
- Styles (`css/`): Modular CSS broken into base, modals, panels, and layouts.

## Feature Inventory
| # | Feature / Bug | Description | Milestone | Source | Status |
|---|---------------|-------------|-----------|--------|:------:|
| 1 | Admin ESM Blocker | Fix `saveProductAdmin` export mismatch in `AdminInvoiceBatchView.js:262` and `./views/index.js` | M_CORE | Survey 1, 3 | DONE |
| 2 | Admin Subview Dependencies | Import `setProductPublicationMode`, `recalculateProductDiscount`, declare `activeProductMode` in `AdminInvoiceBatchView.js` | M_CORE | Survey 3 | DONE |
| 3 | Query String Imports | Remove query string from `InvoiceTemplateService.js?v=2.7.5` import in `admin-app.js` | M_CORE | Survey 1 | DONE |
| 4 | Currency Reactivity | Add `setPreferredCurrency` alias/method in `CustomerViewModel.js` pointing to `setCurrency` | M_CORE | Survey 2 | DONE |
| 5 | Customer Auth Normalization | Import `FirestoreService` in `CustomerAuthView.js` for phone normalization | M_CORE | Survey 1, 2 | DONE |
| 6 | Customer Claim Render Cleanup | Remove 6 residual undeclared `render(vm)` calls in `CustomerClaimView.js` and use `vm.notify()` | M_CORE | Survey 1, 2 | DONE |
| 7 | Customer Claim Dynamic Import | Fix broken relative import path `./services/FirestoreService.js` to `../../services/FirestoreService.js` in `CustomerClaimView.js:217` | M_CORE | Survey 1, 2 | DONE |
| 8 | Customer Voucher Render Cleanup | Remove residual undeclared `render(vm)` call in `CustomerVouchersView.js:551` | M_CORE | Survey 1, 2 | DONE |
| 9 | Customer Catalog Voucher Modal | Inject/pass `showVoucherModal` to `CustomerCatalogView.js` dependencies | M_CORE | Survey 1, 2 | DONE |
| 10 | Admin Invoice Modal Close | Inject/import `closeModal` in `AdminInvoiceModalView.js:389` | M_CORE | Survey 1, 3 | DONE |
| 11 | Admin PIN Unlock Verification | Verify `submitAdminPin` with PIN `110805`, transition from `#admin-auth-lock` to `#admin-main-panel` | M_CORE | Survey 3 | DONE |
| 12 | Admin Tab Navigation | Verify `switchAdminTab` across Mostrador, Socios, Facturas, Catálogo, Historial | M_CORE | Survey 3 | DONE |
| 13 | Admin Modal Operations | Verify Socios registration, Digital Invoice 1-Page, Calc WP navbar utilities | M_CORE | Survey 3 | DONE |
| 14 | Modal CSS Syntax Fix | Balance missing closing braces in `css/modals/base.css` (`.lain-toggle-group` and `@keyframes modalHoloSweep`) | M_CORE | Survey 3 | DONE |
| 15 | Cross-Portal Style & View Audit | Verify all 515 CSS classes and 43+ inline customer handlers and 127 admin handlers | M_CORE | Survey 2, 3 | DONE |
| 16 | E2E Testing Suite (Tiers 1-4) | Comprehensive test suite covering syntax, modules, customer flows, and admin flows | E2E Track | Survey 1, 2, 3 | DONE |
| 17 | Final E2E Pass & Hardening | 100% pass of Tiers 1-4 tests, followed by Tier 5 adversarial coverage hardening | M_FINAL | Survey 1, 2, 3 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status | Output |
|---|------|-------|-------------|:------:|--------|
| M_CORE | Comprehensive Code & Style Remediation | All R1, R2, R3, R4 fixes in JS modules, views, viewmodels, and CSS | none | DONE | 10 files remediated, verified by Reviewers & Challengers |
| E2E | E2E Testing Track | Design opaque-box test runner & Tiers 1-4 test cases -> TEST_READY.md | none | DONE | `TEST_INFRA.md`, `TEST_READY.md`, 20/20 tests passing |
| M_FINAL | Final E2E Pass & Adversarial Hardening | Phase 1: 100% pass of E2E suite (Tiers 1-4). Phase 2: Tier 5 adversarial tests | M_CORE, E2E | DONE | Adversarial suites (Customer: 13/13, Admin: 19/19), Auditor: CLEAN |

## Interface Contracts
### Admin Views ↔ admin-app.js
- `AdminInvoiceBatchView.js` MUST export `saveProductAdmin` (function) and `saveNewProduct` (alias).
- `AdminCatalogCalculatorView.js` exports `setProductPublicationMode`, `recalculateProductDiscount`, `activeProductMode`.

### Customer Views ↔ CustomerViewModel.js
- `CustomerViewModel.js` provides `setPreferredCurrency(curr)` as an alias for `setCurrency(curr)`.
- `CustomerAuthView.js` imports `FirestoreService` from `../../services/FirestoreService.js`.
- `CustomerClaimView.js` imports `FirestoreService` from `../../services/FirestoreService.js`.
- `CustomerCatalogView.js` receives `showVoucherModal` in `initCustomerCatalogView(deps)`.

## Code Layout
- `js/app.js`: Customer portal entrypoint
- `js/admin-app.js`: Admin terminal entrypoint
- `js/viewmodels/`: MVVM ViewModels (`CustomerViewModel.js`, `AdminViewModel.js`)
- `js/views/customer/`: Customer modular views (`CustomerAuthView.js`, `CustomerCatalogView.js`, `CustomerClaimView.js`, `CustomerVouchersView.js`, `index.js`)
- `js/views/`: Admin modular views (`AdminInvoiceBatchView.js`, `AdminInvoiceModalView.js`, `AdminVouchersView.js`, `AdminCatalogCalculatorView.js`, `index.js`)
- `js/services/`: Shared services (`FirestoreService.js`, `CurrencyService.js`, `InvoiceTemplateService.js`)
- `js/templates/`: UI HTML templates
- `css/`: Stylesheets (`modals/base.css`, etc.)
- `tests/e2e/`: Automated E2E test suite
