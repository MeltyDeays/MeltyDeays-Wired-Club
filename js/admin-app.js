/* Controller: Panel de Administración (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";
import { InvoiceTemplateService } from "./services/InvoiceTemplateService.js";
import { FirestoreService } from "./services/FirestoreService.js";
import { injectEnvironmentBadge, isProduction } from "./config/env.js";
import { parseProductDescription } from "./models/RewardModel.js";
import {
  openImageLightbox,
  closeImageLightbox,
  lightboxNextImage,
  lightboxPrevImage,
  setLightboxImageIndex,
  toggleLightboxZoom
} from "./views/customer/CustomerCatalogView.js";

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
  setIncomingArrivalPreset,
  setIncomingDiscountType,
  setIncomingDiscountVal,
  recalculateIncomingPresale,
  applyCalculatedIncomingToProduct,
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
  sortUsersAdmin,
  // 5. Vales e Historial
  renderVouchersTable,
  filterVouchersTable,
  filterVouchersAdmin,
  sortVouchersAdmin,
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
  executeTokenOptLainCard,
  executeTokenOptCopyLink,
  executeTokenOptTestUrl,
  executeTokenOptDigitalInvoice,
  executeTokenOptViewInvoice,
  executeTokenOptEditInvoice,
  executeTokenOptClaimCustomer,
  openAdminClaimCustomerModal,
  confirmAdminClaimCustomer,
  onAdminClaimUserSelectChange,
  onAdminClaimUserSearchInput,
  onAdminClaimPointsChange,
  selectAdminClaimUser,
  setAdminClaimPointsPreset,
  toggleAdminClaimSelectMode,
  handleInvoiceBtnClick,
  handleProductImageFile,
  addProductImageUrl,
  removeProductImageAt,
  setProductMainImage,
  clearProductImageUpload,
  previewProductImageFromUrl,
  openNewProductModal,
  openEditProductModal,
  saveProductAdmin,
  removeProductAdmin,
  handleAdminMarkSold,
  openMarkProductSoldModal,
  executeConfirmMarkSold,
  handleAdminDecrementStock,
  handleAdminRestock,
  handleAdminReleaseIncoming,
  filterLainSeries,
  setActiveLainTemplate,
  cycleLainTemplate,
  randomizeLainTemplate,
  renderLainTemplateGrid,
  openLainPreviewModal,
  previewNextLainTemplate,
  previewPrevLainTemplate,
  confirmLainPreviewSelection,
  // 6. Consola Sandbox DB & Borrado Selectivo
  executeTokenOptDelete,
  openReleaseInvoiceModal,
  executeConfirmReleaseInvoice,
  renderSandboxDbView,
  setSandboxDraftTab,
  filterSandboxDrafts,
  setSandboxDraftStatus,
  setSandboxDraftSort,
  deleteSingleToken,
  deleteSingleUser,
  deleteSingleVoucher,
  deleteSingleReward,
  executePurgeUsers,
  executePurgeCirculatingPoints,
  executePurgeVouchers,
  executePurgeRewards,
  executePurgeInvoicesFromSandbox,
  executeSeedDevData
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

export function syncModalScrollLock() {
  if (typeof document === "undefined") return;
  const overlays = document.querySelectorAll(".modal-overlay");
  let hasOpenModal = false;
  for (const el of overlays) {
    if (el && el.style && el.style.display && el.style.display !== "none") {
      hasOpenModal = true;
      break;
    }
  }
  if (hasOpenModal) {
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.add("modal-open");
    }
    if (document.body && document.body.classList) {
      document.body.classList.add("modal-open");
    }
  } else {
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.remove("modal-open");
    }
    if (document.body && document.body.classList) {
      document.body.classList.remove("modal-open");
    }
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
  syncModalScrollLock();
}

export function switchAdminTab(tabName) {
  currentTab = tabName;
  const tabs = ["pos", "clients", "invoices", "catalog", "history", "sandbox_db", "community"];
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

  if (tabName === "invoices") {
    renderLainTemplateGrid();
  } else if (tabName === "sandbox_db") {
    renderSandboxDbView();
  } else if (tabName === "community") {
    renderAdminCommentsList();
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

  // Actualizar contador de preguntas pendientes de la comunidad
  updateAdminPendingCommentsBadge();

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
  renderSandboxDbView();
}

let catalogFilterQuery = "";
let catalogTypeFilter = "ALL";
let catalogSortOrder = "cost-desc";

function filterCatalogAdmin() {
  const input = document.getElementById("search-catalog-input");
  catalogFilterQuery = (input ? input.value : "").trim();
  renderCatalogTable(vm ? vm.catalog : []);
}

function filterCatalogByType(type) {
  catalogTypeFilter = type || "ALL";
  const types = ["ALL", "FREE", "PARTIAL", "INCOMING"];
  types.forEach(t => {
    const btn = document.getElementById("catalog-filter-" + t);
    if (btn) {
      if (t === catalogTypeFilter) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });
  renderCatalogTable(vm ? vm.catalog : []);
}

function sortCatalogAdmin(order) {
  catalogSortOrder = order || "cost-desc";
  const select = document.getElementById("sort-catalog-select");
  if (select && select.value !== catalogSortOrder) select.value = catalogSortOrder;
  renderCatalogTable(vm ? vm.catalog : []);
}

function renderCatalogTable(catalog) {
  const tbody = document.getElementById("catalog-table-body");
  if (!tbody) return;

  let filtered = [...(catalog || [])];

  if (catalogTypeFilter === "FREE") {
    filtered = filtered.filter(p => p.status !== "INCOMING" && !(typeof p.isIncoming === "function" && p.isIncoming()) && p.rewardType !== "PARTIAL_DISCOUNT" && !(typeof p.isPartialDiscount === "function" && p.isPartialDiscount()));
  } else if (catalogTypeFilter === "PARTIAL") {
    filtered = filtered.filter(p => p.status !== "INCOMING" && !(typeof p.isIncoming === "function" && p.isIncoming()) && (p.rewardType === "PARTIAL_DISCOUNT" || (typeof p.isPartialDiscount === "function" && p.isPartialDiscount())));
  } else if (catalogTypeFilter === "INCOMING") {
    filtered = filtered.filter(p => p.status === "INCOMING" || (typeof p.isIncoming === "function" && p.isIncoming()));
  }

  if (catalogFilterQuery) {
    const q = catalogFilterQuery.toLowerCase();
    filtered = filtered.filter(p => {
      return (p.title || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
    });
  }

  // Ordenamiento dinámico
  filtered.sort((a, b) => {
    if (catalogSortOrder === "cost-desc") {
      return (b.pointsCost || 0) - (a.pointsCost || 0);
    } else if (catalogSortOrder === "cost-asc") {
      return (a.pointsCost || 0) - (b.pointsCost || 0);
    } else if (catalogSortOrder === "discount-desc") {
      const discA = (a.maxDiscountPct || 0) * (a.priceUsd || 1) + (a.maxDiscountUsd || 0);
      const discB = (b.maxDiscountPct || 0) * (b.priceUsd || 1) + (b.maxDiscountUsd || 0);
      return discB - discA;
    } else if (catalogSortOrder === "discount-asc") {
      const discA = (a.maxDiscountPct || 0) * (a.priceUsd || 1) + (a.maxDiscountUsd || 0);
      const discB = (b.maxDiscountPct || 0) * (b.priceUsd || 1) + (b.maxDiscountUsd || 0);
      return discA - discB;
    } else if (catalogSortOrder === "stock-desc") {
      return (b.stock || 0) - (a.stock || 0);
    } else if (catalogSortOrder === "stock-asc") {
      return (a.stock || 0) - (b.stock || 0);
    } else if (catalogSortOrder === "title-asc") {
      return (a.title || "").localeCompare(b.title || "");
    } else if (catalogSortOrder === "title-desc") {
      return (b.title || "").localeCompare(a.title || "");
    }
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">
          No se encontraron artículos con los filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isIncoming = p.status === "INCOMING" || (typeof p.isIncoming === "function" && p.isIncoming());
    const isPartial = !isIncoming && (p.rewardType === "PARTIAL_DISCOUNT" || (typeof p.isPartialDiscount === "function" && p.isPartialDiscount()));
    const typeBadge = isIncoming
      ? `<span class="badge-navi" style="background:#faf5ff; color:#7e22ce; border:1px solid #c084fc; font-size:0.68rem;">灰羽 EN CAMINO</span>`
      : (isPartial
        ? `<span class="badge-navi" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:0.68rem;">🏷️ VENTA TOPADA (${p.maxDiscountPct || 5}%)</span>`
        : `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:0.68rem;">🎁 100% CANJE</span>`);

    const costDisplay = isIncoming
      ? `<div style="font-size:0.85rem; font-weight:800; color:#7e22ce;">Preventa: $${(p.presalePriceUsd || 0).toFixed(2)} USD</div><div style="font-size:0.7rem; color:var(--gray-500); text-decoration:line-through;">Reg: $${(p.priceUsd || 0).toFixed(2)} USD (-$${(p.presaleDiscountUsd || 0).toFixed(2)})</div><div style="font-size:0.68rem; color:#059669; font-weight:700;">0 WP (Directo)</div>`
      : (isPartial
        ? `<div><strong style="color:#b45309;">${p.pointsCost.toLocaleString()} WP</strong></div><div style="font-size:0.7rem; color:#059669; font-weight:700;">-$${(p.maxDiscountUsd || 0).toFixed(2)} USD</div>`
        : `<strong style="color:var(--dark);">${p.pointsCost.toLocaleString()} WP</strong>`);

    const priceInfo = isIncoming
      ? `<div style="font-size:0.72rem; font-family:var(--font-mono); color:#7e22ce; margin-top:3px;">Preventa Directa · 🛡️ Sin consumo de puntos Wired</div>`
      : (isPartial
        ? `<div style="font-size:0.72rem; font-family:var(--font-mono); color:var(--dark); margin-top:3px;">Precio: $${(p.priceUsd || 0).toFixed(2)} · <span style="color:#dc2626; font-weight:800;">Cobrar: $${(p.cashToPayUsd || 0).toFixed(2)} USD</span></div>`
        : "");

    const parsed = parseProductDescription(p.description);
    const descDisplay = parsed.hasSpecs
      ? `
        <div class="admin-table-desc-wrap">
          <div class="admin-table-desc-intro">${parsed.intro}</div>
          <details class="admin-table-specs-details">
            <summary class="admin-table-specs-summary">
              <span>📋 Ver especificaciones (${parsed.specs.length})</span>
            </summary>
            <div class="admin-table-specs-drawer">
              <ul class="admin-table-specs-list">
                ${parsed.specs.map(s => `<li><span class="spec-dot">•</span> <span>${s}</span></li>`).join("")}
              </ul>
            </div>
          </details>
        </div>
      `
      : `<div style="font-size:0.8rem; color:var(--gray-700); line-height: 1.4;">${p.description || "-"}</div>`;

    const pImages = typeof p.getImages === "function" ? p.getImages() : (Array.isArray(p.images) && p.images.length ? p.images : (p.imageUrl ? [p.imageUrl] : []));
    const pCover = pImages[0] || p.imageUrl || "";
    const escapedTitle = (p.title || "").replace(/'/g, "\\'");
    const pThumbHtml = pCover
      ? `
        <div style="position: relative; width: 44px; height: 44px; flex-shrink: 0; cursor: pointer; border-radius: 4px; overflow: hidden; border: 1px solid var(--gray-300); background: #0f172a;" onclick="openImageLightbox('${p.id}', 0, '${escapedTitle}')" title="Clic para ver foto completa">
          <img src="${pCover}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
          ${pImages.length > 1 ? `<span style="position: absolute; bottom: 0; right: 0; background: rgba(15,23,42,0.92); color: #38bdf8; font-family: var(--font-mono); font-size: 0.55rem; font-weight: 800; padding: 1px 3px; border-radius: 2px 0 0 0; border-top: 1px solid #0284c7; border-left: 1px solid #0284c7;">[0${pImages.length}]</span>` : ''}
        </div>
      `
      : `
        <div style="width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${isIncoming ? '#faf5ff' : 'var(--gray-100)'}; border-radius: 4px; border: 1px solid ${isIncoming ? '#d8b4fe' : 'var(--gray-300)'}; font-size: 1.2rem;">
          ${isIncoming ? '灰羽' : (isPartial ? '🏷️' : '🎁')}
        </div>
      `;

    const isSoldOut = !isIncoming && ((p.stock || 0) <= 0 || (typeof p.isSoldOut === "function" && p.isSoldOut()) || p.status === "SOLD_OUT");

    const stockDisplay = isIncoming
      ? `<div class="stock-cell-wrap"><strong style="color:#7e22ce;">${p.stock}</strong> un. en reserva</div><div style="font-size:0.7rem; color:#6366f1; font-family:var(--font-mono); margin-top:2px;">⏱️ Llegada: ${p.estimatedArrival ? new Date(p.estimatedArrival).toLocaleDateString() : 'Por definir'}</div>`
      : (isSoldOut
        ? `<span class="badge-stock-sold">🔴 VENDIDO</span>`
        : (p.stock === 1
          ? `<div class="stock-cell-wrap"><strong style="color:var(--dark);">1</strong> un. <span class="badge-stock-unique">ÚNICO</span></div>`
          : `<div class="stock-cell-wrap"><strong style="color:var(--dark);">${p.stock}</strong> un.</div>`));

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            ${pThumbHtml}
            <div>
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                ${typeBadge}
                <strong style="color:var(--dark);">${p.title}</strong>
              </div>
              <div style="font-size:0.72rem; color:var(--gray-500); font-family:var(--font-mono);">${p.id}</div>
              ${priceInfo}
            </div>
          </div>
        </td>
        <td>${costDisplay}</td>
        <td>${stockDisplay}</td>
        <td style="max-width: 380px;">${descDisplay}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
            ${isIncoming ? `
              <button type="button" class="catalog-action-btn" style="background:#faf5ff; color:#7e22ce; border-color:#c084fc; font-weight:800;" onclick="handleAdminReleaseIncoming('${p.id}')" title="Desembarcar producto y pasarlo a disponible de inmediato">
                <span class="btn-icon">⚡</span> <span>Desembarcar</span>
              </button>
            ` : (!isSoldOut ? `
              <button type="button" class="catalog-action-btn btn-sold" onclick="handleAdminMarkSold('${p.id}', '${escapedTitle}')" title="Marcar como vendido externamente (Stock a 0)">
                <span class="btn-icon">🏷️</span> <span>Vendido</span>
              </button>
              ${(p.stock || 0) > 1 ? `
                <button type="button" class="catalog-action-btn btn-decrement" onclick="handleAdminDecrementStock('${p.id}', '${escapedTitle}')" title="Restar 1 unidad de stock">
                  <span class="btn-icon">📉</span> <span>-1</span>
                </button>
              ` : ''}
            ` : `
              <button type="button" class="catalog-action-btn btn-restock" onclick="handleAdminRestock('${p.id}', 1, '${escapedTitle}')" title="Reponer 1 unidad">
                <span class="btn-icon">➕</span> <span>+1 un.</span>
              </button>
            `)}
            <button type="button" class="catalog-action-btn btn-edit" onclick="openEditProductModal('${p.id}')" title="Editar producto ${p.id}">
              <span class="btn-icon">✏️</span> <span>Editar</span>
            </button>
            <button type="button" class="catalog-action-btn btn-delete" onclick="removeProductAdmin('${p.id}')" title="Eliminar producto ${p.id}">
              <span class="btn-icon">🗑️</span> <span>Eliminar</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

let tokensFilterQuery = "";
let tokensStatusFilter = "ALL";
let tokensSortOrder = "folio-asc";

function filterTokensAdmin() {
  const input = document.getElementById("search-tokens-input");
  tokensFilterQuery = (input ? input.value : "").trim();
  renderTokensTable(vm ? vm.tokens : []);
}

function filterTokensByStatus(status) {
  tokensStatusFilter = status || "ALL";
  const statuses = ["ALL", "PENDING", "ACTIVE", "CLAIMED"];
  statuses.forEach(s => {
    const btn = document.getElementById("token-filter-" + s);
    if (btn) {
      if (s === tokensStatusFilter) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });
  renderTokensTable(vm ? vm.tokens : []);
}

function sortTokensAdmin(order) {
  tokensSortOrder = order || "folio-asc";
  const select = document.getElementById("sort-tokens-select");
  if (select && select.value !== tokensSortOrder) select.value = tokensSortOrder;
  renderTokensTable(vm ? vm.tokens : []);
}

function renderTokensTable(tokens) {
  const tbody = document.getElementById("tokens-table-body");
  if (!tbody) return;

  let filtered = [...(tokens || [])];

  if (tokensStatusFilter === "PENDING") {
    filtered = filtered.filter(t => t.isPendingAssignment());
  } else if (tokensStatusFilter === "ACTIVE") {
    filtered = filtered.filter(t => t.isActive());
  } else if (tokensStatusFilter === "CLAIMED") {
    filtered = filtered.filter(t => t.isClaimed());
  }

  if (tokensFilterQuery) {
    const q = tokensFilterQuery.toLowerCase();
    filtered = filtered.filter(t => {
      const folio = (t.invoiceFolio || "").toLowerCase();
      const code = (t.tokenCode || "").toLowerCase();
      const pin = (t.securityPin || "").toLowerCase();
      return folio.includes(q) || code.includes(q) || pin.includes(q);
    });
  }

  // Ordenamiento dinámico
  const parseFolio = (f) => parseInt(String(f || "").replace(/\D/g, ""), 10) || 0;

  filtered.sort((a, b) => {
    if (tokensSortOrder === "folio-asc") {
      return parseFolio(a.invoiceFolio) - parseFolio(b.invoiceFolio);
    } else if (tokensSortOrder === "folio-desc") {
      return parseFolio(b.invoiceFolio) - parseFolio(a.invoiceFolio);
    } else if (tokensSortOrder === "newest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (timeB - timeA) || (parseFolio(b.invoiceFolio) - parseFolio(a.invoiceFolio));
    } else if (tokensSortOrder === "oldest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (timeA - timeB) || (parseFolio(a.invoiceFolio) - parseFolio(b.invoiceFolio));
    } else if (tokensSortOrder === "points-desc") {
      return (b.pointsValue || 0) - (a.pointsValue || 0);
    } else if (tokensSortOrder === "points-asc") {
      return (a.pointsValue || 0) - (b.pointsValue || 0);
    }
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🖨️</div>
          <strong>No hay lotes de facturación activos que coincidan con los filtros.</strong>
          <div style="font-size: 0.8rem; margin-top: 4px;">Usa el formulario superior para generar tu primer pliego de 4 facturas sincronizadas.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 100).map(t => {
    const isClaimed = typeof t.isClaimed === 'function' ? t.isClaimed() : t.status === "CLAIMED";
    const isPending = typeof t.isPendingAssignment === 'function' ? t.isPendingAssignment() : (t.pointsValue <= 0 || t.status === "PENDING_ASSIGNMENT");
    const isActive = typeof t.isActive === 'function' ? t.isActive() : (t.status === "ACTIVE" && t.pointsValue > 0);
    const code = t.tokenCode || t.token_code || "";
    const folio = t.invoiceFolio || t.invoice_folio || "";
    const pts = Number(t.pointsValue !== undefined ? t.pointsValue : (t.points_value || 0));
    const pin = t.securityPin || t.security_pin || "••••";

    let pointsBadge = "";
    if (isPending) {
      pointsBadge = `<span class="badge-navi" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⏳ Sin Asignar (0 WP)</span>`;
    } else {
      pointsBadge = `<span class="badge-navi" style="background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⚡ ${pts} WP</span>`;
    }

    let statusBadge = "";
    if (isClaimed) {
      statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border: 1px solid #fecdd3; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">✔ RECLAMADO</span>`;
    } else if (isActive) {
      statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border: 1px solid #a7f3d0; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">● SIN RECLAMAR (${pts} WP)</span>`;
    } else {
      statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border: 1px solid #fcd34d; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:0.72rem;">⏳ EN ESPERA DE VALOR</span>`;
    }

    return `
      <tr>
        <td style="white-space:nowrap;"><code class="token-code-pill">${code}</code></td>
        <td style="white-space:nowrap;"><strong>#MD-${folio}</strong></td>
        <td style="white-space:nowrap;">${pointsBadge}</td>
        <td style="white-space:nowrap; text-align: center;"><span class="pin-badge">${pin}</span></td>
        <td style="white-space:nowrap;">${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
            ${!isClaimed ? `
              <button class="btn-primary btn-compact" onclick="promptAssignPoints('${code}', '${folio}')" title="Asignar puntos a esta factura">
                ⚡ Cargar
              </button>
            ` : ""}
            <button class="btn-secondary btn-compact" onclick="viewSingleTokenQr('${code}', '${folio}', ${pts}, '${pin}')" title="Ver código QR oficial">
              🔍 QR
            </button>
            <button class="btn-secondary btn-compact" style="color:#059669; border-color:#059669; font-weight:800;" onclick="handleInvoiceBtnClick('${code}')" title="Ver o Imprimir Factura Digital Completa">
              🧾 Factura
            </button>
            <button class="btn-secondary btn-dots" onclick="openTokenActionsModal('${code}')" title="Más opciones">
              ···
            </button>
            <button type="button" class="btn-release-folio btn-compact-release" onclick="deleteSingleToken('${code}', '${folio}')" title="Eliminar factura y liberar folio #${folio}">
              <span class="btn-icon">🗑️</span> <span>Liberar #${folio}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ========================================================
// GESTIÓN DE PREGUNTAS Y COMENTARIOS DE LA COMUNIDAD (Q&A)
// ========================================================
export async function updateAdminPendingCommentsBadge() {
  const badgeEl = document.getElementById("admin-pending-comments-badge");
  if (!badgeEl) return;
  try {
    const comments = await FirestoreService.fetchAllProductComments();
    const pendingCount = comments.filter(c => !c.answerText && !c.reply).length;
    if (pendingCount > 0) {
      badgeEl.textContent = pendingCount;
      badgeEl.style.display = "inline-block";
    } else {
      badgeEl.style.display = "none";
    }
  } catch (e) {
    console.warn("Error actualizando badge de comentarios:", e);
  }
}

export async function renderAdminCommentsList() {
  const container = document.getElementById("admin-comments-container");
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8;">Cargando preguntas de la comunidad...</div>`;

  try {
    const comments = await FirestoreService.fetchAllProductComments();
    const rewards = vm?.catalog || [];

    const totalEl = document.getElementById("stat-total-comments");
    const pendingEl = document.getElementById("stat-pending-comments");
    const answeredEl = document.getElementById("stat-answered-comments");
    const badgeTotalEl = document.getElementById("admin-comments-total-badge");

    const pendingList = comments.filter(c => !c.answerText && !c.reply);
    const answeredList = comments.filter(c => Boolean(c.answerText || c.reply));

    if (totalEl) totalEl.textContent = comments.length;
    if (pendingEl) pendingEl.textContent = pendingList.length;
    if (answeredEl) answeredEl.textContent = answeredList.length;
    if (badgeTotalEl) badgeTotalEl.textContent = `${comments.length} PREGUNTAS`;

    updateAdminPendingCommentsBadge();

    if (comments.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">💬</div>
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #334155;">No hay preguntas registradas todavía</h4>
          <p style="font-size: 0.78rem; color: #64748b;">Cuando los clientes realicen preguntas sobre los productos desde la tienda móvil, aparecerán aquí para ser respondidas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = comments.map(c => {
      const reward = rewards.find(r => r.id === c.rewardId);
      const prodTitle = reward ? reward.title : (c.rewardTitle || c.rewardId || "Producto del catálogo");
      const prodImg = reward ? (reward.imageUrl || (reward.images && reward.images[0])) : "";

      const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
      const answerDateStr = (c.answeredAt || c.replyAt) ? new Date(c.answeredAt || c.replyAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

      let qText = String(c.questionText || c.comment || c.text || c.message || c.question || c.content || '').trim();
      if (!qText || qText === 'undefined' || qText === 'null') {
        qText = '¿Tienen entrega disponible en tienda física hoy mismo si aparto con mis puntos?';
      }

      // Separar respuesta oficial de tienda vs respuestas comunitarias de clientes
      const officialAnswerText = String(c.officialReply || (c.isOfficialReply ? (c.answerText || c.reply) : '') || '').trim();
      const hasOfficialReply = Boolean(officialAnswerText);
      const officialDateStr = (c.officialReplyAt || c.answeredAt || c.replyAt) 
        ? new Date(c.officialReplyAt || c.answeredAt || c.replyAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
        : '';

      const repliesList = Array.isArray(c.replies) ? c.replies : [];
      const communityReplies = repliesList.filter(r => !r.isOfficial && String(r.author || '').trim() !== 'MeltyDeays · Soporte Oficial');

      let authorName = String(c.userName || c.author || c.name || 'Socio').trim();
      if (!authorName || authorName === 'undefined' || authorName === 'null') {
        authorName = 'Socio Wired';
      }

      return `
        <div class="admin-comment-card ${hasOfficialReply ? 'answered' : 'pending'}" style="background: #ffffff; border: 1.5px solid ${hasOfficialReply ? '#cbd5e1' : '#fca5a5'}; border-radius: 8px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
          <!-- Encabezado de la pregunta -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${prodImg ? `<img src="${prodImg}" style="width: 38px; height: 38px; border-radius: 4px; object-fit: cover; border: 1px solid #cbd5e1;">` : `<span style="font-size: 1.4rem;">📦</span>`}
              <div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #0f172a;">${prodTitle}</div>
                <div style="font-size: 0.65rem; color: #64748b; font-family: var(--font-mono);">ARTÍCULO: ${c.rewardId}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge ${hasOfficialReply ? 'badge-success' : 'badge-danger'}" style="font-size: 0.68rem; font-weight: 800; padding: 3px 8px;">
                ${hasOfficialReply ? '✓ RESPUESTA OFICIAL ACTIVA' : '⏳ PENDIENTE DE SOPORTE'}
              </span>
              <button type="button" class="btn-outline-sm" onclick="deleteAdminComment('${c.id}')" title="Eliminar pregunta" style="color: #ef4444; border-color: #fca5a5; padding: 2px 6px;">
                🗑️
              </button>
            </div>
          </div>

          <!-- Datos del cliente y pregunta -->
          <div style="background: #f8fafc; border-left: 3px solid #38bdf8; padding: 8px 12px; border-radius: 0 4px 4px 0; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #475569; margin-bottom: 4px;">
              <span><strong>👤 Pregunta de: ${authorName}</strong> ${c.userTier ? `<span style="font-size: 0.6rem; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 2px; font-weight: 800;">${c.userTier}</span>` : ''}</span>
              <span style="font-family: var(--font-mono); font-size: 0.65rem; color: #94a3b8;">${dateStr}</span>
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #0f172a; line-height: 1.35;">
              "${qText}"
            </div>
          </div>

          <!-- Respuesta Oficial de la Tienda (MeltyDeays Soporte) -->
          ${hasOfficialReply ? `
            <div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 0 4px 4px 0; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #065f46; font-weight: 800; margin-bottom: 3px;">
                <span>🛡️ MeltyDeays · Soporte Oficial (Respuesta oficial publicada)</span>
                <span style="font-family: var(--font-mono); font-size: 0.65rem; font-weight: normal; color: #047857;">${officialDateStr}</span>
              </div>
              <div style="font-size: 0.82rem; color: #064e3b; line-height: 1.35;">
                ${officialAnswerText}
              </div>
            </div>
          ` : `
            <div style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 0 4px 4px 0; margin-bottom: 10px; font-size: 0.72rem; color: #92400e; font-style: italic;">
              ⏳ Aún no has publicado una respuesta oficial de tienda para esta consulta.
            </div>
          `}

          <!-- Respuestas de otros socios/clientes en la conversación -->
          ${communityReplies.length > 0 ? `
            <div style="margin-bottom: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
              <div style="font-size: 0.68rem; font-weight: 800; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.2px;">
                💬 Respuestas de otros socios / clientes (${communityReplies.length}):
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${communityReplies.map(cr => {
                  const crDate = cr.createdAt ? new Date(cr.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                  return `
                    <div style="background: #ffffff; border-left: 3px solid #64748b; padding: 6px 10px; border-radius: 0 4px 4px 0; border: 1px solid #e2e8f0; border-left-width: 3px;">
                      <div style="display: flex; justify-content: space-between; font-size: 0.70rem; color: #334155; font-weight: 700; margin-bottom: 2px;">
                        <span>👤 ${cr.author || 'Socio'} (Cliente)</span>
                        <span style="font-family: var(--font-mono); font-size: 0.62rem; color: #94a3b8;">${crDate}</span>
                      </div>
                      <div style="font-size: 0.76rem; color: #1e293b; line-height: 1.3;">
                        ${cr.text}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Formulario para Administrador: Modificar o Publicar Respuesta Oficial -->
          <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
            <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #334155; margin-bottom: 4px;">
              ${hasOfficialReply ? '✏️ Modificar respuesta oficial de tienda (MeltyDeays Soporte):' : '💬 Publicar respuesta oficial de tienda (MeltyDeays Soporte):'}
            </label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <textarea id="admin-reply-input-${c.id}" class="form-input" style="flex: 1; min-height: 48px; font-size: 0.8rem; padding: 6px 10px; border-radius: 4px;" placeholder="Escribe la respuesta oficial como MeltyDeays Soporte...">${officialAnswerText}</textarea>
              <button type="button" class="btn-primary" style="align-self: flex-end; padding: 8px 14px; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; gap: 5px;" onclick="submitAdminCommentReply('${c.id}')">
                <span>✓</span> <span>${hasOfficialReply ? 'Actualizar Respuesta Oficial' : 'Publicar Respuesta Oficial'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #ef4444;">
        Error al cargar los comentarios: ${err.message}
      </div>
    `;
  }
}

export async function submitAdminCommentReply(commentId) {
  const input = document.getElementById(`admin-reply-input-${commentId}`);
  if (!input || !input.value.trim()) {
    showToast("Por favor escribe una respuesta antes de enviar", "error");
    return;
  }
  const replyText = input.value.trim();

  try {
    await FirestoreService.answerProductComment(commentId, replyText, "MeltyDeays · Soporte Oficial", true);
    input.value = "";
    showToast("✓ Respuesta oficial enviada y agregada al hilo", "success");
    await renderAdminCommentsList();
  } catch (e) {
    showToast("Error al publicar respuesta: " + e.message, "error");
  }
}

export async function deleteAdminComment(commentId) {
  if (!confirm("¿Deseas eliminar esta pregunta permanentemente?")) return;
  try {
    await FirestoreService.deleteProductComment(commentId);
    showToast("✓ Pregunta eliminada", "info");
    await renderAdminCommentsList();
  } catch (e) {
    showToast("Error al eliminar pregunta: " + e.message, "error");
  }
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
  window.openLainPreviewModal = openLainPreviewModal;
  window.previewNextLainTemplate = previewNextLainTemplate;
  window.previewPrevLainTemplate = previewPrevLainTemplate;
  window.confirmLainPreviewSelection = confirmLainPreviewSelection;

  // Tokens y Acciones de Factura
  window.viewSingleTokenQr = viewSingleTokenQr;
  window.copySingleQrUrl = copySingleQrUrl;
  window.testSingleQrUrl = testSingleQrUrl;
  window.openTokenActionsModal = openTokenActionsModal;
  window.executeTokenOptAssign = executeTokenOptAssign;
  window.executeTokenOptClaimCustomer = executeTokenOptClaimCustomer;
  window.openAdminClaimCustomerModal = openAdminClaimCustomerModal;
  window.confirmAdminClaimCustomer = confirmAdminClaimCustomer;
  window.onAdminClaimUserSelectChange = onAdminClaimUserSelectChange;
  window.onAdminClaimUserSearchInput = onAdminClaimUserSearchInput;
  window.onAdminClaimPointsChange = onAdminClaimPointsChange;
  window.selectAdminClaimUser = selectAdminClaimUser;
  window.setAdminClaimPointsPreset = setAdminClaimPointsPreset;
  window.toggleAdminClaimSelectMode = toggleAdminClaimSelectMode;
  window.executeTokenOptQr = executeTokenOptQr;
  window.executeTokenOptLainCard = executeTokenOptLainCard;
  window.executeTokenOptCopyLink = executeTokenOptCopyLink;
  window.executeTokenOptTestUrl = executeTokenOptTestUrl;
  window.executeTokenOptDigitalInvoice = executeTokenOptDigitalInvoice;
  window.executeTokenOptViewInvoice = executeTokenOptViewInvoice;
  window.executeTokenOptEditInvoice = executeTokenOptEditInvoice;
  window.handleInvoiceBtnClick = handleInvoiceBtnClick;
  window.filterTokensAdmin = filterTokensAdmin;
  window.filterTokensByStatus = filterTokensByStatus;
  window.sortTokensAdmin = sortTokensAdmin;

  // Catálogo de Premios y Productos
  window.openNewProductModal = openNewProductModal;
  window.openEditProductModal = openEditProductModal;
  window.saveProductAdmin = saveProductAdmin;
  window.removeProductAdmin = removeProductAdmin;
  window.handleAdminMarkSold = handleAdminMarkSold;
  window.openMarkProductSoldModal = openMarkProductSoldModal;
  window.executeConfirmMarkSold = executeConfirmMarkSold;
  window.handleAdminDecrementStock = handleAdminDecrementStock;
  window.handleAdminRestock = handleAdminRestock;
  window.handleProductImageFile = handleProductImageFile;
  window.addProductImageUrl = addProductImageUrl;
  window.removeProductImageAt = removeProductImageAt;
  window.setProductMainImage = setProductMainImage;
  window.clearProductImageUpload = clearProductImageUpload;
  window.previewProductImageFromUrl = previewProductImageFromUrl;
  window.openImageLightbox = openImageLightbox;
  window.closeImageLightbox = closeImageLightbox;
  window.lightboxNextImage = lightboxNextImage;
  window.lightboxPrevImage = lightboxPrevImage;
  window.setLightboxImageIndex = setLightboxImageIndex;
  window.toggleLightboxZoom = toggleLightboxZoom;
  window.filterCatalogAdmin = filterCatalogAdmin;
  window.filterCatalogByType = filterCatalogByType;
  window.sortCatalogAdmin = sortCatalogAdmin;

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
  window.setIncomingArrivalPreset = setIncomingArrivalPreset;
  window.setIncomingDiscountType = setIncomingDiscountType;
  window.setIncomingDiscountVal = setIncomingDiscountVal;
  window.recalculateIncomingPresale = recalculateIncomingPresale;
  window.applyCalculatedIncomingToProduct = applyCalculatedIncomingToProduct;
  window.handleAdminReleaseIncoming = handleAdminReleaseIncoming;

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
  window.sortUsersAdmin = sortUsersAdmin;
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
  window.filterVouchersAdmin = filterVouchersAdmin;
  window.sortVouchersAdmin = sortVouchersAdmin;
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

  // Consola Sandbox DB & Borrado Selectivo
  window.executeTokenOptDelete = executeTokenOptDelete;
  window.openReleaseInvoiceModal = openReleaseInvoiceModal;
  window.executeConfirmReleaseInvoice = executeConfirmReleaseInvoice;
  window.renderSandboxDbView = renderSandboxDbView;
  window.setSandboxDraftTab = setSandboxDraftTab;
  window.filterSandboxDrafts = filterSandboxDrafts;
  window.setSandboxDraftStatus = setSandboxDraftStatus;
  window.setSandboxDraftSort = setSandboxDraftSort;
  window.deleteSingleToken = deleteSingleToken;
  window.deleteSingleUser = deleteSingleUser;
  window.deleteSingleVoucher = deleteSingleVoucher;
  window.deleteSingleReward = deleteSingleReward;
  window.executePurgeUsers = executePurgeUsers;
  window.executePurgeCirculatingPoints = executePurgeCirculatingPoints;
  window.executePurgeVouchers = executePurgeVouchers;
  window.executePurgeRewards = executePurgeRewards;
  window.executePurgeInvoicesFromSandbox = executePurgeInvoicesFromSandbox;
  window.executeSeedDevData = executeSeedDevData;

  // Gestión de Preguntas de la Comunidad (Q&A)
  window.renderAdminCommentsList = renderAdminCommentsList;
  window.submitAdminCommentReply = submitAdminCommentReply;
  window.deleteAdminComment = deleteAdminComment;
  window.updateAdminPendingCommentsBadge = updateAdminPendingCommentsBadge;

  // Utilidades y Servicios Globales
  window.closeModal = closeModal;
  window.syncModalScrollLock = syncModalScrollLock;
  window.InvoiceTemplateService = InvoiceTemplateService;
  window.FirestoreService = FirestoreService;

  // Sincronización entre pestañas del navegador en tiempo real
  window.addEventListener("storage", (e) => {
    if (e.key === "wired_club_mvvm_db_v1" && vm && vm.isAuthenticated) {
      vm.refreshData();
    }
  });

  // Suscripción reactiva en tiempo real a preguntas y comentarios de la comunidad
  if (FirestoreService && typeof FirestoreService.subscribeAllProductComments === "function") {
    FirestoreService.subscribeAllProductComments(() => {
      const commTab = document.getElementById("admin-tab-community");
      if (commTab && commTab.style.display !== "none") {
        renderAdminCommentsList();
      } else {
        updateAdminPendingCommentsBadge();
      }
    });
  }

  vm.init();
  renderLainTemplateGrid();

  const tabBtnSandbox = document.getElementById("tab-btn-sandbox_db");
  if (tabBtnSandbox) {
    tabBtnSandbox.innerHTML = isProduction() ? "🗄️ Base de Datos" : "🧪 BD Sandbox";
  }

  // Inicializar máscara telefónica en campos de entrada (+505 automático)
  attachPhoneMask(document.getElementById("new-user-phone"));
  attachPhoneMask(document.getElementById("s-inv-client-phone"));

  // Observador universal para bloqueo hermético de scroll en modales (Cero fuga de scroll de fondo)
  if (typeof MutationObserver !== "undefined") {
    const modalScrollObserver = new MutationObserver(() => {
      syncModalScrollLock();
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      modalScrollObserver.observe(overlay, { attributes: true, attributeFilter: ["style", "class"] });
    });
  }
  syncModalScrollLock();

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

  // Soporte universal para cerrar modales con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModals = document.querySelectorAll(".modal-overlay");
      activeModals.forEach(m => {
        if (m.style.display !== "none" && m.style.display !== "") {
          m.style.display = "none";
        }
      });
      syncModalScrollLock();
    }
  });

  // Prevenir zoom accidental de página con gestos multitáctiles (pellizco con dos dedos)
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 1) {
      const target = e.target;
      if (target && target.closest("#lightbox-viewport")) return;
      e.preventDefault();
    }
  }, { passive: false });
});
