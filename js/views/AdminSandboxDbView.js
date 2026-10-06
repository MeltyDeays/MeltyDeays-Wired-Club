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

let sandboxTokensStatus = "ALL";
let sandboxTokensSort = "folio-asc";

let sandboxUsersTier = "ALL";
let sandboxUsersSort = "newest";

let sandboxVouchersStatus = "ALL";
let sandboxVouchersSort = "newest";

let sandboxCatalogType = "ALL";
let sandboxCatalogSort = "cost-desc";

export function setSandboxDraftTab(tab) {
  activeDraftTab = tab;
  renderSandboxDbView();
}

export function filterSandboxDrafts(query) {
  draftSearchQuery = (query || "").trim().toLowerCase();
  renderDraftTable();
}

export function setSandboxDraftStatus(status) {
  if (activeDraftTab === "tokens") sandboxTokensStatus = status;
  else if (activeDraftTab === "users") sandboxUsersTier = status;
  else if (activeDraftTab === "vouchers") sandboxVouchersStatus = status;
  else if (activeDraftTab === "catalog") sandboxCatalogType = status;
  renderSandboxDbView();
}

export function setSandboxDraftSort(sortOrder) {
  if (activeDraftTab === "tokens") sandboxTokensSort = sortOrder;
  else if (activeDraftTab === "users") sandboxUsersSort = sortOrder;
  else if (activeDraftTab === "vouchers") sandboxVouchersSort = sortOrder;
  else if (activeDraftTab === "catalog") sandboxCatalogSort = sortOrder;
  renderDraftTable();
}

const safeConfirm = (msg) => (typeof window !== "undefined" && typeof window.confirm === "function") ? window.confirm(msg) : (typeof confirm === "function" ? confirm(msg) : true);

// ----------------------------------------------------
// ACCIONES DE PURGA GRANULAR
// ----------------------------------------------------

export async function executePurgeUsers() {
  const isProd = isProduction();
  const targetCol = isProd ? "users" : "dev_users";
  const desc = isProd ? "TODOS los socios/clientes de PRODUCCIÓN" : "TODOS los socios/clientes de prueba (dev_users)";
  if (!safeConfirm(`⚠️ ¿Deseas purgar ${desc}?\n\nEl perfil de Administrador (PIN 110805) quedará intacto.`)) {
    return;
  }
  showToast(isProd ? "Purgando base de datos de socios en producción..." : "Purgando base de datos de socios de prueba...", "info");
  try {
    const res = await vm.purgeUsers();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(isProd ? `✓ ${res.count} socios eliminados en ${targetCol}. Admin protegido.` : `✓ ${res.count} socios de prueba eliminados. Admin protegido.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar socios: " + err.message, "error");
  }
}

export async function executePurgeCirculatingPoints() {
  const isProd = isProduction();
  if (!safeConfirm(`⚠️ ¿Deseas restablecer a 0 todos los puntos en circulación ${isProd ? "de PRODUCCIÓN " : ""}y vaciar el historial contable?`)) {
    return;
  }
  showToast(isProd ? "Purgando puntos en producción..." : "Purgando puntos en circulación...", "info");
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
  const isProd = isProduction();
  const label = filter === "PENDING" ? "PENDIENTES de retiro" : (filter === "DELIVERED" ? "ya ENTREGADOS" : "TODOS");
  if (!safeConfirm(`⚠️ ¿Deseas purgar los vales de canje ${label}${isProd ? " en PRODUCCIÓN" : ""}?`)) {
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
  const isProd = isProduction();
  const targetCol = isProd ? "rewards_catalog" : "dev_rewards_catalog";
  const desc = isProd ? "TODOS los productos del catálogo de PRODUCCIÓN" : "TODOS los productos del catálogo de premios de prueba";
  if (!safeConfirm(`⚠️ ¿Deseas purgar ${desc}?`)) {
    return;
  }
  showToast(isProd ? "Purgando catálogo de producción..." : "Purgando catálogo de premios...", "info");
  try {
    const res = await vm.purgeRewards();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(isProd ? `✓ ${res.count} productos eliminados en ${targetCol}.` : `✓ ${res.count} productos de catálogo eliminados.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar catálogo: " + err.message, "error");
  }
}

export async function executePurgeInvoicesFromSandbox() {
  const isProd = isProduction();
  const targetCol = isProd ? "qr_tokens" : "dev_qr_tokens";
  const desc = isProd ? "TODAS las facturas y tokens QR de PRODUCCIÓN" : "TODAS las facturas/tokens QR y restablecer el folio a #0001";
  if (!safeConfirm(`⚠️ ¿Deseas purgar ${desc} y restablecer el folio a #0001?`)) {
    return;
  }
  showToast(isProd ? "Purgando facturas y tokens en producción..." : "Purgando facturas y tokens de prueba...", "info");
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
    showToast(isProd ? `✓ Facturas eliminadas en ${targetCol}. Siguiente folio libre: #0001.` : `✓ Facturas eliminadas. Siguiente folio libre: #0001.`, "success");
  } catch (err) {
    showToast("❌ Error al purgar facturas: " + err.message, "error");
  }
}

