/**
 * Detección y Aislamiento de Entornos (The Wired Club)
 * Producción: meltydeays-wired-club.vercel.app
 * Pruebas/Desarrollo: localhost, 127.0.0.1, Vercel Previews, etc.
 */

const PROD_HOSTNAMES = [
  "meltydeays-wired-club.vercel.app"
];

export function isProduction() {
  if (typeof window === "undefined") return false;

  // Permitir forzar entorno vía URL query param para pruebas controladas (?env=prod / ?env=dev)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("env") === "prod") return true;
    if (params.get("env") === "dev") return false;
  } catch (e) {}

  const hostname = window.location.hostname;
  return PROD_HOSTNAMES.includes(hostname);
}

export function getEnvironmentInfo() {
  const isProd = isProduction();
  return {
    isProduction: isProd,
    name: isProd ? "PRODUCCIÓN" : "PRUEBAS (SANDBOX)",
    collectionPrefix: isProd ? "" : "dev_",
    storageKeyPrefix: isProd ? "" : "dev_"
  };
}

export function getCollectionName(baseName) {
  return isProduction() ? baseName : `dev_${baseName}`;
}

export function getStorageKey(baseKey) {
  return isProduction() ? baseKey : `dev_${baseKey}`;
}

/**
 * Inyecta una barra o badge flotante no intrusivo cuando se ejecuta en entorno de pruebas.
 * Incluye capacidad de arrastre libre (touch/mouse) y colapso/minimización para no obstruir la interfaz.
 */
