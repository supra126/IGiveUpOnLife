import { classifyError, GeminiError, isGeminiErrorCode, type GeminiErrorCode } from "./errors";

/**
 * server action 回傳值：一律用 Result，不 throw，
 * 避免 production 環境下 Next 把錯誤訊息遮蔽成通用錯誤。
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: GeminiErrorCode; message?: string; retryAfterMs?: number };

export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (raw) {
    const error = classifyError(raw);
    if (error.code === "UNKNOWN") console.error("[gemini]", raw);
    return {
      ok: false,
      code: error.code,
      // 只回傳截短的訊息，避免把上游細節整包丟給前端
      message: error.message.slice(0, 300),
      retryAfterMs: error.retryAfterMs,
    };
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw new GeminiError(isGeminiErrorCode(result.code) ? result.code : "UNKNOWN", result.message, result.retryAfterMs);
}
