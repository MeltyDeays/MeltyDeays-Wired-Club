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
  window.toggleClientPinVisibility = toggleClientPinVisibility;
  window.logoutClient = logoutClient;

  window.switchTab = switchTab;
  window.openClaimModal = openClaimModal;
  window.closeClaimModal = closeClaimModal;
  window.submitManualClaim = submitManualClaim;
  window.claimFromBanner = claimFromBanner;
  window.openAdminAssignModal = openAdminAssignModal;
  window.closeAdminAssignModal = closeAdminAssignModal;
  window.submitAdminAssignFromScan = submitAdminAssignFromScan;

  window.confirmRedeem = confirmRedeem;
  window.executeRedeem = executeRedeem;
  window.closeRedeemModal = closeRedeemModal;

  window.showVoucherModal = showVoucherModal;
  window.closeVoucherModal = closeVoucherModal;
  window.copyMemberCode = copyMemberCode;
  window.copyVoucherCode = copyVoucherCode;
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
            if (btnClaim) btnClaim.style.display = "none";
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

    let btnHtml = "";
    if (isOut) {
      btnHtml = `<button class="btn-redeem out" disabled>❌ AGOTADO</button>`;
    } else if (!user) {
      btnHtml = `<button class="btn-redeem login-req" onclick="openAuthModal('login', 'Inicia sesión para canjear')">🔒 Iniciar Sesión</button>`;
    } else if (!canAfford) {
      const missing = item.pointsCost - user.wiredPoints;
      btnHtml = `<button class="btn-redeem locked" onclick="showToast('Te faltan ${missing.toLocaleString()} WP para canjear este artículo', 'info')">🔒 Faltan ${missing.toLocaleString()} WP</button>`;
    } else {
      btnHtml = `<button class="btn-redeem active-canje" onclick="confirmRedeem('${item.id}')">⚡ CANJEAR AHORA</button>`;
    }

    return `
      <div class="reward-card">
        <div class="reward-img-wrap" style="${!item.imageUrl ? 'background: linear-gradient(135deg, #0d131f 0%, #17243b 100%); display:flex; align-items:center; justify-content:center;' : ''}">
          ${item.imageUrl 
            ? `<img src="${item.imageUrl}" alt="${item.title}" class="reward-img" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">`
            : `<div style="text-align:center; padding:1rem;"><span style="font-size:2.2rem;">🎁</span><div style="font-family:var(--font-mono); font-size:0.68rem; color:#38bdf8; margin-top:4px;">TECH_REWARD</div></div>`
          }
          <div class="stock-tag ${isOut ? 'out' : ''}">${isOut ? 'AGOTADO' : item.stock + ' DISP.'}</div>
        </div>
        <div class="reward-body">
          <div class="reward-title">${item.title}</div>
          <div class="reward-desc">${item.description || 'Recompensa oficial MeltyDeays.'}</div>
          <div class="reward-footer">
            <div class="reward-cost">${item.pointsCost.toLocaleString()} <span>WP</span></div>
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
        const isDelivered = v.status === "DELIVERED" || (typeof v.isDelivered === "function" && v.isDelivered());
        const cost = v.pointsSpent || v.pointsCost || 0;
        const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "-";

        return `
          <div class="voucher-card" onclick="showVoucherModal('${v.voucherCode}')" style="cursor: pointer; transition: transform 0.15s ease;" title="Clic para ver código QR">
            <div class="voucher-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
              <div class="voucher-title" style="font-weight:900; font-size:1.05rem; color:var(--dark);">${v.rewardTitle || "Artículo"}</div>
              <div class="voucher-badge ${isDelivered ? 'delivered' : 'pending'}" style="${isDelivered ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;' : 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;'} font-family:var(--font-mono); font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:3px;">
                ${isDelivered ? '✓ ENTREGADO' : '● LISTO EN MOSTRADOR'}
              </div>
            </div>
            <div class="voucher-code" style="font-family:var(--font-mono); font-size:1.35rem; font-weight:900; letter-spacing:2px; color:var(--dark); margin:0.35rem 0;">${v.voucherCode}</div>
            <div class="voucher-meta" style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:0.75rem; color:var(--gray-600); border-top:1px dashed var(--gray-300); padding-top:0.6rem; margin-top:0.6rem;">
              <div>Costo: <strong style="color:var(--dark);">${cost.toLocaleString()} WP</strong></div>
              <div>${dateStr}</div>
              <button class="btn-secondary" style="padding:2px 7px; font-size:0.7rem;" onclick="event.stopPropagation(); showVoucherModal('${v.voucherCode}')">👁️ Ver QR</button>
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

function toggleClientPinVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

async function submitClientLogin() {
  const phone = document.getElementById("login-phone").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  if (!phone) {
    setAuthFeedback("Ingresa tu número de teléfono o WhatsApp", "error");
    return;
  }
  if (!pin || pin.length < 4 || pin.length > 8) {
    setAuthFeedback("Ingresa tu PIN de seguridad (entre 4 y 8 dígitos)", "error");
    return;
  }

  try {
    const user = await vm.login(phone, pin);
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
  if (!pin || pin.length < 4 || pin.length > 8) {
    setAuthFeedback("Crea un PIN de 4 a 8 dígitos", "error");
    return;
  }

  try {
    const user = await vm.register(name, phone, pin);
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
    showToast(`Puntos insuficientes. Requieres ${reward.pointsCost.toLocaleString()} WP (tienes ${vm.currentUser.wiredPoints.toLocaleString()} WP).`, "error");
    return;
  }

  selectedRewardId = rewardId;

  // Llenar datos de la recompensa
  const titleEl = document.getElementById("confirm-reward-title");
  const ptsEl = document.getElementById("confirm-reward-points");
  const imgEl = document.getElementById("confirm-reward-img");
  const fallbackEl = document.getElementById("confirm-reward-fallback");

  if (titleEl) titleEl.textContent = reward.title;
  if (ptsEl) ptsEl.textContent = reward.pointsCost.toLocaleString() + " WP";

  if (reward.imageUrl && imgEl) {
    imgEl.src = reward.imageUrl;
    imgEl.style.display = "block";
    if (fallbackEl) fallbackEl.style.display = "none";
  } else {
    if (imgEl) imgEl.style.display = "none";
    if (fallbackEl) fallbackEl.style.display = "block";
  }

  // Previsualización de balance
  const currentPts = vm.currentUser.wiredPoints || 0;
  const deductPts = reward.pointsCost || 0;
  const afterPts = Math.max(0, currentPts - deductPts);

  const curEl = document.getElementById("confirm-balance-current");
  const dedEl = document.getElementById("confirm-balance-deduct");
  const aftEl = document.getElementById("confirm-balance-after");

  if (curEl) curEl.textContent = currentPts.toLocaleString() + " WP";
  if (dedEl) dedEl.textContent = `-${deductPts.toLocaleString()} WP`;
  if (aftEl) aftEl.textContent = afterPts.toLocaleString() + " WP";

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
    const res = await vm.redeemReward(selectedRewardId);
    const voucher = res.voucher || res;
    const cost = res.cost || (voucher ? voucher.pointsSpent : 0);

    // 3. Animación de decremento numérico y badge flotante en CyberPass
    animatePointsDeduction(cost);

    // 4. Animación de celebración en pantalla
    triggerCyberGlitchCelebration();

    // 5. Cerrar modal de confirmación con delay visual
    closeRedeemModal();

    // 6. Toast temático
    showToast(`⚡ ¡Canje Autorizado! Vale emitido: ${voucher.voucherCode}`, "success");

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

function showVoucherModal(voucherCode) {
  const voucher = vm.vouchers.find(v => v.voucherCode === voucherCode);
  if (!voucher) return;

  const isDelivered = voucher.status === "DELIVERED" || 
                      voucher.status === "REDEEMED" || 
                      (typeof voucher.isDelivered === "function" && voucher.isDelivered()) || 
                      Boolean(voucher.deliveredAt);

  const modalTitle = document.getElementById("modal-voucher-title");
  const modalCode = document.getElementById("modal-voucher-code");
  const qrCanvas = document.getElementById("voucher-qr-canvas");
  const waBtn = document.getElementById("btn-whatsapp-voucher");
  const instructionsBox = document.getElementById("modal-voucher-instructions");
  const deliveredBanner = document.getElementById("modal-voucher-delivered-banner");
  const deliveredDetail = document.getElementById("modal-voucher-delivered-detail");
  const deliveredStamp = document.getElementById("voucher-delivered-stamp");
  const statusBadge = document.getElementById("modal-voucher-status-badge");
  const subtitleEl = document.getElementById("modal-voucher-subtitle");
  const closeBtn = document.getElementById("btn-close-voucher");

  if (modalTitle) modalTitle.textContent = voucher.rewardTitle || "Recompensa";
  if (modalCode) modalCode.textContent = voucher.voucherCode;

  if (isDelivered) {
    // Si ya fue entregado, CERO WhatsApp, CERO instrucciones de retiro
    if (waBtn) waBtn.style.display = "none";
    if (instructionsBox) instructionsBox.style.display = "none";
    if (deliveredBanner) deliveredBanner.style.display = "block";
    if (deliveredStamp) deliveredStamp.style.display = "block";

    if (statusBadge) {
      statusBadge.textContent = "✓ ENTREGADO EN TIENDA";
      statusBadge.style.background = "#ecfdf5";
      statusBadge.style.color = "#065f46";
      statusBadge.style.borderColor = "#a7f3d0";
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Comprobante digital de producto físico entregado al socio.";
    }
    if (deliveredDetail) {
      const dateStr = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Despachado en mostrador";
      deliveredDetail.innerHTML = `Retirado exitosamente en mostrador MeltyDeays.<br><span style="font-family: var(--font-mono); font-size: 0.72rem; color: #059669;">Entrega confirmada: ${dateStr}</span>`;
    }
    if (closeBtn) closeBtn.textContent = "✓ Cerrar Comprobante";
  } else {
    // Si sigue pendiente de retiro
    if (waBtn) {
      waBtn.style.display = "flex";
      const phone = "50588888888"; // Línea oficial MeltyDeays
      const textMsg = encodeURIComponent(`Hola MeltyDeays! He canjeado mi vale [${voucher.voucherCode}] por "${voucher.rewardTitle}". Mi nombre es ${voucher.userName || "Cliente"}.`);
      waBtn.href = `https://wa.me/${phone}?text=${textMsg}`;
    }
    if (instructionsBox) instructionsBox.style.display = "block";
    if (deliveredBanner) deliveredBanner.style.display = "none";
    if (deliveredStamp) deliveredStamp.style.display = "none";

    if (statusBadge) {
      statusBadge.textContent = "● LISTO EN MOSTRADOR";
      statusBadge.style.background = "#fffbeb";
      statusBadge.style.color = "#b45309";
      statusBadge.style.borderColor = "#fde68a";
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Válido para reclamo de producto físico en tienda MeltyDeays.";
    }
    if (closeBtn) closeBtn.textContent = "✓ Entendido / Cerrar Vale";
  }

  if (qrCanvas && typeof QRCode !== "undefined") {
    qrCanvas.innerHTML = "";
    new QRCode(qrCanvas, {
      text: voucher.voucherCode,
      width: 148,
      height: 148,
      colorDark: isDelivered ? "#64748b" : "#0f172a",
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
  } catch (e) {}
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
    
    renderUI(vm);
  } catch (err) {
    showToast("Error al guardar puntos: " + err.message, "error");
  }
}
