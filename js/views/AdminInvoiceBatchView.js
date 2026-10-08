/**
 * Vista / Subcontrolador: Lotes de Facturación 4x1, Impresión de Pliegos, Opciones de Token y Catálogo (The Wired Club)
 */
import { InvoiceTemplateService } from "../services/InvoiceTemplateService.js";
import { FirestoreService } from "../services/FirestoreService.js";
import { setProductPublicationMode, recalculateProductDiscount } from "./AdminCatalogCalculatorView.js";
import {
  setIncomingDiscountType,
  recalculateIncomingPresale,
  applyCalculatedIncomingToProduct
} from "./AdminCatalogCalculatorView.js";
import { RewardModel } from "../models/RewardModel.js";
import { isProduction, getEnvironmentInfo, getCollectionName } from "../config/env.js";
import { processImageWithAiWhiteBg } from "../utils/ImageProcessor.js";

let vm = null;
let showToast = () => {};
let closeModal = () => {};
let switchAdminTab = () => {};
let promptAssignPoints = () => {};
let openSingleDigitalInvoiceModal = () => {};
let renderTokensTable = () => {};
let renderAdmin = (m) => { if (vm && typeof vm.notify === "function") vm.notify(); };

export function initAdminInvoiceBatchView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.switchAdminTab) switchAdminTab = deps.switchAdminTab;
    if (deps.promptAssignPoints) promptAssignPoints = deps.promptAssignPoints;
    if (deps.openSingleDigitalInvoiceModal) openSingleDigitalInvoiceModal = deps.openSingleDigitalInvoiceModal;
    if (deps.renderTokensTable) renderTokensTable = deps.renderTokensTable;
    if (deps.renderAdmin) renderAdmin = deps.renderAdmin;
  }
}

let currentSingleTokenUrl = "";
let currentSheetTokens = [];


export async function generateBatchAdmin() {
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

export async function printFromModal() {
  closeModal("modal-print-sheet");
  await generateBatchAdmin();
}

// [MODULARIZADO]: Lógica de calculadora de catálogo migrada a js/views/AdminCatalogCalculatorView.js


// -----------------------------------------------------------------------------
// CALCULADORA DE PUNTOS POR VENTA (FACTURA 4X1 // REGULADOR DE RETORNO)
// -----------------------------------------------------------------------------
// [MODULARIZADO]: Lógica de calculadora de retorno WP migrada a js/views/AdminSalePointsCalculatorView.js


// =============================================================================
// GESTIÓN DE COMBOS FLEXIBLES (DYNAMIC PRODUCT TABS & STICKY SUMMARY)
// =============================================================================

let currentComboItems = [
  { id: "item-1", title: "Ítem 1", priceUsd: 25.00, residualPriceUsd: 28.00, residualDiscountPct: 20, imageUrl: "", description: "" },
  { id: "item-2", title: "Ítem 2", priceUsd: 25.00, residualPriceUsd: 28.00, residualDiscountPct: 20, imageUrl: "", description: "" }
];
let activeComboItemIndex = 0;

export function getComboItemsState() {
  return currentComboItems;
}

export function getActiveComboItemIndex() {
  return activeComboItemIndex;
}

export function activateComboBuilder(existingProduct = null) {
  const secCombo = document.getElementById("sec-product-combo-builder");
  const secFree = document.getElementById("sec-product-free-calc");
  const secDisc = document.getElementById("sec-product-discount-calc");
  const secIncoming = document.getElementById("sec-product-incoming-calc");
  const accBody = document.getElementById("prod-calc-accordion-body");
  const accBtn = document.getElementById("btn-toggle-prod-calc");
  const badge = document.getElementById("prod-mode-badge");
  const typeInput = document.getElementById("prod-reward-type");
  const isIncInput = document.getElementById("prod-is-incoming");
  const accWrapper = document.querySelector(".prod-calc-collapsible-wrapper");
  const modeSelectorWrap = document.querySelector(".prod-mode-selector-wrap");
  const summaryPill = document.getElementById("prod-commercial-summary-pill");

  if (typeInput) typeInput.value = "COMBO";
  if (isIncInput) isIncInput.value = "false";
  if (summaryPill) summaryPill.style.display = "none";
  if (secCombo) secCombo.style.display = "block";
  if (secFree) secFree.style.display = "none";
  if (secDisc) secDisc.style.display = "none";
  if (secIncoming) secIncoming.style.display = "none";
  if (accBody) accBody.style.display = "none";
  if (accBtn) accBtn.style.display = "none";
  if (accWrapper) accWrapper.style.display = "none";
  if (modeSelectorWrap) modeSelectorWrap.style.display = "none";

  const wrapTitle = document.getElementById("wrap-prod-title");
  if (wrapTitle) wrapTitle.style.display = "none";
  const lblStock = document.getElementById("lbl-prod-stock");
  if (lblStock) lblStock.textContent = "📦 STOCK DEL COMBO";
  const lblCost = document.getElementById("lbl-prod-cost");
  if (lblCost) lblCost.innerHTML = '⚡ COSTO (WP) <span style="font-size: 0.60rem; color: #059669; font-weight: 700;">(CALCULADO)</span>';

  if (badge) {
    badge.textContent = "MODO: ✨ COMBO FLEXIBLE (N EN 1)";
    badge.style.background = "#fffbeb";
    badge.style.color = "#b45309";
    badge.style.borderColor = "#fde68a";
  }

  const btnCombo = document.getElementById("btn-prod-mode-combo");
  const btnFree = document.getElementById("btn-prod-mode-free");
  const btnDisc = document.getElementById("btn-prod-mode-discount");
  const btnIncoming = document.getElementById("btn-prod-mode-incoming");
  const btnTypeStandard = document.getElementById("btn-prod-type-standard");
  const btnTypeCombo = document.getElementById("btn-prod-type-combo");

  if (btnCombo) {
    btnCombo.style.border = "2px solid #d97706";
    btnCombo.style.background = "#fffbeb";
    btnCombo.style.color = "#b45309";
    btnCombo.classList.add("active");
  }
  if (btnFree) {
    btnFree.style.border = "1.5px solid #cbd5e1";
    btnFree.style.background = "#f8fafc";
    btnFree.style.color = "#475569";
    btnFree.classList.remove("active");
  }
  if (btnDisc) {
    btnDisc.style.border = "1.5px solid #cbd5e1";
    btnDisc.style.background = "#f8fafc";
    btnDisc.style.color = "#475569";
    btnDisc.classList.remove("active");
  }
  if (btnIncoming) {
    btnIncoming.style.border = "1.5px solid #cbd5e1";
    btnIncoming.style.background = "#f8fafc";
    btnIncoming.style.color = "#475569";
    btnIncoming.classList.remove("active");
  }

  if (btnTypeCombo) {
    btnTypeCombo.style.border = "2px solid #d97706";
    btnTypeCombo.style.background = "#fffbeb";
    btnTypeCombo.style.color = "#b45309";
    btnTypeCombo.classList.add("active");
  }
  if (btnTypeStandard) {
    btnTypeStandard.style.border = "1.5px solid #cbd5e1";
    btnTypeStandard.style.background = "#f8fafc";
    btnTypeStandard.style.color = "#475569";
    btnTypeStandard.classList.remove("active");
  }

  if (existingProduct) {
    const rawItems = (typeof existingProduct.getComboItems === "function" ? existingProduct.getComboItems() : existingProduct.comboData?.items) || [];
    if (Array.isArray(rawItems) && rawItems.length >= 2) {
      currentComboItems = rawItems.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        title: it.title || `Ítem ${idx + 1}`,
        priceUsd: Number(it.priceUsd) || 0,
        residualPriceUsd: it.residualPriceUsd != null ? Number(it.residualPriceUsd) : (Number(it.priceUsd) || 0),
        residualDiscountPct: it.residualDiscountPct != null ? Number(it.residualDiscountPct) : (it.residualMaxDiscountPct != null ? Number(it.residualMaxDiscountPct) : 15),
        imageUrl: it.imageUrl || "",
        description: it.description || ""
      }));
    }
    const promoInput = document.getElementById("combo-promo-price-usd");
    if (promoInput && existingProduct.priceUsd != null) {
      promoInput.value = existingProduct.priceUsd;
    }
    const maxDiscInput = document.getElementById("combo-max-discount-pct");
    if (maxDiscInput && existingProduct.maxDiscountPct != null) {
      maxDiscInput.value = existingProduct.maxDiscountPct;
    }
    const pkgTitleInput = document.getElementById("combo-package-title");
    if (pkgTitleInput) {
      pkgTitleInput.value = existingProduct.title || "";
    }
    const prodTitleInput = document.getElementById("prod-title");
    if (prodTitleInput && existingProduct.title) {
      prodTitleInput.value = existingProduct.title;
    }
  }

  activeComboItemIndex = 0;
  renderComboItemTabs();
  if (currentComboItems[0]) {
    populateComboItemForm(currentComboItems[0]);
  }
  updateComboLiveSummary();
}

export function deactivateComboBuilder() {
  const secCombo = document.getElementById("sec-product-combo-builder");
  const accBtn = document.getElementById("btn-toggle-prod-calc");
  const accWrapper = document.querySelector(".prod-calc-collapsible-wrapper");
  const modeSelectorWrap = document.querySelector(".prod-mode-selector-wrap");

  if (secCombo) secCombo.style.display = "none";
  if (accBtn) accBtn.style.display = "";
  if (accWrapper) accWrapper.style.display = "";
  if (modeSelectorWrap) modeSelectorWrap.style.display = "";

  const wrapTitle = document.getElementById("wrap-prod-title");
  if (wrapTitle) wrapTitle.style.display = "";
  const lblStock = document.getElementById("lbl-prod-stock");
  if (lblStock) lblStock.textContent = "📦 STOCK FÍSICO";
  const lblCost = document.getElementById("lbl-prod-cost");
  if (lblCost) lblCost.textContent = "⚡ COSTO (WP)";

  const btnCombo = document.getElementById("btn-prod-mode-combo");
  const btnTypeStandard = document.getElementById("btn-prod-type-standard");
  const btnTypeCombo = document.getElementById("btn-prod-type-combo");

  if (btnCombo) {
    btnCombo.style.border = "1.5px solid #cbd5e1";
    btnCombo.style.background = "#f8fafc";
    btnCombo.style.color = "#475569";
    btnCombo.classList.remove("active");
  }
  if (btnTypeCombo) {
    btnTypeCombo.style.border = "1.5px solid #cbd5e1";
    btnTypeCombo.style.background = "#f8fafc";
    btnTypeCombo.style.color = "#475569";
    btnTypeCombo.classList.remove("active");
  }
  if (btnTypeStandard) {
    btnTypeStandard.style.border = "2px solid #059669";
    btnTypeStandard.style.background = "#ecfdf5";
    btnTypeStandard.style.color = "#065f46";
    btnTypeStandard.classList.add("active");
  }
}

export function setProductMainType(type) {
  if (type === "COMBO") {
    activateComboBuilder();
  } else {
    deactivateComboBuilder();
    setProductPublicationMode("FREE_REWARD");
  }
}

export function addComboItemTab() {
  syncActiveComboItemFromInputs();
  const nextNum = currentComboItems.length + 1;
  const newItem = {
    id: `item-${nextNum}`,
    title: `Ítem ${nextNum}`,
    priceUsd: 20.00,
    residualPriceUsd: 22.00,
    residualDiscountPct: 15,
    imageUrl: "",
    description: ""
  };
  currentComboItems.push(newItem);
  activeComboItemIndex = currentComboItems.length - 1;
  renderComboItemTabs();
  populateComboItemForm(newItem);
  updateComboLiveSummary();

  const titleInput = document.getElementById("combo-item-title");
  if (titleInput) {
    titleInput.focus({ preventScroll: true });
    if (typeof titleInput.select === "function") titleInput.select();
  }

  const tabBar = document.getElementById("combo-items-tabs-bar") || document.getElementById("combo-items-tab-bar");
  if (tabBar && typeof tabBar.scrollTo === "function") {
    tabBar.scrollTo({ left: tabBar.scrollWidth, behavior: "smooth" });
  }
}

export function removeComboItemTab(index) {
  if (currentComboItems.length <= 2) {
    showToast("⚠️ Un combo flexible requiere un mínimo de 2 artículos.", "info");
    return;
  }
  const idx = Number(index);
  if (idx < 0 || idx >= currentComboItems.length) return;

  currentComboItems.splice(idx, 1);
  if (activeComboItemIndex >= currentComboItems.length) {
    activeComboItemIndex = currentComboItems.length - 1;
  }
  if (activeComboItemIndex < 0) activeComboItemIndex = 0;

  renderComboItemTabs();
  if (currentComboItems[activeComboItemIndex]) {
    populateComboItemForm(currentComboItems[activeComboItemIndex]);
  }
  updateComboLiveSummary();
}

export function selectComboItemTab(index) {
  const idx = Number(index);
  if (idx < 0 || idx >= currentComboItems.length) return;
  syncActiveComboItemFromInputs();
  activeComboItemIndex = idx;
  renderComboItemTabs();
  if (currentComboItems[activeComboItemIndex]) {
    populateComboItemForm(currentComboItems[activeComboItemIndex]);
  }
  updateComboLiveSummary();
}

