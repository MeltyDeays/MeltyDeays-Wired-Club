// Controlador Exclusivo del Panel de Administración y Mostrador
// The Wired Club - MeltyDeays NOC

import {
  getCatalog,
  getAllTokens,
  getAllVouchers,
  deliverVoucherAtomic,
  generateInvoiceQRLot,
  saveProduct,
  deleteProduct
} from "./firestore-service.js";

import {
  getSavedFirebaseConfig,
  saveFirebaseConfig
} from "./firebase-config.js";

const DEFAULT_ADMIN_PIN = "2026";

document.addEventListener("DOMContentLoaded", () => {
  checkAdminAuth();

  // Exposición de funciones en window
  window.submitAdminPin = submitAdminPin;
  window.logoutAdmin = logoutAdmin;
  window.verifyVoucherAdmin = verifyVoucherAdmin;
  window.confirmDeliveryAdmin = confirmDeliveryAdmin;
  window.generateBatchAdmin = generateBatchAdmin;
  window.openNewProductModal = openNewProductModal;
  window.saveProductAdmin = saveProductAdmin;
  window.removeProductAdmin = removeProductAdmin;
  window.openFirebaseModal = openFirebaseModal;
  window.saveFirebaseModal = saveFirebaseModal;
  window.closeModal = closeModal;
});

function checkAdminAuth() {
  const isAuth = sessionStorage.getItem("melty_admin_auth") === "true";
  const lockEl = document.getElementById("admin-auth-lock");
  const panelEl = document.getElementById("admin-main-panel");

  if (isAuth) {
    if (lockEl) lockEl.style.display = "none";
    if (panelEl) panelEl.style.display = "block";
    renderAdminView();
  } else {
    if (lockEl) lockEl.style.display = "flex";
    if (panelEl) panelEl.style.display = "none";
  }
}

export function submitAdminPin() {
  const pinInput = document.getElementById("input-admin-pin");
  const enteredPin = pinInput.value.trim();
  const configuredPin = localStorage.getItem("melty_master_pin") || DEFAULT_ADMIN_PIN;

  if (enteredPin === configuredPin) {
    sessionStorage.setItem("melty_admin_auth", "true");
    checkAdminAuth();
  } else {
    alert("❌ PIN Incorrecto. Acceso denegado.");
    pinInput.value = "";
    pinInput.focus();
  }
}

export function logoutAdmin() {
  sessionStorage.removeItem("melty_admin_auth");
  checkAdminAuth();
}

