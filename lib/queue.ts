/**
 * 簡單的並行佇列：控制同時生成的張數、可取消，遇到限流時整體暫停
 */
import { classifyError, GeminiError } from "@/lib/gemini/errors";

export interface QueueOptions {
  concurrency: number;
  /** 遇到限流時每個工作最多重排幾次 */
  maxRateLimitRetries?: number;
  /** 沒有 retryAfter 時預設暫停多久 */
  defaultPauseMs?: number;
  onPause?: (ms: number) => void;
  /** 測試用：替換計時 */
  setTimer?: (fn: () => void, ms: number) => unknown;
}

interface Task {
  run: (signal: AbortSignal) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  controller: AbortController;
  rateLimitRetries: number;
}

export interface Queue {
  add<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T>;
  /** 取消所有等待中與執行中的工作 */
  cancel(): void;
  setConcurrency(value: number): void;
  readonly size: number;
  readonly running: number;
}

export function createQueue(options: QueueOptions): Queue {
  const pending: Task[] = [];
  const active = new Set<Task>();
  let concurrency = Math.max(1, options.concurrency);
  let pausedUntil = 0;
  let resumeScheduled = false;
  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const maxRateLimitRetries = options.maxRateLimitRetries ?? 2;

  function rejectAll(error: GeminiError) {
    for (const task of pending.splice(0)) task.reject(error);
  }

  function pump() {
    const now = Date.now();
    if (now < pausedUntil) {
      if (!resumeScheduled) {
        resumeScheduled = true;
        setTimer(() => {
          resumeScheduled = false;
          pump();
        }, pausedUntil - now);
      }
      return;
    }
    while (active.size < concurrency && pending.length > 0) {
      const task = pending.shift()!;
      if (task.controller.signal.aborted) {
        task.reject(new GeminiError("ABORTED"));
        continue;
      }
      start(task);
    }
  }

  function start(task: Task) {
    active.add(task);
    task
      .run(task.controller.signal)
      .then(task.resolve, (raw) => {
        const error = task.controller.signal.aborted ? new GeminiError("ABORTED") : classifyError(raw);
        if (error.code === "RATE_LIMITED" && task.rateLimitRetries < maxRateLimitRetries) {
          task.rateLimitRetries++;
          const pauseMs = error.retryAfterMs ?? options.defaultPauseMs ?? 15_000;
          pausedUntil = Math.max(pausedUntil, Date.now() + pauseMs);
          options.onPause?.(pauseMs);
          pending.unshift(task);
          return;
        }
        if (error.code === "QUOTA_EXHAUSTED") rejectAll(error);
        task.reject(error);
      })
      .finally(() => {
        active.delete(task);
        pump();
      });
  }

  return {
    add<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        pending.push({
          run,
          resolve: resolve as (value: unknown) => void,
          reject,
          controller: new AbortController(),
          rateLimitRetries: 0,
        });
        pump();
      });
    },
    cancel() {
      rejectAll(new GeminiError("ABORTED"));
      for (const task of active) task.controller.abort();
    },
    setConcurrency(value: number) {
      concurrency = Math.max(1, value);
      pump();
    },
    get size() {
      return pending.length;
    },
    get running() {
      return active.size;
    },
  };
}
