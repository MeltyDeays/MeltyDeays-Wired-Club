// Controlador Exclusivo del Cliente (PWA The Wired Club)
// MeltyDeays Loyalty Protocol

import {
  getUserProfile,
  getUserLedger,
  getUserVouchers,
  getCatalog,
  registerOrGetCustomer,
  claimTokenAtomic,
  redeemRewardAtomic
} from "./firestore-service.js";

// Estado de Sesión del Cliente
let currentUserId = localStorage.getItem("melty_active_uid") || "usr_client_01";
let activeCustomerTab = "catalog";
let pendingRedeemRewardId = null;

registerOrGetCustomer({
  uid: currentUserId,
  displayName: localStorage.getItem("melty_client_name") || "Nuevo Cliente",
  phone: localStorage.getItem("melty_client_phone") || ""
});

document.addEventListener("DOMContentLoaded", () => {
  initUrlParams();
  refreshUI();
  startAntiScreenshotTimer();

  // Exposición de funciones en window para eventos de usuario
  window.switchCustomerTab = switchCustomerTab;
  window.triggerClaimFromBanner = triggerClaimFromBanner;
  window.openManualClaimModal = openManualClaimModal;
  window.submitManualClaim = submitManualClaim;
  window.requestRedeem = requestRedeem;
  window.showVoucherModal = showVoucherModal;
  window.showMemberQrModal = showMemberQrModal;
  window.openEditProfileModal = openEditProfileModal;
  window.closeModal = closeModal;
});

function initUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || urlParams.get("claim");
  const pin = urlParams.get("pin");

  if (token) {
    const banner = document.getElementById("claim-banner");
    const detectedTokenEl = document.getElementById("detected-token");
    if (banner && detectedTokenEl) {
      detectedTokenEl.textContent = token;
      banner.dataset.token = token;
      banner.dataset.pin = pin || "";
      banner.style.display = "flex";
    }
  }
}

export function switchCustomerTab(tab) {
  activeCustomerTab = tab;
  document.getElementById("tab-btn-catalog").classList.toggle("active", tab === "catalog");
  document.getElementById("tab-btn-vouchers").classList.toggle("active", tab === "vouchers");
  document.getElementById("tab-btn-ledger").classList.toggle("active", tab === "ledger");

  document.getElementById("tab-content-catalog").style.display = tab === "catalog" ? "block" : "none";
  document.getElementById("tab-content-vouchers").style.display = tab === "vouchers" ? "block" : "none";
  document.getElementById("tab-content-ledger").style.display = tab === "ledger" ? "block" : "none";

  refreshUI();
}

export function refreshUI() {
  const user = getUserProfile(currentUserId);
  if (!user) return;

  const balanceEl = document.getElementById("client-balance-val");
  const nameEl = document.getElementById("client-display-name");
  const phoneEl = document.getElementById("client-phone-display");
  const badgeEl = document.getElementById("client-tier-badge");

  if (balanceEl) balanceEl.textContent = user.wired_points;
  if (nameEl) nameEl.textContent = user.displayName;
  if (phoneEl) phoneEl.textContent = user.phone ? user.phone : 'Sin WhatsApp asignado';
  if (badgeEl) badgeEl.textContent = user.tier;

  renderCatalog(user.wired_points);
  renderVouchers();
  renderLedger();
}

