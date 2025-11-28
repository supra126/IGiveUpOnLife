import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";

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
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg-dynamic">
          <div className="bg-grid"></div>
          <div className="bg-glow"></div>
        </div>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
