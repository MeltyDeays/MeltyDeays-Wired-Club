# Project: MeltyDeays Invoice QR Synchronization, Optical WhatsApp QR & High-Contrast Typography

## Architecture
- Client Application (`index.html`): MVVM pattern with CustomerViewModel (`js/viewmodels/CustomerViewModel.js`), customer views (`js/views/customer/`), templates, and services (`FirestoreService.js`).
- Admin NOC Terminal (`admin.html`): MVVM pattern with AdminViewModel (`js/viewmodels/AdminViewModel.js`), admin views (`js/views/Admin*.js`), invoice template services (`InvoiceTemplateService.js`).
- Document Builders (`js/templates/builders/`):
  - `Physical4x1Builder.js`: 4x1 physical invoice batch print builder. Enforces QR code rendering, barcode vector SVG, and printable layout.
  - `SingleDigitalInvoiceBuilder.js`: Single-page digital invoice and collectible card builder.
- Stylesheets (`js/templates/styles/`):
  - `invoice4x1Styles.js`: CSS layout and typography for physical 4x1 invoices.
  - `invoiceSingleStyles.js`: CSS layout and typography for single-page digital invoices.
- Test Infrastructure (`tests/`):
  - `tests/e2e/runner.mjs`: E2E suite runner executing Tiers 1-4 tests (25 tests).
  - `tests/adversarial_customer_portal_gen2.mjs`: Adversarial stress tests (20 tests).

## Feature Inventory
| # | Feature / Bug | Description | Milestone | Source | Status |
|---|---------------|-------------|-----------|--------|:------:|
| 1 | Eliminación de Tokens Ficticios en Physical4x1Builder | Eliminar fallbacks a tokens estáticos F0104-F0107 y tokens de relleno `WP-BLANK-*`. Validar tokens activos persistidos. | M_INVOICE_QR | Survey 1, 3 | PLANNED |
| 2 | Eliminación de Tokens Ficticios en SingleDigitalInvoiceBuilder | Eliminar fabricación de tokens sintéticos `-DIGITAL`. Requerir token canónico `WP-2026-F...` activo en BD. | M_INVOICE_QR | Survey 1, 3 | PLANNED |
| 3 | URL Canónica de Contingencia y CorrectLevel.H | Garantizar que todo QR generado codifique obligatoriamente `https://meltydeays-wired-club.vercel.app/?claim=${code}&folio=${folio}&pin=${pin}` con `QRCode.CorrectLevel.H`. Bloquear emisión de QRs con `claim=undefined`, `null` o sin token. | M_INVOICE_QR | Survey 1, 3 | PLANNED |
| 4 | Sincronización en Utilitarios Admin (CopyLink, TestUrl, WhatsApp) | Actualizar enlaces de contingencia en `AdminInvoiceBatchView.js` y `AdminInvoiceModalView.js` para incluir siempre `&folio=` y `&pin=`. | M_INVOICE_QR | Survey 1 | PLANNED |
| 5 | Ampliación Óptica de QR de WhatsApp en Factura Física | Incrementar `.qr-frame` en `invoice4x1Styles.js` de 30px a 52px con padding 3.5px, borde 1.5px sólido, fondo blanco puro `#FFFFFF` y quiet zone. | M_INVOICE_QR | Survey 2, 3 | PLANNED |
| 6 | Optimización Óptica de QR en Factura Digital | Ajustar `.single-page-invoice .qr-frame` en `invoiceSingleStyles.js` a 54px con padding 3.5px, borde 1.5px, fondo blanco y renderizado pixelado/crisp-edges. | M_INVOICE_QR | Survey 2 | PLANNED |
| 7 | Rediseño de Alto Contraste de .serial-code en Factura Física | Actualizar `.serial-code` en `invoice4x1Styles.js` a `font-size: 8.5px`, `font-weight: 800`, `color: #000000`, `letter-spacing: 0.5px`, fondo `#FFFFFF`, con gap 2.5px y sin truncamiento ni colapso de sello. | M_INVOICE_QR | Survey 2, 3 | PLANNED |
| 8 | Rediseño de Alto Contraste de .serial-code en Factura Digital | Actualizar `.compact-barcode .serial-code` en `invoiceSingleStyles.js` a `font-size: 8.5px`, `font-weight: 800`, `color: #000000`, `max-width: 340px`, fondo `#FFFFFF`. | M_INVOICE_QR | Survey 2, 3 | PLANNED |
| 9 | Fortalecimiento de Pruebas E2E y Adversariales | Fortalecer aserciones en `tests/adversarial_customer_portal_gen2.mjs` (ADV-5.2, ADV-6.4, ADV-6.6) y `tests/e2e/tier4_realworld.test.mjs` para verificar R1, R2 y R3 manteniendo 25/25 y 20/20 pruebas aprobadas. | M_INVOICE_QR | Survey 3 | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status | Output |
|---|------|-------|-------------|:------:|--------|
| M_INVOICE_QR | Invoice QR Synchronization, Optical WhatsApp QR & High-Contrast Typography | All Features 1-9 across builders, styles, admin views, and test suites | none | IN_PROGRESS | Remediated files, 25/25 E2E pass, 20/20 Adversarial pass, Reviewers/Challengers APPROVE, Auditor CLEAN |

## Interface Contracts
### Builders ↔ QR Code Rendering
- `Physical4x1Builder`: URL template MUST be `https://meltydeays-wired-club.vercel.app/?claim=${code}&folio=${folio}&pin=${pin}`.
- `SingleDigitalInvoiceBuilder`: URL template MUST be `https://meltydeays-wired-club.vercel.app/?claim=${code}&folio=${folio}&pin=${pin}`.
- `QRCode.CorrectLevel`: MUST strictly use `QRCode.CorrectLevel.H`.
- Emitting any QR with `claim=undefined`, `claim=null`, or synthetic unpersisted token is strictly rejected.

### CSS ↔ DOM Layout
- `.qr-frame`: width and height MUST be >= 48px, background `#ffffff`, defined solid border.
- `.serial-code`: font-size MUST be >= 8px, font-family `'JetBrains Mono', monospace`, font-weight >= 800, color `#000000`, background `#ffffff`.

## Code Layout
- `js/templates/builders/Physical4x1Builder.js`: Owned by Worker M_INVOICE_QR
- `js/templates/builders/SingleDigitalInvoiceBuilder.js`: Owned by Worker M_INVOICE_QR
- `js/templates/styles/invoice4x1Styles.js`: Owned by Worker M_INVOICE_QR
- `js/templates/styles/invoiceSingleStyles.js`: Owned by Worker M_INVOICE_QR
- `js/views/AdminInvoiceBatchView.js`: Owned by Worker M_INVOICE_QR
- `js/views/AdminInvoiceModalView.js`: Owned by Worker M_INVOICE_QR
- `tests/adversarial_customer_portal_gen2.mjs`: Owned by Worker M_INVOICE_QR
- `tests/e2e/tier4_realworld.test.mjs`: Owned by Worker M_INVOICE_QR
