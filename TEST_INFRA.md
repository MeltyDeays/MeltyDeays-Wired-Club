# E2E Test Infra: Sistema de Combos Flexibles Haibane con Desglose en Cascada

## Test Philosophy
- Opaque-box, requirement-driven derived from ORIGINAL_REQUEST § 2026-10-07T22:48:40Z.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing (Tiers 1-4).

## Feature Inventory & Test Coverage
| # | Feature | Requirement | Tier 1 (Unit/Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|-------------|:---------------------:|:-----------------:|:----------------------:|:-------------------:|
| 1 | Flexible Combo Model ($N \ge 2$) | R1/R3 | >=5 tests | >=5 tests | Pairwise combo data | End-to-end catalog load |
| 2 | Cascading Split Purchase ($N \to N-1 \to 1$) | R3 | >=5 tests | >=5 tests | Stock & recalculation | Multi-step buy down |
| 3 | Automatic 72h Reconstitution & Cancellation | R4 | >=5 tests | Companion sold vs free | Snapshot restore | Full lifecycle refund |
| 4 | Admin Dynamic Tabs & Master Selector | R1 | >=5 tests | Min 2 items limit | Save & load in admin | Full admin combo creation |
| 5 | Split Image Card & Haibane Aesthetics | R2 | >=5 tests | 2 vs 3 items layout | Dual price & Temu pill | Public catalog display |
| 6 | Acquisition Modal N+1 Real-time Selector | R2 | >=5 tests | Zero WP vs Max WP | Slider sync & cash to pay | Full redemption workflow |
| 7 | Mobile Responsiveness (320px - 480px) | R5 | >=5 tests | 320px, 375px, 414px | ScrollWidth <= innerWidth | 44px touch targets |

## Test Architecture
- Test files:
  - `tests/combo_products.test.mjs`: Test suite covering Tiers 1-4 for data models, cascading transitions, vouchers, and 72h reconstitution.
  - `tests/verify_combo_mobile_layout.mjs`: Test suite covering mobile responsiveness, tab scrolling, touch targets, and zero horizontal overflow.
- Test runner invocation: `rtk node tests/combo_products.test.mjs` and `rtk node tests/verify_combo_mobile_layout.mjs`.
- Pass criterion: Exit code 0, 100% assertions pass.
