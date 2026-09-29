/* Controller: Portal de Clientes (The Wired Club) */
import { CustomerViewModel } from "./viewmodels/CustomerViewModel.js";
import { FirestoreService } from "./services/FirestoreService.js";

const vm = new CustomerViewModel();

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

// SISTEMA TOAST MODERNO (CERO ALERTAS MOLESTAS DE NAVEGADOR)
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success: "✓",
    error: "✕",
    info: "⚡"
  };

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML = `<span style="font-weight:900; font-size:1rem;">${icons[type] || '•'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setAuthFeedback(message, type = "info") {
  const banner = document.getElementById("auth-feedback");
  if (!banner) return;
  if (!message) {
    banner.style.display = "none";
    banner.textContent = "";
    banner.className = "auth-feedback-banner";
  } else {
    banner.className = "auth-feedback-banner " + type;
    banner.textContent = message;
    banner.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Suscribirse a cambios en el ViewModel
  vm.subscribe(render);

  // Vincular funciones a window para eventos HTML onclick
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.switchAuthTab = switchAuthTab;
  window.submitClientLogin = submitClientLogin;
  window.submitClientRegister = submitClientRegister;
  window.toggleClientPinVisibility = toggleClientPinVisibility;
  window.logoutClient = logoutClient;

  window.switchTab = switchTab;
  window.openClaimModal = openClaimModal;
  window.closeClaimModal = closeClaimModal;
  window.openClientCameraScanner = openClientCameraScanner;
  window.stopClientCameraScanner = stopClientCameraScanner;
  window.submitManualClaim = submitManualClaim;
  window.claimFromBanner = claimFromBanner;
  window.dismissClaimBanner = dismissClaimBanner;
  window.openAdminAssignModal = openAdminAssignModal;
  window.closeAdminAssignModal = closeAdminAssignModal;
  window.submitAdminAssignFromScan = submitAdminAssignFromScan;

  window.confirmRedeem = confirmRedeem;
  window.executeRedeem = executeRedeem;
  window.closeRedeemModal = closeRedeemModal;
  window.onPointsSliderChange = onPointsSliderChange;
  window.onPointsNumChange = onPointsNumChange;
  window.setPointsPreset = setPointsPreset;

  window.showVoucherModal = showVoucherModal;
  window.closeVoucherModal = closeVoucherModal;
  window.promptCancelCurrentVoucher = promptCancelCurrentVoucher;
  window.promptCancelVoucher = promptCancelVoucher;
  window.closeCancelVoucherModal = closeCancelVoucherModal;
  window.executeCancelVoucher = executeCancelVoucher;
  window.copyMemberCode = copyMemberCode;
  window.copyVoucherCode = copyVoucherCode;
  window.setAppCurrency = setAppCurrency;
  window.showToast = showToast;

  // Inicializar máscara telefónica en campos de acceso
  attachPhoneMask(document.getElementById("login-phone"));
  attachPhoneMask(document.getElementById("reg-phone"));

  // Iniciar ViewModel
  vm.init();
});

// CONVERSIÓN Y FORMATO DE MONEDA (1 USD = 37 C$ NIO)
const USD_TO_NIO_RATE = 37.0;

export function formatPrice(amountUsd) {
  const curr = (vm && vm.preferredCurrency) || "USD";
  const num = Number(amountUsd) || 0;
  if (curr === "NIO") {
    const nio = num * USD_TO_NIO_RATE;
    return `C$ ${nio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toFixed(2)} USD`;
}

export function formatDualPrice(amountUsd) {
  const curr = (vm && vm.preferredCurrency) || "USD";
  const num = Number(amountUsd) || 0;
  const nio = num * USD_TO_NIO_RATE;
  const nioStr = `C$ ${nio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO`;
  const usdStr = `$${num.toFixed(2)} USD`;
  if (curr === "NIO") {
    return `${nioStr} (${usdStr})`;
  }
  return `${usdStr} (${nioStr})`;
}

export async function setAppCurrency(curr) {
  try {
    await vm.setCurrency(curr);
    if (curr === "NIO") {
      showToast("✓ Moneda establecida en Córdobas (1 USD = 37 C$)", "success");
    } else {
      showToast("✓ Moneda establecida en Dólares ($ USD)", "info");
    }
  } catch (err) {
    showToast(err.message || "Error al cambiar moneda", "error");
  }
}

// RENDERIZADO REACTIVO DE LA VISTA
function render(model) {
  const user = model.currentUser;
  const curr = model.preferredCurrency || "USD";

  // 0. Sincronización visual de botones de moneda ($ USD / C$ NIO)
  const btnUsd = document.getElementById("btn-currency-usd");
  const btnNio = document.getElementById("btn-currency-nio");
  if (btnUsd && btnNio) {
    if (curr === "NIO") {
      btnNio.style.background = "#0f172a";
      btnNio.style.color = "#ffffff";
      btnUsd.style.background = "#ffffff";
      btnUsd.style.color = "var(--dark)";
    } else {
      btnUsd.style.background = "#0f172a";
      btnUsd.style.color = "#ffffff";
      btnNio.style.background = "#ffffff";
      btnNio.style.color = "var(--dark)";
    }
  }

  // 1. Barra de Navegación
  const navUserPill = document.getElementById("nav-user-pill");
  const navUserBtn = document.getElementById("nav-login-btn");
  const navUserName = document.getElementById("nav-user-name");

  if (user) {
    if (navUserPill) navUserPill.style.display = "inline-flex";
    if (navUserBtn) navUserBtn.style.display = "none";
    if (navUserName) navUserName.textContent = user.displayName;
  } else {
    if (navUserPill) navUserPill.style.display = "none";
    if (navUserBtn) navUserBtn.style.display = "inline-flex";
  }

  // 2. CyberPass de Socio
  const passName = document.getElementById("client-display-name");
  const passPhone = document.getElementById("client-phone-display");
  const passBalance = document.getElementById("client-balance-val");
  const passTier = document.getElementById("client-tier-badge");
  const passMemberId = document.getElementById("pass-member-id");
  const passUsdEquiv = document.getElementById("client-usd-equiv");

  const pts = user ? (user.wiredPoints || 0) : 0;
  const equivUsd = pts / 50;
  const equivNio = equivUsd * 37.0;

  if (user) {
    if (passName) passName.textContent = user.displayName;
    if (passPhone) passPhone.textContent = user.phone ? ("+505 " + FirestoreService.formatPhoneDisplay(user.phone)) : "Sin Teléfono";
    if (passBalance) passBalance.textContent = user.wiredPoints.toLocaleString();
    if (passTier) passTier.textContent = user.tier || "NAVI_USER";
    if (passMemberId) passMemberId.textContent = "● " + user.memberCode;
    if (passUsdEquiv) {
      if (curr === "NIO") {
        passUsdEquiv.innerHTML = `C$ ${equivNio.toFixed(2)} NIO <span style="font-size:0.75rem; color:#64748b; font-weight:700;">($${equivUsd.toFixed(2)} USD)</span>`;
      } else {
        passUsdEquiv.innerHTML = `$${equivUsd.toFixed(2)} USD <span style="font-size:0.75rem; color:#64748b; font-weight:700;">(C$ ${equivNio.toFixed(2)} NIO)</span>`;
      }
    }
    renderUserQr(user.memberCode);
  } else {
    if (passName) passName.textContent = "Socio Invitado";
    if (passPhone) passPhone.textContent = "Inicia sesión con tu WhatsApp";
    if (passBalance) passBalance.textContent = "0";
    if (passTier) passTier.textContent = "NAVI_GUEST";
    if (passMemberId) passMemberId.textContent = "● MC-INVITADO";
    if (passUsdEquiv) {
      if (curr === "NIO") {
        passUsdEquiv.innerHTML = `C$ 0.00 NIO <span style="font-size:0.75rem; color:#64748b;">($0.00 USD)</span>`;
      } else {
        passUsdEquiv.innerHTML = `$0.00 USD <span style="font-size:0.75rem; color:#64748b;">(C$ 0.00 NIO)</span>`;
      }
    }
    renderUserQr("MELTY-WIRED-CLUB-GUEST");
  }

  // 3. Banner de Reclamo Pendiente (?claim=WP-XXXX)
  const claimBanner = document.getElementById("claim-banner");
  const detectedToken = document.getElementById("detected-token");
  if (model.pendingClaimToken) {
    if (claimBanner) claimBanner.style.display = "flex";
    if (detectedToken) detectedToken.textContent = model.pendingClaimToken;

    import("./services/FirestoreService.js").then(({ FirestoreService }) => {
      FirestoreService.getToken(model.pendingClaimToken).then(tok => {
        const bannerText = document.getElementById("claim-banner-text");
        const btnClaim = document.getElementById("btn-execute-claim");
        if (tok) {
          if (tok.pointsValue > 0 && tok.status !== "CLAIMED") {
            if (bannerText) bannerText.innerHTML = `Factura #MD-2026-<strong>${tok.invoiceFolio || "0000"}</strong> · Recompensa: <strong style="color:#059669; font-size:1.05rem;">+${tok.pointsValue} WP</strong>`;
            if (btnClaim) {
              btnClaim.textContent = `Acreditar +${tok.pointsValue} WP`;
              btnClaim.onclick = claimFromBanner;
              btnClaim.style.display = "inline-block";
            }
          } else if (tok.pointsValue <= 0) {
            if (bannerText) bannerText.innerHTML = `Factura #MD-2026-<strong>${tok.invoiceFolio || "0000"}</strong> · <span style="color:#e11d48; font-weight:800;">Pendiente de Asignar Puntos</span>`;
            if (btnClaim) {
              btnClaim.textContent = "⚡ Asignar Puntos (Admin)";
              btnClaim.onclick = openAdminAssignModal;
              btnClaim.style.display = "inline-block";
            }
          } else if (tok.status === "CLAIMED") {
            if (bannerText) bannerText.innerHTML = `Factura #MD-2026-<strong>${tok.invoiceFolio || "0000"}</strong> · <span style="color:#e11d48; font-weight:800;">Esta factura ya fue reclamada</span>`;
            if (btnClaim) {
              btnClaim.textContent = "✓ Entendido";
              btnClaim.className = "btn-secondary";
              btnClaim.style.display = "inline-block";
              btnClaim.onclick = dismissClaimBanner;
            }
            // Auto-descartar después de 4.5 segundos
            setTimeout(dismissClaimBanner, 4500);
          }
        }
      });
    });
  } else {
    if (claimBanner) claimBanner.style.display = "none";
  }

  // 4. Catálogo de Recompensas
  renderCatalog(model.catalog, user);

  // 5. Vales Activos
  renderVouchers(model.vouchers);

  // 6. Libro Mayor (Ledger)
  renderLedger(model.ledger);
}

