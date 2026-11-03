/**
 * ModalHistoryManager.js
 * Gestión de historial nativo de navegación para modales y drawer móvil (The Wired Club).
 * Permite que el botón "Atrás" del teléfono (o gestos swipe en Android/iOS)
 * cierre el modal activo en lugar de expulsar al usuario de la aplicación.
 */

let _isProgrammaticBack = false;
let _popstateListenerAttached = false;

export function isAnyModalOpen() {
  const configs = getModalConfigs();
  return configs.some(cfg => cfg.isOpen());
}

export function pushModalHistory(modalId, customUrl = null) {
  if (typeof window === "undefined" || !window.history || typeof window.history.pushState !== "function") return;
  const currentModalId = window.history.state?.modalId;
  if (window.history.state?.modalOpen && currentModalId === modalId) {
    if (customUrl && window.location.hash !== customUrl && !window.location.href.endsWith(customUrl)) {
      window.history.replaceState({ modalOpen: true, modalId }, document.title, customUrl);
    }
    return;
  }
  const targetUrl = customUrl || window.location.href;
  window.history.pushState({ modalOpen: true, modalId }, document.title, targetUrl);
}

export function popModalHistory(expectedModalId = null) {
  if (typeof window === "undefined" || !window.history || typeof window.history.back !== "function") return;
  if (window.history.state && window.history.state.modalOpen) {
    if (!expectedModalId || window.history.state.modalId === expectedModalId) {
      _isProgrammaticBack = true;
      window.history.back();
      setTimeout(() => {
        _isProgrammaticBack = false;
      }, 150);
    }
  }
}

export function safeHistoryBack() {
  popModalHistory();
}

function getModalConfigs() {
  return [
    // 1. Lightbox de imágenes (prioridad máxima si está abierto)
    {
      id: "modal-image-lightbox",
      isOpen: () => {
        const el = document.getElementById("modal-image-lightbox");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeImageLightbox === "function") window.closeImageLightbox({ fromPopState: true });
      }
    },
    // 2. Modal de cancelación de voucher
    {
      id: "modal-confirm-cancel-voucher",
      isOpen: () => {
        const el = document.getElementById("modal-confirm-cancel-voucher");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeCancelVoucherModal === "function") window.closeCancelVoucherModal({ fromPopState: true });
      }
    },
    // 3. Escáner de cámara QR
    {
      id: "modal-client-camera-scanner",
      isOpen: () => {
        const el = document.getElementById("modal-client-camera-scanner");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.stopClientCameraScanner === "function") window.stopClientCameraScanner({ fromPopState: true });
      }
    },
    // 4. Detalle de vale / voucher
    {
      id: "modal-voucher",
      isOpen: () => {
        const el = document.getElementById("modal-voucher");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeVoucherModal === "function") window.closeVoucherModal({ fromPopState: true });
      }
    },
    // 5. Ticket de confirmación de canje / compra
    {
      id: "modal-confirm-redeem",
      isOpen: () => {
        const el = document.getElementById("modal-confirm-redeem");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeRedeemModal === "function") window.closeRedeemModal({ fromPopState: true });
      }
    },
    // 6. Modal de preventa
    {
      id: "modal-preorder-reservation",
      isOpen: () => {
        const el = document.getElementById("modal-preorder-reservation");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closePreOrderModal === "function") window.closePreOrderModal({ fromPopState: true });
      }
    },
    // 7. Modal de especificaciones y detalle de producto en catálogo
    {
      id: "modal-product-specs",
      isOpen: () => {
        const el = document.getElementById("modal-product-specs");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeProductSpecsModal === "function") window.closeProductSpecsModal({ fromPopState: true, updateHash: false });
      }
    },
    // 8. Reclamo manual de factura
    {
      id: "modal-manual-claim",
      isOpen: () => {
        const el = document.getElementById("modal-manual-claim");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeClaimModal === "function") window.closeClaimModal({ fromPopState: true });
      }
    },
    // 9. Login / Registro de cliente
    {
      id: "modal-client-auth",
      isOpen: () => {
        const el = document.getElementById("modal-client-auth");
        return Boolean(el && el.style.display !== "none" && el.style.display !== "");
      },
      close: () => {
        if (typeof window.closeAuthModal === "function") window.closeAuthModal({ fromPopState: true });
      }
    },
    // 10. Drawer lateral de perfil y ajustes
    {
      id: "drawer-mobile-profile",
      isOpen: () => {
        const drawer = document.getElementById("drawer-mobile-profile");
        return Boolean(drawer && (drawer.classList.contains("open") || document.body.classList.contains("drawer-open")));
      },
      close: () => {
        if (typeof window.closeMobileProfileDrawer === "function") window.closeMobileProfileDrawer({ fromPopState: true });
      }
    }
  ];
}

export function closeTopmostOpenModal() {
  const configs = getModalConfigs();
  for (const cfg of configs) {
    if (cfg.isOpen()) {
      try {
        cfg.close();
        return true;
      } catch (err) {
        console.warn(`[ModalHistoryManager] Error al cerrar modal ${cfg.id}:`, err);
      }
    }
  }
  return false;
}

export function initModalHistoryListener() {
  if (typeof window === "undefined" || _popstateListenerAttached) return;
  _popstateListenerAttached = true;

  window.addEventListener("popstate", () => {
    // Si fue un retroceso generado por programación al pulsar un botón de cerrar ("X"), omitir
    if (_isProgrammaticBack) {
      _isProgrammaticBack = false;
      return;
    }

    // Si hay un modal abierto, interceptar el botón Atrás y cerrarlo
    closeTopmostOpenModal();
  });

  // Guardar en window para acceso global desacoplado
  window._modalHistoryManager = {
    pushModalHistory,
    popModalHistory,
    closeTopmostOpenModal,
    isAnyModalOpen
  };
}
