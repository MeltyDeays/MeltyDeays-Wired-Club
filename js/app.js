/* Controller: Portal de Clientes (The Wired Club) */
import { CustomerViewModel } from "./viewmodels/CustomerViewModel.js";
import { FirestoreService } from "./services/FirestoreService.js";
import { injectEnvironmentBadge } from "./config/env.js";

import {
  initCustomerViews,
  // 1. Autenticación y Credenciales
  setAuthFeedback,
  renderUserQr,
  openAuthModal,
  closeAuthModal,
  switchAuthTab,
  toggleClientPinVisibility,
  submitClientLogin,
  submitClientRegister,
  logoutClient,
  copyMemberCode,
  // 2. Catálogo y Canje
  renderCatalog,
  toggleRewardSpecs,
  toggleModalProductSpecs,
  openProductSpecsModal,
  closeProductSpecsModal,
  specsModalNextImage,
  specsModalPrevImage,
  setSpecsModalImageIndex,
  initSpecsCarouselSwipe,
  openLightboxFromSpecs,
  shareProduct,
  updateSpecsModalCalculation,
  submitProductComment,
  loadProductComments,
  renderProductCommentsDom,
  toggleCommentReplyForm,
  submitClientCommentReply,
  openImageLightbox,
  closeImageLightbox,
  lightboxNextImage,
  lightboxPrevImage,
  setLightboxImageIndex,
  toggleLightboxZoom,
  confirmRedeem,
  selectComboRedeemOption,
  updateConfirmCalculation,
  onPointsSliderChange,
  onPointsNumChange,
  setPointsPreset,
  closeRedeemModal,
  executeRedeem,
  playCyberArpeggio,
  animatePointsDeduction,
  triggerCyberGlitchCelebration,
  // 3. Vales e Historial
  renderVouchers,
  switchVoucherSubTab,
  renderLedger,
  showVoucherModal,
  closeVoucherModal,
  promptCancelCurrentVoucher,
  promptCancelVoucher,
  closeCancelVoucherModal,
  executeCancelVoucher,
  copyVoucherCode,
  // 4. Reclamo de Puntos y Escáner QR
  openClaimModal,
  closeClaimModal,
  submitManualClaim,
  openClientCameraScanner,
  stopClientCameraScanner,
  handleClientQrScanned,
  dismissClaimBanner,
  claimFromBanner,
  openAdminAssignModal,
  closeAdminAssignModal,
  submitAdminAssignFromScan,
  // 5. Drawer de Perfil Móvil y Notificaciones
  openMobileProfileDrawer,
  closeMobileProfileDrawer,
  saveProfileDisplayName,
  applyDrawerCurrency,
  toggleBannerPresetPicker,
  toggleAvatarPresetPicker,
  selectBannerPreset,
  selectAvatarPreset,
  handleAvatarFileInput,
  handleBannerFileInput,
  executeProfilePinUpdate,
  toggleProfilePinForm,
  toggleProfileNotifications,
  cancelProfilePinUpdate,
  enableProfileNameEditing,
  cancelProfileNameEditing,
  handleNotificationClick,
  markAllNotificationsRead,
  requestChromePushPermission,
  testChromePushNotification,
  renderProfileDrawer
} from "./views/customer/index.js";
import {
  initCustomerPreOrderModalView,
  openPreOrderModal,
  openReservationModal,
  closePreOrderModal,
  submitPreOrderReservation
} from "./views/customer/CustomerPreOrderModalView.js";
import { PushNotificationService } from "./services/PushNotificationService.js";

const vm = new CustomerViewModel();

// CONVERSIÓN Y FORMATO DE MONEDA (1 USD = 37 C$ NIO)
export const USD_TO_NIO_RATE = 37.0;

export function formatPrice(amountUsd) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  if (curr === "NIO") {
    const valNio = (Number(amountUsd) || 0) * USD_TO_NIO_RATE;
    return `C$ ${valNio.toFixed(2)} NIO`;
  }
  return `$${(Number(amountUsd) || 0).toFixed(2)} USD`;
}

