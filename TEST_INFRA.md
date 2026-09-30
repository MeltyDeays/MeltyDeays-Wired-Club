# TEST_INFRA.md — Wired Club Test Architecture & Infrastructure

## 1. Overview & Architecture
The Wired Club E2E Test Suite provides an automated, opaque-box testing framework executing under Node.js ESM. It tests the complete application logic, MVVM viewmodels, views, templates, services, and DOM integration without external browser dependencies (Playwright/Puppeteer), ensuring microsecond-fast execution with deep fidelity to browser runtime behavior.

```
tests/e2e/
├── runner.mjs                 # Test runner orchestrating Tiers 1-4
├── harness.mjs                # Lightweight DOM, Event, and Storage simulator
├── tier1_feature.test.mjs     # Tier 1: Core Syntax, Modules & Handlers
├── tier2_boundary.test.mjs    # Tier 2: Boundary & Corner Cases
├── tier3_combination.test.mjs # Tier 3: Cross-Feature Combinations
└── tier4_realworld.test.mjs   # Tier 4: Real-World E2E Scenarios
```

### 1.1 Test Harness (`harness.mjs`)
- **DOM Engine**: Implements `DOMDocument`, `DOMElement`, `SimpleClassList`, and `SimpleStyle`, simulating element trees, event bubbling, attribute synchronization (`class`, `value`, `style`), and advanced query selection.
- **Selector Engine**: Supports tag selectors, ID selectors (`#id`), class selectors (`.class`), attribute selectors (`[attr=val]`), comma-separated selectors (`.a, .b`), and descendant selectors (`#parent .child`, `#table tr`).
- **Storage Subsystem**: `InMemoryStorage` providing strict `localStorage` and `sessionStorage` implementations with key iteration, length calculation, and JSON serialization mirrors.
- **Window & Global Mocks**: Emulates `window`, `document`, `navigator`, `location`, `QRCode`, `Html5Qrcode`, Web Audio API audio contexts, and DOM CustomEvents.

---

## 2. Testing Methodology
The suite is organized following a 4-Tier verification pyramid:

### Tier 1: Feature Coverage (Static & Baseline)
- Module syntax parsing with `node --check` across all files in `js/`.
- Dynamic ES module resolution and import verification.
- Global window handler verification for both `index.html` (29 customer handlers) and `admin.html` (admin handlers).
- Sandbox environment badge injection.
- Currency toggle reactivity (`setAppCurrency`).
- Admin PIN lock gate (`submitAdminPin` with PIN `110805`).
- Admin tab switching across Socios, Facturas, Catálogo, and Mostrador.
- Modal open/close lifecycle (Auth, Claim, Digital Invoice).

### Tier 2: Boundary & Corner Cases
- Submissions with invalid/empty PIN codes (`000000`, `9999`, empty).
- Unsupported or extreme currency toggles (`EUR`, `BTC`, invalid strings).
- Non-existent and malformed voucher/token lookups.
- Empty form submissions and validation feedback banners.
- Rapid currency toggling preserving numerical and formatting consistency.

### Tier 3: Cross-Feature Combinations
- Currency changes combined with immediate dual pricing rendering in the catalog and CyberPass.
- Customer authentication session combined with QR token claim and ledger balance increments.
- Admin PIN unlock combined with multi-tab transitions and invoice modal configuration.
- Session persistence across reboots using simulated localStorage.

### Tier 4: Real-World Lifecycles
- **Customer Redemption Lifecycle**: Login -> Reward selection -> Modal points slider configuration -> Atomic redemption -> Voucher code inspection -> Cancellation and full points refund.
- **Admin Digital Invoice Emission Lifecycle**: Admin PIN unlock -> Navigation to Invoices -> Modal opening -> Invoice item population -> Points calculation -> Token generation and storage verification.

---

## 3. Test Inventory & Coverage Matrix

| Tier | Test ID | Description | Target Component | Status |
|:----:|:-------:|:------------|:-----------------|:------:|
| 1 | T1.1 | All JS modules under `js/` parse with zero SyntaxError | Codebase syntax | PASS |
| 1 | T1.2 | Primary ES modules load cleanly without unresolved exports | ESM imports/exports | PASS |
| 1 | T1.3 | All 29 inline HTML customer handlers exposed on `window` | `js/app.js` | PASS |
| 1 | T1.4 | Inline admin terminal handlers exposed on `window` | `js/admin-app.js` | PASS |
| 1 | T1.5 | `injectEnvironmentBadge()` renders sandbox badge in dev | `js/config/env.js` | PASS |
| 1 | T1.6 | `setAppCurrency` toggles between USD and NIO | `CustomerViewModel` | PASS |
| 1 | T1.7 | `submitAdminPin('110805')` unlocks admin panel | `AdminViewModel` | PASS |
| 1 | T1.8 | `switchAdminTab` transitions across all admin sections | `js/admin-app.js` | PASS |
| 1 | T1.9 | Auth, Claim, and Digital Invoice modals open & close | Views & Modals | PASS |
| 2 | T2.1 | Invalid PIN submissions keep terminal locked with error | Auth Lockout | PASS |
| 2 | T2.2 | Unsupported currency toggles are safely ignored | Currency Service | PASS |
| 2 | T2.3 | Non-existent or invalid voucher codes handled gracefully | Voucher Engine | PASS |
| 2 | T2.4 | Empty form submissions trigger validation without crash | Forms & Views | PASS |
| 2 | T2.5 | Rapid toggling between USD and NIO preserves integrity | Currency Engine | PASS |
| 3 | T3.1 | Currency toggle triggers catalog pricing & CyberPass | Dual Pricing | PASS |
| 3 | T3.2 | Login + token claim updates balance and logs ledger | Claim & Ledger | PASS |
| 3 | T3.3 | Admin PIN unlock + tab transitions + modal operations | Admin Lifecycle | PASS |
| 3 | T3.4 | Customer auth session persists across reboots | Local Storage | PASS |
| 4 | T4.1 | Complete customer redemption & refund lifecycle | Customer E2E | PASS |
| 4 | T4.2 | Complete admin digital invoice emission lifecycle | Admin E2E | PASS |

---

## 4. Execution Command
```bash
node tests/e2e/runner.mjs
```
Total tests: 20  
Passing: 20 (100%)  
Failing: 0 (0%)  
Average Execution Time: ~3.1 seconds
