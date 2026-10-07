/**
 * Vista / Subcontrolador: Calculadora de Retorno de Puntos por Venta (Factura 4X1 y Digital)
 */
let showToast = () => {};
let closeModal = () => {};
let toggleSingleInvoicePointsFields = () => {};

export function initAdminSalePointsCalculatorView(deps) {
  if (deps) {
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.toggleSingleInvoicePointsFields) toggleSingleInvoicePointsFields = deps.toggleSingleInvoicePointsFields;
  }
}

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
  if (typeof window !== "undefined" && typeof window.syncModalScrollLock === "function") {
    window.syncModalScrollLock();
  }
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

export {
  openSalePointsCalculatorModal,
  setSaleFreightPreset,
  applySaleBtnStyle,
  setSaleReturnBase,
  setSaleReturnPct,
  recalculateSalePoints,
  applySalePointsToActiveTarget
};
