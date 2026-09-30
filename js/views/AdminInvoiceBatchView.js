/**
 * Vista / Subcontrolador: Lotes de Facturación 4x1, Impresión de Pliegos, Opciones de Token y Catálogo (The Wired Club)
 */
import { InvoiceTemplateService } from "../services/InvoiceTemplateService.js";
import { FirestoreService } from "../services/FirestoreService.js";
import { setProductPublicationMode, recalculateProductDiscount } from "./AdminCatalogCalculatorView.js";
import { isProduction, getEnvironmentInfo } from "../config/env.js";

let vm = null;
let showToast = () => {};
let closeModal = () => {};
let switchAdminTab = () => {};
let promptAssignPoints = () => {};
let openSingleDigitalInvoiceModal = () => {};
let renderTokensTable = () => {};
let renderAdmin = (m) => { if (vm && typeof vm.notify === "function") vm.notify(); };

export function initAdminInvoiceBatchView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
    if (deps.switchAdminTab) switchAdminTab = deps.switchAdminTab;
    if (deps.promptAssignPoints) promptAssignPoints = deps.promptAssignPoints;
    if (deps.openSingleDigitalInvoiceModal) openSingleDigitalInvoiceModal = deps.openSingleDigitalInvoiceModal;
    if (deps.renderTokensTable) renderTokensTable = deps.renderTokensTable;
    if (deps.renderAdmin) renderAdmin = deps.renderAdmin;
  }
}

let currentSingleTokenUrl = "";
let currentSheetTokens = [];


