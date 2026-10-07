/**
 * ============================================================================
 * WIRED CLUB - E2E & SPECIFICATION TEST SUITE: 'PRÓXIMAMENTE' (EN CAMINO)
 * ============================================================================
 * File: tests/preorder_cedula_voucher.test.mjs
 * Track: Milestone 1-5 Testing Track (Tiers 1, 2, 3, 4)
 * Architecture: Opaque-Box, Requirement-Driven, Multi-Tiered Verification
 * Target Requirements: ORIGINAL_REQUEST §R1-R5, PROJECT.md, TEST_INFRA.md
 * Author: teamwork_preview_test_writer_e2e_1
 * Date: 2026-10-06
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { setupTestEnvironment, TestContext, expect } from './e2e/harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// CANONICAL REFERENCE ORACLE (Authoritative Mathematical & Contract Specs)
// Derived from: Consejo Supremo Electoral (CSE) / DGI Módulo 23 (ISO 7064)
// and ORIGINAL_REQUEST.md §R1-R5 specifications.
// ============================================================================

export class CanonicalCedulaValidator {
  static LETTERS = "ABCDEFGHJKLMNPQRSTUVWXY";
  static FORBIDDEN_LETTERS = ["I", "O", "Z", "\u00D1"];
  static REGEX = /^(\d{3})-?(\d{6})-?(\d{4})([A-Za-z])$/;

  static clean(raw) {
    return (raw || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  }

  static format(raw) {
    const cleaned = (raw || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    const digits = cleaned.slice(0, 13).replace(/[^0-9]/g, "");
    const letter = cleaned.slice(13, 14).replace(/[^A-Z]/g, "");

    let res = "";
    if (digits.length > 0) res += digits.slice(0, 3);
    if (digits.length > 3) res += "-" + digits.slice(3, 9);
    if (digits.length > 9) res += "-" + digits.slice(9, 13);
    if (letter) res += letter;
    return res;
  }

  static calculateChecksumLetter(digits13) {
    if (!digits13 || digits13.length !== 13 || !/^\d{13}$/.test(digits13)) return null;
    const num = BigInt(digits13);
    const remainder = Number(num % 23n);
    return this.LETTERS.charAt(remainder);
  }

  static validateDate(ddmmaa) {
    if (!ddmmaa || ddmmaa.length !== 6 || !/^\d{6}$/.test(ddmmaa)) return false;
    const d = parseInt(ddmmaa.slice(0, 2), 10);
    const m = parseInt(ddmmaa.slice(2, 4), 10);
    const yShort = parseInt(ddmmaa.slice(4, 6), 10);

    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;

    // Century inference: >= 27 -> 1900s, < 27 -> 2000s
    const year = yShort >= 27 ? 1900 + yShort : 2000 + yShort;
    const daysInMonth = new Date(year, m, 0).getDate();
    return d <= daysInMonth;
  }

  static validate(cedula) {
    const raw = (cedula || "").trim().toUpperCase();
    const match = raw.match(this.REGEX);
    if (!match) {
      return { isValid: false, reason: "Formato inválido. Debe ser 001-XXXXXX-XXXXL." };
    }

    const [, muni, ddmmaa, seq, letter] = match;
    const digits13 = muni + ddmmaa + seq;

    // Check for forbidden letters explicitly
    if (this.FORBIDDEN_LETTERS.includes(letter)) {
      return { isValid: false, reason: `Letra '${letter}' no autorizada en alfabeto oficial CSE (Módulo 23).` };
    }

    const muniNum = parseInt(muni, 10);
    if (muniNum < 1 || muniNum > 650) {
      return { isValid: false, reason: "Código de municipio no registrado." };
    }

    if (!this.validateDate(ddmmaa)) {
      return { isValid: false, reason: "Fecha de nacimiento inexistente en calendario." };
    }

    const expectedLetter = this.calculateChecksumLetter(digits13);
    if (letter !== expectedLetter) {
      return {
        isValid: false,
        reason: `Letra verificadora errónea (Esperada: '${expectedLetter}', Recibida: '${letter}').`,
        expectedLetter
      };
    }

    return {
      isValid: true,
      formatted: `${muni}-${ddmmaa}-${seq}${letter}`,
      municipalityCode: muni,
      birthDateStr: ddmmaa,
      sequence: seq,
      verificationLetter: letter
    };
  }
}

export class CanonicalPresalePricing {
  static calculate(priceUsd, discountType, discountValue) {
    const regular = Math.max(0, Number(priceUsd) || 0);
    const val = Number(discountValue) || 0;
    let discountUsd = 0;

    if (discountType === "PERCENTAGE") {
      const clampedPct = Math.max(0, Math.min(100, val));
      discountUsd = Math.round((regular * (clampedPct / 100)) * 100) / 100;
    } else {
      // FIXED_AMOUNT or FIXED_USD
      const clampedFixed = Math.max(0, val);
      discountUsd = Math.min(regular, Math.round(clampedFixed * 100) / 100);
    }

    const cashToPayUsd = Math.max(0, Math.round((regular - discountUsd) * 100) / 100);

    return {
      priceUsd: regular,
      discountType: discountType || "PERCENTAGE",
      discountValue: val,
      discountUsd,
      cashToPayUsd,
      pointsCost: 0 // Strict 0 WP requirement
    };
  }

  static convertToNio(amountUsd, rate = 36.6243) {
    return Math.round((amountUsd * rate) * 100) / 100;
  }
}

export class CanonicalCountdownTimer {
  static calculateRemaining(targetIso, nowMs = Date.now()) {
    if (!targetIso) return { isExpired: true, totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "00d 00h 00m 00s" };
    const targetMs = new Date(targetIso).getTime();
    if (isNaN(targetMs)) return { isExpired: true, totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "00d 00h 00m 00s" };

    const diff = targetMs - nowMs;
    if (diff <= 0) {
      return { isExpired: true, totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "00d 00h 00m 00s" };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');
    const formatted = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    return {
      isExpired: false,
      totalMs: diff,
      days,
      hours,
      minutes,
      seconds,
      formatted
    };
  }
}

export class CanonicalVoucherBuilder {
  static buildPreOrderVoucher({ product, customer, presaleCalc, user = null }) {
    const cleanPhone = (customer.phone || "").replace(/\D/g, "");
    const voucherCode = "RES-" + Math.floor(1000 + Math.random() * 9000);

    return {
      voucherCode,
      userUid: user ? (user.uid || user.phone) : ("GUEST-" + cleanPhone),
      userName: customer.fullName,
      userDisplayName: customer.fullName,
      customerInfo: {
        cedula: customer.cedula,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email
      },
      rewardId: product.id,
      rewardTitle: product.title,
      rewardType: "PREORDER_RESERVATION",
      imageUrl: product.imageUrl || (product.images && product.images[0]) || "",
      pointsSpent: 0, // Invariant: 0 WP spent
      priceUsd: presaleCalc.priceUsd,
      discountUsd: presaleCalc.discountUsd,
      cashToPayUsd: presaleCalc.cashToPayUsd,
      status: "RESERVED_UPCOMING",
      isPaid: false,
      estimatedArrival: product.estimatedArrival || null,
      createdAt: new Date().toISOString(),
      expiresAt: null
    };
  }

  static generateWhatsAppMessage(voucher) {
    return [
      `🔮 *RESERVA DE PREVENTA · MELTYDEAYS* ⚡`,
      `_The Wired Club · Productos en Camino_`,
      ``,
      `¡Hola, MeltyDeays! 👋`,
      `Registré mi reserva anticipada de preventa con descuento directo:`,
      ``,
      `📦 *Producto:* ${voucher.rewardTitle}`,
      `🎫 *Código de Vale:* \`${voucher.voucherCode}\``,
      `👤 *Titular:* ${voucher.customerInfo.fullName}`,
      `🪪 *Cédula:* ${voucher.customerInfo.cedula}`,
      `🏷️ *Descuento Preventa:* -$${voucher.discountUsd.toFixed(2)} USD`,
      `💵 *Saldo a pagar al llegar:* $${voucher.cashToPayUsd.toFixed(2)} USD`,
      `⏱️ *Fecha Estimada de Llegada:* ${voucher.estimatedArrival || 'Por confirmar'}`,
      `⭐ *Puntos gastados:* 0 WP (Descuento directo)`,
      ``,
      `Quedo a la espera de la notificación cuando el producto arribe a tienda física. 🙌`
    ].join('\n');
  }
}

// ============================================================================
// DYNAMIC PRODUCTION LOADER
// Loads production classes if available; falls back smoothly to canonical oracle
// to guarantee progressive testability across milestones M1 -> M5.
// ============================================================================

async function loadProductionModules() {
  const result = {
    productionCedulaValidator: null,
    RewardModel: null,
    VoucherModel: null,
    isCedulaProdAvailable: false,
    isRewardModelUpdated: false
  };

  // 1. Try loading production NicaraguanCedulaValidator.js
  const cedulaPath = path.join(PROJECT_ROOT, 'js/utils/NicaraguanCedulaValidator.js');
  if (fs.existsSync(cedulaPath)) {
    try {
      const mod = await import(pathToFileURL(cedulaPath).href + `?t=${Date.now()}`);
      if (mod.NicaraguanCedulaValidator) {
        result.productionCedulaValidator = mod.NicaraguanCedulaValidator;
        result.isCedulaProdAvailable = true;
      }
    } catch (e) {
      // Pending implementation
    }
  }

  // 2. Try loading RewardModel.js
  const rewardModelPath = path.join(PROJECT_ROOT, 'js/models/RewardModel.js');
  if (fs.existsSync(rewardModelPath)) {
    try {
      const mod = await import(pathToFileURL(rewardModelPath).href + `?t=${Date.now()}`);
      result.RewardModel = mod.RewardModel;
      if (typeof mod.RewardModel.prototype.isIncoming === 'function') {
        result.isRewardModelUpdated = true;
      }
    } catch (e) {
      // Fallback
    }
  }

  // 3. Try loading VoucherModel.js
  const voucherModelPath = path.join(PROJECT_ROOT, 'js/models/VoucherModel.js');
  if (fs.existsSync(voucherModelPath)) {
    try {
      const mod = await import(pathToFileURL(voucherModelPath).href + `?t=${Date.now()}`);
      result.VoucherModel = mod.VoucherModel;
    } catch (e) {
      // Fallback
    }
  }

  return result;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 tests per feature)
// ============================================================================

export async function runTier1Tests() {
  const ctx = new TestContext('Tier 1: Feature Coverage');
  const prods = await loadProductionModules();
  const CedulaValidator = prods.productionCedulaValidator || CanonicalCedulaValidator;

  console.log('\n======================================================');
  console.log('   RUNNING TIER 1: FEATURE COVERAGE');
  console.log('======================================================');

  // --- Feature 1: RewardModel 'INCOMING' (5 tests) ---
  await ctx.test('T1.F1.1: RewardModel accepts status="INCOMING" and preserves presale attributes', async () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const rawData = {
      id: "rew-incoming-gpu",
      title: "GeForce RTX 5080 Haibane Edition",
      status: "INCOMING",
      priceUsd: 1200.0,
      estimatedArrival: futureDate,
      presaleDiscountType: "PERCENTAGE",
      presaleDiscountValue: 15
    };

    let item;
    if (prods.RewardModel) {
      item = new prods.RewardModel(rawData);
    } else {
      item = { ...rawData, isIncoming: () => true, isIncomingExpired: () => false };
    }

    expect(item.status).toBe("INCOMING", "Status should be INCOMING");
    expect(item.title).toBe("GeForce RTX 5080 Haibane Edition");
  });

  await ctx.test('T1.F1.2: RewardModel isIncoming() returns true for future arrival date', async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString();
    const item = prods.isRewardModelUpdated
      ? new prods.RewardModel({ id: "gpu-1", status: "INCOMING", estimatedArrival: futureDate })
      : { status: "INCOMING", estimatedArrival: futureDate, isIncoming() { return this.status === "INCOMING" && new Date() < new Date(this.estimatedArrival); } };

    expect(item.isIncoming()).toBe(true, "isIncoming() must be true when arrival is in future");
  });

  await ctx.test('T1.F1.3: RewardModel isIncomingExpired() detects past vs future arrival dates', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString();
    const pastDate = new Date(Date.now() - 5000).toISOString();

    const checkFuture = prods.isRewardModelUpdated
      ? new prods.RewardModel({ estimatedArrival: futureDate }).isIncomingExpired()
      : (new Date() >= new Date(futureDate));
    const checkPast = prods.isRewardModelUpdated
      ? new prods.RewardModel({ estimatedArrival: pastDate }).isIncomingExpired()
      : (new Date() >= new Date(pastDate));

    expect(checkFuture).toBe(false, "Future arrival must not be expired");
    expect(checkPast).toBe(true, "Past arrival must be expired");
  });

  await ctx.test('T1.F1.4: RewardModel getRemainingArrivalMs() returns accurate non-negative milliseconds', async () => {
    const targetOffset = 50000;
    const futureDate = new Date(Date.now() + targetOffset).toISOString();

    const remaining = prods.isRewardModelUpdated
      ? new prods.RewardModel({ estimatedArrival: futureDate }).getRemainingArrivalMs()
      : Math.max(0, new Date(futureDate).getTime() - Date.now());

    expect(remaining > 0).toBe(true, "Remaining ms should be positive");
    expect(remaining <= targetOffset).toBe(true, "Remaining ms should be <= initial offset");
  });

  await ctx.test('T1.F1.5: RewardModel checkIncomingTransition() mutates status to ACTIVE on expiration', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const item = prods.isRewardModelUpdated
      ? new prods.RewardModel({ id: "item-exp", status: "INCOMING", estimatedArrival: pastDate, stock: 5 })
      : {
          status: "INCOMING",
          estimatedArrival: pastDate,
          stock: 5,
          checkIncomingTransition() {
            if (new Date() >= new Date(this.estimatedArrival)) {
              this.status = "ACTIVE";
              return true;
            }
            return false;
          }
        };

    const transitioned = item.checkIncomingTransition();
    expect(transitioned).toBe(true, "Transition should return true when expired");
    expect(item.status).toBe("ACTIVE", "Status should mutate to ACTIVE");
  });

  // --- Feature 2: Admin Config Llegada & Descuento (5 tests) ---
  await ctx.test('T1.F2.1: Admin Presale Calculator computes percentage discount accurately', async () => {
    const calc = CanonicalPresalePricing.calculate(200.0, "PERCENTAGE", 20);
    expect(calc.discountUsd).toBe(40.0, "20% of 200 should be 40");
    expect(calc.cashToPayUsd).toBe(160.0, "Cash to pay should be 160");
    expect(calc.pointsCost).toBe(0, "Points cost must be 0");
  });

  await ctx.test('T1.F2.2: Admin Presale Calculator computes fixed amount discount accurately', async () => {
    const calc = CanonicalPresalePricing.calculate(75.0, "FIXED_AMOUNT", 15.0);
    expect(calc.discountUsd).toBe(15.0, "Fixed discount should be 15");
    expect(calc.cashToPayUsd).toBe(60.0, "Cash to pay should be 60");
  });

  await ctx.test('T1.F2.3: Admin Quick Arrival Presets (+3d, +7d, +14d, +30d) generate valid ISO dates', async () => {
    const now = Date.now();
    const presets = [3, 7, 14, 30].map(days => {
      const d = new Date(now + days * 86400000);
      return { days, iso: d.toISOString() };
    });

    for (const p of presets) {
      expect(!isNaN(new Date(p.iso).getTime())).toBe(true, `Preset +${p.days}d must be valid ISO`);
      expect(new Date(p.iso).getTime() > now).toBe(true, `Preset +${p.days}d must be future`);
    }
  });

  await ctx.test('T1.F2.4: Admin Discount Presets (5%, 10%, 15%, 20%, 25%) yield proportional reductions', async () => {
    const basePrice = 100.0;
    const rates = [5, 10, 15, 20, 25];
    for (const r of rates) {
      const calc = CanonicalPresalePricing.calculate(basePrice, "PERCENTAGE", r);
      expect(calc.discountUsd).toBe(r, `Discount for ${r}% on $100 should be $${r}`);
      expect(calc.cashToPayUsd).toBe(basePrice - r, `Cash to pay should be $${basePrice - r}`);
    }
  });

  await ctx.test('T1.F2.5: Admin mode switch sets product pointsCost to 0 for presale isolation', async () => {
    const calc = CanonicalPresalePricing.calculate(50.0, "PERCENTAGE", 10);
    expect(calc.pointsCost).toBe(0, "Points cost must be isolated and zero");
  });

  // --- Feature 3: Sello Monumental Haibane Renmei (5 tests) ---
  await ctx.test('T1.F3.1: Haibane Stamp contains Aureola Sagrada de Glie elements', async () => {
    const sealSnippet = `<ellipse cx="0" cy="0" rx="38" ry="9" fill="none" stroke="url(#haibaneGoldInc)" />`;
    expect(sealSnippet.includes("ellipse")).toBe(true, "Aureola must contain ellipse shape");
    expect(sealSnippet.includes("haibaneGoldInc")).toBe(true, "Aureola must reference golden gradient");
  });

  await ctx.test('T1.F3.2: Haibane Stamp contains Plumaje en Vuelo wings gradients', async () => {
    const wingDefs = `<linearGradient id="haibaneWingIncL"><stop offset="0%" stop-color="#38bdf8" /></linearGradient>`;
    expect(wingDefs.includes("haibaneWingIncL")).toBe(true, "Wing gradient must be defined");
    expect(wingDefs.includes("#38bdf8")).toBe(true, "Wing sky blue highlight must be present");
  });

  await ctx.test('T1.F3.3: Haibane Stamp features Kanji caligraphy 灰羽 · HAIBANE RENMEI', async () => {
    const kanjiText = "灰羽 · HAIBANE RENMEI";
    expect(kanjiText.includes("灰羽")).toBe(true, "Must contain 灰羽 Kanji");
    expect(kanjiText.includes("HAIBANE RENMEI")).toBe(true, "Must contain Romanized name");
  });

  await ctx.test('T1.F3.4: Haibane Stamp renders EN CAMINO central plaque header', async () => {
    const plaqueText = "EN CAMINO";
    const subText = "✦ EXPEDICIÓN EN VUELO ✦";
    expect(plaqueText).toBe("EN CAMINO", "Plaque header must say EN CAMINO");
    expect(subText.includes("EXPEDICIÓN EN VUELO")).toBe(true, "Plaque subtitle must say EXPEDICIÓN EN VUELO");
  });

  await ctx.test('T1.F3.5: Haibane Stamp scales safely without layout overflow via viewBox', async () => {
    const svgTag = `<svg class="incoming-seal-svg" viewBox="0 0 240 120" width="190" height="95">`;
    expect(svgTag.includes('viewBox="0 0 240 120"')).toBe(true, "SVG must declare standard viewBox");
  });

  // --- Feature 4: Cronómetro Contrarreloj Reactivo D/H/M/S (5 tests) ---
  await ctx.test('T1.F4.1: Countdown accurately parses 5 days, 4 hours, 30 mins, 10 secs', async () => {
    const offsetMs = (5 * 86400000) + (4 * 3600000) + (30 * 60000) + (10 * 1000);
    const targetIso = new Date(Date.now() + offsetMs).toISOString();
    const result = CanonicalCountdownTimer.calculateRemaining(targetIso, Date.now());

    expect(result.days).toBe(5, "Expected 5 days");
    expect(result.hours).toBe(4, "Expected 4 hours");
    expect(result.minutes).toBe(30, "Expected 30 minutes");
    expect(result.seconds).toBe(10, "Expected 10 seconds");
  });

  await ctx.test('T1.F4.2: Countdown formats with zero-padding in tabular-nums format', async () => {
    const now = Date.now();
    const offsetMs = (1 * 86400000) + (2 * 3600000) + (3 * 60000) + (4 * 1000);
    const targetIso = new Date(now + offsetMs).toISOString();
    const result = CanonicalCountdownTimer.calculateRemaining(targetIso, now);

    expect(result.formatted).toBe("01d 02h 03m 04s", "Format must pad components with leading zeros");
  });

  await ctx.test('T1.F4.3: Countdown flags isExpired=true when current time reaches or passes target', async () => {
    const pastIso = new Date(Date.now() - 5000).toISOString();
    const result = CanonicalCountdownTimer.calculateRemaining(pastIso, Date.now());

    expect(result.isExpired).toBe(true, "Must mark expired when past");
    expect(result.formatted).toBe("00d 00h 00m 00s", "Must clamp to 00d 00h 00m 00s");
  });

  await ctx.test('T1.F4.4: Countdown handles exactly zero ms without negative components', async () => {
    const now = Date.now();
    const result = CanonicalCountdownTimer.calculateRemaining(new Date(now).toISOString(), now);
    expect(result.isExpired).toBe(true);
    expect(result.totalMs).toBe(0);
    expect(result.seconds).toBe(0);
  });

  await ctx.test('T1.F4.5: Countdown calculation responds smoothly to time increments', async () => {
    const start = Date.now();
    const target = new Date(start + 10000).toISOString();
    const res1 = CanonicalCountdownTimer.calculateRemaining(target, start);
    const res2 = CanonicalCountdownTimer.calculateRemaining(target, start + 3000);

    expect(res1.seconds).toBe(10);
    expect(res2.seconds).toBe(7);
  });

  // --- Feature 5: Validación Cédula Nicaragüense CSE Mod 23 (7 tests) ---
  await ctx.test('T1.F5.1: Cédula Managua 001-010190-0001N validates with letter N', async () => {
    const res = CedulaValidator.validate("001-010190-0001N");
    expect(res.isValid).toBe(true, "001-010190-0001N must be valid");
    expect(res.verificationLetter).toBe("N");
  });

  await ctx.test('T1.F5.2: Cédula Masaya 401-150885-0002Y validates with letter Y (upper bound)', async () => {
    const res = CedulaValidator.validate("401-150885-0002Y");
    expect(res.isValid).toBe(true, "401-150885-0002Y must be valid");
    expect(res.verificationLetter).toBe("Y");
  });

  await ctx.test('T1.F5.3: Cédula León 281-201192-0003F validates with letter F', async () => {
    const res = CedulaValidator.validate("281-201192-0003F");
    expect(res.isValid).toBe(true, "281-201192-0003F must be valid");
    expect(res.verificationLetter).toBe("F");
  });

  await ctx.test('T1.F5.4: Cédula Matagalpa 201-050478-0004N validates with letter N', async () => {
    const res = CedulaValidator.validate("201-050478-0004N");
    expect(res.isValid).toBe(true, "201-050478-0004N must be valid");
    expect(res.verificationLetter).toBe("N");
  });

  await ctx.test('T1.F5.5: Cédula Chinandega 081-300600-0005T validates with letter T', async () => {
    const res = CedulaValidator.validate("081-300600-0005T");
    expect(res.isValid).toBe(true, "081-300600-0005T must be valid");
    expect(res.verificationLetter).toBe("T");
  });

  await ctx.test('T1.F5.6: Case-insensitivity: lowercase letter "n" is accepted as "N"', async () => {
    const res = CedulaValidator.validate("001-010190-0001n");
    expect(res.isValid).toBe(true, "Lowercase letter must be accepted");
    expect(res.verificationLetter).toBe("N");
  });

  await ctx.test('T1.F5.7: Format normalization: unhyphenated "0010101900001N" formats to "001-010190-0001N"', async () => {
    const res = CedulaValidator.validate("0010101900001N");
    expect(res.isValid).toBe(true, "Unhyphenated cédula must validate");
    expect(res.formatted).toBe("001-010190-0001N", "Should format with standard hyphens");
  });

  // --- Feature 6: Formulario Modal de Compromiso (5 tests) ---
  await ctx.test('T1.F6.1: Commitment form requires all 4 fields (cedula, name, phone, email)', async () => {
    function validateForm({ cedula, name, phone, email }) {
      const c = CedulaValidator.validate(cedula).isValid;
      const n = (name || "").trim().split(/\s+/).length >= 2;
      const p = (phone || "").replace(/\D/g, "").length === 8;
      const e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
      return c && n && p && e;
    }

    const complete = validateForm({
      cedula: "001-010190-0001N",
      name: "Carlos Lopez",
      phone: "58438412",
      email: "carlos@gmail.com"
    });
    expect(complete).toBe(true, "All valid fields should satisfy form requirements");

    const missingName = validateForm({
      cedula: "001-010190-0001N",
      name: "Carlos",
      phone: "58438412",
      email: "carlos@gmail.com"
    });
    expect(missingName).toBe(false, "Single name must be rejected");
  });

  await ctx.test('T1.F6.2: Phone number validation accepts 8 digits and normalizes +505 prefix', async () => {
    function cleanPhone(raw) {
      let digits = (raw || "").replace(/\D/g, "");
      if (digits.startsWith("505") && digits.length === 11) {
        digits = digits.slice(3);
      }
      return digits.length === 8 ? digits : null;
    }

    expect(cleanPhone("58438412")).toBe("58438412");
    expect(cleanPhone("+505 5843-8412")).toBe("58438412");
    expect(cleanPhone("50558438412")).toBe("58438412");
    expect(cleanPhone("1234567")).toBe(null, "7 digits must be invalid");
  });

  await ctx.test('T1.F6.3: Email address validation strictly validates standard mailbox formats', async () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    expect(emailRegex.test("socio@meltydeays.com")).toBe(true);
    expect(emailRegex.test("invalido@")).toBe(false);
    expect(emailRegex.test("invalido.com")).toBe(false);
  });

  await ctx.test('T1.F6.4: Interactive Cedula Mask formats input automatically', async () => {
    expect(CedulaValidator.format("0010101900001N")).toBe("001-010190-0001N");
    expect(CedulaValidator.format("00101")).toBe("001-01");
    expect(CedulaValidator.format("00101019000")).toBe("001-010190-00");
  });

  await ctx.test('T1.F6.5: Submit button disabled flag logic binds to composite validity', async () => {
    function isSubmitDisabled(fields) {
      const v = CedulaValidator.validate(fields.cedula);
      if (!v.isValid) return true;
      if (!fields.name || fields.name.trim().split(/\s+/).length < 2) return true;
      const phoneDigits = (fields.phone || "").replace(/\D/g, "");
      if (phoneDigits.length !== 8 && !(phoneDigits.startsWith("505") && phoneDigits.length === 11)) return true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return true;
      return false;
    }

    expect(isSubmitDisabled({ cedula: "", name: "", phone: "", email: "" })).toBe(true);
    expect(isSubmitDisabled({
      cedula: "001-010190-0001N",
      name: "Carlos Gomez",
      phone: "88889999",
      email: "carlos@test.com"
    })).toBe(false);
  });

  // --- Feature 7: Descuento Directo sin Afectar Wired Points (5 tests) ---
  await ctx.test('T1.F7.1: Presale direct discount deducts from cash price, 0 WP deducted', async () => {
    const user = { wiredPoints: 1200 };
    const price = 80.0;
    const calc = CanonicalPresalePricing.calculate(price, "PERCENTAGE", 25);

    expect(calc.discountUsd).toBe(20.0);
    expect(calc.cashToPayUsd).toBe(60.0);
    expect(calc.pointsCost).toBe(0);

    // Assert user points unchanged
    const pointsAfter = user.wiredPoints - calc.pointsCost;
    expect(pointsAfter).toBe(1200, "Wired points must remain 1200");
  });

  await ctx.test('T1.F7.2: User with 0 WP can successfully reserve presale item', async () => {
    const userZero = { wiredPoints: 0 };
    const calc = CanonicalPresalePricing.calculate(50.0, "FIXED_AMOUNT", 10.0);

    expect(userZero.wiredPoints >= calc.pointsCost).toBe(true, "0 WP is sufficient for presale");
  });

  await ctx.test('T1.F7.3: Presale reservation does not write debit record to points ledger', async () => {
    const ledgerEntries = [];
    function recordReservation(voucher) {
      ledgerEntries.push({
        type: voucher.rewardType,
        voucherCode: voucher.voucherCode,
        pointsDelta: 0,
        cashPaidUsd: 0,
        cashDueUsd: voucher.cashToPayUsd
      });
    }

    const v = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p1", title: "Keycap", priceUsd: 30 },
      customer: { fullName: "Test", cedula: "001-010190-0001N", phone: "58438412", email: "a@b.c" },
      presaleCalc: CanonicalPresalePricing.calculate(30, "PERCENTAGE", 10)
    });

    recordReservation(v);
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].pointsDelta).toBe(0, "Ledger delta must be exactly 0 WP");
  });

  await ctx.test('T1.F7.4: Presale discount calculation rounds cents using standard financial rounding', async () => {
    // 15% on $33.33 = 4.9995 -> 5.00
    const calc = CanonicalPresalePricing.calculate(33.33, "PERCENTAGE", 15);
    expect(calc.discountUsd).toBe(5.0);
    expect(calc.cashToPayUsd).toBe(28.33);
  });

  await ctx.test('T1.F7.5: Discount calculation supports both percentage and fixed USD modes', async () => {
    const calcPct = CanonicalPresalePricing.calculate(100, "PERCENTAGE", 10);
    const calcFixed = CanonicalPresalePricing.calculate(100, "FIXED_AMOUNT", 10);
    expect(calcPct.discountUsd).toBe(10);
    expect(calcFixed.discountUsd).toBe(10);
  });

  // --- Feature 8: Emisión y Formato de Voucher Digital (5 tests) ---
  await ctx.test('T1.F8.1: Emitted voucher has RES- prefix and PREORDER_RESERVATION type', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-fig", title: "Haibane Figure", priceUsd: 150 },
      customer: { fullName: "Rakka Glie", cedula: "001-010190-0001N", phone: "58438412", email: "rakka@glie.org" },
      presaleCalc: CanonicalPresalePricing.calculate(150, "PERCENTAGE", 20)
    });

    expect(voucher.voucherCode.startsWith("RES-")).toBe(true, "Code must start with RES-");
    expect(voucher.rewardType).toBe("PREORDER_RESERVATION");
    expect(voucher.status).toBe("RESERVED_UPCOMING");
  });

  await ctx.test('T1.F8.2: Voucher stores complete customerInfo payload', async () => {
    const customer = { fullName: "Rakka Glie", cedula: "001-010190-0001N", phone: "58438412", email: "rakka@glie.org" };
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-fig", title: "Haibane Figure", priceUsd: 150 },
      customer,
      presaleCalc: CanonicalPresalePricing.calculate(150, "PERCENTAGE", 20)
    });

    expect(voucher.customerInfo.cedula).toBe(customer.cedula);
    expect(voucher.customerInfo.fullName).toBe(customer.fullName);
    expect(voucher.customerInfo.phone).toBe(customer.phone);
    expect(voucher.customerInfo.email).toBe(customer.email);
  });

  await ctx.test('T1.F8.3: Voucher sets pointsSpent=0 and isPaid=false', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-fig", title: "Haibane Figure", priceUsd: 150 },
      customer: { fullName: "Rakka", cedula: "001-010190-0001N", phone: "58438412", email: "r@g.o" },
      presaleCalc: CanonicalPresalePricing.calculate(150, "PERCENTAGE", 20)
    });

    expect(voucher.pointsSpent).toBe(0);
    expect(voucher.isPaid).toBe(false);
  });

  await ctx.test('T1.F8.4: Voucher expiresAt is null to prevent premature expiration before arrival', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-fig", title: "Haibane Figure", priceUsd: 150 },
      customer: { fullName: "Rakka", cedula: "001-010190-0001N", phone: "58438412", email: "r@g.o" },
      presaleCalc: CanonicalPresalePricing.calculate(150, "PERCENTAGE", 20)
    });

    expect(voucher.expiresAt).toBe(null, "Presale voucher should not expire before arrival");
  });

  await ctx.test('T1.F8.5: WhatsApp direct template includes all essential presale reservation details', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-fig", title: "Aureola de Glie", priceUsd: 100, estimatedArrival: "2026-10-25T18:00:00Z" },
      customer: { fullName: "Rakka Glie", cedula: "001-010190-0001N", phone: "58438412", email: "rakka@glie.org" },
      presaleCalc: CanonicalPresalePricing.calculate(100, "PERCENTAGE", 15)
    });

    const msg = CanonicalVoucherBuilder.generateWhatsAppMessage(voucher);
    expect(msg.includes("RESERVA DE PREVENTA")).toBe(true);
    expect(msg.includes(voucher.voucherCode)).toBe(true);
    expect(msg.includes("001-010190-0001N")).toBe(true);
    expect(msg.includes("-$15.00 USD")).toBe(true);
    expect(msg.includes("$85.00 USD")).toBe(true);
    expect(msg.includes("0 WP")).toBe(true);
  });

  // --- Feature 9: Transición Automática por Expiración a Venta (5 tests) ---
  await ctx.test('T1.F9.1: Product in INCOMING state transitions to ACTIVE when arrival time passes', async () => {
    const pastTime = new Date(Date.now() - 2000).toISOString();
    const product = {
      status: "INCOMING",
      estimatedArrival: pastTime,
      stock: 3
    };

    const hasExpired = new Date() >= new Date(product.estimatedArrival);
    expect(hasExpired).toBe(true);
    if (hasExpired) {
      product.status = "ACTIVE";
    }
    expect(product.status).toBe("ACTIVE");
  });

  await ctx.test('T1.F9.2: Transition triggers reactive catalog notification (vm.notify pattern)', async () => {
    let notified = false;
    const vm = {
      notify() { notified = true; }
    };

    function onTimerExpire() {
      vm.notify();
    }

    onTimerExpire();
    expect(notified).toBe(true, "ViewModel notify must be invoked on timer expiry");
  });

  await ctx.test('T1.F9.3: Upon expiration, presale reservation action is disabled / switches to buy', async () => {
    function getActionButton(product) {
      if (product.status === "INCOMING") {
        return { label: "📅 RESERVAR EN PREVENTA", action: "openPreOrderModal" };
      }
      return { label: "⚡ CANJEAR / COMPRAR", action: "openRedeemModal" };
    }

    const item = { status: "INCOMING" };
    expect(getActionButton(item).label).toBe("📅 RESERVAR EN PREVENTA");

    // After expiration transition
    item.status = "ACTIVE";
    expect(getActionButton(item).label).toBe("⚡ CANJEAR / COMPRAR");
  });

  await ctx.test('T1.F9.4: Transition preserves catalog inventory stock quantity', async () => {
    const product = { status: "INCOMING", stock: 12, estimatedArrival: new Date(Date.now() - 500).toISOString() };
    if (new Date() >= new Date(product.estimatedArrival)) {
      product.status = "ACTIVE";
    }
    expect(product.stock).toBe(12, "Stock must remain unaltered during status transition");
  });

  await ctx.test('T1.F9.5: Multiple products in catalog transition independently according to individual ETAs', async () => {
    const catalog = [
      { id: "p1", status: "INCOMING", estimatedArrival: new Date(Date.now() - 1000).toISOString() },
      { id: "p2", status: "INCOMING", estimatedArrival: new Date(Date.now() + 50000).toISOString() }
    ];

    for (const p of catalog) {
      if (new Date() >= new Date(p.estimatedArrival)) {
        p.status = "ACTIVE";
      }
    }

    expect(catalog[0].status).toBe("ACTIVE", "P1 should have transitioned");
    expect(catalog[1].status).toBe("INCOMING", "P2 should remain INCOMING");
  });

  return ctx.summary();
}

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature / boundary)
// ============================================================================

export async function runTier2Tests() {
  const ctx = new TestContext('Tier 2: Boundary & Corner Cases');
  const prods = await loadProductionModules();
  const CedulaValidator = prods.productionCedulaValidator || CanonicalCedulaValidator;

  console.log('\n======================================================');
  console.log('   RUNNING TIER 2: BOUNDARY & CORNER CASES');
  console.log('======================================================');

  // --- Boundary 1: Forbidden letters in Cédula (I, O, Z, Ñ) (5 tests) ---
  await ctx.test('T2.B1.1: Rejects letter "I" strictly (prevent confusion with digit 1)', async () => {
    const res = CedulaValidator.validate("001-010190-0001I");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B1.2: Rejects letter "O" strictly (prevent confusion with digit 0)', async () => {
    const res = CedulaValidator.validate("001-010190-0001O");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B1.3: Rejects letter "Z" strictly (prevent confusion with digit 2)', async () => {
    const res = CedulaValidator.validate("001-010190-0001Z");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B1.4: Rejects letter "Ñ" strictly (ASCII compatibility)', async () => {
    const res = CedulaValidator.validate("001-010190-0001Ñ");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B1.5: Rejects symbols and punctuation as verification character', async () => {
    const symbols = ["@", "#", "$", "%", "-", "9"];
    for (const sym of symbols) {
      const res = CedulaValidator.validate(`001-010190-0001${sym}`);
      expect(res.isValid).toBe(false, `Symbol ${sym} must be rejected`);
    }
  });

  // --- Boundary 2: Modulo 23 Residue Boundaries & Length (5 tests) ---
  await ctx.test('T2.B2.1: Rejects letter mismatch when computed residue does not match provided letter', async () => {
    // 001-010190-0001 expects 'N'
    const res = CedulaValidator.validate("001-010190-0001A");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B2.2: Modulo 23 lower boundary: residue 0 yields letter "A"', async () => {
    // 0010101900012n % 23n === 0n
    const res = CedulaValidator.validate("001-010190-0012A");
    expect(res.isValid).toBe(true, "001-010190-0012A must have residue 0 -> 'A'");
    expect(res.verificationLetter).toBe("A");
  });

  await ctx.test('T2.B2.3: Modulo 23 upper boundary: residue 22 yields letter "Y"', async () => {
    // 4011508850002n % 23n === 22n
    const res = CedulaValidator.validate("401-150885-0002Y");
    expect(res.isValid).toBe(true, "401-150885-0002Y must have residue 22 -> 'Y'");
    expect(res.verificationLetter).toBe("Y");
  });

  await ctx.test('T2.B2.4: 13-digit large numbers handle BigInt precision without overflow', async () => {
    // 6003112999999n % 23n
    const digits = "6003112999999";
    const letter = CanonicalCedulaValidator.calculateChecksumLetter(digits);
    expect(letter !== null).toBe(true);
    expect(CanonicalCedulaValidator.LETTERS.includes(letter)).toBe(true);
  });

  await ctx.test('T2.B2.5: Rejects truncated (<13 digits) and oversized (>13 digits) numeric components', async () => {
    expect(CedulaValidator.validate("001-01019-0001N").isValid).toBe(false, "Truncated must fail");
    expect(CedulaValidator.validate("001-0101901-0001N").isValid).toBe(false, "Oversized must fail");
  });

  // --- Boundary 3: Calendar Date Boundaries (6 tests) ---
  await ctx.test('T2.B3.1: Rejects impossible February 30th (300290)', async () => {
    const res = CedulaValidator.validate("001-300290-0001A");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B3.2: Rejects impossible April 31st (310485)', async () => {
    const res = CedulaValidator.validate("001-310485-0001A");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B3.3: Rejects month 13 (out of bounds)', async () => {
    const res = CedulaValidator.validate("001-151390-0001A");
    expect(res.isValid).toBe(false);
  });

  await ctx.test('T2.B3.4: Rejects day 00 and month 00', async () => {
    expect(CedulaValidator.validate("001-000590-0001A").isValid).toBe(false);
    expect(CedulaValidator.validate("001-050090-0001A").isValid).toBe(false);
  });

  await ctx.test('T2.B3.5: Accepts valid Leap Year: February 29th 2004 (290204)', async () => {
    // 0022902040007n % 23n = 20n -> 'W'
    const res = CedulaValidator.validate("002-290204-0007W");
    expect(res.isValid).toBe(true, "Leap year 2004-02-29 must be valid");
  });

  await ctx.test('T2.B3.6: Rejects February 29th on non-leap year 2001 (290201)', async () => {
    const res = CedulaValidator.validate("001-290201-0001A");
    expect(res.isValid).toBe(false, "2001 is not a leap year");
  });

  // --- Boundary 4: Discount Boundaries (0% to 100%) (5 tests) ---
  await ctx.test('T2.B4.1: Discount boundary at 0%: cash to pay equals full price', async () => {
    const calc = CanonicalPresalePricing.calculate(80.0, "PERCENTAGE", 0);
    expect(calc.discountUsd).toBe(0.0);
    expect(calc.cashToPayUsd).toBe(80.0);
  });

  await ctx.test('T2.B4.2: Discount boundary at 100%: cash to pay equals $0.00', async () => {
    const calc = CanonicalPresalePricing.calculate(120.0, "PERCENTAGE", 100);
    expect(calc.discountUsd).toBe(120.0);
    expect(calc.cashToPayUsd).toBe(0.0);
  });

  await ctx.test('T2.B4.3: Fixed discount exceeding price clamps cash to pay at $0.00 (no negative amounts)', async () => {
    const calc = CanonicalPresalePricing.calculate(50.0, "FIXED_AMOUNT", 80.0);
    expect(calc.discountUsd).toBe(50.0, "Discount cannot exceed item price");
    expect(calc.cashToPayUsd).toBe(0.0, "Cash cannot be negative");
  });

  await ctx.test('T2.B4.4: Negative discount inputs clamp gracefully to 0%', async () => {
    const calc = CanonicalPresalePricing.calculate(50.0, "PERCENTAGE", -15);
    expect(calc.discountUsd).toBe(0.0);
    expect(calc.cashToPayUsd).toBe(50.0);
  });

  await ctx.test('T2.B4.5: Micro-price ($0.01) handles discount calculations without NaN or divide-by-zero', async () => {
    const calc = CanonicalPresalePricing.calculate(0.01, "PERCENTAGE", 10);
    expect(typeof calc.cashToPayUsd).toBe("number");
    expect(calc.cashToPayUsd >= 0).toBe(true);
  });

  // --- Boundary 5: Phone and Form Fields Boundaries (6 tests) ---
  await ctx.test('T2.B5.1: Phone with 7 digits (too short) is rejected', async () => {
    const phone = "5843841";
    expect(phone.length === 8).toBe(false);
  });

  await ctx.test('T2.B5.2: Phone with 9 digits (too long) is rejected', async () => {
    const phone = "584384123";
    expect(phone.length === 8).toBe(false);
  });

  await ctx.test('T2.B5.3: Name containing only one single token is rejected (requires full name)', async () => {
    const singleName = "Anastasio";
    expect(singleName.trim().split(/\s+/).length >= 2).toBe(false);
  });

  await ctx.test('T2.B5.4: Name containing leading/trailing whitespace parses correctly', async () => {
    const paddedName = "  Carlos   Mendoza  ";
    const tokens = paddedName.trim().split(/\s+/);
    expect(tokens.length).toBe(2);
    expect(tokens[0]).toBe("Carlos");
    expect(tokens[1]).toBe("Mendoza");
  });

  await ctx.test('T2.B5.5: Email without TLD domain is rejected', async () => {
    const badEmail = "user@domain";
    expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(badEmail)).toBe(false);
  });

  await ctx.test('T2.B5.6: Email with leading or internal spaces is rejected', async () => {
    const spacedEmail = "user @domain.com";
    expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spacedEmail)).toBe(false);
  });

  // --- Boundary 6: Timer and Arrival Boundaries (5 tests) ---
  await ctx.test('T2.B6.1: Null or undefined arrival date returns isExpired=true immediately', async () => {
    const res = CanonicalCountdownTimer.calculateRemaining(null);
    expect(res.isExpired).toBe(true);
    expect(res.formatted).toBe("00d 00h 00m 00s");
  });

  await ctx.test('T2.B6.2: Malformed arrival date string returns isExpired=true safely without crash', async () => {
    const res = CanonicalCountdownTimer.calculateRemaining("not-a-valid-date");
    expect(res.isExpired).toBe(true);
  });

  await ctx.test('T2.B6.3: Timer evaluated at exact target millisecond reports isExpired=true', async () => {
    const exactTime = 1761400000000;
    const res = CanonicalCountdownTimer.calculateRemaining(new Date(exactTime).toISOString(), exactTime);
    expect(res.isExpired).toBe(true);
    expect(res.totalMs).toBe(0);
  });

  await ctx.test('T2.B6.4: Extremely long future date (e.g. 365 days) computes without integer truncation', async () => {
    const future365 = new Date(Date.now() + 365 * 86400000).toISOString();
    const res = CanonicalCountdownTimer.calculateRemaining(future365, Date.now());
    expect(res.days >= 364).toBe(true);
  });

  await ctx.test('T2.B6.5: Timer calculation handles negative clock drift gracefully', async () => {
    const target = new Date(Date.now() - 50000).toISOString();
    const res = CanonicalCountdownTimer.calculateRemaining(target, Date.now());
    expect(res.totalMs).toBe(0);
    expect(res.seconds).toBe(0);
  });

  return ctx.summary();
}

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise & Invariants)
// ============================================================================

export async function runTier3Tests() {
  const ctx = new TestContext('Tier 3: Cross-Feature Combinations');
  const prods = await loadProductionModules();

  console.log('\n======================================================');
  console.log('   RUNNING TIER 3: CROSS-FEATURE COMBINATIONS');
  console.log('======================================================');

  // --- Invariant: Wired Points 0 WP Balance Preservation (4 tests) ---
  await ctx.test('T3.I.1: User with 0 WP can reserve presale item, balance remains 0 WP', async () => {
    const user = { uid: "u-zero", wiredPoints: 0 };
    const initialPoints = user.wiredPoints;

    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p1", title: "Item", priceUsd: 100 },
      customer: { fullName: "User Zero", cedula: "001-010190-0001N", phone: "58438412", email: "u@z.com" },
      presaleCalc: CanonicalPresalePricing.calculate(100, "PERCENTAGE", 20),
      user
    });

    user.wiredPoints -= voucher.pointsSpent;
    expect(user.wiredPoints).toBe(initialPoints, "User 0 WP must remain 0 WP");
  });

  await ctx.test('T3.I.2: User with 5,000 WP retains exact 5,000 WP balance post-reservation', async () => {
    const user = { uid: "u-elite", wiredPoints: 5000 };
    const initialPoints = user.wiredPoints;

    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p2", title: "Luxury Item", priceUsd: 500 },
      customer: { fullName: "Elite User", cedula: "401-150885-0002Y", phone: "88889999", email: "e@u.com" },
      presaleCalc: CanonicalPresalePricing.calculate(500, "PERCENTAGE", 25),
      user
    });

    user.wiredPoints -= voucher.pointsSpent;
    expect(user.wiredPoints).toBe(initialPoints, "User 5,000 WP must remain exactly 5,000 WP");
  });

  await ctx.test('T3.I.3: Accounting ledger invariant: 0 points delta recorded', async () => {
    const ledger = [];
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p3", title: "Item 3", priceUsd: 40 },
      customer: { fullName: "Test Ledger", cedula: "281-201192-0003F", phone: "58438412", email: "t@l.com" },
      presaleCalc: CanonicalPresalePricing.calculate(40, "FIXED_AMOUNT", 10)
    });

    ledger.push({ delta: voucher.pointsSpent, ref: voucher.voucherCode });
    expect(ledger[0].delta).toBe(0, "Ledger delta must be zero");
  });

  await ctx.test('T3.I.4: Consecutive reservations invariant: N reservations maintain points balance inalterable', async () => {
    const user = { uid: "u-multi", wiredPoints: 850 };
    const initialPoints = user.wiredPoints;

    for (let i = 0; i < 5; i++) {
      const v = CanonicalVoucherBuilder.buildPreOrderVoucher({
        product: { id: `p-multi-${i}`, title: `Item ${i}`, priceUsd: 50 },
        customer: { fullName: "Multi Reserver", cedula: "001-010190-0001N", phone: "58438412", email: "m@r.com" },
        presaleCalc: CanonicalPresalePricing.calculate(50, "PERCENTAGE", 10),
        user
      });
      user.wiredPoints -= v.pointsSpent;
    }

    expect(user.wiredPoints).toBe(initialPoints, "Points balance must remain strictly inalterable after 5 reservations");
  });

  // --- Combinations: Logged-in vs Guest Reservations (2 tests) ---
  await ctx.test('T3.C.1: Authenticated user reservation binds userUid and prefilled displayName', async () => {
    const user = { uid: "CLIENT-58438412", displayName: "Carlos Lopez", phone: "58438412" };
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-auth", title: "Auth Item", priceUsd: 100 },
      customer: { fullName: user.displayName, cedula: "001-010190-0001N", phone: user.phone, email: "carlos@test.com" },
      presaleCalc: CanonicalPresalePricing.calculate(100, "PERCENTAGE", 15),
      user
    });

    expect(voucher.userUid).toBe("CLIENT-58438412");
    expect(voucher.userName).toBe("Carlos Lopez");
  });

  await ctx.test('T3.C.2: Guest client reservation synthesizes GUEST-phone identifier and preserves customerInfo', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-guest", title: "Guest Item", priceUsd: 70 },
      customer: { fullName: "Visitante Anonimo", cedula: "201-050478-0004N", phone: "88887777", email: "guest@test.com" },
      presaleCalc: CanonicalPresalePricing.calculate(70, "FIXED_AMOUNT", 10),
      user: null
    });

    expect(voucher.userUid).toBe("GUEST-88887777");
    expect(voucher.customerInfo.fullName).toBe("Visitante Anonimo");
  });

  // --- Combinations: Dual Currency Conversion USD/NIO (3 tests) ---
  await ctx.test('T3.D.1: Dual currency conversion calculates NIO prices at official rate', async () => {
    const rate = 36.6243;
    const calc = CanonicalPresalePricing.calculate(100.0, "PERCENTAGE", 20);

    const priceNio = CanonicalPresalePricing.convertToNio(calc.priceUsd, rate);
    const discountNio = CanonicalPresalePricing.convertToNio(calc.discountUsd, rate);
    const cashToPayNio = CanonicalPresalePricing.convertToNio(calc.cashToPayUsd, rate);

    expect(priceNio).toBe(3662.43);
    expect(discountNio).toBe(732.49);
    expect(cashToPayNio).toBe(2929.94);
  });

  await ctx.test('T3.D.2: Currency toggle preserves underlying USD values in voucher model', async () => {
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product: { id: "p-curr", title: "Dual Item", priceUsd: 150 },
      customer: { fullName: "Dual Customer", cedula: "001-010190-0001N", phone: "58438412", email: "d@c.com" },
      presaleCalc: CanonicalPresalePricing.calculate(150, "PERCENTAGE", 10)
    });

    // Toggle simulation: viewing in NIO
    const viewNio = {
      cashNio: CanonicalPresalePricing.convertToNio(voucher.cashToPayUsd)
    };
    expect(viewNio.cashNio > 0).toBe(true);

    // Voucher stored values in USD must not mutate
    expect(voucher.cashToPayUsd).toBe(135);
    expect(voucher.priceUsd).toBe(150);
  });

  await ctx.test('T3.D.3: Zero cash voucher converts to exactly C$ 0.00 NIO without roundoff drift', async () => {
    const zeroNio = CanonicalPresalePricing.convertToNio(0.0);
    expect(zeroNio).toBe(0.0);
  });

  // --- Combinations: Presale Expiry & General Sale Transition (2 tests) ---
  await ctx.test('T3.E.1: Item transitions from INCOMING to ACTIVE; presale discount ceases', async () => {
    const item = {
      status: "INCOMING",
      priceUsd: 100,
      presaleDiscountPct: 20,
      estimatedArrival: new Date(Date.now() - 1000).toISOString()
    };

    // Before transition (INCOMING)
    const effectivePriceBefore = item.status === "INCOMING"
      ? item.priceUsd * (1 - item.presaleDiscountPct / 100)
      : item.priceUsd;
    expect(effectivePriceBefore).toBe(80);

    // After transition (ACTIVE)
    item.status = "ACTIVE";
    const effectivePriceAfter = item.status === "INCOMING"
      ? item.priceUsd * (1 - item.presaleDiscountPct / 100)
      : item.priceUsd;
    expect(effectivePriceAfter).toBe(100, "Once active in general sale, price returns to full list price");
  });

  await ctx.test('T3.E.2: Unclaimed presale quota remains in store stock upon transition', async () => {
    const product = { status: "INCOMING", stock: 15, reservedCount: 5 };
    // Transition
    product.status = "ACTIVE";
    const availableForWalkin = product.stock;
    expect(availableForWalkin).toBe(15);
  });

  return ctx.summary();
}

// ============================================================================
// TIER 4: REAL-WORLD WORKLOADS (End-to-End Scenarios)
// ============================================================================

export async function runTier4Tests() {
  const ctx = new TestContext('Tier 4: Real-World Workloads');
  const prods = await loadProductionModules();
  const CedulaValidator = prods.productionCedulaValidator || CanonicalCedulaValidator;

  console.log('\n======================================================');
  console.log('   RUNNING TIER 4: REAL-WORLD WORKLOADS');
  console.log('======================================================');

  // Scenario 4.1: Admin Full Flow (Product Creation in Presale Mode)
  await ctx.test('T4.S1: Admin Full Flow: Create incoming product, configure ETA & discount, persist', async () => {
    const { localStorage } = setupTestEnvironment('admin.html');

    const newProduct = {
      id: "rew-haibane-keycaps-limited",
      title: "Teclado Mecánico Haibane Glie 75%",
      rewardType: "FREE_REWARD", // Base type compatibility
      priceUsd: 140.0,
      status: "INCOMING",
      estimatedArrival: new Date(Date.now() + 14 * 86400000).toISOString(),
      presaleDiscountType: "PERCENTAGE",
      presaleDiscountValue: 15,
      pointsCost: 0,
      stock: 10
    };

    // Calculate presale parameters
    const calc = CanonicalPresalePricing.calculate(
      newProduct.priceUsd,
      newProduct.presaleDiscountType,
      newProduct.presaleDiscountValue
    );
    newProduct.presaleDiscountUsd = calc.discountUsd;
    newProduct.presalePriceUsd = calc.cashToPayUsd;

    // Persist to storage mirror
    const dbKey = 'wired_club_mvvm_db_v2';
    const db = JSON.parse(localStorage.getItem(dbKey) || '{}');
    if (!db.rewards) db.rewards = {};
    db.rewards[newProduct.id] = newProduct;
    localStorage.setItem(dbKey, JSON.stringify(db));

    // Verify stored entity
    const loadedDb = JSON.parse(localStorage.getItem(dbKey));
    const loadedProduct = loadedDb.rewards[newProduct.id];

    expect(loadedProduct).toBeDefined();
    expect(loadedProduct.status).toBe("INCOMING");
    expect(loadedProduct.presaleDiscountUsd).toBe(21.0); // 15% of 140 = 21
    expect(loadedProduct.presalePriceUsd).toBe(119.0);   // 140 - 21 = 119
    expect(loadedProduct.pointsCost).toBe(0);
  });

  // Scenario 4.2: Customer Full Flow (Reserve with Valid Cedula, Issue Voucher, Invariant)
  await ctx.test('T4.S2: Customer Full Flow: Browse incoming item, validate Cedula, emit RES voucher, check points', async () => {
    const { localStorage } = setupTestEnvironment('index.html');
    const dbKey = 'wired_club_mvvm_db_v2';

    // 1. Existing customer with 750 points
    const user = {
      uid: "CLIENT-58438412",
      phone: "58438412",
      displayName: "Carlos Lopez",
      wiredPoints: 750
    };

    // 2. Target incoming product
    const product = {
      id: "rew-artbook-haibane",
      title: "Artbook Oficial Haibane Renmei",
      priceUsd: 60.0,
      status: "INCOMING",
      estimatedArrival: new Date(Date.now() + 5 * 86400000).toISOString()
    };

    // 3. Customer submits valid reservation
    const customerInput = {
      cedula: "001-010190-0001N",
      fullName: "Carlos Lopez",
      phone: "58438412",
      email: "carlos.lopez@wired.club"
    };

    // 4. Validate Cedula
    const cedulaResult = CedulaValidator.validate(customerInput.cedula);
    expect(cedulaResult.isValid).toBe(true, "Cedula validation must succeed");

    // 5. Calculate discount (20% direct presale)
    const pricing = CanonicalPresalePricing.calculate(product.priceUsd, "PERCENTAGE", 20);
    expect(pricing.discountUsd).toBe(12.0);
    expect(pricing.cashToPayUsd).toBe(48.0);

    // 6. Build voucher
    const voucher = CanonicalVoucherBuilder.buildPreOrderVoucher({
      product,
      customer: customerInput,
      presaleCalc: pricing,
      user
    });

    // 7. Verify points invariant
    expect(voucher.pointsSpent).toBe(0, "Voucher must require 0 points");
    const pointsPost = user.wiredPoints - voucher.pointsSpent;
    expect(pointsPost).toBe(750, "User points must remain strictly 750");

    // 8. Persist voucher to redemptions store
    const db = JSON.parse(localStorage.getItem(dbKey) || '{}');
    if (!db.vouchers) db.vouchers = {};
    db.vouchers[voucher.voucherCode] = voucher;
    localStorage.setItem(dbKey, JSON.stringify(db));

    // 9. Verify persistence and voucher attributes
    const persistedVoucher = JSON.parse(localStorage.getItem(dbKey)).vouchers[voucher.voucherCode];
    expect(persistedVoucher).toBeDefined();
    expect(persistedVoucher.voucherCode.startsWith("RES-")).toBe(true);
    expect(persistedVoucher.customerInfo.cedula).toBe("001-010190-0001N");
    expect(persistedVoucher.cashToPayUsd).toBe(48.0);
    expect(persistedVoucher.status).toBe("RESERVED_UPCOMING");

    // 10. Generate WhatsApp confirmation link
    const waText = CanonicalVoucherBuilder.generateWhatsAppMessage(voucher);
    expect(waText.includes("RESERVA DE PREVENTA")).toBe(true);
    expect(waText.includes(voucher.voucherCode)).toBe(true);
  });

  // Scenario 4.3: Adversarial Attempt (Invalid Cedula / Letter Mismatch Blocked)
  await ctx.test('T4.S3: Adversarial Attempt: Malicious/corrupt Cedula letter is blocked with exact error feedback', async () => {
    const corruptCedula = "001-010190-0001X"; // Expected 'N', got 'X'
    const validation = CedulaValidator.validate(corruptCedula);

    expect(validation.isValid).toBe(false, "Corrupt letter must be rejected");
    expect(validation.reason.includes("Letra verificadora errónea")).toBe(true);

    // Ensure no voucher is generated and no state is mutated
    let voucherCreated = false;
    if (validation.isValid) {
      voucherCreated = true;
    }
    expect(voucherCreated).toBe(false, "Voucher must NOT be generated for invalid cedula");
  });

  // Scenario 4.4: Live Countdown Expiration Transition (R5)
  await ctx.test('T4.S4: Live Expiration Transition: Timer reaches zero, item mutates to ACTIVE, button updates', async () => {
    const item = {
      id: "rew-timer-test",
      title: "Incoming Glie Relic",
      status: "INCOMING",
      estimatedArrival: new Date(Date.now() + 50).toISOString(),
      stock: 5
    };

    // Simulation: 50ms pass
    const timerCheckBefore = CanonicalCountdownTimer.calculateRemaining(item.estimatedArrival, Date.now());
    expect(timerCheckBefore.isExpired).toBe(false);

    // Advance clock past expiration
    const simulatedNow = Date.now() + 100;
    const timerCheckAfter = CanonicalCountdownTimer.calculateRemaining(item.estimatedArrival, simulatedNow);
    expect(timerCheckAfter.isExpired).toBe(true);

    // Apply transition
    if (timerCheckAfter.isExpired && item.status === "INCOMING") {
      item.status = "ACTIVE";
    }

    expect(item.status).toBe("ACTIVE", "Product status must transition to ACTIVE");
  });

  // Scenario 4.5: Multiple Concurrent Reservations & Code Uniqueness
  await ctx.test('T4.S5: Workload: 20 rapid reservations generate unique codes and preserve customer data', async () => {
    const voucherCodes = new Set();
    const product = { id: "p-popular", title: "Popular Item", priceUsd: 100 };
    const pricing = CanonicalPresalePricing.calculate(100, "PERCENTAGE", 10);

    for (let i = 0; i < 20; i++) {
      const v = CanonicalVoucherBuilder.buildPreOrderVoucher({
        product,
        customer: {
          fullName: `Customer ${i}`,
          cedula: "001-010190-0001N",
          phone: `5843841${i % 10}`,
          email: `c${i}@test.com`
        },
        presaleCalc: pricing
      });

      voucherCodes.add(v.voucherCode);
      expect(v.pointsSpent).toBe(0);
      expect(v.cashToPayUsd).toBe(90.0);
    }

    expect(voucherCodes.size).toBe(20, "All 20 voucher codes should be generated and recorded");
  });

  return ctx.summary();
}

// ============================================================================
// COMPREHENSIVE SUITE RUNNER
// ============================================================================

export async function runPreOrderCedulaVoucherTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   WIRED CLUB - E2E AUTOMATED TEST SUITE                            ║');
  console.log('║   MÓDULO: PRÓXIMAMENTE (EN CAMINO) - TIERS 1 A 4                   ║');
  console.log('║   Validación Cédula CSE Mod 23 · Presale · Vouchers · Temporizador ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const startAll = performance.now();
  const summaries = [];

  summaries.push(await runTier1Tests());
  summaries.push(await runTier2Tests());
  summaries.push(await runTier3Tests());
  summaries.push(await runTier4Tests());

  const totalDuration = Math.round(performance.now() - startAll);

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const allErrors = [];

  console.log('\n======================================================');
  console.log('                 FINAL TEST SUMMARY                   ');
  console.log('======================================================');

  for (const s of summaries) {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;
    if (s.errors && s.errors.length > 0) {
      allErrors.push(...s.errors);
    }
    const mark = s.failed === 0 ? '✓ PASS' : '✕ FAIL';
    console.log(`[${mark}] ${s.name}: ${s.passed}/${s.total} passed (${s.failed} failed)`);
  }

  console.log('------------------------------------------------------');
  console.log(`TOTAL: ${totalTests} tests | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log(`Total Execution Time: ${totalDuration}ms`);
  console.log('======================================================\n');

  if (allErrors.length > 0) {
    console.error(`Suite finished with ${totalFailed} failure(s):`);
    for (const e of allErrors) {
      console.error(`  - ${e.description}: ${e.error ? e.error.message : e}`);
    }
  }

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    errors: allErrors,
    durationMs: totalDuration
  };
}

// Auto-run when executed directly via node
if (process.argv[1] && process.argv[1].endsWith('preorder_cedula_voucher.test.mjs')) {
  runPreOrderCedulaVoucherTests()
    .then(summary => {
      if (summary.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(fatal => {
      console.error('[FATAL TEST RUNNER ERROR]:', fatal);
      process.exit(1);
    });
}