function renderCatalog(userBalance) {
  const container = document.getElementById("catalog-container");
  if (!container) return;

  const products = getCatalog().filter(p => p.is_active);
  container.innerHTML = "";

  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: #ffffff; border: 1.5px dashed var(--gray-300); border-radius: 6px;">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📦</div>
        <h3 style="color: var(--dark); font-size: 1.25rem; margin-bottom: 0.5rem; font-weight:900;">Catálogo de Recompensas</h3>
        <p style="color: var(--gray-500); font-size: 0.9rem; max-width: 450px; margin: 0 auto;">
          Próximamente se publicarán nuevos artículos para canjear con tus Wired Points.
        </p>
      </div>
    `;
    return;
  }

  products.forEach(p => {
    const isAffordable = userBalance >= p.points_cost;
    const isLowStock = p.stock_real <= 3;
    const isOutOfStock = p.stock_real <= 0;

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-img-wrapper">
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500'}" alt="${p.title}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500'">
        <span class="category-tag">${p.category}</span>
        <span class="stock-tag ${isLowStock ? 'low' : ''}">
          ${isOutOfStock ? 'AGOTADO' : `${p.stock_real} en tienda`}
        </span>
      </div>

      <div class="product-body">
        <h3 class="product-title">${p.title}</h3>
        <p class="product-desc">${p.description || ''}</p>

        <div class="product-meta">
          <div class="points-cost">
            ${p.points_cost} <span>WIRED PTS</span>
          </div>
          <div class="retail-value">
            Vitrina: $${Number(p.retail_usd || 0).toFixed(2)} USD
          </div>
        </div>

        <button 
          class="btn-primary" 
          style="width: 100%; ${isOutOfStock ? 'opacity:0.5; pointer-events:none;' : ''}"
          onclick="requestRedeem('${p.reward_id}', '${p.title}', ${p.points_cost})"
        >
          ${isAffordable ? 'Canjear Ahora' : `Faltan ${p.points_cost - userBalance} pts`}
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderVouchers() {
  const container = document.getElementById("vouchers-container");
  const badgeEl = document.getElementById("vouchers-count-badge");
  if (!container) return;

  const vouchers = getUserVouchers(currentUserId);
  const pendingVouchers = vouchers.filter(v => v.status === "PENDING_DELIVERY");
  
  if (badgeEl) badgeEl.textContent = pendingVouchers.length;
  container.innerHTML = "";

  if (vouchers.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray-500);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight:700;">No tienes vales activos.</p>
        <p style="font-size: 0.85rem;">Canjea productos del catálogo para generar tu cupón de entrega en tienda.</p>
      </div>
    `;
    return;
  }

  vouchers.forEach(v => {
    const isDelivered = v.status === "DELIVERED";
    const card = document.createElement("div");
    card.className = "voucher-card";

    card.innerHTML = `
      <span class="voucher-badge" style="${isDelivered ? 'background:var(--gray-100); color:var(--gray-500); border-color:var(--gray-300);' : ''}">
        ${isDelivered ? 'ENTREGADO EN MOSTRADOR' : 'LISTO PARA RECOGER'}
      </span>
      <h3 style="color:var(--dark); font-size:1.15rem; margin-bottom:0.25rem; font-weight:900;">${v.reward_title}</h3>
      <div class="voucher-code">${v.voucher_code}</div>
      <p style="color:var(--gray-700); font-size:0.8rem; margin-bottom:1rem;">
        PIN: <strong>${v.verification_pin}</strong> · Válido por 30 días
      </p>

      ${!isDelivered ? `
        <button class="btn-primary" style="width: 100%;" onclick="showVoucherModal('${v.voucher_code}', '${v.reward_title}')">
          📱 Mostrar QR en Tienda
        </button>
      ` : `
        <div style="font-size:0.75rem; color:var(--green); font-family:var(--font-mono); font-weight:700;">
          ✓ Entregado el ${new Date(v.delivered_at).toLocaleDateString()}
        </div>
      `}
    `;

    container.appendChild(card);
  });
}

function renderLedger() {
  const container = document.getElementById("ledger-container");
  if (!container) return;

  const logs = getUserLedger(currentUserId);
  container.innerHTML = "";

  if (logs.length === 0) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--gray-500);">Sin movimientos en tu balance. Escanea tu factura física de MeltyDeays para registrar tus primeros puntos.</div>`;
    return;
  }

  logs.forEach(l => {
    const isPositive = Number(l.delta) > 0;
    const item = document.createElement("div");
    item.className = "ledger-item";

    item.innerHTML = `
      <div class="ledger-info">
        <h4>${l.note}</h4>
        <div class="ledger-date">${new Date(l.created_at).toLocaleString()} · Ref: ${l.ref_id}</div>
      </div>
      <div class="ledger-delta ${isPositive ? 'positive' : 'negative'}">
        ${isPositive ? '+' : ''}${l.delta} pts
      </div>
    `;

    container.appendChild(item);
  });
}

