/**
 * Vista / Subcontrolador: Catálogo de Recompensas, Calculadora Dinámica de Canje y FX Retro (The Wired Club)
 */
import { parseProductDescription } from "../../models/RewardModel.js";

let vm = null;
let showToast = () => {};
let openAuthModal = () => {};
let showVoucherModal = (code) => {
  if (typeof window.showVoucherModal === "function") {
    window.showVoucherModal(code);
  }
};
let formatPrice = (usd) => `$${Number(usd || 0).toFixed(2)} USD`;
let formatDualPrice = (usd) => `$${Number(usd || 0).toFixed(2)} USD`;
let currentlyOpenSpecsId = null;

export function toggleRewardSpecs(itemId) {
  const drop = document.getElementById("specs-drop-" + itemId);
  const btn = document.getElementById("specs-btn-" + itemId);
  if (!drop || !btn) return;

  const isHidden = drop.style.display === "none" || !drop.style.display;

  // Cerrar cualquier otro dropdown abierto previamente para no saturar la vista
  if (currentlyOpenSpecsId && currentlyOpenSpecsId !== itemId) {
    const prevDrop = document.getElementById("specs-drop-" + currentlyOpenSpecsId);
    const prevBtn = document.getElementById("specs-btn-" + currentlyOpenSpecsId);
    if (prevDrop) prevDrop.style.display = "none";
    if (prevBtn) {
      prevBtn.classList.remove("expanded");
      const prevCount = prevDrop ? prevDrop.querySelectorAll("li").length : 0;
      const prevLabel = prevBtn.querySelector(".btn-specs-label");
      const prevIcon = prevBtn.querySelector(".btn-specs-icon");
      if (prevLabel) prevLabel.textContent = `📋 Ver especificaciones (${prevCount})`;
      if (prevIcon) prevIcon.textContent = "▾";
    }
    currentlyOpenSpecsId = null;
  }

  if (isHidden) {
    drop.style.display = "block";
    btn.classList.add("expanded");
    currentlyOpenSpecsId = itemId;
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = "✕ Ocultar especificaciones";
    if (icon) icon.textContent = "▴";
  } else {
    drop.style.display = "none";
    btn.classList.remove("expanded");
    currentlyOpenSpecsId = null;
    const count = drop.querySelectorAll("li").length;
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = `📋 Ver especificaciones (${count})`;
    if (icon) icon.textContent = "▾";
  }
}

let lastRenderedCatalog = [];

