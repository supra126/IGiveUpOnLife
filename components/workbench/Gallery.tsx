"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const MIN_COLUMN_WIDTH = 220;
const GAP = 12;
/** 卡片說明列的高度，換算成「寬度的倍數」前先以像素估計 */
const CAPTION_HEIGHT = 30;

/** 依容器寬度決定欄數（容器在空狀態時不存在，所以用 callback ref 傳入元素） */
function useColumnCount(el: HTMLElement | null) {
  const [count, setCount] = useState(1);
  useEffect(() => {
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setCount(Math.max(1, Math.floor((width + GAP) / (MIN_COLUMN_WIDTH + GAP))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return count;
}

/** 瀑布流：最新的在最前面，每張依序放進目前最矮的那一欄（比例已知，不必等圖片載入） */
export function Gallery({ generations, onOpen, onEditText, onRetry, onNeedKey, emptyTitle, emptyBody }: Props) {
  const { t } = useLocale();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const columnCount = useColumnCount(container);

  const columns = useMemo(() => {
    const sorted = [...generations].sort((a, b) => b.createdAt - a.createdAt);
    const cols: Generation[][] = Array.from({ length: columnCount }, () => []);
    const heights = new Array<number>(columnCount).fill(0);
    for (const g of sorted) {
      const [w, h] = g.aspectRatio.split(":").map(Number);
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push(g);
      heights[target] += (h && w ? h / w : 1) * MIN_COLUMN_WIDTH + CAPTION_HEIGHT + GAP;
    }
    return cols;
  }, [generations, columnCount]);

  const doneCount = generations.filter((g) => g.status === "done").length;

  if (generations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <BrandMark size={40} motion="float" className="text-fg-subtle" />
        <h2 className="text-base font-semibold">{emptyTitle}</h2>
        <p className="max-w-sm text-sm text-fg-muted">{emptyBody}</p>
      </div>
    );
  }

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
        <div ref={setContainer} className="flex items-start gap-3">
          {columns.map((items, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
              {items.map((g) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
