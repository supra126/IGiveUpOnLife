"use client";

import { useEffect } from "react";
import "./globals.css";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { ErrorPanel } from "@/components/ErrorPanel";

function GlobalErrorContent({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <ErrorPanel
      title={t("errorPage.globalErrorTitle")}
      description={t("errorPage.globalErrorDescription")}
      digest={error.digest}
      digestLabel={t("errorPage.errorCode")}
      primary={{ label: t("errorPage.retry"), onClick: reset }}
      secondary={{ label: t("errorPage.reload"), onClick: () => (window.location.href = "/") }}
    />
  );
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-TW" data-theme="dark">
      <body>
        <LocaleProvider>
          <GlobalErrorContent error={error} reset={reset} />
        </LocaleProvider>
      </body>
    </html>
  );
}
