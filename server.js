/**
 * Servidor de Desarrollo Local y API Serverless Runner (The Wired Club)
 * Ejecuta funciones de /api/* en Node.js y sirve archivos estáticos con CORS habilitado.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // RUTAS DE API SERVERLESS (/api/*)
  if (pathname.startsWith("/api/")) {
    const apiName = pathname.replace(/^\/api\//, "").replace(/\.js$/, "");
    const apiFile = path.join(ROOT_DIR, "api", `${apiName}.js`);

    if (fs.existsSync(apiFile)) {
      try {
        let bodyBuffer = [];
        req.on("data", chunk => bodyBuffer.push(chunk));
        req.on("end", async () => {
          let body = {};
          const raw = Buffer.concat(bodyBuffer).toString();
          if (raw) {
            try {
              body = JSON.parse(raw);
            } catch {
              body = { raw };
            }
          }
          req.body = body;
          req.query = parsedUrl.query || {};

          // Adaptador para response express/vercel-like
          const mockRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            status: (code) => {
              res.statusCode = code;
              return mockRes;
            },
            json: (data) => {
              res.setHeader("Content-Type", "application/json; charset=UTF-8");
              res.end(JSON.stringify(data));
            },
            send: (data) => res.end(data),
            end: () => res.end()
          };

          try {
            // Limpiar cache de require en desarrollo
            delete require.cache[require.resolve(apiFile)];
            const handler = require(apiFile);
            await handler(req, mockRes);
          } catch (handlerErr) {
            console.error(`Error ejecutando API ${apiName}:`, handlerErr);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: handlerErr.message }));
          }
        });
        return;
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: `API route not found: ${pathname}` }));
    }
  }

  // RUTAS DE ARCHIVOS ESTÁTICOS
  let filePath = path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname);
  if (pathname === "/admin") filePath = path.join(ROOT_DIR, "admin.html");

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback a index.html para SPA o 404
      const fallback = path.join(ROOT_DIR, "index.html");
      fs.readFile(fallback, (fErr, fContent) => {
        if (fErr) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          return res.end("404 Not Found");
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
        res.end(fContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end(`Error leyendo archivo: ${readErr.message}`);
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[The Wired Club] Servidor activo en http://localhost:${PORT}`);
  console.log(`- Panel Admin:  http://localhost:${PORT}/admin.html`);
  console.log(`- Catálogo Web: http://localhost:${PORT}/index.html`);
  console.log(`- API Images:   http://localhost:${PORT}/api/search-product-images`);
});
