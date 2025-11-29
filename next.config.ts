import type { NextConfig } from "next";

/**
 * Build Mode Detection
 *
 * Set NEXT_PUBLIC_BUILD_MODE=static to build a static version
 * that can be deployed to GitHub Pages, Cloudflare Pages, etc.
 *
 * Static build limitations:
 * - No server-side API key support
 * - Users must provide their own API key
 * - Rate limiting is client-side only (localStorage based)
 */
const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

const nextConfig: NextConfig = {
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
    experimental: {
      serverActions: {
        bodySizeLimit: "20mb", // 增加 body size limit 以支援大圖片上傳
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
