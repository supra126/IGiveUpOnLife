"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 不可關閉時（例如進行中）設為 false */
  dismissible?: boolean;
  size?: "sm" | "md" | "lg" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  full: "max-w-[min(1400px,96vw)] h-[92vh]",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 透過 portal 掛到 body，支援 ESC、焦點圈限、開啟時移入焦點、關閉後還原焦點與背景捲動鎖定
 */
export function Dialog({ open, onClose, title, dismissible = true, size = "md", children, footer }: DialogProps) {
  const { t } = useLocale();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, dismissible]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="animate-fade-in absolute inset-0 bg-black/50"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`animate-fade-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel shadow-2xl ${SIZES[size]}`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid size-7 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-raised hover:text-fg"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
