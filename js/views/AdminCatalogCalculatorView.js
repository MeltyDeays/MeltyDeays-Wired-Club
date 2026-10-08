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

function applyCalculatedPointsToProduct(showToastNotification = false) {
  const { suggestedPoints, salesRequired, landedCost, salesCount, pointsPerSale } = recalculateRewardPoints();
  const costInput = document.getElementById("prod-cost");
  if (costInput) {
    costInput.value = suggestedPoints;
    if (showToastNotification) {
      costInput.style.borderColor = "#059669";
      costInput.style.boxShadow = "0 0 10px rgba(5, 150, 105, 0.35)";
      setTimeout(() => {
        costInput.style.borderColor = "";
        costInput.style.boxShadow = "";
      }, 1200);
    }
  }
  if (showToastNotification) {
    showToast(`⚡ Asignado: ${suggestedPoints.toLocaleString()} WP (${salesCount} compras de ${pointsPerSale} WP | Costo Landed: $${landedCost.toFixed(2)}).`, "success");
  }
}

function onManualPointsCostChange() {
  // Sincronización libre si el usuario prefiere tipear a mano
}

// -----------------------------------------------------------------------------
// CATÁLOGO MIXTO: RECOMPENSAS 100% CANJEABLES VS VENTA CON TOPE DE DESCUENTO VS EN CAMINO
// -----------------------------------------------------------------------------
let activeProductMode = "FREE_REWARD"; // "FREE_REWARD" | "PARTIAL_DISCOUNT" | "INCOMING"
let activeProductDiscountPct = 5; // 5% por defecto
let activeIncomingDiscountType = "PERCENTAGE"; // "PERCENTAGE" | "FIXED_AMOUNT"

