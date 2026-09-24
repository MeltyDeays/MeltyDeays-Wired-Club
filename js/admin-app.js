/* Controller: Panel de Administración (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";
import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js";

const vm = new AdminViewModel();

let currentSingleTokenUrl = "";
let currentSheetTokens = [];
let currentTab = "pos";
let usersFilterQuery = "";
let usersTierFilter = "ALL";
let vouchersFilterState = "ALL";

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

function switchAdminTab(tabName) {
  currentTab = tabName;
  const tabs = ["pos", "clients", "invoices", "catalog", "history"];
  tabs.forEach(t => {
    const btn = document.getElementById("tab-btn-" + t);
    const sec = document.getElementById("sec-" + t);
    if (btn) {
      if (t === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    }
    if (sec) {
      sec.style.display = t === tabName ? "block" : "none";
    }
  });
}

let html5QrCodeScanner = null;

async function startCameraScanner() {
  const modal = document.getElementById("modal-camera-scanner");
  if (modal) modal.style.display = "flex";

  if (typeof Html5Qrcode !== "undefined") {
    try {
      if (html5QrCodeScanner) {
        await html5QrCodeScanner.stop().catch(() => {});
        html5QrCodeScanner = null;
      }
      html5QrCodeScanner = new Html5Qrcode("camera-scanner-reader");
      await html5QrCodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopCameraScanner();
          const input = document.getElementById("input-scan-voucher");
          if (input) {
            input.value = decodedText.trim();
            verifyVoucherAdmin();
          }
        },
        () => {}
      );
    } catch (err) {
      showToast("No se pudo iniciar la cámara: " + (err.message || err), "error");
    }
  } else {
    showToast("Librería de escáner no disponible.", "error");
  }
}

function stopCameraScanner() {
  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().catch(() => {}).finally(() => {
      html5QrCodeScanner = null;
    });
  }
  const modal = document.getElementById("modal-camera-scanner");
  if (modal) modal.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  vm.subscribe(renderAdmin);

  window.switchAdminTab = switchAdminTab;
  window.submitAdminPin = submitAdminPin;
  window.startCameraScanner = startCameraScanner;
  window.stopCameraScanner = stopCameraScanner;
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

  // Clientes y Puntos
  window.filterUsers = filterUsers;
  window.filterUsersByTier = filterUsersByTier;
  window.openAdjustPointsModal = openAdjustPointsModal;
  window.toggleAdjustType = toggleAdjustType;
  window.setAdjustQuickPoints = setAdjustQuickPoints;
  window.submitAdjustPoints = submitAdjustPoints;
  window.openUserLedgerModal = openUserLedgerModal;
  window.openNewUserModal = openNewUserModal;
  window.saveNewUserAdmin = saveNewUserAdmin;

  // Historial de Vales
  window.filterVouchersTable = filterVouchersTable;
  window.deliverVoucherFromTable = deliverVoucherFromTable;

  window.toggleCustomPaperInputs = toggleCustomPaperInputs;
  window.openPrintSheetModal = openPrintSheetModal;
  window.updatePreviewSheetDimensions = updatePreviewSheetDimensions;
  window.triggerNativeSheetPrint = triggerNativeSheetPrint;
  window.printFromModal = printFromModal;
  window.viewSingleTokenQr = viewSingleTokenQr;
  window.copySingleQrUrl = copySingleQrUrl;
  window.testSingleQrUrl = testSingleQrUrl;

  vm.init();

  // Detección automática si el admin escanea un QR físico o abre con ?scan= o ?claim=
  const params = new URLSearchParams(window.location.search);
  const autoScan = params.get("scan") || params.get("claim");
  if (autoScan) {
    setTimeout(() => {
      switchAdminTab("pos");
      const scanInput = document.getElementById("input-scan-voucher");
      if (scanInput) {
        scanInput.value = autoScan.trim();
        verifyVoucherAdmin();
      }
    }, 350);
  }
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
  const deliveredVouchers = model.vouchers.filter(v => v.isDelivered()).length;

  const statCirc = document.getElementById("stat-points-circ");
  if (statCirc) statCirc.textContent = totalCirc.toLocaleString();

  const statUsers = document.getElementById("stat-users-count");
  if (statUsers) statUsers.textContent = model.users.length;

  const statVouchersPending = document.getElementById("stat-vouchers-pending");
  if (statVouchersPending) statVouchersPending.textContent = pendingVouchers;

  const statDelivered = document.getElementById("stat-vouchers-delivered");
  if (statDelivered) statDelivered.textContent = deliveredVouchers;

  const statCat = document.getElementById("stat-catalog-count");
  if (statCat) statCat.textContent = model.catalog.length;

  const statTokens = document.getElementById("stat-tokens-count");
  if (statTokens) statTokens.textContent = model.tokens.length;

  // Auto-completar el siguiente folio disponible para evitar talonarios duplicados
  const folioEl = document.getElementById("lot-start-folio");
  if (folioEl && !folioEl.dataset.userEdited) {
    const nextFolio = vm.getNextAvailableFolio();
    folioEl.value = nextFolio;
    const helper = document.getElementById("lot-folio-helper");
    if (helper) {
      helper.innerHTML = `Siguiente folio libre detectado: <strong>#${String(nextFolio).padStart(4, "0")}</strong> (garantiza unicidad)`;
    }
  }

  renderCatalogTable(model.catalog);
  renderTokensTable(model.tokens);
  renderUsersTable(model.users);
  renderVouchersTable(model.vouchers);
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

  tbody.innerHTML = tokens.slice(0, 100).map(t => {
    const isClaimed = t.isClaimed();
    const isPending = t.isPendingAssignment();
    const isActive = t.isActive();

    let pointsBadge = "";
    if (isPending) {
      pointsBadge = `<span class="badge-navi" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⏳ Sin Asignar (0 WP)</span>`;
    } else {
      pointsBadge = `<span class="badge-navi" style="background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⚡ ${t.pointsValue} WP</span>`;
    }

    let statusBadge = "";
    if (isClaimed) {
      statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border: 1px solid #fecdd3; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">✔ RECLAMADO</span>`;
    } else if (isActive) {
      statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border: 1px solid #a7f3d0; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">● SIN RECLAMAR (${t.pointsValue} WP)</span>`;
    } else {
      statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border: 1px solid #fcd34d; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⏳ EN ESPERA DE VALOR</span>`;
    }

    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.8rem; white-space:nowrap;"><strong>${t.tokenCode}</strong></td>
        <td style="white-space:nowrap;"><strong>Factura #MD-2026-${t.invoiceFolio}</strong></td>
        <td style="white-space:nowrap;">${pointsBadge}</td>
        <td style="font-family:var(--font-mono); letter-spacing: 2px; white-space:nowrap;">${t.securityPin || "••••"}</td>
        <td style="white-space:nowrap;">${statusBadge}</td>
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
  switchAdminTab("pos");
  const input = document.getElementById("input-scan-voucher");
  if (input) {
    input.value = tokenCode;
    window.scrollTo({ top: 0, behavior: "smooth" });
    verifyVoucherAdmin();
  }
}

async function generateBatchAdmin() {
  const folioEl = document.getElementById("lot-start-folio");
  const countEl = document.getElementById("lot-count");
  const folio = folioEl?.value || 1;
  let count = parseInt(countEl?.value, 10) || 4;

  if (count < 4) count = 4;
  if (count % 4 !== 0) count = Math.ceil(count / 4) * 4;
  if (countEl) countEl.value = count;

  showToast(`Generando y guardando lote de ${count} facturas con QR únicos...`, "info");

  try {
    const res = await vm.generateLot(folio, count, 0);
    currentSheetTokens = res.tokens;
    showToast(`¡Lote guardado! ${res.tokens.length} facturas registradas en estado 'En espera de valor'.`, "success");
    triggerNativeSheetPrint(res.tokens);
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

async function printFromModal() {
  closeModal("modal-print-sheet");
  await generateBatchAdmin();
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

    slot.innerHTML = InvoiceTemplateService.getLainBackCardHtml(idx + 1, tok, "slot-" + idx, idx);

    setTimeout(() => {
      const qrEl = document.getElementById("print-qr-slot-" + idx);
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

function triggerNativeSheetPrint(explicitTokens) {
  const dims = getSelectedPaperDimensions("preview");
  const mode = document.getElementById("print-duplex-mode")?.value || "both";
  
  if (!explicitTokens && currentSheetTokens.length === 0 && vm.tokens.length === 0) {
    // Si no hay tokens generados aún, generar el lote directamente para guardar en sistema
    generateBatchAdmin();
    return;
  }

  const tokensToPrint = explicitTokens && explicitTokens.length > 0
    ? explicitTokens
    : (currentSheetTokens.length > 0 
        ? currentSheetTokens 
        : vm.tokens);

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

// ========================================================
// GESTIÓN DE CLIENTES / SOCIOS WIRED & PUNTOS
// ========================================================
function renderUsersTable(users) {
  const tbody = document.getElementById("clients-table-body");
  if (!tbody) return;

  let filtered = users || [];
  if (usersTierFilter !== "ALL") {
    filtered = filtered.filter(u => (u.tier || "").toUpperCase() === usersTierFilter);
  }
  if (usersFilterQuery) {
    const q = usersFilterQuery.toLowerCase();
    filtered = filtered.filter(u =>
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.uid || "").toLowerCase().includes(q) ||
      (u.memberCode || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">👥</div>
          <strong>No se encontraron socios con los filtros aplicados.</strong>
          <div style="font-size: 0.8rem; margin-top: 4px;">Haz clic en "+ Registrar Nuevo Socio" para dar de alta al primer cliente.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const tier = (u.tier || "NAVI").toUpperCase();
    let tierBadgeClass = "badge-tier-navi";
    if (tier === "RUNNER") tierBadgeClass = "badge-tier-runner";
    else if (tier === "ELITE") tierBadgeClass = "badge-tier-elite";
    else if (tier === "DEUS") tierBadgeClass = "badge-tier-deus";

    const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "Reciente";

    return `
      <tr>
        <td>
          <strong style="color:var(--dark); font-size:0.9rem;">${u.displayName || "Socio Sin Nombre"}</strong>
          <div style="font-size:0.72rem; color:var(--gray-500); font-family:var(--font-mono);">${u.memberCode || u.uid}</div>
        </td>
        <td>
          <div style="font-family:var(--font-mono); font-size:0.8rem; color:var(--dark);">📞 ${u.phone || "-"}</div>
          <div style="font-size:0.7rem; color:var(--gray-500);">PIN: ••••</div>
        </td>
        <td><span class="${tierBadgeClass}">${tier}</span></td>
        <td><strong style="font-family:var(--font-mono); font-size:0.95rem; color:#4338ca;">${(u.wiredPoints || 0).toLocaleString()} WP</strong></td>
        <td><span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--gray-700);">${(u.lifetimePoints || 0).toLocaleString()} WP</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${joinDate}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 4px;" onclick="openAdjustPointsModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', ${u.wiredPoints || 0})">
            ⚡ +/- Puntos
          </button>
          <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.72rem;" onclick="openUserLedgerModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}')">
            📜 Historial
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterUsers() {
  const input = document.getElementById("search-users-input");
  usersFilterQuery = (input ? input.value : "").trim();
  renderUsersTable(vm.users);
}

function filterUsersByTier(tier) {
  usersTierFilter = tier;
  renderUsersTable(vm.users);
}

function openAdjustPointsModal(uid, name, currentPts) {
  const modal = document.getElementById("modal-adjust-points");
  if (!modal) return;
  document.getElementById("adjust-user-uid").value = uid;
  document.getElementById("adjust-user-name").textContent = name;
  document.getElementById("adjust-user-current").textContent = currentPts.toLocaleString() + " WP";
  document.getElementById("adjust-points-amount").value = "";
  document.getElementById("adjust-points-reason").value = "";
  const radios = document.getElementsByName("adjust-type");
  radios.forEach(r => { if (r.value === "ADD") r.checked = true; });
  modal.style.display = "flex";
  setTimeout(() => {
    const input = document.getElementById("adjust-points-amount");
    if (input) input.focus();
  }, 100);
}

function toggleAdjustType() {
  // Estado visual
}

function setAdjustQuickPoints(pts) {
  const input = document.getElementById("adjust-points-amount");
  if (input) {
    input.value = pts;
    input.focus();
  }
}

async function submitAdjustPoints() {
  const uid = document.getElementById("adjust-user-uid").value;
  const amountStr = document.getElementById("adjust-points-amount").value;
  const amount = parseInt(amountStr, 10);
  const reason = document.getElementById("adjust-points-reason").value.trim() || "Ajuste de Mostrador";

  if (!amount || isNaN(amount) || amount <= 0) {
    showToast("⚠️ Ingresa una cantidad de puntos válida mayor a 0.", "error");
    return;
  }

  const radios = document.getElementsByName("adjust-type");
  let type = "ADD";
  radios.forEach(r => { if (r.checked) type = r.value; });

  const delta = type === "ADD" ? amount : -amount;

  try {
    const updatedUser = await vm.adjustUserPoints(uid, delta, reason);
    closeModal("modal-adjust-points");
    showToast(`✓ Saldo actualizado: ${updatedUser.displayName} ahora tiene ${updatedUser.wiredPoints.toLocaleString()} WP`, "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function openUserLedgerModal(uid, name) {
  const modal = document.getElementById("modal-user-ledger");
  if (!modal) return;
  document.getElementById("ledger-user-name").textContent = "Historial: " + name;
  document.getElementById("ledger-user-uid").textContent = "UID: " + uid;
  const tbody = document.getElementById("user-ledger-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--gray-500);">Cargando movimientos...</td></tr>`;
  }
  modal.style.display = "flex";

  const ledger = vm.getUserLedger(uid);
  if (!ledger || ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">
          No hay movimientos registrados para este socio aún.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ledger.map(entry => {
    const isCredit = (entry.amount || 0) >= 0;
    const diffClass = isCredit ? "ledger-credit" : "ledger-debit";
    const sign = isCredit ? "+" : "";
    const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString("es-ES") : "-";

    return `
      <tr>
        <td style="font-size:0.75rem; color:var(--gray-600); font-family:var(--font-mono);">${dateStr}</td>
        <td><span class="badge-navi" style="font-size:0.65rem;">${entry.type || "AJUSTE"}</span></td>
        <td style="color:var(--dark); font-weight:600;">${entry.reason || "-"}</td>
        <td class="${diffClass}" style="text-align:right;">${sign}${(entry.amount || 0).toLocaleString()} WP</td>
        <td style="text-align:right; font-family:var(--font-mono); font-weight:800; color:var(--dark);">${(entry.balanceAfter || 0).toLocaleString()} WP</td>
      </tr>
    `;
  }).join("");
}

function openNewUserModal() {
  const modal = document.getElementById("modal-new-user");
  if (!modal) return;
  document.getElementById("new-user-name").value = "";
  document.getElementById("new-user-phone").value = "";
  document.getElementById("new-user-pin").value = "1234";
  document.getElementById("new-user-points").value = "0";
  modal.style.display = "flex";
  setTimeout(() => {
    const input = document.getElementById("new-user-name");
    if (input) input.focus();
  }, 100);
}

async function saveNewUserAdmin() {
  const name = document.getElementById("new-user-name").value.trim();
  const phone = document.getElementById("new-user-phone").value.trim();
  const pin = document.getElementById("new-user-pin").value.trim() || "1234";
  const points = parseInt(document.getElementById("new-user-points").value, 10) || 0;

  if (!name) {
    showToast("⚠️ El nombre del socio es obligatorio.", "error");
    return;
  }
  if (!phone || phone.length < 8) {
    showToast("⚠️ Ingresa un número telefónico válido (mínimo 8 dígitos).", "error");
    return;
  }

  try {
    const user = await vm.registerUserFromAdmin({ displayName: name, phone, pin, initialPoints: points });
    closeModal("modal-new-user");
    showToast(`✓ Socio ${user.displayName} registrado con éxito. Saldo: ${user.wiredPoints} WP`, "success");
    switchAdminTab("clients");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

// ========================================================
// HISTORIAL Y AUDITORÍA DE VALES DE CANJE
// ========================================================
function renderVouchersTable(vouchers) {
  const tbody = document.getElementById("vouchers-table-body");
  if (!tbody) return;

  let filtered = vouchers || [];
  if (vouchersFilterState === "PENDING") {
    filtered = filtered.filter(v => !v.isDelivered());
  } else if (vouchersFilterState === "DELIVERED") {
    filtered = filtered.filter(v => v.isDelivered());
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">📜</div>
          <strong>No hay registros de vales bajo este filtro.</strong>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const isDelivered = v.isDelivered();
    const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
    const statusBadge = isDelivered
      ? `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">✓ DESPACHADO</span>`
      : `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d;">⏳ PENDIENTE</span>`;

    return `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:800; font-size:0.85rem; color:var(--dark);">${v.voucherCode}</td>
        <td><strong style="color:var(--dark);">${v.rewardTitle || "Artículo"}</strong></td>
        <td>
          <div style="font-size:0.82rem; font-weight:700; color:var(--dark);">${v.userDisplayName || v.userId}</div>
          <div style="font-size:0.7rem; font-family:var(--font-mono); color:var(--gray-500);">${v.userId}</div>
        </td>
        <td><span class="badge-navi">${(v.pointsCost || 0).toLocaleString()} WP</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${dateStr}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${!isDelivered ? `
            <button class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem;" onclick="deliverVoucherFromTable('${v.voucherCode}')">
              ✓ Entregar
            </button>
          ` : `
            <span style="font-size:0.75rem; color:var(--gray-500); font-family:var(--font-mono);">Entregado</span>
          `}
        </td>
      </tr>
    `;
  }).join("");
}

function filterVouchersTable(state) {
  vouchersFilterState = state;
  renderVouchersTable(vm.vouchers);
}

async function deliverVoucherFromTable(voucherCode) {
  if (confirm(`¿Confirmar entrega y despacho físico del vale [${voucherCode}]?`)) {
    try {
      await vm.deliverVoucher(voucherCode);
      showToast(`✓ Vale [${voucherCode}] entregado y marcado como despachado.`, "success");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  }
}
