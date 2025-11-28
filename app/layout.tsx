import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans-tc",
});

export const metadata: Metadata = {
  title: "不想努力了 I Give Up",
  description: "AI 驅動的產品行銷內容設計工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={notoSansTC.variable}>
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
