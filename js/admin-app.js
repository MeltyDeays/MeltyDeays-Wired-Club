/* Controller: Terminal NOC / Mostrador de Administrador (The Wired Club) */
import { AdminViewModel } from "./viewmodels/AdminViewModel.js";

const vm = new AdminViewModel();

document.addEventListener("DOMContentLoaded", () => {
  vm.subscribe(renderAdmin);

  // Vincular funciones globales
  window.submitAdminPin = submitAdminPin;
  window.logoutAdmin = logoutAdmin;
  window.verifyVoucherAdmin = verifyVoucherAdmin;
  window.confirmDeliveryAdmin = confirmDeliveryAdmin;
  window.generateBatchAdmin = generateBatchAdmin;
  window.openNewProductModal = openNewProductModal;
  window.saveProductAdmin = saveProductAdmin;
  window.removeProductAdmin = removeProductAdmin;
  window.closeModal = closeModal;

  // Iniciar ViewModel
  vm.init();
});

// Renderizado reactivo de la vista de Administración
function renderAdmin(model) {
  const lockEl = document.getElementById("admin-auth-lock");
  const mainEl = document.getElementById("admin-main-panel");

  if (!model.isAuthenticated) {
    if (lockEl) lockEl.style.display = "flex";
    if (mainEl) mainEl.style.display = "none";
    const pinInput = document.getElementById("input-admin-pin");
    if (pinInput) setTimeout(() => pinInput.focus(), 100);
    return;
  }

  if (lockEl) lockEl.style.display = "none";
  if (mainEl) mainEl.style.display = "block";

  // Estadísticas
  let totalCirc = 0;
  model.tokens.forEach(t => { if (t.isClaimed()) totalCirc += t.pointsValue; });

  const pendingVouchers = model.vouchers.filter(v => !v.isDelivered()).length;

  document.getElementById("stat-points-circ").textContent = totalCirc.toLocaleString();
  document.getElementById("stat-vouchers-pending").textContent = pendingVouchers;
  document.getElementById("stat-catalog-count").textContent = model.catalog.length;
  document.getElementById("stat-tokens-count").textContent = model.tokens.length;

  // Tabla de Catálogo
  renderCatalogTable(model.catalog);

  // Tabla de Tokens de Factura
  renderTokensTable(model.tokens);
}