export function formatDualPrice(amountUsd) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  const usd = Number(amountUsd) || 0;
  const nio = usd * USD_TO_NIO_RATE;
  if (curr === "NIO") {
    return `<strong>C$ ${nio.toFixed(2)} NIO</strong> <span style="font-size:0.75rem; color:#64748b; font-weight:600;">($${usd.toFixed(2)} USD)</span>`;
  }
  return `<strong>$${usd.toFixed(2)} USD</strong> <span style="font-size:0.75rem; color:#64748b; font-weight:600;">(C$ ${nio.toFixed(2)} NIO)</span>`;
}

export function formatDualPricePlain(amountUsd) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  const usd = Number(amountUsd) || 0;
  const nio = usd * USD_TO_NIO_RATE;
  if (curr === "NIO") {
    return `C$ ${nio.toFixed(2)} NIO ($${usd.toFixed(2)} USD)`;
  }
  return `$${usd.toFixed(2)} USD (C$ ${nio.toFixed(2)} NIO)`;
}

export async function setAppCurrency(curr) {
  if (curr !== "USD" && curr !== "NIO") return;
  if (vm) {
    await vm.setPreferredCurrency(curr);
    showToast(`Moneda de visualización cambiada a ${curr === "NIO" ? "Córdobas (C$ NIO)" : "Dólares ($ USD)"}.`, "info");
  }
}

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

export function switchTab(tabId) {
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

// Inicialización de submódulos de vistas desacopladas (Fase 6 MVVM)
initCustomerViews({
  vm,
  showToast,
  attachPhoneMask,
  formatPrice,
  formatDualPrice,
  formatDualPricePlain,
  USD_TO_NIO_RATE
});

initCustomerPreOrderModalView({
  vm,
  showToast,
  showVoucherModal,
  attachPhoneMask,
  formatPrice,
  formatDualPrice,
  formatDualPricePlain,
  USD_TO_NIO_RATE
});

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
  if (model.pendingClaimToken && model.pendingClaimToken !== "UNDEFINED" && model.pendingClaimToken !== "NULL" && model.pendingClaimToken.startsWith("WP-")) {
    if (claimBanner) claimBanner.style.display = "flex";
    if (detectedToken) detectedToken.textContent = model.pendingClaimToken;

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
  } else {
    if (claimBanner) claimBanner.style.display = "none";
  }

  // 4. Catálogo de Recompensas
  renderCatalog(model.catalog, user);

  // 5. Vales Activos
  renderVouchers(model.vouchers);

  // 6. Libro Mayor (Ledger)
  renderLedger(model.ledger);

  // 7. Drawer de Perfil y Notificaciones
  renderProfileDrawer();
}

