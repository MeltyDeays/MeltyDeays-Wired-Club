/**
 * Subcontrolador: Drawer Lateral de Perfil Móvil, Personalización y Notificaciones
 * The Wired Club - Mobile Experience (v2026)
 */
import { FirestoreService } from "../../services/FirestoreService.js";
import { PushNotificationService } from "../../services/PushNotificationService.js";

let vm = null;
let showToast = () => {};
let openAuthModal = () => {};
let setAppCurrency = () => {};
let openClientCameraScanner = () => {};
let openClaimModal = () => {};
let isPinFormOpen = false;

export function initCustomerProfileDrawer(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.openAuthModal) openAuthModal = deps.openAuthModal;
    if (deps.setAppCurrency) setAppCurrency = deps.setAppCurrency;
    if (deps.openClientCameraScanner) openClientCameraScanner = deps.openClientCameraScanner;
    if (deps.openClaimModal) openClaimModal = deps.openClaimModal;
  }
}

// Presets de imágenes de avatar y portadas temáticas
export const AVATAR_PRESETS = [
  { id: "lain", label: "Lain", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80" },
  { id: "cyber", label: "Cyber Girl", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" },
  { id: "runner", label: "Runner", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80" },
  { id: "hacker", label: "Tech", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80" }
];

export const BANNER_PRESETS = [
  { id: "neon", label: "Neon Grid", url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=900&q=80" },
  { id: "shibuya", label: "Cyber City", url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80" },
  { id: "circuit", label: "Dark Circuit", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80" },
  { id: "wired", label: "Glie Sky", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80" }
];

export function openMobileProfileDrawer() {
  const drawer = document.getElementById("drawer-mobile-profile");
  const overlay = document.getElementById("drawer-profile-overlay");
  const fab = document.getElementById("fab-mobile-menu");
  if (!drawer) return;

  if (fab) fab.style.display = "none";
  renderProfileDrawer();
  drawer.classList.add("open");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeMobileProfileDrawer() {
  const drawer = document.getElementById("drawer-mobile-profile");
  const overlay = document.getElementById("drawer-profile-overlay");
  const fab = document.getElementById("fab-mobile-menu");
  if (!drawer) return;

  cancelProfilePinUpdate(false);
  drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  if (fab) fab.style.display = "";
  document.body.style.overflow = "";
}

export function renderProfileDrawer() {
  const user = vm ? vm.currentUser : null;
  const drawerContent = document.getElementById("drawer-profile-body");
  if (!drawerContent) return;

  // Actualizar badge de notificaciones en el botón flotante / header
  updateNotificationsBadge();

  if (!user) {
    drawerContent.innerHTML = `
      <div class="drawer-guest-box">
        <div class="drawer-guest-icon">👤</div>
        <h3 class="drawer-guest-title">THE WIRED CLUB</h3>
        <p class="drawer-guest-desc">Inicia sesión con tu teléfono o crea tu CyberPass para canjear recompensas, consultar tus puntos y personalizar tu perfil de socio.</p>
        <button type="button" class="btn-primary drawer-auth-btn" onclick="closeMobileProfileDrawer(); openAuthModal('login');">
          ⚡ INICIAR SESIÓN / REGISTRO
        </button>
        <div class="drawer-quick-actions" style="margin-top: 1.5rem;">
          <button type="button" class="drawer-action-btn" onclick="closeMobileProfileDrawer(); openClientCameraScanner();">
            <span>📷</span> <span>Escanear QR de Factura</span>
          </button>
          <button type="button" class="drawer-action-btn" onclick="closeMobileProfileDrawer(); openClaimModal();">
            <span>➕</span> <span>Reclamar Factura Manual</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  const currentCurrency = (vm.preferredCurrency || user.currency || "USD").toUpperCase();
  const avatarUrl = user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";
  const bannerUrl = user.bannerUrl || "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=900&q=80";
  const userNotifications = getComputedUserNotifications(user);
  const unreadCount = userNotifications.filter(n => !n.read).length;
  const pushPerm = PushNotificationService.getPermission();
  const isPushGranted = pushPerm === "granted";

  drawerContent.innerHTML = `
    <!-- CABECERA DE PERFIL: BANNER + AVATAR -->
    <div class="profile-banner-wrap" style="background-image: url('${bannerUrl}');">
      <div class="profile-banner-overlay"></div>
      <button type="button" class="btn-edit-banner" onclick="toggleBannerPresetPicker()" title="Cambiar imagen de portada">
        <span>🖼️ Cambiar Fondo</span>
      </button>
      <div class="banner-presets-dropdown" id="banner-presets-dropdown" style="display:none;">
        <div class="presets-grid">
          ${BANNER_PRESETS.map(b => `
            <div class="preset-item" onclick="selectBannerPreset('${b.url}')" style="background-image: url('${b.url}');">
              <span>${b.label}</span>
            </div>
          `).join("")}
        </div>
        <label class="preset-upload-label">
          📁 Subir mi propia imagen
          <input type="file" accept="image/*" style="display:none;" onchange="handleBannerFileInput(this)">
        </label>
      </div>

      <div class="profile-avatar-wrap">
        <img src="${avatarUrl}" alt="Avatar" class="profile-avatar-img" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'">
        <button type="button" class="btn-edit-avatar" onclick="toggleAvatarPresetPicker()" title="Cambiar foto de perfil">
          📷
        </button>
        <div class="avatar-presets-dropdown" id="avatar-presets-dropdown" style="display:none;">
          <div class="avatar-presets-grid">
            ${AVATAR_PRESETS.map(a => `
              <img src="${a.url}" class="avatar-preset-opt" onclick="selectAvatarPreset('${a.url}')" title="${a.label}">
            `).join("")}
          </div>
          <label class="preset-upload-label" style="font-size: 0.65rem; margin-top: 4px;">
            📁 Subir foto
            <input type="file" accept="image/*" style="display:none;" onchange="handleAvatarFileInput(this)">
          </label>
        </div>
      </div>
    </div>

    <!-- DATOS DE SOCIO -->
    <div class="profile-info-block">
      <div class="profile-name-row">
        <input type="text" id="input-profile-name" class="profile-name-input" value="${escapeHtml(user.displayName)}" placeholder="Tu nombre">
        <button type="button" class="btn-save-name" onclick="saveProfileDisplayName()" title="Guardar cambios de nombre">
          💾 Guardar
        </button>
      </div>
      <div class="profile-meta-badges">
        <span class="profile-tier-badge">${user.tier || 'NAVI_USER'}</span>
        <span class="profile-code-badge">${user.memberCode || 'MC-DEMO'}</span>
        <span class="profile-pts-badge">${user.wiredPoints.toLocaleString()} WP</span>
      </div>
    </div>

    <!-- SELECTOR DE MONEDA CON PERSISTENCIA EN BD -->
    <div class="drawer-section">
      <div class="drawer-section-title">
        <span>💵 MONEDA PREFERIDA (PERSISTENTE)</span>
        <span class="section-tag-live">SYNC BD</span>
      </div>
      <div class="profile-currency-selector">
        <button type="button" class="currency-chip ${currentCurrency === 'USD' ? 'active' : ''}" onclick="applyDrawerCurrency('USD')">
          <span class="chip-symbol">$</span>
          <span class="chip-text">Dólares (USD)</span>
        </button>
        <button type="button" class="currency-chip ${currentCurrency === 'NIO' ? 'active' : ''}" onclick="applyDrawerCurrency('NIO')">
          <span class="chip-symbol">C$</span>
          <span class="chip-text">Córdobas (NIO · 1:37)</span>
        </button>
      </div>
      <div class="profile-field-hint">Tu preferencia se guardará en tu cuenta y se mantendrá en todos tus dispositivos.</div>
    </div>

    <!-- CENTRO DE NOTIFICACIONES -->
    <div class="drawer-section">
      <div class="drawer-section-header">
        <div class="drawer-section-title">
          <span>🔔 NOTIFICACIONES</span>
          ${unreadCount > 0 ? `<span class="notifications-count-badge">${unreadCount} NUEVAS</span>` : ''}
        </div>
        ${unreadCount > 0 ? `
          <button type="button" class="btn-mark-all-read" onclick="markAllNotificationsRead()" title="Marcar todas como leídas">
            Marcar leídas
          </button>
        ` : ''}
      </div>

      <!-- LISTA DE NOTIFICACIONES INTERACTIVAS -->
      <div class="profile-notifications-list">
        ${userNotifications.map(n => `
          <div class="profile-notification-card ${n.read ? 'read' : 'unread'}" onclick="handleNotificationClick('${n.id}')" title="${n.read ? 'Notificación leída (Tocar para ver)' : 'Tocar para ir directamente al producto'}">
            <div class="notif-icon-col">${n.icon}</div>
            <div class="notif-body-col">
              <div class="notif-title-row">
                <span class="notif-title">${n.title}</span>
                <div style="display: flex; align-items: center; gap: 4px;">
                  ${!n.read ? '<span class="notif-unread-dot" title="No leída">●</span>' : ''}
                  <span class="notif-time">${n.time}</span>
                </div>
              </div>
              <div class="notif-desc">${n.desc}</div>
              <div class="notif-action-row">
                ${n.badgeText ? `<span class="notif-badge-pill">${n.badgeText}</span>` : ''}
                ${n.targetRewardId ? `<span class="notif-link-hint">Ver producto ➔</span>` : ''}
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- NOTIFICACIONES WEB PUSH EN GOOGLE CHROME (MÓVIL / SISTEMA) -->
      <div class="chrome-push-box ${isPushGranted ? 'granted' : 'pending'}" style="margin-top: 0.75rem;">
        <div class="chrome-push-header">
          <span class="chrome-push-icon">${isPushGranted ? '🟢' : '📲'}</span>
          <span class="chrome-push-title">${isPushGranted ? 'Avisos en Google Chrome: ACTIVOS' : 'Avisos en Google Chrome (Móvil)'}</span>
        </div>
        <div class="chrome-push-desc">
          ${isPushGranted 
            ? 'Recibirás avisos en tu teléfono sobre nuevos artículos y descuentos en MeltyDeays aunque tengas otra aplicación abierta.'
            : 'Activa los avisos de Chrome para enterarte inmediatamente cuando hayan nuevos productos o promociones especiales en tu teléfono.'}
        </div>
        ${isPushGranted ? `
          <button type="button" class="btn-chrome-push-test" onclick="testChromePushNotification()">
            🔔 Probar aviso en mi teléfono
          </button>
        ` : `
          <button type="button" class="btn-chrome-push-enable" onclick="requestChromePushPermission()">
            ⚡ Activar Avisos en Chrome
          </button>
        `}
      </div>
    </div>

    <!-- SEGURIDAD: ACTUALIZAR PIN CON CANCELAR MEJORADO -->
    <div class="drawer-section">
      <div class="profile-security-header" onclick="toggleProfilePinForm()">
        <div class="drawer-section-title" style="margin: 0; cursor: pointer;">
          <span>🔒 SEGURIDAD Y PIN</span>
        </div>
        <button type="button" class="btn-toggle-pin-form ${isPinFormOpen ? 'active' : ''}" id="btn-toggle-pin-form" onclick="event.stopPropagation(); toggleProfilePinForm();">
          <span id="pin-toggle-label">${isPinFormOpen ? '✕ Cancelar' : '🔑 Cambiar PIN'}</span>
          <span id="pin-toggle-icon">${isPinFormOpen ? '▴' : '▾'}</span>
        </button>
      </div>

      <div id="profile-pin-form-body" class="profile-security-form-box" style="display: ${isPinFormOpen ? 'block' : 'none'};">
        <div class="form-group-compact">
          <label>PIN Actual:</label>
          <input type="password" id="input-pin-current" class="profile-pin-input" maxlength="8" placeholder="••••">
        </div>
        <div class="form-group-compact">
          <label>Nuevo PIN (4 a 8 dígitos):</label>
          <input type="password" id="input-pin-new" class="profile-pin-input" maxlength="8" placeholder="Nuevo PIN">
        </div>
        <div class="form-group-compact">
          <label>Confirmar Nuevo PIN:</label>
          <input type="password" id="input-pin-confirm" class="profile-pin-input" maxlength="8" placeholder="Confirmar nuevo PIN">
        </div>
        <div class="pin-actions-row">
          <button type="button" class="btn-primary btn-save-pin" onclick="executeProfilePinUpdate()">
            ✓ Guardar PIN
          </button>
          <button type="button" class="btn-secondary btn-cancel-pin" onclick="cancelProfilePinUpdate(true)">
            ✕ Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- ACCIONES RÁPIDAS Y CERRAR SESIÓN -->
    <div class="drawer-section" style="border-bottom: none; margin-bottom: 2rem;">
      <div class="drawer-quick-actions">
        <button type="button" class="drawer-action-btn" onclick="closeMobileProfileDrawer(); openClientCameraScanner();">
          <span>📷</span> <span>Escanear QR de Factura</span>
        </button>
        <button type="button" class="drawer-action-btn" onclick="closeMobileProfileDrawer(); openClaimModal();">
          <span>➕</span> <span>Reclamar Factura Manual</span>
        </button>
        <button type="button" class="drawer-action-btn btn-danger-action" onclick="closeMobileProfileDrawer(); logoutClient();">
          <span>🚪</span> <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  `;
}

export function toggleProfilePinForm() {
  isPinFormOpen = !isPinFormOpen;
  const formBody = document.getElementById("profile-pin-form-body");
  const toggleBtn = document.getElementById("btn-toggle-pin-form");
  if (formBody) {
    formBody.style.display = isPinFormOpen ? "block" : "none";
  }
  if (toggleBtn) {
    toggleBtn.innerHTML = isPinFormOpen
      ? `<span>✕ Cancelar</span> <span>▴</span>`
      : `<span>🔑 Cambiar PIN</span> <span>▾</span>`;
    if (isPinFormOpen) {
      toggleBtn.classList.add("active");
    } else {
      toggleBtn.classList.remove("active");
    }
  }
}

export function cancelProfilePinUpdate(showAlert = true) {
  isPinFormOpen = false;
  const curEl = document.getElementById("input-pin-current");
  const newEl = document.getElementById("input-pin-new");
  const confEl = document.getElementById("input-pin-confirm");
  const formBody = document.getElementById("profile-pin-form-body");
  const toggleBtn = document.getElementById("btn-toggle-pin-form");

  if (curEl) curEl.value = "";
  if (newEl) newEl.value = "";
  if (confEl) confEl.value = "";
  if (formBody) formBody.style.display = "none";
  if (toggleBtn) {
    toggleBtn.innerHTML = `<span>🔑 Cambiar PIN</span> <span>▾</span>`;
    toggleBtn.classList.remove("active");
  }
  if (showAlert) {
    showToast("Modificación de PIN cancelada", "info");
  }
}

export async function saveProfileDisplayName() {
  if (!vm || !vm.currentUser) return;
  const input = document.getElementById("input-profile-name");
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    showToast("Por favor ingresa un nombre válido", "error");
    return;
  }

  vm.currentUser.displayName = newName;
  try {
    await FirestoreService.saveUser(vm.currentUser.toJSON());
    vm.notify();
    showToast("✓ Nombre de socio actualizado exitosamente", "success");
    renderProfileDrawer();
  } catch (e) {
    showToast("Error al guardar: " + e.message, "error");
  }
}

export async function applyDrawerCurrency(newCurr) {
  if (!vm) return;
  try {
    await vm.setCurrency(newCurr);
    if (vm.currentUser) {
      vm.currentUser.setCurrency(newCurr);
      await FirestoreService.saveUser(vm.currentUser.toJSON());
    }
    showToast(`✓ Moneda establecida a ${newCurr} y guardada en tu cuenta`, "success");
    renderProfileDrawer();
  } catch (e) {
    showToast("Error al actualizar moneda: " + e.message, "error");
  }
}

export function toggleBannerPresetPicker() {
  const el = document.getElementById("banner-presets-dropdown");
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

export function toggleAvatarPresetPicker() {
  const el = document.getElementById("avatar-presets-dropdown");
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

export async function selectBannerPreset(url) {
  if (!vm || !vm.currentUser) return;
  vm.currentUser.bannerUrl = url;
  try {
    await FirestoreService.saveUser(vm.currentUser.toJSON());
    showToast("✓ Fondo de portada actualizado", "success");
    renderProfileDrawer();
  } catch (e) {
    showToast("Error al guardar fondo: " + e.message, "error");
  }
}

export async function selectAvatarPreset(url) {
  if (!vm || !vm.currentUser) return;
  vm.currentUser.avatarUrl = url;
  try {
    await FirestoreService.saveUser(vm.currentUser.toJSON());
    showToast("✓ Foto de perfil actualizada", "success");
    renderProfileDrawer();
  } catch (e) {
    showToast("Error al guardar foto: " + e.message, "error");
  }
}

export function handleAvatarFileInput(input) {
  if (!input.files || !input.files[0]) return;
  compressAndSaveImage(input.files[0], 240, 240, async (base64) => {
    if (!vm || !vm.currentUser) return;
    vm.currentUser.avatarUrl = base64;
    try {
      await FirestoreService.saveUser(vm.currentUser.toJSON());
      showToast("✓ Foto de perfil actualizada", "success");
      renderProfileDrawer();
    } catch (e) {
      showToast("Error al guardar imagen: " + e.message, "error");
    }
  });
}

export function handleBannerFileInput(input) {
  if (!input.files || !input.files[0]) return;
  compressAndSaveImage(input.files[0], 700, 260, async (base64) => {
    if (!vm || !vm.currentUser) return;
    vm.currentUser.bannerUrl = base64;
    try {
      await FirestoreService.saveUser(vm.currentUser.toJSON());
      showToast("✓ Fondo de portada actualizado", "success");
      renderProfileDrawer();
    } catch (e) {
      showToast("Error al guardar imagen: " + e.message, "error");
    }
  });
}

function compressAndSaveImage(file, maxW, maxH, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export async function executeProfilePinUpdate() {
  if (!vm || !vm.currentUser) return;
  const curEl = document.getElementById("input-pin-current");
  const newEl = document.getElementById("input-pin-new");
  const confEl = document.getElementById("input-pin-confirm");

  const currentPin = curEl ? curEl.value.trim() : "";
  const newPin = newEl ? newEl.value.trim() : "";
  const confirmPin = confEl ? confEl.value.trim() : "";

  if (!currentPin) {
    showToast("Ingresa tu PIN actual", "error");
    return;
  }
  if (currentPin !== String(vm.currentUser.pin)) {
    showToast("El PIN actual es incorrecto", "error");
    return;
  }
  if (newPin.length < 4 || newPin.length > 8) {
    showToast("El nuevo PIN debe tener entre 4 y 8 dígitos", "error");
    return;
  }
  if (newPin !== confirmPin) {
    showToast("Los nuevos PIN no coinciden", "error");
    return;
  }

  vm.currentUser.pin = newPin;
  try {
    await FirestoreService.saveUser(vm.currentUser.toJSON());
    showToast("✓ PIN de seguridad actualizado con éxito", "success");
    cancelProfilePinUpdate(false);
  } catch (e) {
    showToast("Error al actualizar PIN: " + e.message, "error");
  }
}

function getComputedUserNotifications(user) {
  const readList = JSON.parse(localStorage.getItem("melty_read_notifications") || "[]");
  const pts = user ? (user.wiredPoints || 0) : 0;
  
  const notifs = [
    {
      id: "notif-pts-discount",
      icon: "🏷️",
      title: "Descuentos Disponibles",
      desc: pts > 0 ? `Tienes ${pts.toLocaleString()} Wired Points listos para aplicar hasta un 57% de descuento en el catálogo.` : "Acumula puntos en tus compras para canjear descuentos exclusivos.",
      time: "Hoy",
      targetRewardId: "REW-DEMO-03",
      badgeText: "57% OFF",
      read: readList.includes("notif-pts-discount")
    },
    {
      id: "notif-new-items",
      icon: "🎁",
      title: "Nuevos Artículos Demo",
      desc: "Mando Hall Effect GameSir Nova Lite y Teclado Mecánico Gasket 65% ya disponibles en el club.",
      time: "Ayer",
      targetRewardId: "REW-DEMO-04",
      badgeText: "NUEVO",
      read: readList.includes("notif-new-items")
    },
    {
      id: "notif-pass-status",
      icon: "⚡",
      title: "CyberPass Activo",
      desc: `Socio ${user?.displayName || 'Socio'} (${user?.tier || 'NAVI_USER'}) verificado en The Wired Club.`,
      time: "Reciente",
      targetRewardId: null,
      badgeText: "ACTIVO",
      read: readList.includes("notif-pass-status")
    }
  ];

  return notifs;
}

export function handleNotificationClick(notifId) {
  const readList = JSON.parse(localStorage.getItem("melty_read_notifications") || "[]");
  if (!readList.includes(notifId)) {
    readList.push(notifId);
    localStorage.setItem("melty_read_notifications", JSON.stringify(readList));
  }
  updateNotificationsBadge();

  const user = vm ? vm.currentUser : null;
  const notifs = getComputedUserNotifications(user);
  const notif = notifs.find(n => n.id === notifId);

  // Cerrar el drawer primero
  closeMobileProfileDrawer();

  // Si tiene un producto destino, abrir directamente su vista detallada
  if (notif && notif.targetRewardId) {
    setTimeout(() => {
      if (typeof window.openProductSpecsModal === "function") {
        window.openProductSpecsModal(notif.targetRewardId);
      }
    }, 200);
  } else {
    showToast("✓ " + (notif ? notif.title : "Notificación leída"), "info");
  }
}

export function markAllNotificationsRead() {
  const user = vm ? vm.currentUser : null;
  const notifs = getComputedUserNotifications(user);
  const notifIds = notifs.map(n => n.id);
  localStorage.setItem("melty_read_notifications", JSON.stringify(notifIds));
  updateNotificationsBadge();
  showToast("✓ Todas las notificaciones marcadas como leídas", "info");
  renderProfileDrawer();
}

export function updateNotificationsBadge() {
  const user = vm ? vm.currentUser : null;
  let unread = 0;
  if (user) {
    const list = getComputedUserNotifications(user);
    unread = list.filter(n => !n.read).length;
  }

  const badgeEls = document.querySelectorAll(".drawer-notif-badge-indicator");
  badgeEls.forEach(el => {
    if (unread > 0) {
      el.textContent = unread;
      el.style.display = "inline-flex";
    } else {
      el.textContent = "0";
      el.style.display = "none";
    }
  });
}

export async function requestChromePushPermission() {
  const res = await PushNotificationService.requestPermission();
  if (res === "granted") {
    showToast("✓ ¡Avisos de Google Chrome activados con éxito!", "success");
    await PushNotificationService.sendNotification({
      title: "⚡ MeltyDeays · The Wired Club",
      body: "🎉 ¡Avisos en Chrome activados! Te avisaremos de nuevos productos y descuentos gaming en tu teléfono.",
      rewardId: "REW-DEMO-03"
    });
    renderProfileDrawer();
  } else if (res === "denied") {
    showToast("Las notificaciones están bloqueadas en tu Google Chrome. Habilítalas en Configuración de sitios.", "error");
  }
}

export async function testChromePushNotification() {
  const sent = await PushNotificationService.sendNotification({
    title: "🔥 ¡Novedades MeltyDeays!",
    body: "🎮 Mouse Gamer Óptico RGB y Teclado 65% con hasta 57% OFF disponibles en The Wired Club.",
    rewardId: "REW-DEMO-03"
  });
  if (sent) {
    showToast("✓ Aviso enviado a tu teléfono vía Google Chrome", "success");
  } else {
    showToast("No se pudo enviar. Verifica los permisos de tu navegador.", "error");
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
