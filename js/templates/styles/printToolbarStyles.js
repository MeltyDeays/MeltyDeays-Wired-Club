/**
 * Estilos de Barra de Herramientas y Layout de Pliego 4x1
 * @param {object} dims - Dimensiones de papel ({ name, widthMm, heightMm, cssSize })
 * @returns {string} Bloque CSS
 */
export function get4x1ToolbarStyles(dims = { name: 'Carta (Letter)', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter portrait' }) {
  return `    
    :root {
      --primary: #4f46e5;
      --primary-dark: #312e81;
      --accent: #db2777;
      --dark: #0f172a;
      --gray-800: #1e293b;
      --gray-600: #475569;
      --gray-400: #94a3b8;
      --gray-300: #cbd5e1;
      --gray-200: #e2e8f0;
      --gray-100: #f1f5f9;
      --gray-50: #f8fafc;
      --table-border: #334155;
      --table-line: #94a3b8;
      --dot-color: #cbd5e1;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #0b0f19;
      color: var(--dark);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      gap: 20px;
      transition: background 0.2s ease;
    }

    .toolbar {
      width: 8.5in;
      max-width: 100%;
      background: #1e293b;
      color: #fff;
      padding: 10px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .toolbar-info h1 {
      font-size: 13.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .toolbar-info p {
      font-size: 10.5px;
      color: #94a3b8;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      padding: 7px 13px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .btn-print {
      background: linear-gradient(135deg, #6366f1, #ec4899);
      color: #fff;
    }
    .btn-print:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn-sec {
      background: #334155;
      color: #f1f5f9;
    }
    .btn-sec:hover { background: #475569; }

    .btn-bw {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #475569;
    }
    .btn-bw:hover {
      background: #334155;
      color: #ffffff;
    }
    .btn-bw.active {
      background: #0f172a;
      color: #facc15;
      border-color: #facc15;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.35);
    }

    .sheet-letter {
      width: ${dims.widthMm}mm;
      height: ${dims.heightMm}mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      position: relative;
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
      overflow: hidden;
      transition: filter 0.2s ease;
      margin: 12px auto;
    }

    .sheet-front {
      background-color: #ffffff;
      background-image: radial-gradient(var(--dot-color) 0.8px, transparent 0.8px);
      background-size: 8px 8px;
    }

    .sheet-back {
      background-color: #f8fafc;
      background-image: radial-gradient(var(--dot-color) 0.8px, transparent 0.8px);
      background-size: 8px 8px;
    }

    .sheet-letter::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 1px;
      border-left: 1px dashed var(--gray-300);
      z-index: 20;
      pointer-events: none;
    }
    .sheet-letter::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      border-top: 1px dashed var(--gray-300);
      z-index: 20;
      pointer-events: none;
    }
    .cut-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      color: var(--gray-400);
      font-size: 8.5px;
      padding: 1.5px 5px;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      z-index: 21;
      pointer-events: none;
      font-weight: 700;
    }`;
}
