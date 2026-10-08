# Project: Sistema de Combos Flexibles Haibane con Desglose en Cascada (R1-R5)

## Architecture
- **Patrón Arquitectónico:** MVVM (Model-View-ViewModel) desacoplado en Vanilla JavaScript (ES Modules).
- **Capa de Modelos (`js/models/`):**
  - `RewardModel.js`: Generalizado para soportar `rewardType === "COMBO"` con arreglo dinámico `comboData.items` ($N \ge 2$). Cada ítem contiene `id`, `title`, `description`, `imageUrl`, `priceUsd`, `residualPriceUsd`, y `residualMaxDiscountPct`. Métodos `isCombo()`, `getComboItems()`, `getComboSavings()` (suma total, ahorro $ USD, % ahorro), y compatibilidad retroactiva con `itemA`/`itemB`.
  - `VoucherModel.js`: Extendido con `comboOrigin` (snapshot del combo original), `comboItems` (artículos incluidos) y `purchasedItem` (ítem extraído individualmente si aplica). Métodos `isComboVoucher()`, `isFullComboVoucher()`, `isSplitComboItemVoucher()`. Retiene la caducidad comercial a 72h.
- **Capa de Lógica de Negocio y ViewModels (`js/viewmodels/`):**
  - `CustomerViewModel.js`:
    - `redeemReward(rewardId, pointsToApply, options)`: Orquesta la compra de combo completo (vale con $N$ artículos, combo pasa a `SOLD_OUT`), la compra individual en combo de $N > 2$ (vale para el ítem, remoción del ítem del arreglo del combo, recálculo de precio y permanencia en catálogo con $N-1$ ítems), y la compra individual en combo de $N = 2$ (vale para el ítem con `comboOrigin`, combo pasa a `SOLD_OUT` y el ítem compañero remanente se publica como producto individual regular `PARTIAL_DISCOUNT` con `residualPriceUsd` y `residualMaxDiscountPct`).
    - `cancelVoucher(voucherId)` y `processExpiredVouchers()`: Matriz de decisión de reconstitución: si el vale tiene `comboOrigin`, se consulta el estado de los artículos compañeros en catálogo. Si siguen activos y en stock, se reconstituye el combo original; si ya fueron vendidos, el artículo cancelado se publica como producto individual regular.
- **Capa de Administración NOC (`admin.html`, `js/views/AdminInvoiceBatchView.js`, `js/admin-app.js`):**
  - Selector maestro `[📦 Estándar]` vs `[✨ Combo Flexible]` en `#modal-new-product` preservando los 24 invariantes de `verify_admin_product_modal_mobile_redesign.mjs`.
  - Barra de pestañas dinámicas `[📦 Ítem 1]`, `[📦 Ítem 2]`, `[➕ Agregar Ítem]` con remoción `[✕]` ($N \ge 2$). Scroll horizontal fluido en móviles (<600px).
  - Formulario reactivo por ítem (Título, Imagen, Precio regular, Precio residual, Tope descuento residual %, Descripción).
  - Panel sticky inferior: Suma de precios regulares, input de precio combo, cálculo en vivo de ahorro ($ USD y % OFF), tope descuento WP del combo.
  - Exposición obligatoria en `window.*` para cumplir con `ADV-6.1`.
- **Capa de Catálogo de Clientes & Modal de Compra (`CustomerCatalogView.js`, `index.html`, `css/`):**
  - Tarjeta de catálogo con imagen dividida simétricamente (50/50 para 2 ítems; 33.3% para 3 ítems en pantallas amplias, cuadrícula armónica 2+1 en móviles) con micro-bordes de 1.5px y divisor técnico.
  - Estética sacra Haibane (Serie 3: acentos dorados `#d97706`, glifo sacro `✦`, tipografía JetBrains Mono y badge flotante `✦ COMBO N EN 1 ✦`). Precio combo destacado con suma tachada y píldora de ahorro. Botón táctil `⚡ ADQUIRIR COMBO O POR SEPARADO` ($\ge 44$px).
  - Modal `#modal-confirm-redeem`: Inyección del sub-bloque `#confirm-combo-selector-wrap` preservando estrictamente los 24 IDs y 6 handlers de `stress_modal_confirm_redeem.mjs`. Selector interactivo de $N+1$ opciones que actualiza en tiempo real imagen, títulos, precios duales ($ USD y C$ NIO a tasa 37.0), slider de puntos WP y efectivo a pagar.
  - Adaptabilidad móvil absoluta (320px–480px): `scrollWidth <= innerWidth`, touch targets $\ge 44$px (o 38px en tabs), números tabulares.