export async function generateBatchAdmin() {
  const folioEl = document.getElementById("lot-start-folio");
  const countEl = document.getElementById("lot-count");
  const folio = folioEl?.value || 1;
  let count = parseInt(countEl?.value, 10) || 4;

  if (count < 4) count = 4;
  if (count % 4 !== 0) count = Math.ceil(count / 4) * 4;
  if (countEl) countEl.value = count;

  showToast(`Generando y guardando lote de ${count} facturas con QR únicos...`, "info");

  try {
    const res = await vm.generateLot(folio, count, 0);
    currentSheetTokens = res.tokens;
    showToast(`¡Lote guardado! ${res.tokens.length} facturas registradas en estado 'En espera de valor'.`, "success");
    triggerNativeSheetPrint(res.tokens);
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export async function printFromModal() {
  closeModal("modal-print-sheet");
  await generateBatchAdmin();
}

// [MODULARIZADO]: Lógica de calculadora de catálogo migrada a js/views/AdminCatalogCalculatorView.js


// -----------------------------------------------------------------------------
// CALCULADORA DE PUNTOS POR VENTA (FACTURA 4X1 // REGULADOR DE RETORNO)
// -----------------------------------------------------------------------------
// [MODULARIZADO]: Lógica de calculadora de retorno WP migrada a js/views/AdminSalePointsCalculatorView.js


export function openNewProductModal() {
  const modal = document.getElementById("modal-new-product");
  if (!modal) return;
  const editIdEl = document.getElementById("prod-edit-id");
  if (editIdEl) editIdEl.value = "";
  const titleEl = document.getElementById("modal-product-title");
  if (titleEl) titleEl.textContent = "📦 + AGREGAR PRODUCTO AL CATÁLOGO";
  const btnSubmit = document.getElementById("btn-save-product-submit");
  if (btnSubmit) btnSubmit.textContent = "⚡ GUARDAR EN CATÁLOGO";

  const titleInput = document.getElementById("prod-title");
  if (titleInput) titleInput.value = "";
  const costInput = document.getElementById("prod-cost");
  if (costInput) costInput.value = "";
  const stockInput = document.getElementById("prod-stock");
  if (stockInput) stockInput.value = "1";
  const imgInput = document.getElementById("prod-img");
  if (imgInput) imgInput.value = "";
  const descInput = document.getElementById("prod-desc");
  if (descInput) descInput.value = "";
  clearProductImageUpload();

  modal.style.display = "flex";
  setProductPublicationMode("FREE_REWARD");
  setTimeout(() => {
    if (titleInput) titleInput.focus();
  }, 100);
}

export function openEditProductModal(productId) {
  const modal = document.getElementById("modal-new-product");
  if (!modal) return;
  const product = (vm.catalog || []).find(p => p.id === productId);
  if (!product) {
    showToast("⚠️ No se encontró el producto a editar.", "error");
    return;
  }

  const editIdEl = document.getElementById("prod-edit-id");
  if (editIdEl) editIdEl.value = product.id;
  const titleEl = document.getElementById("modal-product-title");
  if (titleEl) titleEl.textContent = "📦 ✏️ EDITAR PRODUCTO DEL CATÁLOGO";
  const btnSubmit = document.getElementById("btn-save-product-submit");
  if (btnSubmit) btnSubmit.textContent = "💾 ACTUALIZAR PRODUCTO";

  const isPartial = product.rewardType === "PARTIAL_DISCOUNT" || (typeof product.isPartialDiscount === "function" && product.isPartialDiscount());
  setProductPublicationMode(isPartial ? "PARTIAL_DISCOUNT" : "FREE_REWARD");

  const titleInput = document.getElementById("prod-title");
  if (titleInput) titleInput.value = product.title || "";
  const costInput = document.getElementById("prod-cost");
  if (costInput) costInput.value = product.pointsCost != null ? product.pointsCost : "";
  const stockInput = document.getElementById("prod-stock");
  if (stockInput) stockInput.value = product.stock != null ? product.stock : 1;
  const descInput = document.getElementById("prod-desc");
  if (descInput) descInput.value = product.description || "";

  if (isPartial) {
    const priceInput = document.getElementById("calc-sale-prod-price-usd");
    if (priceInput) priceInput.value = (product.priceUsd || 0).toFixed(2);
    const discInput = document.getElementById("calc-sale-prod-discount-pct");
    if (discInput) discInput.value = product.maxDiscountPct || 5;
    const prodPriceHidden = document.getElementById("prod-price-usd");
    if (prodPriceHidden) prodPriceHidden.value = product.priceUsd || 0;
    const prodMaxPctHidden = document.getElementById("prod-max-discount-pct");
    if (prodMaxPctHidden) prodMaxPctHidden.value = product.maxDiscountPct || 5;
    const prodMaxUsdHidden = document.getElementById("prod-max-discount-usd");
    if (prodMaxUsdHidden) prodMaxUsdHidden.value = product.maxDiscountUsd || 0;
    const prodCashHidden = document.getElementById("prod-cash-to-pay-usd");
    if (prodCashHidden) prodCashHidden.value = product.cashToPayUsd || 0;
  }

  if (product.imageUrl) {
    previewProductImageFromUrl(product.imageUrl);
    const imgInput = document.getElementById("prod-img");
    if (imgInput) imgInput.value = product.imageUrl;
  } else {
    clearProductImageUpload();
  }

  modal.style.display = "flex";
  setTimeout(() => {
    if (titleInput) titleInput.focus();
  }, 100);
}


export function validateLotCountInput(input) {
  let val = parseInt(input?.value, 10);
  const helper = document.getElementById("lot-count-helper");
  if (!helper) return;

  if (isNaN(val) || val <= 0) {
    helper.textContent = "⚠️ Ingresa una cantidad válida (múltiplos de 4).";
    helper.style.color = "#dc2626";
    return;
  }

  const sheets = Math.ceil(val / 4);
  const exact = val % 4 === 0;

  if (exact) {
    helper.innerHTML = `📐 <strong>${sheets} pliegos carta</strong> = ${val} facturas a doble cara con QR únicos`;
    helper.style.color = "var(--primary)";
  } else {
    const recommended = sheets * 4;
    helper.innerHTML = `⚠️ No es múltiplo de 4. Se redondeará a <strong>${recommended} facturas (${sheets} pliegos carta completos)</strong>`;
    helper.style.color = "#d97706";
  }
}

export function enforceMultipleOfFour(input) {
  let val = parseInt(input?.value, 10);
  if (isNaN(val) || val < 4) val = 4;
  if (val % 4 !== 0) {
    const rounded = Math.ceil(val / 4) * 4;
    input.value = rounded;
    showToast(`Cantidad ajustada a ${rounded} facturas (${rounded / 4} pliegos carta completos de 4x1).`, "info");
  }
  validateLotCountInput(input);
}

export function openPurgeModal() {
  const modal = document.getElementById("modal-purge-invoices");
  if (!modal) return;
  const countBadge = document.getElementById("purge-tokens-count-badge");
  const count = (vm.tokens || []).length;
  if (countBadge) countBadge.textContent = `${count} ${count === 1 ? 'factura registrada' : 'facturas registradas'}`;

  const envBanner = document.getElementById("purge-invoices-env-banner");
  if (envBanner) {
    const isProd = isProduction();
    if (isProd) {
      envBanner.innerHTML = `
        <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRODUCCIÓN (LIVE)</strong>
            <span>Esta acción eliminará facturas de la colección principal <code>qr_tokens</code> y <code>point_batches</code>.</span>
          </div>
        </div>`;
    } else {
      envBanner.innerHTML = `
        <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #854d0e; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">🧪</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRUEBAS (SANDBOX)</strong>
            <span>Solo se eliminarán facturas de prueba en <code>dev_qr_tokens</code> y <code>dev_point_batches</code>. <strong>La base de datos de PRODUCCIÓN está 100% protegida e intacta.</strong></span>
          </div>
        </div>`;
    }
  }

  modal.style.display = "flex";
}

export async function executePurgeInvoices() {
  closeModal("modal-purge-invoices");
  const isProd = isProduction();
  showToast(isProd ? "Ejecutando purga en base de datos de producción..." : "Ejecutando purga en base de datos de PRUEBAS (dev_*)...", "info");
  try {
    const res = await vm.purgeAllInvoiceTokens();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderTokensTable(vm.tokens);
    showToast(isProd ? "✓ Facturas de PRODUCCIÓN eliminadas y correlativo restablecido a #0001." : "✓ Facturas de PRUEBAS (dev_*) eliminadas y correlativo restablecido a #0001. Producción 100% intacta.", "success");
  } catch (err) {
    showToast("❌ Error al limpiar base de datos: " + err.message, "error");
  }
}

export function openPurgeAllDbModal() {
  const modal = document.getElementById("modal-purge-all-db");
  if (!modal) return;

  const envBanner = document.getElementById("purge-all-db-env-banner");
  if (envBanner) {
    const isProd = isProduction();
    if (isProd) {
      envBanner.innerHTML = `
        <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRODUCCIÓN (LIVE)</strong>
            <span>Esta acción purgará los datos oficiales de producción en Firestore y almacenamiento local.</span>
          </div>
        </div>`;
    } else {
      envBanner.innerHTML = `
        <div style="background: #fefce8; border: 1.5px solid #eab308; border-radius: 4px; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.78rem; color: #854d0e; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">🧪</span>
          <div>
            <strong style="display: block; margin-bottom: 2px;">ENTORNO ACTIVO: PRUEBAS (SANDBOX)</strong>
            <span>La purga solo borrará colecciones <code>dev_*</code> (socios, vales, facturas y catálogo demo). <strong>La base de datos de PRODUCCIÓN está 100% blindada y jamás será alterada.</strong></span>
          </div>
        </div>`;
    }
  }

  modal.style.display = "flex";
}

export async function executePurgeAllDb() {
  closeModal("modal-purge-all-db");
  const isProd = isProduction();
  showToast(isProd ? "Ejecutando purga total de producción..." : "Ejecutando purga de base de datos de PRUEBAS (dev_*)...", "info");
  try {
    const res = await vm.purgeEntireDatabase();
    const folioEl = document.getElementById("lot-start-folio");
    if (folioEl) {
      folioEl.value = 1;
      delete folioEl.dataset.userEdited;
    }
    const helper = document.getElementById("lot-folio-helper");
    if (helper) helper.innerHTML = "Siguiente folio libre detectado: <strong>#0001</strong> (Base de datos limpia)";

    renderAdmin(vm);

    showToast(isProd ? "✓ Base de datos de PRODUCCIÓN purgada. El PIN de Admin sigue intacto." : "✓ Base de datos de PRUEBAS (dev_*) purgada. Base de datos de PRODUCCIÓN 100% intacta.", "success");
  } catch (err) {
    showToast("❌ Error al purgar la base de datos: " + err.message, "error");
  }
}

let currentProductBase64 = null;

export function handleProductImageFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (!file.type.startsWith("image/")) {
    showToast("⚠️ Selecciona un archivo de imagen válido (JPG, PNG, WebP).", "error");
    return;
  }

  showToast("Optimizando y convirtiendo imagen a Base64 gratuito...", "info");

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 500;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const base64Data = canvas.toDataURL("image/jpeg", 0.78);
      currentProductBase64 = base64Data;

      const previewBox = document.getElementById("prod-img-preview-box");
      const previewImg = document.getElementById("prod-img-preview");
      const nameEl = document.getElementById("prod-img-name");
      const sizeEl = document.getElementById("prod-img-size");
      const imgInput = document.getElementById("prod-img");

      if (previewImg) previewImg.src = base64Data;
      if (nameEl) nameEl.textContent = file.name;
      const approxKb = Math.round(base64Data.length * 0.75 / 1024);
      if (sizeEl) sizeEl.textContent = `✓ Optimizado (${width}×${height}px · ~${approxKb} KB en Base64)`;
      if (previewBox) previewBox.style.display = "flex";
      if (imgInput) imgInput.value = base64Data;

      showToast("✓ Imagen optimizada y lista para guardar en la base de datos.", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function clearProductImageUpload() {
  currentProductBase64 = null;
  const fileInput = document.getElementById("prod-file-input");
  if (fileInput) fileInput.value = "";
  const imgInput = document.getElementById("prod-img");
  if (imgInput) imgInput.value = "";
  const previewBox = document.getElementById("prod-img-preview-box");
  if (previewBox) previewBox.style.display = "none";
}

export function previewProductImageFromUrl(url) {
  const val = (url || "").trim();
  const previewBox = document.getElementById("prod-img-preview-box");
  const previewImg = document.getElementById("prod-img-preview");
  const nameEl = document.getElementById("prod-img-name");
  const sizeEl = document.getElementById("prod-img-size");

  if (!val) {
    if (previewBox) previewBox.style.display = "none";
    return;
  }

  if (val.startsWith("data:image")) {
    currentProductBase64 = val;
  } else {
    currentProductBase64 = null;
  }

  if (previewImg) previewImg.src = val;
  if (nameEl) nameEl.textContent = val.startsWith("data:") ? "Imagen Base64" : "Imagen Remota";
  if (sizeEl) sizeEl.textContent = val.startsWith("data:") ? "Almacenamiento Local" : "URL Externa";
  if (previewBox) previewBox.style.display = "flex";
}

export async function saveProductAdmin() {
  const title = (document.getElementById("prod-title").value || "").trim();
  const pointsCost = parseInt(document.getElementById("prod-cost").value, 10);
  const stock = parseInt(document.getElementById("prod-stock").value, 10) || 1;
  const imageUrl = currentProductBase64 || (document.getElementById("prod-img").value || "").trim();
  const description = (document.getElementById("prod-desc").value || "").trim();

  const activeProductMode = document.getElementById("prod-reward-type")?.value || "FREE_REWARD";
  let rewardType = (document.getElementById("prod-reward-type")?.value) || activeProductMode || "FREE_REWARD";
  let priceUsd = parseFloat(document.getElementById("prod-price-usd")?.value) || 0;
  let maxDiscountPct = parseFloat(document.getElementById("prod-max-discount-pct")?.value) || 0;
  let maxDiscountUsd = parseFloat(document.getElementById("prod-max-discount-usd")?.value) || 0;
  let cashToPayUsd = parseFloat(document.getElementById("prod-cash-to-pay-usd")?.value) || 0;

  if (activeProductMode === "PARTIAL_DISCOUNT" || rewardType === "PARTIAL_DISCOUNT") {
    rewardType = "PARTIAL_DISCOUNT";
    const calc = recalculateProductDiscount();
    priceUsd = calc.salePrice;
    maxDiscountPct = calc.discountPct;
    maxDiscountUsd = calc.maxDiscountUsd;
    cashToPayUsd = calc.cashDue;
  }

  if (!title) {
    showToast("⚠️ El nombre del producto es obligatorio.", "error");
    return;
  }
  if (isNaN(pointsCost) || pointsCost <= 0) {
    showToast("⚠️ Ingresa un costo válido en Wired Points.", "error");
    return;
  }

  const editId = (document.getElementById("prod-edit-id")?.value || "").trim();

  try {
    const rewardPayload = {
      title,
      rewardType,
      priceUsd,
      maxDiscountPct,
      maxDiscountUsd,
      cashToPayUsd,
      pointsCost,
      stock,
      imageUrl,
      description
    };
    if (editId) {
      rewardPayload.id = editId;
    }

    await vm.addReward(rewardPayload);
    closeModal("modal-new-product");
    const editInput = document.getElementById("prod-edit-id");
    if (editInput) editInput.value = "";
    document.getElementById("prod-title").value = "";
    document.getElementById("prod-cost").value = "";
    document.getElementById("prod-stock").value = "1";
    document.getElementById("prod-img").value = "";
    document.getElementById("prod-desc").value = "";
    document.getElementById("prod-reward-type").value = "FREE_REWARD";
    document.getElementById("prod-price-usd").value = "0";
    document.getElementById("prod-max-discount-pct").value = "0";
    document.getElementById("prod-max-discount-usd").value = "0";
    document.getElementById("prod-cash-to-pay-usd").value = "0";
    const pill = document.getElementById("prod-commercial-summary-pill");
    if (pill) pill.style.display = "none";
    clearProductImageUpload();
    showToast(editId ? "✓ Producto actualizado con éxito en el catálogo." : "✓ Producto registrado con éxito en el catálogo.", "success");
  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

export const saveNewProduct = saveProductAdmin;

export async function removeProductAdmin(id) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    await vm.deleteReward(id);
    showToast("Producto eliminado del catálogo", "info");
  }
}

export function toggleCustomPaperInputs() {
  const select = document.getElementById("lot-paper-size");
  const customBox = document.getElementById("custom-paper-fields");
  if (customBox) {
    customBox.style.display = select.value === "custom" ? "flex" : "none";
  }
}

export function getSelectedPaperDimensions(source = "preview") {
  const selectId = source === "preview" ? "preview-paper-size" : "lot-paper-size";
  const select = document.getElementById(selectId);
  const sizeType = select ? select.value : "letter";

  if (sizeType === "letter") {
    return { name: "Carta (Letter)", widthMm: 215.9, heightMm: 279.4, cssSize: "letter portrait" };
  } else if (sizeType === "a4") {
    return { name: "A4", widthMm: 210, heightMm: 297, cssSize: "A4 portrait" };
  } else if (sizeType === "legal") {
    return { name: "Oficio (Legal)", widthMm: 215.9, heightMm: 355.6, cssSize: "legal portrait" };
  } else {
    const wId = source === "preview" ? "preview-custom-w" : "custom-paper-width";
    const hId = source === "preview" ? "preview-custom-h" : "custom-paper-height";
    const w = Number(document.getElementById(wId)?.value) || 216;
    const h = Number(document.getElementById(hId)?.value) || 279;
    return { name: "Personalizado (" + w + "x" + h + " mm)", widthMm: w, heightMm: h, cssSize: w + "mm " + h + "mm" };
  }
}

let currentPreviewMode = "both";

export function switchPreviewMode(mode) {
  currentPreviewMode = mode;
  const inputEl = document.getElementById("print-duplex-mode");
  if (inputEl) inputEl.value = mode;

  ["front", "back", "both"].forEach(m => {
    const btn = document.getElementById("btn-preview-mode-" + m);
    if (btn) {
      if (m === mode) {
        btn.classList.add("active");
        btn.style.background = "#0f172a";
        btn.style.color = "#ffffff";
      } else {
        btn.classList.remove("active");
        btn.style.background = "#f8fafc";
        btn.style.color = "#475569";
      }
    }
  });

  updatePreviewSheetDimensions();
}

export function updatePreviewSheetDimensions() {
  const dims = getSelectedPaperDimensions("preview");
  const select = document.getElementById("preview-paper-size");
  const customBox = document.getElementById("preview-custom-dims");
  const label = document.getElementById("preview-dims-label");

  if (customBox) customBox.style.display = select.value === "custom" ? "flex" : "none";
  if (label) label.textContent = dims.name + ": " + dims.widthMm + " mm × " + dims.heightMm + " mm";

  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length >= 4)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length >= 4
        ? vm.tokens.slice(0, 4)
        : [
            { tokenCode: "WP-2026-F0104-A98B", invoiceFolio: "0104", pointsValue: 0, securityPin: "4891" },
            { tokenCode: "WP-2026-F0105-C34D", invoiceFolio: "0105", pointsValue: 0, securityPin: "7124" },
            { tokenCode: "WP-2026-F0106-E56F", invoiceFolio: "0106", pointsValue: 0, securityPin: "8390" },
            { tokenCode: "WP-2026-F0107-G78H", invoiceFolio: "0107", pointsValue: 0, securityPin: "1923" }
          ]);

  const iframe = document.getElementById("sheet-preview-iframe");
  if (iframe) {
    const docHtml = InvoiceTemplateService.generatePrintDocument(tokensToRender, dims, mode, false);
    iframe.srcdoc = docHtml;
  }
}

export function downloadPrintSheetHtml() {
  const dims = getSelectedPaperDimensions("preview");
  const mode = currentPreviewMode || document.getElementById("print-duplex-mode")?.value || "both";
  const tokensToRender = (currentSheetTokens && currentSheetTokens.length >= 4)
    ? currentSheetTokens.slice(0, 4)
    : (vm && vm.tokens && vm.tokens.length >= 4 ? vm.tokens.slice(0, 4) : []);

  const docHtml = InvoiceTemplateService.generatePrintDocument(tokensToRender, dims, mode, false);
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pliego_facturas_meltydeays_4x1_${mode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("✓ Archivo de pliego 4x1 descargado con éxito.", "success");
}

export function openPrintSheetModal() {
  if (currentSheetTokens.length === 0 && vm.tokens.length > 0) {
    currentSheetTokens = vm.tokens.slice(0, 4);
  }

  const mainPaperSize = document.getElementById("lot-paper-size")?.value || "letter";
  const modalSelect = document.getElementById("preview-paper-size");
  if (modalSelect) modalSelect.value = mainPaperSize;

  switchPreviewMode("both");

  const modal = document.getElementById("modal-print-sheet");
  if (modal) modal.style.display = "flex";
}

export function triggerNativeSheetPrint(explicitTokens) {
  const dims = getSelectedPaperDimensions("preview");
  const mode = document.getElementById("print-duplex-mode")?.value || "both";
  
  if (!explicitTokens && currentSheetTokens.length === 0 && vm.tokens.length === 0) {
    // Si no hay tokens generados aún, generar el lote directamente para guardar en sistema
    generateBatchAdmin();
    return;
  }

  const tokensToPrint = explicitTokens && explicitTokens.length > 0
    ? explicitTokens
    : (currentSheetTokens.length > 0 
        ? currentSheetTokens 
        : vm.tokens);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Por favor habilita las ventanas emergentes en tu navegador para imprimir.", "error");
    return;
  }

  const printDoc = InvoiceTemplateService.generatePrintDocument(tokensToPrint, dims, mode);
  printWindow.document.open();
  printWindow.document.write(printDoc);
  printWindow.document.close();
}


export function viewSingleTokenQr(tokenCode, invoiceFolio, pointsValue, securityPin) {
  const modal = document.getElementById("modal-single-qr");
  if (!modal) return;

  currentSingleTokenUrl = "https://meltydeays-wired-club.vercel.app/?claim=" + tokenCode;

  document.getElementById("single-qr-folio").textContent = "Factura #MD-2026-" + invoiceFolio;
  document.getElementById("single-qr-points").textContent = pointsValue > 0 ? pointsValue + " WP" : "Sin Asignar (0 WP)";
  document.getElementById("single-qr-pin").textContent = securityPin || "••••";
  document.getElementById("single-qr-code").textContent = tokenCode;

  const canvas = document.getElementById("single-qr-canvas");
  if (canvas && typeof QRCode !== "undefined") {
    canvas.innerHTML = "";
    new QRCode(canvas, {
      text: currentSingleTokenUrl,
      width: 170,
      height: 170,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  modal.style.display = "flex";
}

export function copySingleQrUrl() {
  if (navigator.clipboard && currentSingleTokenUrl) {
    navigator.clipboard.writeText(currentSingleTokenUrl).then(() => {
      showToast("Enlace de auto-reclamo copiado al portapapeles", "success");
    });
  }
}

export function testSingleQrUrl() {
  if (currentSingleTokenUrl) {
    window.open(currentSingleTokenUrl, "_blank");
  }
}

let selectedTokenForActions = null;

export function openTokenActionsModal(tokenCode) {
  const token = (vm.tokens || []).find(t => t.tokenCode === tokenCode);
  if (!token) return;
  selectedTokenForActions = token;

  const modal = document.getElementById("modal-token-actions");
  if (!modal) return;

  const titleEl = document.getElementById("token-actions-title");
  const codeEl = document.getElementById("token-actions-code");
  const pinEl = document.getElementById("token-actions-pin-badge");
  const statusRow = document.getElementById("token-actions-status-row");
  const btnAssign = document.getElementById("btn-token-opt-assign");

  if (titleEl) titleEl.textContent = `Factura #MD-2026-${token.invoiceFolio}`;
  if (codeEl) codeEl.textContent = token.tokenCode;
  if (pinEl) pinEl.textContent = `PIN: ${token.securityPin || "••••"}`;

  if (statusRow) {
    statusRow.innerHTML = `
      <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px; margin-right: 4px;">
        ${token.pointsValue > 0 ? `⚡ ${token.pointsValue} WP` : '⏳ Sin Asignar (0 WP)'}
      </span>
      <span class="badge-navi" style="font-size: 0.72rem; padding: 2px 7px;">
        ${token.isClaimed() ? '✔ RECLAMADO' : (token.isActive() ? '● SIN RECLAMAR' : '⏳ EN ESPERA DE VALOR')}
      </span>
    `;
  }

  if (btnAssign) {
    if (token.isClaimed()) {
      btnAssign.style.display = "none";
    } else {
      btnAssign.style.display = "inline-flex";
      btnAssign.innerHTML = `<span>⚡</span> <strong>${token.isPendingAssignment() ? 'Cargar Puntos de Venta' : 'Modificar Puntos Asignados'}</strong>`;
    }
  }

  const btnViewInvoice = document.getElementById("btn-token-opt-view-invoice");
  const btnViewLabel = document.getElementById("btn-token-opt-view-invoice-label");
  const btnEditInvoice = document.getElementById("btn-token-opt-edit-invoice");
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (btnViewInvoice) {
    btnViewInvoice.style.display = "inline-flex";
    if (btnViewLabel) btnViewLabel.textContent = hasInvData ? "Ver Factura Digital (Datos Guardados)" : "Generar / Ver Factura Digital (1 Página Completa)";
  }
  if (btnEditInvoice) {
    btnEditInvoice.style.display = hasInvData ? "inline-flex" : "none";
  }

  const deleteLabel = document.getElementById("btn-token-opt-delete-label");
  if (deleteLabel) {
    deleteLabel.textContent = `Eliminar Factura #MD-2026-${token.invoiceFolio} (Liberar Folio)`;
  }

  modal.style.display = "flex";
}

export function executeTokenOptAssign() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    promptAssignPoints(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio);
  }
}

export function executeTokenOptQr() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    viewSingleTokenQr(selectedTokenForActions.tokenCode, selectedTokenForActions.invoiceFolio, selectedTokenForActions.pointsValue, selectedTokenForActions.securityPin);
  }
}

