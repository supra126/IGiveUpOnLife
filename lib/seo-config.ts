/**
 * SEO Configuration
 * 集中管理所有 SEO 相關的文字和設定
 */

export const SEO_CONFIG = {
  // 品牌名稱（中英文混合，這是品牌的一部分）
  brandName: "不想努力了 I Give Up",
  brandNameShort: "I Give Up",

  // 完整標題
  title: {
    default: "不想努力了 · I Give Up",
    template: "%s · 不想努力了",
  },

  // 描述（純英文，SEO 友好）
  description: "An AI image workbench for designers: drop in a reference and your product shot, pick a similarity level, and get clean, high-res product visuals with Google Gemini.",

  // 關鍵字
  keywords: [
    "AI",
    "marketing",
    "content generator",
    "image generation",
    "Gemini",
    "social media",
    "advertising",
    "product marketing",
    "AI generation",
    "marketing materials",
  ],

  // OpenGraph 圖片 alt 文字
  ogImageAlt: "不想努力了 · I Give Up — AI image workbench",

  // PWA Manifest
  manifest: {
    name: "不想努力了 · I Give Up",
    shortName: "I Give Up",
    description: "AI-powered product marketing content and image generator. Create professional marketing visuals with Google Gemini AI.",
  },

  // 作者資訊
  author: {
    name: "MagMa",
    url: "https://github.com/mag477",
  },
};
