const fs = require('fs');

const qrData = fs.readFileSync('C:/Users/everd/.gemini/antigravity-ide/scratch/qr_base64.txt', 'utf8').trim();
const lainWiresIcon = fs.readFileSync('C:/Users/everd/.gemini/antigravity-ide/scratch/lain_wires_base64.txt', 'utf8').trim();

// Generador de factura frontal (8 filas amplias, fuentes optimizadas y efecto dot grid en toda la factura)
function getInvoiceHtml(id) {
  return [
    '    <!-- FACTURA ' + id + ' -->',
    '    <article class="invoice" id="inv-' + id + '">',
    '      <header class="inv-header">',
    '        <div class="brand-group">',
    '          <div class="brand-top-lockup">',
    '            <div class="brand-badge-icon">',
    '              <svg viewBox="0 0 38 38" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg" class="wired-pole-svg">',
    '                <rect x="0.5" y="0.5" width="37" height="37" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.3"/>',
    '                <line x1="2" y1="19" x2="36" y2="19" stroke="#f1f5f9" stroke-width="0.8"/>',
    '                <line x1="19" y1="2" x2="19" y2="36" stroke="#f1f5f9" stroke-width="0.8"/>',
    '                <path d="M1,8 Q12,18 19,10 Q26,18 37,8" fill="none" stroke="#0f172a" stroke-width="1.2"/>',
    '                <path d="M1,14 Q10,22 19,15 Q28,22 37,13" fill="none" stroke="#0f172a" stroke-width="1.2"/>',
    '                <path d="M1,20 Q11,27 19,21 Q27,27 37,19" fill="none" stroke="#e11d48" stroke-width="1.3"/>',
    '                <path d="M1,26 Q12,32 19,26 Q27,33 37,25" fill="none" stroke="#4f46e5" stroke-width="1.1"/>',
    '                <rect x="17.2" y="4" width="3.6" height="33" rx="0.8" fill="#0f172a"/>',
    '                <rect x="7" y="9" width="24" height="2" rx="0.8" fill="#0f172a"/>',
    '                <circle cx="9" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>',
    '                <circle cx="14" cy="8.2" r="1.3" fill="#0f172a"/>',
    '                <circle cx="24" cy="8.2" r="1.3" fill="#0f172a"/>',
    '                <circle cx="29" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>',
    '                <rect x="9" y="14" width="20" height="2" rx="0.8" fill="#0f172a"/>',
    '                <circle cx="11" cy="13.2" r="1.3" fill="#0f172a"/>',
    '                <circle cx="27" cy="13.2" r="1.3" fill="#0f172a"/>',
    '                <rect x="21" y="16.5" width="6.5" height="10" rx="1.5" fill="#0f172a"/>',
    '                <line x1="23" y1="18.5" x2="23" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>',
    '                <line x1="25.5" y1="18.5" x2="25.5" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>',
    '                <rect x="8" y="25" width="12" height="1.8" rx="0.8" fill="#0f172a"/>',
    '                <circle cx="19" cy="3.5" r="1.4" fill="#e11d48"/>',
    '                <path d="M19,16 L15,36" stroke="#0f172a" stroke-width="0.9" stroke-dasharray="2 1"/>',
    '              </svg>',
    '            </div>',
    '            <div class="brand-text-col">',
    '              <div class="brand-name-line">',
    '                <span class="brand-word-melty">Melty</span><span class="brand-word-deays">Deays</span>',
    '                <span class="brand-pill-tag">STORE</span>',
    '              </div>',
    '              <div class="brand-kicker">TECH, GADGETS & GAMING HARDWARE</div>',
    '              <div class="brand-subitems">Laptops · Turbo Fans · Mandos · Audio · Redes</div>',
    '            </div>',
    '          </div>',
    '        </div>',
    '        <div class="meta-boxes">',
    '          <div class="folio-box">',
    '            <span class="folio-label">Nº FACTURA:</span>',
    '            <div class="folio-write-zone" contenteditable="true"></div>',
    '          </div>',
    '          <div class="date-row">',
    '            <span class="date-label">FECHA:</span>',
    '            <div class="date-input-area">',
    '              <span class="date-slot day-slot" contenteditable="true"></span>',
    '              <span class="date-sep">/</span>',
    '              <span class="date-slot month-slot" contenteditable="true"></span>',
    '              <span class="date-sep">/</span>',
    '              <span class="date-slot year year-slot" contenteditable="true"></span>',
    '            </div>',
    '          </div>',
    '        </div>',
    '      </header>',
    '',
    '      <!-- BARRA CLIENTE (NOMBRE Y PAGO) -->',
    '      <section class="client-bar">',
    '        <div class="client-name-group">',
    '          <span class="c-label">Cliente:</span>',
    '          <div class="c-line client-name" contenteditable="true"></div>',
    '        </div>',
    '        <div class="payment-options">',
    '          <span class="c-label">Pago:</span>',
    '          <span class="pay-check"><span class="box-square"></span> Efectivo</span>',
    '          <span class="pay-check"><span class="box-square"></span> Transf.</span>',
    '          <span class="pay-check"><span class="box-square"></span> Otro</span>',
    '        </div>',
    '      </section>',
    '',
    '      <!-- TABLA DE ARTÍCULOS (8 FILAS AMPLIAS DE ALTA LEGIBILIDAD) -->',
    '      <div class="table-box">',
    '        <table class="items-table">',
    '          <thead>',
    '            <tr>',
    '              <th class="col-cant">CANT</th>',
    '              <th class="col-desc">DESCRIPCIÓN DEL ARTÍCULO / PRODUCTO</th>',
    '              <th class="col-price">P. UNIT</th>',
    '              <th class="col-total">TOTAL</th>',
    '            </tr>',
    '          </thead>',
    '          <tbody class="table-body">',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '            <tr><td class="col-cant" contenteditable="true"></td><td class="col-desc" contenteditable="true"></td><td class="col-price" contenteditable="true"></td><td class="col-total" contenteditable="true"></td></tr>',
    '          </tbody>',
    '        </table>',
    '      </div>',
    '',
    '      <!-- SECCIÓN TOTALES EQUILIBRADA -->',
    '      <div class="totals-area">',
    '        <div class="thanks-note">¡Gracias por tu compra!</div>',
    '        <div class="totals-receipt">',
    '          <div class="totals-row">',
    '            <span class="t-label-text">Subtotal:</span>',
    '            <div class="t-write-line"><span class="curr">$</span><span class="val-sub" contenteditable="true"></span></div>',
    '          </div>',
    '          <div class="totals-row">',
    '            <span class="t-label-text">Descuento:</span>',
    '            <div class="t-write-line"><span class="curr">$</span><span class="val-desc" contenteditable="true"></span></div>',
    '          </div>',
    '          <div class="totals-row final-total">',
    '            <span class="t-label-text">TOTAL:</span>',
    '            <div class="t-write-line"><span class="curr">$</span><span class="val-tot" contenteditable="true"></span></div>',
    '          </div>',
    '        </div>',
    '      </div>',
    '',
    '      <!-- APARTADO GARANTÍA Y POLÍTICAS (TIPOGRAFÍA OPTIMIZADA) -->',
    '      <footer class="warranty-card">',
    '        <div class="warranty-header-row">',
    '          <span class="w-title">🛡️ GARANTÍA, CAMBIO Y REEMBOLSO</span>',
    '          <div class="w-period-box">',
    '            <span class="w-period-label">TIEMPO VÁLIDO:</span>',
    '            <span class="w-period-write w-time-slot" contenteditable="true"></span>',
    '          </div>',
    '        </div>',
    '        <div class="warranty-text">',
    '          • <strong>REEMBOLSO O CAMBIO:</strong> Se devuelve el dinero (con razón válida justificada) o se realiza cambio por otro artículo si el cliente lo prefiere.<br>',
    '          • <strong>CONDICIONES:</strong> Válido exclusivamente por defectos de fábrica comprobables con empaque original intacto, accesorios íntegros y este ticket.<br>',
    '          • <strong>EXCLUSIONES:</strong> No cubre daños por mal uso, golpes, caídas, humedad ni variaciones de voltaje.',
    '        </div>',
    '      </footer>',
    '',
    '      <!-- PIE DE PÁGINA (QR DESTACADO, CONTACTOS AL MEDIO, FIRMA/SELLO A LA DERECHA) -->',
    '      <div class="inv-bottom">',
    '        <div class="contact-qr-group">',
    '          <div class="qr-col">',
    '            <div class="qr-frame">',
    '              <img src="' + qrData + '" alt="QR Catálogo" class="qr-img">',
    '            </div>',
    '            <span class="qr-badge-wa">WHATSAPP</span>',
    '          </div>',
    '          <div class="contact-meta">',
    '            <div class="contact-row">',
    '              <span class="badge-tag tag-ig">Instagram</span>',
    '              <span class="contact-text handle-text">@meltydeays</span>',
    '            </div>',
    '            <div class="contact-row">',
    '              <span class="badge-tag tag-tel">Contacto</span>',
    '              <span class="contact-text phone-text">+505 5843 8412</span>',
    '            </div>',
    '            <div class="contact-row">',
    '              <span class="badge-tag tag-mail">Correo</span>',
    '              <span class="contact-text email-text">evertz2lopeztorrez@gmail.com</span>',
    '            </div>',
    '          </div>',
    '        </div>',
    '        <div class="signature-block">',
    '          <div class="sign-seal-wrapper">',
    '            <span class="digital-signature">MeltyDeays</span>',
    '            <div class="seal-stamp">',
    '              <span class="seal-star">★</span>',
    '              <span class="seal-text">MD</span>',
    '              <span class="seal-sub">OFICIAL</span>',
    '            </div>',
    '          </div>',
    '          <div class="sign-underline"></div>',
    '          <div class="sign-caption">Firma Autorizada / Sello</div>',
    '        </div>',
    '      </div>',
    '    </article>'
  ].join('\n');
}

