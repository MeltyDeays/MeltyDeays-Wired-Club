/**
 * Estilos Exclusivos para Factura Digital Individual (1 Página Completa)
 * @param {object} dims - Dimensiones de papel ({ name, widthMm, heightMm, cssSize })
 * @returns {string} Bloque CSS
 */
export function getInvoiceSingleStyles(dims = { name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' }) {
  return `
    /* ========================================================
       BARRA DE HERRAMIENTAS SUPERIOR (TERMINAL VOID BLACK / CYBER CYAN)
       ======================================================== */
    body {
      margin: 0;
      padding: 0;
      background: #090e17;
      font-family: 'Inter', -apple-system, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(9, 14, 23, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1.5px solid rgba(56, 189, 248, 0.35);
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .toolbar-info h1 {
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.92rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-info p {
      margin: 2px 0 0 0;
      font-size: 0.73rem;
      color: #94a3b8;
      font-family: 'Inter', sans-serif;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .view-mode-group {
      display: inline-flex;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }

    .toolbar-lain-selector {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 6px;
      padding: 2px 8px;
    }

    .toolbar-lain-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 800;
      color: #38bdf8;
      white-space: nowrap;
    }

    .copland-select-toolbar {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 4px;
      padding: 4px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      max-width: 250px;
      outline: none;
      transition: all 0.2s;
    }

    .copland-select-toolbar:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
    }

    .toolbar .btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.16s ease;
      outline: none;
      white-space: nowrap;
      border: none;
    }

    .toolbar .btn-mode {
      background: transparent;
      color: #94a3b8;
      padding: 5px 10px;
    }

    .toolbar .btn-mode:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }

    .toolbar .btn-mode.active {
      background: #0284c7;
      color: #ffffff;
      font-weight: 800;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }

    .toolbar .btn-sec {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    .toolbar .btn-sec:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: #38bdf8;
      color: #ffffff;
      transform: translateY(-1px);
    }

    .toolbar .btn-bw {
      background: rgba(148, 163, 184, 0.12);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }

    .toolbar .btn-bw.active {
      background: #ffffff;
      color: #000000;
      border-color: #ffffff;
      font-weight: 900;
    }

    .toolbar .btn-print {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      font-weight: 800;
      border: 1px solid #38bdf8;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.35);
    }

    .toolbar .btn-print:hover {
      background: linear-gradient(135deg, #38bdf8, #0284c7);
      color: #070b14;
      border-color: #ffffff;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
      transform: translateY(-1px);
    }

    /* ========================================================
       ESTILOS EXCLUSIVOS DE LA FACTURA DIGITAL INDIVIDUAL (1 PÁGINA)
       CONSISTENCIA 100% IDÉNTICA AL TALONARIO FÍSICO 4X1
       ======================================================== */
    .single-digital-invoice-page {
      width: 8.5in !important;
      max-width: 8.5in !important;
      height: 11in !important;
      min-height: 11in !important;
      max-height: 11in !important;
      margin: 20px auto !important;
      background: #ffffff !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45) !important;
      box-sizing: border-box !important;
      position: relative !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    .single-page-invoice {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      max-height: 11in !important;
      margin: 0 !important;
      padding: 0.35in 0.45in 0.30in 0.45in !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      background-color: #ffffff !important;
      background-image: radial-gradient(#cbd5e1 0.85px, transparent 0.85px) !important;
      background-size: 8px 8px !important;
      position: relative !important;
      box-shadow: none !important;
      flex: 1 1 auto !important;
    }

    /* ENCABEZADO */
    .single-page-invoice .inv-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      border-bottom: 2px solid #0f172a !important;
      padding-bottom: 6px !important;
      margin-bottom: 6px !important;
      background: rgba(255, 255, 255, 0.94) !important;
    }
    .single-page-invoice .brand-top-lockup {
      gap: 10px !important;
    }
    .single-page-invoice .brand-badge-icon {
      width: 52px !important;
      height: 52px !important;
    }
    .single-page-invoice .brand-word-melty {
      font-size: 24px !important;
      font-weight: 900 !important;
      letter-spacing: -0.6px !important;
      color: #0f172a !important;
    }
    .single-page-invoice .brand-word-deays {
      font-size: 24px !important;
      font-weight: 900 !important;
      letter-spacing: -0.4px !important;
      color: #db2777 !important;
    }
    .single-page-invoice .brand-pill-tag {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      font-weight: 800 !important;
      letter-spacing: 0.6px !important;
      background: #eef2ff !important;
      color: #4338ca !important;
      border: 1px solid #c7d2fe !important;
      border-radius: 3px !important;
      padding: 2px 6px !important;
      line-height: 1 !important;
      text-transform: uppercase !important;
    }
    .single-page-invoice .brand-kicker {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 9px !important;
      font-weight: 800 !important;
      letter-spacing: 0.8px !important;
      color: #475569 !important;
      text-transform: uppercase !important;
      line-height: 1.1 !important;
    }
    .single-page-invoice .brand-subitems {
      font-size: 8.5px !important;
      font-weight: 700 !important;
      color: #4f46e5 !important;
      line-height: 1.1 !important;
    }

    /* FOLIO Y FECHA */
    .single-page-invoice .meta-boxes {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 5px !important;
    }
    .single-page-invoice .folio-box {
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      padding: 2.5px 8px !important;
      background: #ffffff !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.12) !important;
    }
    .single-page-invoice .folio-label {
      font-size: 10.5px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      letter-spacing: 0.5px !important;
    }
    .single-page-invoice .folio-write-zone {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 13.5px !important;
      font-weight: 900 !important;
      color: #e11d48 !important;
      min-width: 100px !important;
      height: 22px !important;
      line-height: 22px !important;
      text-align: center !important;
      border: none !important;
      border-bottom: none !important;
      text-decoration: none !important;
      outline: none !important;
      background: transparent !important;
      padding: 0 8px !important;
      box-shadow: none !important;
    }
    .single-page-invoice .date-row {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      white-space: nowrap !important;
    }
    .single-page-invoice .date-label {
      font-size: 9.5px !important;
      font-weight: 800 !important;
      color: #1e293b !important;
    }
    .single-page-invoice .date-input-area {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
    }
    .single-page-invoice .date-slot {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      border: 1.2px solid #94a3b8 !important;
      border-radius: 3px !important;
      width: 26px !important;
      height: 20px !important;
      line-height: 20px !important;
      text-align: center !important;
      background: #ffffff !important;
      color: #0f172a !important;
    }
    .single-page-invoice .date-slot.year {
      width: 44px !important;
    }
    .single-page-invoice .date-slot.time-slot {
      width: 82px !important;
      white-space: nowrap !important;
    }
    .single-page-invoice .date-sep {
      font-size: 11px !important;
      font-weight: 800 !important;
      color: #94a3b8 !important;
    }

    /* BARRA DE CLIENTE Y PAGO */
    .single-page-invoice .client-bar {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: rgba(248, 250, 252, 0.95) !important;
      border: 1.2px solid #cbd5e1 !important;
      border-radius: 4px !important;
      padding: 6px 12px !important;
      margin: 6px 0 8px 0 !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
    .single-page-invoice .client-name-group {
      display: flex !important;
      align-items: baseline !important;
      gap: 8px !important;
      flex-grow: 1 !important;
      margin-right: 16px !important;
    }
    .single-page-invoice .c-label {
      font-size: 10px !important;
      font-weight: 900 !important;
      color: #0f172a !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .single-page-invoice .client-name {
      border-bottom: 1.5px solid #475569 !important;
      flex-grow: 1 !important;
      height: 22px !important;
      font-size: 12.5px !important;
      font-weight: 700 !important;
      line-height: 22px !important;
      padding: 0 6px !important;
      color: #0f172a !important;
    }
    .single-page-invoice .payment-options {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      font-size: 10.5px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      white-space: nowrap !important;
    }
    .single-page-invoice .pay-check {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }
    .single-page-invoice .box-square {
      width: 13px !important;
      height: 13px !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 2px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #ffffff !important;
      font-size: 9.5px !important;
      line-height: 13px !important;
      font-weight: 900 !important;
      color: #0f172a !important;
    }
    .single-page-invoice .box-square.active-square {
      background: #0f172a !important;
      color: #ffffff !important;
    }

    .single-page-invoice .table-box {
      margin: 8px 0 10px 0 !important;
      flex-grow: 1 !important;
      flex: 1 1 auto !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .single-page-invoice .items-table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1.5px solid #0f172a !important;
      height: 100% !important;
      flex: 1 1 auto !important;
      background: #ffffff !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
      table-layout: fixed !important;
    }
    .single-page-invoice .items-table th {
      background: #0f172a !important;
      color: #ffffff !important;
      font-size: 10.5px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      padding: 7px 8px !important;
      border-right: 1px solid #475569 !important;
      border-bottom: 1.5px solid #0f172a !important;
      height: 28px !important;
    }
    .single-page-invoice .items-table th:last-child {
      border-right: none !important;
    }
    .single-page-invoice .items-table td {
      border: 1.2px solid #334155 !important;
      padding: 6px 10px !important;
      font-size: 12px !important;
      color: #0f172a !important;
      vertical-align: middle !important;
      height: 38px !important;
    }
    .single-page-invoice .items-table tbody tr:nth-child(even) td {
      background: rgba(248, 250, 252, 0.94) !important;
    }
    .single-page-invoice .items-table tbody tr:nth-child(odd) td {
      background: #ffffff !important;
    }
    .single-page-invoice .col-cant {
      width: 55px !important;
      text-align: center !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 700 !important;
    }
    .single-page-invoice .col-desc {
      text-align: left !important;
      font-weight: 600 !important;
    }
    .single-page-invoice .col-price {
      width: 105px !important;
      text-align: right !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 700 !important;
    }
    .single-page-invoice .col-total {
      width: 115px !important;
      text-align: right !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 800 !important;
    }

    /* SECCION TOTALES */
    .single-page-invoice .totals-area {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
      padding: 6px 10px !important;
      margin: 6px 0 8px 0 !important;
      gap: 16px !important;
      background: rgba(255, 255, 255, 0.85) !important;
      border-radius: 4px !important;
    }
    .single-page-invoice .thanks-title {
      font-family: 'Caveat', cursive, sans-serif !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #4f46e5 !important;
      font-style: italic !important;
      line-height: 1.2 !important;
    }
    .single-page-invoice .thanks-conversion {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 9.5px !important;
      color: #475569 !important;
      margin-top: 3px !important;
    }
    .single-page-invoice .thanks-wired-badge {
      display: inline-flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-left: 3px solid #4f46e5 !important;
      border-radius: 3px !important;
      padding: 3.5px 8px !important;
      margin-top: 5px !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 8.5px !important;
      color: #1e293b !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
    .single-page-invoice .thanks-wired-badge code {
      background: #ffffff !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      border: 1px solid #c7d2fe !important;
    }
    .single-page-invoice .totals-receipt {
      width: 220px !important;
      gap: 4px !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .single-page-invoice .totals-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      line-height: 1.1 !important;
    }
    .single-page-invoice .t-label-text {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
    }
    .single-page-invoice .t-write-line {
      display: flex !important;
      align-items: baseline !important;
      border-bottom: 1.5px solid #94a3b8 !important;
      width: 105px !important;
      justify-content: flex-end !important;
      padding-right: 2px !important;
    }
    .single-page-invoice .curr {
      font-size: 9.5px !important;
      font-weight: 800 !important;
      color: #475569 !important;
      margin-right: 3px !important;
    }
    .single-page-invoice .val-sub,
    .single-page-invoice .val-desc {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
    }
    .single-page-invoice .totals-row.final-total {
      background: #ffffff !important;
      color: #0f172a !important;
      border: 2px solid #0f172a !important;
      padding: 5px 8px !important;
      border-radius: 4px !important;
      margin-top: 2px !important;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.15) !important;
    }
    .single-page-invoice .totals-row.final-total .t-label-text {
      color: #0f172a !important;
      font-size: 11.5px !important;
      font-weight: 900 !important;
      letter-spacing: 0.5px !important;
    }
    .single-page-invoice .totals-row.final-total .t-write-line {
      border: none !important;
      border-bottom: none !important;
      text-decoration: none !important;
      outline: none !important;
      box-shadow: none !important;
      width: 110px !important;
    }
    .single-page-invoice .totals-row.final-total .curr {
      color: #0f172a !important;
      font-size: 11px !important;
      font-weight: 900 !important;
    }
    .single-page-invoice .totals-row.final-total .val-tot {
      color: #0f172a !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      font-family: 'JetBrains Mono', monospace !important;
    }

    /* GARANTIA */
    .single-page-invoice .warranty-card {
      background: #fefce8 !important;
      border: 1px solid #fef08a !important;
      border-left: 3.5px solid #d97706 !important;
      border-radius: 4px !important;
      padding: 7px 12px !important;
      margin: 6px 0 8px 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 3px !important;
      box-shadow: 0 1px 3px rgba(217, 119, 6, 0.08) !important;
    }
    .single-page-invoice .warranty-header-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 1px dashed #f59e0b !important;
      padding-bottom: 2px !important;
    }
    .single-page-invoice .w-title {
      font-size: 9px !important;
      font-weight: 800 !important;
      color: #b45309 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
    }
    .single-page-invoice .w-period-box {
      display: flex !important;
      align-items: baseline !important;
      gap: 4px !important;
      background: #ffffff !important;
      border: 1px solid #d97706 !important;
      border-radius: 3px !important;
      padding: 1px 6px !important;
    }
    .single-page-invoice .w-period-label {
      font-size: 8px !important;
      font-weight: 800 !important;
      color: #92400e !important;
      text-transform: uppercase !important;
    }
    .single-page-invoice .w-period-write {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      color: #b45309 !important;
      min-width: 80px !important;
      text-align: center !important;
      border-bottom: 1px solid #d97706 !important;
      line-height: 14px !important;
    }
    .single-page-invoice .warranty-text {
      font-size: 8.5px !important;
      font-weight: 700 !important;
      line-height: 1.45 !important;
      color: #92400e !important;
    }
    .single-page-invoice .warranty-text strong {
      font-weight: 900 !important;
      color: #92400e !important;
    }

    /* PIE DE PAGINA */
    .single-page-invoice .inv-bottom {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-top: 1px dashed #cbd5e1 !important;
      padding-top: 8px !important;
    }
    .single-page-invoice .contact-qr-group {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .single-page-invoice .qr-col {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 2.5px !important;
    }
    .single-page-invoice .qr-frame {
      width: 52px !important;
      height: 52px !important;
      border: 1.2px solid #0f172a !important;
      border-radius: 3px !important;
      padding: 2px !important;
      background: #ffffff !important;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.08) !important;
    }
    .single-page-invoice .qr-img {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
    }
    .single-page-invoice .qr-badge-wa {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7px !important;
      font-weight: 800 !important;
      letter-spacing: 0.4px !important;
      background: #10b981 !important;
      color: #ffffff !important;
      padding: 1.5px 6px !important;
      border-radius: 2px !important;
      line-height: 1 !important;
      text-transform: uppercase !important;
    }
    .single-page-invoice .qr-badge-wired {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7px !important;
      padding: 1.5px 6px !important;
      background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
      color: #ffffff !important;
      border-radius: 2px !important;
      font-weight: 800 !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase !important;
      line-height: 1 !important;
      display: inline-block !important;
      margin-top: 2px !important;
    }
    .single-page-invoice .contact-meta {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }
    .single-page-invoice .contact-row {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .single-page-invoice .badge-tag {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      font-weight: 800 !important;
      padding: 1.5px 5px !important;
      border-radius: 2px !important;
      color: #ffffff !important;
      line-height: 1 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      width: 58px !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
    .single-page-invoice .tag-ig { background: #db2777 !important; }
    .single-page-invoice .tag-tel { background: #0284c7 !important; }
    .single-page-invoice .tag-mail { background: #e11d48 !important; }
    .single-page-invoice .contact-text {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
    }
    .single-page-invoice .signature-block {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 1px !important;
      width: 170px !important;
    }
    .single-page-invoice .sign-seal-wrapper {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      height: 38px !important;
      width: 100% !important;
    }
    .single-page-invoice .digital-signature {
      font-family: 'Caveat', cursive, sans-serif !important;
      font-size: 2.4rem !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      line-height: 1 !important;
      transform: rotate(-3deg) !important;
      display: inline-block !important;
      z-index: 1 !important;
    }
    .single-page-invoice .seal-stamp {
      width: 40px !important;
      height: 40px !important;
      border: 1.5px dashed #e11d48 !important;
      border-radius: 50% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      color: #e11d48 !important;
      position: absolute !important;
      right: 4px !important;
      top: -2px !important;
      background: rgba(255, 255, 255, 0.75) !important;
      box-shadow: 0 0 0 1.5px rgba(225, 29, 72, 0.25) !important;
      transform: rotate(8deg) !important;
      z-index: 2 !important;
    }
    .single-page-invoice .seal-star { font-size: 7px !important; line-height: 1 !important; }
    .single-page-invoice .seal-text { font-size: 9px !important; font-weight: 900 !important; letter-spacing: 0.5px !important; line-height: 1 !important; }
    .single-page-invoice .seal-sub { font-size: 5px !important; font-weight: 800 !important; letter-spacing: 0.5px !important; line-height: 1 !important; }
    .single-page-invoice .sign-underline {
      height: 1.5px !important;
      background: #0f172a !important;
      width: 100% !important;
      margin: 2px 0 !important;
    }
    .single-page-invoice .sign-caption {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 8px !important;
      font-weight: 800 !important;
      color: #475569 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
    }

/* REVERSO COLECCIONABLE LAIN (PÁGINA COMPLETA 8.5" x 11") */
    .single-page-lain-card {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      max-height: 11in !important;
      margin: 0 !important;
      padding: 0.35in 0.45in 0.30in 0.45in !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      background-color: #ffffff !important;
      background-image: radial-gradient(#e2e8f0 0.85px, transparent 0.85px) !important;
      background-size: 8px 8px !important;
      position: relative !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: none !important;
      flex: 1 1 auto !important;
    }
    .single-page-lain-card .lain-header {
      border-bottom: 2px solid #0f172a !important;
      padding-bottom: 5px !important;
    }
    .single-page-lain-card .badge-navi,
    .single-page-lain-card .badge-layer {
      font-size: 8px !important;
      padding: 2.5px 7px !important;
    }
    .single-page-lain-card .badge-status-live {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      font-weight: 800 !important;
      color: #15803d !important;
      background: #dcfce7 !important;
      border: 1px solid #86efac !important;
      padding: 2px 6px !important;
      border-radius: 2px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 3px !important;
    }
    .single-page-lain-card .lain-os-tag {
      font-size: 8.5px !important;
      letter-spacing: 0.4px !important;
    }
    .single-page-lain-card .lain-main-title {
      font-size: 17px !important;
      letter-spacing: 0.5px !important;
      line-height: 1.15 !important;
    }
    .single-page-lain-card .lain-sub-title {
      font-size: 8px !important;
      color: #64748b !important;
    }

    /* HERO SCHEMATIC SECTION (BLANCO LIMPIO // ESQUEMA TÉCNICO ALTA RESOLUCIÓN) */
    .single-page-lain-card .hero-schematic-section {
      display: flex !important;
      flex-direction: column !important;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      box-shadow: 2px 2px 0px rgba(15, 23, 42, 0.12) !important;
      overflow: hidden !important;
      margin: 5px 0 !important;
      flex: 2 1 auto !important;
      min-height: 280px !important;
      box-sizing: border-box !important;
    }
    .single-page-lain-card .hero-schematic-section .figure-hud-header {
      font-size: 8.5px !important;
      padding: 4px 8px !important;
      background: #f1f5f9 !important;
      color: #0f172a !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      line-height: 1 !important;
      border-bottom: 1px solid #cbd5e1 !important;
    }
    .single-page-lain-card .hero-schematic-section .hud-status-dot {
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: #16a34a !important;
      box-shadow: 0 0 3px #16a34a !important;
    }
    .single-page-lain-card .hero-schematic-section .hud-title {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      color: #0f172a !important;
    }
    .single-page-lain-card .hero-schematic-section .hud-protocol {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      color: #475569 !important;
      font-weight: 800 !important;
    }
    .single-page-lain-card .schematic-telemetry-bar {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: #f8fafc !important;
      border-bottom: 1px dashed #cbd5e1 !important;
      padding: 3px 8px !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 6.8px !important;
      font-weight: 800 !important;
      color: #475569 !important;
    }
    .single-page-lain-card .hero-svg-container {
      flex: 1 1 auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 260px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .single-page-lain-card .hero-svg-container .lain-svg-inner {
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
    }
    .single-page-lain-card .hero-svg-container svg {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      max-height: 100% !important;
      object-fit: contain !important;
    }
    .single-page-lain-card .hero-schematic-section .figure-hud-footer {
      background: #f1f5f9 !important;
      border-top: 1px solid #cbd5e1 !important;
      padding: 3px 8px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7px !important;
      font-weight: 800 !important;
      line-height: 1 !important;
    }
    .single-page-lain-card .hero-schematic-section .hud-chip {
      color: #334155 !important;
      font-weight: 800 !important;
    }
    .single-page-lain-card .hero-schematic-section .hud-pass {
      color: #16a34a !important;
      font-weight: 900 !important;
    }

    /* CITA INTERCEPTADA CENTRADA */
    .single-page-lain-card .centered-quote-box {
      width: 100% !important;
      background: #faf5ff !important;
      border: 1px solid #e9d5ff !important;
      border-left: 3.5px solid #6366f1 !important;
      border-radius: 4px !important;
      padding: 6px 12px !important;
      margin: 4px 0 !important;
      text-align: center !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 2px !important;
    }
    .single-page-lain-card .centered-quote-box .trans-header {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 6.5px !important;
      font-weight: 900 !important;
      color: #4338ca !important;
      letter-spacing: 0.8px !important;
    }
    .single-page-lain-card .centered-quote-box .lain-kanji {
      font-family: 'Noto Sans JP', sans-serif !important;
      font-size: 8.5px !important;
      font-weight: 900 !important;
      color: #312e81 !important;
      letter-spacing: 0.6px !important;
    }
    .single-page-lain-card .centered-quote-box .lain-quote-text {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      font-weight: 700 !important;
      color: #1e1b4b !important;
      font-style: italic !important;
      line-height: 1.25 !important;
      max-width: 90% !important;
    }

    /* CONSOLA DE FIDELIZACIÓN CENTRADA (UN SOLO QR) */
    .single-page-lain-card .centered-reward-section {
      width: 100% !important;
      background: #ffffff !important;
      border: 1.5px solid #1e293b !important;
      border-radius: 4px !important;
      padding: 6px 10px !important;
      margin: 4px 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      box-shadow: 2px 2px 0px rgba(15, 23, 42, 0.08) !important;
      box-sizing: border-box !important;
      flex: 1 1 auto !important;
    }
    .single-page-lain-card .reward-header-pill {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7.5px !important;
      font-weight: 900 !important;
      color: #ffffff !important;
      background: #0f172a !important;
      padding: 2.5px 12px !important;
      border-radius: 3px !important;
      letter-spacing: 0.6px !important;
      text-align: center !important;
    }
    .single-page-lain-card .centered-points-card {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 4px !important;
      padding: 3px 12px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 1.5px !important;
    }
    .single-page-lain-card .reward-points-title {
      font-size: 7px !important;
      font-weight: 800 !important;
      color: #64748b !important;
      letter-spacing: 0.4px !important;
      text-transform: uppercase !important;
    }
    .single-page-lain-card .reward-points-row {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
    }
    .single-page-lain-card .reward-plus {
      font-size: 16px !important;
      font-weight: 900 !important;
      color: #0f172a !important;
      line-height: 1 !important;
    }
    .single-page-lain-card .reward-pencil-box {
      min-width: 55px !important;
      height: 24px !important;
      background: #ffffff !important;
      border: 1.2px dashed #94a3b8 !important;
      border-bottom: 2px solid #0f172a !important;
      border-radius: 2px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 6px !important;
    }
    .single-page-lain-card .reward-points-number {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      color: #4338ca !important;
      line-height: 1 !important;
    }
    .single-page-lain-card .reward-wp {
      font-size: 13px !important;
      font-weight: 900 !important;
      color: #e11d48 !important;
      line-height: 1 !important;
    }
    .single-page-lain-card .reward-points-sub {
      font-size: 6px !important;
      font-weight: 700 !important;
      color: #94a3b8 !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase !important;
    }
    .single-page-lain-card .centered-qr-frame {
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 3px !important;
      margin: 2px 0 !important;
    }
    .single-page-lain-card .centered-qr-frame .qr-canvas-box {
      width: 28mm !important;
      height: 28mm !important;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      padding: 1.8mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.12) !important;
      box-sizing: border-box !important;
    }
    .single-page-lain-card .centered-qr-frame .qr-canvas-box {
      width: 28mm !important;
      height: 28mm !important;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 4px !important;
      padding: 1.8mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.12) !important;
      box-sizing: border-box !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .single-page-lain-card .centered-qr-frame .qr-canvas-box canvas[style*="display: none"],
    .single-page-lain-card .centered-qr-frame .qr-canvas-box img[style*="display: none"] {
      display: none !important;
    }
    .single-page-lain-card .centered-qr-frame .qr-canvas-box canvas,
    .single-page-lain-card .centered-qr-frame .qr-canvas-box img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
    }
    .single-page-lain-card .centered-pin-tag {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 8px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      background: #f1f5f9 !important;
      border: 1px solid #cbd5e1 !important;
      padding: 2.5px 10px !important;
      border-radius: 3px !important;
      line-height: 1 !important;
    }
    .single-page-lain-card .centered-pin-tag strong {
      color: #4338ca !important;
      font-size: 8.5px !important;
    }
    .single-page-lain-card .centered-reward-sub {
      font-size: 6.5px !important;
      color: #64748b !important;
      text-align: center !important;
      font-weight: 700 !important;
      letter-spacing: 0.2px !important;
      line-height: 1.2 !important;
    }

    /* SPECS GRID */
    .single-page-lain-card .specs-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 4px !important;
      margin: 4px 0 !important;
    }
    .single-page-lain-card .spec-cell {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 3px !important;
      padding: 2.5px 5px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 1px !important;
    }
    .single-page-lain-card .spec-k {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 5.8px !important;
      font-weight: 800 !important;
      color: #64748b !important;
      letter-spacing: 0.4px !important;
    }
    .single-page-lain-card .spec-v {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 7px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      letter-spacing: 0.3px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    /* FOOTER & BARCODE COMPACTO (1/4 DE HOJA) */
    .single-page-lain-card .lain-footer {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      width: 100% !important;
      padding-top: 4px !important;
      border-top: 1.5px dashed #cbd5e1 !important;
      margin-top: auto !important;
    }
    .single-page-lain-card .compact-barcode {
      width: 28% !important;
      max-width: 200px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 1.5px !important;
    }
    .single-page-lain-card .compact-barcode .vector-barcode {
      width: 100% !important;
      height: 13px !important;
      padding: 1px 3px !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 2px !important;
      box-sizing: border-box !important;
    }
    .single-page-lain-card .compact-barcode .vector-barcode svg {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
    }
    .single-page-lain-card .compact-barcode .barcode-info-row {
      display: flex !important;
      width: 100% !important;
      justify-content: flex-start !important;
      align-items: center !important;
      margin-top: 1px !important;
    }
    .single-page-lain-card .compact-barcode .serial-code {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 6.8px !important;
      font-weight: 800 !important;
      color: #334155 !important;
      letter-spacing: 0.3px !important;
    }
    .single-page-lain-card .barcode-security-tag {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 5.5px !important;
      font-weight: 800 !important;
      color: #64748b !important;
      letter-spacing: 0.3px !important;
    }
    .single-page-lain-card .lain-seal-stamp {
      padding: 3px 8px !important;
    }
    .single-page-lain-card .stamp-org { font-size: 6.5px !important; }
    .single-page-lain-card .stamp-auth { font-size: 6.5px !important; }
    .single-page-lain-card .stamp-store { font-size: 7px !important; }

        /* REGLAS DE IMPRESIÓN EXCLUSIVAS PARA FACTURA INDIVIDUAL (1 PÁGINA) */
    @media print {
      html, body {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        height: auto !important;
      }
      .toolbar { display: none !important; }
      .single-digital-invoice-page {
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 8.5in !important;
        height: 11in !important;
        min-height: 11in !important;
        max-height: 11in !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .single-digital-invoice-page.sheet-front {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      body.print-both .single-digital-invoice-page.sheet-front {
        page-break-after: page !important;
        break-after: page !important;
      }
      .single-page-invoice,
      .single-page-lain-card {
        width: 100% !important;
        min-height: 100% !important;
        height: 100% !important;
        max-height: 11in !important;
        border: 1.5px solid #0f172a !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      @page { size: ${dims.cssSize}; margin: 0; }
    }`;
}
