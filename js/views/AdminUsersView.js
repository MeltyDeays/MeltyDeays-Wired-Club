/**
 * Vista / Subcontrolador: Gestión de Socios, PINs, Niveles y Ajuste de Puntos (The Wired Club)
 */
import { FirestoreService } from "../services/FirestoreService.js";

let vm = null;
let showToast = () => {};
let closeModal = () => {};
let attachPhoneMask = () => {};

export function initAdminUsersView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.attachPhoneMask) attachPhoneMask = deps.attachPhoneMask;
  }
}

let usersFilterQuery = "";
let usersTierFilter = "ALL";
let usersSortOrder = "newest";

export async function refreshAdminUsers() {
  if (vm && vm.isAuthenticated) {
    showToast("Sincronizando socios con la base de datos...", "info");
    await vm.refreshData();
    renderUsersTable(vm.users);
    showToast(`✓ Base de datos sincronizada: ${vm.users.length} socios registrados.`, "success");
  }
}

export function renderUsersTable(users) {
  const tbody = document.getElementById("clients-table-body");
  if (!tbody) return;

  let filtered = [...(users || [])];
  if (usersTierFilter !== "ALL") {
    filtered = filtered.filter(u => {
      const t = (u.tier || "NAVI_USER").toUpperCase();
      if (usersTierFilter === "NAVI") return t.includes("NAVI");
      if (usersTierFilter === "RUNNER") return t.includes("RUNNER");
      if (usersTierFilter === "ELITE") return t.includes("ELITE");
      if (usersTierFilter === "DEUS") return t.includes("DEUS");
      return t === usersTierFilter;
    });
  }
  if (usersFilterQuery) {
    const q = usersFilterQuery.toLowerCase();
    const qClean = q.replace(/\D/g, "");
    filtered = filtered.filter(u => {
      const uPhone = (u.phone || "").toLowerCase();
      const uPhoneClean = (u.phone || "").replace(/\D/g, "");
      const uPhoneFormatted = FirestoreService.formatPhoneDisplay(u.phone).toLowerCase();
      return (
        (u.displayName || "").toLowerCase().includes(q) ||
        uPhone.includes(q) ||
        (qClean && uPhoneClean.includes(qClean)) ||
        uPhoneFormatted.includes(q) ||
        (u.uid || "").toLowerCase().includes(q) ||
        (u.memberCode || "").toLowerCase().includes(q)
      );
    });
  }

  // Ordenamiento reactivo por más recientes, más antiguos, saldo WP y nombre
  filtered.sort((a, b) => {
    if (usersSortOrder === "newest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    } else if (usersSortOrder === "oldest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    } else if (usersSortOrder === "points-desc") {
      return (b.wiredPoints || 0) - (a.wiredPoints || 0);
    } else if (usersSortOrder === "points-asc") {
      return (a.wiredPoints || 0) - (b.wiredPoints || 0);
    } else if (usersSortOrder === "name-asc") {
      return (a.displayName || "").localeCompare(b.displayName || "");
    } else if (usersSortOrder === "name-desc") {
      return (b.displayName || "").localeCompare(a.displayName || "");
    }
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">👥</div>
          <strong>No se encontraron socios con los filtros aplicados.</strong>
          <div style="font-size: 0.8rem; margin-top: 4px;">Los clientes aparecerán automáticamente aquí cuando se registren al escanear una factura.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const tier = (u.tier || "NAVI_USER").toUpperCase();
    let tierBadgeClass = "badge-tier-navi";
    let tierDisplay = "NAVI";
    if (tier.includes("RUNNER")) { tierBadgeClass = "badge-tier-runner"; tierDisplay = "RUNNER"; }
    else if (tier.includes("ELITE")) { tierBadgeClass = "badge-tier-elite"; tierDisplay = "ELITE"; }
    else if (tier.includes("DEUS")) { tierBadgeClass = "badge-tier-deus"; tierDisplay = "DEUS"; }

    const isBanned = u.status === "BANNED";
    const statusBadge = isBanned 
      ? `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border-color:#f87171; font-size:0.65rem; margin-left:4px;">🚫 SUSPENDIDO</span>`
      : "";

    const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "Reciente";

    const phoneDisplay = u.phone ? ("+505 " + FirestoreService.formatPhoneDisplay(u.phone)) : "-";

    return `
      <tr style="${isBanned ? 'background:#fff1f2;' : ''}">
        <td>
          <strong style="color:var(--dark); font-size:0.9rem;">${u.displayName || "Socio Sin Nombre"}</strong>
          <div style="font-size:0.72rem; color:var(--primary); font-family:var(--font-mono); font-weight:700;">${u.memberCode || u.uid}</div>
        </td>
        <td>
          <div style="font-family:var(--font-mono); font-size:0.8rem; color:var(--dark); font-weight:700;">📞 ${phoneDisplay}</div>
          <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; margin-top:3px;">
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--gray-500); font-size:0.7rem;">PIN:</span>
            <strong style="font-family:var(--font-mono); font-size:0.82rem; font-weight:800; background:#e0e7ff; color:#312e81; padding:1px 6px; border-radius:3px; border:1px solid #c7d2fe; letter-spacing:1px;" title="PIN de acceso">${u.pin || "1234"}</strong>
            <button class="btn-secondary" style="padding:1px 5px; font-size:0.7rem; line-height:1; cursor:pointer;" onclick="openEditPinModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.pin || ''}', '${u.phone || ''}')" title="Modificar PIN">✏️</button>
          </div>
        </td>
        <td>
          <span class="${tierBadgeClass}">${tierDisplay}</span>
          ${statusBadge}
        </td>
        <td><strong style="font-family:var(--font-mono); font-size:0.95rem; color:#4338ca;">${(u.wiredPoints || 0).toLocaleString()} WP</strong></td>
        <td><span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--gray-700);">${(u.lifetimePoints || 0).toLocaleString()} WP</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${joinDate}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-primary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 3px;" onclick="openAdjustPointsModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', ${u.wiredPoints || 0})" title="Cargar o Deducir Puntos">
            ⚡ +/- Puntos
          </button>
          <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 3px;" onclick="openUserLedgerModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}')" title="Ver Historial Contable">
            📜 Historial
          </button>
          <button class="btn-secondary" style="padding: 3px 7px; font-size: 0.72rem; margin-right: 3px; ${isBanned ? 'color:#059669; border-color:#059669;' : 'color:#d97706; border-color:#d97706;'}" onclick="toggleBanUserAdmin('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.status || 'ACTIVE'}')" title="${isBanned ? 'Reactivar Socio' : 'Suspender/Banear Socio'}">
            ${isBanned ? '✓ Activar' : '🚫 Banear'}
          </button>
          <button class="btn-secondary" style="padding: 3px 7px; font-size: 0.72rem; color:#dc2626; border-color:#ef4444;" onclick="openDeleteUserModal('${u.uid}', '${(u.displayName || '').replace(/'/g, "\\'")}', '${u.phone || ''}')" title="Eliminar Socio Permanentemente">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

export function filterUsers() {
  const input = document.getElementById("search-users-input");
  usersFilterQuery = (input ? input.value : "").trim();
  renderUsersTable(vm.users);
}

export function filterUsersByTier(tier) {
  usersTierFilter = tier;
  const tiers = ["ALL", "NAVI", "RUNNER", "ELITE", "DEUS"];
  tiers.forEach(t => {
    const btn = document.getElementById("tier-btn-" + t);
    if (btn) {
      if (t === tier) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });
  renderUsersTable(vm.users);
}

export function sortUsersAdmin(order) {
  usersSortOrder = order || "newest";
  const select = document.getElementById("sort-users-select");
  if (select && select.value !== usersSortOrder) select.value = usersSortOrder;
  if (vm) renderUsersTable(vm.users);
}

export function toggleAdjustType(direction) {
  selectAdjustDirection(direction || "ADD");
}

export function selectAdjustDirection(direction) {
  const addBtn = document.getElementById("btn-toggle-add");
  const subBtn = document.getElementById("btn-toggle-sub");
  const typeInput = document.getElementById("adjust-type-val");
  const submitBtn = document.getElementById("btn-submit-adjust");

  if (typeInput) typeInput.value = direction;

  if (direction === "ADD") {
    if (addBtn) addBtn.className = "lain-toggle-btn active-add";
    if (subBtn) subBtn.className = "lain-toggle-btn";
    if (submitBtn) {
      submitBtn.textContent = "⚡ OTORGAR PUNTOS (+)";
      submitBtn.style.background = "var(--primary)";
    }
  } else {
    if (addBtn) addBtn.className = "lain-toggle-btn";
    if (subBtn) subBtn.className = "lain-toggle-btn active-sub";
    if (submitBtn) {
      submitBtn.textContent = "➖ DEDUCIR PUNTOS (-)";
      submitBtn.style.background = "#e11d48";
    }
  }
}

export function openAdjustPointsModal(uid, name, currentPts) {
  const modal = document.getElementById("modal-adjust-points");
  if (!modal) return;
  document.getElementById("adjust-user-uid").value = uid;
  document.getElementById("adjust-user-name").textContent = name;
  document.getElementById("adjust-user-current").textContent = currentPts.toLocaleString() + " WP";
  document.getElementById("adjust-points-amount").value = "";
  document.getElementById("adjust-points-reason").value = "";
  selectAdjustDirection("ADD");
  modal.style.display = "flex";
  setTimeout(() => {
    const input = document.getElementById("adjust-points-amount");
    if (input) input.focus();
  }, 100);
}

export function setAdjustQuickPoints(pts) {
  const input = document.getElementById("adjust-points-amount");
  if (input) {
    input.value = pts;
    input.focus();
  }
}

export async function submitAdjustPoints() {
  const uid = document.getElementById("adjust-user-uid").value;
  const amountStr = document.getElementById("adjust-points-amount").value;
  const amount = parseInt(amountStr, 10);
  const reason = document.getElementById("adjust-points-reason").value.trim() || "Ajuste Directo de Mostrador";
  const type = document.getElementById("adjust-type-val")?.value || "ADD";

  if (!amount || isNaN(amount) || amount <= 0) {
    showToast("⚠️ Ingresa una cantidad de puntos válida mayor a 0.", "error");
    return;
  }

  const delta = type === "ADD" ? amount : -amount;

  try {
    const res = await vm.adjustUserPoints(uid, delta, reason);
    closeModal("modal-adjust-points");
    const updatedUser = res.user;
    showToast(`✓ Saldo actualizado: ${updatedUser.displayName} ahora tiene ${updatedUser.wiredPoints.toLocaleString()} WP`, "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export function openUserLedgerModal(uid, name) {
  const modal = document.getElementById("modal-user-ledger");
  if (!modal) return;
  document.getElementById("ledger-user-name").textContent = "Historial: " + name;
  document.getElementById("ledger-user-uid").textContent = "UID: " + uid;
  const tbody = document.getElementById("user-ledger-tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--gray-500);">Cargando libro contable...</td></tr>`;
  }
  modal.style.display = "flex";

  const ledger = vm.getUserLedger(uid);
  if (!ledger || ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono);">
          [LEDGER VACÍO] No hay movimientos registrados para este socio aún.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ledger.map(entry => {
    const rawDelta = entry.delta !== undefined ? entry.delta : (entry.type === "ADMIN_DEBIT" ? -(entry.amount || 0) : (entry.amount || 0));
    const isCredit = rawDelta >= 0;
    const diffClass = isCredit ? "ledger-credit" : "ledger-debit";
    const sign = isCredit ? "+" : "-";
    const dateVal = entry.created_at || entry.timestamp || entry.date;
    const dateStr = dateVal ? new Date(dateVal).toLocaleString("es-ES") : "-";
    const amountVal = Math.abs(rawDelta);
    const balanceVal = entry.balance_after !== undefined ? entry.balance_after : (entry.balanceAfter !== undefined ? entry.balanceAfter : (entry.balance || 0));
    const reasonVal = entry.note || entry.reason || entry.glosa || "-";

    return `
      <tr>
        <td style="font-size:0.75rem; color:var(--gray-600); font-family:var(--font-mono);">${dateStr}</td>
        <td><span class="badge-navi" style="font-size:0.65rem;">${entry.type || "AJUSTE"}</span></td>
        <td style="color:var(--dark); font-weight:600;">${reasonVal}</td>
        <td class="${diffClass}" style="text-align:right;">${sign}${amountVal.toLocaleString()} WP</td>
        <td style="text-align:right; font-family:var(--font-mono); font-weight:800; color:var(--dark);">${balanceVal.toLocaleString()} WP</td>
      </tr>
    `;
  }).join("");
}

export function toggleNewUserPinVisibility() {
  const pinInput = document.getElementById("new-user-pin");
  if (!pinInput) return;
  pinInput.type = pinInput.type === "password" ? "text" : "password";
}

export function updateNewUserPreview() {
  const nameEl = document.getElementById("new-user-name");
  const phoneEl = document.getElementById("new-user-phone");
  const pinEl = document.getElementById("new-user-pin");
  const ptsEl = document.getElementById("new-user-points");

  const nameVal = nameEl ? nameEl.value.trim() : "";
  const phoneVal = phoneEl ? phoneEl.value.trim() : "";
  const pinVal = pinEl ? pinEl.value.trim() : "";
  const ptsVal = ptsEl ? (parseInt(ptsEl.value, 10) || 0) : 0;

  const pName = document.getElementById("preview-new-user-name");
  const pPhone = document.getElementById("preview-new-user-phone");
  const pPin = document.getElementById("preview-new-user-pin");
  const pUid = document.getElementById("preview-new-user-uid");
  const pPts = document.getElementById("preview-new-user-points");

  const clean = FirestoreService.normalizePhone(phoneVal);
  if (pName) pName.textContent = nameVal || "Socio Sin Nombre";
  if (pPhone) pPhone.textContent = "📞 Tel: " + (clean ? ("+505 " + FirestoreService.formatPhoneDisplay(clean)) : "+505 --------");
  if (pPin) pPin.textContent = "🔑 PIN: " + (pinVal || "----");
  if (pUid) pUid.textContent = "UID: CLIENT-" + (clean || "--------");
  if (pPts) pPts.textContent = "Saldo: " + ptsVal.toLocaleString() + " WP";
}

export function generateNewUserRandomPin() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const pinInput = document.getElementById("new-user-pin");
  if (pinInput) {
    pinInput.value = pin;
    pinInput.type = "text";
  }
  updateNewUserPreview();
}

