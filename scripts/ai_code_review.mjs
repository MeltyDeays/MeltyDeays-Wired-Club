/**
 * scripts/ai_code_review.mjs
 * REVISOR DE CÓDIGO INTELIGENTE 24/7 (OMNIROUTE CLOUD)
 * Analiza el git diff en busca de regresiones, problemas de precios y ergonomía móvil.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isCi = process.argv.includes('--ci');
const OMNIROUTE_URL = 'https://omniroute-ai-gateway-u9zh.onrender.com/v1/chat/completions';
const API_KEY = process.env.OMNIROUTE_API_KEY || 'sk-bbe727d4356f358d-e5577d-28c89ab5';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   REVISOR DE CÓDIGO IA AUTOMATIZADO · THE WIRED CLUB       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function getGitDiff() {
  let diff = '';
  try {
    if (isCi) {
      // En CI (Pull Request o Push): comparar contra origin/main o commit previo
      try {
        diff = execSync('git diff origin/main...HEAD', { cwd: ROOT_DIR, encoding: 'utf8' });
      } catch {
        diff = execSync('git diff HEAD~1 HEAD', { cwd: ROOT_DIR, encoding: 'utf8' });
      }
    } else {
      // Local: cambios en working tree o staged
      diff = execSync('git diff HEAD', { cwd: ROOT_DIR, encoding: 'utf8' });
      if (!diff.trim()) {
        diff = execSync('git diff HEAD~1 HEAD', { cwd: ROOT_DIR, encoding: 'utf8' });
      }
    }
  } catch (err) {
    console.error('Error al obtener git diff:', err.message);
  }
  return diff.trim();
}

async function runReview() {
  const rawDiff = getGitDiff();

  if (!rawDiff) {
    const emptyMsg = '✅ Sin cambios detectados en el diff. El código se encuentra al día.';
    console.log(emptyMsg);
    if (isCi && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 🤖 Revisión IA de Código\n\n${emptyMsg}\n`);
    }
    return;
  }

  // Filtrar archivos no relevantes para optimizar tokens
  const lines = rawDiff.split('\n');
  const filteredLines = [];
  let skipCurrentFile = false;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      skipCurrentFile = line.includes('package-lock.json') || line.includes('.cache') || line.includes('.min.');
    }
    if (!skipCurrentFile) {
      filteredLines.push(line);
    }
  }

  // Truncar si excede 7500 caracteres
  let diffContent = filteredLines.join('\n');
  if (diffContent.length > 7500) {
    diffContent = diffContent.substring(0, 7500) + '\n\n[...diff truncado por límite de contexto...]';
  }

  console.log(`• Analizando diff de ${diffContent.length} caracteres con OmniRoute Cloud...`);

  const systemPrompt = `Eres un Ingeniero Principal de Software y Revisor de Código Automatizado para 'The Wired Club' (e-commerce PWA de tecnología, bimoneda USD/NIO, combos y catálogo interactivo).
Revisa el siguiente git diff y genera un reporte estrictamente técnico, conciso y objetivo en Markdown (máximo 12 líneas):
1. **Riesgos y Bugs:** ¿Hay algún fallo de lógica, cálculo o regresión?
2. **Precios y Datos:** ¿Los cálculos de combo, residuales o puntos se preservan correctamente?
3. **Ergonomía UI:** ¿Respeta responsive, áreas táctiles y auto-expansión sin overflow?
4. **Dictamen Final:** [APROBADO // CON PRECAUCIÓN // REQUIERE ATENCIÓN] con resumen de 1 línea.`;

  try {
    const res = await fetch(OMNIROUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'combo/free',
        max_tokens: 600,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analiza este git diff:\n\n\`\`\`diff\n${diffContent}\n\`\`\`` }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const reviewText = data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

    console.log('\n--- DICTAMEN DE REVISIÓN IA ---');
    console.log(reviewText);
    console.log('-------------------------------\n');

    // Si corre en CI, guardar reporte para GitHub Actions
    fs.writeFileSync(path.join(ROOT_DIR, 'ai-review-report.md'), reviewText, 'utf8');

    if (isCi && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### 🤖 Revisión IA de Código (The Wired Club)\n\n${reviewText}\n`
      );
    }
  } catch (err) {
    console.warn(`⚠️ Aviso: La revisión IA falló o no estuvo disponible (${err.message}). No bloquea la suite.`);
  }
}

runReview();
