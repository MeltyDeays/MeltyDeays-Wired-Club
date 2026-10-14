/* Controller: Portal de Clientes (The Wired Club) */
import { CustomerViewModel } from "./viewmodels/CustomerViewModel.js";
import { FirestoreService } from "./services/FirestoreService.js";
import { injectEnvironmentBadge } from "./config/env.js";
import { roundToCleanNio } from "./utils/PriceNormalizer.js";

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
  animatePointsRefund,
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

export function formatNio(num) {
  const n = Number(num) || 0;
  // En Nicaragua los precios en Córdobas siempre se manejan en enteros limpios
  if (Math.abs(n - Math.round(n)) < 0.25 || n >= 10) {
    return Math.round(n).toLocaleString("en-US");
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUsd(num) {
  const n = Number(num) || 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPrice(amountUsd, explicitNio = null, isBasePrice = false) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  const numUsd = Number(amountUsd) || 0;
  if (curr === "NIO") {
    let valNio = 0;
    if (explicitNio != null && Number(explicitNio) > 0) {
      valNio = Number(explicitNio);
    } else {
      valNio = numUsd * USD_TO_NIO_RATE;
      if (isBasePrice) {
        valNio = roundToCleanNio(valNio);
      } else {
        valNio = Math.round(valNio);
      }
    }
    return `C$ ${formatNio(valNio)} NIO`;
  }
  return `$${formatUsd(numUsd)} USD`;
}

export function formatDualPrice(amountUsd, explicitNio = null, isBasePrice = false) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  const usd = Number(amountUsd) || 0;
  let nio = 0;
  if (explicitNio != null && Number(explicitNio) > 0) {
    nio = Number(explicitNio);
  } else {
    nio = isBasePrice ? roundToCleanNio(usd * USD_TO_NIO_RATE) : Math.round(usd * USD_TO_NIO_RATE);
  }
  const formattedUsd = formatUsd(usd);
  const formattedNio = formatNio(nio);
  if (curr === "NIO") {
    return `<strong>C$ ${formattedNio} NIO</strong> <span style="font-size:0.75rem; color:#64748b; font-weight:600;">($${formattedUsd} USD)</span>`;
  }
  return `<strong>$${formattedUsd} USD</strong> <span style="font-size:0.75rem; color:#64748b; font-weight:600;">(C$ ${formattedNio} NIO)</span>`;
}

export function formatDualPricePlain(amountUsd, explicitNio = null, isBasePrice = false) {
  const curr = (vm && vm.preferredCurrency) ? vm.preferredCurrency : "USD";
  const usd = Number(amountUsd) || 0;
  let nio = 0;
  if (explicitNio != null && Number(explicitNio) > 0) {
    nio = Number(explicitNio);
  } else {
    nio = isBasePrice ? roundToCleanNio(usd * USD_TO_NIO_RATE) : Math.round(usd * USD_TO_NIO_RATE);
  }
  const formattedUsd = formatUsd(usd);
  const formattedNio = formatNio(nio);
  if (curr === "NIO") {
    return `C$ ${formattedNio} NIO ($${formattedUsd} USD)`;
  }
  return `$${formattedUsd} USD (C$ ${formattedNio} NIO)`;
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
        passUsdEquiv.innerHTML = `C$ ${formatNio(equivNio)} NIO <span style="font-size:0.75rem; color:#64748b; font-weight:700;">($${formatUsd(equivUsd)} USD)</span>`;
      } else {
        passUsdEquiv.innerHTML = `$${formatUsd(equivUsd)} USD <span style="font-size:0.75rem; color:#64748b; font-weight:700;">(C$ ${formatNio(equivNio)} NIO)</span>`;
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
        passUsdEquiv.innerHTML = `C$ 0 NIO <span style="font-size:0.75rem; color:#64748b;">($0.00 USD)</span>`;
      } else {
        passUsdEquiv.innerHTML = `$0.00 USD <span style="font-size:0.75rem; color:#64748b;">(C$ 0 NIO)</span>`;
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

let renderScheduled = false;
let pendingRenderModel = null;
function resolvePendingDeepLink(model) {
  if (typeof window === "undefined") return;
  const pendingId = window._pendingSpecsModalProductId;
  if (pendingId && model && Array.isArray(model.catalog) && model.catalog.length > 0) {
    if (typeof window.openProductSpecsModal === "function") {
      window.openProductSpecsModal(pendingId);
    }
  }
}

function batchedRender(model) {
  pendingRenderModel = model;
  if (renderScheduled) return;
  renderScheduled = true;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      renderScheduled = false;
      render(pendingRenderModel);
      resolvePendingDeepLink(pendingRenderModel);
    });
  } else {
    renderScheduled = false;
    render(pendingRenderModel);
    resolvePendingDeepLink(pendingRenderModel);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Suscribirse a cambios en el ViewModel con renderizado unificado por frame
  vm.subscribe(batchedRender);

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
  window.animatePointsRefund = animatePointsRefund;
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

  // Soporte universal para Deep Linking (URL Hash #product-..., Query Params ?openReward=... / ?product=...)
  const handleInitialDeepLink = () => {
    let targetId = null;
    if (typeof window.extractDeepLinkProductId === "function") {
      targetId = window.extractDeepLinkProductId();
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      targetId = urlParams.get("openReward") || urlParams.get("product") || urlParams.get("reward") || urlParams.get("p");
      if (!targetId && window.location.hash) {
        const m = window.location.hash.match(/^#(?:product|reward|item|p)[-_:](.+)$/i);
        if (m && m[1]) targetId = decodeURIComponent(m[1].trim());
        else if (/^#(?:fb_|[a-zA-Z0-9_-]{6,})/i.test(window.location.hash)) {
          targetId = decodeURIComponent(window.location.hash.substring(1).trim());
        }
      }
    }
    if (targetId) {
      if (typeof window.openProductSpecsModal === "function") {
        window.openProductSpecsModal(targetId);
      } else {
        window._pendingSpecsModalProductId = targetId;
      }
    }
  };

  handleInitialDeepLink();

  // Badge visual en entorno de pruebas (SANDBOX)
  injectEnvironmentBadge();

  // Prevenir gestos accidentales sin bloquear el hilo compositor del scroll nativo
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: true });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: true });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: true });
});

export {
  openPreOrderModal,
  openReservationModal,
  closePreOrderModal,
  submitPreOrderReservation
};
