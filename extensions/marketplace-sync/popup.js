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

function scoreGroupRelevance(groupName) {
  const norm = (groupName || "").toLowerCase().trim();
  let score = 50;
  let badge = "⚡ Comercial";
  let badgeColor = "#0284c7"; // Azul

  const isGaming = /gamer|gaming|videojuego|consolas|playstation|xbox|nintendo|pc gamer|setup|geek|steam/.test(norm);
  const isPC = /computador|laptop|pc|hardware|inform[aá]tica|tecnolog[ií]a/.test(norm);
  const isTech = /electr[oó]nica|celular|smartphone|gadget|accesorios/.test(norm);
  const isCommerce = /ventas|compras|mercado libre|tienda|clasificados|bazar|gangas|negocios|comercio/.test(norm);
  const isOpposite = /ropa|calzado|zapatos|vestidos|moda|belleza|cosm[eé]ticos|bienes ra[ií]ces|casas|terrenos|alquiler|autos|carros|motos|veh[ií]culos|animales|mascotas/.test(norm);

  if (isOpposite) {
    return { score: 15, badge: "⚪ Baja Afinidad", badgeColor: "#64748b" };
  }

  if (isGaming) {
    score += 45;
    badge = "🔥 Gaming Top";
    badgeColor = "#a855f7"; // Morado
  } else if (isPC) {
    score += 38;
    badge = "🔥 PC & Tech";
    badgeColor = "#3b82f6"; // Azul brillante
  } else if (isTech) {
    score += 30;
    badge = "⚡ Electrónica";
    badgeColor = "#06b6d4"; // Cyan
  } else if (isCommerce) {
    score += 15;
    badge = "🏷️ Ventas";
    badgeColor = "#10b981"; // Esmeralda
  }

  return { score: Math.min(score, 99), badge, badgeColor };
}