- **Infraestructura de Pruebas (`tests/`):**
  - `tests/combo_products.test.mjs`: Suite de integración de modelos, cascada ($N \to N-1 \to 1$) y reconstitución 72h.
  - `tests/verify_combo_mobile_layout.mjs`: Suite de validación de layout, scroll y touch targets móviles.
  - `tests/e2e/runner.mjs`: Suite E2E de regresión (27/27 pruebas).
  - `tests/adversarial_customer_portal_gen2.mjs`: Suite adversarial cliente (20/20 pruebas).
  - `tests/adversarial_admin_terminal_gen2.mjs`: Suite adversarial admin (20/20 pruebas).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Modelo Combo Flexible ($N \ge 2$) | `RewardModel.js` generalizado con `comboData.items`, compatibilidad retroactiva, sumas y ahorros. | M1 | Survey E1 |
| 2 | Vales con Snapshot `comboOrigin` | `VoucherModel.js` con soporte para trazabilidad de combo original, ítems y desdobles. | M1 | Survey E1 |
| 3 | Lógica de Desglose en Cascada | `CustomerViewModel.js`: Compra Full Combo, Split $N \to N-1$, Split $2 \to 1$ Standalone. | M1 | Survey E1 |
| 4 | Panel Admin: Selector Maestro | `admin.html` con alternador `[📦 Estándar]` vs `[✨ Combo Flexible]` protegiendo invariantes. | M2 | Survey E2 |
| 5 | Panel Admin: Pestañas Dinámicas | Tabs dinámicas con soporte para 2, 3 o más ítems, remoción `[✕]` y scroll táctil en <600px. | M2 | Survey E2 |
| 6 | Panel Admin: Formulario Reactivo y Panel Sticky | Entradas por pestaña, cálculo en tiempo real de suma, ahorro $ y % OFF, persistencia en modelo. | M2 | Survey E2 |
| 7 | Contratos Globales Admin (`ADV-6.1`) | Exposición de manejadores en `window.*` para garantizar cero fallos en auditoría de eventos inline. | M2 | Survey E2 |
| 8 | Tarjeta Catálogo Dividida Haibane | `CustomerCatalogView.js`: División 50/50, 33.3% o 2+1 con divisor 1.5px, dorado `#d97706`, glifo `✦`, badge. | M3 | Survey E3 |
| 9 | Precios y Botón de Acción Catálogo | Precio combo grande, total tachado, píldora de ahorro, botón `⚡ ADQUIRIR COMBO O POR SEPARADO`. | M3 | Survey E3 |
| 10 | Modal Adquisición: Selector $N+1$ | Sub-bloque `#confirm-combo-selector-wrap` en `#modal-confirm-redeem` sin alterar los 24 IDs obligatorios. | M4 | Survey E3 |
| 11 | Reactividad en Tiempo Real Modal | Actualización en vivo de imagen, precios duales ($ USD y C$ NIO a tasa 37.0), slider WP y pago en tienda. | M4 | Survey E3 |
| 12 | Blindaje Móvil (320px–480px) | Cero scroll horizontal, touch targets $\ge 44$px, números tabulares en toda la interfaz. | M4 | Survey E2/E3 |
| 13 | Reconstitución Automática por Cancelación/72h | `CustomerViewModel.js`: Reconstitución si compañeros siguen libres; publicación standalone si ya se vendieron. | M5 | Survey E1 |
| 14 | Suite E2E de Combos y Verificación Móvil | `tests/combo_products.test.mjs` y `tests/verify_combo_mobile_layout.mjs`. | E2E_TRACK | Survey E1/E3 |
| 15 | Regresión Completa y Auditoría Forense | Verificación 100% de suites E2E y adversariales, auditoría forense CLEAN y control en rama `develop`. | M5 | Dispatch |

