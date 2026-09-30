import fs from 'fs';
import { setupTestEnvironment } from './e2e/harness.mjs';

function getHandlers(html) {
  const regex = /\b(on[a-z]+)=["']([^"']+)["']/gi;
  const handlers = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    const call = m[2].trim();
    const fnNameMatch = call.match(/^([a-zA-Z0-9_$]+)\s*\(/);
    if (fnNameMatch) {
      const name = fnNameMatch[1];
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        handlers.add(name);
      }
    }
  }
  return Array.from(handlers);
}

async function verify() {
  console.log('=== AUDITORIA COMPLETA DE EVENT HANDLERS EN DOM ===');

  // 1. Audit index.html
  const clientHtml = fs.readFileSync('index.html', 'utf8');
  const clientHandlers = getHandlers(clientHtml);
  const { win: clientWin } = setupTestEnvironment('index.html');
  await import('../js/app.js?t=' + Date.now());
  clientWin.document.dispatchEvent({ type: 'DOMContentLoaded' });
  const missingClient = clientHandlers.filter(h => typeof clientWin[h] !== 'function');
  console.log(`[index.html] Total handlers inline: ${clientHandlers.length}`);
  if (missingClient.length > 0) {
    console.error(`[index.html] FALTAN HANDLERS:`, missingClient);
  } else {
    console.log(`[index.html] ✓ 100% de handlers expuestos y vinculados en window.`);
  }

  // 2. Audit admin.html
  const adminHtml = fs.readFileSync('admin.html', 'utf8');
  const adminHandlers = getHandlers(adminHtml);
  const { win: adminWin } = setupTestEnvironment('admin.html');
  await import('../js/admin-app.js?t=' + Date.now());
  adminWin.document.dispatchEvent({ type: 'DOMContentLoaded' });
  const missingAdmin = adminHandlers.filter(h => typeof adminWin[h] !== 'function');
  console.log(`[admin.html] Total handlers inline: ${adminHandlers.length}`);
  if (missingAdmin.length > 0) {
    console.error(`[admin.html] FALTAN HANDLERS:`, missingAdmin);
  } else {
    console.log(`[admin.html] ✓ 100% de handlers expuestos y vinculados en window.`);
  }

  if (missingClient.length === 0 && missingAdmin.length === 0) {
    console.log('\n>>> VERIFICACIÓN EXITOSA: ZERO HANDLERS ROTOS O INDEFINIDOS <<<');
  } else {
    process.exit(1);
  }
}

verify();
