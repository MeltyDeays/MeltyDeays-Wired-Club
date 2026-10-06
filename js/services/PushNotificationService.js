/**
 * Servicio de Notificaciones Web Push y Avisos de Sistema (Google Chrome Móvil / Desktop)
 * MeltyDeays Wired Club (v2026)
 */

let swRegistration = null;

export const PushNotificationService = {
  isSupported() {
    return typeof window !== "undefined" && "Notification" in window;
  },

  getPermission() {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  },

  async registerServiceWorker() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    try {
      swRegistration = await navigator.serviceWorker.register("./sw.js");
      
      // Escuchar mensajes provenientes del Service Worker (cuando el usuario toca la notificación)
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "OPEN_REWARD_MODAL" && event.data.rewardId) {
          if (typeof window.openProductSpecsModal === "function") {
            window.openProductSpecsModal(event.data.rewardId);
          }
        }
      });

      return swRegistration;
    } catch (err) {
      console.warn("[PushNotificationService] Error al registrar Service Worker:", err);
      return null;
    }
  },

  async requestPermission() {
    if (!this.isSupported()) {
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await this.registerServiceWorker();
        // Guardar marca de consentimiento
        localStorage.setItem("melty_chrome_push_enabled", "true");
      }
      return permission;
    } catch (err) {
      console.warn("[PushNotificationService] Error solicitando permiso:", err);
      return "denied";
    }
  },

  async sendNotification({ title, body, icon, rewardId, url }) {
    if (!this.isSupported() || Notification.permission !== "granted") {
      return false;
    }

    const defaultIcon = "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=192&q=80";
    const notificationTitle = title || "⚡ MeltyDeays · The Wired Club";
    const options = {
      body: body || "¡Hay novedades en el catálogo de The Wired Club!",
      icon: icon || defaultIcon,
      badge: defaultIcon,
      vibrate: [120, 60, 120],
      tag: "melty-push-" + (rewardId || Date.now()),
      renotify: true,
      data: {
        url: url || window.location.href,
        rewardId: rewardId || null
      }
    };

    try {
      if (swRegistration && "showNotification" in swRegistration) {
        await swRegistration.showNotification(notificationTitle, options);
        return true;
      } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(notificationTitle, options);
        return true;
      } else {
        const notif = new Notification(notificationTitle, options);
        notif.onclick = () => {
          window.focus();
          if (rewardId && typeof window.openProductSpecsModal === "function") {
            window.openProductSpecsModal(rewardId);
          }
          notif.close();
        };
        return true;
      }
    } catch (err) {
      console.warn("[PushNotificationService] Error al enviar notificación:", err);
      return false;
    }
  }
};