export function onActiveComboItemChange(field, val) {
  if (!currentComboItems[activeComboItemIndex]) return;
  const item = currentComboItems[activeComboItemIndex];

  if (field === "priceUsd" || field === "residualPriceUsd" || field === "residualDiscountPct") {
    const num = parseFloat(val);
    item[field] = isNaN(num) ? 0 : num;
    if (field === "residualDiscountPct") {
      item.residualMaxDiscountPct = item[field];
    }
  } else {
    item[field] = val || "";
  }

  if (field === "title") {
    const activeTabLabel = document.querySelector(`.combo-tab-item[data-tab-idx="${activeComboItemIndex}"] .combo-tab-title-text`);
    if (activeTabLabel) {
      const displayTitle = item.title && item.title.trim() ? item.title.trim() : `Ítem ${activeComboItemIndex + 1}`;
      activeTabLabel.textContent = displayTitle.length > 14 ? displayTitle.substring(0, 12) + "..." : displayTitle;
    }
  }

  updateComboLiveSummary();
}

export function syncActiveComboItemFromInputs() {
  if (!currentComboItems[activeComboItemIndex]) return;
  const item = currentComboItems[activeComboItemIndex];
  const titleEl = document.getElementById("combo-item-title");
  const priceEl = document.getElementById("combo-item-price");
  const resPriceEl = document.getElementById("combo-item-residual-price");
  const resDiscEl = document.getElementById("combo-item-residual-discount-pct");
  const imgEl = document.getElementById("combo-item-image");
  const descEl = document.getElementById("combo-item-desc");

  if (titleEl) item.title = (titleEl.value || "").trim();
  if (priceEl) item.priceUsd = Math.max(0, parseFloat(priceEl.value) || 0);
  if (resPriceEl) item.residualPriceUsd = Math.max(0, parseFloat(resPriceEl.value) || (item.priceUsd || 0));
  if (resDiscEl) {
    const p = Math.max(0, Math.min(100, parseFloat(resDiscEl.value) || 15));
    item.residualDiscountPct = p;
    item.residualMaxDiscountPct = p;
  }
  if (imgEl) item.imageUrl = (imgEl.value || "").trim();
  if (descEl) item.description = (descEl.value || "").trim();
}

export function populateComboItemForm(item) {
  if (!item) return;
  const titleEl = document.getElementById("combo-item-title");
  const priceEl = document.getElementById("combo-item-price");
  const resPriceEl = document.getElementById("combo-item-residual-price");
  const resDiscEl = document.getElementById("combo-item-residual-discount-pct");
  const imgEl = document.getElementById("combo-item-image");
  const descEl = document.getElementById("combo-item-desc");

  if (titleEl) titleEl.value = item.title || "";
  if (priceEl) priceEl.value = (item.priceUsd != null && item.priceUsd !== "") ? item.priceUsd : "";
  if (resPriceEl) resPriceEl.value = (item.residualPriceUsd != null && item.residualPriceUsd !== "") ? item.residualPriceUsd : "";
  const discVal = item.residualDiscountPct != null ? item.residualDiscountPct : (item.residualMaxDiscountPct != null ? item.residualMaxDiscountPct : 15);
  if (resDiscEl) resDiscEl.value = discVal;
  if (imgEl) imgEl.value = item.imageUrl || "";
  if (descEl) descEl.value = item.description || "";
}

export function renderComboItemTabs() {
  const tabBar = document.getElementById("combo-items-tabs-bar") || document.getElementById("combo-items-tab-bar");
  if (!tabBar) return;

  const canDelete = currentComboItems.length > 2;

  tabBar.innerHTML = currentComboItems.map((item, idx) => {
    const isActive = idx === activeComboItemIndex;
    const titleText = item.title && item.title.trim() ? item.title.trim() : `Ítem ${idx + 1}`;
    const displayTitle = titleText.length > 14 ? titleText.substring(0, 12) + "..." : titleText;

    return `
      <div class="combo-tab-item ${isActive ? 'active' : ''}" data-tab-idx="${idx}" style="display: inline-flex; align-items: center; gap: 4px; border: ${isActive ? '2px solid #2563eb' : '1.5px solid #cbd5e1'}; background: ${isActive ? '#eff6ff' : '#f8fafc'}; border-radius: 4px; padding: 2px 6px; min-height: 38px; height: 38px; box-sizing: border-box; user-select: none;">
        <button type="button" class="combo-tab-btn" onclick="selectComboItemTab(${idx})" style="background: transparent; border: none; font-family: var(--font-mono); font-size: 0.73rem; font-weight: ${isActive ? '900' : '700'}; color: ${isActive ? '#1d4ed8' : '#334155'}; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0 2px; height: 100%;">
          <span>📦</span> <span class="combo-tab-title-text">${displayTitle}</span>
        </button>
        ${canDelete ? `
          <button type="button" class="combo-tab-del" onclick="removeComboItemTab(${idx})" title="Eliminar ítem ${idx + 1}" style="background: transparent; border: none; color: #94a3b8; font-size: 0.75rem; font-weight: 900; cursor: pointer; padding: 0 4px; border-radius: 3px; height: 24px; width: 20px; display: flex; align-items: center; justify-content: center;">✕</button>
        ` : `
          <button type="button" class="combo-tab-del" disabled title="Mínimo 2 artículos obligatorios" style="background: transparent; border: none; color: #cbd5e1; font-size: 0.75rem; font-weight: 900; cursor: not-allowed; padding: 0 4px; height: 24px; width: 20px; display: flex; align-items: center; justify-content: center; opacity: 0.35;">✕</button>
        `}
      </div>
    `;
  }).join("");
}

export function updateComboLiveSummary() {
  const sumUsd = Number(currentComboItems.reduce((acc, it) => acc + (parseFloat(it.priceUsd) || 0), 0).toFixed(2));

  const sumEl = document.getElementById("combo-sum-usd");
  if (sumEl) sumEl.textContent = `$${sumUsd.toFixed(2)} USD`;

  const countLabel = document.getElementById("combo-item-count-label");
  if (countLabel) countLabel.textContent = String(currentComboItems.length);

  const promoInput = document.getElementById("combo-promo-price-usd");
  let promoPrice = parseFloat(promoInput?.value);
  if (isNaN(promoPrice) || promoPrice <= 0) {
    if (sumUsd > 0) {
      promoPrice = Number((sumUsd * 0.85).toFixed(2));
      if (promoInput && !promoInput.value) {
        promoInput.value = promoPrice.toFixed(2);
      }
    } else {
      promoPrice = 0;
    }
  }

  const maxDiscInput = document.getElementById("combo-max-discount-pct");
  const maxDiscPct = Math.min(100, Math.max(0, parseFloat(maxDiscInput?.value) || 20));
  const maxDiscUsd = Number((promoPrice * (maxDiscPct / 100)).toFixed(2));
  const cashToPayUsd = Math.max(0, Number((promoPrice - maxDiscUsd).toFixed(2)));

  let pointsCost = Math.round(maxDiscUsd * 50);
  if (pointsCost % 10 !== 0) pointsCost = Math.round(pointsCost / 10) * 10;
  if (pointsCost < 10) pointsCost = 10;

  const savingsUsd = Math.max(0, Number((sumUsd - promoPrice).toFixed(2)));
  const savingsPct = sumUsd > 0 ? Math.round((savingsUsd / sumUsd) * 100) : 0;

  const savingsEl = document.getElementById("combo-savings-usd");
  if (savingsEl) {
    savingsEl.textContent = `$${savingsUsd.toFixed(2)} USD (${savingsPct}% OFF)`;
  }

  const badgeEl = document.getElementById("combo-savings-badge");
  if (badgeEl) {
    badgeEl.textContent = `${savingsPct}% AHORRO`;
  }

  // Sincronizar inputs estándar para cuando se consulte prod-cost / prod-price-usd
  const typeInput = document.getElementById("prod-reward-type");
  if (typeInput && typeInput.value === "COMBO") {
    const prodPriceHidden = document.getElementById("prod-price-usd");
    if (prodPriceHidden) prodPriceHidden.value = promoPrice;
    const prodMaxPctHidden = document.getElementById("prod-max-discount-pct");
    if (prodMaxPctHidden) prodMaxPctHidden.value = maxDiscPct;
    const prodMaxUsdHidden = document.getElementById("prod-max-discount-usd");
    if (prodMaxUsdHidden) prodMaxUsdHidden.value = maxDiscUsd;
    const prodCashHidden = document.getElementById("prod-cash-to-pay-usd");
    if (prodCashHidden) prodCashHidden.value = cashToPayUsd;
    const prodCostInput = document.getElementById("prod-cost");
    if (prodCostInput) {
      prodCostInput.value = pointsCost;
      prodCostInput.placeholder = `${pointsCost} WP`;
    }

    // Sincronizar título del paquete combo hacia prod-title
    const comboPkgTitleInput = document.getElementById("combo-package-title");
    const prodTitleInput = document.getElementById("prod-title");
    if (comboPkgTitleInput && prodTitleInput && comboPkgTitleInput.value) {
      prodTitleInput.value = comboPkgTitleInput.value;
    }
  }

  // Actualizar resumen visual de puntos y cobro en tarjeta de combo
  const ptsEl = document.getElementById("combo-summary-pts");
  if (ptsEl) ptsEl.textContent = `${pointsCost} WP`;
  const cashEl = document.getElementById("combo-summary-cash");
  if (cashEl) cashEl.textContent = `$${cashToPayUsd.toFixed(2)} USD`;
}

export function openNewProductModal() {
  const modal = document.getElementById("modal-new-product");
  if (!modal) return;
  const editIdEl = document.getElementById("prod-edit-id");
  if (editIdEl) editIdEl.value = "";
  const titleEl = document.getElementById("modal-product-title");
  if (titleEl) titleEl.textContent = "📦 + AGREGAR PRODUCTO AL CATÁLOGO";
  const btnSubmit = document.getElementById("btn-save-product-submit");
  if (btnSubmit) btnSubmit.textContent = "⚡ GUARDAR EN CATÁLOGO";

  const titleInput = document.getElementById("prod-title");
  if (titleInput) titleInput.value = "";
  const costInput = document.getElementById("prod-cost");
  if (costInput) {
    costInput.value = "";
    costInput.placeholder = "820";
  }
  const stockInput = document.getElementById("prod-stock");
  if (stockInput) stockInput.value = "1";
  const imgInput = document.getElementById("prod-img");
  if (imgInput) imgInput.value = "";
  const descInput = document.getElementById("prod-desc");
  if (descInput) descInput.value = "";
  clearProductImageUpload();

  // Limpiar campos y parámetros de preventa
  const isIncInput = document.getElementById("prod-is-incoming");
  if (isIncInput) isIncInput.value = "false";
  const estArrInput = document.getElementById("prod-estimated-arrival");
  if (estArrInput) estArrInput.value = "";
  const dtInput = document.getElementById("calc-incoming-arrival-datetime");
  if (dtInput) dtInput.value = "";
  const incPriceInput = document.getElementById("calc-incoming-price-usd");
  if (incPriceInput) incPriceInput.value = "50.00";
  const incDiscValInput = document.getElementById("calc-incoming-discount-val");
  if (incDiscValInput) incDiscValInput.value = "15";
  const discTypeInput = document.getElementById("prod-presale-discount-type");
  if (discTypeInput) discTypeInput.value = "PERCENTAGE";
  const discValHidden = document.getElementById("prod-presale-discount-val");
  if (discValHidden) discValHidden.value = "0";
  const discUsdHidden = document.getElementById("prod-presale-discount-usd");
  if (discUsdHidden) discUsdHidden.value = "0";
  const presalePriceHidden = document.getElementById("prod-presale-price-usd");
  if (presalePriceHidden) presalePriceHidden.value = "0";

  // Reiniciar estado y pestañas de combo flexible
  currentComboItems = [
    { id: "item-1", title: "Ítem 1", priceUsd: 25.00, residualPriceUsd: 28.00, residualDiscountPct: 20, imageUrl: "", description: "" },
    { id: "item-2", title: "Ítem 2", priceUsd: 25.00, residualPriceUsd: 28.00, residualDiscountPct: 20, imageUrl: "", description: "" }
  ];
  activeComboItemIndex = 0;
  const comboPromoInput = document.getElementById("combo-promo-price-usd");
  if (comboPromoInput) comboPromoInput.value = "40.00";
  const comboMaxDiscInput = document.getElementById("combo-max-discount-pct");
  if (comboMaxDiscInput) comboMaxDiscInput.value = "20";
  const comboPkgTitleInput = document.getElementById("combo-package-title");
  if (comboPkgTitleInput) comboPkgTitleInput.value = "";
  renderComboItemTabs();
  if (currentComboItems[0]) populateComboItemForm(currentComboItems[0]);
  updateComboLiveSummary();
  deactivateComboBuilder();

  modal.style.display = "flex";
  modal.scrollTop = 0;
  const modalContentEl = modal.querySelector(".modal-content");
  if (modalContentEl) modalContentEl.scrollTop = 0;
  requestAnimationFrame(() => {
    modal.scrollTop = 0;
    if (modalContentEl) modalContentEl.scrollTop = 0;
  });

  if (typeof window !== "undefined" && typeof window.syncModalScrollLock === "function") {
    window.syncModalScrollLock();
  }
  setProductPublicationMode("FREE_REWARD");
  setTimeout(() => {
    if (titleInput && typeof titleInput.focus === "function") {
      titleInput.focus({ preventScroll: true });
    }
  }, 100);
}