export function executeTokenOptCopyLink() {
  if (selectedTokenForActions) {
    const url = "https://meltydeays-wired-club.vercel.app/?claim=" + selectedTokenForActions.tokenCode;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("✓ Enlace de auto-reclamo copiado al portapapeles", "success");
      });
    }
  }
}

export function executeTokenOptTestUrl() {
  if (selectedTokenForActions) {
    const url = "https://meltydeays-wired-club.vercel.app/?claim=" + selectedTokenForActions.tokenCode;
    window.open(url, "_blank");
  }
}

export function executeTokenOptDigitalInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode);
  }
}

export function executeTokenOptViewInvoice() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  closeModal("modal-token-actions");
  if (hasInvData) {
    const printDims = getSelectedPaperDimensions ? getSelectedPaperDimensions("preview") : null;
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(
      token.invoiceData,
      printDims,
      false,
      token.invoiceData.selectedLainDesignIdx
    );
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(docHtml); w.document.close(); }
    else showToast("⚠️ Habilita ventanas emergentes para ver la factura.", "error");
  } else {
    openSingleDigitalInvoiceModal(token.tokenCode);
  }
}

export function executeTokenOptEditInvoice() {
  closeModal("modal-token-actions");
  if (selectedTokenForActions) {
    openSingleDigitalInvoiceModal(selectedTokenForActions.tokenCode, true);
  }
}

