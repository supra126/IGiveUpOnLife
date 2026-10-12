/**
 * 記憶體版限流（只在使用伺服器金鑰時套用）
 *
 * 環境變數：
 * - RATE_LIMIT_WINDOW_MS：時間窗（預設 60000）
 * - RATE_LIMIT_MAX_REQUESTS：每個時間窗的請求數（預設 2，對應 Gemini 生圖免費額度）
 * - RATE_LIMIT_ENABLED：設為 "false" 可關閉
 * - TRUST_PROXY：決定從哪個 header 取得用戶端 IP
 *     cloudflare → 只信任 cf-connecting-ip（origin 必須只接受 Cloudflare 流量）
 *     <數字 N>   → 信任 X-Forwarded-For 從右數第 N 個（前面有 N 層可信代理，例如 Railway 設 1）
 *     未設定     → 不信任任何 header，所有請求共用同一個額度（安全預設）
 *
 * 多實例部署時每個實例各自計數；需要全域限流請改用 Redis 等外部儲存。
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const MAX_ENTRIES = 10_000;
const store = new Map<string, RateLimitEntry>();

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}, 60_000);
// 不要讓清理計時器阻止 process 結束
cleanup.unref?.();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  enabled: boolean;
}

function readPositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`[rate-limit] ${name}="${value}" 無效，改用預設值 ${fallback}`);
    return fallback;
  }
  return parsed;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    windowMs: readPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000, "RATE_LIMIT_WINDOW_MS"),
    maxRequests: readPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 2, "RATE_LIMIT_MAX_REQUESTS"),
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(identifier: string, now: number = Date.now()): RateLimitResult {
  const config = getRateLimitConfig();
  if (!config.enabled) {
    return { success: true, remaining: config.maxRequests, resetIn: 0 };
  }

  const entry = store.get(identifier);
  if (!entry || now > entry.resetTime) {
    if (!entry && store.size >= MAX_ENTRIES) {
      // Map 依插入順序迭代，第一個就是最舊的
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now };
}

/** 測試用 */
export function resetRateLimitStore(): void {
  store.clear();
}

export function getRateLimitStoreSize(): number {
  return store.size;
}

export const SHARED_BUCKET = "shared";

/**
 * 依 TRUST_PROXY 取得用戶端識別；無法可信判斷時回傳共用 bucket
 */
export function getClientIdentifier(headers: Headers, trustProxy: string | undefined = process.env.TRUST_PROXY): string {
  const mode = (trustProxy || "").trim().toLowerCase();

  if (mode === "cloudflare") {
    return headers.get("cf-connecting-ip")?.trim() || SHARED_BUCKET;
  }

  const hops = Number(mode);
  if (Number.isInteger(hops) && hops > 0) {
    const chain = (headers.get("x-forwarded-for") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return chain[chain.length - hops] || SHARED_BUCKET;
  }

  return SHARED_BUCKET;
}