export function openEditProductModal(productId) {
  const modal = document.getElementById("modal-new-product");
  if (!modal) return;
  const product = (vm.catalog || []).find(p => p.id === productId);
  if (!product) {
    showToast("⚠️ No se encontró el producto a editar.", "error");
    return;
  }

  const editIdEl = document.getElementById("prod-edit-id");
  if (editIdEl) editIdEl.value = product.id;
  const titleEl = document.getElementById("modal-product-title");
  if (titleEl) titleEl.textContent = "📦 ✏️ EDITAR PRODUCTO DEL CATÁLOGO";
  const btnSubmit = document.getElementById("btn-save-product-submit");
  if (btnSubmit) btnSubmit.textContent = "💾 ACTUALIZAR PRODUCTO";

  const isIncoming = product.status === "INCOMING" || Boolean(product.isIncomingFlag) || (typeof product.isIncoming === "function" && product.isIncoming());
  const isCombo = product.rewardType === "COMBO" || (typeof product.isCombo === "function" && product.isCombo());
  const isPartial = !isIncoming && !isCombo && (product.rewardType === "PARTIAL_DISCOUNT" || (typeof product.isPartialDiscount === "function" && product.isPartialDiscount()));

  if (isCombo) {
    activateComboBuilder(product);
  } else if (isIncoming) {
    deactivateComboBuilder();
    setProductPublicationMode("INCOMING");
    const incPrice = document.getElementById("calc-incoming-price-usd");
    if (incPrice) incPrice.value = (product.priceUsd || 50).toFixed(2);
    if (product.estimatedArrival) {
      const d = new Date(product.estimatedArrival);
      const pad = n => String(n).padStart(2, "0");
      const localStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const dtInput = document.getElementById("calc-incoming-arrival-datetime");
      if (dtInput) dtInput.value = localStr;
    }
    const valInput = document.getElementById("calc-incoming-discount-val");
    if (valInput) valInput.value = product.presaleDiscountValue || 15;
    setIncomingDiscountType(product.presaleDiscountType || "PERCENTAGE");
    recalculateIncomingPresale();
    applyCalculatedIncomingToProduct();
  } else if (isPartial) {
    deactivateComboBuilder();
    setProductPublicationMode("PARTIAL_DISCOUNT");
    const priceInput = document.getElementById("calc-sale-prod-price-usd");
    if (priceInput) priceInput.value = (product.priceUsd || 0).toFixed(2);
    const discInput = document.getElementById("calc-sale-prod-discount-pct");
    if (discInput) discInput.value = product.maxDiscountPct || 5;
    const prodPriceHidden = document.getElementById("prod-price-usd");
    if (prodPriceHidden) prodPriceHidden.value = product.priceUsd || 0;
    const prodMaxPctHidden = document.getElementById("prod-max-discount-pct");
    if (prodMaxPctHidden) prodMaxPctHidden.value = product.maxDiscountPct || 5;
    const prodMaxUsdHidden = document.getElementById("prod-max-discount-usd");
    if (prodMaxUsdHidden) prodMaxUsdHidden.value = product.maxDiscountUsd || 0;
    const prodCashHidden = document.getElementById("prod-cash-to-pay-usd");
    if (prodCashHidden) prodCashHidden.value = product.cashToPayUsd || 0;
  } else {
    deactivateComboBuilder();
    setProductPublicationMode("FREE_REWARD");
  }

  const titleInput = document.getElementById("prod-title");
  if (titleInput) titleInput.value = product.title || "";
  const costInput = document.getElementById("prod-cost");
  if (costInput) costInput.value = isIncoming ? 0 : (product.pointsCost != null ? product.pointsCost : "");
  const stockInput = document.getElementById("prod-stock");
  if (stockInput) stockInput.value = product.stock != null ? product.stock : 1;
  const descInput = document.getElementById("prod-desc");
  if (descInput) descInput.value = product.description || "";

  const productImages = typeof product.getImages === "function" 
    ? product.getImages() 
    : (Array.isArray(product.images) && product.images.length ? [...product.images] : (product.imageUrl ? [product.imageUrl] : []));

  const imgInput = document.getElementById("prod-img") || document.getElementById("prod-img-url-input");
  if (imgInput) imgInput.value = "";

  currentProductImages = [...productImages];
  renderProductImagesPreview();

  modal.style.display = "flex";
  modal.scrollTop = 0;
  const modalContentEl = modal.querySelector(".modal-content");
  if (modalContentEl) modalContentEl.scrollTop = 0;
  requestAnimationFrame(() => {
    modal.scrollTop = 0;
    if (modalContentEl) modalContentEl.scrollTop = 0;
  });

  if (typeof window !== "undefined" && typeof window.syncModalScrollLock === "function") {
    window.syncModalScrollLock();
  }
  setTimeout(() => {
    if (titleInput && typeof titleInput.focus === "function") {
      titleInput.focus({ preventScroll: true });
    }
  }, 100);
}


export function validateLotCountInput(input) {
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

export function enforceMultipleOfFour(input) {
  let val = parseInt(input?.value, 10);
  if (isNaN(val) || val < 4) val = 4;
  if (val % 4 !== 0) {
    const rounded = Math.ceil(val / 4) * 4;
    input.value = rounded;
    showToast(`Cantidad ajustada a ${rounded} facturas (${rounded / 4} pliegos carta completos de 4x1).`, "info");
  }
  validateLotCountInput(input);
}

export function openPurgeModal() {
  const modal = document.getElementById("modal-purge-invoices");
  if (!modal) return;
  const countBadge = document.getElementById("purge-tokens-count-badge");
  const count = (vm.tokens || []).length;
  if (countBadge) countBadge.textContent = `${count} ${count === 1 ? 'factura registrada' : 'facturas registradas'}`;

  const envBanner = document.getElementById("purge-invoices-env-banner");
  if (envBanner) {
    const isProd = isProduction();
    if (isProd) {
      envBanner.innerHTML = `
        <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRODUCCIÓN (LIVE)</strong>
            <span>Esta acción eliminará facturas de la colección principal <code>qr_tokens</code> y <code>point_batches</code>.</span>
          </div>
        </div>`;
    } else {
      envBanner.innerHTML = `
        <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #854d0e; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">🧪</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRUEBAS (SANDBOX)</strong>
            <span>Solo se eliminarán facturas de prueba en <code>dev_qr_tokens</code> y <code>dev_point_batches</code>. <strong>La base de datos de PRODUCCIÓN está 100% protegida e intacta.</strong></span>
          </div>
        </div>`;
    }
  }

  modal.style.display = "flex";
}

export async function executePurgeInvoices() {
  closeModal("modal-purge-invoices");
  const isProd = isProduction();
  showToast(isProd ? "Ejecutando purga en base de datos de producción..." : "Ejecutando purga en base de datos de PRUEBAS (dev_*)...", "info");
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
    showToast(isProd ? "✓ Facturas de PRODUCCIÓN eliminadas y correlativo restablecido a #0001." : "✓ Facturas de PRUEBAS (dev_*) eliminadas y correlativo restablecido a #0001. Producción 100% intacta.", "success");
  } catch (err) {
    showToast("❌ Error al limpiar base de datos: " + err.message, "error");
  }
}

export function openPurgeAllDbModal() {
  const modal = document.getElementById("modal-purge-all-db");
  if (!modal) return;

  const envBanner = document.getElementById("purge-all-db-env-banner");
  if (envBanner) {
    const isProd = isProduction();
    if (isProd) {
      envBanner.innerHTML = `
        <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRODUCCIÓN (LIVE)</strong>
            <span>Esta acción purgará los datos oficiales de producción en Firestore y almacenamiento local.</span>
          </div>
        </div>`;
    } else {
      envBanner.innerHTML = `
        <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #854d0e; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">🧪</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRUEBAS (SANDBOX)</strong>
            <span>La purga solo borrará colecciones <code>dev_*</code> (socios, vales, facturas y catálogo demo). <strong>La base de datos de PRODUCCIÓN está 100% blindada y jamás será alterada.</strong></span>
          </div>
        </div>`;
    }
  }

  modal.style.display = "flex";
}

export async function executePurgeAllDb() {
  closeModal("modal-purge-all-db");
  const isProd = isProduction();
  showToast(isProd ? "Ejecutando purga total de producción..." : "Ejecutando purga de base de datos de PRUEBAS (dev_*)...", "info");
  try {
    const res = await vm.purgeEntireDatabase();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderAdmin(vm);

    showToast(isProd ? "✓ Base de datos de PRODUCCIÓN purgada. El PIN de Admin sigue intacto." : "✓ Base de datos de PRUEBAS (dev_*) purgada. Base de datos de PRODUCCIÓN 100% intacta.", "success");
  } catch (err) {
    showToast("❌ Error al purgar la base de datos: " + err.message, "error");
  }
}

let currentProductImages = [];

export async function handleProductImageFile(input) {
  if (!input.files || input.files.length === 0) return;
  const files = Array.from(input.files).filter(f => f.type.startsWith("image/"));

  if (files.length === 0) {
    showToast("⚠️ Selecciona archivos de imagen válidos (JPG, PNG, WebP).", "error");
    return;
  }

  const aiToggle = document.getElementById("toggle-ai-white-bg");
  const aiEnabled = aiToggle ? aiToggle.checked : true;

  showToast(aiEnabled ? `Procesando ${files.length} foto(s) con IA (Fondo Blanco 1:1)...` : `Optimizando ${files.length} imagen(es)...`, "info");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (aiEnabled) {
        const processedDataUrl = await processImageWithAiWhiteBg(file, {
          onProgress: (msg) => showToast(`Foto ${i + 1}/${files.length}: ${msg}`, "info")
        });
        currentProductImages.push(processedDataUrl);
      } else {
        const base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const maxDim = 800;
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
              resolve(canvas.toDataURL("image/jpeg", 0.78));
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
        currentProductImages.push(base64Data);
      }
    } catch (err) {
      console.warn("Fallo procesando imagen:", err);
    }
  }

  renderProductImagesPreview();
  showToast(`✓ ${files.length} foto(s) agregada(s)${aiEnabled ? ' con Fondo Blanco 1:1' : ''}.`, "success");
  input.value = "";
}

export async function cleanProductImageWithAi(index) {
  if (index < 0 || index >= currentProductImages.length) return;
  const original = currentProductImages[index];
  showToast("Iniciando procesamiento IA (Fondo Blanco 1:1)...", "info");
  try {
    const cleaned = await processImageWithAiWhiteBg(original, {
      onProgress: (msg) => showToast(msg, "info")
    });
    currentProductImages[index] = cleaned;
    renderProductImagesPreview();
    showToast("✓ Fondo blanco 1:1 aplicado exitosamente.", "success");
  } catch (err) {
    showToast("⚠️ Fallo en procesamiento IA, se mantiene imagen actual.", "error");
  }
}

export function addProductImageUrl() {
  const input = document.getElementById("prod-img") || document.getElementById("prod-img-url-input");
  const url = (input?.value || "").trim();
  if (!url) {
    showToast("⚠️ Ingresa una URL de imagen válida.", "error");
    return;
  }
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image")) {
    showToast("⚠️ La URL debe iniciar con https:// o http://", "error");
    return;
  }
  if (currentProductImages.includes(url)) {
    showToast("⚠️ Esta imagen ya ha sido agregada a la lista.", "info");
    return;
  }
  currentProductImages.push(url);
  if (input) input.value = "";
  renderProductImagesPreview();
  showToast("✓ Imagen agregada desde URL.", "success");
}

export function removeProductImageAt(index) {
  if (index >= 0 && index < currentProductImages.length) {
    currentProductImages.splice(index, 1);
    renderProductImagesPreview();
    showToast("Imagen eliminada de la lista.", "info");
  }
}

export function setProductMainImage(index) {
  if (index > 0 && index < currentProductImages.length) {
    const [item] = currentProductImages.splice(index, 1);
    currentProductImages.unshift(item);
    renderProductImagesPreview();
    showToast("✓ Imagen designada como portada principal.", "success");
  }
}

