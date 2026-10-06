/**
 * Vista / Subcontrolador: Catálogo de Recompensas, Calculadora Dinámica de Canje y FX Retro (The Wired Club)
 */
import { parseProductDescription } from "../../models/RewardModel.js";
import { FirestoreService } from "../../services/FirestoreService.js";

let vm = null;
let showToast = () => {};
let openAuthModal = () => {};
let showVoucherModal = (code) => {
  if (typeof window.showVoucherModal === "function") {
    window.showVoucherModal(code);
  }
};
let formatPrice = (usd) => `$${Number(usd || 0).toFixed(2)} USD`;
let formatDualPrice = (usd) => `$${Number(usd || 0).toFixed(2)} USD`;
let currentlyOpenSpecsId = null;
let activeCommentsUnsubscribe = null;

export function toggleRewardSpecs(itemId) {
  const drop = document.getElementById("specs-drop-" + itemId);
  const btn = document.getElementById("specs-btn-" + itemId);
  if (!drop || !btn) return;

  const isHidden = drop.style.display === "none" || !drop.style.display;

  // Cerrar cualquier otro dropdown abierto previamente para no saturar la vista
  if (currentlyOpenSpecsId && currentlyOpenSpecsId !== itemId) {
    const prevDrop = document.getElementById("specs-drop-" + currentlyOpenSpecsId);
    const prevBtn = document.getElementById("specs-btn-" + currentlyOpenSpecsId);
    if (prevDrop) prevDrop.style.display = "none";
    if (prevBtn) {
      prevBtn.classList.remove("expanded");
      const prevCount = prevDrop ? prevDrop.querySelectorAll("li").length : 0;
      const prevLabel = prevBtn.querySelector(".btn-specs-label");
      const prevIcon = prevBtn.querySelector(".btn-specs-icon");
      if (prevLabel) prevLabel.textContent = `📋 Ver especificaciones (${prevCount})`;
      if (prevIcon) prevIcon.textContent = "▾";
    }
    currentlyOpenSpecsId = null;
  }

  if (isHidden) {
    drop.style.display = "block";
    btn.classList.add("expanded");
    currentlyOpenSpecsId = itemId;
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = "✕ Ocultar especificaciones";
    if (icon) icon.textContent = "▴";
  } else {
    drop.style.display = "none";
    btn.classList.remove("expanded");
    currentlyOpenSpecsId = null;
    const count = drop.querySelectorAll("li").length;
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = `📋 Ver especificaciones (${count})`;
    if (icon) icon.textContent = "▾";
  }
}

let lastRenderedCatalog = [];

// ==========================================
// CONTROLADOR DE LIGHTBOX (PANTALLA COMPLETA & GALERÍA)
// ==========================================
let currentLightboxImages = [];
let currentLightboxIndex = 0;
let currentLightboxTitle = "";
let isLightboxZoomed = false;
let lightboxPanX = 0;
let lightboxPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panTotalMove = 0;

export function resetLightboxPan() {
  lightboxPanX = 0;
  lightboxPanY = 0;
  isPanning = false;
  panTotalMove = 0;
  isLightboxZoomed = false;
  const viewport = document.getElementById("lightbox-viewport");
  if (viewport) viewport.classList.remove("is-panning");
  const imgEl = document.getElementById("lightbox-main-img");
  if (imgEl) {
    imgEl.classList.remove("zoomed");
    imgEl.style.transform = "";
  }
  const hintEl = document.querySelector(".lightbox-zoom-hint");
  if (hintEl) hintEl.textContent = "[+] Clic para zoom";
}

function attachLightboxPanListeners() {
  const viewport = document.getElementById("lightbox-viewport");
  if (!viewport || viewport.dataset.panAttached === "true") return;
  viewport.dataset.panAttached = "true";

  viewport.addEventListener("pointerdown", (e) => {
    if (!isLightboxZoomed) return;
    isPanning = true;
    panTotalMove = 0;
    panStartX = e.clientX - lightboxPanX;
    panStartY = e.clientY - lightboxPanY;
    viewport.classList.add("is-panning");
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!isPanning || !isLightboxZoomed) return;
    const nextX = e.clientX - panStartX;
    const nextY = e.clientY - panStartY;
    panTotalMove += Math.hypot(nextX - lightboxPanX, nextY - lightboxPanY);

    const maxPanX = (viewport.clientWidth || 360) * 0.75;
    const maxPanY = (viewport.clientHeight || 480) * 0.75;
    lightboxPanX = Math.max(-maxPanX, Math.min(maxPanX, nextX));
    lightboxPanY = Math.max(-maxPanY, Math.min(maxPanY, nextY));

    const imgEl = document.getElementById("lightbox-main-img");
    if (imgEl) {
      imgEl.style.transform = `scale(2.2) translate(${lightboxPanX / 2.2}px, ${lightboxPanY / 2.2}px)`;
    }
  });

  const onPointerUp = (e) => {
    if (!isPanning) return;
    isPanning = false;
    viewport.classList.remove("is-panning");
    try {
      if (e && e.pointerId && viewport.hasPointerCapture(e.pointerId)) {
        viewport.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
  };

  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
}

export function openImageLightbox(rewardIdOrImages, index = 0, customTitle = "") {
  let images = [];
  let title = customTitle || "";

  if (Array.isArray(rewardIdOrImages)) {
    images = rewardIdOrImages.filter(Boolean);
  } else if (typeof rewardIdOrImages === "string") {
    let item = null;
    if (vm && vm.catalog) {
      item = vm.catalog.find(r => r.id === rewardIdOrImages);
    }
    if (!item && lastRenderedCatalog.length > 0) {
      item = lastRenderedCatalog.find(r => r.id === rewardIdOrImages);
    }
    if (!item && typeof window !== "undefined" && Array.isArray(window._lastRenderedCatalog)) {
      item = window._lastRenderedCatalog.find(r => r.id === rewardIdOrImages);
    }

    if (item) {
      title = item.title || title;
      images = typeof item.getImages === "function" 
        ? item.getImages() 
        : (Array.isArray(item.images) && item.images.length ? item.images : (item.imageUrl ? [item.imageUrl] : []));
    } else if (rewardIdOrImages.startsWith("http") || rewardIdOrImages.startsWith("data:image")) {
      images = [rewardIdOrImages];
    }
  }

  if (!title) {
    title = "Artículo The Wired Club";
  }

  if (!images || images.length === 0) {
    showToast("⚠️ No hay imágenes disponibles para este producto.", "info");
    return;
  }

  currentLightboxImages = images;
  currentLightboxIndex = Math.max(0, Math.min(index, images.length - 1));
  currentLightboxTitle = title;
  resetLightboxPan();

  const modal = document.getElementById("modal-image-lightbox");
  if (!modal) return;

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
  const fab = document.getElementById("fab-mobile-menu");
  if (fab) {
    fab.classList.add("is-hidden");
    fab.style.setProperty("display", "none", "important");
  }
  attachLightboxPanListeners();
  renderLightboxView();
}

export function closeImageLightbox() {
  const modal = document.getElementById("modal-image-lightbox");
  if (modal) modal.style.display = "none";
  resetLightboxPan();

  const specsModal = document.getElementById("modal-product-specs");
  const isSpecsOpen = specsModal && specsModal.style.display !== "none" && specsModal.style.display !== "";
  if (!isSpecsOpen) {
    document.body.classList.remove("modal-open");
    const fab = document.getElementById("fab-mobile-menu");
    if (fab) {
      fab.style.display = "";
      fab.classList.remove("is-hidden");
    }
  }
}

export function lightboxNextImage() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
  resetLightboxPan();
  renderLightboxView();
}

export function lightboxPrevImage() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
  resetLightboxPan();
  renderLightboxView();
}

export function setLightboxImageIndex(idx) {
  if (idx >= 0 && idx < currentLightboxImages.length) {
    currentLightboxIndex = idx;
    resetLightboxPan();
    renderLightboxView();
  }
}

export function toggleLightboxZoom(e) {
  if (panTotalMove > 8) {
    panTotalMove = 0;
    return;
  }
  const imgEl = document.getElementById("lightbox-main-img");
  if (!imgEl) return;
  isLightboxZoomed = !isLightboxZoomed;
  if (isLightboxZoomed) {
    lightboxPanX = 0;
    lightboxPanY = 0;
    imgEl.classList.add("zoomed");
    imgEl.style.transform = "scale(2.2) translate(0px, 0px)";
    const hintEl = document.querySelector(".lightbox-zoom-hint");
    if (hintEl) hintEl.textContent = "[-] Arrastra para explorar / Clic para alejar";
  } else {
    resetLightboxPan();
  }
}

function renderLightboxView() {
  const titleEl = document.getElementById("lightbox-title") || document.getElementById("lightbox-product-title");
  const counterEl = document.getElementById("lightbox-counter");
  const imgEl = document.getElementById("lightbox-main-img");
  const prevBtn = document.getElementById("lightbox-prev-btn");
  const nextBtn = document.getElementById("lightbox-next-btn");
  const thumbsContainer = document.getElementById("lightbox-thumbnails-bar") || document.getElementById("lightbox-thumbs-container");

  if (titleEl) {
    titleEl.textContent = currentLightboxTitle;
    titleEl.title = currentLightboxTitle;
  }
  if (counterEl) {
    counterEl.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
    counterEl.style.display = currentLightboxImages.length > 1 ? "inline-block" : "none";
  }

  if (imgEl) {
    imgEl.classList.remove("zoomed");
    imgEl.src = currentLightboxImages[currentLightboxIndex] || "";
    imgEl.alt = `${currentLightboxTitle} - Frame ${currentLightboxIndex + 1}`;
  }

  const showNav = currentLightboxImages.length > 1;
  if (prevBtn) prevBtn.style.display = showNav ? "flex" : "none";
  if (nextBtn) nextBtn.style.display = showNav ? "flex" : "none";

  if (thumbsContainer) {
    if (!showNav) {
      thumbsContainer.style.display = "none";
      thumbsContainer.innerHTML = "";
    } else {
      thumbsContainer.style.display = "flex";
      thumbsContainer.innerHTML = currentLightboxImages.map((src, i) => `
        <div class="lightbox-thumb-item ${i === currentLightboxIndex ? 'active' : ''}" onclick="setLightboxImageIndex(${i})" title="Frame ${i + 1}">
          <img src="${src}" alt="Frame ${i + 1}">
        </div>
      `).join("");
    }
  }
}

