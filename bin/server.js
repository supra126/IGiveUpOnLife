/**
 * 靜態檔案伺服器（npx igiveup 使用），獨立成模組方便測試
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function isInside(root, target) {
  return target === root || target.startsWith(root + path.sep);
}

/** 把網址轉成 dist 內的檔案路徑；不合法時回傳 null */
function resolveRequestPath(root, rawUrl) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((rawUrl || "/").split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (urlPath.includes("\0")) return null;
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  let filePath = path.resolve(root, "." + urlPath);
  if (!isInside(root, filePath)) return null;

  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) filePath += ".html";
    else if (fs.existsSync(path.join(filePath, "index.html"))) filePath = path.join(filePath, "index.html");
  }
  return filePath;
}

function createStaticServer(distDir) {
  const root = path.resolve(distDir);

  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD", ...SECURITY_HEADERS });
      res.end();
      return;
    }

    const filePath = resolveRequestPath(root, req.url);
    if (!filePath) {
      res.writeHead(403, SECURITY_HEADERS);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // 有副檔名或 /_next/ 下的資源找不到時回 404，避免回傳 HTML 造成難以除錯的 MIME 錯誤
        const urlPath = (req.url || "").split("?")[0];
        const isAsset = urlPath.startsWith("/_next/") || path.extname(urlPath) !== "";
        const fallback = path.join(root, isAsset ? "404.html" : "index.html");
        fs.readFile(fallback, (err2, page) => {
          const status = isAsset ? 404 : 200;
          if (err2 || (isAsset && path.extname(urlPath) && path.extname(urlPath) !== ".html")) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
            res.end("Not Found");
            return;
          }
          res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS });
          res.end(req.method === "HEAD" ? undefined : page);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        ...SECURITY_HEADERS,
      };
      // Next 產生的雜湊檔名可以長期快取
      if (filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      }
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
}

module.exports = { createStaticServer, resolveRequestPath };
