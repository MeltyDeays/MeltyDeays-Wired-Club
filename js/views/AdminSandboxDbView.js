/**
 * Vista / Subcontrolador: Gestión de Base de Datos Sandbox / Pruebas (The Wired Club)
 * COPLAND OS 21.0 - Protocolo Estricto de Aislamiento y Borrado Selectivo
 */
import { isProduction, getEnvironmentInfo } from "../config/env.js";

let vm = null;
let showToast = () => {};
let renderAdmin = () => {};
let renderTokensTable = () => {};

let activeDraftTab = "tokens";
let draftSearchQuery = "";

export function initAdminSandboxDbView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.renderAdmin) renderAdmin = deps.renderAdmin;
    if (deps.renderTokensTable) renderTokensTable = deps.renderTokensTable;
  }
}

export function setSandboxDraftTab(tab) {
  activeDraftTab = tab;
  renderSandboxDbView();
}

export function filterSandboxDrafts(query) {
  draftSearchQuery = (query || "").trim().toLowerCase();
  renderDraftTable();
}

// ----------------------------------------------------
// ACCIONES DE PURGA GRANULAR
// ----------------------------------------------------

export async function executePurgeUsers() {
  if (!confirm("⚠️ ¿Deseas purgar TODOS los socios/clientes de prueba?\n\nEl perfil de Administrador (PIN 110805) quedará intacto.")) {
    return;
  }
  showToast("Purgando base de datos de socios de prueba...", "info");
  try {
    const res = await vm.purgeUsers();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ ${res.count} socios de prueba eliminados. Admin protegido.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar socios: " + err.message, "error");
  }
}

export async function executePurgeCirculatingPoints() {
  if (!confirm("⚠️ ¿Deseas restablecer a 0 todos los puntos en circulación y vaciar el historial contable?")) {
    return;
  }
  showToast("Purgando puntos en circulación...", "info");
  try {
    const res = await vm.purgeCirculatingPoints();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Puntos en circulación purgados (${res.totalReset} WP restablecidos a 0).`, "success");
  } catch (err) {
    showToast("❌ Error al purgar puntos: " + err.message, "error");
  }
}

export async function executePurgeVouchers(filter = "ALL") {
  const label = filter === "PENDING" ? "PENDIENTES de retiro" : (filter === "DELIVERED" ? "ya ENTREGADOS" : "TODOS");
  if (!confirm(`⚠️ ¿Deseas purgar los vales de canje ${label}?`)) {
    return;
  }
  showToast(`Purgando vales (${label})...`, "info");
  try {
    const res = await vm.purgeVouchers(filter);
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ ${res.count} vales (${label}) eliminados exitosamente.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar vales: " + err.message, "error");
  }
}

export async function executePurgeRewards() {
  if (!confirm("⚠️ ¿Deseas purgar TODOS los productos del catálogo de premios de prueba?")) {
    return;
  }
  showToast("Purgando catálogo de premios...", "info");
  try {
    const res = await vm.purgeRewards();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ ${res.count} productos de catálogo eliminados.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar catálogo: " + err.message, "error");
  }
}

export async function executePurgeInvoicesFromSandbox() {
  if (!confirm("⚠️ ¿Deseas purgar TODAS las facturas/tokens QR y restablecer el folio a #0001?")) {
    return;
  }
  showToast("Purgando facturas y tokens de prueba...", "info");
  try {
    const res = await vm.purgeAllInvoiceTokens();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderSandboxDbView();
    if (typeof renderTokensTable === "function") renderTokensTable(vm.tokens);
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Facturas eliminadas. Siguiente folio libre: #0001.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar facturas: " + err.message, "error");
  }
}

export async function executeSeedDevData() {
  if (!confirm("🌱 ¿Deseas sembrar datos demo estándar (3 socios y 3 productos de prueba)?")) {
    return;
  }
  showToast("Sembrando datos de demostración...", "info");
  try {
    const res = await vm.seedDevData();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Datos demo sembrados: ${res.usersSeeded} socios y ${res.rewardsSeeded} premios.`, "success");
  } catch (err) {
    showToast("❌ Error al sembrar datos demo: " + err.message, "error");
  }
}

