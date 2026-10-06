/**
 * ============================================================================
 * THE WIRED CLUB · CUSTOMER PRE-ORDER MODAL VIEW
 * ============================================================================
 * Vista y controlador para el modal de compromiso y reserva de productos
 * 'Próximamente' (#modal-preorder-reservation).
 *
 * Características:
 * - Layout panorámico de 2 columnas en Desktop y 1 columna fluida en Móvil.
 * - Desglose financiero transparente con descuento directo de preventa.
 * - Invariante estricto de Puntos Wired (0 WP gastados).
 * - Validación reactiva de Cédula Nicaragüense (CSE Módulo 23).
 * - Máscaras dinámicas de Cédula y Teléfono (+505).
 * - Emisión y persistencia de comprobante digital RES-XXXX.
 * ============================================================================
 */

import { NicaraguanCedulaValidator } from "../../utils/NicaraguanCedulaValidator.js";

let deps = {
  vm: null,
  formatPrice: null,
  formatDualPrice: null,
  showToast: null,
  showVoucherModal: null,
  FirestoreService: null
};

let currentPreOrderItem = null;
let modalCountdownTimer = null;

/**
 * Inicializa dependencias y vincula listeners de eventos reactivos del formulario.
 * @param {object} injectedDeps - Dependencias de la vista (VM, formateadores, servicios)
 */
export function initCustomerPreOrderModalView(injectedDeps = {}) {
  deps = { ...deps, ...injectedDeps };

  if (typeof document === "undefined") return;

  const cedulaInput = document.getElementById("preorder-cedula");
  const nameInput = document.getElementById("preorder-name");
  const phoneInput = document.getElementById("preorder-phone");
  const emailInput = document.getElementById("preorder-email");

  if (cedulaInput) {
    cedulaInput.addEventListener("input", (e) => {
      const formatted = NicaraguanCedulaValidator.format(e.target.value);
      if (e.target.value !== formatted) {
        e.target.value = formatted;
      }
      validatePreOrderForm();
    });

    cedulaInput.addEventListener("blur", () => {
      validatePreOrderForm(true);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("input", () => validatePreOrderForm());
    nameInput.addEventListener("blur", () => validatePreOrderForm(true));
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      let raw = e.target.value.replace(/\D/g, "");
      if (raw.length > 8) raw = raw.slice(0, 8);
      if (raw.length > 4) {
        e.target.value = raw.slice(0, 4) + "-" + raw.slice(4);
      } else {
        e.target.value = raw;
      }
      validatePreOrderForm();
    });
    phoneInput.addEventListener("blur", () => validatePreOrderForm(true));
  }

  if (emailInput) {
    emailInput.addEventListener("input", () => validatePreOrderForm());
    emailInput.addEventListener("blur", () => validatePreOrderForm(true));
  }
}

/**
 * Realiza el cálculo del descuento de preventa directo.
 * @param {number} priceUsd - Precio regular de lista en USD
 * @param {string} discountType - "PERCENTAGE" o "FIXED_AMOUNT" / "FIXED_USD"
 * @param {number} discountVal - Porcentaje o valor fijo
 * @returns {object} { priceUsd, discountUsd, cashToPayUsd }
 */
export function calculatePresalePricing(priceUsd, discountType, discountVal) {
  const regular = Math.max(0, Number(priceUsd) || 0);
  const val = Number(discountVal) || 0;
  let discountUsd = 0;

  if (discountType === "PERCENTAGE") {
    const clampedPct = Math.max(0, Math.min(100, val));
    discountUsd = Math.round((regular * (clampedPct / 100)) * 100) / 100;
  } else {
    const clampedFixed = Math.max(0, val);
    discountUsd = Math.min(regular, Math.round(clampedFixed * 100) / 100);
  }

  const cashToPayUsd = Math.max(0, Math.round((regular - discountUsd) * 100) / 100);

  return {
    priceUsd: regular,
    discountType: discountType || "PERCENTAGE",
    discountValue: val,
    discountUsd,
    cashToPayUsd,
    pointsCost: 0
  };
}

