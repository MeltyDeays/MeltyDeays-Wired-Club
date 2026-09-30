/**
 * Vista / Subcontrolador: Terminal POS 1-Scan, Autenticación y Asignación de Puntos (The Wired Club)
 */
import { playAdminDispatchSound, triggerCyberDispatchGlitch } from "./AdminVouchersView.js";

let vm = null;
let showToast = () => {};
let closeModal = () => {};
let switchAdminTab = () => {};
let openAdjustPointsModal = () => {};
let openUserLedgerModal = () => {};

export function initAdminPosView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.switchAdminTab) switchAdminTab = deps.switchAdminTab;
    if (deps.openAdjustPointsModal) openAdjustPointsModal = deps.openAdjustPointsModal;
    if (deps.openUserLedgerModal) openUserLedgerModal = deps.openUserLedgerModal;
  }
}

let html5QrCodeScanner = null;

export function setPosFeedback(msg, type = "error") {
  const fb = document.getElementById("pos-feedback");
  if (!fb) {
    showToast(msg, type);
    return;
  }
  fb.className = "pos-feedback-banner " + type;
  fb.innerHTML = msg;
  fb.style.display = "block";
}

export function clearPosFeedback() {
  const fb = document.getElementById("pos-feedback");
  if (fb) fb.style.display = "none";
}

export function clearPosScanner() {
  const input = document.getElementById("input-scan-voucher");
  if (input) {
    input.value = "";
    input.focus();
  }
  clearPosFeedback();
}

let posAssignSuccessTimer = null;
let posAssignCountdownInterval = null;

export function clearPosAssignTimers() {
  if (posAssignSuccessTimer) {
    clearTimeout(posAssignSuccessTimer);
    posAssignSuccessTimer = null;
  }
  if (posAssignCountdownInterval) {
    clearInterval(posAssignCountdownInterval);
    posAssignCountdownInterval = null;
  }
}

export function closePosResult() {
  clearPosAssignTimers();
  const resultBox = document.getElementById("scan-result-box");
  const invoiceBox = document.getElementById("scan-invoice-box");
  const customerBox = document.getElementById("scan-customer-box");
  if (resultBox) resultBox.style.display = "none";
  if (invoiceBox) {
    invoiceBox.style.display = "none";
    const mainContent = document.getElementById("scan-invoice-main-content");
    const successView = document.getElementById("scan-invoice-success-view");
    if (mainContent) mainContent.style.display = "block";
    if (successView) successView.style.display = "none";
  }
  if (customerBox) customerBox.style.display = "none";
}