export async function executeTokenOptDelete() {
  if (!selectedTokenForActions) return;
  const token = selectedTokenForActions;
  closeModal("modal-token-actions");

  if (!confirm(`🗑️ ¿Eliminar definitivamente la factura #MD-2026-${token.invoiceFolio} (${token.tokenCode})?\n\nEl folio #${token.invoiceFolio} quedará libre para volverse a generar de inmediato.`)) {
    return;
  }

  showToast(`Eliminando factura #${token.invoiceFolio}...`, "info");
  try {
    await vm.deleteToken(token.tokenCode);
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
    renderTokensTable(vm.tokens);
    if (typeof renderAdmin === "function") renderAdmin(vm);
    showToast(`✓ Factura #MD-2026-${token.invoiceFolio} eliminada. Folio liberado.`, "success");
  } catch (err) {
    showToast("❌ Error al eliminar factura: " + err.message, "error");
  }
}

export function handleInvoiceBtnClick(tokenCode) {
  const token = (vm.tokens || []).find(t => t.tokenCode === tokenCode);
  if (!token) { openSingleDigitalInvoiceModal(tokenCode); return; }
  const hasInvData = !!(token.invoiceData && token.invoiceData.items && token.invoiceData.items.length > 0);
  if (hasInvData) {
    const printDims = getSelectedPaperDimensions ? getSelectedPaperDimensions("preview") : null;
    const docHtml = InvoiceTemplateService.generateSingleDigitalInvoiceDocument(
      token.invoiceData,
      printDims,
      false,
      token.invoiceData.selectedLainDesignIdx
    );
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(docHtml); w.document.close(); }
    else showToast("⚠️ Habilita ventanas emergentes.", "error");
  } else {
    openSingleDigitalInvoiceModal(tokenCode);
  }
}