/**
 * Valida todos los campos del formulario de reserva y actualiza la retroalimentación visual en vivo.
 * @param {boolean} isBlur - Si la validación proviene de un evento blur (muestra errores más explícitos)
 * @returns {object} { isValid, data }
 */
export function validatePreOrderForm(isBlur = false) {
  if (typeof document === "undefined") return { isValid: false };

  const cedulaInput = document.getElementById("preorder-cedula");
  const nameInput = document.getElementById("preorder-name");
  const phoneInput = document.getElementById("preorder-phone");
  const phoneGroup = document.getElementById("preorder-phone-group");
  const emailInput = document.getElementById("preorder-email");
  const submitBtn = document.getElementById("btn-submit-preorder");

  const cedulaFeedback = document.getElementById("preorder-cedula-feedback");
  const nameFeedback = document.getElementById("preorder-name-feedback");
  const phoneFeedback = document.getElementById("preorder-phone-feedback");
  const emailFeedback = document.getElementById("preorder-email-feedback");

  if (!cedulaInput || !nameInput || !phoneInput || !emailInput || !submitBtn) {
    return { isValid: false };
  }

  const rawCedula = (cedulaInput.value || "").trim();
  const rawName = (nameInput.value || "").trim();
  const rawPhone = (phoneInput.value || "").trim();
  const rawEmail = (emailInput.value || "").trim();

  // 1. Validación de Cédula
  let cedulaValid = false;
  if (rawCedula.length > 0) {
    const valRes = NicaraguanCedulaValidator.validate(rawCedula);
    if (valRes.isValid) {
      cedulaValid = true;
      cedulaInput.classList.add("is-valid");
      cedulaInput.classList.remove("is-invalid");
      if (cedulaFeedback) {
        cedulaFeedback.className = "field-feedback is-valid";
        cedulaFeedback.textContent = "✓ Cédula verificada (CSE/DGI Módulo 23)";
      }
    } else {
      cedulaValid = false;
      const cleanChars = rawCedula.replace(/[^0-9A-Za-z]/g, "");
      if (cleanChars.length >= 14 || isBlur) {
        cedulaInput.classList.add("is-invalid");
        cedulaInput.classList.remove("is-valid");
        if (cedulaFeedback) {
          cedulaFeedback.className = "field-feedback is-invalid";
          cedulaFeedback.textContent = `❌ ${valRes.reason || "Cédula inválida"}`;
        }
      } else {
        cedulaInput.classList.remove("is-valid", "is-invalid");
        if (cedulaFeedback) cedulaFeedback.textContent = "";
      }
    }
  } else {
    cedulaInput.classList.remove("is-valid", "is-invalid");
    if (cedulaFeedback) cedulaFeedback.textContent = isBlur ? "❌ Campo obligatorio" : "";
  }

  // 2. Validación de Nombre Completo (>=2 palabras)
  let nameValid = false;
  const nameParts = rawName.split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2 && rawName.length >= 5) {
    nameValid = true;
    nameInput.classList.add("is-valid");
    nameInput.classList.remove("is-invalid");
    if (nameFeedback) nameFeedback.textContent = "";
  } else {
    nameValid = false;
    if (rawName.length > 0 || isBlur) {
      nameInput.classList.add("is-invalid");
      nameInput.classList.remove("is-valid");
      if (nameFeedback) {
        nameFeedback.className = "field-feedback is-invalid";
        nameFeedback.textContent = "❌ Ingresa nombres y apellidos completos (mínimo 2 palabras)";
      }
    } else {
      nameInput.classList.remove("is-valid", "is-invalid");
      if (nameFeedback) nameFeedback.textContent = "";
    }
  }

  // 3. Validación de Teléfono (8 dígitos)
  let phoneValid = false;
  const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
  const normalizedPhone = (cleanPhoneDigits.startsWith("505") && cleanPhoneDigits.length === 11)
    ? cleanPhoneDigits.slice(3)
    : cleanPhoneDigits;

  if (normalizedPhone.length === 8) {
    phoneValid = true;
    phoneInput.classList.add("is-valid");
    phoneInput.classList.remove("is-invalid");
    if (phoneGroup) {
      phoneGroup.classList.add("is-valid");
      phoneGroup.classList.remove("is-invalid");
    }
    if (phoneFeedback) phoneFeedback.textContent = "";
  } else {
    phoneValid = false;
    if (cleanPhoneDigits.length > 0 || isBlur) {
      phoneInput.classList.add("is-invalid");
      phoneInput.classList.remove("is-valid");
      if (phoneGroup) {
        phoneGroup.classList.add("is-invalid");
        phoneGroup.classList.remove("is-valid");
      }
      if (phoneFeedback) {
        phoneFeedback.className = "field-feedback is-invalid";
        phoneFeedback.textContent = "❌ Número telefónico debe contener exactamente 8 dígitos";
      }
    } else {
      phoneInput.classList.remove("is-valid", "is-invalid");
      if (phoneGroup) phoneGroup.classList.remove("is-valid", "is-invalid");
      if (phoneFeedback) phoneFeedback.textContent = "";
    }
  }

  // 4. Validación de Correo Electrónico
  let emailValid = false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(rawEmail)) {
    emailValid = true;
    emailInput.classList.add("is-valid");
    emailInput.classList.remove("is-invalid");
    if (emailFeedback) emailFeedback.textContent = "";
  } else {
    emailValid = false;
    if (rawEmail.length > 0 || isBlur) {
      emailInput.classList.add("is-invalid");
      emailInput.classList.remove("is-valid");
      if (emailFeedback) {
        emailFeedback.className = "field-feedback is-invalid";
        emailFeedback.textContent = "❌ Ingresa una dirección de correo electrónico válida";
      }
    } else {
      emailInput.classList.remove("is-valid", "is-invalid");
      if (emailFeedback) emailFeedback.textContent = "";
    }
  }

  const isFormValid = cedulaValid && nameValid && phoneValid && emailValid;
  submitBtn.disabled = !isFormValid;

  return {
    isValid: isFormValid,
    data: {
      cedula: rawCedula,
      fullName: rawName,
      phone: normalizedPhone,
      email: rawEmail
    }
  };
}

