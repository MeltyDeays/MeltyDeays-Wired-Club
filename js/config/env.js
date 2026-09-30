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
 * Inyecta una barra o badge flotante no intrusivo cuando se ejecuta en entorno de pruebas
 */
export function injectEnvironmentBadge() {
  if (typeof document === "undefined" || isProduction()) return;

  // Evitar inyección múltiple
  if (document.getElementById("dev-env-badge")) return;

  const badge = document.createElement("div");
  badge.id = "dev-env-badge";
  badge.innerHTML = `
    <div style="
      position: fixed;
      bottom: 12px;
      right: 12px;
      background: #fef08a;
      color: #78350f;
      font-family: var(--font-mono, monospace);
      font-size: 0.72rem;
      font-weight: 800;
      padding: 6px 12px;
      border: 2px solid #0f172a;
      border-radius: 4px;
      box-shadow: 3px 3px 0px #0f172a;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.04em;
    ">
      <span style="font-size: 0.95rem;">🧪</span>
      <span>MODO PRUEBAS (SANDBOX)</span>
      <span style="background:#0f172a; color:#fef08a; padding:2px 6px; border-radius:3px; font-size:0.65rem;">BD: dev_*</span>
      <button id="btn-seed-dev-data" style="
        background: #0f172a;
        color: #ffffff;
        border: 1px solid #334155;
        border-radius: 3px;
        padding: 2px 7px;
        font-family: inherit;
        font-size: 0.65rem;
        font-weight: 800;
        cursor: pointer;
        margin-left: 4px;
      " title="Cargar 3 socios y 3 productos ficticios en la base de datos de pruebas">
        ⚡ Datos Demo
      </button>
    </div>
  `;
  document.body.appendChild(badge);

  const btnSeed = document.getElementById("btn-seed-dev-data");
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

