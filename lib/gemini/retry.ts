import { classifyError, GeminiError, isRetryable } from "./errors";

export interface RetryOptions {
  signal?: AbortSignal;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** 測試用：替換等待函式 */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new GeminiError("ABORTED"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GeminiError("ABORTED"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * 帶退避的重試：只重試暫時性錯誤（限流、網路、5xx），
 * 優先採用 API 回傳的 retryDelay，每日配額用完直接失敗。
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { signal, maxRetries = 2, baseDelayMs = 1500, maxDelayMs = 20000 } = options;
  const wait = options.sleep ?? sleep;

  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw new GeminiError("ABORTED");
    try {
      return await fn();
    } catch (raw) {
      const error = signal?.aborted ? new GeminiError("ABORTED") : classifyError(raw);
      if (!isRetryable(error) || attempt >= maxRetries) {
        throw error;
      }
      const backoff = baseDelayMs * 2 ** attempt;
      const jitter = Math.random() * baseDelayMs * 0.3;
      const delay = Math.min(error.retryAfterMs ?? backoff + jitter, maxDelayMs);
      await wait(delay, signal);
    }
  }
}
