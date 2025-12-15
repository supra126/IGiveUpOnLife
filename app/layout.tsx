import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { SEO_CONFIG } from "@/lib/seo-config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://igiveup.simoko.com";

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SEO_CONFIG.brandName,
  alternateName: "I Give Up On Life",
  description: SEO_CONFIG.description,
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
    name: SEO_CONFIG.author.name,
    url: SEO_CONFIG.author.url,
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
  title: SEO_CONFIG.title,
  description: SEO_CONFIG.description,
  keywords: SEO_CONFIG.keywords,
  authors: [{ name: SEO_CONFIG.author.name, url: SEO_CONFIG.author.url }],
  creator: SEO_CONFIG.author.name,
  publisher: SEO_CONFIG.author.name,
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
    siteName: SEO_CONFIG.brandName,
    title: SEO_CONFIG.title.default,
    description: SEO_CONFIG.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SEO_CONFIG.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_CONFIG.title.default,
    description: SEO_CONFIG.description,
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
