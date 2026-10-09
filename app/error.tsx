"use client";

import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { ErrorPanel } from "@/components/ErrorPanel";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <ErrorPanel
      title={t("errorPage.title")}
      description={t("errorPage.description")}
      digest={error.digest}
      digestLabel={t("errorPage.errorCode")}
      primary={{ label: t("errorPage.retry"), onClick: reset }}
      secondary={{ label: t("errorPage.backToHome"), onClick: () => (window.location.href = "/") }}
    />
  );
}