## Milestones
| # | Name | Scope | Dependencies | Status | Output |
|---|------|-------|-------------|:------:|--------|
| E2E_TRACK | E2E Testing Suite for Combos & Mobile Layout | `tests/combo_products.test.mjs`, `tests/verify_combo_mobile_layout.mjs`, `TEST_READY.md` | none | IN_PROGRESS | Test files created, initial assertions ready |
| M1 | Data Models & Cascading Transitions | `js/models/RewardModel.js`, `js/models/VoucherModel.js`, `js/viewmodels/CustomerViewModel.js` | none | DONE | Flexible items array, comboOrigin, cascade split logic, anti-race mutex, 0-bug clean |
| M2 | Admin Terminal & Dynamic Item Tabs | `admin.html`, `js/views/AdminInvoiceBatchView.js`, `js/admin-app.js`, `css/admin.css` | M1 | IN_PROGRESS | Dynamic tabs, master selector, sticky summary, window handlers |
| M3 | Customer Catalog & Haibane Split Cards | `js/views/customer/CustomerCatalogView.js`, `css/client.css`, `css/responsive.css` | M1 | PLANNED | Split image container, Series 3 Haibane aesthetics, dual pricing |
| M4 | Acquisition Modal Multichoice & Realtime | `index.html`, `js/views/customer/CustomerCatalogView.js`, `css/modals/`, `css/client.css` | M1, M3 | PLANNED | Additive N+1 selector, dual currency, slider sync, 44px buttons |
| M5 | 72h Reconstitution, Full Integration & Audit | `CustomerViewModel.js`, full test passes, forensic audit, git develop check | M1, M2, M3, M4, E2E_TRACK | PLANNED | 100% test passes, CLEAN audit verdict, develop verification |

## Interface Contracts
### `RewardModel` ↔ Catálogo / Admin
```javascript
// Atributos de combo flexible
reward.rewardType; // "COMBO" | "PARTIAL_DISCOUNT" | "FREE_REWARD" | "INCOMING"
reward.comboData = {
  items: [
    {
      id: "item-1",
      title: "Artículo 1",
      description: "...",
      imageUrl: "...",
      priceUsd: 15.00,
      residualPriceUsd: 18.00,
      residualMaxDiscountPct: 30
    },
    ...
  ]
};
reward.isCombo(); // boolean: true si rewardType === "COMBO" y comboData.items.length >= 2
reward.getComboItems(); // Array de items
reward.getComboSavings(); // { sumUsd: number, savingsUsd: number, savingsPct: number }
```

### `VoucherModel` ↔ Snapshots de Combo
```javascript
voucher.comboOrigin = {
  comboId: "reward-xyz",
  originalTitle: "...",
  itemCount: 2,
  itemsSnapshot: [...],
  companionRewardIds: ["reward-companion-id"]
};
voucher.isFullComboVoucher(); // true si amparó el combo completo
voucher.isSplitComboItemVoucher(); // true si amparó un ítem extraído
```

### `CustomerViewModel` ↔ Modal de Adquisición
```javascript
await vm.redeemReward(rewardId, pointsToApply, {
  selectionMode: "FULL_COMBO" | "SINGLE_ITEM",
  selectedItemId: "item-1" // requerido si selectionMode === "SINGLE_ITEM"
});
```

## Code Layout
- `js/models/RewardModel.js`: Propiedad del Worker M1
- `js/models/VoucherModel.js`: Propiedad del Worker M1
- `js/viewmodels/CustomerViewModel.js`: Propiedad del Worker M1 (cascada) y Worker M5 (reconstitución)
- `admin.html`: Propiedad del Worker M2
- `js/views/AdminInvoiceBatchView.js`: Propiedad del Worker M2
- `js/admin-app.js`: Propiedad del Worker M2
- `css/admin.css`: Propiedad del Worker M2
- `js/views/customer/CustomerCatalogView.js`: Propiedad del Worker M3 (tarjetas) y Worker M4 (modal N+1)
- `index.html`: Propiedad del Worker M4 (selector en modal-confirm-redeem)
- `css/client.css`: Propiedad de los Workers M3 y M4
- `css/responsive.css`: Propiedad de los Workers M2, M3, M4
- `tests/combo_products.test.mjs`: Propiedad del Test Writer E2E y Worker M5
- `tests/verify_combo_mobile_layout.mjs`: Propiedad del Test Writer E2E y Worker M5
