import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getRateLimitConfig,
  checkRateLimitSync,
  getClientIdentifier,
} from "../rate-limit";

// Mock the cloudflareAccess module
vi.mock("../cloudflareAccess", () => ({
  isTrustedUser: vi.fn().mockResolvedValue(false),
}));

describe("getRateLimitConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default values when env vars are not set", () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_ENABLED;

    const config = getRateLimitConfig();

    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(10);
    expect(config.enabled).toBe(true);
  });

  it("should use custom values from env vars", () => {
    process.env.RATE_LIMIT_WINDOW_MS = "30000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "5";

    const config = getRateLimitConfig();

    expect(config.windowMs).toBe(30000);
    expect(config.maxRequests).toBe(5);
  });

  it("should disable rate limiting when RATE_LIMIT_ENABLED is false", () => {
    process.env.RATE_LIMIT_ENABLED = "false";

    const config = getRateLimitConfig();

    expect(config.enabled).toBe(false);
  });
});

describe("checkRateLimitSync", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.RATE_LIMIT_ENABLED = "true";
    process.env.RATE_LIMIT_MAX_REQUESTS = "3";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should allow first request", () => {
    const uniqueId = `test-ip-${Date.now()}-${Math.random()}`;
    const result = checkRateLimitSync(uniqueId);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1 = 2
  });

  it("should track remaining requests", () => {
    const uniqueId = `test-ip-${Date.now()}-${Math.random()}`;

    const result1 = checkRateLimitSync(uniqueId);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimitSync(uniqueId);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimitSync(uniqueId);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("should block requests when limit exceeded", () => {
    const uniqueId = `test-ip-${Date.now()}-${Math.random()}`;

    // Use up all requests
    checkRateLimitSync(uniqueId);
    checkRateLimitSync(uniqueId);
    checkRateLimitSync(uniqueId);

    // This should be blocked
    const result = checkRateLimitSync(uniqueId);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.error).toContain("Too many requests");
  });

  it("should allow when rate limiting is disabled", () => {
    process.env.RATE_LIMIT_ENABLED = "false";

    const uniqueId = `test-ip-${Date.now()}-${Math.random()}`;

    // Make many requests
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimitSync(uniqueId);
      expect(result.success).toBe(true);
    }
  });
});

describe("getClientIdentifier", () => {
  it("should use cf-connecting-ip header when available", () => {
    const headers = new Headers();
    headers.set("cf-connecting-ip", "1.2.3.4");

    const result = getClientIdentifier(headers);
    expect(result).toBe("1.2.3.4");
  });

  it("should use x-forwarded-for header as fallback", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "5.6.7.8, 9.10.11.12");

    const result = getClientIdentifier(headers);
    expect(result).toBe("5.6.7.8");
  });

  it("should use x-real-ip header as second fallback", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "13.14.15.16");

    const result = getClientIdentifier(headers);
    expect(result).toBe("13.14.15.16");
  });

  it("should return anonymous when no headers are set", () => {
    const headers = new Headers();

    const result = getClientIdentifier(headers);
    expect(result).toBe("anonymous");
  });

  it("should prefer cf-connecting-ip over other headers", () => {
    const headers = new Headers();
    headers.set("cf-connecting-ip", "1.1.1.1");
    headers.set("x-forwarded-for", "2.2.2.2");
    headers.set("x-real-ip", "3.3.3.3");

    const result = getClientIdentifier(headers);
    expect(result).toBe("1.1.1.1");
  });
});