/**
 * Abre y prepara el modal de reserva para un producto de catálogo específico.
 * @param {string} rewardId - ID de la recompensa/producto
 */
export function openPreOrderModal(rewardId) {
  if (typeof document === "undefined") return;

  // 1. Localizar item en catálogo
  let item = null;
  if (deps.vm && Array.isArray(deps.vm.catalog)) {
    item = deps.vm.catalog.find(r => r.id === rewardId);
  }
  if (!item && typeof window !== "undefined" && Array.isArray(window._lastRenderedCatalog)) {
    item = window._lastRenderedCatalog.find(r => r.id === rewardId);
  }

  if (!item) {
    if (typeof deps.showToast === "function") {
      deps.showToast("⚠️ No se encontró la información del producto solicitado.", "warning");
    }
    return;
  }

  currentPreOrderItem = item;

  // 2. Poblar tarjeta de producto
  const imgEl = document.getElementById("preorder-product-img");
  const fallbackEl = document.getElementById("preorder-product-img-fallback");
  const titleEl = document.getElementById("preorder-product-title");

  const imageUrl = item.imageUrl || (Array.isArray(item.images) && item.images[0]) || "";
  if (imgEl && fallbackEl) {
    if (imageUrl) {
      imgEl.src = imageUrl;
      imgEl.style.display = "block";
      fallbackEl.style.display = "none";
    } else {
      imgEl.style.display = "none";
      fallbackEl.style.display = "block";
    }
  }

  if (titleEl) {
    titleEl.textContent = item.title || "Artículo en Camino";
  }

  // 3. Configurar cálculo financiero
  const discType = item.presaleDiscountType || "PERCENTAGE";
  const discVal = item.presaleDiscountValue ?? item.preOrderDiscountVal ?? 15;
  const pricing = calculatePresalePricing(item.priceUsd, discType, discVal);

  const regPriceEl = document.getElementById("preorder-regular-price");
  const discValEl = document.getElementById("preorder-discount-val");
  const cashFinalEl = document.getElementById("preorder-cash-final");

  const formatFn = typeof deps.formatPrice === "function" ? deps.formatPrice : (v => `$${Number(v).toFixed(2)} USD`);

  if (regPriceEl) regPriceEl.textContent = formatFn(pricing.priceUsd);
  if (discValEl) {
    const discLabel = discType === "PERCENTAGE" ? ` (${discVal}%)` : "";
    discValEl.textContent = `-${formatFn(pricing.discountUsd)}${discLabel}`;
  }
  if (cashFinalEl) cashFinalEl.textContent = formatFn(pricing.cashToPayUsd);

  // 4. Iniciar contrarreloj del modal
  startModalCountdown(item.estimatedArrival);

  // 5. Pre-llenado inteligente si el cliente ha iniciado sesión
  const nameInput = document.getElementById("preorder-name");
  const phoneInput = document.getElementById("preorder-phone");
  const emailInput = document.getElementById("preorder-email");

  const currentUser = deps.vm?.currentUser;
  if (currentUser) {
    if (nameInput && !nameInput.value) {
      nameInput.value = currentUser.displayName || "";
    }
    if (phoneInput && !phoneInput.value && currentUser.phone) {
      const clean = currentUser.phone.replace(/\D/g, "");
      const digits8 = (clean.startsWith("505") && clean.length === 11) ? clean.slice(3) : clean;
      if (digits8.length === 8) {
        phoneInput.value = digits8.slice(0, 4) + "-" + digits8.slice(4);
      }
    }
    if (emailInput && !emailInput.value && currentUser.email) {
      emailInput.value = currentUser.email;
    }
  }

  validatePreOrderForm();

  // 6. Visualizar modal
  const modal = document.getElementById("modal-preorder-reservation");
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
  }
}

