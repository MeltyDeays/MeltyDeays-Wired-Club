/* Controller: Panel de Administración (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";
import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js?v=2.6.0";
import { FirestoreService } from "./services/FirestoreService.js";

const vm = new AdminViewModel();

// MÁSCARA AUTOMÁTICA DE TELÉFONO (+505 POR DEFECTO, 8 DÍGITOS, GUION AUTOMÁTICO 5843-8412)
export function attachPhoneMask(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("input", function(e) {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.startsWith("00505") && raw.length > 5) {
      raw = raw.slice(5);
    } else if (raw.startsWith("505") && raw.length > 8) {
      raw = raw.slice(3);
    }
    raw = raw.slice(0, 8);
    if (raw.length > 4) {
      e.target.value = raw.slice(0, 4) + "-" + raw.slice(4);
    } else {
      e.target.value = raw;
    }
  });

  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Backspace" && e.target.selectionStart === 5 && e.target.selectionEnd === 5) {
      e.preventDefault();
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val.slice(0, 3);
    }
  });
}

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
  const invoiceBox = document.getElementById("scan-invoice-box");
  const customerBox = document.getElementById("scan-customer-box");
  if (resultBox) resultBox.style.display = "none";
  if (invoiceBox) invoiceBox.style.display = "none";
  if (customerBox) customerBox.style.display = "none";
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

  // Refrescar datos en vivo cada vez que se conmuta de pestaña
  if (vm && vm.isAuthenticated) {
    vm.refreshData();
  }
}

async function refreshAdminUsers() {
  if (vm && vm.isAuthenticated) {
    showToast("Sincronizando socios con la base de datos...", "info");
    await vm.refreshData();
    renderUsersTable(vm.users);
    showToast(`✓ Base de datos sincronizada: ${vm.users.length} socios registrados.`, "success");
  }
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
  window.recalculateRewardPoints = recalculateRewardPoints;
  window.setFreightPreset = setFreightPreset;
  window.setLoyaltyRatio = setLoyaltyRatio;
  window.setSalesFrequency = setSalesFrequency;
  window.setTicketPreset = setTicketPreset;
  window.applyCalculatedPointsToProduct = applyCalculatedPointsToProduct;
  window.onManualPointsCostChange = onManualPointsCostChange;
  window.setProductPublicationMode = setProductPublicationMode;
  window.setProductDiscountPreset = setProductDiscountPreset;
  window.recalculateProductDiscount = recalculateProductDiscount;
  window.applyCalculatedDiscountToProduct = applyCalculatedDiscountToProduct;

  // Exponer servicios al ámbito global para scripts inline (selector plantillas Lain)
  window.InvoiceTemplateService = InvoiceTemplateService;
  window.FirestoreService = FirestoreService;

  // Calculadora de Puntos por Venta (Factura 4x1)
  window.openSalePointsCalculatorModal = openSalePointsCalculatorModal;
  window.setSaleFreightPreset = setSaleFreightPreset;
  window.setSaleReturnBase = setSaleReturnBase;
  window.setSaleReturnPct = setSaleReturnPct;
  window.recalculateSalePoints = recalculateSalePoints;
  window.applySalePointsToActiveTarget = applySalePointsToActiveTarget;

  // Clientes y Puntos
  window.filterUsers = filterUsers;
  window.filterUsersByTier = filterUsersByTier;
  window.refreshAdminUsers = refreshAdminUsers;
  window.openAdjustPointsModal = openAdjustPointsModal;
  window.selectAdjustDirection = selectAdjustDirection;
  window.toggleAdjustType = toggleAdjustType;
  window.setAdjustQuickPoints = setAdjustQuickPoints;
  window.submitAdjustPoints = submitAdjustPoints;
  window.openUserLedgerModal = openUserLedgerModal;
  window.openNewUserModal = openNewUserModal;
  window.saveNewUserAdmin = saveNewUserAdmin;
  window.toggleNewUserPinVisibility = toggleNewUserPinVisibility;
  window.updateNewUserPreview = updateNewUserPreview;
  window.generateNewUserRandomPin = generateNewUserRandomPin;
  window.setNewUserQuickPoints = setNewUserQuickPoints;
  window.openEditPinModal = openEditPinModal;
  window.generateEditPinRandom = generateEditPinRandom;
  window.setEditPinPreset = setEditPinPreset;
  window.submitEditUserPin = submitEditUserPin;
  window.openDeleteUserModal = openDeleteUserModal;
  window.executeDeleteUserAdmin = executeDeleteUserAdmin;
  window.toggleBanUserAdmin = toggleBanUserAdmin;

  // POS Socio Actions
  window.posCustomerQuickAdjust = posCustomerQuickAdjust;
  window.posCustomerViewLedger = posCustomerViewLedger;

  // Lotes y Purga de Facturas
  window.validateLotCountInput = validateLotCountInput;
  window.enforceMultipleOfFour = enforceMultipleOfFour;
  window.openPurgeModal = openPurgeModal;
  window.executePurgeInvoices = executePurgeInvoices;
  window.openPurgeAllDbModal = openPurgeAllDbModal;
  window.executePurgeAllDb = executePurgeAllDb;

  // Manejo de Imágenes Base64 Catálogo
  window.handleProductImageFile = handleProductImageFile;
  window.clearProductImageUpload = clearProductImageUpload;
  window.previewProductImageFromUrl = previewProductImageFromUrl;

  // Historial de Vales y Despacho
  window.filterVouchersTable = filterVouchersTable;
  window.deliverVoucherFromTable = deliverVoucherFromTable;
  window.markVoucherPaidAdmin = markVoucherPaidAdmin;
  window.openMarkPaidModal = openMarkPaidModal;
  window.executeConfirmPaidModal = executeConfirmPaidModal;
  window.openDeliverVoucherModal = openDeliverVoucherModal;
  window.executeModalDeliver = executeModalDeliver;
  window.playAdminDispatchSound = playAdminDispatchSound;
  window.triggerCyberDispatchGlitch = triggerCyberDispatchGlitch;

  window.toggleCustomPaperInputs = toggleCustomPaperInputs;
  window.openPrintSheetModal = openPrintSheetModal;
  window.updatePreviewSheetDimensions = updatePreviewSheetDimensions;
  window.switchPreviewMode = switchPreviewMode;
  window.downloadPrintSheetHtml = downloadPrintSheetHtml;
  window.triggerNativeSheetPrint = triggerNativeSheetPrint;
  window.printFromModal = printFromModal;
  window.viewSingleTokenQr = viewSingleTokenQr;
  window.copySingleQrUrl = copySingleQrUrl;
  window.testSingleQrUrl = testSingleQrUrl;
  window.openTokenActionsModal = openTokenActionsModal;
  window.executeTokenOptAssign = executeTokenOptAssign;
  window.executeTokenOptQr = executeTokenOptQr;
  window.executeTokenOptCopyLink = executeTokenOptCopyLink;
  window.executeTokenOptTestUrl = executeTokenOptTestUrl;
  window.executeTokenOptDigitalInvoice = executeTokenOptDigitalInvoice;
  window.executeTokenOptViewInvoice = executeTokenOptViewInvoice;
  window.executeTokenOptEditInvoice = executeTokenOptEditInvoice;
  window.handleInvoiceBtnClick = handleInvoiceBtnClick;

  // Factura Digital Individual (Venta Casual)
  window.openSingleDigitalInvoiceModal = openSingleDigitalInvoiceModal;
  window.refreshSingleInvoiceFolio = refreshSingleInvoiceFolio;
  window.updateSingleInvoiceCurrency = updateSingleInvoiceCurrency;
  window.addSingleInvoiceItemRow = addSingleInvoiceItemRow;
  window.removeSingleInvoiceItemRow = removeSingleInvoiceItemRow;
  window.addCatalogProductToSingleInvoice = addCatalogProductToSingleInvoice;
  window.calcSingleInvoiceTotals = calcSingleInvoiceTotals;
  window.toggleSingleInvoicePointsFields = toggleSingleInvoicePointsFields;
  window.autoCalculateSingleInvoicePoints = autoCalculateSingleInvoicePoints;
  window.regenerateSingleInvoicePin = regenerateSingleInvoicePin;
  window.submitSingleDigitalInvoice = submitSingleDigitalInvoice;

  // Sincronización entre pestañas del navegador en tiempo real
  window.addEventListener("storage", (e) => {
    if (e.key === "wired_club_mvvm_db_v1" && vm && vm.isAuthenticated) {
      vm.refreshData();
    }
  });

  vm.init();

  // Inicializar máscara telefónica en campos de entrada (+505 automático)
  attachPhoneMask(document.getElementById("new-user-phone"));
  attachPhoneMask(document.getElementById("s-inv-client-phone"));

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

  tbody.innerHTML = catalog.map(p => {
    const isPartial = p.rewardType === "PARTIAL_DISCOUNT" || (typeof p.isPartialDiscount === "function" && p.isPartialDiscount());
    const typeBadge = isPartial
      ? `<span class="badge-navi" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:0.68rem;">🏷️ VENTA TOPADA (${p.maxDiscountPct || 5}%)</span>`
      : `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:0.68rem;">🎁 100% CANJE</span>`;

    const costDisplay = isPartial
      ? `<div><strong style="color:#b45309;">${p.pointsCost.toLocaleString()} WP</strong></div><div style="font-size:0.7rem; color:#059669; font-weight:700;">-$${(p.maxDiscountUsd || 0).toFixed(2)} USD</div>`
      : `<strong style="color:var(--dark);">${p.pointsCost.toLocaleString()} WP</strong>`;

    const priceInfo = isPartial
      ? `<div style="font-size:0.72rem; font-family:var(--font-mono); color:var(--dark); margin-top:3px;">Precio: $${(p.priceUsd || 0).toFixed(2)} · <span style="color:#dc2626; font-weight:800;">Cobrar: $${(p.cashToPayUsd || 0).toFixed(2)} USD</span></div>`
      : "";

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            ${typeBadge}
            <strong style="color:var(--dark);">${p.title}</strong>
          </div>
          <div style="font-size:0.72rem; color:var(--gray-500); font-family:var(--font-mono);">${p.id}</div>
          ${priceInfo}
        </td>
        <td>${costDisplay}</td>
        <td><strong>${p.stock}</strong> un.</td>
        <td style="font-size:0.8rem; color:var(--gray-700);">${p.description || "-"}</td>
        <td style="text-align: right;">
          <button class="btn-outline-sm" style="color:var(--accent); border-color:#fca5a5; font-size:0.75rem; padding: 3px 8px; border-radius:3px; cursor:pointer;" onclick="removeProductAdmin('${p.id}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");
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
        <td style="white-space:nowrap;"><code class="token-code-pill">${t.tokenCode}</code></td>
        <td style="white-space:nowrap;"><strong>#MD-${t.invoiceFolio}</strong></td>
        <td style="white-space:nowrap;">${pointsBadge}</td>
        <td style="white-space:nowrap; text-align: center;"><span class="pin-badge">${t.securityPin || "••••"}</span></td>
        <td style="white-space:nowrap;">${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
            ${!isClaimed ? `
              <button class="btn-primary btn-compact" onclick="promptAssignPoints('${t.tokenCode}', '${t.invoiceFolio}')" title="Asignar puntos a esta factura">
                ⚡ Cargar
              </button>
            ` : ""}
            <button class="btn-secondary btn-compact" onclick="viewSingleTokenQr('${t.tokenCode}', '${t.invoiceFolio}', ${t.pointsValue}, '${t.securityPin}')" title="Ver código QR oficial">
              🔍 QR
            </button>
            <button class="btn-secondary btn-compact" style="color:#059669; border-color:#059669; font-weight:800;" onclick="handleInvoiceBtnClick('${t.tokenCode}')" title="Ver o Imprimir Factura Digital Completa">
              🧾 Factura
            </button>
            <button class="btn-secondary btn-dots" onclick="openTokenActionsModal('${t.tokenCode}')" title="Más opciones">
              ···
            </button>
          </div>
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
  const customerBox = document.getElementById("scan-customer-box");

  // CASO 0: DETECCIÓN DE CARNET DIGITAL DE SOCIO (CyberPass / MC-2026-XXXX o teléfono o UID)
  if (code.startsWith("MC-") || code.startsWith("CLIENT-") || code.startsWith("USR-") || (/^\d{8,12}$/).test(code)) {
    const customer = await vm.findCustomer(code);
    if (customer) {
      clearPosFeedback();
      if (voucherBox) voucherBox.style.display = "none";
      if (invoiceBox) invoiceBox.style.display = "none";
      if (customerBox) {
        currentScannedCustomer = customer;
        customerBox.style.display = "block";
        document.getElementById("scan-cust-name").textContent = customer.displayName || "Socio Wired";
        document.getElementById("scan-cust-code").textContent = customer.memberCode || customer.uid;
        document.getElementById("scan-cust-phone").textContent = "📞 " + (customer.phone || "-");
        document.getElementById("scan-cust-points").textContent = (customer.wiredPoints || 0).toLocaleString() + " WP";
        document.getElementById("scan-cust-lifetime").textContent = (customer.lifetimePoints || 0).toLocaleString() + " WP";

        const tierEl = document.getElementById("scan-cust-tier");
        if (tierEl) {
          const t = (customer.tier || "NAVI").toUpperCase();
          tierEl.textContent = t;
          tierEl.className = "badge-tier-navi";
          if (t.includes("RUNNER")) tierEl.className = "badge-tier-runner";
          else if (t.includes("ELITE")) tierEl.className = "badge-tier-elite";
          else if (t.includes("DEUS")) tierEl.className = "badge-tier-deus";
        }
      }
      return;
    }
  }

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
      if (customerBox) customerBox.style.display = "none";
      return;
    }

    clearPosFeedback();
    if (voucherBox) voucherBox.style.display = "none";
    if (customerBox) customerBox.style.display = "none";

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
    // Si no es vale ni factura, intentar buscar como socio por si acaso
    const fallbackCustomer = await vm.findCustomer(code);
    if (fallbackCustomer) {
      clearPosFeedback();
      if (voucherBox) voucherBox.style.display = "none";
      if (invoiceBox) invoiceBox.style.display = "none";
      if (customerBox) {
        currentScannedCustomer = fallbackCustomer;
        customerBox.style.display = "block";
        document.getElementById("scan-cust-name").textContent = fallbackCustomer.displayName || "Socio Wired";
        document.getElementById("scan-cust-code").textContent = fallbackCustomer.memberCode || fallbackCustomer.uid;
        document.getElementById("scan-cust-phone").textContent = "📞 " + (fallbackCustomer.phone || "-");
        document.getElementById("scan-cust-points").textContent = (fallbackCustomer.wiredPoints || 0).toLocaleString() + " WP";
        document.getElementById("scan-cust-lifetime").textContent = (fallbackCustomer.lifetimePoints || 0).toLocaleString() + " WP";

        const tierEl = document.getElementById("scan-cust-tier");
        if (tierEl) {
          const t = (fallbackCustomer.tier || "NAVI").toUpperCase();
          tierEl.textContent = t;
          tierEl.className = "badge-tier-navi";
          if (t.includes("RUNNER")) tierEl.className = "badge-tier-runner";
          else if (t.includes("ELITE")) tierEl.className = "badge-tier-elite";
          else if (t.includes("DEUS")) tierEl.className = "badge-tier-deus";
        }
      }
      return;
    }

    setPosFeedback("❌ El código [" + code + "] no corresponde a ningún vale, factura o socio registrado.", "error");
    if (group) {
      group.classList.add("shake-input");
      setTimeout(() => group.classList.remove("shake-input"), 500);
    }
    if (voucherBox) voucherBox.style.display = "none";
    if (invoiceBox) invoiceBox.style.display = "none";
    if (customerBox) customerBox.style.display = "none";
    return;
  }

  clearPosFeedback();
  if (invoiceBox) invoiceBox.style.display = "none";
  if (customerBox) customerBox.style.display = "none";
  if (invoiceBox) invoiceBox.style.display = "none";

  if (voucherBox) {
    voucherBox.style.display = "block";
    const stampEl = document.getElementById("scan-res-stamp");
    const actionsEl = document.getElementById("scan-res-actions");
    const statusEl = document.getElementById("scan-res-status");
    const deliveredMeta = document.getElementById("scan-res-delivered-meta");

    document.getElementById("scan-res-code").textContent = voucher.voucherCode;
    document.getElementById("scan-res-product").textContent = voucher.rewardTitle;

    // Localizar socio titular para contacto telefónico
    const user = (vm.users || []).find(u => u.uid === voucher.userUid || u.id === voucher.userUid || u.phone === voucher.userUid);
    const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
    const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (voucher.userUid || "");

    document.getElementById("scan-res-client").textContent = clientName;
    const contactEl = document.getElementById("scan-res-contact");
    if (contactEl) contactEl.textContent = clientContact || "Cliente Mostrador";

    const cost = voucher.pointsCost || voucher.pointsSpent || 0;
    document.getElementById("scan-res-points").textContent = cost > 0 ? cost.toLocaleString() + " WP" : "CANJE";
    document.getElementById("scan-res-date").textContent = new Date(voucher.createdAt).toLocaleString();

    if (voucher.isDelivered()) {
      const deliveredTime = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleString() : "Previamente";
      if (statusEl) {
        statusEl.className = "noc-pulse-chip";
        statusEl.style.borderColor = "#f87171";
        statusEl.style.background = "#fee2e2";
        statusEl.style.color = "#991b1b";
        statusEl.innerHTML = "❌ YA DESPACHADO (" + deliveredTime + ")";
      }
      if (deliveredMeta) {
        deliveredMeta.textContent = "Despachado por: " + (voucher.deliveredBy || "admin_melty");
      }
      if (stampEl) {
        stampEl.className = "dispatch-stamp already-delivered";
        stampEl.innerHTML = `❌ YA DESPACHADO<div style="font-size:0.68rem; font-weight:800; margin-top:4px;">ENTREGADO EL ${deliveredTime}</div>`;
      }
      if (actionsEl) {
        actionsEl.innerHTML = `
          <div style="background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:0.6rem 0.9rem; border-radius:4px; font-size:0.82rem; font-weight:700; width:100%; margin-bottom:0.5rem;">
            ⚠️ ATENCIÓN: Este vale ya fue entregado y canjeado en mostrador. NO entregar un artículo duplicado.
          </div>
          <button class="btn-secondary" onclick="closePosResult(); clearPosScanner();">CERRAR FICHA</button>
        `;
      }
    } else {
      const isCommercial = typeof voucher.isCommercial === "function" ? voucher.isCommercial() : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
      const isPaid = typeof voucher.isPaidVoucher === "function" ? voucher.isPaidVoucher() : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);

      if (isCommercial && !isPaid) {
        if (statusEl) {
          statusEl.className = "noc-pulse-chip";
          statusEl.style.borderColor = "#f59e0b";
          statusEl.style.background = "#fffbeb";
          statusEl.style.color = "#b45309";
          statusEl.innerHTML = `⚠️ PENDIENTE DE COBRO ($${(voucher.cashToPayUsd || 0).toFixed(2)} USD)`;
        }
        if (deliveredMeta) deliveredMeta.textContent = "";
        if (stampEl) {
          stampEl.className = "dispatch-stamp";
        }
        if (actionsEl) {
          actionsEl.innerHTML = `
            <div style="background:#fffbeb; border:1px solid #f59e0b; color:#92400e; padding:0.6rem 0.9rem; border-radius:4px; font-size:0.8rem; font-weight:700; width:100%; margin-bottom:0.5rem; text-align:left;">
              💵 Saldo pendiente: $${(voucher.cashToPayUsd || 0).toFixed(2)} USD (C$ ${(Number(voucher.cashToPayUsd || 0) * 37.0).toFixed(2)} NIO). Debes registrar el cobro antes de autorizar la entrega física.
            </div>
            <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="openMarkPaidModal('${voucher.voucherCode}');">
              💵 REGISTRAR PAGO ($${(voucher.cashToPayUsd || 0).toFixed(2)} USD)
            </button>
            <button class="btn-secondary" onclick="closePosResult()">CERRAR FICHA</button>
          `;
        }
      } else {
        if (statusEl) {
          statusEl.className = "noc-pulse-chip";
          statusEl.style.borderColor = "#a7f3d0";
          statusEl.style.background = "#ecfdf5";
          statusEl.style.color = "#059669";
          statusEl.innerHTML = '<span class="pulse-dot"></span> VÁLIDO PARA ENTREGA';
        }
        if (deliveredMeta) deliveredMeta.textContent = "";
        if (stampEl) {
          stampEl.className = "dispatch-stamp"; // Oculto hasta pulsar entregar
        }
        if (actionsEl) {
          actionsEl.innerHTML = `
            <button id="btn-confirm-delivery" class="btn-primary btn-dispatch-action" onclick="confirmDeliveryAdmin()">
              ⚡ CONFIRMAR Y DESPACHAR ARTÍCULO (SALIDA FÍSICA)
            </button>
            <button class="btn-secondary" onclick="closePosResult()">CERRAR FICHA</button>
          `;
        }
      }
    }
  }
}

// Sintetizador Web Audio API: Sonido Cyberpunk de Despacho
function playAdminDispatchSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tones = [
      { freq: 392.00, start: 0, dur: 0.12, type: "sawtooth", gain: 0.08 },
      { freq: 523.25, start: 0.06, dur: 0.14, type: "sine", gain: 0.1 },
      { freq: 659.25, start: 0.12, dur: 0.16, type: "sine", gain: 0.12 },
      { freq: 783.99, start: 0.18, dur: 0.18, type: "sine", gain: 0.14 },
      { freq: 1046.50, start: 0.24, dur: 0.3, type: "triangle", gain: 0.16 }
    ];
    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.start);
      gain.gain.setValueAtTime(t.gain, ctx.currentTime + t.start);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t.start + t.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t.start);
      osc.stop(ctx.currentTime + t.start + t.dur);
    });
  } catch (e) {}
}

// Ráfaga de partículas y glitch cibernético en canvas
function triggerCyberDispatchGlitch() {
  let canvas = document.getElementById("cyber-celebration-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "cyber-celebration-canvas";
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#10b981", "#34d399", "#38bdf8", "#4338ca", "#ffffff"];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.018 + Math.random() * 0.025
    });
  }

  let animId;
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }
    });
    if (alive) {
      animId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animId);
    }
  }
  loop();
}

async function confirmDeliveryAdmin() {
  const code = document.getElementById("scan-res-code")?.textContent?.trim();
  if (!code) return;

  const btnDeliver = document.getElementById("btn-confirm-delivery");
  if (btnDeliver) {
    btnDeliver.disabled = true;
    btnDeliver.innerHTML = '<span class="cyber-spinner"></span> AUTORIZANDO SALIDA FÍSICA...';
  }

  try {
    const updated = await vm.deliverVoucher(code);
    playAdminDispatchSound();
    triggerCyberDispatchGlitch();

    // Estampado holográfico animado
    const stampEl = document.getElementById("scan-res-stamp");
    if (stampEl) {
      const nowStr = new Date().toLocaleString();
      stampEl.className = "dispatch-stamp active";
      stampEl.innerHTML = `
        ✓ ARTÍCULO DESPACHADO
        <div style="font-size:0.68rem; font-weight:800; margin-top:4px; letter-spacing:0.5px;">
          SALIDA AUTORIZADA // OPERADOR: ADMIN_MELTY // ${nowStr}
        </div>
      `;
    }

    const statusEl = document.getElementById("scan-res-status");
    if (statusEl) {
      statusEl.className = "noc-pulse-chip";
      statusEl.style.borderColor = "#a7f3d0";
      statusEl.style.background = "#ecfdf5";
      statusEl.style.color = "#059669";
      statusEl.innerHTML = '✓ DESPACHADO CON ÉXITO';
    }

    const actionsEl = document.getElementById("scan-res-actions");
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="closePosResult(); clearPosScanner();">
          ✓ ENTREGA COMPLETADA · NUEVA OPERACIÓN
        </button>
      `;
    }

    showToast(`✓ Vale [${code}] entregado y marcado como DESPACHADO en base de datos.`, "success");

    // Destello de fila en la tabla de historial si está presente
    const row = document.getElementById(`voucher-row-${code}`);
    if (row) row.classList.add("row-delivered-flash");
  } catch (err) {
    if (btnDeliver) {
      btnDeliver.disabled = false;
      btnDeliver.textContent = "⚡ CONFIRMAR Y DESPACHAR ARTÍCULO (SALIDA FÍSICA)";
    }
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

let activeSalesTarget = 4; // Meta de 4 compras recurrentes para canjear (Recomendado)
let activeLoyaltyRatio = 0.025; // 2.5% para compatibilidad

function setFreightPreset(rate, modeName) {
  const rateInput = document.getElementById("calc-freight-rate");
  if (rateInput) {
    rateInput.value = Number(rate).toFixed(2);
  }
  const btn25 = document.getElementById("btn-freight-maritimo-250");
  const btn30 = document.getElementById("btn-freight-maritimo-300");
  const btn55 = document.getElementById("btn-freight-aereo-550");
  [btn25, btn30, btn55].forEach(b => { if (b) b.classList.remove("active"); });
  if (rate === 2.5 && btn25) btn25.classList.add("active");
  if (rate === 3.0 && btn30) btn30.classList.add("active");
  if (rate === 5.5 && btn55) btn55.classList.add("active");

  recalculateRewardPoints();
  showToast(`Tarifa de flete casillero fijada en $${rate}/lb (${modeName}).`, "info");
}

function setSalesFrequency(count, activeBtnId) {
  activeSalesTarget = Number(count) || 4;
  ['btn-freq-3', 'btn-freq-4', 'btn-freq-5', 'btn-freq-6'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.classList.remove("active");
  });
  const activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) activeBtn.classList.add("active");

  const badge = document.getElementById("calc-sales-target-badge");
  if (badge) {
    badge.textContent = `META: ${count} VENTAS`;
  }

  recalculateRewardPoints();
  showToast(`Meta de canje fijada en ${count} compras recurrentes.`, "info");
}

function setTicketPreset(ticket) {
  const ticketInput = document.getElementById("calc-ticket-avg-usd");
  if (ticketInput) {
    ticketInput.value = Number(ticket).toFixed(2);
  }
  recalculateRewardPoints();
  showToast(`Ticket promedio fijado en $${ticket} USD.`, "info");
}

function setLoyaltyRatio(ratio, activeBtnId) {
  activeLoyaltyRatio = ratio;
  recalculateRewardPoints();
}

const WP_PER_USD = 10; // Regla oficial MeltyDeays The Wired Club: 1 USD gastado = 10 WP

function recalculateRewardPoints() {
  const priceInput = document.getElementById("calc-prod-price-usd");
  const weightInput = document.getElementById("calc-prod-weight-lbs");
  const freightInput = document.getElementById("calc-freight-rate");
  const ticketInput = document.getElementById("calc-ticket-avg-usd");

  const priceUsd = Math.max(0, parseFloat(priceInput?.value) || 0);
  const weightLbs = Math.max(0, parseFloat(weightInput?.value) || 0);
  const freightRate = Math.max(0, parseFloat(freightInput?.value) || 0);
  const ticketAvg = Math.max(1, parseFloat(ticketInput?.value) || 20);
  const salesCount = activeSalesTarget || 4;

  const freightCost = weightLbs * freightRate;
  const landedCost = priceUsd + freightCost;

  // Total acumulado por el cliente en salesCount compras
  const totalSalesRequired = salesCount * ticketAvg;
  // Puntos otorgados por cada compra: 1 USD = 10 WP
  const pointsPerSale = Math.round(ticketAvg * WP_PER_USD);
  // Puntos necesarios para el canje tras salesCount compras
  let suggestedPoints = salesCount * pointsPerSale;
  if (landedCost > 0 && suggestedPoints < 50) suggestedPoints = 50;

  // Rentabilidad del negocio en esas compras recurrentes
  const giftInvestmentRatio = totalSalesRequired > 0 ? (landedCost / totalSalesRequired) : 0;
  const businessRetention = Math.max(0, 100 - (giftInvestmentRatio * 100));

  const landedCostEl = document.getElementById("calc-landed-cost");
  const freightCostEl = document.getElementById("calc-freight-cost");
  const salesSummaryEl = document.getElementById("calc-sales-summary");
  const formulaDetailEl = document.getElementById("calc-formula-detail");
  const roiNoteEl = document.getElementById("calc-roi-note");
  const suggestedPtsEl = document.getElementById("calc-suggested-points");

  if (landedCostEl) landedCostEl.textContent = `$${landedCost.toFixed(2)} USD`;
  if (freightCostEl) freightCostEl.textContent = `$${freightCost.toFixed(2)}`;
  if (salesSummaryEl) {
    salesSummaryEl.textContent = `${salesCount} compras de $${ticketAvg.toFixed(2)} USD ($${Math.round(totalSalesRequired)} USD total)`;
  }
  if (formulaDetailEl) {
    formulaDetailEl.textContent = `${pointsPerSale} WP/compra × ${salesCount} compras = ${suggestedPoints.toLocaleString()} WP`;
  }
  if (roiNoteEl) {
    roiNoteEl.innerHTML = `Retención de negocio: <strong>${businessRetention.toFixed(0)}%</strong> (Inversión en regalo: $${landedCost.toFixed(2)} de $${Math.round(totalSalesRequired)} USD)`;
  }
  if (suggestedPtsEl) {
    suggestedPtsEl.textContent = `${suggestedPoints.toLocaleString()} WP`;
  }

  return { landedCost, freightCost, salesRequired: totalSalesRequired, suggestedPoints, pointsPerSale, salesCount };
}

function applyCalculatedPointsToProduct() {
  const { suggestedPoints, salesRequired, landedCost, salesCount, pointsPerSale } = recalculateRewardPoints();
  const costInput = document.getElementById("prod-cost");
  if (costInput) {
    costInput.value = suggestedPoints;
    costInput.style.borderColor = "#059669";
    costInput.style.boxShadow = "0 0 10px rgba(5, 150, 105, 0.35)";
    setTimeout(() => {
      costInput.style.borderColor = "";
      costInput.style.boxShadow = "";
    }, 1200);
  }
  showToast(`⚡ Asignado: ${suggestedPoints.toLocaleString()} WP (${salesCount} compras de ${pointsPerSale} WP | Costo Landed: $${landedCost.toFixed(2)}).`, "success");
}

function onManualPointsCostChange() {
  // Sincronización libre si el usuario prefiere tipear a mano
}

// -----------------------------------------------------------------------------
// CATÁLOGO MIXTO: RECOMPENSAS 100% CANJEABLES VS VENTA CON TOPE DE DESCUENTO
// -----------------------------------------------------------------------------
let activeProductMode = "FREE_REWARD"; // "FREE_REWARD" | "PARTIAL_DISCOUNT"
let activeProductDiscountPct = 5; // 5% por defecto

function setProductPublicationMode(mode) {
  activeProductMode = mode;
  const isFree = mode === "FREE_REWARD";

  const badge = document.getElementById("prod-mode-badge");
  const btnFree = document.getElementById("btn-prod-mode-free");
  const btnDisc = document.getElementById("btn-prod-mode-discount");
  const secFree = document.getElementById("sec-product-free-calc");
  const secDisc = document.getElementById("sec-product-discount-calc");
  const typeInput = document.getElementById("prod-reward-type");
  const summaryPill = document.getElementById("prod-commercial-summary-pill");

  if (typeInput) typeInput.value = mode;

  if (badge) {
    badge.textContent = isFree ? "MODO: 🎁 100% CANJEABLE" : "MODO: 🏷️ VENTA TOPADA";
    badge.style.background = isFree ? "#ecfdf5" : "#fef3c7";
    badge.style.color = isFree ? "#065f46" : "#b45309";
    badge.style.borderColor = isFree ? "#a7f3d0" : "#fde68a";
  }

  if (btnFree) {
    btnFree.style.border = isFree ? "2px solid #059669" : "1.5px solid #cbd5e1";
    btnFree.style.background = isFree ? "#ecfdf5" : "#f8fafc";
    btnFree.style.color = isFree ? "#065f46" : "#475569";
  }

  if (btnDisc) {
    btnDisc.style.border = !isFree ? "2px solid #d97706" : "1.5px solid #cbd5e1";
    btnDisc.style.background = !isFree ? "#fffbeb" : "#f8fafc";
    btnDisc.style.color = !isFree ? "#b45309" : "#475569";
  }

  if (secFree) secFree.style.display = isFree ? "block" : "none";
  if (secDisc) secDisc.style.display = !isFree ? "block" : "none";

  if (isFree) {
    if (summaryPill) summaryPill.style.display = "none";
    applyCalculatedPointsToProduct();
  } else {
    recalculateProductDiscount();
    applyCalculatedDiscountToProduct();
  }
}

function setProductDiscountPreset(pct) {
  activeProductDiscountPct = Number(pct) || 5;
  const input = document.getElementById("calc-sale-prod-discount-pct");
  if (input) input.value = activeProductDiscountPct;

  [5, 10, 15, 20, 25, 30].forEach(p => {
    const btn = document.getElementById(`btn-disc-preset-${p}`);
    if (btn) {
      if (p === activeProductDiscountPct) {
        btn.classList.add("active");
        btn.style.border = "2px solid #d97706";
        btn.style.background = "#fef3c7";
        btn.style.color = "#78350f";
      } else {
        btn.classList.remove("active");
        btn.style.border = "";
        btn.style.background = "";
        btn.style.color = "";
      }
    }
  });

  recalculateProductDiscount();
  applyCalculatedDiscountToProduct();
}

function recalculateProductDiscount() {
  const priceInput = document.getElementById("calc-sale-prod-price-usd");
  const pctInput = document.getElementById("calc-sale-prod-discount-pct");

  const salePrice = Math.max(1, parseFloat(priceInput?.value) || 40);
  const discountPct = Math.min(100, Math.max(1, parseFloat(pctInput?.value) || 5));

  // Tasa de conversión oficial: 1 USD de descuento = 50 WP
  const WP_PER_USD = 50;

  const maxDiscountUsd = Number((salePrice * (discountPct / 100)).toFixed(2));
  let requiredPoints = Math.round(maxDiscountUsd * WP_PER_USD);
  if (requiredPoints % 10 !== 0) {
    requiredPoints = Math.round(requiredPoints / 10) * 10;
  }
  if (requiredPoints < 10) requiredPoints = 10;

  const cashDue = Math.max(0, Number((salePrice - maxDiscountUsd).toFixed(2)));

  const discMaxEl = document.getElementById("calc-disc-max-usd");
  const cashDueEl = document.getElementById("calc-disc-cash-due");
  const suggestedPtsEl = document.getElementById("calc-disc-suggested-points");

  if (discMaxEl) discMaxEl.textContent = `-$${maxDiscountUsd.toFixed(2)} USD`;
  if (cashDueEl) cashDueEl.textContent = `$${cashDue.toFixed(2)} USD`;
  if (suggestedPtsEl) suggestedPtsEl.textContent = `${requiredPoints.toLocaleString()} WP`;

  return { salePrice, discountPct, maxDiscountUsd, cashDue, requiredPoints };
}

function applyCalculatedDiscountToProduct() {
  const { salePrice, discountPct, maxDiscountUsd, cashDue, requiredPoints } = recalculateProductDiscount();

  const costInput = document.getElementById("prod-cost");
  if (costInput) {
    costInput.value = requiredPoints;
    costInput.style.borderColor = "#d97706";
    costInput.style.boxShadow = "0 0 10px rgba(217, 119, 6, 0.35)";
    setTimeout(() => {
      costInput.style.borderColor = "";
      costInput.style.boxShadow = "";
    }, 1200);
  }

  // Guardar en campos ocultos del formulario
  const typeInput = document.getElementById("prod-reward-type");
  const priceInput = document.getElementById("prod-price-usd");
  const pctInput = document.getElementById("prod-max-discount-pct");
  const discUsdInput = document.getElementById("prod-max-discount-usd");
  const cashInput = document.getElementById("prod-cash-to-pay-usd");

  if (typeInput) typeInput.value = "PARTIAL_DISCOUNT";
  if (priceInput) priceInput.value = salePrice;
  if (pctInput) pctInput.value = discountPct;
  if (discUsdInput) discUsdInput.value = maxDiscountUsd;
  if (cashInput) cashInput.value = cashDue;

  // Actualizar pill de resumen
  const summaryPill = document.getElementById("prod-commercial-summary-pill");
  const pPrice = document.getElementById("pill-summary-price");
  const pPct = document.getElementById("pill-summary-pct");
  const pDisc = document.getElementById("pill-summary-disc");
  const pWp = document.getElementById("pill-summary-wp");
  const pCash = document.getElementById("pill-summary-cash");

  if (summaryPill) summaryPill.style.display = "block";
  if (pPrice) pPrice.textContent = `$${salePrice.toFixed(2)} USD`;
  if (pPct) pPct.textContent = `${discountPct}%`;
  if (pDisc) pDisc.textContent = `$${maxDiscountUsd.toFixed(2)} USD`;
  if (pWp) pWp.textContent = `${requiredPoints.toLocaleString()} WP`;
  if (pCash) pCash.textContent = `$${cashDue.toFixed(2)} USD`;
}

// -----------------------------------------------------------------------------
// CALCULADORA DE PUNTOS POR VENTA (FACTURA 4X1 // REGULADOR DE RETORNO)
// -----------------------------------------------------------------------------
let saleReturnBase = "profit"; // "profit" (50% de ganancia) | "revenue" (% de venta)
let saleReturnPct = 50; // 50% por defecto (Recomendado)
let activeSaleTargetSource = "pos"; // "pos" | "invoices" | "navbar"

function openSalePointsCalculatorModal(target = "pos") {
  activeSaleTargetSource = target;
  const modal = document.getElementById("modal-sale-calculator");
  if (!modal) return;

  if (target === "digital_invoice") {
    const curr = document.getElementById("s-inv-currency")?.value || "USD";
    const totEl = document.getElementById("s-inv-total-val");
    if (totEl) {
      const rawText = totEl.textContent || "";
      const numMatch = rawText.replace(/[^0-9.]/g, "");
      let totalNum = parseFloat(numMatch) || 0;
      if (curr === "NIO" && totalNum > 0) {
        totalNum = totalNum / 37.0;
      }
      const priceInput = document.getElementById("sale-calc-price-usd");
      if (priceInput && totalNum > 0) {
        priceInput.value = totalNum.toFixed(2);
      }
    }
  }

  modal.style.display = "flex";
  recalculateSalePoints();
}

function setSaleFreightPreset(rate) {
  const rateInput = document.getElementById("sale-calc-freight-rate");
  if (rateInput) rateInput.value = Number(rate).toFixed(2);
  recalculateSalePoints();
}

const SALE_BTN_ACTIVE = "border: 2px solid #059669; background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #065f46; box-shadow: 0 2px 8px rgba(5,150,105,0.15);";
const SALE_BTN_INACTIVE = "border: 2px solid #e2e8f0; background: #f8fafc; color: #64748b; box-shadow: none;";
const SALE_PILL_ACTIVE = "border: 2px solid #059669; background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #065f46; box-shadow: 0 2px 8px rgba(5,150,105,0.2);";
const SALE_PILL_INACTIVE = "border: 2px solid #e2e8f0; background: #f8fafc; color: #475569; box-shadow: none;";

function applySaleBtnStyle(el, active, pill) {
  if (!el) return;
  const s = active ? (pill ? SALE_PILL_ACTIVE : SALE_BTN_ACTIVE) : (pill ? SALE_PILL_INACTIVE : SALE_BTN_INACTIVE);
  s.split(";").forEach(r => {
    const [k, v] = r.split(":").map(x => x.trim());
    if (k && v) el.style[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  });
}

function setSaleReturnBase(base) {
  saleReturnBase = base;
  applySaleBtnStyle(document.getElementById("btn-sale-base-profit"), base === "profit", false);
  applySaleBtnStyle(document.getElementById("btn-sale-base-revenue"), base === "revenue", false);
  recalculateSalePoints();
}

function setSaleReturnPct(pct) {
  saleReturnPct = Number(pct) || 50;
  const pctInput = document.getElementById("sale-calc-return-pct");
  if (pctInput) pctInput.value = saleReturnPct;
  [5, 10, 20, 30, 40, 50, 60].forEach(p => {
    applySaleBtnStyle(document.getElementById(`btn-sale-pct-${p}`), p === saleReturnPct, true);
  });
  recalculateSalePoints();
}

function recalculateSalePoints() {
  const costInput = document.getElementById("sale-calc-cost-usd");
  const weightInput = document.getElementById("sale-calc-weight-lbs");
  const freightInput = document.getElementById("sale-calc-freight-rate");
  const extraInput = document.getElementById("sale-calc-extra-usd");
  const priceInput = document.getElementById("sale-calc-price-usd");
  const pctInput = document.getElementById("sale-calc-return-pct");

  const costBase = Math.max(0, parseFloat(costInput?.value) || 0);
  const weight = Math.max(0, parseFloat(weightInput?.value) || 0);
  const freightRate = Math.max(0, parseFloat(freightInput?.value) || 0);
  const extra = Math.max(0, parseFloat(extraInput?.value) || 0);
  const salePrice = Math.max(0, parseFloat(priceInput?.value) || 0);
  const returnPct = Math.max(1, parseFloat(pctInput?.value) || saleReturnPct || 50);

  const freightCost = weight * freightRate;
  const landedCost = costBase + freightCost + extra;
  const grossProfit = Math.max(0, salePrice - landedCost);
  const marginPct = salePrice > 0 ? ((grossProfit / salePrice) * 100) : 0;

  // Valor retornado en premios ($ USD)
  let rewardValUsd = 0;
  if (saleReturnBase === "profit") {
    rewardValUsd = grossProfit * (returnPct / 100);
  } else {
    // Sobre el total del precio de venta
    rewardValUsd = salePrice * (returnPct / 100);
  }

  // Conversión a Wired Points (WP): 1 USD de premio físico en catálogo = 50 WP (ej. premio de $20 Landed cuesta 1,000 WP)
  const WP_PER_REWARD_USD = 50; 
  let suggestedPoints = 0;
  if (rewardValUsd > 0) {
    suggestedPoints = Math.max(1, Math.round(rewardValUsd * WP_PER_REWARD_USD));
  }

  const costOfPointsInRewards = suggestedPoints / WP_PER_REWARD_USD;
  const retainedProfit = Math.max(0, grossProfit - costOfPointsInRewards);

  // Actualizar elementos DOM
  const resLandedEl = document.getElementById("sale-calc-res-landed");
  const resProfitEl = document.getElementById("sale-calc-res-profit");
  const resMarginEl = document.getElementById("sale-calc-res-margin");
  const badgeEl = document.getElementById("sale-calc-return-badge");
  const rewardValEl = document.getElementById("sale-calc-reward-val");
  const baseNoteEl = document.getElementById("sale-calc-base-note");
  const retainedProfitEl = document.getElementById("sale-calc-retained-profit");
  const suggestedPtsEl = document.getElementById("sale-calc-suggested-points");

  if (resLandedEl) resLandedEl.textContent = `$${landedCost.toFixed(2)} USD`;
  if (resProfitEl) resProfitEl.textContent = `$${grossProfit.toFixed(2)} USD`;
  if (resMarginEl) resMarginEl.textContent = `${marginPct.toFixed(1)}% margen`;
  if (badgeEl) {
    badgeEl.textContent = saleReturnBase === "profit" 
      ? `${returnPct}% DE GANANCIA REGRESADO EN PUNTOS` 
      : `${returnPct}% DE VENTA REGRESADO EN PUNTOS`;
  }
  if (rewardValEl) rewardValEl.textContent = `$${rewardValUsd.toFixed(2)} USD`;
  if (baseNoteEl) {
    baseNoteEl.textContent = saleReturnBase === "profit" 
      ? `(${returnPct}% de ganancia $${grossProfit.toFixed(2)})`
      : `(${returnPct}% de venta $${salePrice.toFixed(2)})`;
  }
  if (retainedProfitEl) retainedProfitEl.textContent = `$${retainedProfit.toFixed(2)} USD`;
  if (suggestedPtsEl) suggestedPtsEl.textContent = `${suggestedPoints.toLocaleString()} WP`;

  return { landedCost, grossProfit, marginPct, rewardValUsd, retainedProfit, suggestedPoints };
}

function applySalePointsToActiveTarget() {
  const { suggestedPoints } = recalculateSalePoints();

  if (activeSaleTargetSource === "digital_invoice") {
    const ptsInput = document.getElementById("s-inv-points-val");
    const chk = document.getElementById("s-inv-enable-points");
    if (chk) {
      chk.checked = true;
      toggleSingleInvoicePointsFields(true);
    }
    if (ptsInput) {
      ptsInput.value = suggestedPoints;
      ptsInput.style.borderColor = "#00e5ff";
      ptsInput.style.boxShadow = "0 0 14px rgba(0, 229, 255, 0.5)";
      setTimeout(() => {
        ptsInput.style.borderColor = "";
        ptsInput.style.boxShadow = "";
      }, 1500);
    }
    closeModal("modal-sale-calculator");
    showToast(`⚡ Asignados ${suggestedPoints.toLocaleString()} WP a la Factura Digital.`, "success");
    return;
  }

  const assignInput = document.getElementById("input-assign-points");
  if (assignInput) {
    assignInput.value = suggestedPoints;
    assignInput.style.borderColor = "#059669";
    assignInput.style.boxShadow = "0 0 10px rgba(5, 150, 105, 0.35)";
    setTimeout(() => {
      assignInput.style.borderColor = "";
      assignInput.style.boxShadow = "";
    }, 1200);
  }
  closeModal("modal-sale-calculator");
  showToast(`⚡ Asignados ${suggestedPoints.toLocaleString()} WP calculados para esta factura.`, "success");
}

function openNewProductModal() {
  const modal = document.getElementById("modal-new-product");
  if (!modal) return;
  modal.style.display = "flex";
  setProductPublicationMode("FREE_REWARD");
  setTimeout(() => {
    const input = document.getElementById("prod-title");
    if (input) input.focus();
  }, 100);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

function validateLotCountInput(input) {
  let val = parseInt(input?.value, 10);
  const helper = document.getElementById("lot-count-helper");
  if (!helper) return;

  if (isNaN(val) || val <= 0) {
    helper.textContent = "⚠️ Ingresa una cantidad válida (múltiplos de 4).";
    helper.style.color = "#dc2626";
    return;
  }

  const sheets = Math.ceil(val / 4);
  const exact = val % 4 === 0;

  if (exact) {
    helper.innerHTML = `📐 <strong>${sheets} pliegos carta</strong> = ${val} facturas a doble cara con QR únicos`;
    helper.style.color = "var(--primary)";
  } else {
    const recommended = sheets * 4;
    helper.innerHTML = `⚠️ No es múltiplo de 4. Se redondeará a <strong>${recommended} facturas (${sheets} pliegos carta completos)</strong>`;
    helper.style.color = "#d97706";
  }
}

function enforceMultipleOfFour(input) {
  let val = parseInt(input?.value, 10);
  if (isNaN(val) || val < 4) val = 4;
  if (val % 4 !== 0) {
    const rounded = Math.ceil(val / 4) * 4;
    input.value = rounded;
    showToast(`Cantidad ajustada a ${rounded} facturas (${rounded / 4} pliegos carta completos de 4x1).`, "info");
  }
  validateLotCountInput(input);
}

function openPurgeModal() {
  const modal = document.getElementById("modal-purge-invoices");
  if (!modal) return;
  const countBadge = document.getElementById("purge-tokens-count-badge");
  const count = (vm.tokens || []).length;
  if (countBadge) countBadge.textContent = `${count} ${count === 1 ? 'factura registrada' : 'facturas registradas'}`;
  modal.style.display = "flex";
}

async function executePurgeInvoices() {
  closeModal("modal-purge-invoices");
  showToast("Ejecutando purga atómica en Firestore y almacenamiento local...", "info");
  try {
    const res = await vm.purgeAllInvoiceTokens();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderTokensTable(vm.tokens);
    showToast("✓ Base de datos purgada: facturas eliminadas y correlativo restablecido a #0001.", "success");
  } catch (err) {
    showToast("❌ Error al limpiar base de datos: " + err.message, "error");
  }
}

function openPurgeAllDbModal() {
  const modal = document.getElementById("modal-purge-all-db");
  if (!modal) return;
  modal.style.display = "flex";
}

async function executePurgeAllDb() {
  closeModal("modal-purge-all-db");
  showToast("Ejecutando purga total de la base de datos (Firestore + Local)...", "info");
  try {
    const res = await vm.purgeEntireDatabase();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderDashboard(vm);
    renderCatalogTable(vm.catalog);
    renderTokensTable(vm.tokens);
    renderUsersTable(vm.users);
    renderVouchersTable(vm.vouchers);

    showToast("✓ Base de datos completamente purgada. El PIN de Admin sigue intacto.", "success");
  } catch (err) {
    showToast("❌ Error al purgar la base de datos: " + err.message, "error");
  }
}

let currentProductBase64 = null;

function handleProductImageFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (!file.type.startsWith("image/")) {
    showToast("⚠️ Selecciona un archivo de imagen válido (JPG, PNG, WebP).", "error");
    return;
  }

  showToast("Optimizando y convirtiendo imagen a Base64 gratuito...", "info");

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 500;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const base64Data = canvas.toDataURL("image/jpeg", 0.78);
      currentProductBase64 = base64Data;

      const previewBox = document.getElementById("prod-img-preview-box");
      const previewImg = document.getElementById("prod-img-preview");
      const nameEl = document.getElementById("prod-img-name");
      const sizeEl = document.getElementById("prod-img-size");
      const imgInput = document.getElementById("prod-img");

      if (previewImg) previewImg.src = base64Data;
      if (nameEl) nameEl.textContent = file.name;
      const approxKb = Math.round(base64Data.length * 0.75 / 1024);
      if (sizeEl) sizeEl.textContent = `✓ Optimizado (${width}×${height}px · ~${approxKb} KB en Base64)`;
      if (previewBox) previewBox.style.display = "flex";
      if (imgInput) imgInput.value = base64Data;

      showToast("✓ Imagen optimizada y lista para guardar en la base de datos.", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearProductImageUpload() {
  currentProductBase64 = null;
  const fileInput = document.getElementById("prod-file-input");
  if (fileInput) fileInput.value = "";
  const imgInput = document.getElementById("prod-img");
  if (imgInput) imgInput.value = "";
  const previewBox = document.getElementById("prod-img-preview-box");
  if (previewBox) previewBox.style.display = "none";
}

function previewProductImageFromUrl(url) {
  const val = (url || "").trim();
  const previewBox = document.getElementById("prod-img-preview-box");
  const previewImg = document.getElementById("prod-img-preview");
  const nameEl = document.getElementById("prod-img-name");
  const sizeEl = document.getElementById("prod-img-size");

  if (!val) {
    if (previewBox) previewBox.style.display = "none";
    return;
  }

  if (val.startsWith("data:image")) {
    currentProductBase64 = val;
  } else {
    currentProductBase64 = null;
  }

  if (previewImg) previewImg.src = val;
  if (nameEl) nameEl.textContent = val.startsWith("data:") ? "Imagen Base64" : "Imagen Remota";
  if (sizeEl) sizeEl.textContent = val.startsWith("data:") ? "Almacenamiento Local" : "URL Externa";
  if (previewBox) previewBox.style.display = "flex";
}

let currentScannedCustomer = null;

function posCustomerQuickAdjust() {
  if (!currentScannedCustomer) return;
  openAdjustPointsModal(
    currentScannedCustomer.uid,
    currentScannedCustomer.displayName || "Socio",
    currentScannedCustomer.wiredPoints || 0
  );
}

function posCustomerViewLedger() {
  if (!currentScannedCustomer) return;
  openUserLedgerModal(
    currentScannedCustomer.uid,
    currentScannedCustomer.displayName || "Socio"
  );
}

async function saveProductAdmin() {
  const title = (document.getElementById("prod-title").value || "").trim();
  const pointsCost = parseInt(document.getElementById("prod-cost").value, 10);
  const stock = parseInt(document.getElementById("prod-stock").value, 10) || 1;
  const imageUrl = currentProductBase64 || (document.getElementById("prod-img").value || "").trim();
  const description = (document.getElementById("prod-desc").value || "").trim();

  let rewardType = (document.getElementById("prod-reward-type")?.value) || activeProductMode || "FREE_REWARD";
  let priceUsd = parseFloat(document.getElementById("prod-price-usd")?.value) || 0;
  let maxDiscountPct = parseFloat(document.getElementById("prod-max-discount-pct")?.value) || 0;
  let maxDiscountUsd = parseFloat(document.getElementById("prod-max-discount-usd")?.value) || 0;
  let cashToPayUsd = parseFloat(document.getElementById("prod-cash-to-pay-usd")?.value) || 0;

  if (activeProductMode === "PARTIAL_DISCOUNT" || rewardType === "PARTIAL_DISCOUNT") {
    rewardType = "PARTIAL_DISCOUNT";
    const calc = recalculateProductDiscount();
    priceUsd = calc.salePrice;
    maxDiscountPct = calc.discountPct;
    maxDiscountUsd = calc.maxDiscountUsd;
    cashToPayUsd = calc.cashDue;
  }

  if (!title) {
    showToast("⚠️ El nombre del producto es obligatorio.", "error");
    return;
  }
  if (isNaN(pointsCost) || pointsCost <= 0) {
    showToast("⚠️ Ingresa un costo válido en Wired Points.", "error");
    return;
  }

  try {
    await vm.addReward({
      title,
      rewardType,
      priceUsd,
      maxDiscountPct,
      maxDiscountUsd,
      cashToPayUsd,
      pointsCost,
      stock,
      imageUrl,
      description
    });
    closeModal("modal-new-product");
    document.getElementById("prod-title").value = "";
    document.getElementById("prod-cost").value = "";
    document.getElementById("prod-stock").value = "1";
    document.getElementById("prod-img").value = "";
    document.getElementById("prod-desc").value = "";
    document.getElementById("prod-reward-type").value = "FREE_REWARD";
    document.getElementById("prod-price-usd").value = "0";
    document.getElementById("prod-max-discount-pct").value = "0";
    document.getElementById("prod-max-discount-usd").value = "0";
    document.getElementById("prod-cash-to-pay-usd").value = "0";
    const pill = document.getElementById("prod-commercial-summary-pill");
    if (pill) pill.style.display = "none";
    clearProductImageUpload();
    showToast("✓ Producto registrado con éxito en el catálogo.", "success");
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

let currentPreviewMode = "both";

function switchPreviewMode(mode) {
  currentPreviewMode = mode;
  const inputEl = document.getElementById("print-duplex-mode");
  if (inputEl) inputEl.value = mode;

  ["front", "back", "both"].forEach(m => {
    const btn = document.getElementById("btn-preview-mode-" + m);
    if (btn) {
      if (m === mode) {
        btn.classList.add("active");
        btn.style.background = "#0f172a";
        btn.style.color = "#ffffff";
      } else {
        btn.classList.remove("active");
        btn.style.background = "#f8fafc";
        btn.style.color = "#475569";
      }
    }
  });

  updatePreviewSheetDimensions();
}

function updatePreviewSheetDimensions() {
  const dims = getSelectedPaperDimensions("preview");
  const select = document.getElementById("preview-paper-size");
  const customBox = document.getElementById("preview-custom-dims");
  const label = document.getElementById("preview-dims-label");

  if (customBox) customBox.style.display = select.value === "custom" ? "flex" : "none";
  if (label) label.textContent = dims.name + ": " + dims.widthMm + " mm × " + dims.heightMm + " mm";

  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length >= 4)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length >= 4
        ? vm.tokens.slice(0, 4)
        : [
            { tokenCode: "WP-2026-F0104-A98B", invoiceFolio: "0104", pointsValue: 0, securityPin: "4891" },
            { tokenCode: "WP-2026-F0105-C34D", invoiceFolio: "0105", pointsValue: 0, securityPin: "7124" },
            { tokenCode: "WP-2026-F0106-E56F", invoiceFolio: "0106", pointsValue: 0, securityPin: "8390" },
            { tokenCode: "WP-2026-F0107-G78H", invoiceFolio: "0107", pointsValue: 0, securityPin: "1923" }
          ]);

  const iframe = document.getElementById("sheet-preview-iframe");
  if (iframe) {
    const docHtml = InvoiceTemplateService.generatePrintDocument(tokensToRender, dims, mode, false);
    iframe.srcdoc = docHtml;
  }
}

function downloadPrintSheetHtml() {
  const dims = getSelectedPaperDimensions("preview");
  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length >= 4)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length >= 4 ? vm.tokens.slice(0, 4) : []);

  const docHtml = InvoiceTemplateService.generatePrintDocument(tokensToRender, dims, mode, false);
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pliego_facturas_meltydeays_4x1_${mode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("✓ Archivo de pliego 4x1 descargado con éxito.", "success");
}

function openPrintSheetModal() {
  if (currentSheetTokens.length === 0 && vm.tokens.length > 0) {
    currentSheetTokens = vm.tokens.slice(0, 4);
  }

  const mainPaperSize = document.getElementById("lot-paper-size")?.value || "letter";
  const modalSelect = document.getElementById("preview-paper-size");
  if (modalSelect) modalSelect.value = mainPaperSize;

  switchPreviewMode("both");

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

let selectedTokenForActions = null;

function openTokenActionsModal(tokenCode) {
  const token = (vm.tokens || []).find(t => t.tokenCode === tokenCode);
  if (!token) return;
  selectedTokenForActions = token;

  const modal = document.getElementById("modal-token-actions");
  if (!modal) return;

  const titleEl = document.getElementById("token-actions-title");
  const codeEl = document.getElementById("token-actions-code");
  const pinEl = document.getElementById("token-actions-pin-badge");
  const statusRow = document.getElementById("token-actions-status-row");
  const btnAssign = document.getElementById("btn-token-opt-assign");

  if (titleEl) titleEl.textContent = `Factura #MD-2026-${token.invoiceFolio}`;
  if (codeEl) codeEl.textContent = token.tokenCode;
  if (pinEl) pinEl.textContent = `PIN: ${token.securityPin || "••••"}`;

  if (statusRow) {
    statusRow.innerHTML = `
      <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px; margin-right: 4px;">
        ${token.pointsValue > 0 ? `⚡ ${token.pointsValue} WP` : '⏳ Sin Asignar (0 WP)'}
      </span>
      <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px;">
        ${token.isClaimed() ? '✔ RECLAMADO' : (token.isActive() ? '● SIN RECLAMAR' : '⏳ EN ESPERA DE VALOR')}
      </span>
    `;
  }

  if (btnAssign) {
    if (token.isClaimed()) {
      btnAssign.style.display = "none";
    } else {
      btnAssign.style.display = "inline-flex";
      btnAssign.innerHTML = `<span>⚡</span> <strong>${token.isPendingAssignment() ? 'Cargar Puntos de Venta' : 'Modificar Puntos Asignados'}</strong>`;
    }
  }

  const btnViewInvoice = document.getElementById("btn-token-opt-view-invoice");
  const btnViewLabel = document.getElementById("btn-token-opt-view-invoice-label");
  const btnEditInvoice = document.getElementById("btn-token-opt-edit-invoice");
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (btnViewInvoice) {
    btnViewInvoice.style.display = "inline-flex";
    if (btnViewLabel) btnViewLabel.textContent = hasInvData ? "Ver Factura Digital (Datos Guardados)" : "Generar / Ver Factura Digital (1 Página Completa)";
  }
  if (btnEditInvoice) {
    btnEditInvoice.style.display = hasInvData ? "inline-flex" : "none";
  }

  modal.style.display = "flex";
}

function executeTokenOptAssign() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    promptAssignPoints(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio);
  }
}

function executeTokenOptQr() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    viewSingleTokenQr(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio, selectedTokenForActions.pointsValue, selectedTokenForActions.securityPin);
  }
}

function executeTokenOptCopyLink() {
  if (selectedTokenForActions) {
    const url = "https://meltydeays-wired-club.vercel.app/?claim=" + selectedTokenForActions.tokenCode;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("✓ Enlace de auto-reclamo copiado al portapapeles", "success");
      });
    }
  }
}

function executeTokenOptTestUrl() {
  if (selectedTokenForActions) {
    const url = "https://meltydeays-wired-club.vercel.app/?claim=" + selectedTokenForActions.tokenCode;
    window.open(url, "_blank");
  }
}

function executeTokenOptDigitalInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode);
  }
}

function executeTokenOptViewInvoice() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  closeModal("modal-token-actions");
  if (hasInvData) {
    const printDims = getSelectedPaperDimensions ? getSelectedPaperDimensions("preview") : null;
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(
      token.invoiceData,
      printDims,
      false,
      token.invoiceData.selectedLainDesignIdx
    );
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(docHtml); w.document.close(); }
    else showToast("⚠️ Habilita ventanas emergentes para ver la factura.", "error");
  } else {
    openSingleDigitalInvoiceModal(token.tokenCode);
  }
}

function executeTokenOptEditInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode, true);
  }
}

function handleInvoiceBtnClick(tokenCode) {
  const token = (vm.tokens || []).find(t => t.tokenCode === tokenCode);
  if (!token) { openSingleDigitalInvoiceModal(tokenCode); return; }
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (hasInvData) {
    const printDims = getSelectedPaperDimensions ? getSelectedPaperDimensions("preview") : null;
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(
      token.invoiceData,
      printDims,
      false,
      token.invoiceData.selectedLainDesignIdx
    );
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(docHtml); w.document.close(); }
    else showToast("⚠️ Habilita ventanas emergentes.", "error");
  } else {
    openSingleDigitalInvoiceModal(tokenCode);
  }
}

// ========================================================
// CONTROLADOR DE FACTURA DIGITAL INDIVIDUAL (VENTA CASUAL)
// ========================================================
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
      if (inv.date && dateInput) dateInput.value = inv.date;
      if (inv.time && timeInput) timeInput.value = inv.time;
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
  row.style.borderBottom = "1px solid #e2e8f0";
  row.innerHTML = `
    <td style="padding: 7px 8px; text-align: center;">
      <input type="number" class="form-input s-row-cant" value="${cant}" min="1" step="1"
             style="height: 34px; width: 60px; text-align: center; font-family: var(--font-mono); font-weight: 800; font-size: 0.88rem; padding: 2px 4px; border: 1.5px solid var(--dark); border-radius: 4px;"
             oninput="calcSingleInvoiceTotals()">
    </td>
    <td style="padding: 7px 8px;">
      <input type="text" class="form-input s-row-desc" value="${desc.replace(/"/g, '&quot;')}" placeholder="Ej: Laptop Gaming ASUS / Mando Inalámbrico / Combo Gamer"
             style="height: 34px; font-weight: 700; font-size: 0.84rem; padding: 2px 10px; border: 1.5px solid var(--dark); border-radius: 4px;">
    </td>
    <td style="padding: 7px 8px; text-align: right;">
      <input type="number" class="form-input s-row-price" value="${Number(price).toFixed(2)}" min="0" step="0.5"
             style="height: 34px; width: 120px; text-align: right; font-family: var(--font-mono); font-weight: 800; font-size: 0.88rem; padding: 2px 8px; border: 1.5px solid var(--dark); border-radius: 4px;"
             oninput="calcSingleInvoiceTotals()">
    </td>
    <td style="padding: 7px 8px; text-align: right;">
      <strong class="s-row-total" style="font-family: var(--font-mono); font-size: 0.92rem; font-weight: 900; color: #0f172a;">$ 0.00</strong>
    </td>
    <td style="padding: 7px 8px; text-align: center;">
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
  const rows = document.querySelectorAll("#s-inv-items-table-body tr");
  rows.forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant")?.value) || 1;
    const price = parseFloat(tr.querySelector(".s-row-price")?.value) || 0;
    const rowTot = cant * price;
    subtotal += rowTot;
    const totEl = tr.querySelector(".s-row-total");
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
  document.querySelectorAll("#s-inv-items-table-body tr").forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant")?.value) || 1;
    const price = parseFloat(tr.querySelector(".s-row-price")?.value) || 0;
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
  document.querySelectorAll("#s-inv-items-table-body tr").forEach(tr => {
    const cant = parseFloat(tr.querySelector(".s-row-cant")?.value) || 1;
    const desc = tr.querySelector(".s-row-desc")?.value.trim();
    const price = parseFloat(tr.querySelector(".s-row-price")?.value) || 0;
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

  const pointsEnabled = document.getElementById("s-inv-enable-points")?.checked;
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
      tokenCode: pointsVal > 0 ? ("WP-2026-F" + folio + "-PREVIEW") : null
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
      const claimUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + result.token.tokenCode;
      const textMsg = encodeURIComponent(
        `¡Hola ${clientName}! 👋 Gracias por tu compra en MeltyDeays STORE.\n\n` +
        `🧾 Factura Electrónica: #MD-2026-${result.invoicePayload.folio}\n` +
        `💰 Total Facturado: ${currency === "NIO" ? "C$" : "$"} ${total.toFixed(2)}\n` +
        (pointsVal > 0 ? `⚡ Puntos Wired Points acreditados: +${pointsVal} WP\n📲 Reclama tus puntos aquí: ${claimUrl}\n` : "") +
        `🛡️ Garantía oficial MeltyDeays: ${warrantyText}\n\n` +
        `¡Agradecemos tu preferencia!`
      );
      window.open("https://wa.me/" + (rawPhone || "50558438412") + "?text=" + textMsg, "_blank");
    }

    renderTokensTable(vm.tokens);
    const statTokens = document.getElementById("stat-tokens-count");
    if (statTokens) statTokens.textContent = vm.tokens.length;

    showToast(`✓ Factura #MD-2026-${result.invoicePayload.folio} guardada exitosamente en BD.`, "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
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
    filtered = filtered.filter(u => {
      const t = (u.tier || "NAVI_USER").toUpperCase();
      if (usersTierFilter === "NAVI") return t.includes("NAVI");
      if (usersTierFilter === "RUNNER") return t.includes("RUNNER");
      if (usersTierFilter === "ELITE") return t.includes("ELITE");
      if (usersTierFilter === "DEUS") return t.includes("DEUS");
      return t === usersTierFilter;
    });
  }
  if (usersFilterQuery) {
    const q = usersFilterQuery.toLowerCase();
    const qClean = q.replace(/\D/g, "");
    filtered = filtered.filter(u => {
      const uPhone = (u.phone || "").toLowerCase();
      const uPhoneClean = (u.phone || "").replace(/\D/g, "");
      const uPhoneFormatted = FirestoreService.formatPhoneDisplay(u.phone).toLowerCase();
      return (
        (u.displayName || "").toLowerCase().includes(q) ||
        uPhone.includes(q) ||
        (qClean && uPhoneClean.includes(qClean)) ||
        uPhoneFormatted.includes(q) ||
        (u.uid || "").toLowerCase().includes(q) ||
        (u.memberCode || "").toLowerCase().includes(q)
      );
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">👥</div>
          <strong>No se encontraron socios con los filtros aplicados.</strong>
          <div style="font-size: 0.8rem; margin-top: 4px;">Los clientes aparecerán automáticamente aquí cuando se registren al escanear una factura.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const tier = (u.tier || "NAVI_USER").toUpperCase();
    let tierBadgeClass = "badge-tier-navi";
    let tierDisplay = "NAVI";
    if (tier.includes("RUNNER")) { tierBadgeClass = "badge-tier-runner"; tierDisplay = "RUNNER"; }
    else if (tier.includes("ELITE")) { tierBadgeClass = "badge-tier-elite"; tierDisplay = "ELITE"; }
    else if (tier.includes("DEUS")) { tierBadgeClass = "badge-tier-deus"; tierDisplay = "DEUS"; }

    const isBanned = u.status === "BANNED";
    const statusBadge = isBanned 
      ? `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border-color:#f87171; font-size:0.65rem; margin-left:4px;">🚫 SUSPENDIDO</span>`
      : "";

    const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "Reciente";

    const phoneDisplay = u.phone ? ("+505 " + FirestoreService.formatPhoneDisplay(u.phone)) : "-";

    return `
      <tr style="${isBanned ? 'background:#fff1f2;' : ''}">
        <td>
          <strong style="color:var(--dark); font-size:0.9rem;">${u.displayName || "Socio Sin Nombre"}</strong>
          <div style="font-size:0.72rem; color:var(--primary); font-family:var(--font-mono); font-weight:700;">${u.memberCode || u.uid}</div>
        </td>
        <td>
          <div style="font-family:var(--font-mono); font-size:0.8rem; color:var(--dark); font-weight:700;">📞 ${phoneDisplay}</div>
          <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; margin-top:3px;">
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--gray-500); font-size:0.7rem;">PIN:</span>
            <strong style="font-family:var(--font-mono); font-size:0.82rem; font-weight:800; background:#e0e7ff; color:#312e81; padding:1px 6px; border-radius:3px; border:1px solid #c7d2fe; letter-spacing:1px;" title="PIN de acceso">${u.pin || "1234"}</strong>
            <button class="btn-secondary" style="padding:1px 5px; font-size:0.7rem; line-height:1; cursor:pointer;" onclick="openEditPinModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.pin || ''}', '${u.phone || ''}')" title="Modificar PIN">✏️</button>
          </div>
        </td>
        <td>
          <span class="${tierBadgeClass}">${tierDisplay}</span>
          ${statusBadge}
        </td>
        <td><strong style="font-family:var(--font-mono); font-size:0.95rem; color:#4338ca;">${(u.wiredPoints || 0).toLocaleString()} WP</strong></td>
        <td><span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--gray-700);">${(u.lifetimePoints || 0).toLocaleString()} WP</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${joinDate}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 3px;" onclick="openAdjustPointsModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', ${u.wiredPoints || 0})" title="Cargar o Deducir Puntos">
            ⚡ +/- Puntos
          </button>
          <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 3px;" onclick="openUserLedgerModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}')" title="Ver Historial Contable">
            📜 Historial
          </button>
          <button class="btn-secondary" style="padding: 3px 7px; font-size: 0.72rem; margin-right: 3px; ${isBanned ? 'color:#059669; border-color:#059669;' : 'color:#d97706; border-color:#d97706;'}" onclick="toggleBanUserAdmin('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.status || 'ACTIVE'}')" title="${isBanned ? 'Reactivar Socio' : 'Suspender/Banear Socio'}">
            ${isBanned ? '✓ Activar' : '🚫 Banear'}
          </button>
          <button class="btn-secondary" style="padding: 3px 7px; font-size: 0.72rem; color:#dc2626; border-color:#ef4444;" onclick="openDeleteUserModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.phone || ''}')" title="Eliminar Socio Permanentemente">
            🗑️
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
  const tiers = ["ALL", "NAVI", "RUNNER", "ELITE", "DEUS"];
  tiers.forEach(t => {
    const btn = document.getElementById("tier-btn-" + t);
    if (btn) {
      if (t === tier) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });
  renderUsersTable(vm.users);
}

function toggleAdjustType(direction) {
  selectAdjustDirection(direction || "ADD");
}

function selectAdjustDirection(direction) {
  const addBtn = document.getElementById("btn-toggle-add");
  const subBtn = document.getElementById("btn-toggle-sub");
  const typeInput = document.getElementById("adjust-type-val");
  const submitBtn = document.getElementById("btn-submit-adjust");

  if (typeInput) typeInput.value = direction;

  if (direction === "ADD") {
    if (addBtn) addBtn.className = "lain-toggle-btn active-add";
    if (subBtn) subBtn.className = "lain-toggle-btn";
    if (submitBtn) {
      submitBtn.textContent = "⚡ OTORGAR PUNTOS (+)";
      submitBtn.style.background = "var(--primary)";
    }
  } else {
    if (addBtn) addBtn.className = "lain-toggle-btn";
    if (subBtn) subBtn.className = "lain-toggle-btn active-sub";
    if (submitBtn) {
      submitBtn.textContent = "➖ DEDUCIR PUNTOS (-)";
      submitBtn.style.background = "#e11d48";
    }
  }
}

function openAdjustPointsModal(uid, name, currentPts) {
  const modal = document.getElementById("modal-adjust-points");
  if (!modal) return;
  document.getElementById("adjust-user-uid").value = uid;
  document.getElementById("adjust-user-name").textContent = name;
  document.getElementById("adjust-user-current").textContent = currentPts.toLocaleString() + " WP";
  document.getElementById("adjust-points-amount").value = "";
  document.getElementById("adjust-points-reason").value = "";
  selectAdjustDirection("ADD");
  modal.style.display = "flex";
  setTimeout(() => {
    const input = document.getElementById("adjust-points-amount");
    if (input) input.focus();
  }, 100);
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
  const reason = document.getElementById("adjust-points-reason").value.trim() || "Ajuste Directo de Mostrador";
  const type = document.getElementById("adjust-type-val")?.value || "ADD";

  if (!amount || isNaN(amount) || amount <= 0) {
    showToast("⚠️ Ingresa una cantidad de puntos válida mayor a 0.", "error");
    return;
  }

  const delta = type === "ADD" ? amount : -amount;

  try {
    const res = await vm.adjustUserPoints(uid, delta, reason);
    closeModal("modal-adjust-points");
    const updatedUser = res.user;
    showToast(`✓ Saldo actualizado: ${updatedUser.displayName} ahora tiene ${updatedUser.wiredPoints.toLocaleString()} WP`, "success");
    renderUsersTable(vm.users);
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--gray-500);">Cargando libro contable...</td></tr>`;
  }
  modal.style.display = "flex";

  const ledger = vm.getUserLedger(uid);
  if (!ledger || ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono);">
          [LEDGER VACÍO] No hay movimientos registrados para este socio aún.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ledger.map(entry => {
    const isCredit = (entry.amount || 0) >= 0;
    const diffClass = isCredit ? "ledger-credit" : "ledger-debit";
    const sign = isCredit ? "+" : "-";
    const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString("es-ES") : "-";

    return `
      <tr>
        <td style="font-size:0.75rem; color:var(--gray-600); font-family:var(--font-mono);">${dateStr}</td>
        <td><span class="badge-navi" style="font-size:0.65rem;">${entry.type || "AJUSTE"}</span></td>
        <td style="color:var(--dark); font-weight:600;">${entry.reason || "-"}</td>
        <td class="${diffClass}" style="text-align:right;">${sign}${Math.abs(entry.amount || 0).toLocaleString()} WP</td>
        <td style="text-align:right; font-family:var(--font-mono); font-weight:800; color:var(--dark);">${(entry.balanceAfter || 0).toLocaleString()} WP</td>
      </tr>
    `;
  }).join("");
}

function toggleNewUserPinVisibility() {
  const pinInput = document.getElementById("new-user-pin");
  if (!pinInput) return;
  pinInput.type = pinInput.type === "password" ? "text" : "password";
}

function updateNewUserPreview() {
  const nameEl = document.getElementById("new-user-name");
  const phoneEl = document.getElementById("new-user-phone");
  const pinEl = document.getElementById("new-user-pin");
  const ptsEl = document.getElementById("new-user-points");

  const nameVal = nameEl ? nameEl.value.trim() : "";
  const phoneVal = phoneEl ? phoneEl.value.trim() : "";
  const pinVal = pinEl ? pinEl.value.trim() : "";
  const ptsVal = ptsEl ? (parseInt(ptsEl.value, 10) || 0) : 0;

  const pName = document.getElementById("preview-new-user-name");
  const pPhone = document.getElementById("preview-new-user-phone");
  const pPin = document.getElementById("preview-new-user-pin");
  const pUid = document.getElementById("preview-new-user-uid");
  const pPts = document.getElementById("preview-new-user-points");

  const clean = FirestoreService.normalizePhone(phoneVal);
  if (pName) pName.textContent = nameVal || "Socio Sin Nombre";
  if (pPhone) pPhone.textContent = "📞 Tel: " + (clean ? ("+505 " + FirestoreService.formatPhoneDisplay(clean)) : "+505 --------");
  if (pPin) pPin.textContent = "🔑 PIN: " + (pinVal || "----");
  if (pUid) pUid.textContent = "UID: CLIENT-" + (clean || "--------");
  if (pPts) pPts.textContent = "Saldo: " + ptsVal.toLocaleString() + " WP";
}

function generateNewUserRandomPin() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const pinInput = document.getElementById("new-user-pin");
  if (pinInput) {
    pinInput.value = pin;
    pinInput.type = "text";
  }
  updateNewUserPreview();
}

function setNewUserQuickPoints(points) {
  const ptsInput = document.getElementById("new-user-points");
  if (ptsInput) ptsInput.value = points;
  updateNewUserPreview();
}

function openNewUserModal() {
  const modal = document.getElementById("modal-new-user");
  if (!modal) return;
  const nameInput = document.getElementById("new-user-name");
  const phoneInput = document.getElementById("new-user-phone");
  const pinInput = document.getElementById("new-user-pin");
  const ptsInput = document.getElementById("new-user-points");

  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (pinInput) {
    pinInput.value = "110805";
    pinInput.type = "text";
  }
  if (ptsInput) ptsInput.value = "0";

  updateNewUserPreview();
  modal.style.display = "flex";
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
}

async function saveNewUserAdmin() {
  const name = document.getElementById("new-user-name").value.trim();
  const phone = document.getElementById("new-user-phone").value.trim();
  const pin = document.getElementById("new-user-pin").value.trim() || "110805";
  const points = parseInt(document.getElementById("new-user-points").value, 10) || 0;

  if (!name) {
    showToast("⚠️ El nombre del socio es obligatorio.", "error");
    return;
  }
  const cleanPhone = FirestoreService.normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 8) {
    showToast("⚠️ Ingresa un número telefónico válido de 8 dígitos (ej: 5843-8412). El prefijo +505 es automático.", "error");
    return;
  }
  if (pin.length < 4 || pin.length > 8) {
    showToast("⚠️ El PIN de seguridad debe tener entre 4 y 8 dígitos.", "error");
    return;
  }

  try {
    const user = await vm.registerUserFromAdmin({ displayName: name, phone: cleanPhone, pin, initialPoints: points });
    closeModal("modal-new-user");
    showToast(`✓ Socio ${user.displayName} registrado con éxito. PIN: ${user.pin}`, "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function openEditPinModal(uid, name, currentPin, phone) {
  const modal = document.getElementById("modal-edit-user-pin");
  if (!modal) return;
  document.getElementById("edit-pin-target-uid").value = uid;
  document.getElementById("edit-pin-user-name").textContent = name || "Socio";
  document.getElementById("edit-pin-user-phone").textContent = phone ? ("+505 " + FirestoreService.formatPhoneDisplay(phone)) : "-";
  document.getElementById("edit-pin-user-current").textContent = currentPin || "----";
  const input = document.getElementById("edit-pin-new-input");
  if (input) {
    input.value = currentPin || "";
  }
  modal.style.display = "flex";
  setTimeout(() => {
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

function generateEditPinRandom() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const input = document.getElementById("edit-pin-new-input");
  if (input) input.value = pin;
}

function setEditPinPreset(val) {
  const input = document.getElementById("edit-pin-new-input");
  if (input) input.value = val;
}

async function submitEditUserPin() {
  const uid = document.getElementById("edit-pin-target-uid").value;
  const newPin = (document.getElementById("edit-pin-new-input").value || "").trim();
  const name = document.getElementById("edit-pin-user-name").textContent;

  if (!uid) {
    showToast("⚠️ UID de socio no especificado.", "error");
    return;
  }
  if (!newPin || newPin.length < 4 || newPin.length > 8) {
    showToast("⚠️ El PIN debe tener entre 4 y 8 dígitos numéricos.", "error");
    return;
  }

  try {
    await vm.updateUserPin(uid, newPin);
    closeModal("modal-edit-user-pin");
    showToast(`✓ Clave PIN actualizada a [${newPin}] para ${name}.`, "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ Error al actualizar PIN: " + err.message, "error");
  }
}

function openDeleteUserModal(uid, name, phone) {
  const modal = document.getElementById("modal-delete-user");
  if (!modal) return;
  document.getElementById("delete-user-target-uid").value = uid;
  document.getElementById("delete-user-info-name").textContent = name;
  document.getElementById("delete-user-info-phone").textContent = "Teléfono: " + (phone ? ("+505 " + FirestoreService.formatPhoneDisplay(phone)) : "-");
  document.getElementById("delete-user-info-uid").textContent = "UID: " + uid;
  modal.style.display = "flex";
}

async function executeDeleteUserAdmin() {
  const uid = document.getElementById("delete-user-target-uid").value;
  if (!uid) return;
  closeModal("modal-delete-user");
  showToast("Eliminando socio de la base de datos...", "info");
  try {
    await vm.deleteUser(uid);
    showToast("✓ Socio eliminado permanentemente.", "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ Error al eliminar socio: " + err.message, "error");
  }
}

async function toggleBanUserAdmin(uid, name, currentStatus) {
  const willBan = currentStatus !== "BANNED";
  const actionText = willBan ? "suspender/banear" : "reactivar";
  if (confirm(`¿Estás seguro de ${actionText} la cuenta del socio [${name}]?`)) {
    try {
      const updated = await vm.toggleUserBan(uid);
      const isNowBanned = updated.status === "BANNED";
      showToast(isNowBanned ? `🚫 Socio [${name}] suspendido.` : `✓ Socio [${name}] reactivado.`, "info");
      renderUsersTable(vm.users);
    } catch (err) {
      showToast("❌ Error: " + err.message, "error");
    }
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
    const isDelivered = typeof v.isDelivered === "function" ? v.isDelivered() : v.status === "DELIVERED";
    const isCancelled = typeof v.isCancelled === "function" ? v.isCancelled() : v.status === "CANCELLED";
    const isCommercial = typeof v.isCommercial === "function" ? v.isCommercial() : (v.rewardType === "PARTIAL_DISCOUNT" || (v.cashToPayUsd && v.cashToPayUsd > 0));
    const isPaid = typeof v.isPaidVoucher === "function" ? v.isPaidVoucher() : Boolean(v.isPaid || v.status === "PAID" || v.paidAt);
    const isExpired = typeof v.isExpired === "function" ? v.isExpired() : (isCommercial && !isPaid && !isDelivered && !isCancelled && v.expiresAt && new Date() > new Date(v.expiresAt));
    const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

    let statusBadge = "";
    if (isDelivered) {
      statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">✓ DESPACHADO</span>`;
    } else if (isCancelled) {
      statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;">❌ CANCELADO</span>`;
    } else if (isExpired) {
      statusBadge = `<span class="badge-navi" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">⚠️ CADUCADO (3D)</span>`;
    } else if (isPaid) {
      statusBadge = `<span class="badge-navi" style="background:#f0fdf4; color:#15803d; border:1px solid #86efac;">💵 PAGADO</span>`;
    } else if (isCommercial) {
      statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d;">⏱️ PENDIENTE PAGO ($${(v.cashToPayUsd || 0).toFixed(2)})</span>`;
    } else {
      statusBadge = `<span class="badge-navi" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">🎁 LISTO ENTREGA</span>`;
    }

    // Extracción tolerante y búsqueda inteligente del socio en el sistema
    const targetUid = v.userUid || v.user_uid || v.userId || v.user_id || "";
    const userMatch = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
    const clientName = v.userName || v.userDisplayName || v.user_name || (userMatch ? userMatch.displayName : "Socio Wired");
    const clientContact = (userMatch && userMatch.phone) ? userMatch.phone : (v.userPhone || targetUid || "-");
    const cost = Number(v.pointsSpent || v.pointsCost || v.points_spent || (v.reward ? v.reward.pointsCost : 0));

    return `
      <tr id="voucher-row-${v.voucherCode}">
        <td style="font-family:var(--font-mono); font-weight:800; font-size:0.85rem; color:var(--dark);">${v.voucherCode}</td>
        <td>
          <strong style="color:var(--dark);">${v.rewardTitle || "Artículo"}</strong>
          ${isCommercial ? `
            <div style="font-size:0.68rem; font-family:var(--font-mono); color:#92400e; margin-top:2px;">
              ${isPaid ? '✅ Pagado en efectivo' : `💵 A cobrar: $${(v.cashToPayUsd || 0).toFixed(2)} USD`}
            </div>
          ` : ''}
        </td>
        <td>
          <div style="font-size:0.82rem; font-weight:700; color:var(--dark);">${clientName}</div>
          <div style="font-size:0.7rem; font-family:var(--font-mono); color:var(--gray-500);">${clientContact}</div>
        </td>
        <td><span class="badge-navi">${cost > 0 ? cost.toLocaleString() + " WP" : "0 WP"}</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${dateStr}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${(!isDelivered && !isCancelled && !isExpired) ? `
            <div style="display:inline-flex; gap:6px; align-items:center; justify-content:flex-end;">
              ${(isCommercial && !isPaid) ? `
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; font-weight:800; color:#047857; border: 1.5px solid #10b981; background:#ecfdf5; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);" onclick="openMarkPaidModal('${v.voucherCode}')" title="Registrar abono de $${(v.cashToPayUsd || 0).toFixed(2)} USD para habilitar entrega">
                  💵 Pagado
                </button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.72rem; color:var(--gray-400); border: 1px dashed var(--gray-300); background:#f8fafc; cursor:not-allowed; opacity:0.65;" disabled title="Bloqueado: Primero registra el pago en efectivo">
                  🔒 Entregar
                </button>
              ` : `
                <button class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem; font-weight:800;" onclick="openDeliverVoucherModal('${v.voucherCode}')">
                  ✓ Entregar
                </button>
              `}
            </div>
          ` : (isDelivered ? `
            <span style="font-size:0.75rem; color:var(--gray-500); font-family:var(--font-mono);">Entregado</span>
          ` : (isCancelled ? `
            <span style="font-size:0.75rem; color:#dc2626; font-family:var(--font-mono);">Cancelado</span>
          ` : `
            <span style="font-size:0.75rem; color:#b91c1c; font-family:var(--font-mono);">Caducado (3d)</span>
          `))}
        </td>
      </tr>
    `;
  }).join("");
}

let currentModalPaidCode = null;

function openMarkPaidModal(voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  currentModalPaidCode = code;

  const voucher = (vm.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === code);
  if (!voucher) {
    showToast("❌ No se encontró el vale [" + code + "] en memoria.", "error");
    return;
  }

  const targetUid = voucher.userUid || voucher.user_uid || voucher.userId || voucher.user_id || "";
  const user = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
  const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
  const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (targetUid || "-");
  
  const cashDueUsd = Number(voucher.cashToPayUsd || 0);
  const cashDueNio = cashDueUsd * 37.0; // Conversión oficial 1 USD = 37.0 NIO
  const officialPriceUsd = Number(voucher.officialPriceUsd || voucher.official_price_usd || cashDueUsd);
  const discountUsd = Number(voucher.discountUsd || voucher.discount_usd || (officialPriceUsd - cashDueUsd));
  const pointsSpent = Number(voucher.pointsSpent || voucher.pointsCost || voucher.points_spent || 0);

  const codeEl = document.getElementById("modal-paid-code");
  if (codeEl) codeEl.textContent = voucher.voucherCode;

  const prodEl = document.getElementById("modal-paid-product");
  if (prodEl) prodEl.textContent = voucher.rewardTitle || "Artículo";

  const clientEl = document.getElementById("modal-paid-client");
  if (clientEl) clientEl.textContent = clientName;

  const contactEl = document.getElementById("modal-paid-contact");
  if (contactEl) contactEl.textContent = clientContact;

  const pointsEl = document.getElementById("modal-paid-points");
  if (pointsEl) {
    pointsEl.textContent = pointsSpent > 0 ? `${pointsSpent.toLocaleString()} WP (-$${discountUsd.toFixed(2)})` : "0 WP (Compra Directa)";
  }

  const usdEl = document.getElementById("modal-paid-amount-usd");
  if (usdEl) usdEl.textContent = `$${cashDueUsd.toFixed(2)} USD`;

  const nioEl = document.getElementById("modal-paid-amount-nio");
  if (nioEl) nioEl.textContent = `C$ ${cashDueNio.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO`;

  const offEl = document.getElementById("modal-paid-official-price");
  if (offEl) offEl.textContent = `$${officialPriceUsd.toFixed(2)} USD`;

  const btnAction = document.getElementById("btn-confirm-paid-action");
  if (btnAction) {
    btnAction.disabled = false;
    btnAction.innerHTML = `💵 CONFIRMAR ABONO ($${cashDueUsd.toFixed(2)} USD)`;
  }

  const modal = document.getElementById("modal-confirm-paid-voucher");
  if (modal) modal.style.display = "flex";
}

async function executeConfirmPaidModal() {
  const code = currentModalPaidCode;
  if (!code) return;

  const btnAction = document.getElementById("btn-confirm-paid-action");
  if (btnAction) {
    btnAction.disabled = true;
    btnAction.innerHTML = '<span class="cyber-spinner"></span> REGISTRANDO PAGO...';
  }

  try {
    await vm.markVoucherPaid(code);
    closeModal("modal-confirm-paid-voucher");
    playAdminDispatchSound();
    showToast(`✓ Pago registrado con éxito para [${code}]. Plazo desactivado y entrega habilitada.`, "success");
    renderVouchersTable(vm.vouchers);
  } catch (err) {
    showToast("❌ " + err.message, "error");
    if (btnAction) {
      btnAction.disabled = false;
      btnAction.innerHTML = `💵 REINTENTAR COBRO`;
    }
  }
}

function markVoucherPaidAdmin(voucherCode, cashDue = 0) {
  openMarkPaidModal(voucherCode);
}

function filterVouchersTable(state) {
  vouchersFilterState = state;
  renderVouchersTable(vm.vouchers);
}

let currentModalDeliverCode = null;

function openDeliverVoucherModal(voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  currentModalDeliverCode = code;

  const voucher = (vm.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === code);
  if (!voucher) {
    showToast("❌ No se encontró el vale [" + code + "] en memoria.", "error");
    return;
  }

  // Bloqueo estricto: Si no está pagado, no puede entregarse
  const isCommercial = typeof voucher.isCommercial === "function" ? voucher.isCommercial() : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
  const isPaid = typeof voucher.isPaidVoucher === "function" ? voucher.isPaidVoucher() : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);
  if (isCommercial && !isPaid) {
    showToast(`⚠️ El vale [${code}] requiere abono de $${(voucher.cashToPayUsd || 0).toFixed(2)} USD antes de poder entregarse.`, "warning");
    openMarkPaidModal(code);
    return;
  }

  const targetUid = voucher.userUid || voucher.user_uid || voucher.userId || voucher.user_id || "";
  const user = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
  const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
  const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (targetUid || "-");
  const cost = Number(voucher.pointsSpent || voucher.pointsCost || voucher.points_spent || 0);

  const codeEl = document.getElementById("modal-deliver-code");
  if (codeEl) codeEl.textContent = voucher.voucherCode;
  const prodEl = document.getElementById("modal-deliver-product");
  if (prodEl) prodEl.textContent = voucher.rewardTitle || "Artículo";
  const clientEl = document.getElementById("modal-deliver-client");
  if (clientEl) clientEl.textContent = clientName;
  const contactEl = document.getElementById("modal-deliver-contact");
  if (contactEl) contactEl.textContent = clientContact;
  const pointsEl = document.getElementById("modal-deliver-points");
  if (pointsEl) pointsEl.textContent = cost > 0 ? cost.toLocaleString() + " WP" : "CANJE";
  const dateEl = document.getElementById("modal-deliver-date");
  if (dateEl) dateEl.textContent = voucher.createdAt ? new Date(voucher.createdAt).toLocaleString() : "-";

  const stamp = document.getElementById("modal-deliver-stamp");
  if (stamp) stamp.className = "dispatch-stamp"; // Oculto

  const pill = document.getElementById("modal-deliver-status-pill");
  if (pill) {
    pill.className = "noc-pulse-chip";
    pill.style.background = "#ecfdf5";
    pill.style.color = "#059669";
    pill.style.borderColor = "#a7f3d0";
    pill.innerHTML = '<span class="pulse-dot"></span> LISTO PARA SALIDA FÍSICA';
  }

  // Soporte de cobro obligatorio para venta con descuento tope
  const isPartial = isCommercial;
  const calloutEl = document.getElementById("modal-deliver-cash-callout");

  if (calloutEl) {
    if (isPartial) {
      calloutEl.style.display = "block";
      if (isPaid) {
        calloutEl.style.background = "#ecfdf5";
        calloutEl.style.borderColor = "#10b981";
        calloutEl.innerHTML = `
          <div style="color:#047857; font-weight:900; font-family:var(--font-mono); font-size:0.85rem;">
            ✅ PAGO DE $${(voucher.cashToPayUsd || 0).toFixed(2)} USD CONFIRMADO
          </div>
          <div style="font-size:0.72rem; color:#065f46; margin-top:3px;">
            El importe en efectivo ya fue cancelado. Entrega física autorizada sin cobros pendientes.
          </div>
        `;
      } else {
        calloutEl.style.background = "#fffbeb";
        calloutEl.style.borderColor = "#f59e0b";
        calloutEl.innerHTML = `
          <div style="color:#b45309; font-weight:900; font-family:var(--font-mono); font-size:0.85rem;">
            💵 COBRO PENDIENTE: $${(voucher.cashToPayUsd || 0).toFixed(2)} USD
          </div>
          <div style="font-size:0.72rem; color:#92400e; margin-top:3px;">
            Recuerda cobrar el importe acordado antes de autorizar la salida física del artículo.
          </div>
        `;
      }
    } else {
      calloutEl.style.display = "none";
    }
  }

  const actions = document.getElementById("modal-deliver-actions");
  if (actions) {
    const btnText = (isPartial && !isPaid)
      ? `⚡ COBRAR $${(voucher.cashToPayUsd || 0).toFixed(2)} USD Y DESPACHAR`
      : `⚡ CONFIRMAR Y DESPACHAR ARTÍCULO`;

    actions.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('modal-deliver-voucher')">CANCELAR</button>
      <button id="btn-modal-deliver-action" class="btn-primary btn-dispatch-action" onclick="executeModalDeliver()">
        ${btnText}
      </button>
    `;
  }

  const modal = document.getElementById("modal-deliver-voucher");
  if (modal) modal.style.display = "flex";
}

async function executeModalDeliver() {
  const code = currentModalDeliverCode;
  if (!code) return;

  const btn = document.getElementById("btn-modal-deliver-action");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="cyber-spinner"></span> REGISTRANDO DESPACHO...';
  }

  try {
    await vm.deliverVoucher(code);
    playAdminDispatchSound();
    triggerCyberDispatchGlitch();

    // Sello Holográfico Animado en el Modal
    const stamp = document.getElementById("modal-deliver-stamp");
    if (stamp) {
      const nowStr = new Date().toLocaleString();
      stamp.className = "dispatch-stamp active";
      stamp.innerHTML = `
        ✓ ARTÍCULO DESPACHADO
        <div style="font-size:0.68rem; font-weight:800; margin-top:4px; letter-spacing:0.5px;">
          SALIDA AUTORIZADA // OPERADOR: ADMIN_MELTY // ${nowStr}
        </div>
      `;
    }

    const pill = document.getElementById("modal-deliver-status-pill");
    if (pill) {
      pill.innerHTML = "✓ DESPACHADO CON ÉXITO";
    }

    const actions = document.getElementById("modal-deliver-actions");
    if (actions) {
      actions.innerHTML = `
        <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="closeModal('modal-deliver-voucher');">
          ✓ FINALIZAR Y CERRAR
        </button>
      `;
    }

    showToast(`✓ Vale [${code}] despachado y entregado físicamente al socio.`, "success");

    // Destello de fila en la tabla de historial
    const row = document.getElementById(`voucher-row-${code}`);
    if (row) row.classList.add("row-delivered-flash");

    setTimeout(() => {
      closeModal('modal-deliver-voucher');
    }, 1800);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ CONFIRMAR Y DESPACHAR ARTÍCULO";
    }
    showToast("❌ " + err.message, "error");
  }
}

function deliverVoucherFromTable(voucherCode) {
  openDeliverVoucherModal(voucherCode);
}
