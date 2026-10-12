"use client";

import React, { useCallback, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useAssetUrl } from "@/lib/project/asset-url";
import { useLocale } from "@/contexts/LocaleContext";

interface DropzoneProps {
  label: string;
  hint?: string;
  assetId?: string;
  onFile: (file: File) => void;
  onClear?: () => void;
  required?: boolean;
  className?: string;
  /** 單行樣式：用於選填的圖片槽，避免佔用一整塊空間 */
  compact?: boolean;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif";
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * 圖片槽：點擊、拖放或在聚焦時貼上（Cmd/Ctrl+V）
 */
export function Dropzone({ label, hint, assetId, onFile, onClear, required, className = "", compact = false }: DropzoneProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = useAssetUrl(assetId);

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError(t("upload.notImage"));
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(t("upload.tooLarge"));
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile, t]
  );

  return (
    <div className={className}>
      <div className={compact ? "sr-only" : "mb-1.5 flex items-baseline justify-between"}>
        <span className="label mb-0">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={url ? t("upload.replace", { label }) : t("upload.choose", { label })}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(e) => accept(Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/")))}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
        className={[
          "group relative w-full cursor-pointer overflow-hidden rounded-[var(--radius-control)] border transition-colors",
          compact ? "flex h-12 items-center gap-3 pr-9" : "aspect-square",
          dragging ? "border-accent bg-accent-soft" : url ? "border-line" : "border-dashed border-line-strong hover:border-accent",
          compact ? "bg-sunken" : url ? "checker" : "bg-sunken",
        ].join(" ")}
      >
        {compact ? (
          <>
            <span className="checker grid h-full w-12 shrink-0 place-items-center border-r border-line text-fg-subtle">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URL 不適用 next/image
                <img src={url} alt="" className="size-full object-contain" />
              ) : (
                <ImagePlus size={16} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-xs">
              <span className="font-medium text-fg">{label}</span>
              {hint && <span className="ml-1.5 text-fg-subtle">{hint}</span>}
              {!url && <span className="block text-fg-subtle">{dragging ? t("upload.drop") : t("upload.prompt")}</span>}
            </span>
          </>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL 不適用 next/image
          <img src={url} alt={label} className="size-full object-contain" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center text-fg-subtle">
            <ImagePlus size={18} />
            <span className="text-xs leading-tight">{dragging ? t("upload.drop") : t("upload.prompt")}</span>
          </div>
        )}
        {url && onClear && (
          <button
            type="button"
            aria-label={t("upload.remove", { label })}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className={
              compact
                ? "absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-raised hover:text-fg"
                : "absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            }
          >
            <X size={13} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          // 重設，讓同一個檔案可以再選一次
          e.target.value = "";
        }}
      />
    </div>
  );
}