// ----------------------------------------------------
// ELIMINADOR SELECTIVO INDIVIDUAL (BORRADORES)
// ----------------------------------------------------

export async function deleteSingleToken(tokenCode, folio) {
  if (!confirm(`🗑️ ¿Eliminar definitivamente la factura #MD-2026-${folio} (${tokenCode})?\n\nEl folio #${folio} quedará libre para volverse a generar de inmediato.`)) {
    return;
  }
  showToast(`Eliminando factura #${folio}...`, "info");
  try {
    await vm.deleteToken(tokenCode);

    // Actualizar campo de folio en lote para que adopte de inmediato el folio liberado
    const nextFolio = vm.getNextAvailableFolio();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      delete folioEl.dataset.userEdited;
      folioEl.value = nextFolio;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) {
      helper.innerHTML = `Siguiente folio libre detectado: <strong>#${String(nextFolio).padStart(4, "0")}</strong> (folio liberado disponible)`;
    }

    renderSandboxDbView();
    if (typeof renderTokensTable === "function") renderTokensTable(vm.tokens);
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Factura #MD-2026-${folio} eliminada. Folio liberado para emisión.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar factura: " + err.message, "error");
  }
}

export async function deleteSingleUser(uid, name) {
  if (uid === "CLIENT-58438412" || uid === "CLIENT-50558438412") {
    showToast("⚠️ Acción protegida: No se puede eliminar el perfil del Administrador principal.", "error");
    return;
  }
  if (!confirm(`🗑️ ¿Eliminar al socio "${name}" (${uid})?`)) {
    return;
  }
  showToast("Eliminando socio...", "info");
  try {
    await vm.deleteUser(uid);
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Socio "${name}" eliminado de la base de datos.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar socio: " + err.message, "error");
  }
}

export async function deleteSingleVoucher(code) {
  if (!confirm(`🗑️ ¿Eliminar el vale de canje "${code}"?`)) {
    return;
  }
  showToast("Eliminando vale...", "info");
  try {
    await vm.deleteVoucher(code);
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Vale "${code}" eliminado exitosamente.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar vale: " + err.message, "error");
  }
}

export async function deleteSingleReward(rewardId, title) {
  if (!confirm(`🗑️ ¿Eliminar del catálogo el producto "${title}" (${rewardId})?`)) {
    return;
  }
  showToast("Eliminando producto...", "info");
  try {
    await vm.deleteReward(rewardId);
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Producto "${title}" eliminado del catálogo.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar producto: " + err.message, "error");
  }
}

// ----------------------------------------------------
// RENDERIZADO PRINCIPAL DE LA VISTA SANDBOX DB
// ----------------------------------------------------