// ========================================================
// CONTROLADOR DE GALERÍA Y SELECCIÓN DE DISEÑOS LAIN
// ========================================================
let _currentSeriesFilter = 'ALL';
let _lainTemplatesCache = null;

function getLainTemplates() {
  if (_lainTemplatesCache && _lainTemplatesCache.length) return _lainTemplatesCache;
  if (InvoiceTemplateService && typeof InvoiceTemplateService.getAvailableLainTemplates === "function") {
    _lainTemplatesCache = InvoiceTemplateService.getAvailableLainTemplates('physical');
  } else {
    _lainTemplatesCache = Array.from({ length: 74 }, (_, i) => ({
      idx: i,
      layer: "LAYER: " + String(i + 1).padStart(2, "0"),
      series: i < 24 ? "SERIE 1" : (i < 44 ? "SERIE 2" : "SERIE 3"),
      title: "PLANTILLA " + (i + 1),
      sub: "Diseño coleccionable 4x1",
      kanji: "デザイン"
    }));
  }
  return _lainTemplatesCache;
}

export function filterLainSeries(series) {
  _currentSeriesFilter = series;
  if (typeof window !== "undefined") window._currentSeriesFilter = series;
  ['all', 's1', 's2', 's3'].forEach(k => {
    const btn = document.getElementById('btn-filter-' + k);
    if (btn) {
      btn.style.background = '#fff';
      btn.style.color = '#334155';
    }
  });
  const activeBtn = document.getElementById('btn-filter-' + (series === 'ALL' ? 'all' : (series === 'SERIE 1' ? 's1' : (series === 'SERIE 2' ? 's2' : 's3'))));
  if (activeBtn) {
    activeBtn.style.background = series === 'SERIE 3' ? '#b45309' : '#0f172a';
    activeBtn.style.color = '#fff';
  }
  renderLainTemplateGrid();
}