// Atajos de teclado para el visor
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("modal-image-lightbox");
    if (!modal || modal.style.display !== "flex") return;

    if (e.key === "Escape") {
      closeImageLightbox();
    } else if (e.key === "ArrowRight") {
      lightboxNextImage();
    } else if (e.key === "ArrowLeft") {
      lightboxPrevImage();
    }
  });
}

let currentSpecsItem = null;
let currentSpecsImgIndex = 0;

export function specsModalNextImage() {
  if (!currentSpecsItem) return;
  const imgs = typeof currentSpecsItem.getImages === "function" 
    ? currentSpecsItem.getImages() 
    : (Array.isArray(currentSpecsItem.images) && currentSpecsItem.images.length ? currentSpecsItem.images : (currentSpecsItem.imageUrl ? [currentSpecsItem.imageUrl] : []));
  if (imgs.length <= 1) return;
  currentSpecsImgIndex = (currentSpecsImgIndex + 1) % imgs.length;
  updateSpecsModalImage();
}

export function specsModalPrevImage() {
  if (!currentSpecsItem) return;
  const imgs = typeof currentSpecsItem.getImages === "function" 
    ? currentSpecsItem.getImages() 
    : (Array.isArray(currentSpecsItem.images) && currentSpecsItem.images.length ? currentSpecsItem.images : (currentSpecsItem.imageUrl ? [currentSpecsItem.imageUrl] : []));
  if (imgs.length <= 1) return;
  currentSpecsImgIndex = (currentSpecsImgIndex - 1 + imgs.length) % imgs.length;
  updateSpecsModalImage();
}

export function setSpecsModalImageIndex(idx) {
  if (!currentSpecsItem) return;
  const imgs = typeof currentSpecsItem.getImages === "function" 
    ? currentSpecsItem.getImages() 
    : (Array.isArray(currentSpecsItem.images) && currentSpecsItem.images.length ? currentSpecsItem.images : (currentSpecsItem.imageUrl ? [currentSpecsItem.imageUrl] : []));
  if (idx >= 0 && idx < imgs.length) {
    currentSpecsImgIndex = idx;
    updateSpecsModalImage();
  }
}

function updateSpecsModalImage() {
  if (!currentSpecsItem) return;
  const imgs = typeof currentSpecsItem.getImages === "function" 
    ? currentSpecsItem.getImages() 
    : (Array.isArray(currentSpecsItem.images) && currentSpecsItem.images.length ? currentSpecsItem.images : (currentSpecsItem.imageUrl ? [currentSpecsItem.imageUrl] : []));
  const mainImgEl = document.getElementById("specs-carousel-img");
  const counterEl = document.getElementById("specs-carousel-counter");
  const thumbs = document.querySelectorAll(".specs-carousel-thumb");
  
  if (mainImgEl && imgs[currentSpecsImgIndex]) {
    mainImgEl.src = imgs[currentSpecsImgIndex];
    mainImgEl.alt = `${currentSpecsItem.title} - Frame ${currentSpecsImgIndex + 1}`;
  }
  if (counterEl) {
    counterEl.textContent = `[ 0${currentSpecsImgIndex + 1} / 0${imgs.length} ]`;
  }
  thumbs.forEach((th, i) => {
    if (i === currentSpecsImgIndex) {
      th.classList.add("active");
    } else {
      th.classList.remove("active");
    }
  });
}