// Generador de Tarjeta Trasera (Reverso Coleccionable Serial Experiments Lain / Copland OS)
function getLainBackCardHtml(cardNum) {
  const configs = {
    1: {
      layer: 'LAYER: 01',
      title: 'WEIRDO // THE WIRED',
      sub: 'TACHIBANA GENERAL LABORATORIES · COPLAND OS 21.0',
      kanji: '全ては繋がっている',
      quote: '"Close the world, Open the nExt."',
      sn: 'MD-LAIN-9807-001',
      protocol: 'IPv7.06.4',
      chip: 'NAVI-CORE IX',
      spec1: 'BUS: 1024-BIT QUANTUM',
      spec2: 'MEM: RESIDUAL BUFFER',
      svg: `
        <svg viewBox="0 0 280 115" class="lain-card-svg" xmlns="http://www.w3.org/2000/svg">
          <path d="M-10,12 Q65,42 140,20 Q205,4 290,16" fill="none" stroke="#4338ca" stroke-width="1.3" opacity="0.85"/>
          <path d="M-10,22 Q75,54 140,28 Q215,10 290,24" fill="none" stroke="#6366f1" stroke-width="0.9" opacity="0.7"/>
          <path d="M-10,32 Q85,65 140,36 Q225,18 290,32" fill="none" stroke="#1e1b4b" stroke-width="1.4" opacity="0.95"/>
          <path d="M-10,50 Q80,78 140,52 Q210,38 290,48" fill="none" stroke="#0f172a" stroke-width="1.6"/>
          <path d="M-10,60 Q80,90 145,58 Q215,46 290,58" fill="none" stroke="#4338ca" stroke-width="1.1"/>
          <rect x="135" y="10" width="10" height="105" rx="1" fill="#1e293b"/>
          <rect x="115" y="18" width="50" height="4" rx="1" fill="#334155"/>
          <rect x="122" y="32" width="36" height="3.5" rx="1" fill="#334155"/>
          <rect x="110" y="46" width="60" height="4" rx="1" fill="#334155"/>
          <circle cx="118" cy="16" r="2.2" fill="#64748b"/>
          <circle cx="162" cy="16" r="2.2" fill="#64748b"/>
          <circle cx="125" cy="30" r="2" fill="#64748b"/>
          <circle cx="155" cy="30" r="2" fill="#64748b"/>
          <circle cx="113" cy="44" r="2.2" fill="#64748b"/>
          <circle cx="167" cy="44" r="2.2" fill="#64748b"/>
          <rect x="146" y="36" width="16" height="25" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1"/>
          <line x1="146" y1="40" x2="162" y2="40" stroke="#94a3b8" stroke-width="0.8"/>
          <line x1="146" y1="58" x2="162" y2="58" stroke="#94a3b8" stroke-width="0.8"/>
          <line x1="140" y1="36" x2="55" y2="115" stroke="#64748b" stroke-width="0.8" stroke-dasharray="3 1.5"/>
          <line x1="140" y1="52" x2="235" y2="115" stroke="#64748b" stroke-width="0.8"/>
          <text x="8" y="104" font-family="'JetBrains Mono', monospace" font-size="6.5" font-weight="700" fill="#4f46e5" letter-spacing="0.5">/// 50Hz/60Hz CONTINUOUS HUMMING</text>
          <text x="8" y="112" font-family="'JetBrains Mono', monospace" font-size="5.5" fill="#64748b">LAT: 35°39'10"N LON: 139°42'30"E // WIRED GATEWAY</text>
        </svg>`
    },
    2: {
      layer: 'LAYER: 02',
      title: 'GIRLS // PSYCHE CHIP',
      sub: 'KNIGHTS OF THE EASTERN CALCULUS · LICENSED HARDWARE',
      kanji: 'どこに行っても、みんな繋がっている',
      quote: '"No matter where you go, everyone\'s connected."',
      sn: 'MD-LAIN-9807-002',
      protocol: 'PSYCHE-v4.2',
      chip: 'QUANTUM GATE',
      spec1: 'CLOCK: 1.44 THz BUS',
      spec2: 'ENCRYPT: 4096-BIT RSA',
      svg: `
        <svg viewBox="0 0 280 115" class="lain-card-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="85" y="15" width="110" height="75" rx="4" fill="#0f172a" stroke="#4338ca" stroke-width="1.5"/>
          <rect x="92" y="22" width="96" height="61" rx="2" fill="#1e1b4b" stroke="#6366f1" stroke-width="0.8"/>
          <g fill="#94a3b8">
            <rect x="95" y="10" width="4" height="5"/><rect x="107" y="10" width="4" height="5"/><rect x="119" y="10" width="4" height="5"/>
            <rect x="131" y="10" width="4" height="5"/><rect x="143" y="10" width="4" height="5"/><rect x="155" y="10" width="4" height="5"/>
            <rect x="167" y="10" width="4" height="5"/><rect x="179" y="10" width="4" height="5"/>
            <rect x="95" y="90" width="4" height="5"/><rect x="107" y="90" width="4" height="5"/><rect x="119" y="90" width="4" height="5"/>
            <rect x="131" y="90" width="4" height="5"/><rect x="143" y="90" width="4" height="5"/><rect x="155" y="90" width="4" height="5"/>
            <rect x="167" y="90" width="4" height="5"/><rect x="179" y="90" width="4" height="5"/>
          </g>
          <circle cx="140" cy="52" r="18" fill="none" stroke="#a855f7" stroke-width="1.2" stroke-dasharray="4 2"/>
          <polygon points="140,40 149,56 131,56" fill="none" stroke="#ec4899" stroke-width="1.2"/>
          <text x="140" y="55" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#f8fafc" text-anchor="middle">Ψ</text>
          <path d="M20,30 H85 M20,45 H85 M20,60 H85 M20,75 H85" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="6 3" opacity="0.8"/>
          <path d="M195,30 H260 M195,45 H260 M195,60 H260 M195,75 H260" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="6 3" opacity="0.8"/>
          <circle cx="20" cy="30" r="2.5" fill="#38bdf8"/><circle cx="20" cy="75" r="2.5" fill="#38bdf8"/>
          <circle cx="260" cy="45" r="2.5" fill="#38bdf8"/><circle cx="260" cy="60" r="2.5" fill="#38bdf8"/>
          <text x="140" y="76" font-family="'JetBrains Mono', monospace" font-size="6" fill="#a5b4fc" text-anchor="middle" letter-spacing="1">PSYCHE PROCESSOR // REV. 7</text>
          <text x="8" y="108" font-family="'JetBrains Mono', monospace" font-size="5.5" fill="#64748b">MELTYDEAYS ACCELERATOR UNIT · COPLAND KERNEL READY</text>
        </svg>`
    },
    3: {
      layer: 'LAYER: 03',
      title: 'PSYCHE // PRESENT TIME',
      sub: 'UBIQUITOUS SIGNAL TRANSMISSION · ELECTROMAGNETIC GRID',
      kanji: '今という時代、今という時間',
      quote: '"Present Day, Present Time... Hahahahaha"',
      sn: 'MD-LAIN-9807-003',
      protocol: 'SCHUMANN-7.83',
      chip: 'ANTENNA ARRAY',
      spec1: 'BAND: 2.4 - 60 GHz',
      spec2: 'SYNC: UBIQUITOUS',
      svg: `
        <svg viewBox="0 0 280 115" class="lain-card-svg" xmlns="http://www.w3.org/2000/svg">
          <circle cx="140" cy="30" r="25" fill="none" stroke="#6366f1" stroke-width="0.9" stroke-dasharray="4 3" opacity="0.5"/>
          <circle cx="140" cy="30" r="45" fill="none" stroke="#4f46e5" stroke-width="0.9" stroke-dasharray="6 4" opacity="0.6"/>
          <circle cx="140" cy="30" r="70" fill="none" stroke="#312e81" stroke-width="0.8" stroke-dasharray="8 5" opacity="0.7"/>
          <polygon points="140,15 125,105 155,105" fill="#0f172a" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="131" y1="40" x2="149" y2="40" stroke="#94a3b8" stroke-width="1"/>
          <line x1="128" y1="65" x2="152" y2="65" stroke="#94a3b8" stroke-width="1"/>
          <line x1="126" y1="88" x2="154" y2="88" stroke="#94a3b8" stroke-width="1"/>
          <line x1="131" y1="40" x2="152" y2="65" stroke="#64748b" stroke-width="0.8"/>
          <line x1="149" y1="40" x2="128" y2="65" stroke="#64748b" stroke-width="0.8"/>
          <line x1="128" y1="65" x2="154" y2="88" stroke="#64748b" stroke-width="0.8"/>
          <line x1="152" y1="65" x2="126" y2="88" stroke="#64748b" stroke-width="0.8"/>
          <circle cx="140" cy="15" r="4.5" fill="#dc2626"/>
          <path d="M120,38 A10,10 0 0,1 120,54" fill="none" stroke="#38bdf8" stroke-width="2"/>
          <path d="M160,38 A10,10 0 0,0 160,54" fill="none" stroke="#38bdf8" stroke-width="2"/>
          <path d="M15,95 L40,95 L48,82 L55,108 L62,75 L70,112 L78,85 L85,95 L115,95" fill="none" stroke="#059669" stroke-width="1.2"/>
          <path d="M165,95 L195,95 L202,80 L210,110 L218,72 L226,115 L234,86 L242,95 L265,95" fill="none" stroke="#059669" stroke-width="1.2"/>
          <text x="140" y="112" font-family="'JetBrains Mono', monospace" font-size="5.5" font-weight="700" fill="#0284c7" text-anchor="middle">CARRIER: 7.83Hz EARTH RESONANCE // BROADCAST ACTIVE</text>
        </svg>`
    },
    4: {
      layer: 'LAYER: 04',
      title: 'RESET // PROTOCOL',
      sub: 'COPLAND OS CRT TERMINAL · CLIENT NODE PASS',
      kanji: '現実と仮想の境界線',
      quote: '"The Wired is an ocean of consciousness."',
      sn: 'MD-LAIN-9807-004',
      protocol: 'PROTOCOL-07',
      chip: 'NAVI CLIENT',
      spec1: 'DISPLAY: 1024x768 CRT',
      spec2: 'NODE: PERSISTENT',
      svg: `
        <svg viewBox="0 0 280 115" class="lain-card-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="45" y="10" width="190" height="92" rx="10" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
          <rect x="55" y="18" width="170" height="76" rx="6" fill="#090d16" stroke="#475569" stroke-width="1.5"/>
          <line x1="56" y1="28" x2="224" y2="28" stroke="#1e293b" stroke-width="0.6"/>
          <line x1="56" y1="38" x2="224" y2="38" stroke="#1e293b" stroke-width="0.6"/>
          <line x1="56" y1="48" x2="224" y2="48" stroke="#1e293b" stroke-width="0.6"/>
          <line x1="56" y1="58" x2="224" y2="58" stroke="#1e293b" stroke-width="0.6"/>
          <line x1="56" y1="68" x2="224" y2="68" stroke="#1e293b" stroke-width="0.6"/>
          <line x1="56" y1="78" x2="224" y2="78" stroke="#1e293b" stroke-width="0.6"/>
          <rect x="65" y="24" width="150" height="12" fill="#334155"/>
          <text x="70" y="32.5" font-family="'JetBrains Mono', monospace" font-size="6.5" font-weight="700" fill="#ffffff">COPLAND OS v21.0 - [terminal.exe]</text>
          <circle cx="203" cy="30" r="2.5" fill="#f59e0b"/><circle cx="210" cy="30" r="2.5" fill="#10b981"/>
          <text x="68" y="46" font-family="'JetBrains Mono', monospace" font-size="6" fill="#22c55e">> boot navi_kernel.bin ... [OK]</text>
          <text x="68" y="55" font-family="'JetBrains Mono', monospace" font-size="6" fill="#22c55e">> connecting node: meltydeays ... [OK]</text>
          <text x="68" y="64" font-family="'JetBrains Mono', monospace" font-size="6" fill="#38bdf8">> user authenticated: LAIN IWAKURA</text>
          <text x="68" y="73" font-family="'JetBrains Mono', monospace" font-size="6" font-weight="700" fill="#f43f5e">> "Close the world, Open the nExt."_</text>
          <circle cx="220" cy="98" r="2" fill="#22c55e"/>
          <text x="140" y="112" font-family="'JetBrains Mono', monospace" font-size="5.5" fill="#64748b" text-anchor="middle">MELTYDEAYS TECH LABS · SERIAL EXPERIMENTS HARDWARE PASS</text>
        </svg>`
    }
  };

  const item = configs[cardNum];

  return [
    '    <!-- TARJETA TRASERA ' + cardNum + ' (LAIN / COPLAND OS) -->',
    '    <article class="lain-card" id="back-card-' + cardNum + '">',
    '      <div class="tech-corner top-left">+</div>',
    '      <div class="tech-corner top-right">+</div>',
    '      <div class="tech-corner bottom-left">+</div>',
    '      <div class="tech-corner bottom-right">+</div>',
    '',
    '      <div class="lain-header">',
    '        <div class="lain-badge-group">',
    '          <span class="badge-navi">MELTYDEAYS · NAVI</span>',
    '          <span class="badge-layer">' + item.layer + '</span>',
    '        </div>',
    '        <div class="lain-os-tag">COPLAND OS 21.0</div>',
    '      </div>',
    '',
    '      <div class="lain-title-row">',
    '        <div class="lain-main-title">' + item.title + '</div>',
    '        <div class="lain-sub-title">' + item.sub + '</div>',
    '      </div>',
    '',
    '      <div class="lain-svg-container">',
    item.svg,
    '      </div>',
    '',
    '      <div class="lain-quote-box">',
    '        <div class="lain-kanji">' + item.kanji + '</div>',
    '        <div class="lain-quote-text">' + item.quote + '</div>',
    '      </div>',
    '',
    '      <div class="specs-grid">',
    '        <div class="spec-cell">',
    '          <span class="spec-k">PROTOCOL</span>',
    '          <span class="spec-v">' + item.protocol + '</span>',
    '        </div>',
    '        <div class="spec-cell">',
    '          <span class="spec-k">PROCESSOR</span>',
    '          <span class="spec-v">' + item.chip + '</span>',
    '        </div>',
    '        <div class="spec-cell">',
    '          <span class="spec-k">HARDWARE</span>',
    '          <span class="spec-v">' + item.spec1 + '</span>',
    '        </div>',
    '        <div class="spec-cell">',
    '          <span class="spec-k">SECURITY</span>',
    '          <span class="spec-v">' + item.spec2 + '</span>',
    '        </div>',
    '      </div>',
    '',
    '      <div class="lain-footer">',
    '        <div class="barcode-wrapper">',
    '          <div class="vector-barcode">',
    '            <span class="b-line b-w2"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w1"></span><span class="b-gap b-g2"></span>',
    '            <span class="b-line b-w3"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w1"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w2"></span><span class="b-gap b-g2"></span>',
    '            <span class="b-line b-w4"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w1"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w2"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w3"></span><span class="b-gap b-g2"></span>',
    '            <span class="b-line b-w1"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w2"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w4"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w1"></span><span class="b-gap"></span>',
    '            <span class="b-line b-w3"></span><span class="b-gap b-g2"></span>',
    '            <span class="b-line b-w2"></span>',
    '          </div>',
    '          <div class="serial-code">' + item.sn + '</div>',
    '        </div>',
    '        <div class="lain-seal-stamp">',
    '          <span class="stamp-org">TACHIBANA LABS</span>',
    '          <span class="stamp-auth">★ CERTIFIED ★</span>',
    '          <span class="stamp-store">MELTYDEAYS</span>',
    '        </div>',
    '      </div>',
    '    </article>'
  ].join('\n');
}

