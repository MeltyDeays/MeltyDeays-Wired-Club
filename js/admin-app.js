/* Controller: Panel de Administración (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";
import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js";
import { FirestoreService } from "./services/FirestoreService.js";
import { injectEnvironmentBadge } from "./config/env.js";

import {
  initAdminViews,
  // 1. Calculadora de Catálogo
  setFreightPreset,
  setSalesFrequency,
  setTicketPreset,
  setLoyaltyRatio,
  recalculateRewardPoints,
  applyCalculatedPointsToProduct,
  onManualPointsCostChange,
  setProductPublicationMode,
  setProductDiscountPreset,
  recalculateProductDiscount,
  applyCalculatedDiscountToProduct,
  // 2. Calculadora de Puntos de Venta
  openSalePointsCalculatorModal,
  setSaleFreightPreset,
  setSaleReturnBase,
  setSaleReturnPct,
  recalculateSalePoints,
  applySalePointsToActiveTarget,
  // 3. Factura Digital Individual
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
  submitSingleDigitalInvoice,
  // 4. Socios / Clientes
  renderUsersTable,
  filterUsers,
  filterUsersByTier,
  refreshAdminUsers,
  openAdjustPointsModal,
  selectAdjustDirection,
  toggleAdjustType,
  setAdjustQuickPoints,
  submitAdjustPoints,
  openUserLedgerModal,
  openNewUserModal,
  saveNewUserAdmin,
  toggleNewUserPinVisibility,
  updateNewUserPreview,
  generateNewUserRandomPin,
  setNewUserQuickPoints,
  openEditPinModal,
  generateEditPinRandom,
  setEditPinPreset,
  submitEditUserPin,
  openDeleteUserModal,
  executeDeleteUserAdmin,
  openBanUserModal,
  executeBanUserAdmin,
  toggleBanUserAdmin,
  // 5. Vales e Historial
  renderVouchersTable,
  filterVouchersTable,
  deliverVoucherFromTable,
  markVoucherPaidAdmin,
  openMarkPaidModal,
  executeConfirmPaidModal,
  openDeliverVoucherModal,
  executeModalDeliver,
  playAdminDispatchSound,
  triggerCyberDispatchGlitch,
  // 6. POS y Terminal 1-Scan
  setPosFeedback,
  clearPosFeedback,
  clearPosScanner,
  closePosResult,
  startCameraScanner,
  stopCameraScanner,
  submitAdminPin,
  logoutAdmin,
  verifyVoucherAdmin,
  confirmDeliveryAdmin,
  submitAssignPoints,
  setQuickPoints,
  promptAssignPoints,
  posCustomerQuickAdjust,
  posCustomerViewLedger,
  // 7. Lotes, Facturación 4x1 y Catálogo
  generateBatchAdmin,
  validateLotCountInput,
  enforceMultipleOfFour,
  openPurgeModal,
  executePurgeInvoices,
  openPurgeAllDbModal,
  executePurgeAllDb,
  toggleCustomPaperInputs,
  getSelectedPaperDimensions,
  openPrintSheetModal,
  updatePreviewSheetDimensions,
  switchPreviewMode,
  downloadPrintSheetHtml,
  triggerNativeSheetPrint,
  printFromModal,
  viewSingleTokenQr,
  copySingleQrUrl,
  testSingleQrUrl,
  openTokenActionsModal,
  executeTokenOptAssign,
  executeTokenOptQr,
  executeTokenOptCopyLink,
  executeTokenOptTestUrl,
  executeTokenOptDigitalInvoice,
  executeTokenOptViewInvoice,
  executeTokenOptEditInvoice,
  handleInvoiceBtnClick,
  handleProductImageFile,
  clearProductImageUpload,
  previewProductImageFromUrl,
  openNewProductModal,
  saveProductAdmin,
  removeProductAdmin,
  filterLainSeries,
  setActiveLainTemplate,
  cycleLainTemplate,
  randomizeLainTemplate,
  renderLainTemplateGrid
} from "./views/index.js";

const vm = new AdminViewModel();
let currentTab = "pos";

// Inicialización de submódulos de vistas desacopladas (Fase 5 MVVM)
initAdminViews({
  vm,
  showToast,
  closeModal,
  attachPhoneMask,
  switchAdminTab,
  getSelectedPaperDimensions,
  renderTokensTable,
  renderAdmin,
  InvoiceTemplateService,
  FirestoreService
});

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

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

export function switchAdminTab(tabName) {
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

document.addEventListener("DOMContentLoaded", () => {
  vm.subscribe(renderAdmin);

  // Navegación y Sesión
  window.switchAdminTab = switchAdminTab;
  window.submitAdminPin = submitAdminPin;
  window.logoutAdmin = logoutAdmin;

  // POS y Terminal 1-Scan
  window.startCameraScanner = startCameraScanner;
  window.stopCameraScanner = stopCameraScanner;
  window.clearPosFeedback = clearPosFeedback;
  window.clearPosScanner = clearPosScanner;
  window.closePosResult = closePosResult;
  window.setPosFeedback = setPosFeedback;
  window.verifyVoucherAdmin = verifyVoucherAdmin;
  window.confirmDeliveryAdmin = confirmDeliveryAdmin;
  window.submitAssignPoints = submitAssignPoints;
  window.setQuickPoints = setQuickPoints;
  window.promptAssignPoints = promptAssignPoints;
  window.posCustomerQuickAdjust = posCustomerQuickAdjust;
  window.posCustomerViewLedger = posCustomerViewLedger;

  // Lotes, Papel e Impresión 4x1
  window.generateBatchAdmin = generateBatchAdmin;
  window.validateLotCountInput = validateLotCountInput;
  window.enforceMultipleOfFour = enforceMultipleOfFour;
  window.openPurgeModal = openPurgeModal;
  window.executePurgeInvoices = executePurgeInvoices;
  window.openPurgeAllDbModal = openPurgeAllDbModal;
  window.executePurgeAllDb = executePurgeAllDb;
  window.toggleCustomPaperInputs = toggleCustomPaperInputs;
  window.openPrintSheetModal = openPrintSheetModal;
  window.updatePreviewSheetDimensions = updatePreviewSheetDimensions;
  window.switchPreviewMode = switchPreviewMode;
  window.downloadPrintSheetHtml = downloadPrintSheetHtml;
  window.triggerNativeSheetPrint = triggerNativeSheetPrint;
  window.printFromModal = printFromModal;

  // Galería de Diseños Coleccionables Lain / Haibane
  window.filterLainSeries = filterLainSeries;
  window.setActiveLainTemplate = setActiveLainTemplate;
  window.cycleLainTemplate = cycleLainTemplate;
  window.randomizeLainTemplate = randomizeLainTemplate;
  window.renderLainTemplateGrid = renderLainTemplateGrid;

  // Tokens y Acciones de Factura
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

  // Catálogo de Premios y Productos
  window.openNewProductModal = openNewProductModal;
  window.saveProductAdmin = saveProductAdmin;
  window.removeProductAdmin = removeProductAdmin;
  window.handleProductImageFile = handleProductImageFile;
  window.clearProductImageUpload = clearProductImageUpload;
  window.previewProductImageFromUrl = previewProductImageFromUrl;

  // Calculadora de Retorno de Catálogo
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

  // Calculadora de Puntos por Venta (Factura 4x1)
  window.openSalePointsCalculatorModal = openSalePointsCalculatorModal;
  window.setSaleFreightPreset = setSaleFreightPreset;
  window.setSaleReturnBase = setSaleReturnBase;
  window.setSaleReturnPct = setSaleReturnPct;
  window.recalculateSalePoints = recalculateSalePoints;
  window.applySalePointsToActiveTarget = applySalePointsToActiveTarget;

  // Socios y Puntos
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
  window.openBanUserModal = openBanUserModal;
  window.executeBanUserAdmin = executeBanUserAdmin;
  window.toggleBanUserAdmin = toggleBanUserAdmin;

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

  // Factura Digital Individual (1 Página)
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

  // Utilidades y Servicios Globales
  window.closeModal = closeModal;
  window.InvoiceTemplateService = InvoiceTemplateService;
  window.FirestoreService = FirestoreService;

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

  // Badge visual en entorno de pruebas (SANDBOX)
  injectEnvironmentBadge();
});
