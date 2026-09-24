/* Controller: Portal de Clientes (The Wired Club) */
import { CustomerViewModel } from "./viewmodels/CustomerViewModel.js";

const vm = new CustomerViewModel();

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
  window.logoutClient = logoutClient;

  window.switchTab = switchTab;
  window.openClaimModal = openClaimModal;
  window.closeClaimModal = closeClaimModal;
  window.submitManualClaim = submitManualClaim;
  window.claimFromBanner = claimFromBanner;

  window.confirmRedeem = confirmRedeem;
  window.executeRedeem = executeRedeem;
  window.closeRedeemModal = closeRedeemModal;

  window.showVoucherModal = showVoucherModal;
  window.closeVoucherModal = closeVoucherModal;
  window.showToast = showToast;

  // Iniciar ViewModel
  vm.init();
});

// RENDERIZADO REACTIVO DE LA VISTA
function render(model) {
  const user = model.currentUser;

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

  if (user) {
    if (passName) passName.textContent = user.displayName;
    if (passPhone) passPhone.textContent = user.phone || "Sin Teléfono";
    if (passBalance) passBalance.textContent = user.wiredPoints.toLocaleString();
    if (passTier) passTier.textContent = user.tier || "NAVI_USER";
    if (passMemberId) passMemberId.textContent = "● " + user.memberCode;
    renderUserQr(user.memberCode);
  } else {
    if (passName) passName.textContent = "Socio Invitado";
    if (passPhone) passPhone.textContent = "Inicia sesión con tu WhatsApp";
    if (passBalance) passBalance.textContent = "0";
    if (passTier) passTier.textContent = "NAVI_GUEST";
    if (passMemberId) passMemberId.textContent = "● MC-INVITADO";
    renderUserQr("MELTY-WIRED-CLUB-GUEST");
  }

  // 3. Banner de Reclamo Pendiente (?claim=WP-XXXX)
  const claimBanner = document.getElementById("claim-banner");
  const detectedToken = document.getElementById("detected-token");
  if (model.pendingClaimToken) {
    if (claimBanner) claimBanner.style.display = "flex";
    if (detectedToken) detectedToken.textContent = model.pendingClaimToken;
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
    const canAfford = user && user.wiredPoints >= item.pointsCost;
    const isOut = item.stock <= 0;

    return `
      <div class="reward-card">
        <div class="reward-img-wrap" style="${!item.imageUrl ? 'background: linear-gradient(135deg, #0d131f 0%, #17243b 100%); display:flex; align-items:center; justify-content:center;' : ''}">
          ${item.imageUrl 
            ? `<img src="${item.imageUrl}" alt="${item.title}" class="reward-img" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">`
            : `<div style="text-align:center; padding:1rem;"><span style="font-size:2rem;">🎁</span><div style="font-family:var(--font-mono); font-size:0.7rem; color:#38bdf8; margin-top:4px;">TECH_REWARD</div></div>`
          }
          <div class="stock-tag ${isOut ? 'out' : ''}">${isOut ? 'AGOTADO' : item.stock + ' DISP.'}</div>
        </div>
        <div class="reward-body">
          <div class="reward-title">${item.title}</div>
          <div class="reward-desc">${item.description || 'Recompensa oficial MeltyDeays.'}</div>
          <div class="reward-footer">
            <div class="reward-cost">${item.pointsCost.toLocaleString()} <span>WP</span></div>
            <button class="btn-redeem" ${isOut ? 'disabled' : ''} onclick="confirmRedeem('${item.id}')">
              ${isOut ? 'Agotado' : 'Canjear'}
            </button>
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

  const pending = vouchers.filter(v => v.status === "PENDING_DELIVERY");
  if (countBadge) countBadge.textContent = pending.length;

  if (vouchers.length === 0) {
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

  container.innerHTML = vouchers.map(v => {
    const isDelivered = v.status === "DELIVERED";
    return `
      <div class="voucher-card" onclick="showVoucherModal('${v.voucherCode}')" style="cursor: pointer;">
        <div class="voucher-header">
          <div class="voucher-title">${v.rewardTitle}</div>
          <div class="voucher-badge ${isDelivered ? 'delivered' : 'pending'}">
            ${isDelivered ? '✓ ENTREGADO' : '● LISTO EN MOSTRADOR'}
          </div>
        </div>
        <div class="voucher-meta">
          <div>Código: <strong>${v.voucherCode}</strong></div>
          <div>Costo: <strong>${v.pointsSpent} WP</strong></div>
          <div>Fecha: ${new Date(v.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
    `;
  }).join("");
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
  } catch (e) {}
}

