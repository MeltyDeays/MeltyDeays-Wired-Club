/**
 * Vista / Subcontrolador: Modal de Emisión de Factura Digital Individual (1 Página)
 */
import { InvoiceTemplateService } from "../services/InvoiceTemplateService.js";
import { FirestoreService } from "../services/FirestoreService.js";

let vm = null;
let showToast = () => {};
let closeModal = (modalId) => { const el = document.getElementById(modalId); if (el) el.style.display = "none"; };
let getSelectedPaperDimensions = () => ({ name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' });
let renderTokensTable = () => {};

export function initAdminInvoiceModalView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.getSelectedPaperDimensions) getSelectedPaperDimensions = deps.getSelectedPaperDimensions;
    if (deps.renderTokensTable) renderTokensTable = deps.renderTokensTable;
  }
}

let currentSingleInvoiceTokenCode = null;

function openSingleDigitalInvoiceModal(targetTokenCode = null, forceEdit = false) {
  const modal = document.getElementById("modal-single-digital-invoice");
  if (!modal) return;

  currentSingleInvoiceTokenCode = targetTokenCode;

  const catalogSelect = document.getElementById("s-inv-catalog-preset-select");
  if (catalogSelect && vm && vm.catalog) {
    catalogSelect.innerHTML = '<option value="">⚡ + Cargar desde Catálogo...</option>';
    vm.catalog.forEach(p => {
      const priceText = p.rewardType === "PARTIAL_DISCOUNT"
        ? `$${(p.priceUsd || 0).toFixed(2)} USD`
        : `${p.pointsCost || 0} WP`;
      catalogSelect.innerHTML += `<option value="${p.id}">${p.title} (${priceText})</option>`;
    });
  }

  const today = new Date();
  const dateInput = document.getElementById("s-inv-date");
  if (dateInput) dateInput.value = today.toISOString().split("T")[0];
  const timeInput = document.getElementById("s-inv-time");
  if (timeInput) timeInput.value = today.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });

  const datePreview = document.getElementById("s-inv-date-preview");
  if (datePreview) {
    const dVal = (dateInput ? dateInput.value : today.toISOString().split("T")[0]);
    const parts = dVal.split("-");
    datePreview.textContent = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dVal;
  }
  const timePreview = document.getElementById("s-inv-time-preview");
  if (timePreview) timePreview.textContent = timeInput ? timeInput.value : today.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });

  const token = targetTokenCode ? (vm.tokens || []).find(t => t.tokenCode === targetTokenCode) : null;
  const inv = token && token.invoiceData ? token.invoiceData : null;

  if (token) {
    const folioEl = document.getElementById("s-inv-folio");
    if (folioEl) folioEl.value = token.invoiceFolio;
    const pinEl = document.getElementById("s-inv-pin-val");
    if (pinEl) pinEl.value = token.securityPin || Math.floor(1000 + Math.random() * 9000).toString();
    const ptsEl = document.getElementById("s-inv-points-val");
    if (ptsEl) ptsEl.value = token.pointsValue || 0;
    const chk = document.getElementById("s-inv-enable-points");
    if (chk) chk.checked = token.pointsValue > 0;
    toggleSingleInvoicePointsFields(token.pointsValue > 0);

    if (inv) {
      const nameEl = document.getElementById("s-inv-client-name");
      if (nameEl) nameEl.value = inv.clientName || "";
      const phoneEl = document.getElementById("s-inv-client-phone");
      if (phoneEl) phoneEl.value = inv.clientPhone || "";
      const currEl = document.getElementById("s-inv-currency");
      if (currEl) { currEl.value = inv.currency || "USD"; updateSingleInvoiceCurrency(); }
      const pmEl = document.getElementById("s-inv-payment-method");
      if (pmEl) pmEl.value = inv.paymentMethod || "Efectivo";
      if (inv.date && dateInput) {
        dateInput.value = inv.date;
        if (datePreview) {
          const parts = inv.date.split("-");
          datePreview.textContent = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : inv.date;
        }
      }
      if (inv.time && timeInput) {
        timeInput.value = inv.time;
        if (timePreview) timePreview.textContent = inv.time;
      }
      const discEl = document.getElementById("s-inv-discount-input");
      if (discEl) discEl.value = (inv.discount || 0).toFixed(2);
      const wEl = document.getElementById("s-inv-warranty-text");
      if (wEl) wEl.value = inv.warrantyText || "30 DÍAS CALENDARIO (DEFECTOS DE FÁBRICA)";
      const nEl = document.getElementById("s-inv-notes-text");
      if (nEl) nEl.value = inv.notes || "";
      const ldEl = document.getElementById("s-inv-lain-design");
      if (ldEl && inv.selectedLainDesignIdx !== undefined) ldEl.value = String(inv.selectedLainDesignIdx);

      const tbody = document.getElementById("s-inv-items-table-body");
      if (tbody) {
        tbody.innerHTML = "";
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(it => addSingleInvoiceItemRow(it.cant || 1, it.desc || "", it.price || 0));
        } else {
          addSingleInvoiceItemRow(1, "", 0);
        }
      }
    } else {
      const tbody = document.getElementById("s-inv-items-table-body");
      if (tbody) { tbody.innerHTML = ""; addSingleInvoiceItemRow(1, "", 0); }
    }
  } else {
    refreshSingleInvoiceFolio();
    regenerateSingleInvoicePin();
    const nameEl = document.getElementById("s-inv-client-name");
    if (nameEl) nameEl.value = "";
    const phoneEl = document.getElementById("s-inv-client-phone");
    if (phoneEl) phoneEl.value = "";
    const discEl = document.getElementById("s-inv-discount-input");
    if (discEl) discEl.value = "0.00";
    const ptsEl = document.getElementById("s-inv-points-val");
    if (ptsEl) ptsEl.value = "0";
    const chk = document.getElementById("s-inv-enable-points");
    if (chk) chk.checked = true;
    toggleSingleInvoicePointsFields(true);
    const tbody = document.getElementById("s-inv-items-table-body");
    if (tbody) { tbody.innerHTML = ""; addSingleInvoiceItemRow(1, "", 0); }
  }

  calcSingleInvoiceTotals();
  modal.style.display = "flex";
}

