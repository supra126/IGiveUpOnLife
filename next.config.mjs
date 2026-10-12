/**
 * Build Mode Detection
 *
 * Set NEXT_PUBLIC_BUILD_MODE=static to build a static version
 * that can be deployed to GitHub Pages, Cloudflare Pages, etc.
 *
 * Static build limitations:
 * - No server-side API key support
 * - Users must provide their own API key
 * - No server-side rate limiting
 */
const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";
const isDev = process.env.NODE_ENV === "development";
const projectRoot =new URL(".", import.meta.url).pathname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 明確指定專案根目錄，避免 Turbopack 往上層目錄解析 tailwindcss
  turbopack: { root: projectRoot },
  // server action 的參數含使用者 API 金鑰與圖片，不要印到終端機
  logging: { serverFunctions: false },
  // 不要讓 next dev 自動在 repo 產生 AGENTS.md
  agentRules: false,
  // Enable static export for static builds
  ...(isStaticBuild && {
    output: "export",
    distDir: "dist",
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),

  // Server-side configuration (only for non-static builds)
  ...(!isStaticBuild && {
    // Use standalone output for optimized Docker deployment
    output: "standalone",
    experimental: {
      serverActions: {
        bodySizeLimit: process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT || "20mb",
      },
    },
  }),

  // Security headers (applies to both static and server builds when served by Next.js)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // 使用者金鑰存在 localStorage：即使有 XSS，connect-src 也讓金鑰無法被送到其他網域。
            // Next 的 inline 腳本需要 'unsafe-inline'；dev 的 React Refresh 另外需要 'unsafe-eval'。
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://generativelanguage.googleapis.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // Long cache for static assets
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
