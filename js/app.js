/* Controller: Portal de Clientes (The Wired Club) */
import { CustomerViewModel } from "./viewmodels/CustomerViewModel.js";

const vm = new CustomerViewModel();

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
    if (passTier) passTier.textContent = user.tier;
    if (passMemberId) passMemberId.textContent = user.memberCode;
    renderUserQr(user.memberCode);
  } else {
    if (passName) passName.textContent = "Socio Invitado";
    if (passPhone) passPhone.textContent = "Inicia sesión con tu WhatsApp";
    if (passBalance) passBalance.textContent = "0";
    if (passTier) passTier.textContent = "NAVI_GUEST";
    if (passMemberId) passMemberId.textContent = "MC-INVITADO";
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
      <div class="empty-state-box" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--white); border: 2px dashed var(--gray-300);">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔌</div>
        <h3 style="font-size: 1.15rem; font-weight: 900; color: var(--dark); margin-bottom: 0.35rem;">Catálogo en Preparación</h3>
        <p style="color: var(--gray-700); font-size: 0.85rem; max-width: 420px; margin: 0 auto;">
          El administrador de MeltyDeays está configurando las recompensas disponibles. ¡Acumula tus Wired Points mientras tanto!
        </p>
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
            : `<div style="text-align:center; padding:1rem;"><span style="font-size:2rem;">🎮</span><div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--cyan); margin-top:4px;">TECH_REWARD</div></div>`
          }
          <div class="stock-tag ${isOut ? 'out' : ''}">${isOut ? 'AGOTADO' : item.stock + ' DISP.'}</div>
        </div>
        <div class="reward-body">
          <div class="reward-title">${item.title}</div>
          <div class="reward-desc">${item.description || 'Recompensa oficial MeltyDeays.'}</div>
          <div class="reward-footer">
            <div class="reward-cost">${item.pointsCost.toLocaleString()} <span style="font-size:0.75rem;">WP</span></div>
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
      <div class="empty-state-box" style="text-align: center; padding: 3rem 1.5rem; background: var(--white); border: 2px dashed var(--gray-300);">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎟️</div>
        <h3 style="font-size: 1.15rem; font-weight: 900; color: var(--dark); margin-bottom: 0.35rem;">No Tienes Vales Activos</h3>
        <p style="color: var(--gray-700); font-size: 0.85rem; max-width: 420px; margin: 0 auto;">
          Cuando canjees un producto en el catálogo, aquí aparecerá tu vale digital con QR para retirar en mostrador.
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
      <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-size: 0.85rem;">
        No hay movimientos registrados en tu cuenta todavía.
      </div>
    `;
    return;
  }

  container.innerHTML = ledger.map(entry => {
    const isCredit = entry.delta > 0;
    return `
      <div class="ledger-item">
        <div class="ledger-icon" style="background: ${isCredit ? '#e0f2fe' : '#fee2e2'}; color: ${isCredit ? '#0369a1' : '#b91c1c'};">
          ${isCredit ? '➕' : '➖'}
        </div>
        <div class="ledger-details">
          <div class="ledger-note">${entry.note}</div>
          <div class="ledger-time">${new Date(entry.created_at).toLocaleString()}</div>
        </div>
        <div class="ledger-amount" style="color: ${isCredit ? 'var(--dark)' : 'var(--red)'};">
          ${isCredit ? '+' : ''}${entry.delta} WP
        </div>
      </div>
    `;
  }).join("");
}

function renderUserQr(text) {
  const el = document.getElementById("member-qr-canvas");
  if (!el || typeof QRCode === "undefined") return;
  el.innerHTML = "";
  try {
    new QRCode(el, {
      text: text,
      width: 72,
      height: 72,
      colorDark: "#0d131f",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {}
}

// CONTROL DE MODALES Y ACCIONES DE VISTA
let selectedRewardId = null;

function openAuthModal(tab = "login") {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "flex";
  switchAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "none";
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById("tab-btn-auth-login");
  const btnReg = document.getElementById("tab-btn-auth-reg");
  const formLogin = document.getElementById("form-client-login");
  const formReg = document.getElementById("form-client-reg");

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
  const phone = document.getElementById("login-phone").value;
  const pin = document.getElementById("login-pin").value;

  try {
    const user = await vm.login(phone, pin);
    closeAuthModal();
    alert("✓ ¡Bienvenido de nuevo, " + user.displayName + "!");
  } catch (err) {
    alert("❌ Error de acceso: " + err.message);
  }
}

async function submitClientRegister() {
  const name = document.getElementById("reg-name").value;
  const phone = document.getElementById("reg-phone").value;
  const pin = document.getElementById("reg-pin").value;

  try {
    const user = await vm.register(name, phone, pin);
    closeAuthModal();
    alert("🎉 ¡Cuenta creada con éxito! Tu CyberPass está listo, " + user.displayName);
  } catch (err) {
    alert("❌ Error en registro: " + err.message);
  }
}

function logoutClient() {
  if (confirm("¿Deseas cerrar la sesión de tu CyberPass?")) {
    vm.logout();
  }
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
    alert("Por favor inicia sesión con tu WhatsApp para acreditar tus puntos.");
    openAuthModal("login");
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

  if (!token) return alert("Ingresa el código de la factura.");

  try {
    const res = await vm.claimToken(token.trim().toUpperCase(), pin);
    closeClaimModal();
    alert("✓ ¡Éxito! Se han acreditado +" + res.pointsAdded + " WP a tu cuenta. Saldo actual: " + res.newBalance + " WP");
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

async function claimFromBanner() {
  if (!vm.currentUser) {
    alert("Inicia sesión o regístrate con tu WhatsApp para reclamar tus puntos de factura.");
    openAuthModal("login");
    return;
  }

  const token = vm.pendingClaimToken;
  const pin = prompt("Ingresa el PIN de seguridad de 4 dígitos impreso en tu factura:");
  if (pin === null) return;

  try {
    const res = await vm.claimToken(token, pin);
    alert("✓ ¡Puntos Acreditados con éxito! +" + res.pointsAdded + " WP.");
  } catch (err) {
    alert("❌ " + err.message);
  }
}

function confirmRedeem(rewardId) {
  if (!vm.currentUser) {
    alert("Debes iniciar sesión con tu WhatsApp para canjear recompensas.");
    openAuthModal("login");
    return;
  }

  const reward = vm.catalog.find(r => r.id === rewardId);
  if (!reward) return;

  if (vm.currentUser.wiredPoints < reward.pointsCost) {
    return alert("Puntos insuficientes. Tienes " + vm.currentUser.wiredPoints + " WP y requieres " + reward.pointsCost + " WP.");
  }

  selectedRewardId = rewardId;
  const modal = document.getElementById("modal-confirm-redeem");
  const txt = document.getElementById("confirm-redeem-text");
  if (txt) {
    txt.innerHTML = "¿Confirmas canjear <strong>" + reward.title + "</strong> por <strong>" + reward.pointsCost + " WP</strong>?<br><br>Se generará tu vale digital de mostrador.";
  }
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
    const voucher = await vm.redeemReward(selectedRewardId);
    closeRedeemModal();
    showVoucherModal(voucher.voucherCode);
    switchTab("vouchers");
  } catch (err) {
    alert("❌ Error al canjear: " + err.message);
  }
}

function showVoucherModal(voucherCode) {
  const v = vm.vouchers.find(item => item.voucherCode === voucherCode);
  if (!v) return;

  const modal = document.getElementById("modal-voucher");
  const title = document.getElementById("modal-voucher-title");
  const codeEl = document.getElementById("modal-voucher-code");
  const canvasHolder = document.getElementById("voucher-qr-canvas");

  if (title) title.textContent = v.rewardTitle;
  if (codeEl) codeEl.textContent = v.voucherCode;

  if (canvasHolder && typeof QRCode !== "undefined") {
    canvasHolder.innerHTML = "";
    new QRCode(canvasHolder, {
      text: "MELTY-DELIVERY:" + v.voucherCode,
      width: 140,
      height: 140,
      colorDark: "#0d131f",
      colorLight: "#ffffff"
    });
  }

  if (modal) modal.style.display = "flex";
}

function closeVoucherModal() {
  const modal = document.getElementById("modal-voucher");
  if (modal) modal.style.display = "none";
}