function refreshSingleInvoiceFolio() {
  const folioEl = document.getElementById("s-inv-folio");
  if (folioEl && vm) {
    const nextFolio = vm.getNextAvailableFolio();
    folioEl.value = String(nextFolio).padStart(4, "0");
  }
}

function updateSingleInvoiceCurrency() {
  const curr = document.getElementById("s-inv-currency")?.value || "USD";
  const sym = curr === "NIO" ? "C$" : "$";
  document.querySelectorAll(".s-inv-curr-label").forEach(el => {
    el.textContent = sym;
  });
  calcSingleInvoiceTotals();
}

function addSingleInvoiceItemRow(cant = 1, desc = "", price = 0) {
  const tbody = document.getElementById("s-inv-items-table-body");
  if (!tbody) return;

  const row = document.createElement("tr");
  row.className = "copland-item-row";
  row.style.borderBottom = "1px solid #e2e8f0";
  row.innerHTML = `
    <td class="copland-td-cant" style="text-align: center;">
      <input type="number" class="form-input s-row-cant" value="${cant}" min="1" step="1"
             oninput="calcSingleInvoiceTotals()">
    </td>
    <td class="copland-td-desc">
      <input type="text" class="form-input s-row-desc" value="${desc.replace(/"/g, '&quot;')}" placeholder="Descripción del artículo..."
             autocomplete="off">
    </td>
    <td class="copland-td-price" style="text-align: right;">
      <input type="number" class="form-input s-row-price" value="${Number(price).toFixed(2)}" min="0" step="0.5"
             oninput="calcSingleInvoiceTotals()">
    </td>
    <td class="copland-td-total" style="text-align: right;">
      <strong class="s-row-total" style="font-family: var(--font-mono); font-weight: 900; color: #0f172a;">$ 0.00</strong>
    </td>
    <td class="copland-td-del" style="text-align: center;">
      <button type="button" class="copland-btn-del-row" onclick="removeSingleInvoiceItemRow(this)" title="Quitar fila">✕</button>
    </td>
  `;
  tbody.appendChild(row);
  calcSingleInvoiceTotals();
}

function removeSingleInvoiceItemRow(btn) {
  const row = btn.closest("tr");
  if (row) row.remove();
  const tbody = document.getElementById("s-inv-items-table-body");
  if (tbody && tbody.children.length === 0) {
    addSingleInvoiceItemRow(1, "", 0);
  } else {
    calcSingleInvoiceTotals();
  }
}