export function openLightboxFromSpecs() {
  if (!currentSpecsItem) return;
  const escapedTitle = (currentSpecsItem.title || "").replace(/'/g, "\\'");
  openImageLightbox(currentSpecsItem.id, currentSpecsImgIndex, escapedTitle);
}

export function renderWiredCoinSvg() {
  return `
    <svg class="reward-temu-coin-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10.5" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
      <circle cx="12" cy="12" r="8" fill="none" stroke="#fef08a" stroke-width="0.8" stroke-dasharray="2 1"/>
      <text x="12" y="15.5" text-anchor="middle" font-family="'Impact', 'Arial Black', sans-serif" font-size="10.5" font-weight="900" fill="#78350f">W</text>
    </svg>
  `;
}

export async function shareProduct(rewardId) {
  const item = (lastRenderedCatalog || []).find(r => r.id === rewardId) ||
    (vm?.catalog || []).find(r => r.id === rewardId);
  if (!item) return;

  const url = window.location.origin + window.location.pathname + '#product-' + rewardId;
  const shareData = {
    title: `${item.title} · MeltyDeays Wired Club`,
    text: `¡Mira esta recompensa en The Wired Club! ${item.title} disponible para canjear con Wired Points.`,
    url: url
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    if (typeof showToast === "function") {
      showToast("🔗 ¡Enlace del producto copiado al portapapeles!", "success");
    } else {
      alert("Enlace copiado: " + url);
    }
  } catch (err) {
    prompt("Copia el enlace de este producto:", url);
  }
}

export function updateSpecsModalCalculation(rewardId, pointsApplied) {
  const item = (lastRenderedCatalog || []).find(r => r.id === rewardId) ||
    (vm?.catalog || []).find(r => r.id === rewardId);
  if (!item) return;

  const pts = Math.max(0, Number(pointsApplied) || 0);
  const maxCapPts = item.pointsCost || 0;
  const maxPct = Number(item.maxDiscountPct || 5);
  const appliedPct = maxCapPts > 0 ? Number(((pts / maxCapPts) * maxPct).toFixed(1)) : 0;
  const usdPerPoint = (maxCapPts > 0 && item.maxDiscountUsd > 0) ? (item.maxDiscountUsd / maxCapPts) : 0;
  const appliedDiscUsd = Math.min(item.maxDiscountUsd || 0, pts * usdPerPoint);
  const cashToPay = Math.max(0, (item.priceUsd || 0) - appliedDiscUsd);

  const discEl = document.getElementById(`specs-calc-disc-${rewardId}`);
  const cashEl = document.getElementById(`specs-calc-cash-${rewardId}`);
  const sliderEl = document.getElementById(`specs-slider-${rewardId}`);
  const ptsLabel = document.getElementById(`specs-slider-val-${rewardId}`);

  if (discEl) discEl.textContent = `-$${appliedDiscUsd.toFixed(2)} USD (-${appliedPct}%)`;
  if (cashEl) cashEl.innerHTML = formatDualPrice(cashToPay);
  if (sliderEl) sliderEl.value = pts;
  if (ptsLabel) ptsLabel.textContent = `${pts} WP aplicados`;
}

export async function submitProductComment(rewardId) {
  const textEl = document.getElementById(`comment-input-text-${rewardId}`);
  const nameEl = document.getElementById(`comment-input-name-${rewardId}`);
  if (!textEl || !textEl.value.trim()) return;

  const text = textEl.value.trim();
  const name = (nameEl && nameEl.value.trim()) || (vm?.currentUser?.displayName) || "Cliente";

  const commentData = {
    rewardId: rewardId,
    userId: vm?.currentUser?.uid || "guest",
    userName: name,
    questionText: text,
    answerText: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: new Date().toISOString()
  };

  try {
    await FirestoreService.addProductComment(commentData);
    textEl.value = "";
    if (typeof showToast === "function") {
      showToast("✅ Tu pregunta fue enviada con éxito.", "success");
    }
    await loadProductComments(rewardId);
  } catch (e) {
    if (typeof showToast === "function") {
      showToast("No se pudo enviar la pregunta: " + e.message, "error");
    }
  }
}

export function renderProductCommentsDom(rewardId, comments) {
  const listEl = document.getElementById(`comments-list-${rewardId}`);
  if (!listEl) return;

  if (!comments || comments.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 14px; color: #94a3b8; font-size: 0.72rem; font-family: var(--font-mono); background: #f8fafc; border-radius: 4px; border: 1px dashed #cbd5e1;">
        💬 Aún no hay preguntas sobre este artículo. ¡Sé el primero en consultar!
      </div>
    `;
    return;
  }

  // Preservar texto de borrador si el usuario ya tenía el formulario de respuesta abierto
  const openReplyDrafts = {};
  listEl.querySelectorAll(".temu-reply-form-container").forEach(form => {
    if (form.style.display !== "none") {
      const commentId = form.id.replace("reply-form-", "");
      const input = document.getElementById(`reply-input-${commentId}`);
      if (input && input.value) {
        openReplyDrafts[commentId] = input.value;
      }
    }
  });

  listEl.innerHTML = comments.map(c => {
    const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Reciente';
    
    let qText = String(c.questionText || c.comment || c.text || c.message || c.question || c.content || '').trim();
    if (!qText || qText === 'undefined' || qText === 'null') {
      qText = '¿Tienen entrega disponible en tienda física hoy mismo si aparto con mis puntos?';
    }

    // Normalizar array de respuestas (hilo conversacional multirrespuesta)
    let repliesList = Array.isArray(c.replies) ? [...c.replies] : [];
    if (repliesList.length === 0) {
      let legacyText = String(c.answerText || c.reply || c.response || c.answer || '').trim();
      if (legacyText && legacyText !== 'undefined' && legacyText !== 'null') {
        const isOff = Boolean(
          c.isOfficialReply === true ||
          (c.answeredBy && (c.answeredBy.includes("MeltyDeays") || c.answeredBy.includes("Soporte Oficial"))) ||
          (c.replyAuthor && (c.replyAuthor.includes("MeltyDeays") || c.replyAuthor.includes("Soporte Oficial")))
        );
        repliesList.push({
          id: 'legacy-' + c.id,
          text: legacyText,
          author: c.answeredBy || c.replyAuthor || (isOff ? "MeltyDeays Soporte" : "Socio"),
          isOfficial: isOff,
          createdAt: c.replyAt || c.answeredAt || c.createdAt
        });
      }
    }

    const hasReplies = repliesList.length > 0;

    let authorName = String(c.userName || c.author || c.name || 'Socio').trim();
    if (!authorName || authorName === 'undefined' || authorName === 'null') {
      authorName = 'Socio Wired';
    }

    const currentUserName = (vm?.currentUser?.displayName) ? vm.currentUser.displayName.trim() : "Socio Wired";
    const draftText = openReplyDrafts[c.id] || "";
    const isFormOpen = Boolean(draftText);

    return `
      <div class="temu-comment-card">
        <div class="temu-comment-user-row">
          <span class="temu-comment-username">👤 ${authorName}</span>
          <span class="temu-comment-date">${dateStr}</span>
        </div>
        <div class="temu-comment-text">${qText}</div>
        
        ${hasReplies ? `
          <div class="temu-comments-thread" style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; border-left: 2px solid #e2e8f0; padding-left: 8px; margin-left: 2px;">
            ${repliesList.map(rep => {
              const isOfficial = Boolean(rep.isOfficial);
              const rawAuthor = String(rep.author || (isOfficial ? "MeltyDeays Soporte" : "Socio")).trim();
              const cleanAuthor = rawAuthor.replace(/\\s*\\(Soporte\\)/gi, '').trim() || "Socio";
              const repDate = rep.createdAt ? new Date(rep.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
              const repText = String(rep.text || '').trim();

              if (isOfficial) {
                return `
                  <div class="temu-comment-reply-box official-reply" style="background: #f0f9ff; border-left: 3px solid #0284c7; padding: 6px 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                      <span class="temu-comment-reply-tag official-tag" style="background: #0284c7; color: #ffffff; font-weight: 800; font-size: 0.65rem; padding: 2px 7px; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px;">🛡️ MeltyDeays Soporte</span>
                      ${repDate ? `<span style="font-size: 0.60rem; color: #64748b; font-family: var(--font-mono);">${repDate}</span>` : ''}
                    </div>
                    <div class="temu-comment-reply-text" style="font-size: 0.74rem; color: #0f172a; line-height: 1.35;">${repText}</div>
                  </div>
                `;
              } else {
                return `
                  <div class="temu-comment-reply-box community-reply" style="background: #f8fafc; border-left: 3px solid #64748b; padding: 6px 10px; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                      <span class="temu-comment-reply-tag community-tag" style="background: #e2e8f0; color: #334155; font-weight: 700; font-size: 0.65rem; padding: 2px 7px; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #cbd5e1;">👤 Respuesta de ${cleanAuthor}</span>
                      ${repDate ? `<span style="font-size: 0.60rem; color: #64748b; font-family: var(--font-mono);">${repDate}</span>` : ''}
                    </div>
                    <div class="temu-comment-reply-text" style="font-size: 0.74rem; color: #334155; line-height: 1.35;">${repText}</div>
                  </div>
                `;
              }
            }).join('')}
          </div>
        ` : `
          <div style="font-size: 0.65rem; color: #94a3b8; font-style: italic; margin-top: 4px; padding-left: 2px;">
            ⏳ Pendiente de respuesta por el equipo de tienda
          </div>
        `}

        <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
          <button type="button" class="btn-reply-toggle" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #0284c7; font-size: 0.70rem; font-weight: 800; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease;" onclick="toggleCommentReplyForm('${c.id}')">
            💬 Responder a la consulta
          </button>
        </div>
        <div id="reply-form-${c.id}" class="temu-reply-form-container" style="display: ${isFormOpen ? 'block' : 'none'}; margin-top: 8px; background: #ffffff; border: 1.5px solid #0284c7; border-radius: 6px; padding: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);">
          <div style="font-size: 0.68rem; font-weight: 800; color: #0369a1; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            ✍️ Tu respuesta (${currentUserName}):
          </div>
          <textarea id="reply-input-${c.id}" class="temu-comment-reply-input" placeholder="Escribe tu respuesta a esta consulta..." rows="2" style="width: 100%; padding: 6px 8px; font-size: 0.74rem; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; margin-bottom: 6px; resize: vertical; font-family: inherit; outline: none;">${draftText}</textarea>
          <div style="display: flex; justify-content: flex-end; gap: 6px;">
            <button type="button" class="btn-secondary" style="font-size: 0.68rem; padding: 3px 8px; border-radius: 4px; cursor: pointer;" onclick="toggleCommentReplyForm('${c.id}')">Cancelar</button>
            <button type="button" class="btn-primary" style="font-size: 0.68rem; padding: 3px 10px; border-radius: 4px; cursor: pointer; background: #0284c7; color: white; border: none; font-weight: 800;" onclick="submitClientCommentReply('${rewardId}', '${c.id}')">Publicar</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export async function loadProductComments(rewardId) {
  const listEl = document.getElementById(`comments-list-${rewardId}`);
  if (!listEl) return;

  try {
    const comments = await FirestoreService.fetchProductComments(rewardId);
    renderProductCommentsDom(rewardId, comments);
  } catch (err) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 8px; color: #94a3b8; font-size: 0.72rem;">
        No fue posible cargar los comentarios en este momento.
      </div>
    `;
  }
}

export function toggleCommentReplyForm(commentId) {
  const form = document.getElementById(`reply-form-${commentId}`);
  if (!form) return;
  const isOpening = form.style.display === "none" || !form.style.display;
  form.style.display = isOpening ? "block" : "none";
  if (isOpening) {
    setTimeout(() => {
      form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const input = document.getElementById(`reply-input-${commentId}`);
      if (input) {
        input.focus();
        if (typeof input.setSelectionRange === "function") {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }
    }, 50);
  }
}

export async function submitClientCommentReply(rewardId, commentId) {
  const input = document.getElementById(`reply-input-${commentId}`);
  if (!input || !input.value.trim()) return;
  const replyText = input.value.trim();
  const author = (vm?.currentUser?.displayName) ? vm.currentUser.displayName.trim() : "Socio Wired";

  try {
    await FirestoreService.answerProductComment(commentId, replyText, author, false);
    input.value = "";
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) form.style.display = "none";
    if (typeof showToast === "function") {
      showToast("✓ Respuesta añadida a la conversación.", "success");
    }
    await loadProductComments(rewardId);
  } catch (e) {
    if (typeof showToast === "function") {
      showToast("Error al responder: " + e.message, "error");
    }
  }
}

export function openProductSpecsModal(rewardId, imgIdx = 0) {
  let item = null;
  if (vm && vm.catalog) {
    item = vm.catalog.find(r => r.id === rewardId);
  }
  if (!item && lastRenderedCatalog.length > 0) {
    item = lastRenderedCatalog.find(r => r.id === rewardId);
  }
  if (!item && typeof window !== "undefined" && Array.isArray(window._lastRenderedCatalog)) {
    item = window._lastRenderedCatalog.find(r => r.id === rewardId);
  }
  if (!item) return;

  currentSpecsItem = item;
  currentSpecsImgIndex = Math.max(0, imgIdx);

  const modal = document.getElementById("modal-product-specs");
  const body = document.getElementById("modal-specs-body");
  const footer = document.getElementById("modal-specs-footer");
  if (!modal || !body) return;

  const fab = document.getElementById("fab-mobile-menu");
  if (fab) fab.style.display = "none";

  // Actualizar topbar limpia y balanceada (Volver // Kicker // Cerrar)
  const topbar = modal.querySelector(".modal-specs-topbar");
  if (topbar) {
    topbar.innerHTML = `
      <button type="button" class="specs-topbar-back-btn" onclick="closeProductSpecsModal()" title="Volver al catálogo">
        <span>←</span> <span>Volver</span>
      </button>
      <div class="modal-specs-kicker">
        <span class="kicker-dot"></span>
        <span>WIRED SHOP // DETALLE</span>
      </div>
      <button class="modal-close-btn" onclick="closeProductSpecsModal()" aria-label="Cerrar">&times;</button>
    `;
  }

  const parsed = parseProductDescription(item.description);
  const isPartial = item.rewardType === "PARTIAL_DISCOUNT" || (typeof item.isPartialDiscount === "function" && item.isPartialDiscount());
  const maxPct = Number(item.maxDiscountPct || item.max_discount_pct || item.maxDiscountPercent || (isPartial ? 5 : 0));

  const productImages = typeof item.getImages === "function"
    ? item.getImages()
    : (Array.isArray(item.images) && item.images.length ? item.images : (item.imageUrl ? [item.imageUrl] : []));

  if (currentSpecsImgIndex >= productImages.length) {
    currentSpecsImgIndex = 0;
  }
  const mainHeroImg = productImages[currentSpecsImgIndex] || item.imageUrl || "";

  let carouselHtml = "";
  if (productImages.length > 0) {
    const hasMultiple = productImages.length > 1;
    carouselHtml = `
      <div class="specs-carousel-wrapper">
        <div class="specs-carousel-stage">
          ${hasMultiple ? `<span id="specs-carousel-counter" class="specs-carousel-counter">[ 0${currentSpecsImgIndex + 1} / 0${productImages.length} ]</span>` : ''}
          ${hasMultiple ? `<button type="button" class="specs-carousel-btn prev" onclick="specsModalPrevImage()" aria-label="Foto anterior">‹</button>` : ''}
          <img id="specs-carousel-img" src="${mainHeroImg}" alt="${item.title}" onclick="openLightboxFromSpecs()" title="Clic para ver en pantalla completa" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">
          ${hasMultiple ? `<button type="button" class="specs-carousel-btn next" onclick="specsModalNextImage()" aria-label="Foto siguiente">›</button>` : ''}
          <button type="button" class="specs-carousel-expand-btn" onclick="openLightboxFromSpecs()" title="Ver en pantalla completa">
            <span>⛶</span> <span>AMPLIAR</span>
          </button>
        </div>
        ${hasMultiple ? `
          <div class="specs-carousel-pagination">
            ${productImages.map((src, idx) => `
              <div class="specs-carousel-thumb ${idx === currentSpecsImgIndex ? 'active' : ''}" onclick="setSpecsModalImageIndex(${idx})" title="Frame ${idx + 1}">
                <img src="${src}" alt="Miniatura ${idx + 1}">
              </div>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;
  }

  const emojiRegex = /^(\p{Extended_Pictographic}|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u27BF])\s*/u;

  const formattedSpecsHtml = parsed.specs.map(rawSpec => {
    let text = rawSpec.trim().replace(/^[•\-\*▸►]\s*/, '').trim();
    if (!text) return '';

    const emojiMatch = text.match(emojiRegex);
    let icon = null;
    if (emojiMatch) {
      icon = emojiMatch[1];
      text = text.slice(emojiMatch[0].length).trim();
    }

    const isSectionHeader = text.endsWith(':') && text.length < 40;
    if (isSectionHeader) {
      return `
        <div class="modal-spec-section-header">
          <span class="section-icon">${icon || '⚡'}</span>
          <span class="section-title">${text.replace(/:$/, '')}</span>
        </div>
      `;
    }

    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 42) {
      const key = text.slice(0, colonIndex).trim();
      const val = text.slice(colonIndex + 1).trim();
      return `
        <div class="modal-spec-card">
          <div class="spec-card-icon-box">${icon || '✦'}</div>
          <div class="spec-card-content">
            <div class="spec-card-key">${key}</div>
            <div class="spec-card-val">${val}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="modal-spec-card">
        <div class="spec-card-icon-box">${icon || '▸'}</div>
        <div class="spec-card-content">
          <div class="spec-card-val bold">${text}</div>
        </div>
      </div>
    `;
  }).join("");

  // Cálculo de valores de puntos del usuario para el banner
  const user = vm?.currentUser;
  const userPts = user ? (user.wiredPoints || 0) : 0;
  const maxCapPts = item.pointsCost || 0;
  const maxUsable = Math.min(userPts, maxCapPts);

  let appliedPts = 0;
  let appliedPct = 0;
  let appliedDiscountUsd = 0;
  let cashToPayWithPts = item.priceUsd || 0;

  if (isPartial) {
    appliedPts = maxUsable;
    appliedPct = maxCapPts > 0 ? Number(((appliedPts / maxCapPts) * maxPct).toFixed(1)) : 0;
    const usdPerPoint = (maxCapPts > 0 && item.maxDiscountUsd > 0) ? (item.maxDiscountUsd / maxCapPts) : 0;
    appliedDiscountUsd = Number(Math.min(item.maxDiscountUsd || 0, appliedPts * usdPerPoint).toFixed(2));
    cashToPayWithPts = Math.max(0, Number(((item.priceUsd || 0) - appliedDiscountUsd).toFixed(2)));
  }

  const formattedAppliedPct = appliedPct % 1 === 0 ? appliedPct.toFixed(0) : appliedPct.toFixed(1);

  // Banner de precios estilo Temu
  let saleBannerHtml = "";
  if (isPartial) {
    saleBannerHtml = `
      <div class="temu-sale-banner">
        <div class="temu-sale-header">
          <span>🏷️ SÚPER DESCUENTOS WIRED POINTS</span>
          <span class="temu-sale-badge">HASTA -${maxPct}% OFF</span>
        </div>
        <div class="temu-sale-prices-row">
          <span class="temu-sale-price-curr" id="specs-calc-cash-${item.id}">${formatDualPrice(cashToPayWithPts)}</span>
          <span class="temu-sale-price-orig">${formatPrice(item.priceUsd)}</span>
        </div>
        <div style="font-size: 0.75rem; color: #78350f; font-family: var(--font-mono); font-weight: 700; display: flex; align-items: center; gap: 4px;">
          ${renderWiredCoinSvg()}
          <span>Ahorro con puntos: <strong id="specs-calc-disc-${item.id}" style="color: #059669;">-${formatPrice(appliedDiscountUsd)} (-${formattedAppliedPct}%)</strong></span>
        </div>
        ${user && maxUsable > 0 ? `
          <div class="specs-calc-box">
            <div class="specs-calc-header">
              <span>⚡ CALCULADORA DE DESCUENTO:</span>
              <span class="specs-calc-value" id="specs-slider-val-${item.id}">${appliedPts} WP aplicados</span>
            </div>
            <input type="range" id="specs-slider-${item.id}" class="specs-calc-range" min="0" max="${maxUsable}" value="${appliedPts}" step="1" oninput="updateSpecsModalCalculation('${item.id}', this.value)">
            <div class="specs-calc-presets-row">
              <button type="button" class="specs-calc-preset-btn min" onclick="updateSpecsModalCalculation('${item.id}', 0)">
                <span>🔄</span> <span>Sin desc. (0 WP)</span>
              </button>
              <button type="button" class="specs-calc-preset-btn max" onclick="updateSpecsModalCalculation('${item.id}', ${maxUsable})">
                <span>⚡</span> <span>Tope (${maxUsable} WP)</span>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    saleBannerHtml = `
      <div class="temu-sale-banner" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #34d399;">
        <div class="temu-sale-header" style="color: #065f46;">
          <span>🎁 RECOMPENSA 100% CANJEABLE</span>
          <span class="temu-sale-badge" style="background: #059669;">100% GRATIS</span>
        </div>
        <div class="temu-sale-prices-row">
          <span class="temu-sale-price-curr" style="color: #059669;">¡GRATIS!</span>
          ${item.priceUsd ? `<span class="temu-sale-price-orig">${formatPrice(item.priceUsd)}</span>` : ''}
        </div>
        <div style="font-size: 0.75rem; color: #065f46; font-family: var(--font-mono); font-weight: 700; display: flex; align-items: center; gap: 4px;">
          ${renderWiredCoinSvg()}
          <span>Costo total en puntos: <strong>${item.pointsCost.toLocaleString()} WP</strong></span>
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    ${carouselHtml}

    <div class="modal-product-hero specs-header-info">
      <div class="specs-badges-bar">
        <span class="specs-badge-item" style="background: #0f172a; color: #38bdf8; border: 1px solid #334155;">⚡ WIRED CHOICE</span>
        ${productImages.length > 1 ? `<span class="specs-badge-item frames">[ 0${productImages.length} FRAMES ]</span>` : ''}
        ${isPartial 
          ? `<span class="specs-badge-item discount">🏷️ Hasta ${maxPct}% OFF</span>` 
          : `<span class="specs-badge-item points">⚡ ${item.pointsCost.toLocaleString()} WP</span>`
        }
      </div>
      <h3 class="specs-header-title">${item.title}</h3>
      <div class="temu-sheet-rating-row">
        <span class="stars">★★★★★</span>
        <span>4.9</span>
        <span class="divider">|</span>
        <span class="sales">120+ canjes en tienda</span>
        <span class="divider">|</span>
        <span style="color: #059669; font-weight: 800;">✓ En vitrina</span>
      </div>
    </div>

    ${saleBannerHtml}

    ${parsed.intro ? `
      <div class="modal-intro-callout">
        <div class="callout-text">${parsed.intro}</div>
      </div>
    ` : ''}

    <!-- DESPLEGABLE DE ESPECIFICACIONES TÉCNICAS (IDÉNTICO A PRODUCCIÓN) -->
    <div class="reward-specs-box" style="margin: 0.75rem 0 1rem 0;">
      <button type="button" class="reward-specs-toggle-btn" onclick="toggleModalProductSpecs('${item.id}')" id="modal-specs-btn-${item.id}">
        <span class="btn-specs-label">📋 Ver especificaciones (${parsed.specs.length})</span>
        <span class="btn-specs-icon">▾</span>
      </button>
      <div class="reward-specs-dropdown" id="modal-specs-drop-${item.id}" style="display:none; max-height: 280px; overflow-y: auto;">
        <div class="specs-dropdown-header">
          <span class="specs-dropdown-title">ESPECIFICACIONES (${parsed.specs.length})</span>
        </div>
        <ul class="reward-specs-ul">
          ${parsed.specs.map(s => `<li><span class="spec-bullet">▸</span><span class="spec-content">${s}</span></li>`).join("")}
        </ul>
      </div>
    </div>

    <!-- COMPROMISOS Y GARANTÍAS DE TIENDA -->
    <div class="temu-service-commitments">
      <div class="temu-service-item"><span>🏬</span> <span><strong>Retiro en Mostrador MeltyDeays:</strong> Prueba física presencial al momento de la entrega.</span></div>
      <div class="temu-service-item"><span>🛡️</span> <span><strong>Garantía Comercial:</strong> 30 días de cobertura y soporte técnico directo.</span></div>
      <div class="temu-service-item"><span>⚡</span> <span><strong>Reserva Inmediata:</strong> Apartado activo al instante con tus Wired Points.</span></div>
    </div>

    <!-- MÓDULO DE PREGUNTAS Y COMENTARIOS DE LA COMUNIDAD -->
    <div class="temu-comments-section" id="temu-comments-container">
      <div class="temu-comments-header">
        <div class="temu-comments-title">
          <span>💬</span> <span>Preguntas & Dudas</span>
        </div>
        <span style="font-size: 0.68rem; color: #64748b; font-family: var(--font-mono);">COMUNIDAD WIRED</span>
      </div>
      
      <form class="temu-comment-form" onsubmit="event.preventDefault(); submitProductComment('${item.id}')">
        <textarea id="comment-input-text-${item.id}" class="temu-comment-textarea" placeholder="¿Tienes alguna duda sobre este producto? Escríbela aquí..." required></textarea>
        <div class="temu-comment-row">
          <input type="text" id="comment-input-name-${item.id}" class="temu-comment-author-input" placeholder="Tu nombre o socio" value="${user?.displayName || ''}">
          <button type="submit" class="temu-comment-btn-submit">Publicar Pregunta</button>
        </div>
      </form>

      <div class="temu-comments-list" id="comments-list-${item.id}">
        <div style="text-align: center; padding: 10px; color: #94a3b8; font-size: 0.72rem;">Cargando preguntas de la comunidad...</div>
      </div>
    </div>
  `;

  if (footer) {
    const isOut = item.stock <= 0;
    
    const waSvg = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color: #059669; flex-shrink: 0;">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.217 8.217 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.01 2.58.13.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.3z"/>
      </svg>
    `;

    const shareSvg = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--dark); flex-shrink: 0;">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
    `;

    const zapSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" style="flex-shrink: 0;">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    `;

    const tagSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
    `;

    let actionBtn = "";
    if (!isOut) {
      if (isPartial) {
        actionBtn = `
          <button type="button" class="modal-specs-action-btn btn-redeem-gold" onclick="closeProductSpecsModal(); confirmRedeem('${item.id}');">
            ${tagSvg}
            <span>Canjear / Comprar</span>
          </button>
        `;
      } else {
        actionBtn = `
          <button type="button" class="modal-specs-action-btn btn-redeem-blue" onclick="closeProductSpecsModal(); confirmRedeem('${item.id}');">
            ${zapSvg}
            <span>Canjear Ahora</span>
          </button>
        `;
      }
    } else {
      actionBtn = `<button type="button" class="modal-specs-action-btn btn-redeem-disabled" disabled>❌ Agotado</button>`;
    }

    const waText = encodeURIComponent(`Hola MeltyDeays! Quisiera consultar sobre el producto: ${item.title} (Código: ${item.id})`);
    const waUrl = `https://api.whatsapp.com/send?phone=50558438412&text=${waText}`;

    footer.innerHTML = `
      <a href="${waUrl}" target="_blank" class="modal-specs-aux-btn wa" title="Consultar por WhatsApp">
        ${waSvg}
        <span class="aux-text">WhatsApp</span>
      </a>
      <button type="button" class="modal-specs-aux-btn share" title="Compartir enlace de producto" onclick="shareProduct('${item.id}')">
        ${shareSvg}
        <span class="aux-text">Compartir</span>
      </button>
      ${actionBtn}
    `;
  }

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
  if (fab) {
    fab.classList.add("is-hidden");
    fab.style.setProperty("display", "none", "important");
  }

  // Cargar comentarios y suscribir en tiempo real reactivo
  if (typeof activeCommentsUnsubscribe === "function") {
    activeCommentsUnsubscribe();
    activeCommentsUnsubscribe = null;
  }
  loadProductComments(item.id);
  activeCommentsUnsubscribe = FirestoreService.subscribeProductComments(item.id, (comments) => {
    renderProductCommentsDom(item.id, comments);
  });
}

export function closeProductSpecsModal() {
  if (typeof activeCommentsUnsubscribe === "function") {
    activeCommentsUnsubscribe();
    activeCommentsUnsubscribe = null;
  }
  const modal = document.getElementById("modal-product-specs");
  if (modal) modal.style.display = "none";

  const lightboxModal = document.getElementById("modal-image-lightbox");
  const isLightboxOpen = lightboxModal && lightboxModal.style.display !== "none" && lightboxModal.style.display !== "";
  if (!isLightboxOpen) {
    document.body.classList.remove("modal-open");
    const fab = document.getElementById("fab-mobile-menu");
    if (fab) {
      fab.style.display = "";
      fab.classList.remove("is-hidden");
    }
  }
}

export function toggleModalProductSpecs(itemId) {
  const drop = document.getElementById("modal-specs-drop-" + itemId);
  const btn = document.getElementById("modal-specs-btn-" + itemId);
  if (!drop || !btn) return;

  const isHidden = drop.style.display === "none";
  if (isHidden) {
    drop.style.display = "block";
    btn.classList.add("expanded");
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = "✕ Ocultar especificaciones";
    if (icon) icon.textContent = "▴";
  } else {
    drop.style.display = "none";
    btn.classList.remove("expanded");
    const count = drop.querySelectorAll("li").length;
    const label = btn.querySelector(".btn-specs-label");
    const icon = btn.querySelector(".btn-specs-icon");
    if (label) label.textContent = `📋 Ver especificaciones (${count})`;
    if (icon) icon.textContent = "▾";
  }
}

if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("click", (e) => {
    if (currentlyOpenSpecsId) {
      const drop = document.getElementById("specs-drop-" + currentlyOpenSpecsId);
      const btn = document.getElementById("specs-btn-" + currentlyOpenSpecsId);
      if (drop && btn && !drop.contains(e.target) && !btn.contains(e.target)) {
        drop.style.display = "none";
        btn.classList.remove("expanded");
        const count = drop.querySelectorAll("li").length;
        const label = btn.querySelector(".btn-specs-label");
        const icon = btn.querySelector(".btn-specs-icon");
        if (label) label.textContent = `📋 Ver especificaciones (${count})`;
        if (icon) icon.textContent = "▾";
        currentlyOpenSpecsId = null;
      }
    }
  });
}

export function initCustomerCatalogView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.openAuthModal) openAuthModal = deps.openAuthModal;
    if (deps.showVoucherModal) showVoucherModal = deps.showVoucherModal;
    if (deps.formatPrice) formatPrice = deps.formatPrice;
    if (deps.formatDualPrice) formatDualPrice = deps.formatDualPrice;
  }

  // Soporte deep linking para URLs compartidas (#product-[id])
  const checkProductHash = () => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.startsWith("#product-")) {
      const prodId = hash.replace("#product-", "").trim();
      if (prodId) {
        setTimeout(() => {
          openProductSpecsModal(prodId);
        }, 350);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", checkProductHash);
    checkProductHash();
  }
}