function renderCatalog(catalog, user) {
  const container = document.getElementById("catalog-container");
  if (!container) return;

  if (catalog.length === 0) {
    container.innerHTML = `
      <div class="cyber-empty-box">
        <div class="empty-icon-wrap">
          <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="1.8" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="M7 8h10M7 12h6" stroke-dasharray="2 2" />
          </svg>
        </div>
        <div class="empty-tag">COPLAND OS // STANDBY</div>
        <h3 class="empty-title">Catálogo en Preparación</h3>
        <p class="empty-desc">
          El administrador de <strong>MeltyDeays</strong> está configurando las recompensas disponibles en vitrina. ¡Acumula tus Wired Points con tus compras mientras tanto!
        </p>
        <button class="btn-primary" onclick="openClaimModal()" style="margin-top: 1.25rem;">
          + Acreditar Factura de Compra
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = catalog.map(item => {
    const isOut = item.stock <= 0;
    const canAfford = user && user.wiredPoints >= item.pointsCost;
    const isPartial = item.rewardType === "PARTIAL_DISCOUNT" || (typeof item.isPartialDiscount === "function" && item.isPartialDiscount());
    const userPts = user ? (user.wiredPoints || 0) : 0;
    const maxCapPts = item.pointsCost || 0;
    const maxPct = item.maxDiscountPct || 5;

    let appliedPts = 0;
    let appliedPct = 0;
    let appliedDiscountUsd = 0;
    let cashToPayWithPts = item.priceUsd || 0;

    if (isPartial) {
      appliedPts = Math.min(userPts, maxCapPts);
      appliedPct = maxCapPts > 0 ? Number(((appliedPts / maxCapPts) * maxPct).toFixed(2)) : 0;
      const usdPerPoint = (maxCapPts > 0 && item.maxDiscountUsd > 0) ? (item.maxDiscountUsd / maxCapPts) : 0;
      appliedDiscountUsd = Number(Math.min(item.maxDiscountUsd || 0, appliedPts * usdPerPoint).toFixed(2));
      cashToPayWithPts = Math.max(0, Number(((item.priceUsd || 0) - appliedDiscountUsd).toFixed(2)));
    }
    const formattedAppliedPct = appliedPct % 1 === 0 ? appliedPct.toFixed(0) : appliedPct.toFixed(1);

    let btnHtml = "";
    if (isOut) {
      btnHtml = `<button class="btn-redeem out" disabled>❌ AGOTADO</button>`;
    } else if (!user) {
      btnHtml = `<button class="btn-redeem login-req" onclick="openAuthModal('login', 'Inicia sesión para canjear')">🔒 Iniciar Sesión</button>`;
    } else if (isPartial) {
      if (userPts > 0) {
        btnHtml = `<button class="btn-redeem active-canje" style="background: linear-gradient(135deg, #d97706, #b45309);" onclick="confirmRedeem('${item.id}')">🏷️ APLICAR DESCUENTO (${formattedAppliedPct}%)</button>`;
      } else {
        btnHtml = `<button class="btn-redeem active-canje" style="background: linear-gradient(135deg, #0284c7, #0369a1);" onclick="confirmRedeem('${item.id}')">🛒 COMPRAR EN TIENDA</button>`;
      }
    } else if (!canAfford) {
      const missing = item.pointsCost - user.wiredPoints;
      btnHtml = `<button class="btn-redeem locked" onclick="showToast('Te faltan ${missing.toLocaleString()} WP para este producto', 'info')">🔒 Faltan ${missing.toLocaleString()} WP</button>`;
    } else {
      btnHtml = `<button class="btn-redeem active-canje" onclick="confirmRedeem('${item.id}')">⚡ CANJEAR AHORA</button>`;
    }

    let modeBadge = "";
    if (isPartial) {
      if (user && userPts >= maxCapPts) {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ TOPE ${maxPct}% OFF</div>`;
      } else if (user && userPts > 0) {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ ${formattedAppliedPct}% OFF / MÁX ${maxPct}%</div>`;
      } else {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ HASTA ${maxPct}% OFF</div>`;
      }
    } else {
      modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(5, 150, 105, 0.9); color: #ffffff; border: 1px solid #059669; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🎁 100% CANJEABLE</div>`;
    }

    let partialBreakdown = "";
    if (isPartial) {
      if (user && userPts >= maxCapPts) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (Tope ${maxPct}%):</span>
              <span class="pricing-val green">-${formatPrice(item.maxDiscountUsd)}</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(item.cashToPayUsd)}</span>
            </div>
          </div>
        `;
      } else if (user && userPts > 0) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (${appliedPts} WP):</span>
              <span class="pricing-val green">-${formatPrice(appliedDiscountUsd)} (${formattedAppliedPct}%)</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(cashToPayWithPts)}</span>
            </div>
            <div class="pricing-row footnote-row">
              <span>Tope máx. (${maxCapPts} WP):</span>
              <span>-${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
            </div>
          </div>
        `;
      } else if (user) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (0 WP):</span>
              <span class="pricing-val gray">0% (Sin puntos)</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row footnote-row">
              <span>Tope máx. (${maxCapPts} WP):</span>
              <span>Hasta -${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
            </div>
          </div>
        `;
      } else {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Ahorro con puntos:</span>
              <span class="pricing-val green">Hasta ${maxPct}% OFF</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Pagas en tienda:</span>
              <span class="pricing-val total">Desde ${formatPrice(item.cashToPayUsd)}</span>
            </div>
          </div>
        `;
      }
    }

    const costDisplay = isPartial
      ? (user && userPts > 0 && userPts < maxCapPts
        ? `<div class="reward-cost" style="color: #b45309; font-size: 0.86rem;">${appliedPts} <span style="font-size: 0.64rem; color: #d97706; font-weight: 800;">WP (TOPE ${maxCapPts})</span></div>`
        : `<div class="reward-cost" style="color: #b45309; font-size: 0.86rem;">${item.pointsCost.toLocaleString()} <span style="font-size: 0.64rem; color: #d97706; font-weight: 800;">WP (TOPE)</span></div>`
      )
      : `<div class="reward-cost">${item.pointsCost.toLocaleString()} <span>WP</span></div>`;

    return `
      <div class="reward-card">
        <div class="reward-img-wrap" style="${!item.imageUrl ? 'background: linear-gradient(135deg, #0d131f 0%, #17243b 100%); display:flex; align-items:center; justify-content:center;' : ''}">
          ${modeBadge}
          ${item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.title}" class="reward-img" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">`
        : `<div style="text-align:center; padding:1rem;"><span style="font-size:2.2rem;">${isPartial ? '🏷️' : '🎁'}</span><div style="font-family:var(--font-mono); font-size:0.68rem; color:#38bdf8; margin-top:4px;">${isPartial ? 'SALE_DISCOUNT' : 'TECH_REWARD'}</div></div>`
      }
          <div class="stock-tag ${isOut ? 'out' : ''}">${isOut ? 'AGOTADO' : item.stock + ' DISP.'}</div>
        </div>
        <div class="reward-body">
          <div class="reward-title">${item.title}</div>
          <div class="reward-desc">${item.description || (isPartial ? 'Producto comercial con descuento tope en Wired Points.' : 'Recompensa oficial MeltyDeays.')}</div>
          ${partialBreakdown}
          <div class="reward-footer">
            ${costDisplay}
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderVouchers(vouchers) {
  const container = document.getElementById("vouchers-container");
  const countBadge = document.getElementById("vouchers-count-badge");
  if (!container) return;

  const pending = (vouchers || []).filter(v => v.status === "PENDING_DELIVERY" || !v.isDelivered?.());
  if (countBadge) countBadge.textContent = pending.length;

  if (!vouchers || vouchers.length === 0) {
    container.innerHTML = `
      <div class="cyber-empty-box">
        <div class="empty-icon-wrap" style="color: var(--accent); background: #fff1f2; border-color: #fecdd3;">
          <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="1.8" fill="none">
            <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
            <path d="M10 4v16M14 4v16" stroke-dasharray="2 2" />
          </svg>
        </div>
        <div class="empty-tag">VALES // HISTORIAL VACÍO</div>
        <h3 class="empty-title">No Tienes Vales Activos</h3>
        <p class="empty-desc">
          Cuando canjees un producto en el catálogo, aquí aparecerá tu vale digital con QR para retirar directamente en mostrador.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="vouchers-grid">
      ${vouchers.map(v => {
    const isDelivered = v.status === "DELIVERED" || (typeof v.isDelivered === "function" && v.isDelivered()) || Boolean(v.deliveredAt);
    const isCancelled = v.status === "CANCELLED" || (typeof v.isCancelled === "function" && v.isCancelled()) || Boolean(v.cancelledAt);
    const isCommercial = typeof v.isCommercial === "function" ? v.isCommercial() : (v.rewardType === "PARTIAL_DISCOUNT" || (v.cashToPayUsd && v.cashToPayUsd > 0));
    const isPaid = typeof v.isPaidVoucher === "function" ? v.isPaidVoucher() : Boolean(v.isPaid || v.status === "PAID" || v.paidAt);
    const isExpired = v.status === "EXPIRED" || (typeof v.isExpired === "function" ? v.isExpired() : (isCommercial && !isPaid && !isDelivered && !isCancelled && v.expiresAt && new Date() > new Date(v.expiresAt)));
    const cost = v.pointsSpent || v.pointsCost || 0;
    const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "-";

    let badgeHtml = "";
    if (isDelivered) {
      badgeHtml = `<div class="voucher-badge delivered" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">✓ ENTREGADO</div>`;
    } else if (isCancelled) {
      badgeHtml = `<div class="voucher-badge cancelled" style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">❌ CANCELADO</div>`;
    } else if (isExpired) {
      badgeHtml = `<div class="voucher-badge expired" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">⚠️ CADUCADO (3D)</div>`;
    } else if (isPaid) {
      badgeHtml = `<div class="voucher-badge paid" style="background:#f0fdf4; color:#15803d; border:1px solid #86efac; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">💵 PAGO CONFIRMADO</div>`;
    } else if (isCommercial) {
      badgeHtml = `<div class="voucher-badge pending-pay" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">⏱️ PENDIENTE DE PAGO</div>`;
    } else {
      badgeHtml = `<div class="voucher-badge pending" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">🎁 LISTO PARA RETIRAR</div>`;
    }

    let expInfo = "";
    if (isExpired) {
      expInfo = cost > 0
        ? `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#dc2626; font-weight:800; margin-top:3px;">⚠️ Plazo de 3 días vencido · -10 WP penalización por irresponsabilidad</div>`
        : `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#dc2626; font-weight:800; margin-top:3px;">⚠️ Plazo de 3 días para pagar vencido · Stock devuelto a tienda</div>`;
    } else if (!isDelivered && !isCancelled) {
      if (!isCommercial) {
        // Recompensa 100% gratis: Cero límite de tiempo
        expInfo = `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#059669; font-weight:700; margin-top:3px;">🎁 Canje 100% Puntos · Sin límite de tiempo para retiro</div>`;
      } else if (isPaid) {
        // Compra comercial ya pagada en efectivo: Cero límite de tiempo
        expInfo = `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#15803d; font-weight:700; margin-top:3px;">✅ Pago confirmado (${formatPrice(v.cashToPayUsd)}) · Sin límite para retirar</div>`;
      } else if (v.expiresAt) {
        const msLeft = new Date(v.expiresAt) - new Date();
        if (msLeft <= 0) {
          expInfo = cost > 0
            ? `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#dc2626; font-weight:800; margin-top:3px;">⚠️ Plazo de 3 días vencido · -10 WP penalización por irresponsabilidad</div>`
            : `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#dc2626; font-weight:800; margin-top:3px;">⚠️ Plazo de 3 días para pagar vencido · Stock devuelto a tienda</div>`;
        } else {
          const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
          const daysLeft = Math.floor(hoursLeft / 24);
          const remHours = hoursLeft % 24;
          const timeStr = daysLeft > 0 ? `${daysLeft}d ${remHours}h` : `${hoursLeft}h`;
          expInfo = `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#b45309; font-weight:700; margin-top:3px;">⏱️ Plazo para pagar: ${timeStr} restantes (Máx 3 días)</div>`;
        }
      } else {
        expInfo = `<div style="font-family:var(--font-mono); font-size:0.68rem; color:#059669; font-weight:700; margin-top:3px;">⏱️ Sin caducidad</div>`;
      }
    }

    const canCancel = !isDelivered && !isCancelled && !isExpired && (!isCommercial || !isPaid);

    return `
          <div class="voucher-card" onclick="showVoucherModal('${v.voucherCode}')" style="cursor: pointer; transition: transform 0.15s ease; ${isCancelled || isExpired ? 'opacity: 0.8; background: #fffaf0;' : ''}" title="Clic para ver código QR">
            <div class="voucher-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <div class="voucher-title" style="font-weight:900; font-size:1.05rem; color:var(--dark);">${v.rewardTitle || "Artículo"}</div>
              ${badgeHtml}
            </div>
            <div class="voucher-code" style="font-family:var(--font-mono); font-size:1.35rem; font-weight:900; letter-spacing:2px; color:var(--dark); margin:0.35rem 0;">${v.voucherCode}</div>
            ${(v.cashToPayUsd && v.cashToPayUsd > 0) ? `
              <div style="background:${isPaid ? '#ecfdf5' : '#fffbeb'}; border:1px solid ${isPaid ? '#a7f3d0' : '#fcd34d'}; border-radius:3px; padding:3px 6px; font-family:var(--font-mono); font-size:0.72rem; color:${isPaid ? '#065f46' : '#92400e'}; margin: 4px 0;">
                ${isPaid
          ? `✅ <strong>Abonado: ${formatPrice(v.cashToPayUsd)}</strong> (Pago confirmado)`
          : ((v.discountUsd && v.discountUsd > 0)
            ? `🏷️ Descuento: -${formatPrice(v.discountUsd)} · <strong style="color:#dc2626;">Abonar: ${formatPrice(v.cashToPayUsd)}</strong>`
            : `🛒 Compra en tienda · <strong style="color:#dc2626;">Abonar: ${formatPrice(v.cashToPayUsd)}</strong>`)
        }
              </div>
            ` : ''}
            ${expInfo}
            <div class="voucher-meta" style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:0.75rem; color:var(--gray-600); border-top:1px dashed var(--gray-300); padding-top:0.6rem; margin-top:0.6rem;">
              <div>Puntos: <strong style="color:var(--dark);">${cost > 0 ? cost.toLocaleString() + ' WP' : '0 WP (Sin desc.)'}</strong></div>
              <div>${dateStr}</div>
              <div style="display: flex; gap: 4px; align-items: center;">
                ${canCancel ? `
                  <button class="btn-secondary" style="padding:2px 7px; font-size:0.7rem; color:#b91c1c; border-color:#fca5a5; background:#fff1f2;" onclick="event.stopPropagation(); promptCancelVoucher('${v.voucherCode}')" title="Cancelar este vale y devolver puntos">❌ Cancelar</button>
                ` : ''}
                <button class="btn-secondary" style="padding:2px 7px; font-size:0.7rem;" onclick="event.stopPropagation(); showVoucherModal('${v.voucherCode}')">👁️ Ver QR</button>
              </div>
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

function renderLedger(ledger) {
  const container = document.getElementById("ledger-container");
  if (!container) return;

  if (ledger.length === 0) {
    container.innerHTML = `
      <div class="cyber-empty-box">
        <div class="empty-icon-wrap" style="color: #0284c7; background: #e0f2fe; border-color: #bae6fd;">
          <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="1.8" fill="none">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        </div>
        <div class="empty-tag">LEDGER // AUDITORÍA</div>
        <h3 class="empty-title">Sin Movimientos Aún</h3>
        <p class="empty-desc">
          Aquí podrás consultar el historial contable de puntos acreditados por facturas y canjes realizados.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="ledger-list">
      ${ledger.map(entry => {
    const isCredit = entry.delta > 0;
    return `
          <div class="ledger-item">
            <div class="ledger-info">
              <h4>${entry.note || 'Movimiento de Wired Points'}</h4>
              <div class="ledger-date">${new Date(entry.created_at).toLocaleString()}</div>
            </div>
            <div class="ledger-delta ${isCredit ? 'positive' : 'negative'}">
              ${isCredit ? '+' : ''}${entry.delta} WP
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

function renderUserQr(text) {
  const el = document.getElementById("member-qr-canvas");
  if (!el || typeof QRCode === "undefined") return;
  el.innerHTML = "";
  try {
    new QRCode(el, {
      text: text,
      width: 76,
      height: 76,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) { }
}

// CONTROL DE MODALES Y ACCIONES DE VISTA
let selectedRewardId = null;
let selectedPointsToApply = 0;
let currentRedeemReward = null;

function openAuthModal(tab = "login", feedback = null) {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "flex";
  switchAuthTab(tab);
  if (feedback) {
    setAuthFeedback(feedback, "info");
  } else {
    setAuthFeedback(null);
  }
}

function closeAuthModal() {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "none";
  setAuthFeedback(null);
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById("tab-btn-auth-login");
  const btnReg = document.getElementById("tab-btn-auth-reg");
  const formLogin = document.getElementById("form-client-login");
  const formReg = document.getElementById("form-client-reg");

  setAuthFeedback(null);

  if (tab === "login") {
    if (btnLogin) btnLogin.classList.add("active");
    if (btnReg) btnReg.classList.remove("active");
    if (formLogin) formLogin.style.display = "block";
    if (formReg) formReg.style.display = "none";
  } else {
    if (btnReg) btnReg.classList.add("active");
    if (btnLogin) btnLogin.classList.remove("active");
    if (formReg) formReg.style.display = "block";
    if (formLogin) formLogin.style.display = "none";
  }
}

function toggleClientPinVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

async function submitClientLogin() {
  const phoneInput = document.getElementById("login-phone");
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const pin = document.getElementById("login-pin").value.trim();

  const cleanPhone = FirestoreService.normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 8) {
    setAuthFeedback("Ingresa tu número de 8 dígitos (ej: 5843-8412)", "error");
    return;
  }
  if (!pin || pin.length < 4 || pin.length > 8) {
    setAuthFeedback("Ingresa tu PIN de seguridad (entre 4 y 8 dígitos)", "error");
    return;
  }

  try {
    const user = await vm.login(cleanPhone, pin);
    closeAuthModal();
    if (vm.pendingClaimToken) {
      try {
        const claimRes = await vm.claimPendingToken();
        showToast(`¡Bienvenido ${user.displayName}! Se acreditaron +${claimRes.pointsAdded} WP de tu factura.`, "success");
      } catch (claimErr) {
        showToast("Sesión iniciada. " + (claimErr.message || ""), "info");
      }
    } else {
      showToast("¡Bienvenido de nuevo, " + user.displayName + "!", "success");
    }
  } catch (err) {
    setAuthFeedback(err.message || "Error al iniciar sesión", "error");
    showToast(err.message, "error");
  }
}

async function submitClientRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const phoneInput = document.getElementById("reg-phone");
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const pin = document.getElementById("reg-pin").value.trim();

  if (!name) {
    setAuthFeedback("Ingresa tu nombre y apellido", "error");
    return;
  }
  const cleanPhone = FirestoreService.normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 8) {
    setAuthFeedback("Ingresa un número telefónico de 8 dígitos (ej: 5843-8412)", "error");
    return;
  }
  if (!pin || pin.length < 4 || pin.length > 8) {
    setAuthFeedback("Crea un PIN de 4 a 8 dígitos", "error");
    return;
  }

  try {
    const user = await vm.register(name, cleanPhone, pin);
    closeAuthModal();
    if (vm.pendingClaimToken) {
      try {
        const claimRes = await vm.claimPendingToken();
        showToast(`¡Cuenta creada con éxito! Se acreditaron +${claimRes.pointsAdded} WP a tu CyberPass.`, "success");
      } catch (claimErr) {
        showToast("¡Cuenta creada! CyberPass activado.", "success");
      }
    } else {
      showToast("¡Cuenta creada con éxito! CyberPass activado", "success");
    }
  } catch (err) {
    setAuthFeedback(err.message || "Error al crear cuenta", "error");
    showToast(err.message, "error");
  }
}

function logoutClient() {
  vm.logout();
  showToast("Sesión cerrada correctamente", "info");
}

function switchTab(tabId) {
  ["catalog", "vouchers", "ledger"].forEach(t => {
    const btn = document.getElementById("tab-btn-" + t);
    const content = document.getElementById("tab-content-" + t);
    if (btn) btn.classList.toggle("active", t === tabId);
    if (content) content.style.display = (t === tabId) ? "block" : "none";
  });
  if (tabId === "vouchers" && vm && vm.currentUser) {
    vm.refreshUserData();
  }
}

function openClaimModal() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión con tu WhatsApp para acreditar tus Wired Points.");
    return;
  }
  const modal = document.getElementById("modal-manual-claim");
  if (modal) modal.style.display = "flex";
}

function closeClaimModal() {
  const modal = document.getElementById("modal-manual-claim");
  if (modal) modal.style.display = "none";
}

async function submitManualClaim() {
  const token = document.getElementById("manual-input-token").value;
  const pin = document.getElementById("manual-input-pin").value;

  if (!token) {
    showToast("Ingresa el código de la factura", "error");
    return;
  }

  try {
    const res = await vm.claimToken(token.trim().toUpperCase(), pin);
    closeClaimModal();
    showToast("¡Éxito! +" + res.pointsAdded + " WP acreditados. Saldo: " + res.newBalance + " WP", "success");
  } catch (err) {
    showToast(err.message || "Error al acreditar factura", "error");
  }
}

// ESCÁNER DE CÁMARA PARA CLIENTES (HTML5-QRCODE)
let clientQrCodeScanner = null;

export async function openClientCameraScanner() {
  const modal = document.getElementById("modal-client-camera-scanner");
  if (modal) modal.style.display = "flex";

  if (typeof Html5Qrcode !== "undefined") {
    try {
      if (clientQrCodeScanner) {
        await clientQrCodeScanner.stop().catch(() => {});
        clientQrCodeScanner = null;
      }
      clientQrCodeScanner = new Html5Qrcode("client-camera-reader");
      await clientQrCodeScanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleClientQrScanned(decodedText);
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

export function stopClientCameraScanner() {
  if (clientQrCodeScanner) {
    clientQrCodeScanner.stop().catch(() => {}).finally(() => {
      clientQrCodeScanner = null;
    });
  }
  const modal = document.getElementById("modal-client-camera-scanner");
  if (modal) modal.style.display = "none";
}

async function handleClientQrScanned(decodedText) {
  stopClientCameraScanner();
  let raw = (decodedText || "").trim();
  let tokenCode = "";
  if (raw.includes("claim=")) {
    tokenCode = raw.split("claim=")[1].split("&")[0];
  } else if (raw.startsWith("WP-")) {
    tokenCode = raw;
  } else {
    const match = raw.match(/WP-[A-Z0-9-]+/i);
    if (match) tokenCode = match[0];
  }

  if (!tokenCode) {
    showToast("El código escaneado no corresponde a una factura MeltyDeays.", "error");
    return;
  }

  tokenCode = tokenCode.toUpperCase();
  vm.pendingClaimToken = tokenCode;

  if (!vm.currentUser) {
    showToast(`⚡ Factura detectada [${tokenCode}]. Inicia sesión o regístrate para acreditar tus puntos.`, "info");
    openAuthModal("login", "Inicia sesión con tu WhatsApp para acreditar los puntos de tu factura escaneada.");
    render(vm);
    return;
  }

  // Usuario autenticado: acreditar de inmediato sin pedir PIN
  try {
    showToast("Acreditando puntos de tu factura...", "info");
    const res = await vm.claimToken(tokenCode, null, true);
    showToast(`¡Puntos acreditados con éxito! +${res.pointsAdded} WP. Saldo: ${res.newBalance} WP`, "success");
    dismissClaimBanner();
    render(vm);
  } catch (err) {
    showToast(err.message || "No se pudo acreditar la factura", "error");
    dismissClaimBanner();
    render(vm);
  }
}

export function dismissClaimBanner() {
  if (vm && vm.pendingClaimToken) {
    try {
      const processed = JSON.parse(sessionStorage.getItem("melty_processed_tokens") || "[]");
      if (!processed.includes(vm.pendingClaimToken)) {
        processed.push(vm.pendingClaimToken);
        sessionStorage.setItem("melty_processed_tokens", JSON.stringify(processed));
      }
    } catch (e) {}
    vm.pendingClaimToken = null;
  }
  const claimBanner = document.getElementById("claim-banner");
  if (claimBanner) claimBanner.style.display = "none";
  try {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (e) {}
}

async function claimFromBanner() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión o regístrate con tu WhatsApp para reclamar tus puntos de factura.");
    return;
  }

  try {
    const res = await vm.claimPendingToken();
    showToast("¡Puntos acreditados con éxito! +" + res.pointsAdded + " WP (Saldo: " + res.newBalance + " WP)", "success");
    dismissClaimBanner();
    render(vm);
  } catch (err) {
    showToast(err.message || "No se pudo acreditar el código", "error");
    dismissClaimBanner();
    render(vm);
  }
}

function confirmRedeem(rewardId) {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión para canjear recompensas con tus Wired Points.");
    return;
  }

  const reward = vm.catalog.find(r => r.id === rewardId);
  if (!reward) return;

  const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount()) || (reward.cashToPayUsd && reward.cashToPayUsd > 0);

  // Si es canje 100% gratuito en puntos, sí bloquea si no tiene saldo suficiente
  if (!isPartial && vm.currentUser.wiredPoints < reward.pointsCost) {
    showToast(`Puntos insuficientes. Requieres ${reward.pointsCost.toLocaleString()} WP (tienes ${vm.currentUser.wiredPoints.toLocaleString()} WP).`, "error");
    return;
  }

  selectedRewardId = rewardId;
  currentRedeemReward = reward;

  // Llenar datos de la recompensa
  const titleEl = document.getElementById("confirm-reward-title");
  const ptsEl = document.getElementById("confirm-reward-points");
  const imgEl = document.getElementById("confirm-reward-img");
  const fallbackEl = document.getElementById("confirm-reward-fallback");

  if (titleEl) titleEl.textContent = reward.title;
  if (ptsEl) {
    ptsEl.textContent = isPartial ? `Tope: ${reward.pointsCost.toLocaleString()} WP` : `${reward.pointsCost.toLocaleString()} WP`;
    ptsEl.style.background = isPartial ? "#fef3c7" : "#e0e7ff";
    ptsEl.style.color = isPartial ? "#92400e" : "#4338ca";
    ptsEl.style.borderColor = isPartial ? "#fcd34d" : "#c7d2fe";
  }

  if (reward.imageUrl && imgEl) {
    imgEl.src = reward.imageUrl;
    imgEl.style.display = "block";
    if (fallbackEl) fallbackEl.style.display = "none";
  } else {
    if (imgEl) imgEl.style.display = "none";
    if (fallbackEl) {
      fallbackEl.textContent = isPartial ? "🏷️" : "🎁";
      fallbackEl.style.display = "block";
    }
  }

  // Previsualización y configuración de puntos a aplicar
  const userPts = vm.currentUser.wiredPoints || 0;
  const maxCapPts = reward.pointsCost || 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);

  // Por defecto se aplica el máximo posible hasta el tope
  selectedPointsToApply = isPartial ? maxUsablePts : maxCapPts;

  const typeCallout = document.getElementById("confirm-type-callout");
  const typePct = document.getElementById("confirm-type-pct");
  const typePrice = document.getElementById("confirm-type-price");
  const typeMaxDisc = document.getElementById("confirm-type-max-disc");
  const slider = document.getElementById("confirm-points-slider");
  const numInput = document.getElementById("confirm-points-num");
  const maxBadge = document.getElementById("confirm-points-max-badge");
  const zeroNote = document.getElementById("confirm-zero-pts-note");
  const controlsWrap = document.getElementById("confirm-points-controls-wrap");

  if (typeCallout) {
    if (isPartial) {
      typeCallout.style.display = "block";
      const maxPct = reward.maxDiscountPct || 5;
      if (typePrice) typePrice.textContent = formatDualPrice(reward.priceUsd);
      if (typeMaxDisc) typeMaxDisc.textContent = `-${formatPrice(reward.maxDiscountUsd)} (${maxCapPts.toLocaleString()} WP = ${maxPct}% OFF)`;

      if (controlsWrap) {
        controlsWrap.style.display = (userPts > 0) ? "block" : "none";
      }
      if (zeroNote) {
        zeroNote.style.display = (userPts <= 0) ? "block" : "none";
      }

      if (slider) {
        slider.min = "0";
        slider.max = String(maxUsablePts);
        slider.value = String(selectedPointsToApply);
        slider.disabled = (maxUsablePts === 0);
      }
      if (numInput) {
        numInput.min = "0";
        numInput.max = String(maxUsablePts);
        numInput.value = String(selectedPointsToApply);
        numInput.disabled = (maxUsablePts === 0);
      }
      if (maxBadge) {
        maxBadge.textContent = `${maxUsablePts.toLocaleString()} WP`;
      }
    } else {
      typeCallout.style.display = "none";
    }
  }

  // Recalcular balance y textos según selectedPointsToApply
  updateConfirmCalculation();

  const warrantyEl = document.getElementById("confirm-warranty-notice");
  if (warrantyEl) {
    if (isPartial) {
      warrantyEl.innerHTML = `🛡️ <strong>GARANTÍA COMERCIAL (30 DÍAS):</strong> Este producto de venta cuenta con garantía técnica de fábrica respaldada por el abono de dinero a pagar en tienda.`;
      warrantyEl.style.borderColor = "#fcd34d";
      warrantyEl.style.background = "#fffbeb";
      warrantyEl.style.color = "#78350f";
    } else {
      warrantyEl.innerHTML = `🛡️ <strong>CONDICIÓN DE GARANTÍA:</strong> Los artículos gratuitos por fidelidad ($0 en efectivo) se entregan probados a satisfacción en mostrador y están <strong>estrictamente exentos de garantía técnica posterior</strong>.`;
      warrantyEl.style.borderColor = "#e2e8f0";
      warrantyEl.style.background = "#f8fafc";
      warrantyEl.style.color = "#475569";
    }
  }

  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "flex";
}

function updateConfirmCalculation() {
  if (!currentRedeemReward) return;
  const reward = currentRedeemReward;
  const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount()) || (reward.cashToPayUsd && reward.cashToPayUsd > 0);
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;

  let deductPts = 0;
  let discountUsd = 0;
  let cashToPayUsd = reward.priceUsd || 0;

  if (isPartial) {
    const maxCapPts = reward.pointsCost || 0;
    const maxPct = reward.maxDiscountPct || 5;
    const maxUsablePts = Math.min(userPts, maxCapPts);
    deductPts = Math.max(0, Math.min(selectedPointsToApply, maxUsablePts));

    const usdPerPoint = (maxCapPts > 0 && reward.maxDiscountUsd > 0)
      ? (reward.maxDiscountUsd / maxCapPts)
      : 0;

    discountUsd = Number(Math.min(reward.maxDiscountUsd || 0, deductPts * usdPerPoint).toFixed(2));
    cashToPayUsd = Math.max(0, Number(((reward.priceUsd || 0) - discountUsd).toFixed(2)));

    const currentPct = maxCapPts > 0 ? Number(((deductPts / maxCapPts) * maxPct).toFixed(2)) : 0;
    const formattedPct = currentPct % 1 === 0 ? currentPct.toFixed(0) : currentPct.toFixed(1);

    const typePct = document.getElementById("confirm-type-pct");
    const typePctCalc = document.getElementById("confirm-type-pct-calc");
    const calcPctLabel = document.getElementById("confirm-calc-pct-label");
    const typeDisc = document.getElementById("confirm-type-discount");
    const typeCash = document.getElementById("confirm-type-cash");
    const ptsAppliedNotice = document.getElementById("confirm-pts-applied-notice");

    if (typePct) typePct.textContent = `${formattedPct}% OFF / MÁX ${maxPct}%`;
    if (typePctCalc) typePctCalc.textContent = `${formattedPct}% de descuento / Máximo ${maxPct}%`;
    if (calcPctLabel) calcPctLabel.textContent = `${formattedPct}%`;
    if (typeDisc) typeDisc.textContent = `-${formatPrice(discountUsd)}`;
    if (typeCash) typeCash.textContent = formatDualPrice(cashToPayUsd);
    if (ptsAppliedNotice) ptsAppliedNotice.textContent = `${deductPts.toLocaleString()} WP aplicados`;

    const doRedeemBtn = document.getElementById("btn-do-redeem");
    if (doRedeemBtn) {
      if (deductPts > 0) {
        doRedeemBtn.textContent = `🏷️ CANJEAR VALE DE DESCUENTO (${formattedPct}% = -${formatPrice(discountUsd)})`;
      } else {
        doRedeemBtn.textContent = `🛒 GENERAR VALE DE COMPRA (${formatPrice(cashToPayUsd)})`;
      }
    }
  } else {
    deductPts = reward.pointsCost || 0;
    discountUsd = reward.priceUsd || 0;
    cashToPayUsd = 0;
    const doRedeemBtn = document.getElementById("btn-do-redeem");
    if (doRedeemBtn) doRedeemBtn.textContent = `⚡ AUTORIZAR CANJE WIRED`;
  }

  const afterPts = Math.max(0, userPts - deductPts);

  const curEl = document.getElementById("confirm-balance-current");
  const dedEl = document.getElementById("confirm-balance-deduct");
  const aftEl = document.getElementById("confirm-balance-after");

  if (curEl) curEl.textContent = `${userPts.toLocaleString()} WP`;
  if (dedEl) dedEl.textContent = `-${deductPts.toLocaleString()} WP`;
  if (aftEl) aftEl.textContent = `${afterPts.toLocaleString()} WP`;
}

function onPointsSliderChange(val) {
  const pts = parseInt(val, 10) || 0;
  selectedPointsToApply = pts;
  const numInput = document.getElementById("confirm-points-num");
  if (numInput) numInput.value = pts;
  updateConfirmCalculation();
}

function onPointsNumChange(val) {
  let pts = parseInt(val, 10);
  if (isNaN(pts)) pts = 0;
  const maxCapPts = currentRedeemReward ? (currentRedeemReward.pointsCost || 0) : 0;
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);
  pts = Math.max(0, Math.min(pts, maxUsablePts));
  selectedPointsToApply = pts;
  const slider = document.getElementById("confirm-points-slider");
  if (slider) slider.value = pts;
  updateConfirmCalculation();
}

function setPointsPreset(mode) {
  if (!currentRedeemReward) return;
  const maxCapPts = currentRedeemReward.pointsCost || 0;
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);

  if (mode === 'max') {
    selectedPointsToApply = maxUsablePts;
  } else if (mode === 'zero') {
    selectedPointsToApply = 0;
  }
  const slider = document.getElementById("confirm-points-slider");
  const numInput = document.getElementById("confirm-points-num");
  if (slider) slider.value = selectedPointsToApply;
  if (numInput) numInput.value = selectedPointsToApply;
  updateConfirmCalculation();
}

function closeRedeemModal() {
  selectedRewardId = null;
  currentRedeemReward = null;
  selectedPointsToApply = 0;
  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "none";
}

async function executeRedeem() {
  if (!selectedRewardId) return;

  const btn = document.getElementById("btn-do-redeem");
  const origBtnText = btn ? btn.innerHTML : "⚡ AUTORIZAR CANJE WIRED";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="cyber-spinner"></span> SINTETIZANDO VALE...`;
  }

  try {
    // 1. Sonido retro sintético Web Audio API (agradable arpegio sci-fi)
    playCyberArpeggio();

    // 2. Ejecutar canje atómico
    const res = await vm.redeemReward(selectedRewardId, selectedPointsToApply);
    const voucher = res.voucher || res;
    const cost = res.cost !== undefined ? res.cost : (voucher ? voucher.pointsSpent : 0);

    // 3. Animación de decremento numérico y badge flotante en CyberPass si gastó puntos
    if (cost > 0) {
      animatePointsDeduction(cost);
    }

    // 4. Animación de celebración en pantalla
    triggerCyberGlitchCelebration();

    // 5. Cerrar modal de confirmación con delay visual
    closeRedeemModal();

    // 6. Toast temático
    if (voucher.discountUsd > 0) {
      showToast(`🏷️ ¡Vale con descuento emitido! Ahorro: -${formatPrice(voucher.discountUsd)}`, "success");
    } else if (voucher.cashToPayUsd > 0) {
      showToast(`🛒 ¡Vale de compra emitido! Paga en tienda: ${formatDualPrice(voucher.cashToPayUsd)}`, "success");
    } else {
      showToast(`⚡ ¡Canje Autorizado! Vale emitido: ${voucher.voucherCode}`, "success");
    }

    // 7. Abrir modal del vale con animación
    setTimeout(() => {
      showVoucherModal(voucher.voucherCode);
    }, 450);

  } catch (err) {
    showToast(err.message || "Error en el canje", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnText;
    }
  }
}

let currentOpenVoucherCode = null;

function showVoucherModal(voucherCode) {
  const voucher = vm.vouchers.find(v => v.voucherCode === voucherCode);
  if (!voucher) return;

  currentOpenVoucherCode = voucher.voucherCode;

  const isDelivered = voucher.status === "DELIVERED" ||
    voucher.status === "REDEEMED" ||
    (typeof voucher.isDelivered === "function" && voucher.isDelivered()) ||
    Boolean(voucher.deliveredAt);
  const isCancelled = voucher.status === "CANCELLED" ||
    (typeof voucher.isCancelled === "function" && voucher.isCancelled()) ||
    Boolean(voucher.cancelledAt);
  const isExpired = typeof voucher.isExpired === "function"
    ? voucher.isExpired()
    : (voucher.expiresAt && !isDelivered && !isCancelled && new Date() > new Date(voucher.expiresAt));

  const modalTitle = document.getElementById("modal-voucher-title");
  const modalCode = document.getElementById("modal-voucher-code");
  const qrCanvas = document.getElementById("voucher-qr-canvas");
  const waBtn = document.getElementById("btn-whatsapp-voucher");
  const cancelBtn = document.getElementById("btn-cancel-voucher");
  const instructionsBox = document.getElementById("modal-voucher-instructions");
  const deliveredBanner = document.getElementById("modal-voucher-delivered-banner");
  const deliveredDetail = document.getElementById("modal-voucher-delivered-detail");
  const deliveredStamp = document.getElementById("voucher-delivered-stamp");
  const statusBadge = document.getElementById("modal-voucher-status-badge");
  const subtitleEl = document.getElementById("modal-voucher-subtitle");
  const closeBtn = document.getElementById("btn-close-voucher");
  const expPill = document.getElementById("modal-voucher-exp-pill");
  const expText = document.getElementById("modal-voucher-exp-text");

  if (modalTitle) modalTitle.textContent = voucher.rewardTitle || "Recompensa";
  if (modalCode) modalCode.textContent = voucher.voucherCode;

  if (isDelivered) {
    if (waBtn) waBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (expPill) expPill.style.display = "none";
    if (instructionsBox) instructionsBox.style.display = "none";
    if (deliveredBanner) {
      deliveredBanner.style.display = "block";
      deliveredBanner.style.background = "#ecfdf5";
      deliveredBanner.style.borderColor = "#059669";
      deliveredBanner.style.color = "#065f46";
      deliveredBanner.innerHTML = `
        <div style="font-weight: 900; display: flex; align-items: center; gap: 6px; font-family: var(--font-mono);">
          <span>✓</span> RECOMPENSA ENTREGADA EN MOSTRADOR
        </div>
        <div id="modal-voucher-delivered-detail" style="font-size: 0.75rem; color: #047857; margin-top: 3px;"></div>
      `;
    }
    if (deliveredStamp) deliveredStamp.style.display = "block";
    const cashPillD = document.getElementById("modal-voucher-cash-pill");
    if (cashPillD) cashPillD.style.display = "none";
    if (statusBadge) {
      statusBadge.textContent = "✓ ENTREGADO EN TIENDA";
      statusBadge.style.background = "#ecfdf5";
      statusBadge.style.color = "#065f46";
      statusBadge.style.borderColor = "#a7f3d0";
    }
    if (subtitleEl) subtitleEl.textContent = "Comprobante digital de producto físico entregado al socio.";
    const deliveredDetailEl = document.getElementById("modal-voucher-delivered-detail");
    if (deliveredDetailEl) {
      const dateStr = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Despachado en mostrador";
      deliveredDetailEl.innerHTML = `Retirado exitosamente en mostrador MeltyDeays.<br><span style="font-family: var(--font-mono); font-size: 0.72rem; color: #059669;">Entrega confirmada: ${dateStr}</span>`;
    }
    if (closeBtn) closeBtn.textContent = "✓ Cerrar Comprobante";
  } else if (isCancelled) {
    if (waBtn) waBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (expPill) expPill.style.display = "none";
    if (instructionsBox) instructionsBox.style.display = "none";
    if (deliveredStamp) deliveredStamp.style.display = "none";
    const cashPillC = document.getElementById("modal-voucher-cash-pill");
    if (cashPillC) cashPillC.style.display = "none";
    if (deliveredBanner) {
      deliveredBanner.style.display = "block";
      deliveredBanner.style.background = "#fee2e2";
      deliveredBanner.style.borderColor = "#ef4444";
      deliveredBanner.style.color = "#991b1b";
      const cancelDate = voucher.cancelledAt ? new Date(voucher.cancelledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Previamente";
      deliveredBanner.innerHTML = `
        <div style="font-weight: 900; display: flex; align-items: center; gap: 6px; font-family: var(--font-mono);">
          <span>❌</span> VALE CANCELADO POR EL USUARIO
        </div>
        <div style="font-size: 0.75rem; color: #b91c1c; margin-top: 3px;">
          Esta reserva fue cancelada el ${cancelDate} y los puntos gastados fueron devueltos a tu cuenta.
        </div>
      `;
    }
    if (statusBadge) {
      statusBadge.textContent = "❌ CANCELADO";
      statusBadge.style.background = "#fee2e2";
      statusBadge.style.color = "#991b1b";
      statusBadge.style.borderColor = "#fca5a5";
    }
    if (subtitleEl) subtitleEl.textContent = "Vale sin validez comercial (cancelado y reembolsado).";
    if (closeBtn) closeBtn.textContent = "✓ Cerrar Vale";
  } else {
    const isCommercial = typeof voucher.isCommercial === "function"
      ? voucher.isCommercial()
      : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
    const isPaid = typeof voucher.isPaidVoucher === "function"
      ? voucher.isPaidVoucher()
      : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);
    const isExpired = typeof voucher.isExpired === "function"
      ? voucher.isExpired()
      : (isCommercial && !isPaid && voucher.expiresAt && new Date() > new Date(voucher.expiresAt));

    const cashPill = document.getElementById("modal-voucher-cash-pill");
    const cashVal = document.getElementById("modal-voucher-cash-val");
    const cashLabel = document.getElementById("modal-voucher-cash-label");

    if (cashPill) {
      if (isCommercial) {
        cashPill.style.display = "block";
        if (isPaid) {
          cashPill.style.background = "#ecfdf5";
          cashPill.style.borderColor = "#10b981";
          cashPill.style.color = "#065f46";
          if (cashLabel) cashLabel.innerHTML = "✅ <strong>PAGO CONFIRMADO:</strong>";
          if (cashVal) {
            cashVal.style.color = "#059669";
            cashVal.textContent = formatPrice(voucher.cashToPayUsd);
          }
        } else {
          cashPill.style.background = "#fffbeb";
          cashPill.style.borderColor = "#d97706";
          cashPill.style.color = "#78350f";
          if (cashLabel) cashLabel.innerHTML = "💵 <strong>A PAGAR AL VENDEDOR:</strong>";
          if (cashVal) {
            cashVal.style.color = "#dc2626";
            cashVal.textContent = formatPrice(voucher.cashToPayUsd);
          }
        }
      } else {
        // Recompensa 100% gratuita
        cashPill.style.display = "none";
      }
    }

    // Píldora de vigencia / tiempo (SIN LÍMITE para gratis ni pagados; 3 días para compras impagas)
    if (expPill && expText) {
      if (!isCommercial) {
        // Recompensa 100% Gratis: NUNCA expira, CERO avisos de pago
        expPill.style.display = "block";
        expPill.style.background = "#ecfdf5";
        expPill.style.borderColor = "#a7f3d0";
        expPill.style.color = "#065f46";
        expText.innerHTML = "🎁 <strong>Canje 100% Puntos · Sin límite de tiempo para retiro</strong>";
      } else if (isPaid) {
        // Compra comercial pagada: Ya no tiene límite de tiempo
        expPill.style.display = "block";
        expPill.style.background = "#eff6ff";
        expPill.style.borderColor = "#bfdbfe";
        expPill.style.color = "#1e40af";
        expText.innerHTML = "✅ <strong>Pago Concretado · Sin límite de retiro (Coordina tu entrega)</strong>";
      } else if (voucher.expiresAt) {
        const msLeft = new Date(voucher.expiresAt) - new Date();
        if (msLeft <= 0 || isExpired) {
          expPill.style.display = "block";
          expPill.style.background = "#fef2f2";
          expPill.style.borderColor = "#fecaca";
          expPill.style.color = "#b91c1c";
          const hasPoints = Number(voucher.pointsSpent || 0) > 0;
          expText.innerHTML = hasPoints
            ? "⚠️ <strong>Plazo de 3 días para pagar vencido</strong> (Reserva caducada · -10 WP penalización por irresponsabilidad aplicada)"
            : "⚠️ <strong>Plazo de 3 días para pagar vencido</strong> (Reserva caducada · Artículo devuelto al stock)";
        } else {
          const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
          const daysLeft = Math.floor(hoursLeft / 24);
          const remHours = hoursLeft % 24;
          const timeStr = daysLeft > 0 ? `${daysLeft}d ${remHours}h` : `${hoursLeft}h`;
          expPill.style.display = "block";
          expPill.style.background = "#fff1f2";
          expPill.style.borderColor = "#fecdd3";
          expPill.style.color = "#9f1239";
          expText.innerHTML = `⏱️ <strong>Plazo para pagar:</strong> ${timeStr} restantes (Máx 3 días para abonar a MeltyDeays)`;
        }
      } else {
        expPill.style.display = "none";
      }
    }

    if (instructionsBox) {
      instructionsBox.style.display = "block";
      if (!isCommercial) {
        instructionsBox.innerHTML = `📌 <strong>Instrucciones:</strong> Muestra este código QR o envíalo por WhatsApp a MeltyDeays para coordinar la entrega personal de tu producto 100% gratis.<div style="margin-top:4px; font-size:0.68rem; color:#64748b; font-family:var(--font-mono);">🛡️ Premio de fidelidad: Se entrega probado personalmente. Exento de garantía comercial posterior de 30 días.</div>`;
      } else if (isPaid) {
        instructionsBox.innerHTML = `📌 <strong>Pago Registrado con Éxito:</strong> Ya cancelaste <strong>${formatPrice(voucher.cashToPayUsd)}</strong>. Envía el comprobante por WhatsApp a MeltyDeays para pactar la entrega personal en el momento que te sea más conveniente.<div style="margin-top:4px; font-size:0.68rem; color:#047857; font-family:var(--font-mono);">🛡️ Garantía técnica oficial de 30 días amparada por tu compra comercial.</div>`;
      } else {
        instructionsBox.innerHTML = (voucher.discountUsd > 0)
          ? `📌 <strong>Vale de Descuento Pendiente de Pago:</strong> Tienes 3 días para coordinar el abono de <strong>${formatPrice(voucher.cashToPayUsd)}</strong> (descuento aplicado: -${formatPrice(voucher.discountUsd)} con tus puntos).<div style="margin-top:4px; font-size:0.68rem; color:#78350f; font-family:var(--font-mono);">🛡️ Garantía técnica comercial de 30 días tras concretar el pago. Si no se abona en 3 días, la reserva caduca con penalización de 10 WP.</div>`
          : `📌 <strong>Reserva de Compra Pendiente de Pago:</strong> Tienes 3 días para coordinar el abono de <strong>${formatPrice(voucher.cashToPayUsd)}</strong> con MeltyDeays.<div style="margin-top:4px; font-size:0.68rem; color:#78350f; font-family:var(--font-mono);">🛡️ Garantía técnica comercial de 30 días tras concretar el pago. Si no se abona en 3 días, la reserva caduca y el stock regresa a la tienda sin penalización de puntos.</div>`;
      }
    }

    if (waBtn) {
      waBtn.style.display = "flex";
      const phone = "50588888888";
      let textMsg = "";
      if (!isCommercial) {
        textMsg = encodeURIComponent(`Hola MeltyDeays! He canjeado mi vale [${voucher.voucherCode}] por "${voucher.rewardTitle}". Mi nombre es ${voucher.userName || "Cliente"}. Quisiera coordinar la entrega.`);
      } else if (isPaid) {
        textMsg = encodeURIComponent(`Hola MeltyDeays! Ya tengo mi vale [${voucher.voucherCode}] pagado (${formatDualPrice(voucher.cashToPayUsd)}) para "${voucher.rewardTitle}". Mi nombre es ${voucher.userName || "Cliente"}. Quisiera coordinar la entrega física.`);
      } else if (voucher.discountUsd > 0) {
        textMsg = encodeURIComponent(`Hola MeltyDeays! He generado mi vale [${voucher.voucherCode}] con descuento de -${formatPrice(voucher.discountUsd)} en "${voucher.rewardTitle}". Saldo a abonar: ${formatDualPrice(voucher.cashToPayUsd)}. Mi nombre es ${voucher.userName || "Cliente"}.`);
      } else {
        textMsg = encodeURIComponent(`Hola MeltyDeays! He generado mi reserva de compra [${voucher.voucherCode}] para "${voucher.rewardTitle}". Saldo a abonar: ${formatDualPrice(voucher.cashToPayUsd)}. Mi nombre es ${voucher.userName || "Cliente"}.`);
      }
      waBtn.href = `https://wa.me/${phone}?text=${textMsg}`;
    }

    // Botón para cancelar compra / devolver puntos
    const canCancel = !isDelivered && !isCancelled && !isExpired && (!isCommercial || !isPaid);
    if (cancelBtn) {
      if (canCancel) {
        cancelBtn.style.display = "block";
        const pts = voucher.pointsSpent || 0;
        cancelBtn.textContent = pts > 0
          ? `❌ Cancelar Vale / Reembolsar ${pts.toLocaleString()} WP`
          : `❌ Cancelar Reserva de Compra`;
      } else {
        cancelBtn.style.display = "none";
      }
    }

    if (deliveredBanner) deliveredBanner.style.display = "none";
    if (deliveredStamp) deliveredStamp.style.display = "none";
    if (statusBadge) {
      if (isPaid) {
        statusBadge.textContent = "💵 PAGO CONFIRMADO";
        statusBadge.style.background = "#f0fdf4";
        statusBadge.style.color = "#15803d";
        statusBadge.style.borderColor = "#86efac";
      } else if (isExpired) {
        statusBadge.textContent = "⚠️ CADUCADO (3D)";
        statusBadge.style.background = "#fef2f2";
        statusBadge.style.color = "#b91c1c";
        statusBadge.style.borderColor = "#fecaca";
      } else if (isCommercial) {
        statusBadge.textContent = "⏱️ PENDIENTE DE PAGO";
        statusBadge.style.background = "#fffbeb";
        statusBadge.style.color = "#b45309";
        statusBadge.style.borderColor = "#fde68a";
      } else {
        statusBadge.textContent = "🎁 LISTO PARA RETIRAR";
        statusBadge.style.background = "#eff6ff";
        statusBadge.style.color = "#1d4ed8";
        statusBadge.style.borderColor = "#bfdbfe";
      }
    }

    if (subtitleEl) {
      if (!isCommercial) {
        subtitleEl.textContent = "Válido para entrega personal de producto con MeltyDeays (Sin límite de tiempo).";
      } else if (isPaid) {
        subtitleEl.textContent = "Pago completado. Coordinando entrega física personal con MeltyDeays.";
      } else {
        subtitleEl.textContent = "Plazo máximo de 3 días para abonar el valor pactado con el vendedor.";
      }
    }
    if (closeBtn) closeBtn.textContent = "✓ Entendido / Cerrar Vale";
  }

  if (qrCanvas && typeof QRCode !== "undefined") {
    qrCanvas.innerHTML = "";
    new QRCode(qrCanvas, {
      text: voucher.voucherCode,
      width: 148,
      height: 148,
      colorDark: (isDelivered || isCancelled) ? "#64748b" : "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  const modal = document.getElementById("modal-voucher");
  if (modal) modal.style.display = "flex";
}

function closeVoucherModal() {
  currentOpenVoucherCode = null;
  const modal = document.getElementById("modal-voucher");
  if (modal) modal.style.display = "none";
}

let pendingCancelVoucherCode = null;

function promptCancelCurrentVoucher() {
  if (currentOpenVoucherCode) {
    promptCancelVoucher(currentOpenVoucherCode);
  }
}

function promptCancelVoucher(voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  const voucher = vm.vouchers.find(v => (v.voucherCode || "").trim().toUpperCase() === code);
  if (!voucher) {
    showToast("Vale no encontrado.", "error");
    return;
  }
  if (voucher.isDelivered()) {
    showToast("Este vale ya fue despachado en tienda. No puede cancelarse.", "error");
    return;
  }
  if (voucher.isCancelled()) {
    showToast("Este vale ya está cancelado.", "info");
    return;
  }

  pendingCancelVoucherCode = code;
  const modal = document.getElementById("modal-confirm-cancel-voucher");
  const summaryEl = document.getElementById("cancel-modal-summary");
  const pts = voucher.pointsSpent || 0;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div><strong>Vale:</strong> ${voucher.voucherCode}</div>
      <div><strong>Artículo:</strong> ${voucher.rewardTitle}</div>
      ${pts > 0 ? `
        <div style="margin-top:6px; font-weight:800; color:#059669; font-size:0.82rem;">
          ✓ Se te devolverán: <strong>+${pts.toLocaleString()} WP</strong> a tu saldo.
        </div>
      ` : `
        <div style="margin-top:6px; color:#475569;">
          • Compra a precio de tienda (0 WP gastados). Se liberará el producto reservado.
        </div>
      `}
      <div style="margin-top:6px; color:#64748b; font-size:0.7rem; border-top:1px dashed #fecdd3; padding-top:4px;">
        El stock en tienda se repondrá inmediatamente (+1 disponible).
      </div>
    `;
  }

  if (modal) modal.style.display = "flex";
}

function closeCancelVoucherModal() {
  pendingCancelVoucherCode = null;
  const modal = document.getElementById("modal-confirm-cancel-voucher");
  if (modal) modal.style.display = "none";
}

async function executeCancelVoucher() {
  if (!pendingCancelVoucherCode) return;
  const code = pendingCancelVoucherCode;
  const btn = document.getElementById("btn-execute-cancel-voucher");
  const origText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Cancelando...";
  }

  try {
    const res = await vm.cancelVoucher(code);
    closeCancelVoucherModal();
    closeVoucherModal();

    if (res.pointsRefunded > 0) {
      showToast(`Vale ${code} cancelado. Se te han reembolsado ${res.pointsRefunded.toLocaleString()} WP.`, "success");
    } else {
      showToast(`Reserva ${code} cancelada exitosamente.`, "success");
    }

    render(vm);
  } catch (err) {
    showToast(err.message || "Error al cancelar vale.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

function copyMemberCode() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión para ver tu código de socio.");
    return;
  }
  const code = vm.currentUser.memberCode || vm.currentUser.member_code || "MC-" + vm.currentUser.uid.slice(-4);
  navigator.clipboard.writeText(code).then(() => {
    showToast(`✓ Código [${code}] copiado al portapapeles`, "success");
  }).catch(() => {
    showToast(`Código de Socio: ${code}`, "info");
  });
}

function copyVoucherCode() {
  const codeEl = document.getElementById("modal-voucher-code");
  const code = codeEl ? codeEl.textContent.trim() : "";
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    showToast(`✓ Vale [${code}] copiado al portapapeles`, "success");
  }).catch(() => {
    showToast(`Vale: ${code}`, "info");
  });
}

function playCyberArpeggio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.2);
    });
  } catch (e) { }
}

function animatePointsDeduction(cost) {
  const balanceEl = document.getElementById("client-balance-val");
  if (!balanceEl) return;

  const currentVal = parseInt(balanceEl.textContent.replace(/\D/g, ""), 10) || (vm.currentUser ? vm.currentUser.wiredPoints + cost : cost);
  const targetVal = vm.currentUser ? vm.currentUser.wiredPoints : Math.max(0, currentVal - cost);

  // Crear badge flotante -XXX WP
  const floatBadge = document.createElement("div");
  floatBadge.className = "floating-points-deduction";
  floatBadge.textContent = `-${cost.toLocaleString()} WP`;
  balanceEl.parentElement.style.position = "relative";
  balanceEl.parentElement.appendChild(floatBadge);
  setTimeout(() => floatBadge.remove(), 1400);

  // Conteo regresivo numérico rápido
  const steps = 14;
  const stepDuration = 35; // ~500ms total
  let currentStep = 0;
  const delta = (currentVal - targetVal) / steps;

  const timer = setInterval(() => {
    currentStep++;
    if (currentStep >= steps) {
      clearInterval(timer);
      balanceEl.textContent = targetVal.toLocaleString();
    } else {
      const interim = Math.round(currentVal - delta * currentStep);
      balanceEl.textContent = interim.toLocaleString();
    }
  }, stepDuration);
}

function triggerCyberGlitchCelebration() {
  let canvas = document.getElementById("cyber-celebration-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "cyber-celebration-canvas";
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const symbols = ["+", "WP", "⚡", "◆", "◇", "●", "01", "WIRED"];
  const colors = ["#38bdf8", "#4338ca", "#e11d48", "#10b981", "#ffffff"];
  const particles = [];
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.45;

  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      gravity: 0.18,
      char: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 10 + Math.random() * 8,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02
    });
  }

  let animId;
  function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = `900 ${p.size}px 'JetBrains Mono', monospace`;
        ctx.fillText(p.char, p.x, p.y);
        ctx.restore();
      }
    });

    if (alive) {
      animId = requestAnimationFrame(renderFrame);
    } else {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.remove();
    }
  }
  animId = requestAnimationFrame(renderFrame);
}


function openAdminAssignModal() {
  const modal = document.getElementById("modal-admin-assign-scan");
  const folioEl = document.getElementById("assign-scan-folio");
  const ptsInput = document.getElementById("assign-scan-points");
  const pinInput = document.getElementById("assign-scan-admin-pin");

  if (folioEl && vm.pendingClaimToken) {
    folioEl.textContent = vm.pendingClaimToken;
  }
  if (ptsInput) ptsInput.value = "";
  if (pinInput) {
    const isAuth = localStorage.getItem("melty_admin_session") === "AUTHENTICATED";
    if (isAuth) {
      pinInput.value = "110805";
      pinInput.closest(".form-group").style.display = "none";
    } else {
      pinInput.value = "";
      pinInput.closest(".form-group").style.display = "block";
    }
  }
  if (modal) modal.style.display = "flex";
  if (ptsInput) ptsInput.focus();
}

function closeAdminAssignModal() {
  const modal = document.getElementById("modal-admin-assign-scan");
  if (modal) modal.style.display = "none";
}

async function submitAdminAssignFromScan() {
  const pinInput = document.getElementById("assign-scan-admin-pin");
  const ptsInput = document.getElementById("assign-scan-points");
  const points = Number(ptsInput ? ptsInput.value : 0);
  const pin = (pinInput ? pinInput.value : "").trim();

  const isAuth = localStorage.getItem("melty_admin_session") === "AUTHENTICATED";
  if (!isAuth && pin !== "110805") {
    showToast("PIN de administrador incorrecto", "error");
    return;
  }

  if (points <= 0) {
    showToast("Ingresa una cantidad de puntos válida mayor a 0", "info");
    return;
  }

  try {
    const { FirestoreService } = await import("./services/FirestoreService.js");
    const tok = await FirestoreService.getToken(vm.pendingClaimToken);
    if (!tok) {
      showToast("Factura no encontrada", "error");
      return;
    }
    tok.pointsValue = points;
    tok.status = "ACTIVE";
    tok.activatedAt = new Date().toISOString();
    await FirestoreService.saveToken(tok);

    closeAdminAssignModal();
    showToast("¡Listo! Asignados +" + points + " WP a la factura. Escribe '" + points + "' a lápiz en el reverso físico.", "success");

    render(vm);
  } catch (err) {
    showToast("Error al guardar puntos: " + err.message, "error");
  }
}