const headAndStyles = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facturas 4x1 Doble Cara — MeltyDeays Store × Lain Wired</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800;900&family=Noto+Sans+JP:wght@500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #312e81;
      --accent: #db2777;
      --dark: #0f172a;
      --gray-800: #1e293b;
      --gray-600: #475569;
      --gray-400: #94a3b8;
      --gray-300: #cbd5e1;
      --gray-200: #e2e8f0;
      --gray-100: #f1f5f9;
      --gray-50: #f8fafc;
      --table-border: #334155;
      --table-line: #94a3b8;
      --dot-color: #cbd5e1;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #0b0f19;
      color: var(--dark);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      gap: 20px;
      transition: background 0.2s ease;
    }

    /* BARRA SUPERIOR INTERACTIVA */
    .toolbar {
      width: 8.5in;
      max-width: 100%;
      background: #1e293b;
      color: #fff;
      padding: 10px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .toolbar-info h1 {
      font-size: 13.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .toolbar-info p {
      font-size: 10.5px;
      color: #94a3b8;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      padding: 7px 13px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .btn-print {
      background: linear-gradient(135deg, #6366f1, #ec4899);
      color: #fff;
    }
    .btn-print:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn-sec {
      background: #334155;
      color: #f1f5f9;
    }
    .btn-sec:hover { background: #475569; }

    /* BOTÓN TOGGLE BLANCO Y NEGRO */
    .btn-bw {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #475569;
    }
    .btn-bw:hover {
      background: #334155;
      color: #ffffff;
    }
    .btn-bw.active {
      background: #0f172a;
      color: #facc15;
      border-color: #facc15;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.35);
    }

    /* CONTENEDOR DE PÁGINAS CARTA (8.5 x 11 in) */
    .sheet-letter {
      width: 8.5in;
      height: 11in;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      position: relative;
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
      overflow: hidden;
      transition: filter 0.2s ease;
    }

    /* PÁGINA 1: ANVERSO CON EFECTO DOT GRID GLOBAL */
    .sheet-front {
      background-color: #ffffff;
      background-image: radial-gradient(var(--dot-color) 0.8px, transparent 0.8px);
      background-size: 8px 8px;
    }

    /* PÁGINA 2: REVERSO CON EFECTO DOT GRID LAIN */
    .sheet-back {
      background-color: #f8fafc;
      background-image: radial-gradient(var(--dot-color) 0.8px, transparent 0.8px);
      background-size: 8px 8px;
    }

    /* GUÍAS DE CORTE Y CENTRADO */
    .sheet-letter::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 1px;
      border-left: 1px dashed var(--gray-300);
      z-index: 20;
      pointer-events: none;
    }
    .sheet-letter::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      border-top: 1px dashed var(--gray-300);
      z-index: 20;
      pointer-events: none;
    }
    .cut-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      color: var(--gray-400);
      font-size: 8.5px;
      padding: 1.5px 5px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      z-index: 21;
      pointer-events: none;
      font-weight: 700;
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
    .brand-group {
      display: flex;
      align-items: center;
    }
    .brand-top-lockup {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .brand-badge-icon {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
    }
    .brand-text-col {
      display: flex;
      flex-direction: column;
      gap: 1.2px;
    }
    .brand-name-line {
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1;
    }
    .brand-word-melty {
      font-size: 17.5px;
      font-weight: 900;
      letter-spacing: -0.6px;
      color: var(--dark);
    }
    .brand-word-deays {
      font-size: 17.5px;
      font-weight: 900;
      letter-spacing: -0.4px;
      color: var(--accent);
    }
    .brand-pill-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 5.8px;
      font-weight: 800;
      letter-spacing: 0.6px;
      background: #eef2ff;
      color: #4338ca;
      border: 1px solid #c7d2fe;
      border-radius: 3px;
      padding: 1px 4.5px;
      line-height: 1;
      text-transform: uppercase;
    }
    .brand-kicker {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #475569;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .brand-subitems {
      font-size: 6.4px;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.1;
      letter-spacing: 0.1px;
    }

    .meta-boxes {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2.5px;
    }
    .folio-box {
      border: 1.5px solid var(--dark);
      border-radius: 4px;
      padding: 1.5px 6px;
      background: #ffffff;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.12);
    }
    .folio-label {
      font-size: 8px;
      font-weight: 800;
      color: var(--dark);
      letter-spacing: 0.3px;
    }
    .folio-write-zone {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 800;
      color: var(--accent);
      min-width: 82px;
      height: 16px;
      line-height: 16px;
      text-align: right;
      padding: 0 4px;
      border-bottom: 1.5px solid var(--dark);
      background: #faf5ff;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .date-label {
      font-size: 7.5px;
      font-weight: 800;
      color: var(--gray-800);
    }
    .date-input-area {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .date-slot {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      border: 1px solid var(--gray-300);
      border-radius: 2px;
      width: 19px;
      height: 15px;
      line-height: 15px;
      text-align: center;
      background: #fff;
    }
    .date-slot.year { width: 32px; }
    .date-sep { font-size: 9px; font-weight: 800; color: var(--gray-400); }

    .client-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(248, 250, 252, 0.95);
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      padding: 3.5px 7px;
      margin: 3px 0 4px 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .client-name-group {
      display: flex;
      align-items: baseline;
      gap: 4px;
      flex-grow: 1;
      margin-right: 6px;
    }
    .c-label {
      font-size: 7.8px;
      font-weight: 800;
      color: var(--gray-800);
      text-transform: uppercase;
    }
    .client-name {
      border-bottom: 1.2px solid var(--gray-400);
      flex-grow: 1;
      height: 15px;
      font-size: 9.8px;
      font-weight: 700;
      line-height: 15px;
      padding: 0 4px;
      color: var(--dark);
    }
    .payment-options {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 7.8px;
      font-weight: 700;
      color: var(--gray-800);
    }
    .pay-check {
      display: flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
    }
    .box-square {
      width: 8.5px;
      height: 8.5px;
      border: 1.3px solid var(--dark);
      border-radius: 1.5px;
      display: inline-block;
      background: #fff;
    }

    .table-box {
      margin: 2px 0 3px 0;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      height: 100%;
      background: #ffffff;
    }
    .items-table th {
      background: var(--dark);
      color: #ffffff;
      font-size: 7.8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 3.5px 4px;
      border-right: 1px solid var(--gray-600);
    }
    .items-table th:last-child { border-right: none; }
    .col-cant { width: 34px; text-align: center; }
    .col-desc { text-align: left; }
    .col-price { width: 48px; text-align: right; }
    .col-total { width: 52px; text-align: right; }

    .items-table td {
      border: 1px solid var(--table-border);
      height: 19px;
      padding: 0 4px;
      font-size: 9px;
      vertical-align: middle;
      color: var(--dark);
      font-weight: 600;
      background: rgba(255, 255, 255, 0.94);
    }
    .items-table tbody tr:nth-child(even) td { background: rgba(248, 250, 252, 0.94); }
    .items-table td.col-cant {
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
      font-weight: 700;
    }
    .items-table td.col-price,
    .items-table td.col-total {
      font-family: 'JetBrains Mono', monospace;
      text-align: right;
      font-weight: 700;
    }

    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin: 3px 0 4px 0;
      padding: 2px 4px;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 3px;
    }
    .thanks-note {
      font-size: 8px;
      font-weight: 700;
      color: var(--primary);
      font-style: italic;
      line-height: 1.2;
    }
    .totals-receipt {
      display: flex;
      flex-direction: column;
      gap: 1.5px;
      width: 138px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      line-height: 1.1;
    }
    .t-label-text {
      font-size: 7.8px;
      font-weight: 700;
      color: var(--gray-800);
    }
    .t-write-line {
      display: flex;
      align-items: baseline;
      border-bottom: 1.2px solid var(--gray-400);
      width: 68px;
      justify-content: flex-end;
      padding-right: 2px;
    }
    .curr {
      font-size: 7.5px;
      font-weight: 800;
      color: var(--gray-600);
      margin-right: 2px;
    }
    .val-sub, .val-desc, .val-tot {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      color: var(--dark);
    }
    .totals-row.final-total {
      background: #ffffff;
      color: var(--dark);
      border: 1.5px solid var(--dark);
      padding: 2.5px 5px;
      border-radius: 3px;
      margin-top: 1.5px;
      box-shadow: 1px 1px 0px rgba(0,0,0,0.1);
    }
    .totals-row.final-total .t-label-text {
      color: var(--dark);
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .totals-row.final-total .t-write-line {
      border-bottom: 1.5px solid var(--dark);
      width: 68px;
    }
    .totals-row.final-total .curr {
      color: var(--dark);
      font-size: 8px;
      font-weight: 900;
    }
    .totals-row.final-total .val-tot {
      color: var(--dark);
      font-size: 11px;
      font-weight: 900;
    }

    .warranty-card {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-left: 2.5px solid #d97706;
      border-radius: 3px;
      padding: 3.5px 6px;
      margin: 3px 0 4px 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: 0 1px 2px rgba(217, 119, 6, 0.08);
    }
    .warranty-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed #f59e0b;
      padding-bottom: 1.5px;
    }
    .w-title {
      font-size: 6.8px;
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .w-period-box {
      display: flex;
      align-items: baseline;
      gap: 3px;
      background: #ffffff;
      border: 1px solid #d97706;
      border-radius: 2px;
      padding: 0 4px;
    }
    .w-period-label {
      font-size: 6.2px;
      font-weight: 800;
      color: #92400e;
      text-transform: uppercase;
    }
    .w-period-write {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5px;
      font-weight: 800;
      color: #b45309;
      min-width: 44px;
      text-align: center;
      border-bottom: 1px solid #d97706;
      line-height: 11px;
    }
    .warranty-text {
      font-size: 6.2px;
      font-weight: 700;
      line-height: 1.35;
      color: #92400e;
    }
    .warranty-text strong {
      font-weight: 900;
      color: #92400e;
    }

    .inv-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.2px solid var(--gray-300);
      padding-top: 3.5px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 0 0 2px 2px;
    }
    .contact-qr-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .qr-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .qr-frame {
      width: 30px;
      height: 30px;
      padding: 1px;
      background: #ffffff;
      border: 1.2px solid var(--dark);
      border-radius: 3px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .qr-badge-wa {
      background: linear-gradient(135deg, #16a34a, #059669);
      color: #ffffff;
      font-size: 5.2px;
      font-weight: 800;
      padding: 1px 3.5px;
      border-radius: 2px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      line-height: 1;
      box-shadow: 0 1px 2px rgba(22, 163, 74, 0.25);
    }
    .contact-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1.15;
    }
    .badge-tag {
      font-size: 5.6px;
      font-weight: 800;
      padding: 1.2px 4px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.25px;
      line-height: 1;
      display: inline-block;
      flex-shrink: 0;
    }
    .tag-ig {
      background: linear-gradient(135deg, #c13584, #833ab4);
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(193, 53, 132, 0.25);
    }
    .tag-tel {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(2, 132, 199, 0.25);
    }
    .tag-mail {
      background: linear-gradient(135deg, #ea4335, #c5221f);
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(234, 67, 53, 0.25);
    }
    .contact-text {
      font-size: 7px;
      font-weight: 700;
      color: var(--dark);
      font-family: 'JetBrains Mono', monospace;
    }

    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 112px;
    }
    .sign-seal-wrapper {
      position: relative;
      width: 100%;
      height: 26px;
      display: flex;
      align-items: flex-end;
      padding-bottom: 0.5px;
    }
    .digital-signature {
      font-family: 'Caveat', cursive;
      font-size: 19px;
      font-weight: 700;
      color: #1e1b4b;
      letter-spacing: 0.5px;
      transform: rotate(-3.5deg);
      display: inline-block;
      line-height: 0.85;
      text-shadow: 0.5px 0.5px 1px rgba(79, 70, 229, 0.25);
      white-space: nowrap;
    }
    .seal-stamp {
      width: 25px;
      height: 25px;
      border: 1.2px dashed #dc2626;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #dc2626;
      line-height: 1;
      transform: rotate(-9deg);
      background: rgba(254, 242, 242, 0.7);
      box-shadow: inset 0 0 2px rgba(220, 38, 38, 0.2);
      flex-shrink: 0;
      user-select: none;
    }
    .seal-star { font-size: 4.2px; line-height: 1; color: #dc2626; }
    .seal-text { font-size: 5.5px; font-weight: 900; letter-spacing: 0.3px; }
    .seal-sub { font-size: 3.2px; font-weight: 800; letter-spacing: 0.2px; text-transform: uppercase; }
    .sign-underline {
      border-bottom: 1.2px solid var(--dark);
      width: 100%;
      margin-top: 1.5px;
      margin-bottom: 1.5px;
    }
    .sign-caption {
      font-size: 5.8px;
      font-weight: 700;
      color: var(--gray-700);
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    /* ========================================================
       ESTILOS DEL REVERSO: SERIAL EXPERIMENTS LAIN / COPLAND OS
       ======================================================== */
    .lain-card {
      padding: 0.20in 0.22in 0.16in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      height: 5.5in;
      overflow: hidden;
      background-color: #f8fafc;
      background-image: radial-gradient(#cbd5e1 0.75px, transparent 0.75px);
      background-size: 8px 8px;
      position: relative;
      border: 1px solid #e2e8f0;
    }

    .tech-corner {
      position: absolute;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      line-height: 1;
      pointer-events: none;
    }
    .tech-corner.top-left { top: 6px; left: 8px; }
    .tech-corner.top-right { top: 6px; right: 8px; }
    .tech-corner.bottom-left { bottom: 6px; left: 8px; }
    .tech-corner.bottom-right { bottom: 6px; right: 8px; }

    .lain-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 3px;
    }
    .lain-badge-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .badge-navi {
      background: #0f172a;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 6px;
      font-weight: 800;
      letter-spacing: 0.6px;
      padding: 1.5px 5px;
      border-radius: 2px;
    }
    .badge-layer {
      background: #4f46e5;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 6px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 1.5px 4.5px;
      border-radius: 2px;
    }
    .lain-os-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6px;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.5px;
    }

    .lain-title-row {
      margin-top: 3px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .lain-main-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.2px;
      line-height: 1.1;
    }
    .lain-sub-title {
      font-size: 5.8px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .lain-svg-container {
      width: 100%;
      height: 115px;
      background: #ffffff;
      border: 1.2px solid #0f172a;
      border-radius: 4px;
      margin: 3px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 1.5px 1.5px 0px rgba(15, 23, 42, 0.15);
    }
    .lain-card-svg {
      width: 100%;
      height: 100%;
    }

    .lain-quote-box {
      background: #ffffff;
      border-left: 2.5px solid #4f46e5;
      border-right: 1px solid #cbd5e1;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 3px 6px;
      display: flex;
      flex-direction: column;
      gap: 1.5px;
      margin: 1px 0 3px 0;
    }
    .lain-kanji {
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 6.5px;
      font-weight: 900;
      color: #4f46e5;
      letter-spacing: 0.5px;
    }
    .lain-quote-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8px;
      font-weight: 700;
      color: #0f172a;
      font-style: italic;
      line-height: 1.15;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
      margin-bottom: 4px;
    }
    .spec-cell {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 2px 4px;
      display: flex;
      flex-direction: column;
      gap: 0.5px;
    }
    .spec-k {
      font-family: 'JetBrains Mono', monospace;
      font-size: 5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.3px;
    }
    .spec-v {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.5px;
      font-weight: 800;
      color: #0f172a;
    }

    .lain-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 3px;
    }
    .barcode-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5px;
    }
    .vector-barcode {
      display: flex;
      align-items: stretch;
      height: 14px;
      background: #fff;
      padding: 1px 2px;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
    }
    .b-line { background: #0f172a; display: inline-block; }
    .b-w1 { width: 1px; }
    .b-w2 { width: 2px; }
    .b-w3 { width: 3px; }
    .b-w4 { width: 4.5px; }
    .b-gap { width: 1.5px; display: inline-block; }
    .b-g2 { width: 3px; }
    .serial-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 5.5px;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.5px;
    }

    .lain-seal-stamp {
      border: 1px dashed #4f46e5;
      border-radius: 3px;
      padding: 1.5px 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #eef2ff;
      line-height: 1;
      gap: 1px;
    }
    .stamp-org {
      font-family: 'JetBrains Mono', monospace;
      font-size: 4.5px;
      font-weight: 900;
      color: #312e81;
      letter-spacing: 0.3px;
    }
    .stamp-auth {
      font-size: 4.5px;
      font-weight: 800;
      color: #4f46e5;
    }
    .stamp-store {
      font-size: 4.8px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.4px;
    }

    [contenteditable="true"] { outline: none; }
    [contenteditable="true"]:hover { background: rgba(99, 102, 241, 0.08); border-radius: 2px; }
    [contenteditable="true"]:focus { background: rgba(236, 72, 153, 0.1); box-shadow: 0 0 0 1px var(--accent); border-radius: 2px; }

    /* ========================================================
       MODO BLANCO Y NEGRO (SIMULACIÓN EXACTA IMPRESIÓN B&W)
       ======================================================== */
    body.bw-mode .sheet-letter {
      filter: grayscale(100%) contrast(112%);
    }
    body.bw-mode .toolbar {
      background: #0f172a;
      border: 1px solid #334155;
    }

    /* REGLAS DE IMPRESIÓN */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        gap: 0 !important;
      }
      .toolbar {
        display: none !important;
      }
      .sheet-letter {
        box-shadow: none !important;
        margin: 0 !important;
      }
      body.bw-mode .sheet-letter {
        filter: grayscale(100%) contrast(112%) !important;
      }
      .sheet-front {
        page-break-after: always !important;
        break-after: page !important;
      }
      .sheet-back {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      @page {
        size: letter portrait;
        margin: 0;
      }
    }
  </style>
</head>
<body>

  <!-- BARRA DE ACCIÓN INTERACTIVA -->
  <header class="toolbar">
    <div class="toolbar-info">
      <h1>📄 Facturas 4x1 Doble Cara — MeltyDeays × The Wired</h1>
      <p>Página 1: Facturas Oficiales (Dot Grid) · Página 2: Reverso Vectorial Lain (Dot Grid)</p>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-bw" id="btn-bw" onclick="toggleBW()">🖤 Ver en Blanco y Negro (B&W)</button>
      <button class="btn btn-sec" onclick="fillQuickExample()">🪄 Llenar Ejemplo</button>
      <button class="btn btn-sec" onclick="clearAllData()">🧹 Limpiar</button>
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir Doble Cara (Ctrl + P)</button>
    </div>
  </header>

  <!-- PÁGINA 1: ANVERSO -->
  <main class="sheet-letter sheet-front">
    <div class="cut-badge">✂ CORTE CENTRAL (4.25" × 5.5")</div>
`;

const scriptSection = `
  </main>

  <!-- PÁGINA 2: REVERSO -->
  <main class="sheet-letter sheet-back">
    <div class="cut-badge">✂ REVERSO THE WIRED (4.25" × 5.5")</div>
` + [2, 1, 4, 3].map(cardNum => getLainBackCardHtml(cardNum)).join('\n\n') + `
  </main>

  <script>
    function toggleBW() {
      const isBW = document.body.classList.toggle('bw-mode');
      const btn = document.getElementById('btn-bw');
      if (isBW) {
        btn.classList.add('active');
        btn.innerHTML = '🎨 Ver a Todo Color';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '🖤 Ver en Blanco y Negro (B&W)';
      }
    }

    function clearAllData() {
      document.querySelectorAll('.invoice').forEach(inv => {
        inv.querySelector('.folio-write-zone').textContent = '';
        inv.querySelector('.day-slot').textContent = '';
        inv.querySelector('.month-slot').textContent = '';
        inv.querySelector('.year-slot').textContent = '';
        inv.querySelector('.client-name').textContent = '';
        inv.querySelectorAll('.table-body tr').forEach(r => {
          r.children[0].textContent = '';
          r.children[1].textContent = '';
          r.children[2].textContent = '';
          r.children[3].textContent = '';
        });
        inv.querySelector('.val-sub').textContent = '';
        inv.querySelector('.val-desc').textContent = '';
        inv.querySelector('.val-tot').textContent = '';
        inv.querySelector('.w-time-slot').textContent = '';
      });
    }

    function fillQuickExample() {
      const examples = [
        {
          folio: '0104', d: '22', m: '09', y: '2026',
          name: 'Carlos Mendoza',
          items: [
            ['1', 'Turbo Fan Gamer RGB FlyDigi', '28.00', '28.00'],
            ['1', 'Mando Wireless Hall Effect', '45.00', '45.00'],
            ['1', 'Base Refrigerante Gamer Dual Fan', '22.00', '22.00'],
            ['1', 'Cable Blindado Type-C 100W 2m', '12.00', '12.00']
          ],
          sub: '107.00', desc: '7.00', tot: '100.00',
          warranty: '30 días'
        },
        {
          folio: '0105', d: '22', m: '09', y: '2026',
          name: 'Valeria Rivas',
          items: [
            ['1', 'Laptop Lenovo LOQ 15" RTX 4050', '850.00', '850.00'],
            ['1', 'Base Refrigerante IETS GT500', '65.00', '65.00'],
            ['1', 'Cascos Wireless 7.1 Espacial', '52.00', '52.00'],
            ['1', 'Mousepad Speed XL 900x400mm', '18.00', '18.00']
          ],
          sub: '985.00', desc: '15.00', tot: '970.00',
          warranty: '6 meses'
        },
        {
          folio: '0106', d: '22', m: '09', y: '2026',
          name: 'Kevin Jarquín',
          items: [
            ['1', 'Repetidor Rompemuros WiFi 6 AX1800', '34.00', '34.00'],
            ['2', 'Mando Gamer Bluetooth Switch/PC', '35.00', '70.00']
          ],
          sub: '104.00', desc: '4.00', tot: '100.00',
          warranty: '3 meses'
        },
        {
          folio: '0107', d: '', m: '', y: '',
          name: '',
          items: [],
          sub: '', desc: '', tot: '',
          warranty: ''
        }
      ];

      document.querySelectorAll('.invoice').forEach((inv, idx) => {
        const ex = examples[idx];
        if (!ex) return;
        inv.querySelector('.folio-write-zone').textContent = ex.folio;
        inv.querySelector('.day-slot').textContent = ex.d;
        inv.querySelector('.month-slot').textContent = ex.m;
        inv.querySelector('.year-slot').textContent = ex.y;
        inv.querySelector('.client-name').textContent = ex.name;
        const rows = inv.querySelectorAll('.table-body tr');
        rows.forEach(r => { r.children[0].textContent = ''; r.children[1].textContent = ''; r.children[2].textContent = ''; r.children[3].textContent = ''; });
        ex.items.forEach((it, i) => {
          if (rows[i]) {
            rows[i].children[0].textContent = it[0];
            rows[i].children[1].textContent = it[1];
            rows[i].children[2].textContent = it[2];
            rows[i].children[3].textContent = it[3];
          }
        });
        inv.querySelector('.val-sub').textContent = ex.sub;
        inv.querySelector('.val-desc').textContent = ex.desc;
        inv.querySelector('.val-tot').textContent = ex.tot;
        inv.querySelector('.w-time-slot').textContent = ex.warranty;
      });
    }
  </script>
</body>
</html>`;

const invoicesHtml = [1, 2, 3, 4].map(id => getInvoiceHtml(id)).join('\n\n');
const finalOutput = headAndStyles + invoicesHtml + scriptSection;

const scratchPath = 'C:/Users/everd/.gemini/antigravity-ide/scratch/factura-meltydeays/index.html';
const downPath = 'C:/Users/everd/Downloads/factura_meltydeays_4x1.html';

fs.writeFileSync(scratchPath, finalOutput, 'utf8');
fs.writeFileSync(downPath, finalOutput, 'utf8');
console.log('Successfully applied dot grid to entire invoice and added B&W toggle mode!');