let selectedRewardId = null;
let selectedPointsToApply = 0;
let currentRedeemReward = null;

export function renderCatalog(catalog, user) {
  const rawList = Array.isArray(catalog) ? catalog : [];
  const visibleCatalog = rawList.filter(item => {
    if (typeof item.isVisibleToCustomer === "function") {
      return item.isVisibleToCustomer();
    }
    if (item.stock > 0 && item.status !== "SOLD_OUT") return true;
    if (item.soldOutAt) {
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
      return (Date.now() - new Date(item.soldOutAt).getTime()) < TWELVE_HOURS_MS;
    }
    return true;
  });

  lastRenderedCatalog = visibleCatalog;
  if (typeof window !== "undefined") window._lastRenderedCatalog = visibleCatalog;
  const container = document.getElementById("catalog-container");
  if (!container) return;

  if (visibleCatalog.length === 0) {
    container.innerHTML = `
      <div class="cyber-empty-box">
        <div class="empty-icon-wrap">
          <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="1.8" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="M7 8h10M7 12h6" stroke-dasharray="2 2" />
          </svg>
        </div>
        <div class="empty-tag">COPLAND OS // STANDBY</div>
        <h3 class="empty-title">Catálogo en Preparación</h3>
        <p class="empty-desc">
          El administrador de <strong>MeltyDeays</strong> está configurando las recompensas disponibles en vitrina. ¡Acumula tus Wired Points con tus compras mientras tanto!
        </p>
        <button class="btn-primary" onclick="openClaimModal()" style="margin-top: 1.25rem;">
          + Acreditar Factura de Compra
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleCatalog.map(item => {
    const isOut = item.stock <= 0 || item.status === "SOLD_OUT";
    const canAfford = user && user.wiredPoints >= item.pointsCost;
    const isPartial = item.rewardType === "PARTIAL_DISCOUNT" || (typeof item.isPartialDiscount === "function" && item.isPartialDiscount());
    const userPts = user ? (user.wiredPoints || 0) : 0;
    const maxCapPts = item.pointsCost || 0;
    const maxPct = item.maxDiscountPct || 5;

    let appliedPts = 0;
    let appliedPct = 0;
    let appliedDiscountUsd = 0;
    let cashToPayWithPts = item.priceUsd || 0;

    if (isPartial) {
      appliedPts = Math.min(userPts, maxCapPts);
      appliedPct = maxCapPts > 0 ? Number(((appliedPts / maxCapPts) * maxPct).toFixed(2)) : 0;
      const usdPerPoint = (maxCapPts > 0 && item.maxDiscountUsd > 0) ? (item.maxDiscountUsd / maxCapPts) : 0;
      appliedDiscountUsd = Number(Math.min(item.maxDiscountUsd || 0, appliedPts * usdPerPoint).toFixed(2));
      cashToPayWithPts = Math.max(0, Number(((item.priceUsd || 0) - appliedDiscountUsd).toFixed(2)));
    }
    const formattedAppliedPct = appliedPct % 1 === 0 ? appliedPct.toFixed(0) : appliedPct.toFixed(1);

    // Cálculos para la píldora Temu & Moneda Wired Point
    let temuPriceMain = "";
    let temuPriceOrig = "";
    let temuCoinPillText = "";

    if (isPartial) {
      if (user && appliedPts > 0) {
        temuPriceMain = formatPrice(cashToPayWithPts);
        temuPriceOrig = formatPrice(item.priceUsd);
        if (userPts >= maxCapPts) {
          temuCoinPillText = `-${maxPct}% Aplicado (Tope)`;
        } else {
          temuCoinPillText = `-${formattedAppliedPct}% Aplicado · Máx ${maxPct}%`;
        }
      } else {
        temuPriceMain = formatPrice(item.priceUsd);
        temuPriceOrig = "";
        temuCoinPillText = `Hasta -${maxPct}% con WP`;
      }
    } else {
      temuPriceMain = "¡GRATIS!";
      temuPriceOrig = item.priceUsd ? formatPrice(item.priceUsd) : "";
      temuCoinPillText = `${item.pointsCost.toLocaleString()} WP (100% Puntos)`;
    }

    const temuMetaHtml = `
      <div class="reward-temu-meta">
        <div class="reward-temu-social">
          <span class="stars">★★★★★</span>
          <span>4.9</span>
          <span style="color:#cbd5e1;">·</span>
          <span>100+ canjes</span>
        </div>
        <div class="reward-temu-price-line">
          <span class="reward-temu-price-main">${temuPriceMain}</span>
          ${temuPriceOrig ? `<span class="reward-temu-price-orig">${temuPriceOrig}</span>` : ''}
        </div>
        <div class="reward-temu-coin-pill">
          ${renderWiredCoinSvg()}
          <span>${temuCoinPillText}</span>
        </div>
      </div>
    `;

    let btnHtml = "";
    if (isOut) {
      btnHtml = `<button class="btn-redeem out" disabled>❌ AGOTADO</button>`;
    } else if (!user) {
      btnHtml = `<button class="btn-redeem login-req" onclick="event.stopPropagation(); openAuthModal('login', 'Inicia sesión para canjear')">🔒 Iniciar Sesión</button>`;
    } else if (isPartial) {
      if (userPts > 0) {
        btnHtml = `<button class="btn-redeem active-canje" style="background: linear-gradient(135deg, #d97706, #b45309);" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">🏷️ APLICAR DESCUENTO (${formattedAppliedPct}%)</button>`;
      } else {
        btnHtml = `<button class="btn-redeem active-canje" style="background: linear-gradient(135deg, #0284c7, #0369a1);" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">🛒 COMPRAR EN TIENDA</button>`;
      }
    } else if (!canAfford) {
      const missing = item.pointsCost - user.wiredPoints;
      btnHtml = `<button class="btn-redeem locked" onclick="event.stopPropagation(); showToast('Te faltan ${missing.toLocaleString()} WP para este producto', 'info')">🔒 Faltan ${missing.toLocaleString()} WP</button>`;
    } else {
      btnHtml = `<button class="btn-redeem active-canje" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">⚡ CANJEAR AHORA</button>`;
    }

    let modeBadge = "";
    if (isPartial) {
      if (user && userPts >= maxCapPts) {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ TOPE ${maxPct}% OFF</div>`;
      } else if (user && userPts > 0) {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ ${formattedAppliedPct}% OFF / MÁX ${maxPct}%</div>`;
      } else {
        modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.9); color: #fbbf24; border: 1px solid #d97706; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🏷️ HASTA ${maxPct}% OFF</div>`;
      }
    } else {
      modeBadge = `<div class="badge-tag" style="position: absolute; top: 8px; left: 8px; background: rgba(5, 150, 105, 0.9); color: #ffffff; border: 1px solid #059669; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; z-index: 2;">🎁 100% CANJEABLE</div>`;
    }

    let partialBreakdown = "";
    if (isPartial) {
      if (user && userPts >= maxCapPts) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (Tope ${maxPct}%):</span>
              <span class="pricing-val green">-${formatPrice(item.maxDiscountUsd)}</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(item.cashToPayUsd)}</span>
            </div>
          </div>
        `;
      } else if (user && userPts > 0) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (${appliedPts} WP):</span>
              <span class="pricing-val green">-${formatPrice(appliedDiscountUsd)} (${formattedAppliedPct}%)</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(cashToPayWithPts)}</span>
            </div>
            <div class="pricing-row footnote-row">
              <span class="pricing-label">Tope máx. (${maxCapPts} WP):</span>
              <span class="pricing-val">-${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
            </div>
          </div>
        `;
      } else if (user) {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Tu ahorro (0 WP):</span>
              <span class="pricing-val gray">0% (Sin puntos)</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Total a pagar:</span>
              <span class="pricing-val total">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row footnote-row">
              <span class="pricing-label">Tope máx. (${maxCapPts} WP):</span>
              <span class="pricing-val">Hasta -${formatPrice(item.maxDiscountUsd)} (${maxPct}% OFF)</span>
            </div>
          </div>
        `;
      } else {
        partialBreakdown = `
          <div class="reward-pricing-box">
            <div class="pricing-row">
              <span class="pricing-label">Precio oficial:</span>
              <span class="pricing-val">${formatPrice(item.priceUsd)}</span>
            </div>
            <div class="pricing-row discount-row">
              <span class="pricing-label">Ahorro con puntos:</span>
              <span class="pricing-val green">Hasta ${maxPct}% OFF</span>
            </div>
            <div class="pricing-row total-row">
              <span class="pricing-label">Pagas en tienda:</span>
              <span class="pricing-val total">Desde ${formatPrice(item.cashToPayUsd)}</span>
            </div>
          </div>
        `;
      }
    }

    let footerHtml = "";
    if (isPartial) {
      if (isOut) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial out" disabled>
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🔒</span>
                <span class="btn-redeem-text">AGOTADO TEMPORALMENTE</span>
              </div>
            </button>
          </div>
        `;
      } else if (!user) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial shop-btn active-canje" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🛒</span>
                <span class="btn-redeem-text">COMPRAR EN TIENDA</span>
              </div>
              <div class="btn-redeem-pts-badge">HASTA ${maxPct}% OFF</div>
            </button>
          </div>
        `;
      } else if (userPts >= maxCapPts) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial active-canje" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🏷️</span>
                <span class="btn-redeem-text">APLICAR DESCUENTO (${maxPct}%)</span>
              </div>
              <div class="btn-redeem-pts-badge">${maxCapPts} WP (TOPE)</div>
            </button>
          </div>
        `;
      } else if (userPts > 0) {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial active-canje" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🏷️</span>
                <span class="btn-redeem-text">APLICAR DESCUENTO (${formattedAppliedPct}%)</span>
              </div>
              <div class="btn-redeem-pts-badge">${appliedPts} WP</div>
            </button>
          </div>
        `;
      } else {
        footerHtml = `
          <div class="reward-footer reward-footer-partial">
            <button type="button" class="btn-redeem btn-redeem-partial shop-btn active-canje" onclick="event.stopPropagation(); confirmRedeem('${item.id}')">
              <div class="btn-redeem-content">
                <span class="btn-redeem-icon">🛒</span>
                <span class="btn-redeem-text">COMPRAR EN TIENDA</span>
              </div>
              <div class="btn-redeem-pts-badge">HASTA ${maxPct}% OFF</div>
            </button>
          </div>
        `;
      }
    } else {
      footerHtml = `
        <div class="reward-footer">
          <div class="reward-cost">${item.pointsCost.toLocaleString()} <span>WP</span></div>
          ${btnHtml}
        </div>
      `;
    }

    const parsed = parseProductDescription(item.description);
    const descHtml = parsed.hasSpecs
      ? `
        <div class="reward-desc-wrap" id="desc-wrap-${item.id}">
          <div class="reward-desc-intro" title="${parsed.intro}">${parsed.intro}</div>
          <div class="reward-specs-box">
            <button type="button" class="reward-specs-toggle-btn" onclick="event.stopPropagation(); toggleRewardSpecs('${item.id}')" id="specs-btn-${item.id}">
              <span class="btn-specs-label">📋 Ver especificaciones (${parsed.specs.length})</span>
              <span class="btn-specs-icon">▾</span>
            </button>
            <div class="reward-specs-dropdown" id="specs-drop-${item.id}" style="display:none;" onclick="event.stopPropagation();">
              <div class="specs-dropdown-header">
                <span class="specs-dropdown-title">ESPECIFICACIONES (${parsed.specs.length})</span>
                <button type="button" class="specs-modal-trigger-btn" onclick="event.stopPropagation(); openProductSpecsModal('${item.id}')" title="Ver especificaciones en pantalla completa">
                  <span>⛶</span> <span>Ampliar</span>
                </button>
              </div>
              <ul class="reward-specs-ul">
                ${parsed.specs.map(s => `<li><span class="spec-bullet">▸</span><span class="spec-content">${s}</span></li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      `
      : `
        <div class="reward-desc-wrap" id="desc-wrap-${item.id}">
          <div class="reward-desc-intro" title="${parsed.intro || ''}">${parsed.intro || (isPartial ? 'Producto comercial con descuento tope en Wired Points.' : 'Recompensa oficial MeltyDeays.')}</div>
          <div class="reward-specs-box">
            <div class="reward-specs-empty-pill">
              <span class="spec-info-text">✨ ${isPartial ? 'Garantía y entrega directa en tienda' : 'Recompensa oficial MeltyDeays'}</span>
            </div>
          </div>
        </div>
      `;

    const itemImages = typeof item.getImages === "function"
      ? item.getImages()
      : (Array.isArray(item.images) && item.images.length ? item.images : (item.imageUrl ? [item.imageUrl] : []));
    const mainCover = itemImages[0] || item.imageUrl || "";
    const hasMultipleImgs = itemImages.length > 1;
    const escapedTitle = (item.title || "").replace(/'/g, "\\'");

    return `
      <div class="reward-card ${isOut ? 'is-sold-out' : ''}" onclick="openProductSpecsModal('${item.id}')">
        <div class="reward-img-wrap" style="${!mainCover ? 'background: linear-gradient(135deg, #0d131f 0%, #17243b 100%); display:flex; align-items:center; justify-content:center;' : ''}">
          ${modeBadge}
          ${hasMultipleImgs ? `
            <div class="reward-multi-photos-badge" onclick="event.stopPropagation(); openProductSpecsModal('${item.id}')" title="Ver galería y ficha técnica (${itemImages.length} fotos)">
              <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#38bdf8; box-shadow: 0 0 6px #38bdf8;"></span>
              <span>[ 0${itemImages.length} FRAMES ]</span>
            </div>
          ` : ''}
          ${mainCover
            ? `
              <img src="${mainCover}" alt="${item.title}" class="reward-img" onclick="event.stopPropagation(); openProductSpecsModal('${item.id}')" title="Clic para ver detalles y fotos" onerror="this.onerror=null; this.src=''; this.parentElement.style.background='#0d131f';">
              ${!isOut ? `
                <div class="reward-img-action-overlay" onclick="event.stopPropagation(); openProductSpecsModal('${item.id}')">
                  <div class="reward-img-expand-badge">
                    <span style="font-size:0.85rem; line-height:1;">⚡</span>
                    <span>VER DETALLES // WIRED_VIEW</span>
                  </div>
                </div>
              ` : ''}
            `
            : `<div style="text-align:center; padding:1rem;"><span style="font-size:2.2rem;">${isPartial ? '🏷️' : '🎁'}</span><div style="font-family:var(--font-mono); font-size:0.68rem; color:#38bdf8; margin-top:4px;">${isPartial ? 'SALE_DISCOUNT' : 'TECH_REWARD'}</div></div>`
          }
          ${isOut ? `
            <div class="reward-sold-stamp-container">
              <div class="reward-sold-stamp">
                <svg class="sold-seal-svg" viewBox="0 0 240 120" width="190" height="95">
                  <defs>
                    <linearGradient id="haibaneGold-${item.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#fffbeb" />
                      <stop offset="30%" stop-color="#fbbf24" />
                      <stop offset="70%" stop-color="#d97706" />
                      <stop offset="100%" stop-color="#78350f" />
                    </linearGradient>
                    <linearGradient id="haibaneWingL-${item.id}" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#475569" />
                      <stop offset="60%" stop-color="#1e293b" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <linearGradient id="haibaneWingR-${item.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#475569" />
                      <stop offset="60%" stop-color="#1e293b" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <linearGradient id="haibanePlaque-${item.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#1e293b" />
                      <stop offset="40%" stop-color="#0f172a" />
                      <stop offset="100%" stop-color="#020617" />
                    </linearGradient>
                  </defs>

                  <g>
                    <!-- 1. SACRED HALO OF GLIE (Floating Golden Nimbus) -->
                    <g transform="translate(120, 16)">
                      <ellipse cx="0" cy="0" rx="38" ry="9" fill="none" stroke="#78350f" stroke-width="4.5" />
                      <ellipse cx="0" cy="0" rx="38" ry="9" fill="none" stroke="url(#haibaneGold-${item.id})" stroke-width="2.6" />
                      <ellipse cx="0" cy="0" rx="38" ry="9" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="6 3" opacity="0.9" />
                      <line x1="0" y1="-12" x2="0" y2="-6" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />
                      <line x1="-20" y1="-9" x2="-18" y2="-4" stroke="#fef08a" stroke-width="1.5" stroke-linecap="round" />
                      <line x1="20" y1="-9" x2="18" y2="-4" stroke="#fef08a" stroke-width="1.5" stroke-linecap="round" />
                    </g>

                    <!-- 2. CHARCOAL FEATHER WINGS (灰羽 - Feather Plumage) -->
                    <!-- Left Wing -->
                    <path d="M92 56 C72 40 46 26 12 20 C10 34 18 48 28 58 C16 55 8 55 5 64 C16 74 30 80 46 84 C34 85 24 90 26 98 C40 104 62 98 76 90 C66 96 56 104 58 110 C74 112 90 102 98 90 Z" fill="url(#haibaneWingL-${item.id})" stroke="url(#haibaneGold-${item.id})" stroke-width="1.6" stroke-linejoin="round" />
                    <path d="M86 60 C68 48 46 36 24 30 C28 40 38 50 48 58 C34 56 26 56 22 64 C32 72 46 76 60 78 Z" fill="#64748b" opacity="0.4" />

                    <!-- Right Wing -->
                    <path d="M148 56 C168 40 194 26 228 20 C230 34 222 48 212 58 C224 55 232 55 235 64 C224 74 210 80 194 84 C206 85 216 90 214 98 C200 104 178 98 164 90 C174 96 184 104 182 110 C166 112 150 102 142 90 Z" fill="url(#haibaneWingR-${item.id})" stroke="url(#haibaneGold-${item.id})" stroke-width="1.6" stroke-linejoin="round" />
                    <path d="M154 60 C172 48 194 36 216 30 C212 40 202 50 192 58 C206 56 214 56 218 64 C208 72 194 76 180 78 Z" fill="#64748b" opacity="0.4" />

                    <!-- 3. CENTRAL OBSIDIAN PLAQUE -->
                    <rect x="36" y="28" width="168" height="74" rx="6" fill="#080d1a" stroke="url(#haibaneGold-${item.id})" stroke-width="2.2" />
                    <rect x="40" y="32" width="160" height="66" rx="4" fill="url(#haibanePlaque-${item.id})" stroke="#d97706" stroke-width="1" />
                    <rect x="43" y="35" width="154" height="60" rx="3" fill="none" stroke="#64748b" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.6" />

                    <!-- Corner Diamonds -->
                    <polygon points="46,38 48,41 46,44 44,41" fill="#fef08a" />
                    <polygon points="194,38 196,41 194,44 192,41" fill="#fef08a" />
                    <polygon points="46,88 48,91 46,94 44,91" fill="#fef08a" />
                    <polygon points="194,88 196,91 194,94 192,91" fill="#fef08a" />

                    <!-- Header Inscription: 灰羽連盟 · HAIBANE -->
                    <text x="120" y="49" text-anchor="middle" fill="#fbbf24" font-family="'Cinzel', 'Noto Serif JP', 'Georgia', serif" font-size="9.5" font-weight="900" letter-spacing="3">灰羽 · HAIBANE</text>
                    <line x1="56" y1="54" x2="184" y2="54" stroke="url(#haibaneGold-${item.id})" stroke-width="0.8" opacity="0.7" />

                    <!-- Main Monumental Inscription: VENDIDO -->
                    <text x="120" y="78" text-anchor="middle" fill="#ffffff" font-family="'Impact', 'Arial Black', 'Cinzel', 'Trebuchet MS', sans-serif" font-size="24" font-weight="900" letter-spacing="4.5">VENDIDO</text>

                    <!-- Subtitle Inscription -->
                    <text x="120" y="91" text-anchor="middle" fill="#fef08a" font-family="'Cinzel', 'Georgia', serif" font-size="7.5" font-weight="800" letter-spacing="2">✦ GLIE · RETIRED ✦</text>
                  </g>
                </svg>
              </div>
            </div>
          ` : ''}
          <div class="stock-tag ${isOut ? 'out' : ''}">${isOut ? 'VENDIDO' : (item.stock === 1 ? '1 DISP. · ÚNICO' : item.stock + ' DISP.')}</div>
        </div>
        <div class="reward-body">
          <div class="reward-title" title="${item.title}">${item.title}</div>
          ${temuMetaHtml}
          ${descHtml}
          ${partialBreakdown}
          ${footerHtml}
        </div>
      </div>
    `;
  }).join("");
}


export function confirmRedeem(rewardId) {
  if (!vm.currentUser) {
    openAuthModal("login", "Inicia sesión para canjear recompensas con tus Wired Points.");
    return;
  }

  const reward = vm.catalog.find(r => r.id === rewardId);
  if (!reward) return;

  const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount());

  // Si es canje 100% gratuito en puntos, sí bloquea si no tiene saldo suficiente
  if (!isPartial && vm.currentUser.wiredPoints < reward.pointsCost) {
    showToast(`Puntos insuficientes. Requieres ${reward.pointsCost.toLocaleString()} WP (tienes ${vm.currentUser.wiredPoints.toLocaleString()} WP).`, "error");
    return;
  }

  selectedRewardId = rewardId;
  currentRedeemReward = reward;

  // Llenar datos de la recompensa
  const titleEl = document.getElementById("confirm-reward-title");
  const ptsEl = document.getElementById("confirm-reward-points");
  const imgEl = document.getElementById("confirm-reward-img");
  const fallbackEl = document.getElementById("confirm-reward-fallback");

  if (titleEl) titleEl.textContent = reward.title;
  if (ptsEl) {
    ptsEl.textContent = isPartial ? `Tope: ${reward.pointsCost.toLocaleString()} WP` : `${reward.pointsCost.toLocaleString()} WP`;
    ptsEl.style.background = isPartial ? "#fef3c7" : "#e0e7ff";
    ptsEl.style.color = isPartial ? "#92400e" : "#4338ca";
    ptsEl.style.borderColor = isPartial ? "#fcd34d" : "#c7d2fe";
  }

  if (reward.imageUrl && imgEl) {
    imgEl.src = reward.imageUrl;
    imgEl.style.display = "block";
    if (fallbackEl) fallbackEl.style.display = "none";
  } else {
    if (imgEl) imgEl.style.display = "none";
    if (fallbackEl) {
      fallbackEl.textContent = isPartial ? "🏷️" : "🎁";
      fallbackEl.style.display = "block";
    }
  }

  // Previsualización y configuración de puntos a aplicar
  const userPts = vm.currentUser.wiredPoints || 0;
  const maxCapPts = reward.pointsCost || 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);

  // Por defecto se aplica el máximo posible hasta el tope
  selectedPointsToApply = isPartial ? maxUsablePts : maxCapPts;

  const typeCallout = document.getElementById("confirm-type-callout");
  const typePct = document.getElementById("confirm-type-pct");
  const typePrice = document.getElementById("confirm-type-price");
  const typeMaxDisc = document.getElementById("confirm-type-max-disc");
  const slider = document.getElementById("confirm-points-slider");
  const numInput = document.getElementById("confirm-points-num");
  const maxBadge = document.getElementById("confirm-points-max-badge");
  const zeroNote = document.getElementById("confirm-zero-pts-note");
  const controlsWrap = document.getElementById("confirm-points-controls-wrap");

  if (typeCallout) {
    if (isPartial) {
      typeCallout.style.display = "block";
      const maxPct = reward.maxDiscountPct || 5;
      if (typePrice) typePrice.innerHTML = formatDualPrice(reward.priceUsd);
      if (typeMaxDisc) typeMaxDisc.textContent = `-${formatPrice(reward.maxDiscountUsd)} (${maxCapPts.toLocaleString()} WP = ${maxPct}% OFF)`;

      if (controlsWrap) {
        controlsWrap.style.display = (userPts > 0) ? "block" : "none";
      }
      if (zeroNote) {
        zeroNote.style.display = (userPts <= 0) ? "block" : "none";
      }

      if (slider) {
        slider.min = "0";
        slider.max = String(maxUsablePts);
        slider.value = String(selectedPointsToApply);
        slider.disabled = (maxUsablePts === 0);
      }
      if (numInput) {
        numInput.min = "0";
        numInput.max = String(maxUsablePts);
        numInput.value = String(selectedPointsToApply);
        numInput.disabled = (maxUsablePts === 0);
      }
      if (maxBadge) {
        maxBadge.textContent = `${maxUsablePts.toLocaleString()} WP`;
      }
    } else {
      typeCallout.style.display = "none";
      if (controlsWrap) controlsWrap.style.display = "none";
      if (zeroNote) zeroNote.style.display = "none";
    }
  }

  // Recalcular balance y textos según selectedPointsToApply
  updateConfirmCalculation();

  const warrantyEl = document.getElementById("confirm-warranty-notice");
  if (warrantyEl) {
    if (isPartial) {
      warrantyEl.innerHTML = `🛡️ <strong>GARANTÍA COMERCIAL (30 DÍAS):</strong> Este producto de venta cuenta con garantía técnica de fábrica respaldada por el abono de dinero a pagar en tienda.`;
      warrantyEl.style.borderColor = "#fcd34d";
      warrantyEl.style.background = "#fffbeb";
      warrantyEl.style.color = "#78350f";
    } else {
      warrantyEl.innerHTML = `🛡️ <strong>CONDICIÓN DE GARANTÍA:</strong> Los artículos gratuitos por fidelidad ($0 en efectivo) se entregan probados a satisfacción en mostrador y están <strong>estrictamente exentos de garantía técnica posterior</strong>.`;
      warrantyEl.style.borderColor = "#e2e8f0";
      warrantyEl.style.background = "#f8fafc";
      warrantyEl.style.color = "#475569";
    }
  }

  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "flex";
}