export function setActiveLainTemplate(idx) {
  const templates = getLainTemplates();
  const val = (idx === null || idx === undefined) ? null : Math.max(0, Math.min((templates.length || 74) - 1, Number(idx) | 0));
  if (typeof window !== "undefined") window.activeLainTemplateIdx = val;
  renderLainTemplateGrid();
}

function getAllowedLainIndices() {
  const sf = _currentSeriesFilter || 'ALL';
  if (sf === 'SERIE 1') return Array.from({ length: 24 }, (_, i) => i);
  if (sf === 'SERIE 2') return Array.from({ length: 20 }, (_, i) => i + 24);
  if (sf === 'SERIE 3') return Array.from({ length: 30 }, (_, i) => i + 44);
  return Array.from({ length: getLainTemplates().length || 74 }, (_, i) => i);
}

export function cycleLainTemplate(dir) {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined ? window.activeLainTemplateIdx : null;
  const cur = currentIdx === null ? -1 : currentIdx;
  const curPos = allowed.indexOf(cur);
  let nextPos = 0;
  if (curPos === -1) {
    nextPos = dir > 0 ? 0 : allowed.length - 1;
  } else {
    nextPos = (curPos + (dir > 0 ? 1 : -1) + allowed.length) % allowed.length;
  }
  setActiveLainTemplate(allowed[nextPos]);
}