export function renderSandboxDbView() {
  const root = document.getElementById("sandbox-db-root");
  if (!root || !vm) return;

  const isProd = isProduction();
  const envInfo = getEnvironmentInfo();
  const nextFolio = vm.getNextAvailableFolio();

  let totalPointsCirc = 0;
  (vm.users || []).forEach(u => {
    totalPointsCirc += (u.pointsBalance || u.wiredPoints || 0);
  });

  const pendingVouchers = (vm.vouchers || []).filter(v => !v.isDelivered()).length;
  const deliveredVouchers = (vm.vouchers || []).filter(v => v.isDelivered()).length;

  const envBannerHtml = isProd
    ? `
      <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin-bottom: 1.25rem; font-family: var(--font-mono); font-size: 0.82rem; color: #991b1b; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 1.3rem; line-height: 1;">⚠️</span>
        <div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 2px;">ENTORNO ACTIVO: PRODUCCIÓN (LIVE)</strong>
          <span>ADVERTENCIA: Las operaciones de eliminación y purga afectarán los datos oficiales en vivo. Proceder con precaución extrema.</span>
        </div>
      </div>
    `
    : `
      <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 6px; padding: 12px 16px; margin-bottom: 1.25rem; font-family: var(--font-mono); font-size: 0.82rem; color: #854d0e; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 1.3rem; line-height: 1;">🧪</span>
        <div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 2px;">SANDBOX AISLADO: ENTORNO DE PRUEBAS (dev_*)</strong>
          <span>Todas las operaciones de esta consola modifican <strong>única y exclusivamente</strong> las colecciones y almacenamiento de pruebas (<code>dev_users</code>, <code>dev_qr_tokens</code>, <code>dev_redemptions</code>, <code>dev_rewards_catalog</code>, <code>dev_point_ledger</code>). <strong>La base de datos de producción está 100% blindada e intacta.</strong></span>
        </div>
      </div>
    `;

  root.innerHTML = `
    ${envBannerHtml}

    <!-- METRICS TELEMETRY GRID -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
      <div class="noc-stat-box">
        <div class="noc-stat-label">SOCIOS DEV</div>
        <div class="noc-stat-val text-indigo">${(vm.users || []).length}</div>
        <div class="noc-stat-sub">En dev_users</div>
      </div>
      <div class="noc-stat-box">
        <div class="noc-stat-label">PUNTOS EN CIRC.</div>
        <div class="noc-stat-val">${totalPointsCirc.toLocaleString()} WP</div>
        <div class="noc-stat-sub">Saldo total activo</div>
      </div>
      <div class="noc-stat-box">
        <div class="noc-stat-label">FACTURAS / QR</div>
        <div class="noc-stat-val">${(vm.tokens || []).length}</div>
        <div class="noc-stat-sub">Tokens generados</div>
      </div>
      <div class="noc-stat-box accent-amber">
        <div class="noc-stat-label">VALES PENDIENTES</div>
        <div class="noc-stat-val text-amber">${pendingVouchers}</div>
        <div class="noc-stat-sub">Sin despachar</div>
      </div>
      <div class="noc-stat-box accent-emerald">
        <div class="noc-stat-label">VALES ENTREGADOS</div>
        <div class="noc-stat-val text-emerald">${deliveredVouchers}</div>
        <div class="noc-stat-sub">Canjes completados</div>
      </div>
      <div class="noc-stat-box">
        <div class="noc-stat-label">CATÁLOGO DEV</div>
        <div class="noc-stat-val">${(vm.catalog || []).length}</div>
        <div class="noc-stat-sub">Premios en stock</div>
      </div>
      <div class="noc-stat-box" style="border-color: #3b82f6; background: #eff6ff;">
        <div class="noc-stat-label" style="color: #1d4ed8;">FOLIO DISPONIBLE</div>
        <div class="noc-stat-val" style="color: #1d4ed8; font-size: 1.25rem;">#${String(nextFolio).padStart(4, "0")}</div>
        <div class="noc-stat-sub" style="color: #3b82f6;">Primer libre detectado</div>
      </div>
    </div>

    <!-- PURGAS GRANULARES -->
    <div class="admin-section" style="margin-bottom: 1.5rem;">
      <div class="admin-section-header">
        <div>
          <h2>⚡ Acciones de Purga Granular</h2>
          <div style="font-size: 0.8rem; color: var(--gray-500); font-family: var(--font-mono); margin-top: 2px;">
            LIMPIEZA MODULAR DE TABLAS INDIVIDUALES (ZERO-POLLUTION)
          </div>
        </div>
      </div>

      <p style="color: var(--gray-700); font-size: 0.85rem; margin-bottom: 1rem;">
        Ejecuta purgas específicas por módulo sin necesidad de resetear toda la base de datos de pruebas.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem;">
        <!-- Purgar Socios -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>👥</span> Purgar Socios Demo
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Elimina todos los clientes en <code>dev_users</code>. <strong>El perfil Admin (PIN 110805) queda 100% preservado.</strong>
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b91c1c; border-color: #ef4444; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeUsers()">
            🗑️ Purgar Socios
          </button>
        </div>

        <!-- Purgar Puntos Circulación -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>⚡</span> Purgar Puntos Circulando
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Restablece a <strong>0 WP</strong> el saldo de todos los clientes y vacía el ledger contable de movimientos.
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b45309; border-color: #f59e0b; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeCirculatingPoints()">
            ⚡ Purgar Puntos a Cero
          </button>
        </div>

        <!-- Purgar Vales Pendientes -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>⏳</span> Purgar Vales Pendientes
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Elimina únicamente los vales emitidos aún por entregar en mostrador (status: <code>PENDING</code>).
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b45309; border-color: #f59e0b; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeVouchers('PENDING')">
            🗑️ Purgar Vales Pendientes
          </button>
        </div>

        <!-- Purgar Vales Entregados -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>✓</span> Purgar Vales Entregados
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Elimina los registros históricos de canjes ya despachados físicamente (status: <code>DELIVERED</code>).
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #065f46; border-color: #10b981; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeVouchers('DELIVERED')">
            🗑️ Purgar Vales Entregados
          </button>
        </div>

        <!-- Purgar Catálogo -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>🎁</span> Purgar Catálogo de Premios
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Vacía todos los artículos registrados en <code>dev_rewards_catalog</code>.
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b91c1c; border-color: #ef4444; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeRewards()">
            🗑️ Purgar Catálogo
          </button>
        </div>

        <!-- Purgar Facturas -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>🧾</span> Purgar Facturas & QR (Reiniciar a #0001)
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Elimina todos los tokens en <code>dev_qr_tokens</code> y restablece el correlativo a <strong>#0001</strong>.
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b91c1c; border-color: #ef4444; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeInvoicesFromSandbox()">
            🗑️ Purgar Facturas (Reset #0001)
          </button>
        </div>
      </div>

      <!-- BOTONES DE RESTAURACIÓN Y RESET TOTAL -->
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
        <button type="button" class="btn-primary" style="background: linear-gradient(135deg, #059669, #047857); border-color: #065f46; font-size: 0.82rem; gap: 6px;" onclick="executeSeedDevData()">
          <span>🌱</span> <strong>Sembrar Datos Demo de Prueba</strong>
        </button>
        <button type="button" class="btn-secondary" style="color: #991b1b; border-color: #dc2626; font-size: 0.82rem; font-weight: 800; gap: 6px;" onclick="openPurgeAllDbModal()">
          <span>💥</span> <strong>Purgar Toda la BD (Reset Nuclear)</strong>
        </button>
      </div>
    </div>

    <!-- GESTOR DE BORRADORES / ELIMINADOR SELECTIVO INDIVIDUAL -->
    <div class="admin-section">
      <div class="admin-section-header">
        <div>
          <h2>🎯 Gestor de Borradores / Eliminación Selectiva</h2>
          <div style="font-size: 0.8rem; color: var(--gray-500); font-family: var(--font-mono); margin-top: 2px;">
            CONTROL UNITARIO · BORRA ELEMENTOS INDIVIDUALES Y LIBERA FOLIOS DE INMEDIATO
          </div>
        </div>
      </div>

      <p style="color: var(--gray-700); font-size: 0.85rem; margin-bottom: 1rem;">
        ¿Generaste un QR que no te gustó o una factura con datos incorrectos? Bórrala aquí: <strong>su número de folio quedará liberado automáticamente</strong> para que puedas volver a generar exactamente ese folio con los datos correctos.
      </p>

      <!-- SUB-PESTAÑAS DE SELECCIÓN -->
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; border-bottom: 1.5px solid var(--dark); padding-bottom: 0.5rem;">
        <button type="button" class="admin-tab-btn ${activeDraftTab === 'tokens' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.8rem;" onclick="setSandboxDraftTab('tokens')">
          🧾 Facturas & QR (${(vm.tokens || []).length})
        </button>
        <button type="button" class="admin-tab-btn ${activeDraftTab === 'users' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.8rem;" onclick="setSandboxDraftTab('users')">
          👥 Socios (${(vm.users || []).length})
        </button>
        <button type="button" class="admin-tab-btn ${activeDraftTab === 'vouchers' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.8rem;" onclick="setSandboxDraftTab('vouchers')">
          🎟️ Vales (${(vm.vouchers || []).length})
        </button>
        <button type="button" class="admin-tab-btn ${activeDraftTab === 'catalog' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.8rem;" onclick="setSandboxDraftTab('catalog')">
          🎁 Catálogo (${(vm.catalog || []).length})
        </button>
      </div>

      <!-- BUSCADOR EN VIVO -->
      <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
        <input 
          type="text" 
          id="sandbox-draft-search" 
          placeholder="🔍 Filtrar registros por folio, código, teléfono o título..." 
          value="${draftSearchQuery}"
          oninput="filterSandboxDrafts(this.value)"
          style="flex: 1; padding: 8px 12px; border: 1.5px solid var(--dark); border-radius: 4px; font-family: var(--font-mono); font-size: 0.82rem;"
        />
        ${draftSearchQuery ? `<button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="filterSandboxDrafts('')">Limpiar</button>` : ''}
      </div>

      <!-- TABLA DINÁMICA DE ELEMENTOS -->
      <div id="sandbox-draft-table-container"></div>
    </div>
  `;

  renderDraftTable();
}

