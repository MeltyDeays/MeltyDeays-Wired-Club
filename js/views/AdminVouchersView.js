/**
 * Vista / Subcontrolador: Auditoría, Despacho y Registro de Pagos de Vales (The Wired Club)
 */
let vm = null;
let showToast = () => {};
let closeModal = () => {};

export function initAdminVouchersView(deps) {
  if (deps) {
    if (deps.vm) vm = deps.vm;
    if (deps.showToast) showToast = deps.showToast;
    if (deps.closeModal) closeModal = deps.closeModal;
  }
}

let vouchersFilterState = "ALL";
let vouchersFilterQuery = "";
let vouchersSortOrder = "newest";
let currentPaidVoucherId = null;

export function playAdminDispatchSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tones = [
      { freq: 392.00, start: 0, dur: 0.12, type: "sawtooth", gain: 0.08 },
      { freq: 523.25, start: 0.06, dur: 0.14, type: "sine", gain: 0.1 },
      { freq: 659.25, start: 0.12, dur: 0.16, type: "sine", gain: 0.12 },
      { freq: 783.99, start: 0.18, dur: 0.18, type: "sine", gain: 0.14 },
      { freq: 1046.50, start: 0.24, dur: 0.3, type: "triangle", gain: 0.16 }
    ];
    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.start);
      gain.gain.setValueAtTime(t.gain, ctx.currentTime + t.start);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t.start + t.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t.start);
      osc.stop(ctx.currentTime + t.start + t.dur);
    });
  } catch (e) {}
}

// Ráfaga de partículas y glitch cibernético en canvas
export function triggerCyberDispatchGlitch() {
  let canvas = document.getElementById("cyber-celebration-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "cyber-celebration-canvas";
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#10b981", "#34d399", "#38bdf8", "#4338ca", "#ffffff"];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.018 + Math.random() * 0.025
    });
  }

  let animId;
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    if (alive) {
      animId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.remove();
    }
  }
  animId = requestAnimationFrame(loop);
}

