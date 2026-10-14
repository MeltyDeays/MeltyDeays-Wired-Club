const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 1. Motor PNG puro sin dependencias (IHDR + IDAT zlib + IEND)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function encodeRGBAtoPNG(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// 2. Función de Rasterizado Cyberpunk MeltyDeays (Lain / Wired Energy)
function renderCyberIconPixel(x, y, w, h) {
  // Coordenadas normalizadas [0, 1]
  const nx = x / w;
  const ny = y / h;

  // Fondo obsidiana espacial #070c14
  let r = 7, g = 12, b = 20, a = 255;

  // Centro y distancia euclidiana
  const cx = 0.5, cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Marco circular / escudo neón cian (#0284c7 a #38bdf8)
  const ringRadius = 0.44;
  const ringThick = 0.022;
  const distToRing = Math.abs(dist - ringRadius);

  if (distToRing < ringThick) {
    const intensity = 1 - (distToRing / ringThick);
    // Gradiente cian puro
    r = Math.round(r * (1 - intensity) + 56 * intensity);
    g = Math.round(g * (1 - intensity) + 189 * intensity);
    b = Math.round(b * (1 - intensity) + 248 * intensity);
  } else if (distToRing < ringThick * 2.5) {
    // Halo suave
    const glow = (1 - (distToRing / (ringThick * 2.5))) * 0.45;
    r = Math.round(r + 2 * glow * 10);
    g = Math.round(g + 132 * glow);
    b = Math.round(b + 199 * glow);
  }

  // Rayo técnico central ⚡
  // Polígono simplificado del rayo:
  // Vértices normalizados:
  // P1: (0.54, 0.16) -> P2: (0.34, 0.48) -> P3: (0.48, 0.48) ->
  // P4: (0.44, 0.84) -> P5: (0.66, 0.42) -> P6: (0.51, 0.42)
  const inLightning = isPointInLightning(nx, ny);

  if (inLightning) {
    // Gradiente ámbar dorado a amarillo eléctrico (#f59e0b -> #fef08a)
    const factorY = (ny - 0.16) / (0.84 - 0.16);
    r = Math.round(245 + (254 - 245) * factorY);
    g = Math.round(158 + (240 - 158) * factorY);
    b = Math.round(11 + (138 - 11) * factorY);
    a = 255;
  } else {
    // Micro-aura dorada alrededor del rayo
    const auraDist = distToLightning(nx, ny);
    if (auraDist < 0.035) {
      const aura = (1 - (auraDist / 0.035)) * 0.55;
      r = Math.round(Math.min(255, r + 245 * aura));
      g = Math.round(Math.min(255, g + 158 * aura));
      b = Math.round(Math.min(255, b + 11 * aura));
    }
  }

  return [r, g, b, a];
}

// Algoritmo de punto en polígono (Ray Casting) para el rayo ⚡
function isPointInLightning(px, py) {
  // 2 triángulos/cuadriláteros interconectados
  // Parte Superior: (0.56, 0.16), (0.33, 0.50), (0.49, 0.50)
  // Parte Inferior: (0.43, 0.48), (0.45, 0.84), (0.67, 0.45), (0.51, 0.45)
  const poly = [
    [0.55, 0.16],
    [0.32, 0.52],
    [0.48, 0.52],
    [0.43, 0.84],
    [0.68, 0.45],
    [0.51, 0.45]
  ];

  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToLightning(px, py) {
  const poly = [
    [0.55, 0.16],
    [0.32, 0.52],
    [0.48, 0.52],
    [0.43, 0.84],
    [0.68, 0.45],
    [0.51, 0.45]
  ];
  let minDist = 999;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const d = distToSegment(px, py, p1[0], p1[1], p2[0], p2[1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// 3. Generación y Almacenamiento
const targetDir = path.resolve(__dirname, '../assets/icons');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Generando iconos PWA para MeltyDeays Wired Club...');

// 192x192 PNG
const png192 = encodeRGBAtoPNG(192, 192, renderCyberIconPixel);
fs.writeFileSync(path.join(targetDir, 'icon-192.png'), png192);
console.log('✓ Creado: assets/icons/icon-192.png');

// 512x512 PNG
const png512 = encodeRGBAtoPNG(512, 512, renderCyberIconPixel);
fs.writeFileSync(path.join(targetDir, 'icon-512.png'), png512);
console.log('✓ Creado: assets/icons/icon-512.png');

// 180x180 PNG (Apple Touch Icon)
const png180 = encodeRGBAtoPNG(180, 180, renderCyberIconPixel);
fs.writeFileSync(path.join(targetDir, 'apple-touch-icon.png'), png180);
console.log('✓ Creado: assets/icons/apple-touch-icon.png');

// SVG Vectorial
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0e1726" />
      <stop offset="100%" stop-color="#070c14" />
    </radialGradient>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="goldLightning" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="218" fill="none" stroke="url(#neonCyan)" stroke-width="10" filter="url(#glow)" />
  <circle cx="256" cy="256" r="218" fill="none" stroke="#38bdf8" stroke-width="4" />
  <polygon points="280,82 164,266 246,266 220,430 348,230 262,230" fill="url(#goldLightning)" filter="url(#glow)" />
  <polygon points="280,82 164,266 246,266 220,430 348,230 262,230" fill="url(#goldLightning)" />
</svg>`;

fs.writeFileSync(path.join(targetDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.resolve(__dirname, '../favicon.svg'), svgContent);
console.log('✓ Creado: assets/icons/icon.svg y favicon.svg');

console.log('Todos los iconos generados con éxito.');
