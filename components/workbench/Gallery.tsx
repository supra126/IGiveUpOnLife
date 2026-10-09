"use client";

import React, { useMemo } from "react";
import { Archive } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import type { Generation } from "@/lib/project/types";
import { downloadZip } from "@/lib/workbench/runner";
import { GalleryCard } from "./GalleryCard";

interface Props {
  generations: Generation[];
  onOpen: (generation: Generation) => void;
  onEditText?: (generation: Generation) => void;
  onRetry?: (generation: Generation) => void;
  onNeedKey: () => void;
  emptyTitle: string;
  emptyBody: string;
}

/** 依批次分組、最新的在上面 */
export function Gallery({ generations, onOpen, onEditText, onRetry, onNeedKey, emptyTitle, emptyBody }: Props) {
  const { t, locale } = useLocale();

  const groups = useMemo(() => {
    const map = new Map<string, Generation[]>();
    for (const g of generations) {
      const key = g.batchId ?? g.id;
      map.set(key, [...(map.get(key) ?? []), g]);
    }
    return [...map.entries()]
      .map(([key, items]) => ({ key, items, createdAt: Math.min(...items.map((i) => i.createdAt)) }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [generations]);

  const doneCount = generations.filter((g) => g.status === "done").length;

  if (generations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <BrandMark size={40} className="text-fg-subtle" />
        <h2 className="text-base font-semibold">{emptyTitle}</h2>
        <p className="max-w-sm text-sm text-fg-muted">{emptyBody}</p>
      </div>
    );
  }

  const timeFormat = new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <span className="text-xs text-fg-muted">{t("gallery.count", { count: doneCount })}</span>
        <Button size="sm" variant="secondary" disabled={doneCount === 0} onClick={() => downloadZip(generations)}>
          <Archive size={13} />
          {t("gallery.downloadAll")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={timeFormat.format(group.createdAt)}>
              <h3 className="mb-2 font-mono text-[11px] text-fg-subtle">{timeFormat.format(group.createdAt)}</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-start gap-3">
                {group.items.map((g) => (
                  <GalleryCard
                    key={g.id}
                    generation={g}
                    onOpen={onOpen}
                    onEditText={onEditText}
                    onRetry={onRetry}
                    onNeedKey={onNeedKey}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
