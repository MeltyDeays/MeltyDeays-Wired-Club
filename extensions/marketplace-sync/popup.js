/* Controlador de popup de la extensión Haibane Sync */

const logEl = document.getElementById("log");

function log(msg) {
  if (logEl) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }
}

/**
 * Envío resiliente de mensajes a la pestaña activa con auto-reconexión e inyección dinámica
 * Previene el error: 'Could not establish connection. Receiving end does not exist.'
 */
function sendTabMessageWithAutoReconnect(tabId, message, onResponse) {
  chrome.tabs.sendMessage(tabId, message, (res) => {
    const err = chrome.runtime.lastError;
    if (!err) {
      if (typeof onResponse === "function") onResponse(res);
      return;
    }

    const errMsg = err.message || "";
    const isDisconnected = errMsg.includes("Could not establish connection") || errMsg.includes("Receiving end does not exist");

    if (isDisconnected && chrome.scripting) {
      log("🔄 Reconectando extensión con Facebook...");
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"]
      }, () => {
        const injectErr = chrome.runtime.lastError;
        if (injectErr) {
          log("⚠️ Pestaña desincronizada. Por favor recarga Facebook (F5) para activar la extensión.");
          return;
        }

        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, message, (retryRes) => {
            const retryErr = chrome.runtime.lastError;
            if (retryErr) {
              log("⚠️ Conexión perdida. Recarga la pestaña de Facebook (F5) para activar la extensión.");
            } else {
              if (typeof onResponse === "function") onResponse(retryRes);
            }
          });
        }, 300);
      });
      return;
    }

    if (isDisconnected) {
      log("⚠️ Extensión actualizada. Recarga la pestaña de Facebook (F5) para reconectar.");
    } else {
      log(`⚠️ Aviso: ${errMsg}`);
    }
  });
}

