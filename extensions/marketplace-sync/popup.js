/* Controlador de popup de la extensión */

const logEl = document.getElementById("log");

function log(msg) {
  if (logEl) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }
}

document.getElementById("btn-audit")?.addEventListener("click", async () => {
  log("Buscando pestaña activa de Marketplace...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      chrome.tabs.sendMessage(currentTab.id, { action: "AUDIT_LISTINGS" }, (res) => {
        log("Auditoría enviada a la pestaña de Facebook.");
      });
    } else {
      log("⚠️ Abre facebook.com/marketplace/you/selling para auditar directamente.");
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

document.getElementById("btn-cloud-sync")?.addEventListener("click", async () => {
  log("Conectando con Vercel Serverless Function...");
  try {
    const res = await fetch("https://lain-wired-club.vercel.app/api/sync-facebook", { method: "POST" });
    const data = await res.json();
    if (data.success && data.report) {
      log(`✓ Cloud Sync: ${data.report.updatedProducts.length} actualizados, ${data.report.markedSoldProducts?.length || 0} vendidos.`);
    } else {
      log(`Aviso Cloud: ${data.error || "Sin novedades."}`);
    }
  } catch (err) {
    log(`Error conectando a Vercel: ${err.message}`);
  }
});
