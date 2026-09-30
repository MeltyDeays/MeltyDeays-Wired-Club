/**
 * Vista / Subcontrolador: Calculadora de Puntos y Descuentos para Productos de Catálogo
 */
let showToast = () => {};

export function initAdminCatalogCalculatorView(deps) {
  if (deps && deps.showToast) showToast = deps.showToast;
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

export {
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
  applyCalculatedDiscountToProduct
};