// Botón: Enlazar Gemelos con Tienda Web (Anti-Duplicados)
document.getElementById("btn-link-twins")?.addEventListener("click", async () => {
  log("🔍 Buscando tus publicaciones en Facebook para enlazarlas con la web...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      sendTabMessageWithAutoReconnect(currentTab.id, { action: "LINK_TWINS" }, (res) => {
        log(res?.message || "✓ Enlace de gemelos completado con éxito.");
      });
    } else {
      log("⚠️ Abre facebook.com/marketplace/you/selling para conectar tus productos.");
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

// Botón: Comprobar Precios y Vendidos (Auditoría)
document.getElementById("btn-audit")?.addEventListener("click", async () => {
  log("🔍 Revisando publicaciones en Facebook para detectar precios y ventas...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      sendTabMessageWithAutoReconnect(currentTab.id, { action: "AUDIT_LISTINGS" }, (res) => {
        log(res?.message || "✓ Auditoría finalizada correctamente.");
      });
    } else {
      log("⚠️ Abre facebook.com/marketplace/you/selling para revisar tus productos.");
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

// Botón: Sincronizar Tienda en la Nube (Vercel)
document.getElementById("btn-cloud-sync")?.addEventListener("click", async () => {
  log("☁️ Conectando con los servidores en la nube de Vercel...");
  try {
    const res = await fetch("https://meltydeays-wired-club.vercel.app/api/sync-facebook", { method: "POST" });
    const data = await res.json();
    if (data.success && data.report) {
      const up = data.report.updatedProducts?.length || 0;
      const sold = data.report.markedSoldProducts?.length || 0;
      log(`✓ Nube sincronizada: ${up} productos al día, ${sold} marcados como vendidos.`);
    } else {
      log(`✓ Nube verificada: ${data.error || "Catálogo sincronizado sin cambios pendientes."}`);
    }
  } catch (err) {
    log(`❌ Error al conectar con Vercel: ${err.message}`);
  }
});

// Variable de modo activo ('ai' | 'custom')
let currentGroupMode = "ai";

function updateModeUI(mode) {
  currentGroupMode = mode;
  const btnAi = document.getElementById("btn-mode-ai");
  const btnCustom = document.getElementById("btn-mode-custom");
  const statusEl = document.getElementById("mode-status-text");

  if (mode === "ai") {
    if (btnAi) {
      btnAi.style.background = "#7e22ce";
      btnAi.style.color = "#ffffff";
      btnAi.style.borderColor = "#a855f7";
      btnAi.style.fontWeight = "800";
    }
    if (btnCustom) {
      btnCustom.style.background = "#0f172a";
      btnCustom.style.color = "#94a3b8";
      btnCustom.style.borderColor = "#1e293b";
      btnCustom.style.fontWeight = "normal";
    }
    if (statusEl) {
      statusEl.innerHTML = `🎯 <strong>Modo IA Activo:</strong> Prioriza automáticamente ventas y negocios en Juigalpa y zonas cercanas (Chontales, Boaco, etc.).`;
      statusEl.style.borderLeftColor = "#a855f7";
    }
  } else {
    if (btnCustom) {
      btnCustom.style.background = "#059669";
      btnCustom.style.color = "#ffffff";
      btnCustom.style.borderColor = "#10b981";
      btnCustom.style.fontWeight = "800";
    }
    if (btnAi) {
      btnAi.style.background = "#0f172a";
      btnAi.style.color = "#94a3b8";
      btnAi.style.borderColor = "#1e293b";
      btnAi.style.fontWeight = "normal";
    }
    if (statusEl) {
      statusEl.innerHTML = `⭐ <strong>Modo Mis Fijos Activo:</strong> Marca las casillas de tus 12 grupos favoritos abajo y pulsa "Guardar Selección".`;
      statusEl.style.borderLeftColor = "#10b981";
    }
  }
}

// Cargar preferencias de auto-compartir en grupos y auto-relist
chrome.storage?.local?.get(["groupShareAuto", "selectedGroupNames", "groupSelectionMode", "scannedFacebookGroups", "relistAuto", "relistDays"], (data) => {
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

  const mode = data?.groupSelectionMode || "ai";
  updateModeUI(mode);

  const scanned = Array.isArray(data?.scannedFacebookGroups) ? data.scannedFacebookGroups : [];
  const selected = Array.isArray(data?.selectedGroupNames) ? data.selectedGroupNames : [];
  renderGroupsChecklist(scanned, selected, mode);
});

function scoreGroupRelevance(groupName) {
  const norm = (groupName || "").toLowerCase().trim();

  // 1. Detección de grupos opuestos / baja afinidad
  const isOpposite = /ropa|calzado|zapatos|vestidos|moda|belleza|cosm[eé]ticos|bienes ra[ií]ces|casas|terrenos|alquiler|autos|carros|motos|veh[ií]culos|animales|mascotas/.test(norm);
  if (isOpposite) {
    return { score: 10, badge: "⚪ Baja Afinidad", badgeColor: "#64748b" };
  }

  // 2. Detección geográfica: Juigalpa y Chontales
  const isJuigalpa = /juigalpa|chontales/.test(norm);

  // 3. Detección geográfica: Lugares cercanos a la ciudad de Juigalpa
  const isNearby = /acoyapa|santo tom[aá]s|villa sandino|san pedro de l[oó]vago|la libertad|comalapa|cuapa|el coral|boaco|camoapa|teustepe|san lorenzo|el rama|nueva guinea|r[ií]o san juan|san carlos/.test(norm);

  // 4. Detección comercial (vender / compras / negocios / clasificados)
  const isCommerce = /ventas?|compras?|negocios?|comercio|bazar|gangas?|clasificados?|tienda|mercado|feria|cambalache|baratillo/.test(norm);

  // 5. Detección tecnológica / gaming
  const isTechGaming = /gamer|gaming|videojuegos?|consolas?|playstation|xbox|nintendo|pc gamer|setup|geek|computador|laptop|pc|hardware|inform[aá]tica|tecnolog[ií]a|electr[oó]nica|celular|smartphone|gadgets?/.test(norm);

  // CATEGORÍA 1: JUIGALPA (Máxima Prioridad)
  if (isJuigalpa) {
    if (isCommerce && isTechGaming) {
      return { score: 99, badge: "🔥 Juigalpa Tech", badgeColor: "#a855f7" }; // Morado
    }
    if (isCommerce) {
      return { score: 96, badge: "📍 Juigalpa Ventas", badgeColor: "#10b981" }; // Esmeralda
    }
    if (isTechGaming) {
      return { score: 94, badge: "⚡ Juigalpa Tech", badgeColor: "#8b5cf6" }; // Violeta
    }
    return { score: 90, badge: "📍 Juigalpa Local", badgeColor: "#059669" }; // Verde
  }

  // CATEGORÍA 2: LUGARES CERCANOS A JUIGALPA (Segunda Prioridad)
  if (isNearby) {
    if (isCommerce && isTechGaming) {
      return { score: 88, badge: "🏘️ Cercano Tech", badgeColor: "#3b82f6" }; // Azul brillante
    }
    if (isCommerce) {
      return { score: 85, badge: "🏘️ Cercano Ventas", badgeColor: "#0284c7" }; // Azul
    }
    if (isTechGaming) {
      return { score: 82, badge: "🏘️ Cercano Tech", badgeColor: "#06b6d4" }; // Cyan
    }
    return { score: 78, badge: "🏘️ Zona Cercana", badgeColor: "#0ea5e9" }; // Sky blue
  }

  // CATEGORÍA 3: GAMING Y TECH GENERAL (Nacional)
  if (isTechGaming) {
    if (isCommerce) {
      return { score: 68, badge: "⚡ Tech Ventas Nal", badgeColor: "#f59e0b" }; // Ámbar
    }
    return { score: 62, badge: "⚡ Gaming/PC Nal", badgeColor: "#d97706" }; // Naranja
  }

  // CATEGORÍA 4: VENTAS GENERALES (Nacional / Managua)
  if (isCommerce) {
    return { score: 52, badge: "🏷️ Ventas Nal", badgeColor: "#64748b" }; // Slate
  }

  return { score: 40, badge: "🏷️ General", badgeColor: "#475569" };
}

function renderGroupsChecklist(groups, selected = [], mode = currentGroupMode) {
  const container = document.getElementById("groups-checklist-container");
  const labelCount = document.getElementById("lbl-groups-selected");
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = `<div style="color: #64748b; font-size: 10px; text-align: center; padding: 6px;">Escribe un grupo arriba o pulsa "Escanear" con Facebook abierto.</div>`;
    if (labelCount) labelCount.textContent = `0 / 12 seleccionados`;
    return;
  }

  // Ordenar grupos por puntuación de relevancia IA descendente
  const scoredGroups = groups.map(g => ({
    name: g,
    ai: scoreGroupRelevance(g)
  })).sort((a, b) => b.ai.score - a.ai.score);

  container.innerHTML = "";
  let checkedCount = 0;

  scoredGroups.forEach(({ name: grp, ai }, idx) => {
    // Si estamos en modo IA y selected está vacío, se seleccionan los 12 primeros.
    // Si estamos en modo custom, SOLO se seleccionan los que estén en selected.
    const isChecked = mode === "ai"
      ? (selected.length > 0 ? selected.includes(grp) : idx < 12)
      : selected.includes(grp);

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

  function formatGroupCountText(count) {
    if (count === 12) return "12 / 12 (Óptimo)";
    if (count === 0) return "0 / 12 seleccionados";
    return `${count} / 12 seleccionados`;
  }

  if (labelCount) labelCount.textContent = formatGroupCountText(checkedCount);

  container.querySelectorAll(".chk-fb-group-item").forEach(chk => {
    chk.addEventListener("change", () => {
      const allChecked = container.querySelectorAll(".chk-fb-group-item:checked");
      if (allChecked.length > 20) {
        chk.checked = false;
        alert("Facebook permite un máximo de 20 grupos a la vez.");
        return;
      }
      if (labelCount) labelCount.textContent = formatGroupCountText(allChecked.length);
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
          renderGroupsChecklist(newScanned, newSelected, currentGroupMode);
        });
      });
    });
  });
}