export function renderProductImagesPreview() {
  const grid = document.getElementById("prod-images-container") || document.getElementById("admin-multi-img-grid");
  const counter = document.getElementById("prod-images-count-badge") || document.getElementById("prod-img-counter");
  const helper = document.getElementById("prod-images-helper");
  const btnClear = document.getElementById("btn-clear-all-images");
  const previewBox = document.getElementById("prod-img-preview-box");
  const hiddenImgInput = document.getElementById("prod-img-hidden") || document.getElementById("prod-img-preview-value");

  if (hiddenImgInput) {
    hiddenImgInput.value = currentProductImages[0] || "";
  }

  if (counter) {
    counter.textContent = currentProductImages.length === 1 
      ? "1 FOTO" 
      : `${currentProductImages.length} FOTOS`;
  }

  if (btnClear) {
    btnClear.style.display = currentProductImages.length > 0 ? "inline-block" : "none";
  }

  if (helper) {
    helper.style.display = currentProductImages.length > 0 ? "block" : "none";
  }

  if (!grid) return;

  if (currentProductImages.length === 0) {
    grid.style.display = "none";
    if (previewBox) previewBox.style.display = "none";
    grid.innerHTML = "";
    return;
  }

  grid.style.display = "grid";
  if (previewBox) previewBox.style.display = "block";

  grid.innerHTML = currentProductImages.map((imgSrc, idx) => {
    const isMain = idx === 0;
    const isBase64 = imgSrc.startsWith("data:image");
    const sourceLabel = isBase64 ? "Base64" : "URL";
    return `
      <div class="admin-img-card ${isMain ? 'is-main' : ''}">
        ${isMain ? '<span class="admin-img-badge-main">⭐ PORTADA</span>' : `<span class="admin-img-badge-order">#${idx + 1}</span>`}
        <button type="button" class="admin-btn-del-img" onclick="removeProductImageAt(${idx})" title="Eliminar imagen">✕</button>
        <img src="${imgSrc}" alt="Foto ${idx + 1}" onclick="if (typeof openImageLightbox === 'function') openImageLightbox(${JSON.stringify(currentProductImages).replace(/"/g, '&quot;')}, ${idx}, 'Vista Previa Admin')" onerror="this.onerror=null; this.src=''; this.parentElement.style.opacity=0.6;">
        <div class="admin-img-actions" style="flex-direction: column; gap: 3px; padding: 4px;">
          ${isMain 
            ? '<span class="admin-main-active-label">⭐ PORTADA ACTIVA</span>' 
            : `<button type="button" class="admin-btn-set-main" onclick="setProductMainImage(${idx})" title="Convertir esta foto en la imagen de portada principal">⭐ Portada</button>`
          }
          <button type="button" class="admin-btn-ai-clean" onclick="cleanProductImageWithAi(${idx})" title="Remover fondo con IA y centrar en fondo blanco puro 1:1">✨ Fondo Blanco 1:1</button>
        </div>
      </div>
    `;
  }).join("");
}

export function clearProductImageUpload() {
  currentProductImages = [];
  const fileInput = document.getElementById("prod-file-input");
  if (fileInput) fileInput.value = "";
  const urlInput = document.getElementById("prod-img") || document.getElementById("prod-img-url-input");
  if (urlInput) urlInput.value = "";
  renderProductImagesPreview();
}

export function previewProductImageFromUrl(url) {
  if (!url) {
    clearProductImageUpload();
    return;
  }
  if (Array.isArray(url)) {
    currentProductImages = [...url];
  } else {
    currentProductImages = [url];
  }
  renderProductImagesPreview();
}

export async function saveProductAdmin() {
  const title = (document.getElementById("prod-title").value || "").trim();
  const rawCost = document.getElementById("prod-cost")?.value;
  const pointsCost = parseInt(rawCost, 10);
  const stock = parseInt(document.getElementById("prod-stock").value, 10) || 1;
  const description = (document.getElementById("prod-desc").value || "").trim();

  // Multi-imágenes: auto-capturar URL pendiente si quedó en el input sin presionar el botón
  const pendingUrl = ((document.getElementById("prod-img")?.value || document.getElementById("prod-img-url-input")?.value) || "").trim();
  if (pendingUrl && (pendingUrl.startsWith("http://") || pendingUrl.startsWith("https://") || pendingUrl.startsWith("data:image"))) {
    if (!currentProductImages.includes(pendingUrl)) {
      currentProductImages.push(pendingUrl);
    }
  }

  const images = [...currentProductImages];
  const imageUrl = images[0] || (pendingUrl && !pendingUrl.includes(" ") ? pendingUrl : "");

  const activeProductMode = document.getElementById("prod-reward-type")?.value || "FREE_REWARD";
  const editId = (document.getElementById("prod-edit-id")?.value || "").trim();

  if (activeProductMode === "COMBO") {
    syncActiveComboItemFromInputs();
    if (currentComboItems.length < 2) {
      showToast("⚠️ Un combo flexible requiere al menos 2 artículos.", "error");
      return;
    }
    for (let i = 0; i < currentComboItems.length; i++) {
      const it = currentComboItems[i];
      if (!it.title || !it.title.trim()) {
        showToast(`⚠️ El artículo #${i + 1} del combo requiere un título.`, "error");
        return;
      }
      const p = parseFloat(it.priceUsd);
      if (isNaN(p) || p <= 0) {
        showToast(`⚠️ El artículo #${i + 1} (${it.title}) requiere un precio regular mayor a $0 USD.`, "error");
        return;
      }
    }

    const sumUsd = Number(currentComboItems.reduce((acc, it) => acc + (parseFloat(it.priceUsd) || 0), 0).toFixed(2));
    let promoPriceUsd = parseFloat(document.getElementById("combo-promo-price-usd")?.value);
    if (isNaN(promoPriceUsd) || promoPriceUsd <= 0) {
      promoPriceUsd = Number((sumUsd * 0.85).toFixed(2));
    }
    const maxDiscountPct = parseFloat(document.getElementById("combo-max-discount-pct")?.value) || 20;
    const maxDiscountUsd = Number((promoPriceUsd * (maxDiscountPct / 100)).toFixed(2));
    const cashToPayUsd = Math.max(0, Number((promoPriceUsd - maxDiscountUsd).toFixed(2)));
    let pointsCost = Math.round(maxDiscountUsd * 50);
    if (pointsCost % 10 !== 0) pointsCost = Math.round(pointsCost / 10) * 10;
    if (pointsCost < 10) pointsCost = 10;

    const pkgTitleInput = document.getElementById("combo-package-title");
    let comboTitle = (pkgTitleInput?.value || title || "").trim();
    if (!comboTitle) {
      showToast("⚠️ El título del combo en el catálogo es obligatorio.", "error");
      if (pkgTitleInput) {
        pkgTitleInput.focus({ preventScroll: true });
        pkgTitleInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const itemImages = currentComboItems.map(it => it.imageUrl).filter(Boolean);
    const currentImages = Array.isArray(currentProductImages) ? currentProductImages : [];
    const allImages = [...itemImages, ...currentImages].filter((v, i, a) => a.indexOf(v) === i);
    const finalImageUrl = allImages[0] || imageUrl || currentComboItems[0]?.imageUrl || "";

    const comboData = {
      items: currentComboItems.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        title: it.title.trim(),
        description: (it.description || "").trim(),
        imageUrl: (it.imageUrl || "").trim(),
        priceUsd: Number(parseFloat(it.priceUsd).toFixed(2)),
        residualPriceUsd: Number(parseFloat(it.residualPriceUsd != null && it.residualPriceUsd !== "" ? it.residualPriceUsd : it.priceUsd).toFixed(2)),
        residualMaxDiscountPct: Number(parseFloat(it.residualDiscountPct ?? it.residualMaxDiscountPct ?? 15).toFixed(0))
      }))
    };

    try {
      const rewardPayload = {
        title: comboTitle,
        rewardType: "COMBO",
        priceUsd: promoPriceUsd,
        maxDiscountPct,
        maxDiscountUsd,
        cashToPayUsd,
        pointsCost,
        stock,
        imageUrl: finalImageUrl,
        images: allImages.length ? allImages : (finalImageUrl ? [finalImageUrl] : []),
        description: description || `Combo flexible de ${currentComboItems.length} artículos con desglose en cascada.`,
        comboData
      };
      if (editId) {
        rewardPayload.id = editId;
      }

      const reward = new RewardModel(rewardPayload);
      await FirestoreService.saveReward(reward.toJSON());
      if (vm && typeof vm.refreshData === "function") {
        await vm.refreshData();
      }

      closeModal("modal-new-product");
      const editInput = document.getElementById("prod-edit-id");
      if (editInput) editInput.value = "";
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
      const pkgTitleInput = document.getElementById("combo-package-title");
      if (pkgTitleInput) pkgTitleInput.value = "";
      clearProductImageUpload();
      deactivateComboBuilder();
      showToast(editId ? "✓ Combo flexible actualizado con éxito en el catálogo." : "✓ Combo flexible registrado con éxito en el catálogo.", "success");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
    return;
  }

  if (!title) {
    showToast("⚠️ El nombre del producto es obligatorio.", "error");
    return;
  }

  if (activeProductMode === "INCOMING") {
    const calc = recalculateIncomingPresale();
    if (calc.regularPrice <= 0) {
      showToast("⚠️ Ingresa un precio regular de lista mayor a $0 USD.", "error");
      return;
    }
    if (!calc.arrivalDatetime) {
      showToast("⚠️ Ingresa la fecha y hora estimada de llegada del producto.", "error");
      return;
    }
    const targetDate = new Date(calc.arrivalDatetime);
    if (isNaN(targetDate.getTime())) {
      showToast("⚠️ Fecha de llegada inválida.", "error");
      return;
    }

    try {
      const reward = new RewardModel({
        id: editId || ("REW-" + Math.random().toString(36).substring(2, 8).toUpperCase()),
        title,
        status: "INCOMING",
        isIncoming: true,
        rewardType: "INCOMING",
        priceUsd: calc.regularPrice,
        presaleDiscountType: calc.discountType,
        presaleDiscountValue: calc.discountVal,
        presaleDiscountUsd: calc.discountUsd,
        presalePriceUsd: calc.presalePrice,
        estimatedArrival: targetDate.toISOString(),
        pointsCost: 0, // 100% independiente de puntos Wired
        stock,
        imageUrl,
        images,
        description
      });

      await FirestoreService.saveReward(reward.toJSON());
      if (vm && typeof vm.refreshData === "function") {
        await vm.refreshData();
      }

      closeModal("modal-new-product");
      const editInput = document.getElementById("prod-edit-id");
      if (editInput) editInput.value = "";
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
      const isIncInput = document.getElementById("prod-is-incoming");
      if (isIncInput) isIncInput.value = "false";
      const dtInput = document.getElementById("calc-incoming-arrival-datetime");
      if (dtInput) dtInput.value = "";
      const pill = document.getElementById("prod-commercial-summary-pill");
      if (pill) pill.style.display = "none";
      clearProductImageUpload();
      showToast(editId ? "✓ Producto en preventa actualizado con éxito." : "✓ Producto en preventa registrado con éxito en el catálogo.", "success");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
    return;
  }

  // Modos estándar FREE_REWARD y PARTIAL_DISCOUNT
  let rewardType = activeProductMode === "PARTIAL_DISCOUNT" ? "PARTIAL_DISCOUNT" : "FREE_REWARD";
  let priceUsd = 0;
  let maxDiscountPct = 0;
  let maxDiscountUsd = 0;
  let cashToPayUsd = 0;

  if (rewardType === "PARTIAL_DISCOUNT") {
    const calc = recalculateProductDiscount();
    priceUsd = calc.salePrice;
    maxDiscountPct = calc.discountPct;
    maxDiscountUsd = calc.maxDiscountUsd;
    cashToPayUsd = calc.cashDue;
  }

  if (isNaN(pointsCost) || pointsCost <= 0) {
    showToast("⚠️ Ingresa un costo válido en Wired Points.", "error");
    return;
  }

  try {
    const rewardPayload = {
      title,
      rewardType,
      priceUsd,
      maxDiscountPct,
      maxDiscountUsd,
      cashToPayUsd,
      pointsCost,
      stock,
      imageUrl,
      images,
      description
    };
    if (editId) {
      rewardPayload.id = editId;
    }

    await vm.addReward(rewardPayload);
    closeModal("modal-new-product");
    const editInput = document.getElementById("prod-edit-id");
    if (editInput) editInput.value = "";
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
    showToast(editId ? "✓ Producto actualizado con éxito en el catálogo." : "✓ Producto registrado con éxito en el catálogo.", "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export const saveNewProduct = saveProductAdmin;

export async function handleAdminReleaseIncoming(rewardId) {
  const product = (vm?.catalog || []).find(p => p.id === rewardId);
  const title = product?.title || rewardId;
  if (!confirm(`¿Desembarcar "${title}" y pasarlo a disponible de inmediato?\n\nEl producto dejará el estado En Camino y pasará a venta general activa.`)) {
    return;
  }
  try {
    const raw = await FirestoreService.getReward(rewardId);
    const reward = raw ? new RewardModel(raw) : (product ? new RewardModel(product) : null);
    if (!reward) throw new Error("Producto no encontrado.");
    reward.status = "ACTIVE";
    reward.isIncomingFlag = false;
    reward.updatedAt = new Date().toISOString();
    await FirestoreService.saveReward(reward.toJSON());
    if (vm && typeof vm.refreshData === "function") {
      await vm.refreshData();
    }
    showToast(`✓ "${title}" ha sido desembarcado y ya está disponible en venta general.`, "success");
  } catch (err) {
    showToast("❌ Error al desembarcar producto: " + err.message, "error");
  }
}

export async function removeProductAdmin(id) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    await vm.deleteReward(id);
    showToast("Producto eliminado del catálogo", "info");
  }
}

export function openMarkProductSoldModal(rewardId, title) {
  const product = (vm?.catalog || []).find(p => p.id === rewardId);
  const targetIdEl = document.getElementById("mark-sold-target-id");
  const titleEl = document.getElementById("mark-sold-product-title");
  const idEl = document.getElementById("mark-sold-product-id");
  const pointsEl = document.getElementById("mark-sold-product-points");
  const stockEl = document.getElementById("mark-sold-product-stock");
  const imgEl = document.getElementById("mark-sold-product-img");

  if (targetIdEl) targetIdEl.value = rewardId;
  if (titleEl) titleEl.textContent = title || product?.title || rewardId;
  if (idEl) idEl.textContent = rewardId;
  if (pointsEl) pointsEl.textContent = `${(product?.pointsCost || 0).toLocaleString()} WP`;
  if (stockEl) stockEl.textContent = `${product?.stock || 0} un.`;

  const cover = product ? (typeof product.getImages === "function" ? product.getImages()[0] : (product.imageUrl || "")) : "";
  if (imgEl) {
    if (cover) {
      imgEl.src = cover;
      imgEl.style.display = "block";
    } else {
      imgEl.style.display = "none";
    }
  }

  const modal = document.getElementById("modal-mark-product-sold");
  if (modal) modal.style.display = "flex";
}

export async function executeConfirmMarkSold() {
  const id = document.getElementById("mark-sold-target-id")?.value;
  if (!id) return;
  closeModal("modal-mark-product-sold");
  try {
    const res = await vm.markRewardSoldOut(id, "VENTA_EXTERNA");
    showToast(`✓ "${res?.title || id}" marcado como vendido.`, "success");
  } catch (err) {
    showToast("❌ Error al marcar producto: " + err.message, "error");
  }
}

export function handleAdminMarkSold(rewardId, title) {
  const modal = document.getElementById("modal-mark-product-sold");
  if (modal) {
    openMarkProductSoldModal(rewardId, title);
    return;
  }
  const cleanTitle = title || rewardId;
  if (confirm(`¿Marcar "${cleanTitle}" como vendido externamente (Stock a 0)?\n\nEl producto se marcará como VENDIDO y desaparecerá del catálogo de clientes en 12 horas.`)) {
    vm.markRewardSoldOut(rewardId, "VENTA_EXTERNA").then(() => {
      showToast(`✓ "${cleanTitle}" marcado como vendido.`, "success");
    }).catch(err => {
      showToast("❌ Error al marcar producto: " + err.message, "error");
    });
  }
}

export async function handleAdminDecrementStock(rewardId, title) {
  try {
    await vm.decrementRewardStock(rewardId, 1);
    showToast(`✓ Se restó 1 unidad de "${title || rewardId}".`, "info");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export async function handleAdminRestock(rewardId, qty = 1, title = "") {
  try {
    const amount = Number(qty) || 1;
    await vm.restockReward(rewardId, amount);
    showToast(`✓ Se repuso stock (+${amount}) para "${title || rewardId}".`, "success");
  } catch (err) {
    showToast("❌ Error al reponer stock: " + err.message, "error");
  }
}

export function toggleCustomPaperInputs() {
  const select = document.getElementById("lot-paper-size");
  const customBox = document.getElementById("custom-paper-fields");
  if (customBox) {
    customBox.style.display = select.value === "custom" ? "flex" : "none";
  }
}

export function getSelectedPaperDimensions(source = "preview") {
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

export function switchPreviewMode(mode) {
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

export function updatePreviewSheetDimensions() {
  const dims = getSelectedPaperDimensions("preview");
  const select = document.getElementById("preview-paper-size");
  const customBox = document.getElementById("preview-custom-dims");
  const label = document.getElementById("preview-dims-label");

  if (customBox) customBox.style.display = select.value === "custom" ? "flex" : "none";
  if (label) label.textContent = dims.name + ": " + dims.widthMm + " mm × " + dims.heightMm + " mm";

  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length > 0)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length > 0
        ? vm.tokens.slice(0, 4)
        : []);

  const iframe = document.getElementById("sheet-preview-iframe");
  if (iframe) {
    const docHtml = InvoiceTemplateService.generatePrintDocument(tokensToRender, dims, mode, false);
    iframe.srcdoc = docHtml;
  }
}

export function downloadPrintSheetHtml() {
  const dims = getSelectedPaperDimensions("preview");
  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length > 0)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length > 0 ? vm.tokens.slice(0, 4) : []);

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

export function openPrintSheetModal() {
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

export function triggerNativeSheetPrint(explicitTokens) {
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


export function viewSingleTokenQr(tokenCode, invoiceFolio, pointsValue, securityPin) {
  const modal = document.getElementById("modal-single-qr");
  if (!modal) return;

  const cleanCode = (tokenCode || "").trim();
  if (!cleanCode || cleanCode === "undefined" || cleanCode === "null") {
    showToast("El código de esta factura no está disponible.", "error");
    return;
  }

  currentSingleTokenUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + encodeURIComponent(cleanCode) +
    (invoiceFolio ? "&folio=" + encodeURIComponent(invoiceFolio) : "") +
    (securityPin ? "&pin=" + encodeURIComponent(securityPin) : "");

  document.getElementById("single-qr-folio").textContent = "Factura #MD-2026-" + invoiceFolio;
  document.getElementById("single-qr-points").textContent = pointsValue > 0 ? pointsValue + " WP" : "Sin Asignar (0 WP)";
  document.getElementById("single-qr-pin").textContent = securityPin || "••••";
  document.getElementById("single-qr-code").textContent = cleanCode;

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

export function copySingleQrUrl() {
  if (navigator.clipboard && currentSingleTokenUrl) {
    navigator.clipboard.writeText(currentSingleTokenUrl).then(() => {
      showToast("Enlace de auto-reclamo copiado al portapapeles", "success");
    });
  }
}

export function testSingleQrUrl() {
  if (currentSingleTokenUrl) {
    window.open(currentSingleTokenUrl, "_blank");
  }
}

let selectedTokenForActions = null;

export function openTokenActionsModal(tokenCode) {
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
    let claimedNotice = '';
    if (token.isClaimed()) {
      const uList = (vm && vm.users) ? vm.users : [];
      const clUser = uList.find(u => u.uid === (token.claimedBy || token.claimed_by));
      const clName = clUser ? (clUser.displayName || clUser.phone) : (token.claimedBy || token.claimed_by || "Cliente");
      claimedNotice = `<div style="margin-top: 5px;"><span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;">👤 Reclamada por: <strong>${clName}</strong></span></div>`;
    }
    statusRow.innerHTML = `
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px;">
          ${token.pointsValue > 0 ? `⚡ ${token.pointsValue} WP` : '⏳ Sin Asignar (0 WP)'}
        </span>
        <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px;">
          ${token.isClaimed() ? '✔ RECLAMADO' : (token.isActive() ? '● SIN RECLAMAR' : '⏳ EN ESPERA DE VALOR')}
        </span>
      </div>
      ${claimedNotice}
    `;
  }

  const pointsGroup = document.getElementById("token-actions-points-group");
  if (pointsGroup) {
    pointsGroup.style.display = token.isClaimed() ? "none" : "block";
  }

  const btnClaimCust = document.getElementById("btn-token-opt-claim-customer");
  if (btnClaimCust) {
    btnClaimCust.style.display = token.isClaimed() ? "none" : "inline-flex";
  }

  if (btnAssign) {
    if (token.isClaimed()) {
      btnAssign.style.display = "none";
    } else {
      btnAssign.style.display = "inline-flex";
      const isPending = token.isPendingAssignment();
      btnAssign.innerHTML = `
        <span style="font-size: 1.15rem; margin-right: 2px;">⚡</span>
        <span style="display: flex; flex-direction: column; text-align: left;">
          <strong style="line-height: 1.2;">${isPending ? 'Cargar Puntos WP' : 'Modificar Puntos'}</strong>
          <small style="font-size: 0.68rem; opacity: 0.85; font-weight: normal; margin-top: 2px;">${isPending ? 'Caja / Mostrador' : `${token.pointsValue} WP asignados`}</small>
        </span>
      `;
    }
  }

  const btnViewInvoice = document.getElementById("btn-token-opt-view-invoice");
  const btnViewLabel = document.getElementById("btn-token-opt-view-invoice-label");
  const btnEditInvoice = document.getElementById("btn-token-opt-edit-invoice");
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (btnViewInvoice) {
    btnViewInvoice.style.display = "inline-flex";
    if (btnViewLabel) btnViewLabel.textContent = hasInvData ? "Ver Factura Digital (Datos Guardados)" : "Generar Factura Digital (Pág. Completa)";
  }
  if (btnEditInvoice) {
    btnEditInvoice.style.display = hasInvData ? "inline-flex" : "none";
  }

  const deleteLabel = document.getElementById("btn-token-opt-delete-label");
  if (deleteLabel) {
    deleteLabel.textContent = `Eliminar Factura #MD-2026-${token.invoiceFolio} (Liberar Folio)`;
  }

  modal.style.display = "flex";
}

export function executeTokenOptAssign() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    promptAssignPoints(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio);
  }
}

export function executeTokenOptClaimCustomer() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openAdminClaimCustomerModal(selectedTokenForActions.tokenCode || selectedTokenForActions.token_code);
  }
}

