/**
 * Content-Security-Policy 的單一來源
 *
 * - server 模式：next.config.mjs 的 headers() 使用
 * - static 版（npx igiveup）：bin/server.js 使用。static 匯出不會套用 next.config 的 headers，
 *   而 static 版的金鑰只存在瀏覽器的 localStorage，更需要這層保護
 *
 * 使用者金鑰存在 localStorage：即使有 XSS，connect-src 也讓金鑰無法被送到其他網域。
 * Next 的 inline 腳本需要 'unsafe-inline'；dev 的 React Refresh 另外需要 'unsafe-eval'。
 * 文字編輯器執行時才從 Google Fonts 載入字型（lib/editor/fonts.ts）。
 */
function buildCsp({ dev = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

module.exports = { buildCsp };
