"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

const STORAGE_PREFIX = "panel_open_";

/**
 * 設定欄的區塊。collapsible 時標題可點擊收合，收合時在右側顯示 summary；
 * 開合狀態依 id 記在 localStorage（每位使用者自己的習慣）
 */
export function PanelSection({
  title,
  children,
  action,
  id,
  collapsible = false,
  defaultOpen = true,
  summary,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: React.ReactNode;
}) {
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!collapsible || !id) return;
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + id);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // 無法存取 localStorage 時使用預設值
    }
  }, [collapsible, id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // 展開後把內容捲進可視範圍（區塊常在設定欄底部）
    if (next) requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    if (!id) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + id, next ? "1" : "0");
    } catch {
      // 忽略
    }
  };

  if (!collapsible) {
    return (
      <section className="border-b border-line px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="section-title">{title}</h3>
          {action}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
          className="flex w-full items-center gap-2 px-4 py-3.5 text-left hover:bg-raised"
        >
          <ChevronRight
            size={14}
            className={`shrink-0 text-fg-subtle transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          <span className="section-title">{title}</span>
          {!open && summary && (
            <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-fg-muted">{summary}</span>
          )}
        </button>
      </h3>
      <div id={contentId} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </section>
  );
}