let activeClaimToken = null;

export async function openAdminClaimCustomerModal(tokenCode) {
  if (!tokenCode && selectedTokenForActions) {
    tokenCode = selectedTokenForActions.tokenCode || selectedTokenForActions.token_code;
  }
  const tokens = (vm && vm.tokens) ? vm.tokens : [];
  let token = tokens.find(t => (t.tokenCode === tokenCode || t.token_code === tokenCode));
  if (!token && tokenCode && vm && typeof vm.verifyToken === "function") {
    token = await vm.verifyToken(tokenCode);
  }
  if (!token) {
    showToast("⚠️ Factura no encontrada.", "error");
    return;
  }
  activeClaimToken = token;

  const modal = document.getElementById("modal-admin-claim-customer");
  if (!modal) return;

  const folioStr = String(token.invoiceFolio || token.invoice_folio || "0000").padStart(4, "0");
  const folioBadge = document.getElementById("admin-claim-folio-badge");
  const codeBadge = document.getElementById("admin-claim-code-badge");
  const pinBadge = document.getElementById("admin-claim-pin-badge");
  const pointsInput = document.getElementById("admin-claim-points-input");
  const statusNote = document.getElementById("admin-claim-status-note");

  if (folioBadge) folioBadge.textContent = `#MD-2026-${folioStr}`;
  if (codeBadge) codeBadge.textContent = token.tokenCode || token.token_code || "";
  if (pinBadge) pinBadge.textContent = `PIN: ${token.securityPin || token.security_pin || "••••"}`;

  const currentPts = Number(token.pointsValue !== undefined ? token.pointsValue : (token.points_value || 0));
  if (pointsInput) {
    pointsInput.value = currentPts > 0 ? currentPts : "";
    pointsInput.placeholder = currentPts > 0 ? currentPts : "Ej. 50";
  }

  if (statusNote) {
    if (currentPts > 0) {
      statusNote.innerHTML = `<span style="color:#059669; font-weight:700;">⚡ Factura activa con ${currentPts} WP listos para transferir</span>`;
    } else {
      statusNote.innerHTML = `<span style="color:#d97706; font-weight:700;">⚠️ Factura sin puntos asignados (0 WP). Define los puntos a transferir al cliente.</span>`;
    }
  }

  const searchInput = document.getElementById("admin-claim-user-search");
  if (searchInput) searchInput.value = "";

  populateAdminClaimUsersList("");
  onAdminClaimUserSelectChange();

  modal.style.display = "flex";
}

