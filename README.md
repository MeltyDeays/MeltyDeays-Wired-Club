# 🌐 MeltyDeays — The Wired Club

> Plataforma web de fidelización y recompensas exclusiva para clientes de **MeltyDeays** (Tech, Gadgets & Gaming Hardware - Nicaragua).

---

## ⚡ Características Principales

### 1. Portal de Clientes (/)
- **CyberPass de Socio:** Tarjeta digital inspirada en el reverso coleccionable de la factura 4x1, con diseño dot-grid, esquinas técnicas con marcas + y QR personal.
- **Wired Points (WP):** Consulta en tiempo real de saldo acumulado por compras ( USD = 10 WP).
- **Canje de Recompensas:** Catálogo de productos y periféricos disponibles para canjear con puntos.
- **Vales Anti-Captura:** Generación de vales con token temporal, contador regresivo de expiración y QR dinámico para mostrador.
- **Historial Ledger:** Registro transparente de todas las transacciones de puntos.

### 2. Terminal NOC / Dueño (/admin)
- **Acceso Protegido:** Bloqueo de seguridad por PIN maestro (por defecto: 2026).
- **Terminal de Canje 1-Scan:** Validación y despacho inmediato de vales de clientes (CANJE-XXXX).
- **Generador de Lotes QR para Facturas:** Generación masiva de tokens de puntos para imprimir en el talón de fidelización de la factura 4x1.
- **Gestión de Catálogo (CRUD):** Creación, edición y eliminación de recompensas en tiempo real.
- **Motor Firebase Integrado:** Sincronización en la nube con Firestore y fallback transparente a LocalStorage.

---

## 🛠️ Arquitectura Técnica

- **Frontend:** Vanilla HTML5, CSS3 moderno (Custom Properties, Dot Grid 8x8px, Tipografía Outfit + JetBrains Mono), JavaScript Vanilla (ES Modules).
- **Base de Datos & Auth:** Firebase Cloud Firestore (transacciones atómicas OCC contra race conditions) + Fallback offline.
- **Hosting & Despliegue:** Optimizado para Vercel (ercel.json) con reescritura limpia de rutas (/admin -> dmin.html).

---

## 🚀 Despliegue Rápido en Vercel

1. Importa este repositorio en [Vercel](https://vercel.com/new).
2. Deja la configuración predeterminada (Framework Preset: *Other*).
3. Haz clic en **Deploy**. El archivo ercel.json enrutará automáticamente / a index.html y /admin a dmin.html.

---

© 2026 MeltyDeays. Todos los derechos reservados.
