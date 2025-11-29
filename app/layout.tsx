import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://igiveup.simoko.com";

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "不想努力了 I Give Up",
  alternateName: "I Give Up On Life",
  description:
    "AI-powered product marketing content and image generator using Google Gemini AI",
  url: siteUrl,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "MagMa",
    url: "https://github.com/mag477",
  },
  featureList: [
    "AI-powered marketing content generation",
    "Product image analysis",
    "Social media post creation",
    "Multiple aspect ratio support",
    "Multi-language support",
  ],
};

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "700"], // Only load essential weights for faster LCP
  display: "swap",
  variable: "--font-noto-sans-tc",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "不想努力了 I Give Up - AI Marketing Content Generator",
    template: "%s | 不想努力了 I Give Up",
  },
  description:
    "AI-powered product marketing content and image generator. Create professional marketing visuals, social media posts, and ad creatives with Google Gemini AI. 使用 AI 快速生成產品行銷素材。",
  keywords: [
    "AI",
    "marketing",
    "content generator",
    "image generation",
    "Gemini",
    "social media",
    "advertising",
    "產品行銷",
    "AI 生成",
    "行銷素材",
  ],
  authors: [{ name: "MagMa", url: "https://github.com/mag477" }],
  creator: "MagMa",
  publisher: "MagMa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    alternateLocale: "en_US",
    url: siteUrl,
    siteName: "不想努力了 I Give Up",
    title: "不想努力了 I Give Up - AI Marketing Content Generator",
    description:
      "AI-powered product marketing content and image generator. Create professional marketing visuals with Google Gemini AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "不想努力了 I Give Up - AI Marketing Content Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "不想努力了 I Give Up - AI Marketing Content Generator",
    description:
      "AI-powered product marketing content and image generator. Create professional marketing visuals with Google Gemini AI.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={notoSansTC.variable}>
      <head>
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={notoSansTC.className}>
        <div className="bg-dynamic">
          <div className="bg-grid"></div>
          <div className="bg-glow"></div>
        </div>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
