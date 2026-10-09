import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitConfig,
  getRateLimitStoreSize,
  resetRateLimitStore,
  SHARED_BUCKET,
} from "./rate-limit";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.RATE_LIMIT_WINDOW_MS;
  delete process.env.RATE_LIMIT_MAX_REQUESTS;
  delete process.env.RATE_LIMIT_ENABLED;
  resetRateLimitStore();
});

afterEach(() => {
  process.env = originalEnv;
});

describe("getRateLimitConfig", () => {
  it("未設定時使用預設值", () => {
    expect(getRateLimitConfig()).toEqual({ windowMs: 60000, maxRequests: 2, enabled: true });
  });

  it("讀取自訂值", () => {
    process.env.RATE_LIMIT_WINDOW_MS = "30000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "5";
    expect(getRateLimitConfig()).toMatchObject({ windowMs: 30000, maxRequests: 5 });
  });

  it("非數字的值回退到預設值，不會變成不限流", () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "abc";
    process.env.RATE_LIMIT_WINDOW_MS = "-1";
    expect(getRateLimitConfig()).toMatchObject({ windowMs: 60000, maxRequests: 2 });
  });

  it("RATE_LIMIT_ENABLED=false 關閉限流", () => {
    process.env.RATE_LIMIT_ENABLED = "false";
    expect(getRateLimitConfig().enabled).toBe(false);
  });
});

describe("checkRateLimit", () => {
  it("超過上限後拒絕，時間窗過後恢復", () => {
    const now = 1_000_000;
    expect(checkRateLimit("a", now).success).toBe(true);
    expect(checkRateLimit("a", now).success).toBe(true);
    const blocked = checkRateLimit("a", now + 10);
    expect(blocked.success).toBe(false);
    expect(blocked.resetIn).toBeGreaterThan(0);
    expect(checkRateLimit("a", now + 60_001).success).toBe(true);
  });

  it("不同識別各自計數", () => {
    checkRateLimit("a");
    checkRateLimit("a");
    expect(checkRateLimit("b").success).toBe(true);
  });

  it("關閉時一律放行", () => {
    process.env.RATE_LIMIT_ENABLED = "false";
    for (let i = 0; i < 10; i++) expect(checkRateLimit("a").success).toBe(true);
    expect(getRateLimitStoreSize()).toBe(0);
  });
});

describe("getClientIdentifier", () => {
  it("未設定 TRUST_PROXY 時忽略可偽造的 header", () => {
    const headers = new Headers({
      "x-forwarded-for": "127.0.0.1",
      "cf-connecting-ip": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    expect(getClientIdentifier(headers, undefined)).toBe(SHARED_BUCKET);
  });

  it("cloudflare 模式只信任 cf-connecting-ip", () => {
    const headers = new Headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" });
    expect(getClientIdentifier(headers, "cloudflare")).toBe("1.2.3.4");
    expect(getClientIdentifier(new Headers({ "x-forwarded-for": "9.9.9.9" }), "cloudflare")).toBe(SHARED_BUCKET);
  });

  it("數字模式取 X-Forwarded-For 從右數第 N 個，用戶端偽造的左側值無效", () => {
    const headers = new Headers({ "x-forwarded-for": "127.0.0.1, 203.0.113.7, 10.0.0.2" });
    expect(getClientIdentifier(headers, "1")).toBe("10.0.0.2");
    expect(getClientIdentifier(headers, "2")).toBe("203.0.113.7");
  });

  it("鏈不夠長時回到共用 bucket", () => {
    expect(getClientIdentifier(new Headers({ "x-forwarded-for": "1.1.1.1" }), "3")).toBe(SHARED_BUCKET);
  });
});