/**
 * Alias de conveniencia para compatibilidad con llamadas de catálogo.
 */
export const openReservationModal = openPreOrderModal;

/**
 * Cierra el modal de reserva y limpia el intervalo del temporizador.
 */
export function closePreOrderModal() {
  if (modalCountdownTimer) {
    clearInterval(modalCountdownTimer);
    modalCountdownTimer = null;
  }

  if (typeof document === "undefined") return;

  const modal = document.getElementById("modal-preorder-reservation");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

/**
 * Actualiza el temporizador de cuenta regresiva dentro del modal de reserva.
 * @param {string} arrivalIso - Fecha ISO de llegada estimada
 */
function startModalCountdown(arrivalIso) {
  if (modalCountdownTimer) {
    clearInterval(modalCountdownTimer);
    modalCountdownTimer = null;
  }

  const timerEl = document.getElementById("preorder-countdown-timer");
  if (!timerEl) return;

  const updateCountdown = () => {
    if (!arrivalIso) {
      timerEl.textContent = "--d --h --m --s";
      return;
    }

    const targetMs = new Date(arrivalIso).getTime();
    const diff = targetMs - Date.now();

    if (diff <= 0) {
      timerEl.textContent = "00d 00h 00m 00s (¡Llegó a tienda!)";
      if (modalCountdownTimer) {
        clearInterval(modalCountdownTimer);
        modalCountdownTimer = null;
      }
      return;
    }

    const totalSecs = Math.floor(diff / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    const pad = n => String(n).padStart(2, "0");
    timerEl.textContent = `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  };

  updateCountdown();
  modalCountdownTimer = setInterval(updateCountdown, 1000);
}

/**
 * Procesa el envío del formulario de reserva, genera el comprobante digital
 * y garantiza el invariante estricto de 0 Puntos Wired consumidos.
 */
export async function submitPreOrderReservation() {
  const { isValid, data } = validatePreOrderForm(true);

  if (!isValid || !currentPreOrderItem) {
    if (typeof deps.showToast === "function") {
      deps.showToast("⚠️ Por favor completa todos los campos requeridos con datos válidos.", "warning");
    }
    return;
  }

  const submitBtn = document.getElementById("btn-submit-preorder");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Registrando reserva...";
  }

  try {
    let voucher = null;

    // Si el ViewModel dispone del método reservePreOrder (M4), delegar en él
    if (deps.vm && typeof deps.vm.reservePreOrder === "function") {
      voucher = await deps.vm.reservePreOrder(currentPreOrderItem.id, data);
    } else {
      // Implementación canónica autónoma (Fallback robusto para garantizar funcionamiento)
      const discType = currentPreOrderItem.presaleDiscountType || "PERCENTAGE";
      const discVal = currentPreOrderItem.presaleDiscountValue ?? currentPreOrderItem.preOrderDiscountVal ?? 15;
      const pricing = calculatePresalePricing(currentPreOrderItem.priceUsd, discType, discVal);

      const voucherCode = "RES-" + Math.floor(1000 + Math.random() * 9000);
      const user = deps.vm?.currentUser;

      voucher = {
        voucherCode,
        userUid: user ? (user.uid || user.phone) : ("GUEST-" + data.phone),
        userName: data.fullName,
        userDisplayName: data.fullName,
        customerInfo: {
          cedula: data.cedula,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email
        },
        rewardId: currentPreOrderItem.id,
        rewardTitle: currentPreOrderItem.title,
        rewardType: "PREORDER_RESERVATION",
        imageUrl: currentPreOrderItem.imageUrl || (Array.isArray(currentPreOrderItem.images) && currentPreOrderItem.images[0]) || "",
        pointsSpent: 0, // Invariante estricto: 0 WP consumidos
        priceUsd: pricing.priceUsd,
        discountUsd: pricing.discountUsd,
        cashToPayUsd: pricing.cashToPayUsd,
        status: "RESERVED_UPCOMING",
        isPaid: false,
        estimatedArrival: currentPreOrderItem.estimatedArrival || null,
        createdAt: new Date().toISOString(),
        expiresAt: null
      };

      // Persistir voucher en almacenamiento local espejo
      try {
        const dbKey = "wired_club_mvvm_db_v2";
        if (typeof localStorage !== "undefined") {
          const db = JSON.parse(localStorage.getItem(dbKey) || "{}");
          if (!db.vouchers) db.vouchers = {};
          db.vouchers[voucher.voucherCode] = voucher;
          localStorage.setItem(dbKey, JSON.stringify(db));
        }
      } catch (err) {
        console.warn("[CustomerPreOrderModalView] Error persistiendo en localStorage:", err);
      }
    }

    closePreOrderModal();

    if (typeof deps.showToast === "function") {
      deps.showToast(`🔮 ¡Reserva registrada con éxito! Código: ${voucher.voucherCode}`, "success");
    }

    // Mostrar el vale digital generado al cliente
    if (typeof deps.showVoucherModal === "function" && voucher && voucher.voucherCode) {
      setTimeout(() => {
        deps.showVoucherModal(voucher.voucherCode);
      }, 250);
    }
  } catch (err) {
    console.error("[CustomerPreOrderModalView] Error al procesar reserva:", err);
    if (typeof deps.showToast === "function") {
      deps.showToast("❌ Ocurrió un error al registrar la reserva. Intenta de nuevo.", "error");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "🔮 CONFIRMAR RESERVA DE PREVENTA";
    }
  }
}