function setProductPublicationMode(mode) {
  if (mode === "COMBO") {
    if (typeof window.activateComboBuilder === "function") {
      window.activateComboBuilder();
    }
    return;
  }

  activeProductMode = mode;
  const isFree = mode === "FREE_REWARD";
  const isIncoming = mode === "INCOMING";

  if (typeof window.deactivateComboBuilder === "function") {
    window.deactivateComboBuilder();
  }

  const badge = document.getElementById("prod-mode-badge");
  const btnFree = document.getElementById("btn-prod-mode-free");
  const btnDisc = document.getElementById("btn-prod-mode-discount");
  const btnIncoming = document.getElementById("btn-prod-mode-incoming");
  const btnCombo = document.getElementById("btn-prod-mode-combo");
  const btnTypeStandard = document.getElementById("btn-prod-type-standard");
  const btnTypeCombo = document.getElementById("btn-prod-type-combo");
  const secFree = document.getElementById("sec-product-free-calc");
  const secDisc = document.getElementById("sec-product-discount-calc");
  const secIncoming = document.getElementById("sec-product-incoming-calc");
  const typeInput = document.getElementById("prod-reward-type");
  const isIncInput = document.getElementById("prod-is-incoming");
  const summaryPill = document.getElementById("prod-commercial-summary-pill");

  if (typeInput) typeInput.value = mode;
  if (isIncInput) isIncInput.value = isIncoming ? "true" : "false";

  if (badge) {
    if (isIncoming) {
      badge.textContent = "MODO: 灰羽 EN CAMINO (PREVENTA)";
      badge.style.background = "#faf5ff";
      badge.style.color = "#7e22ce";
      badge.style.borderColor = "#c084fc";
    } else if (isFree) {
      badge.textContent = "MODO: 🎁 100% CANJEABLE";
      badge.style.background = "#ecfdf5";
      badge.style.color = "#065f46";
      badge.style.borderColor = "#a7f3d0";
    } else {
      badge.textContent = "MODO: 🏷️ VENTA TOPADA";
      badge.style.background = "#fef3c7";
      badge.style.color = "#b45309";
      badge.style.borderColor = "#fde68a";
    }
  }

  if (btnFree) {
    btnFree.style.border = isFree ? "2px solid #059669" : "1.5px solid #cbd5e1";
    btnFree.style.background = isFree ? "#ecfdf5" : "#f8fafc";
    btnFree.style.color = isFree ? "#065f46" : "#475569";
    btnFree.classList.toggle("active", isFree);
  }

  if (btnDisc) {
    const isDisc = (!isFree && !isIncoming);
    btnDisc.style.border = isDisc ? "2px solid #d97706" : "1.5px solid #cbd5e1";
    btnDisc.style.background = isDisc ? "#fffbeb" : "#f8fafc";
    btnDisc.style.color = isDisc ? "#b45309" : "#475569";
    btnDisc.classList.toggle("active", isDisc);
  }

  if (btnIncoming) {
    btnIncoming.style.border = isIncoming ? "2px solid #a855f7" : "1.5px solid #cbd5e1";
    btnIncoming.style.background = isIncoming ? "#faf5ff" : "#f8fafc";
    btnIncoming.style.color = isIncoming ? "#7e22ce" : "#475569";
    btnIncoming.classList.toggle("active", isIncoming);
  }

  if (btnCombo) {
    btnCombo.style.border = "1.5px solid #cbd5e1";
    btnCombo.style.background = "#f8fafc";
    btnCombo.style.color = "#475569";
    btnCombo.classList.remove("active");
  }
  if (btnTypeStandard) {
    btnTypeStandard.style.border = "2px solid #059669";
    btnTypeStandard.style.background = "#ecfdf5";
    btnTypeStandard.style.color = "#065f46";
    btnTypeStandard.classList.add("active");
  }
  if (btnTypeCombo) {
    btnTypeCombo.style.border = "1.5px solid #cbd5e1";
    btnTypeCombo.style.background = "#f8fafc";
    btnTypeCombo.style.color = "#475569";
    btnTypeCombo.classList.remove("active");
  }

  if (secFree) secFree.style.display = isFree ? "block" : "none";
  if (secDisc) secDisc.style.display = (!isFree && !isIncoming) ? "block" : "none";
  if (secIncoming) secIncoming.style.display = isIncoming ? "block" : "none";

  if (isIncoming) {
    const costInput = document.getElementById("prod-cost");
    if (costInput) {
      costInput.value = "0";
      costInput.placeholder = "0 WP (Preventa Directa)";
    }
    const dtInput = document.getElementById("calc-incoming-arrival-datetime");
    if (dtInput && !dtInput.value) {
      setIncomingArrivalPreset(7);
    } else {
      recalculateIncomingPresale();
      applyCalculatedIncomingToProduct();
    }
  } else if (isFree) {
    if (summaryPill) summaryPill.style.display = "none";
    applyCalculatedPointsToProduct();
  } else {
    recalculateProductDiscount();
    applyCalculatedDiscountToProduct();
  }
}

function setIncomingArrivalPreset(days) {
  const dtInput = document.getElementById("calc-incoming-arrival-datetime");
  if (dtInput) {
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    d.setHours(18, 0, 0, 0); // 6:00 PM standard
    const pad = n => String(n).padStart(2, "0");
    const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    dtInput.value = val;
  }

  [3, 7, 14, 30].forEach(n => {
    const btn = document.getElementById(`btn-incoming-arrival-${n}`);
    if (btn) {
      if (n === Number(days)) {
        btn.classList.add("active");
        btn.style.border = "1.5px solid #a855f7";
        btn.style.background = "#faf5ff";
        btn.style.color = "#7e22ce";
      } else {
        btn.classList.remove("active");
        btn.style.border = "";
        btn.style.background = "";
        btn.style.color = "";
      }
    }
  });

  recalculateIncomingPresale();
  applyCalculatedIncomingToProduct();
  showToast(`Fecha estimada de llegada fijada en +${days} días.`, "info");
}

