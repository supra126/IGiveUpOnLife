/**
 * Gemini 錯誤分類
 *
 * core 只丟出帶 code 的 GeminiError；訊息翻譯交給前端 locales/*.json 的 errors.<code>。
 * 這樣 server action 在 production 被 Next 遮蔽錯誤訊息時，前端仍能顯示正確原因。
 */

export const GEMINI_ERROR_CODES = [
  "API_KEY_MISSING",
  "API_KEY_INVALID",
  "RATE_LIMITED",
  "QUOTA_EXHAUSTED",
  "NETWORK",
  "TIMEOUT",
  "CONTENT_BLOCKED",
  "NO_IMAGE",
  "RESPONSE_TRUNCATED",
  "INVALID_RESPONSE",
  "INVALID_INPUT",
  "MODEL_NOT_ALLOWED",
  "MODEL_NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "SERVICE_UNAVAILABLE",
  "ABORTED",
  "UNKNOWN",
] as const;

export type GeminiErrorCode = (typeof GEMINI_ERROR_CODES)[number];

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: GeminiErrorCode, message?: string, retryAfterMs?: number) {
    super(message || code);
    this.name = "GeminiError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isGeminiErrorCode(value: unknown): value is GeminiErrorCode {
  return typeof value === "string" && (GEMINI_ERROR_CODES as readonly string[]).includes(value);
}

/** 從 Gemini 錯誤訊息中解析 RetryInfo 的 retryDelay（例如 "17s"） */
export function parseRetryDelayMs(message: string): number | undefined {
  const match = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (!match) return undefined;
  return Math.round(parseFloat(match[1]) * 1000);
}

function getStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

/**
 * 把任意錯誤轉成 GeminiError
 */
export function classifyError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const status = getStatus(error);

  if (error instanceof Error && error.name === "AbortError") {
    return new GeminiError("ABORTED", message);
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission_denied")
  ) {
    return new GeminiError("API_KEY_INVALID", message);
  }

  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("429")) {
    // 每日配額用完重試也沒用，要和每分鐘限制分開
    if (/per ?day|perday|daily/i.test(message)) {
      return new GeminiError("QUOTA_EXHAUSTED", message);
    }
    return new GeminiError("RATE_LIMITED", message, parseRetryDelayMs(message));
  }

  if (status === 404 || (lower.includes("model") && lower.includes("not found"))) {
    return new GeminiError("MODEL_NOT_FOUND", message);
  }

  if (status === 413 || lower.includes("payload too large") || lower.includes("request entity too large")) {
    return new GeminiError("PAYLOAD_TOO_LARGE", message);
  }

  if (status === 400 && lower.includes("safety")) {
    return new GeminiError("CONTENT_BLOCKED", message);
  }

  if (status === 400) {
    return new GeminiError("INVALID_INPUT", message);
  }

  if (status !== undefined && status >= 500) {
    return new GeminiError("SERVICE_UNAVAILABLE", message);
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline")) {
    return new GeminiError("TIMEOUT", message);
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("failed to fetch")
  ) {
    return new GeminiError("NETWORK", message);
  }

  return new GeminiError("UNKNOWN", message);
}

/** 哪些錯誤值得自動重試 */
export function isRetryable(error: GeminiError): boolean {
  return (
    error.code === "RATE_LIMITED" ||
    error.code === "NETWORK" ||
    error.code === "TIMEOUT" ||
    error.code === "SERVICE_UNAVAILABLE"
  );
}
