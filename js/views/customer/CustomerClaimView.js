/**
 * Vista / Subcontrolador: Auto-Reclamo de Puntos, Escáner QR de Cliente y Carga Rápida en Caja (The Wired Club)
 */
import { getStorageKey } from "../../config/env.js";

let vm = null;
let showToast = () => {};
let openAuthModal = () => {};

export function initCustomerClaimView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.openAuthModal) openAuthModal = deps.openAuthModal;
  }
}

export function openClaimModal() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión con tu WhatsApp para acreditar tus Wired Points.");
    return;
  }
  const modal = document.getElementById("modal-manual-claim");
  if (modal) modal.style.display = "flex";
}

export function closeClaimModal() {
  const modal = document.getElementById("modal-manual-claim");
  if (modal) modal.style.display = "none";
}

export async function submitManualClaim() {
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

export async function handleClientQrScanned(decodedText) {
  stopClientCameraScanner();
  let raw = (decodedText || "").trim();
  let tokenCode = "";

  if (raw.includes("claim=")) {
    const candidate = raw.split("claim=")[1].split("&")[0];
    if (candidate && candidate.toLowerCase() !== "undefined" && candidate.toLowerCase() !== "null") {
      tokenCode = candidate;
    }
  }

  if (!tokenCode && raw.startsWith("WP-")) {
    tokenCode = raw;
  }

  if (!tokenCode) {
    const match = raw.match(/WP-[A-Z0-9-]+/i);
    if (match) tokenCode = match[0];
  }

  tokenCode = (tokenCode || "").trim().toUpperCase();

  if (!tokenCode || tokenCode === "UNDEFINED" || tokenCode === "NULL" || tokenCode.length < 5 || !tokenCode.startsWith("WP-")) {
    showToast("El código escaneado no corresponde a una factura MeltyDeays válida.", "error");
    return;
  }

  vm.pendingClaimToken = tokenCode;

  if (!vm.currentUser) {
    showToast(`⚡ Factura detectada [${tokenCode}]. Inicia sesión o regístrate para acreditar tus puntos.`, "info");
    openAuthModal("login", "Inicia sesión con tu WhatsApp para acreditar los puntos de tu factura escaneada.");
    if (vm && typeof vm.notify === 'function') vm.notify();
    return;
  }

  // Usuario autenticado: acreditar de inmediato sin pedir PIN
  try {
    showToast("Acreditando puntos de tu factura...", "info");
    const res = await vm.claimToken(tokenCode, null, true);
    showToast(`¡Puntos acreditados con éxito! +${res.pointsAdded} WP. Saldo: ${res.newBalance} WP`, "success");
    dismissClaimBanner();
    if (vm && typeof vm.notify === 'function') vm.notify();
  } catch (err) {
    showToast(err.message || "No se pudo acreditar la factura", "error");
    dismissClaimBanner();
    if (vm && typeof vm.notify === 'function') vm.notify();
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

export async function claimFromBanner() {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión o regístrate con tu WhatsApp para reclamar tus puntos de factura.");
    return;
  }

  try {
    const res = await vm.claimPendingToken();
    showToast("¡Puntos acreditados con éxito! +" + res.pointsAdded + " WP (Saldo: " + res.newBalance + " WP)", "success");
    dismissClaimBanner();
    if (vm && typeof vm.notify === 'function') vm.notify();
  } catch (err) {
    showToast(err.message || "No se pudo acreditar el código", "error");
    dismissClaimBanner();
    if (vm && typeof vm.notify === 'function') vm.notify();
  }
}


export function openAdminAssignModal() {
  const modal = document.getElementById("modal-admin-assign-scan");
  const folioEl = document.getElementById("assign-scan-folio");
  const ptsInput = document.getElementById("assign-scan-points");
  const pinInput = document.getElementById("assign-scan-admin-pin");

  if (folioEl && vm.pendingClaimToken) {
    folioEl.textContent = vm.pendingClaimToken;
  }
  if (ptsInput) ptsInput.value = "";
  if (pinInput) {
    const isAuth = localStorage.getItem(getStorageKey("melty_admin_session")) === "AUTHENTICATED";
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

export function closeAdminAssignModal() {
  const modal = document.getElementById("modal-admin-assign-scan");
  if (modal) modal.style.display = "none";
}

export async function submitAdminAssignFromScan() {
  const pinInput = document.getElementById("assign-scan-admin-pin");
  const ptsInput = document.getElementById("assign-scan-points");
  const points = Number(ptsInput ? ptsInput.value : 0);
  const pin = (pinInput ? pinInput.value : "").trim();

  const isAuth = localStorage.getItem(getStorageKey("melty_admin_session")) === "AUTHENTICATED";
  if (!isAuth && pin !== "110805") {
    showToast("PIN de administrador incorrecto", "error");
    return;
  }

  if (points <= 0) {
    showToast("Ingresa una cantidad de puntos válida mayor a 0", "info");
    return;
  }

  try {
    const { FirestoreService } = await import("../../services/FirestoreService.js");
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

    if (vm && typeof vm.notify === 'function') vm.notify();
  } catch (err) {
    showToast("Error al guardar puntos: " + err.message, "error");
  }
}