export function openProductSpecsModal(rewardId) {
  let item = null;
  if (vm && vm.catalog) {
    item = vm.catalog.find(r => r.id === rewardId);
  }
  if (!item && lastRenderedCatalog.length > 0) {
    item = lastRenderedCatalog.find(r => r.id === rewardId);
  }
  if (!item && typeof window !== "undefined" && Array.isArray(window._lastRenderedCatalog)) {
    item = window._lastRenderedCatalog.find(r => r.id === rewardId);
  }
  if (!item) return;

  const modal = document.getElementById("modal-product-specs");
  const body = document.getElementById("modal-specs-body");
  const footer = document.getElementById("modal-specs-footer");
  if (!modal || !body) return;

  const parsed = parseProductDescription(item.description);
  const isPartial = item.rewardType === "PARTIAL_DISCOUNT" || (typeof item.isPartialDiscount === "function" && item.isPartialDiscount()) || (item.cashToPayUsd && item.cashToPayUsd > 0);
  const maxPct = item.maxDiscountPercent || 0;

  const emojiRegex = /^(\p{Extended_Pictographic}|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u27BF])\s*/u;

  const formattedSpecsHtml = parsed.specs.map(rawSpec => {
    let text = rawSpec.trim().replace(/^[•\-\*▸►]\s*/, '').trim();
    if (!text) return '';

    const emojiMatch = text.match(emojiRegex);
    let icon = null;
    if (emojiMatch) {
      icon = emojiMatch[1];
      text = text.slice(emojiMatch[0].length).trim();
    }

    // Detectar si es un encabezado de sección (ej: "LO MÁS DESTACADO:")
    const isSectionHeader = text.endsWith(':') && text.length < 40;
    if (isSectionHeader) {
      return `
        <div class="modal-spec-section-header">
          <span class="section-icon">${icon || '⚡'}</span>
          <span class="section-title">${text.replace(/:$/, '')}</span>
        </div>
      `;
    }

    // Detectar si tiene estructura Clave: Valor
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 42) {
      const key = text.slice(0, colonIndex).trim();
      const val = text.slice(colonIndex + 1).trim();
      return `
        <div class="modal-spec-card">
          <div class="spec-card-icon-box">${icon || '✦'}</div>
          <div class="spec-card-content">
            <div class="spec-card-key">${key}</div>
            <div class="spec-card-val">${val}</div>
          </div>
        </div>
      `;
    }

    // Característica simple
    return `
      <div class="modal-spec-card">
        <div class="spec-card-icon-box">${icon || '▸'}</div>
        <div class="spec-card-content">
          <div class="spec-card-val bold">${text}</div>
        </div>
      </div>
    `;
  }).join("");

  body.innerHTML = `
    <div class="modal-product-hero">
      ${item.imageUrl ? `
        <img src="${item.imageUrl}" alt="${item.title}" class="hero-thumb" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">
      ` : `
        <div class="hero-thumb hero-fallback">
          <span>${isPartial ? '🏷️' : '🎁'}</span>
        </div>
      `}
      <div class="hero-details">
        <h3 class="hero-title">${item.title}</h3>
        <div class="hero-badges-row">
          <span class="hero-badge count">📋 ${parsed.specs.length} Especificaciones</span>
          ${isPartial 
            ? `<span class="hero-badge discount">🏷️ Hasta ${maxPct}% OFF</span>` 
            : `<span class="hero-badge points">⚡ ${item.pointsCost.toLocaleString()} WP</span>`
          }
        </div>
      </div>
    </div>

    ${parsed.intro ? `
      <div class="modal-intro-callout">
        <div class="callout-icon">✨</div>
        <div class="callout-text">${parsed.intro}</div>
      </div>
    ` : ''}

    <div class="modal-specs-list-title">
      <span>CARACTERÍSTICAS & FICHA TÉCNICA</span>
    </div>

    <div class="modal-specs-cards-container">
      ${formattedSpecsHtml}
    </div>
  `;

  if (footer) {
    const isOut = item.stock <= 0;
    let actionBtn = "";
    if (!isOut) {
      if (isPartial) {
        actionBtn = `
          <button type="button" class="btn-primary" style="background: linear-gradient(135deg, #d97706, #b45309); border-color: var(--dark); padding: 0.5rem 1.1rem; font-size: 0.78rem; display: flex; align-items: center; gap: 6px;" onclick="closeProductSpecsModal(); confirmRedeem('${item.id}');">
            <span>🏷️</span> <span>Canjear en Tienda</span>
          </button>
        `;
      } else {
        actionBtn = `
          <button type="button" class="btn-primary" style="padding: 0.5rem 1.1rem; font-size: 0.78rem; display: flex; align-items: center; gap: 6px;" onclick="closeProductSpecsModal(); confirmRedeem('${item.id}');">
            <span>⚡</span> <span>Canjear Ahora</span>
          </button>
        `;
      }
    }

    footer.innerHTML = `
      <button type="button" class="btn-secondary" style="padding: 0.5rem 1.1rem; font-size: 0.78rem;" onclick="closeProductSpecsModal()">
        ✕ Cerrar
      </button>
      ${actionBtn}
    `;
  }

  modal.style.display = "flex";
}

export function closeProductSpecsModal() {
  const modal = document.getElementById("modal-product-specs");
  if (modal) modal.style.display = "none";
}

if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("click", (e) => {
    if (currentlyOpenSpecsId) {
      const drop = document.getElementById("specs-drop-" + currentlyOpenSpecsId);
      const btn = document.getElementById("specs-btn-" + currentlyOpenSpecsId);
      if (drop && btn && !drop.contains(e.target) && !btn.contains(e.target)) {
        drop.style.display = "none";
        btn.classList.remove("expanded");
        const count = drop.querySelectorAll("li").length;
        const label = btn.querySelector(".btn-specs-label");
        const icon = btn.querySelector(".btn-specs-icon");
        if (label) label.textContent = `📋 Ver especificaciones (${count})`;
        if (icon) icon.textContent = "▾";
        currentlyOpenSpecsId = null;
      }
    }
  });
}

export function initCustomerCatalogView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.openAuthModal) openAuthModal = deps.openAuthModal;
    if (deps.showVoucherModal) showVoucherModal = deps.showVoucherModal;
    if (deps.formatPrice) formatPrice = deps.formatPrice;
    if (deps.formatDualPrice) formatDualPrice = deps.formatDualPrice;
  }
}

let selectedRewardId = null;
let selectedPointsToApply = 0;
let currentRedeemReward = null;