export function renderVouchersTable(vouchers) {
  const tbody = document.getElementById("vouchers-table-body");
  if (!tbody) return;

  let filtered = [...(vouchers || [])];
  if (vouchersFilterState === "PENDING") {
    filtered = filtered.filter(v => typeof v.isDelivered === "function" ? !v.isDelivered() : v.status !== "DELIVERED");
  } else if (vouchersFilterState === "DELIVERED") {
    filtered = filtered.filter(v => typeof v.isDelivered === "function" ? v.isDelivered() : v.status === "DELIVERED");
  }

  if (vouchersFilterQuery) {
    const q = vouchersFilterQuery.toLowerCase();
    filtered = filtered.filter(v => {
      const code = (v.voucherCode || v.voucher_code || "").toLowerCase();
      const title = (v.rewardTitle || v.reward_title || "").toLowerCase();
      const targetUid = v.userUid || v.user_uid || v.userId || v.user_id || "";
      const userMatch = (vm && vm.users) ? vm.users.find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid)) : null;
      const clientName = (v.userName || v.userDisplayName || (userMatch ? userMatch.displayName : "")).toLowerCase();
      const clientContact = (userMatch && userMatch.phone ? userMatch.phone : (v.userPhone || "")).toLowerCase();
      return code.includes(q) || title.includes(q) || clientName.includes(q) || clientContact.includes(q);
    });
  }

  // Ordenamiento dinámico
  filtered.sort((a, b) => {
    if (vouchersSortOrder === "newest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    } else if (vouchersSortOrder === "oldest") {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    } else if (vouchersSortOrder === "points-desc") {
      const costA = Number(a.pointsSpent || a.pointsCost || a.points_spent || (a.reward ? a.reward.pointsCost : 0));
      const costB = Number(b.pointsSpent || b.pointsCost || b.points_spent || (b.reward ? b.reward.pointsCost : 0));
      return costB - costA;
    } else if (vouchersSortOrder === "points-asc") {
      const costA = Number(a.pointsSpent || a.pointsCost || a.points_spent || (a.reward ? a.reward.pointsCost : 0));
      const costB = Number(b.pointsSpent || b.pointsCost || b.points_spent || (b.reward ? b.reward.pointsCost : 0));
      return costA - costB;
    } else if (vouchersSortOrder === "code-asc") {
      return (a.voucherCode || "").localeCompare(b.voucherCode || "");
    }
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--gray-500);">
          <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">📜</div>
          <strong>No hay registros de vales bajo este filtro.</strong>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const isDelivered = typeof v.isDelivered === "function" ? v.isDelivered() : v.status === "DELIVERED";
    const isCancelled = typeof v.isCancelled === "function" ? v.isCancelled() : v.status === "CANCELLED";
    const isCommercial = typeof v.isCommercial === "function" ? v.isCommercial() : (v.rewardType === "PARTIAL_DISCOUNT" || (v.cashToPayUsd && v.cashToPayUsd > 0));
    const isPaid = typeof v.isPaidVoucher === "function" ? v.isPaidVoucher() : Boolean(v.isPaid || v.status === "PAID" || v.paidAt);
    const isExpired = typeof v.isExpired === "function" ? v.isExpired() : (isCommercial && !isPaid && !isDelivered && !isCancelled && v.expiresAt && new Date() > new Date(v.expiresAt));
    const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

    let statusBadge = "";
    if (isDelivered) {
      statusBadge = `<span class="badge-navi" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">✓ DESPACHADO</span>`;
    } else if (isCancelled) {
      statusBadge = `<span class="badge-navi" style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;">❌ CANCELADO</span>`;
    } else if (isExpired) {
      statusBadge = `<span class="badge-navi" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">⚠️ CADUCADO (3D)</span>`;
    } else if (isPaid) {
      statusBadge = `<span class="badge-navi" style="background:#f0fdf4; color:#15803d; border:1px solid #86efac;">💵 PAGADO</span>`;
    } else if (isCommercial) {
      statusBadge = `<span class="badge-navi" style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d;">⏱️ PENDIENTE PAGO ($${(v.cashToPayUsd || 0).toFixed(2)})</span>`;
    } else {
      statusBadge = `<span class="badge-navi" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">🎁 LISTO ENTREGA</span>`;
    }

    // Extracción tolerante y búsqueda inteligente del socio en el sistema
    const targetUid = v.userUid || v.user_uid || v.userId || v.user_id || "";
    const userMatch = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
    const clientName = v.userName || v.userDisplayName || v.user_name || (userMatch ? userMatch.displayName : "Socio Wired");
    const clientContact = (userMatch && userMatch.phone) ? userMatch.phone : (v.userPhone || targetUid || "-");
    const cost = Number(v.pointsSpent || v.pointsCost || v.points_spent || (v.reward ? v.reward.pointsCost : 0));

    return `
      <tr id="voucher-row-${v.voucherCode}">
        <td style="font-family:var(--font-mono); font-weight:800; font-size:0.85rem; color:var(--dark);">${v.voucherCode}</td>
        <td>
          <strong style="color:var(--dark);">${v.rewardTitle || "Artículo"}</strong>
          ${isCommercial ? `
            <div style="font-size:0.68rem; font-family:var(--font-mono); color:#92400e; margin-top:2px;">
              ${isPaid ? '✅ Pagado en efectivo' : `💵 A cobrar: $${(v.cashToPayUsd || 0).toFixed(2)} USD`}
            </div>
          ` : ''}
        </td>
        <td>
          <div style="font-size:0.82rem; font-weight:700; color:var(--dark);">${clientName}</div>
          <div style="font-size:0.7rem; font-family:var(--font-mono); color:var(--gray-500);">${clientContact}</div>
        </td>
        <td><span class="badge-navi">${cost > 0 ? cost.toLocaleString() + " WP" : "0 WP"}</span></td>
        <td style="font-size:0.75rem; color:var(--gray-600);">${dateStr}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${(!isDelivered && !isCancelled && !isExpired) ? `
            <div style="display:inline-flex; gap:6px; align-items:center; justify-content:flex-end;">
              ${(isCommercial && !isPaid) ? `
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; font-weight:800; color:#047857; border: 1.5px solid #10b981; background:#ecfdf5; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);" onclick="openMarkPaidModal('${v.voucherCode}')" title="Registrar abono de $${(v.cashToPayUsd || 0).toFixed(2)} USD para habilitar entrega">
                  💵 Pagado
                </button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.72rem; color:var(--gray-400); border: 1px dashed var(--gray-300); background:#f8fafc; cursor:not-allowed; opacity:0.65;" disabled title="Bloqueado: Primero registra el pago en efectivo">
                  🔒 Entregar
                </button>
              ` : `
                <button class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem; font-weight:800;" onclick="openDeliverVoucherModal('${v.voucherCode}')">
                  ✓ Entregar
                </button>
              `}
            </div>
          ` : (isDelivered ? `
            <span style="font-size:0.75rem; color:var(--gray-500); font-family:var(--font-mono);">Entregado</span>
          ` : (isCancelled ? `
            <span style="font-size:0.75rem; color:#dc2626; font-family:var(--font-mono);">Cancelado</span>
          ` : `
            <span style="font-size:0.75rem; color:#b91c1c; font-family:var(--font-mono);">Caducado (3d)</span>
          `))}
        </td>
      </tr>
    `;
  }).join("");
}

