"use client";

import React from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";

/** 錯誤頁共用版面（error.tsx 與 global-error.tsx） */
export function ErrorPanel({
  title,
  description,
  digest,
  digestLabel,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  digest?: string;
  digestLabel: string;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-fg">
      <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-line bg-panel p-6">
        <BrandMark size={32} className="mb-4 text-danger" />
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
        {digest && (
          <p className="mt-3 font-mono text-[11px] text-fg-subtle">
            {digestLabel}: {digest}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={primary.onClick}>
            {primary.label}
          </Button>
          <Button variant="secondary" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
