/* Controlador de popup de la extensión */

const logEl = document.getElementById("log");

function log(msg) {
  if (logEl) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }
}

document.getElementById("btn-link-twins")?.addEventListener("click", async () => {
  log("Buscando pestaña de Marketplace para enlazar...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      chrome.tabs.sendMessage(currentTab.id, { action: "LINK_TWINS" }, () => {
        log("Enlace de gemelos iniciado en la pestaña.");
      });
    } else {
      log("⚠️ Abre facebook.com/marketplace/you/selling para enlazar tus publicaciones.");
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

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

// Cargar preferencias de auto-compartir en grupos y auto-relist
chrome.storage?.local?.get(["groupShareAuto", "selectedGroupNames", "scannedFacebookGroups", "relistAuto", "relistDays"], (data) => {
  const chkAuto = document.getElementById("chk-group-auto");
  const chkRelist = document.getElementById("chk-relist-auto");
  const numRelistDays = document.getElementById("num-relist-days");

  if (chkAuto && data?.groupShareAuto !== undefined) {
    chkAuto.checked = data.groupShareAuto;
  }
  if (chkRelist && data?.relistAuto !== undefined) {
    chkRelist.checked = data.relistAuto;
  }
  if (numRelistDays && data?.relistDays) {
    numRelistDays.value = data.relistDays;
  }

  const scanned = Array.isArray(data?.scannedFacebookGroups) ? data.scannedFacebookGroups : [];
  const selected = Array.isArray(data?.selectedGroupNames) ? data.selectedGroupNames : [];
  renderGroupsChecklist(scanned, selected);
});

function renderGroupsChecklist(groups, selected = []) {
  const container = document.getElementById("groups-checklist-container");
  const labelCount = document.getElementById("lbl-groups-selected");
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = `<div style="color: #64748b; font-size: 10px; text-align: center; padding: 6px;">Abre Facebook o pulsa "Escanear" para ver tus grupos aquí.</div>`;
    if (labelCount) labelCount.textContent = `0 / 12`;
    return;
  }

  container.innerHTML = "";
  let checkedCount = 0;

  groups.forEach((grp, idx) => {
    const isChecked = selected.includes(grp) || (selected.length === 0 && idx < 12);
    if (isChecked) checkedCount++;

    const row = document.createElement("label");
    row.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #f1f5f9; cursor: pointer; padding: 2px 0;";
    row.innerHTML = `
      <input type="checkbox" class="chk-fb-group-item" value="${grp}" ${isChecked ? "checked" : ""}>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${grp}">🏷️ ${grp}</span>
    `;
    container.appendChild(row);
  });

  if (labelCount) labelCount.textContent = `${checkedCount} / 12 seleccionados`;

  container.querySelectorAll(".chk-fb-group-item").forEach(chk => {
    chk.addEventListener("change", () => {
      const allChecked = container.querySelectorAll(".chk-fb-group-item:checked");
      if (allChecked.length > 20) {
        chk.checked = false;
        alert("Facebook permite un máximo de 20 grupos a la vez.");
        return;
      }
      if (labelCount) labelCount.textContent = `${allChecked.length} / 12 seleccionados`;
    });
  });
}

// Guardar preferencias de grupos fijos
document.getElementById("btn-save-group-settings")?.addEventListener("click", () => {
  const chkAuto = document.getElementById("chk-group-auto");
  const container = document.getElementById("groups-checklist-container");
  const selected = [];
  container?.querySelectorAll(".chk-fb-group-item:checked").forEach(chk => {
    selected.push(chk.value);
  });

  const groupShareAuto = chkAuto ? chkAuto.checked : true;

  chrome.storage?.local?.set({
    groupShareAuto,
    selectedGroupNames: selected,
    groupShareCount: selected.length || 12
  }, () => {
    log(`✓ ${selected.length} grupos guardados como tus favoritos fijos.`);
  });
});

// Escanear grupos desde la pestaña activa de Facebook
document.getElementById("btn-scan-groups")?.addEventListener("click", async () => {
  log("Escaneando tus grupos desde Facebook...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com")) {
      chrome.tabs.sendMessage(currentTab.id, { action: "SCAN_MY_GROUPS" }, (res) => {
        if (res && res.groups && res.groups.length > 0) {
          chrome.storage?.local?.set({ scannedFacebookGroups: res.groups }, () => {
            chrome.storage?.local?.get(["selectedGroupNames"], (d) => {
              renderGroupsChecklist(res.groups, d?.selectedGroupNames || []);
              log(`✓ Se encontraron ${res.groups.length} grupos en tu cuenta.`);
            });
          });
        } else {
          log("Aviso: Abre el diálogo de 'Publicar en más lugares' en Facebook para leer la lista completa.");
        }
      });
    } else {
      log("⚠️ Abre facebook.com en esta ventana para escanear tus grupos.");
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

// Guardar y ejecutar auto-relist
document.getElementById("btn-run-relist-now")?.addEventListener("click", async () => {
  const chkRelist = document.getElementById("chk-relist-auto");
  const numDays = document.getElementById("num-relist-days");
  const relistDays = parseInt(numDays?.value, 10) || 7;
  const relistAuto = chkRelist ? chkRelist.checked : true;

  chrome.storage?.local?.set({ relistDays, relistAuto }, () => {
    log(`Buscando productos activos con más de ${relistDays} días para re-publicar...`);
  });

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com")) {
      chrome.tabs.sendMessage(currentTab.id, { action: "RUN_AUTO_RELIST", maxDays: relistDays }, (res) => {
        log(`✓ Ciclo de re-publicación disparado.`);
      });
    } else {
      log("Abriendo ciclo de relist en segundo plano...");
      chrome.runtime.sendMessage({ action: "CHECK_AUTORELIST_NOW", maxDays: relistDays }, (res) => {
        log(res?.message || "Comando de re-publicación enviado.");
      });
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

// Disparar compartir en grupos inmediatamente
document.getElementById("btn-share-groups-now")?.addEventListener("click", async () => {
  log("Buscando diálogo de grupos en la pestaña...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      chrome.storage?.local?.get(["selectedGroupNames"], (d) => {
        chrome.tabs.sendMessage(currentTab.id, {
          action: "AUTO_SHARE_GROUPS",
          targetCount: (d?.selectedGroupNames?.length) || 12,
          selectedNames: d?.selectedGroupNames || []
        }, (res) => {
          log(`Comando enviado para compartir en tus grupos seleccionados.`);
        });
      });
    } else {
      log("⚠️ Abre la pestaña de Marketplace donde esté la publicación o diálogo.");
    }
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