export function populateAdminClaimUsersList(filterText = "") {
  const select = document.getElementById("admin-claim-user-select");
  const cardList = document.getElementById("admin-claim-user-card-list");
  const countBadge = document.getElementById("admin-claim-users-count");

  const query = (filterText || "").trim().toLowerCase();
  let users = (vm && vm.users) ? [...vm.users] : [];
  if (users.length === 0 && typeof FirestoreService !== "undefined" && FirestoreService.getAllUsers) {
    users = FirestoreService.getAllUsers();
  }

  users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));

  let optionsHtml = `<option value="">-- Selecciona un cliente registrado (${users.length} disponibles) --</option>`;
  let cardsHtml = "";
  let matchedCount = 0;

  const currentSelectedUid = select ? select.value : "";

  users.forEach(u => {
    const name = u.displayName || u.display_name || "Socio";
    const phone = u.phone || "";
    const memberCode = u.memberCode || u.member_code || "";
    const pts = Number(u.wiredPoints !== undefined ? u.wiredPoints : (u.wired_points || 0));

    if (query) {
      const match = name.toLowerCase().includes(query) ||
                    phone.toLowerCase().includes(query) ||
                    memberCode.toLowerCase().includes(query) ||
                    (u.uid && u.uid.toLowerCase().includes(query));
      if (!match) return;
    }

    matchedCount++;
    const isSelected = (u.uid === currentSelectedUid);

    optionsHtml += `<option value="${u.uid}">
      ${name} ${phone ? `(📞 ${phone})` : ''} — Saldo: ${pts} WP [${memberCode || u.uid}]
    </option>`;

    // Initials for avatar
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    const safeName = String(name).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const safePhone = phone ? `+505 ${phone}` : 'Sin teléfono';
    const safeCode = memberCode || (u.uid ? u.uid.slice(0, 8) : 'SOCIO');

    cardsHtml += `
      <div class="admin-claim-user-card ${isSelected ? 'selected' : ''}" data-uid="${u.uid}" onclick="selectAdminClaimUser('${u.uid}')">
        <div class="admin-claim-user-avatar">${initials}</div>
        <div class="admin-claim-user-info">
          <div class="admin-claim-user-name-row">
            <span class="admin-claim-user-name">${safeName}</span>
            <span class="admin-claim-user-code">${safeCode}</span>
          </div>
          <div class="admin-claim-user-meta-row">
            <span class="admin-claim-user-phone">📞 ${safePhone}</span>
            <span class="admin-claim-user-badge-pts">${pts.toLocaleString()} WP</span>
          </div>
        </div>
        <div class="admin-claim-user-check">
          <span>✓</span>
        </div>
      </div>
    `;
  });

  if (select) {
    select.innerHTML = optionsHtml;
    if (currentSelectedUid) {
      select.value = currentSelectedUid;
    }
  }

  if (countBadge) {
    countBadge.textContent = `${matchedCount} disponible${matchedCount === 1 ? '' : 's'}`;
  }

  if (cardList) {
    if (matchedCount === 0) {
      cardList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0.5rem; color: #64748b; font-size: 0.8rem; font-family: var(--font-mono);">
          <span>🔍 No se encontraron socios que coincidan con la búsqueda.</span>
        </div>
      `;
    } else {
      cardList.innerHTML = cardsHtml;
    }
  }
}

export function selectAdminClaimUser(uid) {
  const select = document.getElementById("admin-claim-user-select");
  if (select) {
    select.value = uid;
  }
  onAdminClaimUserSelectChange();
}

export function setAdminClaimPointsPreset(val, isIncrement = false) {
  const pointsInput = document.getElementById("admin-claim-points-input");
  if (!pointsInput) return;
  let curr = parseInt(pointsInput.value, 10) || 0;
  if (isIncrement) {
    curr += val;
  } else {
    curr = val;
  }
  if (curr < 1) curr = 1;
  pointsInput.value = curr;
  onAdminClaimPointsChange();
}

export function toggleAdminClaimSelectMode() {
  const select = document.getElementById("admin-claim-user-select");
  const cardList = document.getElementById("admin-claim-user-card-list");
  const toggleBtn = document.getElementById("admin-claim-toggle-mode-btn");
  if (!select || !cardList) return;
  const isSelectHidden = select.style.display === "none";
  if (isSelectHidden) {
    select.style.display = "block";
    cardList.style.display = "none";
    if (toggleBtn) toggleBtn.textContent = "Ver tarjetas";
  } else {
    select.style.display = "none";
    cardList.style.display = "flex";
    if (toggleBtn) toggleBtn.textContent = "Ver desplegable";
  }
}

export function onAdminClaimUserSearchInput(evt) {
  const val = evt && evt.target ? evt.target.value : (document.getElementById("admin-claim-user-search")?.value || "");
  populateAdminClaimUsersList(val);
  onAdminClaimUserSelectChange();
}

export function onAdminClaimPointsChange() {
  onAdminClaimUserSelectChange();
}

export function onAdminClaimUserSelectChange() {
  const select = document.getElementById("admin-claim-user-select");
  const preview = document.getElementById("admin-claim-customer-preview");
  const nameEl = document.getElementById("admin-claim-preview-name");
  const phoneEl = document.getElementById("admin-claim-preview-phone");
  const currPtsEl = document.getElementById("admin-claim-preview-current-pts");
  const addPtsEl = document.getElementById("admin-claim-preview-add-pts");
  const newPtsEl = document.getElementById("admin-claim-preview-new-pts");
  const btnConfirm = document.getElementById("btn-confirm-admin-claim");

  const selectedUid = select ? select.value : "";

  // Highlight card in visual list if present
  const allCards = document.querySelectorAll("#admin-claim-user-card-list .admin-claim-user-card");
  allCards.forEach(c => {
    if (c.getAttribute("data-uid") === selectedUid) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  if (!select || !selectedUid) {
    if (preview) preview.style.display = "none";
    if (btnConfirm) btnConfirm.disabled = true;
    return;
  }

  let users = (vm && vm.users) ? vm.users : [];
  if (users.length === 0 && typeof FirestoreService !== "undefined" && FirestoreService.getAllUsers) {
    users = FirestoreService.getAllUsers();
  }
  const user = users.find(u => u.uid === selectedUid);
  if (!user) {
    if (preview) preview.style.display = "none";
    if (btnConfirm) btnConfirm.disabled = true;
    return;
  }

  const pointsInput = document.getElementById("admin-claim-points-input");
  const ptsToAdd = Math.max(0, parseInt(pointsInput?.value, 10) || 0);
  const currentPts = Number(user.wiredPoints !== undefined ? user.wiredPoints : (user.wired_points || 0));
  const resultingPts = currentPts + ptsToAdd;

  if (nameEl) nameEl.textContent = user.displayName || user.display_name || "Socio";
  if (phoneEl) phoneEl.textContent = user.phone ? `📞 +505 ${user.phone}` : `ID: ${user.uid}`;
  if (currPtsEl) currPtsEl.textContent = `${currentPts.toLocaleString()} WP`;
  if (addPtsEl) addPtsEl.textContent = `+${ptsToAdd.toLocaleString()} WP`;
  if (newPtsEl) newPtsEl.textContent = `${resultingPts.toLocaleString()} WP`;

  if (preview) preview.style.display = "block";
  if (btnConfirm) btnConfirm.disabled = (ptsToAdd <= 0);
}

export async function confirmAdminClaimCustomer() {
  if (!activeClaimToken) {
    showToast("⚠️ No hay ninguna factura seleccionada.", "error");
    return;
  }

  const select = document.getElementById("admin-claim-user-select");
  const selectedUid = select?.value;
  if (!selectedUid) {
    showToast("⚠️ Por favor selecciona un cliente de la lista.", "error");
    return;
  }

  const pointsInput = document.getElementById("admin-claim-points-input");
  const pts = parseInt(pointsInput?.value, 10);
  if (isNaN(pts) || pts <= 0) {
    showToast("⚠️ Ingresa una cantidad de puntos válida mayor a 0.", "error");
    if (pointsInput) pointsInput.focus();
    return;
  }

  const btnConfirm = document.getElementById("btn-confirm-admin-claim");
  const originalBtnHtml = btnConfirm ? btnConfirm.innerHTML : "";
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<span>⏳</span> ASIGNANDO PUNTOS...`;
  }

  try {
    const tokenCode = activeClaimToken.tokenCode || activeClaimToken.token_code;
    const res = await vm.claimInvoiceForCustomer(
      tokenCode,
      selectedUid,
      pts,
      "Asignación administrativa de factura física"
    );

    closeModal("modal-admin-claim-customer");
    const targetName = res.user.displayName || res.user.phone || "Cliente";
    const folioStr = String(res.token.invoiceFolio || "0000").padStart(4, "0");
    showToast(`✓ Factura #MD-2026-${folioStr} asignada y reclamada con éxito para ${targetName} (+${res.pointsAdded} WP).`, "success");

    if (typeof renderTokensTable === "function") renderTokensTable(vm.tokens);
    if (typeof renderAdmin === "function") renderAdmin(vm);
  } catch (err) {
    console.error("Error en confirmAdminClaimCustomer:", err);
    showToast("❌ Error al asignar factura: " + err.message, "error");
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = originalBtnHtml;
    }
  }
}

export function executeTokenOptQr() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    viewSingleTokenQr(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio, selectedTokenForActions.pointsValue, selectedTokenForActions.securityPin);
  }
}

export function executeTokenOptLainCard() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  let idx = 0;
  if (token.invoiceData && typeof token.invoiceData.selectedLainDesignIdx === "number") {
    idx = token.invoiceData.selectedLainDesignIdx;
  } else if (token.invoiceFolio) {
    const num = parseInt(String(token.invoiceFolio).replace(/\D/g, ""), 10);
    if (!isNaN(num)) idx = num % 74;
  }
  closeModal("modal-token-actions");
  openLainPreviewModal(idx);
}

export function executeTokenOptCopyLink() {
  if (selectedTokenForActions) {
    const code = selectedTokenForActions.tokenCode || selectedTokenForActions.token_code;
    if (!code) { showToast("Código no disponible", "error"); return; }
    const folio = selectedTokenForActions.invoiceFolio || selectedTokenForActions.invoice_folio || selectedTokenForActions.folio || "";
    const pin = selectedTokenForActions.securityPin || selectedTokenForActions.security_pin || "";
    let url = "https://meltydeays-wired-club.vercel.app/?claim=" + encodeURIComponent(code);
    if (folio) url += "&folio=" + encodeURIComponent(folio);
    if (pin && pin !== "----") url += "&pin=" + encodeURIComponent(pin);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("✓ Enlace de auto-reclamo copiado al portapapeles", "success");
      });
    }
  }
}

export function executeTokenOptTestUrl() {
  if (selectedTokenForActions) {
    const code = selectedTokenForActions.tokenCode || selectedTokenForActions.token_code;
    if (!code) { showToast("Código no disponible", "error"); return; }
    const folio = selectedTokenForActions.invoiceFolio || selectedTokenForActions.invoice_folio || selectedTokenForActions.folio || "";
    const pin = selectedTokenForActions.securityPin || selectedTokenForActions.security_pin || "";
    let url = "https://meltydeays-wired-club.vercel.app/?claim=" + encodeURIComponent(code);
    if (folio) url += "&folio=" + encodeURIComponent(folio);
    if (pin && pin !== "----") url += "&pin=" + encodeURIComponent(pin);
    window.open(url, "_blank");
  }
}

export function executeTokenOptDigitalInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode || selectedTokenForActions.token_code);
  }
}

export function executeTokenOptViewInvoice() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  closeModal("modal-token-actions");
  if (hasInvData) {
    if (!token.invoiceData.tokenCode) token.invoiceData.tokenCode = token.tokenCode || token.token_code;
    if (!token.invoiceData.securityPin) token.invoiceData.securityPin = token.securityPin || token.security_pin;
    if (!token.invoiceData.folio) token.invoiceData.folio = token.invoiceFolio || token.invoice_folio;
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
    openSingleDigitalInvoiceModal(token.tokenCode || token.token_code);
  }
}

export function executeTokenOptEditInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode, true);
  }
}

export function executeTokenOptDelete() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  closeModal("modal-token-actions");
  openReleaseInvoiceModal(token.tokenCode || token.token_code, token.invoiceFolio || token.invoice_folio || token.folio);
}

