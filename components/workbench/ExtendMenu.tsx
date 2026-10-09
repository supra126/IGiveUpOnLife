"use client";

import React, { useEffect, useRef, useState } from "react";
import { Expand } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import type { AspectRatio } from "@/lib/gemini/models";
import type { Generation } from "@/lib/project/types";
import { runExtend, hasUsableKey } from "@/lib/workbench/runner";

const RATIOS: AspectRatio[] = ["1:1", "4:5", "9:16", "16:9", "3:4", "4:3", "2:3", "3:2", "21:9"];

/** 把成品延伸成其他比例 */
export function ExtendMenu({
  generation,
  onNeedKey,
  size = "sm",
}: {
  generation: Generation;
  onNeedKey: () => void;
  size?: "sm" | "md";
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        size={size}
        variant="secondary"
        iconOnly={size === "sm"}
        aria-label={t("gallery.extend")}
        title={t("gallery.extend")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Expand size={14} />
        {size === "md" && t("gallery.extend")}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-[var(--radius-control)] border border-line bg-panel p-1 shadow-lg"
        >
          <p className="px-2 py-1 text-[11px] text-fg-subtle">{t("gallery.extendTo")}</p>
          {RATIOS.filter((r) => r !== generation.aspectRatio).map((ratio) => (
            <button
              key={ratio}
              role="menuitem"
              type="button"
              className="block w-full rounded px-2 py-1 text-left font-mono text-xs hover:bg-raised"
              onClick={() => {
                setOpen(false);
                if (!hasUsableKey()) return onNeedKey();
                void runExtend(generation, ratio);
              }}
            >
              {ratio}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