export async function triggerClaimFromBanner() {
  const banner = document.getElementById("claim-banner");
  const token = banner.dataset.token;
  const pin = banner.dataset.pin;

  try {
    const res = await claimTokenAtomic({
      tokenCode: token,
      pin: pin,
      userUid: currentUserId
    });

    banner.style.display = "none";
    alert(`⚡ ¡PUNTOS ACREDITADOS! Se sumaron +${res.pointsAwarded} Wired Points a tu cuenta de la Factura #${res.folio}. Nuevo saldo: ${res.newBalance} pts.`);
    refreshUI();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

export function openManualClaimModal() {
  document.getElementById("modal-manual-claim").style.display = "flex";
}

export async function submitManualClaim() {
  const token = document.getElementById("manual-input-token").value.trim().toUpperCase();
  const pin = document.getElementById("manual-input-pin").value.trim();

  if (!token) {
    alert("Ingresa el código del token.");
    return;
  }

  try {
    const res = await claimTokenAtomic({
      tokenCode: token,
      pin: pin,
      userUid: currentUserId
    });

    closeModal("modal-manual-claim");
    alert(`⚡ ¡ÉXITO! +${res.pointsAwarded} Wired Points acreditados. Nuevo saldo: ${res.newBalance} pts.`);
    refreshUI();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

export function requestRedeem(rewardId, title, points) {
  pendingRedeemRewardId = rewardId;
  const modal = document.getElementById("modal-confirm-redeem");
  const text = document.getElementById("confirm-redeem-text");
  const btn = document.getElementById("btn-do-redeem");

  text.textContent = `¿Deseas canjear "${title}" por ${points} Wired Points? El artículo se apartará físicamente para que lo retires en MeltyDeays.`;
  btn.onclick = executeRedeem;
  modal.style.display = "flex";
}

async function executeRedeem() {
  if (!pendingRedeemRewardId) return;

  try {
    const res = await redeemRewardAtomic({
      rewardId: pendingRedeemRewardId,
      userUid: currentUserId
    });

    closeModal("modal-confirm-redeem");
    refreshUI();
    showVoucherModal(res.voucher.voucher_code, res.voucher.reward_title);
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

export function showVoucherModal(voucherCode, title) {
  const modal = document.getElementById("modal-voucher");
  document.getElementById("modal-voucher-title").textContent = title;
  document.getElementById("modal-voucher-code").textContent = voucherCode;

  const holder = document.getElementById("voucher-qr-canvas");
  holder.innerHTML = "";

  if (window.QRCode) {
    new window.QRCode(holder, {
      text: `MELTYDEAYS-VOUCHER:${voucherCode}`,
      width: 180,
      height: 180,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }

  modal.style.display = "flex";
}

export function showMemberQrModal() {
  const user = getUserProfile(currentUserId);
  showVoucherModal(`MEMBER:${user.uid}`, `Pase de Socio · ${user.displayName}`);
}

export function openEditProfileModal() {
  const name = prompt("Ingresa tu Nombre o Alias:", localStorage.getItem("melty_client_name") || "");
  const phone = prompt("Ingresa tu número de WhatsApp:", localStorage.getItem("melty_client_phone") || "");
  if (name !== null) {
    localStorage.setItem("melty_client_name", name);
    localStorage.setItem("melty_client_phone", phone || "");
    registerOrGetCustomer({
      uid: currentUserId,
      displayName: name,
      phone: phone || ""
    });
    refreshUI();
  }
}

export function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = "none";
}

function startAntiScreenshotTimer() {
  setInterval(() => {
    const timerEl = document.getElementById("radar-live-timer");
    if (timerEl) {
      const now = new Date();
      timerEl.textContent = now.toTimeString().split(" ")[0] + "." + Math.floor(now.getMilliseconds() / 100);
    }
  }, 100);
}
