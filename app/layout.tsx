import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_TC } from "next/font/google";
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

// 介面字型：拉丁字用 IBM Plex Sans，中文用 Noto Sans TC，資料欄位用 Plex Mono
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-tc",
  preload: false,
});

/**
 * 在首次繪製前套用主題與語系，避免閃爍
 * localStorage: theme = light | dark | system；locale = zh | en
 */
const bootScript = `(function(){try{var t=localStorage.getItem("theme")||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var l=localStorage.getItem("locale")||((navigator.language||"").indexOf("zh")===0?"zh":"en");document.documentElement.lang=l==="zh"?"zh-TW":"en";}catch(e){}})();`;

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
    <html
      lang="zh-TW"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${notoSansTC.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