export function openReleaseInvoiceModal(tokenCode, folio) {
  if (!tokenCode && !folio) return;

  const tokens = (vm && vm.tokens) ? vm.tokens : [];
  let token = tokens.find(t => (t.tokenCode === tokenCode || t.token_code === tokenCode));
  if (!token && folio) {
    const rawFolio = String(folio).replace(/^#?(MD-\d{4}-)?0*/i, "");
    token = tokens.find(t => {
      const tf = String(t.invoiceFolio || t.invoice_folio || t.folio || "").replace(/^#?(MD-\d{4}-)?0*/i, "");
      return tf === rawFolio;
    });
  }

  const resolvedCode = tokenCode || (token ? (token.tokenCode || token.token_code) : "");
  const resolvedFolio = folio || (token ? (token.invoiceFolio || token.invoice_folio || token.folio) : "");
  const paddedFolio = String(resolvedFolio || "0000").padStart(4, "0");
  const pts = token ? Number(token.pointsValue !== undefined ? token.pointsValue : (token.points_value || 0)) : 0;
  const isClaimed = Boolean(token && (token.isClaimed || token.is_claimed || token.claimedBy));

  const modal = document.getElementById("modal-release-invoice");
  if (modal) {
    const folioBadge = document.getElementById("release-invoice-folio-badge");
    const codeBadge = document.getElementById("release-invoice-code-badge");
    const pointsBadge = document.getElementById("release-invoice-points-badge");
    const statusBadge = document.getElementById("release-invoice-status-badge");
    const targetCode = document.getElementById("release-invoice-target-code");
    const targetFolio = document.getElementById("release-invoice-target-folio");
    const confirmBtn = document.getElementById("btn-confirm-release-invoice");

    if (folioBadge) folioBadge.textContent = `#MD-2026-${paddedFolio}`;
    if (codeBadge) codeBadge.textContent = resolvedCode || `WP-2026-F${paddedFolio}...`;
    if (pointsBadge) {
      pointsBadge.innerHTML = pts > 0
        ? `<strong style="color:#059669;">⚡ ${pts} WP</strong>`
        : `<span style="color:#64748b;">0 WP (Sin puntos asignados)</span>`;
    }
    if (statusBadge) {
      statusBadge.innerHTML = isClaimed
        ? `<span class="badge-status-claimed" style="background:#fee2e2; color:#b91c1c; border:1px solid #f87171; padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.72rem;">✓ RECLAMADA</span>`
        : `<span class="badge-status-unclaimed" style="background:#ecfdf5; color:#047857; border:1px solid #6ee7b7; padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.72rem;">● SIN RECLAMAR</span>`;
    }
    if (targetCode) targetCode.value = resolvedCode;
    if (targetFolio) targetFolio.value = paddedFolio;
    if (confirmBtn) {
      confirmBtn.innerHTML = `<span>🗑️</span> <span>SÍ, LIBERAR FOLIO #${paddedFolio}</span>`;
    }

    modal.style.display = "flex";
    return;
  }

  // Fallback para entornos sin modal en el DOM (headless o pruebas)
  const statusLabel = isClaimed ? "RECLAMADA" : "SIN RECLAMAR";
  const ptsLabel = pts > 0 ? `${pts} WP` : "0 WP";
  const fallbackMsg =
    `🗑️ ¿DESEAS LIBERAR EL FOLIO #${paddedFolio}?\n\n` +
    `• Factura: #MD-2026-${paddedFolio}\n` +
    `• Código Token: ${resolvedCode}\n` +
    `• Puntos: ${ptsLabel} (${statusLabel})\n\n` +
    `Esta acción eliminará el registro de la base de datos y dejará el folio #${paddedFolio} libre de inmediato para que puedas volver a generar o imprimir una factura nueva con este mismo número.\n\n` +
    `¿Confirmar liberación del folio #${paddedFolio}?`;

  const safeConfirm = (typeof window !== "undefined" && typeof window.confirm === "function") ? window.confirm : (typeof confirm === "function" ? confirm : () => true);
  if (safeConfirm(fallbackMsg)) {
    executeConfirmReleaseInvoice(resolvedCode, paddedFolio);
  }
}

export async function executeConfirmReleaseInvoice(directCode, directFolio) {
  const codeEl = document.getElementById("release-invoice-target-code");
  const folioEl = document.getElementById("release-invoice-target-folio");

  const tokenCode = directCode || (codeEl ? codeEl.value : "");
  const folio = directFolio || (folioEl ? folioEl.value : "");

  closeModal("modal-release-invoice");
  if (!tokenCode && !folio) return;

  showToast(`Liberando folio #${folio}...`, "info");
  try {
    if (vm && typeof vm.deleteToken === "function") {
      await vm.deleteToken(tokenCode);
      const nextFolio = vm.getNextAvailableFolio();
      const lotFolioInput = document.getElementById("lot-start-folio");
      if (lotFolioInput) {
        delete lotFolioInput.dataset.userEdited;
        lotFolioInput.value = nextFolio;
      }
      const helper = document.getElementById("lot-folio-helper");
      if (helper) {
        helper.innerHTML = `Siguiente folio libre detectado: <strong>#${String(nextFolio).padStart(4, "0")}</strong> (folio liberado disponible)`;
      }
      if (typeof renderTokensTable === "function") renderTokensTable(vm.tokens);
      if (typeof renderAdmin === "function") renderAdmin(vm);
      if (typeof window.renderSandboxDbView === "function") window.renderSandboxDbView();
      showToast(`✓ Factura #MD-2026-${folio} eliminada. Folio #${folio} liberado exitosamente.`, "success");
    }
  } catch (err) {
    showToast("❌ Error al liberar folio: " + err.message, "error");
  }
}

export function handleInvoiceBtnClick(tokenCode) {
  const token = (vm.tokens || []).find(t => (t.tokenCode === tokenCode || t.token_code === tokenCode));
  if (!token) { openSingleDigitalInvoiceModal(tokenCode); return; }
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (hasInvData) {
    if (!token.invoiceData.tokenCode) token.invoiceData.tokenCode = token.tokenCode || token.token_code;
    if (!token.invoiceData.securityPin) token.invoiceData.securityPin = token.securityPin || token.security_pin;
    if (!token.invoiceData.folio) token.invoiceData.folio = token.invoiceFolio || token.invoice_folio;
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
    openSingleDigitalInvoiceModal(token.tokenCode || token.token_code || tokenCode);
  }
}

// ========================================================
// CONTROLADOR DE GALERÍA Y SELECCIÓN DE DISEÑOS LAIN
// ========================================================
let _currentSeriesFilter = 'ALL';
let _lainTemplatesCache = null;

function getLainTemplates() {
  if (_lainTemplatesCache && _lainTemplatesCache.length && _lainTemplatesCache[0].svg) return _lainTemplatesCache;
  if (InvoiceTemplateService && typeof InvoiceTemplateService.getAvailableLainTemplates === "function") {
    _lainTemplatesCache = InvoiceTemplateService.getAvailableLainTemplates('physical');
    return _lainTemplatesCache;
  }
  return Array.from({ length: 74 }, (_, i) => ({
    idx: i,
    layer: "LAYER: " + String(i + 1).padStart(2, "0"),
    series: i < 24 ? "SERIE 1" : (i < 44 ? "SERIE 2" : "SERIE 3"),
    title: "PLANTILLA " + (i + 1),
    sub: "Diseño coleccionable 4x1",
    kanji: "デザイン"
  }));
}

export function filterLainSeries(series) {
  _currentSeriesFilter = series;
  if (typeof window !== "undefined") window._currentSeriesFilter = series;
  ['all', 's1', 's2', 's3'].forEach(k => {
    const btn = document.getElementById('btn-filter-' + k);
    if (btn) {
      btn.style.background = '#fff';
      btn.style.color = '#334155';
    }
  });
  const activeBtn = document.getElementById('btn-filter-' + (series === 'ALL' ? 'all' : (series === 'SERIE 1' ? 's1' : (series === 'SERIE 2' ? 's2' : 's3'))));
  if (activeBtn) {
    activeBtn.style.background = series === 'SERIE 3' ? '#b45309' : '#0f172a';
    activeBtn.style.color = '#fff';
  }
  renderLainTemplateGrid();
}

export function setActiveLainTemplate(idx) {
  const templates = getLainTemplates();
  const val = (idx === null || idx === undefined) ? null : Math.max(0, Math.min((templates.length || 74) - 1, Number(idx) | 0));
  if (typeof window !== "undefined") window.activeLainTemplateIdx = val;
  renderLainTemplateGrid();
}

function getAllowedLainIndices() {
  const sf = _currentSeriesFilter || 'ALL';
  if (sf === 'SERIE 1') return Array.from({ length: 24 }, (_, i) => i);
  if (sf === 'SERIE 2') return Array.from({ length: 20 }, (_, i) => i + 24);
  if (sf === 'SERIE 3') return Array.from({ length: 30 }, (_, i) => i + 44);
  return Array.from({ length: getLainTemplates().length || 74 }, (_, i) => i);
}

export function cycleLainTemplate(dir) {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined ? window.activeLainTemplateIdx : null;
  const cur = currentIdx === null ? -1 : currentIdx;
  const curPos = allowed.indexOf(cur);
  let nextPos = 0;
  if (curPos === -1) {
    nextPos = dir > 0 ? 0 : allowed.length - 1;
  } else {
    nextPos = (curPos + (dir > 0 ? 1 : -1) + allowed.length) % allowed.length;
  }
  setActiveLainTemplate(allowed[nextPos]);
}

export function randomizeLainTemplate() {
  const allowed = getAllowedLainIndices();
  const rnd = allowed[Math.floor(Math.random() * allowed.length)];
  setActiveLainTemplate(rnd);
}

export function openLainPreviewModal(idx) {
  const templates = getLainTemplates();
  const safeIdx = Math.max(0, Math.min((templates.length || 74) - 1, Number(idx) | 0));
  const t = templates[safeIdx];
  if (!t) return;

  setActiveLainTemplate(safeIdx);

  const modal = document.getElementById("modal-lain-preview");
  if (!modal) return;

  const badgeSeries = document.getElementById("lain-preview-badge-series");
  const badgeLayer = document.getElementById("lain-preview-badge-layer");
  const badgeSn = document.getElementById("lain-preview-badge-sn");
  const counter = document.getElementById("lain-preview-index-counter");
  const boxHeader = document.getElementById("lain-preview-box-header");
  const boxProtocol = document.getElementById("lain-preview-box-protocol");
  const boxSpec1 = document.getElementById("lain-preview-box-spec1");
  const boxSpec2 = document.getElementById("lain-preview-box-spec2");
  const svgContainer = document.getElementById("lain-preview-svg-container");
  const titleEl = document.getElementById("lain-preview-title");
  const subEl = document.getElementById("lain-preview-sub");
  const kanjiEl = document.getElementById("lain-preview-kanji");
  const quoteEl = document.getElementById("lain-preview-quote");

  if (badgeSeries) {
    badgeSeries.textContent = t.series || "COLECCIÓN LAIN";
    badgeSeries.style.background = (t.series && t.series.includes("SERIE 3")) ? "#b45309" : ((t.series && t.series.includes("SERIE 2")) ? "#4338ca" : "#0f172a");
  }
  if (badgeLayer) badgeLayer.textContent = t.layer;
  if (badgeSn) badgeSn.textContent = t.sn || ("MD-LAIN-9807-" + String(safeIdx + 1).padStart(3, "0"));
  if (counter) counter.textContent = `${safeIdx + 1} / ${templates.length || 74}`;

  if (boxHeader) boxHeader.textContent = `● ${t.layer}`;
  if (boxProtocol) boxProtocol.textContent = t.protocol ? `PROTOCOL: ${t.protocol}` : "";
  if (boxSpec1) boxSpec1.textContent = t.spec1 || t.chip || "";
  if (boxSpec2) boxSpec2.textContent = t.spec2 || "SANCTIFIED";

  if (svgContainer) {
    svgContainer.innerHTML = t.svg || "<div style='color:#94a3b8; padding:20px; font-size:12px;'>No SVG preview available</div>";
  }

  if (titleEl) titleEl.textContent = t.title || t.name;
  if (subEl) subEl.textContent = t.sub || "";
  if (kanjiEl) {
    kanjiEl.textContent = t.kanji || "";
    kanjiEl.style.color = (t.series && t.series.includes("SERIE 3")) ? "#b45309" : "var(--accent)";
  }
  if (quoteEl) {
    quoteEl.textContent = t.quote ? `"${t.quote.replace(/^"|"$/g, '')}"` : "—";
  }

  modal.style.display = "flex";
}

export function previewNextLainTemplate() {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined && window.activeLainTemplateIdx !== null ? window.activeLainTemplateIdx : 0;
  const curPos = allowed.indexOf(currentIdx);
  const nextPos = (curPos + 1 + allowed.length) % allowed.length;
  openLainPreviewModal(allowed[nextPos]);
}

export function previewPrevLainTemplate() {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined && window.activeLainTemplateIdx !== null ? window.activeLainTemplateIdx : 0;
  const curPos = allowed.indexOf(currentIdx);
  const prevPos = (curPos - 1 + allowed.length) % allowed.length;
  openLainPreviewModal(allowed[prevPos]);
}

export function confirmLainPreviewSelection() {
  if (typeof closeModal === "function") {
    closeModal("modal-lain-preview");
  } else if (typeof window !== "undefined" && typeof window.closeModal === "function") {
    window.closeModal("modal-lain-preview");
  } else {
    const modal = document.getElementById("modal-lain-preview");
    if (modal) modal.style.display = "none";
  }
}

if (typeof window !== "undefined" && !window._lainPreviewKeydownBound) {
  window._lainPreviewKeydownBound = true;
  window.addEventListener("keydown", (e) => {
    const modal = document.getElementById("modal-lain-preview");
    if (!modal || modal.style.display === "none") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      previewNextLainTemplate();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      previewPrevLainTemplate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      confirmLainPreviewSelection();
    }
  });
}

export function renderLainTemplateGrid() {
  const grid = document.getElementById("lain-template-grid");
  if (!grid) return;
  const templates = getLainTemplates();
  const currentIdx = typeof window !== "undefined" ? window.activeLainTemplateIdx : null;
  const sf = _currentSeriesFilter || 'ALL';
  const tiles = [];

  templates.forEach((t) => {
    if (sf && sf !== 'ALL') {
      const tSeries = t.series || (t.idx < 24 ? 'SERIE 1' : (t.idx < 44 ? 'SERIE 2' : 'SERIE 3'));
      if (!tSeries.includes(sf)) return;
    }
    const isFixed = currentIdx === t.idx;
    const isHaibane = (t.series && t.series.includes('SERIE 3')) || t.idx >= 44;
    const tile = document.createElement("div");
    if (isHaibane) tile.style.borderColor = '#d97706';
    tile.className = "lain-template-tile" + (isFixed ? " is-active" : "");
    tile.title = t.layer + " — " + t.title + " (click para ver diseño y fijar / doble click para desactivar)";
    tile.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">' +
        '<span class="lain-template-layer">' + t.layer + '</span>' +
        '<span class="lain-template-preview-badge">👁 VER</span>' +
      '</div>' +
      '<div class="lain-template-title">' + t.title + '</div>' +
      '<div class="lain-template-sub">' + (t.sub || '') + '</div>' +
      '<div class="lain-template-kanji">' + (t.kanji || '') + '</div>';
    tile.onclick = () => openLainPreviewModal(t.idx);
    tile.ondblclick = (e) => {
      e.stopPropagation();
      setActiveLainTemplate(null);
    };
    tiles.push(tile);
  });

  // Añadir tile modo AUTOMÁTICO (null) adaptativo por serie
  const autoTile = document.createElement("div");
  autoTile.className = "lain-template-tile" + (currentIdx === null || currentIdx === undefined ? " is-active" : "");
  let autoBadge = "AUTO · TODAS (74)";
  let autoTitle = "MODO DINÁMICO";
  let autoSub = "Rotación completa entre los 74 diseños disponibles por folio.";
  let autoKanji = "全74種 · 自動";
  let autoColor = "#059669";

  if (sf === 'SERIE 1') {
    autoBadge = "AUTO · SERIE 1 (24)";
    autoTitle = "MODO DINÁMICO (LAIN)";
    autoSub = "Rotación exclusiva en los 24 diseños de Serial Experiments Lain.";
    autoKanji = "連続実験 · 動的";
    autoColor = "#0284c7";
  } else if (sf === 'SERIE 2') {
    autoBadge = "AUTO · SERIE 2 (20)";
    autoTitle = "MODO DINÁMICO (COPLAND)";
    autoSub = "Rotación exclusiva en los 20 diseños Copland OS.";
    autoKanji = "OS端末 · 動的";
    autoColor = "#6366f1";
  } else if (sf === 'SERIE 3') {
    autoBadge = "AUTO · SERIE 3 (30)";
    autoTitle = "MODO DINÁMICO (HAIBANE)";
    autoSub = "Rotación exclusiva en los 30 diseños Haibane Renmei.";
    autoKanji = "灰羽連盟 · 動的";
    autoColor = "#b45309";
    if (currentIdx === null || currentIdx === undefined) {
      autoTile.style.borderColor = "#b45309";
      autoTile.style.background = "#fffbeb";
    }
  }

  autoTile.title = "Haz click: " + autoTitle + ". Las facturas rotarán dentro de esta serie seleccionada.";
  autoTile.innerHTML =
    '<div class="lain-template-layer" style="color:' + autoColor + ';">' + autoBadge + '</div>' +
    '<div class="lain-template-title" style="' + (sf === 'SERIE 3' ? 'color:#78350f;' : '') + '">' + autoTitle + '</div>' +
    '<div class="lain-template-sub">' + autoSub + '</div>' +
    '<div class="lain-template-kanji" style="color:' + autoColor + ';">' + autoKanji + '</div>';
  autoTile.onclick = () => setActiveLainTemplate(null);
  tiles.unshift(autoTile);

  grid.innerHTML = "";
  tiles.forEach(t => grid.appendChild(t));

  const label = document.getElementById("lain-template-active-label");
  if (label) {
    if (currentIdx === null || currentIdx === undefined) {
      const seriesName = sf === 'SERIE 3' ? 'SERIE 3 (30 Diseños Haibane Renmei)' : (sf === 'SERIE 2' ? 'SERIE 2 (20 Diseños Copland OS)' : (sf === 'SERIE 1' ? 'SERIE 1 (24 Diseños Lain)' : 'TODAS (74 Diseños)'));
      label.innerHTML = "▣ MODO DINÁMICO ACTIVO: Rotación por lote en " + seriesName;
      label.style.background = sf === 'SERIE 3' ? "#fef3c7" : "#ecfdf5";
      label.style.color = sf === 'SERIE 3' ? "#92400e" : "#047857";
      label.style.borderColor = sf === 'SERIE 3' ? "#f59e0b" : "#6ee7b7";
    } else {
      const sel = templates[currentIdx] || templates[0];
      label.innerHTML = "▣ DISEÑO FIJO ACTIVO: " + sel.layer + " — " + sel.title;
      label.style.background = "#eef2ff";
      label.style.color = "#4338ca";
      label.style.borderColor = "#c7d2fe";
    }
  }
}

export const FB_USER_DEFAULT_LISTINGS = [
  {
    listingId: "1198273641889021",
    title: "Mini Jet Fan 2 en 1 | Soplador Turbo y Aspiradora Portátil (Nuevo en Caja)",
    rawPrice: 800,
    currency: "NIO",
    priceNio: 800,
    priceUsd: 21.62,
    description: "Mini turbina portátil 2 en 1 (soplador turbo y aspiradora de mano). Motor sin escobillas de alta velocidad, batería recargable Type-C, incluye boquillas intercambiables y filtro lavable. Totalmente nuevo en caja.",
    imageUrl: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80"
  },
  {
    listingId: "1198273641889022",
    title: "Control Gamer GameSir X5 Lite Type-C | Para Android (Nuevo en Caja)",
    rawPrice: 1350,
    currency: "NIO",
    priceNio: 1350,
    priceUsd: 36.49,
    description: "Mando móvil GameSir X5 Lite con conexión directa Type-C de ultra baja latencia. Palancas y gatillos con efecto Hall anti-drift, agarre ergonómico texturizado, soporte para Xbox Cloud Gaming, GeForce NOW y emuladores. Nuevo en caja.",
    imageUrl: "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=800&auto=format&fit=crop&q=80"
  },
  {
    listingId: "1198273641889023",
    title: "Grip / Power Bank Gaming Anker PowerCore Play 6K",
    rawPrice: 650,
    currency: "NIO",
    priceNio: 650,
    priceUsd: 17.57,
    description: "Soporte ergonómico para celular con batería integrada Anker de 6700 mAh y ventilador de refrigeración silencioso integrado. Carga rápida mientras juegas, ideal para sesiones largas de Free Fire, COD Mobile y PUBG.",
    imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80"
  },
  {
    listingId: "1198273641889024",
    title: "Repetidor TP-LINK RE315 AC1200",
    rawPrice: 850,
    currency: "NIO",
    priceNio: 850,
    priceUsd: 22.97,
    description: "Extensor de rango Wi-Fi TP-Link AC1200 doble banda (300 Mbps en 2.4 GHz + 867 Mbps en 5 GHz). Tecnología OneMesh para cobertura total en el hogar sin cortes, indicador inteligente de señal e instalación plug & play.",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80"
  },
  {
    listingId: "1198273641889025",
    title: "Mando Windchaser PLUS Youth Edition",
    rawPrice: 750,
    currency: "NIO",
    priceNio: 750,
    priceUsd: 20.27,
    description: "Control inalámbrico multiplataforma compatible con PC, Switch, Android e iOS. Motores de doble vibración háptica, giroscopio de 6 ejes, botones traseros programables y conexión Bluetooth de alta estabilidad.",
    imageUrl: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&auto=format&fit=crop&q=80"
  },
  {
    listingId: "1198273641889026",
    title: "¡BESTIA GAMER! Acer Predator Helios Neo 14 | RTX 4070 | Intel Ultra 7",
    rawPrice: 1100,
    currency: "USD",
    priceNio: 40700,
    priceUsd: 1100,
    description: "Laptop gamer de alta gama compacta de 14.5 pulgadas. Procesador Intel Core Ultra 7 155H, gráfica NVIDIA GeForce RTX 4070 8GB GDDR6, pantalla 2.5K a 165Hz con cobertura 100% sRGB, 16GB RAM LPDDR5X y 1TB SSD NVMe Gen4.",
    imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80"
  }
];

let fbAssistantActiveListings = [...FB_USER_DEFAULT_LISTINGS];

export function openFbSyncAssistantModal(customListings = null) {
  if (Array.isArray(customListings) && customListings.length > 0) {
    fbAssistantActiveListings = customListings;
  }
  const modal = document.getElementById("modal-fb-sync-assistant");
  if (!modal) return;

  renderFbDetectedListings();
  modal.style.display = "flex";
  if (typeof window.syncModalScrollLock === "function") {
    window.syncModalScrollLock();
  }
}

export function renderFbDetectedListings() {
  const container = document.getElementById("fb-detected-listings-list");
  if (!container) return;

  if (fbAssistantActiveListings.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--gray-500); padding: 1rem; font-size: 0.8rem;">No hay publicaciones detectadas pendientes.</div>`;
    return;
  }

  container.innerHTML = fbAssistantActiveListings.map((item, idx) => {
    const isUsd = item.currency === "USD" || (item.rawPrice <= 200 && item.currency !== "NIO");
    const displayPrice = isUsd ? `$${item.priceUsd || item.rawPrice} USD` : `C$${item.priceNio || item.rawPrice}`;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
          <input type="checkbox" id="chk-fb-item-${idx}" checked style="accent-color: #0284c7; cursor: pointer; transform: scale(1.1);" />
          <div style="width: 38px; height: 38px; border-radius: 4px; overflow: hidden; background: #f8fafc; border: 1px solid #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            <img src="${item.imageUrl}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'" />
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 0.8rem; font-weight: 800; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.title}">
              ${item.title}
            </div>
            <div style="font-size: 0.72rem; color: #0284c7; font-family: var(--font-mono); font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
              <span>${displayPrice}</span>
              <span style="color: var(--gray-400);">•</span>
              <span style="color: var(--gray-500); font-weight: 400;">Fondo blanco + Ficha IA</span>
            </div>
          </div>
        </div>
        <button type="button" onclick="removeFbAssistantListing(${idx})" style="background: none; border: none; color: var(--gray-400); cursor: pointer; font-size: 0.9rem; padding: 2px 6px;" title="Excluir de la importación">✕</button>
      </div>
    `;
  }).join("");
}

export function removeFbAssistantListing(idx) {
  fbAssistantActiveListings.splice(idx, 1);
  renderFbDetectedListings();
}

export async function importSingleFbListingInput() {
  const input = document.getElementById("fb-manual-import-input");
  if (!input || !input.value.trim()) {
    showToast("Escribe un título y precio o pega un enlace de Facebook", "warning");
    return;
  }
  const text = input.value.trim();
  const numMatch = text.match(/\d+([.,]\d+)?/);
  const rawNum = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 0;
  const isUsd = text.includes("$") && !text.includes("C$");
  
  const newItem = {
    listingId: `manual_${Date.now()}`,
    title: text.replace(/\d+([.,]\d+)?/g, "").replace(/[$C]/g, "").trim() || text,
    rawPrice: rawNum,
    currency: isUsd ? "USD" : (rawNum <= 200 ? "USD" : "NIO"),
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    description: text
  };

  fbAssistantActiveListings.unshift(newItem);
  input.value = "";
  renderFbDetectedListings();
  showToast("Publicación añadida a la cola de importación IA.", "info");
}

export async function importSelectedFacebookListings() {
  const btn = document.getElementById("btn-import-fb-selected");
  const origText = btn ? btn.textContent : "";
  
  const selected = [];
  fbAssistantActiveListings.forEach((item, idx) => {
    const chk = document.getElementById(`chk-fb-item-${idx}`);
    if (chk && chk.checked) {
      selected.push(item);
    }
  });

  if (selected.length === 0) {
    showToast("Selecciona al menos una publicación para importar.", "warning");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Procesando con IA (Fondo Blanco + Viñetas)...";
  }

  showToast(`Iniciando importación IA de ${selected.length} publicaciones...`, "info");

  try {
    const colName = typeof getCollectionName === "function" ? getCollectionName("rewards_catalog") : "rewards_catalog";
    const res = await fetch(`/api/sync-facebook?collection=${encodeURIComponent(colName)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: selected })
    });

    const data = await res.json();
    if (data.success && data.report) {
      const createdCount = data.report.newProductsCreated?.length || 0;
      const updatedCount = data.report.updatedProducts?.length || 0;
      showToast(`✓ Importación completada: ${createdCount} producto(s) creados con fondo blanco y ficha IA en "${colName}".`, "success");
      
      const modal = document.getElementById("modal-fb-sync-assistant");
      if (modal) modal.style.display = "none";
      if (typeof window.syncModalScrollLock === "function") {
        window.syncModalScrollLock();
      }

      if (vm && typeof vm.refreshData === "function") {
        await vm.refreshData();
      }
      if (typeof window.filterCatalogAdmin === "function") {
        window.filterCatalogAdmin();
      } else if (vm && typeof vm.notify === "function") {
        vm.notify();
      }
    } else {
      showToast(`Aviso al importar: ${data.error || "Verifica la respuesta"}`, "warning");
    }
  } catch (err) {
    showToast(`Error de red al importar: ${err.message}`, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText || "⚡ IMPORTAR AL CATÁLOGO CON IA";
    }
  }
}

