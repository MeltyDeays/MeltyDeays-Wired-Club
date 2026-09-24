/* Controller: Panel de Administración (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";
import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js";

const vm = new AdminViewModel();

let currentSingleTokenUrl = "";
let currentSheetTokens = [];

export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML = `<span style="font-weight:900; font-size:1rem;">•</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


function setPosFeedback(msg, type = "error") {
  const fb = document.getElementById("pos-feedback");
  if (!fb) {
    showToast(msg, type);
    return;
  }
  fb.className = "pos-feedback-banner " + type;
  fb.innerHTML = msg;
  fb.style.display = "block";
}

function clearPosFeedback() {
  const fb = document.getElementById("pos-feedback");
  if (fb) fb.style.display = "none";
}

function clearPosScanner() {
  const input = document.getElementById("input-scan-voucher");
  if (input) {
    input.value = "";
    input.focus();
  }
  clearPosFeedback();
}

function closePosResult() {
  const resultBox = document.getElementById("scan-result-box");
  if (resultBox) resultBox.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  vm.subscribe(renderAdmin);

  window.submitAdminPin = submitAdminPin;
  window.clearPosFeedback = clearPosFeedback;
  window.clearPosScanner = clearPosScanner;
  window.closePosResult = closePosResult;
  window.setPosFeedback = setPosFeedback;
  window.logoutAdmin = logoutAdmin;
  window.verifyVoucherAdmin = verifyVoucherAdmin;
  window.confirmDeliveryAdmin = confirmDeliveryAdmin;
  window.submitAssignPoints = submitAssignPoints;
  window.setQuickPoints = setQuickPoints;
  window.promptAssignPoints = promptAssignPoints;
  window.generateBatchAdmin = generateBatchAdmin;
  window.openNewProductModal = openNewProductModal;
  window.saveProductAdmin = saveProductAdmin;
  window.removeProductAdmin = removeProductAdmin;
  window.closeModal = closeModal;

  window.toggleCustomPaperInputs = toggleCustomPaperInputs;
  window.openPrintSheetModal = openPrintSheetModal;
  window.updatePreviewSheetDimensions = updatePreviewSheetDimensions;
  window.triggerNativeSheetPrint = triggerNativeSheetPrint;
  window.viewSingleTokenQr = viewSingleTokenQr;
  window.copySingleQrUrl = copySingleQrUrl;
  window.testSingleQrUrl = testSingleQrUrl;

  vm.init();
});

function renderAdmin(model) {
  const lockEl = document.getElementById("admin-auth-lock");
  const mainEl = document.getElementById("admin-main-panel");

  if (!model.isAuthenticated) {
    if (lockEl) lockEl.style.display = "flex";
    if (mainEl) mainEl.style.display = "none";
    const pinInput = document.getElementById("input-admin-pin");
    if (pinInput) setTimeout(() => pinInput.focus(), 100);
    return;
  }

  if (lockEl) lockEl.style.display = "none";
  if (mainEl) mainEl.style.display = "block";

  let totalCirc = 0;
  model.tokens.forEach(t => { if (t.isClaimed()) totalCirc += t.pointsValue; });

  const pendingVouchers = model.vouchers.filter(v => !v.isDelivered()).length;

  document.getElementById("stat-points-circ").textContent = totalCirc.toLocaleString();
  document.getElementById("stat-vouchers-pending").textContent = pendingVouchers;
  document.getElementById("stat-catalog-count").textContent = model.catalog.length;
  document.getElementById("stat-tokens-count").textContent = model.tokens.length;

  renderCatalogTable(model.catalog);
  renderTokensTable(model.tokens);
}

function renderCatalogTable(catalog) {
  const tbody = document.getElementById("catalog-table-body");
  if (!tbody) return;

  if (catalog.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">
          El catálogo está vacío. Haz clic en <strong>"+ Agregar Producto"</strong> para registrar el primer artículo.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = catalog.map(p => `
    <tr>
      <td>
        <strong style="color:var(--dark);">${p.title}</strong>
        <div style="font-size:0.75rem; color:var(--gray-500); font-family:var(--font-mono);">${p.id}</div>
      </td>
      <td><span class="badge-navi">${p.pointsCost.toLocaleString()} WP</span></td>
      <td><strong>${p.stock}</strong> un.</td>
      <td style="font-size:0.8rem; color:var(--gray-700);">${p.description || "-"}</td>
      <td style="text-align: right;">
        <button class="btn-outline-sm" style="color:var(--accent); border-color:#fca5a5; font-size:0.75rem; padding: 3px 8px; border-radius:3px; cursor:pointer;" onclick="removeProductAdmin('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function renderTokensTable(tokens) {
  const tbody = document.getElementById("tokens-table-body");
  if (!tbody) return;

  if (tokens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🖨️</div>
          <strong>No hay lotes de facturación activos.</strong>
          <div style="font-size: 0.8rem; margin-top: 4px;">Usa el formulario superior para generar tu primer pliego de 4 facturas sincronizadas.</div>
        </td>
      </tr>
    `;
    return;
  }

  currentSheetTokens = tokens.slice(0, 4);

  tbody.innerHTML = tokens.slice(0, 25).map(t => {
    const isClaimed = t.isClaimed();
    const isPending = t.isPendingAssignment();
    const isActive = t.isActive();

    let pointsBadge = "";
    if (isPending) {
      pointsBadge = `<span class="badge-navi" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a;">⏳ Sin Asignar</span>`;
    } else {
      pointsBadge = `<span class="badge-navi" style="background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">${t.pointsValue} WP</span>`;
    }

    let statusBadge = "";
    if (isClaimed) {
      statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border: 1px solid #fecdd3;">✔ RECLAMADO</span>`;
    } else if (isActive) {
      statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border: 1px solid #a7f3d0;">● ACTIVO</span>`;
    } else {
      statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border: 1px solid #fcd34d;">⏳ PENDIENTE</span>`;
    }

    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.8rem;"><strong>${t.tokenCode}</strong></td>
        <td><strong>Factura #MD-2026-${t.invoiceFolio}</strong></td>
        <td>${pointsBadge}</td>
        <td style="font-family:var(--font-mono); letter-spacing: 2px;">${t.securityPin || "••••"}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${!isClaimed ? `
            <button class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 4px;" onclick="promptAssignPoints('${t.tokenCode}', '${t.invoiceFolio}')">
              ⚡ Cargar Puntos
            </button>
          ` : ""}
          <button class="btn-secondary" style="padding: 3px 9px; font-size: 0.72rem;" onclick="viewSingleTokenQr('${t.tokenCode}', '${t.invoiceFolio}', ${t.pointsValue}, '${t.securityPin}')">
            🔍 Ver QR
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function submitAdminPin() {
  const input = document.getElementById("input-admin-pin");
  const pin = input ? input.value : "";
  const feedback = document.getElementById("lock-feedback");
  const success = vm.unlock(pin);
  if (!success) {
    if (feedback) {
      feedback.style.display = "block";
      feedback.className = "pos-feedback-banner error";
      feedback.innerHTML = "<strong>Acceso denegado:</strong> El PIN ingresado es incorrecto.";
    } else {
      showToast("❌ PIN Incorrecto. Acceso denegado.", "error");
    }
    if (input) {
      input.value = "";
      input.focus();
    }
  } else {
    if (feedback) feedback.style.display = "none";
  }
}

function logoutAdmin() {
  vm.lock();
}

async function verifyVoucherAdmin() {
  const input = document.getElementById("input-scan-voucher");
  let rawCode = (input ? input.value : "").trim();
  const group = document.getElementById("pos-input-group-wrapper");

  if (!rawCode) {
    setPosFeedback("⚠️ Ingresa o escanea el código del vale o factura (ej. CANJE-4891 o WP-2026-...)", "info");
    if (group) {
      group.classList.add("shake-input");
      setTimeout(() => group.classList.remove("shake-input"), 500);
    }
    if (input) input.focus();
    return;
  }

  // Si proviene de escaneo con cámara o pistola de URL completa (?claim=...)
  if (rawCode.includes("claim=")) {
    rawCode = rawCode.split("claim=")[1].split("&")[0];
  }
  const code = rawCode.trim().toUpperCase();

  const voucherBox = document.getElementById("scan-result-box");
  const invoiceBox = document.getElementById("scan-invoice-box");

  // CASO 1: DETECCIÓN DE FACTURA FÍSICA CON QR
  if (code.startsWith("WP-") || code.includes("-F")) {
    const token = await vm.verifyToken(code);
    if (!token) {
      setPosFeedback("❌ La factura con token [" + code + "] no existe en el sistema.", "error");
      if (group) {
        group.classList.add("shake-input");
        setTimeout(() => group.classList.remove("shake-input"), 500);
      }
      if (invoiceBox) invoiceBox.style.display = "none";
      if (voucherBox) voucherBox.style.display = "none";
      return;
    }

    clearPosFeedback();
    if (voucherBox) voucherBox.style.display = "none";

    if (invoiceBox) {
      invoiceBox.style.display = "block";
      document.getElementById("scan-inv-code").textContent = token.tokenCode;
      document.getElementById("scan-inv-folio").textContent = "#MD-2026-" + token.invoiceFolio;
      document.getElementById("scan-inv-pin").textContent = token.securityPin || "••••";

      const statusEl = document.getElementById("scan-inv-status");
      const pointsCurrEl = document.getElementById("scan-inv-points-current");
      const assignArea = document.getElementById("scan-inv-assign-area");
      const pointsInput = document.getElementById("input-assign-points");
      const btnSave = document.getElementById("btn-save-inv-points");

      if (token.isClaimed()) {
        if (statusEl) statusEl.innerHTML = "<span style='color:var(--accent); font-weight:900;'>❌ YA RECLAMADO POR EL CLIENTE</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = token.pointsValue + " WP (CANJEADO)";
        if (assignArea) assignArea.style.display = "none";
      } else if (token.isActive()) {
        if (statusEl) statusEl.innerHTML = "<span style='color:#059669; font-weight:900;'>✓ ACTIVO (" + token.pointsValue + " WP)</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = token.pointsValue + " WP (Listo para entrega)";
        if (assignArea) assignArea.style.display = "block";
        if (pointsInput) pointsInput.value = token.pointsValue;
        if (btnSave) btnSave.textContent = "⚡ Modificar Puntos (" + token.pointsValue + " WP)";
      } else {
        // PENDIENTE DE ASIGNACIÓN EN CAJA
        if (statusEl) statusEl.innerHTML = "<span style='color:#d97706; font-weight:900;'>⏳ PENDIENTE DE ASIGNACIÓN</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = "0 WP (Sin Asignar)";
        if (assignArea) assignArea.style.display = "block";
        if (pointsInput) {
          pointsInput.value = "100";
          setTimeout(() => pointsInput.focus(), 100);
        }
        if (btnSave) btnSave.textContent = "⚡ Guardar Puntos y Activar Factura";
      }
    }
    return;
  }

  // CASO 2: DETECCIÓN DE VALE DE CANJE (CANJE-XXXX)
  const voucher = await vm.verifyVoucher(code);

  if (!voucher) {
    setPosFeedback("❌ El vale [" + code + "] no existe o ya fue purgado del sistema.", "error");
    if (group) {
      group.classList.add("shake-input");
      setTimeout(() => group.classList.remove("shake-input"), 500);
    }
    if (voucherBox) voucherBox.style.display = "none";
    if (invoiceBox) invoiceBox.style.display = "none";
    return;
  }

  clearPosFeedback();
  if (invoiceBox) invoiceBox.style.display = "none";

  if (voucherBox) {
    voucherBox.style.display = "block";
    document.getElementById("scan-res-code").textContent = voucher.voucherCode;
    document.getElementById("scan-res-product").textContent = voucher.rewardTitle;
    document.getElementById("scan-res-client").textContent = voucher.userName || "Socio Wired";
    document.getElementById("scan-res-points").textContent = voucher.pointsSpent + " WP";
    
    const statusEl = document.getElementById("scan-res-status");
    const btnDeliver = document.getElementById("btn-confirm-delivery");

    if (voucher.isDelivered()) {
      statusEl.innerHTML = "<span style='color:var(--accent); font-weight:900;'>❌ YA FUE ENTREGADO el " + new Date(voucher.deliveredAt).toLocaleString() + "</span>";
      if (btnDeliver) btnDeliver.style.display = "none";
    } else {
      statusEl.innerHTML = "<span style='color:#059669; font-weight:900;'>✓ VÁLIDO PARA ENTREGA</span>";
      if (btnDeliver) btnDeliver.style.display = "inline-block";
    }
  }
}

async function confirmDeliveryAdmin() {
  const code = document.getElementById("scan-res-code").textContent;
  try {
    await vm.deliverVoucher(code);
    showToast("¡Entrega Confirmada! Vale marcado como ENTREGADO.", "success");
    document.getElementById("scan-result-box").style.display = "none";
    document.getElementById("input-scan-voucher").value = "";
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

async function submitAssignPoints() {
  const tokenCode = document.getElementById("scan-inv-code")?.textContent?.trim();
  const pointsInput = document.getElementById("input-assign-points");
  const points = Number(pointsInput?.value);

  if (!tokenCode || !tokenCode.startsWith("WP-")) {
    showToast("❌ No hay ninguna factura seleccionada para asignar puntos.", "error");
    return;
  }
  if (!points || isNaN(points) || points <= 0) {
    showToast("⚠️ Ingresa una cantidad válida de puntos mayor a 0 (ej. 100).", "error");
    if (pointsInput) pointsInput.focus();
    return;
  }

  try {
    const updated = await vm.assignTokenPoints(tokenCode, points, "admin-caja");
    showToast("⚡ ¡Puntos asignados! Factura #" + updated.invoiceFolio + " activada con " + points + " WP.", "success");

    const statusEl = document.getElementById("scan-inv-status");
    const pointsCurrEl = document.getElementById("scan-inv-points-current");
    const btnSave = document.getElementById("btn-save-inv-points");
    if (statusEl) statusEl.innerHTML = "<span style='color:#059669; font-weight:900;'>✓ FACTURA ACTIVADA (" + points + " WP)</span>";
    if (pointsCurrEl) pointsCurrEl.textContent = points + " WP (LISTA PARA ENTREGAR)";
    if (btnSave) btnSave.textContent = "✓ Factura Lista para Entrega";

    const scanInput = document.getElementById("input-scan-voucher");
    if (scanInput) {
      scanInput.value = "";
      scanInput.focus();
    }
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function setQuickPoints(val) {
  const input = document.getElementById("input-assign-points");
  if (input) {
    input.value = val;
    input.focus();
  }
}

function promptAssignPoints(tokenCode, folio) {
  const input = document.getElementById("input-scan-voucher");
  if (input) {
    input.value = tokenCode;
    window.scrollTo({ top: 0, behavior: "smooth" });
    verifyVoucherAdmin();
  }
}

async function generateBatchAdmin() {
  const folio = document.getElementById("lot-start-folio")?.value || 104;
  const count = document.getElementById("lot-count")?.value || 4;

  try {
    const res = await vm.generateLot(folio, count, 0);
    currentSheetTokens = res.tokens;
    showToast("¡Lote generado! " + res.tokens.length + " facturas con QR listos para asignar en mostrador.", "success");
    openPrintSheetModal();
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function openNewProductModal() {
  const modal = document.getElementById("modal-new-product");
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

async function saveProductAdmin() {
  const title = document.getElementById("prod-title").value;
  const pointsCost = document.getElementById("prod-cost").value;
  const stock = document.getElementById("prod-stock").value;
  const imageUrl = document.getElementById("prod-img").value;
  const description = document.getElementById("prod-desc").value;

  try {
    await vm.addReward({ title, pointsCost, stock, imageUrl, description });
    closeModal("modal-new-product");
    document.getElementById("prod-title").value = "";
    document.getElementById("prod-cost").value = "";
    document.getElementById("prod-stock").value = "";
    document.getElementById("prod-img").value = "";
    document.getElementById("prod-desc").value = "";
    showToast("Producto registrado con éxito en el catálogo.", "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

async function removeProductAdmin(id) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    await vm.deleteReward(id);
    showToast("Producto eliminado del catálogo", "info");
  }
}

function toggleCustomPaperInputs() {
  const select = document.getElementById("lot-paper-size");
  const customBox = document.getElementById("custom-paper-fields");
  if (customBox) {
    customBox.style.display = select.value === "custom" ? "flex" : "none";
  }
}

function getSelectedPaperDimensions(source = "preview") {
  const selectId = source === "preview" ? "preview-paper-size" : "lot-paper-size";
  const select = document.getElementById(selectId);
  const sizeType = select ? select.value : "letter";

  if (sizeType === "letter") {
    return { name: "Carta (Letter)", widthMm: 215.9, heightMm: 279.4, cssSize: "letter portrait" };
  } else if (sizeType === "a4") {
    return { name: "A4", widthMm: 210, heightMm: 297, cssSize: "A4 portrait" };
  } else if (sizeType === "legal") {
    return { name: "Oficio (Legal)", widthMm: 215.9, heightMm: 355.6, cssSize: "legal portrait" };
  } else {
    const wId = source === "preview" ? "preview-custom-w" : "custom-paper-width";
    const hId = source === "preview" ? "preview-custom-h" : "custom-paper-height";
    const w = Number(document.getElementById(wId)?.value) || 216;
    const h = Number(document.getElementById(hId)?.value) || 279;
    return { name: "Personalizado (" + w + "x" + h + " mm)", widthMm: w, heightMm: h, cssSize: w + "mm " + h + "mm" };
  }
}

function updatePreviewSheetDimensions() {
  const dims = getSelectedPaperDimensions("preview");
  const select = document.getElementById("preview-paper-size");
  const customBox = document.getElementById("preview-custom-dims");
  const label = document.getElementById("preview-dims-label");

  if (customBox) customBox.style.display = select.value === "custom" ? "flex" : "none";
  if (label) label.textContent = dims.name + ": " + dims.widthMm + " mm × " + dims.heightMm + " mm";

  const sheetEl = document.getElementById("reverso-sheet-container");
  if (sheetEl) {
    const baseW = 580;
    const calcH = Math.round((baseW * dims.heightMm) / dims.widthMm);
    sheetEl.style.width = baseW + "px";
    sheetEl.style.height = calcH + "px";
  }
}

function openPrintSheetModal() {
  if (currentSheetTokens.length === 0 && vm.tokens.length > 0) {
    currentSheetTokens = vm.tokens.slice(0, 4);
  }

  const tokensToRender = currentSheetTokens.length >= 4 
    ? currentSheetTokens.slice(0, 4) 
    : [
        { tokenCode: "WP-2026-F0104-A98B", invoiceFolio: "0104", pointsValue: 0, securityPin: "4891" },
        { tokenCode: "WP-2026-F0105-C34D", invoiceFolio: "0105", pointsValue: 0, securityPin: "7124" },
        { tokenCode: "WP-2026-F0106-E56F", invoiceFolio: "0106", pointsValue: 0, securityPin: "8390" },
        { tokenCode: "WP-2026-F0107-G78H", invoiceFolio: "0107", pointsValue: 0, securityPin: "1923" }
      ];

  const mainPaperSize = document.getElementById("lot-paper-size")?.value || "letter";
  const modalSelect = document.getElementById("preview-paper-size");
  if (modalSelect) modalSelect.value = mainPaperSize;

  updatePreviewSheetDimensions();

  tokensToRender.forEach((tok, idx) => {
    const slot = document.getElementById("card-slot-" + idx);
    if (!slot) return;

    const claimUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + tok.tokenCode;
    const pinStr = tok.securityPin || "••••";
    const folioStr = tok.invoiceFolio || "0104";

    slot.innerHTML = `
      <div class="reverso-head">
        <div class="reverso-brand-title">
          Melty<span>Deays</span> <span style="font-family:var(--font-mono); font-size:0.65rem; background:#0f172a; color:#38bdf8; border:1px solid #334155; padding:1px 5px; border-radius:3px;">WIRED</span>
        </div>
        <div style="font-family:var(--font-mono); font-size:0.68rem; font-weight:800; color:var(--dark);">
          FACTURA #MD-2026-${folioStr}
        </div>
      </div>

      <div class="reverso-body" style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin:0.6rem 0;">
        <div class="reverso-points-box" style="flex:1;">
          <div style="font-family:var(--font-mono); font-size:0.65rem; font-weight:800; color:var(--gray-500); text-transform:uppercase;">RECOMPENSA DIGITAL</div>
          <div style="display:flex; align-items:baseline; gap:3px; margin:4px 0;">
            <span style="font-size:1.3rem; font-weight:900; color:var(--dark);">+</span>
            <span style="display:inline-block; width:44px; height:20px; border:1px dashed #64748b; border-bottom:1.8px solid #0f172a; background:#ffffff; border-radius:3px;" title="Apartado para escribir a lápiz"></span>
            <span style="font-size:1rem; font-weight:900; color:#e11d48;">WP</span>
          </div>
          <div style="font-size:0.68rem; color:var(--gray-700); line-height:1.25; margin-top:3px;">
            Escanea para acreditar tus puntos en tu CyberPass.
          </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; gap:3px; flex-shrink:0;">
          <div class="reverso-qr-box" id="sheet-qr-slot-${idx}"></div>
          <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:900; color:var(--dark); letter-spacing:1px; background:#f1f5f9; padding:1px 5px; border-radius:3px; border:1px solid #cbd5e1;">PIN: ${pinStr}</div>
        </div>
      </div>

      <div class="reverso-foot">
        <div>CÓDIGO: <strong style="color:var(--dark);">${tok.tokenCode}</strong></div>
        <div>PIN: <strong style="color:var(--dark);">${pinStr}</strong></div>
      </div>
    `;

    setTimeout(() => {
      const qrEl = document.getElementById("sheet-qr-slot-" + idx);
      if (qrEl && typeof QRCode !== "undefined") {
        qrEl.innerHTML = "";
        new QRCode(qrEl, {
          text: claimUrl,
          width: 74,
          height: 74,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 50);
  });

  const modal = document.getElementById("modal-print-sheet");
  if (modal) modal.style.display = "flex";
}

function triggerNativeSheetPrint() {
  const dims = getSelectedPaperDimensions("preview");
  const mode = document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToPrint = currentSheetTokens.length > 0 
    ? currentSheetTokens 
    : (vm.tokens.length > 0 ? vm.tokens : [
        { tokenCode: "WP-2026-F0104-A98B", invoiceFolio: "0104", pointsValue: 0, securityPin: "4891" },
        { tokenCode: "WP-2026-F0105-C34D", invoiceFolio: "0105", pointsValue: 0, securityPin: "7124" },
        { tokenCode: "WP-2026-F0106-E56F", invoiceFolio: "0106", pointsValue: 0, securityPin: "8390" },
        { tokenCode: "WP-2026-F0107-G78H", invoiceFolio: "0107", pointsValue: 0, securityPin: "1923" }
      ]);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Por favor habilita las ventanas emergentes en tu navegador para imprimir.", "error");
    return;
  }

  const printDoc = InvoiceTemplateService.generatePrintDocument(tokensToPrint, dims, mode);
  printWindow.document.open();
  printWindow.document.write(printDoc);
  printWindow.document.close();
}


function viewSingleTokenQr(tokenCode, invoiceFolio, pointsValue, securityPin) {
  const modal = document.getElementById("modal-single-qr");
  if (!modal) return;

  currentSingleTokenUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + tokenCode;

  document.getElementById("single-qr-folio").textContent = "Factura #MD-2026-" + invoiceFolio;
  document.getElementById("single-qr-points").textContent = pointsValue > 0 ? pointsValue + " WP" : "Sin Asignar (0 WP)";
  document.getElementById("single-qr-pin").textContent = securityPin || "••••";
  document.getElementById("single-qr-code").textContent = tokenCode;

  const canvas = document.getElementById("single-qr-canvas");
  if (canvas && typeof QRCode !== "undefined") {
    canvas.innerHTML = "";
    new QRCode(canvas, {
      text: currentSingleTokenUrl,
      width: 170,
      height: 170,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  modal.style.display = "flex";
}

function copySingleQrUrl() {
  if (navigator.clipboard && currentSingleTokenUrl) {
    navigator.clipboard.writeText(currentSingleTokenUrl).then(() => {
      showToast("Enlace de auto-reclamo copiado al portapapeles", "success");
    });
  }
}

function testSingleQrUrl() {
  if (currentSingleTokenUrl) {
    window.open(currentSingleTokenUrl, "_blank");
  }
}
