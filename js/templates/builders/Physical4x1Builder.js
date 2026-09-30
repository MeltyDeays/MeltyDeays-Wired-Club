/**
 * Builder: Facturas Físicas 4x1 (Talonario Carta/A4 con Corte)
 * Anverso Oficial MeltyDeays y Reverso Coleccionable Lain / Haibane
 */
import { QR_CATALOG_BASE64, LAIN_WIRES_ICON_BASE64 } from "../assets/invoiceAssets.js";
import { getPhysical4x1Designs } from "../designs/index.js";
import { get4x1FullPrintStyles } from "../styles/index.js";

export class Physical4x1Builder {
  static getInvoiceHtml(folio, id, seriesOrTheme) {
    const isHaibane = (typeof seriesOrTheme === 'string' && (seriesOrTheme.includes('SERIE 3') || seriesOrTheme.toLowerCase().includes('haibane')));
    const invoiceThemeClass = isHaibane ? 'invoice theme-haibane' : 'invoice';
    const brandPill = isHaibane ? 'HAIBANE' : 'STORE';
    const brandKicker = isHaibane ? 'TOWN OF GLIE · HANDCRAFT & COVENANT GOODS' : 'TECH, GADGETS & GAMING HARDWARE';
    const brandSubitems = isHaibane ? 'Alas · Halos · Herramientas · Campanas · Gadgets' : 'Laptops · Turbo Fans · Mandos · Audio · Redes';
    const thanksNote = isHaibane ? '¡Gracias por tu compra en la ciudad de Glie!' : '¡Gracias por tu compra!';
    const sealOrg = isHaibane ? 'HAIBANE' : 'MD';
    const sealSub = isHaibane ? 'COVENANT' : 'OFICIAL';

    const brandIconSvg = isHaibane
      ? '<svg viewBox="0 0 38 38" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg" class="haibane-pole-svg">' +
        '<rect x="0.5" y="0.5" width="37" height="37" rx="6" fill="#fdfbf7" stroke="#78350f" stroke-width="1.3"/>' +
        '<ellipse cx="19" cy="8" rx="10" ry="3.2" fill="none" stroke="#f59e0b" stroke-width="1.4"/>' +
        '<ellipse cx="19" cy="8" rx="6" ry="1.8" fill="none" stroke="#fef08a" stroke-width="0.8"/>' +
        '<path d="M19,23 C14,17 7,16 3,21 C7,25 14,27 19,27" fill="#047857" stroke="#064e3b" stroke-width="0.9" opacity="0.95"/>' +
        '<path d="M19,23 C24,17 31,16 35,21 C31,25 24,27 19,27" fill="#047857" stroke="#064e3b" stroke-width="0.9" opacity="0.95"/>' +
        '<circle cx="19" cy="24" r="3.2" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>' +
        '<polygon points="19,5 20,7 22,8 20,9 19,11 18,9 16,8 18,7" fill="#fef08a"/>' +
        '<path d="M12,32 Q19,30 26,32" stroke="#78350f" stroke-width="1.2" fill="none"/>' +
        '<circle cx="19" cy="31" r="1.5" fill="#f59e0b"/>' +
        '</svg>'
      : '<svg viewBox="0 0 38 38" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg" class="wired-pole-svg">' +
        '<rect x="0.5" y="0.5" width="37" height="37" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.3"/>' +
        '<line x1="2" y1="19" x2="36" y2="19" stroke="#f1f5f9" stroke-width="0.8"/>' +
        '<line x1="19" y1="2" x2="19" y2="36" stroke="#f1f5f9" stroke-width="0.8"/>' +
        '<path d="M1,8 Q12,18 19,10 Q26,18 37,8" fill="none" stroke="#0f172a" stroke-width="1.2"/>' +
        '<path d="M1,14 Q10,22 19,15 Q28,22 37,13" fill="none" stroke="#0f172a" stroke-width="1.2"/>' +
        '<path d="M1,20 Q11,27 19,21 Q27,27 37,19" fill="none" stroke="#e11d48" stroke-width="1.3"/>' +
        '<path d="M1,26 Q12,32 19,26 Q27,33 37,25" fill="none" stroke="#4f46e5" stroke-width="1.1"/>' +
        '<rect x="17.2" y="4" width="3.6" height="33" rx="0.8" fill="#0f172a"/>' +
        '<rect x="7" y="9" width="24" height="2" rx="0.8" fill="#0f172a"/>' +
        '<circle cx="9" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>' +
        '<circle cx="14" cy="8.2" r="1.3" fill="#0f172a"/>' +
        '<circle cx="24" cy="8.2" r="1.3" fill="#0f172a"/>' +
        '<circle cx="29" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>' +
        '<rect x="9" y="14" width="20" height="2" rx="0.8" fill="#0f172a"/>' +
        '<circle cx="11" cy="13.2" r="1.3" fill="#0f172a"/>' +
        '<circle cx="27" cy="13.2" r="1.3" fill="#0f172a"/>' +
        '<rect x="21" y="16.5" width="6.5" height="10" rx="1.5" fill="#0f172a"/>' +
        '<line x1="23" y1="18.5" x2="23" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>' +
        '<line x1="25.5" y1="18.5" x2="25.5" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>' +
        '<rect x="8" y="25" width="12" height="1.8" rx="0.8" fill="#0f172a"/>' +
        '<circle cx="19" cy="3.5" r="1.4" fill="#e11d48"/>' +
        '<path d="M19,16 L15,36" stroke="#0f172a" stroke-width="0.9" stroke-dasharray="2 1"/>' +
        '</svg>';
    const formattedFolio = String(folio || id).padStart(4, "0");
    return [
      '    <!-- FACTURA ' + id + ' (FOLIO ' + formattedFolio + ') -->',
      '    <article class="' + invoiceThemeClass + '" id="inv-' + id + '">',
      '      <header class="inv-header">',
      '        <div class="brand-group">',
      '          <div class="brand-top-lockup">',
      '            <div class="brand-badge-icon">' + brandIconSvg + '</div>',
      '            <div class="brand-text-col">',
      '              <div class="brand-name-line">',
      '                <span class="brand-word-melty">Melty</span><span class="brand-word-deays">Deays</span>',
      '                <span class="brand-pill-tag">' + brandPill + '</span>',
      '              </div>',
      '              <div class="brand-kicker">' + brandKicker + '</div>',
      '              <div class="brand-subitems">' + brandSubitems + '</div>',
      '            </div>',
      '          </div>',
      '        </div>',
      '        <div class="meta-boxes">',
      '          <div class="folio-box">',
      '            <span class="folio-label">Nº FACTURA:</span>',
      '            <div class="folio-write-zone" style="border:none !important; border-bottom:none !important; text-decoration:none !important; outline:none; background:transparent !important;" contenteditable="true">' + formattedFolio + '</div>',
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
      '        <div class="thanks-note">' + thanksNote + '</div>',
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
      '            <div class="t-write-line" style="border:none !important; border-bottom:none !important; text-decoration:none !important; outline:none;"><span class="curr">$</span><span class="val-tot" contenteditable="true"></span></div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '',
      '      <!-- APARTADO GARANTIA Y POLITICAS (TIPOGRAFIA OPTIMIZADA) -->',
      '      <footer class="warranty-card">',
      '        <div class="warranty-header-row">',
      '          <span class="w-title"><svg class="w-icon" viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px; display:inline-block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>GARANTÍA, CAMBIO Y REEMBOLSO</span>',
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
      '              <img src="' + QR_CATALOG_BASE64 + '" alt="QR WhatsApp" class="qr-img" onerror="this.onerror=null;this.src=\'' + QR_CATALOG_BASE64 + '\';">',
      '            </div>',
      '            <span class="qr-badge-wa">📱 WHATSAPP</span>',
      '          </div>',
      '          <div class="contact-meta">',
      '            <div class="contact-row">',
      '              <span class="badge-tag tag-ig">INSTAGRAM</span>',
      '              <span class="contact-text handle-text">@meltydeays</span>',
      '            </div>',
      '            <div class="contact-row">',
      '              <span class="badge-tag tag-tel">WHATSAPP</span>',
      '              <span class="contact-text phone-text">+505 5843 8412</span>',
      '            </div>',
      '            <div class="contact-row">',
      '              <span class="badge-tag tag-mail">CORREO</span>',
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

  /**
   * Genera el SVG vectorial de código de barras a ancho completo (100% width) para que nunca se corte a medias
   * @param {string} code - Código serial del token
   */
  static getFullWidthBarcodeSvg(code) {
    return '<svg viewBox="0 0 360 22" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
      '<rect width="360" height="22" fill="#ffffff"/>' +
      '<g fill="#0f172a">' +
      '<rect x="0" y="0" width="3" height="22"/><rect x="5" y="0" width="1.5" height="22"/><rect x="8" y="0" width="4" height="22"/><rect x="14" y="0" width="2" height="22"/><rect x="18" y="0" width="5" height="22"/>' +
      '<rect x="25" y="0" width="1.5" height="22"/><rect x="28" y="0" width="3" height="22"/><rect x="33" y="0" width="5.5" height="22"/><rect x="41" y="0" width="2" height="22"/><rect x="45" y="0" width="4" height="22"/>' +
      '<rect x="51" y="0" width="1.5" height="22"/><rect x="55" y="0" width="5" height="22"/><rect x="62" y="0" width="2" height="22"/><rect x="66" y="0" width="3" height="22"/><rect x="71" y="0" width="6" height="22"/>' +
      '<rect x="79" y="0" width="2" height="22"/><rect x="83" y="0" width="4" height="22"/><rect x="89" y="0" width="1.5" height="22"/><rect x="92" y="0" width="3" height="22"/><rect x="97" y="0" width="5" height="22"/>' +
      '<rect x="104" y="0" width="2" height="22"/><rect x="108" y="0" width="6" height="22"/><rect x="116" y="0" width="3" height="22"/><rect x="121" y="0" width="1.5" height="22"/><rect x="124" y="0" width="4" height="22"/>' +
      '<rect x="130" y="0" width="2" height="22"/><rect x="134" y="0" width="5" height="22"/><rect x="141" y="0" width="3" height="22"/><rect x="146" y="0" width="1.5" height="22"/><rect x="150" y="0" width="6" height="22"/>' +
      '<rect x="158" y="0" width="2" height="22"/><rect x="162" y="0" width="4" height="22"/><rect x="168" y="0" width="1.5" height="22"/><rect x="171" y="0" width="5" height="22"/><rect x="178" y="0" width="3" height="22"/>' +
      '<rect x="183" y="0" width="2" height="22"/><rect x="187" y="0" width="6" height="22"/><rect x="195" y="0" width="1.5" height="22"/><rect x="198" y="0" width="4" height="22"/><rect x="204" y="0" width="2" height="22"/>' +
      '<rect x="208" y="0" width="5" height="22"/><rect x="215" y="0" width="3" height="22"/><rect x="220" y="0" width="1.5" height="22"/><rect x="223" y="0" width="6" height="22"/><rect x="231" y="0" width="2" height="22"/>' +
      '<rect x="235" y="0" width="4" height="22"/><rect x="241" y="0" width="1.5" height="22"/><rect x="244" y="0" width="5" height="22"/><rect x="251" y="0" width="2" height="22"/><rect x="255" y="0" width="3" height="22"/>' +
      '<rect x="260" y="0" width="6" height="22"/><rect x="268" y="0" width="2" height="22"/><rect x="272" y="0" width="4" height="22"/><rect x="278" y="0" width="1.5" height="22"/><rect x="281" y="0" width="3" height="22"/>' +
      '<rect x="286" y="0" width="5" height="22"/><rect x="293" y="0" width="2" height="22"/><rect x="297" y="0" width="6" height="22"/><rect x="305" y="0" width="3" height="22"/><rect x="310" y="0" width="1.5" height="22"/>' +
      '<rect x="313" y="0" width="4" height="22"/><rect x="319" y="0" width="2" height="22"/><rect x="323" y="0" width="5" height="22"/><rect x="330" y="0" width="3" height="22"/><rect x="335" y="0" width="1.5" height="22"/>' +
      '<rect x="338" y="0" width="6" height="22"/><rect x="346" y="0" width="2" height="22"/><rect x="350" y="0" width="4" height="22"/><rect x="356" y="0" width="4" height="22"/>' +
      '</g>' +
    '</svg>';
  }

  /**
   * Genera el HTML de la Contraportada Coleccionable Lain con QR Dinámico y PIN aleatorio
   * @param {number} cardNum - Número de tarjeta temática (1, 2, 3, 4)
   * @param {object} tok - Datos del token ({ tokenCode, securityPin, invoiceFolio })
   * @param {number|string} slotId - Identificador único de slot para renderizar el QR
   * @param {number} [templateIdx] - Índice opcional de plantilla (0 a configs.length - 1)
   */
  static getLainBackCardHtml(cardNum, tok, slotId, templateIdx) {
    const configs = getPhysical4x1Designs();
    const idx = (typeof templateIdx === 'number' && templateIdx >= 0)
      ? (templateIdx % configs.length)
      : (slotId != null ? (slotId % configs.length) : Math.floor(Math.random() * configs.length));
    const item = configs[idx];
    const isHaibane = (item.series && item.series.startsWith('SERIE 3')) || (idx >= 44);
    item.layer = item.layer || ('LAYER: ' + String(idx + 1).padStart(2, '0'));
    const tokenCode = tok ? tok.tokenCode : item.sn;
    const pin = tok ? tok.securityPin : "••••";
    const folioStr = tok ? ("F" + tok.invoiceFolio) : "0000";

    const cardClass = isHaibane ? 'lain-card theme-haibane' : 'lain-card';
    const cornerSymbol = isHaibane ? '✦' : '+';
    const badgeNaviText = isHaibane ? 'MELTYDEAYS · HAIBANE' : 'MELTYDEAYS · NAVI';
    const osTagText = isHaibane ? ('GLIE COVENANT // ' + folioStr) : ('COPLAND OS 21.0 // ' + folioStr);
    const hudPassText = isHaibane ? 'SANCTIFIED' : 'PASS';
    const rewardTagText = isHaibane ? '❖ HAIBANE RENMEI // PASS' : '❖ THE WIRED CLUB // PASS';
    const stampOrgText = isHaibane ? 'HAIBANE GUILD' : 'TACHIBANA LABS';
    const stampAuthText = isHaibane ? '★ SANCTIFIED ★' : '★ CERTIFIED ★';

    return [
      '    <!-- TARJETA TRASERA ' + cardNum + ' (' + (isHaibane ? 'HAIBANE RENMEI' : 'LAIN / COPLAND OS') + ' // ' + item.layer + ') -->',
      '    <article class="' + cardClass + '" id="back-card-' + cardNum + '">',
      '      <div class="tech-corner top-left">' + cornerSymbol + '</div>',
      '      <div class="tech-corner top-right">' + cornerSymbol + '</div>',
      '      <div class="tech-corner bottom-left">' + cornerSymbol + '</div>',
      '      <div class="tech-corner bottom-right">' + cornerSymbol + '</div>',
      '',
      '      <div class="lain-header">',
      '        <div class="lain-badge-group">',
      '          <span class="badge-navi">' + badgeNaviText + '</span>',
      '          <span class="badge-layer">' + item.layer + '</span>',
      '        </div>',
      '        <div class="lain-os-tag">' + osTagText + '</div>',
      '      </div>',
      '',
      '      <div class="lain-title-row">',
      '        <div class="lain-main-title">' + item.title + '</div>',
      '        <div class="lain-sub-title">' + item.sub + '</div>',
      '      </div>',
      '',
      '      <div class="lain-main-body-row">',
      '        <div class="lain-figure-col">',
      '          <div class="figure-hud-header">',
      '            <div style="display:flex;align-items:center;gap:3px;"><span class="hud-status-dot"></span><span class="hud-title">' + item.layer + '</span></div>',
      '            <span class="hud-protocol">' + item.protocol + '</span>',
      '          </div>',
      '          <div class="lain-svg-container">',
      '            <span class="hud-cross-tl">+</span><span class="hud-cross-tr">+</span>',
      '            <span class="hud-cross-bl">+</span><span class="hud-cross-br">+</span>',
      '            ' + item.svg,
      '          </div>',
      '          <div class="figure-hud-footer">',
      '            <span class="hud-chip">' + item.chip + '</span>',
      '            <span class="hud-pass">' + hudPassText + '</span>',
      '          </div>',
      '        </div>',
      '',
      '        <div class="lain-reward-col">',
      '          <div class="reward-tag">' + rewardTagText + '</div>',
      '          <div class="reward-points-row">',
      '            <span class="reward-plus">+</span>',
      '            <div class="reward-pencil-box" title="Escribe aquí los puntos ganados con lápiz">',
      '              <div class="pencil-guide-line"></div>',
      '            </div>',
      '            <span class="reward-wp">WP</span>',
      '          </div>',
      '          <div class="reward-qr-frame">',
      '            <span class="qr-reticle-tl">⌜</span><span class="qr-reticle-tr">⌝</span>',
      '            <span class="qr-reticle-bl">⌞</span><span class="qr-reticle-br">⌟</span>',
      '            <div class="qr-canvas-box" id="print-qr-' + slotId + '"></div>',
      '          </div>',
      '          <div class="reward-pin-tag">PIN: <strong>' + pin + '</strong></div>',
      '          <div class="reward-sub">ESCANEA CON TU SMARTPHONE PARA ACREDITAR TUS PUNTOS</div>',
      '        </div>',
      '      </div>',
      '',
      '      <div class="lain-quote-box">',
      '        <div class="lain-kanji">' + item.kanji + '</div>',
      '        <div class="lain-quote-text">' + item.quote + '</div>',
      '      </div>',
      '',
      '      <div class="specs-grid">',
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
      '            ' + Physical4x1Builder.getFullWidthBarcodeSvg(tokenCode),
      '          </div>',
      '          <div class="serial-code">CÓDIGO: ' + tokenCode + '</div>',
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

  static generatePrintDocument(tokens, paperDims, mode = "both", autoPrint = true) {
    const dims = paperDims || { name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' };
    const allTokens = (tokens && tokens.length > 0) ? tokens : [
      { tokenCode: "WP-2026-F0104-A98B", invoiceFolio: "0104", pointsValue: 0, securityPin: "4891" },
      { tokenCode: "WP-2026-F0105-C34D", invoiceFolio: "0105", pointsValue: 0, securityPin: "7124" },
      { tokenCode: "WP-2026-F0106-E56F", invoiceFolio: "0106", pointsValue: 0, securityPin: "8390" },
      { tokenCode: "WP-2026-F0107-G78H", invoiceFolio: "0107", pointsValue: 0, securityPin: "1923" }
    ];

    const totalSheets = Math.ceil(allTokens.length / 4);
    let pagesHtml = '';
    let qrIndex = 0;

    for (let s = 0; s < totalSheets; s++) {
      const batch = allTokens.slice(s * 4, s * 4 + 4);
      while (batch.length < 4) {
        batch.push({ tokenCode: "WP-BLANK-" + s + "-" + batch.length, invoiceFolio: String(Number(batch[batch.length - 1]?.invoiceFolio || "0000") + 1).padStart(4, "0"), pointsValue: 0, securityPin: "----" });
      }

      const sheetNum = s + 1;

      const configs = getPhysical4x1Designs();
      const totalPhysical = configs.length;

      // Filtrado por Serie activa (SERIE 1, SERIE 2, SERIE 3 o ALL)
      const activeSeries = (typeof window !== "undefined" && window._currentSeriesFilter)
        ? window._currentSeriesFilter
        : "ALL";

      let allowedIndices = [];
      if (activeSeries === "SERIE 1") {
        allowedIndices = Array.from({ length: 24 }, (_, i) => i);
      } else if (activeSeries === "SERIE 2") {
        allowedIndices = Array.from({ length: 20 }, (_, i) => i + 24);
      } else if (activeSeries === "SERIE 3") {
        allowedIndices = Array.from({ length: 30 }, (_, i) => i + 44);
      } else {
        allowedIndices = Array.from({ length: totalPhysical }, (_, i) => i);
      }
      if (!allowedIndices.length) allowedIndices = [0];

      const fixedTemplate = (typeof window !== "undefined" && window.activeLainTemplateIdx !== null && window.activeLainTemplateIdx !== undefined)
        ? Math.max(0, Math.min(totalPhysical - 1, Number(window.activeLainTemplateIdx) | 0))
        : null;

      const t0 = fixedTemplate !== null ? fixedTemplate : allowedIndices[(qrIndex + 0) % allowedIndices.length];
      const t1 = fixedTemplate !== null ? fixedTemplate : allowedIndices[(qrIndex + 1) % allowedIndices.length];
      const t2 = fixedTemplate !== null ? fixedTemplate : allowedIndices[(qrIndex + 2) % allowedIndices.length];
      const t3 = fixedTemplate !== null ? fixedTemplate : allowedIndices[(qrIndex + 3) % allowedIndices.length];

      if (mode !== "back") {
        const frontHtml = [
          Physical4x1Builder.getInvoiceHtml(batch[0].invoiceFolio, 1, configs[t0]?.series),
          Physical4x1Builder.getInvoiceHtml(batch[1].invoiceFolio, 2, configs[t1]?.series),
          Physical4x1Builder.getInvoiceHtml(batch[2].invoiceFolio, 3, configs[t2]?.series),
          Physical4x1Builder.getInvoiceHtml(batch[3].invoiceFolio, 4, configs[t3]?.series)
        ].join("\n\n");

        pagesHtml += `
  <main class="sheet-letter sheet-front">
    <div class="cut-badge">✂ CORTE 4X1 Pág ${sheetNum}A (${dims.name})</div>
    ${frontHtml}
  </main>\n`;
      }

      if (mode !== "front") {
        const backHtml = [
          Physical4x1Builder.getLainBackCardHtml(2, batch[1], qrIndex + 1, t1),
          Physical4x1Builder.getLainBackCardHtml(1, batch[0], qrIndex + 0, t0),
          Physical4x1Builder.getLainBackCardHtml(4, batch[3], qrIndex + 3, t3),
          Physical4x1Builder.getLainBackCardHtml(3, batch[2], qrIndex + 2, t2)
        ].join("\n\n");

        pagesHtml += `
  <main class="sheet-letter sheet-back">
    <div class="cut-badge">✂ REVERSO Pág ${sheetNum}B (${dims.name})</div>
    ${backHtml}
  </main>\n`;
      }
      qrIndex += 4;
    }

    const styles = get4x1FullPrintStyles(dims);


    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Facturas Doble Cara \u2014 MeltyDeays \u00d7 The Wired (${allTokens.length} facturas, ${totalSheets} pliegos)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    ${styles}
  </style>
</head>
<body>
  <header class="toolbar">
    <div class="toolbar-info">
      <h1>\ud83d\udcc4 Facturas Doble Cara \u2014 MeltyDeays \u00d7 The Wired</h1>
      <p>${allTokens.length} facturas en ${totalSheets} pliego(s) \u00b7 Cada pliego: Anverso Oficial + Contraportada Lain con QR y PIN</p>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-bw" id="btn-bw" onclick="toggleBW()">🖤 Blanco y Negro</button>
      <button class="btn btn-sec" onclick="downloadHtmlFile()">📥 Descargar HTML</button>
      <button class="btn btn-sec" onclick="window.close()">✕ Cerrar</button>
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF (Ctrl + P)</button>
    </div>
  </header>

  ${pagesHtml}

  <script>
    const tokens = ${JSON.stringify(allTokens)};

    function toggleBW() {
      document.body.classList.toggle('bw-mode');
      const btn = document.getElementById('btn-bw');
      if (btn) btn.classList.toggle('active');
    }

    function downloadHtmlFile() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'facturas_meltydeays_' + tokens.length + 'x1.html';
      a.click();
    }

    window.onload = function() {
      function renderAllQrs() {
        tokens.forEach((tok, idx) => {
          const el = document.getElementById("print-qr-" + idx);
          if (el && typeof QRCode !== "undefined") {
            el.innerHTML = "";
            new QRCode(el, {
              text: "https://meltydeays-wired-club.vercel.app/?claim=" + tok.tokenCode,
              width: 78, height: 78,
              colorDark: "#0f172a",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.M
            });
          }
        });
      }
      function proceedWithPrint() {
        if (${Boolean(autoPrint)}) {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
              setTimeout(() => { window.print(); }, 400);
            });
          } else {
            setTimeout(() => { window.print(); }, 800);
          }
        }
      }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.onload = function() {
        renderAllQrs();
        proceedWithPrint();
      };
      s.onerror = function() {
        proceedWithPrint();
      };
      document.head.appendChild(s);
    };
  <\/script>
</body>
</html>`;
  }

}
