"use client";

import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  tone: "info" | "error" | "success";
  /** i18n key 或已翻譯字串 */
  message: string;
  vars?: Record<string, string | number>;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(tone: Toast["tone"], message: string, vars?: Toast["vars"], durationMs = 5000): void {
  const id = nextId++;
  // 同樣的訊息不要疊好幾個
  toasts = [...toasts.filter((t) => t.message !== message), { id, tone, message, vars }].slice(-4);
  emit();
  setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => EMPTY
  );
}