function addCatalogProductToSingleInvoice(rewardId) {
  if (!rewardId || !vm || !vm.catalog) return;
  const prod = vm.catalog.find(p => p.id === rewardId);
  if (!prod) return;

  const curr = document.getElementById("s-inv-currency")?.value || "USD";
  let unitPrice = 0;
  if (prod.rewardType === "PARTIAL_DISCOUNT" && prod.priceUsd) {
    unitPrice = curr === "NIO" ? Number(prod.priceUsd * 37.0) : Number(prod.priceUsd);
  } else if (prod.pointsCost) {
    unitPrice = curr === "NIO" ? Number((prod.pointsCost / 10) * 37.0) : Number(prod.pointsCost / 10);
  }

  // Si la primera fila está vacía, reemplazarla
  const tbody = document.getElementById("s-inv-items-table-body");
  if (tbody && tbody.children.length === 1) {
    const firstDesc = tbody.children[0].querySelector(".s-row-desc")?.value.trim();
    const firstPrice = parseFloat(tbody.children[0].querySelector(".s-row-price")?.value) || 0;
    if (!firstDesc && firstPrice === 0) {
      tbody.innerHTML = "";
    }
  }

  addSingleInvoiceItemRow(1, prod.title + (prod.description ? " · " + prod.description : ""), unitPrice);
  showToast(`✓ Agregado: ${prod.title}`, "info");
}

function calcSingleInvoiceTotals() {
  const curr = document.getElementById("s-inv-currency")?.value || "USD";
  const sym = curr === "NIO" ? "C$" : "$";
  const rateNio = 37.0;

  let subtotal = 0;
  const tbody = document.getElementById("s-inv-items-table-body");
  const rows = tbody ? Array.from(tbody.children || []).filter(el => (el.tagName || '').toUpperCase() === 'TR') : [];
  rows.forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant, .inv-item-qty, .item-qty")?.value) || 1;
    const price = parseFloat(tr.querySelector(".s-row-price, .inv-item-price, .item-price")?.value) || 0;
    const rowTot = cant * price;
    subtotal += rowTot;
    const totEl = tr.querySelector(".s-row-total, .inv-item-total");
    if (totEl) totEl.textContent = `${sym} ${rowTot.toFixed(2)}`;
  });

  const discInput = document.getElementById("s-inv-discount-input");
  const discount = parseFloat(discInput?.value) || 0;
  const total = Math.max(0, subtotal - discount);

  const subValEl = document.getElementById("s-inv-subtotal-val");
  const totValEl = document.getElementById("s-inv-total-val");
  const equivEl = document.getElementById("s-inv-total-equiv");

  if (subValEl) subValEl.textContent = `${sym} ${subtotal.toFixed(2)}`;
  if (totValEl) totValEl.textContent = `${sym} ${total.toFixed(2)}`;

  if (equivEl) {
    if (curr === "USD") {
      equivEl.textContent = `≈ C$ ${(total * rateNio).toFixed(2)} NIO (Tasa 37.0)`;
    } else {
      equivEl.textContent = `≈ $ ${(total / rateNio).toFixed(2)} USD (Tasa 37.0)`;
    }
  }

  // Recalcular puntos sugeridos si está habilitado y el campo está vacío o en 0
  const chkPoints = document.getElementById("s-inv-enable-points");
  const pointsInput = document.getElementById("s-inv-points-val");
  if (chkPoints && chkPoints.checked && pointsInput && (!pointsInput.value || pointsInput.value === "0")) {
    const totalUsd = curr === "USD" ? total : (total / rateNio);
    pointsInput.value = Math.floor(totalUsd * 10);
  }
}

function toggleSingleInvoicePointsFields(enabled) {
  const fields = document.getElementById("s-inv-points-fields");
  if (fields) {
    fields.style.opacity = enabled ? "1" : "0.35";
    fields.style.pointerEvents = enabled ? "auto" : "none";
  }
}

function autoCalculateSingleInvoicePoints() {
  const curr = document.getElementById("s-inv-currency")?.value || "USD";
  const rateNio = 37.0;
  let subtotal = 0;
  const tbody = document.getElementById("s-inv-items-table-body");
  const rows = tbody ? Array.from(tbody.children || []).filter(el => (el.tagName || '').toUpperCase() === 'TR') : [];
  rows.forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant, .inv-item-qty, .item-qty")?.value) || 1;
    const price = parseFloat(tr.querySelector(".s-row-price, .inv-item-price, .item-price")?.value) || 0;
    subtotal += (cant * price);
  });
  const discount = parseFloat(document.getElementById("s-inv-discount-input")?.value) || 0;
  const total = Math.max(0, subtotal - discount);
  const totalUsd = curr === "USD" ? total : (total / rateNio);
  const pts = Math.floor(totalUsd * 10);
  const pInput = document.getElementById("s-inv-points-val");
  if (pInput) pInput.value = pts;
  showToast(`⚡ Calculados ${pts} WP (Regla 1 USD = 10 WP)`, "info");
}