document.addEventListener("DOMContentLoaded", () => {
  // Suscribirse a cambios en el ViewModel
  vm.subscribe(render);

  // Drawer de Perfil Móvil y Personalización
  window.openMobileProfileDrawer = openMobileProfileDrawer;
  window.closeMobileProfileDrawer = closeMobileProfileDrawer;
  window.openClientProfileDrawer = openMobileProfileDrawer;
  window.closeClientProfileDrawer = closeMobileProfileDrawer;
  window.saveProfileDisplayName = saveProfileDisplayName;
  window.enableProfileNameEditing = enableProfileNameEditing;
  window.cancelProfileNameEditing = cancelProfileNameEditing;
  window.applyDrawerCurrency = applyDrawerCurrency;
  window.toggleBannerPresetPicker = toggleBannerPresetPicker;
  window.toggleAvatarPresetPicker = toggleAvatarPresetPicker;
  window.selectBannerPreset = selectBannerPreset;
  window.selectAvatarPreset = selectAvatarPreset;
  window.handleAvatarFileInput = handleAvatarFileInput;
  window.handleBannerFileInput = handleBannerFileInput;
  window.executeProfilePinUpdate = executeProfilePinUpdate;
  window.toggleProfilePinForm = toggleProfilePinForm;
  window.toggleProfileNotifications = toggleProfileNotifications;
  window.cancelProfilePinUpdate = cancelProfilePinUpdate;
  window.handleNotificationClick = handleNotificationClick;
  window.markAllNotificationsRead = markAllNotificationsRead;
  window.requestChromePushPermission = requestChromePushPermission;
  window.testChromePushNotification = testChromePushNotification;
  window.renderProfileDrawer = renderProfileDrawer;

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
  window.selectComboRedeemOption = selectComboRedeemOption;
  window.toggleRewardSpecs = toggleRewardSpecs;
  window.toggleModalProductSpecs = toggleModalProductSpecs;
  window.openProductSpecsModal = openProductSpecsModal;
  window.closeProductSpecsModal = closeProductSpecsModal;
  window.specsModalNextImage = specsModalNextImage;
  window.specsModalPrevImage = specsModalPrevImage;
  window.setSpecsModalImageIndex = setSpecsModalImageIndex;
  window.initSpecsCarouselSwipe = initSpecsCarouselSwipe;
  window.openLightboxFromSpecs = openLightboxFromSpecs;
  window.shareProduct = shareProduct;
  window.updateSpecsModalCalculation = updateSpecsModalCalculation;
  window.submitProductComment = submitProductComment;
  window.loadProductComments = loadProductComments;
  window.renderProductCommentsDom = renderProductCommentsDom;
  window.toggleCommentReplyForm = toggleCommentReplyForm;
  window.submitClientCommentReply = submitClientCommentReply;
  window.openImageLightbox = openImageLightbox;
  window.closeImageLightbox = closeImageLightbox;
  window.lightboxNextImage = lightboxNextImage;
  window.lightboxPrevImage = lightboxPrevImage;
  window.setLightboxImageIndex = setLightboxImageIndex;
  window.toggleLightboxZoom = toggleLightboxZoom;
  window.executeRedeem = executeRedeem;
  window.closeRedeemModal = closeRedeemModal;
  window.onPointsSliderChange = onPointsSliderChange;
  window.onPointsNumChange = onPointsNumChange;
  window.setPointsPreset = setPointsPreset;

  window.showVoucherModal = showVoucherModal;
  window.closeVoucherModal = closeVoucherModal;
  window.switchVoucherSubTab = switchVoucherSubTab;
  window.promptCancelCurrentVoucher = promptCancelCurrentVoucher;
  window.promptCancelVoucher = promptCancelVoucher;
  window.closeCancelVoucherModal = closeCancelVoucherModal;
  window.executeCancelVoucher = executeCancelVoucher;
  window.copyMemberCode = copyMemberCode;
  window.copyVoucherCode = copyVoucherCode;
  window.setAppCurrency = setAppCurrency;
  window.showToast = showToast;

  // Handlers del Modal de Preventa y Cédula (M3)
  window.openPreOrderModal = openPreOrderModal;
  window.openReservationModal = openReservationModal;
  window.closePreOrderModal = closePreOrderModal;
  window.submitPreOrderReservation = submitPreOrderReservation;
  window.initPreOrderModalForProduct = openPreOrderModal;

  // Inicializar máscara telefónica en campos de acceso
  attachPhoneMask(document.getElementById("login-phone"));
  attachPhoneMask(document.getElementById("reg-phone"));

  // Iniciar ViewModel
  vm.init();

  // Inicializar Service Worker para Google Chrome (Push & Móvil)
  PushNotificationService.registerServiceWorker();

  // Abrir producto directamente si el usuario tocó una notificación de Chrome con openReward
  const urlParams = new URLSearchParams(window.location.search);
  const openRewardId = urlParams.get("openReward");
  if (openRewardId) {
    setTimeout(() => {
      if (typeof window.openProductSpecsModal === "function") {
        window.openProductSpecsModal(openRewardId);
      }
    }, 450);
  }

  // Badge visual en entorno de pruebas (SANDBOX)
  injectEnvironmentBadge();

  // Prevenir zoom accidental de página con gestos multitáctiles (pellizco con dos dedos)
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 1) {
      const target = e.target;
      if (target && target.closest("#lightbox-viewport")) return;
      e.preventDefault();
    }
  }, { passive: false });
});

export {
  openPreOrderModal,
  openReservationModal,
  closePreOrderModal,
  submitPreOrderReservation
};