let currentModalPaidCode = null;

export function openMarkPaidModal(voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  currentModalPaidCode = code;

  const voucher = (vm.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === code);
  if (!voucher) {
    showToast("❌ No se encontró el vale [" + code + "] en memoria.", "error");
    return;
  }

  const targetUid = voucher.userUid || voucher.user_uid || voucher.userId || voucher.user_id || "";
  const user = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
  const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
  const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (targetUid || "-");
  
  const cashDueUsd = Number(voucher.cashToPayUsd || 0);
  const cashDueNio = cashDueUsd * 37.0; // Conversión oficial 1 USD = 37.0 NIO
  const officialPriceUsd = Number(voucher.officialPriceUsd || voucher.official_price_usd || cashDueUsd);
  const discountUsd = Number(voucher.discountUsd || voucher.discount_usd || (officialPriceUsd - cashDueUsd));
  const pointsSpent = Number(voucher.pointsSpent || voucher.pointsCost || voucher.points_spent || 0);

  const codeEl = document.getElementById("modal-paid-code");
  if (codeEl) codeEl.textContent = voucher.voucherCode;

  const prodEl = document.getElementById("modal-paid-product");
  if (prodEl) prodEl.textContent = voucher.rewardTitle || "Artículo";

  const clientEl = document.getElementById("modal-paid-client");
  if (clientEl) clientEl.textContent = clientName;

  const contactEl = document.getElementById("modal-paid-contact");
  if (contactEl) contactEl.textContent = clientContact;

  const pointsEl = document.getElementById("modal-paid-points");
  if (pointsEl) {
    pointsEl.textContent = pointsSpent > 0 ? `${pointsSpent.toLocaleString()} WP (-$${discountUsd.toFixed(2)})` : "0 WP (Compra Directa)";
  }

  const usdEl = document.getElementById("modal-paid-amount-usd");
  if (usdEl) usdEl.textContent = `$${cashDueUsd.toFixed(2)} USD`;

  const nioEl = document.getElementById("modal-paid-amount-nio");
  if (nioEl) nioEl.textContent = `C$ ${cashDueNio.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO`;

  const offEl = document.getElementById("modal-paid-official-price");
  if (offEl) offEl.textContent = `$${officialPriceUsd.toFixed(2)} USD`;

  const btnAction = document.getElementById("btn-confirm-paid-action");
  if (btnAction) {
    btnAction.disabled = false;
    btnAction.innerHTML = `💵 CONFIRMAR ABONO ($${cashDueUsd.toFixed(2)} USD)`;
  }

  const modal = document.getElementById("modal-confirm-paid-voucher");
  if (modal) modal.style.display = "flex";
}

export async function executeConfirmPaidModal() {
  const code = currentModalPaidCode;
  if (!code) return;

  const btnAction = document.getElementById("btn-confirm-paid-action");
  if (btnAction) {
    btnAction.disabled = true;
    btnAction.innerHTML = '<span class="cyber-spinner"></span> REGISTRANDO PAGO...';
  }

  try {
    await vm.markVoucherPaid(code);
    closeModal("modal-confirm-paid-voucher");
    playAdminDispatchSound();
    showToast(`✓ Pago registrado con éxito para [${code}]. Plazo desactivado y entrega habilitada.`, "success");
    renderVouchersTable(vm.vouchers);
  } catch (err) {
    showToast("❌ " + err.message, "error");
    if (btnAction) {
      btnAction.disabled = false;
      btnAction.innerHTML = `💵 REINTENTAR COBRO`;
    }
  }
}

