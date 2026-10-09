"use client";

import React from "react";
import { TriangleAlert, Download, Maximize2, RotateCcw, Trash, Type } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { useAssetUrl } from "@/lib/project/asset-url";
import { getImageModelSpec } from "@/lib/gemini/models";
import type { Generation } from "@/lib/project/types";
import { removeGeneration } from "@/lib/project/store";
import { downloadGeneration } from "@/lib/workbench/runner";
import { ExtendMenu } from "./ExtendMenu";

interface Props {
  generation: Generation;
  onOpen: (generation: Generation) => void;
  onEditText?: (generation: Generation) => void;
  onRetry?: (generation: Generation) => void;
  onNeedKey: () => void;
}

export function GalleryCard({ generation: g, onOpen, onEditText, onRetry, onNeedKey }: Props) {
  const { t } = useLocale();
  const url = useAssetUrl(g.compositeAssetId ?? g.assetId);
  const [w, h] = g.aspectRatio.split(":").map(Number);
  const busy = g.status === "queued" || g.status === "running";
  const modelLabel = getImageModelSpec(g.model).label;

  return (
    <figure className="group flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel">
      <div
        className={`relative ${url && g.status === "done" ? "checker" : "bg-sunken"}`}
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {url && g.status === "done" ? (
          <button
            type="button"
            onClick={() => onOpen(g)}
            className="block size-full cursor-zoom-in"
            aria-label={t("gallery.open")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL */}
            <img src={url} alt={t("gallery.imageAlt", { ratio: g.aspectRatio })} className="size-full object-cover" />
          </button>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
            {busy && <div className="animate-shimmer absolute inset-0" aria-hidden="true" />}
            {busy && (
              <span className="relative text-xs text-fg-muted">
                {g.status === "queued" ? t("gallery.queued") : t("gallery.running")}
              </span>
            )}
            {g.status === "error" && (
              <>
                <TriangleAlert size={18} className="text-danger" />
                <span className="text-xs text-danger">{t(`errors.${g.errorCode ?? "UNKNOWN"}`)}</span>
              </>
            )}
            {g.status === "cancelled" && <span className="text-xs text-fg-subtle">{t("gallery.cancelled")}</span>}
          </div>
        )}
        {g.source !== "similar" && g.source !== "campaign" && (
          <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {t(`gallery.source.${g.source}`)}
          </span>
        )}
        {g.compositeAssetId && (
          <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {t("gallery.withText")}
          </span>
        )}
      </div>

      <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-fg-subtle">
          {g.aspectRatio} · {g.imageSize}
          {g.similarity ? ` · ${t(`similar.levels.${g.similarity}`)}` : ""} · {modelLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {g.status === "done" && (
            <>
              <Button
                size="sm"
                variant="secondary"
                iconOnly
                aria-label={t("gallery.download")}
                title={t("gallery.download")}
                onClick={() => downloadGeneration(g)}
              >
                <Download size={14} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                iconOnly
                aria-label={t("gallery.openEdit")}
                title={t("gallery.openEdit")}
                onClick={() => onOpen(g)}
              >
                <Maximize2 size={14} />
              </Button>
              {onEditText && (
                <Button
                  size="sm"
                  variant="secondary"
                  iconOnly
                  aria-label={t("gallery.addText")}
                  title={t("gallery.addText")}
                  onClick={() => onEditText(g)}
                >
                  <Type size={14} />
                </Button>
              )}
              <ExtendMenu generation={g} onNeedKey={onNeedKey} />
            </>
          )}
          {(g.status === "error" || g.status === "cancelled") && onRetry && (
            <Button
              size="sm"
              variant="secondary"
              iconOnly
              aria-label={t("gallery.retry")}
              title={t("gallery.retry")}
              onClick={() => onRetry(g)}
            >
              <RotateCcw size={14} />
            </Button>
          )}
          {!busy && (
            <Button
              size="sm"
              variant="danger"
              iconOnly
              aria-label={t("gallery.delete")}
              title={t("gallery.delete")}
              onClick={() => removeGeneration(g.id)}
            >
              <Trash size={14} />
            </Button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