function renderDraftTable() {
  const container = document.getElementById("sandbox-draft-table-container");
  if (!container || !vm) return;

  const q = draftSearchQuery;

  if (activeDraftTab === "tokens") {
    let tokens = vm.tokens || [];
    if (q) {
      tokens = tokens.filter(t => 
        (t.invoiceFolio || "").toLowerCase().includes(q) ||
        (t.tokenCode || "").toLowerCase().includes(q) ||
        (t.securityPin || "").toLowerCase().includes(q)
      );
    }

    if (tokens.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay tokens de facturación que coincidan con la búsqueda.
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Código Token</th>
              <th>Valor Puntos</th>
              <th style="text-align: center;">PIN</th>
              <th>Estado</th>
              <th style="text-align: right;">Acción de Eliminación</th>
            </tr>
          </thead>
          <tbody>
            ${tokens.map(t => {
              const isClaimed = t.isClaimed();
              const isPending = t.isPendingAssignment();
              const isActive = t.isActive();

              let statusBadge = "";
              if (isClaimed) statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecdd3; font-size:0.7rem;">✔ RECLAMADO</span>`;
              else if (isActive) statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:0.7rem;">● SIN RECLAMAR</span>`;
              else statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-size:0.7rem;">⏳ EN ESPERA</span>`;

              return `
                <tr>
                  <td><strong style="color: var(--primary);">#MD-${t.invoiceFolio}</strong></td>
                  <td><code class="token-code-pill">${t.tokenCode}</code></td>
                  <td>${t.pointsValue > 0 ? `⚡ ${t.pointsValue} WP` : '⏳ 0 WP'}</td>
                  <td style="text-align: center;"><span class="pin-badge">${t.securityPin || "••••"}</span></td>
                  <td>${statusBadge}</td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-danger btn-compact" style="background: #fef2f2; border: 1.5px solid #ef4444; color: #b91c1c; font-weight: 800; gap: 4px;" onclick="deleteSingleToken('${t.tokenCode}', '${t.invoiceFolio}')" title="Eliminar factura y liberar folio #${t.invoiceFolio}">
                      ✕ Borrar QR (Liberar Folio #${t.invoiceFolio})
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeDraftTab === "users") {
    let users = vm.users || [];
    if (q) {
      users = users.filter(u => 
        (u.displayName || u.name || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.memberCode || "").toLowerCase().includes(q) ||
        (u.uid || "").toLowerCase().includes(q)
      );
    }

    if (users.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay socios que coincidan con la búsqueda.
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Member Code</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Saldo WP</th>
              <th>Nivel</th>
              <th style="text-align: right;">Acción de Eliminación</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const isAdmin = u.uid === "CLIENT-58438412" || u.phone === "58438412" || u.pin === "110805";
              const name = u.displayName || u.name || "Socio sin nombre";
              const phone = u.phone || "Sin teléfono";
              const points = u.pointsBalance ?? u.wiredPoints ?? 0;

              return `
                <tr>
                  <td><code>${u.memberCode || u.uid}</code></td>
                  <td><strong>${name}</strong></td>
                  <td>${phone}</td>
                  <td><span class="badge-navi">⚡ ${points} WP</span></td>
                  <td><span class="tier-pill tier-${(u.tier || 'NAVI_USER').toLowerCase()}">${u.tier || 'NAVI_USER'}</span></td>
                  <td style="text-align: right; white-space: nowrap;">
                    ${isAdmin ? `
                      <span class="badge-navi" style="background:#e0e7ff; color:#3730a3; border: 1px solid #c7d2fe; font-size: 0.72rem; padding: 3px 8px;">
                        👑 ADMIN (Protegido)
                      </span>
                    ` : `
                      <button type="button" class="btn-danger btn-compact" style="background: #fef2f2; border: 1.5px solid #ef4444; color: #b91c1c; font-weight: 800; gap: 4px;" onclick="deleteSingleUser('${u.uid}', '${name.replace(/'/g, "\\'")}')">
                        ✕ Eliminar Socio
                      </button>
                    `}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeDraftTab === "vouchers") {
    let vouchers = vm.vouchers || [];
    if (q) {
      vouchers = vouchers.filter(v =>
        (v.voucherCode || v.voucher_code || "").toLowerCase().includes(q) ||
        (v.rewardTitle || v.reward_title || "").toLowerCase().includes(q) ||
        (v.userName || v.user_name || "").toLowerCase().includes(q)
      );
    }

    if (vouchers.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay vales de canje que coincidan con la búsqueda.
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Código Vale</th>
              <th>Artículo</th>
              <th>Socio</th>
              <th>Costo WP</th>
              <th>Estado</th>
              <th style="text-align: right;">Acción de Eliminación</th>
            </tr>
          </thead>
          <tbody>
            ${vouchers.map(v => {
              const code = v.voucherCode || v.voucher_code || "SIN-COD";
              const title = v.rewardTitle || v.reward_title || "Artículo";
              const userName = v.userName || v.user_name || v.userId || "Socio";
              const cost = v.pointsCost || v.points_cost || 0;
              const isDelivered = v.isDelivered ? v.isDelivered() : (v.status === "DELIVERED" || v.redeemed);

              return `
                <tr>
                  <td><code class="token-code-pill">${code}</code></td>
                  <td><strong>${title}</strong></td>
                  <td>${userName}</td>
                  <td>⚡ ${cost} WP</td>
                  <td>
                    ${isDelivered ? `
                      <span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:0.7rem;">✓ ENTREGADO</span>
                    ` : `
                      <span class="badge-navi" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-size:0.7rem;">⏳ PENDIENTE</span>
                    `}
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-danger btn-compact" style="background: #fef2f2; border: 1.5px solid #ef4444; color: #b91c1c; font-weight: 800; gap: 4px;" onclick="deleteSingleVoucher('${code}')">
                      ✕ Eliminar Vale
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeDraftTab === "catalog") {
    let catalog = vm.catalog || [];
    if (q) {
      catalog = catalog.filter(p =>
        (p.id || "").toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }

    if (catalog.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay artículos en catálogo que coincidan con la búsqueda.
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título del Premio</th>
              <th>Costo Puntos</th>
              <th>Stock</th>
              <th>Modalidad</th>
              <th style="text-align: right;">Acción de Eliminación</th>
            </tr>
          </thead>
          <tbody>
            ${catalog.map(p => {
              const isPartial = p.rewardType === "PARTIAL_DISCOUNT" || (typeof p.isPartialDiscount === "function" && p.isPartialDiscount());

              return `
                <tr>
                  <td><code>${p.id}</code></td>
                  <td><strong>${p.title}</strong></td>
                  <td>⚡ ${p.pointsCost || 0} WP</td>
                  <td>${p.stock || 0} u.</td>
                  <td>
                    <span class="badge-navi" style="font-size:0.7rem; ${isPartial ? 'background:#eef2ff; color:#4338ca;' : 'background:#ecfdf5; color:#065f46;'}">
                      ${isPartial ? 'COPAGO' : '100% PUNTOS'}
                    </span>
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-danger btn-compact" style="background: #fef2f2; border: 1.5px solid #ef4444; color: #b91c1c; font-weight: 800; gap: 4px;" onclick="deleteSingleReward('${p.id}', '${(p.title || '').replace(/'/g, "\\'")}')">
                      ✕ Eliminar Producto
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}
