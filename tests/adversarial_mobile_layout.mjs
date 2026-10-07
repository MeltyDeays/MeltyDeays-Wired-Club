import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/admin.html';
  const filePath = path.join(rootDir, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8999, async () => {
  console.log('Static server listening on http://localhost:8999');

  const debugPort = 9222;
  const edgeProc = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=360,800',
    'http://localhost:8999/admin.html'
  ]);

  let pageWsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://localhost:${debugPort}/json`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page' && p.url.includes('admin.html'));
      if (page && page.webSocketDebuggerUrl) {
        pageWsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!pageWsUrl) {
    console.error('Failed to get page WebSocket URL');
    edgeProc.kill();
    server.close();
    process.exit(1);
  }

  console.log('Connected to page WebSocket:', pageWsUrl);
  const ws = new WebSocket(pageWsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const reqId = id++;
      pending.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  await new Promise((r) => (ws.onopen = r));

  async function evalExpr(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      console.error('CDP Eval Exception:', res.exceptionDetails);
    }
    return res.result ? res.result.value : null;
  }

  // Set device metrics
  async function testViewport(width, height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));

    return await evalExpr(`(() => {
      const pinInput = document.getElementById("input-admin-pin");
      if (pinInput) pinInput.value = "110805";
      if (typeof window.submitAdminPin === 'function') {
        window.submitAdminPin();
      }
      if (typeof window.switchAdminTab === 'function') {
        window.switchAdminTab('invoices');
      }
      const bodyScrollWidth = document.body.scrollWidth;
      const windowWidth = window.innerWidth;
      const scrollOverflow = bodyScrollWidth > windowWidth;

      // Buttons
      const btnAll = document.getElementById('btn-filter-all');
      const btnS1 = document.getElementById('btn-filter-s1');
      const btnS2 = document.getElementById('btn-filter-s2');
      const btnS3 = document.getElementById('btn-filter-s3');
      const lainContainer = document.querySelector('.lain-series-filter-group');

      const cRect = lainContainer ? lainContainer.getBoundingClientRect() : null;
      const rAll = btnAll ? btnAll.getBoundingClientRect() : null;
      const rS1 = btnS1 ? btnS1.getBoundingClientRect() : null;
      const rS2 = btnS2 ? btnS2.getBoundingClientRect() : null;
      const rS3 = btnS3 ? btnS3.getBoundingClientRect() : null;

      // Selects focus styles
      const selects = [
        'sort-tokens-select',
        'sort-catalog-select',
        'sort-vouchers-select',
        'sort-users-select'
      ];
      const selectStyles = {};
      for (const id of selects) {
        const el = document.getElementById(id);
        if (el) {
          el.focus();
          const cs = window.getComputedStyle(el);
          selectStyles[id] = {
            borderColor: cs.borderColor,
            boxShadow: cs.boxShadow,
            width: cs.width,
            height: cs.height
          };
        }
      }

      // Check if button S3 is clipped or outside container
      const s3Clipped = rS3 && cRect ? (rS3.right > cRect.right + 2 || rS3.bottom > cRect.bottom + 2) : false;

      // Now test sandbox_db tab
      if (typeof window.switchAdminTab === 'function') {
        window.switchAdminTab('sandbox_db');
      }

      const sbTokensBtn = document.querySelector('.admin-filter-bar button');
      const sbFilterBar = document.querySelector('#sec-sandbox_db .admin-filter-bar');
      const sbControls = sbFilterBar ? sbFilterBar.children[1] : null;
      const sbSelect = document.getElementById('sandbox-tokens-sort') || document.getElementById('sandbox-catalog-sort');
      let sbSelectCs = null;
      if (sbSelect) {
        sbSelect.focus();
        const cs = window.getComputedStyle(sbSelect);
        sbSelectCs = {
          borderColor: cs.borderColor,
          boxShadow: cs.boxShadow,
          width: cs.width
        };
      }

      // Check if buttons inside sbControls are stacked vertically (flex-direction: column)
      let sbControlsDirection = null;
      let sbButtonsStackedVertically = false;
      if (sbControls) {
        sbControlsDirection = window.getComputedStyle(sbControls).flexDirection;
        const btns = sbControls.querySelectorAll('button');
        if (btns.length >= 2) {
          const b0 = btns[0].getBoundingClientRect();
          const b1 = btns[1].getBoundingClientRect();
          // If b1 is below b0 with same left edge, they are stacked vertically
          if (b1.y > b0.bottom && Math.abs(b1.x - b0.x) < 5) {
            sbButtonsStackedVertically = true;
          }
        }
      }

      // Switch back to invoices
      if (typeof window.switchAdminTab === 'function') {
        window.switchAdminTab('invoices');
      }

      return {
        targetWidth: ${width},
        windowWidth,
        bodyScrollWidth,
        scrollOverflow,
        sandboxDb: {
          sbControlsDirection,
          sbButtonsStackedVertically,
          sbSelectCs
        },
        container: cRect ? { width: cRect.width, height: cRect.height } : null,
        buttons: {
          all: rAll ? { x: Math.round(rAll.x), y: Math.round(rAll.y), w: Math.round(rAll.width), h: Math.round(rAll.height) } : null,
          s1: rS1 ? { x: Math.round(rS1.x), y: Math.round(rS1.y), w: Math.round(rS1.width), h: Math.round(rS1.height) } : null,
          s2: rS2 ? { x: Math.round(rS2.x), y: Math.round(rS2.y), w: Math.round(rS2.width), h: Math.round(rS2.height) } : null,
          s3: rS3 ? { x: Math.round(rS3.x), y: Math.round(rS3.y), w: Math.round(rS3.width), h: Math.round(rS3.height) } : null,
        },
        s3Clipped,
        selectStyles
      };
    })()`);
  }

  console.log('\n--- EVALUATING VIEWPORTS ---');
  // Wait for admin scripts to initialize
  for (let i = 0; i < 40; i++) {
    const ready = await evalExpr('typeof window.submitAdminPin === "function"');
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Pre-unlock
  await evalExpr(`(() => {
    const pin = document.getElementById("input-admin-pin");
    if (pin) pin.value = "110805";
    if (typeof window.submitAdminPin === 'function') window.submitAdminPin();
  })()`);
  await new Promise((r) => setTimeout(r, 500));

  const testViewports = [640, 480, 420, 360, 320, 280];
  let failures = 0;

  for (const w of testViewports) {
    const res = await testViewport(w, 800);
    console.log(`Viewport ${w}px:`, JSON.stringify({
      width: res.windowWidth,
      bodyScrollWidth: res.bodyScrollWidth,
      scrollOverflow: res.scrollOverflow,
      s3Clipped: res.s3Clipped,
      sbStacked: res.sandboxDb.sbButtonsStackedVertically,
      container: res.container
    }));

    if (res.scrollOverflow) {
      console.error(`FAIL [${w}px]: Page-level scroll overflow detected (bodyScrollWidth: ${res.bodyScrollWidth})`);
      failures++;
    }
    if (res.s3Clipped) {
      console.error(`FAIL [${w}px]: Lain Series 3 button is clipped or outside container`);
      failures++;
    }
    if (res.sandboxDb.sbButtonsStackedVertically) {
      console.error(`FAIL [${w}px]: Sandbox DB buttons stacked in vertical column`);
      failures++;
    }
  }

  edgeProc.kill();
  server.close();

  if (failures > 0) {
    console.error(`\nFAILED with ${failures} failure(s)`);
    process.exit(1);
  } else {
    console.log('\nALL VIEWPORTS PASSED (0 failures)');
    process.exit(0);
  }
});