function renderAdminView() {
  const catalog = getCatalog();
  const tokens = getAllTokens();
  const vouchers = getAllVouchers();

  let totalPoints = 0;
  tokens.forEach(t => {
    if (t.status === "CLAIMED") totalPoints += Number(t.points_value || 0);
  });

  const statCirc = document.getElementById("stat-points-circ");
  const statVouchers = document.getElementById("stat-vouchers-pending");
  const statCatalog = document.getElementById("stat-catalog-count");
  const statTokens = document.getElementById("stat-tokens-count");

  const pendingCount = vouchers.filter(v => v.status === "PENDING_DELIVERY").length;
  if (statCirc) statCirc.textContent = totalPoints;
  if (statVouchers) statVouchers.textContent = pendingCount;
  if (statCatalog) statCatalog.textContent = catalog.length;
  if (statTokens) statTokens.textContent = tokens.length;

  // Render Tokens Table
  const tokensBody = document.getElementById("tokens-table-body");
  if (tokensBody) {
    tokensBody.innerHTML = "";
    if (tokens.length === 0) {
      tokensBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--gray-500);">No hay tokens generados. Usa el generador arriba para crear tu primer lote para la factura física.</td></tr>`;
    } else {
      tokens.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong style="color:var(--amber);">#${t.invoice_folio}</strong></td>
          <td><code style="font-family:var(--font-mono); font-size:0.8rem;">${t.token_code}</code></td>
          <td><strong>${t.points_value} pts</strong></td>
          <td><code>${t.security_pin}</code></td>
          <td>
            <span style="font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:700; ${t.status === 'ACTIVE' ? 'background:#ecfdf5; color:var(--green);' : 'background:var(--gray-100); color:var(--gray-500);'}">
              ${t.status}
            </span>
          </td>
          <td>
            ${t.status === 'ACTIVE' ? `
              <a href="./index.html?token=${t.token_code}&pin=${t.security_pin}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none; font-size:0.8rem;">
                Probar Reclamo ↗
              </a>
            ` : `Reclamado`}
          </td>
        `;
        tokensBody.appendChild(tr);
      });
    }
  }

  // Render Catalog Table
  const catalogBody = document.getElementById("catalog-table-body");
  if (catalogBody) {
    catalogBody.innerHTML = "";
    if (catalog.length === 0) {
      catalogBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--gray-500);">Catálogo vacío. Haz clic en "+ Agregar Producto" para crear artículos.</td></tr>`;
    } else {
      catalog.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${p.title}</strong></td>
          <td>${p.category}</td>
          <td><strong style="color:var(--dark);">${p.points_cost} pts</strong></td>
          <td><strong>${p.stock_real} un.</strong></td>
          <td>$${Number(p.retail_usd || 0).toFixed(2)}</td>
          <td>$${Number(p.cost_landed_usd || 0).toFixed(2)}</td>
          <td>
            <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; color:var(--accent);" onclick="removeProductAdmin('${p.reward_id}')">
              Eliminar
            </button>
          </td>
        `;
        catalogBody.appendChild(tr);
      });
    }
  }
}

// 1-SCAN POS DESPACHO
export function verifyVoucherAdmin() {
  const code = document.getElementById("input-voucher-verify").value.trim().toUpperCase();
  const vouchers = getAllVouchers();
  const v = vouchers.find(item => item.voucher_code === code);

  const resDiv = document.getElementById("voucher-verify-result");
  if (!v) {
    resDiv.style.display = "block";
    resDiv.style.borderColor = "var(--accent)";
    resDiv.innerHTML = `<span style="color:var(--accent); font-weight:800;">❌ Vale no encontrado en los registros.</span>`;
    return;
  }

  resDiv.style.display = "block";
  resDiv.style.borderColor = v.status === "PENDING_DELIVERY" ? "var(--green)" : "var(--gray-300)";

  resDiv.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <h3 style="color:var(--dark); font-size:1.15rem; font-weight:900;">${v.reward_title}</h3>
        <p style="color:var(--gray-700); font-size:0.85rem;">Cliente: <strong>${v.user_name}</strong> (${v.user_phone || 'Sin tel'})</p>
        <p style="color:var(--gray-500); font-size:0.8rem;">Código: <code>${v.voucher_code}</code> · Emitido: ${new Date(v.created_at).toLocaleDateString()}</p>
      </div>
      <div>
        ${v.status === 'PENDING_DELIVERY' ? `
          <button class="btn-primary" onclick="confirmDeliveryAdmin('${v.voucher_code}')">
            ✓ Confirmar Entrega Física
          </button>
        ` : `
          <span style="color:var(--green); font-weight:800;">✓ Entregado</span>
        `}
      </div>
    </div>
  `;
}

export async function confirmDeliveryAdmin(code) {
  try {
    await deliverVoucherAtomic({ voucherCode: code, cashierUid: "admin_melty" });
    alert("✓ Entrega física confirmada. Inventario actualizado.");
    verifyVoucherAdmin();
    renderAdminView();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

export async function generateBatchAdmin() {
  const folio = document.getElementById("input-batch-folio").value;
  const count = document.getElementById("input-batch-count").value;
  const points = document.getElementById("input-batch-points").value;

  try {
    const res = await generateInvoiceQRLot({
      startFolio: folio,
      count: Number(count),
      pointsPerQr: Number(points)
    });

    alert(`🖨️ ¡Lote generado con éxito! ${res.tokens.length} tokens creados para folios ${folio} en adelante.`);
    renderAdminView();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

export function openNewProductModal() {
  document.getElementById("prod-input-title").value = "";
  document.getElementById("prod-input-points").value = "";
  document.getElementById("prod-input-stock").value = "1";
  document.getElementById("prod-input-retail").value = "";
  document.getElementById("prod-input-img").value = "";
  document.getElementById("prod-input-desc").value = "";
  document.getElementById("modal-product-editor").style.display = "flex";
}

export function saveProductAdmin() {
  const title = document.getElementById("prod-input-title").value.trim();
  const category = document.getElementById("prod-input-cat").value;
  const points = Number(document.getElementById("prod-input-points").value);
  const stock = Number(document.getElementById("prod-input-stock").value);
  const retail = Number(document.getElementById("prod-input-retail").value) || 0;
  const img = document.getElementById("prod-input-img").value.trim();
  const desc = document.getElementById("prod-input-desc").value.trim();

  if (!title || !points) {
    alert("Por favor ingresa al menos el título y los puntos requeridos.");
    return;
  }

  saveProduct({
    title,
    category,
    points_cost: points,
    stock_real: stock || 1,
    retail_usd: retail,
    cost_landed_usd: retail * 0.4,
    image_url: img,
    description: desc,
    is_active: true
  });

  closeModal("modal-product-editor");
  alert("✓ Producto agregado al catálogo exitosamente.");
  renderAdminView();
}

export function removeProductAdmin(rewardId) {
  if (confirm("¿Seguro que deseas eliminar este producto?")) {
    deleteProduct(rewardId);
    renderAdminView();
  }
}

export function openFirebaseModal() {
  const current = getSavedFirebaseConfig();
  if (current) {
    const pInput = document.getElementById("fb-input-project-id");
    const aInput = document.getElementById("fb-input-api-key");
    const dInput = document.getElementById("fb-input-auth-domain");
    if (pInput) pInput.value = current.projectId || "meltydeays";
    if (aInput) aInput.value = current.apiKey || "";
    if (dInput) dInput.value = current.authDomain || "meltydeays.firebaseapp.com";
  }
  document.getElementById("modal-firebase").style.display = "flex";
}

export function saveFirebaseModal() {
  const raw = document.getElementById("fb-input-raw-json").value.trim();
  let config = {};

  if (raw) {
    try {
      config = JSON.parse(raw);
    } catch(e) {
      alert("El JSON no es válido.");
      return;
    }
  } else {
    const projectId = document.getElementById("fb-input-project-id").value.trim() || "meltydeays";
    const apiKey = document.getElementById("fb-input-api-key").value.trim();
    const authDomain = document.getElementById("fb-input-auth-domain").value.trim();

    if (!apiKey) {
      alert("Por favor ingresa el API Key de tu proyecto Firebase (comienza con AIzaSy...).");
      return;
    }

    config = {
      projectId,
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      storageBucket: `${projectId}.appspot.com`
    };
  }

  saveFirebaseConfig(config);
  alert("✓ Credenciales de Firebase guardadas.");
}

export function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = "none";
}