function regenerateSingleInvoicePin() {
  const pinInput = document.getElementById("s-inv-pin-val");
  if (pinInput) {
    pinInput.value = Math.floor(1000 + Math.random() * 9000).toString();
  }
}

async function submitSingleDigitalInvoice(action = 'print') {
  const folioEl = document.getElementById("s-inv-folio");
  let folio = folioEl ? folioEl.value.trim() : "";
  if (!folio) {
    folio = String(vm.getNextAvailableFolio()).padStart(4, "0");
  }

  const clientName = document.getElementById("s-inv-client-name")?.value.trim() || "Consumidor Final";
  const clientPhone = document.getElementById("s-inv-client-phone")?.value.trim() || "";
  const paymentMethod = document.getElementById("s-inv-payment-method")?.value || "Efectivo";
  const currency = document.getElementById("s-inv-currency")?.value || "USD";
  const dateStr = document.getElementById("s-inv-date")?.value || new Date().toISOString().split("T")[0];
  const timeStr = document.getElementById("s-inv-time")?.value || new Date().toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });

  const items = [];
  const tbody = document.getElementById("s-inv-items-table-body");
  const rows = tbody ? Array.from(tbody.children || []).filter(el => (el.tagName || '').toUpperCase() === 'TR') : [];
  rows.forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant, .inv-item-qty, .item-qty")?.value) || 1;
    const desc = (tr.querySelector(".s-row-desc, .inv-item-desc, .item-desc")?.value || "").trim();
    const price = parseFloat(tr.querySelector(".s-row-price, .inv-item-price, .item-price")?.value) || 0;
    if (desc || price > 0) {
      items.push({
        cant,
        desc: desc || "Artículo General",
        price,
        total: cant * price
      });
    }
  });

  if (items.length === 0) {
    showToast("⚠️ Ingresa al menos 1 artículo con descripción o precio.", "error");
    return;
  }

  const subtotal = items.reduce((acc, it) => acc + it.total, 0);
  const discount = parseFloat(document.getElementById("s-inv-discount-input")?.value) || 0;
  const total = Math.max(0, subtotal - discount);

  const pointsCheckEl = document.getElementById("s-inv-enable-points");
  const pointsEnabled = pointsCheckEl ? pointsCheckEl.checked : true;
  const pointsVal = pointsEnabled ? (parseInt(document.getElementById("s-inv-points-val")?.value, 10) || 0) : 0;
  const pin = document.getElementById("s-inv-pin-val")?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();
  const warrantyText = document.getElementById("s-inv-warranty-text")?.value.trim() || "30 DÍAS CALENDARIO (DEFECTOS DE FÁBRICA)";
  const notesText = document.getElementById("s-inv-notes-text")?.value.trim() || "";
  const selectedLainDesignIdx = parseInt(document.getElementById("s-inv-lain-design")?.value, 10) || 0;

  // ========================================================
  // PREVISUALIZACIÓN AISLADA: NO TOCA BD, NO GUARDA, NO CONSUME FOLIO
  // ========================================================
  if (action === "preview") {
    showToast("Generando previsualización sin guardar...", "info");
    const mockPayload = {
      folio,
      date: dateStr,
      time: timeStr,
      clientName,
      clientPhone,
      paymentMethod,
      currency,
      items,
      subtotal,
      discount,
      total,
      pointsValue: pointsVal,
      securityPin: pin,
      warrantyText,
      notes: notesText,
      selectedLainDesignIdx,
      tokenCode: currentSingleInvoiceTokenCode || null
    };

    const printDims = getSelectedPaperDimensions("preview");
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(mockPayload, printDims, false, selectedLainDesignIdx);

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(docHtml);
      printWin.document.close();
      showToast("👁️ Previsualización abierta en nueva ventana (NO se guardó en BD ni se consumió folio).", "info");
    } else {
      showToast("⚠️ Habilita ventanas emergentes para ver la previsualización.", "error");
    }
    return;
  }

  // ========================================================
  // PERSISTENCIA EN BD: SOLO AL IMPRIMIR, ENVIAR WA O DESCARGAR
  // ========================================================
  showToast("Guardando factura en base de datos...", "info");

  try {
    const result = await vm.generateSingleDigitalInvoice({
      folio,
      date: dateStr,
      time: timeStr,
      clientName,
      clientPhone,
      paymentMethod,
      currency,
      items,
      subtotal,
      discount,
      total,
      pointsValue: pointsVal,
      securityPin: pin,
      warrantyText,
      notes: notesText,
      targetTokenCode: currentSingleInvoiceTokenCode
    });

    closeModal("modal-single-digital-invoice");

    if (result && result.invoicePayload) {
      result.invoicePayload.selectedLainDesignIdx = selectedLainDesignIdx;
    }

    const printDims = getSelectedPaperDimensions("preview");
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(result.invoicePayload, printDims, action === 'print', selectedLainDesignIdx);

    if (action === "download") {
      const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `factura_meltydeays_${result.invoicePayload.folio}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`📥 Factura #MD-2026-${result.invoicePayload.folio} descargada y guardada en BD.`, "success");
    }

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(docHtml);
      printWin.document.close();
    } else if (action !== "download") {
      showToast("⚠️ Habilita ventanas emergentes en tu navegador para ver la factura.", "error");
    }

    if (action === "whatsapp") {
      let rawPhone = FirestoreService.normalizePhone(clientPhone);
      if (rawPhone.length === 8) rawPhone = '505' + rawPhone;
      const tokCode = (result && result.token && (result.token.tokenCode || result.token.token_code)) ||
                      (result && result.invoicePayload && (result.invoicePayload.tokenCode || result.invoicePayload.token_code)) || "";
      const resFolio = (result && result.invoicePayload && result.invoicePayload.folio) || folio || "";
      const resPin = (result && result.token && (result.token.securityPin || result.token.security_pin)) ||
                     (result && result.invoicePayload && (result.invoicePayload.securityPin || result.invoicePayload.security_pin)) || pin || "";
      const isValidClaim = Boolean(
        tokCode &&
        typeof tokCode === "string" &&
        /^WP-2026-F/i.test(tokCode.trim()) &&
        !tokCode.includes("DIGITAL") &&
        !tokCode.includes("BLANK")
      );
      let claimUrl = "";
      if (isValidClaim) {
        claimUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + encodeURIComponent(tokCode.trim());
        if (resFolio) claimUrl += "&folio=" + encodeURIComponent(resFolio);
        if (resPin && resPin !== "----") claimUrl += "&pin=" + encodeURIComponent(resPin);
      }
      const textMsg = encodeURIComponent(
        `¡Hola ${clientName}! 👋 Gracias por tu compra en MeltyDeays STORE.\n\n` +
        `🧾 Factura Electrónica: #MD-2026-${resFolio}\n` +
        `💰 Total Facturado: ${currency === "NIO" ? "C$" : "$"} ${total.toFixed(2)}\n` +
        (pointsVal > 0 && claimUrl ? `⚡ Puntos Wired Points acreditados: +${pointsVal} WP\n📲 Reclama tus puntos aquí: ${claimUrl}\n` : "") +
        `🛡️ Garantía oficial MeltyDeays: ${warrantyText}\n\n` +
        `¡Agradecemos tu preferencia!`
      );
      window.open("https://api.whatsapp.com/send?phone=" + (rawPhone || "50558438412") + "&text=" + textMsg, "_blank");
    }

    renderTokensTable(vm.tokens);
    const statTokens = document.getElementById("stat-tokens-count");
    if (statTokens) statTokens.textContent = vm.tokens.length;

    showToast(`✓ Factura #MD-2026-${result.invoicePayload.folio} guardada exitosamente en BD.`, "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export {
  openSingleDigitalInvoiceModal,
  refreshSingleInvoiceFolio,
  updateSingleInvoiceCurrency,
  addSingleInvoiceItemRow,
  removeSingleInvoiceItemRow,
  addCatalogProductToSingleInvoice,
  calcSingleInvoiceTotals,
  toggleSingleInvoicePointsFields,
  autoCalculateSingleInvoicePoints,
  regenerateSingleInvoicePin,
  submitSingleDigitalInvoice
};