// CONTROL DE MODALES Y ACCIONES DE VISTA
let selectedRewardId = null;

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

async function submitClientLogin() {
  const phone = document.getElementById("login-phone").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  if (!phone) {
    setAuthFeedback("Ingresa tu número de teléfono o WhatsApp", "error");
    return;
  }
  if (!pin || pin.length < 4) {
    setAuthFeedback("Ingresa tu PIN de 4 dígitos", "error");
    return;
  }

  try {
    const user = await vm.login(phone, pin);
    closeAuthModal();
    showToast("¡Bienvenido de nuevo, " + user.displayName + "!", "success");
  } catch (err) {
    setAuthFeedback(err.message || "Error al iniciar sesión", "error");
    showToast(err.message, "error");
  }
}

async function submitClientRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const pin = document.getElementById("reg-pin").value.trim();

  if (!name) {
    setAuthFeedback("Ingresa tu nombre y apellido", "error");
    return;
  }
  if (!phone) {
    setAuthFeedback("Ingresa tu número de teléfono o WhatsApp", "error");
    return;
  }
  if (!pin || pin.length < 4) {
    setAuthFeedback("Crea un PIN de 4 dígitos", "error");
    return;
  }

  try {
    const user = await vm.register(name, phone, pin);
    closeAuthModal();
    showToast("¡Cuenta creada con éxito! CyberPass activado", "success");
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

async function claimFromBanner() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión o regístrate con tu WhatsApp para reclamar tus puntos de factura.");
    return;
  }

  try {
    const res = await vm.claimPendingToken();
    showToast("¡Puntos acreditados con éxito! +" + res.pointsAdded + " WP", "success");
  } catch (err) {
    showToast(err.message || "No se pudo acreditar el código", "error");
  }
}

function confirmRedeem(rewardId) {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión para canjear recompensas con tus Wired Points.");
    return;
  }

  const reward = vm.catalog.find(r => r.id === rewardId);
  if (!reward) return;

  if (vm.currentUser.wiredPoints < reward.pointsCost) {
    showToast("Puntos insuficientes. Requiere " + reward.pointsCost + " WP", "error");
    return;
  }

  selectedRewardId = rewardId;
  const text = document.getElementById("confirm-redeem-text");
  if (text) {
    text.textContent = "¿Deseas canjear '" + reward.title + "' por " + reward.pointsCost.toLocaleString() + " WP?";
  }

  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "flex";
}

function closeRedeemModal() {
  selectedRewardId = null;
  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "none";
}

async function executeRedeem() {
  if (!selectedRewardId) return;

  try {
    const res = await vm.redeemReward(selectedRewardId);
    closeRedeemModal();
    showToast("¡Canje exitoso! Vale emitido: " + res.voucher.voucherCode, "success");
    showVoucherModal(res.voucher.voucherCode);
  } catch (err) {
    showToast(err.message || "Error en el canje", "error");
  }
}

function showVoucherModal(voucherCode) {
  const voucher = vm.vouchers.find(v => v.voucherCode === voucherCode);
  if (!voucher) return;

  const modalTitle = document.getElementById("modal-voucher-title");
  const modalCode = document.getElementById("modal-voucher-code");
  const qrCanvas = document.getElementById("voucher-qr-canvas");

  if (modalTitle) modalTitle.textContent = voucher.rewardTitle;
  if (modalCode) modalCode.textContent = voucher.voucherCode;

  if (qrCanvas && typeof QRCode !== "undefined") {
    qrCanvas.innerHTML = "";
    new QRCode(qrCanvas, {
      text: voucher.voucherCode,
      width: 140,
      height: 140,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  const modal = document.getElementById("modal-voucher");
  if (modal) modal.style.display = "flex";
}

function closeVoucherModal() {
  const modal = document.getElementById("modal-voucher");
  if (modal) modal.style.display = "none";
}
