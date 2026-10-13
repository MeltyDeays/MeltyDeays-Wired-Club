/* Controlador de popup de la extensión Haibane Sync */

const logEl = document.getElementById("log");

function log(msg) {
  if (logEl) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }
}

// Botón: Enlazar Gemelos con Tienda Web (Anti-Duplicados)
document.getElementById("btn-link-twins")?.addEventListener("click", async () => {
  log("🔍 Buscando tus publicaciones en Facebook para enlazarlas con la web...");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("facebook.com/marketplace")) {
      chrome.tabs.sendMessage(currentTab.id, { action: "LINK_TWINS" }, (res) => {
        if (chrome.runtime.lastError) {
          log(`⚠️ Aviso: ${chrome.runtime.lastError.message}`);
          return;
        }
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
      chrome.tabs.sendMessage(currentTab.id, { action: "AUDIT_LISTINGS" }, (res) => {
        if (chrome.runtime.lastError) {
          log(`⚠️ Aviso: ${chrome.runtime.lastError.message}`);
          return;
        }
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
      chrome.tabs.sendMessage(activeFbTab.id, { action: "SCAN_MY_GROUPS" }, (res) => {
        if (!chrome.runtime.lastError && res && res.groups && res.groups.length > 0) {
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
      chrome.tabs.sendMessage(currentTab.id, { action: "RUN_AUTO_RELIST", maxDays: relistDays }, (res) => {
        if (chrome.runtime.lastError) {
          log(`⚠️ Aviso: ${chrome.runtime.lastError.message}`);
          return;
        }
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
        chrome.tabs.sendMessage(currentTab.id, {
          action: "AUTO_SHARE_GROUPS",
          mode: mode,
          targetCount: selected.length > 0 ? selected.length : 12,
          selectedNames: selected
        }, (res) => {
          if (chrome.runtime.lastError) {
            log(`⚠️ Aviso: ${chrome.runtime.lastError.message}`);
            return;
          }
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

