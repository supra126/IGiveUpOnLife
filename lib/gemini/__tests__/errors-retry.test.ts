import { describe, it, expect, vi } from "vitest";
import { classifyError, GeminiError, parseRetryDelayMs } from "../errors";
import { withRetry } from "../retry";

function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("classifyError", () => {
  it("依 HTTP 狀態分類", () => {
    expect(classifyError(apiError(401, "x")).code).toBe("API_KEY_INVALID");
    expect(classifyError(apiError(400, "API key not valid")).code).toBe("API_KEY_INVALID");
    expect(classifyError(apiError(404, "models/foo is not found")).code).toBe("MODEL_NOT_FOUND");
    expect(classifyError(apiError(503, "overloaded")).code).toBe("SERVICE_UNAVAILABLE");
    expect(classifyError(apiError(400, "bad request")).code).toBe("INVALID_INPUT");
  });

  it("429 區分每分鐘限流與每日配額，並讀取 retryDelay", () => {
    const perMinute = classifyError(
      apiError(429, '{"error":{"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"17s"}]}}')
    );
    expect(perMinute.code).toBe("RATE_LIMITED");
    expect(perMinute.retryAfterMs).toBe(17000);

    const daily = classifyError(apiError(429, "Quota exceeded for metric: GenerateRequestsPerDayPerProject"));
    expect(daily.code).toBe("QUOTA_EXHAUSTED");
  });

  it("網路錯誤與已是 GeminiError 的情況", () => {
    expect(classifyError(new TypeError("fetch failed")).code).toBe("NETWORK");
    const original = new GeminiError("NO_IMAGE");
    expect(classifyError(original)).toBe(original);
  });

  it("parseRetryDelayMs 解析小數秒", () => {
    expect(parseRetryDelayMs('"retryDelay": "1.5s"')).toBe(1500);
    expect(parseRetryDelayMs("no delay")).toBeUndefined();
  });
});

describe("withRetry", () => {
  const noSleep = vi.fn(async () => {});

  it("暫時性錯誤會重試，成功即回傳", async () => {
    const fn = vi.fn().mockRejectedValueOnce(apiError(503, "busy")).mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("每日配額與金鑰錯誤不重試", async () => {
    const quota = vi.fn().mockRejectedValue(apiError(429, "PerDay quota"));
    await expect(withRetry(quota, { sleep: noSleep })).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
    expect(quota).toHaveBeenCalledTimes(1);

    const key = vi.fn().mockRejectedValue(apiError(401, "bad key"));
    await expect(withRetry(key, { sleep: noSleep })).rejects.toMatchObject({ code: "API_KEY_INVALID" });
    expect(key).toHaveBeenCalledTimes(1);
  });

  it("最多重試 maxRetries 次", async () => {
    const fn = vi.fn().mockRejectedValue(apiError(503, "busy"));
    await expect(withRetry(fn, { sleep: noSleep, maxRetries: 2 })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("優先使用 API 的 retryDelay", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(apiError(429, '"retryDelay": "3s"'))
      .mockResolvedValueOnce("ok");
    await withRetry(fn, { sleep });
    expect(sleep).toHaveBeenCalledWith(3000, undefined);
  });

  it("已中止時直接丟出 ABORTED", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(withRetry(async () => "x", { signal: controller.signal })).rejects.toMatchObject({
      code: "ABORTED",
    });
  });
});