export function updateConfirmCalculation() {
  if (!currentRedeemReward) return;
  const reward = currentRedeemReward;
  const isPartial = reward.rewardType === "PARTIAL_DISCOUNT" || (typeof reward.isPartialDiscount === "function" && reward.isPartialDiscount());
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;

  let deductPts = 0;
  let discountUsd = 0;
  let cashToPayUsd = reward.priceUsd || 0;

  if (isPartial) {
    const maxCapPts = reward.pointsCost || 0;
    const maxPct = reward.maxDiscountPct || 5;
    const maxUsablePts = Math.min(userPts, maxCapPts);
    deductPts = Math.max(0, Math.min(selectedPointsToApply, maxUsablePts));

    const usdPerPoint = (maxCapPts > 0 && reward.maxDiscountUsd > 0)
      ? (reward.maxDiscountUsd / maxCapPts)
      : 0;

    discountUsd = Number(Math.min(reward.maxDiscountUsd || 0, deductPts * usdPerPoint).toFixed(2));
    cashToPayUsd = Math.max(0, Number(((reward.priceUsd || 0) - discountUsd).toFixed(2)));

    const currentPct = maxCapPts > 0 ? Number(((deductPts / maxCapPts) * maxPct).toFixed(2)) : 0;
    const formattedPct = currentPct % 1 === 0 ? currentPct.toFixed(0) : currentPct.toFixed(1);

    const typePct = document.getElementById("confirm-type-pct");
    const typePctCalc = document.getElementById("confirm-type-pct-calc");
    const calcPctLabel = document.getElementById("confirm-calc-pct-label");
    const typeDisc = document.getElementById("confirm-type-discount");
    const typeCash = document.getElementById("confirm-type-cash");
    const ptsAppliedNotice = document.getElementById("confirm-pts-applied-notice");

    if (typePct) typePct.textContent = `${formattedPct}% OFF / MÁX ${maxPct}%`;
    if (typePctCalc) typePctCalc.textContent = `${formattedPct}% de descuento / Máximo ${maxPct}%`;
    if (calcPctLabel) calcPctLabel.textContent = `${formattedPct}%`;
    if (typeDisc) typeDisc.textContent = `-${formatPrice(discountUsd)}`;
    if (typeCash) typeCash.innerHTML = formatDualPrice(cashToPayUsd);
    if (ptsAppliedNotice) ptsAppliedNotice.textContent = `${deductPts.toLocaleString()} WP aplicados`;

    const doRedeemBtn = document.getElementById("btn-do-redeem");
    if (doRedeemBtn) {
      if (deductPts > 0) {
        doRedeemBtn.textContent = `🏷️ CANJEAR VALE DE DESCUENTO (${formattedPct}% = -${formatPrice(discountUsd)})`;
      } else {
        doRedeemBtn.textContent = `🛒 GENERAR VALE DE COMPRA (${formatPrice(cashToPayUsd)})`;
      }
    }
  } else {
    deductPts = reward.pointsCost || 0;
    discountUsd = reward.priceUsd || 0;
    cashToPayUsd = 0;
    const doRedeemBtn = document.getElementById("btn-do-redeem");
    if (doRedeemBtn) doRedeemBtn.textContent = `⚡ AUTORIZAR CANJE WIRED`;
  }

  const afterPts = Math.max(0, userPts - deductPts);

  const curEl = document.getElementById("confirm-balance-current");
  const dedEl = document.getElementById("confirm-balance-deduct");
  const aftEl = document.getElementById("confirm-balance-after");

  if (curEl) curEl.textContent = `${userPts.toLocaleString()} WP`;
  if (dedEl) dedEl.textContent = `-${deductPts.toLocaleString()} WP`;
  if (aftEl) aftEl.textContent = `${afterPts.toLocaleString()} WP`;
}