export function randomizeLainTemplate() {
  const allowed = getAllowedLainIndices();
  const rnd = allowed[Math.floor(Math.random() * allowed.length)];
  setActiveLainTemplate(rnd);
}

export function openLainPreviewModal(idx) {
  const templates = getLainTemplates();
  const safeIdx = Math.max(0, Math.min((templates.length || 74) - 1, Number(idx) | 0));
  const t = templates[safeIdx];
  if (!t) return;

  setActiveLainTemplate(safeIdx);

  const modal = document.getElementById("modal-lain-preview");
  if (!modal) return;

  const badgeSeries = document.getElementById("lain-preview-badge-series");
  const badgeLayer = document.getElementById("lain-preview-badge-layer");
  const badgeSn = document.getElementById("lain-preview-badge-sn");
  const counter = document.getElementById("lain-preview-index-counter");
  const boxHeader = document.getElementById("lain-preview-box-header");
  const boxProtocol = document.getElementById("lain-preview-box-protocol");
  const boxSpec1 = document.getElementById("lain-preview-box-spec1");
  const boxSpec2 = document.getElementById("lain-preview-box-spec2");
  const svgContainer = document.getElementById("lain-preview-svg-container");
  const titleEl = document.getElementById("lain-preview-title");
  const subEl = document.getElementById("lain-preview-sub");
  const kanjiEl = document.getElementById("lain-preview-kanji");
  const quoteEl = document.getElementById("lain-preview-quote");

  if (badgeSeries) {
    badgeSeries.textContent = t.series || "COLECCIÓN LAIN";
    badgeSeries.style.background = (t.series && t.series.includes("SERIE 3")) ? "#b45309" : ((t.series && t.series.includes("SERIE 2")) ? "#4338ca" : "#0f172a");
  }
  if (badgeLayer) badgeLayer.textContent = t.layer;
  if (badgeSn) badgeSn.textContent = t.sn || ("MD-LAIN-9807-" + String(safeIdx + 1).padStart(3, "0"));
  if (counter) counter.textContent = `${safeIdx + 1} / ${templates.length || 74}`;

  if (boxHeader) boxHeader.textContent = `● ${t.layer}`;
  if (boxProtocol) boxProtocol.textContent = t.protocol ? `PROTOCOL: ${t.protocol}` : "";
  if (boxSpec1) boxSpec1.textContent = t.spec1 || t.chip || "";
  if (boxSpec2) boxSpec2.textContent = t.spec2 || "SANCTIFIED";

  if (svgContainer) {
    svgContainer.innerHTML = t.svg || "<div style='color:#94a3b8; padding:20px; font-size:12px;'>No SVG preview available</div>";
  }

  if (titleEl) titleEl.textContent = t.title || t.name;
  if (subEl) subEl.textContent = t.sub || "";
  if (kanjiEl) {
    kanjiEl.textContent = t.kanji || "";
    kanjiEl.style.color = (t.series && t.series.includes("SERIE 3")) ? "#b45309" : "var(--accent)";
  }
  if (quoteEl) {
    quoteEl.textContent = t.quote ? `"${t.quote.replace(/^"|"$/g, '')}"` : "—";
  }

  modal.style.display = "flex";
}

export function previewNextLainTemplate() {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined && window.activeLainTemplateIdx !== null ? window.activeLainTemplateIdx : 0;
  const curPos = allowed.indexOf(currentIdx);
  const nextPos = (curPos + 1 + allowed.length) % allowed.length;
  openLainPreviewModal(allowed[nextPos]);
}

export function previewPrevLainTemplate() {
  const allowed = getAllowedLainIndices();
  const currentIdx = typeof window !== "undefined" && window.activeLainTemplateIdx !== undefined && window.activeLainTemplateIdx !== null ? window.activeLainTemplateIdx : 0;
  const curPos = allowed.indexOf(currentIdx);
  const prevPos = (curPos - 1 + allowed.length) % allowed.length;
  openLainPreviewModal(allowed[prevPos]);
}

export function confirmLainPreviewSelection() {
  if (typeof closeModal === "function") {
    closeModal("modal-lain-preview");
  } else if (typeof window !== "undefined" && typeof window.closeModal === "function") {
    window.closeModal("modal-lain-preview");
  } else {
    const modal = document.getElementById("modal-lain-preview");
    if (modal) modal.style.display = "none";
  }
}