function setIncomingDiscountType(type) {
  activeIncomingDiscountType = type || "PERCENTAGE";
  const btnPct = document.getElementById("btn-incoming-disc-type-pct");
  const btnUsd = document.getElementById("btn-incoming-disc-type-usd");
  const unitLabel = document.getElementById("incoming-discount-unit-label");
  const isPct = activeIncomingDiscountType === "PERCENTAGE";

  if (btnPct) {
    if (isPct) {
      btnPct.classList.add("active");
      btnPct.style.border = "1.5px solid #a855f7";
      btnPct.style.background = "#faf5ff";
      btnPct.style.color = "#7e22ce";
    } else {
      btnPct.classList.remove("active");
      btnPct.style.border = "";
      btnPct.style.background = "";
      btnPct.style.color = "";
    }
  }

  if (btnUsd) {
    if (!isPct) {
      btnUsd.classList.add("active");
      btnUsd.style.border = "1.5px solid #a855f7";
      btnUsd.style.background = "#faf5ff";
      btnUsd.style.color = "#7e22ce";
    } else {
      btnUsd.classList.remove("active");
      btnUsd.style.border = "";
      btnUsd.style.background = "";
      btnUsd.style.color = "";
    }
  }

  if (unitLabel) unitLabel.textContent = isPct ? "%" : "USD";

  const typeHidden = document.getElementById("prod-presale-discount-type");
  if (typeHidden) typeHidden.value = activeIncomingDiscountType;

  recalculateIncomingPresale();
  applyCalculatedIncomingToProduct();
}

function setIncomingDiscountVal(val) {
  const valInput = document.getElementById("calc-incoming-discount-val");
  if (valInput) valInput.value = val;

  [5, 10, 15, 20, 25].forEach(n => {
    const btn = document.getElementById(`btn-incoming-disc-${n}`);
    if (btn) {
      if (n === Number(val)) {
        btn.classList.add("active");
        btn.style.border = "1.5px solid #a855f7";
        btn.style.background = "#faf5ff";
        btn.style.color = "#7e22ce";
      } else {
        btn.classList.remove("active");
        btn.style.border = "";
        btn.style.background = "";
        btn.style.color = "";
      }
    }
  });

  recalculateIncomingPresale();
  applyCalculatedIncomingToProduct();
}

function recalculateIncomingPresale() {
  const priceInput = document.getElementById("calc-incoming-price-usd");
  const dtInput = document.getElementById("calc-incoming-arrival-datetime");
  const valInput = document.getElementById("calc-incoming-discount-val");

  const regularPrice = Math.max(0, parseFloat(priceInput?.value) || 0);
  const arrivalDatetime = dtInput?.value || "";
  const discountVal = Math.max(0, parseFloat(valInput?.value) || 0);
  const discountType = activeIncomingDiscountType || "PERCENTAGE";

  let discountUsd = 0;
  if (discountType === "PERCENTAGE") {
    discountUsd = Number((regularPrice * (discountVal / 100)).toFixed(2));
  } else {
    discountUsd = Math.min(regularPrice, Number(discountVal.toFixed(2)));
  }
  const presalePrice = Math.max(0, Number((regularPrice - discountUsd).toFixed(2)));

  // Calcular tiempo restante para preview
  let countdownPreview = "⏱️ Sin fecha programada";
  if (arrivalDatetime) {
    const targetMs = new Date(arrivalDatetime).getTime();
    const nowMs = Date.now();
    const diffMs = targetMs - nowMs;
    if (diffMs <= 0) {
      countdownPreview = "⏱️ ¡Fecha de llegada ya alcanzada o expirada!";
    } else {
      const d = Math.floor(diffMs / (24 * 3600 * 1000));
      const h = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
      const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
      countdownPreview = `⏱️ Tiempo restante estimado: ${d} días, ${h} hrs, ${m} mins`;
    }
  }

  const sumReg = document.getElementById("calc-incoming-summary-regular");
  const sumDisc = document.getElementById("calc-incoming-summary-disc");
  const sumFinal = document.getElementById("calc-incoming-summary-final");
  const sumPreview = document.getElementById("calc-incoming-countdown-preview");

  if (sumReg) sumReg.textContent = `$${regularPrice.toFixed(2)} USD`;
  if (sumDisc) {
    const discLabel = discountType === "PERCENTAGE" ? `${discountVal}%` : `$${discountVal.toFixed(2)} USD`;
    sumDisc.textContent = `-$${discountUsd.toFixed(2)} USD (${discLabel})`;
  }
  if (sumFinal) sumFinal.textContent = `$${presalePrice.toFixed(2)} USD`;
  if (sumPreview) sumPreview.textContent = countdownPreview;

  return {
    regularPrice,
    discountType,
    discountVal,
    discountUsd,
    presalePrice,
    arrivalDatetime
  };
}

