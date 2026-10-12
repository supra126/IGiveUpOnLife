"use client";

/**
 * 分析 / 規劃的即時進度（串流事件累積）
 */
import { useSyncExternalStore } from "react";

export interface CampaignProgress {
  kind: "analyze" | "plan";
  startedAt: number;
  /** 最近幾則思考摘要，最新的在最後 */
  thoughts: string[];
  chars: number;
  done?: number;
  total?: number;
}

let progress: CampaignProgress | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function startProgress(kind: CampaignProgress["kind"], total?: number): void {
  progress = { kind, startedAt: Date.now(), thoughts: [], chars: 0, done: total ? 0 : undefined, total };
  emit();
}

export function pushThought(text: string): void {
  if (!progress || progress.thoughts[progress.thoughts.length - 1] === text) return;
  progress = { ...progress, thoughts: [...progress.thoughts, text].slice(-6) };
  emit();
}

export function updateProgress(patch: { chars: number; done?: number; total?: number }): void {
  if (!progress) return;
  progress = {
    ...progress,
    chars: patch.chars,
    done: patch.done ?? progress.done,
    total: patch.total ?? progress.total,
  };
  emit();
}

export function endProgress(): void {
  progress = null;
  emit();
}

export function useCampaignProgress(): CampaignProgress | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => progress,
    () => null
  );
}