if (typeof window !== "undefined" && !window._lainPreviewKeydownBound) {
  window._lainPreviewKeydownBound = true;
  window.addEventListener("keydown", (e) => {
    const modal = document.getElementById("modal-lain-preview");
    if (!modal || modal.style.display === "none") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      previewNextLainTemplate();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      previewPrevLainTemplate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      confirmLainPreviewSelection();
    }
  });
}

export function renderLainTemplateGrid() {
  const grid = document.getElementById("lain-template-grid");
  if (!grid) return;
  const templates = getLainTemplates();
  const currentIdx = typeof window !== "undefined" ? window.activeLainTemplateIdx : null;
  const sf = _currentSeriesFilter || 'ALL';
  const tiles = [];

  templates.forEach((t) => {
    if (sf && sf !== 'ALL') {
      const tSeries = t.series || (t.idx < 24 ? 'SERIE 1' : (t.idx < 44 ? 'SERIE 2' : 'SERIE 3'));
      if (!tSeries.includes(sf)) return;
    }
    const isFixed = currentIdx === t.idx;
    const isHaibane = (t.series && t.series.includes('SERIE 3')) || t.idx >= 44;
    const tile = document.createElement("div");
    if (isHaibane) tile.style.borderColor = '#d97706';
    tile.className = "lain-template-tile" + (isFixed ? " is-active" : "");
    tile.title = t.layer + " — " + t.title + " (click para ver diseño y fijar / doble click para desactivar)";
    tile.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">' +
        '<span class="lain-template-layer">' + t.layer + '</span>' +
        '<span class="lain-template-preview-badge">👁 VER</span>' +
      '</div>' +
      '<div class="lain-template-title">' + t.title + '</div>' +
      '<div class="lain-template-sub">' + (t.sub || '') + '</div>' +
      '<div class="lain-template-kanji">' + (t.kanji || '') + '</div>';
    tile.onclick = () => openLainPreviewModal(t.idx);
    tile.ondblclick = (e) => {
      e.stopPropagation();
      setActiveLainTemplate(null);
    };
    tiles.push(tile);
  });

  // Añadir tile modo AUTOMÁTICO (null) adaptativo por serie
  const autoTile = document.createElement("div");
  autoTile.className = "lain-template-tile" + (currentIdx === null || currentIdx === undefined ? " is-active" : "");
  let autoBadge = "AUTO · TODAS (74)";
  let autoTitle = "MODO DINÁMICO";
  let autoSub = "Rotación completa entre los 74 diseños disponibles por folio.";
  let autoKanji = "全74種 · 自動";
  let autoColor = "#059669";

  if (sf === 'SERIE 1') {
    autoBadge = "AUTO · SERIE 1 (24)";
    autoTitle = "MODO DINÁMICO (LAIN)";
    autoSub = "Rotación exclusiva en los 24 diseños de Serial Experiments Lain.";
    autoKanji = "連続実験 · 動的";
    autoColor = "#0284c7";
  } else if (sf === 'SERIE 2') {
    autoBadge = "AUTO · SERIE 2 (20)";
    autoTitle = "MODO DINÁMICO (COPLAND)";
    autoSub = "Rotación exclusiva en los 20 diseños Copland OS.";
    autoKanji = "OS端末 · 動的";
    autoColor = "#6366f1";
  } else if (sf === 'SERIE 3') {
    autoBadge = "AUTO · SERIE 3 (30)";
    autoTitle = "MODO DINÁMICO (HAIBANE)";
    autoSub = "Rotación exclusiva en los 30 diseños Haibane Renmei.";
    autoKanji = "灰羽連盟 · 動的";
    autoColor = "#b45309";
    if (currentIdx === null || currentIdx === undefined) {
      autoTile.style.borderColor = "#b45309";
      autoTile.style.background = "#fffbeb";
    }
  }

  autoTile.title = "Haz click: " + autoTitle + ". Las facturas rotarán dentro de esta serie seleccionada.";
  autoTile.innerHTML =
    '<div class="lain-template-layer" style="color:' + autoColor + ';">' + autoBadge + '</div>' +
    '<div class="lain-template-title" style="' + (sf === 'SERIE 3' ? 'color:#78350f;' : '') + '">' + autoTitle + '</div>' +
    '<div class="lain-template-sub">' + autoSub + '</div>' +
    '<div class="lain-template-kanji" style="color:' + autoColor + ';">' + autoKanji + '</div>';
  autoTile.onclick = () => setActiveLainTemplate(null);
  tiles.unshift(autoTile);

  grid.innerHTML = "";
  tiles.forEach(t => grid.appendChild(t));

  const label = document.getElementById("lain-template-active-label");
  if (label) {
    if (currentIdx === null || currentIdx === undefined) {
      const seriesName = sf === 'SERIE 3' ? 'SERIE 3 (30 Diseños Haibane Renmei)' : (sf === 'SERIE 2' ? 'SERIE 2 (20 Diseños Copland OS)' : (sf === 'SERIE 1' ? 'SERIE 1 (24 Diseños Lain)' : 'TODAS (74 Diseños)'));
      label.innerHTML = "▣ MODO DINÁMICO ACTIVO: Rotación por lote en " + seriesName;
      label.style.background = sf === 'SERIE 3' ? "#fef3c7" : "#ecfdf5";
      label.style.color = sf === 'SERIE 3' ? "#92400e" : "#047857";
      label.style.borderColor = sf === 'SERIE 3' ? "#f59e0b" : "#6ee7b7";
    } else {
      const sel = templates[currentIdx] || templates[0];
      label.innerHTML = "▣ DISEÑO FIJO ACTIVO: " + sel.layer + " — " + sel.title;
      label.style.background = "#eef2ff";
      label.style.color = "#4338ca";
      label.style.borderColor = "#c7d2fe";
    }
  }
}