// Escuchar actualizaciones de grupos en segundo plano
chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === "local" && changes.scannedFacebookGroups) {
    chrome.storage.local.get(["selectedGroupNames"], (d) => {
      renderGroupsChecklist(changes.scannedFacebookGroups.newValue || [], d?.selectedGroupNames || [], currentGroupMode);
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
      renderGroupsChecklist(newScanned, newSelected, currentGroupMode);
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

// Selector de Pestaña: Recomendar IA
document.getElementById("btn-mode-ai")?.addEventListener("click", () => {
  updateModeUI("ai");
  chrome.storage?.local?.get(["scannedFacebookGroups"], (d) => {
    const scanned = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
    if (scanned.length === 0) {
      log("Aviso: Primero escanea o añade grupos a tu lista.");
      return;
    }
    const scored = scanned.map(g => ({ name: g, score: scoreGroupRelevance(g).score }))
      .sort((a, b) => b.score - a.score);
    const top12 = scored.slice(0, 12).map(s => s.name);

    chrome.storage.local.set({
      groupSelectionMode: "ai",
      selectedGroupNames: top12
    }, () => {
      renderGroupsChecklist(scanned, top12, "ai");
      log(`✓ Modo IA: Priorizados 12 grupos de ventas en Juigalpa y zonas cercanas.`);
    });
  });
});

// Selector de Pestaña: Mis Fijos
document.getElementById("btn-mode-custom")?.addEventListener("click", () => {
  updateModeUI("custom");
  chrome.storage?.local?.get(["scannedFacebookGroups", "selectedGroupNames"], (d) => {
    const scanned = Array.isArray(d?.scannedFacebookGroups) ? d.scannedFacebookGroups : [];
    const selected = Array.isArray(d?.selectedGroupNames) ? d.selectedGroupNames : [];
    chrome.storage.local.set({ groupSelectionMode: "custom" }, () => {
      renderGroupsChecklist(scanned, selected, "custom");
      log(`✓ Modo 'Mis Fijos' activado: ${selected.length} grupos guardados seleccionados.`);
    });
  });
});

// Limpiar todas las casillas para elegir desde cero
document.getElementById("btn-clear-selection")?.addEventListener("click", () => {
  updateModeUI("custom");
  const container = document.getElementById("groups-checklist-container");
  const labelCount = document.getElementById("lbl-groups-selected");
  container?.querySelectorAll(".chk-fb-group-item").forEach(chk => {
    chk.checked = false;
  });
  if (labelCount) labelCount.textContent = `0 / 12 seleccionados`;
  chrome.storage?.local?.set({ groupSelectionMode: "custom", selectedGroupNames: [] }, () => {
    log("Casillas desmarcadas. Selecciona manualmente tus grupos y pulsa 'Guardar'.");
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

  updateModeUI("custom");
  chrome.storage?.local?.set({
    groupShareAuto,
    selectedGroupNames: selected,
    groupSelectionMode: "custom",
    groupShareCount: selected.length || 12
  }, () => {
    const labelCount = document.getElementById("lbl-groups-selected");
    if (labelCount) labelCount.textContent = selected.length === 12 ? "12 / 12 (Óptimo)" : `${selected.length} / 12 seleccionados`;
    log(`✓ ${selected.length} grupo(s) guardado(s) exitosamente como 'Mis Fijos'.`);
  });
});

// Escanear grupos desde Facebook con detección multiruta
document.getElementById("btn-scan-groups")?.addEventListener("click", async () => {
  log("🔍 Buscando grupos a los que perteneces en Facebook...");
  try {
    const fbTabs = await chrome.tabs.query({ url: "*://*.facebook.com/*" });
    if (fbTabs.length > 0) {
      const activeFbTab = fbTabs.find(t => t.active) || fbTabs[0];
      sendTabMessageWithAutoReconnect(activeFbTab.id, { action: "SCAN_MY_GROUPS" }, (res) => {
        if (res && res.groups && res.groups.length > 0) {
          chrome.storage?.local?.get(["selectedGroupNames"], (d) => {
            renderGroupsChecklist(res.groups, d?.selectedGroupNames || []);
            log(`✓ ${res.groups.length} grupos detectados listos para organizar.`);
          });
        } else {
          // Si la pestaña actual no tiene grupos en el DOM visible, llevarla a /groups/joins/
          log("Abriendo 'Tus grupos' en Facebook para escanearlos automáticamente...");
          chrome.tabs.update(activeFbTab.id, { url: "https://www.facebook.com/groups/joins/", active: true });
        }
      });
    } else {
      log("Abriendo Facebook para cargar tu lista de grupos...");
      chrome.tabs.create({ url: "https://www.facebook.com/groups/joins/", active: true });
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

// Guardar y ejecutar auto-relist
document.getElementById("btn-run-relist-now")?.addEventListener("click", async () => {
  const chkRelist = document.getElementById("chk-relist-auto");
  const numDays = document.getElementById("num-relist-days");
  const relistDays = parseInt(numDays?.value, 10) || 7;
  const relistAuto = chkRelist ? chkRelist.checked : true;

  chrome.storage?.local?.set({ relistDays, relistAuto }, () => {
    log(`🔍 Buscando publicaciones con más de ${relistDays} días sin venderse para renovar...`);
  });

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com")) {
      sendTabMessageWithAutoReconnect(currentTab.id, { action: "RUN_AUTO_RELIST", maxDays: relistDays }, (res) => {
        log(`✓ Ciclo de re-publicación con fotos HD y copy IA iniciado.`);
      });
    } else {
      log("Iniciando ciclo de re-publicación en segundo plano...");
      chrome.runtime.sendMessage({ action: "CHECK_AUTORELIST_NOW", maxDays: relistDays }, (res) => {
        if (chrome.runtime.lastError) {
          log(`⚠️ Aviso: ${chrome.runtime.lastError.message}`);
          return;
        }
        log(res?.message || "✓ Comando de re-publicación enviado.");
      });
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

// Disparar compartir en grupos inmediatamente
document.getElementById("btn-share-groups-now")?.addEventListener("click", async () => {
  log("🔍 Buscando la pantalla de compartir grupos en Facebook...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      chrome.storage?.local?.get(["selectedGroupNames", "groupSelectionMode"], (d) => {
        const mode = d?.groupSelectionMode || currentGroupMode || "ai";
        const selected = Array.isArray(d?.selectedGroupNames) ? d.selectedGroupNames : [];
        sendTabMessageWithAutoReconnect(currentTab.id, {
          action: "AUTO_SHARE_GROUPS",
          mode: mode,
          targetCount: selected.length > 0 ? selected.length : 12,
          selectedNames: selected
        }, (res) => {
          if (res && res.success) {
            log(`✓ ${res.count || 12} grupos marcados y compartidos con éxito.`);
          } else {
            log(`⚠️ Aviso: ${res?.error || "Asegúrate de estar en el paso de compartir grupos en Facebook."}`);
          }
        });
      });
    } else {
      log("⚠️ Abre Facebook Marketplace donde esté la publicación o grupos.");
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

/**
 * =======================================================================
 * MOTOR DE RENOVACIÓN MANUAL DE PUBLICACIONES SELECCIONADAS CON IA
 * =======================================================================
 */

let activeScannedListings = [];

function updateManualRelistCounter() {
  const container = document.getElementById("manual-relist-container");
  const lbl = document.getElementById("lbl-relist-selected-count");
  if (!container || !lbl) return;
  const checked = container.querySelectorAll(".chk-relist-item:checked").length;
  lbl.textContent = `${checked} seleccionada(s) para renovar`;
}

function renderManualRelistListings(listings) {
  const container = document.getElementById("manual-relist-container");
  if (!container) return;

  activeScannedListings = Array.isArray(listings) ? listings : [];

  if (activeScannedListings.length === 0) {
    container.innerHTML = `
      <div style="color: #64748b; font-size: 9.5px; text-align: center; padding: 10px; line-height: 1.4;">
        No se detectaron publicaciones activas en pantalla.<br>
        <span style="color: #38bdf8;">Abre tu panel de ventas (/marketplace/you/selling) y pulsa "Escanear en FB".</span>
      </div>
    `;
    updateManualRelistCounter();
    return;
  }

  // Preservar casillas que el usuario haya desmarcado manualmente
  const previouslyUnchecked = new Set();
  container.querySelectorAll(".chk-relist-item:not(:checked)").forEach(chk => {
    previouslyUnchecked.add(parseInt(chk.dataset.idx, 10));
  });

  const chkPreferReal = document.getElementById("chk-prefer-real-photos");
  const preferRealPhotos = chkPreferReal ? chkPreferReal.checked : true;

  container.innerHTML = activeScannedListings.map((item, idx) => {
    const isLinked = Boolean(item.twinId || item.isTwinLinked);
    const displayPrice = item.priceLine || (item.twinPriceNio ? `C$ ${item.twinPriceNio}` : "-");
    // Prioridad a la imagen real de Facebook, incluso si no existe en la web
    const thumbUrl = preferRealPhotos 
      ? (item.fbThumb || item.thumb || item.webThumb || "") 
      : (item.webThumb || item.fbThumb || item.thumb || "");
    const isChecked = !previouslyUnchecked.has(idx);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: #090d16; border: 1px solid #1e293b; border-radius: 4px; padding: 4px 6px;">
        <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;">
          <input type="checkbox" id="chk-relist-${idx}" class="chk-relist-item" data-idx="${idx}" ${isChecked ? "checked" : ""} style="accent-color: #0284c7; cursor: pointer; transform: scale(1.05);" />
          <div style="width: 28px; height: 28px; border-radius: 4px; overflow: hidden; background: #020617; border: 1px solid #334155; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            ${thumbUrl ? `<img src="${thumbUrl}" alt="${item.fbTitle}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='📦';" />` : `<span style="font-size: 11px;">📦</span>`}
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.fbTitle}">
              ${item.fbTitle || 'Publicación sin título'}
            </div>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 9px; margin-top: 1px; flex-wrap: wrap;">
              <span style="color: #38bdf8; font-family: monospace; font-weight: 700;">${displayPrice}</span>
              ${isLinked
                ? `<span style="font-size: 8px; background: rgba(16,185,129,0.2); color: #34d399; padding: 0 4px; border-radius: 3px; border: 1px solid rgba(16,185,129,0.3);">✓ Gemelo Web</span>`
                : `<span style="font-size: 8px; background: rgba(245,158,11,0.2); color: #fbbf24; padding: 0 4px; border-radius: 3px; border: 1px solid rgba(245,158,11,0.3);">⚠️ Solo en FB</span>`
              }
            </div>
          </div>
        </div>
        <button type="button" class="btn-delete-listing" data-idx="${idx}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; border-radius: 4px; padding: 2px 6px; font-size: 8.5px; cursor: pointer; flex-shrink: 0;" title="Eliminar esta publicación en Facebook">
          🗑️
        </button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".chk-relist-item").forEach(chk => {
    chk.addEventListener("change", updateManualRelistCounter);
  });

  container.querySelectorAll(".btn-delete-listing").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      const item = activeScannedListings[idx];
      if (!item) return;

      if (!confirm(`¿Eliminar en Facebook Marketplace la publicación "${item.fbTitle}"?`)) return;

      log(`🗑️ Eliminando en Facebook: "${item.fbTitle}"...`);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      if (currentTab && currentTab.id) {
        sendTabMessageWithAutoReconnect(currentTab.id, {
          action: "DELETE_LISTING_BY_ID_OR_TITLE",
          targetId: item.fbListingId || "",
          targetTitle: item.fbTitle || ""
        }, (res) => {
          if (res && res.success) {
            log(`✓ Eliminada en Facebook: "${item.fbTitle}".`);
            activeScannedListings.splice(idx, 1);
            renderManualRelistListings(activeScannedListings);
          } else {
            log(`⚠️ Error al eliminar: ${res?.error || "Desconocido"}`);
          }
        });
      }
    });
  });

  updateManualRelistCounter();
}

// Botón: Escanear publicaciones en pantalla de Facebook
document.getElementById("btn-scan-relist-listings")?.addEventListener("click", async () => {
  log("🔍 Escaneando tus publicaciones en Facebook Marketplace...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com")) {
      sendTabMessageWithAutoReconnect(currentTab.id, { action: "SCAN_MY_LISTINGS" }, (res) => {
        if (res && res.success && Array.isArray(res.listings) && res.listings.length > 0) {
          renderManualRelistListings(res.listings);
          chrome.storage?.local?.set({ lastScannedMarketplaceListings: res.listings });
          log(`✓ ${res.listings.length} publicaciones encontradas en pantalla listas para renovar.`);
        } else {
          // Si no está en /marketplace/you/selling, ofrecer redirigir
          if (!currentTab.url.includes("/marketplace/you/selling")) {
            log("Abriendo 'Tus publicaciones' en Facebook (/marketplace/you/selling)...");
            chrome.tabs.update(currentTab.id, { url: "https://www.facebook.com/marketplace/you/selling", active: true });
          } else {
            log("⚠️ No se detectaron productos en pantalla. Baja un poco en la página y vuelve a pulsar Escanear.");
          }
        }
      });
    } else {
      log("Abriendo tus publicaciones en Facebook...");
      chrome.tabs.create({ url: "https://www.facebook.com/marketplace/you/selling", active: true });
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
});

// Botones Marcar Todas / Ninguna
document.getElementById("btn-relist-select-all")?.addEventListener("click", () => {
  const container = document.getElementById("manual-relist-container");
  container?.querySelectorAll(".chk-relist-item").forEach(c => { c.checked = true; });
  updateManualRelistCounter();
});

document.getElementById("btn-relist-select-none")?.addEventListener("click", () => {
  const container = document.getElementById("manual-relist-container");
  container?.querySelectorAll(".chk-relist-item").forEach(c => { c.checked = false; });
  updateManualRelistCounter();
});

// Botón: Ejecutar renovación manual de las publicaciones seleccionadas
document.getElementById("btn-execute-manual-relist")?.addEventListener("click", async () => {
  const container = document.getElementById("manual-relist-container");
  if (!container) return;

  const checkedBoxes = Array.from(container.querySelectorAll(".chk-relist-item:checked"));
  if (checkedBoxes.length === 0) {
    log("⚠️ Selecciona al menos una publicación para renovar con IA.");
    return;
  }

  const selectedItems = checkedBoxes.map(chk => {
    const idx = parseInt(chk.dataset.idx, 10);
    return activeScannedListings[idx];
  }).filter(Boolean);

  const chkPreferReal = document.getElementById("chk-prefer-real-photos");
  const preferRealPhotos = chkPreferReal ? chkPreferReal.checked : true;

  const queue = selectedItems.map(item => {
    const targetId = item.twinId || (item.fbListingId ? `fb_${item.fbListingId}` : null);
    const cleanPriceDigits = item.priceLine ? item.priceLine.replace(/[^0-9]/g, "") : "";
    const chosenThumb = (preferRealPhotos && item.fbThumb) ? item.fbThumb : (item.fbThumb || item.thumb || item.webThumb || "");
    return {
      productId: targetId,
      oldListingId: item.fbListingId || "",
      title: item.fbTitle || "",
      thumb: chosenThumb,
      preferRealPhotos: preferRealPhotos,
      overridePrice: cleanPriceDigits || ""
    };
  }).filter(x => !!x.productId);

  if (queue.length === 0) {
    log("⚠️ No se pudieron obtener identificadores válidos para las publicaciones seleccionadas.");
    return;
  }

  log(`🚀 Iniciando lote de renovación con IA (${queue.length} publicaciones)...`);

  // Despacho de lote START_BATCH_RELIST (compatible con RELIST_EXPIRED_PRODUCT individual)
  chrome.runtime.sendMessage({
    action: "START_BATCH_RELIST",
    queue: queue
  }, (res) => {
    if (res && res.success) {
      log(`✓ Lote iniciado en segundo plano. Procesando 1 de ${queue.length} publicaciones. Cada una se publicará con IA y su versión vieja se eliminará automáticamente.`);
    } else {
      log(`⚠️ Error iniciando lote: ${res?.error || "Desconocido"}`);
    }
  });
});

// Reactividad: alternar miniaturas al cambiar el checkbox de fotos reales
document.getElementById("chk-prefer-real-photos")?.addEventListener("change", () => {
  if (activeScannedListings.length > 0) {
    renderManualRelistListings(activeScannedListings);
  }
});

// Botón: Limpieza masiva de duplicados antiguos en pantalla
document.getElementById("btn-clean-old-duplicates")?.addEventListener("click", async () => {
  log("🧹 Escaneando y eliminando publicaciones antiguas duplicadas...");
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (currentTab && currentTab.id) {
    sendTabMessageWithAutoReconnect(currentTab.id, { action: "CLEAN_OLD_DUPLICATES" }, (res) => {
      if (res && res.success) {
        log(`✓ Limpieza completada: ${res.count || 0} publicaciones viejas eliminadas.`);
        setTimeout(() => {
          document.getElementById("btn-scan-relist-listings")?.click();
        }, 1500);
      } else {
        log(`⚠️ Aviso: ${res?.error || "No se detectaron duplicados para limpiar."}`);
      }
    });
  }
});

// Cargar publicaciones previamente escaneadas de caché local si existen
chrome.storage?.local?.get(["lastScannedMarketplaceListings"], (d) => {
  if (Array.isArray(d?.lastScannedMarketplaceListings) && d.lastScannedMarketplaceListings.length > 0) {
    renderManualRelistListings(d.lastScannedMarketplaceListings);
  }
});