export function injectEnvironmentBadge() {
  if (typeof document === "undefined" || isProduction()) return;
  if (document.getElementById("dev-env-badge")) return;

  const isMobile = window.innerWidth <= 640;
  let isMinimized = false;
  try {
    isMinimized = sessionStorage.getItem("dev_badge_minimized") === "true";
  } catch (e) {}

  let savedPos = null;
  try {
    const raw = sessionStorage.getItem("dev_badge_pos");
    if (raw) savedPos = JSON.parse(raw);
  } catch (e) {}

  const badge = document.createElement("div");
  badge.id = "dev-env-badge";
  badge.style.position = "fixed";
  badge.style.zIndex = "99999";
  badge.style.touchAction = "none";
  badge.style.userSelect = "none";
  badge.style.webkitUserSelect = "none";

  // Posición inicial: Si es móvil por defecto arriba a la derecha (evitando el dock inferior a 12px)
  if (savedPos && typeof savedPos.x === "number" && typeof savedPos.y === "number") {
    badge.style.left = `${savedPos.x}px`;
    badge.style.top = `${savedPos.y}px`;
  } else if (isMobile) {
    badge.style.top = "56px";
    badge.style.right = "10px";
  } else {
    badge.style.bottom = "12px";
    badge.style.right = "12px";
  }

  function renderBadge() {
    if (isMinimized) {
      badge.innerHTML = `
        <div id="dev-badge-inner" style="
          background: #fef08a;
          color: #78350f;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          font-weight: 800;
          padding: 4px 8px;
          border: 1.8px solid #0f172a;
          border-radius: 6px;
          box-shadow: 2px 2px 0px #0f172a;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: grab;
          letter-spacing: 0.03em;
        " title="Arrastra para mover. Haz clic en ⤢ para expandir">
          <span style="cursor: grab; opacity: 0.6; font-size: 0.75rem;">⠿</span>
          <span>🧪 Sandbox</span>
          <button id="btn-toggle-dev-badge" type="button" style="
            background: #0f172a;
            color: #fef08a;
            border: none;
            border-radius: 3px;
            padding: 1px 5px;
            font-size: 0.62rem;
            font-weight: 900;
            cursor: pointer;
            line-height: 1.1;
          " title="Expandir barra de pruebas">⤢</button>
        </div>
      `;
    } else {
      badge.innerHTML = `
        <div id="dev-badge-inner" style="
          background: #fef08a;
          color: #78350f;
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          font-weight: 800;
          padding: 5px 10px;
          border: 2px solid #0f172a;
          border-radius: 6px;
          box-shadow: 2.5px 2.5px 0px #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: grab;
          letter-spacing: 0.03em;
        " title="Mantén presionado para arrastrar a cualquier lugar">
          <span style="cursor: grab; opacity: 0.6; font-size: 0.85rem;" title="Asa de arrastre">⠿</span>
          <span style="font-size: 0.85rem;">🧪</span>
          <span style="white-space: nowrap;">MODO PRUEBAS (SANDBOX)</span>
          <span style="background:#0f172a; color:#fef08a; padding:1.5px 5px; border-radius:3px; font-size:0.62rem; white-space:nowrap;">BD: dev_*</span>
          <button id="btn-seed-dev-data" type="button" style="
            background: #0f172a;
            color: #ffffff;
            border: 1px solid #334155;
            border-radius: 3px;
            padding: 2px 6px;
            font-family: inherit;
            font-size: 0.62rem;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          " title="Cargar 3 socios, 9 productos con especificaciones y comentarios en la base de datos de pruebas">
            ⚡ Datos Demo
          </button>
          <button id="btn-toggle-dev-badge" type="button" style="
            background: #0f172a;
            color: #fef08a;
            border: none;
            border-radius: 3px;
            padding: 1px 5px;
            font-size: 0.65rem;
            font-weight: 900;
            cursor: pointer;
            line-height: 1.1;
            margin-left: 2px;
          " title="Minimizar barra de pruebas">⚊</button>
        </div>
      `;
    }

    // Listener para el botón Minimizar / Expandir
    const btnToggle = badge.querySelector("#btn-toggle-dev-badge");
    if (btnToggle) {
      btnToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        try {
          sessionStorage.setItem("dev_badge_minimized", isMinimized ? "true" : "false");
        } catch (err) {}
        renderBadge();
      });
    }

    // Listener para sembrar datos demo
    const btnSeed = badge.querySelector("#btn-seed-dev-data");
    if (btnSeed) {
      btnSeed.addEventListener("click", async (e) => {
        e.stopPropagation();
        btnSeed.disabled = true;
        btnSeed.textContent = "Sembrando...";
        try {
          const { FirestoreService } = await import("../services/FirestoreService.js");
          const res = await FirestoreService.seedDevData();
          btnSeed.textContent = "✓ ¡Listo!";
          setTimeout(() => window.location.reload(), 800);
        } catch (err) {
          alert("Aviso: " + err.message);
          btnSeed.disabled = false;
          btnSeed.textContent = "⚡ Datos Demo";
        }
      });
    }
  }

  renderBadge();
  document.body.appendChild(badge);

  // Implementación de arrastre libre fluido (Pointer Events: Touch + Mouse)
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialBadgeX = 0;
  let initialBadgeY = 0;
  let hasMoved = false;

  badge.addEventListener("pointerdown", (e) => {
    // Si se interactúa con un botón interno, no iniciar drag
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    hasMoved = false;
    badge.setPointerCapture(e.pointerId);

    const rect = badge.getBoundingClientRect();
    initialBadgeX = rect.left;
    initialBadgeY = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    const inner = badge.querySelector("#dev-badge-inner");
    if (inner) inner.style.cursor = "grabbing";
  });

  badge.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved = true;
    }

    let newX = initialBadgeX + dx;
    let newY = initialBadgeY + dy;

    // Confinar dentro de los límites visibles de la ventana
    const maxX = window.innerWidth - badge.offsetWidth - 8;
    const maxY = window.innerHeight - badge.offsetHeight - 8;

    newX = Math.max(8, Math.min(maxX, newX));
    newY = Math.max(8, Math.min(maxY, newY));

    badge.style.left = `${newX}px`;
    badge.style.top = `${newY}px`;
    badge.style.right = "auto";
    badge.style.bottom = "auto";
  });

  const stopDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      badge.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const inner = badge.querySelector("#dev-badge-inner");
    if (inner) inner.style.cursor = "grab";

    if (hasMoved) {
      const rect = badge.getBoundingClientRect();
      try {
        sessionStorage.setItem("dev_badge_pos", JSON.stringify({ x: rect.left, y: rect.top }));
      } catch (err) {}
    }
  };

  badge.addEventListener("pointerup", stopDrag);
  badge.addEventListener("pointercancel", stopDrag);
}

