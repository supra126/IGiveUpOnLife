#!/usr/bin/env node

/**
 * I Give Up CLI（不想努力了）
 *
 * 在本機啟動靜態版；使用者在介面輸入自己的 Gemini API 金鑰
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createStaticServer } = require("./server");

const messages = {
  zh: {
    title: "不想努力了 - AI 行銷素材工作台",
    serverStarted: "已啟動",
    instructions: "使用說明",
    step1: "在瀏覽器開啟上方網址",
    step2: "點右上角「設定」輸入你的 Gemini API 金鑰",
    step3: "放上參考圖和產品圖，開始生成",
    getApiKey: "取得 API 金鑰",
    pressCtrlC: "按 Ctrl+C 停止",
    goodbye: "下次再一起不努力，掰～",
    errorNotFound: "錯誤：找不到靜態檔案目錄",
    errorNotFoundHint: "請確認套件已正確安裝",
    errorPort: "錯誤：埠號必須是 1–65535 的整數",
    portInUse: "埠號 {port} 已被使用，改用 {next}",
    portTaken: "埠號 {port} 已被使用，請用 --port 換一個",
    portExhausted: "找不到可用的埠號，請用 --port 指定",
    lanWarning: "注意：已對區域網路開放，同網路的人都能連線",
    unknownOption: "未知的選項：{option}",
    helpUsage: "使用方式",
    helpOptions: "選項",
    helpOptPort: "指定埠號",
    helpOptHost: "綁定的位址（預設只允許本機連線）",
    helpOptLang: "指定語言 (zh/en)",
    helpOptNoOpen: "不要自動開啟瀏覽器",
    helpOptHelp: "顯示說明",
    helpOptVersion: "顯示版本",
    helpExamples: "範例",
    helpDefault: "預設",
  },
  en: {
    title: "I Give Up - AI marketing asset workbench",
    serverStarted: "Running at",
    instructions: "Instructions",
    step1: "Open the URL above in your browser",
    step2: "Click “Settings” (top right) and enter your Gemini API key",
    step3: "Add a reference and a product image, then generate",
    getApiKey: "Get an API key",
    pressCtrlC: "Press Ctrl+C to stop",
    goodbye: "See you next time we don't feel like trying.",
    errorNotFound: "Error: static files directory not found",
    errorNotFoundHint: "Please make sure the package is installed correctly",
    errorPort: "Error: port must be an integer between 1 and 65535",
    portInUse: "Port {port} is in use, trying {next}",
    portTaken: "Port {port} is in use. Pick another with --port",
    portExhausted: "No free port found. Use --port to choose one",
    lanWarning: "Note: exposed to your local network; anyone on it can connect",
    unknownOption: "Unknown option: {option}",
    helpUsage: "Usage",
    helpOptions: "Options",
    helpOptPort: "Port",
    helpOptHost: "Address to bind (default: this machine only)",
    helpOptLang: "Language (zh/en)",
    helpOptNoOpen: "Don't open the browser",
    helpOptHelp: "Show help",
    helpOptVersion: "Show version",
    helpExamples: "Examples",
    helpDefault: "default",
  },
};

function detectLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

function format(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key]));
}

const DEFAULT_PORT = 3456;
const DEFAULT_HOST = "127.0.0.1";
const MAX_PORT_ATTEMPTS = 10;

const args = process.argv.slice(2);
const options = { port: DEFAULT_PORT, portExplicit: false, host: DEFAULT_HOST, lang: detectLocale(), open: true };
const known = new Set(["--port", "-p", "--host", "--lang", "-l", "--no-open", "--help", "-h", "--version", "-v"]);

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--lang" || args[i] === "-l") && args[i + 1]) options.lang = args[i + 1] === "zh" ? "zh" : "en";
}
const t = messages[options.lang];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!known.has(arg)) {
    // 選項的值由前一個參數處理
    if (!["--port", "-p", "--host", "--lang", "-l"].includes(args[i - 1])) {
      console.error(format(t.unknownOption, { option: arg }));
      process.exit(1);
    }
    continue;
  }
  if (arg === "--port" || arg === "-p") {
    const value = args[i + 1];
    const port = Number(value);
    if (!/^\d+$/.test(value || "") || port < 1 || port > 65535) {
      console.error(t.errorPort);
      process.exit(1);
    }
    options.port = port;
    options.portExplicit = true;
  }
  if (arg === "--host") options.host = args[i + 1] || DEFAULT_HOST;
  if (arg === "--no-open") options.open = false;
  if (arg === "--help" || arg === "-h") {
    console.log(`
${t.title}

${t.helpUsage}:
  npx igiveup [options]

${t.helpOptions}:
  -p, --port <port>  ${t.helpOptPort} (${t.helpDefault}: ${DEFAULT_PORT})
      --host <addr>  ${t.helpOptHost}
  -l, --lang <lang>  ${t.helpOptLang}
      --no-open      ${t.helpOptNoOpen}
  -h, --help         ${t.helpOptHelp}
  -v, --version      ${t.helpOptVersion}

${t.helpExamples}:
  npx igiveup
  npx igiveup --port 8080
  npx igiveup --host 0.0.0.0 --no-open
`);
    process.exit(0);
  }
  if (arg === "--version" || arg === "-v") {
    console.log(require("../package.json").version);
    process.exit(0);
  }
}

const distDir = path.join(__dirname, "..", "dist");
if (!fs.existsSync(distDir)) {
  console.error(`${t.errorNotFound}\n  ${t.errorNotFoundHint}`);
  process.exit(1);
}

function openBrowser(url) {
  const [command, commandArgs] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    // 不等待、不阻塞；headless 環境開不了也沒關係
    const child = spawn(command, commandArgs, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // ignore
  }
}

const colors = { reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m" };

const server = createStaticServer(distDir);
let attempts = 0;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !options.portExplicit && attempts < MAX_PORT_ATTEMPTS) {
    attempts++;
    const next = options.port + 1;
    console.log(`${colors.yellow}${format(t.portInUse, { port: options.port, next })}${colors.reset}`);
    options.port = next;
    server.listen(options.port, options.host);
    return;
  }
  if (error.code === "EADDRINUSE") {
    console.error(options.portExplicit ? format(t.portTaken, { port: options.port }) : t.portExhausted);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.on("listening", () => {
  const displayHost = options.host === "0.0.0.0" || options.host === "::" ? "localhost" : options.host;
  const url = `http://${displayHost}:${options.port}`;
  const separator = "─".repeat(45);
  console.log(`
${colors.cyan}${colors.bold}${t.title}${colors.reset}
${colors.dim}${separator}${colors.reset}

${colors.green}●${colors.reset} ${t.serverStarted}: ${colors.cyan}${url}${colors.reset}
${options.host !== DEFAULT_HOST && options.host !== "localhost" ? `${colors.yellow}${t.lanWarning}${colors.reset}\n` : ""}
${colors.yellow}${t.instructions}:${colors.reset}
  1. ${t.step1}
  2. ${t.step2}
  3. ${t.step3}

${colors.yellow}${t.getApiKey}:${colors.reset}
  ${colors.dim}https://aistudio.google.com/apikey${colors.reset}

${colors.dim}${separator}${colors.reset}
${colors.dim}${t.pressCtrlC}${colors.reset}
`);
  if (options.open) openBrowser(url);
});

server.listen(options.port, options.host);

function shutdown(code) {
  server.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 1000).unref();
}

process.on("SIGINT", () => {
  console.log(`\n${t.goodbye}`);
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));