export async function startCameraScanner() {
  const modal = document.getElementById("modal-camera-scanner");
  if (modal) modal.style.display = "flex";

  if (typeof Html5Qrcode !== "undefined") {
    try {
      if (html5QrCodeScanner) {
        await html5QrCodeScanner.stop().catch(() => {});
        html5QrCodeScanner = null;
      }
      html5QrCodeScanner = new Html5Qrcode("camera-scanner-reader");
      await html5QrCodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopCameraScanner();
          const input = document.getElementById("input-scan-voucher");
          if (input) {
            input.value = decodedText.trim();
            verifyVoucherAdmin();
          }
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

export function stopCameraScanner() {
  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().catch(() => {}).finally(() => {
      html5QrCodeScanner = null;
    });
  }
  const modal = document.getElementById("modal-camera-scanner");
  if (modal) modal.style.display = "none";
}

export function submitAdminPin() {
  const input = document.getElementById("input-admin-pin");
  const pin = input ? input.value : "";
  const feedback = document.getElementById("lock-feedback");
  const success = vm.unlock(pin);
  if (!success) {
    if (feedback) {
      feedback.style.display = "block";
      feedback.className = "pos-feedback-banner error";
      feedback.innerHTML = "<strong>Acceso denegado:</strong> El PIN ingresado es incorrecto.";
    } else {
      showToast("❌ PIN Incorrecto. Acceso denegado.", "error");
    }
    if (input) {
      input.value = "";
      input.focus();
    }
  } else {
    if (feedback) feedback.style.display = "none";
  }
}

export function logoutAdmin() {
  vm.lock();
}

export async function verifyVoucherAdmin() {
  const input = document.getElementById("input-scan-voucher");
  let rawCode = (input ? input.value : "").trim();
  const group = document.getElementById("pos-input-group-wrapper");

  if (!rawCode) {
    setPosFeedback("⚠️ Ingresa o escanea el código del vale o factura (ej. CANJE-4891 o WP-2026-...)", "info");
    if (group) {
      group.classList.add("shake-input");
      setTimeout(() => group.classList.remove("shake-input"), 500);
    }
    if (input) input.focus();
    return;
  }

  // Si proviene de escaneo con cámara o pistola de URL completa (?claim=...)
  if (rawCode.includes("claim=")) {
    rawCode = rawCode.split("claim=")[1].split("&")[0];
  }
  const code = rawCode.trim().toUpperCase();

  const voucherBox = document.getElementById("scan-result-box");
  const invoiceBox = document.getElementById("scan-invoice-box");
  const customerBox = document.getElementById("scan-customer-box");

  // CASO 0: DETECCIÓN DE CARNET DIGITAL DE SOCIO (CyberPass / MC-2026-XXXX o teléfono o UID)
  if (code.startsWith("MC-") || code.startsWith("CLIENT-") || code.startsWith("USR-") || (/^\d{8,12}$/).test(code)) {
    const customer = await vm.findCustomer(code);
    if (customer) {
      clearPosFeedback();
      if (voucherBox) voucherBox.style.display = "none";
      if (invoiceBox) invoiceBox.style.display = "none";
      if (customerBox) {
        currentScannedCustomer = customer;
        customerBox.style.display = "block";
        document.getElementById("scan-cust-name").textContent = customer.displayName || "Socio Wired";
        document.getElementById("scan-cust-code").textContent = customer.memberCode || customer.uid;
        document.getElementById("scan-cust-phone").textContent = "📞 " + (customer.phone || "-");
        document.getElementById("scan-cust-points").textContent = (customer.wiredPoints || 0).toLocaleString() + " WP";
        document.getElementById("scan-cust-lifetime").textContent = (customer.lifetimePoints || 0).toLocaleString() + " WP";

        const tierEl = document.getElementById("scan-cust-tier");
        if (tierEl) {
          const t = (customer.tier || "NAVI").toUpperCase();
          tierEl.textContent = t;
          tierEl.className = "badge-tier-navi";
          if (t.includes("RUNNER")) tierEl.className = "badge-tier-runner";
          else if (t.includes("ELITE")) tierEl.className = "badge-tier-elite";
          else if (t.includes("DEUS")) tierEl.className = "badge-tier-deus";
        }
      }
      return;
    }
  }

  // CASO 1: DETECCIÓN DE FACTURA FÍSICA CON QR
  if (code.startsWith("WP-") || code.includes("-F")) {
    const token = await vm.verifyToken(code);
    if (!token) {
      setPosFeedback("❌ La factura con token [" + code + "] no existe en el sistema.", "error");
      if (group) {
        group.classList.add("shake-input");
        setTimeout(() => group.classList.remove("shake-input"), 500);
      }
      if (invoiceBox) invoiceBox.style.display = "none";
      if (voucherBox) voucherBox.style.display = "none";
      if (customerBox) customerBox.style.display = "none";
      return;
    }

    clearPosFeedback();
    if (voucherBox) voucherBox.style.display = "none";
    if (customerBox) customerBox.style.display = "none";

    if (invoiceBox) {
      clearPosAssignTimers();
      const mainContent = document.getElementById("scan-invoice-main-content");
      const successView = document.getElementById("scan-invoice-success-view");
      if (mainContent) mainContent.style.display = "block";
      if (successView) successView.style.display = "none";
      invoiceBox.style.display = "block";
      document.getElementById("scan-inv-code").textContent = token.tokenCode;
      document.getElementById("scan-inv-folio").textContent = "#MD-2026-" + token.invoiceFolio;
      document.getElementById("scan-inv-pin").textContent = token.securityPin || "••••";

      const statusEl = document.getElementById("scan-inv-status");
      const pointsCurrEl = document.getElementById("scan-inv-points-current");
      const assignArea = document.getElementById("scan-inv-assign-area");
      const pointsInput = document.getElementById("input-assign-points");
      const btnSave = document.getElementById("btn-save-inv-points");

      if (token.isClaimed()) {
        if (statusEl) statusEl.innerHTML = "<span style='color:var(--accent); font-weight:900;'>❌ YA RECLAMADO POR EL CLIENTE</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = token.pointsValue + " WP (CANJEADO)";
        if (assignArea) assignArea.style.display = "none";
      } else if (token.isActive()) {
        if (statusEl) statusEl.innerHTML = "<span style='color:#059669; font-weight:900;'>✓ ACTIVO (" + token.pointsValue + " WP)</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = token.pointsValue + " WP (Listo para entrega)";
        if (assignArea) assignArea.style.display = "block";
        if (pointsInput) pointsInput.value = token.pointsValue;
        if (btnSave) btnSave.textContent = "⚡ Modificar Puntos (" + token.pointsValue + " WP)";
      } else {
        // PENDIENTE DE ASIGNACIÓN EN CAJA
        if (statusEl) statusEl.innerHTML = "<span style='color:#d97706; font-weight:900;'>⏳ PENDIENTE DE ASIGNACIÓN</span>";
        if (pointsCurrEl) pointsCurrEl.textContent = "0 WP (Sin Asignar)";
        if (assignArea) assignArea.style.display = "block";
        if (pointsInput) {
          pointsInput.value = "100";
          setTimeout(() => pointsInput.focus(), 100);
        }
        if (btnSave) btnSave.textContent = "⚡ Guardar Puntos y Activar Factura";
      }
    }
    return;
  }

  // CASO 2: DETECCIÓN DE VALE DE CANJE (CANJE-XXXX)
  const voucher = await vm.verifyVoucher(code);

  if (!voucher) {
    // Si no es vale ni factura, intentar buscar como socio por si acaso
    const fallbackCustomer = await vm.findCustomer(code);
    if (fallbackCustomer) {
      clearPosFeedback();
      if (voucherBox) voucherBox.style.display = "none";
      if (invoiceBox) invoiceBox.style.display = "none";
      if (customerBox) {
        currentScannedCustomer = fallbackCustomer;
        customerBox.style.display = "block";
        document.getElementById("scan-cust-name").textContent = fallbackCustomer.displayName || "Socio Wired";
        document.getElementById("scan-cust-code").textContent = fallbackCustomer.memberCode || fallbackCustomer.uid;
        document.getElementById("scan-cust-phone").textContent = "📞 " + (fallbackCustomer.phone || "-");
        document.getElementById("scan-cust-points").textContent = (fallbackCustomer.wiredPoints || 0).toLocaleString() + " WP";
        document.getElementById("scan-cust-lifetime").textContent = (fallbackCustomer.lifetimePoints || 0).toLocaleString() + " WP";

        const tierEl = document.getElementById("scan-cust-tier");
        if (tierEl) {
          const t = (fallbackCustomer.tier || "NAVI").toUpperCase();
          tierEl.textContent = t;
          tierEl.className = "badge-tier-navi";
          if (t.includes("RUNNER")) tierEl.className = "badge-tier-runner";
          else if (t.includes("ELITE")) tierEl.className = "badge-tier-elite";
          else if (t.includes("DEUS")) tierEl.className = "badge-tier-deus";
        }
      }
      return;
    }

    setPosFeedback("❌ El código [" + code + "] no corresponde a ningún vale, factura o socio registrado.", "error");
    if (group) {
      group.classList.add("shake-input");
      setTimeout(() => group.classList.remove("shake-input"), 500);
    }
    if (voucherBox) voucherBox.style.display = "none";
    if (invoiceBox) invoiceBox.style.display = "none";
    if (customerBox) customerBox.style.display = "none";
    return;
  }

  clearPosFeedback();
  if (invoiceBox) invoiceBox.style.display = "none";
  if (customerBox) customerBox.style.display = "none";
  if (invoiceBox) invoiceBox.style.display = "none";

  if (voucherBox) {
    voucherBox.style.display = "block";
    const stampEl = document.getElementById("scan-res-stamp");
    const actionsEl = document.getElementById("scan-res-actions");
    const statusEl = document.getElementById("scan-res-status");
    const deliveredMeta = document.getElementById("scan-res-delivered-meta");

    document.getElementById("scan-res-code").textContent = voucher.voucherCode;
    document.getElementById("scan-res-product").textContent = voucher.rewardTitle;

    // Localizar socio titular para contacto telefónico
    const user = (vm.users || []).find(u => u.uid === voucher.userUid || u.id === voucher.userUid || u.phone === voucher.userUid);
    const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
    const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (voucher.userUid || "");

    document.getElementById("scan-res-client").textContent = clientName;
    const contactEl = document.getElementById("scan-res-contact");
    if (contactEl) contactEl.textContent = clientContact || "Cliente Mostrador";

    const cost = voucher.pointsCost || voucher.pointsSpent || 0;
    document.getElementById("scan-res-points").textContent = cost > 0 ? cost.toLocaleString() + " WP" : "CANJE";
    document.getElementById("scan-res-date").textContent = new Date(voucher.createdAt).toLocaleString();

    if (voucher.isDelivered()) {
      const deliveredTime = voucher.deliveredAt ? new Date(voucher.deliveredAt).toLocaleString() : "Previamente";
      if (statusEl) {
        statusEl.className = "noc-pulse-chip";
        statusEl.style.borderColor = "#f87171";
        statusEl.style.background = "#fee2e2";
        statusEl.style.color = "#991b1b";
        statusEl.innerHTML = "❌ YA DESPACHADO (" + deliveredTime + ")";
      }
      if (deliveredMeta) {
        deliveredMeta.textContent = "Despachado por: " + (voucher.deliveredBy || "admin_melty");
      }
      if (stampEl) {
        stampEl.className = "dispatch-stamp already-delivered";
        stampEl.innerHTML = `❌ YA DESPACHADO<div style="font-size:0.68rem; font-weight:800; margin-top:4px;">ENTREGADO EL ${deliveredTime}</div>`;
      }
      if (actionsEl) {
        actionsEl.innerHTML = `
          <div style="background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:0.6rem 0.9rem; border-radius:4px; font-size:0.82rem; font-weight:700; width:100%; margin-bottom:0.5rem;">
            ⚠️ ATENCIÓN: Este vale ya fue entregado y canjeado en mostrador. NO entregar un artículo duplicado.
          </div>
          <button class="btn-secondary" onclick="closePosResult(); clearPosScanner();">CERRAR FICHA</button>
        `;
      }
    } else {
      const isCommercial = typeof voucher.isCommercial === "function" ? voucher.isCommercial() : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
      const isPaid = typeof voucher.isPaidVoucher === "function" ? voucher.isPaidVoucher() : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);

      if (isCommercial && !isPaid) {
        if (statusEl) {
          statusEl.className = "noc-pulse-chip";
          statusEl.style.borderColor = "#f59e0b";
          statusEl.style.background = "#fffbeb";
          statusEl.style.color = "#b45309";
          statusEl.innerHTML = `⚠️ PENDIENTE DE COBRO ($${(voucher.cashToPayUsd || 0).toFixed(2)} USD)`;
        }
        if (deliveredMeta) deliveredMeta.textContent = "";
        if (stampEl) {
          stampEl.className = "dispatch-stamp";
        }
        if (actionsEl) {
          actionsEl.innerHTML = `
            <div style="background:#fffbeb; border:1px solid #f59e0b; color:#92400e; padding:0.6rem 0.9rem; border-radius:4px; font-size:0.8rem; font-weight:700; width:100%; margin-bottom:0.5rem; text-align:left;">
              💵 Saldo pendiente: $${(voucher.cashToPayUsd || 0).toFixed(2)} USD (C$ ${(Number(voucher.cashToPayUsd || 0) * 37.0).toFixed(2)} NIO). Debes registrar el cobro antes de autorizar la entrega física.
            </div>
            <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="openMarkPaidModal('${voucher.voucherCode}');">
              💵 REGISTRAR PAGO ($${(voucher.cashToPayUsd || 0).toFixed(2)} USD)
            </button>
            <button class="btn-secondary" onclick="closePosResult()">CERRAR FICHA</button>
          `;
        }
      } else {
        if (statusEl) {
          statusEl.className = "noc-pulse-chip";
          statusEl.style.borderColor = "#a7f3d0";
          statusEl.style.background = "#ecfdf5";
          statusEl.style.color = "#059669";
          statusEl.innerHTML = '<span class="pulse-dot"></span> VÁLIDO PARA ENTREGA';
        }
        if (deliveredMeta) deliveredMeta.textContent = "";
        if (stampEl) {
          stampEl.className = "dispatch-stamp"; // Oculto hasta pulsar entregar
        }
        if (actionsEl) {
          actionsEl.innerHTML = `
            <button id="btn-confirm-delivery" class="btn-primary btn-dispatch-action" onclick="confirmDeliveryAdmin()">
              ⚡ CONFIRMAR Y DESPACHAR ARTÍCULO (SALIDA FÍSICA)
            </button>
            <button class="btn-secondary" onclick="closePosResult()">CERRAR FICHA</button>
          `;
        }
      }
    }
  }
}

export async function confirmDeliveryAdmin() {
  const code = document.getElementById("scan-res-code")?.textContent?.trim();
  if (!code) return;

  const btnDeliver = document.getElementById("btn-confirm-delivery");
  if (btnDeliver) {
    btnDeliver.disabled = true;
    btnDeliver.innerHTML = '<span class="cyber-spinner"></span> AUTORIZANDO SALIDA FÍSICA...';
  }

  try {
    const updated = await vm.deliverVoucher(code);
    playAdminDispatchSound();
    triggerCyberDispatchGlitch();

    // Estampado holográfico animado
    const stampEl = document.getElementById("scan-res-stamp");
    if (stampEl) {
      const nowStr = new Date().toLocaleString();
      stampEl.className = "dispatch-stamp active";
      stampEl.innerHTML = `
        ✓ ARTÍCULO DESPACHADO
        <div style="font-size:0.68rem; font-weight:800; margin-top:4px; letter-spacing:0.5px;">
          SALIDA AUTORIZADA // OPERADOR: ADMIN_MELTY // ${nowStr}
        </div>
      `;
    }

    const statusEl = document.getElementById("scan-res-status");
    if (statusEl) {
      statusEl.className = "noc-pulse-chip";
      statusEl.style.borderColor = "#a7f3d0";
      statusEl.style.background = "#ecfdf5";
      statusEl.style.color = "#059669";
      statusEl.innerHTML = '✓ DESPACHADO CON ÉXITO';
    }

    const actionsEl = document.getElementById("scan-res-actions");
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="closePosResult(); clearPosScanner();">
          ✓ ENTREGA COMPLETADA · NUEVA OPERACIÓN
        </button>
      `;
    }

    showToast(`✓ Vale [${code}] entregado y marcado como DESPACHADO en base de datos.`, "success");

    // Destello de fila en la tabla de historial si está presente
    const row = document.getElementById(`voucher-row-${code}`);
    if (row) row.classList.add("row-delivered-flash");
  } catch (err) {
    if (btnDeliver) {
      btnDeliver.disabled = false;
      btnDeliver.textContent = "⚡ CONFIRMAR Y DESPACHAR ARTÍCULO (SALIDA FÍSICA)";
    }
    showToast("❌ " + err.message, "error");
  }
}

export async function submitAssignPoints() {
  const tokenCode = document.getElementById("scan-inv-code")?.textContent?.trim();
  const pointsInput = document.getElementById("input-assign-points");
  const points = Number(pointsInput?.value);

  if (!tokenCode || !tokenCode.startsWith("WP-")) {
    showToast("❌ No hay ninguna factura seleccionada para asignar puntos.", "error");
    return;
  }
  if (!points || isNaN(points) || points <= 0) {
    showToast("⚠️ Ingresa una cantidad válida de puntos mayor a 0 (ej. 100).", "error");
    if (pointsInput) pointsInput.focus();
    return;
  }

  try {
    const updated = await vm.assignTokenPoints(tokenCode, points, "admin-caja");
    showToast("⚡ ¡Puntos asignados! Factura #" + updated.invoiceFolio + " activada con " + points + " WP.", "success");

    const statusEl = document.getElementById("scan-inv-status");
    const pointsCurrEl = document.getElementById("scan-inv-points-current");
    const btnSave = document.getElementById("btn-save-inv-points");
    if (statusEl) statusEl.innerHTML = "<span style='color:#059669; font-weight:900;'>✓ FACTURA ACTIVADA (" + points + " WP)</span>";
    if (pointsCurrEl) pointsCurrEl.textContent = points + " WP (LISTA PARA ENTREGAR)";
    if (btnSave) btnSave.textContent = "✓ Factura Lista para Entrega";

    const scanInput = document.getElementById("input-scan-voucher");
    if (scanInput) {
      scanInput.value = "";
    }

    // Notificación animada yay con auto-ocultado en 5 segundos
    clearPosAssignTimers();
    const mainContent = document.getElementById("scan-invoice-main-content");
    const successView = document.getElementById("scan-invoice-success-view");

    if (mainContent && successView) {
      const yayPts = document.getElementById("yay-points-display");
      const yayFolio = document.getElementById("yay-folio-display");
      const yayPin = document.getElementById("yay-pin-display");
      const yayCode = document.getElementById("yay-code-display");
      const countdownNum = document.getElementById("yay-countdown-num");
      const progressBar = document.getElementById("yay-progress-bar");

      if (yayPts) yayPts.textContent = points;
      if (yayFolio) yayFolio.textContent = "#MD-2026-" + updated.invoiceFolio;
      const pinText = document.getElementById("scan-inv-pin")?.textContent || "••••";
      if (yayPin) yayPin.textContent = pinText;
      if (yayCode) yayCode.textContent = tokenCode;

      mainContent.style.display = "none";
      successView.style.display = "flex";

      if (progressBar) {
        progressBar.style.animation = "none";
        void progressBar.offsetWidth;
        progressBar.style.animation = "yayProgressShrink 5s linear forwards";
      }

      let remaining = 5;
      if (countdownNum) countdownNum.textContent = remaining;
      posAssignCountdownInterval = setInterval(() => {
        remaining--;
        if (countdownNum) countdownNum.textContent = Math.max(0, remaining);
        if (remaining <= 0) {
          clearInterval(posAssignCountdownInterval);
          posAssignCountdownInterval = null;
        }
      }, 1000);

      posAssignSuccessTimer = setTimeout(() => {
        closePosResult();
        if (scanInput) scanInput.focus();
      }, 5000);
    }
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export function setQuickPoints(val) {
  const input = document.getElementById("input-assign-points");
  if (input) {
    input.value = val;
    input.focus();
  }
}

export function promptAssignPoints(tokenCode, folio) {
  switchAdminTab("pos");
  const input = document.getElementById("input-scan-voucher");
  if (input) {
    input.value = tokenCode;
    window.scrollTo({ top: 0, behavior: "smooth" });
    verifyVoucherAdmin();
  }
}

let currentScannedCustomer = null;

export function posCustomerQuickAdjust() {
  if (!currentScannedCustomer) return;
  openAdjustPointsModal(
    currentScannedCustomer.uid,
    currentScannedCustomer.displayName || "Socio",
    currentScannedCustomer.wiredPoints || 0
  );
}

export function posCustomerViewLedger() {
  if (!currentScannedCustomer) return;
  openUserLedgerModal(
    currentScannedCustomer.uid,
    currentScannedCustomer.displayName || "Socio"
  );
}