export async function triggerFacebookCloudSync() {
  const btn = document.getElementById("btn-sync-fb-cloud");
  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Sincronizando con FB...";
  }
  showToast("Consultando Facebook Marketplace 24/7 y procesando con IA...", "info");
  try {
    const colName = typeof getCollectionName === "function" ? getCollectionName("rewards_catalog") : "rewards_catalog";
    const res = await fetch(`/api/sync-facebook?collection=${encodeURIComponent(colName)}`, { method: "POST" });
    const data = await res.json();
    if (data.success && data.report) {
      const up = data.report.updatedProducts?.length || 0;
      const nw = data.report.newProductsCreated?.length || 0;
      const sold = data.report.markedSoldProducts?.length || 0;
      const totalFb = data.report.totalFacebookFound || 0;
      
      if (totalFb === 0) {
        showToast("Facebook requiere verificación de sesión. Abriendo Asistente de Importación...", "info");
        openFbSyncAssistantModal();
        return;
      }

      const parts = [];
      if (up > 0) parts.push(`${up} precio(s)`);
      if (sold > 0) parts.push(`${sold} agotado(s)`);
      if (nw > 0) parts.push(`${nw} nuevo(s)`);
      const detailStr = parts.length > 0 ? `: ${parts.join(', ')} sincronizado(s)` : ': Catálogo al día, sin cambios';
      showToast(`✓ Sincronización FB (${totalFb} analizados)${detailStr}.`, "success");
      
      if (vm && typeof vm.refreshData === "function") {
        await vm.refreshData();
      }
      if (typeof window.filterCatalogAdmin === "function") {
        window.filterCatalogAdmin();
      }
    } else {
      showToast(`⚠️ Aviso de sincronización: ${data.error || "Sin novedades"}`, "info");
      openFbSyncAssistantModal();
    }
  } catch (err) {
    showToast(`Error al sincronizar con Vercel: ${err.message}`, "error");
    openFbSyncAssistantModal();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || "🔄 Sincronizar con Facebook (24/7)";
    }
  }
}

if (typeof window !== "undefined") {
  window.addComboItemTab = addComboItemTab;
  window.removeComboItemTab = removeComboItemTab;
  window.selectComboItemTab = selectComboItemTab;
  window.onActiveComboItemChange = onActiveComboItemChange;
  window.updateComboLiveSummary = updateComboLiveSummary;
  window.setProductMainType = setProductMainType;
  window.triggerFacebookCloudSync = triggerFacebookCloudSync;
  window.openFbSyncAssistantModal = openFbSyncAssistantModal;
  window.renderFbDetectedListings = renderFbDetectedListings;
  window.removeFbAssistantListing = removeFbAssistantListing;
  window.importSingleFbListingInput = importSingleFbListingInput;
  window.importSelectedFacebookListings = importSelectedFacebookListings;
}