function applyCalculatedIncomingToProduct() {
  const calc = recalculateIncomingPresale();

  const typeInput = document.getElementById("prod-reward-type");
  const isIncInput = document.getElementById("prod-is-incoming");
  const priceInput = document.getElementById("prod-price-usd");
  const arrivalInput = document.getElementById("prod-estimated-arrival");
  const discTypeInput = document.getElementById("prod-presale-discount-type");
  const discValInput = document.getElementById("prod-presale-discount-val");
  const discUsdInput = document.getElementById("prod-presale-discount-usd");
  const presalePriceInput = document.getElementById("prod-presale-price-usd");
  const costInput = document.getElementById("prod-cost");

  if (typeInput) typeInput.value = "INCOMING";
  if (isIncInput) isIncInput.value = "true";
  if (priceInput) priceInput.value = calc.regularPrice;
  if (arrivalInput && calc.arrivalDatetime) {
    arrivalInput.value = new Date(calc.arrivalDatetime).toISOString();
  }
  if (discTypeInput) discTypeInput.value = calc.discountType;
  if (discValInput) discValInput.value = calc.discountVal;
  if (discUsdInput) discUsdInput.value = calc.discountUsd;
  if (presalePriceInput) presalePriceInput.value = calc.presalePrice;
  if (costInput) costInput.value = "0";

  const summaryPill = document.getElementById("prod-commercial-summary-pill");
  if (summaryPill) {
    summaryPill.style.display = "block";
    summaryPill.style.background = "#faf5ff";
    summaryPill.style.borderColor = "#c084fc";
    summaryPill.style.color = "#581c87";
    summaryPill.innerHTML = `灰羽 <strong>PREVENTA EN CAMINO:</strong> Precio Regular <strong>$${calc.regularPrice.toFixed(2)} USD</strong> · Descuento Directo <strong style="color:#059669;">-$${calc.discountUsd.toFixed(2)} USD</strong> · <strong>Cobrar en Preventa: <span style="color:#7e22ce;">$${calc.presalePrice.toFixed(2)} USD (0 WP)</span></strong>`;
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

  // Actualizar pill de resumen con reconstrucción estructural limpia
  const summaryPill = document.getElementById("prod-commercial-summary-pill");
  if (summaryPill) {
    summaryPill.style.display = "block";
    summaryPill.style.background = "#fef3c7";
    summaryPill.style.borderColor = "#f59e0b";
    summaryPill.style.color = "#92400e";
    summaryPill.innerHTML = `🏷️ <strong>VENTA TOPADA:</strong> <span id="pill-summary-price">$${salePrice.toFixed(2)} USD</span> · Dcto <span id="pill-summary-pct">${discountPct}%</span> (-<span id="pill-summary-disc">$${maxDiscountUsd.toFixed(2)} USD</span> con <span id="pill-summary-wp">${requiredPoints.toLocaleString()} WP</span>) · <strong>Cobrar: <span id="pill-summary-cash" style="color: #dc2626;">$${cashDue.toFixed(2)} USD</span></strong>`;
  }
}

function toggleProductCalculatorAccordion() {
  const content = document.getElementById("prod-calc-accordion-body");
  const arrow = document.getElementById("calc-toggle-arrow");
  if (!content) return;
  const isCurrentlyOpen = content.style.display !== "none" && content.style.display !== "";
  if (isCurrentlyOpen) {
    content.style.display = "none";
    if (arrow) arrow.textContent = "▾ ABRIR";
  } else {
    content.style.display = "block";
    if (arrow) arrow.textContent = "▴ CERRAR";
  }
}

if (typeof window !== "undefined") {
  window.toggleProductCalculatorAccordion = toggleProductCalculatorAccordion;
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
  applyCalculatedDiscountToProduct,
  setIncomingArrivalPreset,
  setIncomingDiscountType,
  setIncomingDiscountVal,
  recalculateIncomingPresale,
  applyCalculatedIncomingToProduct,
  toggleProductCalculatorAccordion
};
