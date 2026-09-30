/**
 * Builder: Factura Digital Individual (1 Página Completa)
 * Anverso Digital Oficial y Contraportada Coleccionable Exclusiva
 */
import { QR_CATALOG_BASE64 } from "../assets/invoiceAssets.js";
import { getDigitalExclusiveDesigns } from "../designs/index.js";
import { getSingleDigitalFullPrintStyles } from "../styles/index.js";
import { Physical4x1Builder } from "./Physical4x1Builder.js";

export class SingleDigitalInvoiceBuilder {
  static getSingleDigitalInvoiceHtml(inv) {
    const data = inv || {};
    const formattedFolio = String(data.folio || "0001").padStart(4, "0");
    const today = new Date();
    
    // Parseo de fecha en slots
    let dayStr = "", monthStr = "", yearStr = "";
    if (data.date && data.date.includes("-")) {
      const parts = data.date.split("-");
      yearStr = parts[0];
      monthStr = parts[1];
      dayStr = parts[2];
    } else if (data.date && data.date.includes("/")) {
      const parts = data.date.split("/");
      dayStr = parts[0];
      monthStr = parts[1];
      yearStr = parts[2];
    } else {
      dayStr = String(today.getDate()).padStart(2, "0");
      monthStr = String(today.getMonth() + 1).padStart(2, "0");
      yearStr = String(today.getFullYear());
    }

    const timeStr = data.time || today.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });
    const clientName = data.clientName || "Consumidor Final";
    const clientPhone = data.clientPhone || "";
    const paymentMethod = data.paymentMethod || "Efectivo";
    const currency = data.currency || "USD";
    const currSym = currency === "NIO" ? "C$" : "$";
    const rateNio = 37.0;

    const isEfectivo = !paymentMethod || paymentMethod.toLowerCase().includes("efectivo");
    const isTransf = paymentMethod && (paymentMethod.toLowerCase().includes("transf") || paymentMethod.toLowerCase().includes("banc"));
    const isTarjeta = paymentMethod && (paymentMethod.toLowerCase().includes("tarjeta") || paymentMethod.toLowerCase().includes("card"));
    const isOtro = !isEfectivo && !isTransf && !isTarjeta;

    const items = (data.items && data.items.length > 0) ? data.items : [
      { cant: 1, desc: "Artículo de Tecnología / Periférico Casual", price: Number(data.total || 0), total: Number(data.total || 0) }
    ];

    const subtotalNum = Number(data.subtotal != null ? data.subtotal : items.reduce((acc, it) => acc + (Number(it.total) || 0), 0));
    const discountNum = Number(data.discount || 0);
    const totalNum = Number(data.total != null ? data.total : (subtotalNum - discountNum));
    const totalNio = currency === "USD" ? (totalNum * rateNio).toFixed(2) : totalNum.toFixed(2);
    const totalUsd = currency === "NIO" ? (totalNum / rateNio).toFixed(2) : totalNum.toFixed(2);

    const hasPoints = Boolean(data.tokenCode && (data.pointsValue > 0 || data.pointsValue === 0));
    const pointsVal = Number(data.pointsValue || 0);
    const tokenCode = data.tokenCode || ("WP-2026-F" + formattedFolio + "-DIGITAL");
    const securityPin = data.securityPin || "----";
    const warrantyText = data.warrantyText || "30 DÍAS CALENDARIO (DEFECTOS DE FÁBRICA)";
    const claimUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + tokenCode;

    // Filas de artículos (mínimo 8 filas para estructura oficial idéntica al talonario)
    let rowsHtml = "";
    items.forEach((it) => {
      const p = Number(it.price || 0).toFixed(2);
      const t = Number(it.total || 0).toFixed(2);
      rowsHtml += `
        <tr>
          <td class="col-cant">${it.cant || 1}</td>
          <td class="col-desc">
            <div style="font-weight: 700; color: var(--dark);">${it.desc || "Producto"}</div>
            ${it.subdesc ? `<div style="font-size: 0.72rem; color: #64748b;">${it.subdesc}</div>` : ""}
          </td>
          <td class="col-price">${currSym} ${p}</td>
          <td class="col-total">${currSym} ${t}</td>
        </tr>`;
    });

    const fillerCount = Math.max(0, 8 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      rowsHtml += `
        <tr class="row-empty">
          <td class="col-cant">&nbsp;</td>
          <td class="col-desc">&nbsp;</td>
          <td class="col-price">&nbsp;</td>
          <td class="col-total">&nbsp;</td>
        </tr>`;
    }

    return `
    <!-- FACTURA DIGITAL INDIVIDUAL 1-PAGE (CONSISTENCIA EXACTA CON ANVERSO 4X1) -->
    <article class="invoice single-page-invoice" id="inv-digital-${formattedFolio}">
      <header class="inv-header">
        <div class="brand-group">
          <div class="brand-top-lockup">
            <div class="brand-badge-icon">
              <svg viewBox="0 0 38 38" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg" class="wired-pole-svg">
                <rect x="0.5" y="0.5" width="37" height="37" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.3"/>
                <line x1="2" y1="19" x2="36" y2="19" stroke="#f1f5f9" stroke-width="0.8"/>
                <line x1="19" y1="2" x2="19" y2="36" stroke="#f1f5f9" stroke-width="0.8"/>
                <path d="M1,8 Q12,18 19,10 Q26,18 37,8" fill="none" stroke="#0f172a" stroke-width="1.2"/>
                <path d="M1,14 Q10,22 19,15 Q28,22 37,13" fill="none" stroke="#0f172a" stroke-width="1.2"/>
                <path d="M1,20 Q11,27 19,21 Q27,27 37,19" fill="none" stroke="#e11d48" stroke-width="1.3"/>
                <path d="M1,26 Q12,32 19,26 Q27,33 37,25" fill="none" stroke="#4f46e5" stroke-width="1.1"/>
                <rect x="17.2" y="4" width="3.6" height="33" rx="0.8" fill="#0f172a"/>
                <rect x="7" y="9" width="24" height="2" rx="0.8" fill="#0f172a"/>
                <circle cx="9" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>
                <circle cx="14" cy="8.2" r="1.3" fill="#0f172a"/>
                <circle cx="24" cy="8.2" r="1.3" fill="#0f172a"/>
                <circle cx="29" cy="8.2" r="1.3" fill="#e11d48" stroke="#0f172a" stroke-width="0.7"/>
                <rect x="9" y="14" width="20" height="2" rx="0.8" fill="#0f172a"/>
                <circle cx="11" cy="13.2" r="1.3" fill="#0f172a"/>
                <circle cx="27" cy="13.2" r="1.3" fill="#0f172a"/>
                <rect x="21" y="16.5" width="6.5" height="10" rx="1.5" fill="#0f172a"/>
                <line x1="23" y1="18.5" x2="23" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>
                <line x1="25.5" y1="18.5" x2="25.5" y2="24.5" stroke="#ffffff" stroke-width="0.8"/>
                <rect x="8" y="25" width="12" height="1.8" rx="0.8" fill="#0f172a"/>
                <circle cx="19" cy="3.5" r="1.4" fill="#e11d48"/>
                <path d="M19,16 L15,36" stroke="#0f172a" stroke-width="0.9" stroke-dasharray="2 1"/>
              </svg>
            </div>
            <div class="brand-text-col">
              <div class="brand-name-line">
                <span class="brand-word-melty">Melty</span><span class="brand-word-deays">Deays</span>
                <span class="brand-pill-tag">STORE</span>
              </div>
              <div class="brand-kicker">TECH, GADGETS & GAMING HARDWARE</div>
              <div class="brand-subitems">Laptops · Turbo Fans · Mandos · Audio · Periféricos · Redes</div>
            </div>
          </div>
        </div>
        <div class="meta-boxes">
          <div class="folio-box">
            <span class="folio-label">Nº FACTURA:</span>
            <div class="folio-write-zone" style="border:none !important; border-bottom:none !important; text-decoration:none !important; outline:none !important; background:transparent !important; box-shadow:none !important;" contenteditable="true">#MD-2026-${formattedFolio}</div>
          </div>
          <div class="date-row">
            <span class="date-label">FECHA:</span>
            <div class="date-input-area">
              <span class="date-slot day-slot" contenteditable="true">${dayStr}</span>
              <span class="date-sep">/</span>
              <span class="date-slot month-slot" contenteditable="true">${monthStr}</span>
              <span class="date-sep">/</span>
              <span class="date-slot year year-slot" contenteditable="true">${yearStr}</span>
            </div>
            <span class="date-label" style="margin-left: 6px;">HORA:</span>
            <div class="date-input-area">
              <span class="date-slot time-slot" contenteditable="true" style="min-width: 52px;">${timeStr}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- BARRA CLIENTE (NOMBRE Y PAGO) -->
      <section class="client-bar">
        <div class="client-name-group">
          <span class="c-label">Cliente:</span>
          <div class="c-line client-name" contenteditable="true">
            <strong style="color: var(--dark);">${clientName}</strong>
            ${clientPhone ? `<span style="font-weight: normal; color: var(--gray-700); margin-left: 8px;">· Tel: ${clientPhone}</span>` : ""}
          </div>
        </div>
        <div class="payment-options">
          <span class="c-label">Pago:</span>
          <span class="pay-check"><span class="box-square ${isEfectivo ? 'active-square' : ''}">${isEfectivo ? '✓' : ''}</span> Efectivo</span>
          <span class="pay-check"><span class="box-square ${isTransf ? 'active-square' : ''}">${isTransf ? '✓' : ''}</span> Transf.</span>
          <span class="pay-check"><span class="box-square ${isTarjeta ? 'active-square' : ''}">${isTarjeta ? '✓' : ''}</span> Tarjeta</span>
          <span class="pay-check"><span class="box-square ${isOtro ? 'active-square' : ''}">${isOtro ? '✓' : ''}</span> Otro</span>
        </div>
      </section>

      <!-- TABLA DE ARTÍCULOS -->
      <div class="table-box">
        <table class="items-table">
          <thead>
            <tr>
              <th class="col-cant">CANT</th>
              <th class="col-desc">DESCRIPCIÓN DEL ARTÍCULO / PRODUCTO</th>
              <th class="col-price">P. UNIT</th>
              <th class="col-total">TOTAL</th>
            </tr>
          </thead>
          <tbody class="table-body">
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN TOTALES EQUILIBRADA (CON DETALLES DE CONVERSIÓN Y WIRED POINTS) -->
      <div class="totals-area">
        <div class="thanks-note">
          <div class="thanks-title">¡Gracias por tu compra!</div>
          <div class="thanks-conversion">
            Equivalencia cambiaria oficial: <strong>1 USD = 37.00 NIO</strong> · 
            ${currency === "USD" 
              ? `Total en Córdobas: <strong style="color:var(--dark);">C$ ${totalNio}</strong>` 
              : `Total en Dólares: <strong style="color:var(--dark);">$ ${totalUsd}</strong>`}
          </div>
          ${hasPoints ? `
          <div class="thanks-wired-badge">
            <span class="wp-badge-icon">⚡</span>
            <span>FIDELIZACIÓN WIRED CLUB: <strong>+${pointsVal} WP</strong> ACREDITADOS</span>
            <span class="wp-badge-meta">TOKEN: <code>${tokenCode}</code> · PIN: <strong>${securityPin}</strong></span>
          </div>
          ` : ""}
        </div>
        <div class="totals-receipt">
          <div class="totals-row">
            <span class="t-label-text">Subtotal:</span>
            <div class="t-write-line"><span class="curr">${currSym}</span><span class="val-sub" contenteditable="true">${subtotalNum.toFixed(2)}</span></div>
          </div>
          <div class="totals-row">
            <span class="t-label-text">Descuento:</span>
            <div class="t-write-line"><span class="curr">${currSym}</span><span class="val-desc" contenteditable="true">${discountNum > 0 ? ('-' + discountNum.toFixed(2)) : '0.00'}</span></div>
          </div>
          <div class="totals-row final-total">
            <span class="t-label-text">TOTAL:</span>
            <div class="t-write-line" style="border:none !important; border-bottom:none !important; text-decoration:none !important; outline:none !important; box-shadow:none !important;"><span class="curr">${currSym}</span><span class="val-tot" contenteditable="true">${totalNum.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <!-- APARTADO GARANTIA Y POLITICAS (IDÉNTICO A FACTURA FÍSICA) -->
      <footer class="warranty-card">
        <div class="warranty-header-row">
          <span class="w-title">
            <svg class="w-icon" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px; display:inline-block;">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            GARANTÍA, CAMBIO Y REEMBOLSO
          </span>
          <div class="w-period-box">
            <span class="w-period-label">TIEMPO VÁLIDO:</span>
            <span class="w-period-write w-time-slot" contenteditable="true">${warrantyText}</span>
          </div>
        </div>
        <div class="warranty-text">
          • <strong>REEMBOLSO O CAMBIO:</strong> Se devuelve el dinero (con razón válida justificada) o se realiza cambio por otro artículo si el cliente lo prefiere.<br>
          • <strong>CONDICIONES:</strong> Válido exclusivamente por defectos de fábrica comprobables con empaque original intacto, accesorios íntegros y este ticket.<br>
          • <strong>EXCLUSIONES:</strong> No cubre daños por mal uso, golpes, caídas, humedad ni variaciones de voltaje.
        </div>
      </footer>

      <!-- PIE DE PÁGINA (QR DESTACADO, CONTACTOS AL MEDIO, FIRMA/SELLO A LA DERECHA) -->
      <div class="inv-bottom">
        <div class="contact-qr-group">
          <div class="qr-col">
            <div class="qr-frame">
              <img src="${QR_CATALOG_BASE64}" 
                alt="QR WhatsApp" 
                class="qr-img" 
                onerror="this.onerror=null;this.src='${QR_CATALOG_BASE64}';">
            </div>
            <span class="qr-badge-wa">📱 WHATSAPP</span>
          </div>
          <div class="contact-meta">
            <div class="contact-row">
              <span class="badge-tag tag-ig">INSTAGRAM</span>
              <span class="contact-text handle-text">@meltydeays</span>
            </div>
            <div class="contact-row">
              <span class="badge-tag tag-tel">WHATSAPP</span>
              <span class="contact-text phone-text">+505 5843 8412</span>
            </div>
            <div class="contact-row">
              <span class="badge-tag tag-mail">CORREO</span>
              <span class="contact-text email-text">evertz2lopeztorrez@gmail.com</span>
            </div>
          </div>
        </div>
        <div class="signature-block">
          <div class="sign-seal-wrapper">
            <span class="digital-signature">MeltyDeays</span>
            <div class="seal-stamp">
              <span class="seal-star">★</span>
              <span class="seal-text">MD</span>
              <span class="seal-sub">OFICIAL</span>
            </div>
          </div>
          <div class="sign-underline"></div>
          <div class="sign-caption">Firma Autorizada / Sello de Mostrador</div>
        </div>
      </div>
    </article>`;
  }

  /**
   * Colección oficial de 20 Diseños temáticos Serial Experiments Lain para Factura Digital
   * Diseños con uso completo de espacio (Letter / 1 Página)
   */
  /**
   * Catálogo de 74 diseños coleccionables para facturas físicas 4x1 (Serie 1, Serie 2 y Serie 3)
   * Desacoplado modularmente en js/templates/designs/
   * @returns {Array<object>}
   */

  static getSingleDigitalLainBackCardHtml(inv, selectedTemplateIdx = null) {
    const data = inv || {};
    const formattedFolio = String(data.folio || "0001").padStart(4, "0");
    const pointsVal = Number(data.pointsValue || 0);
    const tok = {
      tokenCode: data.tokenCode || ("WP-2026-F" + formattedFolio + "-DIGITAL"),
      securityPin: data.securityPin || "4891",
      invoiceFolio: formattedFolio,
      pointsValue: pointsVal
    };
    const configs = getDigitalExclusiveDesigns();
    const folioNum = parseInt(data.folio, 10);
    let chosenIdx = 0;
    if (typeof selectedTemplateIdx === "number" && selectedTemplateIdx >= 0) {
      chosenIdx = selectedTemplateIdx % configs.length;
    } else if (typeof data.selectedLainDesignIdx === "number" && data.selectedLainDesignIdx >= 0) {
      chosenIdx = data.selectedLainDesignIdx % configs.length;
    } else if (typeof window !== "undefined" && window.activeLainTemplateIdx != null) {
      chosenIdx = Math.max(0, Math.min(configs.length - 1, Number(window.activeLainTemplateIdx) | 0));
    } else {
      chosenIdx = isNaN(folioNum) ? 0 : (folioNum % configs.length);
    }
    const item = configs[chosenIdx];

    return `
    <!-- REVERSO COLECCIONABLE LAIN (HOJA CARTA FÍSICA // ${item.layer}) -->
    <article class="lain-card single-page-lain-card" id="single-digital-lain-card" data-current-idx="${chosenIdx}">
      <div class="tech-corner top-left">+</div>
      <div class="tech-corner top-right">+</div>
      <div class="tech-corner bottom-left">+</div>
      <div class="tech-corner bottom-right">+</div>

      <!-- HEADER HUD -->
      <div class="lain-header">
        <div class="lain-badge-group">
          <span class="badge-navi">MELTYDEAYS · NAVI</span>
          <span class="badge-layer">${item.layer}</span>
          <span class="badge-status-live">● KERNEL ACTIVE</span>
        </div>
        <div class="lain-os-tag">COPLAND OS 21.0 // F${tok.invoiceFolio} // SERIAL: ${item.sn}</div>
      </div>

      <!-- TITULO PRINCIPAL CENTRADO -->
      <div class="lain-title-row centered-title-row">
        <div class="lain-main-title">${item.title}</div>
        <div class="lain-sub-title">${item.sub}</div>
      </div>

      <!-- HERO SCHEMATIC SOBRE FONDO BLANCO LIMPIO -->
      <div class="hero-schematic-section white-bg-schematic">
        <div class="figure-hud-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="hud-status-dot"></span>
            <span class="hud-title">SCHEMATIC MONITOR // ${item.layer}</span>
          </div>
          <span class="hud-protocol">${item.protocol}</span>
        </div>

        <div class="schematic-telemetry-bar">
          <span>FREQ: 1.44 THz</span>
          <span>CARRIER: SYNC 50Hz</span>
          <span>SNR: 54.8 dB</span>
          <span>LATENCY: 0.01ms</span>
          <span>RING-0: INTEGRITY VERIFIED</span>
        </div>

        <div class="lain-svg-container hero-svg-container white-svg-container">
          <span class="hud-cross-tl">+</span>
          <span class="hud-cross-tr">+</span>
          <span class="hud-cross-bl">+</span>
          <span class="hud-cross-br">+</span>
          <div class="lain-svg-inner">
            ${item.svg}
          </div>
        </div>

        <div class="figure-hud-footer">
          <span class="hud-chip">CHIP: ${item.chip}</span>
          <span class="hud-pass">HARDWARE PASS · VERIFIED INTEGRITY</span>
        </div>
      </div>

      <!-- CITA INTERCEPTADA / KANJI DE LAIN (CENTRADA) -->
      <div class="intercepted-quote-box centered-quote-box">
        <div class="trans-header">/// INTERCEPTED TRANSMISSION</div>
        <div class="lain-kanji">${item.kanji}</div>
        <div class="lain-quote-text">${item.quote}</div>
      </div>

      <!-- CONSOLA CENTRADA DE PUNTOS WIRED CLUB (UN SOLO QR CENTRADO) -->
      <div class="centered-reward-section">
        <div class="reward-header-pill">
          <span class="reward-icon">❖</span> THE WIRED CLUB // CERTIFIED PASS
        </div>

        <div class="reward-points-card centered-points-card">
          <div class="reward-points-title">PUNTOS DE FIDELIZACIÓN</div>
          <div class="reward-points-row">
            <span class="reward-plus">+</span>
            <div class="reward-pencil-box" title="Wired Points acreditados">
              <span class="reward-points-number">${tok.pointsValue}</span>
            </div>
            <span class="reward-wp">WP</span>
          </div>
          <div class="reward-points-sub">ACREDITADOS OFICIALMENTE EN ESTA COMPRA</div>
        </div>

        <!-- MARCO QR CENTRADO (UNICO QR LIMPIO) -->
        <div class="reward-qr-frame centered-qr-frame">
          <span class="qr-reticle-tl">⌜</span>
          <span class="qr-reticle-tr">⌝</span>
          <span class="qr-reticle-bl">⌞</span>
          <span class="qr-reticle-br">⌟</span>
          <div class="qr-canvas-box" id="print-qr-digital-back"></div>
        </div>

        <!-- PIN Y TOKEN DE SEGURIDAD -->
        <div class="reward-pin-tag centered-pin-tag">
          TOKEN: <strong>${tok.tokenCode}</strong> · PIN DE SEGURIDAD: <strong>${tok.securityPin}</strong>
        </div>
        <div class="reward-sub centered-reward-sub">
          Escanea el código para acreditar tus puntos en <strong>meltydeays-wired-club.vercel.app</strong>
        </div>
      </div>

      <!-- GRID DE ESPECIFICACIONES TÉCNICAS CENTRADO -->
      <div class="specs-grid centered-specs-grid">
        <div class="spec-cell">
          <span class="spec-k">PROTOCOL</span>
          <span class="spec-v">${item.protocol}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-k">PROCESSOR</span>
          <span class="spec-v">${item.chip}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-k">HARDWARE BUS</span>
          <span class="spec-v">${item.spec1}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-k">SECURITY CIPHER</span>
          <span class="spec-v">${item.spec2}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-k">NETWORK NODE</span>
          <span class="spec-v">WIRED-TOKYO // GATE-48</span>
        </div>
        <div class="spec-cell">
          <span class="spec-k">TOKEN ID</span>
          <span class="spec-v">MD-2026-F${tok.invoiceFolio}</span>
        </div>
      </div>

      <!-- FOOTER COMPACTO CON CÓDIGO DE BARRAS A 1/4 DE HOJA -->
      <div class="lain-footer compact-footer">
        <div class="barcode-wrapper compact-barcode">
          <div class="vector-barcode">
            ${Physical4x1Builder.getFullWidthBarcodeSvg(tok.tokenCode)}
          </div>
          <div class="barcode-info-row">
            <span class="serial-code">SERIAL: ${tok.tokenCode}</span>
          </div>
        </div>
        <div class="lain-seal-stamp">
          <span class="stamp-org">TACHIBANA LABS</span>
          <span class="stamp-auth">★ CERTIFIED ★</span>
          <span class="stamp-store">MELTYDEAYS</span>
        </div>
      </div>
    </article>`;
  }


  static generateSingleDigitalInvoiceDocument(invoiceData, paperDims, autoPrint = false, selectedTemplateIdx = null) {
    const dims = paperDims || { name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' };
    const inv = invoiceData || {};
    const formattedFolio = String(inv.folio || "0001").padStart(4, "0");
    const claimUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + (inv.tokenCode || "");
    const configs = getDigitalExclusiveDesigns();
    const folioNum = parseInt(inv.folio, 10);
    let chosenIdx = 0;
    if (typeof selectedTemplateIdx === "number" && selectedTemplateIdx >= 0) {
      chosenIdx = selectedTemplateIdx % configs.length;
    } else if (typeof inv.selectedLainDesignIdx === "number" && inv.selectedLainDesignIdx >= 0) {
      chosenIdx = inv.selectedLainDesignIdx % configs.length;
    } else {
      chosenIdx = isNaN(folioNum) ? 0 : (folioNum % configs.length);
    }
    const singleHtml = SingleDigitalInvoiceBuilder.getSingleDigitalInvoiceHtml(inv);
    const singleBackHtml = SingleDigitalInvoiceBuilder.getSingleDigitalLainBackCardHtml(inv, chosenIdx);

    const styles = getSingleDigitalFullPrintStyles(dims);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura Electrónica #MD-2026-${formattedFolio} \u2014 MeltyDeays STORE</title>
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
      <h1>🧾 Factura Electrónica #MD-2026-${formattedFolio} \u2014 MeltyDeays STORE</h1>
      <p>Factura individual digital · Cliente: ${inv.clientName || 'General'} · Total: ${inv.currency === 'NIO' ? 'C$' : '$'} ${(inv.total || 0).toFixed(2)}</p>
    </div>
    <div class="toolbar-actions">
      <div class="view-mode-group">
        <button class="btn btn-mode active" id="btn-mode-front" onclick="setViewMode('front')">🧾 Factura (Anverso)</button>
        <button class="btn btn-mode" id="btn-mode-back" onclick="setViewMode('back')">🎴 Tarjeta Lain (Reverso)</button>
        <button class="btn btn-mode" id="btn-mode-both" onclick="setViewMode('both')">📑 Ambas Caras (2 Págs)</button>
      </div>
      <div class="toolbar-lain-selector">
        <span class="toolbar-lain-label">🎴 Diseño Reverso:</span>
        <select id="select-lain-design" class="copland-select-toolbar" onchange="switchLainDesign(this.value)">
          ${configs.map((c, i) => `<option value="${i}" ${i === chosenIdx ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-bw" id="btn-bw" onclick="toggleBW()">🖤 Blanco y Negro</button>
      <button class="btn btn-sec" onclick="shareViaWhatsApp()">📲 Enviar WhatsApp</button>
      <button class="btn btn-sec" onclick="downloadHtmlFile()">📥 Descargar HTML</button>
      <button class="btn btn-sec" onclick="window.close()">✕ Cerrar</button>
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF (Ctrl + P)</button>
    </div>
  </header>

  <main class="single-digital-invoice-page sheet-front" id="digital-page-front">
    ${singleHtml}
  </main>

  <main class="single-digital-invoice-page sheet-back" id="digital-page-back" style="display: none;">
    ${singleBackHtml}
  </main>

  <script>
    const folio = "${formattedFolio}";
    const claimUrl = "${claimUrl}";
    const clientPhone = "${inv.clientPhone || ''}";
    const clientName = "${inv.clientName || 'Estimado cliente'}";
    const totalFormatted = "${inv.currency === 'NIO' ? 'C$' : '$'} ${(inv.total || 0).toFixed(2)}";
    const qrCatalogBase64 = "${QR_CATALOG_BASE64}";
    const lainConfigs = ${JSON.stringify(configs.map(c => ({
      id: c.id,
      layer: c.layer,
      name: c.name,
      title: c.title,
      sub: c.sub,
      kanji: c.kanji,
      quote: c.quote,
      protocol: c.protocol,
      chip: c.chip,
      spec1: c.spec1,
      spec2: c.spec2,
      sn: c.sn,
      svg: c.svg
    })))};

    function setViewMode(mode) {
      const pageFront = document.getElementById('digital-page-front');
      const pageBack = document.getElementById('digital-page-back');
      document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));

      if (mode === 'front') {
        pageFront.style.display = 'block';
        pageBack.style.display = 'none';
        document.body.classList.remove('print-both');
        document.getElementById('btn-mode-front').classList.add('active');
      } else if (mode === 'back') {
        pageFront.style.display = 'none';
        pageBack.style.display = 'block';
        document.body.classList.remove('print-both');
        document.getElementById('btn-mode-back').classList.add('active');
        setTimeout(renderBackQr, 40);
      } else {
        pageFront.style.display = 'block';
        pageBack.style.display = 'block';
        document.body.classList.add('print-both');
        document.getElementById('btn-mode-both').classList.add('active');
        setTimeout(renderBackQr, 40);
      }
    }

    function toggleBW() {
      document.body.classList.toggle('bw-mode');
      const btn = document.getElementById('btn-bw');
      if (btn) btn.classList.toggle('active');
    }

    function shareViaWhatsApp() {
      let rawPhone = clientPhone.replace(/[^0-9]/g, '');
      if (rawPhone.length === 8) rawPhone = '505' + rawPhone;
      const nl = String.fromCharCode(10);
      const textMsg = encodeURIComponent(
        "\u00a1Hola " + clientName + "! \ud83d\udc4b Gracias por tu compra en MeltyDeays STORE." + nl + nl +
        "\ud83e\uddfe Factura Oficial: #MD-2026-" + folio + nl +
        "\ud83d\udcb0 Total: " + totalFormatted + nl +
        (claimUrl.includes("WP-") ? ("\u26a1 Puntos Wired Club para reclamar: " + claimUrl + nl) : "") +
        "\ud83d\udee1\ufe0f Garant\u00eda oficial MeltyDeays por defectos de f\u00e1brica." + nl + nl +
        "\u00a1Agradecemos tu confianza!"
      );
      window.open("https://wa.me/" + (rawPhone || "50558438412") + "?text=" + textMsg, "_blank");
    }

    function downloadHtmlFile() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'factura_meltydeays_MD-2026-' + folio + '.html';
      a.click();
    }


    function renderBackQr() {
      const qrBackEl = document.getElementById("print-qr-digital-back");
      if (!qrBackEl) return;
      if (!claimUrl || !claimUrl.includes("claim=")) {
        qrBackEl.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;border-radius:3px;font-size:9px;color:#94a3b8;font-weight:800;">SIN QR</div>';
        return;
      }
      qrBackEl.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        try {
          new QRCode(qrBackEl, {
            text: claimUrl,
            width: 120,
            height: 120,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
          const ensureClean = () => {
            const imgs = qrBackEl.querySelectorAll("img");
            const canvas = qrBackEl.querySelector("canvas");
            if (canvas && canvas.width > 0) {
              imgs.forEach(i => i.remove());
              canvas.style.cssText = "width:100%!important;height:100%!important;display:block!important;object-fit:contain;";
            } else if (imgs.length > 0 && imgs[0].src && imgs[0].src.length > 10) {
              for (let i = 1; i < imgs.length; i++) imgs[i].remove();
              imgs[0].style.cssText = "width:100%!important;height:100%!important;display:block!important;object-fit:contain;";
            }
          };
          ensureClean();
          setTimeout(ensureClean, 30);
          setTimeout(ensureClean, 150);
          return;
        } catch(e) {}
      }
      const fallbackImg = document.createElement("img");
      fallbackImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(claimUrl) + "&color=0f172a&bgcolor=ffffff";
      fallbackImg.alt = "QR Wired Points";
      fallbackImg.style.cssText = "width:100%;height:100%;display:block;object-fit:contain;";
      fallbackImg.onerror = function() { this.onerror = null; this.src = qrCatalogBase64; };
      qrBackEl.appendChild(fallbackImg);
    }

    function switchLainDesign(idx) {
      const chosen = lainConfigs[parseInt(idx, 10)] || lainConfigs[0];
      const card = document.getElementById("single-digital-lain-card");
      if (!card) return;

      const badgeLayer = card.querySelector(".badge-layer");
      if (badgeLayer) badgeLayer.textContent = chosen.layer;
      const osTag = card.querySelector(".lain-os-tag");
      if (osTag) osTag.textContent = "COPLAND OS 21.0 // F" + folio + " // SERIAL: " + chosen.sn;

      const title = card.querySelector(".lain-main-title");
      if (title) title.textContent = chosen.title;
      const subTitle = card.querySelector(".lain-sub-title");
      if (subTitle) subTitle.textContent = chosen.sub;

      const hudTitle = card.querySelector(".hud-title");
      if (hudTitle) hudTitle.textContent = "SCHEMATIC // " + chosen.layer;
      const hudProtocol = card.querySelector(".hud-protocol");
      if (hudProtocol) hudProtocol.textContent = chosen.protocol;
      const svgContainer = card.querySelector(".lain-svg-inner");
      if (svgContainer) svgContainer.innerHTML = chosen.svg;
      const hudChip = card.querySelector(".hud-chip");
      if (hudChip) hudChip.textContent = "CHIP: " + chosen.chip;

      const kanjiEl = card.querySelector(".lain-kanji");
      if (kanjiEl) kanjiEl.textContent = chosen.kanji;
      const quoteEl = card.querySelector(".lain-quote-text");
      if (quoteEl) quoteEl.textContent = chosen.quote;

      const specCells = card.querySelectorAll(".specs-grid .spec-cell .spec-v");
      if (specCells.length >= 4) {
        specCells[0].textContent = chosen.protocol;
        specCells[1].textContent = chosen.chip;
        specCells[2].textContent = chosen.spec1;
        specCells[3].textContent = chosen.spec2;
      }

      card.setAttribute("data-current-idx", idx);
      renderBackQr();
    }

    window.onload = function() {
      function proceedWithPrint() {
        if (${Boolean(autoPrint)}) {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
              setTimeout(() => { window.print(); }, 500);
            });
          } else {
            setTimeout(() => { window.print(); }, 800);
          }
        }
      }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.onload = function() {
        renderBackQr();
        proceedWithPrint();
      };
      s.onerror = function() {
        renderBackQr();
        proceedWithPrint();
      };
      document.head.appendChild(s);
    };
  <\/script>
</body>
</html>`;
  }

}