export function setNewUserQuickPoints(points) {
  const ptsInput = document.getElementById("new-user-points");
  if (ptsInput) ptsInput.value = points;
  updateNewUserPreview();
}

export function openNewUserModal() {
  const modal = document.getElementById("modal-new-user");
  if (!modal) return;
  const nameInput = document.getElementById("new-user-name");
  const phoneInput = document.getElementById("new-user-phone");
  const pinInput = document.getElementById("new-user-pin");
  const ptsInput = document.getElementById("new-user-points");

  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (pinInput) {
    pinInput.value = "110805";
    pinInput.type = "text";
  }
  if (ptsInput) ptsInput.value = "0";

  updateNewUserPreview();
  modal.style.display = "flex";
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
}

export async function saveNewUserAdmin() {
  const name = document.getElementById("new-user-name").value.trim();
  const phone = document.getElementById("new-user-phone").value.trim();
  const pin = document.getElementById("new-user-pin").value.trim() || "110805";
  const points = parseInt(document.getElementById("new-user-points").value, 10) || 0;

  if (!name) {
    showToast("⚠️ El nombre del socio es obligatorio.", "error");
    return;
  }
  const cleanPhone = FirestoreService.normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 8) {
    showToast("⚠️ Ingresa un número telefónico válido de 8 dígitos (ej: 5843-8412). El prefijo +505 es automático.", "error");
    return;
  }
  if (pin.length < 4 || pin.length > 8) {
    showToast("⚠️ El PIN de seguridad debe tener entre 4 y 8 dígitos.", "error");
    return;
  }

  try {
    const user = await vm.registerUserFromAdmin({ displayName: name, phone: cleanPhone, pin, initialPoints: points });
    closeModal("modal-new-user");
    showToast(`✓ Socio ${user.displayName} registrado con éxito. PIN: ${user.pin}`, "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export function openEditPinModal(uid, name, currentPin, phone) {
  const modal = document.getElementById("modal-edit-user-pin");
  if (!modal) return;
  document.getElementById("edit-pin-target-uid").value = uid;
  document.getElementById("edit-pin-user-name").textContent = name || "Socio";
  document.getElementById("edit-pin-user-phone").textContent = phone ? ("+505 " + FirestoreService.formatPhoneDisplay(phone)) : "-";
  document.getElementById("edit-pin-user-current").textContent = currentPin || "----";
  const input = document.getElementById("edit-pin-new-input");
  if (input) {
    input.value = currentPin || "";
  }
  modal.style.display = "flex";
  setTimeout(() => {
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

export function generateEditPinRandom() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const input = document.getElementById("edit-pin-new-input");
  if (input) input.value = pin;
}

export function setEditPinPreset(val) {
  const input = document.getElementById("edit-pin-new-input");
  if (input) input.value = val;
}

export async function submitEditUserPin() {
  const uid = document.getElementById("edit-pin-target-uid").value;
  const newPin = (document.getElementById("edit-pin-new-input").value || "").trim();
  const name = document.getElementById("edit-pin-user-name").textContent;

  if (!uid) {
    showToast("⚠️ UID de socio no especificado.", "error");
    return;
  }
  if (!newPin || newPin.length < 4 || newPin.length > 8) {
    showToast("⚠️ El PIN debe tener entre 4 y 8 dígitos numéricos.", "error");
    return;
  }

  try {
    await vm.updateUserPin(uid, newPin);
    closeModal("modal-edit-user-pin");
    showToast(`✓ Clave PIN actualizada a [${newPin}] para ${name}.`, "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ Error al actualizar PIN: " + err.message, "error");
  }
}

export function openDeleteUserModal(uid, name, phone) {
  const modal = document.getElementById("modal-delete-user");
  if (!modal) return;
  document.getElementById("delete-user-target-uid").value = uid;
  document.getElementById("delete-user-info-name").textContent = name;
  document.getElementById("delete-user-info-phone").textContent = "Teléfono: " + (phone ? ("+505 " + FirestoreService.formatPhoneDisplay(phone)) : "-");
  document.getElementById("delete-user-info-uid").textContent = "UID: " + uid;
  modal.style.display = "flex";
}

export async function executeDeleteUserAdmin() {
  const uid = document.getElementById("delete-user-target-uid").value;
  if (!uid) return;
  closeModal("modal-delete-user");
  showToast("Eliminando socio de la base de datos...", "info");
  try {
    await vm.deleteUser(uid);
    showToast("✓ Socio eliminado permanentemente.", "success");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ Error al eliminar socio: " + err.message, "error");
  }
}

export function openBanUserModal(uid, name, currentStatus) {
  const modal = document.getElementById("modal-ban-user");
  if (!modal) return;
  const user = (vm.users || []).find(u => u.uid === uid) || {};
  const isBanned = (currentStatus || user.status) === "BANNED";
  const willBan = !isBanned;

  document.getElementById("ban-user-target-uid").value = uid;
  document.getElementById("ban-user-target-status").value = isBanned ? "BANNED" : "ACTIVE";
  document.getElementById("ban-user-info-name").textContent = name || user.displayName || "-";

  const phone = user.phone || "";
  document.getElementById("ban-user-info-phone").textContent = "Teléfono: " + (phone ? ("+505 " + (FirestoreService.formatPhoneDisplay ? FirestoreService.formatPhoneDisplay(phone) : phone)) : "-");
  
  const statusEl = document.getElementById("ban-user-info-status");
  if (statusEl) {
    statusEl.textContent = "Estado actual: " + (isBanned ? "SUSPENDIDO / BANEADO" : "ACTIVO");
    statusEl.style.color = isBanned ? "#dc2626" : "#059669";
  }
  document.getElementById("ban-user-info-uid").textContent = "UID: " + uid;

  const titleEl = document.getElementById("ban-user-title");
  const descEl = document.getElementById("ban-user-desc");
  const confirmBtn = document.getElementById("btn-confirm-ban-user");
  const modalHeader = document.getElementById("ban-user-modal-header");
  const badgeEl = document.getElementById("ban-user-badge");
  const layerBadgeEl = document.getElementById("ban-user-layer-badge");

  if (willBan) {
    if (titleEl) {
      titleEl.textContent = "🚫 ¿SUSPENDER CUENTA DE SOCIO?";
      titleEl.style.color = "#b45309";
    }
    if (descEl) descEl.textContent = "Esta acción suspenderá temporalmente la cuenta del socio e impedirá el canje y acumulación de puntos:";
    if (confirmBtn) {
      confirmBtn.innerHTML = "🚫 SUSPENDER SOCIO";
      confirmBtn.style.background = "#d97706";
      confirmBtn.style.borderColor = "#b45309";
    }
    if (modalHeader) modalHeader.style.borderBottomColor = "#d97706";
    if (badgeEl) {
      badgeEl.style.background = "#fef3c7";
      badgeEl.style.color = "#b45309";
      badgeEl.style.borderColor = "#f59e0b";
      badgeEl.textContent = "COPLAND OS 21.0 // SEGURIDAD";
    }
    if (layerBadgeEl) layerBadgeEl.textContent = "SUSPENSIÓN DE CUENTA";
  } else {
    if (titleEl) {
      titleEl.textContent = "✓ ¿REACTIVAR CUENTA DE SOCIO?";
      titleEl.style.color = "#059669";
    }
    if (descEl) descEl.textContent = "Esta acción restaurará el estado activo del socio y habilitará nuevamente el uso de sus Wired Points:";
    if (confirmBtn) {
      confirmBtn.innerHTML = "✓ REACTIVAR SOCIO";
      confirmBtn.style.background = "#059669";
      confirmBtn.style.borderColor = "#047857";
    }
    if (modalHeader) modalHeader.style.borderBottomColor = "#059669";
    if (badgeEl) {
      badgeEl.style.background = "#ecfdf5";
      badgeEl.style.color = "#065f46";
      badgeEl.style.borderColor = "#10b981";
      badgeEl.textContent = "COPLAND OS 21.0 // REACTIVACIÓN";
    }
    if (layerBadgeEl) layerBadgeEl.textContent = "DESBLOQUEO DE CUENTA";
  }

  modal.style.display = "flex";
}

export async function executeBanUserAdmin() {
  const uid = document.getElementById("ban-user-target-uid").value;
  if (!uid) return;
  const name = document.getElementById("ban-user-info-name").textContent;
  closeModal("modal-ban-user");
  try {
    const updated = await vm.toggleUserBan(uid);
    const isNowBanned = updated.status === "BANNED";
    showToast(isNowBanned ? `🚫 Socio [${name}] suspendido.` : `✓ Socio [${name}] reactivado.`, "info");
    renderUsersTable(vm.users);
  } catch (err) {
    showToast("❌ Error: " + err.message, "error");
  }
}

export function toggleBanUserAdmin(uid, name, currentStatus) {
  openBanUserModal(uid, name, currentStatus);
}

// ========================================================
// HISTORIAL Y AUDITORÍA DE VALES DE CANJE