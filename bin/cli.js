#!/usr/bin/env node

/**
 * I Give Up CLI (不想努力了)
 *
 * Launch the static version of AI Marketing Content Generator locally
 * Users need to provide their own Gemini API Key
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// i18n messages
const messages = {
  zh: {
    title: "不想努力了 - AI 行銷內容生成工具",
    serverStarted: "伺服器已啟動",
    instructions: "使用說明",
    step1: "在瀏覽器中開啟上方網址",
    step2: "點擊「設定」輸入你的 Gemini API Key",
    step3: "上傳產品圖片，開始生成行銷內容",
    getApiKey: "取得 API Key",
    pressCtrlC: "按 Ctrl+C 停止伺服器",
    goodbye: "感謝使用，再見！",
    errorNotFound: "錯誤: 找不到靜態檔案目錄",
    errorNotFoundHint: "請確認套件已正確安裝",
    helpUsage: "使用方式",
    helpOptions: "選項",
    helpOptPort: "指定埠號",
    helpOptLang: "指定語言 (zh/en)",
    helpOptHelp: "顯示說明",
    helpOptVersion: "顯示版本",
    helpExamples: "範例",
    helpDefault: "預設",
  },
  en: {
    title: "I Give Up - AI Marketing Content Generator",
    serverStarted: "Server started",
    instructions: "Instructions",
    step1: "Open the URL above in your browser",
    step2: "Click 'Settings' to enter your Gemini API Key",
    step3: "Upload product image and start generating marketing content",
    getApiKey: "Get API Key",
    pressCtrlC: "Press Ctrl+C to stop the server",
    goodbye: "Thanks for using, goodbye!",
    errorNotFound: "Error: Static files directory not found",
    errorNotFoundHint: "Please ensure the package is installed correctly",
    helpUsage: "Usage",
    helpOptions: "Options",
    helpOptPort: "Specify port",
    helpOptLang: "Specify language (zh/en)",
    helpOptHelp: "Show help",
    helpOptVersion: "Show version",
    helpExamples: "Examples",
    helpDefault: "default",
  },
};

// Detect system locale, default to English if not Chinese
function detectLocale() {
  try {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return systemLocale.startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

// Settings
const DEFAULT_PORT = 3456;
const args = process.argv.slice(2);

// Parse language first (needed for help message)
let lang = detectLocale();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--lang" || args[i] === "-l") {
    const requestedLang = args[i + 1];
    lang = requestedLang === "zh" ? "zh" : "en";
  }
}
const t = messages[lang];

// Parse other arguments
let port = DEFAULT_PORT;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" || args[i] === "-p") {
    port = parseInt(args[i + 1], 10) || DEFAULT_PORT;
  }
  if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
${t.title}

${t.helpUsage}:
  npx igiveup [options]

${t.helpOptions}:
  -p, --port <port>  ${t.helpOptPort} (${t.helpDefault}: ${DEFAULT_PORT})
  -l, --lang <lang>  ${t.helpOptLang}
  -h, --help         ${t.helpOptHelp}
  -v, --version      ${t.helpOptVersion}

${t.helpExamples}:
  npx igiveup
  npx igiveup --port 8080
  npx igiveup --lang en
`);
    process.exit(0);
  }
  if (args[i] === "--version" || args[i] === "-v") {
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
  }
}

// MIME 類型對照表
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

// 取得靜態檔案目錄
const distDir = path.join(__dirname, "..", "dist");

// 檢查 dist 目錄是否存在
if (!fs.existsSync(distDir)) {
  console.error(`❌ ${t.errorNotFound}`);
  console.error(`   ${t.errorNotFoundHint}`);
  process.exit(1);
}

// 建立 HTTP 伺服器
const server = http.createServer((req, res) => {
  // 解析 URL
  let urlPath = req.url.split("?")[0];

  // 處理根路徑
  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  // 嘗試尋找檔案
  let filePath = path.join(distDir, urlPath);

  // 如果路徑不含副檔名，嘗試加上 .html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    }
  }

  // 安全檢查：防止目錄遍歷攻擊
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(distDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // 讀取並回傳檔案
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 檔案不存在，回傳 index.html（SPA fallback）
      const indexPath = path.join(distDir, "index.html");
      fs.readFile(indexPath, (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexData);
      });
      return;
    }

    // 取得 MIME 類型
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

// 開啟瀏覽器
function openBrowser(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case "darwin": // macOS
      command = `open "${url}"`;
      break;
    case "win32": // Windows
      command = `start "" "${url}"`;
      break;
    default: // Linux 及其他
      command = `xdg-open "${url}"`;
  }

  try {
    execSync(command, { stdio: "ignore" });
  } catch {
    // 忽略錯誤，瀏覽器可能無法開啟
  }
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// 啟動伺服器
server.listen(port, () => {
  const url = `http://localhost:${port}`;
  const separator = "━".repeat(45);

  console.log(`
${colors.cyan}${colors.bold}🎨 ${t.title}${colors.reset}
${colors.dim}${separator}${colors.reset}

${colors.green}✓${colors.reset} ${t.serverStarted}: ${colors.cyan}${url}${colors.reset}

${colors.yellow}📝 ${t.instructions}:${colors.reset}
   1. ${t.step1}
   2. ${t.step2}
   3. ${t.step3}

${colors.yellow}🔑 ${t.getApiKey}:${colors.reset}
   ${colors.dim}https://aistudio.google.com/app/api-keys${colors.reset}

${colors.dim}${separator}${colors.reset}
${colors.dim}${t.pressCtrlC}${colors.reset}
`);

  // 自動開啟瀏覽器
  openBrowser(url);
});

// 處理關閉信號
process.on("SIGINT", () => {
  console.log(`\n👋 ${t.goodbye}`);
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