export function markVoucherPaidAdmin(voucherCode, cashDue = 0) {
  openMarkPaidModal(voucherCode);
}

export function filterVouchersTable(state) {
  vouchersFilterState = state;
  const states = ["ALL", "PENDING", "DELIVERED"];
  states.forEach(s => {
    const btn = document.getElementById("voucher-filter-" + s);
    if (btn) {
      if (s === state) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });
  if (vm) renderVouchersTable(vm.vouchers);
}

export function filterVouchersAdmin() {
  const input = document.getElementById("search-vouchers-input");
  vouchersFilterQuery = (input ? input.value : "").trim();
  if (vm) renderVouchersTable(vm.vouchers);
}

export function sortVouchersAdmin(order) {
  vouchersSortOrder = order || "newest";
  const select = document.getElementById("sort-vouchers-select");
  if (select && select.value !== vouchersSortOrder) select.value = vouchersSortOrder;
  if (vm) renderVouchersTable(vm.vouchers);
}

let currentModalDeliverCode = null;

export function openDeliverVoucherModal(voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  currentModalDeliverCode = code;

  const voucher = (vm.vouchers || []).find(v => (v.voucherCode || "").trim().toUpperCase() === code);
  if (!voucher) {
    showToast("❌ No se encontró el vale [" + code + "] en memoria.", "error");
    return;
  }

  // Bloqueo estricto: Si no está pagado, no puede entregarse
  const isCommercial = typeof voucher.isCommercial === "function" ? voucher.isCommercial() : (voucher.rewardType === "PARTIAL_DISCOUNT" || (voucher.cashToPayUsd && voucher.cashToPayUsd > 0));
  const isPaid = typeof voucher.isPaidVoucher === "function" ? voucher.isPaidVoucher() : Boolean(voucher.isPaid || voucher.status === "PAID" || voucher.paidAt);
  if (isCommercial && !isPaid) {
    showToast(`⚠️ El vale [${code}] requiere abono de $${(voucher.cashToPayUsd || 0).toFixed(2)} USD antes de poder entregarse.`, "warning");
    openMarkPaidModal(code);
    return;
  }

  const targetUid = voucher.userUid || voucher.user_uid || voucher.userId || voucher.user_id || "";
  const user = (vm.users || []).find(u => u.uid === targetUid || (u.memberCode && u.memberCode === targetUid));
  const clientName = voucher.userName || (user ? user.displayName : "Socio Wired");
  const clientContact = user ? (user.phone ? "📞 " + user.phone : user.memberCode || "") : (targetUid || "-");
  const cost = Number(voucher.pointsSpent || voucher.pointsCost || voucher.points_spent || 0);

  const codeEl = document.getElementById("modal-deliver-code");
  if (codeEl) codeEl.textContent = voucher.voucherCode;
  const prodEl = document.getElementById("modal-deliver-product");
  if (prodEl) prodEl.textContent = voucher.rewardTitle || "Artículo";
  const clientEl = document.getElementById("modal-deliver-client");
  if (clientEl) clientEl.textContent = clientName;
  const contactEl = document.getElementById("modal-deliver-contact");
  if (contactEl) contactEl.textContent = clientContact;
  const pointsEl = document.getElementById("modal-deliver-points");
  if (pointsEl) pointsEl.textContent = cost > 0 ? cost.toLocaleString() + " WP" : "CANJE";
  const dateEl = document.getElementById("modal-deliver-date");
  if (dateEl) dateEl.textContent = voucher.createdAt ? new Date(voucher.createdAt).toLocaleString() : "-";

  const stamp = document.getElementById("modal-deliver-stamp");
  if (stamp) stamp.className = "dispatch-stamp"; // Oculto

  const pill = document.getElementById("modal-deliver-status-pill");
  if (pill) {
    pill.className = "noc-pulse-chip";
    pill.style.background = "#ecfdf5";
    pill.style.color = "#059669";
    pill.style.borderColor = "#a7f3d0";
    pill.innerHTML = '<span class="pulse-dot"></span> LISTO PARA SALIDA FÍSICA';
  }

  // Soporte de cobro obligatorio para venta con descuento tope
  const isPartial = isCommercial;
  const calloutEl = document.getElementById("modal-deliver-cash-callout");

  if (calloutEl) {
    if (isPartial) {
      calloutEl.style.display = "block";
      if (isPaid) {
        calloutEl.style.background = "#ecfdf5";
        calloutEl.style.borderColor = "#10b981";
        calloutEl.innerHTML = `
          <div style="color:#047857; font-weight:900; font-family:var(--font-mono); font-size:0.85rem;">
            ✅ PAGO DE $${(voucher.cashToPayUsd || 0).toFixed(2)} USD CONFIRMADO
          </div>
          <div style="font-size:0.72rem; color:#065f46; margin-top:3px;">
            El importe en efectivo ya fue cancelado. Entrega física autorizada sin cobros pendientes.
          </div>
        `;
      } else {
        calloutEl.style.background = "#fffbeb";
        calloutEl.style.borderColor = "#f59e0b";
        calloutEl.innerHTML = `
          <div style="color:#b45309; font-weight:900; font-family:var(--font-mono); font-size:0.85rem;">
            💵 COBRO PENDIENTE: $${(voucher.cashToPayUsd || 0).toFixed(2)} USD
          </div>
          <div style="font-size:0.72rem; color:#92400e; margin-top:3px;">
            Recuerda cobrar el importe acordado antes de autorizar la salida física del artículo.
          </div>
        `;
      }
    } else {
      calloutEl.style.display = "none";
    }
  }

  const actions = document.getElementById("modal-deliver-actions");
  if (actions) {
    const btnText = (isPartial && !isPaid)
      ? `⚡ COBRAR $${(voucher.cashToPayUsd || 0).toFixed(2)} USD Y DESPACHAR`
      : `⚡ CONFIRMAR Y DESPACHAR ARTÍCULO`;

    actions.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('modal-deliver-voucher')">CANCELAR</button>
      <button id="btn-modal-deliver-action" class="btn-primary btn-dispatch-action" onclick="executeModalDeliver()">
        ${btnText}
      </button>
    `;
  }

  const modal = document.getElementById("modal-deliver-voucher");
  if (modal) modal.style.display = "flex";
}

export async function executeModalDeliver() {
  const code = currentModalDeliverCode;
  if (!code) return;

  const btn = document.getElementById("btn-modal-deliver-action");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="cyber-spinner"></span> REGISTRANDO DESPACHO...';
  }

  try {
    await vm.deliverVoucher(code);
    playAdminDispatchSound();
    triggerCyberDispatchGlitch();

    // Sello Holográfico Animado en el Modal
    const stamp = document.getElementById("modal-deliver-stamp");
    if (stamp) {
      const nowStr = new Date().toLocaleString();
      stamp.className = "dispatch-stamp active";
      stamp.innerHTML = `
        ✓ ARTÍCULO DESPACHADO
        <div style="font-size:0.68rem; font-weight:800; margin-top:4px; letter-spacing:0.5px;">
          SALIDA AUTORIZADA // OPERADOR: ADMIN_MELTY // ${nowStr}
        </div>
      `;
    }

    const pill = document.getElementById("modal-deliver-status-pill");
    if (pill) {
      pill.innerHTML = "✓ DESPACHADO CON ÉXITO";
    }

    const actions = document.getElementById("modal-deliver-actions");
    if (actions) {
      actions.innerHTML = `
        <button class="btn-primary" style="background:#059669; border-color:#047857; color:#fff;" onclick="closeModal('modal-deliver-voucher');">
          ✓ FINALIZAR Y CERRAR
        </button>
      `;
    }

    showToast(`✓ Vale [${code}] despachado y entregado físicamente al socio.`, "success");

    // Destello de fila en la tabla de historial
    const row = document.getElementById(`voucher-row-${code}`);
    if (row) row.classList.add("row-delivered-flash");

    setTimeout(() => {
      closeModal('modal-deliver-voucher');
    }, 1800);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ CONFIRMAR Y DESPACHAR ARTÍCULO";
    }
    showToast("❌ " + err.message, "error");
  }
}

export function deliverVoucherFromTable(voucherCode) {
  openDeliverVoucherModal(voucherCode);
}