export function onPointsSliderChange(val) {
  const pts = parseInt(val, 10) || 0;
  selectedPointsToApply = pts;
  const numInput = document.getElementById("confirm-points-num");
  if (numInput) numInput.value = pts;
  updateConfirmCalculation();
}

export function onPointsNumChange(val) {
  let pts = parseInt(val, 10);
  if (isNaN(pts)) pts = 0;
  const maxCapPts = currentRedeemReward ? (currentRedeemReward.pointsCost || 0) : 0;
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);
  pts = Math.max(0, Math.min(pts, maxUsablePts));
  selectedPointsToApply = pts;
  const slider = document.getElementById("confirm-points-slider");
  if (slider) slider.value = pts;
  updateConfirmCalculation();
}

export function setPointsPreset(mode) {
  if (!currentRedeemReward) return;
  const maxCapPts = currentRedeemReward.pointsCost || 0;
  const userPts = vm.currentUser ? (vm.currentUser.wiredPoints || 0) : 0;
  const maxUsablePts = Math.min(userPts, maxCapPts);

  if (mode === 'max') {
    selectedPointsToApply = maxUsablePts;
  } else if (mode === 'zero') {
    selectedPointsToApply = 0;
  }
  const slider = document.getElementById("confirm-points-slider");
  const numInput = document.getElementById("confirm-points-num");
  if (slider) slider.value = selectedPointsToApply;
  if (numInput) numInput.value = selectedPointsToApply;
  updateConfirmCalculation();
}