function renderGroupsChecklist(groups, selected = []) {
  const container = document.getElementById("groups-checklist-container");
  const labelCount = document.getElementById("lbl-groups-selected");
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = `<div style="color: #64748b; font-size: 10px; text-align: center; padding: 6px;">Escribe un grupo arriba o pulsa "Escanear" con Facebook abierto.</div>`;
    if (labelCount) labelCount.textContent = `0 / 12`;
    return;
  }

  // Ordenar grupos por puntuación de relevancia IA descendente
  const scoredGroups = groups.map(g => ({
    name: g,
    ai: scoreGroupRelevance(g),
    isFav: selected.includes(g)
  })).sort((a, b) => b.ai.score - a.ai.score);

  container.innerHTML = "";
  let checkedCount = 0;

  scoredGroups.forEach(({ name: grp, ai, isFav }, idx) => {
    const isChecked = selected.includes(grp) || (selected.length === 0 && idx < 12);
    if (isChecked) checkedCount++;

    const row = document.createElement("div");
    row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 10.5px; color: #f1f5f9; padding: 3px 0; border-bottom: 1px solid rgba(51, 65, 85, 0.4);";
    row.innerHTML = `
      <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1; overflow: hidden;">
        <input type="checkbox" class="chk-fb-group-item" value="${grp}" ${isChecked ? "checked" : ""}>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 145px;" title="${grp}">🏷️ ${grp}</span>
      </label>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 700; background: ${ai.badgeColor}22; color: ${ai.badgeColor}; border: 1px solid ${ai.badgeColor}44;" title="Relevancia IA: ${ai.score}%">
          ${ai.badge}
        </span>
        <button type="button" class="btn-remove-group" data-group="${grp}" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 0 4px; font-size: 11px; line-height: 1;" title="Quitar de la lista">✕</button>
      </div>
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

  container.querySelectorAll(".btn-remove-group").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetGroup = btn.getAttribute("data-group");
      chrome.storage?.local?.get(["scannedFacebookGroups", "selectedGroupNames"], (d) => {
        const newScanned = (d?.scannedFacebookGroups || []).filter(g => g !== targetGroup);
        const newSelected = (d?.selectedGroupNames || []).filter(g => g !== targetGroup);
        chrome.storage.local.set({
          scannedFacebookGroups: newScanned,
          selectedGroupNames: newSelected
        }, () => {
          renderGroupsChecklist(newScanned, newSelected);
        });
      });
    });
  });
}

// Escuchar actualizaciones de grupos en segundo plano
chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === "local" && changes.scannedFacebookGroups) {
    chrome.storage.local.get(["selectedGroupNames"], (d) => {
      renderGroupsChecklist(changes.scannedFacebookGroups.newValue || [], d?.selectedGroupNames || []);
      log(`✓ Se actualizaron ${(changes.scannedFacebookGroups.newValue || []).length} grupos desde Facebook.`);
    });
  }
});

// Añadir grupo manualmente
function handleAddManualGroup() {
  const input = document.getElementById("txt-add-group");
  const rawValue = (input?.value || "").trim();
  if (!rawValue) return;

  // Permitir agregar varios separados por coma
  const names = rawValue.split(",").map(n => n.trim()).filter(Boolean);
  if (names.length === 0) return;

  chrome.storage?.local?.get(["scannedFacebookGroups", "selectedGroupNames"], (d) => {
    const scanned = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
    const selected = Array.isArray(d?.selectedGroupNames) ? d.selectedGroupNames : [];

    const newScanned = Array.from(new Set([...scanned, ...names]));
    const newSelected = Array.from(new Set([...selected, ...names]));

    chrome.storage.local.set({
      scannedFacebookGroups: newScanned,
      selectedGroupNames: newSelected
    }, () => {
      renderGroupsChecklist(newScanned, newSelected);
      if (input) input.value = "";
      log(`✓ ${names.length} grupo(s) añadido(s) a tu lista.`);
    });
  });
}

document.getElementById("btn-add-group")?.addEventListener("click", handleAddManualGroup);
document.getElementById("txt-add-group")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddManualGroup();
  }
});

// Recomendar los 12 grupos más relevantes usando IA
document.getElementById("btn-ai-recommend-groups")?.addEventListener("click", () => {
  chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
    const scanned = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
    if (scanned.length === 0) {
      log("Aviso: Primero escanea o añade grupos a tu lista.");
      return;
    }
    const scored = scanned.map(g => ({ name: g, score: scoreGroupRelevance(g).score }))
      .sort((a, b) => b.score - a.score);
    const top12 = scored.slice(0, 12).map(s => s.name);
    renderGroupsChecklist(scanned, top12);
    log(`✓ 12 grupos con mayor afinidad IA (Gaming & Tech) seleccionados.`);
  });
});

// Restablecer a los favoritos fijos guardados por el usuario
document.getElementById("btn-restore-favorites")?.addEventListener("click", () => {
  chrome.storage?.local?.get(["scannedFacebookGroups", "selectedGroupNames"], (d) => {
    const scanned = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
    const selected = Array.isArray(d?.selectedGroupNames) ? d.selectedGroupNames : [];
    renderGroupsChecklist(scanned, selected);
    log(`✓ Restaurados tus ${selected.length} grupos favoritos guardados.`);
  });
});

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

// Escanear grupos desde Facebook con detección multiruta
document.getElementById("btn-scan-groups")?.addEventListener("click", async () => {
  log("Buscando grupos en Facebook...");
  try {
    const fbTabs = await chrome.tabs.query({ url: "*://*.facebook.com/*" });
    if (fbTabs.length > 0) {
      const activeFbTab = fbTabs.find(t => t.active) || fbTabs[0];
      chrome.tabs.sendMessage(activeFbTab.id, { action: "SCAN_MY_GROUPS" }, (res) => {
        if (!chrome.runtime.lastError && res && res.groups && res.groups.length > 0) {
          chrome.storage?.local?.get(["selectedGroupNames"], (d) => {
            renderGroupsChecklist(res.groups, d?.selectedGroupNames || []);
            log(`✓ ${res.groups.length} grupos detectados.`);
          });
        } else {
          // Si la pestaña actual no tiene grupos en el DOM visible, llevarla a /groups/joins/
          log("Abriendo 'Tus grupos' en Facebook para auto-escanear...");
          chrome.tabs.update(activeFbTab.id, { url: "https://www.facebook.com/groups/joins/", active: true });
        }
      });
    } else {
      log("Abriendo Facebook para cargar tus grupos...");
      chrome.tabs.create({ url: "https://www.facebook.com/groups/joins/", active: true });
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

