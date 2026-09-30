/**
 * Estilos Maestros para Facturas Físicas 4x1 (Anverso y Reverso Lain / Haibane)
 * @param {object} dims - Dimensiones de papel ({ name, widthMm, heightMm, cssSize })
 * @returns {string} Bloque CSS
 */
export function getInvoice4x1Styles(dims = { name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' }) {
  return `    :root {
      --primary: #4f46e5;
      --primary-dark: #312e81;
      --accent: #db2777;
      --dark: #0f172a;
      --gray-800: #1e293b;
      --gray-700: #334155;
      --gray-600: #475569;
      --gray-400: #94a3b8;
      --gray-300: #cbd5e1;
      --gray-200: #e2e8f0;
      --gray-100: #f1f5f9;
      --gray-50: #f8fafc;
      --table-border: #334155;
      --table-line: #94a3b8;
      --dot-color: #cbd5e1;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ========================================================
       ESTILOS DEL ANVERSO: FACTURAS 4x1 (CON EFECTO DOT GRID)
       ======================================================== */
    .invoice {
      padding: 0.16in 0.20in 0.13in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      height: 5.5in;
      overflow: hidden;
      background-color: #ffffff;
      background-image: radial-gradient(#cbd5e1 0.75px, transparent 0.75px);
      background-size: 8px 8px;
      position: relative;
    }
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--dark);
      padding-bottom: 3.5px;
      margin-bottom: 3px;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 2px 2px 0 0;
    }
    .brand-group { display: flex; align-items: center; }
    .brand-top-lockup { display: flex; align-items: center; gap: 7px; }
    .brand-badge-icon {
      width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
    }
    .brand-text-col { display: flex; flex-direction: column; gap: 1.2px; }
    .brand-name-line { display: flex; align-items: center; gap: 4px; line-height: 1; }
    .brand-word-melty { font-size: 17.5px; font-weight: 900; letter-spacing: -0.6px; color: var(--dark); }
    .brand-word-deays { font-size: 17.5px; font-weight: 900; letter-spacing: -0.4px; color: var(--accent); }
    .brand-pill-tag {
      font-family: 'JetBrains Mono', monospace; font-size: 5.8px; font-weight: 800;
      letter-spacing: 0.6px; background: #eef2ff; color: #4338ca;
      border: 1px solid #c7d2fe; border-radius: 3px; padding: 1px 4.5px;
      line-height: 1; text-transform: uppercase;
    }
    .brand-kicker {
      font-family: 'JetBrains Mono', monospace; font-size: 6.8px; font-weight: 800;
      letter-spacing: 0.8px; color: #475569; line-height: 1.1; text-transform: uppercase;
    }
    .brand-subitems { font-size: 6.4px; font-weight: 700; color: var(--primary); line-height: 1.1; letter-spacing: 0.1px; }
    .meta-boxes { display: flex; flex-direction: column; align-items: flex-end; gap: 2.5px; }
    .folio-box {
      border: 1.5px solid var(--dark); border-radius: 4px; padding: 1.5px 6px;
      background: #ffffff; display: flex; align-items: center; gap: 4px;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.12);
    }
    .folio-label { font-size: 8px; font-weight: 800; color: var(--dark); letter-spacing: 0.3px; }
    .folio-write-zone {
      font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 800;
      color: var(--accent); min-width: 82px; height: 16px; line-height: 16px;
      text-align: right; padding: 0 4px; border: none !important; border-bottom: none !important; text-decoration: none !important; outline: none !important; box-shadow: none !important; background: transparent; letter-spacing: 0.5px;
    }
    .date-row { display: flex; align-items: center; gap: 3px; }
    .date-label { font-size: 7.5px; font-weight: 800; color: var(--gray-800); }
    .date-input-area { display: flex; align-items: center; gap: 2px; }
    .date-slot {
      font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
      border: 1px solid var(--gray-300); border-radius: 2px; width: 19px; height: 15px;
      line-height: 15px; text-align: center; background: #fff;
    }
    .date-slot.year { width: 32px; }
    .date-sep { font-size: 9px; font-weight: 800; color: var(--gray-400); }
    .client-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(248, 250, 252, 0.95); border: 1px solid var(--gray-300);
      border-radius: 4px; padding: 3.5px 7px; margin: 3px 0 4px 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .client-name-group { display: flex; align-items: baseline; gap: 4px; flex-grow: 1; margin-right: 6px; }
    .c-label { font-size: 7.8px; font-weight: 800; color: var(--gray-800); text-transform: uppercase; }
    .client-name {
      border-bottom: 1.2px solid var(--gray-400); flex-grow: 1; height: 15px;
      font-size: 9.8px; font-weight: 700; line-height: 15px; padding: 0 4px; color: var(--dark);
    }
    .payment-options { display: flex; align-items: center; gap: 7px; font-size: 7.8px; font-weight: 700; color: var(--gray-800); }
    .pay-check { display: flex; align-items: center; gap: 3px; cursor: pointer; }
    .box-square {
      width: 8.5px; height: 8.5px; border: 1.3px solid var(--dark);
      border-radius: 1.5px; display: inline-block; background: #fff;
    }
    .table-box { margin: 2px 0 3px 0; flex-grow: 1; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .items-table { width: 100%; border-collapse: collapse; height: 100%; background: #ffffff; }
    .items-table th {
      background: var(--dark); color: #ffffff; font-size: 7.8px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.4px; padding: 3.5px 4px;
      border-right: 1px solid var(--gray-600);
    }
    .items-table th:last-child { border-right: none; }
    .col-cant { width: 34px; text-align: center; }
    .col-desc { text-align: left; }
    .col-price { width: 48px; text-align: right; }
    .col-total { width: 52px; text-align: right; }
    .items-table td {
      border: 1px solid var(--table-border); height: 19px; padding: 0 4px;
      font-size: 9px; vertical-align: middle; color: var(--dark); font-weight: 600;
      background: rgba(255, 255, 255, 0.94);
    }
    .items-table tbody tr:nth-child(even) td { background: rgba(248, 250, 252, 0.94); }
    .items-table td.col-cant { font-family: 'JetBrains Mono', monospace; text-align: center; font-weight: 700; }
    .items-table td.col-price, .items-table td.col-total { font-family: 'JetBrains Mono', monospace; text-align: right; font-weight: 700; }
    .totals-area {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin: 3px 0 4px 0; padding: 2px 4px; background: rgba(255, 255, 255, 0.85); border-radius: 3px;
    }
    .thanks-note { font-size: 8px; font-weight: 700; color: var(--primary); font-style: italic; line-height: 1.2; }
    .totals-receipt { display: flex; flex-direction: column; gap: 1.5px; width: 138px; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; line-height: 1.1; }
    .t-label-text { font-size: 7.8px; font-weight: 700; color: var(--gray-800); }
    .t-write-line {
      display: flex; align-items: baseline; border-bottom: 1.2px solid var(--gray-400);
      width: 68px; justify-content: flex-end; padding-right: 2px;
    }
    .curr { font-size: 7.5px; font-weight: 800; color: var(--gray-600); margin-right: 2px; }
    .val-sub, .val-desc, .val-tot { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: var(--dark); }
    .totals-row.final-total {
      background: #ffffff; color: var(--dark); border: 1.5px solid var(--dark);
      padding: 2.5px 5px; border-radius: 3px; margin-top: 1.5px;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.1);
    }
    .totals-row.final-total .t-label-text { color: var(--dark); font-size: 8.5px; font-weight: 900; letter-spacing: 0.3px; }
    .totals-row.final-total .t-write-line { border: none !important; border-bottom: none !important; text-decoration: none !important; outline: none !important; box-shadow: none !important; width: 68px; }
    .totals-row.final-total .curr { color: var(--dark); font-size: 8px; font-weight: 900; }
    .totals-row.final-total .val-tot { color: var(--dark); font-size: 11px; font-weight: 900; }
    .warranty-card {
      background: #fefce8; border: 1px solid #fef08a; border-left: 2.5px solid #d97706;
      border-radius: 3px; padding: 3.5px 6px; margin: 3px 0 4px 0;
      display: flex; flex-direction: column; gap: 2px;
      box-shadow: 0 1px 2px rgba(217, 119, 6, 0.08);
    }
    .warranty-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #f59e0b; padding-bottom: 1.5px; }
    .w-title { font-size: 6.8px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.3px; }
    .w-period-box { display: flex; align-items: baseline; gap: 3px; background: #ffffff; border: 1px solid #d97706; border-radius: 2px; padding: 0 4px; }
    .w-period-label { font-size: 6.2px; font-weight: 800; color: #92400e; text-transform: uppercase; }
    .w-period-write {
      font-family: 'JetBrains Mono', monospace; font-size: 8.5px; font-weight: 800;
      color: #b45309; min-width: 44px; text-align: center; border-bottom: 1px solid #d97706; line-height: 11px;
    }
    .warranty-text { font-size: 6.2px; font-weight: 700; line-height: 1.35; color: #92400e; }
    .warranty-text strong { font-weight: 900; color: #92400e; }
    .inv-bottom {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1.2px solid var(--gray-300); padding-top: 3.5px;
      background: rgba(255, 255, 255, 0.9); border-radius: 0 0 2px 2px;
    }
    .contact-qr-group { display: flex; align-items: center; gap: 6px; }
    .qr-col { display: flex; flex-direction: column; align-items: center; gap: 2px; flex-shrink: 0; }
    .qr-frame {
      width: 30px; height: 30px; padding: 1px; background: #ffffff;
      border: 1.2px solid var(--dark); border-radius: 3px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;
    }
    .qr-img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
    .qr-badge-wa {
      background: linear-gradient(135deg, #16a34a, #059669); color: #ffffff;
      font-size: 5.2px; font-weight: 800; padding: 1px 3.5px; border-radius: 2px;
      letter-spacing: 0.3px; text-transform: uppercase; line-height: 1;
      box-shadow: 0 1px 2px rgba(22, 163, 74, 0.25);
    }
    .contact-meta { display: flex; flex-direction: column; gap: 2px; }
    .contact-row { display: flex; align-items: center; gap: 4px; line-height: 1.15; }
    .badge-tag {
      font-size: 5.6px; font-weight: 800; padding: 1.2px 4px; border-radius: 2px;
      text-transform: uppercase; letter-spacing: 0.25px; line-height: 1; display: inline-block; flex-shrink: 0;
    }
    .tag-ig { background: linear-gradient(135deg, #c13584, #833ab4); color: #ffffff; box-shadow: 0 1px 2px rgba(193, 53, 132, 0.25); }
    .tag-tel { background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.25); }
    .tag-mail { background: linear-gradient(135deg, #ea4335, #c5221f); color: #ffffff; box-shadow: 0 1px 2px rgba(234, 67, 53, 0.25); }
    .contact-text { font-size: 7px; font-weight: 700; color: var(--dark); font-family: 'JetBrains Mono', monospace; }
    .signature-block { display: flex; flex-direction: column; align-items: center; width: 112px; }
    .sign-seal-wrapper { position: relative; width: 100%; height: 26px; display: flex; align-items: flex-end; padding-bottom: 0.5px; }
    .digital-signature {
      font-family: 'Caveat', cursive; font-size: 19px; font-weight: 700;
      color: #1e1b4b; letter-spacing: 0.5px; transform: rotate(-3.5deg);
      display: inline-block; line-height: 0.85;
      text-shadow: 0.5px 0.5px 1px rgba(79, 70, 229, 0.25); white-space: nowrap;
    }
    .seal-stamp {
      width: 25px; height: 25px; border: 1.2px dashed #dc2626; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #dc2626; line-height: 1; transform: rotate(-9deg);
      background: rgba(254, 242, 242, 0.7); box-shadow: inset 0 0 2px rgba(220, 38, 38, 0.2);
      flex-shrink: 0; user-select: none;
    }
    .seal-star { font-size: 4.2px; line-height: 1; color: #dc2626; }
    .seal-text { font-size: 5.5px; font-weight: 900; letter-spacing: 0.3px; }
    .seal-sub { font-size: 3.2px; font-weight: 800; letter-spacing: 0.2px; text-transform: uppercase; }
    /* ========================================================
       SERIE 3: HAIBANE RENMEI — ESTILOS DEDICADOS (ANVERSO & REVERSO)
       ======================================================== */
    .invoice.theme-haibane {
      --primary: #047857;
      --primary-dark: #064e3b;
      --accent: #b45309;
      --dark: #1c1917;
      background-color: #fdfbf7;
      background-image: radial-gradient(#d6d3d1 0.75px, transparent 0.75px);
      border-color: #78350f;
    }
    .invoice.theme-haibane .inv-header {
      border-bottom: 2px solid #78350f;
      background: rgba(253, 251, 247, 0.94);
    }
    .invoice.theme-haibane .brand-word-deays {
      color: #b45309;
    }
    .invoice.theme-haibane .brand-pill-tag {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .invoice.theme-haibane .brand-subitems {
      color: #047857;
    }
    .invoice.theme-haibane .folio-box {
      border-color: #78350f;
    }
        .invoice.theme-haibane .folio-label {
      background: #78350f;
      color: #fef3c7;
    }
    .invoice.theme-haibane .folio-write-zone {
      color: #b45309;
      border-bottom: none !important;
      background: transparent !important;
      font-size: 13px !important;
      font-weight: 900 !important;
    }
    .invoice.theme-haibane .items-table th {
      background: #1c1917;
      color: #fef08a;
      border-color: #78350f;
    }
    .invoice.theme-haibane .final-total .t-label-text {
      background: #78350f;
      color: #fef3c7;
    }
        .invoice.theme-haibane .final-total .t-write-line {
      border-bottom: none !important;
      color: #78350f;
    }
    .invoice.theme-haibane .final-total .val-tot {
      color: #78350f;
      font-size: 11.5px !important;
      font-weight: 900 !important;
    }
    .invoice.theme-haibane .thanks-note {
      color: #92400e;
    }
    .invoice.theme-haibane .seal-stamp {
      border-color: #b45309;
      color: #78350f;
      background: #fef3c7;
    }

    /* REVERSO SERIE 3: HAIBANE RENMEI */
    .lain-card.theme-haibane {
      background-color: #fcfaf7;
      background-image: radial-gradient(#d6d3d1 0.75px, transparent 0.75px);
      border: 1.5px solid #78350f;
    }
    .lain-card.theme-haibane .tech-corner {
      color: #d97706;
      font-size: 8px;
    }
    .lain-card.theme-haibane .lain-header {
      border-bottom: 1.5px solid #78350f;
    }
    .lain-card.theme-haibane .badge-navi {
      background: #1c1917;
      color: #fef3c7;
    }
    .lain-card.theme-haibane .badge-layer {
      background: #b45309;
      color: #fffbeb;
    }
    .lain-card.theme-haibane .lain-os-tag {
      color: #854d0e;
    }
    .lain-card.theme-haibane .lain-main-title {
      color: #1c1917;
    }
    .lain-card.theme-haibane .lain-sub-title {
      color: #854d0e;
    }
    .lain-card.theme-haibane .lain-figure-col {
      border-color: #78350f;
      box-shadow: 2px 2px 0px rgba(120, 53, 15, 0.15);
    }
    .lain-card.theme-haibane .figure-hud-header {
      background: #1c1917;
      color: #fde047;
      border-bottom-color: #78350f;
    }
    .lain-card.theme-haibane .hud-status-dot {
      background: #f59e0b;
      box-shadow: 0 0 3px #f59e0b;
    }
    .lain-card.theme-haibane .hud-protocol {
      color: #fde68a;
    }
    .lain-card.theme-haibane .lain-svg-container {
      background: #fffdfa;
      background-image: 
        linear-gradient(rgba(217, 119, 6, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(217, 119, 6, 0.08) 1px, transparent 1px);
    }
    .lain-card.theme-haibane .hud-cross-tl,
    .lain-card.theme-haibane .hud-cross-tr,
    .lain-card.theme-haibane .hud-cross-bl,
    .lain-card.theme-haibane .hud-cross-br {
      color: #d97706;
    }
    .lain-card.theme-haibane .figure-hud-footer {
      background: #fef3c7;
      border-top-color: #fde68a;
      color: #78350f;
    }
    .lain-card.theme-haibane .hud-chip {
      color: #92400e;
    }
    .lain-card.theme-haibane .hud-pass {
      color: #047857;
    }
    .lain-card.theme-haibane .lain-reward-col {
      border-color: #78350f;
      box-shadow: 2px 2px 0px rgba(120, 53, 15, 0.15);
    }
    .lain-card.theme-haibane .reward-tag {
      background: #064e3b;
      color: #fef08a;
    }
    .lain-card.theme-haibane .reward-wp {
      color: #b45309;
    }
    .lain-card.theme-haibane .qr-reticle-tl,
    .lain-card.theme-haibane .qr-reticle-tr,
    .lain-card.theme-haibane .qr-reticle-bl,
    .lain-card.theme-haibane .qr-reticle-br {
      color: #b45309;
    }
    .lain-card.theme-haibane .qr-canvas-box {
      border-color: #78350f;
    }
    .lain-card.theme-haibane .reward-pin-tag {
      background: #fef3c7;
      border-color: #fcd34d;
      color: #78350f;
    }
    .lain-card.theme-haibane .reward-pin-tag strong {
      color: #047857;
    }
    .lain-card.theme-haibane .lain-quote-box {
      background: #fffdfa;
      border-color: #fed7aa;
      border-left: 3px solid #b45309;
    }
    .lain-card.theme-haibane .lain-kanji {
      color: #b45309;
    }
    .lain-card.theme-haibane .lain-quote-text {
      color: #1c1917;
    }
    .lain-card.theme-haibane .specs-grid .spec-cell {
      border-color: #e7e5e4;
      background: #fffdfa;
    }
    .lain-card.theme-haibane .spec-k {
      color: #78716c;
    }
    .lain-card.theme-haibane .spec-v {
      color: #1c1917;
    }
    .lain-card.theme-haibane .lain-seal-stamp {
      background: #fef3c7;
      border: 1px dashed #b45309;
    }
    .lain-card.theme-haibane .stamp-org {
      color: #78350f;
    }
    .lain-card.theme-haibane .stamp-auth {
      color: #b45309;
    }
    .lain-card.theme-haibane .stamp-store {
      color: #1c1917;
    }

    .sign-underline { border-bottom: 1.2px solid var(--dark); width: 100%; margin-top: 1.5px; margin-bottom: 1.5px; }
    .sign-caption { font-size: 5.8px; font-weight: 700; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.2px; }

        /* ========================================================
       ESTILOS DEL REVERSO: SERIAL EXPERIMENTS LAIN / COPLAND OS
       ======================================================== */
    .lain-card {
      padding: 0.16in 0.18in 0.14in; display: flex; flex-direction: column;
      justify-content: space-between; box-sizing: border-box; height: 5.5in;
      overflow: hidden; background-color: #f8fafc;
      background-image: radial-gradient(#cbd5e1 0.75px, transparent 0.75px);
      background-size: 8px 8px; position: relative; border: 1px solid #e2e8f0;
    }
    .tech-corner {
      position: absolute; font-family: 'JetBrains Mono', monospace;
      font-size: 9px; font-weight: 800; color: #94a3b8; line-height: 1; pointer-events: none;
    }
    .tech-corner.top-left { top: 6px; left: 8px; }
    .tech-corner.top-right { top: 6px; right: 8px; }
    .tech-corner.bottom-left { bottom: 6px; left: 8px; }
    .tech-corner.bottom-right { bottom: 6px; right: 8px; }
    .lain-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1.5px solid #0f172a; padding-bottom: 2.5px;
    }
    .lain-badge-group { display: flex; align-items: center; gap: 4px; }
    .badge-navi {
      background: #0f172a; color: #ffffff; font-family: 'JetBrains Mono', monospace;
      font-size: 6px; font-weight: 800; letter-spacing: 0.6px; padding: 1.5px 5px; border-radius: 2px;
    }
    .badge-layer {
      background: #4f46e5; color: #ffffff; font-family: 'JetBrains Mono', monospace;
      font-size: 6px; font-weight: 800; letter-spacing: 0.5px; padding: 1.5px 4.5px; border-radius: 2px;
    }
    .lain-os-tag { font-family: 'JetBrains Mono', monospace; font-size: 6px; font-weight: 800; color: #475569; letter-spacing: 0.5px; }
    .lain-title-row { margin-top: 2px; display: flex; flex-direction: column; gap: 0.5px; }
    .lain-main-title {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 900;
      color: #0f172a; letter-spacing: -0.2px; line-height: 1.1;
    }
    .lain-sub-title { font-size: 5.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }

    /* FILA CENTRAL: FIGURA HUD SCHEMATIC + RECOMPENSA DIGITAL & QR */
    .lain-main-body-row {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: 7px;
      margin: 3px 0;
      flex: 1;
      min-height: 180px;
      max-height: 205px;
      box-sizing: border-box;
    }
    .lain-figure-col {
      flex: 1.18;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: #ffffff;
      border: 1.5px solid #0f172a;
      border-radius: 5px;
      box-shadow: 2px 2px 0px rgba(15, 23, 42, 0.12);
      overflow: hidden;
      box-sizing: border-box;
    }
    .figure-hud-header {
      background: #0f172a;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 5.6px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 2.5px 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1;
      border-bottom: 1px solid #1e293b;
    }
    .hud-status-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      margin-right: 3px;
      box-shadow: 0 0 3px #22c55e;
    }
    .hud-title {
      color: #f8fafc;
      font-weight: 900;
    }
    .hud-protocol {
      color: #94a3b8;
      font-size: 5px;
    }
    .lain-svg-container {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 4px 3px;
      box-sizing: border-box;
      background: #fafafc;
      background-image: 
        linear-gradient(rgba(203, 213, 225, 0.25) 1px, transparent 1px),
        linear-gradient(90deg, rgba(203, 213, 225, 0.25) 1px, transparent 1px);
      background-size: 10px 10px;
    }
    .hud-cross-tl, .hud-cross-tr, .hud-cross-bl, .hud-cross-br {
      position: absolute;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7px;
      color: #94a3b8;
      line-height: 1;
      pointer-events: none;
      font-weight: 700;
    }
    .hud-cross-tl { top: 2px; left: 3px; }
    .hud-cross-tr { top: 2px; right: 3px; }
    .hud-cross-bl { bottom: 2px; left: 3px; }
    .hud-cross-br { bottom: 2px; right: 3px; }
    .lain-card-svg {
      width: 100%;
      height: auto;
      max-height: 98%;
      object-fit: contain;
      filter: drop-shadow(0 1px 2px rgba(15,23,42,0.1));
    }
    .figure-hud-footer {
      background: #f1f5f9;
      border-top: 1px solid #cbd5e1;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
      font-size: 5.2px;
      font-weight: 800;
      padding: 2px 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .hud-chip {
      color: #475569;
    }
    .hud-pass {
      color: #059669;
      font-weight: 900;
    }

    .lain-reward-col {
      flex: 0.92;
      background: #ffffff;
      border: 1.5px solid #0f172a;
      border-radius: 5px;
      padding: 5px 5px;
      box-shadow: 2px 2px 0px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      min-width: 0;
    }
    .reward-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6px;
      font-weight: 900;
      color: #ffffff;
      background: #0f172a;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .reward-icon {
      color: #38bdf8;
      font-size: 6px;
    }
    .reward-points-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3.5px;
      line-height: 1;
      margin: 2px 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 2px 6px;
      width: 90%;
      box-sizing: border-box;
    }
    .reward-plus {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
    }
    .reward-pencil-box {
      width: 40px;
      height: 18px;
      background: #ffffff;
      border: 1.2px dashed #94a3b8;
      border-bottom: 2px solid #0f172a;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pencil-guide-line {
      display: none;
    }
    .reward-wp {
      font-size: 11px;
      font-weight: 900;
      color: #e11d48;
      letter-spacing: -0.3px;
    }
    .reward-qr-frame {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 2px 0;
      padding: 3px;
    }
    .qr-reticle-tl, .qr-reticle-tr, .qr-reticle-bl, .qr-reticle-br {
      position: absolute;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: #4f46e5;
      line-height: 1;
      font-weight: 900;
      pointer-events: none;
    }
    .qr-reticle-tl { top: 0px; left: 0px; }
    .qr-reticle-tr { top: 0px; right: 0px; }
    .qr-reticle-bl { bottom: 0px; left: 0px; }
    .qr-reticle-br { bottom: 0px; right: 0px; }
    .qr-canvas-box {
      width: 21mm;
      height: 21mm;
      background: #ffffff;
      border: 1.2px solid #0f172a;
      border-radius: 4px;
      padding: 1.2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.1);
      box-sizing: border-box;
    }
    .qr-canvas-box img, .qr-canvas-box canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .reward-pin-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 1.5px 6px;
      border-radius: 3px;
      line-height: 1;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .reward-pin-tag strong {
      color: #4338ca;
      font-size: 7.5px;
    }
    .reward-sub {
      font-size: 5.2px;
      color: #64748b;
      text-align: center;
      line-height: 1.2;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .lain-quote-box {
      background: #ffffff; border-left: 2.5px solid #4f46e5;
      border-right: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;
      border-radius: 3px; padding: 2.5px 5px; display: flex; flex-direction: column;
      gap: 1px; margin: 1px 0 2px 0;
    }
    .lain-kanji { font-family: 'Noto Sans JP', sans-serif; font-size: 6px; font-weight: 900; color: #4f46e5; letter-spacing: 0.5px; }
    .lain-quote-text {
      font-family: 'JetBrains Mono', monospace; font-size: 6.2px; font-weight: 700;
      color: #0f172a; font-style: italic; line-height: 1.15;
    }
    .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5px; margin-bottom: 2px; }
    .spec-cell {
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px;
      padding: 1.5px 3.5px; display: flex; flex-direction: column; gap: 0.5px;
    }
    .spec-k { font-family: 'JetBrains Mono', monospace; font-size: 4.8px; font-weight: 800; color: #64748b; letter-spacing: 0.3px; }
    .spec-v { font-family: 'JetBrains Mono', monospace; font-size: 6.2px; font-weight: 800; color: #0f172a; }
    .lain-footer {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-top: 1px dashed #cbd5e1; padding-top: 2.5px;
      gap: 4px;
    }
    .barcode-wrapper { display: flex; flex-direction: column; gap: 1px; flex: 1 1 auto; min-width: 0; max-width: 72%; }
    .vector-barcode {
      display: flex; align-items: stretch; height: 13px; background: #fff;
      padding: 1px 2px; border: 1px solid #cbd5e1; border-radius: 2px;
    }
    .b-line { background: #0f172a; display: inline-block; }
    .b-w1 { width: 1px; } .b-w2 { width: 2px; } .b-w3 { width: 3px; } .b-w4 { width: 4.5px; }
    .b-gap { width: 1.5px; display: inline-block; } .b-g2 { width: 3px; }
    .serial-code { font-family: 'JetBrains Mono', monospace; font-size: 5.5px; font-weight: 800; color: #475569; letter-spacing: 0.4px; overflow-wrap: anywhere; word-break: break-all; white-space: normal; max-width: 100%; line-height: 1.15; hyphens: auto; }
    .lain-seal-stamp {
      border: 1px dashed #4f46e5; border-radius: 3px; padding: 1px 4.5px;
      display: flex; flex-direction: column; align-items: center;
      background: #eef2ff; line-height: 1; gap: 1px;
    }
    .stamp-org { font-family: 'JetBrains Mono', monospace; font-size: 4.5px; font-weight: 900; color: #312e81; letter-spacing: 0.3px; }
    .stamp-auth { font-size: 4.5px; font-weight: 800; color: #4f46e5; }
    .stamp-store { font-size: 4.8px; font-weight: 900; color: #0f172a; letter-spacing: 0.4px; }

    [contenteditable="true"] { outline: none; }
    [contenteditable="true"]:hover { background: rgba(99, 102, 241, 0.08); border-radius: 2px; }
    [contenteditable="true"]:focus { background: rgba(236, 72, 153, 0.1); box-shadow: 0 0 0 1px var(--accent); border-radius: 2px; }

    /* MODO BLANCO Y NEGRO */
    body.bw-mode .sheet-letter { filter: grayscale(100%) contrast(112%); }
    body.bw-mode .toolbar { background: #0f172a; border: 1px solid #334155; }

    /* REGLAS DE IMPRESIÓN */
    @media print {
      html, body {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        height: auto !important;
      }
      .toolbar { display: none !important; }
      .sheet-letter {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: page !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      body.bw-mode .sheet-letter { filter: grayscale(100%) contrast(112%) !important; }
      .sheet-letter:last-of-type,
      .sheet-front:last-of-type,
      .sheet-back:last-of-type,
      main:last-of-type {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .barcode-wrapper,
      .contact-qr-group,
      .qr-canvas-box,
      .reward-qr-frame,
      .lain-footer,
      .serial-code,
      .qr-col,
      .signature-block,
      .lain-card,
      .invoice {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        overflow: visible !important;
      }
      .serial-code {
        overflow: visible !important;
        white-space: normal !important;
        word-break: break-all !important;
        overflow-wrap: anywhere !important;
      }
      .lain-footer {
        overflow: visible !important;
      }
      @page { size: ${dims.cssSize}; margin: 5mm; }
    }`;
}