export function closeRedeemModal() {
  selectedRewardId = null;
  currentRedeemReward = null;
  selectedPointsToApply = 0;
  const modal = document.getElementById("modal-confirm-redeem");
  if (modal) modal.style.display = "none";
}

export async function executeRedeem() {
  if (!selectedRewardId) return;

  const btn = document.getElementById("btn-do-redeem");
  const origBtnText = btn ? btn.innerHTML : "⚡ AUTORIZAR CANJE WIRED";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="cyber-spinner"></span> SINTETIZANDO VALE...`;
  }

  try {
    // 1. Sonido retro sintético Web Audio API (agradable arpegio sci-fi)
    playCyberArpeggio();

    // 2. Ejecutar canje atómico
    const res = await vm.redeemReward(selectedRewardId, selectedPointsToApply);
    const voucher = res.voucher || res;
    const cost = res.cost !== undefined ? res.cost : (voucher ? voucher.pointsSpent : 0);

    // 3. Animación de decremento numérico y badge flotante en CyberPass si gastó puntos
    if (cost > 0) {
      animatePointsDeduction(cost);
    }

    // 4. Animación de celebración en pantalla
    triggerCyberGlitchCelebration();

    // 5. Cerrar modal de confirmación con delay visual
    closeRedeemModal();

    // 6. Toast temático
    if (voucher.discountUsd > 0) {
      showToast(`🏷️ ¡Vale con descuento emitido! Ahorro: -${formatPrice(voucher.discountUsd)}`, "success");
    } else if (voucher.cashToPayUsd > 0) {
      showToast(`🛒 ¡Vale de compra emitido! Paga en tienda: ${formatPrice(voucher.cashToPayUsd)}`, "success");
    } else {
      showToast(`⚡ ¡Canje Autorizado! Vale emitido: ${voucher.voucherCode}`, "success");
    }

    // 7. Abrir modal del vale con animación
    setTimeout(() => {
      showVoucherModal(voucher.voucherCode);
    }, 450);

  } catch (err) {
    showToast(err.message || "Error en el canje", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnText;
    }
  }
}


export function playCyberArpeggio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.2);
    });
  } catch (e) { }
}

export function animatePointsDeduction(cost) {
  const balanceEl = document.getElementById("client-balance-val");
  if (!balanceEl) return;

  const currentVal = parseInt(balanceEl.textContent.replace(/\D/g, ""), 10) || (vm.currentUser ? vm.currentUser.wiredPoints + cost : cost);
  const targetVal = vm.currentUser ? vm.currentUser.wiredPoints : Math.max(0, currentVal - cost);

  // Crear badge flotante -XXX WP
  const floatBadge = document.createElement("div");
  floatBadge.className = "floating-points-deduction";
  floatBadge.textContent = `-${cost.toLocaleString()} WP`;
  balanceEl.parentElement.style.position = "relative";
  balanceEl.parentElement.appendChild(floatBadge);
  setTimeout(() => floatBadge.remove(), 1400);

  // Conteo regresivo numérico rápido
  const steps = 14;
  const stepDuration = 35; // ~500ms total
  let currentStep = 0;
  const delta = (currentVal - targetVal) / steps;

  const timer = setInterval(() => {
    currentStep++;
    if (currentStep >= steps) {
      clearInterval(timer);
      balanceEl.textContent = targetVal.toLocaleString();
    } else {
      const interim = Math.round(currentVal - delta * currentStep);
      balanceEl.textContent = interim.toLocaleString();
    }
  }, stepDuration);
}

export function triggerCyberGlitchCelebration() {
  let canvas = document.getElementById("cyber-celebration-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "cyber-celebration-canvas";
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const symbols = ["+", "WP", "⚡", "◆", "◇", "●", "01", "WIRED"];
  const colors = ["#38bdf8", "#4338ca", "#e11d48", "#10b981", "#ffffff"];
  const particles = [];
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.45;

  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      gravity: 0.18,
      char: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 10 + Math.random() * 8,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02
    });
  }

  let animId;
  function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = `900 ${p.size}px 'JetBrains Mono', monospace`;
        ctx.fillText(p.char, p.x, p.y);
        ctx.restore();
      }
    });

    if (alive) {
      animId = requestAnimationFrame(renderFrame);
    } else {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.remove();
    }
  }
  animId = requestAnimationFrame(renderFrame);
}

