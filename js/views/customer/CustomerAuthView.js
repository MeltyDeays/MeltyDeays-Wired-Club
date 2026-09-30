/**
 * Vista / Subcontrolador: Autenticación, Registro y Credenciales de Cliente (The Wired Club)
 */
import { FirestoreService } from "../../services/FirestoreService.js";

let vm = null;
let showToast = () => {};
let attachPhoneMask = () => {};

export function initCustomerAuthView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.attachPhoneMask) attachPhoneMask = deps.attachPhoneMask;
  }
}

export function setAuthFeedback(message, type = "info") {
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

export function renderUserQr(text) {
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

export function openAuthModal(tab = "login", feedback = null) {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "flex";
  switchAuthTab(tab);
  if (feedback) {
    setAuthFeedback(feedback, "info");
  } else {
    setAuthFeedback(null);
  }
}

export function closeAuthModal() {
  const modal = document.getElementById("modal-client-auth");
  if (modal) modal.style.display = "none";
  setAuthFeedback(null);
}

export function switchAuthTab(tab) {
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

export function toggleClientPinVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

export async function submitClientLogin() {
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

export async function submitClientRegister() {
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

export function logoutClient() {
  vm.logout();
  showToast("Sesión cerrada correctamente", "info");
}


export function copyMemberCode() {
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
