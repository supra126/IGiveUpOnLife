import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "不想怒力了 I give up on life",
  description: "AI 驅動的產品行銷內容設計工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
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
        {children}
      </body>
    </html>
  );
}