function renderCatalogTable(catalog) {
  const tbody = document.getElementById("catalog-table-body");
  if (!tbody) return;

  if (catalog.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">
          El catálogo está vacío. Haz clic en <strong>"+ Agregar Producto"</strong> para registrar el primer artículo.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = catalog.map(p => `
    <tr>
      <td>
        <strong style="color:var(--dark);">${p.title}</strong>
        <div style="font-size:0.75rem; color:var(--gray-500); font-family:var(--font-mono);">${p.id}</div>
      </td>
      <td><span class="badge-navi">${p.pointsCost.toLocaleString()} WP</span></td>
      <td><strong>${p.stock}</strong> un.</td>
      <td style="font-size:0.8rem; color:var(--gray-700);">${p.description || '-'}</td>
      <td style="text-align: right;">
        <button class="btn-outline-sm" style="color:var(--red); border-color:#fca5a5;" onclick="removeProductAdmin('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function renderTokensTable(tokens) {
  const tbody = document.getElementById("tokens-table-body");
  if (!tbody) return;

  if (tokens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--gray-500);">
          No hay lotes de facturación activos. Genera un lote con el formulario de abajo.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tokens.slice(0, 15).map(t => {
    const isClaimed = t.isClaimed();
    return `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.8rem;"><strong>${t.tokenCode}</strong></td>
        <td>Factura F${t.invoiceFolio}</td>
        <td>${t.pointsValue} WP</td>
        <td style="font-family:var(--font-mono);">${t.securityPin || '••••'}</td>
        <td>
          <span class="badge-navi" style="background:${isClaimed ? '#fee2e2' : '#e0f2fe'}; color:${isClaimed ? '#b91c1c' : '#0369a1'};">
            ${isClaimed ? 'UTILIZADO' : 'DISPONIBLE'}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

// CONTROL DE ACCIONES
function submitAdminPin() {
  const input = document.getElementById("input-admin-pin");
  const pin = input ? input.value : "";
  const success = vm.unlock(pin);

  if (!success) {
    alert("❌ PIN Incorrecto. Acceso denegado.");
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

function logoutAdmin() {
  vm.lock();
}

async function verifyVoucherAdmin() {
  const input = document.getElementById("input-scan-voucher");
  const code = (input ? input.value : "").trim().toUpperCase();

  if (!code) return alert("Ingresa o escanea el código CANJE-XXXX");

  const voucher = await vm.verifyVoucher(code);
  const resultBox = document.getElementById("scan-result-box");

  if (!voucher) {
    alert("❌ El vale [" + code + "] no existe en el sistema.");
    if (resultBox) resultBox.style.display = "none";
    return;
  }

  if (resultBox) {
    resultBox.style.display = "block";
    document.getElementById("scan-res-code").textContent = voucher.voucherCode;
    document.getElementById("scan-res-product").textContent = voucher.rewardTitle;
    document.getElementById("scan-res-client").textContent = voucher.userName || "Socio Wired";
    document.getElementById("scan-res-points").textContent = voucher.pointsSpent + " WP";
    
    const statusEl = document.getElementById("scan-res-status");
    const btnDeliver = document.getElementById("btn-confirm-delivery");

    if (voucher.isDelivered()) {
      statusEl.innerHTML = "<span style='color:var(--red); font-weight:900;'>❌ YA FUE ENTREGADO el " + new Date(voucher.deliveredAt).toLocaleString() + "</span>";
      if (btnDeliver) btnDeliver.style.display = "none";
    } else {
      statusEl.innerHTML = "<span style='color:var(--cyan); font-weight:900;'>✓ VÁLIDO PARA ENTREGA</span>";
      if (btnDeliver) btnDeliver.style.display = "inline-block";
    }
  }
}

async function confirmDeliveryAdmin() {
  const code = document.getElementById("scan-res-code").textContent;
  try {
    await vm.deliverVoucher(code);
    alert("✓ ¡Entrega Confirmada! El vale ha quedado marcado como ENTREGADO.");
    document.getElementById("scan-result-box").style.display = "none";
    document.getElementById("input-scan-voucher").value = "";
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function generateBatchAdmin() {
  const folio = document.getElementById("lot-start-folio").value;
  const count = document.getElementById("lot-count").value;
  const points = document.getElementById("lot-points").value;

  try {
    const res = await vm.generateLot(folio, count, points);
    alert("✓ ¡Lote generado con éxito! " + res.tokens.length + " códigos listos para impresión de facturas.");
  } catch (err) {
    alert("❌ " + err.message);
  }
}

function openNewProductModal() {
  const modal = document.getElementById("modal-new-product");
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

async function saveProductAdmin() {
  const title = document.getElementById("prod-title").value;
  const pointsCost = document.getElementById("prod-cost").value;
  const stock = document.getElementById("prod-stock").value;
  const imageUrl = document.getElementById("prod-img").value;
  const description = document.getElementById("prod-desc").value;

  try {
    await vm.addReward({ title, pointsCost, stock, imageUrl, description });
    closeModal("modal-new-product");
    // Limpiar formulario
    document.getElementById("prod-title").value = "";
    document.getElementById("prod-cost").value = "";
    document.getElementById("prod-stock").value = "";
    document.getElementById("prod-img").value = "";
    document.getElementById("prod-desc").value = "";
    alert("✓ Producto registrado con éxito en el catálogo de Firestore y local.");
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function removeProductAdmin(id) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    await vm.deleteReward(id);
  }
}