export async function executeSeedDevData() {
  const isProd = isProduction();
  if (isProd) {
    showToast("⚠️ Acción restringida en entorno de producción.", "error");
    return;
  }
  if (!safeConfirm("🌱 ¿Deseas sembrar datos demo estándar (3 socios, 9 productos incluyendo 'Próximamente', especificaciones y comentarios)?")) {
    return;
  }
  showToast("Sembrando datos de demostración...", "info");
  try {
    const res = await vm.seedDevData();
    renderSandboxDbView();
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Datos demo sembrados: ${res.usersSeeded} socios, ${res.rewardsSeeded} productos y ${res.commentsSeeded || 0} comentarios.`, "success");
  } catch (err) {
    showToast("❌ Error al sembrar datos demo: " + err.message, "error");
  }
}

// ----------------------------------------------------
// ELIMINADOR SELECTIVO INDIVIDUAL (BORRADORES)
// ----------------------------------------------------

export async function deleteSingleToken(tokenCode, folio) {
  if (typeof window !== "undefined" && typeof window.openReleaseInvoiceModal === "function") {
    window.openReleaseInvoiceModal(tokenCode, folio);
    return;
  }

  const paddedFolio = String(folio || "0000").padStart(4, "0");
  const fallbackMsg =
    `🗑️ ¿DESEAS LIBERAR EL FOLIO #${paddedFolio}?\n\n` +
    `• Factura: #MD-2026-${paddedFolio}\n` +
    `• Código Token: ${tokenCode}\n\n` +
    `Esta acción eliminará el registro de la base de datos y dejará el folio #${paddedFolio} libre de inmediato para que puedas volver a generar o imprimir una factura nueva con este mismo número.\n\n` +
    `¿Confirmar liberación del folio #${paddedFolio}?`;

  if (!safeConfirm(fallbackMsg)) {
    return;
  }
  showToast(`Liberando folio #${paddedFolio}...`, "info");
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
    showToast(`✓ Factura #MD-2026-${paddedFolio} eliminada. Folio #${paddedFolio} liberado exitosamente.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar factura: " + err.message, "error");
  }
}

export async function deleteSingleUser(uid, name) {
  if (uid === "CLIENT-58438412" || uid === "CLIENT-50558438412") {
    showToast("⚠️ Acción protegida: No se puede eliminar el perfil del Administrador principal.", "error");
    return;
  }
  if (!safeConfirm(`🗑️ ¿Eliminar al socio "${name}" (${uid})?`)) {
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
  if (!safeConfirm(`🗑️ ¿Eliminar el vale de canje "${code}"?`)) {
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
  if (!safeConfirm(`🗑️ ¿Eliminar del catálogo el producto "${title}" (${rewardId})?`)) {
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

  const tabBtn = document.getElementById("tab-btn-sandbox_db");
  if (tabBtn) {
    tabBtn.innerHTML = isProd ? "🗄️ Base de Datos" : "🧪 BD Sandbox";
  }

  const usersCol = isProd ? "users" : "dev_users";
  const tokensCol = isProd ? "qr_tokens" : "dev_qr_tokens";
  const rewardsCol = isProd ? "rewards_catalog" : "dev_rewards_catalog";
  const redemptionsCol = isProd ? "redemptions" : "dev_redemptions";
  const ledgerCol = isProd ? "point_ledger" : "dev_point_ledger";

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
          <span>ADVERTENCIA: Las operaciones de eliminación y purga afectarán los datos oficiales en vivo (<code>${usersCol}</code>, <code>${tokensCol}</code>, <code>${redemptionsCol}</code>, <code>${rewardsCol}</code>, <code>${ledgerCol}</code>). Proceder con precaución extrema.</span>
        </div>
      </div>
    `
    : `
      <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 6px; padding: 12px 16px; margin-bottom: 1.25rem; font-family: var(--font-mono); font-size: 0.82rem; color: #854d0e; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 1.3rem; line-height: 1;">🧪</span>
        <div>
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 2px;">SANDBOX AISLADO: ENTORNO DE PRUEBAS (${usersCol})</strong>
          <span>Todas las operaciones de esta consola modifican <strong>única y exclusivamente</strong> las colecciones y almacenamiento de pruebas (<code>${usersCol}</code>, <code>${tokensCol}</code>, <code>${redemptionsCol}</code>, <code>${rewardsCol}</code>, <code>${ledgerCol}</code>). <strong>La base de datos de producción está 100% blindada e intacta.</strong></span>
        </div>
      </div>
    `;

  root.innerHTML = `
    ${envBannerHtml}

    <!-- METRICS TELEMETRY GRID -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
      <div class="noc-stat-box">
        <div class="noc-stat-label">${isProd ? 'SOCIOS REGISTRADOS' : 'SOCIOS DEV'}</div>
        <div class="noc-stat-val text-indigo">${(vm.users || []).length}</div>
        <div class="noc-stat-sub">En ${usersCol}</div>
      </div>
      <div class="noc-stat-box">
        <div class="noc-stat-label">PUNTOS EN CIRC.</div>
        <div class="noc-stat-val">${totalPointsCirc.toLocaleString()} WP</div>
        <div class="noc-stat-sub">Saldo total activo</div>
      </div>
      <div class="noc-stat-box">
        <div class="noc-stat-label">FACTURAS / QR</div>
        <div class="noc-stat-val">${(vm.tokens || []).length}</div>
        <div class="noc-stat-sub">Tokens generados (${tokensCol})</div>
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
        <div class="noc-stat-label">${isProd ? 'CATÁLOGO PREMIOS' : 'CATÁLOGO DEV'}</div>
        <div class="noc-stat-val">${(vm.catalog || []).length}</div>
        <div class="noc-stat-sub">${isProd ? 'Premios en catálogo' : 'Premios demo en stock'}</div>
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
            ${isProd ? 'MANTENIMIENTO MODULAR DE TABLAS DE PRODUCCIÓN' : 'LIMPIEZA MODULAR DE TABLAS INDIVIDUALES (ZERO-POLLUTION)'}
          </div>
        </div>
      </div>

      <p style="color: var(--gray-700); font-size: 0.85rem; margin-bottom: 1rem;">
        ${isProd ? 'Ejecuta purgas específicas por colección en la base de datos oficial de producción.' : 'Ejecuta purgas específicas por módulo sin necesidad de resetear toda la base de datos de pruebas.'}
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem;">
        <!-- Purgar Socios -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.88rem; color: var(--dark); display: flex; align-items: center; gap: 6px;">
              <span>👥</span> ${isProd ? 'Purgar Socios' : 'Purgar Socios Demo'}
            </div>
            <div style="font-size: 0.76rem; color: var(--gray-600); margin-top: 4px;">
              Elimina todos los clientes en <code>${usersCol}</code>. <strong>El perfil Admin (PIN 110805) queda 100% preservado.</strong>
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
              Restablece a <strong>0 WP</strong> el saldo de todos los clientes y vacía el ledger contable de movimientos (<code>${ledgerCol}</code>).
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
              Elimina en <code>${redemptionsCol}</code> únicamente los vales emitidos aún por entregar en mostrador (status: <code>PENDING</code>).
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
              Elimina en <code>${redemptionsCol}</code> los registros históricos de canjes ya despachados físicamente (status: <code>DELIVERED</code>).
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
              Vacía todos los artículos registrados en <code>${rewardsCol}</code>.
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
              Elimina todos los tokens en <code>${tokensCol}</code> y restablece el correlativo a <strong>#0001</strong>.
            </div>
          </div>
          <button type="button" class="btn-secondary" style="color: #b91c1c; border-color: #ef4444; font-size: 0.78rem; font-weight: 700; width: 100%; justify-content: center;" onclick="executePurgeInvoicesFromSandbox()">
            🗑️ Purgar Facturas (Reset #0001)
          </button>
        </div>
      </div>

      <!-- BOTONES DE RESTAURACIÓN Y RESET TOTAL -->
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
        ${!isProd ? `
        <button type="button" class="btn-primary" style="background: linear-gradient(135deg, #059669, #047857); border-color: #065f46; font-size: 0.82rem; gap: 6px;" onclick="executeSeedDevData()">
          <span>🌱</span> <strong>Sembrar Datos Demo de Prueba</strong>
        </button>
        ` : ''}
        <button type="button" class="btn-secondary" style="color: #991b1b; border-color: #dc2626; font-size: 0.82rem; font-weight: 800; gap: 6px;" onclick="openPurgeAllDbModal()">
          <span>💥</span> <strong>${isProd ? 'Purgar Toda la BD de Producción (Reset Total)' : 'Purgar Toda la BD (Reset Nuclear)'}</strong>
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

      <!-- BARRA DE BÚSQUEDA Y FILTROS EN VIVO -->
      <div class="admin-filter-bar" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1; min-width: 240px;">
          <input 
            type="text" 
            id="sandbox-draft-search" 
            placeholder="🔍 Filtrar registros por folio, código, teléfono o título..." 
            value="${draftSearchQuery}"
            oninput="filterSandboxDrafts(this.value)"
            style="flex: 1; padding: 7px 12px; border: 1.5px solid var(--dark); border-radius: 4px; font-family: var(--font-mono); font-size: 0.82rem; margin: 0;"
          />
          ${draftSearchQuery ? `<button type="button" class="btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="filterSandboxDrafts('')">Limpiar</button>` : ''}
        </div>
        ${activeDraftTab === 'tokens' ? `
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ESTADO:</span>
            <button type="button" class="btn-secondary ${sandboxTokensStatus === 'ALL' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ALL')">Todas</button>
            <button type="button" class="btn-secondary ${sandboxTokensStatus === 'PENDING' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('PENDING')">⏳ Sin Asignar</button>
            <button type="button" class="btn-secondary ${sandboxTokensStatus === 'ACTIVE' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ACTIVE')">● Sin Reclamar</button>
            <button type="button" class="btn-secondary ${sandboxTokensStatus === 'CLAIMED' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('CLAIMED')">✔ Reclamadas</button>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; margin-left: 0.4rem;">
              <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ORDENAR:</span>
              <select id="sandbox-tokens-sort" class="form-input" style="padding: 2px 7px; font-size: 0.75rem; width: auto; font-family: var(--font-mono); height: 26px; line-height: 1;" onchange="setSandboxDraftSort(this.value)">
                <option value="folio-asc" ${sandboxTokensSort === 'folio-asc' ? 'selected' : ''}>🔢 Folio 1 al 40 (Asc)</option>
                <option value="folio-desc" ${sandboxTokensSort === 'folio-desc' ? 'selected' : ''}>🔢 Folio 40 al 1 (Desc)</option>
                <option value="newest" ${sandboxTokensSort === 'newest' ? 'selected' : ''}>🕒 Más nuevas / recientes</option>
                <option value="oldest" ${sandboxTokensSort === 'oldest' ? 'selected' : ''}>⌛ Más viejas / antiguas</option>
                <option value="points-desc" ${sandboxTokensSort === 'points-desc' ? 'selected' : ''}>⚡ Mayor valor WP</option>
                <option value="points-asc" ${sandboxTokensSort === 'points-asc' ? 'selected' : ''}>📉 Menor valor WP</option>
              </select>
            </div>
          </div>
        ` : (activeDraftTab === 'users' ? `
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">RANGO:</span>
            <button type="button" class="btn-secondary ${sandboxUsersTier === 'ALL' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ALL')">Todos</button>
            <button type="button" class="btn-secondary ${sandboxUsersTier === 'NAVI' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('NAVI')">NAVI</button>
            <button type="button" class="btn-secondary ${sandboxUsersTier === 'RUNNER' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('RUNNER')">RUNNER</button>
            <button type="button" class="btn-secondary ${sandboxUsersTier === 'ELITE' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ELITE')">ELITE</button>
            <button type="button" class="btn-secondary ${sandboxUsersTier === 'DEUS' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('DEUS')">DEUS</button>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; margin-left: 0.4rem;">
              <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ORDENAR:</span>
              <select id="sandbox-users-sort" class="form-input" style="padding: 2px 7px; font-size: 0.75rem; width: auto; font-family: var(--font-mono); height: 26px; line-height: 1;" onchange="setSandboxDraftSort(this.value)">
                <option value="newest" ${sandboxUsersSort === 'newest' ? 'selected' : ''}>🕒 Más recientes</option>
                <option value="oldest" ${sandboxUsersSort === 'oldest' ? 'selected' : ''}>⌛ Más antiguos</option>
                <option value="points-desc" ${sandboxUsersSort === 'points-desc' ? 'selected' : ''}>⚡ Mayor saldo WP</option>
                <option value="points-asc" ${sandboxUsersSort === 'points-asc' ? 'selected' : ''}>📉 Menor saldo WP</option>
                <option value="name-asc" ${sandboxUsersSort === 'name-asc' ? 'selected' : ''}>🔤 Nombre A-Z</option>
                <option value="name-desc" ${sandboxUsersSort === 'name-desc' ? 'selected' : ''}>🔡 Nombre Z-A</option>
              </select>
            </div>
          </div>
        ` : (activeDraftTab === 'vouchers' ? `
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ESTADO:</span>
            <button type="button" class="btn-secondary ${sandboxVouchersStatus === 'ALL' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ALL')">Todos</button>
            <button type="button" class="btn-secondary ${sandboxVouchersStatus === 'PENDING' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('PENDING')">⏳ Pendientes</button>
            <button type="button" class="btn-secondary ${sandboxVouchersStatus === 'DELIVERED' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('DELIVERED')">✓ Despachados</button>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; margin-left: 0.4rem;">
              <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ORDENAR:</span>
              <select id="sandbox-vouchers-sort" class="form-input" style="padding: 2px 7px; font-size: 0.75rem; width: auto; font-family: var(--font-mono); height: 26px; line-height: 1;" onchange="setSandboxDraftSort(this.value)">
                <option value="newest" ${sandboxVouchersSort === 'newest' ? 'selected' : ''}>🕒 Más reciente a más viejo</option>
                <option value="oldest" ${sandboxVouchersSort === 'oldest' ? 'selected' : ''}>⌛ Más viejo a más reciente</option>
                <option value="points-desc" ${sandboxVouchersSort === 'points-desc' ? 'selected' : ''}>⚡ Mayor costo WP</option>
                <option value="points-asc" ${sandboxVouchersSort === 'points-asc' ? 'selected' : ''}>🪙 Menor costo WP</option>
                <option value="code-asc" ${sandboxVouchersSort === 'code-asc' ? 'selected' : ''}>🔤 Código (A-Z)</option>
              </select>
            </div>
          </div>
        ` : `
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">TIPO:</span>
            <button type="button" class="btn-secondary ${sandboxCatalogType === 'ALL' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('ALL')">Todos</button>
            <button type="button" class="btn-secondary ${sandboxCatalogType === 'FREE' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('FREE')">🎁 100% Puntos</button>
            <button type="button" class="btn-secondary ${sandboxCatalogType === 'PARTIAL' ? 'active' : ''}" style="padding: 3px 8px; font-size: 0.72rem;" onclick="setSandboxDraftStatus('PARTIAL')">🏷️ Venta Topada</button>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; margin-left: 0.4rem;">
              <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--gray-500);">ORDENAR:</span>
              <select id="sandbox-catalog-sort" class="form-input" style="padding: 2px 7px; font-size: 0.75rem; width: auto; font-family: var(--font-mono); height: 26px; line-height: 1;" onchange="setSandboxDraftSort(this.value)">
                <option value="cost-desc" ${sandboxCatalogSort === 'cost-desc' ? 'selected' : ''}>💰 Más caro a más barato (WP)</option>
                <option value="cost-asc" ${sandboxCatalogSort === 'cost-asc' ? 'selected' : ''}>🪙 Más barato a más caro (WP)</option>
                <option value="discount-desc" ${sandboxCatalogSort === 'discount-desc' ? 'selected' : ''}>🏷️ Mayor descuento tope</option>
                <option value="discount-asc" ${sandboxCatalogSort === 'discount-asc' ? 'selected' : ''}>🏷️ Menor descuento tope</option>
                <option value="stock-desc" ${sandboxCatalogSort === 'stock-desc' ? 'selected' : ''}>📦 Mayor stock disponible</option>
                <option value="stock-asc" ${sandboxCatalogSort === 'stock-asc' ? 'selected' : ''}>📉 Menor stock disponible</option>
                <option value="title-asc" ${sandboxCatalogSort === 'title-asc' ? 'selected' : ''}>🔤 Nombre A-Z</option>
                <option value="title-desc" ${sandboxCatalogSort === 'title-desc' ? 'selected' : ''}>🔡 Nombre Z-A</option>
              </select>
            </div>
          </div>
        `))}
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
    let tokens = [...(vm.tokens || [])];

    if (sandboxTokensStatus === "PENDING") {
      tokens = tokens.filter(t => t.isPendingAssignment());
    } else if (sandboxTokensStatus === "ACTIVE") {
      tokens = tokens.filter(t => t.isActive());
    } else if (sandboxTokensStatus === "CLAIMED") {
      tokens = tokens.filter(t => t.isClaimed());
    }

    if (q) {
      tokens = tokens.filter(t => 
        (t.invoiceFolio || "").toLowerCase().includes(q) ||
        (t.tokenCode || "").toLowerCase().includes(q) ||
        (t.securityPin || "").toLowerCase().includes(q)
      );
    }

    const parseFolio = (f) => parseInt(String(f || "").replace(/\D/g, ""), 10) || 0;
    tokens.sort((a, b) => {
      if (sandboxTokensSort === "folio-asc") {
        return parseFolio(a.invoiceFolio) - parseFolio(b.invoiceFolio);
      } else if (sandboxTokensSort === "folio-desc") {
        return parseFolio(b.invoiceFolio) - parseFolio(a.invoiceFolio);
      } else if (sandboxTokensSort === "newest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (timeB - timeA) || (parseFolio(b.invoiceFolio) - parseFolio(a.invoiceFolio));
      } else if (sandboxTokensSort === "oldest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (timeA - timeB) || (parseFolio(a.invoiceFolio) - parseFolio(b.invoiceFolio));
      } else if (sandboxTokensSort === "points-desc") {
        return (b.pointsValue || 0) - (a.pointsValue || 0);
      } else if (sandboxTokensSort === "points-asc") {
        return (a.pointsValue || 0) - (b.pointsValue || 0);
      }
      return 0;
    });

    if (tokens.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay tokens de facturación que coincidan con los filtros y búsqueda.
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
                    <button type="button" class="btn-release-folio" onclick="deleteSingleToken('${t.tokenCode}', '${t.invoiceFolio}')" title="Eliminar factura y liberar folio #${t.invoiceFolio} para reemisión inmediata">
                      <span class="btn-icon">🗑️</span>
                      <span class="btn-text">Borrar QR</span>
                      <span class="folio-tag">Liberar #${t.invoiceFolio}</span>
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
    let users = [...(vm.users || [])];
    if (sandboxUsersTier !== "ALL") {
      users = users.filter(u => {
        const t = (u.tier || "NAVI_USER").toUpperCase();
        if (sandboxUsersTier === "NAVI") return t.includes("NAVI");
        if (sandboxUsersTier === "RUNNER") return t.includes("RUNNER");
        if (sandboxUsersTier === "ELITE") return t.includes("ELITE");
        if (sandboxUsersTier === "DEUS") return t.includes("DEUS");
        return t === sandboxUsersTier;
      });
    }

    if (q) {
      const qClean = q.replace(/\D/g, "");
      users = users.filter(u => 
        (u.displayName || u.name || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (qClean && (u.phone || "").replace(/\D/g, "").includes(qClean)) ||
        (u.memberCode || "").toLowerCase().includes(q) ||
        (u.uid || "").toLowerCase().includes(q)
      );
    }

    users.sort((a, b) => {
      if (sandboxUsersSort === "newest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      } else if (sandboxUsersSort === "oldest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      } else if (sandboxUsersSort === "points-desc") {
        const ptsA = a.pointsBalance ?? a.wiredPoints ?? 0;
        const ptsB = b.pointsBalance ?? b.wiredPoints ?? 0;
        return ptsB - ptsA;
      } else if (sandboxUsersSort === "points-asc") {
        const ptsA = a.pointsBalance ?? a.wiredPoints ?? 0;
        const ptsB = b.pointsBalance ?? b.wiredPoints ?? 0;
        return ptsA - ptsB;
      } else if (sandboxUsersSort === "name-asc") {
        return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
      } else if (sandboxUsersSort === "name-desc") {
        return (b.displayName || b.name || "").localeCompare(a.displayName || a.name || "");
      }
      return 0;
    });

    if (users.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay socios que coincidan con los filtros y búsqueda.
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
    let vouchers = [...(vm.vouchers || [])];
    if (sandboxVouchersStatus === "PENDING") {
      vouchers = vouchers.filter(v => typeof v.isDelivered === "function" ? !v.isDelivered() : v.status !== "DELIVERED");
    } else if (sandboxVouchersStatus === "DELIVERED") {
      vouchers = vouchers.filter(v => typeof v.isDelivered === "function" ? v.isDelivered() : v.status === "DELIVERED");
    }

    if (q) {
      vouchers = vouchers.filter(v =>
        (v.voucherCode || v.voucher_code || "").toLowerCase().includes(q) ||
        (v.rewardTitle || v.reward_title || "").toLowerCase().includes(q) ||
        (v.userName || v.user_name || "").toLowerCase().includes(q)
      );
    }

    vouchers.sort((a, b) => {
      if (sandboxVouchersSort === "newest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      } else if (sandboxVouchersSort === "oldest") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      } else if (sandboxVouchersSort === "points-desc") {
        const costA = Number(a.pointsCost || a.points_cost || a.pointsSpent || 0);
        const costB = Number(b.pointsCost || b.points_cost || b.pointsSpent || 0);
        return costB - costA;
      } else if (sandboxVouchersSort === "points-asc") {
        const costA = Number(a.pointsCost || a.points_cost || a.pointsSpent || 0);
        const costB = Number(b.pointsCost || b.points_cost || b.pointsSpent || 0);
        return costA - costB;
      } else if (sandboxVouchersSort === "code-asc") {
        return (a.voucherCode || a.voucher_code || "").localeCompare(b.voucherCode || b.voucher_code || "");
      }
      return 0;
    });

    if (vouchers.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay vales de canje que coincidan con los filtros y búsqueda.
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
    let catalog = [...(vm.catalog || [])];
    if (sandboxCatalogType === "FREE") {
      catalog = catalog.filter(p => p.rewardType !== "PARTIAL_DISCOUNT" && !(typeof p.isPartialDiscount === "function" && p.isPartialDiscount()));
    } else if (sandboxCatalogType === "PARTIAL") {
      catalog = catalog.filter(p => p.rewardType === "PARTIAL_DISCOUNT" || (typeof p.isPartialDiscount === "function" && p.isPartialDiscount()));
    }

    if (q) {
      catalog = catalog.filter(p =>
        (p.id || "").toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }

    catalog.sort((a, b) => {
      if (sandboxCatalogSort === "cost-desc") {
        return (b.pointsCost || 0) - (a.pointsCost || 0);
      } else if (sandboxCatalogSort === "cost-asc") {
        return (a.pointsCost || 0) - (b.pointsCost || 0);
      } else if (sandboxCatalogSort === "discount-desc") {
        const discA = (a.maxDiscountPct || 0) * (a.priceUsd || 1) + (a.maxDiscountUsd || 0);
        const discB = (b.maxDiscountPct || 0) * (b.priceUsd || 1) + (b.maxDiscountUsd || 0);
        return discB - discA;
      } else if (sandboxCatalogSort === "discount-asc") {
        const discA = (a.maxDiscountPct || 0) * (a.priceUsd || 1) + (a.maxDiscountUsd || 0);
        const discB = (b.maxDiscountPct || 0) * (b.priceUsd || 1) + (b.maxDiscountUsd || 0);
        return discA - discB;
      } else if (sandboxCatalogSort === "stock-desc") {
        return (b.stock || 0) - (a.stock || 0);
      } else if (sandboxCatalogSort === "stock-asc") {
        return (a.stock || 0) - (b.stock || 0);
      } else if (sandboxCatalogSort === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sandboxCatalogSort === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });

    if (catalog.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-500); font-family: var(--font-mono); font-size: 0.85rem;">
          No hay artículos en catálogo que coincidan con los filtros y búsqueda.
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
              const isSoldOut = (p.stock || 0) <= 0 || (typeof p.isSoldOut === "function" && p.isSoldOut()) || p.status === "SOLD_OUT";
              const escapedTitle = (p.title || "").replace(/'/g, "\\'");

              const stockDisplay = isSoldOut
                ? `<span class="badge-stock-sold">🔴 VENDIDO</span>`
                : (p.stock === 1
                  ? `<div class="stock-cell-wrap"><strong style="color:var(--dark);">1</strong> u. <span class="badge-stock-unique">ÚNICO</span></div>`
                  : `<div class="stock-cell-wrap"><strong style="color:var(--dark);">${p.stock}</strong> u.</div>`);

              return `
                <tr>
                  <td><code>${p.id}</code></td>
                  <td><strong>${p.title}</strong></td>
                  <td>⚡ ${p.pointsCost || 0} WP</td>
                  <td>${stockDisplay}</td>
                  <td>
                    <span class="badge-navi" style="font-size:0.7rem; ${isPartial ? 'background:#eef2ff; color:#4338ca;' : 'background:#ecfdf5; color:#065f46;'}">
                      ${isPartial ? 'COPAGO' : '100% PUNTOS'}
                    </span>
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
                      ${!isSoldOut ? `
                        <button type="button" class="catalog-action-btn btn-sold" onclick="handleAdminMarkSold('${p.id}', '${escapedTitle}')" title="Marcar como vendido externamente">
                          <span class="btn-icon">🏷️</span> <span>Vendido</span>
                        </button>
                        ${(p.stock || 0) > 1 ? `
                          <button type="button" class="catalog-action-btn btn-decrement" onclick="handleAdminDecrementStock('${p.id}', '${escapedTitle}')" title="Restar 1 unidad de stock">
                            <span class="btn-icon">📉</span> <span>-1</span>
                          </button>
                        ` : ''}
                      ` : `
                        <button type="button" class="catalog-action-btn btn-restock" onclick="handleAdminRestock('${p.id}', 1, '${escapedTitle}')" title="Reponer 1 unidad">
                          <span class="btn-icon">➕</span> <span>+1 u.</span>
                        </button>
                      `}
                      <button type="button" class="catalog-action-btn btn-edit" onclick="openEditProductModal('${p.id}')">
                        <span class="btn-icon">✏️</span> <span>Editar</span>
                      </button>
                      <button type="button" class="catalog-action-btn btn-delete" onclick="deleteSingleReward('${p.id}', '${escapedTitle}')">
                        <span class="btn-icon">🗑️</span> <span>Eliminar</span>
                      </button>
                    </div>
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
