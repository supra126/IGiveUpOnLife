"use client";

import React from "react";
import { X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { dismissToast, useToasts } from "@/lib/workbench/toast";

export function Toasts() {
  const { t } = useLocale();
  const toasts = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={[
            "animate-fade-in pointer-events-auto flex items-start gap-2 rounded-[var(--radius-panel)] border bg-panel px-3 py-2.5 text-xs shadow-lg",
            toast.tone === "error" ? "border-danger/40" : "border-line",
          ].join(" ")}
        >
          <span className={`mt-1 size-1.5 shrink-0 rounded-full ${toast.tone === "error" ? "bg-danger" : toast.tone === "success" ? "bg-success" : "bg-accent"}`} />
          <span className="flex-1">{t(toast.message, toast.vars)}</span>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => dismissToast(toast.id)}
            className="text-fg-subtle hover:text-fg"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