export function renderCatalog(catalog, user) {
  lastRenderedCatalog = Array.isArray(catalog) ? catalog : [];
  if (typeof window !== "undefined") window._lastRenderedCatalog = lastRenderedCatalog;
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
              <span class="pricing-label">Tope máx. (${maxCapPts} WP):</span>
              <span class="pricing-val">-${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
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
              <span class="pricing-label">Tope máx. (${maxCapPts} WP):</span>
              <span class="pricing-val">Hasta -${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
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

    let footerHtml = "";
    if (isPartial) {
      if (isOut) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial out" disabled>
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🔒</span>
                <span class="btn-redeem-text">AGOTADO TEMPORALMENTE</span>
              </div>
            </button>
          </div>
        `;
      } else if (!user) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial shop-btn active-canje" onclick="confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🛒</span>
                <span class="btn-redeem-text">COMPRAR EN TIENDA</span>
              </div>
              <div class="btn-redeem-pts-badge">HASTA ${maxPct}% OFF</div>
            </button>
          </div>
        `;
      } else if (userPts >= maxCapPts) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial active-canje" onclick="confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🏷️</span>
                <span class="btn-redeem-text">APLICAR DESCUENTO (${maxPct}%)</span>
              </div>
              <div class="btn-redeem-pts-badge">${maxCapPts} WP (TOPE)</div>
            </button>
          </div>
        `;
      } else if (userPts > 0) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial active-canje" onclick="confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🏷️</span>
                <span class="btn-redeem-text">APLICAR DESCUENTO (${formattedAppliedPct}%)</span>
              </div>
              <div class="btn-redeem-pts-badge">${appliedPts} WP</div>
            </button>
          </div>
        `;
      } else {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial shop-btn active-canje" onclick="confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🛒</span>
                <span class="btn-redeem-text">COMPRAR EN TIENDA</span>
              </div>
              <div class="btn-redeem-pts-badge">HASTA ${maxPct}% OFF</div>
            </button>
          </div>
        `;
      }
    } else {
      footerHtml = `
        <div class="reward-footer">
          <div class="reward-cost">${item.pointsCost.toLocaleString()} <span>WP</span></div>
          ${btnHtml}
        </div>
      `;
    }

    const parsed = parseProductDescription(item.description);
    const descHtml = parsed.hasSpecs
      ? `
        <div class="reward-desc-wrap" id="desc-wrap-${item.id}">
          <div class="reward-desc-intro" title="${parsed.intro}">${parsed.intro}</div>
          <div class="reward-specs-box">
            <button type="button" class="reward-specs-toggle-btn" onclick="toggleRewardSpecs('${item.id}')" id="specs-btn-${item.id}">
              <span class="btn-specs-label">📋 Ver especificaciones (${parsed.specs.length})</span>
              <span class="btn-specs-icon">▾</span>
            </button>
            <div class="reward-specs-dropdown" id="specs-drop-${item.id}" style="display:none;">
              <div class="specs-dropdown-header">
                <span class="specs-dropdown-title">ESPECIFICACIONES (${parsed.specs.length})</span>
                <button type="button" class="specs-modal-trigger-btn" onclick="openProductSpecsModal('${item.id}')" title="Ver especificaciones en pantalla completa">
                  <span>⛶</span> <span>Ampliar</span>
                </button>
              </div>
              <ul class="reward-specs-ul">
                ${parsed.specs.map(s => `<li><span class="spec-bullet">▸</span><span class="spec-content">${s}</span></li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      `
      : `
        <div class="reward-desc-wrap" id="desc-wrap-${item.id}">
          <div class="reward-desc-intro" title="${parsed.intro || ''}">${parsed.intro || (isPartial ? 'Producto comercial con descuento tope en Wired Points.' : 'Recompensa oficial MeltyDeays.')}</div>
          <div class="reward-specs-box">
            <div class="reward-specs-empty-pill">
              <span class="spec-info-text">✨ ${isPartial ? 'Garantía y entrega directa en tienda' : 'Recompensa oficial MeltyDeays'}</span>
            </div>
          </div>
        </div>
      `;

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
          <div class="reward-title" title="${item.title}">${item.title}</div>
          ${descHtml}
          ${partialBreakdown}
          ${footerHtml}
        </div>
      </div>
    `;
  }).join("");
}


export function confirmRedeem(rewardId) {
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
      if (typePrice) typePrice.innerHTML = formatDualPrice(reward.priceUsd);
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

export function updateConfirmCalculation() {
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
    if (typeCash) typeCash.innerHTML = formatDualPrice(cashToPayUsd);
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

export function onPointsSliderChange(val) {
  const pts = parseInt(val, 10) || 0;
  selectedPointsToApply = pts;
  const numInput = document.getElementById("confirm-points-num");
  if (numInput) numInput.value = pts;
  updateConfirmCalculation();
}

export function onPointsNumChange(val) {
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

export function setPointsPreset(mode) {
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

export function closeRedeemModal() {
  selectedRewardId = null;
  currentRedeemReward = null;
  selectedPointsToApply = 0;
  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "none";
}

export async function executeRedeem() {
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
      showToast(`🛒 ¡Vale de compra emitido! Paga en tienda: ${formatPrice(voucher.cashToPayUsd)}`, "success");
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


export function playCyberArpeggio() {
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

export function animatePointsDeduction(cost) {
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

export function triggerCyberGlitchCelebration() {
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

